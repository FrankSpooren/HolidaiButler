/**
 * Retry POI Enrichment - Phase 1 Completion
 * ==========================================
 * Focuses on retrying POIs that failed due to:
 * - Mistral AI API errors (~45 POIs)
 * - Not attempted yet (~71 POIs)
 *
 * Skips:
 * - Website access failures (will be handled separately)
 * - Accommodation POIs (intentionally excluded)
 *
 * Target: +116 POIs to reach 663/747 = 88.8% success rate
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration with improvements
const CONFIG = {
  BATCH_SIZE: 5,
  RATE_LIMIT_MS: 2000,
  MIN_QUALITY_SCORE: 8.0,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  MISTRAL_MODEL: 'mistral-small-latest',
  // Faster timeouts to skip problematic websites quickly
  WEBSITE_TIMEOUT: 8000, // 8 seconds (reduced from 10)
  // Retry configuration for Mistral API
  MISTRAL_RETRY_ATTEMPTS: 3,
  MISTRAL_RETRY_DELAY: 5000, // 5 seconds between retries
};

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
 * Scrape website with shorter timeout
 */
async function scrapeWebsite(poi) {
  if (!poi.website || poi.website.trim() === '') {
    return null;
  }

  try {
    const response = await fetch(poi.website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HolidAIbutler/1.0)' },
      timeout: CONFIG.WEBSITE_TIMEOUT
    });

    if (!response.ok) {
      return null; // Skip silently for failed websites
    }

    const html = await response.text();
    const aboutMatches = html.match(/<section[^>]*about[^>]*>[\s\S]*?<\/section>/gi) ||
                        html.match(/<div[^>]*about[^>]*>[\s\S]*?<\/div>/gi) ||
                        [];

    if (aboutMatches.length > 0) {
      const text = aboutMatches[0]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.substring(0, 1000);
    }

    // Fallback: get meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaMatch) {
      return metaMatch[1].substring(0, 500);
    }

    return null;
  } catch (error) {
    return null; // Skip silently
  }
}

/**
 * Generate enriched content with Mistral AI - WITH RETRY LOGIC
 */
async function generateEnrichedContent(poi, websiteContent, attempt = 1) {
  const prompt = `You are a travel content expert. Create engaging POI descriptions for "${poi.name}" in ${poi.city || 'Calpe'}.

Category: ${poi.category}
${websiteContent ? `About: ${websiteContent}` : 'No website content available'}
${poi.description ? `Existing description: ${poi.description}` : ''}

Generate TWO descriptions in English:

1. TILE_DESCRIPTION (50-100 words):
   - Hook readers with excitement
   - Highlight unique features
   - Use emotional language
   - End with call-to-action

2. DETAIL_DESCRIPTION (200-400 words):
   - Comprehensive overview
   - What makes it special
   - Who should visit
   - Practical information
   - Vivid, engaging tone

Return ONLY valid JSON:
{
  "tile_description": "...",
  "detail_description": "...",
  "quality_score": 8.5
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.MISTRAL_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.quality_score >= CONFIG.MIN_QUALITY_SCORE) {
      return result;
    }

    throw new Error(`Quality score too low: ${result.quality_score}`);

  } catch (error) {
    // Retry logic for Mistral API errors
    if (attempt < CONFIG.MISTRAL_RETRY_ATTEMPTS) {
      console.log(`  ⚠️  Mistral API error (attempt ${attempt}/${CONFIG.MISTRAL_RETRY_ATTEMPTS}): ${error.message}`);
      console.log(`  ⏳ Waiting ${CONFIG.MISTRAL_RETRY_DELAY}ms before retry...`);

      await new Promise(resolve => setTimeout(resolve, CONFIG.MISTRAL_RETRY_DELAY));

      return generateEnrichedContent(poi, websiteContent, attempt + 1);
    }

    throw error;
  }
}

/**
 * Main retry enrichment process
 */
async function retryEnrichment() {
  console.log('🔄 POI Enrichment Retry - Phase 1 Completion');
  console.log('================================================================================\n');
  console.log('Target: Mistral API errors + Not attempted POIs');
  console.log('Expected: +116 POIs to reach 88.8% success rate\n');

  const pool = createDbPool();

  try {
    // Get failed POIs (excluding Accommodation category)
    const [pois] = await pool.query(`
      SELECT *
      FROM POI
      WHERE website IS NOT NULL
        AND website != ''
        AND category != 'Accommodation (do not communicate)'
        AND (enriched_tile_description IS NULL OR enriched_tile_description = '')
      ORDER BY id ASC
    `);

    console.log(`✅ Found ${pois.length} POIs to retry\n`);
    console.log('Configuration:');
    console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`);
    console.log(`  - Rate limit: ${CONFIG.RATE_LIMIT_MS}ms`);
    console.log(`  - Website timeout: ${CONFIG.WEBSITE_TIMEOUT}ms (faster)`);
    console.log(`  - Mistral retries: ${CONFIG.MISTRAL_RETRY_ATTEMPTS} attempts`);
    console.log(`  - Mistral retry delay: ${CONFIG.MISTRAL_RETRY_DELAY}ms`);
    console.log('\n🚀 Starting retry process...\n');

    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < pois.length; i += CONFIG.BATCH_SIZE) {
      const batch = pois.slice(i, i + CONFIG.BATCH_SIZE);

      for (const poi of batch) {
        const progress = ((i + 1) / pois.length * 100).toFixed(1);
        console.log(`[${progress}%] Processing POI ${poi.id}: ${poi.name}`);
        console.log(`  Category: ${poi.category}`);

        try {
          // Try to scrape website (with shorter timeout)
          const websiteContent = await scrapeWebsite(poi);
          if (websiteContent) {
            console.log(`  ✅ Found ${websiteContent.length} chars from website`);
          }

          // Generate enriched content (with retry logic)
          console.log('  🤖 Generating enriched content with Mistral AI...');
          const enrichedContent = await generateEnrichedContent(poi, websiteContent);

          console.log(`  ✅ Content generated (score: ${enrichedContent.quality_score})`);
          console.log(`  📝 Tile: ${enrichedContent.tile_description.substring(0, 70)}...`);

          // Update database
          await pool.query(`
            UPDATE POI
            SET
              enriched_tile_description = ?,
              enriched_detail_description = ?,
              content_quality_score = ?,
              enrichment_completed_at = NOW()
            WHERE id = ?
          `, [
            enrichedContent.tile_description,
            enrichedContent.detail_description,
            enrichedContent.quality_score,
            poi.id
          ]);

          console.log(`  ✅ POI ${poi.id} updated with enriched content\n`);
          successCount++;

        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}\n`);
          failCount++;
        }
      }

      // Rate limiting between batches
      if (i + CONFIG.BATCH_SIZE < pois.length) {
        console.log(`  💤 Rate limit pause (${CONFIG.RATE_LIMIT_MS}ms)...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      }
    }

    console.log('\n================================================================================');
    console.log('📊 Retry Results:\n');
    console.log(`  Total POIs attempted:  ${pois.length}`);
    console.log(`  Successfully enriched: ${successCount}`);
    console.log(`  Failed:                ${failCount}`);
    console.log(`  Success rate:          ${((successCount / pois.length) * 100).toFixed(1)}%`);
    console.log('\n📈 Overall Progress:');
    console.log(`  Previous:              547 POIs`);
    console.log(`  New:                   +${successCount} POIs`);
    console.log(`  Total enriched:        ${547 + successCount} POIs`);
    console.log(`  Overall success rate:  ${(((547 + successCount) / 747) * 100).toFixed(1)}%`);
    console.log('\n================================================================================\n');

  } catch (error) {
    console.error('❌ Retry process failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run retry
if (require.main === module) {
  retryEnrichment()
    .then(() => {
      console.log('🎉 Retry process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { retryEnrichment };
