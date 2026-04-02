/**
 * POI Tier Manager
 * Manages POI tier assignments and score calculations
 *
 * Tier Logic (v2.0 — Owner-Managed Tiers):
 * - Tier assignments are MANUALLY set by owner (stored in POI.tier column)
 * - tier_score is computed informationally but does NOT determine tier assignment
 * - getPOIsForUpdate() queries the stored tier column directly
 * - recalculateScores() updates tier_score without touching tier assignment
 *
 * Tier Schedule:
 * - Tier 1: Daily 06:00 (highest priority POIs)
 * - Tier 2: Weekly Monday 06:00
 * - Tier 3: Monthly 1st 06:00
 * - Tier 4: Quarterly (Jan/Apr/Jul/Oct 1st) 06:00
 *
 * @module agents/dataSync/poiTierManager
 */

import { logAgent } from "../../orchestrator/auditTrail/index.js";

// Tier configuration with update frequencies
const TIER_CONFIG = {
  1: { updateFrequency: "daily", maxPOIs: null, cronExpr: "0 6 * * *" },
  2: { updateFrequency: "weekly", maxPOIs: null, cronExpr: "0 6 * * 1" },
  3: { updateFrequency: "monthly", maxPOIs: null, cronExpr: "0 6 1 * *" },
  4: { updateFrequency: "quarterly", maxPOIs: null, cronExpr: "0 6 1 1,4,7,10 *" }
};

// Destinations paused per tier (to save Apify costs while site is in development)
// Format: { tier: [destination_id, ...] }
// Texel (id=2): T2/T3/T4 paused — site not live yet. T1 still active (18 POIs, minimal cost).
const PAUSED_DESTINATIONS = {
  2: [2], // Texel paused for T2
  3: [2], // Texel paused for T3
  4: [2], // Texel paused for T4
};

// Score calculation weights (informational only — does not affect tier assignment)
const SCORE_WEIGHTS = {
  reviewCount: 0.30,
  averageRating: 0.20,
  touristRelevance: 0.30,
  bookingFrequency: 0.20
};

class POITierManager {

  /**
   * Get category group from POI category string
   */
  getCategoryGroup(category) {
    const cat = (category || "").toLowerCase();
    if (cat.includes("accommodation")) return "accommodation";
    if (cat.includes("beach") || cat.includes("nature")) return "nature";
    if (cat.includes("food") || cat.includes("drink")) return "food";
    if (cat.includes("culture") || cat.includes("history")) return "culture";
    if (cat.includes("active")) return "active";
    if (cat.includes("practical") || cat.includes("health")) return "practical";
    if (cat.includes("shopping")) return "shopping";
    if (cat.includes("recreation")) return "recreation";
    return "other";
  }

  /**
   * Calculate tier score for a POI (informational — does NOT determine tier)
   */
  calculateTierScore(poi) {
    const normalizedReviewCount = Math.min((poi.review_count || 0) / 50, 10);
    const normalizedRating = (poi.rating || 0) * 2;

    const group = this.getCategoryGroup(poi.category);
    const highRelevanceGroups = ["nature", "food", "culture", "active"];
    const normalizedTouristRelevance = highRelevanceGroups.includes(group) ? 8 : 5;
    const normalizedBookingFrequency = poi.booking_count ? Math.min(poi.booking_count / 10, 10) : 5;

    const score = (
      normalizedReviewCount * SCORE_WEIGHTS.reviewCount +
      normalizedRating * SCORE_WEIGHTS.averageRating +
      normalizedTouristRelevance * SCORE_WEIGHTS.touristRelevance +
      normalizedBookingFrequency * SCORE_WEIGHTS.bookingFrequency
    );

    return Math.round(score * 100) / 100;
  }

  /**
   * Recalculate tier_score for all POIs (informational only)
   * Does NOT modify the tier column — owner's manual assignments are preserved
   */
  async classifyAllPOIs(sequelize) {
    console.log("[POITierManager] Recalculating tier_score for all POIs (tier assignments preserved)...");

    const [pois] = await sequelize.query(`
      SELECT id, name, category, review_count, rating, tier, destination_id
      FROM POI
      WHERE (is_active = 1 OR is_active IS NULL)
    `);

    let updated = 0;
    for (const poi of pois) {
      const score = this.calculateTierScore(poi);
      await sequelize.query(
        `UPDATE POI SET tier_score = ? WHERE id = ?`,
        { replacements: [score, poi.id] }
      );
      updated++;
    }

    // Count current tier distribution (from stored tier column)
    const [tierCounts] = await sequelize.query(`
      SELECT tier, destination_id, COUNT(*) as count
      FROM POI
      WHERE (is_active = 1 OR is_active IS NULL)
      GROUP BY tier, destination_id
      ORDER BY destination_id, tier
    `);

    const distribution = {};
    tierCounts.forEach(row => {
      const dest = row.destination_id;
      if (!distribution[dest]) distribution[dest] = {};
      distribution[dest][`tier${row.tier}`] = row.count;
    });

    await logAgent("data-sync", "poi_tier_score_recalc", {
      description: `Recalculated tier_score for ${updated} POIs (tier assignments unchanged)`,
      metadata: { updated, distribution }
    });

    console.log("[POITierManager] Score recalculation complete:", updated, "POIs updated");
    console.log("[POITierManager] Tier distribution:", JSON.stringify(distribution));

    return {
      total: updated,
      distribution,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get POIs for a specific tier sync
   * Queries the stored tier column directly (owner's manual assignments)
   */
  getPausedDestinations(tier) {
    return PAUSED_DESTINATIONS[tier] || [];
  }

  async getPOIsForUpdate(sequelize, tier) {
    const paused = PAUSED_DESTINATIONS[tier] || [];
    const excludeClause = paused.length > 0
      ? `AND destination_id NOT IN (${paused.join(',')})`
      : '';

    const [pois] = await sequelize.query(`
      SELECT id, name, google_placeid, category, rating, review_count,
             destination_id, tier_score
      FROM POI
      WHERE tier = ?
        AND (is_active = 1 OR is_active IS NULL)
        AND google_placeid IS NOT NULL
        AND google_placeid != ''
        ${excludeClause}
      ORDER BY tier_score DESC, last_updated ASC
    `, { replacements: [tier] });

    if (paused.length > 0) {
      console.log(`[POITierManager] Tier ${tier}: found ${pois.length} POIs for sync (destinations ${paused.join(',')} paused)`);
    } else {
      console.log(`[POITierManager] Tier ${tier}: found ${pois.length} POIs for sync`);
    }
    return pois;
  }

  getTierConfig() {
    return TIER_CONFIG;
  }
}

export default new POITierManager();
