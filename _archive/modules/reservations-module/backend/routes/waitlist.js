/**
 * Waitlist Routes
 * Waitlist management and conversion endpoints
 */

const express = require('express');
const router = express.Router();
const WaitlistService = require('../services/WaitlistService');
const {
  authenticate,
  optionalAuth,
  requireRestaurantStaff,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  createWaitlistSchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * POST /api/v1/waitlist
 * Add to waitlist
 */
router.post(
  '/',
  optionalAuth,
  validate(createWaitlistSchema),
  async (req, res, next) => {
    try {
      const waitlistData = req.body;

      const entry = await WaitlistService.addToWaitlist(waitlistData);

      logger.info(`Waitlist entry created: ${entry.id}`);

      res.status(201).json({
        success: true,
        data: {
          entry,
          position: entry.position,
          message: `You are #${entry.position} on the waitlist`,
        },
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('already on the waitlist')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/waitlist/:id
 * Get waitlist entry
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const entry = await WaitlistService.getWaitlistEntry(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Waitlist entry not found',
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/waitlist/restaurant/:restaurantId
 * Get waitlist for restaurant (staff)
 */
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date, status, page, limit } = req.query;

      const result = await WaitlistService.getWaitlistByRestaurant(restaurantId, {
        date,
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/waitlist/guest/:guestId
 * Get waitlist entries for guest
 */
router.get('/guest/:guestId', authenticate, async (req, res, next) => {
  try {
    const { guestId } = req.params;
    const { status, page, limit } = req.query;

    // Check access
    if (req.user.id !== guestId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await WaitlistService.getWaitlistByGuest(guestId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/waitlist/:id
 * Remove from waitlist
 */
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.query;

    const entry = await WaitlistService.removeFromWaitlist(id, reason || 'guest_cancelled');

    logger.info(`Waitlist entry removed: ${id}`);

    res.json({
      success: true,
      message: 'Successfully removed from waitlist',
      data: entry,
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
 * POST /api/v1/waitlist/:id/convert
 * Convert waitlist entry to reservation
 */
router.post('/:id/convert', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    const result = await WaitlistService.convertToReservation(id, { date, time });

    logger.info(`Waitlist entry converted: ${id} -> ${result.reservation.id}`);

    res.json({
      success: true,
      data: {
        waitlistEntry: result.waitlistEntry,
        reservation: result.reservation,
      },
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message.includes('must be notified') || error.message.includes('expired')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/waitlist/restaurant/:restaurantId/check
 * Check and notify waitlist (staff triggered)
 */
router.post(
  '/restaurant/:restaurantId/check',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date } = req.body;

      const dateToCheck = date || new Date().toISOString().split('T')[0];

      await WaitlistService.checkAndNotifyWaitlist(restaurantId, dateToCheck);

      res.json({
        success: true,
        message: `Waitlist checked for ${dateToCheck}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/waitlist/restaurant/:restaurantId/stats
 * Get waitlist statistics
 */
router.get(
  '/restaurant/:restaurantId/stats',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null;

      const [stats, avgWaitTime] = await Promise.all([
        WaitlistService.getWaitlistStats(restaurantId, dateRange),
        WaitlistService.getAverageWaitTime(restaurantId),
      ]);

      res.json({
        success: true,
        data: {
          ...stats,
          averageWaitTime: avgWaitTime,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
