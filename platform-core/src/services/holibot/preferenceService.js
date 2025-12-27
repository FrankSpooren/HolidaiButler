/**
 * Preference Service for HoliBot
 * Manages user preferences and personalization
 *
 * Features:
 * - Store and retrieve explicit user preferences
 * - Learn preferences from user behavior (clicks, searches)
 * - Calculate personalized POI rankings
 * - Provide personalized recommendations
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// Category to database field mapping
const CATEGORY_FIELDS = {
  'Beaches & Nature': { explicit: 'pref_beaches', learned: 'clicks_beaches' },
  'Food & Drinks': { explicit: 'pref_food', learned: 'clicks_food' },
  'Culture & History': { explicit: 'pref_culture', learned: 'clicks_culture' },
  'Active': { explicit: 'pref_active', learned: 'clicks_active' },
  'Shopping': { explicit: 'pref_shopping', learned: 'clicks_shopping' },
  'Nightlife': { explicit: 'pref_nightlife', learned: 'clicks_nightlife' }
};

class PreferenceService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the preference service
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      const [tables] = await mysqlSequelize.query(
        "SHOW TABLES LIKE 'holibot_user_preferences'",
        { type: QueryTypes.SELECT }
      );

      if (tables) {
        this.isInitialized = true;
        logger.info('Preference service initialized');
      } else {
        logger.warn('Preference tables not yet created. Personalization disabled.');
      }

      return this.isInitialized;
    } catch (error) {
      logger.warn('Preference service init failed:', error.message);
      return false;
    }
  }

  /**
   * Get or create user preferences record
   * @param {Object} identifier - { sessionId, userId, deviceFingerprint }
   * @returns {Object} User preferences
   */
  async getPreferences(identifier) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return this.getDefaultPreferences();

    const { sessionId, userId, deviceFingerprint } = identifier;

    try {
      // Try to find existing preferences
      let whereClause = '';
      let params = [];

      if (userId) {
        whereClause = 'user_id = ?';
        params = [userId];
      } else if (sessionId) {
        whereClause = 'session_id = ?';
        params = [sessionId];
      } else if (deviceFingerprint) {
        whereClause = 'device_fingerprint = ?';
        params = [deviceFingerprint];
      } else {
        return this.getDefaultPreferences();
      }

      const [preferences] = await mysqlSequelize.query(
        `SELECT * FROM holibot_user_preferences WHERE ${whereClause}`,
        { replacements: params, type: QueryTypes.SELECT }
      );

      if (preferences) {
        return this.formatPreferences(preferences);
      }

      // Return defaults if no preferences found
      return this.getDefaultPreferences();
    } catch (error) {
      logger.warn('Failed to get preferences:', error.message);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences() {
    return {
      categories: {
        beaches: 3,
        food: 3,
        culture: 3,
        active: 3,
        shopping: 3,
        nightlife: 3,
        family: 3
      },
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        halal: false,
        kosher: false
      },
      budgetLevel: 'moderate',
      activityLevel: 'moderate',
      travelWith: null,
      hasChildren: false,
      hasPets: false,
      hasMobilityIssues: false,
      isDefault: true
    };
  }

  /**
   * Format database preferences to API format
   */
  formatPreferences(dbPrefs) {
    return {
      categories: {
        beaches: dbPrefs.pref_beaches || 3,
        food: dbPrefs.pref_food || 3,
        culture: dbPrefs.pref_culture || 3,
        active: dbPrefs.pref_active || 3,
        shopping: dbPrefs.pref_shopping || 3,
        nightlife: dbPrefs.pref_nightlife || 3,
        family: dbPrefs.pref_family || 3
      },
      dietary: {
        vegetarian: dbPrefs.dietary_vegetarian || false,
        vegan: dbPrefs.dietary_vegan || false,
        glutenFree: dbPrefs.dietary_gluten_free || false,
        halal: dbPrefs.dietary_halal || false,
        kosher: dbPrefs.dietary_kosher || false
      },
      budgetLevel: dbPrefs.budget_level || 'moderate',
      activityLevel: dbPrefs.activity_level || 'moderate',
      travelWith: dbPrefs.travel_with,
      hasChildren: dbPrefs.has_children || false,
      hasPets: dbPrefs.has_pets || false,
      hasMobilityIssues: dbPrefs.has_mobility_issues || false,
      isDefault: false
    };
  }

  /**
   * Save explicit user preferences
   * @param {Object} identifier - { sessionId, userId }
   * @param {Object} preferences - Preference data
   */
  async savePreferences(identifier, preferences) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return false;

    const { sessionId, userId, deviceFingerprint } = identifier;

    try {
      // Build upsert query
      const fields = [];
      const values = [];
      const updates = [];

      // Identifier fields
      if (sessionId) {
        fields.push('session_id');
        values.push(sessionId);
      }
      if (userId) {
        fields.push('user_id');
        values.push(userId);
      }
      if (deviceFingerprint) {
        fields.push('device_fingerprint');
        values.push(deviceFingerprint);
      }

      // Category preferences
      if (preferences.categories) {
        const catMap = {
          beaches: 'pref_beaches',
          food: 'pref_food',
          culture: 'pref_culture',
          active: 'pref_active',
          shopping: 'pref_shopping',
          nightlife: 'pref_nightlife',
          family: 'pref_family'
        };

        for (const [key, field] of Object.entries(catMap)) {
          if (preferences.categories[key] !== undefined) {
            fields.push(field);
            values.push(preferences.categories[key]);
            updates.push(`${field} = VALUES(${field})`);
          }
        }
      }

      // Dietary preferences
      if (preferences.dietary) {
        const dietMap = {
          vegetarian: 'dietary_vegetarian',
          vegan: 'dietary_vegan',
          glutenFree: 'dietary_gluten_free',
          halal: 'dietary_halal',
          kosher: 'dietary_kosher'
        };

        for (const [key, field] of Object.entries(dietMap)) {
          if (preferences.dietary[key] !== undefined) {
            fields.push(field);
            values.push(preferences.dietary[key]);
            updates.push(`${field} = VALUES(${field})`);
          }
        }
      }

      // Other preferences
      if (preferences.budgetLevel) {
        fields.push('budget_level');
        values.push(preferences.budgetLevel);
        updates.push('budget_level = VALUES(budget_level)');
      }
      if (preferences.activityLevel) {
        fields.push('activity_level');
        values.push(preferences.activityLevel);
        updates.push('activity_level = VALUES(activity_level)');
      }
      if (preferences.travelWith) {
        fields.push('travel_with');
        values.push(preferences.travelWith);
        updates.push('travel_with = VALUES(travel_with)');
      }
      if (preferences.hasChildren !== undefined) {
        fields.push('has_children');
        values.push(preferences.hasChildren);
        updates.push('has_children = VALUES(has_children)');
      }

      const placeholders = fields.map(() => '?').join(', ');
      const sql = `
        INSERT INTO holibot_user_preferences (${fields.join(', ')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updates.join(', ')}
      `;

      await mysqlSequelize.query(sql, { replacements: values, type: QueryTypes.INSERT });

      logger.info('User preferences saved', { sessionId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to save preferences:', error);
      return false;
    }
  }

  /**
   * Learn from user behavior (called when user clicks a POI)
   * @param {Object} data - { sessionId, userId, poiCategory, poiRating, poiPriceLevel }
   */
  async learnFromClick(data) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return;

    const { sessionId, userId, deviceFingerprint, poiCategory, poiRating, poiPriceLevel } = data;

    try {
      // Get the learned field for this category
      const categoryField = CATEGORY_FIELDS[poiCategory]?.learned;
      if (!categoryField) return;

      // Upsert learned preferences
      const identifierField = userId ? 'user_id' : (sessionId ? 'session_id' : 'device_fingerprint');
      const identifierValue = userId || sessionId || deviceFingerprint;

      if (!identifierValue) return;

      await mysqlSequelize.query(`
        INSERT INTO holibot_learned_preferences (${identifierField}, ${categoryField}, searches_total)
        VALUES (?, 1, 1)
        ON DUPLICATE KEY UPDATE
          ${categoryField} = ${categoryField} + 1,
          searches_total = searches_total + 1,
          avg_rating_clicked = COALESCE((avg_rating_clicked * searches_total + ?) / (searches_total + 1), ?),
          last_interaction = NOW()
      `, {
        replacements: [identifierValue, poiRating || 0, poiRating || 0],
        type: QueryTypes.INSERT
      });

      logger.debug('Learned from click', { category: poiCategory, identifierField });
    } catch (error) {
      logger.warn('Failed to learn from click:', error.message);
    }
  }

  /**
   * Get learned preferences
   * @param {Object} identifier - { sessionId, userId, deviceFingerprint }
   * @returns {Object} Learned preference data
   */
  async getLearnedPreferences(identifier) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return null;

    const { sessionId, userId, deviceFingerprint } = identifier;

    try {
      let whereClause = '';
      let params = [];

      if (userId) {
        whereClause = 'user_id = ?';
        params = [userId];
      } else if (sessionId) {
        whereClause = 'session_id = ?';
        params = [sessionId];
      } else if (deviceFingerprint) {
        whereClause = 'device_fingerprint = ?';
        params = [deviceFingerprint];
      } else {
        return null;
      }

      const [learned] = await mysqlSequelize.query(
        `SELECT * FROM holibot_learned_preferences WHERE ${whereClause}`,
        { replacements: params, type: QueryTypes.SELECT }
      );

      return learned || null;
    } catch (error) {
      logger.warn('Failed to get learned preferences:', error.message);
      return null;
    }
  }

  /**
   * Calculate personalization score for a POI
   * @param {Object} poi - POI data
   * @param {Object} preferences - User preferences
   * @param {Object} learned - Learned preferences
   * @returns {number} Personalization score (0-1)
   */
  calculatePersonalizationScore(poi, preferences, learned) {
    let score = 0.5; // Base score

    if (!preferences || preferences.isDefault) {
      return score;
    }

    // Category preference boost
    const categoryField = CATEGORY_FIELDS[poi.category];
    if (categoryField) {
      const explicitPref = preferences.categories?.[categoryField.explicit?.replace('pref_', '')] || 3;
      score += (explicitPref - 3) * 0.1; // -0.2 to +0.2 based on preference
    }

    // Learned behavior boost
    if (learned) {
      const learnedClicks = learned[categoryField?.learned] || 0;
      score += Math.min(learnedClicks * 0.02, 0.2); // Max +0.2 from learned
    }

    // Budget alignment
    if (preferences.budgetLevel && poi.price_level) {
      const budgetMap = { budget: 1, moderate: 2, premium: 3, luxury: 4 };
      const prefBudget = budgetMap[preferences.budgetLevel] || 2;
      const poiBudget = poi.price_level || 2;
      const budgetDiff = Math.abs(prefBudget - poiBudget);
      score -= budgetDiff * 0.05; // Penalty for budget mismatch
    }

    // Family-friendly boost
    if (preferences.hasChildren && poi.category === 'Beaches & Nature') {
      score += 0.1;
    }

    // Activity level alignment
    if (preferences.activityLevel === 'active' && poi.category === 'Active') {
      score += 0.1;
    } else if (preferences.activityLevel === 'relaxed' && poi.category === 'Beaches & Nature') {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score)); // Clamp to 0-1
  }

  /**
   * Rerank POIs based on user preferences
   * @param {Array} pois - Array of POIs
   * @param {Object} identifier - User identifier
   * @returns {Array} Reranked POIs with personalization scores
   */
  async rerankPois(pois, identifier) {
    if (!pois || pois.length === 0) return pois;

    try {
      const preferences = await this.getPreferences(identifier);
      const learned = await this.getLearnedPreferences(identifier);

      // Calculate personalization score for each POI
      const scoredPois = pois.map(poi => ({
        ...poi,
        personalizationScore: this.calculatePersonalizationScore(poi, preferences, learned)
      }));

      // Sort by combined score (similarity + personalization)
      scoredPois.sort((a, b) => {
        const scoreA = (a.similarity || 0.5) + (a.personalizationScore || 0.5) * 0.3;
        const scoreB = (b.similarity || 0.5) + (b.personalizationScore || 0.5) * 0.3;
        return scoreB - scoreA;
      });

      return scoredPois;
    } catch (error) {
      logger.warn('Failed to rerank POIs:', error.message);
      return pois;
    }
  }

  /**
   * Get personalized category recommendations
   * @param {Object} identifier - User identifier
   * @returns {Array} Recommended categories sorted by preference
   */
  async getRecommendedCategories(identifier) {
    const preferences = await this.getPreferences(identifier);
    const learned = await this.getLearnedPreferences(identifier);

    const categories = Object.entries(CATEGORY_FIELDS).map(([category, fields]) => {
      const explicitScore = preferences.categories?.[fields.explicit?.replace('pref_', '')] || 3;
      const learnedScore = learned?.[fields.learned] || 0;
      const combinedScore = explicitScore + Math.min(learnedScore * 0.5, 2);

      return { category, score: combinedScore };
    });

    return categories.sort((a, b) => b.score - a.score);
  }

  /**
   * Rate a POI
   * @param {Object} data - { sessionId, userId, poiId, rating, feedback }
   */
  async ratePoi(data) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return false;

    const { sessionId, userId, poiId, rating, feedback, wouldRecommend } = data;

    try {
      const identifierField = userId ? 'user_id' : 'session_id';
      const identifierValue = userId || sessionId;

      if (!identifierValue || !poiId || !rating) return false;

      await mysqlSequelize.query(`
        INSERT INTO holibot_poi_ratings (${identifierField}, poi_id, rating, feedback_text, would_recommend)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rating = VALUES(rating),
          feedback_text = VALUES(feedback_text),
          would_recommend = VALUES(would_recommend),
          rated_at = NOW()
      `, {
        replacements: [identifierValue, poiId, rating, feedback || null, wouldRecommend],
        type: QueryTypes.INSERT
      });

      logger.info('POI rated', { poiId, rating, identifierField });
      return true;
    } catch (error) {
      logger.error('Failed to rate POI:', error);
      return false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized;
  }
}

export const preferenceService = new PreferenceService();
export default preferenceService;
