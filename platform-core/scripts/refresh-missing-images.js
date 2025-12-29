#!/usr/bin/env node
/**
 * Refresh Missing Images Script
 *
 * Refreshes POIs that have no images in the imageurls table.
 * Uses Apify Google Maps Scraper to fetch fresh images and downloads them locally.
 *
 * Features:
 * - Fetches images from Apify Google Maps Scraper
 * - Downloads images locally to eliminate ephemeral URL issues
 * - Stores local path in database for 100% reliable serving
 *
 * Run: node scripts/refresh-missing-images.js
 *
 * Environment:
 *   IMAGE_REFRESH_BATCH_SIZE - Max POIs to process (default: 50)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize, QueryTypes } from 'sequelize';
import { ApifyClient } from 'apify-client';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const STORAGE_PATH = process.env.IMAGE_STORAGE_PATH ||
  '/var/www/api.holidaibutler.com/storage/poi-images';
const DOWNLOAD_TIMEOUT = 15000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'pxoziy_db1',
  process.env.DB_USER || 'pxoziy_1',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'jotx.your-database.de',
    dialect: 'mysql',
    logging: false,
  }
);

// Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Stats
const stats = {
  total_pois: 0,
  refreshed: 0,
  failed: 0,
  images_added: 0,
  images_downloaded: 0,
  images_download_failed: 0,
  skipped_no_results: 0,
};

/**
 * Fetch image data from URL
 */
async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, { timeout: DOWNLOAD_TIMEOUT }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImage(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      let totalSize = 0;

      response.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          request.destroy();
          reject(new Error('File too large'));
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Get file extension from image data
 */
function getExtension(data) {
  if (data && data.length >= 4) {
    const header = data.slice(0, 4);
    if (header[0] === 0xFF && header[1] === 0xD8) return '.jpg';
    if (header[0] === 0x89 && header[1] === 0x50) return '.png';
    if (header[0] === 0x47 && header[1] === 0x49) return '.gif';
    if (header[0] === 0x52 && header[1] === 0x49) return '.webp';
  }
  return '.jpg';
}

/**
 * Download image and save locally
 */
async function downloadAndSaveImage(imageUrl, poiId) {
  try {
    const imageData = await fetchImage(imageUrl);

    if (!imageData || imageData.length === 0) {
      return { success: false, error: 'Empty data' };
    }

    const hash = crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);
    const ext = getExtension(imageData);
    const poiDir = path.join(STORAGE_PATH, String(poiId));
    const filename = `${hash}${ext}`;
    const filePath = path.join(poiDir, filename);
    const localPath = `/poi-images/${poiId}/${filename}`;

    await fs.mkdir(poiDir, { recursive: true });
    await fs.writeFile(filePath, imageData);

    return {
      success: true,
      localPath,
      fileSize: imageData.length,
      fileHash: hash
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch images for a POI from Google Places via Apify
 */
async function fetchImagesFromApify(poi) {
  try {
    // Use the Google Maps Scraper actor (compass/crawler-google-places)
    const actorId = process.env.APIFY_ACTOR_ID || 'compass/crawler-google-places';
    const run = await apifyClient.actor(actorId).call({
      searchStringsArray: [`${poi.name} ${poi.city || 'Calpe'} Spain`],
      maxCrawledPlacesPerSearch: 1,
      language: 'en',
      maxImages: 10,
    }, {
      timeout: 60000, // 60 seconds
    });

    // Get results
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return [];
    }

    const place = items[0];

    // Extract image URLs
    const imageUrls = place.imageUrls || place.images || [];

    return imageUrls.slice(0, 10); // Max 10 images

  } catch (error) {
    console.error(`  Error fetching from Apify: ${error.message}`);
    return [];
  }
}

/**
 * Save images to database with local download
 */
async function saveImages(poiId, googlePlaceId, imageUrls) {
  for (let i = 0; i < imageUrls.length; i++) {
    const url = typeof imageUrls[i] === 'string' ? imageUrls[i] : imageUrls[i].url;

    // Try to download image locally
    const downloadResult = await downloadAndSaveImage(url, poiId);

    if (downloadResult.success) {
      // Save with local path
      await sequelize.query(`
        INSERT INTO imageurls (poi_id, image_id, image_url, local_path, file_size, file_hash, downloaded_at, last_fetched_at, source, google_place_id)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 'google_places', ?)
      `, {
        replacements: [
          poiId, i + 1, url,
          downloadResult.localPath,
          downloadResult.fileSize,
          downloadResult.fileHash,
          googlePlaceId
        ]
      });
      stats.images_downloaded++;
    } else {
      // Save URL only (fallback)
      await sequelize.query(`
        INSERT INTO imageurls (poi_id, image_id, image_url, last_fetched_at, source, google_place_id)
        VALUES (?, ?, ?, NOW(), 'google_places', ?)
      `, {
        replacements: [poiId, i + 1, url, googlePlaceId]
      });
      stats.images_download_failed++;
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Refresh Missing Images');
  console.log('='.repeat(60));
  console.log('');

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Check Apify token
    if (!process.env.APIFY_API_TOKEN) {
      console.error('ERROR: APIFY_API_TOKEN not set in environment');
      process.exit(1);
    }

    // Get POIs without images
    const pois = await sequelize.query(`
      SELECT p.id, p.name, p.city, p.google_placeid
      FROM POI p
      WHERE p.is_active = 1
        AND p.google_placeid IS NOT NULL
        AND p.id NOT IN (SELECT DISTINCT poi_id FROM imageurls)
      ORDER BY p.id
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    stats.total_pois = pois.length;
    console.log(`Found ${pois.length} POIs without images\n`);

    if (pois.length === 0) {
      console.log('All POIs already have images!');
      return;
    }

    // Process each POI
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[${i + 1}/${pois.length}] ${poi.name}...`);

      try {
        // Fetch images from Apify
        const imageUrls = await fetchImagesFromApify(poi);

        if (imageUrls.length === 0) {
          console.log(`  No images found, skipping`);
          stats.skipped_no_results++;
          continue;
        }

        // Save to database
        await saveImages(poi.id, poi.google_placeid, imageUrls);

        console.log(`  Added ${imageUrls.length} images`);
        stats.refreshed++;
        stats.images_added += imageUrls.length;

      } catch (error) {
        console.error(`  Failed: ${error.message}`);
        stats.failed++;
      }

      // Rate limiting: wait 3 seconds between requests
      if (i < pois.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total POIs processed: ${stats.total_pois}`);
    console.log(`Successfully refreshed: ${stats.refreshed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped (no results): ${stats.skipped_no_results}`);
    console.log(`Total images added: ${stats.images_added}`);
    console.log(`  - Downloaded locally: ${stats.images_downloaded}`);
    console.log(`  - URL only (fallback): ${stats.images_download_failed}`);
    console.log(`Estimated cost: €${(stats.refreshed * 0.003).toFixed(2)}`);

  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await sequelize.close();
  }
}

main();
