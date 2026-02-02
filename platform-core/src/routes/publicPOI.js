/**
 * Public POI Routes
 * Endpoints for customer-facing POI data (no authentication required)
 * FIXED: Use correct field names (verified, active) instead of non-existent 'status' field
 * Merged: Supports both page-based and offset-based pagination
 * Updated: 2025-12-14 - Added language support for POI translations (NL, DE, ES, SV, PL)
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';
import { getImagesForPOI, getImagesForPOIs } from "../models/ImageUrl.js";
import logger from '../utils/logger.js';
import Review from '../models/Review.js';

const router = express.Router();

// Supported languages for POI translations
const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'es', 'sv', 'pl'];

// Destination ID mapping
const DESTINATION_IDS = {
  'calpe': 1,
  'texel': 2,
  'alicante': 3
};

/**
 * Extract destination_id from request
 * Priority: X-Destination-ID header > query param > default (1 = Calpe)
 * @param {Request} req - Express request object
 * @returns {number} Destination ID
 */
const getDestinationFromRequest = (req) => {
  // 1. Check X-Destination-ID header (set by Apache vhost)
  const headerDestination = req.headers['x-destination-id'];
  if (headerDestination) {
    const destId = DESTINATION_IDS[headerDestination.toLowerCase()];
    if (destId) return destId;
    // If numeric, use directly
    const numId = parseInt(headerDestination);
    if (!isNaN(numId) && numId > 0) return numId;
  }

  // 2. Check query parameter
  if (req.query.destination) {
    const destId = DESTINATION_IDS[req.query.destination.toLowerCase()];
    if (destId) return destId;
    const numId = parseInt(req.query.destination);
    if (!isNaN(numId) && numId > 0) return numId;
  }

  // 3. Default to Calpe (1)
  return 1;
};

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
 * Accommodation categories to exclude from public display
 * Calpe: 'Accommodation (do not communicate)'
 * Texel: 'Accommodation' (grouped category - verified 2026-02-02)
 */
const ACCOMMODATION_CATEGORIES = [
  // Calpe
  'Accommodation (do not communicate)',
  // Texel (grouped category - verified 2026-02-02)
  'Accommodation',
];

/**
 * Build base where clause for public POI queries
 * Note: verified filter disabled for test environment (no POIs verified yet)
 * Uses is_active to filter only active POIs
 * Filters by destination_id for multi-destination support
 * Excludes accommodation POIs from public display (both Calpe and Texel formats)
 * Visibility flags:
 * - is_searchable_only: POIs without google_placeid, only shown in search results
 * - is_hidden_category: Accommodation POIs, hidden from browse but searchable
 * @param {number} destinationId - The destination ID to filter by
 * @param {boolean} isSearchMode - Whether this is a search query (shows hidden POIs)
 */
const buildPublicWhereClause = async (destinationId, isSearchMode = false) => {
  const whereClause = {
    is_active: true,
    destination_id: destinationId,
    // Exclude all accommodation categories from public display
    category: { [Op.notIn]: ACCOMMODATION_CATEGORIES }
    // verified: true  // Re-enable when POIs are verified in production
  };

  // In browse mode (not searching), hide POIs with visibility flags
  // In search mode, show ALL POIs including those with visibility flags
  if (!isSearchMode) {
    // Only show POIs that are NOT searchable-only and NOT hidden-category
    whereClause[Op.and] = [
      { [Op.or]: [
        { is_searchable_only: false },
        { is_searchable_only: null },
        { is_searchable_only: 0 }
      ]},
      { [Op.or]: [
        { is_hidden_category: false },
        { is_hidden_category: null },
        { is_hidden_category: 0 }
      ]}
    ];
  }
  // In search mode: no additional filters, all active POIs are searchable

  return whereClause;
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
const formatPOIForPublic = (poi, lang = "en", images = null) => {
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
    images: (images && images.length > 0) ? images : safeJSONParse(data.images, []),
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

    // Get language and destination from request
    const lang = getLanguageFromRequest(req);
    const destinationId = getDestinationFromRequest(req);

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

    // Support both 'q' and 'search' parameters
    const searchTerm = search || q;

    // Determine if this is search mode (shows hidden POIs) or browse mode (hides them)
    const isSearchMode = !!searchTerm;

    // Build where clause - filter by destination and active status
    // In search mode, hidden POIs (is_searchable_only, is_hidden_category) are included
    const where = await buildPublicWhereClause(destinationId, isSearchMode);
    if (category) where.category = category;
    if (city) where.city = { [Op.like]: `%${city}%` };

    // Add search term conditions if searching
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
    // Batch fetch images for all POIs (3 per tile)
    const poiIds = rows.map(poi => poi.id);
    const imageMap = await getImagesForPOIs(poiIds, 3);
    
    // Transform data for frontend compatibility with language support
    const pois = rows.map(poi => formatPOIForPublic(poi, lang, imageMap.get(Number(poi.id)) || []));

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
        language: lang,
        destination_id: destinationId
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

    // Get destination from request
    const destinationId = getDestinationFromRequest(req);

    const categories = await model.findAll({
      attributes: [[mysqlSequelize.fn('DISTINCT', mysqlSequelize.col('category')), 'category']],
      where: { destination_id: destinationId, is_active: true },
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

    // Get destination from request
    const destinationId = getDestinationFromRequest(req);

    const cities = await model.findAll({
      attributes: [[mysqlSequelize.fn('DISTINCT', mysqlSequelize.col('city')), 'city']],
      where: { destination_id: destinationId, is_active: true },
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
    const destinationId = getDestinationFromRequest(req);

    if (!model) {
      // Return sample data in GeoJSON format if model not available
      return res.json(convertToGeoJSON(getSamplePOIs(destinationId), lang));
    }

    const {
      category,
      city,
      per_category // New: limit POIs per category for cleaner map display
    } = req.query;

    // Build where clause - filter by destination and active status
    // GeoJSON is for map display (browse mode) - hide searchable-only POIs
    const where = await buildPublicWhereClause(destinationId, false);
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

      // Fetch limited POIs for each category (prioritize high rating within destination)
      const categoryPOIs = await Promise.all(
        categories.map(async (cat) => {
          return model.findAll({
            where: {
              ...where,
              category: cat.category
            },
            order: [['rating', 'DESC'], ['review_count', 'DESC']],
            limit
          });
        })
      );

      // Flatten and filter out empty results
      pois = categoryPOIs.flat();

      // If we don't have enough POIs, fill with more from destination
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
      // Original behavior - fetch all matching POIs for this destination
      pois = await model.findAll({
        where,
        order: [['rating', 'DESC'], ['name', 'ASC']]
      });
    }

    res.json(convertToGeoJSON(pois, lang));
  } catch (error) {
    logger.error('Error fetching POIs as GeoJSON:', error);

    // Return sample data on error for development
    const destinationId = getDestinationFromRequest(req);
    res.json(convertToGeoJSON(getSamplePOIs(destinationId), 'en'));
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
    const destinationId = getDestinationFromRequest(req);

    if (!model) {
      return res.json({
        success: true,
        message: 'Database not available - returning sample data',
        data: getSamplePOIs(destinationId),
        meta: { total: 5, page: 1, limit: 20, pages: 1, language: lang, destination_id: destinationId }
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

    // Build where clause - filter by destination and active status
    // Search mode = true: includes POIs with is_searchable_only and is_hidden_category flags
    const isSearchMode = true;  // This is the dedicated search endpoint
    const where = await buildPublicWhereClause(destinationId, isSearchMode);
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

    // Batch fetch images for POIs (3 per tile)
    const poiIds = rows.map(poi => poi.id);
    const imageMap = await getImagesForPOIs(poiIds, 3);
    
    res.json({
      success: true,
      data: rows.map(poi => formatPOIForPublic(poi, lang, imageMap.get(Number(poi.id)) || [])),
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
        language: lang,
        destination_id: destinationId
      }
    });
  } catch (error) {
    logger.error('Error searching POIs:', error);
    const destinationId = getDestinationFromRequest(req);
    res.json({
      success: true,
      message: 'Database error - returning sample data',
      data: getSamplePOIs(destinationId),
      meta: { total: 5, page: 1, limit: 20, pages: 1, destination_id: destinationId }
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
    const destinationId = getDestinationFromRequest(req);

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const model = await getPOIModel();
    if (!model) {
      return res.json({ success: true, data: [] });
    }

    // Autocomplete is search functionality - include hidden POIs
    const where = await buildPublicWhereClause(destinationId, true);
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
    const destinationId = getDestinationFromRequest(req);

    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { id } = req.params;

    // Get base where clause (filter by destination and active status)
    // Direct POI access: allow viewing hidden POIs via direct link
    const baseWhere = await buildPublicWhereClause(destinationId, true);

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

    // Fetch images for detail view (10 images)
    const images = await getImagesForPOI(poi.id, 10);
    
    res.json({
      success: true,
      data: formatPOIForPublic(poi, lang, images)
    });
  } catch (error) {
    logger.error('Error fetching POI:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching POI'
    });
  }
});

// ============================================
// REVIEW ROUTES - Sprint 7.6
// ============================================

/**
 * @route   GET /api/v1/pois/:poiId/reviews
 * @desc    Get reviews for a specific POI
 * @access  Public
 */
router.get('/:poiId/reviews', async (req, res) => {
  try {
    const { poiId } = req.params;
    const {
      travel_party,
      sentiment,
      sort = 'helpful',
      limit = 10,
      offset = 0
    } = req.query;

    // Build where clause
    const where = { poi_id: parseInt(poiId) };

    if (travel_party && travel_party !== 'all') {
      where.travel_party_type = travel_party;
    }

    if (sentiment && sentiment !== 'all') {
      where.sentiment = sentiment;
    }

    // Build order clause
    let order;
    switch (sort) {
      case 'recent':
        order = [['created_at', 'DESC']];
        break;
      case 'helpful':
        order = [['helpful_count', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'highRating':
        order = [['rating', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'lowRating':
        order = [['rating', 'ASC'], ['created_at', 'DESC']];
        break;
      default:
        order = [['helpful_count', 'DESC']];
    }

    const { count, rows } = await Review.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows.map(review => ({
        id: review.id,
        poi_id: review.poi_id,
        user_name: review.user_name,
        travel_party_type: review.travel_party_type,
        rating: parseFloat(review.rating),
        review_text: review.review_text,
        sentiment: review.sentiment,
        helpful_count: review.helpful_count,
        visit_date: review.visit_date,
        created_at: review.created_at
      })),
      total: count,
      filters: {
        travel_party: travel_party || 'all',
        sentiment: sentiment || 'all',
        sort,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/v1/pois/:poiId/reviews/summary
 * @desc    Get review summary statistics for a POI
 * @access  Public
 */
router.get('/:poiId/reviews/summary', async (req, res) => {
  try {
    const { poiId } = req.params;

    // Get all reviews for this POI to calculate statistics
    const reviews = await Review.findAll({
      where: { poi_id: parseInt(poiId) },
      attributes: ['rating', 'sentiment', 'travel_party_type']
    });

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          average_rating: 0,
          total_count: 0,
          sentiment_breakdown: {
            positive: 0,
            neutral: 0,
            negative: 0
          },
          party_breakdown: {
            couples: 0,
            families: 0,
            solo: 0,
            friends: 0,
            business: 0
          }
        }
      });
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);

    // Calculate sentiment breakdown
    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length
    };

    // Calculate travel party breakdown
    const partyBreakdown = {
      couples: reviews.filter(r => r.travel_party_type === 'couples').length,
      families: reviews.filter(r => r.travel_party_type === 'families').length,
      solo: reviews.filter(r => r.travel_party_type === 'solo').length,
      friends: reviews.filter(r => r.travel_party_type === 'friends').length,
      business: reviews.filter(r => r.travel_party_type === 'business').length
    };

    res.json({
      success: true,
      data: {
        average_rating: parseFloat(averageRating),
        total_count: reviews.length,
        sentiment_breakdown: sentimentBreakdown,
        party_breakdown: partyBreakdown
      }
    });
  } catch (error) {
    logger.error('Error fetching review summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/v1/pois/:poiId/reviews/insights
 * @desc    Get review insights (common keywords/themes) for a POI
 * @access  Public
 */
router.get('/:poiId/reviews/insights', async (req, res) => {
  try {
    const { poiId } = req.params;

    // Get reviews with text
    const reviews = await Review.findAll({
      where: {
        poi_id: parseInt(poiId),
        review_text: { [Op.ne]: null }
      },
      attributes: ['review_text']
    });

    // Simple keyword extraction (can be enhanced with NLP later)
    const keywords = {};
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'very', 'really', 'just', 'also', 'it', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they', 'my', 'our', 'your', 'his', 'her', 'their', 'its'];

    reviews.forEach(review => {
      if (review.review_text) {
        const words = review.review_text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3 && !commonWords.includes(word));

        words.forEach(word => {
          keywords[word] = (keywords[word] || 0) + 1;
        });
      }
    });

    // Get top keywords
    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        label: keyword.charAt(0).toUpperCase() + keyword.slice(1)
      }));

    res.json({
      success: true,
      data: {
        insights: topKeywords,
        sample_size: reviews.length
      }
    });
  } catch (error) {
    logger.error('Error fetching review insights:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/v1/pois/:poiId/reviews/:reviewId/helpful
 * @desc    Mark a review as helpful
 * @access  Public
 */
router.post('/:poiId/reviews/:reviewId/helpful', async (req, res) => {
  try {
    const { poiId, reviewId } = req.params;

    const review = await Review.findOne({
      where: {
        id: parseInt(reviewId),
        poi_id: parseInt(poiId)
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Increment helpful count
    review.helpful_count += 1;
    await review.save();

    res.json({
      success: true,
      data: {
        id: review.id,
        helpful_count: review.helpful_count
      }
    });
  } catch (error) {
    logger.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking review as helpful',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Sample POIs for development/demo (destination-aware)
 * @param {number} destinationId - 1=Calpe, 2=Texel, 3=Alicante
 */
function getSamplePOIs(destinationId = 1) {
  // Texel sample POIs
  if (destinationId === 2) {
    return [
      {
        id: '1001',
        name: 'Ecomare',
        slug: 'ecomare',
        description: 'Zeehondencentrum en natuurmuseum',
        category: 'museum',
        city: 'De Koog',
        address: 'Ruijslaan 92',
        latitude: 53.0947,
        longitude: 4.7547,
        status: 'active',
        tier: 1,
        images: [{ url: '/images/ecomare.jpg', isPrimary: true }],
        rating: 4.7,
        reviewCount: 1245
      },
      {
        id: '1002',
        name: 'Vuurtoren Texel',
        slug: 'vuurtoren-texel',
        description: 'Historische vuurtoren met panoramisch uitzicht',
        category: 'attraction',
        city: 'De Cocksdorp',
        address: 'Vuurtorenweg 184',
        latitude: 53.1789,
        longitude: 4.8556,
        status: 'active',
        tier: 1,
        images: [{ url: '/images/vuurtoren.jpg', isPrimary: true }],
        rating: 4.6,
        reviewCount: 892
      },
      {
        id: '1003',
        name: 'Strand Paal 17',
        slug: 'strand-paal-17',
        description: 'Populair strand met strandpaviljoen',
        category: 'beach',
        city: 'De Koog',
        address: 'Paal 17',
        latitude: 53.0833,
        longitude: 4.7333,
        status: 'active',
        tier: 1,
        images: [{ url: '/images/paal17.jpg', isPrimary: true }],
        rating: 4.5,
        reviewCount: 567
      },
      {
        id: '1004',
        name: 'Kaasboerderij Wezenspyk',
        slug: 'kaasboerderij-wezenspyk',
        description: 'Authentieke Texelse kaasmakerij',
        category: 'food_drinks',
        city: 'Den Burg',
        address: 'Hoornderweg 29',
        latitude: 53.0556,
        longitude: 4.7944,
        status: 'active',
        tier: 2,
        images: [{ url: '/images/wezenspyk.jpg', isPrimary: true }],
        rating: 4.4,
        reviewCount: 234
      },
      {
        id: '1005',
        name: 'TESO Veerhaven',
        slug: 'teso-veerhaven',
        description: 'Veerboot naar Den Helder',
        category: 'transport',
        city: "'t Horntje",
        address: 'Pontweg 1',
        latitude: 53.0000,
        longitude: 4.7833,
        status: 'active',
        tier: 1,
        images: [{ url: '/images/teso.jpg', isPrimary: true }],
        rating: 4.3,
        reviewCount: 1567
      }
    ];
  }

  // Calpe sample POIs (default)
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
