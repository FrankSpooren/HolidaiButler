const express = require('express');
const router = express.Router();
const AvailabilityService = require('../services/AvailabilityService');
const BookingService = require('../services/BookingService');
const TicketService = require('../services/TicketService');
const WalletService = require('../services/WalletService');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  validate,
  createBookingSchema,
  checkAvailabilitySchema,
  validateTicketSchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');
const { Ticket } = require('../models');

/**
 * Ticketing Module API Routes
 * Based on TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md specifications
 */

// ========== AVAILABILITY ENDPOINTS ==========

/**
 * GET /api/v1/tickets/availability/:poiId
 * Get availability for a POI on a specific date
 */
router.get('/availability/:poiId', optionalAuth, async (req, res) => {
  try {
    const { poiId } = req.params;
    const { date, timeslot } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required',
      });
    }

    const availability = await AvailabilityService.checkAvailability(poiId, date, timeslot);

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/tickets/availability/check
 * Check availability for multiple dates/timeslots
 */
router.post('/availability/check', optionalAuth, validate(checkAvailabilitySchema), async (req, res) => {
  try {
    const { poiId, date, timeslot, quantity } = req.body;

    const availability = await AvailabilityService.checkAvailability(poiId, date, timeslot);

    // Check if requested quantity is available
    const canBook = availability.available && availability.capacity.available >= (quantity || 1);

    res.json({
      success: true,
      data: {
        ...availability,
        requestedQuantity: quantity,
        canBook,
      },
    });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
    });
  }
});

/**
 * GET /api/v1/tickets/availability/:poiId/range
 * Get availability for a date range (calendar view)
 */
router.get('/availability/:poiId/range', optionalAuth, async (req, res) => {
  try {
    const { poiId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate parameters are required',
      });
    }

    const availabilities = await AvailabilityService.getAvailabilityRange(
      poiId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: availabilities,
    });
  } catch (error) {
    logger.error('Error getting availability range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get availability range',
    });
  }
});

// ========== BOOKING ENDPOINTS ==========

/**
 * POST /api/v1/tickets/bookings
 * Create a new booking
 */
router.post('/bookings', authenticate, validate(createBookingSchema), async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      userId: req.user.id,
      source: req.body.source || 'mobile',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const booking = await BookingService.createBooking(bookingData);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create booking',
    });
  }
});

/**
 * GET /api/v1/tickets/bookings/:bookingId
 * Get booking details by ID
 */
router.get('/bookings/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await BookingService.getBookingById(bookingId);

    // Verify user owns this booking (or is admin)
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error getting booking:', error);
    res.status(404).json({
      success: false,
      error: 'Booking not found',
    });
  }
});

/**
 * GET /api/v1/tickets/bookings/user/:userId
 * Get all bookings for a user
 */
router.get('/bookings/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user can access these bookings
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const filters = {
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      limit: parseInt(req.query.limit) || 50,
    };

    const bookings = await BookingService.getBookingsByUser(userId, filters);

    res.json({
      success: true,
      data: bookings,
      count: bookings.length,
    });
  } catch (error) {
    logger.error('Error getting user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookings',
    });
  }
});

/**
 * POST /api/v1/tickets/bookings/:bookingId/confirm
 * Confirm booking after successful payment
 */
router.post('/bookings/:bookingId/confirm', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentTransactionId } = req.body;

    if (!paymentTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'paymentTransactionId is required',
      });
    }

    const result = await BookingService.confirmBooking(bookingId, paymentTransactionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error confirming booking:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to confirm booking',
    });
  }
});

/**
 * PUT /api/v1/tickets/bookings/:bookingId/cancel
 * Cancel a booking
 */
router.put('/bookings/:bookingId/cancel', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const result = await BookingService.cancelBooking(bookingId, req.user.id, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel booking',
    });
  }
});

// ========== TICKET ENDPOINTS ==========

/**
 * GET /api/v1/tickets/:ticketId
 * Get ticket details
 */
router.get('/:ticketId', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Using Sequelize Ticket model from models/index.js
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Verify user owns this ticket
    if (ticket.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    logger.error('Error getting ticket:', error);
    res.status(404).json({
      success: false,
      error: 'Ticket not found',
    });
  }
});

/**
 * GET /api/v1/tickets/user/:userId
 * Get all tickets for a user
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user can access these tickets
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const status = req.query.status; // 'active', 'used', etc.
    const tickets = await TicketService.getTicketsByUser(userId, status);

    res.json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  } catch (error) {
    logger.error('Error getting user tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tickets',
    });
  }
});

/**
 * POST /api/v1/tickets/:ticketId/resend
 * Resend ticket to user
 */
router.post('/:ticketId/resend', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { deliveryMethod } = req.body;

    // Using Sequelize Ticket model from models/index.js
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Verify user owns this ticket
    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (deliveryMethod === 'email' || !deliveryMethod) {
      await TicketService.sendTicketsToUser([ticket], ticket.holderEmail);
    }

    res.json({
      success: true,
      message: 'Ticket resent successfully',
    });
  } catch (error) {
    logger.error('Error resending ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend ticket',
    });
  }
});

/**
 * POST /api/v1/tickets/:ticketId/wallet
 * Add ticket to mobile wallet (Apple Wallet / Google Pay)
 */
router.post('/:ticketId/wallet', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { walletType } = req.body; // 'apple' or 'google'

    if (!walletType || !['apple', 'google'].includes(walletType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid walletType. Must be "apple" or "google"',
      });
    }

    const result = await TicketService.addToWallet(ticketId, walletType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error adding ticket to wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add ticket to wallet',
    });
  }
});

/**
 * POST /api/v1/tickets/validate
 * Validate ticket with QR code (for POI/partner use)
 */
router.post('/validate', validate(validateTicketSchema), async (req, res) => {
  try {
    const { qrCode, poiId, validatorDeviceId } = req.body;

    const result = await TicketService.validateTicket(qrCode, poiId, validatorDeviceId);

    if (result.valid) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason,
      });
    }
  } catch (error) {
    logger.error('Error validating ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Ticket validation failed',
    });
  }
});

// ========== PARTNER ENDPOINTS (Protected) ==========

/**
 * POST /api/v1/tickets/partners/:partnerId/sync-inventory
 * Sync inventory from partner system
 */
router.post('/partners/:partnerId/sync-inventory', async (req, res) => {
  try {
    const { partnerId } = req.params;

    // TODO: Verify partner API key/authentication

    const result = await AvailabilityService.syncPartnerInventory(partnerId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error syncing partner inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync inventory',
    });
  }
});

/**
 * POST /api/v1/tickets/partners/:partnerId/webhook
 * Receive webhooks from partner systems
 */
router.post('/partners/:partnerId/webhook', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { event, data } = req.body;

    logger.info(`Received webhook from partner ${partnerId}: ${event}`);

    // TODO: Handle partner webhooks (booking confirmations, cancellations, etc.)

    res.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    logger.error('Error handling partner webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

// ========== WALLET PASS ENDPOINTS (PHASE 2: Week 11-12) ==========

/**
 * POST /api/v1/tickets/:ticketId/wallet
 * Generate wallet passes for a ticket
 * Supports both Apple Wallet and Google Pay
 */
router.post('/:ticketId/wallet', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { walletType } = req.body; // 'apple', 'google', or 'both'

    // Fetch ticket
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Verify ticket belongs to user
    if (ticket.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    let result = {};

    if (walletType === 'apple') {
      result.apple = await WalletService.generateApplePass(ticket);

      // Update ticket with wallet URL
      if (result.apple.success) {
        ticket.appleWalletUrl = result.apple.passUrl;
        await ticket.save();
      }
    } else if (walletType === 'google') {
      result.google = await WalletService.generateGooglePass(ticket);

      // Update ticket with wallet URL
      if (result.google.success) {
        ticket.googlePayUrl = result.google.passUrl;
        await ticket.save();
      }
    } else {
      // Generate both
      result = await WalletService.generateBothPasses(ticket);

      // Update ticket with wallet URLs
      if (result.apple?.success) {
        ticket.appleWalletUrl = result.apple.passUrl;
      }
      if (result.google?.success) {
        ticket.googlePayUrl = result.google.passUrl;
      }
      await ticket.save();
    }

    logger.info(`Wallet pass generated for ticket ${ticket.ticketNumber}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error generating wallet pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate wallet pass',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/:ticketId/wallet/apple/download
 * Download Apple Wallet PKPass file
 */
router.get('/:ticketId/wallet/apple/download', async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Fetch ticket
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Get pass file
    const passFilePath = await WalletService.getPassFile(ticket.ticketNumber, 'apple');

    // Send file
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketNumber}.pkpass"`);
    res.sendFile(passFilePath);

    logger.info(`Apple Wallet pass downloaded for ticket ${ticket.ticketNumber}`);
  } catch (error) {
    logger.error('Error downloading Apple Wallet pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download wallet pass',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/:ticketId/wallet/google
 * Get Google Pay URL
 */
router.get('/:ticketId/wallet/google', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Fetch ticket
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Verify ticket belongs to user
    if (ticket.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Generate or return existing Google Pay URL
    if (!ticket.googlePayUrl) {
      const result = await WalletService.generateGooglePass(ticket);

      if (result.success) {
        ticket.googlePayUrl = result.passUrl;
        await ticket.save();
      }

      return res.json({
        success: result.success,
        data: {
          googlePayUrl: result.passUrl,
          jwt: result.jwt,
        },
      });
    }

    res.json({
      success: true,
      data: {
        googlePayUrl: ticket.googlePayUrl,
      },
    });
  } catch (error) {
    logger.error('Error getting Google Pay URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Google Pay URL',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/tickets/:ticketId/wallet/update
 * Update wallet pass (triggers push notification to wallet apps)
 */
router.put('/:ticketId/wallet/update', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { updates } = req.body;

    // Verify admin access
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    await WalletService.updatePass(ticketId, updates);

    res.json({
      success: true,
      message: 'Wallet pass updated',
    });
  } catch (error) {
    logger.error('Error updating wallet pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet pass',
      message: error.message,
    });
  }
});

// ========== HEALTH CHECK ==========

/**
 * GET /api/v1/tickets/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ticketing-module',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
