/**
 * POI Tier Manager
 * Classifies POIs into tiers with balanced category distribution
 *
 * Tier Logic:
 * - Tier 1: Top 25 POIs with balanced category mix (culture, nature, food, active)
 * - Tier 2: Score >= 7.0 + critical practical POIs (hospitals, pharmacies)
 * - Tier 3: Score >= 5.0
 * - Tier 4: Score < 5.0
 * - Excluded: Accommodations
 *
 * @module agents/dataSync/poiTierManager
 */

import { logAgent } from "../../orchestrator/auditTrail/index.js";

// Tier configuration with update frequencies
const TIER_CONFIG = {
  1: { minScore: 8.0, updateFrequency: "daily", maxPOIs: 25, cronExpr: "0 6 * * *" },
  2: { minScore: 7.0, updateFrequency: "weekly", maxPOIs: 250, cronExpr: "0 6 * * 1" },
  3: { minScore: 5.0, updateFrequency: "monthly", maxPOIs: 1000, cronExpr: "0 6 1 * *" },
  4: { minScore: 0, updateFrequency: "quarterly", maxPOIs: null, cronExpr: "0 6 1 1,4,7,10 *" }
};

// Category targets for balanced Tier 1 selection
const TIER1_CATEGORY_TARGETS = {
  nature: 7,    // Beaches & Nature
  food: 8,      // Food & Drinks
  culture: 5,   // Culture & History
  active: 5     // Active/Sports
};

// Critical practical POIs that need frequent updates (move to Tier 2)
const PRACTICAL_CRITICAL_TERMS = [
  "hospital", "ziekenhuis", "emergency", "urgencias",
  "police", "politie", "policia",
  "pharmacy", "apotheek", "farmacia",
  "clinic", "clinica", "kliniek",
  "doctor", "médico", "arts",
  "ambulance", "health center", "centro de salud",
  "centro médico", "consultorio"
];

// Score calculation weights
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
   * Check if POI is a critical practical location
   */
  isPracticalCritical(poi) {
    const name = (poi.name || "").toLowerCase();
    const category = (poi.category || "").toLowerCase();
    return PRACTICAL_CRITICAL_TERMS.some(term =>
      name.includes(term) || category.includes(term)
    );
  }

  /**
   * Check if POI is an accommodation (excluded from tiers)
   */
  isAccommodation(poi) {
    return this.getCategoryGroup(poi.category) === "accommodation";
  }

  /**
   * Calculate tier score for a POI
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
   * Determine tier based on score (simple version without balancing)
   */
  determineTier(score, isPracticalCritical = false) {
    // Critical practical always goes to Tier 2 minimum
    if (isPracticalCritical) return 2;

    if (score >= TIER_CONFIG[1].minScore) return 1;
    if (score >= TIER_CONFIG[2].minScore) return 2;
    if (score >= TIER_CONFIG[3].minScore) return 3;
    return 4;
  }

  /**
   * Classify all POIs with balanced Tier 1 selection
   */
  async classifyAllPOIs(sequelize) {
    console.log("[POITierManager] Classifying all POIs with balanced categories...");

    const [pois] = await sequelize.query(`
      SELECT id, name, category, review_count, rating
      FROM POI
      WHERE (is_active = 1 OR is_active IS NULL)
    `);

    // Filter out accommodations and calculate scores
    const scoredPOIs = pois
      .filter(poi => !this.isAccommodation(poi))
      .map(poi => ({
        ...poi,
        score: this.calculateTierScore(poi),
        group: this.getCategoryGroup(poi.category),
        isCriticalPractical: this.isPracticalCritical(poi)
      }))
      .sort((a, b) => b.score - a.score);

    // Build balanced Tier 1
    const tier1POIs = this.selectBalancedTier1(scoredPOIs);
    const tier1Ids = new Set(tier1POIs.map(p => p.id));

    // Separate critical practical POIs for Tier 2
    const criticalPractical = scoredPOIs.filter(p => p.isCriticalPractical);

    // Classify remaining POIs
    const tierCounts = { 1: tier1POIs.length, 2: 0, 3: 0, 4: 0 };
    const accommodationCount = pois.filter(p => this.isAccommodation(p)).length;

    for (const poi of scoredPOIs) {
      if (tier1Ids.has(poi.id)) continue;

      if (poi.isCriticalPractical) {
        tierCounts[2]++;
      } else if (poi.score >= 7.0) {
        tierCounts[2]++;
      } else if (poi.score >= 5.0) {
        tierCounts[3]++;
      } else {
        tierCounts[4]++;
      }
    }

    await logAgent("data-sync", "poi_tier_classification", {
      description: `Classified ${scoredPOIs.length} POIs (excl. ${accommodationCount} accommodations)`,
      metadata: {
        tierCounts,
        totalPOIs: pois.length,
        excludedAccommodations: accommodationCount,
        criticalPractical: criticalPractical.length,
        tier1Categories: this.getTier1CategoryMix(tier1POIs)
      }
    });

    console.log("[POITierManager] Classification complete:", tierCounts);
    console.log("[POITierManager] Tier 1 category mix:", this.getTier1CategoryMix(tier1POIs));

    return {
      total: scoredPOIs.length,
      tierCounts,
      excludedAccommodations: accommodationCount,
      tier1POIs: tier1POIs.map(p => ({ id: p.id, name: p.name, group: p.group, score: p.score })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Select balanced Tier 1 POIs across categories
   */
  selectBalancedTier1(scoredPOIs) {
    const tier1POIs = [];
    const selectedIds = new Set();

    // First, select top POIs per target category
    for (const [group, target] of Object.entries(TIER1_CATEGORY_TARGETS)) {
      const groupPOIs = scoredPOIs.filter(p =>
        p.group === group &&
        p.score >= 8.0 &&
        !p.isCriticalPractical &&
        !selectedIds.has(p.id)
      );

      const selected = groupPOIs.slice(0, target);
      selected.forEach(p => {
        tier1POIs.push(p);
        selectedIds.add(p.id);
      });
    }

    // Fill remaining slots (up to 25) with highest scoring unselected POIs
    const remaining = scoredPOIs.filter(p =>
      p.score >= 8.0 &&
      !p.isCriticalPractical &&
      !selectedIds.has(p.id) &&
      Object.keys(TIER1_CATEGORY_TARGETS).includes(p.group)
    );

    const slotsLeft = 25 - tier1POIs.length;
    remaining.slice(0, slotsLeft).forEach(p => tier1POIs.push(p));

    // Sort by score descending
    return tier1POIs.sort((a, b) => b.score - a.score);
  }

  /**
   * Get category mix for Tier 1 POIs
   */
  getTier1CategoryMix(tier1POIs) {
    const mix = {};
    tier1POIs.forEach(p => {
      mix[p.group] = (mix[p.group] || 0) + 1;
    });
    return mix;
  }

  /**
   * Get POIs for a specific tier update
   */
  async getPOIsForUpdate(sequelize, tier) {
    const maxPOIs = TIER_CONFIG[tier]?.maxPOIs || 100;

    if (tier === 1) {
      // For Tier 1, use the balanced selection
      const [pois] = await sequelize.query(`
        SELECT id, name, google_placeid, category, rating, review_count
        FROM POI
        WHERE (is_active = 1 OR is_active IS NULL)
        ORDER BY last_updated ASC
      `);

      const scoredPOIs = pois
        .filter(poi => !this.isAccommodation(poi))
        .map(poi => ({
          ...poi,
          score: this.calculateTierScore(poi),
          group: this.getCategoryGroup(poi.category),
          isCriticalPractical: this.isPracticalCritical(poi)
        }))
        .sort((a, b) => b.score - a.score);

      return this.selectBalancedTier1(scoredPOIs);
    }

    if (tier === 2) {
      // Tier 2: Score 7.0-8.0 + critical practical
      const [pois] = await sequelize.query(`
        SELECT id, name, google_placeid, category, rating, review_count
        FROM POI
        WHERE (is_active = 1 OR is_active IS NULL)
        ORDER BY last_updated ASC
      `);

      return pois
        .filter(poi => !this.isAccommodation(poi))
        .map(poi => ({
          ...poi,
          score: this.calculateTierScore(poi),
          isCriticalPractical: this.isPracticalCritical(poi)
        }))
        .filter(poi =>
          poi.isCriticalPractical ||
          (poi.score >= 7.0 && poi.score < 8.0)
        )
        .slice(0, maxPOIs);
    }

    // Tier 3 and 4: Simple score-based selection
    const minScore = tier === 3 ? 5.0 : 0;
    const maxScore = tier === 3 ? 7.0 : 5.0;

    const [pois] = await sequelize.query(`
      SELECT id, name, google_placeid, category, rating, review_count
      FROM POI
      WHERE (is_active = 1 OR is_active IS NULL)
      ORDER BY last_updated ASC
    `);

    return pois
      .filter(poi => !this.isAccommodation(poi) && !this.isPracticalCritical(poi))
      .map(poi => ({
        ...poi,
        score: this.calculateTierScore(poi)
      }))
      .filter(poi => poi.score >= minScore && poi.score < maxScore)
      .slice(0, maxPOIs);
  }

  getTierConfig() {
    return TIER_CONFIG;
  }

  getTier1CategoryTargets() {
    return TIER1_CATEGORY_TARGETS;
  }
}

export default new POITierManager();
