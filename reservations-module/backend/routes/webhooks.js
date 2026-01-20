/**
 * Webhook Routes
 * External integration webhooks (TheFork, Google, Payment)
 */

const express = require('express');
const router = express.Router();
const IntegrationService = require('../services/IntegrationService');
const PaymentService = require('../services/PaymentService');
const ReservationService = require('../services/ReservationService');
const AvailabilityService = require('../services/AvailabilityService');
const { verifyWebhookSignature } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/v1/webhooks/thefork
 * TheFork reservation webhooks
 */
router.post(
  '/thefork',
  verifyWebhookSignature('thefork'),
  async (req, res, next) => {
    try {
      const event = req.headers['x-thefork-event'];
      const payload = req.body;
      const signature = req.headers['x-webhook-signature'];

      logger.info(`TheFork webhook received: ${event}`);

      const result = await IntegrationService.processTheForkWebhook(event, payload, signature);

      res.json({
        success: true,
        processed: result.processed,
        data: result,
      });
    } catch (error) {
      logger.error('TheFork webhook error:', error);

      // Return 200 to prevent retries for invalid requests
      if (error.message.includes('Invalid')) {
        return res.status(200).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }
);

/**
 * POST /api/v1/webhooks/google
 * Google Reservations webhooks
 */
router.post(
  '/google',
  verifyWebhookSignature('google'),
  async (req, res, next) => {
    try {
      const event = req.body.event_type;
      const payload = req.body;

      logger.info(`Google webhook received: ${event}`);

      const result = await IntegrationService.processGoogleWebhook(event, payload);

      res.json({
        success: true,
        processed: result.processed,
        data: result,
      });
    } catch (error) {
      logger.error('Google webhook error:', error);

      res.status(200).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/webhooks/payment
 * Payment engine webhooks (Adyen)
 */
router.post(
  '/payment',
  verifyWebhookSignature('adyen'),
  async (req, res, next) => {
    try {
      const eventType = req.body.eventType || req.body.notificationItems?.[0]?.NotificationRequestItem?.eventCode;
      const payload = req.body.notificationItems?.[0]?.NotificationRequestItem || req.body;

      logger.info(`Payment webhook received: ${eventType}`);

      const action = await PaymentService.processWebhook(eventType, payload);

      // Process the action
      switch (action.action) {
        case 'confirm_reservation':
          if (action.reservationId) {
            await ReservationService.confirmReservation(action.reservationId, action.transactionId);
          }
          break;

        case 'release_reservation':
          if (action.reservationId) {
            await AvailabilityService.releaseReservation(action.reservationId, false);
            const { Reservation } = require('../models');
            await Reservation.update(
              { status: 'cancelled', cancellation_reason: action.reason },
              { where: { id: action.reservationId } }
            );
          }
          break;

        case 'expire_reservation':
          if (action.reservationId) {
            await AvailabilityService.releaseReservation(action.reservationId, false);
            const { Reservation } = require('../models');
            await Reservation.update(
              { status: 'cancelled', cancellation_reason: 'Payment expired' },
              { where: { id: action.reservationId } }
            );
          }
          break;

        case 'refund_completed':
          logger.info(`Refund completed: ${action.refundId}`);
          break;

        default:
          logger.warn(`Unhandled payment action: ${action.action}`);
      }

      // Adyen expects [accepted] response
      res.send('[accepted]');
    } catch (error) {
      logger.error('Payment webhook error:', error);

      // Still return accepted to prevent retries
      res.send('[accepted]');
    }
  }
);

/**
 * POST /api/v1/webhooks/pos/:provider
 * POS system webhooks
 */
router.post('/pos/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const payload = req.body;

    logger.info(`POS webhook received from ${provider}`);

    // Handle based on provider
    switch (provider) {
      case 'toast':
        // Handle Toast webhook
        break;

      case 'square':
        // Handle Square webhook
        break;

      case 'lightspeed':
        // Handle Lightspeed webhook
        break;

      default:
        logger.warn(`Unknown POS provider: ${provider}`);
    }

    res.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    logger.error(`POS webhook error (${req.params.provider}):`, error);
    next(error);
  }
});

/**
 * GET /api/v1/webhooks/test
 * Test webhook endpoint (development only)
 */
router.get('/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/webhooks/test/thefork
 * Test TheFork webhook (development only)
 */
router.post('/test/thefork', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  logger.info('Test TheFork webhook received:', req.body);

  res.json({
    success: true,
    received: req.body,
  });
});

module.exports = router;
