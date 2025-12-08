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
 * @route   GET /api/v1/pois
 * @desc    Get all published POIs (public)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      // Return mock data if model not available
      return res.json({
        success: true,
        message: 'Database not connected - returning sample data',
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

    const {
      page = 1,
      limit = 20,
      category,
      city,
      search,
      status = 'active'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = { status };
    if (category) where.category = category;
    if (city) where.city = city;

    const { count, rows } = await model.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['tier', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        pois: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching POIs:', error);

    // Return sample data on error for development
    res.json({
      success: true,
      message: 'Database error - returning sample data',
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
 * @route   GET /api/v1/pois/:id
 * @desc    Get single POI by ID or slug (public)
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

    // SECURITY FIX: Use parameterized query instead of string interpolation
    // Bug fixed: 30-11-2025 - Prevents SQL injection attacks
    const poi = await model.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { slug: id }
        ],
        status: 'active'
      }
    });

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.json({
      success: true,
      data: poi
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
}

export default router;
