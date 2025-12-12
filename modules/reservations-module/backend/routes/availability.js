/**
 * Availability Routes
 * Real-time availability checking and management endpoints
 */

const express = require('express');
const router = express.Router();
const AvailabilityService = require('../services/AvailabilityService');
const {
  authenticate,
  optionalAuth,
  requireRestaurantStaff,
  requireRestaurantManager,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  checkAvailabilitySchema,
  availabilityRangeSchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * POST /api/v1/availability/check
 * Check availability for specific date/time
 */
router.post(
  '/check',
  optionalAuth,
  validate(checkAvailabilitySchema),
  async (req, res, next) => {
    try {
      const { restaurantId, date, time, partySize } = req.body;

      const availability = await AvailabilityService.checkAvailability({
        restaurantId,
        date,
        time,
        partySize,
      });

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/availability/:restaurantId
 * Get availability for a date (with optional time)
 */
router.get('/:restaurantId', optionalAuth, async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { date, time, partySize } = req.query;

    if (!date || !partySize) {
      return res.status(400).json({
        success: false,
        error: 'date and partySize are required',
      });
    }

    const availability = await AvailabilityService.checkAvailability({
      restaurantId,
      date,
      time: time || null,
      partySize: parseInt(partySize),
    });

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/availability/range
 * Get availability for date range (calendar view)
 */
router.post(
  '/range',
  optionalAuth,
  validate(availabilityRangeSchema),
  async (req, res, next) => {
    try {
      const { restaurantId, startDate, endDate, partySize } = req.body;

      const availability = await AvailabilityService.getAvailabilityRange(
        restaurantId,
        startDate,
        endDate,
        partySize
      );

      res.json({
        success: true,
        data: {
          restaurantId,
          startDate,
          endDate,
          partySize,
          dates: availability,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/availability/:restaurantId/calendar
 * Get calendar view of availability
 */
router.get('/:restaurantId/calendar', optionalAuth, async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { month, year, partySize } = req.query;

    if (!partySize) {
      return res.status(400).json({
        success: false,
        error: 'partySize is required',
      });
    }

    const startDate = `${year || new Date().getFullYear()}-${String(month || new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    const availability = await AvailabilityService.getAvailabilityRange(
      restaurantId,
      startDate,
      endDate,
      parseInt(partySize)
    );

    res.json({
      success: true,
      data: {
        restaurantId,
        month: parseInt(month) || new Date().getMonth() + 1,
        year: parseInt(year) || new Date().getFullYear(),
        partySize: parseInt(partySize),
        dates: availability,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/availability/:restaurantId/stats
 * Get capacity statistics (staff)
 */
router.get(
  '/:restaurantId/stats',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date } = req.query;

      const dateToCheck = date || new Date().toISOString().split('T')[0];

      const stats = await AvailabilityService.getCapacityStats(restaurantId, dateToCheck);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/availability/:restaurantId/block
 * Block a time slot (staff)
 */
router.post(
  '/:restaurantId/block',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date, time, reason } = req.body;

      if (!date || !time) {
        return res.status(400).json({
          success: false,
          error: 'date and time are required',
        });
      }

      const slot = await AvailabilityService.blockTimeSlot(
        restaurantId,
        date,
        time,
        reason || 'Manually blocked'
      );

      logger.info(`Time slot blocked: ${restaurantId}/${date}/${time} by ${req.user.id}`);

      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/availability/:restaurantId/unblock
 * Unblock a time slot (staff)
 */
router.post(
  '/:restaurantId/unblock',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date, time } = req.body;

      if (!date || !time) {
        return res.status(400).json({
          success: false,
          error: 'date and time are required',
        });
      }

      const slot = await AvailabilityService.unblockTimeSlot(restaurantId, date, time);

      logger.info(`Time slot unblocked: ${restaurantId}/${date}/${time} by ${req.user.id}`);

      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/availability/:restaurantId/generate
 * Generate availability slots for a date (staff)
 */
router.post(
  '/:restaurantId/generate',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'date is required',
        });
      }

      const slots = await AvailabilityService.generateDailySlots(restaurantId, date);

      logger.info(`Availability slots generated: ${restaurantId}/${date} (${slots.length} slots)`);

      res.json({
        success: true,
        data: {
          date,
          slotsGenerated: slots.length,
          slots,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/availability/expire-pending
 * Expire pending reservations (admin/cron)
 */
router.post(
  '/expire-pending',
  authenticate,
  async (req, res, next) => {
    try {
      // Only admin or system
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const result = await AvailabilityService.expirePendingReservations();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
