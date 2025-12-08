/**
 * Public POI Routes for Customer Portal
 * Endpoints for customer-facing POI data (no authentication required)
 * These routes mirror platform-core's publicPOI.js for when frontend calls admin-module
 */

import express from 'express';
import { Op } from 'sequelize';
import { POI } from '../models/index.js';

const router = express.Router();

/**
 * Sample POIs for development/demo when database is unavailable
 */
const getSamplePOIs = () => [
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
    tier: 'premium',
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
    tier: 'standard',
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
    tier: 'premium',
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
    tier: 'standard',
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
    tier: 'basic',
    images: [{ url: '/images/portal.jpg', isPrimary: true }],
    rating: 4.0,
    reviewCount: 56
  }
];

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
 * Format POI from database to public API response format
 */
const formatPOIForPublic = (poi) => {
  const data = poi.toJSON ? poi.toJSON() : poi;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug || data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: data.description,
    category: data.category,
    city: data.city,
    address: data.address,
    latitude: data.latitude ? parseFloat(data.latitude) : null,
    longitude: data.longitude ? parseFloat(data.longitude) : null,
    status: data.verified ? 'active' : 'pending',
    tier: data.tier || 'standard',
    images: safeJSONParse(data.images, []),
    rating: data.rating,
    reviewCount: data.review_count,
    amenities: safeJSONParse(data.amenities, []),
    opening_hours: safeJSONParse(data.opening_hours, null),
    phone: data.phone,
    website: data.website,
    email: data.email,
  };
};

/**
 * Convert POIs array to GeoJSON FeatureCollection
 */
const convertToGeoJSON = (pois) => {
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
          slug: poiData.slug || poiData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: poiData.description,
          category: poiData.category,
          city: poiData.city,
          address: poiData.address,
          status: poiData.verified ? 'active' : 'pending',
          tier: poiData.tier || 'standard',
          images: safeJSONParse(poiData.images, []),
          rating: poiData.rating,
          reviewCount: poiData.review_count
        }
      };
    })
  };
};

/**
 * @route   GET /api/v1/pois
 * @desc    Get all published POIs (public)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      city,
      search,
      sort = 'name:asc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause - only show verified/active POIs
    const where = { verified: true };
    if (category) where.category = category;
    if (city) where.city = { [Op.like]: `%${city}%` };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ];
    }

    // Parse sort parameter
    let order = [['name', 'ASC']];
    if (sort) {
      const [sortField, sortDir] = sort.split(':');
      const fieldMap = {
        name: 'name',
        rating: 'rating',
        category: 'category',
        created_at: 'created_at',
      };
      const mappedField = fieldMap[sortField] || 'name';
      order = [[mappedField, (sortDir || 'asc').toUpperCase()]];
    }

    const { count, rows } = await POI.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order
    });

    res.json({
      success: true,
      data: {
        pois: rows.map(formatPOIForPublic),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching POIs:', error);

    // Return sample data on error for development
    res.json({
      success: true,
      message: 'Database unavailable - returning sample data',
      data: {
        pois: getSamplePOIs(),
        pagination: {
          total: 5,
          page: 1,
          limit: 20,
          pages: 1
        }
      }
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
    const { category, city } = req.query;

    // Build where clause - only show verified/active POIs
    const where = { verified: true };
    if (category) where.category = category;
    if (city) where.city = { [Op.like]: `%${city}%` };

    const pois = await POI.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(convertToGeoJSON(pois));
  } catch (error) {
    console.error('Error fetching POIs as GeoJSON:', error);

    // Return sample data on error for development
    res.json(convertToGeoJSON(getSamplePOIs()));
  }
});

/**
 * @route   GET /api/v1/pois/search
 * @desc    Search POIs with fuzzy matching
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q,
      query,
      page = 1,
      limit = 20,
      category
    } = req.query;

    const searchTerm = q || query || '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { verified: true };
    if (category) where.category = category;

    if (searchTerm) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { city: { [Op.like]: `%${searchTerm}%` } },
        { address: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    const { count, rows } = await POI.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['rating', 'DESC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        pois: rows.map(formatPOIForPublic),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error searching POIs:', error);

    // Return sample data on error
    const samplePOIs = getSamplePOIs();
    res.json({
      success: true,
      message: 'Database unavailable - returning sample data',
      data: {
        pois: samplePOIs,
        pagination: {
          total: samplePOIs.length,
          page: 1,
          limit: 20,
          pages: 1
        }
      }
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
      return res.json({
        success: true,
        data: []
      });
    }

    const pois = await POI.findAll({
      where: {
        verified: true,
        name: { [Op.like]: `%${q}%` }
      },
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
    console.error('Error fetching autocomplete:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * @route   GET /api/v1/pois/:id
 * @desc    Get single POI by ID or slug (public)
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug-like name match
    let poi = await POI.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { google_placeid: id }
        ],
        verified: true
      }
    });

    // If not found by ID, try slug-based search
    if (!poi) {
      const slugSearch = id.replace(/-/g, '%');
      poi = await POI.findOne({
        where: {
          name: { [Op.like]: `%${slugSearch}%` },
          verified: true
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
      data: formatPOIForPublic(poi)
    });
  } catch (error) {
    console.error('Error fetching POI:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching POI'
    });
  }
});

export default router;
