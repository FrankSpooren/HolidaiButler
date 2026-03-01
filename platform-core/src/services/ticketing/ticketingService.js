/**
 * Ticketing Service (Fase III — Blok B)
 *
 * Business logic for ticket ordering, QR codes, and vouchers.
 * Delegates inventory locking to inventoryService.js.
 * Delegates payment to paymentService.js (Blok A).
 *
 * Core functions:
 * 1. getAvailableTickets — Browse tickets with availability
 * 2. createOrder — Create order + reserve inventory
 * 3. processPayment — Create Adyen payment session for order
 * 4. confirmOrder — After payment: confirm + generate QR
 * 5. cancelOrder — Cancel + release inventory + refund
 * 6. validateQR — Scan and validate QR code
 * 7. applyVoucher — Apply discount code to order
 * 8. getOrderDetails — Full order info with QR image
 *
 * All amounts in CENTS (integers, never floats).
 * Multi-destination: destination_id on every query.
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import {
  reserveInventory,
  confirmInventory,
  releaseInventory,
} from './inventoryService.js';
import { createPaymentSession } from '../payment/paymentService.js';

const { QueryTypes } = (await import('sequelize')).default;

// QR secret for HMAC signing
const QR_SECRET = process.env.QR_SECRET_KEY || process.env.ADYEN_HMAC_KEY || 'default-dev-secret';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate order number: HB-T-YYMMDD-XXXX
 */
async function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');

  // Get next sequence number for today
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM ticket_orders WHERE order_number LIKE :prefix`,
    { replacements: { prefix: `HB-T-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-T-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

/**
 * Generate QR code data with HMAC signature.
 * Format: HB:{order_uuid}:{hmac_8chars}
 */
function generateQRData(orderUuid) {
  const hmac = crypto.createHmac('sha256', QR_SECRET)
    .update(orderUuid)
    .digest('hex')
    .substring(0, 8);
  return `HB:${orderUuid}:${hmac}`;
}

/**
 * Generate QR code image as data URL.
 */
async function generateQRImage(qrData) {
  return QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
  });
}

/**
 * Verify QR code HMAC signature.
 */
function verifyQRSignature(orderUuid, signature) {
  const expected = crypto.createHmac('sha256', QR_SECRET)
    .update(orderUuid)
    .digest('hex')
    .substring(0, 8);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

// ============================================================================
// 1. GET AVAILABLE TICKETS
// ============================================================================

/**
 * Get available tickets for a destination, optionally filtered by date.
 *
 * @param {number} destinationId
 * @param {string} [date] - ISO date (YYYY-MM-DD) to check availability
 * @param {Object} [filters] - { ticketType, poiId, eventId }
 * @returns {Promise<Array>} Tickets with availability info
 */
export async function getAvailableTickets(destinationId, date, filters = {}) {
  let sql = `
    SELECT t.id, t.destination_id, t.poi_id, t.event_id,
           t.name, t.name_en, t.name_de, t.name_es,
           t.description, t.description_en, t.description_de, t.description_es,
           t.ticket_type, t.base_price_cents, t.currency,
           t.pricing_tiers, t.dynamic_pricing_enabled, t.dynamic_pricing_config,
           t.max_per_order, t.validity_type, t.validity_days,
           t.available_from, t.available_until,
           t.terms_conditions, t.cancellation_policy
    FROM tickets t
    WHERE t.destination_id = :destinationId
      AND t.is_active = TRUE
  `;
  const replacements = { destinationId };

  // Date range filter
  if (date) {
    sql += ` AND (t.available_from IS NULL OR t.available_from <= :date)`;
    sql += ` AND (t.available_until IS NULL OR t.available_until >= :date)`;
    replacements.date = date;
  }

  // Optional filters
  if (filters.ticketType) {
    sql += ` AND t.ticket_type = :ticketType`;
    replacements.ticketType = filters.ticketType;
  }
  if (filters.poiId) {
    sql += ` AND t.poi_id = :poiId`;
    replacements.poiId = parseInt(filters.poiId);
  }
  if (filters.eventId) {
    sql += ` AND t.event_id = :eventId`;
    replacements.eventId = parseInt(filters.eventId);
  }

  sql += ` ORDER BY t.base_price_cents ASC`;

  const tickets = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  // If date provided, join inventory data
  if (date && tickets.length > 0) {
    const ticketIds = tickets.map(t => t.id);
    const inventory = await mysqlSequelize.query(
      `SELECT id, ticket_id, slot_date, slot_time_start, slot_time_end,
              total_capacity, reserved_count, sold_count, is_available
       FROM ticket_inventory
       WHERE ticket_id IN (:ticketIds)
         AND slot_date = :date
         AND is_available = TRUE`,
      { replacements: { ticketIds, date }, type: QueryTypes.SELECT }
    );

    // Map inventory to tickets
    const inventoryMap = {};
    for (const inv of inventory) {
      if (!inventoryMap[inv.ticket_id]) inventoryMap[inv.ticket_id] = [];
      inventoryMap[inv.ticket_id].push({
        inventoryId: inv.id,
        slotDate: inv.slot_date,
        slotTimeStart: inv.slot_time_start,
        slotTimeEnd: inv.slot_time_end,
        totalCapacity: inv.total_capacity,
        available: inv.total_capacity - inv.reserved_count - inv.sold_count,
      });
    }

    for (const ticket of tickets) {
      ticket.slots = inventoryMap[ticket.id] || [];
      ticket.hasAvailability = ticket.slots.some(s => s.available > 0);
    }
  }

  // Parse JSON fields
  for (const ticket of tickets) {
    if (typeof ticket.pricing_tiers === 'string') {
      try { ticket.pricing_tiers = JSON.parse(ticket.pricing_tiers); } catch { /* keep string */ }
    }
    if (typeof ticket.dynamic_pricing_config === 'string') {
      try { ticket.dynamic_pricing_config = JSON.parse(ticket.dynamic_pricing_config); } catch { /* keep string */ }
    }
  }

  return tickets;
}

// ============================================================================
// 2. CREATE ORDER
// ============================================================================

/**
 * Create a ticket order and reserve inventory.
 *
 * @param {number} destinationId
 * @param {Array} items - [{ ticketId, inventoryId, tierName, quantity, unitPriceCents }]
 * @param {Object} customer - { userId, guestEmail, guestName, guestPhone }
 * @param {string} [voucherCode] - Optional voucher code
 * @returns {Promise<Object>} { orderId, orderUuid, orderNumber, totalCents, expiresAt }
 */
export async function createOrder(destinationId, items, customer, voucherCode) {
  // Validate items exist
  if (!items || items.length === 0) {
    throw new Error('EMPTY_ORDER');
  }

  // Calculate totals
  let subtotalCents = 0;
  for (const item of items) {
    if (!item.ticketId || !item.inventoryId || !item.quantity || item.quantity < 1) {
      throw new Error('INVALID_ITEM');
    }
    item.totalPriceCents = item.unitPriceCents * item.quantity;
    subtotalCents += item.totalPriceCents;
  }

  // Generate identifiers
  const orderUuid = crypto.randomUUID();
  const orderNumber = await generateOrderNumber();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  // Insert order
  await mysqlSequelize.query(
    `INSERT INTO ticket_orders
     (destination_id, order_uuid, order_number, user_id, guest_email, guest_name, guest_phone,
      subtotal_cents, discount_cents, total_cents, currency, status, expires_at, created_at)
     VALUES
     (:destinationId, :orderUuid, :orderNumber, :userId, :guestEmail, :guestName, :guestPhone,
      :subtotalCents, 0, :subtotalCents, 'EUR', 'pending', :expiresAt, NOW())`,
    {
      replacements: {
        destinationId,
        orderUuid,
        orderNumber,
        userId: customer.userId || null,
        guestEmail: customer.guestEmail || null,
        guestName: customer.guestName || null,
        guestPhone: customer.guestPhone || null,
        subtotalCents,
        expiresAt,
      },
      type: QueryTypes.INSERT,
    }
  );

  // Get the inserted order ID
  const [orderRow] = await mysqlSequelize.query(
    `SELECT id FROM ticket_orders WHERE order_uuid = :orderUuid`,
    { replacements: { orderUuid }, type: QueryTypes.SELECT }
  );
  const orderId = orderRow.id;

  // Insert order items and reserve inventory
  for (const item of items) {
    await mysqlSequelize.query(
      `INSERT INTO ticket_order_items
       (order_id, ticket_id, inventory_id, tier_name, quantity, unit_price_cents, total_price_cents, created_at)
       VALUES
       (:orderId, :ticketId, :inventoryId, :tierName, :quantity, :unitPriceCents, :totalPriceCents, NOW())`,
      {
        replacements: {
          orderId,
          ticketId: item.ticketId,
          inventoryId: item.inventoryId,
          tierName: item.tierName || null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents,
        },
        type: QueryTypes.INSERT,
      }
    );

    // Reserve inventory
    await reserveInventory(item.inventoryId, item.quantity, orderId);
  }

  // Apply voucher if provided
  let discountCents = 0;
  if (voucherCode) {
    try {
      const voucherResult = await applyVoucher(orderId, voucherCode, destinationId);
      discountCents = voucherResult.discountCents;
    } catch (err) {
      logger.warn(`[Ticketing] Voucher ${voucherCode} failed: ${err.message}`);
      // Order continues without discount
    }
  }

  const totalCents = subtotalCents - discountCents;

  logger.info(`[Ticketing] Order ${orderNumber} created: ${items.length} items, ${totalCents} cents, expires ${expiresAt.toISOString()}`);

  return {
    orderId,
    orderUuid,
    orderNumber,
    subtotalCents,
    discountCents,
    totalCents,
    expiresAt,
  };
}

// ============================================================================
// 3. PROCESS PAYMENT
// ============================================================================

/**
 * Create an Adyen payment session for a ticket order.
 *
 * @param {number} orderId - ticket_orders.id
 * @param {string} returnUrl - Redirect after payment
 * @returns {Promise<Object>} Adyen session data for frontend
 */
export async function processPayment(orderId, returnUrl) {
  const [order] = await mysqlSequelize.query(
    `SELECT id, destination_id, order_uuid, total_cents, currency, user_id, status
     FROM ticket_orders WHERE id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ORDER_NOT_PENDING');

  const session = await createPaymentSession({
    amountCents: order.total_cents,
    currency: order.currency,
    orderType: 'ticket',
    orderId: order.id,
    destinationId: order.destination_id,
    returnUrl,
    userId: order.user_id,
  });

  return session;
}

// ============================================================================
// 4. CONFIRM ORDER
// ============================================================================

/**
 * Confirm order after successful payment. Generates QR code.
 *
 * @param {number} orderId - ticket_orders.id
 * @returns {Promise<Object>} Confirmed order with QR code data
 */
export async function confirmOrder(orderId) {
  const [order] = await mysqlSequelize.query(
    `SELECT id, order_uuid, status FROM ticket_orders WHERE id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending' && order.status !== 'paid') {
    throw new Error('ORDER_CANNOT_CONFIRM');
  }

  // Get order items for inventory confirmation
  const items = await mysqlSequelize.query(
    `SELECT inventory_id, quantity FROM ticket_order_items WHERE order_id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  // Confirm inventory (reserved → sold)
  for (const item of items) {
    await confirmInventory(orderId, item.inventory_id, item.quantity);
  }

  // Generate QR code
  const qrData = generateQRData(order.order_uuid);

  // Update order
  await mysqlSequelize.query(
    `UPDATE ticket_orders
     SET status = 'confirmed',
         qr_code_data = :qrData,
         updated_at = NOW()
     WHERE id = :orderId`,
    { replacements: { qrData, orderId }, type: QueryTypes.UPDATE }
  );

  // Generate QR image
  const qrImage = await generateQRImage(qrData);

  logger.info(`[Ticketing] Order ${orderId} confirmed, QR generated`);

  return {
    orderId,
    orderUuid: order.order_uuid,
    status: 'confirmed',
    qrCodeData: qrData,
    qrCodeImage: qrImage,
  };
}

// ============================================================================
// 5. CANCEL ORDER
// ============================================================================

/**
 * Cancel a ticket order, release inventory, trigger refund if paid.
 *
 * @param {number} orderId - ticket_orders.id
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} { success, refundInitiated }
 */
export async function cancelOrder(orderId, reason) {
  const [order] = await mysqlSequelize.query(
    `SELECT id, status, total_cents FROM ticket_orders WHERE id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (['cancelled', 'refunded', 'expired'].includes(order.status)) {
    throw new Error('ORDER_ALREADY_FINAL');
  }

  // Get order items for inventory release
  const items = await mysqlSequelize.query(
    `SELECT inventory_id, quantity FROM ticket_order_items WHERE order_id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  // Release inventory
  for (const item of items) {
    await releaseInventory(orderId, item.inventory_id, item.quantity);
  }

  // Update order status
  await mysqlSequelize.query(
    `UPDATE ticket_orders SET status = 'cancelled', updated_at = NOW() WHERE id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.UPDATE }
  );

  // If order was paid/confirmed, initiate refund via payment service
  let refundInitiated = false;
  if (['paid', 'confirmed'].includes(order.status)) {
    try {
      const { initiateRefund, getTransactionsByOrder } = await import('../payment/paymentService.js');
      const transactions = await getTransactionsByOrder('ticket', orderId);
      const captured = transactions.find(t => t.status === 'captured');
      if (captured) {
        await initiateRefund(captured.id, order.total_cents, reason || 'customer_request', 'system');
        refundInitiated = true;
      }
    } catch (err) {
      logger.error(`[Ticketing] Refund for order ${orderId} failed:`, err.message);
    }
  }

  logger.info(`[Ticketing] Order ${orderId} cancelled, refund: ${refundInitiated}`);

  return { success: true, refundInitiated };
}

// ============================================================================
// 6. VALIDATE QR
// ============================================================================

/**
 * Validate a scanned QR code.
 *
 * @param {string} qrData - Raw QR data (format: HB:{uuid}:{hmac})
 * @param {string} [validatedBy] - Scanner/staff ID
 * @returns {Promise<Object>} { valid, orderNumber, message, order }
 */
export async function validateQR(qrData, validatedBy) {
  // Parse QR data
  const parts = qrData.split(':');
  if (parts.length !== 3 || parts[0] !== 'HB') {
    return { valid: false, message: 'Invalid QR format' };
  }

  const [, orderUuid, signature] = parts;

  // Verify HMAC signature
  try {
    if (!verifyQRSignature(orderUuid, signature)) {
      return { valid: false, message: 'Invalid QR signature' };
    }
  } catch {
    return { valid: false, message: 'QR verification error' };
  }

  // Load order
  const [order] = await mysqlSequelize.query(
    `SELECT o.id, o.order_uuid, o.order_number, o.status, o.guest_name,
            o.qr_code_validated, o.qr_validated_at
     FROM ticket_orders o
     WHERE o.order_uuid = :orderUuid`,
    { replacements: { orderUuid }, type: QueryTypes.SELECT }
  );

  if (!order) {
    return { valid: false, message: 'Order not found' };
  }

  if (order.status !== 'confirmed') {
    return { valid: false, message: `Order status: ${order.status}`, orderNumber: order.order_number };
  }

  if (order.qr_code_validated) {
    return {
      valid: false,
      message: `Already validated at ${order.qr_validated_at}`,
      orderNumber: order.order_number,
    };
  }

  // Mark as validated
  await mysqlSequelize.query(
    `UPDATE ticket_orders
     SET qr_code_validated = TRUE,
         qr_validated_at = NOW(),
         qr_validated_by = :validatedBy,
         updated_at = NOW()
     WHERE id = :orderId`,
    { replacements: { validatedBy: validatedBy || 'unknown', orderId: order.id }, type: QueryTypes.UPDATE }
  );

  // Get order items for display
  const items = await mysqlSequelize.query(
    `SELECT oi.quantity, oi.tier_name, t.name as ticket_name
     FROM ticket_order_items oi
     JOIN tickets t ON t.id = oi.ticket_id
     WHERE oi.order_id = :orderId`,
    { replacements: { orderId: order.id }, type: QueryTypes.SELECT }
  );

  logger.info(`[Ticketing] QR validated: order ${order.order_number} by ${validatedBy}`);

  return {
    valid: true,
    orderNumber: order.order_number,
    guestName: order.guest_name,
    items,
    message: 'Ticket validated successfully',
  };
}

// ============================================================================
// 7. APPLY VOUCHER
// ============================================================================

/**
 * Validate and apply a voucher code to an order.
 *
 * @param {number} orderId - ticket_orders.id
 * @param {string} voucherCode - Voucher code string
 * @param {number} [destinationId] - For validation scope
 * @returns {Promise<Object>} { discountCents, newTotalCents }
 */
export async function applyVoucher(orderId, voucherCode, destinationId) {
  // Load order
  const [order] = await mysqlSequelize.query(
    `SELECT id, destination_id, subtotal_cents, total_cents, voucher_code_id
     FROM ticket_orders WHERE id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.voucher_code_id) throw new Error('VOUCHER_ALREADY_APPLIED');

  const destId = destinationId || order.destination_id;

  // Load and validate voucher
  const [voucher] = await mysqlSequelize.query(
    `SELECT id, code, discount_type, discount_value, min_order_cents,
            max_discount_cents, max_uses, used_count, is_active,
            valid_from, valid_until, applicable_ticket_ids, applicable_ticket_types
     FROM voucher_codes
     WHERE code = :code AND destination_id = :destId`,
    { replacements: { code: voucherCode.toUpperCase(), destId }, type: QueryTypes.SELECT }
  );

  if (!voucher) throw new Error('VOUCHER_NOT_FOUND');
  if (!voucher.is_active) throw new Error('VOUCHER_INACTIVE');

  const now = new Date();
  if (voucher.valid_from && new Date(voucher.valid_from) > now) throw new Error('VOUCHER_NOT_YET_VALID');
  if (voucher.valid_until && new Date(voucher.valid_until) < now) throw new Error('VOUCHER_EXPIRED');
  if (voucher.max_uses && voucher.used_count >= voucher.max_uses) throw new Error('VOUCHER_MAX_USES_REACHED');
  if (order.subtotal_cents < (voucher.min_order_cents || 0)) throw new Error('VOUCHER_MIN_ORDER_NOT_MET');

  // Calculate discount
  let discountCents;
  if (voucher.discount_type === 'percentage') {
    discountCents = Math.round(order.subtotal_cents * voucher.discount_value / 100);
    if (voucher.max_discount_cents) {
      discountCents = Math.min(discountCents, voucher.max_discount_cents);
    }
  } else {
    // fixed_amount
    discountCents = voucher.discount_value;
  }

  // Don't exceed order total
  discountCents = Math.min(discountCents, order.subtotal_cents);
  const newTotalCents = order.subtotal_cents - discountCents;

  // Update order with discount
  await mysqlSequelize.query(
    `UPDATE ticket_orders
     SET discount_cents = :discountCents,
         total_cents = :newTotalCents,
         voucher_code_id = :voucherId,
         updated_at = NOW()
     WHERE id = :orderId`,
    {
      replacements: { discountCents, newTotalCents, voucherId: voucher.id, orderId },
      type: QueryTypes.UPDATE,
    }
  );

  // Increment voucher usage
  await mysqlSequelize.query(
    `UPDATE voucher_codes SET used_count = used_count + 1, updated_at = NOW() WHERE id = :voucherId`,
    { replacements: { voucherId: voucher.id }, type: QueryTypes.UPDATE }
  );

  logger.info(`[Ticketing] Voucher ${voucherCode} applied to order ${orderId}: -${discountCents} cents`);

  return { discountCents, newTotalCents };
}

// ============================================================================
// 8. GET ORDER DETAILS
// ============================================================================

/**
 * Get full order details including items and QR code image.
 *
 * @param {string} orderUuid - ticket_orders.order_uuid
 * @returns {Promise<Object>} Full order details
 */
export async function getOrderDetails(orderUuid) {
  const [order] = await mysqlSequelize.query(
    `SELECT o.*,
            v.code as voucher_code, v.discount_type, v.discount_value
     FROM ticket_orders o
     LEFT JOIN voucher_codes v ON v.id = o.voucher_code_id
     WHERE o.order_uuid = :orderUuid`,
    { replacements: { orderUuid }, type: QueryTypes.SELECT }
  );

  if (!order) throw new Error('ORDER_NOT_FOUND');

  // Get order items with ticket details
  const items = await mysqlSequelize.query(
    `SELECT oi.id as item_id, oi.quantity, oi.tier_name,
            oi.unit_price_cents, oi.total_price_cents,
            t.name as ticket_name, t.name_en, t.name_de, t.name_es,
            t.ticket_type, t.description,
            ti.slot_date, ti.slot_time_start, ti.slot_time_end
     FROM ticket_order_items oi
     JOIN tickets t ON t.id = oi.ticket_id
     JOIN ticket_inventory ti ON ti.id = oi.inventory_id
     WHERE oi.order_id = :orderId`,
    { replacements: { orderId: order.id }, type: QueryTypes.SELECT }
  );

  // Get payment transactions
  let payments = [];
  try {
    const { getTransactionsByOrder } = await import('../payment/paymentService.js');
    payments = await getTransactionsByOrder('ticket', order.id);
  } catch {
    // Payment info not critical
  }

  // Generate QR code image if confirmed
  let qrCodeImage = null;
  if (order.qr_code_data) {
    qrCodeImage = await generateQRImage(order.qr_code_data);
  }

  return {
    id: order.id,
    orderUuid: order.order_uuid,
    orderNumber: order.order_number,
    destinationId: order.destination_id,
    status: order.status,
    customer: {
      userId: order.user_id,
      email: order.guest_email,
      name: order.guest_name,
      phone: order.guest_phone,
    },
    pricing: {
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      totalCents: order.total_cents,
      currency: order.currency,
    },
    voucher: order.voucher_code ? {
      code: order.voucher_code,
      discountType: order.discount_type,
      discountValue: order.discount_value,
    } : null,
    items,
    qrCode: {
      data: order.qr_code_data,
      image: qrCodeImage,
      validated: order.qr_code_validated,
      validatedAt: order.qr_validated_at,
      validatedBy: order.qr_validated_by,
    },
    payments,
    expiresAt: order.expires_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

// ============================================================================
// ADDITIONAL HELPERS (used by admin endpoints)
// ============================================================================

/**
 * Validate a voucher code without applying it (preview mode).
 */
export async function validateVoucher(voucherCode, destinationId, orderSubtotalCents) {
  const [voucher] = await mysqlSequelize.query(
    `SELECT id, code, discount_type, discount_value, min_order_cents,
            max_discount_cents, max_uses, used_count, is_active,
            valid_from, valid_until
     FROM voucher_codes
     WHERE code = :code AND destination_id = :destId`,
    { replacements: { code: voucherCode.toUpperCase(), destId: destinationId }, type: QueryTypes.SELECT }
  );

  if (!voucher) return { valid: false, error: 'VOUCHER_NOT_FOUND' };
  if (!voucher.is_active) return { valid: false, error: 'VOUCHER_INACTIVE' };

  const now = new Date();
  if (voucher.valid_from && new Date(voucher.valid_from) > now) return { valid: false, error: 'VOUCHER_NOT_YET_VALID' };
  if (voucher.valid_until && new Date(voucher.valid_until) < now) return { valid: false, error: 'VOUCHER_EXPIRED' };
  if (voucher.max_uses && voucher.used_count >= voucher.max_uses) return { valid: false, error: 'VOUCHER_MAX_USES_REACHED' };
  if (orderSubtotalCents && orderSubtotalCents < (voucher.min_order_cents || 0)) {
    return { valid: false, error: 'VOUCHER_MIN_ORDER_NOT_MET' };
  }

  let discountCents = 0;
  if (orderSubtotalCents) {
    if (voucher.discount_type === 'percentage') {
      discountCents = Math.round(orderSubtotalCents * voucher.discount_value / 100);
      if (voucher.max_discount_cents) discountCents = Math.min(discountCents, voucher.max_discount_cents);
    } else {
      discountCents = voucher.discount_value;
    }
    discountCents = Math.min(discountCents, orderSubtotalCents);
  }

  return {
    valid: true,
    voucher: {
      code: voucher.code,
      discountType: voucher.discount_type,
      discountValue: voucher.discount_value,
    },
    discountCents,
  };
}

/**
 * Get ticket detail by ID.
 */
export async function getTicketDetail(ticketId, destinationId) {
  const [ticket] = await mysqlSequelize.query(
    `SELECT * FROM tickets WHERE id = :ticketId AND destination_id = :destinationId`,
    { replacements: { ticketId, destinationId }, type: QueryTypes.SELECT }
  );
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  // Parse JSON fields
  if (typeof ticket.pricing_tiers === 'string') {
    try { ticket.pricing_tiers = JSON.parse(ticket.pricing_tiers); } catch { /* keep */ }
  }
  if (typeof ticket.dynamic_pricing_config === 'string') {
    try { ticket.dynamic_pricing_config = JSON.parse(ticket.dynamic_pricing_config); } catch { /* keep */ }
  }

  return ticket;
}

export default {
  getAvailableTickets,
  createOrder,
  processPayment,
  confirmOrder,
  cancelOrder,
  validateQR,
  applyVoucher,
  getOrderDetails,
  validateVoucher,
  getTicketDetail,
};
