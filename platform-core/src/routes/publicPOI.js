/**
 * Public POI Routes
 * Endpoints for customer-facing POI data (no authentication required)
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const router = express.Router();

// Import POI model dynamically to handle connection issues
let POI = null;

const getPOIModel = async () => {
  if (!POI) {
    try {
      const module = await import('../models/POI.js');
      POI = module.default;
    } catch (error) {
      logger.error('Failed to load POI model:', error);
      return null;
    }
  }
  return POI;
};

/**
 * Helper to safely parse JSON fields
 */
function safeParseJSON(value, defaultValue = []) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Transform POI data for frontend compatibility
 */
function transformPOI(poi) {
  return {
    id: poi.id,
    name: poi.name,
    description: poi.description,
    category: poi.category,
    subcategory: poi.subcategory,
    level3_type: poi.poi_type || null,
    city: poi.city,
    address: poi.address,
    postal_code: poi.postal_code || null,
    latitude: poi.latitude ? parseFloat(poi.latitude) : null,
    longitude: poi.longitude ? parseFloat(poi.longitude) : null,
    rating: poi.rating ? parseFloat(poi.rating) : null,
    review_count: poi.review_count || 0,
    price_level: poi.price_level,
    phone: poi.phone,
    website: poi.website,
    email: poi.email,
    images: safeParseJSON(poi.images, []),
    thumbnail_url: poi.thumbnail_url,
    amenities: safeParseJSON(poi.amenities, []),
    accessibility_features: safeParseJSON(poi.accessibility_features, []),
    opening_hours: null,
    verified: poi.verified || false,
    featured: poi.featured || false,
    popularity_score: poi.popularity_score || 0,
    google_placeid: poi.google_placeid,
    enriched_tile_description: null,
    enriched_detail_description: null,
    content_quality_score: null,
    created_at: poi.last_updated || new Date().toISOString(),
    updated_at: poi.last_updated || new Date().toISOString()
  };
}

/**
 * @route   GET /api/v1/pois
 * @desc    Get all published POIs (public)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const {
      q,
      category,
      city,
      sort = 'name:asc',
      limit = 20,
      offset = 0,
      min_rating,
      require_images
    } = req.query;

    // Build where clause
    const where = {};
    if (category) where.category = category;
    if (city) where.city = city;
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } }
      ];
    }
    if (min_rating) {
      where.rating = { [Op.gte]: parseFloat(min_rating) };
    }

    // Parse sort parameter (e.g., name:asc or rating:desc)
    let orderClause = [['name', 'ASC']];
    if (sort) {
      const [field, direction] = sort.split(':');
      const validFields = ['name', 'rating', 'popularity_score', 'review_count'];
      if (validFields.includes(field)) {
        orderClause = [[field, (direction || 'asc').toUpperCase()]];
      }
    }

    const { count, rows } = await model.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause
    });

    // Transform data for frontend compatibility
    const pois = rows.map(transformPOI);

    // Return in format expected by frontend: { success, data: [...], meta: {...} }
    res.json({
      success: true,
      data: pois,
      meta: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: pois.length,
        cursor: null,
        next_cursor: parseInt(offset) + pois.length < count ? parseInt(offset) + parseInt(limit) : null,
        has_more: parseInt(offset) + pois.length < count,
        pagination_type: 'offset'
      }
    });
  } catch (error) {
    logger.error('Error fetching POIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching POIs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/v1/pois/categories
 * @desc    Get all unique categories
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const categories = await model.findAll({
      attributes: [[mysqlSequelize.fn('DISTINCT', mysqlSequelize.col('category')), 'category']],
      order: [['category', 'ASC']]
    });

    res.json({
      success: true,
      data: categories.map(c => c.category).filter(c => c)
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

/**
 * @route   GET /api/v1/pois/cities
 * @desc    Get all unique cities
 * @access  Public
 */
router.get('/cities', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const cities = await model.findAll({
      attributes: [[mysqlSequelize.fn('DISTINCT', mysqlSequelize.col('city')), 'city']],
      order: [['city', 'ASC']]
    });

    res.json({
      success: true,
      data: cities.map(c => c.city).filter(c => c)
    });
  } catch (error) {
    logger.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities'
    });
  }
});

/**
 * @route   GET /api/v1/pois/geojson
 * @desc    Get POIs in GeoJSON format for map display
 * @access  Public
 */
router.get('/geojson', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      // Return sample data in GeoJSON format if model not available
      return res.json(convertToGeoJSON(getSamplePOIs()));
    }

    const {
      category,
      city,
      status = 'active'
    } = req.query;

    // Build where clause
    const where = { status };
    if (category) where.category = category;
    if (city) where.city = city;

    const pois = await model.findAll({
      where,
      order: [['tier', 'ASC'], ['name', 'ASC']]
    });

    res.json(convertToGeoJSON(pois));
  } catch (error) {
    logger.error('Error fetching POIs as GeoJSON:', error);

    // Return sample data on error for development
    res.json(convertToGeoJSON(getSamplePOIs()));
  }
});

/**
 * Convert POIs array to GeoJSON FeatureCollection
 */
function convertToGeoJSON(pois) {
  return {
    type: 'FeatureCollection',
    features: pois.map(poi => {
      const poiData = poi.toJSON ? poi.toJSON() : poi;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(poiData.longitude) || 0,
            parseFloat(poiData.latitude) || 0
          ]
        },
        properties: {
          id: poiData.id,
          name: poiData.name,
          slug: poiData.slug,
          description: poiData.description,
          category: poiData.category,
          city: poiData.city,
          address: poiData.address,
          status: poiData.status,
          tier: poiData.tier,
          images: poiData.images,
          rating: poiData.rating,
          reviewCount: poiData.reviewCount
        }
      };
    })
  };
}

/**
 * @route   GET /api/v1/pois/:id
 * @desc    Get single POI by ID (public)
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { id } = req.params;

    const poi = await model.findByPk(id);

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.json({
      success: true,
      data: transformPOI(poi)
    });
  } catch (error) {
    logger.error('Error fetching POI:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching POI'
    });
  }
});

export default router;
