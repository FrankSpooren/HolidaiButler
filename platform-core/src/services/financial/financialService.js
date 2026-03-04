/**
 * Financial Service — Fase IV Blok C
 *
 * Settlement batches, partner payouts, credit notes, financial dashboard,
 * CSV exports, and financial audit logging.
 *
 * State machines:
 *   Settlement: draft → calculated → approved → processing → completed | cancelled
 *   Payout:     pending → approved → processing → paid | failed → processing (retry) | cancelled
 *   Credit Note: draft → final | voided
 *
 * All amounts in CENTS (integers, never floats).
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../config/database.js';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTLEMENT_TRANSITIONS = {
  draft:      ['calculated', 'approved', 'cancelled'],
  calculated: ['approved', 'cancelled'],
  approved:   ['processing', 'cancelled'],
  processing: ['completed'],
  completed:  [],
  cancelled:  []
};

const PAYOUT_TRANSITIONS = {
  pending:    ['approved', 'cancelled'],
  approved:   ['processing', 'cancelled'],
  processing: ['paid', 'failed'],
  paid:       [],
  failed:     ['processing'],
  cancelled:  []
};

const CREDIT_NOTE_TRANSITIONS = {
  draft:  ['final'],
  final:  ['voided'],
  voided: []
};

// ============================================================================
// HELPERS
// ============================================================================

function validateTransition(transitions, current, next) {
  const allowed = transitions[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

async function generateBatchNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM settlement_batches WHERE batch_number LIKE :prefix`,
    { replacements: { prefix: `HB-SB-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-SB-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

async function generatePayoutNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM partner_payouts WHERE payout_number LIKE :prefix`,
    { replacements: { prefix: `HB-PO-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-PO-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

async function generateCreditNoteNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM credit_notes WHERE credit_note_number LIKE :prefix`,
    { replacements: { prefix: `HB-CN-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-CN-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

function buildCSV(headers, rows) {
  const BOM = '\uFEFF';
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return BOM + headerLine + '\n' + dataLines.join('\n');
}

// ============================================================================
// FINANCIAL AUDIT LOG
// ============================================================================

async function logFinancialEvent(destinationId, eventType, entityType, entityId, opts = {}, transaction = null) {
  const { actorType = 'admin', actorEmail, oldStatus, newStatus, amountCents, details } = opts;
  const queryOpts = {
    replacements: {
      destinationId,
      eventType,
      entityType,
      entityId,
      actorType,
      actorEmail: actorEmail || null,
      oldStatus: oldStatus || null,
      newStatus: newStatus || null,
      amountCents: amountCents || null,
      details: details ? JSON.stringify(details) : null
    }
  };
  if (transaction) queryOpts.transaction = transaction;
  await mysqlSequelize.query(
    `INSERT INTO financial_audit_log
       (destination_id, event_type, entity_type, entity_id, actor_type, actor_email,
        old_status, new_status, amount_cents, details)
     VALUES (:destinationId, :eventType, :entityType, :entityId, :actorType, :actorEmail,
        :oldStatus, :newStatus, :amountCents, :details)`,
    queryOpts
  );
}

// ============================================================================
// 1. SETTLEMENT BATCH — CREATE
// ============================================================================

async function createSettlementBatch(destinationId, periodStart, periodEnd, createdBy) {
  // Find unsettled confirmed+ transactions for the period
  const unsettled = await mysqlSequelize.query(
    `SELECT
       it.partner_id,
       COUNT(*) as transaction_count,
       SUM(it.amount_cents) as gross_cents,
       SUM(it.commission_cents) as commission_cents,
       SUM(it.partner_amount_cents) as payout_cents
     FROM intermediary_transactions it
     WHERE it.destination_id = :destinationId
       AND it.status IN ('bevestiging','delen','reminder','review')
       AND it.confirmed_at IS NOT NULL
       AND it.confirmed_at BETWEEN :periodStart AND :periodEnd
       AND it.settlement_batch_id IS NULL
     GROUP BY it.partner_id`,
    { replacements: { destinationId, periodStart, periodEnd }, type: QueryTypes.SELECT }
  );

  if (unsettled.length === 0) {
    throw new Error('No unsettled transactions found for this period');
  }

  const t = await mysqlSequelize.transaction();

  try {
    const batchNumber = await generateBatchNumber();

    // Aggregate totals
    const totalTxCount = unsettled.reduce((s, r) => s + r.transaction_count, 0);
    const totalGross = unsettled.reduce((s, r) => s + r.gross_cents, 0);
    const totalCommission = unsettled.reduce((s, r) => s + r.commission_cents, 0);
    const totalPayout = unsettled.reduce((s, r) => s + r.payout_cents, 0);

    // Insert settlement batch
    const [batchResult] = await mysqlSequelize.query(
      `INSERT INTO settlement_batches
         (destination_id, batch_number, period_start, period_end, status,
          total_transaction_count, total_gross_cents, total_commission_cents,
          total_payout_cents, total_partner_count, calculated_at)
       VALUES (:destinationId, :batchNumber, :periodStart, :periodEnd, 'draft',
          :totalTxCount, :totalGross, :totalCommission, :totalPayout, :partnerCount, NOW())`,
      {
        replacements: {
          destinationId, batchNumber, periodStart, periodEnd,
          totalTxCount, totalGross, totalCommission, totalPayout,
          partnerCount: unsettled.length
        },
        transaction: t
      }
    );
    const batchId = batchResult;

    // Create partner payouts + link transactions
    for (const row of unsettled) {
      const payoutNumber = await generatePayoutNumber();

      // Get partner snapshot
      const [partner] = await mysqlSequelize.query(
        'SELECT iban, company_name, vat_number FROM partners WHERE id = :partnerId',
        { replacements: { partnerId: row.partner_id }, type: QueryTypes.SELECT, transaction: t }
      );

      const [payoutResult] = await mysqlSequelize.query(
        `INSERT INTO partner_payouts
           (destination_id, settlement_batch_id, partner_id, payout_number, status,
            transaction_count, gross_cents, commission_cents, payout_cents,
            partner_iban, partner_company_name, partner_vat_number)
         VALUES (:destinationId, :batchId, :partnerId, :payoutNumber, 'pending',
            :txCount, :gross, :commission, :payout,
            :iban, :companyName, :vatNumber)`,
        {
          replacements: {
            destinationId, batchId, partnerId: row.partner_id, payoutNumber,
            txCount: row.transaction_count,
            gross: row.gross_cents,
            commission: row.commission_cents,
            payout: row.payout_cents,
            iban: partner?.iban || null,
            companyName: partner?.company_name || null,
            vatNumber: partner?.vat_number || null
          },
          transaction: t
        }
      );
      const payoutId = payoutResult;

      // Link intermediary transactions to this batch + payout
      await mysqlSequelize.query(
        `UPDATE intermediary_transactions
         SET settlement_batch_id = :batchId, partner_payout_id = :payoutId
         WHERE destination_id = :destinationId
           AND partner_id = :partnerId
           AND status IN ('bevestiging','delen','reminder','review')
           AND confirmed_at IS NOT NULL
           AND confirmed_at BETWEEN :periodStart AND :periodEnd
           AND settlement_batch_id IS NULL`,
        {
          replacements: { batchId, payoutId, destinationId, partnerId: row.partner_id, periodStart, periodEnd },
          transaction: t
        }
      );
    }

    // Log
    await logFinancialEvent(destinationId, 'settlement_created', 'settlement_batch', batchId, {
      actorType: createdBy === 'system@cron' ? 'cron' : 'admin',
      actorEmail: createdBy,
      newStatus: 'draft',
      amountCents: totalPayout,
      details: { partnerCount: unsettled.length, transactionCount: totalTxCount, periodStart, periodEnd }
    }, t);

    await t.commit();
    return await getSettlementBatchById(batchId, destinationId);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// ============================================================================
// 2. SETTLEMENT BATCH — LIST
// ============================================================================

async function getSettlementBatches(destinationId, filters = {}) {
  const { status, dateFrom, dateTo, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const replacements = { limit, offset };

  if (destinationId) {
    where += ' AND sb.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }
  if (status) {
    where += ' AND sb.status = :status';
    replacements.status = status;
  }
  if (dateFrom) {
    where += ' AND sb.period_start >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }
  if (dateTo) {
    where += ' AND sb.period_end <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM settlement_batches sb ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const items = await mysqlSequelize.query(
    `SELECT sb.* FROM settlement_batches sb
     ${where}
     ORDER BY sb.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
  };
}

// ============================================================================
// 3. SETTLEMENT BATCH — DETAIL
// ============================================================================

async function getSettlementBatchById(id, destinationId) {
  let where = 'WHERE sb.id = :id';
  const replacements = { id };
  if (destinationId) {
    where += ' AND sb.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const [batch] = await mysqlSequelize.query(
    `SELECT sb.* FROM settlement_batches sb ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  if (!batch) return null;

  const payouts = await mysqlSequelize.query(
    `SELECT pp.*, p.company_name as current_company_name
     FROM partner_payouts pp
     LEFT JOIN partners p ON p.id = pp.partner_id
     WHERE pp.settlement_batch_id = :batchId
     ORDER BY pp.payout_cents DESC`,
    { replacements: { batchId: id }, type: QueryTypes.SELECT }
  );

  return { ...batch, payouts };
}

// ============================================================================
// 4. SETTLEMENT BATCH — APPROVE
// ============================================================================

async function approveSettlementBatch(id, destinationId, approvedBy) {
  const batch = await getSettlementBatchById(id, destinationId);
  if (!batch) throw new Error('Settlement batch not found');

  if (!validateTransition(SETTLEMENT_TRANSITIONS, batch.status, 'approved')) {
    throw new Error(`Invalid transition: ${batch.status} → approved`);
  }

  const t = await mysqlSequelize.transaction();
  try {
    await mysqlSequelize.query(
      `UPDATE settlement_batches SET status = 'approved', approved_at = NOW(), approved_by = :approvedBy
       WHERE id = :id`,
      { replacements: { id, approvedBy }, transaction: t }
    );

    await mysqlSequelize.query(
      `UPDATE partner_payouts SET status = 'approved', approved_at = NOW(), approved_by = :approvedBy
       WHERE settlement_batch_id = :id AND status = 'pending'`,
      { replacements: { id, approvedBy }, transaction: t }
    );

    await logFinancialEvent(destinationId, 'settlement_approved', 'settlement_batch', id, {
      actorEmail: approvedBy, oldStatus: batch.status, newStatus: 'approved',
      amountCents: batch.total_payout_cents
    }, t);

    await t.commit();
    return await getSettlementBatchById(id, destinationId);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// ============================================================================
// 5. SETTLEMENT BATCH — START PROCESSING
// ============================================================================

async function startSettlementProcessing(id, destinationId) {
  const batch = await getSettlementBatchById(id, destinationId);
  if (!batch) throw new Error('Settlement batch not found');

  if (!validateTransition(SETTLEMENT_TRANSITIONS, batch.status, 'processing')) {
    throw new Error(`Invalid transition: ${batch.status} → processing`);
  }

  await mysqlSequelize.query(
    `UPDATE settlement_batches SET status = 'processing', processing_at = NOW() WHERE id = :id`,
    { replacements: { id } }
  );

  await mysqlSequelize.query(
    `UPDATE partner_payouts SET status = 'processing'
     WHERE settlement_batch_id = :id AND status = 'approved'`,
    { replacements: { id } }
  );

  await logFinancialEvent(destinationId, 'settlement_processing', 'settlement_batch', id, {
    oldStatus: batch.status, newStatus: 'processing', amountCents: batch.total_payout_cents
  });

  return await getSettlementBatchById(id, destinationId);
}

// ============================================================================
// 6. SETTLEMENT BATCH — COMPLETE (auto-called when all payouts paid)
// ============================================================================

async function completeSettlementBatch(id, destinationId) {
  const batch = await getSettlementBatchById(id, destinationId);
  if (!batch) throw new Error('Settlement batch not found');

  if (!validateTransition(SETTLEMENT_TRANSITIONS, batch.status, 'completed')) {
    throw new Error(`Invalid transition: ${batch.status} → completed`);
  }

  // Check all payouts are paid
  const unpaid = batch.payouts?.filter(p => p.status !== 'paid' && p.status !== 'cancelled') || [];
  if (unpaid.length > 0) {
    throw new Error(`Cannot complete: ${unpaid.length} payout(s) not yet paid`);
  }

  await mysqlSequelize.query(
    `UPDATE settlement_batches SET status = 'completed', completed_at = NOW() WHERE id = :id`,
    { replacements: { id } }
  );

  await logFinancialEvent(destinationId, 'settlement_completed', 'settlement_batch', id, {
    actorType: 'system', oldStatus: batch.status, newStatus: 'completed',
    amountCents: batch.total_payout_cents
  });

  return await getSettlementBatchById(id, destinationId);
}

// ============================================================================
// 7. SETTLEMENT BATCH — CANCEL
// ============================================================================

async function cancelSettlementBatch(id, destinationId, reason) {
  const batch = await getSettlementBatchById(id, destinationId);
  if (!batch) throw new Error('Settlement batch not found');

  if (!validateTransition(SETTLEMENT_TRANSITIONS, batch.status, 'cancelled')) {
    throw new Error(`Invalid transition: ${batch.status} → cancelled`);
  }

  const t = await mysqlSequelize.transaction();
  try {
    await mysqlSequelize.query(
      `UPDATE settlement_batches SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = :reason
       WHERE id = :id`,
      { replacements: { id, reason: reason || null }, transaction: t }
    );

    await mysqlSequelize.query(
      `UPDATE partner_payouts SET status = 'cancelled', cancelled_at = NOW()
       WHERE settlement_batch_id = :id AND status IN ('pending','approved')`,
      { replacements: { id }, transaction: t }
    );

    // Release linked transactions
    await mysqlSequelize.query(
      `UPDATE intermediary_transactions
       SET settlement_batch_id = NULL, partner_payout_id = NULL
       WHERE settlement_batch_id = :id`,
      { replacements: { id }, transaction: t }
    );

    await logFinancialEvent(destinationId, 'settlement_cancelled', 'settlement_batch', id, {
      oldStatus: batch.status, newStatus: 'cancelled',
      details: { reason }
    }, t);

    await t.commit();
    return await getSettlementBatchById(id, destinationId);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// ============================================================================
// 8. PAYOUTS — LIST
// ============================================================================

async function getPayouts(destinationId, filters = {}) {
  const { partnerId, status, dateFrom, dateTo, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const replacements = { limit, offset };

  if (destinationId) {
    where += ' AND pp.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }
  if (partnerId) {
    where += ' AND pp.partner_id = :partnerId';
    replacements.partnerId = partnerId;
  }
  if (status) {
    where += ' AND pp.status = :status';
    replacements.status = status;
  }
  if (dateFrom) {
    where += ' AND pp.created_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }
  if (dateTo) {
    where += ' AND pp.created_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM partner_payouts pp ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const items = await mysqlSequelize.query(
    `SELECT pp.*, sb.batch_number, sb.period_start, sb.period_end,
            p.company_name as current_company_name
     FROM partner_payouts pp
     LEFT JOIN settlement_batches sb ON sb.id = pp.settlement_batch_id
     LEFT JOIN partners p ON p.id = pp.partner_id
     ${where}
     ORDER BY pp.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
  };
}

// ============================================================================
// 9. PAYOUTS — DETAIL
// ============================================================================

async function getPayoutById(id, destinationId) {
  let where = 'WHERE pp.id = :id';
  const replacements = { id };
  if (destinationId) {
    where += ' AND pp.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const [payout] = await mysqlSequelize.query(
    `SELECT pp.*, sb.batch_number, sb.period_start, sb.period_end,
            p.company_name as current_company_name, p.contact_email
     FROM partner_payouts pp
     LEFT JOIN settlement_batches sb ON sb.id = pp.settlement_batch_id
     LEFT JOIN partners p ON p.id = pp.partner_id
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  if (!payout) return null;

  // Get linked transactions
  const transactions = await mysqlSequelize.query(
    `SELECT it.id, it.transaction_number, it.service_type, it.activity_date,
            it.amount_cents, it.commission_cents, it.partner_amount_cents, it.status,
            it.confirmed_at, poi.name as poi_name
     FROM intermediary_transactions it
     LEFT JOIN POI poi ON poi.id = it.poi_id
     WHERE it.partner_payout_id = :payoutId
     ORDER BY it.confirmed_at ASC`,
    { replacements: { payoutId: id }, type: QueryTypes.SELECT }
  );

  return { ...payout, transactions };
}

// ============================================================================
// 10. PAYOUTS — MARK PAID
// ============================================================================

async function markPayoutPaid(id, destinationId, paidReference) {
  const payout = await getPayoutById(id, destinationId);
  if (!payout) throw new Error('Payout not found');

  if (!validateTransition(PAYOUT_TRANSITIONS, payout.status, 'paid')) {
    throw new Error(`Invalid transition: ${payout.status} → paid`);
  }

  await mysqlSequelize.query(
    `UPDATE partner_payouts SET status = 'paid', paid_at = NOW(), paid_reference = :paidReference
     WHERE id = :id`,
    { replacements: { id, paidReference: paidReference || null } }
  );

  await logFinancialEvent(destinationId, 'payout_paid', 'partner_payout', id, {
    oldStatus: payout.status, newStatus: 'paid',
    amountCents: payout.payout_cents,
    details: { paidReference, partnerId: payout.partner_id }
  });

  // Check if all payouts in batch are now paid → auto-complete batch
  const batchId = payout.settlement_batch_id;
  if (batchId) {
    const [unpaid] = await mysqlSequelize.query(
      `SELECT COUNT(*) as cnt FROM partner_payouts
       WHERE settlement_batch_id = :batchId AND status NOT IN ('paid','cancelled')`,
      { replacements: { batchId }, type: QueryTypes.SELECT }
    );
    if (unpaid.cnt === 0) {
      try {
        await completeSettlementBatch(batchId, destinationId);
      } catch (e) {
        // Don't fail the payout if batch completion fails
        console.error('[Financial] Auto-complete batch failed:', e.message);
      }
    }
  }

  return await getPayoutById(id, destinationId);
}

// ============================================================================
// 11. PAYOUTS — MARK FAILED
// ============================================================================

async function markPayoutFailed(id, destinationId, failureReason) {
  const payout = await getPayoutById(id, destinationId);
  if (!payout) throw new Error('Payout not found');

  if (!validateTransition(PAYOUT_TRANSITIONS, payout.status, 'failed')) {
    throw new Error(`Invalid transition: ${payout.status} → failed`);
  }

  await mysqlSequelize.query(
    `UPDATE partner_payouts SET status = 'failed', failed_at = NOW(), failure_reason = :failureReason
     WHERE id = :id`,
    { replacements: { id, failureReason: failureReason || null } }
  );

  await logFinancialEvent(destinationId, 'payout_failed', 'partner_payout', id, {
    oldStatus: payout.status, newStatus: 'failed',
    amountCents: payout.payout_cents,
    details: { failureReason, partnerId: payout.partner_id }
  });

  return await getPayoutById(id, destinationId);
}

// ============================================================================
// 12. CREDIT NOTES — CREATE
// ============================================================================

async function createCreditNote(payoutId, destinationId, vatRate = 21.00) {
  const payout = await getPayoutById(payoutId, destinationId);
  if (!payout) throw new Error('Payout not found');

  // Check no credit note already exists for this payout
  const [existing] = await mysqlSequelize.query(
    `SELECT id FROM credit_notes WHERE partner_payout_id = :payoutId AND status != 'voided'`,
    { replacements: { payoutId }, type: QueryTypes.SELECT }
  );
  if (existing) throw new Error('Credit note already exists for this payout');

  const creditNoteNumber = await generateCreditNoteNumber();
  const subtotalCents = payout.commission_cents;
  const vatCents = Math.round(subtotalCents * vatRate / 100);
  const totalCents = subtotalCents + vatCents;

  // Get partner details for snapshot
  const [partner] = await mysqlSequelize.query(
    'SELECT company_name, vat_number, kvk_number FROM partners WHERE id = :partnerId',
    { replacements: { partnerId: payout.partner_id }, type: QueryTypes.SELECT }
  );

  // Get period from settlement batch
  const [batch] = await mysqlSequelize.query(
    'SELECT period_start, period_end FROM settlement_batches WHERE id = :batchId',
    { replacements: { batchId: payout.settlement_batch_id }, type: QueryTypes.SELECT }
  );

  const [result] = await mysqlSequelize.query(
    `INSERT INTO credit_notes
       (destination_id, partner_payout_id, partner_id, credit_note_number,
        period_start, period_end, subtotal_cents, vat_rate, vat_cents, total_cents,
        partner_company_name, partner_vat_number, partner_kvk_number, status)
     VALUES (:destinationId, :payoutId, :partnerId, :creditNoteNumber,
        :periodStart, :periodEnd, :subtotalCents, :vatRate, :vatCents, :totalCents,
        :companyName, :vatNumber, :kvkNumber, 'draft')`,
    {
      replacements: {
        destinationId, payoutId, partnerId: payout.partner_id, creditNoteNumber,
        periodStart: batch?.period_start || null, periodEnd: batch?.period_end || null,
        subtotalCents, vatRate, vatCents, totalCents,
        companyName: partner?.company_name || payout.partner_company_name || null,
        vatNumber: partner?.vat_number || payout.partner_vat_number || null,
        kvkNumber: partner?.kvk_number || null
      }
    }
  );

  await logFinancialEvent(destinationId, 'credit_note_created', 'credit_note', result, {
    newStatus: 'draft', amountCents: totalCents,
    details: { payoutId, subtotalCents, vatRate, vatCents }
  });

  return await getCreditNoteById(result, destinationId);
}

// ============================================================================
// 13. CREDIT NOTES — LIST
// ============================================================================

async function getCreditNotes(destinationId, filters = {}) {
  const { partnerId, status, dateFrom, dateTo, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const replacements = { limit, offset };

  if (destinationId) {
    where += ' AND cn.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }
  if (partnerId) {
    where += ' AND cn.partner_id = :partnerId';
    replacements.partnerId = partnerId;
  }
  if (status) {
    where += ' AND cn.status = :status';
    replacements.status = status;
  }
  if (dateFrom) {
    where += ' AND cn.created_at >= :dateFrom';
    replacements.dateFrom = dateFrom;
  }
  if (dateTo) {
    where += ' AND cn.created_at <= :dateTo';
    replacements.dateTo = dateTo;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM credit_notes cn ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const items = await mysqlSequelize.query(
    `SELECT cn.*, pp.payout_number
     FROM credit_notes cn
     LEFT JOIN partner_payouts pp ON pp.id = cn.partner_payout_id
     ${where}
     ORDER BY cn.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
  };
}

// ============================================================================
// 14. CREDIT NOTES — DETAIL
// ============================================================================

async function getCreditNoteById(id, destinationId) {
  let where = 'WHERE cn.id = :id';
  const replacements = { id };
  if (destinationId) {
    where += ' AND cn.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const [note] = await mysqlSequelize.query(
    `SELECT cn.*, pp.payout_number, pp.payout_cents, pp.gross_cents as payout_gross_cents
     FROM credit_notes cn
     LEFT JOIN partner_payouts pp ON pp.id = cn.partner_payout_id
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  return note || null;
}

// ============================================================================
// 15. CREDIT NOTES — FINALIZE
// ============================================================================

async function finalizeCreditNote(id, destinationId) {
  const note = await getCreditNoteById(id, destinationId);
  if (!note) throw new Error('Credit note not found');

  if (!validateTransition(CREDIT_NOTE_TRANSITIONS, note.status, 'final')) {
    throw new Error(`Invalid transition: ${note.status} → final`);
  }

  await mysqlSequelize.query(
    `UPDATE credit_notes SET status = 'final', finalized_at = NOW() WHERE id = :id`,
    { replacements: { id } }
  );

  await logFinancialEvent(destinationId, 'credit_note_finalized', 'credit_note', id, {
    oldStatus: note.status, newStatus: 'final', amountCents: note.total_cents
  });

  return await getCreditNoteById(id, destinationId);
}

// ============================================================================
// 16. FINANCIAL DASHBOARD
// ============================================================================

async function getFinancialDashboard(destinationId, dateFrom, dateTo) {
  let destWhere = '';
  const replacements = {};
  if (destinationId) {
    destWhere = 'AND destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  let dateWhere = '';
  if (dateFrom) { dateWhere += ' AND created_at >= :dateFrom'; replacements.dateFrom = dateFrom; }
  if (dateTo) { dateWhere += ' AND created_at <= :dateTo'; replacements.dateTo = dateTo; }

  // Settlement stats
  const [settlementStats] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
       SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
     FROM settlement_batches
     WHERE 1=1 ${destWhere} ${dateWhere}`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Payout stats
  const [payoutStats] = await mysqlSequelize.query(
    `SELECT
       SUM(gross_cents) as total_gross_cents,
       SUM(commission_cents) as total_commission_cents,
       SUM(payout_cents) as total_payout_cents,
       SUM(CASE WHEN status IN ('pending','approved','processing') THEN payout_cents ELSE 0 END) as pending_payout_cents,
       SUM(CASE WHEN status = 'paid' THEN payout_cents ELSE 0 END) as paid_payout_cents,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
     FROM partner_payouts
     WHERE 1=1 ${destWhere} ${dateWhere}`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Credit note stats
  const [creditNoteStats] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
       SUM(CASE WHEN status = 'final' THEN 1 ELSE 0 END) as final_count,
       SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) as voided,
       SUM(CASE WHEN status = 'final' THEN total_cents ELSE 0 END) as total_cents
     FROM credit_notes
     WHERE 1=1 ${destWhere} ${dateWhere}`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Unsettled transactions
  const unsettledReplacements = {};
  let unsettledDestWhere = '';
  if (destinationId) {
    unsettledDestWhere = 'AND destination_id = :destinationId';
    unsettledReplacements.destinationId = destinationId;
  }
  const [unsettled] = await mysqlSequelize.query(
    `SELECT COUNT(*) as transaction_count, COALESCE(SUM(partner_amount_cents), 0) as total_cents
     FROM intermediary_transactions
     WHERE status IN ('bevestiging','delen','reminder','review')
       AND confirmed_at IS NOT NULL
       AND settlement_batch_id IS NULL
       ${unsettledDestWhere}`,
    { replacements: unsettledReplacements, type: QueryTypes.SELECT }
  );

  return {
    settlements: settlementStats || {},
    payouts: {
      total_gross_cents: payoutStats?.total_gross_cents || 0,
      total_commission_cents: payoutStats?.total_commission_cents || 0,
      total_payout_cents: payoutStats?.total_payout_cents || 0,
      pending_payout_cents: payoutStats?.pending_payout_cents || 0,
      paid_payout_cents: payoutStats?.paid_payout_cents || 0,
      failed_count: payoutStats?.failed_count || 0
    },
    credit_notes: creditNoteStats || {},
    unsettled: {
      transaction_count: unsettled?.transaction_count || 0,
      total_cents: unsettled?.total_cents || 0
    }
  };
}

// ============================================================================
// 17. MONTHLY REPORT
// ============================================================================

async function getMonthlyReport(destinationId, year) {
  const replacements = { year: parseInt(year) };
  let destWhere = '';
  if (destinationId) {
    destWhere = 'AND sb.destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const months = await mysqlSequelize.query(
    `SELECT
       MONTH(sb.period_start) as month,
       COUNT(DISTINCT sb.id) as settlement_count,
       SUM(pp.gross_cents) as gross_cents,
       SUM(pp.commission_cents) as commission_cents,
       SUM(pp.payout_cents) as payout_cents,
       SUM(pp.transaction_count) as transaction_count
     FROM partner_payouts pp
     JOIN settlement_batches sb ON sb.id = pp.settlement_batch_id
     WHERE YEAR(sb.period_start) = :year
       AND sb.status NOT IN ('cancelled')
       ${destWhere}
     GROUP BY MONTH(sb.period_start)
     ORDER BY MONTH(sb.period_start)`,
    { replacements, type: QueryTypes.SELECT }
  );

  // Fill in all 12 months
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const found = months.find(r => r.month === m);
    result.push({
      month: m,
      settlement_count: found?.settlement_count || 0,
      gross_cents: found?.gross_cents || 0,
      commission_cents: found?.commission_cents || 0,
      payout_cents: found?.payout_cents || 0,
      transaction_count: found?.transaction_count || 0
    });
  }

  return result;
}

// ============================================================================
// 18-21. CSV EXPORTS
// ============================================================================

async function exportPayoutsCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       pp.payout_number, pp.partner_company_name as partner, pp.partner_iban as iban,
       ROUND(pp.gross_cents / 100, 2) as gross_eur,
       ROUND(pp.commission_cents / 100, 2) as commission_eur,
       ROUND(pp.payout_cents / 100, 2) as payout_eur,
       pp.status, pp.paid_at, pp.paid_reference,
       sb.batch_number, sb.period_start, sb.period_end
     FROM partner_payouts pp
     JOIN settlement_batches sb ON sb.id = pp.settlement_batch_id
     WHERE pp.destination_id = :destinationId
       AND pp.created_at BETWEEN :dateFrom AND :dateTo
     ORDER BY pp.created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['payout_number', 'partner', 'iban', 'gross_eur', 'commission_eur',
    'payout_eur', 'status', 'paid_at', 'paid_reference', 'batch_number', 'period_start', 'period_end'];
  const filename = `payouts_${destinationId}_${dateFrom}_${dateTo}.csv`;
  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

async function exportCreditNotesCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       cn.credit_note_number, cn.partner_company_name as partner, cn.partner_vat_number as vat_number,
       cn.period_start, cn.period_end,
       ROUND(cn.subtotal_cents / 100, 2) as subtotal_eur,
       cn.vat_rate, ROUND(cn.vat_cents / 100, 2) as vat_eur,
       ROUND(cn.total_cents / 100, 2) as total_eur,
       cn.status, cn.finalized_at
     FROM credit_notes cn
     WHERE cn.destination_id = :destinationId
       AND cn.created_at BETWEEN :dateFrom AND :dateTo
     ORDER BY cn.created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['credit_note_number', 'partner', 'vat_number', 'period_start', 'period_end',
    'subtotal_eur', 'vat_rate', 'vat_eur', 'total_eur', 'status', 'finalized_at'];
  const filename = `credit_notes_${destinationId}_${dateFrom}_${dateTo}.csv`;
  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

async function exportAuditLogCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       created_at as timestamp, event_type, entity_type, entity_id,
       actor_type, actor_email as actor,
       old_status, new_status,
       ROUND(amount_cents / 100, 2) as amount_eur
     FROM financial_audit_log
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo
     ORDER BY created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['timestamp', 'event_type', 'entity_type', 'entity_id',
    'actor_type', 'actor', 'old_status', 'new_status', 'amount_eur'];
  const filename = `financial_audit_${destinationId}_${dateFrom}_${dateTo}.csv`;
  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

async function exportTaxSummaryCSV(destinationId, year) {
  const rows = await mysqlSequelize.query(
    `SELECT
       p.company_name as partner, p.vat_number, p.kvk_number,
       SUM(pp.gross_cents) as gross_cents,
       ROUND(SUM(pp.gross_cents) / 100, 2) as gross_eur,
       SUM(pp.commission_cents) as commission_cents,
       ROUND(SUM(pp.commission_cents) / 100, 2) as commission_eur,
       SUM(pp.payout_cents) as payout_cents,
       ROUND(SUM(pp.payout_cents) / 100, 2) as payout_eur,
       SUM(pp.transaction_count) as transaction_count,
       COUNT(DISTINCT cn.id) as credit_note_count,
       ROUND(COALESCE(SUM(cn.vat_cents), 0) / 100, 2) as total_vat_eur
     FROM partner_payouts pp
     JOIN settlement_batches sb ON sb.id = pp.settlement_batch_id
     JOIN partners p ON p.id = pp.partner_id
     LEFT JOIN credit_notes cn ON cn.partner_payout_id = pp.id AND cn.status = 'final'
     WHERE pp.destination_id = :destinationId
       AND YEAR(sb.period_start) = :year
       AND sb.status NOT IN ('cancelled')
       AND pp.status NOT IN ('cancelled')
     GROUP BY pp.partner_id
     ORDER BY payout_eur DESC
     LIMIT 10000`,
    { replacements: { destinationId, year: parseInt(year) }, type: QueryTypes.SELECT }
  );

  const headers = ['partner', 'vat_number', 'kvk_number', 'gross_eur', 'commission_eur',
    'total_vat_eur', 'payout_eur', 'transaction_count', 'credit_note_count'];
  const filename = `tax_summary_${destinationId}_${year}.csv`;
  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

// ============================================================================
// 22. AUDIT LOG — LIST
// ============================================================================

async function getAuditLog(destinationId, filters = {}) {
  const { entityType, entityId, eventType, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const replacements = { limit, offset };

  if (destinationId) {
    where += ' AND destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }
  if (entityType) {
    where += ' AND entity_type = :entityType';
    replacements.entityType = entityType;
  }
  if (entityId) {
    where += ' AND entity_id = :entityId';
    replacements.entityId = entityId;
  }
  if (eventType) {
    where += ' AND event_type = :eventType';
    replacements.eventType = eventType;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM financial_audit_log ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const items = await mysqlSequelize.query(
    `SELECT * FROM financial_audit_log
     ${where}
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Settlement batches
  createSettlementBatch,
  getSettlementBatches,
  getSettlementBatchById,
  approveSettlementBatch,
  startSettlementProcessing,
  completeSettlementBatch,
  cancelSettlementBatch,
  // Partner payouts
  getPayouts,
  getPayoutById,
  markPayoutPaid,
  markPayoutFailed,
  // Credit notes
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  finalizeCreditNote,
  // Dashboard & reports
  getFinancialDashboard,
  getMonthlyReport,
  // CSV exports
  exportPayoutsCSV,
  exportCreditNotesCSV,
  exportAuditLogCSV,
  exportTaxSummaryCSV,
  // Audit log
  getAuditLog,
  logFinancialEvent
};
