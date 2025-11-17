/**
 * Tourist Relevance Service
 * Calculates tourist relevance score (0-10) based on:
 * - POI category
 * - Top attractions ranking from external datasets
 * - Weather dependency
 * - Seasonal relevance
 *
 * Categories:
 * - Food & Drinks, Musea, Beaches, historische POI's,
 *   wandel- en fiets routes, urgente gezondheidszorg
 */

import logger from '../utils/logger.js';
import POI from '../models/POI.js';

class TouristRelevanceService {
  constructor() {
    // Base relevance scores per category
    this.categoryBaseScores = {
      museum: 8.0, // High relevance for tourists
      historical: 8.5, // Very high relevance
      beach: 7.5, // High relevance (weather dependent)
      food_drinks: 7.0, // Moderate-high relevance
      routes: 6.5, // Moderate relevance (weather dependent)
      activities: 7.5, // High relevance
      shopping: 6.0, // Moderate relevance
      healthcare: 3.0, // Low tourist relevance (but important)
      accommodation: 5.0, // Moderate relevance
      nightlife: 6.5, // Moderate relevance
    };

    // Weather dependency factors
    this.weatherDependent = {
      beach: true,
      routes: true,
      activities: true, // Partially
    };

    // Top attraction sources and their weights
    this.topAttractionSources = {
      tripadvisor: 1.0,
      getyourguide: 0.9,
      booking_com: 0.7,
      airbnb: 0.6,
      mindtrip: 0.8,
    };
  }

  /**
   * Calculate tourist relevance score for a POI
   */
  async calculateRelevance(poi) {
    logger.info(`Calculating tourist relevance for: ${poi.name}`);

    let score = 0;

    // 1. Base score from category (40% weight)
    const categoryScore = this.categoryBaseScores[poi.category] || 5.0;
    score += categoryScore * 0.4;

    // 2. Top attractions boost (40% weight)
    const topAttractionBoost = await this.getTopAttractionBoost(poi);
    score += topAttractionBoost * 0.4;

    // 3. Location boost (10% weight) - City center POIs get boost
    const locationBoost = this.getLocationBoost(poi);
    score += locationBoost * 0.1;

    // 4. Verification boost (10% weight)
    const verificationBoost = poi.verified ? 1.0 : 0.5;
    score += verificationBoost * 0.1 * 10; // Normalize to 0-10

    // Ensure score is within 0-10
    score = Math.min(Math.max(score, 0), 10);

    logger.info(`Tourist relevance calculated: ${score}`, {
      poiId: poi.id,
      category: poi.category,
      categoryScore,
      topAttractionBoost,
      locationBoost,
      verificationBoost,
    });

    return Math.round(score * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get boost from top attractions rankings
   */
  async getTopAttractionBoost(poi) {
    try {
      // Check if POI is in any top attractions lists
      // This would query POITopAttractions table
      // For now, we'll use a simplified approach

      const { POITopAttraction } = await import('../models/index.js');

      const topAttractions = await POITopAttraction.findAll({
        where: { poi_id: poi.id },
      });

      if (!topAttractions || topAttractions.length === 0) {
        return 0;
      }

      let totalBoost = 0;
      let totalWeight = 0;

      for (const attraction of topAttractions) {
        const weight = this.topAttractionSources[attraction.source] || 0.5;

        // Calculate boost based on ranking position
        // Top 10 = 10 points, Top 20 = 8 points, etc.
        let positionBoost = 0;
        if (attraction.ranking_position <= 10) {
          positionBoost = 10;
        } else if (attraction.ranking_position <= 20) {
          positionBoost = 8;
        } else if (attraction.ranking_position <= 50) {
          positionBoost = 6;
        } else if (attraction.ranking_position <= 100) {
          positionBoost = 4;
        } else {
          positionBoost = 2;
        }

        totalBoost += positionBoost * weight;
        totalWeight += weight;
      }

      const averageBoost = totalWeight > 0 ? totalBoost / totalWeight : 0;
      return Math.min(averageBoost, 10); // Max 10 points
    } catch (error) {
      logger.error('Failed to get top attraction boost:', error);
      return 0;
    }
  }

  /**
   * Get location boost (city center gets higher score)
   */
  getLocationBoost(poi) {
    // This is a simplified approach
    // In production, you'd calculate distance from city center
    // For now, return moderate boost
    return 5.0;
  }

  /**
   * Check if POI is weather dependent
   */
  isWeatherDependent(poi) {
    return this.weatherDependent[poi.category] === true;
  }

  /**
   * Get seasonal relevance
   */
  getSeasonalRelevance(poi, month) {
    // Beaches are more relevant in summer
    if (poi.category === 'beach') {
      if (month >= 5 && month <= 9) {
        // May to September
        return 1.2; // 20% boost
      } else {
        return 0.8; // 20% reduction
      }
    }

    // Ski routes in winter
    if (poi.category === 'routes' && poi.name.toLowerCase().includes('ski')) {
      if (month >= 11 || month <= 3) {
        // November to March
        return 1.3; // 30% boost
      } else {
        return 0.5; // 50% reduction
      }
    }

    // Museums are year-round
    if (poi.category === 'museum' || poi.category === 'historical') {
      return 1.0; // No seasonal variation
    }

    // Default: slight summer boost for most POIs
    if (month >= 4 && month <= 10) {
      return 1.1; // 10% boost
    }

    return 1.0;
  }

  /**
   * Adjust relevance based on current weather
   */
  adjustForWeather(poi, score, weather) {
    if (!this.isWeatherDependent(poi)) {
      return score;
    }

    // Beaches and outdoor activities reduced in bad weather
    if (poi.category === 'beach' || poi.category === 'routes') {
      if (weather === 'rain' || weather === 'storm') {
        return score * 0.5; // 50% reduction
      } else if (weather === 'cloudy') {
        return score * 0.8; // 20% reduction
      } else if (weather === 'sunny') {
        return score * 1.2; // 20% boost
      }
    }

    // Indoor activities boosted in bad weather
    if (poi.category === 'museum' || poi.category === 'shopping') {
      if (weather === 'rain' || weather === 'storm') {
        return score * 1.3; // 30% boost
      }
    }

    return score;
  }

  /**
   * Get recommended POIs based on weather
   */
  async getWeatherBasedRecommendations(city, weather, limit = 10) {
    const pois = await POI.findAll({
      where: {
        city,
        active: true,
      },
      order: [['poi_score', 'DESC']],
      limit: limit * 2, // Get more than needed for filtering
    });

    // Adjust scores based on weather
    const adjusted = pois.map(poi => ({
      poi,
      adjustedScore: this.adjustForWeather(
        poi,
        poi.tourist_relevance || 5.0,
        weather
      ),
    }));

    // Sort by adjusted score
    adjusted.sort((a, b) => b.adjustedScore - a.adjustedScore);

    return adjusted.slice(0, limit).map(item => item.poi);
  }

  /**
   * Batch update relevance scores
   */
  async batchUpdateRelevance(poiIds) {
    logger.info(`Batch updating relevance for ${poiIds.length} POIs`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const poiId of poiIds) {
      try {
        const poi = await POI.findByPk(poiId);
        if (!poi) {
          throw new Error(`POI ${poiId} not found`);
        }

        const relevance = await this.calculateRelevance(poi);
        poi.tourist_relevance = relevance;
        await poi.save();

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          poiId,
          error: error.message,
        });

        logger.error(`Failed to update relevance for POI ${poiId}:`, error);
      }
    }

    logger.info('Batch relevance update complete', results);

    return results;
  }
}

// Export singleton
const touristRelevanceService = new TouristRelevanceService();
export default touristRelevanceService;
