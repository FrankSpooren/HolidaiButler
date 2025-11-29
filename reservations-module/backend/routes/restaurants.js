/**
 * Restaurant Routes
 * CRUD operations and restaurant management endpoints
 */

const express = require('express');
const router = express.Router();
const { Restaurant, Table, FloorPlan } = require('../models');
const {
  authenticate,
  optionalAuth,
  requireRestaurantManager,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  createRestaurantSchema,
  updateRestaurantSchema,
  paginationSchema,
} = require('../middleware/validators');
const cacheService = require('../services/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/restaurants
 * List restaurants (public)
 */
router.get('/', optionalAuth, validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

    const { count, rows } = await Restaurant.findAndCountAll({
      where: { is_active: true },
      attributes: [
        'id', 'name', 'description', 'cuisine_type', 'price_range',
        'address', 'contact', 'rating', 'review_count', 'features',
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        restaurants: rows,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/restaurants/:id
 * Get restaurant details (public)
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check cache
    const cached = await cacheService.getRestaurant(id);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const restaurant = await Restaurant.findByPk(id, {
      include: [
        {
          model: FloorPlan,
          as: 'floorPlans',
          where: { is_active: true },
          required: false,
        },
      ],
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Cache result
    await cacheService.cacheRestaurant(id, restaurant.toJSON());

    res.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/restaurants
 * Create new restaurant (admin only)
 */
router.post(
  '/',
  authenticate,
  requireRestaurantManager,
  validate(createRestaurantSchema),
  async (req, res, next) => {
    try {
      const restaurantData = req.body;

      const restaurant = await Restaurant.create({
        ...restaurantData,
        created_by: req.user.id,
      });

      logger.info(`Restaurant created: ${restaurant.id} by ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/restaurants/:id
 * Update restaurant
 */
router.put(
  '/:id',
  authenticate,
  requireRestaurantAccess,
  validate(updateRestaurantSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const restaurant = await Restaurant.findByPk(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      await restaurant.update(updates);

      // Invalidate cache
      await cacheService.invalidateRestaurant(id);

      logger.info(`Restaurant updated: ${id} by ${req.user.id}`);

      res.json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/restaurants/:id
 * Soft delete restaurant
 */
router.delete(
  '/:id',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const restaurant = await Restaurant.findByPk(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      await restaurant.update({ is_active: false });

      // Invalidate cache
      await cacheService.invalidateRestaurant(id);

      logger.info(`Restaurant deactivated: ${id} by ${req.user.id}`);

      res.json({
        success: true,
        message: 'Restaurant deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/restaurants/:id/settings
 * Get restaurant settings (staff only)
 */
router.get(
  '/:id/settings',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const restaurant = await Restaurant.findByPk(id, {
        attributes: [
          'id', 'name', 'opening_hours', 'min_party_size', 'max_party_size',
          'default_seating_duration', 'advance_booking_days', 'same_day_booking_cutoff',
          'deposit_required', 'deposit_amount', 'deposit_percentage',
          'cancellation_deadline_hours', 'no_show_fee', 'auto_confirm_reservations',
          'pos_integration_enabled', 'thefork_id', 'google_place_id',
        ],
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      res.json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/restaurants/:id/settings
 * Update restaurant settings
 */
router.put(
  '/:id/settings',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const settings = req.body;

      const restaurant = await Restaurant.findByPk(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      // Only allow specific settings to be updated
      const allowedSettings = [
        'opening_hours', 'min_party_size', 'max_party_size',
        'default_seating_duration', 'advance_booking_days', 'same_day_booking_cutoff',
        'deposit_required', 'deposit_amount', 'deposit_percentage',
        'cancellation_deadline_hours', 'no_show_fee', 'auto_confirm_reservations',
      ];

      const filteredSettings = {};
      for (const key of allowedSettings) {
        if (settings[key] !== undefined) {
          filteredSettings[key] = settings[key];
        }
      }

      await restaurant.update(filteredSettings);

      // Invalidate cache
      await cacheService.invalidateRestaurant(id);

      logger.info(`Restaurant settings updated: ${id} by ${req.user.id}`);

      res.json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/restaurants/:id/stats
 * Get restaurant statistics
 */
router.get(
  '/:id/stats',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const restaurant = await Restaurant.findByPk(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      // Get reservation statistics
      const { Reservation } = require('../models');
      const { Op, fn, col, literal } = require('sequelize');

      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = startDate;
      if (endDate) dateFilter[Op.lte] = endDate;

      const where = { restaurant_id: id };
      if (Object.keys(dateFilter).length > 0) {
        where.reservation_date = dateFilter;
      }

      const stats = await Reservation.findAll({
        where,
        attributes: [
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
          [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled'],
          [fn('SUM', literal("CASE WHEN status = 'no_show' THEN 1 ELSE 0 END")), 'no_shows'],
          [fn('SUM', col('party_size')), 'total_covers'],
          [fn('AVG', col('party_size')), 'avg_party_size'],
        ],
        raw: true,
      });

      // Get capacity utilization
      const AvailabilityService = require('../services/AvailabilityService');
      const today = new Date().toISOString().split('T')[0];
      const capacityStats = await AvailabilityService.getCapacityStats(id, today);

      res.json({
        success: true,
        data: {
          reservations: {
            total: parseInt(stats[0]?.total) || 0,
            completed: parseInt(stats[0]?.completed) || 0,
            cancelled: parseInt(stats[0]?.cancelled) || 0,
            noShows: parseInt(stats[0]?.no_shows) || 0,
            totalCovers: parseInt(stats[0]?.total_covers) || 0,
            avgPartySize: parseFloat(stats[0]?.avg_party_size) || 0,
          },
          capacity: capacityStats,
          restaurant: {
            rating: restaurant.rating,
            reviewCount: restaurant.review_count,
            totalReservations: restaurant.total_reservations,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/restaurants/search
 * Search restaurants
 */
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q, cuisine, priceRange, city, page = 1, limit = 20 } = req.query;
    const { Op } = require('sequelize');

    const where = { is_active: true };

    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }

    if (cuisine) {
      where.cuisine_type = { [Op.contains]: [cuisine] };
    }

    if (priceRange) {
      where.price_range = priceRange;
    }

    if (city) {
      where['address.city'] = { [Op.like]: `%${city}%` };
    }

    const { count, rows } = await Restaurant.findAndCountAll({
      where,
      attributes: [
        'id', 'name', 'description', 'cuisine_type', 'price_range',
        'address', 'rating', 'review_count',
      ],
      order: [['rating', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        restaurants: rows,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
