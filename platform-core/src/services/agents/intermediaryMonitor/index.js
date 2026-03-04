/**
 * De Makelaar — Intermediary Monitor Agent (Fase IV Blok D)
 *
 * Monitors the intermediary state machine for stuck transactions,
 * partner response times, and conversion anomalies.
 *
 * Type A: destination-aware. Schedule: every 15 min.
 *
 * Checks:
 *   1. Stuck transactions (voorstel >12h, toestemming >6h)
 *   2. Partner escalations (3+ cancelled per partner in 24h)
 *   3. Conversion metrics per partner (rate, avg response time)
 *
 * @module agents/intermediaryMonitor/index
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import { logAgent, logAlert } from '../../orchestrator/auditTrail/index.js';
import mongoose from 'mongoose';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// MONGODB SCHEMA
// ============================================================================

const intermediaryMonitorResultSchema = new mongoose.Schema({
  timestamp:      { type: Date, default: Date.now },
  destination_id: Number,
  stuck_transactions:     mongoose.Schema.Types.Mixed,
  escalations:            mongoose.Schema.Types.Mixed,
  conversion_stats:       mongoose.Schema.Types.Mixed,
  partner_response_times: mongoose.Schema.Types.Mixed,
  alerts:                 [{ type: String }]
}, { collection: 'intermediary_monitor_results' });

let IntermediaryMonitorResult;
try {
  IntermediaryMonitorResult = mongoose.model('IntermediaryMonitorResult');
} catch {
  IntermediaryMonitorResult = mongoose.model('IntermediaryMonitorResult', intermediaryMonitorResultSchema);
}

// ============================================================================
// DE MAKELAAR
// ============================================================================

class IntermediaryMonitor {
  constructor() {
    this.name = 'De Makelaar';
    this.version = '1.0.0';
  }

  /**
   * Check for stuck transactions per destination.
   * voorstel >12h = stuck, toestemming >6h = stuck
   */
  async checkStuckTransactions(destinationId) {
    const stuckVoorstel = await mysqlSequelize.query(
      `SELECT id, transaction_number, partner_id, created_at,
              TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_stuck
       FROM intermediary_transactions
       WHERE status = 'voorstel'
         AND created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)
         AND destination_id = :destinationId`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    const stuckToestemming = await mysqlSequelize.query(
      `SELECT id, transaction_number, partner_id, created_at,
              TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_stuck
       FROM intermediary_transactions
       WHERE status = 'toestemming'
         AND created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)
         AND destination_id = :destinationId`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    const total = stuckVoorstel.length + stuckToestemming.length;

    if (total > 0) {
      await logAgent('intermediary-monitor', 'stuck_transactions_detected', {
        description: `${total} stuck transactions detected (dest ${destinationId})`,
        destinationId,
        metadata: {
          voorstel_stuck: stuckVoorstel.length,
          toestemming_stuck: stuckToestemming.length
        }
      });
    }

    return {
      total,
      voorstel_stuck: stuckVoorstel.length,
      toestemming_stuck: stuckToestemming.length,
      details: {
        voorstel: stuckVoorstel.map(t => ({
          id: t.id,
          transaction_number: t.transaction_number,
          partner_id: t.partner_id,
          hours_stuck: t.hours_stuck
        })),
        toestemming: stuckToestemming.map(t => ({
          id: t.id,
          transaction_number: t.transaction_number,
          partner_id: t.partner_id,
          hours_stuck: t.hours_stuck
        }))
      }
    };
  }

  /**
   * Detect partner escalation patterns.
   * 3+ cancelled in 24h from same partner => alert
   */
  async checkPartnerEscalations(destinationId) {
    const escalations = await mysqlSequelize.query(
      `SELECT it.partner_id, p.company_name, COUNT(*) as cancel_count,
              MAX(it.updated_at) as last_cancelled
       FROM intermediary_transactions it
       LEFT JOIN partners p ON it.partner_id = p.id
       WHERE it.status = 'cancelled'
         AND it.updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND it.destination_id = :destinationId
       GROUP BY it.partner_id, p.company_name
       HAVING cancel_count >= 3`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    for (const esc of escalations) {
      await logAlert('warning', `Partner escalation: ${esc.company_name || esc.partner_id} has ${esc.cancel_count} cancellations in 24h`, {
        source: 'De Makelaar',
        destinationId,
        partnerId: esc.partner_id,
        cancelCount: esc.cancel_count
      });
    }

    return escalations.map(e => ({
      partner_id: e.partner_id,
      company_name: e.company_name,
      cancel_count: e.cancel_count,
      last_cancelled: e.last_cancelled
    }));
  }

  /**
   * Calculate conversion rates and response times per partner.
   */
  async getConversionMetrics(destinationId) {
    // Overall stats
    const [overall] = await mysqlSequelize.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('bevestiging','delen','reminder','review') THEN 1 ELSE 0 END) as confirmed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
       FROM intermediary_transactions
       WHERE destination_id = :destinationId
         AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    const total = overall.total || 0;
    const confirmed = overall.confirmed || 0;
    const conversionRate = total > 0 ? Math.round((confirmed / total) * 10000) / 100 : 0;

    // Per-partner response times (avg time from voorstel to toestemming/cancelled)
    const partnerMetrics = await mysqlSequelize.query(
      `SELECT
         it.partner_id,
         p.company_name,
         COUNT(*) as tx_count,
         SUM(CASE WHEN it.status IN ('bevestiging','delen','reminder','review') THEN 1 ELSE 0 END) as confirmed_count,
         AVG(CASE
           WHEN it.status NOT IN ('voorstel','expired')
           THEN TIMESTAMPDIFF(MINUTE, it.created_at, it.updated_at)
         END) as avg_response_minutes
       FROM intermediary_transactions it
       LEFT JOIN partners p ON it.partner_id = p.id
       WHERE it.destination_id = :destinationId
         AND it.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY it.partner_id, p.company_name
       ORDER BY confirmed_count DESC`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    return {
      conversion_rate: conversionRate,
      total_7d: total,
      confirmed_7d: confirmed,
      cancelled_7d: overall.cancelled || 0,
      expired_7d: overall.expired || 0,
      per_partner: partnerMetrics.map(pm => ({
        partner_id: pm.partner_id,
        company_name: pm.company_name,
        tx_count: pm.tx_count,
        confirmed_count: pm.confirmed_count,
        partner_conversion: pm.tx_count > 0 ? Math.round((pm.confirmed_count / pm.tx_count) * 10000) / 100 : 0,
        avg_response_minutes: pm.avg_response_minutes ? Math.round(pm.avg_response_minutes) : null
      }))
    };
  }

  /**
   * Main entry: run all checks for a destination.
   */
  async runForDestination(destinationId) {
    const startTime = Date.now();
    const alerts = [];

    try {
      const stuckTransactions = await this.checkStuckTransactions(destinationId);
      const escalations = await this.checkPartnerEscalations(destinationId);
      const conversionStats = await this.getConversionMetrics(destinationId);

      // Build alert list
      if (stuckTransactions.total > 0) {
        alerts.push(`${stuckTransactions.total} stuck transactions`);
      }
      if (escalations.length > 0) {
        alerts.push(`${escalations.length} partner escalation(s)`);
      }
      if (conversionStats.conversion_rate < 20 && conversionStats.total_7d > 5) {
        alerts.push(`Low conversion: ${conversionStats.conversion_rate}%`);
      }

      const result = {
        timestamp: new Date(),
        destination_id: destinationId,
        stuck_transactions: stuckTransactions,
        escalations,
        conversion_stats: conversionStats,
        alerts,
        duration_ms: Date.now() - startTime
      };

      // Store in MongoDB
      await IntermediaryMonitorResult.create(result);

      await logAgent('intermediary-monitor', 'monitor_completed', {
        description: `De Makelaar completed for destination ${destinationId}`,
        destinationId,
        metadata: {
          stuck: stuckTransactions.total,
          escalations: escalations.length,
          conversion_rate: conversionStats.conversion_rate,
          alerts: alerts.length,
          duration_ms: result.duration_ms
        }
      });

      return result;
    } catch (error) {
      console.error(`[De Makelaar] Error for destination ${destinationId}:`, error.message);
      await logAgent('intermediary-monitor', 'monitor_error', {
        description: `De Makelaar failed for destination ${destinationId}: ${error.message}`,
        destinationId,
        status: 'error'
      });
      return { destination_id: destinationId, error: error.message, alerts };
    }
  }

  /**
   * Get latest result from MongoDB (for daily briefing).
   */
  async getLatestResult(destinationId) {
    try {
      return await IntermediaryMonitorResult.findOne(
        { destination_id: destinationId },
        null,
        { sort: { timestamp: -1 } }
      ).lean();
    } catch {
      return null;
    }
  }
}

export default new IntermediaryMonitor();
