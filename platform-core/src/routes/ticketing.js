/**
 * Ticketing Routes (Fase III — Blok B)
 *
 * Customer-facing ticketing endpoints:
 * - GET  /tickets/health                      → Health check
 * - POST /tickets/order                       → Create order + reserve inventory
 * - POST /tickets/order/:orderId/pay          → Create payment session
 * - GET  /tickets/order/:orderUuid            → Order details + QR code
 * - POST /tickets/voucher/validate            → Preview voucher discount
 * - GET  /tickets/:destinationId              → Browse available tickets
 * - GET  /tickets/:destinationId/:ticketId    → Ticket detail
 *
 * IMPORTANT: Specific routes (order, voucher, health) MUST come before
 * parameterized routes (/:destinationId) to avoid route capture.
 *
 * Multi-destination: X-Destination-ID header or URL param.
 */

import express from 'express';
import logger from '../utils/logger.js';
import {
  getAvailableTickets,
  getTicketDetail,
  createOrder,
  processPayment,
  confirmOrder,
  cancelOrder,
  validateQR,
  getOrderDetails,
  validateVoucher,
} from '../services/ticketing/ticketingService.js';

const router = express.Router();

// ============================================================================
// DESTINATION ROUTING (same pattern as payment.js)
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
// SPECIFIC ROUTES (must be before /:destinationId to avoid capture)
// ============================================================================

// --- Health check ---
router.get('/health', async (req, res) => {
  res.json({ success: true, service: 'ticketing', status: 'healthy' });
});

// --- POST /tickets/order — Create order + reserve inventory ---
router.post('/order', async (req, res) => {
  try {
    const { items, customer, voucherCode } = req.body;
    const destinationId = getDestinationId(req);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_ORDER', message: 'At least one item required' } });
    }
    if (!customer || (!customer.userId && !customer.guestEmail)) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_CUSTOMER', message: 'Customer info required (userId or guestEmail)' } });
    }

    const order = await createOrder(destinationId, items, customer, voucherCode);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err.message === 'INSUFFICIENT_INVENTORY') {
      return res.status(409).json({ success: false, error: { code: 'INSUFFICIENT_INVENTORY', message: 'Not enough tickets available' } });
    }
    if (err.message === 'INVALID_ITEM') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ITEM', message: 'Each item requires ticketId, inventoryId, quantity, unitPriceCents' } });
    }
    if (err.message === 'LOCK_TIMEOUT') {
      return res.status(503).json({ success: false, error: { code: 'LOCK_TIMEOUT', message: 'Inventory busy, please retry' } });
    }
    logger.error('[Ticketing Route] createOrder error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create order' } });
  }
});

// --- POST /tickets/order/:orderId/pay — Create payment session ---
router.post('/order/:orderId/pay', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { returnUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ORDER_ID', message: 'Valid orderId required' } });
    }
    if (!returnUrl) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_RETURN_URL', message: 'returnUrl is required' } });
    }

    const session = await processPayment(orderId, returnUrl);
    res.json({ success: true, data: session });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }
    if (err.message === 'ORDER_NOT_PENDING') {
      return res.status(409).json({ success: false, error: { code: 'ORDER_NOT_PENDING', message: 'Order is not in pending status' } });
    }
    logger.error('[Ticketing Route] processPayment error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment session' } });
  }
});

// --- GET /tickets/order/:orderUuid — Order details + QR code ---
router.get('/order/:orderUuid', async (req, res) => {
  try {
    const { orderUuid } = req.params;

    if (!orderUuid || orderUuid.length < 30) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_UUID', message: 'Valid order UUID required' } });
    }

    const order = await getOrderDetails(orderUuid);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }
    logger.error('[Ticketing Route] getOrderDetails error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch order' } });
  }
});

// --- POST /tickets/voucher/validate — Preview voucher discount ---
router.post('/voucher/validate', async (req, res) => {
  try {
    const { code, subtotalCents } = req.body;
    const destinationId = getDestinationId(req);

    if (!code) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_CODE', message: 'Voucher code required' } });
    }

    const result = await validateVoucher(code, destinationId, subtotalCents);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('[Ticketing Route] validateVoucher error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to validate voucher' } });
  }
});

// ============================================================================
// PARAMETERIZED ROUTES (must be AFTER specific routes)
// ============================================================================

// --- GET /tickets/:destinationId — Browse available tickets ---
router.get('/:destinationId', async (req, res) => {
  try {
    const destinationId = parseInt(req.params.destinationId) || getDestinationId(req);
    const { date, ticketType, poiId, eventId } = req.query;

    const tickets = await getAvailableTickets(destinationId, date, {
      ticketType,
      poiId,
      eventId,
    });

    res.json({ success: true, data: tickets, count: tickets.length });
  } catch (err) {
    logger.error('[Ticketing Route] getAvailableTickets error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tickets' } });
  }
});

// --- GET /tickets/:destinationId/:ticketId — Ticket detail ---
router.get('/:destinationId/:ticketId', async (req, res) => {
  try {
    const destinationId = parseInt(req.params.destinationId) || getDestinationId(req);
    const ticketId = parseInt(req.params.ticketId);

    if (!ticketId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TICKET_ID', message: 'Valid ticketId required' } });
    }

    const ticket = await getTicketDetail(ticketId, destinationId);
    res.json({ success: true, data: ticket });
  } catch (err) {
    if (err.message === 'TICKET_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
    }
    logger.error('[Ticketing Route] getTicketDetail error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ticket' } });
  }
});

export default router;
