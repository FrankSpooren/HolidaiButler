/**
 * Reservation Routes
 * Booking, management, and reservation lifecycle endpoints
 */

const express = require('express');
const router = express.Router();
const ReservationService = require('../services/ReservationService');
const { Reservation } = require('../models');
const {
  authenticate,
  optionalAuth,
  requireRestaurantStaff,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  createReservationSchema,
  modifyReservationSchema,
  cancelReservationSchema,
  reservationQuerySchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * POST /api/v1/reservations
 * Create new reservation
 */
router.post(
  '/',
  optionalAuth,
  validate(createReservationSchema),
  async (req, res, next) => {
    try {
      const reservationData = req.body;

      // Add user ID if authenticated
      if (req.user) {
        reservationData.userId = req.user.id;
      }

      const result = await ReservationService.createReservation(reservationData);

      logger.info(`Reservation created: ${result.reservation.id}`);

      res.status(201).json({
        success: true,
        data: {
          reservation: result.reservation,
          requiresPayment: result.requiresPayment,
          paymentUrl: result.paymentSession?.paymentUrl,
          expiresAt: result.paymentSession?.expiresAt,
        },
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('not accepting')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('No availability')) {
        return res.status(409).json({
          success: false,
          error: error.message,
          code: 'NO_AVAILABILITY',
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/reservations/:id
 * Get reservation details
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
      include: [
        { model: require('../models').Restaurant, as: 'restaurant' },
        { model: require('../models').Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check access: owner, restaurant staff, or admin
    if (req.user) {
      const isOwner = reservation.guest?.id === req.user.id;
      const isStaff = req.user.restaurantId === reservation.restaurant_id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isStaff && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reservations/reference/:reference
 * Find reservation by reference and email
 */
router.get('/reference/:reference', async (req, res, next) => {
  try {
    const { reference } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const reservation = await ReservationService.findReservationByReference(reference, email);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/reservations/:id
 * Modify reservation
 */
router.put(
  '/:id',
  optionalAuth,
  validate(modifyReservationSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const reservation = await ReservationService.modifyReservation(id, updates);

      logger.info(`Reservation modified: ${id}`);

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('cannot be modified')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/reservations/:id/cancel
 * Cancel reservation
 */
router.post(
  '/:id/cancel',
  optionalAuth,
  validate(cancelReservationSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const cancelledBy = req.user?.role === 'staff' || req.user?.role === 'manager'
        ? 'restaurant'
        : 'guest';

      const reservation = await ReservationService.cancelReservation(id, cancelledBy, reason);

      logger.info(`Reservation cancelled: ${id} by ${cancelledBy}`);

      res.json({
        success: true,
        data: {
          reservation,
          refundStatus: reservation.deposit_status,
        },
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('cannot be cancelled')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/reservations/:id/confirm
 * Confirm reservation (after payment)
 */
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const reservation = await ReservationService.confirmReservation(id, transactionId);

    logger.info(`Reservation confirmed: ${id}`);

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message.includes('Payment verification failed')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'PAYMENT_FAILED',
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/reservations/:id/check-in
 * Check in guest (restaurant staff)
 */
router.post(
  '/:id/check-in',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { actualPartySize } = req.body;

      const reservation = await ReservationService.checkInGuest(
        id,
        req.user.id,
        actualPartySize
      );

      logger.info(`Guest checked in: ${id} by ${req.user.id}`);

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('Only confirmed')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/reservations/:id/complete
 * Complete reservation (restaurant staff)
 */
router.post(
  '/:id/complete',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const reservation = await ReservationService.completeReservation(id);

      logger.info(`Reservation completed: ${id}`);

      res.json({
        success: true,
        data: reservation,
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
 * POST /api/v1/reservations/:id/no-show
 * Mark as no-show (restaurant staff)
 */
router.post(
  '/:id/no-show',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const reservation = await ReservationService.markNoShow(id, req.user.id);

      logger.info(`Reservation marked as no-show: ${id}`);

      res.json({
        success: true,
        data: reservation,
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
 * GET /api/v1/reservations/restaurant/:restaurantId
 * Get reservations for restaurant (staff)
 */
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  requireRestaurantAccess,
  validate(reservationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const filters = req.query;

      const result = await ReservationService.getReservationsByRestaurant(restaurantId, filters);

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
 * GET /api/v1/reservations/guest/:guestId
 * Get reservations for guest
 */
router.get('/guest/:guestId', authenticate, async (req, res, next) => {
  try {
    const { guestId } = req.params;
    const { status, upcoming } = req.query;

    // Check access
    if (req.user.id !== guestId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await ReservationService.getReservationsByGuest(guestId, {
      status,
      upcoming: upcoming !== 'false',
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
 * GET /api/v1/reservations/today/:restaurantId
 * Get today's reservations (staff)
 */
router.get(
  '/today/:restaurantId',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const today = new Date().toISOString().split('T')[0];

      const result = await ReservationService.getReservationsByRestaurant(restaurantId, {
        date: today,
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
 * POST /api/v1/reservations/:id/assign-table
 * Manually assign table (staff)
 */
router.post(
  '/:id/assign-table',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tableIds } = req.body;

      const TableManagementService = require('../services/TableManagementService');

      await TableManagementService.assignTables(id, tableIds);

      const reservation = await Reservation.findByPk(id);

      logger.info(`Table assigned to reservation: ${id}`);

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
