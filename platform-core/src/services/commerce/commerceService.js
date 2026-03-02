/**
 * Commerce Service — Fase III Blok E
 *
 * READ-ONLY aggregatie service over Payment + Ticketing + Reservation tabellen.
 * Geen nieuwe database tabellen nodig.
 *
 * Functies:
 *   getDashboard — Revenue/ticket/reservation KPIs voor een periode
 *   getDailyReport / getWeeklyReport / getMonthlyReport — Financial reports
 *   getReconciliationReport — Transactie-detail per dag (voor Adyen vergelijking)
 *   exportTransactionsCSV / exportReservationsCSV / exportTicketOrdersCSV — CSV export
 *   getAlerts — Regel-gebaseerde anomalie detectie (6 alert types)
 *   getTopPOIs — Top performing POIs per metric
 *
 * Alle queries: destination_id filter, bedragen in CENTEN, date ranges als parameters.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// 1. REVENUE DASHBOARD
// ============================================================================

async function getDashboard(destinationId, dateFrom, dateTo) {
  // Revenue aggregatie
  const [revenueRow] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total_transactions,
       SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END) as total_revenue_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'ticket' THEN amount_cents ELSE 0 END) as ticket_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'reservation' THEN amount_cents ELSE 0 END) as reservation_deposit_cents,
       SUM(CASE WHEN status = 'captured' THEN 1 ELSE 0 END) as successful,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
       SUM(CASE WHEN status IN ('refunded', 'partially_refunded') THEN 1 ELSE 0 END) as refunded_count
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  // Refund totaal
  const [refundRow] = await mysqlSequelize.query(
    `SELECT COALESCE(SUM(amount_cents), 0) as total_refunds_cents
     FROM payment_refunds
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  // Ticket statistieken
  const [ticketRow] = await mysqlSequelize.query(
    `SELECT
       COALESCE(SUM(toi.quantity), 0) as tickets_sold,
       COALESCE(SUM(CASE WHEN tor.qr_code_validated = 1 THEN toi.quantity ELSE 0 END), 0) as tickets_validated,
       COALESCE(SUM(CASE WHEN tor.status = 'cancelled' THEN toi.quantity ELSE 0 END), 0) as tickets_cancelled
     FROM ticket_orders tor
     LEFT JOIN ticket_order_items toi ON toi.order_id = tor.id
     WHERE tor.destination_id = :destinationId
       AND tor.created_at BETWEEN :dateFrom AND :dateTo`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  // Reservation statistieken
  const [resRow] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total_reservations,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
       SUM(CASE WHEN status LIKE 'cancelled%' THEN 1 ELSE 0 END) as cancelled,
       COALESCE(AVG(party_size), 0) as avg_party_size
     FROM reservations
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  // Bezettingsgraad
  const [occRow] = await mysqlSequelize.query(
    `SELECT
       COALESCE(SUM(reserved_seats), 0) as total_reserved,
       COALESCE(SUM(total_seats), 0) as total_capacity
     FROM reservation_slots
     WHERE destination_id = :destinationId
       AND slot_date BETWEEN :dateFrom AND :dateTo`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const r = revenueRow || {};
  const totalRevenue = Number(r.total_revenue_cents) || 0;
  const totalRefunds = Number(refundRow?.total_refunds_cents) || 0;
  const totalTx = Number(r.total_transactions) || 0;
  const successfulTx = Number(r.successful) || 0;
  const t = ticketRow || {};
  const res = resRow || {};
  const occ = occRow || {};
  const totalCap = Number(occ.total_capacity) || 0;
  const totalRes = Number(res.total_reservations) || 0;

  const dashboard = {
    period: { from: dateFrom, to: dateTo },
    revenue: {
      total_cents: totalRevenue,
      ticket_cents: Number(r.ticket_cents) || 0,
      reservation_deposit_cents: Number(r.reservation_deposit_cents) || 0,
      refunds_cents: totalRefunds,
      net_revenue_cents: totalRevenue - totalRefunds
    },
    transactions: {
      total: totalTx,
      successful: successfulTx,
      failed: Number(r.failed_count) || 0,
      refunded: Number(r.refunded_count) || 0,
      success_rate: totalTx > 0 ? (successfulTx / totalTx * 100).toFixed(1) : '0.0'
    },
    tickets: {
      sold: Number(t.tickets_sold) || 0,
      validated: Number(t.tickets_validated) || 0,
      cancelled: Number(t.tickets_cancelled) || 0,
      validation_rate: Number(t.tickets_sold) > 0
        ? (Number(t.tickets_validated) / Number(t.tickets_sold) * 100).toFixed(1) : '0.0'
    },
    reservations: {
      created: totalRes,
      completed: Number(res.completed) || 0,
      no_shows: Number(res.no_shows) || 0,
      cancelled: Number(res.cancelled) || 0,
      no_show_rate: totalRes > 0
        ? (Number(res.no_shows) / totalRes * 100).toFixed(1) : '0.0',
      avg_party_size: Number(Number(res.avg_party_size).toFixed(1)) || 0,
      occupancy_rate: totalCap > 0
        ? (Number(occ.total_reserved) / totalCap * 100).toFixed(1) : '0.0'
    },
    empty: totalRevenue === 0 && totalTx === 0 && Number(t.tickets_sold) === 0 && totalRes === 0
  };

  return dashboard;
}

// ============================================================================
// 2. FINANCIAL REPORTS
// ============================================================================

async function getDailyReport(destinationId, dateFrom, dateTo) {
  const revenueRows = await mysqlSequelize.query(
    `SELECT
       DATE(created_at) as date,
       COUNT(*) as transactions,
       SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END) as revenue_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'ticket' THEN amount_cents ELSE 0 END) as ticket_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'reservation' THEN amount_cents ELSE 0 END) as deposit_cents
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const refundRows = await mysqlSequelize.query(
    `SELECT DATE(created_at) as date, SUM(amount_cents) as refunds_cents
     FROM payment_refunds
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo
     GROUP BY DATE(created_at)`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const refundMap = {};
  for (const r of refundRows) {
    refundMap[r.date] = Number(r.refunds_cents) || 0;
  }

  return revenueRows.map(row => {
    const refunds = refundMap[row.date] || 0;
    return {
      date: row.date,
      transactions: Number(row.transactions),
      revenue_cents: Number(row.revenue_cents) || 0,
      ticket_cents: Number(row.ticket_cents) || 0,
      deposit_cents: Number(row.deposit_cents) || 0,
      refunds_cents: refunds,
      net_cents: (Number(row.revenue_cents) || 0) - refunds
    };
  });
}

async function getWeeklyReport(destinationId, dateFrom, dateTo) {
  const revenueRows = await mysqlSequelize.query(
    `SELECT
       YEAR(created_at) as year,
       WEEKOFYEAR(created_at) as week,
       MIN(DATE(created_at)) as week_start,
       COUNT(*) as transactions,
       SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END) as revenue_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'ticket' THEN amount_cents ELSE 0 END) as ticket_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'reservation' THEN amount_cents ELSE 0 END) as deposit_cents
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo
     GROUP BY YEAR(created_at), WEEKOFYEAR(created_at)
     ORDER BY year ASC, week ASC`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const refundRows = await mysqlSequelize.query(
    `SELECT YEAR(created_at) as year, WEEKOFYEAR(created_at) as week, SUM(amount_cents) as refunds_cents
     FROM payment_refunds
     WHERE destination_id = :destinationId
       AND created_at BETWEEN :dateFrom AND :dateTo
     GROUP BY YEAR(created_at), WEEKOFYEAR(created_at)`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const refundMap = {};
  for (const r of refundRows) {
    refundMap[`${r.year}-${r.week}`] = Number(r.refunds_cents) || 0;
  }

  return revenueRows.map(row => {
    const refunds = refundMap[`${row.year}-${row.week}`] || 0;
    return {
      year: Number(row.year),
      week: Number(row.week),
      week_start: row.week_start,
      transactions: Number(row.transactions),
      revenue_cents: Number(row.revenue_cents) || 0,
      ticket_cents: Number(row.ticket_cents) || 0,
      deposit_cents: Number(row.deposit_cents) || 0,
      refunds_cents: refunds,
      net_cents: (Number(row.revenue_cents) || 0) - refunds
    };
  });
}

async function getMonthlyReport(destinationId, year) {
  const MONTH_NAMES = {
    nl: ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  };

  const revenueRows = await mysqlSequelize.query(
    `SELECT
       MONTH(created_at) as month,
       COUNT(*) as transactions,
       SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END) as revenue_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'ticket' THEN amount_cents ELSE 0 END) as ticket_cents,
       SUM(CASE WHEN status = 'captured' AND order_type = 'reservation' THEN amount_cents ELSE 0 END) as deposit_cents
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND YEAR(created_at) = :year
     GROUP BY MONTH(created_at)`,
    { replacements: { destinationId, year }, type: QueryTypes.SELECT }
  );

  const refundRows = await mysqlSequelize.query(
    `SELECT MONTH(created_at) as month, SUM(amount_cents) as refunds_cents
     FROM payment_refunds
     WHERE destination_id = :destinationId
       AND YEAR(created_at) = :year
     GROUP BY MONTH(created_at)`,
    { replacements: { destinationId, year }, type: QueryTypes.SELECT }
  );

  const revenueMap = {};
  for (const r of revenueRows) revenueMap[r.month] = r;
  const refundMap = {};
  for (const r of refundRows) refundMap[r.month] = Number(r.refunds_cents) || 0;

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const row = revenueMap[m] || {};
    const refunds = refundMap[m] || 0;
    const rev = Number(row.revenue_cents) || 0;
    months.push({
      month: m,
      month_names: {
        nl: MONTH_NAMES.nl[m - 1],
        en: MONTH_NAMES.en[m - 1],
        de: MONTH_NAMES.de[m - 1],
        es: MONTH_NAMES.es[m - 1]
      },
      transactions: Number(row.transactions) || 0,
      revenue_cents: rev,
      ticket_cents: Number(row.ticket_cents) || 0,
      deposit_cents: Number(row.deposit_cents) || 0,
      refunds_cents: refunds,
      net_cents: rev - refunds
    });
  }
  return months;
}

// ============================================================================
// 3. RECONCILIATION REPORT
// ============================================================================

async function getReconciliationReport(destinationId, date) {
  const transactions = await mysqlSequelize.query(
    `SELECT
       id, adyen_psp_reference, adyen_merchant_reference, amount_cents,
       currency, status, adyen_payment_method, order_type, order_id, created_at
     FROM payment_transactions
     WHERE destination_id = :destinationId AND DATE(created_at) = :date
     ORDER BY created_at ASC`,
    { replacements: { destinationId, date }, type: QueryTypes.SELECT }
  );

  const refunds = await mysqlSequelize.query(
    `SELECT
       pr.id, pr.transaction_id, pt.adyen_psp_reference,
       pr.amount_cents as refund_amount_cents, pr.reason, pr.status, pr.created_at
     FROM payment_refunds pr
     JOIN payment_transactions pt ON pt.id = pr.transaction_id
     WHERE pr.destination_id = :destinationId AND DATE(pr.created_at) = :date
     ORDER BY pr.created_at ASC`,
    { replacements: { destinationId, date }, type: QueryTypes.SELECT }
  );

  const totalCaptured = transactions
    .filter(t => t.status === 'captured')
    .reduce((sum, t) => sum + Number(t.amount_cents), 0);
  const totalRefunded = refunds
    .filter(r => r.status === 'processed')
    .reduce((sum, r) => sum + Number(r.refund_amount_cents), 0);

  return {
    date,
    destination_id: destinationId,
    transactions,
    refunds,
    summary: {
      total_captured_cents: totalCaptured,
      total_refunded_cents: totalRefunded,
      net_cents: totalCaptured - totalRefunded,
      transaction_count: transactions.length,
      refund_count: refunds.length
    },
    reconciliation_note: 'Compare this report with Adyen Merchant Portal settlements for the specified date.'
  };
}

// ============================================================================
// 4. CSV EXPORT
// ============================================================================

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

async function exportTransactionsCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       id, transaction_uuid, adyen_psp_reference, adyen_merchant_reference,
       order_type, amount_cents, ROUND(amount_cents / 100, 2) as amount_eur,
       currency, status, adyen_payment_method,
       guest_email, created_at, updated_at
     FROM payment_transactions pt
     LEFT JOIN (
       SELECT id as oid, guest_email FROM ticket_orders
       UNION ALL
       SELECT id as oid, guest_email FROM reservations
     ) orders ON orders.oid = pt.order_id
     WHERE pt.destination_id = :destinationId
       AND pt.created_at BETWEEN :dateFrom AND :dateTo
     ORDER BY pt.created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['id', 'transaction_uuid', 'adyen_psp_reference', 'adyen_merchant_reference',
    'order_type', 'amount_cents', 'amount_eur', 'currency', 'status',
    'adyen_payment_method', 'guest_email', 'created_at', 'updated_at'];

  const destCode = { 1: 'calpe', 2: 'texel', 3: 'alicante', 4: 'warrewijzer' };
  const filename = `commerce_transactions_${destCode[destinationId] || destinationId}_${dateFrom}_${dateTo}.csv`;

  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

async function exportReservationsCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       r.reservation_number, p.name as poi_name, r.guest_name, r.guest_email,
       rs.slot_date as date, rs.slot_time_start as time,
       r.party_size, r.status, r.deposit_cents,
       ROUND(r.deposit_cents / 100, 2) as deposit_eur,
       r.special_requests, r.created_at
     FROM reservations r
     JOIN reservation_slots rs ON rs.id = r.slot_id
     LEFT JOIN POI p ON p.id = r.poi_id
     WHERE r.destination_id = :destinationId
       AND r.created_at BETWEEN :dateFrom AND :dateTo
     ORDER BY r.created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['reservation_number', 'poi_name', 'guest_name', 'guest_email',
    'date', 'time', 'party_size', 'status', 'deposit_cents', 'deposit_eur',
    'special_requests', 'created_at'];

  const destCode = { 1: 'calpe', 2: 'texel', 3: 'alicante', 4: 'warrewijzer' };
  const filename = `commerce_reservations_${destCode[destinationId] || destinationId}_${dateFrom}_${dateTo}.csv`;

  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

async function exportTicketOrdersCSV(destinationId, dateFrom, dateTo) {
  const rows = await mysqlSequelize.query(
    `SELECT
       tor.order_number, tor.guest_email, tor.guest_name,
       GROUP_CONCAT(CONCAT(t.name, ' x', toi.quantity) SEPARATOR '; ') as items,
       tor.subtotal_cents, tor.discount_cents, tor.total_cents,
       ROUND(tor.total_cents / 100, 2) as total_eur,
       tor.status, tor.qr_code_validated, tor.created_at
     FROM ticket_orders tor
     LEFT JOIN ticket_order_items toi ON toi.order_id = tor.id
     LEFT JOIN tickets t ON t.id = toi.ticket_id
     WHERE tor.destination_id = :destinationId
       AND tor.created_at BETWEEN :dateFrom AND :dateTo
     GROUP BY tor.id
     ORDER BY tor.created_at ASC
     LIMIT 10000`,
    { replacements: { destinationId, dateFrom, dateTo }, type: QueryTypes.SELECT }
  );

  const headers = ['order_number', 'guest_email', 'guest_name', 'items',
    'subtotal_cents', 'discount_cents', 'total_cents', 'total_eur',
    'status', 'qr_code_validated', 'created_at'];

  const destCode = { 1: 'calpe', 2: 'texel', 3: 'alicante', 4: 'warrewijzer' };
  const filename = `commerce_ticket_orders_${destCode[destinationId] || destinationId}_${dateFrom}_${dateTo}.csv`;

  return { csv: buildCSV(headers, rows), filename, row_count: rows.length };
}

// ============================================================================
// 5. FRAUD / ANOMALY ALERTS
// ============================================================================

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

async function getAlerts(destinationId) {
  const alerts = [];

  // ALERT 1: Chargebacks (CRITICAL)
  const chargebacks = await mysqlSequelize.query(
    `SELECT id, amount_cents, adyen_psp_reference, created_at
     FROM payment_transactions
     WHERE destination_id = :destinationId AND status = 'chargeback'
       AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  for (const cb of chargebacks) {
    alerts.push({
      type: 'chargeback',
      severity: 'critical',
      description: `Chargeback on transaction ${cb.adyen_psp_reference || cb.id} (${cb.amount_cents} cents)`,
      transaction_id: cb.id,
      created_at: cb.created_at
    });
  }

  // ALERT 2: Low success rate (WARNING)
  const [successRate] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'captured' THEN 1 ELSE 0 END) as successful
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  if (successRate && Number(successRate.total) > 5) {
    const rate = Number(successRate.successful) / Number(successRate.total) * 100;
    if (rate < 80) {
      alerts.push({
        type: 'low_success_rate',
        severity: 'warning',
        description: `Payment success rate ${rate.toFixed(1)}% (last 24h, ${successRate.total} transactions)`,
        created_at: new Date().toISOString()
      });
    }
  }

  // ALERT 3: Unusual amount (INFO)
  const [stats] = await mysqlSequelize.query(
    `SELECT AVG(amount_cents) as avg_cents, STDDEV(amount_cents) as std_cents
     FROM payment_transactions
     WHERE destination_id = :destinationId AND status = 'captured'
       AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  if (stats && Number(stats.avg_cents) > 0 && Number(stats.std_cents) > 0) {
    const threshold = Number(stats.avg_cents) + 2 * Number(stats.std_cents);
    const unusual = await mysqlSequelize.query(
      `SELECT id, amount_cents, adyen_psp_reference, created_at
       FROM payment_transactions
       WHERE destination_id = :destinationId AND status = 'captured'
         AND amount_cents > :threshold
         AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      { replacements: { destinationId, threshold }, type: QueryTypes.SELECT }
    );
    for (const tx of unusual) {
      alerts.push({
        type: 'unusual_amount',
        severity: 'info',
        description: `Unusual amount ${tx.amount_cents} cents on transaction ${tx.adyen_psp_reference || tx.id} (avg: ${Math.round(stats.avg_cents)} cents)`,
        transaction_id: tx.id,
        created_at: tx.created_at
      });
    }
  }

  // ALERT 4: Multiple refunds same customer (WARNING)
  const multiRefunds = await mysqlSequelize.query(
    `SELECT tor.guest_email, COUNT(*) as refund_count
     FROM payment_refunds pr
     JOIN payment_transactions pt ON pt.id = pr.transaction_id
     LEFT JOIN ticket_orders tor ON tor.id = pt.order_id AND pt.order_type = 'ticket'
     WHERE pr.destination_id = :destinationId
       AND pr.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND tor.guest_email IS NOT NULL
     GROUP BY tor.guest_email
     HAVING refund_count >= 3`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  for (const mr of multiRefunds) {
    alerts.push({
      type: 'multiple_refunds',
      severity: 'warning',
      description: `${mr.refund_count} refunds in 30 days for same customer`,
      created_at: new Date().toISOString()
    });
  }

  // ALERT 5: Rapid transactions from same IP (WARNING)
  const rapidTx = await mysqlSequelize.query(
    `SELECT ip_address, COUNT(*) as tx_count,
       MIN(created_at) as first_tx, MAX(created_at) as last_tx
     FROM payment_transactions
     WHERE destination_id = :destinationId
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
       AND ip_address IS NOT NULL
     GROUP BY ip_address
     HAVING tx_count >= 5
       AND TIMESTAMPDIFF(MINUTE, first_tx, last_tx) < 10`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  for (const rt of rapidTx) {
    alerts.push({
      type: 'rapid_transactions',
      severity: 'warning',
      description: `${rt.tx_count} transactions from same IP in ${Math.round((new Date(rt.last_tx) - new Date(rt.first_tx)) / 60000)} minutes`,
      created_at: rt.last_tx
    });
  }

  // ALERT 6: No-show spike (WARNING)
  const [recentNoShow] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
     FROM reservations
     WHERE destination_id = :destinationId
       AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  const [baselineNoShow] = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
     FROM reservations
     WHERE destination_id = :destinationId
       AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    { replacements: { destinationId }, type: QueryTypes.SELECT }
  );
  if (recentNoShow && Number(recentNoShow.total) > 5 && baselineNoShow && Number(baselineNoShow.total) > 10) {
    const recentRate = Number(recentNoShow.no_shows) / Number(recentNoShow.total) * 100;
    const baselineRate = Number(baselineNoShow.no_shows) / Number(baselineNoShow.total) * 100;
    if (recentRate > baselineRate + 20) {
      alerts.push({
        type: 'noshow_spike',
        severity: 'warning',
        description: `No-show rate ${recentRate.toFixed(1)}% (7d) vs ${baselineRate.toFixed(1)}% (30d baseline)`,
        created_at: new Date().toISOString()
      });
    }
  }

  alerts.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));

  return {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    alerts
  };
}

// ============================================================================
// 6. TOP PERFORMERS — POI Ranking
// ============================================================================

async function getTopPOIs(destinationId, dateFrom, dateTo, metric = 'revenue', limit = 10) {
  let query;

  switch (metric) {
    case 'revenue':
      query = `SELECT p.id as poi_id, p.name as poi_name, p.category,
                 SUM(toi.total_price_cents) as value
               FROM ticket_order_items toi
               JOIN ticket_orders tor ON tor.id = toi.order_id
               JOIN tickets t ON t.id = toi.ticket_id
               JOIN POI p ON p.id = t.poi_id
               WHERE tor.destination_id = :destinationId
                 AND tor.status IN ('paid', 'confirmed')
                 AND tor.created_at BETWEEN :dateFrom AND :dateTo
               GROUP BY p.id, p.name, p.category
               ORDER BY value DESC
               LIMIT :limit`;
      break;

    case 'tickets_sold':
      query = `SELECT p.id as poi_id, p.name as poi_name, p.category,
                 SUM(toi.quantity) as value
               FROM ticket_order_items toi
               JOIN ticket_orders tor ON tor.id = toi.order_id
               JOIN tickets t ON t.id = toi.ticket_id
               JOIN POI p ON p.id = t.poi_id
               WHERE tor.destination_id = :destinationId
                 AND tor.status IN ('paid', 'confirmed')
                 AND tor.created_at BETWEEN :dateFrom AND :dateTo
               GROUP BY p.id, p.name, p.category
               ORDER BY value DESC
               LIMIT :limit`;
      break;

    case 'reservations':
      query = `SELECT p.id as poi_id, p.name as poi_name, p.category,
                 COUNT(*) as value
               FROM reservations r
               JOIN POI p ON p.id = r.poi_id
               WHERE r.destination_id = :destinationId
                 AND r.status NOT IN ('expired', 'cancelled_by_guest', 'cancelled_by_venue')
                 AND r.created_at BETWEEN :dateFrom AND :dateTo
               GROUP BY p.id, p.name, p.category
               ORDER BY value DESC
               LIMIT :limit`;
      break;

    case 'occupancy':
      query = `SELECT p.id as poi_id, p.name as poi_name, p.category,
                 ROUND(SUM(rs.reserved_seats) / NULLIF(SUM(rs.total_seats), 0) * 100, 1) as value
               FROM reservation_slots rs
               JOIN POI p ON p.id = rs.poi_id
               WHERE rs.destination_id = :destinationId
                 AND rs.slot_date BETWEEN :dateFrom AND :dateTo
               GROUP BY p.id, p.name, p.category
               HAVING value IS NOT NULL
               ORDER BY value DESC
               LIMIT :limit`;
      break;

    default:
      return [];
  }

  const rows = await mysqlSequelize.query(query, {
    replacements: { destinationId, dateFrom, dateTo, limit: Number(limit) },
    type: QueryTypes.SELECT
  });

  return rows.map((row, idx) => ({
    rank: idx + 1,
    poi_id: row.poi_id,
    poi_name: row.poi_name,
    category: row.category,
    value: Number(row.value) || 0
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getDashboard,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getReconciliationReport,
  exportTransactionsCSV,
  exportReservationsCSV,
  exportTicketOrdersCSV,
  getAlerts,
  getTopPOIs
};
