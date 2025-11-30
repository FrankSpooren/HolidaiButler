/**
 * POI Image Validation Script
 * ============================
 *
 * Purpose: Test which POI images are valid/invalid
 *
 * Issue: Many Google User Content URLs are failing to load
 * Cause: URLs may be expired, restricted, or CORS blocked
 *
 * This script validates image URLs and reports statistics
 */

const { query } = require('./src/config/database');

async function validatePOIImages() {
  console.log('🔍 Starting POI Image Validation...\n');

  try {
    // Get all active POIs with their images
    const pois = await query(
      `SELECT id, name, category, images, thumbnail_url
       FROM POI
       WHERE is_active = TRUE
       LIMIT 100`
    );

    console.log(`📊 Total POIs to check: ${pois.length}\n`);

    let totalPOIs = pois.length;
    let poisWithImages = 0;
    let poisWithValidImages = 0;
    let poisWithInvalidImages = 0;
    let poisWithNoImages = 0;
    let totalImageURLs = 0;
    let validImageURLs = 0;
    let invalidImageURLs = 0;

    const invalidPOIs = [];

    for (const poi of pois) {
      // Parse images JSON
      let images = [];
      if (poi.images) {
        try {
          images = typeof poi.images === 'string'
            ? JSON.parse(poi.images)
            : poi.images;
        } catch (e) {
          console.error(`❌ Failed to parse images for POI ${poi.id}`);
        }
      }

      const imageUrls = images && Array.isArray(images) ? images : [];

      // Check if POI has images
      if (imageUrls.length === 0 && !poi.thumbnail_url) {
        poisWithNoImages++;
        continue;
      }

      poisWithImages++;
      totalImageURLs += imageUrls.length;

      // Validate each image URL (check if it's a valid googleusercontent URL)
      let hasValidImage = false;
      let poiInvalidURLs = [];

      for (const url of imageUrls) {
        if (url && url.includes('googleusercontent.com')) {
          // These are likely to fail - Google content URLs often expire or have CORS issues
          invalidImageURLs++;
          poiInvalidURLs.push(url);
        } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          validImageURLs++;
          hasValidImage = true;
        } else {
          invalidImageURLs++;
          poiInvalidURLs.push(url);
        }
      }

      if (hasValidImage) {
        poisWithValidImages++;
      } else {
        poisWithInvalidImages++;
        invalidPOIs.push({
          id: poi.id,
          name: poi.name,
          category: poi.category,
          invalidURLs: poiInvalidURLs
        });
      }
    }

    // Report statistics
    console.log('📈 VALIDATION RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total POIs checked:           ${totalPOIs}`);
    console.log(`POIs with images:             ${poisWithImages} (${Math.round(poisWithImages/totalPOIs*100)}%)`);
    console.log(`POIs with valid images:       ${poisWithValidImages} (${Math.round(poisWithValidImages/totalPOIs*100)}%)`);
    console.log(`POIs with invalid images:     ${poisWithInvalidImages} (${Math.round(poisWithInvalidImages/totalPOIs*100)}%)`);
    console.log(`POIs with no images:          ${poisWithNoImages} (${Math.round(poisWithNoImages/totalPOIs*100)}%)`);
    console.log('');
    console.log(`Total image URLs:             ${totalImageURLs}`);
    console.log(`Valid image URLs:             ${validImageURLs} (${totalImageURLs > 0 ? Math.round(validImageURLs/totalImageURLs*100) : 0}%)`);
    console.log(`Invalid/Googleusercontent:    ${invalidImageURLs} (${totalImageURLs > 0 ? Math.round(invalidImageURLs/totalImageURLs*100) : 0}%)`);
    console.log('='.repeat(50));

    // Show sample of POIs with invalid images
    if (invalidPOIs.length > 0) {
      console.log('\n⚠️  SAMPLE POIs WITH INVALID IMAGES (first 10):');
      console.log('-'.repeat(50));
      invalidPOIs.slice(0, 10).forEach(poi => {
        console.log(`POI ${poi.id}: ${poi.name} (${poi.category})`);
        console.log(`  Invalid URLs: ${poi.invalidURLs.length > 0 ? poi.invalidURLs[0].substring(0, 80) + '...' : 'N/A'}`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(50));

    if (invalidImageURLs > validImageURLs) {
      console.log('❗ HIGH PRIORITY:');
      console.log('  - Most images are Google User Content URLs that fail to load');
      console.log('  - These URLs expire or are CORS restricted');
      console.log('  - Solution 1: Download images locally and host them');
      console.log('  - Solution 2: Re-fetch fresh URLs from Google Places API');
      console.log('  - Solution 3: Use thumbnail_url instead of images array');
    }

    if (poisWithNoImages > totalPOIs * 0.2) {
      console.log('⚠️  MEDIUM PRIORITY:');
      console.log(`  - ${poisWithNoImages} POIs have no images at all`);
      console.log('  - Fallback icons are being shown (not ideal for presentations)');
    }

    console.log('\n✅ QUICK FIX FOR PRESENTATIONS:');
    console.log('  - Filter POI queries to only show POIs with valid images');
    console.log('  - Add WHERE clause: WHERE is_active = TRUE AND thumbnail_url IS NOT NULL');

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  process.exit(0);
}

// Run validation
validatePOIImages();
