/**
 * Public POI Routes
 * Endpoints for customer-facing POI data (no authentication required)
 * FIXED: Use correct field names (verified, active) instead of non-existent 'status' field
 * Merged: Supports both page-based and offset-based pagination
 * Updated: 2025-12-14 - Added language support for POI translations (NL, DE, ES, SV, PL)
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const router = express.Router();

// Supported languages for POI translations
const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'es', 'sv', 'pl'];

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
 * Extract language from request (query param or Accept-Language header)
 * @param {Request} req - Express request object
 * @returns {string} Language code (en, nl, de, es, sv, pl)
 */
const getLanguageFromRequest = (req) => {
  // 1. Check query parameter first (highest priority)
  if (req.query.lang && SUPPORTED_LANGUAGES.includes(req.query.lang.toLowerCase())) {
    return req.query.lang.toLowerCase();
  }

  // 2. Check Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "nl-NL,nl;q=0.9,en;q=0.8")
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.trim().split(';');
      return code.split('-')[0].toLowerCase(); // Get base language code
    });

    // Find first supported language
    for (const lang of languages) {
      if (SUPPORTED_LANGUAGES.includes(lang)) {
        return lang;
      }
    }
  }

  // 3. Default to English
  return 'en';
};

/**
 * Build base where clause for public POI queries
 * Note: verified filter disabled for test environment (no POIs verified yet)
 * Uses is_active to filter only active POIs
 */
const buildPublicWhereClause = async () => {
  return {
    is_active: true
    // verified: true  // Re-enable when POIs are verified in production
  };
};

/**
 * Safe JSON parse helper
 */
const safeJSONParse = (data, defaultValue = null) => {
  if (!data) return defaultValue;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

/**
 * Get translated field value with fallback to English
 * @param {Object} data - POI data object
 * @param {string} fieldBase - Base field name (e.g., 'enriched_tile_description')
 * @param {string} lang - Target language code
 * @returns {string|null} Translated value or fallback
 */
const getTranslatedField = (data, fieldBase, lang) => {
  // For English, return the base field
  if (lang === 'en') {
    return data[fieldBase];
  }

  // Try to get the translated field
  const translatedField = `${fieldBase}_${lang}`;
  const translatedValue = data[translatedField];

  // Return translated value if exists, otherwise fallback to English
  return translatedValue || data[fieldBase];
};

/**
 * Format POI from database to public API response format
 * Uses actual database column names (is_active, rating, etc.)
 * Supports language-specific translations for enriched content
 */
const formatPOIForPublic = (poi, lang = 'en') => {
  const data = poi.toJSON ? poi.toJSON() : poi;
  return {
    id: data.id,
    name: data.name,
    slug: data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: data.description,
    category: data.category,
    subcategory: data.subcategory,
    level3_type: data.poi_type || null,
    city: data.city,
    region: data.region,
    country: data.country,
    address: data.address,
    postal_code: data.postal_code || null,
    latitude: data.latitude ? parseFloat(data.latitude) : null,
    longitude: data.longitude ? parseFloat(data.longitude) : null,
    status: data.verified && data.is_active ? 'active' : 'pending',
    rating: data.rating ? parseFloat(data.rating) : null,
    reviewCount: data.review_count || 0,
    review_count: data.review_count || 0,
    price_level: data.price_level,
    images: safeJSONParse(data.images, []),
    thumbnail_url: data.thumbnail_url,
    amenities: safeJSONParse(data.amenities, []),
    accessibility_features: safeJSONParse(data.accessibility_features, []),
    opening_hours: safeJSONParse(data.opening_hours, null),
    phone: data.phone,
    website: data.website,
    email: data.email,
    verified: data.verified || false,
    featured: data.featured || false,
    popularity_score: data.popularity_score || 0,
    google_placeid: data.google_placeid,
    // Translated enriched content
    enriched_tile_description: getTranslatedField(data, 'enriched_tile_description', lang),
    enriched_detail_description: getTranslatedField(data, 'enriched_detail_description', lang),
    enriched_highlights: safeJSONParse(data.enriched_highlights, []),
    enriched_target_audience: data.enriched_target_audience,
    // Include language info in response
    _language: lang,
    created_at: data.created_at || data.last_updated || new Date().toISOString(),
    updated_at: data.last_updated || new Date().toISOString()
  };
};

/**
 * @route   GET /api/v1/pois
 * @desc    Get all published POIs (public)
 * @access  Public
 * @query   lang - Language code (en, nl, de, es, sv, pl) - optional, defaults to Accept-Language header or 'en'
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

    // Get language from request
    const lang = getLanguageFromRequest(req);

    const {
      q,
      category,
      city,
      search,
      sort = 'name:asc',
      page = 1,
      limit = 20,
      offset,
      min_rating,
      require_images
    } = req.query;

    // Calculate offset from page if not provided directly
    const calculatedOffset = offset !== undefined ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);

    // Build where clause - only show verified (and active if column exists) POIs
    const where = await buildPublicWhereClause(model);
    if (category) where.category = category;
    if (city) where.city = { [Op.like]: `%${city}%` };

    // Support both 'q' and 'search' parameters
    const searchTerm = search || q;
    if (searchTerm) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { city: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    if (min_rating) {
      where.rating = { [Op.gte]: parseFloat(min_rating) };
    }

    // Parse sort parameter
    let order = [['name', 'ASC']];
    if (sort) {
      const [sortField, sortDir] = sort.split(':');
      const fieldMap = {
        name: 'name',
        rating: 'rating',
        category: 'category',
        popularity_score: 'popularity_score',
        review_count: 'review_count',
        created_at: 'created_at',
      };
      const validFields = Object.keys(fieldMap);
      if (validFields.includes(sortField)) {
        const mappedField = fieldMap[sortField] || sortField;
        order = [[mappedField, (sortDir || 'asc').toUpperCase()]];
      }
    }

    const { count, rows } = await model.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: calculatedOffset,
      order
    });

    // Transform data for frontend compatibility with language support
    const pois = rows.map(poi => formatPOIForPublic(poi, lang));

    // Return in format that supports both pagination styles
    res.json({
      success: true,
      data: pois,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        offset: calculatedOffset,
        pages: Math.ceil(count / parseInt(limit)),
        count: pois.length,
        has_more: calculatedOffset + pois.length < count,
        next_cursor: calculatedOffset + pois.length < count ? calculatedOffset + parseInt(limit) : null,
        language: lang
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
 * @query   per_category - Number of POIs per category (default: all)
 * @query   city - Filter by city (default: Calpe area)
 * @query   lang - Language code for translations
 */
router.get('/geojson', async (req, res) => {
  try {
    const model = await getPOIModel();
    const lang = getLanguageFromRequest(req);

    if (!model) {
      // Return sample data in GeoJSON format if model not available
      return res.json(convertToGeoJSON(getSamplePOIs(), lang));
    }

    const {
      category,
      city,
      per_category // New: limit POIs per category for cleaner map display
    } = req.query;

    // Build where clause - only show verified (and active if column exists) POIs
    const where = await buildPublicWhereClause(model);
    if (category) where.category = category;
    if (city) where.city = { [Op.like]: `%${city}%` };

    let pois;

    if (per_category && !category) {
      // Fetch limited POIs per category for balanced map display
      const limit = parseInt(per_category) || 2;

      // Get all categories first
      const categories = await model.findAll({
        attributes: [[mysqlSequelize.fn('DISTINCT', mysqlSequelize.col('category')), 'category']],
        where,
        raw: true
      });

      // Fetch limited POIs for each category (prioritize Calpe, high rating)
      const categoryPOIs = await Promise.all(
        categories.map(async (cat) => {
          return model.findAll({
            where: {
              ...where,
              category: cat.category,
              // Focus on Calpe area for better presentation
              city: { [Op.in]: ['Calp', 'Calpe', 'Calp/Calpe'] }
            },
            order: [['rating', 'DESC'], ['review_count', 'DESC']],
            limit
          });
        })
      );

      // Flatten and filter out empty results
      pois = categoryPOIs.flat();

      // If we don't have enough POIs from Calpe, fill with nearby cities
      if (pois.length < categories.length * limit) {
        const existingIds = pois.map(p => p.id);
        const additionalPOIs = await model.findAll({
          where: {
            ...where,
            id: { [Op.notIn]: existingIds }
          },
          order: [['rating', 'DESC'], ['review_count', 'DESC']],
          limit: (categories.length * limit) - pois.length
        });
        pois = [...pois, ...additionalPOIs];
      }
    } else {
      // Original behavior - fetch all matching POIs
      pois = await model.findAll({
        where,
        order: [['rating', 'DESC'], ['name', 'ASC']]
      });
    }

    res.json(convertToGeoJSON(pois, lang));
  } catch (error) {
    logger.error('Error fetching POIs as GeoJSON:', error);

    // Return sample data on error for development
    res.json(convertToGeoJSON(getSamplePOIs(), 'en'));
  }
});

/**
 * @route   GET /api/v1/pois/search
 * @desc    Search POIs with fuzzy matching
 * @access  Public
 * @query   lang - Language code for translations
 */
router.get('/search', async (req, res) => {
  try {
    const model = await getPOIModel();
    const lang = getLanguageFromRequest(req);

    if (!model) {
      return res.json({
        success: true,
        message: 'Database not available - returning sample data',
        data: getSamplePOIs(),
        meta: { total: 5, page: 1, limit: 20, pages: 1, language: lang }
      });
    }

    const {
      q,
      query,
      page = 1,
      limit = 20,
      category
    } = req.query;

    const searchTerm = q || query || '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause - only show verified (and active if column exists) POIs
    const where = await buildPublicWhereClause(model);
    if (category) where.category = category;

    if (searchTerm) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { city: { [Op.like]: `%${searchTerm}%` } },
        { address: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    const { count, rows } = await model.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['rating', 'DESC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: rows.map(poi => formatPOIForPublic(poi, lang)),
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
        language: lang
      }
    });
  } catch (error) {
    logger.error('Error searching POIs:', error);
    res.json({
      success: true,
      message: 'Database error - returning sample data',
      data: getSamplePOIs(),
      meta: { total: 5, page: 1, limit: 20, pages: 1 }
    });
  }
});

/**
 * @route   GET /api/v1/pois/autocomplete
 * @desc    Get autocomplete suggestions for POI names
 * @access  Public
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const model = await getPOIModel();
    if (!model) {
      return res.json({ success: true, data: [] });
    }

    const where = await buildPublicWhereClause(model);
    where.name = { [Op.like]: `%${q}%` };

    const pois = await model.findAll({
      where,
      attributes: ['id', 'name', 'category', 'city'],
      limit: parseInt(limit),
      order: [['rating', 'DESC']]
    });

    res.json({
      success: true,
      data: pois.map(poi => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        city: poi.city
      }))
    });
  } catch (error) {
    logger.error('Error fetching autocomplete:', error);
    res.json({ success: true, data: [] });
  }
});

/**
 * Convert POIs array to GeoJSON FeatureCollection
 * @param {Array} pois - Array of POI objects
 * @param {string} lang - Language code for translations
 */
function convertToGeoJSON(pois, lang = 'en') {
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
          slug: poiData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: poiData.description,
          enriched_tile_description: getTranslatedField(poiData, 'enriched_tile_description', lang),
          category: poiData.category,
          city: poiData.city,
          address: poiData.address,
          status: poiData.verified && poiData.is_active ? 'active' : 'pending',
          images: safeJSONParse(poiData.images, []),
          rating: poiData.rating ? parseFloat(poiData.rating) : null,
          reviewCount: poiData.review_count || 0,
          price_level: poiData.price_level ? parseInt(poiData.price_level) : null
        }
      };
    })
  };
}

/**
 * @route   GET /api/v1/pois/:id
 * @desc    Get single POI by ID (public)
 * @access  Public
 * @query   lang - Language code for translations
 */
router.get('/:id', async (req, res) => {
  try {
    const model = await getPOIModel();
    const lang = getLanguageFromRequest(req);

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { id } = req.params;

    // Get base where clause (verified + active if column exists)
    const baseWhere = await buildPublicWhereClause(model);

    // Try to find by ID first, then by slug or google_place_id
    let poi = null;

    // Check if id is numeric
    if (/^\d+$/.test(id)) {
      poi = await model.findOne({
        where: {
          ...baseWhere,
          id: id
        }
      });
    }

    // If not found by numeric ID, try google_place_id
    if (!poi) {
      poi = await model.findOne({
        where: {
          ...baseWhere,
          google_place_id: id
        }
      });
    }

    // If not found, try name-based search as fallback (slug-style)
    if (!poi) {
      const slugSearch = id.replace(/-/g, ' ');
      poi = await model.findOne({
        where: {
          ...baseWhere,
          name: { [Op.like]: `%${slugSearch}%` }
        }
      });
    }

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.json({
      success: true,
      data: formatPOIForPublic(poi, lang)
    });
  } catch (error) {
    logger.error('Error fetching POI:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching POI'
    });
  }
});

/**
 * Sample POIs for development/demo
 */
function getSamplePOIs() {
  return [
    {
      id: '1',
      name: 'Penyal d\'Ifac',
      slug: 'penyal-difac',
      description: 'Iconic rock formation and nature reserve',
      category: 'beach',
      city: 'Calpe',
      address: 'Parque Natural del Penyal d\'Ifac',
      latitude: 38.6327,
      longitude: 0.0778,
      status: 'active',
      tier: 1,
      images: [{ url: '/images/penyal.jpg', isPrimary: true }],
      rating: 4.8,
      reviewCount: 245
    },
    {
      id: '2',
      name: 'Playa Arenal-Bol',
      slug: 'playa-arenal-bol',
      description: 'Main beach with golden sand',
      category: 'beach',
      city: 'Calpe',
      address: 'Av. de los Ejércitos Españoles',
      latitude: 38.6448,
      longitude: 0.0598,
      status: 'active',
      tier: 2,
      images: [{ url: '/images/arenal.jpg', isPrimary: true }],
      rating: 4.5,
      reviewCount: 189
    },
    {
      id: '3',
      name: 'Restaurante Baydal',
      slug: 'restaurante-baydal',
      description: 'Traditional Mediterranean cuisine',
      category: 'food_drinks',
      city: 'Calpe',
      address: 'Calle Mayor 12',
      latitude: 38.6445,
      longitude: 0.0441,
      status: 'active',
      tier: 1,
      images: [{ url: '/images/baydal.jpg', isPrimary: true }],
      rating: 4.7,
      reviewCount: 312
    },
    {
      id: '4',
      name: 'Museo de Historia',
      slug: 'museo-historia-calpe',
      description: 'Local history museum',
      category: 'museum',
      city: 'Calpe',
      address: 'Plaza de la Villa',
      latitude: 38.6452,
      longitude: 0.0445,
      status: 'active',
      tier: 3,
      images: [{ url: '/images/museo.jpg', isPrimary: true }],
      rating: 4.2,
      reviewCount: 87
    },
    {
      id: '5',
      name: 'Centro Comercial Portal',
      slug: 'centro-comercial-portal',
      description: 'Shopping center with local shops',
      category: 'shopping',
      city: 'Calpe',
      address: 'Av. Gabriel Miró 5',
      latitude: 38.6461,
      longitude: 0.0512,
      status: 'active',
      tier: 4,
      images: [{ url: '/images/portal.jpg', isPrimary: true }],
      rating: 4.0,
      reviewCount: 56
    }
  ];
}

export default router;
