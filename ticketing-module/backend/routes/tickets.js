const express = require('express');
const router = express.Router();
const AvailabilityService = require('../services/AvailabilityService');
const BookingService = require('../services/BookingService');
const TicketService = require('../services/TicketService');
const WalletService = require('../services/WalletService');
const TransferService = require('../services/TransferService');
const ReminderService = require('../services/ReminderService');
const NotificationService = require('../services/NotificationService');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  validate,
  createBookingSchema,
  checkAvailabilitySchema,
  validateTicketSchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');
const { Ticket, Booking, TicketTransfer, DeviceToken } = require('../models');

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

// ========== TICKET TRANSFER ENDPOINTS ==========

/**
 * POST /api/v1/tickets/:ticketId/transfer
 * Transfer a ticket to a new holder
 */
router.post('/:ticketId/transfer', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { recipientFirstName, recipientLastName, recipientEmail } = req.body;

    // Validate required fields
    if (!recipientFirstName || !recipientLastName || !recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'recipientFirstName, recipientLastName, and recipientEmail are required',
      });
    }

    const result = await TransferService.transferTicket(ticketId, req.user.id, {
      recipientFirstName,
      recipientLastName,
      recipientEmail,
    });

    logger.info(`Ticket ${ticketId} transferred by user ${req.user.id}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error transferring ticket:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to transfer ticket',
    });
  }
});

/**
 * GET /api/v1/tickets/:ticketId/transfers
 * Get transfer history for a ticket
 */
router.get('/:ticketId/transfers', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Verify ticket ownership
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    if (ticket.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const transfers = await TransferService.getTransferHistory(ticketId);

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    logger.error('Error getting transfer history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transfer history',
    });
  }
});

/**
 * GET /api/v1/tickets/:ticketId/can-transfer
 * Check if a ticket can be transferred
 */
router.get('/:ticketId/can-transfer', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const result = await TransferService.canTransfer(ticketId, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking transfer eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transfer eligibility',
    });
  }
});

// ========== REFUND STATUS ENDPOINTS ==========

/**
 * GET /api/v1/tickets/bookings/:bookingId/refund
 * Get refund status for a cancelled booking
 */
router.get('/bookings/:bookingId/refund', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Verify access
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        refundStatus: booking.refundStatus || 'none',
        refundAmount: booking.refundAmount || 0,
        refundTransactionId: booking.refundTransactionId,
        cancelledAt: booking.cancelledAt,
        refundCompletedAt: booking.refundCompletedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting refund status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refund status',
    });
  }
});

// ========== NOTIFICATION ENDPOINTS (Firebase Push) ==========

/**
 * POST /api/v1/tickets/notifications/register
 * Register a device for push notifications
 */
router.post('/notifications/register', authenticate, async (req, res) => {
  try {
    const { token, platform, deviceId, appVersion } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Device token is required',
      });
    }

    const result = await NotificationService.registerDevice(req.user.id, token, {
      platform: platform || 'web',
      deviceId,
      appVersion,
    });

    logger.info(`Device registered for user ${req.user.id}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error registering device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device',
    });
  }
});

/**
 * DELETE /api/v1/tickets/notifications/unregister
 * Unregister a device from push notifications
 */
router.delete('/notifications/unregister', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Device token is required',
      });
    }

    const result = await NotificationService.unregisterDevice(req.user.id, token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error unregistering device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister device',
    });
  }
});

/**
 * POST /api/v1/tickets/notifications/subscribe/:topic
 * Subscribe to a notification topic
 */
router.post('/notifications/subscribe/:topic', authenticate, async (req, res) => {
  try {
    const { topic } = req.params;
    const result = await NotificationService.subscribeToTopic(req.user.id, topic);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error subscribing to topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to topic',
    });
  }
});

/**
 * DELETE /api/v1/tickets/notifications/unsubscribe/:topic
 * Unsubscribe from a notification topic
 */
router.delete('/notifications/unsubscribe/:topic', authenticate, async (req, res) => {
  try {
    const { topic } = req.params;
    const result = await NotificationService.unsubscribeFromTopic(req.user.id, topic);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error unsubscribing from topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from topic',
    });
  }
});

/**
 * POST /api/v1/tickets/notifications/test
 * Send a test notification (development only)
 */
router.post('/notifications/test', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test notifications are not available in production',
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Device token is required',
      });
    }

    const result = await NotificationService.sendTestNotification(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
    });
  }
});

// ========== OFFLINE SYNC ENDPOINTS ==========

/**
 * POST /api/v1/tickets/sync
 * Sync offline tickets data
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { tickets, lastSyncTimestamp } = req.body;
    const userId = req.user.id;

    // Get updated tickets since last sync
    const updatedTickets = await Ticket.findAll({
      where: {
        userId,
        ...(lastSyncTimestamp && {
          updatedAt: { [require('sequelize').Op.gt]: new Date(lastSyncTimestamp) },
        }),
      },
      include: [{ model: Booking, as: 'booking' }],
    });

    // Get updated bookings since last sync
    const updatedBookings = await Booking.findAll({
      where: {
        userId,
        ...(lastSyncTimestamp && {
          updatedAt: { [require('sequelize').Op.gt]: new Date(lastSyncTimestamp) },
        }),
      },
    });

    res.json({
      success: true,
      data: {
        tickets: updatedTickets,
        bookings: updatedBookings,
        syncTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error syncing offline data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync offline data',
    });
  }
});

/**
 * GET /api/v1/tickets/offline-bundle
 * Get all user's tickets in a bundle for offline access
 */
router.get('/offline-bundle', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all active tickets for offline use
    const tickets = await Ticket.findAll({
      where: {
        userId,
        status: ['active', 'valid'],
      },
      include: [{ model: Booking, as: 'booking' }],
    });

    // Get upcoming bookings
    const bookings = await Booking.findAll({
      where: {
        userId,
        status: ['confirmed', 'pending'],
      },
      include: [{ model: Ticket, as: 'tickets' }],
    });

    res.json({
      success: true,
      data: {
        tickets,
        bookings,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
    });
  } catch (error) {
    logger.error('Error generating offline bundle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate offline bundle',
    });
  }
});

// ========== REMINDER ENDPOINTS ==========

/**
 * GET /api/v1/tickets/reminders/stats
 * Get reminder queue statistics (admin only)
 */
router.get('/reminders/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const stats = await ReminderService.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting reminder stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminder stats',
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
    features: {
      transfer: true,
      reminders: true,
      pushNotifications: NotificationService.isInitialized(),
      offlineAccess: true,
    },
  });
});

module.exports = router;
