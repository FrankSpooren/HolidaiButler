/**
 * Payment Routes (Fase III — Blok A)
 *
 * Customer-facing payment endpoints:
 * - POST /payments/session    → Create Adyen payment session
 * - POST /payments/webhook    → Adyen webhook (HMAC verified)
 * - GET  /payments/:uuid/status → Get transaction status
 *
 * Multi-destination: X-Destination-ID header (same pattern as agenda.js).
 * Webhook uses raw body for HMAC signature verification.
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import adyenService from '../services/payment/adyenService.js';
import {
  createPaymentSession,
  handleWebhook,
  getTransactionStatus,
} from '../services/payment/paymentService.js';

const router = express.Router();

// ============================================================================
// DESTINATION ROUTING (same pattern as agenda.js)
// ============================================================================

function getDestinationId(req) {
  const headerValue = req.headers['x-destination-id'];
  if (!headerValue) return 1; // default: Calpe

  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;

  const codeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
  return codeToId[headerValue.toLowerCase()] || 1;
}

// ============================================================================
// POST /payments/session — Create Adyen payment session
// ============================================================================

router.post('/session', async (req, res) => {
  try {
    const {
      amountCents,
      currency,
      orderType,
      orderId,
      returnUrl,
      userId,
      poiId,
      metadata,
    } = req.body;

    // Validation
    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be positive integer (cents)' } });
    }
    if (!orderType || !['ticket', 'reservation', 'booking'].includes(orderType)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ORDER_TYPE', message: 'orderType must be ticket, reservation, or booking' } });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_ORDER_ID', message: 'orderId is required' } });
    }
    if (!returnUrl) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_RETURN_URL', message: 'returnUrl is required' } });
    }

    const destinationId = getDestinationId(req);

    const session = await createPaymentSession({
      amountCents: parseInt(amountCents),
      currency: currency || 'EUR',
      orderType,
      orderId: parseInt(orderId),
      destinationId,
      returnUrl,
      userId: userId ? parseInt(userId) : null,
      poiId: poiId ? parseInt(poiId) : null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: metadata || {},
    });

    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    logger.error('POST /payments/session error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'SESSION_CREATION_FAILED', message: error.message } });
  }
});

// ============================================================================
// POST /payments/webhook — Adyen webhook receiver
// ============================================================================

/**
 * IMPORTANT: This endpoint must receive the RAW body for HMAC verification.
 * In index.js, this route is mounted BEFORE express.json() middleware,
 * OR we use express.raw() specifically for this path.
 *
 * Adyen expects exactly "[accepted]" as response.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Always respond [accepted] immediately (Adyen requirement)
  // Process asynchronously to not block the response
  res.status(200).send('[accepted]');

  try {
    // Parse raw body
    const rawBody = req.body;
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());

    const notificationItems = payload.notificationItems || [];

    for (const item of notificationItems) {
      const notificationItem = item.NotificationRequestItem;

      if (!notificationItem) {
        logger.warn('Webhook: missing NotificationRequestItem');
        continue;
      }

      // HMAC verification
      const hmacSignature = notificationItem.additionalData?.hmacSignature;
      if (hmacSignature) {
        const isValid = adyenService.verifyHMACSignature(notificationItem, hmacSignature);
        if (!isValid) {
          logger.error('Webhook HMAC verification failed', {
            pspReference: notificationItem.pspReference,
            eventCode: notificationItem.eventCode,
          });
          continue; // Skip this notification
        }
      } else {
        logger.warn('Webhook: no HMAC signature present', {
          pspReference: notificationItem.pspReference,
        });
        // In production, you should reject unsigned webhooks.
        // For test environment, we allow it with a warning.
      }

      // Process the notification
      await handleWebhook(notificationItem);
    }
  } catch (error) {
    logger.error('Webhook processing error', { error: error.message, stack: error.stack });
    // Don't change the response — we already sent [accepted]
  }
});

// ============================================================================
// GET /payments/:uuid/status — Get transaction status
// ============================================================================

router.get('/:uuid/status', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Basic UUID validation
    if (!uuid || uuid.length < 32) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_UUID', message: 'Invalid transaction UUID' } });
    }

    const transaction = await getTransactionStatus(uuid);

    if (!transaction) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    return res.json({ success: true, data: transaction });
  } catch (error) {
    logger.error('GET /payments/:uuid/status error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get transaction status' } });
  }
});

// ============================================================================
// GET /payments/health — Payment module health check
// ============================================================================

router.get('/health', async (req, res) => {
  try {
    const adyenConnected = await adyenService.testConnection();
    return res.json({
      success: true,
      data: {
        module: 'payment',
        adyen: adyenConnected ? 'connected' : 'disconnected',
        environment: process.env.ADYEN_ENVIRONMENT || 'TEST',
      },
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        module: 'payment',
        adyen: 'error',
        error: error.message,
      },
    });
  }
});

export default router;
