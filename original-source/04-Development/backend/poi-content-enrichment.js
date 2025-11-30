/**
 * POI Content Enrichment Pipeline
 * =================================
 * Multi-source webscraping + AI content generation
 *
 * Sources:
 * 1. POI's own website (if available)
 * 2. Google Search for "About" pages
 * 3. TripAdvisor
 * 4. GetYourGuide
 * 5. TheFork (Food category)
 * 6. MindTripAI
 *
 * Output:
 * - Tile description (50-100 words)
 * - Detail card description (200-400 words)
 * - Quality score ≥8.0
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

// Import Social Media Discovery module for Phase 2
const { discoverAllURLs } = require('./modules/social-media-discovery');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

// Configuration
const CONFIG = {
  BATCH_SIZE: 5, // Process 5 POIs at a time
  RATE_LIMIT_MS: 2000, // 2 seconds between batches
  MIN_QUALITY_SCORE: 8.0,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  MISTRAL_MODEL: 'mistral-small-latest',
  // Process limits (0 = unlimited)
  MAX_POIS_TO_PROCESS: parseInt(getArg('limit', process.env.POI_ENRICHMENT_LIMIT || '10')),
  // Phase selection: 'phase1' (with website) or 'phase2' (without website) or 'all'
  PHASE: getArg('phase', process.env.POI_ENRICHMENT_PHASE || 'phase1'),
};

// Database pool
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
 * Scrape POI's own website for "About" content
 */
async function scrapeOwnWebsite(poi) {
  if (!poi.website || poi.website.trim() === '') {
    return null;
  }

  try {
    const response = await fetch(poi.website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HolidAIbutler/1.0)' },
      timeout: 10000
    });

    if (!response.ok) {
      console.log(`  ⚠️  Website returned ${response.status}: ${poi.website}`);
      return null;
    }

    const html = await response.text();

    // Extract "About" section using simple heuristics
    const aboutMatches = html.match(/<section[^>]*about[^>]*>[\s\S]*?<\/section>/gi) ||
                        html.match(/<div[^>]*about[^>]*>[\s\S]*?<\/div>/gi) ||
                        [];

    if (aboutMatches.length > 0) {
      // Clean HTML tags and extract text
      const text = aboutMatches[0]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text.substring(0, 1000); // Limit to 1000 chars
    }

    // Fallback: extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaMatch) {
      return metaMatch[1];
    }

    return null;
  } catch (error) {
    console.log(`  ⚠️  Failed to scrape website: ${error.message}`);
    return null;
  }
}

/**
 * Search external sources for POI information
 */
async function searchExternalSources(poi) {
  const sources = {
    tripadvisor: null,
    getyourguide: null,
    thefork: null,
    mindtripai: null
  };

  // Build search queries
  const searchQuery = `${poi.name} ${poi.city || 'Calpe'}`;

  try {
    // Note: These would ideally use proper APIs, but for now we'll use search
    // In production, implement proper API integrations

    // For now, we'll return placeholders indicating that external search is needed
    console.log(`  🔍 External search needed for: "${searchQuery}"`);
    console.log(`     - TripAdvisor`);
    console.log(`     - GetYourGuide`);
    if (poi.category === 'Food & Drinks') {
      console.log(`     - TheFork`);
    }
    console.log(`     - MindTripAI`);

    // TODO: Implement actual API calls or web scraping
    // For now, return null to indicate manual/API integration needed

  } catch (error) {
    console.log(`  ⚠️  External source search failed: ${error.message}`);
  }

  return sources;
}

/**
 * Generate enriched content using Mistral AI
 */
async function generateEnrichedContent(poi, scrapedData) {
  const prompt = `You are a professional travel content writer creating engaging POI descriptions for a tourism platform.

POI Information:
- Name: ${poi.name}
- Category: ${poi.category}
- Subcategory: ${poi.subcategory || 'N/A'}
- City: ${poi.city || 'Calpe'}
- Address: ${poi.address || 'N/A'}
- Phone: ${poi.phone || 'N/A'}
- Rating: ${poi.rating || 'N/A'}/5 (${poi.review_count || 0} reviews)
- Price Level: ${'€'.repeat(poi.price_level || 1)}
${poi.opening_hours ? `- Opening Hours: ${poi.opening_hours}` : ''}

Scraped Content from Website:
${scrapedData.ownWebsite || 'No website content available'}

Current Description (needs improvement):
${poi.description || 'No current description'}

Task: Create TWO high-quality descriptions:

1. TILE DESCRIPTION (50-100 words):
   - Concise, attention-grabbing
   - Highlight key unique features
   - Make readers want to click for more
   - Focus on "why visit" and "what makes it special"

2. DETAIL DESCRIPTION (200-400 words):
   - Comprehensive overview
   - Cover: What it is, Where (location context), Who it's for, Why visit
   - Include practical details (hours, price range, specialties)
   - Engaging, vivid language
   - Professional tone
   - Target audience: tourists/visitors

Quality Requirements:
- Factual and accurate
- No marketing hype or exaggerations
- Clear, well-structured
- Engaging and informative
- Professional grammar
- Target score: 8.0+/10

Respond in this EXACT JSON format:
{
  "tile_description": "Your 50-100 word tile description here",
  "detail_description": "Your 200-400 word detail description here",
  "key_highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "target_audience": "Who this POI is perfect for",
  "best_time_to_visit": "When to visit (if applicable)",
  "estimated_quality_score": 8.5
}`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.MISTRAL_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Mistral');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate quality score
    if (result.estimated_quality_score < CONFIG.MIN_QUALITY_SCORE) {
      console.log(`  ⚠️  Generated content quality too low: ${result.estimated_quality_score}`);
      return null;
    }

    return result;

  } catch (error) {
    console.log(`  ❌ Content generation failed: ${error.message}`);
    return null;
  }
}

/**
 * Update POI with enriched content
 */
async function updatePOIContent(pool, poiId, enrichedContent, scrapedData, discoveredUrls = {}) {
  try {
    // Build update query - only update website if discovered
    const updates = [
      'description = ?',
      'enriched_tile_description = ?',
      'enriched_detail_description = ?',
      'enriched_highlights = ?',
      'enriched_target_audience = ?',
      'enriched_best_time = ?',
      'enriched_sources = ?',
      'content_quality_score = ?',
      'facebook_url = ?',
      'instagram_url = ?',
      'enrichment_completed_at = NOW()',
      'last_updated = NOW()'
    ];

    const params = [
      enrichedContent.detail_description, // Use detail description as main
      enrichedContent.tile_description,
      enrichedContent.detail_description,
      JSON.stringify(enrichedContent.key_highlights),
      enrichedContent.target_audience,
      enrichedContent.best_time_to_visit,
      JSON.stringify({
        own_website: scrapedData.ownWebsite ? 'scraped' : 'none',
        external_sources: scrapedData.externalSources,
        discovered_website: discoveredUrls.website || null,
        facebook: discoveredUrls.facebook || null,
        instagram: discoveredUrls.instagram || null
      }),
      enrichedContent.estimated_quality_score,
      discoveredUrls.facebook || null,
      discoveredUrls.instagram || null
    ];

    // If website was discovered, update that too
    if (discoveredUrls.website) {
      updates.splice(1, 0, 'website = ?'); // Insert after description
      params.splice(1, 0, discoveredUrls.website);
    }

    params.push(poiId); // Add poiId at the end for WHERE clause

    await pool.query(`
      UPDATE POI SET
        ${updates.join(',\n        ')}
      WHERE id = ?
    `, params);

    console.log(`  ✅ POI ${poiId} updated with enriched content`);
    if (discoveredUrls.website) {
      console.log(`     📌 Discovered website URL saved to database`);
    }
    return true;

  } catch (error) {
    console.log(`  ❌ Failed to update POI ${poiId}: ${error.message}`);
    return false;
  }
}

/**
 * Main enrichment function
 */
async function enrichPOIContent() {
  console.log('🌐 POI Content Enrichment Pipeline - Starting...\n');
  console.log('='.repeat(80));

  const pool = createDbPool();

  try {
    // Build WHERE clause based on phase
    let whereClause = 'is_active = TRUE';
    let phaseDescription = '';

    if (CONFIG.PHASE === 'phase1') {
      // Phase 1: POIs with websites
      whereClause += ' AND website IS NOT NULL AND website != ""';
      phaseDescription = 'Phase 1: POIs with websites';
    } else if (CONFIG.PHASE === 'phase2') {
      // Phase 2: POIs without websites
      whereClause += ' AND (website IS NULL OR website = "")';
      phaseDescription = 'Phase 2: POIs without websites';
    } else {
      // All POIs
      phaseDescription = 'All POIs';
    }

    // Only process POIs that haven't been enriched yet or have low quality
    whereClause += ` AND (
      enrichment_completed_at IS NULL
      OR content_quality_score IS NULL
      OR content_quality_score < ${CONFIG.MIN_QUALITY_SCORE}
    )`;

    const limitClause = CONFIG.MAX_POIS_TO_PROCESS > 0 ? `LIMIT ${CONFIG.MAX_POIS_TO_PROCESS}` : '';

    // Get POIs that need enrichment
    const [pois] = await pool.query(`
      SELECT
        id, name, description, category, subcategory,
        city, address, phone, website, rating, review_count,
        price_level, opening_hours, content_quality_score,
        facebook_url, instagram_url
      FROM POI
      WHERE ${whereClause}
      ORDER BY
        CASE
          WHEN content_quality_score IS NULL THEN 0
          ELSE content_quality_score
        END ASC,
        review_count DESC
      ${limitClause}
    `);

    console.log(`✅ Found ${pois.length} POIs to enrich (${phaseDescription})\n`);

    if (pois.length === 0) {
      console.log('No POIs need enrichment. All done!');
      await pool.end();
      return;
    }

    const stats = {
      total: pois.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };

    console.log('🚀 Starting enrichment process...\n');
    console.log(`Configuration:`);
    console.log(`  - Phase: ${phaseDescription}`);
    console.log(`  - Max POIs to process: ${CONFIG.MAX_POIS_TO_PROCESS === 0 ? 'Unlimited' : CONFIG.MAX_POIS_TO_PROCESS}`);
    console.log(`  - Batch size: ${CONFIG.BATCH_SIZE} POIs`);
    console.log(`  - Rate limit: ${CONFIG.RATE_LIMIT_MS}ms between batches`);
    console.log(`  - Min quality score: ${CONFIG.MIN_QUALITY_SCORE}`);
    console.log(`  - Sources: Own website, TripAdvisor, GetYourGuide, TheFork, MindTripAI\n`);

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      const progress = ((i + 1) / pois.length * 100).toFixed(1);

      console.log(`[${progress}%] Processing POI ${poi.id}: ${poi.name}`);
      console.log(`  Category: ${poi.category}`);
      console.log(`  Current score: ${poi.content_quality_score || 'N/A'}`);
      console.log(`  Website: ${poi.website || 'None'}`);

      let discoveredUrls = { website: null, facebook: null, instagram: null };
      let ownWebsiteContent = null;

      // Phase 2: If no website, try to discover one first
      if (CONFIG.PHASE === 'phase2' && (!poi.website || poi.website.trim() === '')) {
        console.log(`  🔍 Phase 2: Discovering URLs (Website, Facebook, Instagram)...`);
        discoveredUrls = await discoverAllURLs(poi);

        // If website found, use it for scraping
        if (discoveredUrls.website) {
          poi.website = discoveredUrls.website; // Temporarily set for scraping
          console.log(`  📥 Scraping discovered website...`);
          ownWebsiteContent = await scrapeOwnWebsite(poi);
          if (ownWebsiteContent) {
            console.log(`  ✅ Found ${ownWebsiteContent.length} chars from discovered website`);
          }
        }
      } else if (poi.website && poi.website.trim() !== '') {
        // Phase 1: Scrape existing website
        console.log(`  📥 Scraping website...`);
        ownWebsiteContent = await scrapeOwnWebsite(poi);
        if (ownWebsiteContent) {
          console.log(`  ✅ Found ${ownWebsiteContent.length} chars from website`);
        }
      }

      // Search external sources (currently placeholder)
      const externalSources = await searchExternalSources(poi);

      // Generate enriched content with all available data
      console.log(`  🤖 Generating enriched content with Mistral AI...`);
      const enrichedContent = await generateEnrichedContent(poi, {
        ownWebsite: ownWebsiteContent,
        externalSources
      });

      if (enrichedContent) {
        console.log(`  ✅ Content generated (score: ${enrichedContent.estimated_quality_score})`);
        console.log(`  📝 Tile: ${enrichedContent.tile_description.substring(0, 80)}...`);

        // Update database with enriched content + discovered URLs
        const updated = await updatePOIContent(pool, poi.id, enrichedContent, {
          ownWebsite: ownWebsiteContent,
          externalSources
        }, discoveredUrls);

        if (updated) {
          stats.success++;
        } else {
          stats.failed++;
        }
      } else {
        console.log(`  ❌ Content generation failed`);
        stats.failed++;
      }

      stats.processed++;

      // Rate limiting
      if ((i + 1) % CONFIG.BATCH_SIZE === 0 && i < pois.length - 1) {
        console.log(`  💤 Rate limit pause (${CONFIG.RATE_LIMIT_MS}ms)...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      } else {
        console.log('');
      }
    }

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 ENRICHMENT RESULTS');
    console.log('='.repeat(80));
    console.log(`\nTotal POIs processed: ${stats.processed}`);
    console.log(`  ✅ Successfully enriched: ${stats.success}`);
    console.log(`  ❌ Failed: ${stats.failed}`);
    console.log(`  ⏭️  Skipped: ${stats.skipped}`);
    console.log(`\nSuccess rate: ${(stats.success / stats.processed * 100).toFixed(1)}%`);

    await pool.end();
    console.log('\n✅ Enrichment complete!\n');

  } catch (error) {
    console.error('\n❌ Enrichment failed:', error);
    throw error;
  }
}

// Run enrichment
enrichPOIContent()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
