/**
 * Fix Expired Image URLs Script
 *
 * This script validates and cleans expired Google image URLs from:
 * 1. imageurls table (PRIMARY source - used for POI tiles/detail)
 * 2. POI table images field (FALLBACK - legacy JSON array)
 *
 * Google Places API photo URLs expire after some time (typically 30-90 days)
 * returning HTTP 403 Forbidden when accessed.
 *
 * Run: node scripts/fix-expired-images.js
 */

import { Sequelize, QueryTypes } from 'sequelize';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'pxoziy_db1',
  process.env.DB_USER || 'pxoziy_1',
  process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
  {
    host: process.env.DB_HOST || 'jotx.your-database.de',
    dialect: 'mysql',
    logging: false,
  }
);

// Statistics
const stats = {
  imageurls: { checked: 0, deleted: 0, valid: 0, errors: 0 },
  poi: { checked: 0, cleared: 0, valid: 0, errors: 0 }
};

/**
 * Check if URL is accessible with HEAD request
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const req = https.request(url, { method: 'HEAD' }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Fix expired images in imageurls table (PRIMARY source)
 */
async function fixImageUrlsTable() {
  console.log('\n=== Checking imageurls table ===\n');

  // Get all unique POI IDs with images
  const poiIds = await sequelize.query(
    `SELECT DISTINCT poi_id FROM imageurls ORDER BY poi_id`,
    { type: QueryTypes.SELECT }
  );

  console.log(`Found ${poiIds.length} POIs with images in imageurls table\n`);

  for (const { poi_id } of poiIds) {
    // Get images for this POI
    const images = await sequelize.query(
      `SELECT id, image_url FROM imageurls WHERE poi_id = ? ORDER BY image_id`,
      { replacements: [poi_id], type: QueryTypes.SELECT }
    );

    if (images.length === 0) continue;

    // Check first image (representative sample)
    const firstImage = images[0];
    stats.imageurls.checked++;

    const isValid = await checkUrl(firstImage.image_url);

    if (!isValid) {
      // Delete ALL images for this POI (if first is expired, likely all are)
      await sequelize.query(
        `DELETE FROM imageurls WHERE poi_id = ?`,
        { replacements: [poi_id] }
      );
      console.log(`[imageurls] Deleted ${images.length} expired images for POI ${poi_id}`);
      stats.imageurls.deleted += images.length;
    } else {
      stats.imageurls.valid++;
      if (stats.imageurls.checked % 50 === 0) {
        console.log(`[imageurls] Progress: ${stats.imageurls.checked} POIs checked...`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 50));
  }
}

/**
 * Fix expired images in POI table (FALLBACK source)
 */
async function fixPoiTable() {
  console.log('\n=== Checking POI table ===\n');

  const pois = await sequelize.query(
    `SELECT id, name, images, thumbnail_url FROM POI
     WHERE images IS NOT NULL AND images != '[]' AND images != ''
     LIMIT 1000`,
    { type: QueryTypes.SELECT }
  );

  console.log(`Found ${pois.length} POIs with images in POI table\n`);

  for (const poi of pois) {
    stats.poi.checked++;

    // Parse images array
    let images = [];
    try {
      images = typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images;
    } catch (e) {
      stats.poi.errors++;
      continue;
    }

    if (!Array.isArray(images) || images.length === 0) continue;

    // Check first image
    const firstUrl = images[0];
    const isValid = await checkUrl(firstUrl);

    if (!isValid) {
      // Clear images and thumbnail_url
      await sequelize.query(
        `UPDATE POI SET images = NULL, thumbnail_url = NULL WHERE id = ?`,
        { replacements: [poi.id] }
      );
      console.log(`[POI] Cleared images for: ${poi.name} (ID: ${poi.id})`);
      stats.poi.cleared++;
    } else {
      stats.poi.valid++;
      if (stats.poi.checked % 50 === 0) {
        console.log(`[POI] Progress: ${stats.poi.checked} POIs checked...`);
      }
    }

    // Small delay
    await new Promise(r => setTimeout(r, 50));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(50));
  console.log('Fix Expired Image URLs');
  console.log('='.repeat(50));

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Fix imageurls table (primary source)
    await fixImageUrlsTable();

    // Fix POI table (fallback source)
    await fixPoiTable();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log('\nimageurls table:');
    console.log(`  - POIs checked: ${stats.imageurls.checked}`);
    console.log(`  - Images deleted: ${stats.imageurls.deleted}`);
    console.log(`  - Valid POIs: ${stats.imageurls.valid}`);

    console.log('\nPOI table:');
    console.log(`  - POIs checked: ${stats.poi.checked}`);
    console.log(`  - POIs cleared: ${stats.poi.cleared}`);
    console.log(`  - Valid POIs: ${stats.poi.valid}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

main();
