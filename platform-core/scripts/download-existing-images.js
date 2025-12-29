#!/usr/bin/env node
/**
 * Download Existing Images Script
 *
 * Downloads all existing POI images from external URLs to local storage.
 * This migrates from ephemeral URLs to permanent local files.
 *
 * Usage:
 *   node scripts/download-existing-images.js [options]
 *
 * Options:
 *   --limit=N       Max images to download (default: 1000)
 *   --batch=N       Batch size (default: 50)
 *   --delay=N       Delay between batches in ms (default: 2000)
 *   --poi=N         Download only for specific POI ID
 *   --dry-run       Show what would be downloaded without downloading
 *
 * Examples:
 *   node scripts/download-existing-images.js --limit=100
 *   node scripts/download-existing-images.js --poi=123
 *   node scripts/download-existing-images.js --dry-run
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { Sequelize, QueryTypes } from 'sequelize';
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
  limit: parseInt(args.limit) || 1000,
  batchSize: parseInt(args.batch) || 50,
  delayBetweenBatches: parseInt(args.delay) || 2000,
  poiId: args.poi ? parseInt(args.poi) : null,
  dryRun: !!args['dry-run'],
  storagePath: process.env.IMAGE_STORAGE_PATH ||
    '/var/www/api.holidaibutler.com/storage/poi-images',
  downloadTimeout: 15000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
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

// Stats
const stats = {
  total: 0,
  downloaded: 0,
  failed: 0,
  skipped: 0,
  totalBytes: 0,
  startTime: Date.now(),
};

/**
 * Fetch image from URL
 */
async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = CONFIG.downloadTimeout;
    const maxSize = CONFIG.maxFileSize;

    const request = client.get(url, { timeout }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImage(response.headers.location)
          .then(resolve)
          .catch(reject);
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
        if (totalSize > maxSize) {
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

    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return '.jpg';
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return '.png';
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) return '.gif';
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) return '.webp';
  }
  return '.jpg';
}

/**
 * Download and save a single image
 */
async function downloadImage(img) {
  try {
    // Download
    const imageData = await fetchImage(img.image_url);

    if (!imageData || imageData.length === 0) {
      throw new Error('Empty data');
    }

    // Generate hash and path
    const hash = crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);
    const ext = getExtension(imageData);
    const poiDir = path.join(CONFIG.storagePath, String(img.poi_id));
    const filename = `${hash}${ext}`;
    const filePath = path.join(poiDir, filename);
    const localPath = `/poi-images/${img.poi_id}/${filename}`;

    if (!CONFIG.dryRun) {
      // Create directory and save
      await fs.mkdir(poiDir, { recursive: true });
      await fs.writeFile(filePath, imageData);

      // Update database
      await sequelize.query(`
        UPDATE imageurls
        SET local_path = ?,
            file_size = ?,
            file_hash = ?,
            downloaded_at = NOW()
        WHERE id = ?
      `, {
        replacements: [localPath, imageData.length, hash, img.id]
      });
    }

    stats.downloaded++;
    stats.totalBytes += imageData.length;

    return { success: true, localPath, size: imageData.length };

  } catch (error) {
    stats.failed++;
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Download Existing Images to Local Storage');
  console.log('='.repeat(70));
  console.log('');
  console.log('Configuration:');
  console.log(`  Limit:        ${CONFIG.limit}`);
  console.log(`  Batch size:   ${CONFIG.batchSize}`);
  console.log(`  Storage path: ${CONFIG.storagePath}`);
  console.log(`  POI filter:   ${CONFIG.poiId || 'All'}`);
  console.log(`  Dry run:      ${CONFIG.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Check storage directory
    if (!CONFIG.dryRun) {
      try {
        await fs.access(CONFIG.storagePath);
        console.log(`Storage directory exists: ${CONFIG.storagePath}\n`);
      } catch {
        console.log(`Creating storage directory: ${CONFIG.storagePath}`);
        await fs.mkdir(CONFIG.storagePath, { recursive: true });
        console.log('Storage directory created\n');
      }
    }

    // Build query
    let whereClause = 'WHERE local_path IS NULL AND image_url IS NOT NULL';
    const replacements = [];

    if (CONFIG.poiId) {
      whereClause += ' AND poi_id = ?';
      replacements.push(CONFIG.poiId);
    }

    replacements.push(CONFIG.limit);

    // Get images to download
    const images = await sequelize.query(`
      SELECT id, poi_id, image_url
      FROM imageurls
      ${whereClause}
      ORDER BY poi_id, image_id
      LIMIT ?
    `, {
      type: QueryTypes.SELECT,
      replacements
    });

    stats.total = images.length;
    console.log(`Found ${images.length} images to download\n`);

    if (images.length === 0) {
      console.log('No images need downloading!');
      return;
    }

    // Process in batches
    const batches = Math.ceil(images.length / CONFIG.batchSize);

    for (let b = 0; b < batches; b++) {
      const batchStart = b * CONFIG.batchSize;
      const batchEnd = Math.min(batchStart + CONFIG.batchSize, images.length);
      const batch = images.slice(batchStart, batchEnd);

      console.log(`Batch ${b + 1}/${batches} (${batchStart + 1}-${batchEnd} of ${images.length})`);

      for (const img of batch) {
        const result = await downloadImage(img);

        if (result.success) {
          process.stdout.write('.');
        } else {
          process.stdout.write('x');
        }

        // Small delay between downloads
        await sleep(50);
      }

      console.log('');

      // Progress report
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.downloaded / elapsed;
      const remaining = (stats.total - stats.downloaded - stats.failed) / rate;

      console.log(`  Downloaded: ${stats.downloaded}, Failed: ${stats.failed}`);
      console.log(`  Size: ${(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`  Rate: ${rate.toFixed(1)} img/s, ETA: ${Math.ceil(remaining)}s`);
      console.log('');

      // Delay between batches
      if (b < batches - 1) {
        await sleep(CONFIG.delayBetweenBatches);
      }
    }

    // Final summary
    const totalElapsed = (Date.now() - stats.startTime) / 1000;

    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total images:     ${stats.total}`);
    console.log(`Downloaded:       ${stats.downloaded}`);
    console.log(`Failed:           ${stats.failed}`);
    console.log(`Total size:       ${(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Duration:         ${totalElapsed.toFixed(1)}s`);
    console.log(`Average rate:     ${(stats.downloaded / totalElapsed).toFixed(1)} img/s`);

    if (stats.failed > 0) {
      console.log('');
      console.log('Note: Failed downloads are likely from 403 URLs (gps-cs-s type).');
      console.log('These images will use external URL fallback until refreshed.');
    }

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
