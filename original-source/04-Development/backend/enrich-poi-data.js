/**
 * POI Data Enrichment Script
 *
 * Purpose: Enrich Hetzner database POIs with data from Google Places CSV
 * - Adds rating scores
 * - Adds review counts and star distributions
 * - Adds image URLs
 * - Adds opening hours (if available)
 *
 * Usage:
 *   node enrich-poi-data.js --dry-run    # Test without making changes
 *   node enrich-poi-data.js              # Execute updates
 *
 * Date: 2025-11-07
 */

// Load environment variables FIRST
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

// Configuration
const JSON_DATA_PATH = path.join(__dirname, 'poi-enrichment-data.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50; // Process in batches to avoid overwhelming the database

/**
 * Load enrichment data from JSON file
 */
function loadEnrichmentData() {
  console.log('📖 Reading enrichment data from JSON...');

  if (!fs.existsSync(JSON_DATA_PATH)) {
    throw new Error(`JSON data file not found: ${JSON_DATA_PATH}\nPlease run parse-csv-to-json.py first!`);
  }

  const jsonContent = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
  const dataObject = JSON.parse(jsonContent);

  // Convert object to Map for easier lookups
  const dataMap = new Map(Object.entries(dataObject));

  console.log(`✅ Loaded ${dataMap.size} POI records from JSON\n`);
  return dataMap;
}

/**
 * Get all POIs from database
 */
async function getDatabasePOIs() {
  console.log('🔍 Fetching POIs from database...');
  const pois = await query('SELECT id, google_placeid, rating, review_count, thumbnail_url, opening_hours FROM POI');
  console.log(`Found ${pois.length} POIs in database\n`);
  return pois;
}

/**
 * Generate UPDATE SQL for a POI
 */
function generateUpdateSQL(poi, enrichData) {
  const updates = [];
  const values = [];

  // Rating
  if (enrichData.rating !== null && poi.rating === null) {
    updates.push('rating = ?');
    values.push(enrichData.rating);
  }

  // Review count
  if (enrichData.reviewCount !== null && (poi.review_count === 0 || poi.review_count === null)) {
    updates.push('review_count = ?');
    values.push(enrichData.reviewCount);
  }

  // Image URL
  if (enrichData.imageUrl && !poi.thumbnail_url) {
    updates.push('thumbnail_url = ?');
    values.push(enrichData.imageUrl);
  }

  // Opening hours
  if (enrichData.openingHours && !poi.opening_hours) {
    updates.push('opening_hours = ?');
    values.push(enrichData.openingHours);
  }

  if (updates.length === 0) return null;

  const sql = `UPDATE POI SET ${updates.join(', ')} WHERE id = ?`;
  values.push(poi.id);

  return { sql, values };
}

/**
 * Main enrichment process
 */
async function enrichData() {
  try {
    console.log('🚀 Starting POI Data Enrichment\n');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE (database will be updated)'}\n`);
    console.log('=' .repeat(80) + '\n');

    // Load enrichment data
    const csvData = loadEnrichmentData();

    // Get database POIs
    const dbPOIs = await getDatabasePOIs();

    // Match and prepare updates
    console.log('🔗 Matching POIs and preparing updates...\n');

    const updates = [];
    const stats = {
      matched: 0,
      withUpdates: 0,
      ratings: 0,
      reviewCounts: 0,
      images: 0,
      openingHours: 0,
      noMatch: 0,
      noUpdatesNeeded: 0
    };

    for (const poi of dbPOIs) {
      if (!poi.google_placeid) {
        stats.noMatch++;
        continue;
      }

      const enrichData = csvData.get(poi.google_placeid);

      if (!enrichData) {
        stats.noMatch++;
        continue;
      }

      stats.matched++;

      const updateSQL = generateUpdateSQL(poi, enrichData);

      if (!updateSQL) {
        stats.noUpdatesNeeded++;
        continue;
      }

      stats.withUpdates++;

      // Count what's being updated
      if (enrichData.rating !== null && poi.rating === null) stats.ratings++;
      if (enrichData.reviewCount !== null && (poi.review_count === 0 || poi.review_count === null)) stats.reviewCounts++;
      if (enrichData.imageUrl && !poi.thumbnail_url) stats.images++;
      if (enrichData.openingHours && !poi.opening_hours) stats.openingHours++;

      updates.push({
        poi,
        enrichData,
        updateSQL
      });
    }

    // Display statistics
    console.log('📊 Matching Statistics:');
    console.log(`  Total POIs in database: ${dbPOIs.length}`);
    console.log(`  Total records in CSV: ${csvData.size}`);
    console.log(`  Matched by google_placeid: ${stats.matched}`);
    console.log(`  POIs with updates: ${stats.withUpdates}`);
    console.log(`  POIs with no match: ${stats.noMatch}`);
    console.log(`  POIs already up-to-date: ${stats.noUpdatesNeeded}\n`);

    console.log('📈 Update Breakdown:');
    console.log(`  Ratings to add: ${stats.ratings}`);
    console.log(`  Review counts to add: ${stats.reviewCounts}`);
    console.log(`  Images to add: ${stats.images}`);
    console.log(`  Opening hours to add: ${stats.openingHours}\n`);

    if (updates.length === 0) {
      console.log('✅ No updates needed - all POIs are already up-to-date!\n');
      return;
    }

    // Execute updates
    if (DRY_RUN) {
      console.log('🔍 DRY RUN - Showing first 5 example updates:\n');
      updates.slice(0, 5).forEach((update, idx) => {
        console.log(`Example ${idx + 1}: ${update.poi.name || update.poi.google_placeid}`);
        console.log(`  SQL: ${update.updateSQL.sql}`);
        console.log(`  Values: ${JSON.stringify(update.updateSQL.values)}\n`);
      });
      console.log(`Total ${updates.length} POIs would be updated.\n`);
    } else {
      console.log(`✍️  Executing ${updates.length} updates in batches of ${BATCH_SIZE}...\n`);

      let completed = 0;
      let errors = 0;

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        for (const update of batch) {
          try {
            await query(update.updateSQL.sql, update.updateSQL.values);
            completed++;

            if (completed % 100 === 0) {
              console.log(`  ✅ Progress: ${completed}/${updates.length} POIs updated`);
            }
          } catch (err) {
            errors++;
            console.error(`  ❌ Error updating POI ${update.poi.id}: ${err.message}`);
          }
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ Enrichment Complete!\n');
      console.log(`  Successfully updated: ${completed} POIs`);
      console.log(`  Errors: ${errors}`);
      console.log(`  Total processed: ${updates.length}\n`);
    }

    // Sample verification query
    if (!DRY_RUN && updates.length > 0) {
      console.log('🔍 Verification - Sample of updated POIs:\n');
      const samples = await query(`
        SELECT name, rating, review_count,
               CASE WHEN thumbnail_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_image,
               CASE WHEN opening_hours IS NOT NULL THEN 'YES' ELSE 'NO' END as has_hours
        FROM POI
        WHERE rating IS NOT NULL OR review_count > 0 OR thumbnail_url IS NOT NULL
        LIMIT 5
      `);

      samples.forEach((poi, idx) => {
        console.log(`${idx + 1}. ${poi.name || 'Unnamed POI'}`);
        console.log(`   Rating: ${poi.rating || 'N/A'} | Reviews: ${poi.review_count || 0}`);
        console.log(`   Image: ${poi.has_image} | Hours: ${poi.has_hours}\n`);
      });
    }

    console.log('✨ Done!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run
enrichData();
