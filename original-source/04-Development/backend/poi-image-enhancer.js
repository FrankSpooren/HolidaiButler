/**
 * POI Image Enhancement System
 *
 * Strategy:
 * 1. Check existing Google Places images quality
 * 2. Fetch Flickr CC images near POI location
 * 3. Fallback to Unsplash keyword search
 * 4. Categorize images: outdoor, indoor, atmosphere
 *
 * APIs needed:
 * - Flickr API (free): https://www.flickr.com/services/api/
 * - Unsplash API (free 50/hr): https://unsplash.com/developers
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const db = require('./src/config/database');

// ========================================
// CONFIGURATION
// ========================================

const FLICKR_API_KEY = process.env.FLICKR_API_KEY || 'YOUR_FLICKR_KEY';
const FLICKR_API_SECRET = process.env.FLICKR_API_SECRET || 'YOUR_FLICKR_SECRET';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_KEY';

const IMAGE_CATEGORIES = {
  OUTDOOR: 'outdoor',
  INDOOR: 'indoor',
  ATMOSPHERE: 'atmosphere'
};

// ========================================
// FLICKR OAUTH SIGNING
// ========================================

/**
 * Generate OAuth 1.0a signature for Flickr API
 */
function generateFlickrOAuthSignature(method, url, params) {
  // Add OAuth parameters
  const oauth = {
    oauth_consumer_key: FLICKR_API_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0'
  };

  // Combine all parameters
  const allParams = { ...params, ...oauth };

  // Sort parameters alphabetically
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');

  // Create base string
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key (consumer_secret&token_secret, but we don't have token_secret for API key auth)
  const signingKey = `${encodeURIComponent(FLICKR_API_SECRET)}&`;

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauth.oauth_signature = signature;

  return oauth;
}

// ========================================
// FLICKR API FUNCTIONS
// ========================================

/**
 * Search Flickr for Creative Commons images near POI with ULTRA-PRECISE matching
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} searchText - POI name
 * @param {number} radius - Search radius in km (default 0.1 = 100m for precision)
 * @returns {Array} Array of image objects
 */
async function searchFlickrImages(lat, lng, searchText, radius = 0.1) {
  try {
    // STRATEGY: Multi-tier search for maximum precision
    const searches = [
      // Tier 1: Ultra-precise (100m radius + exact name)
      { radius: 0.1, text: searchText },
      // Tier 2: Precise (200m radius + name variations)
      { radius: 0.2, text: searchText.replace(/[^\w\s]/g, '') }, // Remove special chars
      // Tier 3: Moderate (500m radius + generic terms)
      { radius: 0.5, text: `${searchText} Calpe` }
    ];

    let allPhotos = [];

    for (const search of searches) {
      // Prepare Flickr API parameters
      const flickrParams = {
        method: 'flickr.photos.search',
        lat: lat,
        lon: lng,
        radius: search.radius,
        radius_units: 'km',
        text: search.text,
        license: '4,5,6,7,8,9,10', // CC licenses only
        sort: 'relevance',
        extras: 'url_l,url_c,url_z,tags,geo,description,title',
        per_page: 20,
        format: 'json',
        nojsoncallback: 1
      };

      // Generate OAuth signature
      const oauthParams = generateFlickrOAuthSignature(
        'GET',
        'https://api.flickr.com/services/rest/',
        flickrParams
      );

      // Combine all parameters
      const allParams = { ...flickrParams, ...oauthParams };

      const response = await axios.get('https://api.flickr.com/services/rest/', {
        params: allParams
      });

      if (response.data.stat === 'ok' && response.data.photos.photo.length > 0) {
        allPhotos = allPhotos.concat(response.data.photos.photo);

        // If we found good results in tier 1, don't need to search further
        if (search.radius === 0.1 && response.data.photos.photo.length >= 5) {
          console.log(`  ✅ Found ${response.data.photos.photo.length} high-precision photos (100m radius)`);
          break;
        }
      }
    }

    if (allPhotos.length === 0) {
      return [];
    }

    // ENHANCED FILTERING: Score each photo by relevance
    const scoredPhotos = allPhotos.map(photo => {
      let relevanceScore = 0;
      const title = (photo.title || '').toLowerCase();
      const description = (photo.description?._content || '').toLowerCase();
      const tags = (photo.tags || '').toLowerCase();
      const poiNameLower = searchText.toLowerCase();

      // Score based on POI name match in title/description/tags
      if (title.includes(poiNameLower)) relevanceScore += 10;
      if (description.includes(poiNameLower)) relevanceScore += 5;
      if (tags.includes(poiNameLower)) relevanceScore += 3;

      // Score based on location keyword "calpe"
      if (title.includes('calpe') || description.includes('calpe')) relevanceScore += 2;

      // Distance score (closer = better)
      if (photo.latitude && photo.longitude) {
        const distance = calculateDistance(lat, lng, photo.latitude, photo.longitude);
        if (distance < 0.05) relevanceScore += 5; // Within 50m
        else if (distance < 0.1) relevanceScore += 3; // Within 100m
        else if (distance < 0.2) relevanceScore += 1; // Within 200m
      }

      return {
        ...photo,
        relevanceScore,
        url: photo.url_l || photo.url_c || photo.url_z,
        source: 'flickr',
        license: 'CC',
        tags: photo.tags,
        flickr_id: photo.id,
        category: categorizeImageByTags(photo.tags)
      };
    });

    // Sort by relevance score and filter
    return scoredPhotos
      .filter(img => img.url && img.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 15); // Top 15 most relevant

  } catch (error) {
    console.error(`Flickr API error for ${searchText}:`, error.message);
    return [];
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Categorize image based on tags
 */
function categorizeImageByTags(tags) {
  const tagLower = tags.toLowerCase();

  if (tagLower.includes('interior') || tagLower.includes('indoor') || tagLower.includes('inside')) {
    return IMAGE_CATEGORIES.INDOOR;
  }

  if (tagLower.includes('exterior') || tagLower.includes('outdoor') || tagLower.includes('outside') ||
      tagLower.includes('facade') || tagLower.includes('building')) {
    return IMAGE_CATEGORIES.OUTDOOR;
  }

  if (tagLower.includes('atmosphere') || tagLower.includes('ambiance') || tagLower.includes('mood') ||
      tagLower.includes('people') || tagLower.includes('crowd')) {
    return IMAGE_CATEGORIES.ATMOSPHERE;
  }

  return IMAGE_CATEGORIES.OUTDOOR; // Default
}

// ========================================
// UNSPLASH API FUNCTIONS
// ========================================

/**
 * Search Unsplash for high-quality images
 * @param {string} query - Search query (e.g., "Spanish restaurant Calpe")
 * @returns {Array} Array of image objects
 */
async function searchUnsplashImages(query) {
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      },
      params: {
        query: query,
        per_page: 10,
        orientation: 'landscape'
      }
    });

    return response.data.results.map(photo => ({
      url: photo.urls.regular,
      source: 'unsplash',
      license: 'Unsplash',
      photographer: photo.user.name,
      unsplash_id: photo.id,
      category: null // Will be assigned based on query
    }));
  } catch (error) {
    console.error(`Unsplash API error for ${query}:`, error.message);
    return [];
  }
}

// ========================================
// MAIN ENHANCEMENT LOGIC
// ========================================

/**
 * Enhance images for a single POI
 */
async function enhancePOIImages(poi) {
  console.log(`\n🖼️  Enhancing images for: ${poi.name}`);

  const images = {
    outdoor: null,
    indoor: null,
    atmosphere: null
  };

  // Step 1: Try Flickr (geographic search near POI)
  console.log('  📍 Searching Flickr near location...');
  const flickrImages = await searchFlickrImages(
    poi.latitude,
    poi.longitude,
    `${poi.name} Calpe`,
    0.5 // 500m radius
  );

  if (flickrImages.length > 0) {
    console.log(`  ✅ Found ${flickrImages.length} Flickr images`);

    // Categorize Flickr images
    for (const img of flickrImages) {
      if (!images[img.category]) {
        images[img.category] = img;
      }
    }
  } else {
    console.log('  ⚠️  No Flickr images found');
  }

  // Step 2: Try Unsplash for missing categories
  const missingCategories = Object.keys(images).filter(cat => !images[cat]);

  if (missingCategories.length > 0) {
    console.log(`  🔍 Searching Unsplash for missing categories: ${missingCategories.join(', ')}`);

    for (const category of missingCategories) {
      let query = `${poi.name} Calpe ${poi.category}`;

      if (category === 'interior') {
        query += ' interior indoor';
      } else if (category === 'outdoor') {
        query += ' exterior facade building';
      } else if (category === 'atmosphere') {
        query += ' atmosphere ambiance people';
      }

      const unsplashImages = await searchUnsplashImages(query);

      if (unsplashImages.length > 0) {
        images[category] = unsplashImages[0];
        images[category].category = category;
        console.log(`  ✅ Found Unsplash image for ${category}`);
      }
    }
  }

  // Step 3: Store results in database
  const imageArray = Object.values(images).filter(img => img !== null);

  if (imageArray.length > 0) {
    await storeEnhancedImages(poi.id, imageArray);
    console.log(`  💾 Stored ${imageArray.length} enhanced images`);
  } else {
    console.log(`  ❌ No enhanced images found for ${poi.name}`);
  }

  return images;
}

/**
 * Store enhanced images in database
 */
async function storeEnhancedImages(poiId, images) {
  const imageData = {
    enhanced_images: images,
    enhanced_at: new Date(),
    image_sources: images.map(img => img.source)
  };

  await db.query(
    `UPDATE POI
     SET enhanced_images = ?,
         enhanced_at = NOW()
     WHERE id = ?`,
    [JSON.stringify(imageData), poiId]
  );
}

// ========================================
// BATCH PROCESSING
// ========================================

/**
 * Process all POIs that need image enhancement
 */
async function processAllPOIs(limit = null) {
  console.log('\n🚀 Starting POI Image Enhancement Process\n');
  console.log('=' .repeat(60));

  // Get POIs that need enhancement (no enhanced_images or low quality)
  let query = `
    SELECT id, name, category, latitude, longitude
    FROM POI
    WHERE (enhanced_images IS NULL OR enhanced_at < DATE_SUB(NOW(), INTERVAL 30 DAY))
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    ORDER BY rating DESC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  const pois = await db.query(query);

  console.log(`📊 Found ${pois.length} POIs needing enhancement\n`);

  let processed = 0;
  let enhanced = 0;
  let failed = 0;

  for (const poi of pois) {
    try {
      const result = await enhancePOIImages(poi);
      const hasImages = Object.values(result).some(img => img !== null);

      if (hasImages) {
        enhanced++;
      } else {
        failed++;
      }

      processed++;

      // Rate limiting: Wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error processing ${poi.name}:`, error.message);
      failed++;
    }

    // Progress update every 10 POIs
    if (processed % 10 === 0) {
      console.log(`\n📈 Progress: ${processed}/${pois.length} processed, ${enhanced} enhanced, ${failed} failed\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Image Enhancement Complete!');
  console.log(`   Total processed: ${processed}`);
  console.log(`   Successfully enhanced: ${enhanced}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');
}

// ========================================
// CLI EXECUTION
// ========================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : null;

  processAllPOIs(limit)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  enhancePOIImages,
  searchFlickrImages,
  searchUnsplashImages,
  processAllPOIs
};
