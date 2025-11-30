/**
 * POI Content Quality Audit Script
 * =================================
 * Sprint 9.0: AI-powered quality assessment of existing POI descriptions
 *
 * Purpose:
 * - Analyze all POIs with descriptions (not just length check)
 * - Score quality on 5 criteria using Mistral AI
 * - Categorize: keep, improve, or replace
 * - Generate audit report
 *
 * Cost: ~$3 for 1,063 POIs
 * Time: 2-3 hours (with rate limiting)
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const CONFIG = {
  BATCH_SIZE: 10, // Process 10 POIs at a time
  RATE_LIMIT_MS: 500, // Wait 500ms between batches (2 requests/sec)
  MIN_SCORE_KEEP: 8.0, // Scores >= 8 are kept
  MIN_SCORE_IMPROVE: 5.0, // Scores 5-7.9 need improvement
  // Scores < 5 need replacement
};

// Database connection pool (prevents connection timeout issues)
function createDbPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
}

/**
 * Assess content quality using Mistral AI (with retry logic)
 */
async function assessContentQuality(poi, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const prompt = `Evaluate the quality of this POI description for a travel/tourism platform.

POI Information:
- Name: ${poi.name}
- Category: ${poi.category}
- Subcategory: ${poi.subcategory || 'N/A'}
- Description: "${poi.description}"

Evaluate on these 5 criteria (score each 1-10):

1. INFORMATIVENESS (1-10): Does it provide useful, specific information about the POI?
   - Low (1-3): Generic, vague, or marketing fluff
   - Medium (4-7): Some useful info but lacks details
   - High (8-10): Specific, detailed, informative

2. ENGAGEMENT (1-10): Is it interesting and compelling to read?
   - Low (1-3): Boring, dry, or repetitive
   - Medium (4-7): Readable but not exciting
   - High (8-10): Engaging, vivid, makes you want to visit

3. ACCURACY (1-10): Does it seem factual and objective?
   - Low (1-3): Marketing hype, exaggerations, unclear claims
   - Medium (4-7): Mostly factual with some promotional language
   - High (8-10): Objective, factual, credible

4. COMPLETENESS (1-10): Does it cover key aspects (what, where, why visit, who for)?
   - Low (1-3): Missing essential information
   - Medium (4-7): Covers some aspects but incomplete
   - High (8-10): Comprehensive coverage of all key points

5. CLARITY (1-10): Is it clear, well-written, and easy to understand?
   - Low (1-3): Confusing, poorly structured, grammar issues
   - Medium (4-7): Understandable but could be clearer
   - High (8-10): Crystal clear, well-structured, professional

Based on the scores, provide:
- overall_score: Average of all 5 scores
- usable: true if overall_score >= 5.0, false otherwise
- issues: List of specific problems found (max 3)
- recommendation: "keep" (score >= 8), "improve" (score 5-7.9), or "replace" (score < 5)

Return ONLY a valid JSON object with this exact structure:
{
  "informativeness": <number>,
  "engagement": <number>,
  "accuracy": <number>,
  "completeness": <number>,
  "clarity": <number>,
  "overall_score": <number>,
  "usable": <boolean>,
  "issues": [<string>, <string>, ...],
  "recommendation": <string>
}`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent scoring
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const qualityData = JSON.parse(data.choices[0].message.content);

    // Validate response structure
    if (!qualityData.overall_score || !qualityData.recommendation) {
      throw new Error('Invalid response structure from Mistral AI');
    }

    return qualityData;

  } catch (error) {
    // Retry on timeout (504) or network errors
    if (retryCount < MAX_RETRIES && (error.message.includes('504') || error.message.includes('timeout'))) {
      console.log(`  ⚠️  Timeout for POI ${poi.id}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return assessContentQuality(poi, retryCount + 1);
    }

    console.error(`❌ Failed to assess POI ${poi.id}:`, error.message);
    return null;
  }
}

/**
 * Update POI with quality assessment data
 */
async function updatePOIQuality(pool, poiId, qualityData) {
  try {
    await pool.query(`
      UPDATE POI SET
        content_quality_score = ?,
        content_quality_data = ?,
        content_quality_assessed_at = NOW()
      WHERE id = ?
    `, [
      qualityData.overall_score,
      JSON.stringify(qualityData),
      poiId
    ]);
  } catch (error) {
    console.error(`Failed to update POI ${poiId}:`, error.message);
    throw error; // Re-throw to handle connection issues
  }
}

/**
 * Main audit function
 */
async function runQualityAudit() {
  console.log('🔍 POI Content Quality Audit - Starting...\n');
  console.log('='.repeat(80));

  const pool = createDbPool();
  console.log('✅ Connected to database:', process.env.DB_NAME);

  try {
    // Check if quality columns exist, if not create them
    console.log('\n📋 Preparing database schema...');
    await pool.query(`
      ALTER TABLE POI
      ADD COLUMN IF NOT EXISTS content_quality_score DECIMAL(3,1) NULL COMMENT 'AI quality score (0-10)',
      ADD COLUMN IF NOT EXISTS content_quality_data JSON NULL COMMENT 'Detailed quality assessment',
      ADD COLUMN IF NOT EXISTS content_quality_assessed_at TIMESTAMP NULL COMMENT 'Last quality assessment'
    `);
    console.log('✅ Database schema ready');

    // Get already assessed POIs count
    console.log('\n📊 Checking database status...');
    const [alreadyAssessed] = await pool.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE content_quality_score IS NOT NULL
    `);
    const alreadyAssessedCount = alreadyAssessed[0].count;

    // Get POIs to assess (only those NOT yet assessed)
    const [pois] = await pool.query(`
      SELECT
        id,
        name,
        description,
        category,
        subcategory,
        LENGTH(description) as desc_length
      FROM POI
      WHERE is_active = TRUE
        AND description IS NOT NULL
        AND LENGTH(description) > 0
        AND content_quality_score IS NULL
      ORDER BY
        CASE
          WHEN LENGTH(description) >= 200 THEN 1  -- "Good" POIs first
          WHEN LENGTH(description) >= 100 THEN 2  -- "Decent" POIs
          ELSE 3                                   -- Short POIs
        END,
        popularity_score DESC
    `);

    console.log(`✅ Found ${pois.length} POIs to assess`);
    console.log(`📋 Already assessed: ${alreadyAssessedCount} POIs (will be included in final report)\n`);

    // Statistics
    const stats = {
      total: pois.length,
      alreadyAssessed: alreadyAssessedCount,
      processed: 0,
      keep: 0,
      improve: 0,
      replace: 0,
      failed: 0,
      totalCost: 0
    };

    const startTime = Date.now();

    // Process in batches
    console.log('🚀 Starting quality assessment...\n');
    console.log(`Configuration:`);
    console.log(`  - Batch size: ${CONFIG.BATCH_SIZE} POIs`);
    console.log(`  - Rate limit: ${CONFIG.RATE_LIMIT_MS}ms between batches`);
    console.log(`  - Scoring: Keep (≥8), Improve (5-7.9), Replace (<5)\n`);

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];

      // Calculate progress (used in both success and failure cases)
      const progress = ((i + 1) / pois.length * 100).toFixed(1);

      // Assess quality
      const quality = await assessContentQuality(poi);

      if (quality) {
        // Update database
        await updatePOIQuality(pool, poi.id, quality);

        // Update statistics
        stats.processed++;
        if (quality.recommendation === 'keep') stats.keep++;
        else if (quality.recommendation === 'improve') stats.improve++;
        else stats.replace++;

        // Estimate cost (Mistral: ~$0.003 per request)
        stats.totalCost += 0.003;

        // Log progress
        console.log(`  [${progress}%] POI ${poi.id}: ${poi.name.substring(0, 40)}`);
        console.log(`          Score: ${quality.overall_score}/10 → ${quality.recommendation.toUpperCase()}`);
        if (quality.issues.length > 0) {
          console.log(`          Issues: ${quality.issues.join(', ')}`);
        }

      } else {
        stats.failed++;
        console.log(`  [${progress}%] POI ${poi.id}: ❌ FAILED to assess`);
      }

      // Rate limiting (except for last item)
      if ((i + 1) % CONFIG.BATCH_SIZE === 0 && i < pois.length - 1) {
        console.log(`  💤 Rate limit pause (${CONFIG.RATE_LIMIT_MS}ms)...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      }

      // Progress report every 100 POIs
      if ((i + 1) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const remaining = ((pois.length - i - 1) / 100 * elapsed).toFixed(1);
        console.log(`\n  📊 Progress: ${i + 1}/${pois.length} POIs`);
        console.log(`     Time: ${elapsed}min elapsed, ~${remaining}min remaining`);
        console.log(`     Cost: ~$${stats.totalCost.toFixed(2)} so far\n`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    // Generate detailed report
    console.log('\n' + '='.repeat(80));
    console.log('📊 QUALITY AUDIT RESULTS');
    console.log('='.repeat(80));

    // Get totals from database (including previously assessed)
    const [totalStats] = await pool.query(`
      SELECT
        COUNT(*) as total_assessed,
        SUM(CASE WHEN content_quality_score >= 8 THEN 1 ELSE 0 END) as total_keep,
        SUM(CASE WHEN content_quality_score >= 5 AND content_quality_score < 8 THEN 1 ELSE 0 END) as total_improve,
        SUM(CASE WHEN content_quality_score < 5 THEN 1 ELSE 0 END) as total_replace
      FROM POI
      WHERE content_quality_score IS NOT NULL
    `);

    const totals = totalStats[0];

    console.log(`\nSession Statistics:`);
    console.log(`  Previously assessed:     ${stats.alreadyAssessed.toString().padStart(5)} POIs`);
    console.log(`  Newly assessed:          ${stats.processed.toString().padStart(5)} POIs`);
    console.log(`  Failed this session:     ${stats.failed.toString().padStart(5)} POIs`);
    console.log(`  Session time:            ${totalTime} minutes`);
    console.log(`  Session cost:            ~$${stats.totalCost.toFixed(2)}`);

    console.log(`\nOverall Quality Breakdown (${totals.total_assessed} total POIs):`);
    console.log(`  ✅ KEEP (score ≥8):      ${totals.total_keep.toString().padStart(5)} POIs  (${(totals.total_keep/totals.total_assessed*100).toFixed(1)}%)`);
    console.log(`  ⚠️  IMPROVE (score 5-7.9): ${totals.total_improve.toString().padStart(5)} POIs  (${(totals.total_improve/totals.total_assessed*100).toFixed(1)}%)`);
    console.log(`  ❌ REPLACE (score <5):   ${totals.total_replace.toString().padStart(5)} POIs  (${(totals.total_replace/totals.total_assessed*100).toFixed(1)}%)`);

    // Get top/bottom performers
    const [topPOIs] = await pool.query(`
      SELECT id, name, content_quality_score
      FROM POI
      WHERE content_quality_score IS NOT NULL
      ORDER BY content_quality_score DESC
      LIMIT 10
    `);

    const [bottomPOIs] = await pool.query(`
      SELECT id, name, content_quality_score
      FROM POI
      WHERE content_quality_score IS NOT NULL
      ORDER BY content_quality_score ASC
      LIMIT 10
    `);

    console.log(`\n📈 Top 10 Highest Quality POIs:`);
    topPOIs.forEach((poi, idx) => {
      console.log(`  ${idx + 1}. [${poi.content_quality_score}/10] ${poi.name}`);
    });

    console.log(`\n📉 Bottom 10 Lowest Quality POIs:`);
    bottomPOIs.forEach((poi, idx) => {
      console.log(`  ${idx + 1}. [${poi.content_quality_score}/10] ${poi.name}`);
    });

    // Category breakdown
    const [categoryStats] = await pool.query(`
      SELECT
        category,
        COUNT(*) as total,
        AVG(content_quality_score) as avg_score,
        SUM(CASE WHEN content_quality_score >= 8 THEN 1 ELSE 0 END) as keep_count,
        SUM(CASE WHEN content_quality_score >= 5 AND content_quality_score < 8 THEN 1 ELSE 0 END) as improve_count,
        SUM(CASE WHEN content_quality_score < 5 THEN 1 ELSE 0 END) as replace_count
      FROM POI
      WHERE content_quality_score IS NOT NULL
      GROUP BY category
      ORDER BY avg_score DESC
    `);

    console.log(`\n📊 Quality by Category:`);
    console.log('─'.repeat(80));
    console.log('Category                    Total   Avg Score   Keep   Improve   Replace');
    console.log('─'.repeat(80));
    categoryStats.forEach(cat => {
      console.log(
        `${cat.category.padEnd(24)} ${cat.total.toString().padStart(5)}   ` +
        `${Number(cat.avg_score || 0).toFixed(1).padStart(9)}   ` +
        `${cat.keep_count.toString().padStart(4)}   ` +
        `${cat.improve_count.toString().padStart(7)}   ` +
        `${cat.replace_count.toString().padStart(7)}`
      );
    });

    // Common issues analysis
    const [allQualityData] = await pool.query(`
      SELECT content_quality_data
      FROM POI
      WHERE content_quality_data IS NOT NULL
    `);

    const issueFrequency = {};
    allQualityData.forEach(row => {
      const data = JSON.parse(row.content_quality_data);
      if (data.issues) {
        data.issues.forEach(issue => {
          issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
        });
      }
    });

    const topIssues = Object.entries(issueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log(`\n🔍 Most Common Issues:`);
    topIssues.forEach(([issue, count], idx) => {
      console.log(`  ${idx + 1}. ${issue} (${count} POIs)`);
    });

    // Action items
    console.log(`\n✅ NEXT STEPS:`);
    console.log(`  1. Review "REPLACE" POIs (${totals.total_replace} total) - these need new content`);
    console.log(`  2. Review "IMPROVE" POIs (${totals.total_improve} total) - these need enhancement`);
    console.log(`  3. Total POIs needing work: ${totals.total_replace + totals.total_improve} (${((totals.total_replace + totals.total_improve)/totals.total_assessed*100).toFixed(1)}%)`);
    console.log(`  4. Use webscraping + Apify to enrich these POIs`);

    // Export CSV report
    console.log(`\n📄 Generating CSV report...`);
    const [allPOIs] = await pool.query(`
      SELECT
        id,
        name,
        category,
        subcategory,
        LENGTH(description) as desc_length,
        content_quality_score,
        JSON_UNQUOTE(JSON_EXTRACT(content_quality_data, '$.recommendation')) as recommendation,
        JSON_UNQUOTE(JSON_EXTRACT(content_quality_data, '$.issues')) as issues
      FROM POI
      WHERE content_quality_score IS NOT NULL
      ORDER BY content_quality_score ASC
    `);

    const fs = require('fs');
    const csvPath = './quality_audit_report.csv';
    const csvHeader = 'ID,Name,Category,Subcategory,Description Length,Quality Score,Recommendation,Issues\n';
    const csvRows = allPOIs.map(poi =>
      `${poi.id},"${poi.name}","${poi.category}","${poi.subcategory || ''}",${poi.desc_length},${poi.content_quality_score},"${poi.recommendation}","${poi.issues || ''}"`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`✅ CSV report saved: ${csvPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Quality audit complete!\n');

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('✅ Database connection pool closed');
  }
}

// Run audit
runQualityAudit()
  .then(() => {
    console.log('\n🎉 Audit finished successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Audit failed with error:', error);
    process.exit(1);
  });
