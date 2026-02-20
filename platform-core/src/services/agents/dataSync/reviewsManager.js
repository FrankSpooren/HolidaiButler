/**
 * Reviews Manager
 * Enterprise-level review synchronization and quality management
 *
 * Features:
 * - Batch review fetching via Apify (max 20 per POI)
 * - 2-year retention policy enforcement
 * - Sentiment analysis scoring
 * - Language detection and filtering
 * - Spam/fake review detection
 * - Review summary generation per POI
 *
 * @module agents/dataSync/reviewsManager
 * @version 1.0.0
 */

import { logAgent, logError } from "../../orchestrator/auditTrail/index.js";
import apifyIntegration from "./apifyIntegration.js";

// Retention policy: 2 years
const RETENTION_DAYS = 730;
const MAX_REVIEWS_PER_POI = 20;

// Spam detection patterns
const SPAM_PATTERNS = [
  /\b(click here|visit my|check out my|www\.\S+)\b/i,
  /\b(earn money|make \$|free gift|winner)\b/i,
  /(.)\1{5,}/,  // Repeated characters (e.g., "aaaaaaaa")
  /\b[A-Z]{20,}\b/  // Long ALL CAPS strings
];

// Fake review indicators
const FAKE_REVIEW_INDICATORS = {
  tooShort: 10,  // Less than 10 characters
  tooGeneric: ["great", "good", "nice", "bad", "terrible"],
  suspiciousRating: true  // 5 stars with negative text or 1 star with positive
};

// Sentiment keywords (basic implementation)
const SENTIMENT_KEYWORDS = {
  positive: [
    "excellent", "amazing", "wonderful", "fantastic", "great", "love", "loved",
    "perfect", "best", "beautiful", "delicious", "friendly", "helpful", "recommend",
    "excelente", "maravilloso", "fantástico", "perfecto", "hermoso", "delicioso",
    "uitstekend", "geweldig", "fantastisch", "perfect", "prachtig", "heerlijk"
  ],
  negative: [
    "terrible", "awful", "horrible", "worst", "bad", "hate", "hated", "disgusting",
    "rude", "dirty", "slow", "avoid", "disappointing", "overpriced", "never again",
    "terrible", "horrible", "peor", "malo", "sucio", "lento", "evitar", "decepcionante",
    "verschrikkelijk", "afgrijselijk", "slecht", "vies", "traag", "vermijden", "teleurstellend"
  ]
};

// Language detection patterns
const LANGUAGE_PATTERNS = {
  nl: /\b(de|het|een|van|en|in|is|dat|op|te|voor|met|zijn|naar|ook|aan|niet|maar|bij|nog|uit|wel)\b/gi,
  en: /\b(the|a|an|of|and|in|is|that|on|to|for|with|are|at|not|but|by|also|from|as|or)\b/gi,
  es: /\b(el|la|los|las|un|una|de|en|es|que|por|con|para|del|al|como|más|pero|sin)\b/gi,
  de: /\b(der|die|das|ein|eine|von|und|in|ist|dass|auf|zu|für|mit|sind|bei|nicht|aber)\b/gi
};

class ReviewsManager {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Detect language of review text
   * @param {string} text - Review text
   * @returns {string} Language code (nl, en, es, de, unknown)
   */
  detectLanguage(text) {
    if (!text || text.length < 20) return "unknown";

    const scores = {};
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < 3) return "unknown";

    return Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || "unknown";
  }

  /**
   * Calculate sentiment score (-1 to 1)
   * @param {string} text - Review text
   * @param {number} rating - Review rating (1-5)
   * @returns {Object} Sentiment analysis result
   */
  analyzeSentiment(text, rating) {
    if (!text) {
      return { score: 0, label: "neutral", confidence: 0 };
    }

    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of SENTIMENT_KEYWORDS.positive) {
      if (textLower.includes(word)) positiveCount++;
    }

    for (const word of SENTIMENT_KEYWORDS.negative) {
      if (textLower.includes(word)) negativeCount++;
    }

    const totalKeywords = positiveCount + negativeCount;
    let textScore = 0;

    if (totalKeywords > 0) {
      textScore = (positiveCount - negativeCount) / totalKeywords;
    }

    // Combine with rating (normalized to -1 to 1)
    const ratingScore = (rating - 3) / 2;

    // Weighted average: 60% text, 40% rating
    const combinedScore = (textScore * 0.6) + (ratingScore * 0.4);

    // Detect mismatch (positive text with low rating or vice versa)
    const mismatch = (textScore > 0.3 && rating <= 2) || (textScore < -0.3 && rating >= 4);

    let label = "neutral";
    if (combinedScore > 0.2) label = "positive";
    else if (combinedScore < -0.2) label = "negative";

    return {
      score: Math.round(combinedScore * 100) / 100,
      label,
      confidence: Math.min(totalKeywords / 5, 1),
      mismatch,
      details: {
        positiveKeywords: positiveCount,
        negativeKeywords: negativeCount,
        textScore: Math.round(textScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100
      }
    };
  }

  /**
   * Detect spam or fake review
   * @param {Object} review - Review object
   * @returns {Object} Spam detection result
   */
  detectSpam(review) {
    const flags = [];
    let spamScore = 0;

    const text = review.text || review.snippet || "";

    // Check spam patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(text)) {
        flags.push("spam_pattern");
        spamScore += 0.3;
      }
    }

    // Check if too short
    if (text.length > 0 && text.length < FAKE_REVIEW_INDICATORS.tooShort) {
      flags.push("too_short");
      spamScore += 0.2;
    }

    // Check for generic one-word reviews
    const textLower = text.toLowerCase().trim();
    if (FAKE_REVIEW_INDICATORS.tooGeneric.includes(textLower)) {
      flags.push("too_generic");
      spamScore += 0.2;
    }

    // Check sentiment mismatch
    const sentiment = this.analyzeSentiment(text, review.stars || review.rating || 3);
    if (sentiment.mismatch) {
      flags.push("sentiment_mismatch");
      spamScore += 0.3;
    }

    // Check for suspicious reviewer patterns
    if (review.reviewerName && /^[A-Z]\s[A-Z]$/.test(review.reviewerName)) {
      flags.push("anonymous_reviewer");
      spamScore += 0.1;
    }

    return {
      isSpam: spamScore >= 0.5,
      spamScore: Math.min(spamScore, 1),
      flags,
      reviewText: text.substring(0, 100)
    };
  }

  /**
   * Sync reviews for a POI
   * @param {number} poiId - POI ID
   * @param {string} googlePlaceId - Google Place ID
   * @param {number} destinationId - Destination ID (1=Calpe, 2=Texel)
   * @returns {Object} Sync result
   */
  async syncReviewsForPOI(poiId, googlePlaceId, destinationId = 1) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    console.log(`[De Koerier] Syncing reviews for POI ${poiId} (destination: ${destinationId})`);

    try {
      // Fetch reviews from Apify
      const apifyReviews = await apifyIntegration.getPlaceReviews(googlePlaceId, MAX_REVIEWS_PER_POI);

      if (!apifyReviews || apifyReviews.length === 0) {
        return { poiId, synced: 0, message: "No reviews found" };
      }

      let added = 0;
      let updated = 0;
      let skippedSpam = 0;
      let skippedDuplicate = 0;

      for (const review of apifyReviews) {
        // Extract review date
        const reviewDate = this.parseReviewDate(review.publishedAtDate || review.publishAt);

        // Skip reviews older than retention period
        if (reviewDate && this.isOlderThanRetention(reviewDate)) {
          continue;
        }

        // Spam detection
        const spamCheck = this.detectSpam(review);
        if (spamCheck.isSpam) {
          skippedSpam++;
          continue;
        }

        // Detect language
        const language = this.detectLanguage(review.text || review.snippet);

        // Analyze sentiment
        const sentiment = this.analyzeSentiment(
          review.text || review.snippet,
          review.stars || review.rating || 3
        );

        // Check if review already exists (dedup via google_review_id)
        const googleReviewId = review.reviewId || null;
        if (googleReviewId) {
          const [existing] = await this.sequelize.query(
            "SELECT id FROM reviews WHERE google_review_id = ? AND poi_id = ?",
            { replacements: [googleReviewId, poiId] }
          );

          if (existing.length > 0) {
            skippedDuplicate++;
            continue;
          }
        }

        // Insert review (column names match production schema)
        await this.sequelize.query(`
          INSERT INTO reviews (
            poi_id, destination_id, google_review_id, user_name,
            rating, review_text, language, visit_date, sentiment,
            source, likes_count,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            poiId,
            destinationId,
            googleReviewId,
            review.name || review.reviewerName || "Anonymous",
            review.stars || review.rating || 3,
            review.text || review.snippet || "",
            language,
            reviewDate,
            sentiment.label,
            "apify",
            review.likesCount || 0
          ]
        });

        added++;
      }

      // Update POI review count and average
      await this.updatePOIReviewStats(poiId);

      console.log(`[De Koerier] POI ${poiId}: added ${added}, skipped spam ${skippedSpam}, duplicates ${skippedDuplicate}`);

      return {
        poiId,
        synced: added,
        skippedSpam,
        skippedDuplicate,
        total: apifyReviews.length
      };
    } catch (error) {
      await logError("reviews-manager", error, { poiId, googlePlaceId });
      throw error;
    }
  }

  /**
   * Parse review date from various formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} Parsed date
   */
  parseReviewDate(dateStr) {
    if (!dateStr) return null;

    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try relative date parsing (e.g., "2 months ago")
    const relativeMatch = dateStr.match(/(\d+)\s*(day|week|month|year)s?\s*ago/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const now = new Date();

      switch (unit) {
        case "day": now.setDate(now.getDate() - amount); break;
        case "week": now.setDate(now.getDate() - (amount * 7)); break;
        case "month": now.setMonth(now.getMonth() - amount); break;
        case "year": now.setFullYear(now.getFullYear() - amount); break;
      }
      return now;
    }

    return null;
  }

  /**
   * Check if date is older than retention period
   * @param {Date} date - Date to check
   * @returns {boolean} True if older than retention
   */
  isOlderThanRetention(date) {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);
    return date < retentionDate;
  }

  /**
   * Update POI review statistics
   * @param {number} poiId - POI ID
   */
  async updatePOIReviewStats(poiId) {
    await this.sequelize.query(`
      UPDATE POI SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE poi_id = ?),
        rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE poi_id = ?),
        last_updated = NOW()
      WHERE id = ?
    `, { replacements: [poiId, poiId, poiId] });
  }

  /**
   * Enforce retention policy - delete old reviews
   * @returns {Object} Cleanup result
   */
  async enforceRetentionPolicy() {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);

    // Get count before deletion
    const [countResult] = await this.sequelize.query(`
      SELECT COUNT(*) as count FROM reviews WHERE visit_date < ?
    `, { replacements: [retentionDate] });

    const toDelete = countResult[0]?.count || 0;

    if (toDelete > 0) {
      // Get affected POI IDs for stats update
      const [affectedPOIs] = await this.sequelize.query(`
        SELECT DISTINCT poi_id FROM reviews WHERE visit_date < ?
      `, { replacements: [retentionDate] });

      // Delete old reviews
      await this.sequelize.query(`
        DELETE FROM reviews WHERE visit_date < ?
      `, { replacements: [retentionDate] });

      // Update stats for affected POIs
      for (const poi of affectedPOIs) {
        await this.updatePOIReviewStats(poi.poi_id);
      }

      await logAgent("data-sync", "retention_enforced", {
        description: `Deleted ${toDelete} reviews older than ${RETENTION_DAYS} days`,
        metadata: {
          deleted: toDelete,
          affectedPOIs: affectedPOIs.length,
          retentionDays: RETENTION_DAYS
        }
      });

      console.log(`[De Koerier] Retention enforcement: deleted ${toDelete} old reviews`);
    }

    return {
      deleted: toDelete,
      retentionDays: RETENTION_DAYS,
      cutoffDate: retentionDate.toISOString()
    };
  }

  /**
   * Generate review summary for POI
   * @param {number} poiId - POI ID
   * @returns {Object} Review summary
   */
  async generateSummary(poiId) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const [reviews] = await this.sequelize.query(`
      SELECT rating, sentiment, language, review_text
      FROM reviews
      WHERE poi_id = ?
      ORDER BY visit_date DESC
      LIMIT 50
    `, { replacements: [poiId] });

    if (reviews.length === 0) {
      return { poiId, hasReviews: false };
    }

    // Calculate statistics
    const ratings = reviews.map(r => r.rating);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const languageCounts = {};

    for (const review of reviews) {
      sentimentCounts[review.sentiment || "neutral"]++;
      languageCounts[review.language || "unknown"] = (languageCounts[review.language || "unknown"] || 0) + 1;
    }

    // Extract common themes (basic keyword extraction)
    const allText = reviews.map(r => r.review_text || "").join(" ").toLowerCase();
    const themes = this.extractThemes(allText);

    return {
      poiId,
      hasReviews: true,
      totalReviews: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      sentiment: sentimentCounts,
      languages: languageCounts,
      themes,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Extract common themes from review text
   * @param {string} text - Combined review text
   * @returns {Array} Common themes
   */
  extractThemes(text) {
    const themeKeywords = {
      service: ["service", "staff", "friendly", "helpful", "rude", "slow", "personeel", "servicio"],
      food: ["food", "delicious", "tasty", "fresh", "eten", "comida", "lekker", "sabroso"],
      atmosphere: ["atmosphere", "view", "cozy", "ambiance", "sfeer", "ambiente", "uitzicht"],
      price: ["price", "expensive", "cheap", "value", "prijs", "precio", "duur", "caro"],
      location: ["location", "easy to find", "parking", "locatie", "ubicación", "parkeren"],
      cleanliness: ["clean", "dirty", "hygiene", "schoon", "vies", "limpio", "sucio"]
    };

    const themes = [];
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      let count = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = text.match(regex);
        if (matches) count += matches.length;
      }
      if (count >= 3) {
        themes.push({ theme, mentions: count });
      }
    }

    return themes.sort((a, b) => b.mentions - a.mentions).slice(0, 5);
  }

  /**
   * Batch sync reviews for multiple POIs
   * @param {Array} pois - Array of POIs with id and google_placeid
   * @returns {Object} Batch result
   */
  async batchSyncReviews(pois) {
    const results = {
      total: pois.length,
      synced: 0,
      failed: 0,
      details: []
    };

    for (const poi of pois) {
      try {
        const result = await this.syncReviewsForPOI(poi.id, poi.google_placeid, poi.destination_id || 1);
        results.synced++;
        results.details.push({ poiId: poi.id, ...result });

        // Rate limiting between POIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed++;
        results.details.push({ poiId: poi.id, error: error.message });
      }
    }

    await logAgent("data-sync", "batch_review_sync", {
      description: `Batch review sync: ${results.synced}/${results.total} POIs`,
      metadata: results
    });

    return results;
  }

  /**
   * Get review statistics
   * @returns {Object} Statistics
   */
  async getStats() {
    if (!this.sequelize) {
      return { initialized: false };
    }

    const [totalResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM reviews"
    );

    const [sentimentResult] = await this.sequelize.query(`
      SELECT sentiment, COUNT(*) as count
      FROM reviews
      GROUP BY sentiment
    `);

    const [languageResult] = await this.sequelize.query(`
      SELECT language, COUNT(*) as count
      FROM reviews
      GROUP BY language
      ORDER BY count DESC
      LIMIT 5
    `);

    const [destinationResult] = await this.sequelize.query(`
      SELECT destination_id, COUNT(*) as count
      FROM reviews
      GROUP BY destination_id
    `);

    return {
      totalReviews: totalResult[0]?.count || 0,
      bySentiment: sentimentResult,
      byLanguage: languageResult,
      byDestination: destinationResult,
      retentionDays: RETENTION_DAYS,
      timestamp: new Date().toISOString()
    };
  }
}

export default new ReviewsManager();
export { RETENTION_DAYS, MAX_REVIEWS_PER_POI, SENTIMENT_KEYWORDS };
