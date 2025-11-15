const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const AdyenService = require('../services/AdyenService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Payment Engine API Routes
 * Based on TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md
 */

// ========== PAYMENT CREATION & PROCESSING ==========

/**
 * POST /api/v1/payments
 * Create new payment session
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user.id,
      metadata: {
        ...req.body.metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    };

    const payment = await PaymentService.createPayment(paymentData);

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment',
    });
  }
});

/**
 * GET /api/v1/payments/:paymentId
 * Get payment status
 */
router.get('/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentService.getPaymentStatus(paymentId);

    // Verify user owns this payment
    if (payment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Error getting payment:', error);
    res.status(404).json({
      success: false,
      error: 'Payment not found',
    });
  }
});

/**
 * POST /api/v1/payments/:paymentId/capture
 * Capture authorized payment
 */
router.post('/:paymentId/capture', authenticate, requireAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount } = req.body;

    const result = await PaymentService.capturePayment(paymentId, amount);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error capturing payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to capture payment',
    });
  }
});

/**
 * POST /api/v1/payments/:paymentId/cancel
 * Cancel authorized payment
 */
router.post('/:paymentId/cancel', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await PaymentService.cancelPayment(paymentId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error cancelling payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel payment',
    });
  }
});

// ========== REFUNDS ==========

/**
 * POST /api/v1/payments/:paymentId/refunds
 * Initiate refund
 */
router.post('/:paymentId/refunds', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const refund = await PaymentService.refundPayment(
      paymentId,
      amount,
      reason,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    logger.error('Error creating refund:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create refund',
    });
  }
});

/**
 * GET /api/v1/payments/:paymentId/refunds
 * Get refunds for a payment
 */
router.get('/:paymentId/refunds', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentService.getPaymentStatus(paymentId);

    res.json({
      success: true,
      data: payment.refunds || [],
    });
  } catch (error) {
    logger.error('Error getting refunds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refunds',
    });
  }
});

// ========== PAYMENT METHODS ==========

/**
 * GET /api/v1/payment-methods/available
 * Get available payment methods for country/currency
 */
router.get('/payment-methods/available', async (req, res) => {
  try {
    const { country, currency } = req.query;

    if (!country || !currency) {
      return res.status(400).json({
        success: false,
        error: 'country and currency parameters are required',
      });
    }

    const methods = await AdyenService.getPaymentMethods(country, currency);

    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    logger.error('Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods',
    });
  }
});

// ========== WEBHOOKS ==========

/**
 * POST /api/v1/webhooks/adyen
 * Receive Adyen webhook notifications
 */
router.post('/webhooks/adyen', async (req, res) => {
  try {
    const notificationItems = req.body.notificationItems;

    if (!notificationItems || notificationItems.length === 0) {
      return res.status(400).send('[invalid]');
    }

    // Process each notification
    for (const item of notificationItems) {
      const notification = item.NotificationRequestItem;

      // Verify HMAC signature
      const hmacSignature = notification.additionalData?.hmacSignature;

      if (hmacSignature) {
        const isValid = AdyenService.verifyHMACSignature(notification, hmacSignature);

        if (!isValid) {
          logger.error('Invalid HMAC signature from Adyen');
          return res.status(401).send('[invalid]');
        }
      }

      // Process webhook
      await PaymentService.processWebhook(notification);
    }

    // Acknowledge receipt
    res.send('[accepted]');
  } catch (error) {
    logger.error('Error processing Adyen webhook:', error);
    res.status(500).send('[failed]');
  }
});

// ========== ADMIN ENDPOINTS ==========

/**
 * GET /api/v1/admin/transactions
 * Get transactions (admin only)
 */
router.get('/admin/transactions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { from, to, status, limit } = req.query;

    const { Transaction } = require('../models');

    const where = {};

    if (status) {
      where.status = status;
    }

    if (from && to) {
      where.createdAt = {
        [require('sequelize').Op.between]: [new Date(from), new Date(to)],
      };
    }

    const transactions = await Transaction.findAll({
      where,
      limit: parseInt(limit) || 100,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    });
  }
});

// ========== HEALTH CHECK ==========

/**
 * GET /api/v1/payments/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const adyenStatus = await AdyenService.testConnection();

    res.json({
      success: true,
      service: 'payment-engine',
      status: 'healthy',
      adyen: adyenStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'payment-engine',
      status: 'unhealthy',
      error: error.message,
    });
  }
});

module.exports = router;
