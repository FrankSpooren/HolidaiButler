#!/usr/bin/env node
/**
 * Comprehensive POI Image Refresh Script
 *
 * Ensures every POI has 5-10 high-quality images stored locally on Hetzner.
 *
 * Features:
 * - Inventories current image status per POI (local vs failed external)
 * - Only fetches what's needed (no duplicate downloads)
 * - Uses Apify Google Maps Scraper for fresh, popular images
 * - Downloads directly to local Hetzner storage
 * - Prioritizes most viewed/rated Google images
 *
 * Usage:
 *   node scripts/refresh-all-poi-images.js [options]
 *
 * Options:
 *   --limit=N         Max POIs to process (default: all)
 *   --min-images=N    Minimum images per POI (default: 5)
 *   --max-images=N    Maximum images per POI (default: 10)
 *   --priority=TYPE   Priority: 'no-images' | 'failed-only' | 'all' (default: all)
 *   --dry-run         Show what would be done without fetching
 *   --poi=ID          Process specific POI only
 *   --batch-size=N    POIs per batch for Apify (default: 10)
 *   --delay=N         Delay between Apify calls in ms (default: 2000)
 *
 * Environment:
 *   APIFY_API_TOKEN   Required for fetching new images
 *   IMAGE_STORAGE_PATH  Local storage path (default: /var/www/api.holidaibutler.com/storage/poi-images)
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

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const CONFIG = {
  limit: args.limit ? parseInt(args.limit) : null,
  minImages: parseInt(args['min-images']) || 5,
  maxImages: parseInt(args['max-images']) || 10,
  priority: args.priority || 'all', // 'no-images', 'failed-only', 'all'
  dryRun: !!args['dry-run'],
  poiId: args.poi ? parseInt(args.poi) : null,
  batchSize: parseInt(args['batch-size']) || 10,
  delayBetweenCalls: parseInt(args.delay) || 2000,
  storagePath: process.env.IMAGE_STORAGE_PATH ||
    '/var/www/api.holidaibutler.com/storage/poi-images',
  downloadTimeout: 20000,
  maxFileSize: 15 * 1024 * 1024, // 15MB
};

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
  totalPois: 0,
  poisProcessed: 0,
  poisSkipped: 0,
  poisFailed: 0,
  imagesAdded: 0,
  imagesDownloaded: 0,
  imagesDownloadFailed: 0,
  totalBytes: 0,
  startTime: Date.now(),
  apifyCalls: 0,
};

/**
 * Fetch image data from URL with redirect handling
 */
async function fetchImage(url, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Too many redirects');
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = CONFIG.downloadTimeout;

    const request = client.get(url, { timeout }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const urlObj = new URL(url);
          redirectUrl = urlObj.origin + redirectUrl;
        }
        fetchImage(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
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
        if (totalSize > CONFIG.maxFileSize) {
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
 * Get file extension from image data (magic bytes)
 */
function getExtension(data) {
  if (data && data.length >= 4) {
    const header = data.slice(0, 4);
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return '.jpg';
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return '.png';
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) return '.gif';
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) return '.webp';
  }
  return '.jpg';
}

/**
 * Download image and save to local storage
 */
async function downloadAndSaveImage(imageUrl, poiId) {
  try {
    const imageData = await fetchImage(imageUrl);

    if (!imageData || imageData.length < 1000) {
      return { success: false, error: 'Empty or too small' };
    }

    // Generate unique filename from content hash
    const hash = crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);
    const ext = getExtension(imageData);
    const poiDir = path.join(CONFIG.storagePath, String(poiId));
    const filename = `${hash}${ext}`;
    const filePath = path.join(poiDir, filename);
    const localPath = `/poi-images/${poiId}/${filename}`;

    // Check if file already exists (duplicate detection)
    try {
      await fs.access(filePath);
      return { success: true, localPath, fileSize: 0, fileHash: hash, duplicate: true };
    } catch {
      // File doesn't exist, proceed with save
    }

    // Create directory and save file
    await fs.mkdir(poiDir, { recursive: true });
    await fs.writeFile(filePath, imageData);

    stats.totalBytes += imageData.length;

    return {
      success: true,
      localPath,
      fileSize: imageData.length,
      fileHash: hash,
      duplicate: false
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current image inventory for all POIs
 */
async function getImageInventory() {
  console.log('Inventorying current image status per POI...\n');

  const inventory = await sequelize.query(`
    SELECT
      p.id,
      p.name,
      p.city,
      p.google_placeid,
      COUNT(i.id) as total_images,
      SUM(CASE WHEN i.local_path IS NOT NULL THEN 1 ELSE 0 END) as local_images,
      SUM(CASE WHEN i.local_path IS NULL THEN 1 ELSE 0 END) as external_only
    FROM POI p
    LEFT JOIN imageurls i ON p.id = i.poi_id
    WHERE p.is_active = 1
    ${CONFIG.poiId ? `AND p.id = ${CONFIG.poiId}` : ''}
    GROUP BY p.id, p.name, p.city, p.google_placeid
    ORDER BY
      local_images ASC,
      total_images ASC,
      p.name ASC
    ${CONFIG.limit ? `LIMIT ${CONFIG.limit}` : ''}
  `, { type: QueryTypes.SELECT });

  return inventory;
}

/**
 * Filter POIs that need more images
 */
function filterPoisNeedingImages(inventory) {
  return inventory.filter(poi => {
    const localCount = parseInt(poi.local_images) || 0;
    const totalCount = parseInt(poi.total_images) || 0;

    // Calculate how many more images needed
    const needed = CONFIG.minImages - localCount;

    if (needed <= 0) {
      return false; // Already has enough local images
    }

    // Apply priority filter
    switch (CONFIG.priority) {
      case 'no-images':
        return totalCount === 0;
      case 'failed-only':
        return totalCount > 0 && localCount === 0;
      case 'all':
      default:
        return needed > 0;
    }
  });
}

/**
 * Fetch images for a POI from Google Maps via Apify
 * Prioritizes popular/highly-rated images
 */
async function fetchImagesFromApify(poi, imagesNeeded) {
  try {
    stats.apifyCalls++;

    // Build search query
    const searchQuery = poi.google_placeid
      ? `place_id:${poi.google_placeid}`
      : `${poi.name} ${poi.city || 'Calpe'} Spain`;

    const actorId = process.env.APIFY_ACTOR_ID || 'compass/crawler-google-places';

    const run = await apifyClient.actor(actorId).call({
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: 1,
      language: 'en',
      maxImages: Math.min(imagesNeeded + 5, CONFIG.maxImages + 3), // Fetch extra for failures
      scrapeImageGallery: true, // Get high-quality gallery images
    }, {
      timeout: 90000, // 90 seconds
    });

    // Get results
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return [];
    }

    const place = items[0];

    // Extract image URLs - prioritize imageUrls (main photos) over reviewsPhotos
    let imageUrls = [];

    // Main images (usually highest quality, most popular)
    if (place.imageUrls && Array.isArray(place.imageUrls)) {
      imageUrls.push(...place.imageUrls);
    }

    // Gallery images
    if (place.images && Array.isArray(place.images)) {
      const urls = place.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
      imageUrls.push(...urls);
    }

    // Deduplicate and limit
    const uniqueUrls = [...new Set(imageUrls)];

    return uniqueUrls.slice(0, imagesNeeded + 3); // Extra buffer for download failures

  } catch (error) {
    console.error(`    Apify error: ${error.message}`);
    return [];
  }
}

/**
 * Get existing image hashes for a POI (for duplicate detection)
 */
async function getExistingHashes(poiId) {
  const existing = await sequelize.query(`
    SELECT file_hash FROM imageurls
    WHERE poi_id = ? AND file_hash IS NOT NULL
  `, {
    replacements: [poiId],
    type: QueryTypes.SELECT
  });

  return new Set(existing.map(r => r.file_hash));
}

/**
 * Process a single POI - fetch and download images
 */
async function processPoi(poi, index, total) {
  const localCount = parseInt(poi.local_images) || 0;
  const totalCount = parseInt(poi.total_images) || 0;
  const imagesNeeded = CONFIG.minImages - localCount;
  const maxToAdd = CONFIG.maxImages - localCount;

  console.log(`[${index}/${total}] ${poi.name} (ID: ${poi.id})`);
  console.log(`    Current: ${localCount} local, ${totalCount - localCount} external-only`);
  console.log(`    Need: ${imagesNeeded} more images (max: ${maxToAdd})`);

  if (CONFIG.dryRun) {
    console.log(`    [DRY RUN] Would fetch ${imagesNeeded} images\n`);
    stats.poisSkipped++;
    return;
  }

  try {
    // Fetch new images from Apify
    const imageUrls = await fetchImagesFromApify(poi, Math.min(imagesNeeded, maxToAdd));

    if (imageUrls.length === 0) {
      console.log(`    No images found from Apify\n`);
      stats.poisSkipped++;
      return;
    }

    console.log(`    Found ${imageUrls.length} images, downloading...`);

    // Get existing hashes to avoid duplicates
    const existingHashes = await getExistingHashes(poi.id);

    let downloaded = 0;
    let nextImageId = totalCount + 1;

    // Download and save each image
    for (const url of imageUrls) {
      if (downloaded >= maxToAdd) break;

      const result = await downloadAndSaveImage(url, poi.id);

      if (result.success) {
        // Check for duplicate by hash
        if (existingHashes.has(result.fileHash)) {
          continue; // Skip duplicate
        }

        if (!result.duplicate) {
          // Save to database
          await sequelize.query(`
            INSERT INTO imageurls (poi_id, image_id, image_url, local_path, file_size, file_hash, downloaded_at, last_fetched_at, source, google_place_id)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 'apify_refresh', ?)
          `, {
            replacements: [
              poi.id,
              nextImageId++,
              url,
              result.localPath,
              result.fileSize,
              result.fileHash,
              poi.google_placeid
            ]
          });

          existingHashes.add(result.fileHash);
          downloaded++;
          stats.imagesDownloaded++;
          process.stdout.write('.');
        }
      } else {
        stats.imagesDownloadFailed++;
        process.stdout.write('x');
      }

      // Small delay between downloads
      await sleep(100);
    }

    console.log('');
    console.log(`    Added ${downloaded} new images\n`);

    stats.imagesAdded += downloaded;
    stats.poisProcessed++;

  } catch (error) {
    console.error(`    Failed: ${error.message}\n`);
    stats.poisFailed++;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Comprehensive POI Image Refresh');
  console.log('='.repeat(70));
  console.log('');
  console.log('Configuration:');
  console.log(`  Min images per POI:  ${CONFIG.minImages}`);
  console.log(`  Max images per POI:  ${CONFIG.maxImages}`);
  console.log(`  Priority:            ${CONFIG.priority}`);
  console.log(`  Storage path:        ${CONFIG.storagePath}`);
  console.log(`  POI filter:          ${CONFIG.poiId || 'All'}`);
  console.log(`  Limit:               ${CONFIG.limit || 'None'}`);
  console.log(`  Dry run:             ${CONFIG.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Check Apify token
    if (!process.env.APIFY_API_TOKEN && !CONFIG.dryRun) {
      console.error('ERROR: APIFY_API_TOKEN not set in environment');
      process.exit(1);
    }

    // Ensure storage directory exists
    if (!CONFIG.dryRun) {
      await fs.mkdir(CONFIG.storagePath, { recursive: true });
    }

    // Get inventory
    const inventory = await getImageInventory();
    console.log(`Total POIs in database: ${inventory.length}\n`);

    // Filter POIs needing images
    const poisToProcess = filterPoisNeedingImages(inventory);
    stats.totalPois = poisToProcess.length;

    console.log('='.repeat(70));
    console.log('INVENTORY SUMMARY');
    console.log('='.repeat(70));

    const withEnough = inventory.filter(p => (parseInt(p.local_images) || 0) >= CONFIG.minImages).length;
    const needMore = inventory.filter(p => {
      const local = parseInt(p.local_images) || 0;
      return local > 0 && local < CONFIG.minImages;
    }).length;
    const noLocal = inventory.filter(p => {
      const local = parseInt(p.local_images) || 0;
      const total = parseInt(p.total_images) || 0;
      return local === 0 && total > 0;
    }).length;
    const noImages = inventory.filter(p => (parseInt(p.total_images) || 0) === 0).length;

    console.log(`POIs with ${CONFIG.minImages}+ local images:  ${withEnough} (OK)`);
    console.log(`POIs with 1-${CONFIG.minImages - 1} local images:    ${needMore} (need more)`);
    console.log(`POIs with only failed URLs:    ${noLocal} (need refresh)`);
    console.log(`POIs with no images at all:    ${noImages} (need fetch)`);
    console.log('');
    console.log(`POIs to process: ${poisToProcess.length}`);
    console.log(`Estimated Apify cost: €${(poisToProcess.length * 0.003).toFixed(2)}`);
    console.log('');

    if (poisToProcess.length === 0) {
      console.log('All POIs already have enough images!');
      return;
    }

    // Process POIs
    console.log('='.repeat(70));
    console.log('PROCESSING');
    console.log('='.repeat(70));
    console.log('');

    for (let i = 0; i < poisToProcess.length; i++) {
      await processPoi(poisToProcess[i], i + 1, poisToProcess.length);

      // Rate limiting between Apify calls
      if (!CONFIG.dryRun && i < poisToProcess.length - 1) {
        await sleep(CONFIG.delayBetweenCalls);
      }

      // Progress update every 10 POIs
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.poisProcessed / elapsed;
        const remaining = (stats.totalPois - i - 1) / rate;
        console.log(`--- Progress: ${i + 1}/${stats.totalPois} | Rate: ${rate.toFixed(2)} POI/s | ETA: ${Math.ceil(remaining)}s ---\n`);
      }
    }

    // Final summary
    const totalElapsed = (Date.now() - stats.startTime) / 1000;

    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total POIs to process:  ${stats.totalPois}`);
    console.log(`POIs processed:         ${stats.poisProcessed}`);
    console.log(`POIs skipped:           ${stats.poisSkipped}`);
    console.log(`POIs failed:            ${stats.poisFailed}`);
    console.log('');
    console.log(`Images added:           ${stats.imagesAdded}`);
    console.log(`Downloads successful:   ${stats.imagesDownloaded}`);
    console.log(`Downloads failed:       ${stats.imagesDownloadFailed}`);
    console.log(`Total downloaded:       ${(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log('');
    console.log(`Apify API calls:        ${stats.apifyCalls}`);
    console.log(`Estimated cost:         €${(stats.apifyCalls * 0.003).toFixed(2)}`);
    console.log(`Duration:               ${totalElapsed.toFixed(1)}s`);

  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
