/**
 * De Kassier — Financial Monitor Agent (Fase IV Blok D)
 *
 * Daily financial reconciliation, anomaly detection, settlement alerts,
 * and fraud indicator monitoring.
 *
 * Type B: shared/platform-wide. Schedule: daily 06:30.
 *
 * Checks:
 *   1. Reconciliation: settlement totals vs transaction sums
 *   2. Anomaly detection: amounts outside 2σ baseline (3σ during bootstrap)
 *   3. Outstanding settlements: >7 days without completion
 *   4. Fraud indicators: same customer × same POI × <1h
 *
 * @module agents/financialMonitor/index
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import { logAgent, logAlert } from '../../orchestrator/auditTrail/index.js';
import mongoose from 'mongoose';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// MONGODB SCHEMA
// ============================================================================

const financialMonitorResultSchema = new mongoose.Schema({
  timestamp:         { type: Date, default: Date.now },
  reconciliation:    mongoose.Schema.Types.Mixed,
  anomalies:         [mongoose.Schema.Types.Mixed],
  settlement_alerts: [mongoose.Schema.Types.Mixed],
  fraud_indicators:  [mongoose.Schema.Types.Mixed],
  summary:           mongoose.Schema.Types.Mixed
}, { collection: 'financial_monitor_results' });

let FinancialMonitorResult;
FinancialMonitorResult = mongoose.models.FinancialMonitorResult || mongoose.model('FinancialMonitorResult', financialMonitorResultSchema);

// ============================================================================
// DE KASSIER
// ============================================================================

class FinancialMonitor {
  constructor() {
    this.name = 'De Kassier';
    this.version = '1.0.0';
  }

  /**
   * Reconciliation: compare settlement batch totals vs actual transaction sums.
   */
  async runReconciliation() {
    const batches = await mysqlSequelize.query(
      `SELECT sb.id, sb.batch_number, sb.total_commission_cents, sb.total_payout_cents,
              sb.total_gross_cents, sb.total_transaction_count, sb.status,
              COALESCE(SUM(it.commission_cents), 0) as actual_commission_cents,
              COALESCE(SUM(it.partner_amount_cents), 0) as actual_payout_cents,
              COALESCE(SUM(it.amount_cents), 0) as actual_gross_cents,
              COUNT(it.id) as actual_tx_count
       FROM settlement_batches sb
       LEFT JOIN intermediary_transactions it ON it.settlement_batch_id = sb.id
       WHERE sb.status IN ('calculated', 'approved', 'processing', 'completed')
         AND sb.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
       GROUP BY sb.id`,
      { type: QueryTypes.SELECT }
    );

    const mismatches = [];
    for (const b of batches) {
      const commDiff = Math.abs(b.total_commission_cents - b.actual_commission_cents);
      const payDiff = Math.abs(b.total_payout_cents - b.actual_payout_cents);
      const grossDiff = Math.abs(b.total_gross_cents - b.actual_gross_cents);
      const countDiff = Math.abs(b.total_transaction_count - b.actual_tx_count);

      if (commDiff > 0 || payDiff > 0 || grossDiff > 0 || countDiff > 0) {
        mismatches.push({
          batch_id: b.id,
          batch_number: b.batch_number,
          status: b.status,
          commission_diff_cents: commDiff,
          payout_diff_cents: payDiff,
          gross_diff_cents: grossDiff,
          count_diff: countDiff
        });
      }
    }

    if (mismatches.length > 0) {
      await logAlert('warning', `Financial reconciliation: ${mismatches.length} batch(es) with mismatch`, {
        source: 'De Kassier',
        mismatches: mismatches.slice(0, 5)
      });
    }

    return {
      total_checked: batches.length,
      mismatches,
      all_reconciled: mismatches.length === 0
    };
  }

  /**
   * Anomaly detection: transaction amounts outside 2σ baseline.
   * Uses 30-day rolling window. Falls back to 3σ if <30 days of data.
   */
  async detectAnomalies() {
    const anomalies = [];

    // Get destinations with transactions
    const destinations = await mysqlSequelize.query(
      `SELECT DISTINCT destination_id FROM intermediary_transactions
       WHERE confirmed_at IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );

    for (const { destination_id: destId } of destinations) {
      // 30-day baseline
      const [baseline] = await mysqlSequelize.query(
        `SELECT
           COUNT(*) as sample_size,
           AVG(amount_cents) as mean_amount,
           STDDEV(amount_cents) as stddev_amount,
           AVG(commission_cents) as mean_commission,
           STDDEV(commission_cents) as stddev_commission
         FROM intermediary_transactions
         WHERE destination_id = :destId
           AND confirmed_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND status IN ('bevestiging','delen','reminder','review')`,
        { replacements: { destId }, type: QueryTypes.SELECT }
      );

      if (!baseline || baseline.sample_size < 5) continue;

      // Use 3σ if bootstrap period (<30 samples), else 2σ
      const sigmaThreshold = baseline.sample_size < 30 ? 3 : 2;

      // Check yesterday's transactions
      const recentTxns = await mysqlSequelize.query(
        `SELECT id, transaction_number, amount_cents, commission_cents, partner_id
         FROM intermediary_transactions
         WHERE destination_id = :destId
           AND confirmed_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
           AND status IN ('bevestiging','delen','reminder','review')`,
        { replacements: { destId }, type: QueryTypes.SELECT }
      );

      for (const tx of recentTxns) {
        const amountDeviation = baseline.stddev_amount > 0
          ? Math.abs(tx.amount_cents - baseline.mean_amount) / baseline.stddev_amount
          : 0;

        if (amountDeviation > sigmaThreshold) {
          anomalies.push({
            destination_id: destId,
            transaction_id: tx.id,
            transaction_number: tx.transaction_number,
            metric: 'amount_cents',
            value: tx.amount_cents,
            baseline_mean: Math.round(baseline.mean_amount),
            baseline_stddev: Math.round(baseline.stddev_amount),
            sigma_deviation: Math.round(amountDeviation * 100) / 100,
            threshold: sigmaThreshold
          });
        }
      }
    }

    if (anomalies.length > 0) {
      await logAlert('info', `Financial anomalies: ${anomalies.length} transaction(s) outside ${anomalies[0]?.threshold || 2}σ`, {
        source: 'De Kassier',
        anomalyCount: anomalies.length
      });
    }

    return anomalies;
  }

  /**
   * Outstanding settlements: batches not completed for >7 days.
   */
  async checkOutstandingSettlements() {
    const outstanding = await mysqlSequelize.query(
      `SELECT id, batch_number, status, period_start, period_end,
              total_payout_cents, total_partner_count,
              DATEDIFF(NOW(), created_at) as days_outstanding
       FROM settlement_batches
       WHERE status NOT IN ('completed', 'cancelled')
         AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY created_at ASC`,
      { type: QueryTypes.SELECT }
    );

    if (outstanding.length > 0) {
      const oldest = outstanding[0];
      await logAlert('warning', `${outstanding.length} settlement batch(es) outstanding >7 days (oldest: ${oldest.days_outstanding}d)`, {
        source: 'De Kassier',
        batchCount: outstanding.length,
        oldestDays: oldest.days_outstanding
      });
    }

    return {
      outstanding_batches: outstanding,
      count: outstanding.length,
      oldest_days: outstanding.length > 0 ? outstanding[0].days_outstanding : 0
    };
  }

  /**
   * Fraud indicators: same customer × same POI × <1h window.
   */
  async detectFraudIndicators() {
    const indicators = await mysqlSequelize.query(
      `SELECT guest_email, poi_id, COUNT(*) as tx_count,
              MIN(created_at) as first_at, MAX(created_at) as last_at,
              TIMESTAMPDIFF(MINUTE, MIN(created_at), MAX(created_at)) as window_minutes
       FROM intermediary_transactions
       WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND guest_email IS NOT NULL
         AND guest_email != ''
       GROUP BY guest_email, poi_id
       HAVING tx_count >= 2 AND window_minutes < 60`,
      { type: QueryTypes.SELECT }
    );

    if (indicators.length > 0) {
      await logAlert('warning', `Fraud indicators: ${indicators.length} suspicious pattern(s) detected`, {
        source: 'De Kassier',
        indicatorCount: indicators.length
      });
    }

    return indicators.map(i => ({
      guest_email: i.guest_email ? i.guest_email.replace(/(.{2}).*(@.*)/, '$1***$2') : 'unknown',
      poi_id: i.poi_id,
      tx_count: i.tx_count,
      window_minutes: i.window_minutes
    }));
  }

  /**
   * Main entry: run all financial checks (platform-wide).
   */
  async execute() {
    const startTime = Date.now();

    try {
      const reconciliation = await this.runReconciliation();
      const anomalies = await this.detectAnomalies();
      const settlementAlerts = await this.checkOutstandingSettlements();
      const fraudIndicators = await this.detectFraudIndicators();

      const result = {
        timestamp: new Date(),
        reconciliation,
        anomalies,
        settlement_alerts: settlementAlerts,
        fraud_indicators: fraudIndicators,
        summary: {
          reconciled: reconciliation.all_reconciled,
          anomaly_count: anomalies.length,
          outstanding_settlements: settlementAlerts.count,
          fraud_indicator_count: fraudIndicators.length,
          duration_ms: Date.now() - startTime
        }
      };

      // Store in MongoDB
      await FinancialMonitorResult.create(result);

      await logAgent('financial-monitor', 'monitor_completed', {
        description: 'De Kassier daily financial check completed',
        metadata: result.summary
      });

      return result;
    } catch (error) {
      console.error('[De Kassier] Error:', error.message);
      await logAgent('financial-monitor', 'monitor_error', {
        description: `De Kassier failed: ${error.message}`,
        status: 'error'
      });
      return { error: error.message };
    }
  }

  /**
   * Get latest result from MongoDB (for daily briefing).
   */
  async getLatestResult() {
    try {
      return await FinancialMonitorResult.findOne(
        {},
        null,
        { sort: { timestamp: -1 } }
      ).lean();
    } catch (err) {
      console.warn('[index.js] Query fallback:', err.message);
      return null;
}
  }
}

export default new FinancialMonitor();
