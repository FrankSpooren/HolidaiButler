const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const AdyenService = require('../services/AdyenService');
const HealthService = require('../services/HealthService');
const CacheService = require('../services/CacheService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { idempotencyCheck } = require('../middleware/idempotency');
const { auditLogMiddleware, AuditActions } = require('../middleware/auditLog');
const {
  validate,
  createPaymentSchema,
  capturePaymentSchema,
  refundPaymentSchema,
  paymentMethodsQuerySchema,
  adminTransactionsQuerySchema,
} = require('../validators/paymentValidators');
const logger = require('../utils/logger');

/**
 * Payment Engine API Routes
 * Enterprise-grade payment processing with validation, idempotency, and audit logging
 */

// ========== PAYMENT CREATION & PROCESSING ==========

/**
 * POST /api/v1/payments
 * Create new payment session
 */
router.post('/',
  authenticate,
  validate(createPaymentSchema, 'body'),
  idempotencyCheck({ ttl: 86400 }),
  auditLogMiddleware({ action: AuditActions.PAYMENT_CREATE, resource: 'transaction' }),
  async (req, res) => {
    try {
      const paymentData = {
        ...req.body,
        userId: req.user.id,
        metadata: {
          ...req.body.metadata,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId: req.correlationId,
        },
      };

      const payment = await PaymentService.createPayment(paymentData);

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error creating payment:', { error: error.message, correlationId: req.correlationId });
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create payment',
      });
    }
  }
);

/**
 * GET /api/v1/payments/:paymentId
 * Get payment status
 */
router.get('/:paymentId',
  authenticate,
  auditLogMiddleware({ action: 'payment.view', resource: 'transaction' }),
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      // Try cache first
      const cached = await CacheService.getTransaction(paymentId);
      if (cached && cached.userId === req.user.id) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      const payment = await PaymentService.getPaymentStatus(paymentId);

      // Verify user owns this payment
      if (payment.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Cache for future requests
      await CacheService.cacheTransaction(paymentId, payment);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error getting payment:', { error: error.message, correlationId: req.correlationId });
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
  }
);

/**
 * POST /api/v1/payments/:paymentId/capture
 * Capture authorized payment
 */
router.post('/:paymentId/capture',
  authenticate,
  requireAdmin,
  validate(capturePaymentSchema, 'body'),
  auditLogMiddleware({ action: AuditActions.PAYMENT_CAPTURE, resource: 'transaction' }),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount } = req.body;

      const result = await PaymentService.capturePayment(paymentId, amount);

      // Invalidate cache
      await CacheService.invalidateTransaction(paymentId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error capturing payment:', { error: error.message, correlationId: req.correlationId });
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to capture payment',
      });
    }
  }
);

/**
 * POST /api/v1/payments/:paymentId/cancel
 * Cancel authorized payment
 */
router.post('/:paymentId/cancel',
  authenticate,
  auditLogMiddleware({ action: AuditActions.PAYMENT_CANCEL, resource: 'transaction' }),
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const result = await PaymentService.cancelPayment(paymentId);

      // Invalidate cache
      await CacheService.invalidateTransaction(paymentId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error cancelling payment:', { error: error.message, correlationId: req.correlationId });
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to cancel payment',
      });
    }
  }
);

// ========== REFUNDS ==========

/**
 * POST /api/v1/payments/:paymentId/refunds
 * Initiate refund
 */
router.post('/:paymentId/refunds',
  authenticate,
  validate(refundPaymentSchema, 'body'),
  idempotencyCheck({ ttl: 86400 }),
  auditLogMiddleware({ action: AuditActions.REFUND_INITIATE, resource: 'refund' }),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason, reasonDetails } = req.body;

      const refund = await PaymentService.refundPayment(
        paymentId,
        amount,
        reason === 'other' ? reasonDetails : reason,
        req.user.id
      );

      // Invalidate transaction cache
      await CacheService.invalidateTransaction(paymentId);

      res.status(201).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      logger.error('Error creating refund:', { error: error.message, correlationId: req.correlationId });
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create refund',
      });
    }
  }
);

/**
 * GET /api/v1/payments/:paymentId/refunds
 * Get refunds for a payment
 */
router.get('/:paymentId/refunds',
  authenticate,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const payment = await PaymentService.getPaymentStatus(paymentId);

      res.json({
        success: true,
        data: payment.refunds || [],
      });
    } catch (error) {
      logger.error('Error getting refunds:', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get refunds',
      });
    }
  }
);

// ========== PAYMENT METHODS ==========

/**
 * GET /api/v1/payment-methods/available
 * Get available payment methods for country/currency
 */
router.get('/payment-methods/available',
  validate(paymentMethodsQuerySchema, 'query'),
  async (req, res) => {
    try {
      const { country, currency } = req.query;

      // Try cache first
      const cached = await CacheService.getPaymentMethods(country, currency);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      const methods = await AdyenService.getPaymentMethods(country, currency);

      // Cache for future requests
      await CacheService.setPaymentMethods(country, currency, methods);

      res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Error getting payment methods:', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get payment methods',
      });
    }
  }
);

// ========== WEBHOOKS ==========

/**
 * POST /api/v1/webhooks/adyen
 * Receive Adyen webhook notifications
 */
router.post('/webhooks/adyen',
  auditLogMiddleware({ action: AuditActions.WEBHOOK_RECEIVE, resource: 'webhook' }),
  async (req, res) => {
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
            logger.error('Invalid HMAC signature from Adyen', {
              correlationId: req.correlationId,
              pspReference: notification.pspReference,
            });
            return res.status(401).send('[invalid]');
          }
        }

        // Process webhook
        await PaymentService.processWebhook(notification);

        // Invalidate any cached transaction
        if (notification.merchantReference) {
          await CacheService.delByPattern(`transaction:*${notification.merchantReference}*`);
        }
      }

      // Acknowledge receipt
      res.send('[accepted]');
    } catch (error) {
      logger.error('Error processing Adyen webhook:', { error: error.message, correlationId: req.correlationId });
      res.status(500).send('[failed]');
    }
  }
);

// ========== ADMIN ENDPOINTS ==========

/**
 * GET /api/v1/admin/transactions
 * Get transactions (admin only)
 */
router.get('/admin/transactions',
  authenticate,
  requireAdmin,
  validate(adminTransactionsQuerySchema, 'query'),
  auditLogMiddleware({ action: AuditActions.ADMIN_VIEW, resource: 'admin' }),
  async (req, res) => {
    try {
      const { from, to, status, limit, offset, sortBy, sortOrder } = req.query;

      const { Transaction } = require('../models');
      const { Op } = require('sequelize');

      const where = {};

      if (status) {
        where.status = status;
      }

      if (from && to) {
        where.createdAt = {
          [Op.between]: [new Date(from), new Date(to)],
        };
      }

      const transactions = await Transaction.findAndCountAll({
        where,
        limit: limit || 100,
        offset: offset || 0,
        order: [[sortBy || 'createdAt', sortOrder || 'DESC']],
      });

      res.json({
        success: true,
        data: transactions.rows,
        pagination: {
          total: transactions.count,
          limit: limit || 100,
          offset: offset || 0,
          hasMore: (offset || 0) + transactions.rows.length < transactions.count,
        },
      });
    } catch (error) {
      logger.error('Error getting transactions:', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get transactions',
      });
    }
  }
);

// ========== HEALTH CHECK ENDPOINTS ==========

/**
 * GET /api/v1/payments/health
 * Basic health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await HealthService.checkAll();

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'payment-engine',
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/payments/health/detailed
 * Detailed health check (admin only)
 */
router.get('/health/detailed',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const health = await HealthService.getDetailedReport();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/payments/health/live
 * Kubernetes liveness probe
 */
router.get('/health/live', async (req, res) => {
  const result = await HealthService.livenessProbe();
  res.json(result);
});

/**
 * GET /api/v1/payments/health/ready
 * Kubernetes readiness probe
 */
router.get('/health/ready', async (req, res) => {
  const result = await HealthService.readinessProbe();
  const statusCode = result.ready ? 200 : 503;
  res.status(statusCode).json(result);
});

module.exports = router;
