/**
 * Payment Service (Fase III — Blok A)
 *
 * Business logic layer for payment transactions.
 * Delegates Adyen API calls to adyenService.js.
 *
 * Core functions:
 * 1. createPaymentSession — Create Adyen session + DB record
 * 2. handleWebhook — HMAC verify + idempotent status update
 * 3. initiateRefund — Validation + Adyen refund + DB record
 * 4. getTransactionStatus — By UUID
 * 5. getTransactionsByOrder — By order_type + order_id
 *
 * All amounts in CENTS (integers, never floats).
 * Multi-destination: destination_id on every query.
 */

import crypto from 'crypto';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import adyenService from './adyenService.js';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// 1. CREATE PAYMENT SESSION
// ============================================================================

/**
 * Create an Adyen payment session and store a pending transaction.
 *
 * @param {Object} params
 * @param {number} params.amountCents - Total amount in cents
 * @param {string} [params.currency='EUR'] - ISO 4217
 * @param {string} params.orderType - 'ticket' | 'reservation' | 'booking'
 * @param {number} params.orderId - FK to ticket_orders or reservations
 * @param {number} params.destinationId - FK to destinations
 * @param {string} params.returnUrl - Redirect after 3DS/iDEAL
 * @param {number} [params.userId] - Logged-in user (null for guest checkout)
 * @param {number} [params.poiId] - Related POI
 * @param {string} [params.ipAddress] - Client IP for audit
 * @param {string} [params.userAgent] - Client UA for audit
 * @param {Object} [params.metadata] - Additional data (shopperEmail, etc.)
 * @returns {Promise<Object>} Session data for frontend Drop-in
 */
export async function createPaymentSession({
  amountCents,
  currency = 'EUR',
  orderType,
  orderId,
  destinationId,
  returnUrl,
  userId = null,
  poiId = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) {
  // Generate unique identifiers
  const transactionUuid = crypto.randomUUID();
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${orderType}:${orderId}:${Date.now()}`)
    .digest('hex')
    .substring(0, 64);
  const merchantReference = `HB-${destinationId}-${orderType}-${orderId}-${Date.now()}`;

  // Determine country/locale from destination
  const countryMap = { 1: 'ES', 2: 'NL', 3: 'ES', 4: 'BE' };
  const localeMap = { 1: 'es-ES', 2: 'nl-NL', 3: 'es-ES', 4: 'nl-BE' };
  const countryCode = countryMap[destinationId] || 'NL';
  const shopperLocale = localeMap[destinationId] || 'nl-NL';

  // Create Adyen session
  const session = await adyenService.createPaymentSession({
    amountCents,
    currency,
    reference: merchantReference,
    returnUrl,
    countryCode,
    shopperLocale,
    metadata: { ...metadata, transactionUuid, orderType, orderId: String(orderId) },
  });

  // Store pending transaction in DB
  await mysqlSequelize.query(
    `INSERT INTO payment_transactions
      (destination_id, transaction_uuid, idempotency_key,
       adyen_merchant_reference, amount_cents, currency,
       status, order_type, order_id, user_id, poi_id,
       ip_address, user_agent, metadata)
     VALUES
      (:destinationId, :transactionUuid, :idempotencyKey,
       :merchantReference, :amountCents, :currency,
       'pending', :orderType, :orderId, :userId, :poiId,
       :ipAddress, :userAgent, :metadata)`,
    {
      replacements: {
        destinationId,
        transactionUuid,
        idempotencyKey,
        merchantReference,
        amountCents,
        currency,
        orderType,
        orderId,
        userId,
        poiId,
        ipAddress,
        userAgent,
        metadata: JSON.stringify(metadata),
      },
      type: QueryTypes.INSERT,
    },
  );

  logger.info('Payment session created', {
    transactionUuid,
    merchantReference,
    amountCents,
    orderType,
    orderId,
    destinationId,
  });

  // Return data matching frontend AdyenSessionData interface
  const clientConfig = adyenService.getClientConfig();
  return {
    id: session.id,
    sessionData: session.sessionData,
    clientKey: clientConfig.clientKey,
    environment: clientConfig.environment,
    amount: { value: amountCents, currency },
    transactionUuid,
    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
  };
}

// ============================================================================
// 2. HANDLE WEBHOOK
// ============================================================================

/**
 * Process Adyen webhook notification.
 * HMAC verified by route middleware (raw body).
 * Idempotent: duplicate notifications are safely ignored.
 *
 * @param {Object} notificationItem - Single Adyen notification item
 * @returns {Promise<void>}
 */
export async function handleWebhook(notificationItem) {
  const {
    eventCode,
    success,
    pspReference,
    merchantReference,
    amount,
    reason,
    paymentMethod,
    additionalData,
  } = notificationItem;

  const isSuccess = success === 'true' || success === true;

  logger.info('Processing webhook', { eventCode, pspReference, merchantReference, isSuccess });

  // Find transaction by merchant reference
  const [transaction] = await mysqlSequelize.query(
    `SELECT id, status, amount_cents, currency, destination_id, order_type, order_id
     FROM payment_transactions
     WHERE adyen_merchant_reference = :merchantReference
     LIMIT 1`,
    { replacements: { merchantReference }, type: QueryTypes.SELECT },
  );

  if (!transaction) {
    logger.warn('Webhook: transaction not found', { merchantReference, pspReference });
    return; // Accept but ignore — Adyen may send for old/test transactions
  }

  // Check idempotency: skip if already in a terminal state for this event
  const terminalStates = ['captured', 'cancelled', 'refunded', 'chargeback', 'failed'];

  switch (eventCode) {
    case 'AUTHORISATION': {
      if (terminalStates.includes(transaction.status)) break; // Already processed
      const newStatus = isSuccess ? 'authorized' : 'failed';
      await mysqlSequelize.query(
        `UPDATE payment_transactions
         SET status = :status,
             adyen_psp_reference = :pspReference,
             adyen_payment_method = :paymentMethod,
             authorized_at = IF(:isSuccess, NOW(), NULL),
             error_code = :errorCode,
             error_message = :errorMessage
         WHERE id = :id`,
        {
          replacements: {
            status: newStatus,
            pspReference,
            paymentMethod: paymentMethod || null,
            isSuccess,
            errorCode: isSuccess ? null : (reason || null),
            errorMessage: isSuccess ? null : (reason || null),
            id: transaction.id,
          },
          type: QueryTypes.UPDATE,
        },
      );
      logger.info('AUTHORISATION processed', { id: transaction.id, newStatus, pspReference });
      break;
    }

    case 'CAPTURE': {
      if (transaction.status === 'captured') break; // Idempotent
      await mysqlSequelize.query(
        `UPDATE payment_transactions
         SET status = 'captured', captured_at = NOW(), adyen_psp_reference = COALESCE(adyen_psp_reference, :pspReference)
         WHERE id = :id`,
        { replacements: { pspReference, id: transaction.id }, type: QueryTypes.UPDATE },
      );
      logger.info('CAPTURE processed', { id: transaction.id, pspReference });
      break;
    }

    case 'CANCELLATION': {
      if (transaction.status === 'cancelled') break;
      await mysqlSequelize.query(
        `UPDATE payment_transactions SET status = 'cancelled' WHERE id = :id`,
        { replacements: { id: transaction.id }, type: QueryTypes.UPDATE },
      );
      logger.info('CANCELLATION processed', { id: transaction.id });
      break;
    }

    case 'REFUND': {
      // Determine if full or partial refund
      const refundAmountCents = amount?.value || 0;
      const isFullRefund = refundAmountCents >= transaction.amount_cents;
      const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await mysqlSequelize.query(
        `UPDATE payment_transactions SET status = :status WHERE id = :id`,
        { replacements: { status: newStatus, id: transaction.id }, type: QueryTypes.UPDATE },
      );

      // Create refund record
      await mysqlSequelize.query(
        `INSERT INTO payment_refunds
          (destination_id, transaction_id, refund_uuid, adyen_psp_reference,
           amount_cents, reason, status, initiated_by, processed_at)
         VALUES
          (:destinationId, :transactionId, :refundUuid, :pspReference,
           :amountCents, 'other', 'processed', 'system', NOW())`,
        {
          replacements: {
            destinationId: transaction.destination_id,
            transactionId: transaction.id,
            refundUuid: crypto.randomUUID(),
            pspReference,
            amountCents: refundAmountCents,
          },
          type: QueryTypes.INSERT,
        },
      );

      logger.info('REFUND processed', { id: transaction.id, refundAmountCents, newStatus });
      break;
    }

    case 'CHARGEBACK': {
      await mysqlSequelize.query(
        `UPDATE payment_transactions SET status = 'chargeback' WHERE id = :id`,
        { replacements: { id: transaction.id }, type: QueryTypes.UPDATE },
      );
      logger.warn('CHARGEBACK received', {
        id: transaction.id,
        pspReference,
        destinationId: transaction.destination_id,
      });
      // TODO: Trigger alert to owner (De Bode / email)
      break;
    }

    default:
      logger.info('Webhook event ignored', { eventCode, pspReference });
  }
}

// ============================================================================
// 3. INITIATE REFUND
// ============================================================================

/**
 * Initiate a refund for a captured transaction.
 *
 * @param {number} transactionId - DB id of payment_transactions
 * @param {number} amountCents - Amount to refund in cents (0 = full refund)
 * @param {string} reason - Refund reason enum
 * @param {string} initiatedBy - 'admin' | 'system' | 'customer'
 * @param {number} [adminUserId] - Admin user who initiated
 * @returns {Promise<Object>} Refund result
 */
export async function initiateRefund(transactionId, amountCents, reason, initiatedBy, adminUserId = null) {
  // Fetch transaction
  const [transaction] = await mysqlSequelize.query(
    `SELECT id, destination_id, adyen_psp_reference, amount_cents, currency, status
     FROM payment_transactions WHERE id = :id`,
    { replacements: { id: transactionId }, type: QueryTypes.SELECT },
  );

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Validate status
  const refundableStatuses = ['captured', 'partially_refunded'];
  if (!refundableStatuses.includes(transaction.status)) {
    throw new Error(`Cannot refund transaction with status: ${transaction.status}`);
  }

  if (!transaction.adyen_psp_reference) {
    throw new Error('Transaction has no Adyen PSP reference');
  }

  // Calculate actual refund amount
  const [existingRefunds] = await mysqlSequelize.query(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total_refunded
     FROM payment_refunds WHERE transaction_id = :id AND status != 'failed'`,
    { replacements: { id: transactionId }, type: QueryTypes.SELECT },
  );

  const totalRefunded = existingRefunds.total_refunded || 0;
  const maxRefundable = transaction.amount_cents - totalRefunded;
  const refundAmount = amountCents > 0 ? Math.min(amountCents, maxRefundable) : maxRefundable;

  if (refundAmount <= 0) {
    throw new Error('No refundable amount remaining');
  }

  // Create refund record
  const refundUuid = crypto.randomUUID();

  await mysqlSequelize.query(
    `INSERT INTO payment_refunds
      (destination_id, transaction_id, refund_uuid, amount_cents,
       reason, status, initiated_by, admin_user_id)
     VALUES
      (:destinationId, :transactionId, :refundUuid, :amountCents,
       :reason, 'pending', :initiatedBy, :adminUserId)`,
    {
      replacements: {
        destinationId: transaction.destination_id,
        transactionId,
        refundUuid,
        amountCents: refundAmount,
        reason,
        initiatedBy,
        adminUserId,
      },
      type: QueryTypes.INSERT,
    },
  );

  // Call Adyen
  const adyenResult = await adyenService.initiateRefund(
    transaction.adyen_psp_reference,
    refundAmount,
    transaction.currency,
    `refund-${refundUuid}`,
  );

  // Update refund record with Adyen PSP reference
  await mysqlSequelize.query(
    `UPDATE payment_refunds SET adyen_psp_reference = :pspReference WHERE refund_uuid = :refundUuid`,
    { replacements: { pspReference: adyenResult.pspReference, refundUuid }, type: QueryTypes.UPDATE },
  );

  // Update transaction status
  const isFullRefund = (totalRefunded + refundAmount) >= transaction.amount_cents;
  const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

  await mysqlSequelize.query(
    `UPDATE payment_transactions SET status = :status WHERE id = :id`,
    { replacements: { status: newStatus, id: transactionId }, type: QueryTypes.UPDATE },
  );

  logger.info('Refund initiated', {
    transactionId,
    refundUuid,
    amountCents: refundAmount,
    reason,
    initiatedBy,
    newStatus,
  });

  return {
    refundUuid,
    amountCents: refundAmount,
    currency: transaction.currency,
    adyenPspReference: adyenResult.pspReference,
    status: newStatus,
  };
}

// ============================================================================
// 4. GET TRANSACTION STATUS
// ============================================================================

/**
 * Get transaction by UUID (customer-facing).
 *
 * @param {string} transactionUuid
 * @returns {Promise<Object|null>}
 */
export async function getTransactionStatus(transactionUuid) {
  const [transaction] = await mysqlSequelize.query(
    `SELECT transaction_uuid, status, amount_cents, currency,
            order_type, order_id, adyen_payment_method,
            created_at, authorized_at, captured_at
     FROM payment_transactions
     WHERE transaction_uuid = :uuid`,
    { replacements: { uuid: transactionUuid }, type: QueryTypes.SELECT },
  );

  return transaction || null;
}

// ============================================================================
// 5. GET TRANSACTIONS BY ORDER
// ============================================================================

/**
 * Get all transactions for a specific order.
 *
 * @param {string} orderType - 'ticket' | 'reservation' | 'booking'
 * @param {number} orderId
 * @returns {Promise<Array>}
 */
export async function getTransactionsByOrder(orderType, orderId) {
  const transactions = await mysqlSequelize.query(
    `SELECT transaction_uuid, status, amount_cents, currency,
            adyen_payment_method, adyen_psp_reference,
            created_at, authorized_at, captured_at
     FROM payment_transactions
     WHERE order_type = :orderType AND order_id = :orderId
     ORDER BY created_at DESC`,
    { replacements: { orderType, orderId }, type: QueryTypes.SELECT },
  );

  return transactions;
}

// ============================================================================
// ADMIN QUERIES
// ============================================================================

/**
 * List transactions with filters (admin).
 */
export async function listTransactions({ destinationId, status, dateFrom, dateTo, page = 1, limit = 50 }) {
  let where = 'WHERE destination_id = :destinationId';
  const replacements = { destinationId };

  if (status) {
    where += ' AND status = :status';
    replacements.status = status;
  }
  if (dateFrom) {
    where += ' AND created_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }
  if (dateTo) {
    where += ' AND created_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const offset = (page - 1) * limit;

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) AS total FROM payment_transactions ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const transactions = await mysqlSequelize.query(
    `SELECT id, transaction_uuid, adyen_psp_reference, adyen_merchant_reference,
            adyen_payment_method, amount_cents, currency, commission_cents,
            partner_amount_cents, status, order_type, order_id, user_id, poi_id,
            error_code, error_message, created_at, authorized_at, captured_at
     FROM payment_transactions ${where}
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT },
  );

  return {
    transactions,
    total: countResult.total,
    page,
    totalPages: Math.ceil(countResult.total / limit),
  };
}

/**
 * Get single transaction detail (admin).
 */
export async function getTransactionDetail(transactionId, destinationId) {
  const [transaction] = await mysqlSequelize.query(
    `SELECT pt.*, GROUP_CONCAT(pr.refund_uuid) AS refund_uuids
     FROM payment_transactions pt
     LEFT JOIN payment_refunds pr ON pr.transaction_id = pt.id
     WHERE pt.id = :id AND pt.destination_id = :destinationId
     GROUP BY pt.id`,
    { replacements: { id: transactionId, destinationId }, type: QueryTypes.SELECT },
  );

  if (!transaction) return null;

  // Get refund details if any
  const refunds = await mysqlSequelize.query(
    `SELECT id, refund_uuid, adyen_psp_reference, amount_cents,
            reason, reason_note, status, initiated_by, admin_user_id,
            created_at, processed_at
     FROM payment_refunds WHERE transaction_id = :id`,
    { replacements: { id: transactionId }, type: QueryTypes.SELECT },
  );

  return { ...transaction, refunds };
}

/**
 * Get payment statistics (admin dashboard).
 */
export async function getPaymentStats(destinationId, dateFrom, dateTo) {
  const replacements = { destinationId };
  let dateFilter = '';

  if (dateFrom && dateTo) {
    dateFilter = 'AND created_at BETWEEN :dateFrom AND :dateTo';
    replacements.dateFrom = dateFrom;
    replacements.dateTo = dateTo;
  }

  const [stats] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) AS total_transactions,
       SUM(CASE WHEN status IN ('captured', 'authorized') THEN 1 ELSE 0 END) AS successful,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN status IN ('refunded', 'partially_refunded') THEN 1 ELSE 0 END) AS refunded,
       SUM(CASE WHEN status = 'chargeback' THEN 1 ELSE 0 END) AS chargebacks,
       COALESCE(SUM(CASE WHEN status IN ('captured', 'authorized') THEN amount_cents ELSE 0 END), 0) AS total_revenue_cents,
       COALESCE(SUM(CASE WHEN status IN ('captured', 'authorized') THEN commission_cents ELSE 0 END), 0) AS total_commission_cents,
       COALESCE((SELECT SUM(amount_cents) FROM payment_refunds WHERE destination_id = :destinationId AND status = 'processed'), 0) AS total_refunded_cents
     FROM payment_transactions
     WHERE destination_id = :destinationId ${dateFilter}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const successRate = stats.total_transactions > 0
    ? ((stats.successful / stats.total_transactions) * 100).toFixed(1)
    : 0;

  return {
    ...stats,
    success_rate: parseFloat(successRate),
    net_revenue_cents: stats.total_revenue_cents - stats.total_refunded_cents,
  };
}

/**
 * Get reconciliation report (admin).
 */
export async function getReconciliationReport(destinationId, date) {
  const transactions = await mysqlSequelize.query(
    `SELECT id, transaction_uuid, adyen_psp_reference, adyen_merchant_reference,
            amount_cents, currency, commission_cents, partner_amount_cents,
            status, order_type, order_id, created_at, captured_at
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND DATE(created_at) = :date
       AND status IN ('captured', 'refunded', 'partially_refunded')
     ORDER BY created_at ASC`,
    { replacements: { destinationId, date }, type: QueryTypes.SELECT },
  );

  const refunds = await mysqlSequelize.query(
    `SELECT pr.*, pt.adyen_merchant_reference
     FROM payment_refunds pr
     JOIN payment_transactions pt ON pt.id = pr.transaction_id
     WHERE pr.destination_id = :destinationId
       AND DATE(pr.created_at) = :date
       AND pr.status = 'processed'`,
    { replacements: { destinationId, date }, type: QueryTypes.SELECT },
  );

  const totalCaptured = transactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount_cents, 0);

  return {
    date,
    transactions,
    refunds,
    summary: {
      total_captured_cents: totalCaptured,
      total_refunded_cents: totalRefunded,
      net_cents: totalCaptured - totalRefunded,
      transaction_count: transactions.length,
      refund_count: refunds.length,
    },
  };
}
