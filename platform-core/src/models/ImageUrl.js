/**
 * ImageUrl Model - Maps to imageurls table
 * Contains multiple images per POI for carousel/gallery display
 */
import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

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
  }
}, {
  tableName: 'imageurls',
  timestamps: false
});

/**
 * Get image priority based on URL pattern
 * Lower number = higher priority
 *
 * Priority based on reliability testing (29-12-2025):
 * - AF1Qip URLs: 100% success rate
 * - Worldota CDN: 100% success rate
 * - Streetview: 100% success rate
 * - gps-cs-s URLs: 68% success rate (32% return 403)
 */
function getImagePriority(url) {
  if (!url) return 999;

  // Worldota CDN (100% reliable)
  if (url.includes('worldota.net')) return 1;

  // AF1Qip Google Photos (100% reliable, highest quality)
  // Note: Check AF1Qip BEFORE general lh3 to catch classic format
  if (url.includes('lh3.googleusercontent.com/p/AF1Qip')) return 2;

  // Other lh3.googleusercontent.com (non-gps-cs-s, non-AF1Qip)
  if (url.includes('lh3.googleusercontent.com') && !url.includes('gps-cs-s')) return 3;

  // gps-cs-s URLs (68% reliable - lower priority due to 32% failure rate)
  if (url.includes('lh3.googleusercontent.com/gps-cs-s')) return 6;

  // Street View (100% reliable, but generic images)
  if (url.includes('streetviewpixels')) return 8;

  // Other sources
  return 5;
}

/**
 * Get images for a single POI with quality filtering
 * @param {number} poiId - POI ID
 * @param {number} limit - Max images to return
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function getImagesForPOI(poiId, limit = 10) {
  try {
    const images = await ImageUrl.findAll({
      where: { poi_id: poiId },
      order: [['image_id', 'ASC']],
      limit: limit + 5,
      attributes: ['image_url']
    });

    return images
      .map(img => img.image_url)
      .sort((a, b) => getImagePriority(a) - getImagePriority(b))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching images for POI:', poiId, error);
    return [];
  }
}

/**
 * Batch fetch images for multiple POIs
 * @param {number[]} poiIds - Array of POI IDs
 * @param {number} limitPerPoi - Max images per POI
 * @returns {Promise<Map<number, string[]>>} Map of POI ID to image URLs
 */
export async function getImagesForPOIs(poiIds, limitPerPoi = 3) {
  try {
    if (!poiIds || poiIds.length === 0) {
      return new Map();
    }

    const images = await ImageUrl.findAll({
      where: { poi_id: poiIds },
      order: [['poi_id', 'ASC'], ['image_id', 'ASC']],
      attributes: ['poi_id', 'image_url']
    });

    // Group by POI and filter/limit
    const imageMap = new Map();
    const poiImages = new Map();

    // First, collect all images per POI
    for (const img of images) {
      if (!poiImages.has(img.poi_id)) {
        poiImages.set(img.poi_id, []);
      }
      poiImages.get(img.poi_id).push(img.image_url);
    }

    // Then sort by priority and limit
    for (const [poiId, urls] of poiImages) {
      const sorted = urls
        .sort((a, b) => getImagePriority(a) - getImagePriority(b))
        .slice(0, limitPerPoi);
      imageMap.set(poiId, sorted);
    }

    return imageMap;
  } catch (error) {
    console.error('Error batch fetching images:', error);
    return new Map();
  }
}

export default ImageUrl;
