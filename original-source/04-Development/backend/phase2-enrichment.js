/**
 * Phase 2 POI Enrichment - Without Websites
 * ==========================================
 * Enriches POIs that don't have websites using only available data:
 * - POI name
 * - Category
 * - Existing description (if available)
 * - Address/City
 *
 * Target: 807 POIs without websites (excluding Accommodation)
 * Goal: Reach 96%+ overall enrichment rate (1536/1593)
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const CONFIG = {
  BATCH_SIZE: 5,
  RATE_LIMIT_MS: 2000,
  MIN_QUALITY_SCORE: 8.0,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  MISTRAL_MODEL: 'mistral-small-latest',
  MISTRAL_RETRY_ATTEMPTS: 3,
  MISTRAL_RETRY_DELAY: 5000,
  API_TIMEOUT: 30000,
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
 * Generate enriched content with Mistral AI - WITHOUT website content
 */
async function generateEnrichedContent(poi, attempt = 1) {
  // Build context from available POI data
  const contextParts = [
    `POI Name: "${poi.name}"`,
    `Category: ${poi.category}`,
    `Location: ${poi.city || 'Calpe'}`,
  ];

  if (poi.description && poi.description.trim() !== '') {
    contextParts.push(`Existing description: ${poi.description}`);
  }

  if (poi.address && poi.address.trim() !== '') {
    contextParts.push(`Address: ${poi.address}`);
  }

  const context = contextParts.join('\n');

  const prompt = `You are a travel content expert creating engaging POI descriptions for the Costa Blanca region in Spain.

${context}

Based on ONLY the information provided above (NO web research), generate TWO compelling descriptions in English:

1. TILE_DESCRIPTION (50-100 words):
   - Create an exciting, inviting hook
   - Highlight what makes this place special based on its name and category
   - Use emotional, vivid language
   - End with a call-to-action
   - Be creative but realistic for this type of ${poi.category} venue

2. DETAIL_DESCRIPTION (200-400 words):
   - Provide a comprehensive overview
   - Describe what visitors can expect from a ${poi.category} venue
   - Mention typical features and experiences for this category
   - Use engaging, descriptive language
   - Include practical information typical for this type of venue
   - Make it sound appealing and informative

IMPORTANT:
- Base your descriptions on the POI name, category, and any existing description
- Use general knowledge about ${poi.category} venues in the Costa Blanca region
- Be creative but authentic
- Make it sound inviting and professional
- Don't make specific claims you can't verify from the provided data

Return ONLY valid JSON:
{
  "tile_description": "...",
  "detail_description": "...",
  "quality_score": 8.5
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

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

      return generateEnrichedContent(poi, attempt + 1);
    }

    throw error;
  }
}

/**
 * Main Phase 2 enrichment process
 */
async function phase2Enrichment() {
  console.log('🚀 POI Enrichment Phase 2 - POIs Without Websites');
  console.log('================================================================================\n');
  console.log('Target: POIs without website (excluding Accommodation)');
  console.log('Method: Mistral AI using only available POI data\n');

  const pool = createDbPool();

  try {
    // Get POIs without websites (excluding Accommodation category)
    const [pois] = await pool.query(`
      SELECT *
      FROM POI
      WHERE (website IS NULL OR website = '')
        AND category != 'Accommodation (do not communicate)'
        AND (enriched_tile_description IS NULL OR enriched_tile_description = '')
      ORDER BY id ASC
    `);

    console.log(`✅ Found ${pois.length} POIs to enrich\n`);
    console.log('Configuration:');
    console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`);
    console.log(`  - Rate limit: ${CONFIG.RATE_LIMIT_MS}ms`);
    console.log(`  - Mistral retries: ${CONFIG.MISTRAL_RETRY_ATTEMPTS} attempts`);
    console.log(`  - Mistral retry delay: ${CONFIG.MISTRAL_RETRY_DELAY}ms`);
    console.log(`  - API timeout: ${CONFIG.API_TIMEOUT}ms`);
    console.log('\n🚀 Starting Phase 2 enrichment process...\n');

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    // Process in batches
    for (let i = 0; i < pois.length; i += CONFIG.BATCH_SIZE) {
      const batch = pois.slice(i, i + CONFIG.BATCH_SIZE);

      for (const poi of batch) {
        const progress = (((i + batch.indexOf(poi) + 1) / pois.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`[${progress}%] [${elapsed}min] Processing POI ${poi.id}: ${poi.name}`);
        console.log(`  Category: ${poi.category}`);
        console.log(`  City: ${poi.city || 'Calpe'}`);

        try {
          // Generate enriched content using only POI data
          console.log('  🤖 Generating enriched content with Mistral AI...');
          const enrichedContent = await generateEnrichedContent(poi);

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
        console.log(`  💤 Rate limit pause (${CONFIG.RATE_LIMIT_MS}ms)...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n================================================================================');
    console.log('📊 Phase 2 Results:\n');
    console.log(`  Total POIs attempted:  ${pois.length}`);
    console.log(`  Successfully enriched: ${successCount}`);
    console.log(`  Failed:                ${failCount}`);
    console.log(`  Success rate:          ${((successCount / pois.length) * 100).toFixed(1)}%`);
    console.log(`  Time elapsed:          ${totalTime} minutes`);
    console.log('\n📈 Overall Project Progress:');
    console.log(`  Phase 1 (with website):     729 POIs`);
    console.log(`  Phase 2 (without website):  +${successCount} POIs`);
    console.log(`  Total enriched:             ${729 + successCount} POIs`);
    console.log(`  Total POIs in database:     1593 POIs`);
    console.log(`  Overall success rate:       ${(((729 + successCount) / 1593) * 100).toFixed(1)}%`);
    console.log('\n================================================================================\n');

  } catch (error) {
    console.error('❌ Phase 2 enrichment failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run Phase 2 enrichment
if (require.main === module) {
  phase2Enrichment()
    .then(() => {
      console.log('🎉 Phase 2 enrichment completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { phase2Enrichment };
