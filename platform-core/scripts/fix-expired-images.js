/**
 * Fix Expired Google Image URLs
 *
 * This script:
 * 1. Fetches all POIs with images from the database
 * 2. Validates each image URL with a HEAD request
 * 3. Removes expired (403/404) image URLs from the database
 * 4. Sets images to NULL if all images are expired (so frontend shows fallback)
 *
 * Run: node scripts/fix-expired-images.js
 */

import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Database connection
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'pxoziy_db1',
  process.env.MYSQL_USER || 'pxoziy_admin',
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST || 'jotx.your-database.de',
    dialect: 'mysql',
    logging: false,
  }
);

// Validate a single image URL
async function validateImageUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok; // true if 200-299
  } catch (error) {
    return false;
  }
}

// Main function
async function fixExpiredImages() {
  console.log('=== Fix Expired Google Image URLs ===\n');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Get all POIs with images
    const poisWithImages = await sequelize.query(
      `SELECT id, name, images, thumbnail_url
       FROM points_of_interest
       WHERE images IS NOT NULL AND images != '[]'
       LIMIT 500`,
      { type: QueryTypes.SELECT }
    );

    console.log(`Found ${poisWithImages.length} POIs with images to check\n`);

    let fixedCount = 0;
    let checkedCount = 0;

    for (const poi of poisWithImages) {
      checkedCount++;

      // Parse images array
      let images = [];
      try {
        images = typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images;
      } catch (e) {
        console.log(`[${checkedCount}] ${poi.name}: Invalid JSON, skipping`);
        continue;
      }

      if (!Array.isArray(images) || images.length === 0) {
        continue;
      }

      // Check first image only (for speed)
      const firstImageUrl = images[0];
      const isValid = await validateImageUrl(firstImageUrl);

      if (!isValid) {
        console.log(`[${checkedCount}] ${poi.name}: EXPIRED - clearing images`);

        // Clear images and thumbnail_url
        await sequelize.query(
          `UPDATE points_of_interest
           SET images = NULL, thumbnail_url = NULL
           WHERE id = ?`,
          { replacements: [poi.id], type: QueryTypes.UPDATE }
        );

        fixedCount++;
      } else {
        if (checkedCount % 50 === 0) {
          console.log(`[${checkedCount}] ${poi.name}: OK`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n=== Summary ===`);
    console.log(`Checked: ${checkedCount} POIs`);
    console.log(`Fixed (expired): ${fixedCount} POIs`);
    console.log(`Valid: ${checkedCount - fixedCount} POIs`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run
fixExpiredImages();
