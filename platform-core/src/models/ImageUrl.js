/**
 * ImageUrl Model - Maps to imageurls table
 * Contains multiple images per POI for carousel/gallery display
 *
 * Supports both external URLs and locally stored images.
 * Local images (local_path) are preferred as they're 100% reliable.
 */
import { DataTypes, literal } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

// Base URL for locally stored images
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'https://api.holidaibutler.com';

const ImageUrl = mysqlSequelize.define('ImageUrl', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poi_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  image_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  local_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  file_hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  downloaded_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'imageurls',
  timestamps: false
});

/**
 * Get the best URL for an image (local if available, otherwise external)
 * @param {Object} img - Image record with image_url and local_path
 * @returns {string} Best available URL
 */
function getBestUrl(img) {
  // Prefer local path (100% reliable)
  if (img.local_path) {
    return `${IMAGE_BASE_URL}${img.local_path}`;
  }
  // Fall back to external URL
  return img.image_url;
}

/**
 * Get image quality priority based on URL pattern
 * Lower number = higher priority (better quality/more relevant)
 *
 * Priority based on reliability testing (29-12-2025) + quality assessment:
 * - AF1Qip URLs: 100% success rate, user-uploaded photos (best quality)
 * - Worldota CDN: 100% success rate, professional hotel photos
 * - Streetview: 100% reliable but generic/low-quality for POI display
 * - gps-cs-s URLs: 68% success rate (32% return 403)
 */
function getImagePriority(url) {
  if (!url) return 999;

  // AF1Qip Google Photos (user-uploaded, highest relevance for POI)
  if (url.includes('lh3.googleusercontent.com/p/AF1Qip')) return 1;

  // Worldota CDN (professional photos)
  if (url.includes('worldota.net')) return 2;

  // Other lh3.googleusercontent.com (non-gps-cs-s, non-AF1Qip)
  if (url.includes('lh3.googleusercontent.com') && !url.includes('gps-cs-s')) return 3;

  // gps-cs-s URLs (68% reliable - lower priority due to 32% failure rate)
  if (url.includes('lh3.googleusercontent.com/gps-cs-s')) return 6;

  // Street View (100% reliable, but generic exterior/street images — worst for display)
  if (url.includes('streetviewpixels') || url.includes('streetview')) return 9;

  // Other sources
  return 5;
}

/**
 * Get local image priority (for locally stored images)
 * Even local images should be sorted by quality of the original source.
 * This prevents street view thumbnails from appearing as the first image.
 */
function getLocalImagePriority(imageUrl) {
  if (!imageUrl) return 1; // Unknown source, assume decent quality

  // Street View — deprioritize even when stored locally
  if (imageUrl.includes('streetviewpixels') || imageUrl.includes('streetview')) return 5;

  // gps-cs-s — lower quality
  if (imageUrl.includes('gps-cs-s')) return 3;

  // AF1Qip — best quality user photos
  if (imageUrl.includes('AF1Qip')) return 0;

  // Default local — good quality
  return 1;
}

/**
 * Get images for a single POI with quality filtering
 * Prioritizes locally stored images (100% reliable)
 *
 * @param {number} poiId - POI ID
 * @param {number} limit - Max images to return
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function getImagesForPOI(poiId, limit = 10) {
  try {
    const images = await ImageUrl.findAll({
      where: { poi_id: poiId },
      order: [[literal('COALESCE(display_order, 999)'), 'ASC'], ['image_id', 'ASC']],
      limit: limit + 5,
      attributes: ['image_url', 'local_path', 'display_order']
    });

    return images
      .map(img => ({
        url: getBestUrl(img),
        hasLocal: !!img.local_path,
        priority: img.local_path ? getLocalImagePriority(img.image_url) : getImagePriority(img.image_url)
      }))
      .sort((a, b) => a.priority - b.priority)
      .map(img => img.url)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching images for POI:', poiId, error);
    return [];
  }
}

/**
 * Batch fetch images for multiple POIs
 * Prioritizes locally stored images (100% reliable)
 *
 * IMPORTANT: Uses explicit Number() conversion to ensure consistent Map key types.
 * MySQL/Sequelize may return poi_id as BigInt or string, causing Map lookup failures
 * when comparing with numeric POI IDs from other queries.
 *
 * @param {number[]} poiIds - Array of POI IDs
 * @param {number} limitPerPoi - Max images per POI
 * @returns {Promise<Map<number, string[]>>} Map of POI ID to image URLs
 */
export async function getImagesForPOIs(poiIds, limitPerPoi = 3) {
  try {
    if (!poiIds || poiIds.length === 0) {
      return new Map();
    }

    // Ensure all POI IDs are numbers for consistent comparison
    const numericPoiIds = poiIds.map(id => Number(id));

    const images = await ImageUrl.findAll({
      where: { poi_id: numericPoiIds },
      order: [['poi_id', 'ASC'], [literal('COALESCE(display_order, 999)'), 'ASC'], ['image_id', 'ASC']],
      attributes: ['poi_id', 'image_url', 'local_path', 'display_order']
    });

    // Group by POI - use Number() for consistent Map keys
    const imageMap = new Map();
    const poiImages = new Map();

    // First, collect all images per POI with metadata
    // CRITICAL: Convert poi_id to Number to ensure Map key consistency
    for (const img of images) {
      const poiId = Number(img.poi_id);
      if (!poiImages.has(poiId)) {
        poiImages.set(poiId, []);
      }
      poiImages.get(poiId).push({
        url: getBestUrl(img),
        hasLocal: !!img.local_path,
        priority: img.local_path ? getLocalImagePriority(img.image_url) : getImagePriority(img.image_url)
      });
    }

    // Then sort by priority (local first, then by URL type) and limit
    for (const [poiId, imgList] of poiImages) {
      const sorted = imgList
        .sort((a, b) => a.priority - b.priority)
        .map(img => img.url)
        .slice(0, limitPerPoi);
      // Ensure final Map uses numeric keys
      imageMap.set(Number(poiId), sorted);
    }

    return imageMap;
  } catch (error) {
    console.error('Error batch fetching images:', error);
    return new Map();
  }
}

export default ImageUrl;
