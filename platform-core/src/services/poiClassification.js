/**
 * POI Classification Service
 * AI-driven tier classification based on weighted scoring
 *
 * Score Formula:
 * poi_score = (review_count * 0.3) + (average_rating * 0.2) +
 *             (tourist_relevance * 0.3) + (booking_frequency * 0.2)
 *
 * Tier Classification:
 * - Tier 1 (realtime/hourly): score >= 8.5
 * - Tier 2 (daily): score >= 7.0
 * - Tier 3 (weekly): score >= 5.0
 * - Tier 4 (monthly): score < 5.0
 */

import logger from '../utils/logger.js';
import POI from '../models/POI.js';
import POIScoreHistory from '../models/POIScoreHistory.js';
import dataAggregationService from './dataAggregation.js';
import touristRelevanceService from './touristRelevance.js';
import eventBus from './eventBus.js';
import { mysqlSequelize } from '../config/database.js';
import { Transaction } from 'sequelize';

class POIClassificationService {
  constructor() {
    // Score weights
    this.weights = {
      review_count: 0.3,
      average_rating: 0.2,
      tourist_relevance: 0.3,
      booking_frequency: 0.2,
    };

    // Tier thresholds
    this.tierThresholds = {
      1: 8.5, // realtime/hourly
      2: 7.0, // daily
      3: 5.0, // weekly
      4: 0.0, // monthly
    };

    // Category requirements for balanced tier distribution
    this.requiredCategories = [
      'food_drinks',
      'museum',
      'historical',
      'shopping',
      'activities',
    ];
  }

  /**
   * Classify a single POI with transaction support
   * ENTERPRISE: Atomic updates with rollback on failure
   */
  async classifyPOI(poiId, options = {}) {
    logger.info(`Classifying POI: ${poiId}`);

    // Use provided transaction or create new one
    const transaction = options.transaction || await mysqlSequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    });

    const isExternalTransaction = !!options.transaction;

    try {
      // Get POI (with lock if in transaction)
      const poi = await POI.findByPk(poiId, {
        transaction,
        lock: transaction ? Transaction.LOCK.UPDATE : false,
      });

      if (!poi) {
        throw new Error(`POI ${poiId} not found`);
      }

      // Aggregate data from sources (if update requested)
      if (options.updateData !== false) {
        const aggregatedData = await dataAggregationService.aggregatePOIData(
          poi,
          options.sources || ['google_places', 'tripadvisor']
        );

        // Update POI with aggregated data
        poi.review_count = aggregatedData.review_count;
        poi.average_rating = aggregatedData.average_rating;
      }

      // Calculate tourist relevance (if not set)
      if (!poi.tourist_relevance || options.updateTouristRelevance) {
        poi.tourist_relevance = await touristRelevanceService.calculateRelevance(poi);
      }

      // Get booking frequency from ticketing module
      if (options.updateBookingFrequency) {
        poi.booking_frequency = await this.getBookingFrequency(poi);
      }

      // Calculate POI score
      const oldScore = poi.poi_score;
      const oldTier = poi.tier;

      const newScore = this.calculateScore(poi);
      const newTier = this.calculateTier(newScore);

      // Update POI within transaction
      poi.poi_score = newScore;
      poi.tier = newTier;
      poi.last_classified_at = new Date();
      poi.next_update_at = this.getNextUpdateDate(newTier);

      await poi.save({ transaction });

      // Save to history within transaction
      await POIScoreHistory.create({
        poi_id: poi.id,
        poi_score: newScore,
        review_count: poi.review_count,
        average_rating: poi.average_rating,
        tourist_relevance: poi.tourist_relevance,
        booking_frequency: poi.booking_frequency,
        old_tier: oldTier,
        new_tier: newTier,
      }, { transaction });

      // Commit if we created the transaction
      if (!isExternalTransaction) {
        await transaction.commit();
        logger.debug(`Classification transaction committed for POI ${poiId}`);
      }

      // Publish events AFTER commit (only if we own the transaction)
      if (!isExternalTransaction && oldTier !== newTier) {
        await eventBus.publish('poi.tier.changed', {
          poiId: poi.id,
          name: poi.name,
          oldTier,
          newTier,
          score: newScore,
        });

        logger.info(`POI tier changed: ${poi.name}`, {
          poiId: poi.id,
          oldTier,
          newTier,
          score: newScore,
        });
      }

      logger.info(`POI classified: ${poi.name}`, {
        poiId: poi.id,
        score: newScore,
        tier: newTier,
      });

      return {
        poi,
        score: newScore,
        tier: newTier,
        tierChanged: oldTier !== newTier,
        oldTier,
      };
    } catch (error) {
      // Rollback if we own the transaction
      if (!isExternalTransaction) {
        await transaction.rollback();
        logger.error(`Classification transaction rolled back for POI ${poiId}:`, error);
      }

      logger.error(`POI classification failed for ${poiId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate weighted POI score
   */
  calculateScore(poi) {
    // Normalize review_count (0-10 scale, assuming max 1000 reviews)
    const normalizedReviews = Math.min(poi.review_count / 100, 10);

    // Normalize rating (0-10 scale from 0-5)
    const normalizedRating = (poi.average_rating / 5) * 10;

    // Tourist relevance is already 0-10
    const touristRelevance = poi.tourist_relevance || 0;

    // Normalize booking frequency (0-10 scale, assuming max 100/month)
    const normalizedBookings = Math.min(poi.booking_frequency / 10, 10);

    // Calculate weighted score
    const score = (
      (normalizedReviews * this.weights.review_count) +
      (normalizedRating * this.weights.average_rating) +
      (touristRelevance * this.weights.tourist_relevance) +
      (normalizedBookings * this.weights.booking_frequency)
    );

    return Math.round(score * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate tier from score
   */
  calculateTier(score) {
    if (score >= this.tierThresholds[1]) return 1;
    if (score >= this.tierThresholds[2]) return 2;
    if (score >= this.tierThresholds[3]) return 3;
    return 4;
  }

  /**
   * Get next update date based on tier
   */
  getNextUpdateDate(tier) {
    const now = new Date();

    switch (tier) {
      case 1: // Hourly
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 2: // Daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 3: // Weekly
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 4: // Monthly
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get booking frequency from ticketing module
   */
  async getBookingFrequency(poi) {
    try {
      // This would query the ticketing module
      // For now, return 0 (will be implemented later)
      // TODO: Integrate with ticketing module
      return 0;
    } catch (error) {
      logger.error(`Failed to get booking frequency for POI ${poi.id}:`, error);
      return 0;
    }
  }

  /**
   * Batch classify multiple POIs
   */
  async batchClassify(poiIds, options = {}) {
    logger.info(`Batch classifying ${poiIds.length} POIs`);

    const results = {
      successful: 0,
      failed: 0,
      tierChanges: 0,
      errors: [],
    };

    for (const poiId of poiIds) {
      try {
        const result = await this.classifyPOI(poiId, options);

        results.successful++;
        if (result.tierChanged) {
          results.tierChanges++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          poiId,
          error: error.message,
        });

        logger.error(`Batch classification failed for POI ${poiId}:`, error);
      }
    }

    logger.info('Batch classification complete', results);

    return results;
  }

  /**
   * Ensure balanced category distribution in tiers
   */
  async balanceTierDistribution(tier, city = null) {
    logger.info(`Balancing tier ${tier} distribution`, { city });

    const where = { tier };
    if (city) {
      where.city = city;
    }

    // Get POIs in this tier
    const pois = await POI.findAll({ where });

    // Count by category
    const categoryCount = {};
    for (const poi of pois) {
      categoryCount[poi.category] = (categoryCount[poi.category] || 0) + 1;
    }

    // Check if we have all required categories
    const missingCategories = this.requiredCategories.filter(
      cat => !categoryCount[cat] || categoryCount[cat] === 0
    );

    if (missingCategories.length > 0) {
      logger.warn(`Tier ${tier} missing categories:`, missingCategories);

      // Find POIs in lower tiers with missing categories and high scores
      for (const category of missingCategories) {
        const candidate = await POI.findOne({
          where: {
            category,
            tier: { [POI.sequelize.Op.gt]: tier },
            city: city || { [POI.sequelize.Op.ne]: null },
          },
          order: [['poi_score', 'DESC']],
        });

        if (candidate) {
          // Promote to higher tier
          logger.info(`Promoting POI to tier ${tier} for balance:`, {
            poiId: candidate.id,
            name: candidate.name,
            category,
          });

          candidate.tier = tier;
          candidate.next_update_at = this.getNextUpdateDate(tier);
          await candidate.save();
        }
      }
    }

    return {
      tier,
      city,
      categoryCount,
      missingCategories,
    };
  }

  /**
   * Get POIs due for update
   */
  async getPOIsForUpdate(tier = null, limit = 100) {
    const where = {
      active: true,
      next_update_at: {
        [POI.sequelize.Op.lte]: new Date(),
      },
    };

    if (tier !== null) {
      where.tier = tier;
    }

    const pois = await POI.findAll({
      where,
      order: [['tier', 'ASC'], ['next_update_at', 'ASC']],
      limit,
    });

    return pois;
  }

  /**
   * Get classification statistics
   */
  async getStatistics(city = null) {
    const where = { active: true };
    if (city) {
      where.city = city;
    }

    const stats = await POI.findAll({
      attributes: [
        'tier',
        'category',
        [POI.sequelize.fn('COUNT', POI.sequelize.col('id')), 'count'],
        [POI.sequelize.fn('AVG', POI.sequelize.col('poi_score')), 'avg_score'],
      ],
      where,
      group: ['tier', 'category'],
      raw: true,
    });

    return stats;
  }
}

// Export singleton
const poiClassificationService = new POIClassificationService();
export default poiClassificationService;
