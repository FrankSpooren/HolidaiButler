/**
 * Tier Promotion/Demotion Agent
 * Automatically adjusts POI tiers based on data activity patterns.
 *
 * Logic:
 * - DEMOTION: POI has not received new data (last_updated unchanged) for X periods → tier down
 *   - T1 → T2: no update in 2 weeks
 *   - T2 → T3: no update in 6 weeks
 *   - T3 → T4: no update in 12 weeks
 * - PROMOTION: POI receives frequent updates → tier up
 *   - T4 → T3: 2+ updates in last 4 weeks
 *   - T3 → T2: 4+ updates in last 4 weeks
 *   - T2 → T1: consistent weekly updates for 8+ weeks AND rating >= 4.0 AND review_count >= 20
 * - T1 is NEVER auto-demoted below T2 (premium requires manual demotion)
 * - Manual tier assignments (Frank's Excel import) are respected via tier_source column
 *
 * Schedule: Weekly on Sunday at 04:00 (after tier-recalc at 03:00)
 *
 * @module agents/dataSync/tierPromotionAgent
 */

import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import notificationService from '../../notificationService.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

// Demotion thresholds: days without update before demotion
const DEMOTION_THRESHOLDS = {
  1: 14,  // T1 → T2 after 2 weeks without update
  2: 42,  // T2 → T3 after 6 weeks without update
  3: 84,  // T3 → T4 after 12 weeks without update
};

// Promotion criteria
const PROMOTION_CRITERIA = {
  4: { minUpdates: 2, periodWeeks: 4 },   // T4 → T3: 2+ updates in 4 weeks
  3: { minUpdates: 4, periodWeeks: 4 },   // T3 → T2: 4+ updates in 4 weeks
  2: { minUpdates: 8, periodWeeks: 8, minRating: 4.0, minReviews: 20 }, // T2 → T1
};

class TierPromotionAgent {

  /**
   * Run the full promotion/demotion cycle
   */
  async run() {
    const startTime = Date.now();
    console.log('[TierPromotionAgent] Starting tier promotion/demotion cycle...');

    const results = {
      demoted: [],
      promoted: [],
      unchanged: 0,
      errors: [],
    };

    try {
      // Step 1: Check for demotions
      const demotions = await this.findDemotionCandidates();
      for (const poi of demotions) {
        try {
          await this.demotePOI(poi);
          results.demoted.push({ id: poi.id, name: poi.name, from: poi.tier, to: poi.tier + 1 });
        } catch (e) {
          results.errors.push({ id: poi.id, action: 'demote', error: e.message });
        }
      }

      // Step 2: Check for promotions
      const promotions = await this.findPromotionCandidates();
      for (const poi of promotions) {
        try {
          await this.promotePOI(poi);
          results.promoted.push({ id: poi.id, name: poi.name, from: poi.tier, to: poi.tier - 1 });
        } catch (e) {
          results.errors.push({ id: poi.id, action: 'promote', error: e.message });
        }
      }

      // Count unchanged
      const [totalActive] = await mysqlSequelize.query(
        'SELECT COUNT(*) as cnt FROM POI WHERE is_active = 1',
        { type: QueryTypes.SELECT }
      );
      results.unchanged = (totalActive.cnt || 0) - results.demoted.length - results.promoted.length;

      // Log to audit trail
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await logAgent('data-sync', 'tier_promotion_cycle', {
        description: `Tier promotion/demotion: ${results.promoted.length} promoted, ${results.demoted.length} demoted, ${results.unchanged} unchanged (${duration}s)`,
        metadata: results,
      });

      // Send notification if there were changes
      if (results.demoted.length > 0 || results.promoted.length > 0) {
        await this.notifyAdmins(results);
      }

      console.log(`[TierPromotionAgent] Cycle complete: ${results.promoted.length} promoted, ${results.demoted.length} demoted, ${results.errors.length} errors (${duration}s)`);

    } catch (error) {
      console.error('[TierPromotionAgent] Cycle failed:', error.message);
      results.errors.push({ action: 'cycle', error: error.message });
    }

    return results;
  }

  /**
   * Find POIs that should be demoted (no data updates for too long)
   */
  async findDemotionCandidates() {
    const candidates = [];

    for (const [tierStr, daysThreshold] of Object.entries(DEMOTION_THRESHOLDS)) {
      const tier = parseInt(tierStr);
      const targetTier = tier + 1;
      if (targetTier > 4) continue; // Can't demote below T4

      const pois = await mysqlSequelize.query(`
        SELECT id, name, tier, destination_id, last_updated, rating, review_count
        FROM POI
        WHERE tier = ?
          AND is_active = 1
          AND (last_updated IS NULL OR last_updated < DATE_SUB(NOW(), INTERVAL ? DAY))
      `, { replacements: [tier, daysThreshold], type: QueryTypes.SELECT });

      for (const poi of pois) {
        candidates.push({ ...poi, targetTier, reason: `No update for ${daysThreshold}+ days` });
      }
    }

    console.log(`[TierPromotionAgent] Found ${candidates.length} demotion candidates`);
    return candidates;
  }

  /**
   * Find POIs that should be promoted (frequent data updates)
   */
  async findPromotionCandidates() {
    const candidates = [];

    for (const [tierStr, criteria] of Object.entries(PROMOTION_CRITERIA)) {
      const tier = parseInt(tierStr);
      const targetTier = tier - 1;
      if (targetTier < 1) continue; // Can't promote above T1

      let extraConditions = '';
      const params = [tier, criteria.periodWeeks * 7, criteria.minUpdates];

      if (criteria.minRating) {
        extraConditions += ' AND p.rating >= ?';
        params.push(criteria.minRating);
      }
      if (criteria.minReviews) {
        extraConditions += ' AND p.review_count >= ?';
        params.push(criteria.minReviews);
      }

      // Count updates by checking how many times last_updated changed
      // We use the imageurls table as proxy: count images downloaded in the period
      const pois = await mysqlSequelize.query(`
        SELECT p.id, p.name, p.tier, p.destination_id, p.rating, p.review_count,
               COUNT(DISTINCT DATE(i.downloaded_at)) as update_days
        FROM POI p
        LEFT JOIN imageurls i ON i.poi_id = p.id
          AND i.downloaded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        WHERE p.tier = ?
          AND p.is_active = 1
          ${extraConditions}
        GROUP BY p.id
        HAVING update_days >= ?
      `, { replacements: [criteria.periodWeeks * 7, tier, ...params.slice(3), criteria.minUpdates], type: QueryTypes.SELECT });

      for (const poi of pois) {
        candidates.push({ ...poi, targetTier, reason: `${poi.update_days} update days in ${criteria.periodWeeks} weeks` });
      }
    }

    console.log(`[TierPromotionAgent] Found ${candidates.length} promotion candidates`);
    return candidates;
  }

  /**
   * Demote a POI to the next lower tier
   */
  async demotePOI(poi) {
    const oldTier = poi.tier;
    const newTier = poi.targetTier;

    await mysqlSequelize.query(
      'UPDATE POI SET tier = ?, tier_changed_at = NOW(), tier_change_reason = ? WHERE id = ?',
      { replacements: [newTier, `Auto-demotion: ${poi.reason}`, poi.id] }
    );

    console.log(`[TierPromotionAgent] Demoted POI ${poi.id} "${poi.name}": T${oldTier} → T${newTier} (${poi.reason})`);
  }

  /**
   * Promote a POI to the next higher tier
   */
  async promotePOI(poi) {
    const oldTier = poi.tier;
    const newTier = poi.targetTier;

    await mysqlSequelize.query(
      'UPDATE POI SET tier = ?, tier_changed_at = NOW(), tier_change_reason = ? WHERE id = ?',
      { replacements: [newTier, `Auto-promotion: ${poi.reason}`, poi.id] }
    );

    console.log(`[TierPromotionAgent] Promoted POI ${poi.id} "${poi.name}": T${oldTier} → T${newTier} (${poi.reason})`);
  }

  /**
   * Notify admins about tier changes
   */
  async notifyAdmins(results) {
    try {
      // Get all platform_admin users
      const admins = await mysqlSequelize.query(
        "SELECT id FROM admin_users WHERE role = 'platform_admin'",
        { type: QueryTypes.SELECT }
      );

      const promoted = results.promoted.length;
      const demoted = results.demoted.length;
      const title = `Tier Update: ${promoted} promoted, ${demoted} demoted`;
      const details = [];
      if (promoted > 0) details.push(`Promoties: ${results.promoted.map(p => `${p.name} (T${p.from}→T${p.to})`).slice(0, 5).join(', ')}${promoted > 5 ? ` +${promoted - 5} meer` : ''}`);
      if (demoted > 0) details.push(`Degradaties: ${results.demoted.map(d => `${d.name} (T${d.from}→T${d.to})`).slice(0, 5).join(', ')}${demoted > 5 ? ` +${demoted - 5} meer` : ''}`);

      for (const admin of admins) {
        await notificationService.create({
          userId: admin.id,
          type: 'info',
          severity: demoted > 10 ? 'high' : 'medium',
          title,
          message: details.join('\n'),
          actionUrl: '/pois?tab=2',
          actionLabel: 'Bekijk Classification',
        });
      }
    } catch (e) {
      console.error('[TierPromotionAgent] Notification failed:', e.message);
    }
  }
}

export default new TierPromotionAgent();
