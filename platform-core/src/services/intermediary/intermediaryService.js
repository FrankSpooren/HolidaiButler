/**
 * Intermediary Service — Fase IV Blok B
 *
 * State machine for intermediary transactions between tourists and partner POIs.
 * HolidaiButler acts as intermediary: voorstel → toestemming → bevestiging → delen → reminder → review
 *
 * Functions:
 *   createTransaction       — Create proposal (voorstel)
 *   giveConsent             — Tourist consent (toestemming)
 *   confirmTransaction      — Payment + commission calc (bevestiging), ACID
 *   shareVoucher            — Generate QR + share (delen)
 *   sendReminders           — BullMQ batch: reminders 24h before activity
 *   requestReviews          — BullMQ batch: review requests 24h after activity
 *   cancelTransaction       — Cancel at any non-terminal state
 *   validateQR              — Validate scanned QR code (offline-verifiable)
 *   getTransactionById      — Detail with partner/POI joins
 *   getTransactions         — List with filters + pagination
 *   getTransactionStats     — Dashboard KPIs
 *   getPartnerTransactions  — Per-partner transactions (replaces placeholder)
 *   getPartnerPayoutReport  — Payout aggregation (forward-compatible)
 *
 * All amounts in CENTS (integers, never floats).
 * Multi-destination: destination_id on every query.
 *
 * @version 1.0.0
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// CONSTANTS
// ============================================================================

const INTERMEDIARY_QR_SECRET = process.env.INTERMEDIARY_QR_SECRET || process.env.QR_SECRET_KEY || 'dev-intermediary-secret';

const ALLOWED_TRANSITIONS = {
  voorstel:    ['toestemming', 'cancelled', 'expired'],
  toestemming: ['bevestiging', 'cancelled'],
  bevestiging: ['delen', 'cancelled'],
  delen:       ['reminder', 'review'],
  reminder:    ['review'],
  review:      [],
  cancelled:   [],
  expired:     []
};

// ============================================================================
// HELPERS
// ============================================================================

function validateTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(newStatus);
}

async function generateTransactionNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM intermediary_transactions WHERE transaction_number LIKE :prefix`,
    { replacements: { prefix: `HB-I-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-I-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

function generateQRData(transactionUuid) {
  const hmac = crypto.createHmac('sha256', INTERMEDIARY_QR_SECRET)
    .update(transactionUuid)
    .digest('hex')
    .substring(0, 8);
  return `HB-I:${transactionUuid}:${hmac}`;
}

async function generateQRImage(qrData) {
  return QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 300, margin: 2 });
}

function verifyQRSignature(transactionUuid, signature) {
  const expected = crypto.createHmac('sha256', INTERMEDIARY_QR_SECRET)
    .update(transactionUuid)
    .digest('hex')
    .substring(0, 8);
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}

function calculateCommission(amountCents, commissionRate) {
  const commissionCents = Math.round(amountCents * commissionRate / 100);
  const partnerAmountCents = amountCents - commissionCents;
  return { commissionCents, partnerAmountCents };
}

// ============================================================================
// 1. CREATE TRANSACTION (voorstel)
// ============================================================================

async function createTransaction(data) {
  const {
    destinationId, partnerId, poiId, serviceType, serviceDescription,
    activityDate, activityTime, amountCents, currency,
    guestName, guestEmail, guestPhone, userId, notes
  } = data;

  // Validate partner exists and is active
  const [partner] = await mysqlSequelize.query(
    `SELECT id, contract_status, commission_rate FROM partners
     WHERE id = :partnerId AND destination_id = :destinationId`,
    { replacements: { partnerId, destinationId }, type: QueryTypes.SELECT }
  );

  if (!partner) {
    throw new Error('Partner not found');
  }
  if (partner.contract_status !== 'active') {
    throw new Error(`Partner contract is not active (status: ${partner.contract_status})`);
  }

  // Lookup commission: POI-level override > partner-level rate
  let commissionRate = parseFloat(partner.commission_rate);
  let partnerPoiId = null;

  const [partnerPoi] = await mysqlSequelize.query(
    `SELECT id, commission_override FROM partner_pois
     WHERE partner_id = :partnerId AND poi_id = :poiId AND is_active = 1`,
    { replacements: { partnerId, poiId }, type: QueryTypes.SELECT }
  );

  if (partnerPoi) {
    partnerPoiId = partnerPoi.id;
    if (partnerPoi.commission_override != null) {
      commissionRate = parseFloat(partnerPoi.commission_override);
    }
  }

  const { commissionCents, partnerAmountCents } = calculateCommission(amountCents || 0, commissionRate);

  const transactionUuid = crypto.randomUUID();
  const transactionNumber = await generateTransactionNumber();

  await mysqlSequelize.query(
    `INSERT INTO intermediary_transactions
       (destination_id, transaction_uuid, transaction_number, partner_id, poi_id, partner_poi_id,
        status, service_type, service_description, activity_date, activity_time,
        amount_cents, currency, commission_rate, commission_cents, partner_amount_cents,
        guest_name, guest_email, guest_phone, user_id, notes)
     VALUES
       (:destinationId, :transactionUuid, :transactionNumber, :partnerId, :poiId, :partnerPoiId,
        'voorstel', :serviceType, :serviceDescription, :activityDate, :activityTime,
        :amountCents, :currency, :commissionRate, :commissionCents, :partnerAmountCents,
        :guestName, :guestEmail, :guestPhone, :userId, :notes)`,
    {
      replacements: {
        destinationId,
        transactionUuid,
        transactionNumber,
        partnerId,
        poiId,
        partnerPoiId,
        serviceType: serviceType || null,
        serviceDescription: serviceDescription || null,
        activityDate: activityDate || null,
        activityTime: activityTime || null,
        amountCents: amountCents || 0,
        currency: currency || 'EUR',
        commissionRate,
        commissionCents,
        partnerAmountCents,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
        guestPhone: guestPhone || null,
        userId: userId || null,
        notes: notes || null
      }
    }
  );

  // Fetch and return created transaction
  const [created] = await mysqlSequelize.query(
    `SELECT * FROM intermediary_transactions WHERE transaction_uuid = :transactionUuid`,
    { replacements: { transactionUuid }, type: QueryTypes.SELECT }
  );

  return created;
}

// ============================================================================
// 2. GIVE CONSENT (toestemming)
// ============================================================================

async function giveConsent(id, destinationId) {
  const [tx] = await mysqlSequelize.query(
    `SELECT id, status FROM intermediary_transactions
     WHERE id = :id AND destination_id = :destinationId`,
    { replacements: { id, destinationId }, type: QueryTypes.SELECT }
  );

  if (!tx) throw new Error('Transaction not found');
  if (!validateTransition(tx.status, 'toestemming')) {
    throw new Error(`Invalid transition: ${tx.status} → toestemming`);
  }

  await mysqlSequelize.query(
    `UPDATE intermediary_transactions
     SET status = 'toestemming', consented_at = NOW()
     WHERE id = :id`,
    { replacements: { id } }
  );

  return getTransactionById(id, destinationId);
}

// ============================================================================
// 3. CONFIRM TRANSACTION (bevestiging) — ACID
// ============================================================================

async function confirmTransaction(id, destinationId, paymentTransactionId = null) {
  const t = await mysqlSequelize.transaction();

  try {
    const [tx] = await mysqlSequelize.query(
      `SELECT * FROM intermediary_transactions
       WHERE id = :id AND destination_id = :destinationId`,
      { replacements: { id, destinationId }, type: QueryTypes.SELECT, transaction: t }
    );

    if (!tx) throw new Error('Transaction not found');
    if (!validateTransition(tx.status, 'bevestiging')) {
      throw new Error(`Invalid transition: ${tx.status} → bevestiging`);
    }

    // Update intermediary transaction
    await mysqlSequelize.query(
      `UPDATE intermediary_transactions
       SET status = 'bevestiging', confirmed_at = NOW(),
           payment_transaction_id = :paymentTransactionId
       WHERE id = :id`,
      { replacements: { id, paymentTransactionId }, transaction: t }
    );

    // If linked to a payment transaction, update commission fields
    if (paymentTransactionId) {
      await mysqlSequelize.query(
        `UPDATE payment_transactions
         SET commission_cents = :commissionCents,
             partner_amount_cents = :partnerAmountCents
         WHERE id = :paymentTransactionId`,
        {
          replacements: {
            commissionCents: tx.commission_cents,
            partnerAmountCents: tx.partner_amount_cents,
            paymentTransactionId
          },
          transaction: t
        }
      );
    }

    await t.commit();
    logger.info(`[Intermediary] Transaction ${tx.transaction_number} confirmed`);

    return getTransactionById(id, destinationId);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// ============================================================================
// 4. SHARE VOUCHER (delen) — Generate QR
// ============================================================================

async function shareVoucher(id, destinationId) {
  const [tx] = await mysqlSequelize.query(
    `SELECT id, status, transaction_uuid FROM intermediary_transactions
     WHERE id = :id AND destination_id = :destinationId`,
    { replacements: { id, destinationId }, type: QueryTypes.SELECT }
  );

  if (!tx) throw new Error('Transaction not found');
  if (!validateTransition(tx.status, 'delen')) {
    throw new Error(`Invalid transition: ${tx.status} → delen`);
  }

  const qrData = generateQRData(tx.transaction_uuid);

  await mysqlSequelize.query(
    `UPDATE intermediary_transactions
     SET status = 'delen', qr_code_data = :qrData, shared_at = NOW()
     WHERE id = :id`,
    { replacements: { id, qrData } }
  );

  const qrImage = await generateQRImage(qrData);

  logger.info(`[Intermediary] Voucher shared for transaction ${tx.id}, QR generated`);

  return {
    ...(await getTransactionById(id, destinationId)),
    qrCodeImage: qrImage
  };
}

// ============================================================================
// 5. SEND REMINDERS (BullMQ batch job)
// ============================================================================

async function sendReminders() {
  // Find transactions: status=delen, activity_date within 23-25 hours, no reminder sent
  const transactions = await mysqlSequelize.query(
    `SELECT id, transaction_number, guest_name, guest_email, activity_date, activity_time,
            destination_id
     FROM intermediary_transactions
     WHERE status = 'delen'
       AND activity_date IS NOT NULL
       AND activity_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
       AND reminder_sent_at IS NULL`,
    { type: QueryTypes.SELECT }
  );

  let sentCount = 0;
  for (const tx of transactions) {
    try {
      await mysqlSequelize.query(
        `UPDATE intermediary_transactions
         SET status = 'reminder', reminder_sent_at = NOW()
         WHERE id = :id AND status = 'delen'`,
        { replacements: { id: tx.id } }
      );
      sentCount++;
      logger.info(`[Intermediary] Reminder sent for ${tx.transaction_number}`);
    } catch (error) {
      logger.error(`[Intermediary] Reminder failed for ${tx.transaction_number}:`, error.message);
    }
  }

  return { sentCount, total: transactions.length };
}

// ============================================================================
// 6. REQUEST REVIEWS (BullMQ batch job)
// ============================================================================

async function requestReviews() {
  // Find transactions: status in (delen, reminder), activity_date > 24h ago, no review requested
  const transactions = await mysqlSequelize.query(
    `SELECT id, transaction_number, guest_name, guest_email, activity_date,
            destination_id
     FROM intermediary_transactions
     WHERE status IN ('delen', 'reminder')
       AND activity_date IS NOT NULL
       AND activity_date < DATE_SUB(CURDATE(), INTERVAL 0 DAY)
       AND review_requested_at IS NULL`,
    { type: QueryTypes.SELECT }
  );

  let sentCount = 0;
  for (const tx of transactions) {
    try {
      await mysqlSequelize.query(
        `UPDATE intermediary_transactions
         SET status = 'review', review_requested_at = NOW()
         WHERE id = :id AND status IN ('delen', 'reminder')`,
        { replacements: { id: tx.id } }
      );
      sentCount++;
      logger.info(`[Intermediary] Review requested for ${tx.transaction_number}`);
    } catch (error) {
      logger.error(`[Intermediary] Review request failed for ${tx.transaction_number}:`, error.message);
    }
  }

  return { sentCount, total: transactions.length };
}

// ============================================================================
// 7. CANCEL TRANSACTION
// ============================================================================

async function cancelTransaction(id, destinationId, reason) {
  const [tx] = await mysqlSequelize.query(
    `SELECT id, status, transaction_number, payment_transaction_id FROM intermediary_transactions
     WHERE id = :id AND destination_id = :destinationId`,
    { replacements: { id, destinationId }, type: QueryTypes.SELECT }
  );

  if (!tx) throw new Error('Transaction not found');
  if (!validateTransition(tx.status, 'cancelled')) {
    throw new Error(`Cannot cancel transaction in status: ${tx.status}`);
  }

  await mysqlSequelize.query(
    `UPDATE intermediary_transactions
     SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = :reason
     WHERE id = :id`,
    { replacements: { id, reason: reason || null } }
  );

  logger.info(`[Intermediary] Transaction ${tx.transaction_number} cancelled (was: ${tx.status})`);

  return getTransactionById(id, destinationId);
}

// ============================================================================
// 8. VALIDATE QR
// ============================================================================

async function validateQR(qrData, validatedBy) {
  const parts = qrData.split(':');
  if (parts.length !== 3 || parts[0] !== 'HB-I') {
    return { valid: false, message: 'Invalid QR format' };
  }

  const [, transactionUuid, signature] = parts;

  try {
    if (!verifyQRSignature(transactionUuid, signature)) {
      return { valid: false, message: 'Invalid QR signature' };
    }
  } catch {
    return { valid: false, message: 'QR verification error' };
  }

  const [tx] = await mysqlSequelize.query(
    `SELECT it.*, p.company_name as partner_name, poi.name as poi_name
     FROM intermediary_transactions it
     LEFT JOIN partners p ON p.id = it.partner_id
     LEFT JOIN POI poi ON poi.id = it.poi_id
     WHERE it.transaction_uuid = :transactionUuid`,
    { replacements: { transactionUuid }, type: QueryTypes.SELECT }
  );

  if (!tx) {
    return { valid: false, message: 'Transaction not found' };
  }

  if (!['delen', 'reminder', 'review'].includes(tx.status)) {
    return { valid: false, message: `Transaction status: ${tx.status}`, transactionNumber: tx.transaction_number };
  }

  if (tx.qr_validated) {
    return {
      valid: false,
      message: `Already validated at ${tx.qr_validated_at}`,
      transactionNumber: tx.transaction_number
    };
  }

  // Mark as validated
  await mysqlSequelize.query(
    `UPDATE intermediary_transactions
     SET qr_validated = TRUE, qr_validated_at = NOW(), qr_validated_by = :validatedBy
     WHERE id = :id`,
    { replacements: { validatedBy: validatedBy || 'unknown', id: tx.id } }
  );

  logger.info(`[Intermediary] QR validated: ${tx.transaction_number} by ${validatedBy}`);

  return {
    valid: true,
    message: 'Valid intermediary voucher',
    transactionNumber: tx.transaction_number,
    partnerName: tx.partner_name,
    poiName: tx.poi_name,
    serviceType: tx.service_type,
    guestName: tx.guest_name,
    activityDate: tx.activity_date,
    activityTime: tx.activity_time,
    amountCents: tx.amount_cents,
    currency: tx.currency
  };
}

// ============================================================================
// 9. GET TRANSACTION BY ID (DETAIL)
// ============================================================================

async function getTransactionById(id, destinationId) {
  let where = 'WHERE it.id = :id';
  const replacements = { id };

  if (destinationId) {
    where += ' AND it.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const [tx] = await mysqlSequelize.query(
    `SELECT it.*,
            p.company_name as partner_name, p.contact_name as partner_contact,
            poi.name as poi_name, poi.category as poi_category
     FROM intermediary_transactions it
     LEFT JOIN partners p ON p.id = it.partner_id
     LEFT JOIN POI poi ON poi.id = it.poi_id
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  if (!tx) return null;

  // Generate QR image if available
  if (tx.qr_code_data) {
    tx.qr_code_image = await generateQRImage(tx.qr_code_data);
  }

  return tx;
}

// ============================================================================
// 10. GET TRANSACTIONS (LIST)
// ============================================================================

async function getTransactions(destinationId, filters = {}) {
  const { status, partnerId, poiId, dateFrom, dateTo, search, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const replacements = { limit, offset };

  if (destinationId) {
    where += ' AND it.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  if (status) {
    where += ' AND it.status = :status';
    replacements.status = status;
  }

  if (partnerId) {
    where += ' AND it.partner_id = :partnerId';
    replacements.partnerId = partnerId;
  }

  if (poiId) {
    where += ' AND it.poi_id = :poiId';
    replacements.poiId = poiId;
  }

  if (dateFrom) {
    where += ' AND it.created_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }

  if (dateTo) {
    where += ' AND it.created_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  if (search) {
    where += ' AND (it.guest_name LIKE :search OR it.guest_email LIKE :search OR it.transaction_number LIKE :search)';
    replacements.search = `%${search}%`;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM intermediary_transactions it ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  const total = countResult.total;

  const items = await mysqlSequelize.query(
    `SELECT it.*,
            p.company_name as partner_name,
            poi.name as poi_name
     FROM intermediary_transactions it
     LEFT JOIN partners p ON p.id = it.partner_id
     LEFT JOIN POI poi ON poi.id = it.poi_id
     ${where}
     ORDER BY it.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// ============================================================================
// 11. GET TRANSACTION STATS (KPIs)
// ============================================================================

async function getTransactionStats(destinationId, dateFrom, dateTo) {
  let where = 'WHERE 1=1';
  const replacements = {};

  if (destinationId) {
    where += ' AND destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  if (dateFrom) {
    where += ' AND created_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }

  if (dateTo) {
    where += ' AND created_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const [stats] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total_transactions,
       SUM(CASE WHEN status = 'voorstel' THEN 1 ELSE 0 END) as proposals,
       SUM(CASE WHEN status = 'toestemming' THEN 1 ELSE 0 END) as consented,
       SUM(CASE WHEN status = 'bevestiging' THEN 1 ELSE 0 END) as confirmed,
       SUM(CASE WHEN status = 'delen' THEN 1 ELSE 0 END) as shared,
       SUM(CASE WHEN status = 'reminder' THEN 1 ELSE 0 END) as reminded,
       SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as reviewed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
       SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
       COALESCE(SUM(CASE WHEN status IN ('bevestiging','delen','reminder','review') THEN amount_cents ELSE 0 END), 0) as total_revenue_cents,
       COALESCE(SUM(CASE WHEN status IN ('bevestiging','delen','reminder','review') THEN commission_cents ELSE 0 END), 0) as total_commission_cents,
       COALESCE(SUM(CASE WHEN status IN ('bevestiging','delen','reminder','review') THEN partner_amount_cents ELSE 0 END), 0) as total_partner_amount_cents,
       COUNT(DISTINCT partner_id) as unique_partners,
       COUNT(DISTINCT poi_id) as unique_pois
     FROM intermediary_transactions
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Conversion rate
  const totalProposals = (stats.proposals || 0) + (stats.consented || 0) + (stats.confirmed || 0) +
    (stats.shared || 0) + (stats.reminded || 0) + (stats.reviewed || 0) + (stats.cancelled || 0) + (stats.expired || 0);
  const totalConfirmed = (stats.confirmed || 0) + (stats.shared || 0) + (stats.reminded || 0) + (stats.reviewed || 0);
  const conversionRate = totalProposals > 0 ? Math.round((totalConfirmed / totalProposals) * 10000) / 100 : 0;

  return {
    ...stats,
    conversion_rate: conversionRate
  };
}

// ============================================================================
// 12. GET PARTNER TRANSACTIONS (replaces placeholder)
// ============================================================================

async function getPartnerTransactions(partnerId, destinationId, filters = {}) {
  return getTransactions(destinationId, { ...filters, partnerId });
}

// ============================================================================
// 13. GET PARTNER PAYOUT REPORT (forward-compatible)
// ============================================================================

async function getPartnerPayoutReport(partnerId, destinationId, dateFrom, dateTo) {
  let where = 'WHERE partner_id = :partnerId AND status IN (\'bevestiging\',\'delen\',\'reminder\',\'review\')';
  const replacements = { partnerId };

  if (destinationId) {
    where += ' AND destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  if (dateFrom) {
    where += ' AND confirmed_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }

  if (dateTo) {
    where += ' AND confirmed_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const [summary] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as transaction_count,
       COALESCE(SUM(amount_cents), 0) as total_amount_cents,
       COALESCE(SUM(commission_cents), 0) as total_commission_cents,
       COALESCE(SUM(partner_amount_cents), 0) as total_payout_cents
     FROM intermediary_transactions
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const transactions = await mysqlSequelize.query(
    `SELECT id, transaction_number, service_type, activity_date,
            amount_cents, commission_rate, commission_cents, partner_amount_cents,
            status, confirmed_at
     FROM intermediary_transactions
     ${where}
     ORDER BY confirmed_at DESC`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Monthly breakdown
  const monthly = await mysqlSequelize.query(
    `SELECT
       DATE_FORMAT(confirmed_at, '%Y-%m') as month,
       COUNT(*) as transaction_count,
       SUM(amount_cents) as amount_cents,
       SUM(commission_cents) as commission_cents,
       SUM(partner_amount_cents) as payout_cents
     FROM intermediary_transactions
     ${where}
     GROUP BY DATE_FORMAT(confirmed_at, '%Y-%m')
     ORDER BY month DESC`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    summary,
    transactions,
    monthly
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createTransaction,
  giveConsent,
  confirmTransaction,
  shareVoucher,
  sendReminders,
  requestReviews,
  cancelTransaction,
  validateQR,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  getPartnerTransactions,
  getPartnerPayoutReport,
  validateTransition,
  calculateCommission
};
