/**
 * Data Aggregation Service
 * Cross-validates and aggregates data from multiple sources
 */

import logger from '../utils/logger.js';
import apifyService from './apify.js';
import POI from '../models/POI.js';
import POIDataSource from '../models/POIDataSource.js';

class DataAggregationService {
  constructor() {
    // Minimum sources required for validation
    this.minSourcesForValidation = 2;

    // Weight per source (for weighted averages)
    this.sourceWeights = {
      google_places: 1.0,
      tripadvisor: 0.9,
      booking_com: 0.8,
      thefork: 0.7,
      getyourguide: 0.7,
      trustpilot: 0.6,
    };
  }

  /**
   * Aggregate data for a POI from multiple sources
   */
  async aggregatePOIData(poi, sources = ['google_places', 'tripadvisor']) {
    logger.info(`Aggregating data for POI: ${poi.name}`, {
      poiId: poi.id,
      sources,
    });

    const aggregatedData = {
      review_count: 0,
      average_rating: 0,
      data_sources: [],
      raw_sources: [],
    };

    try {
      // Scrape data from each source
      for (const sourceName of sources) {
        try {
          const sourceData = await this.scrapeSource(poi, sourceName);

          if (sourceData) {
            aggregatedData.data_sources.push(sourceData);
            aggregatedData.raw_sources.push(sourceName);

            // Save to database
            await this.saveSourceData(poi.id, sourceName, sourceData);
          }
        } catch (error) {
          logger.error(`Failed to scrape ${sourceName} for POI ${poi.id}:`, error);
          // Continue with other sources
        }
      }

      // Cross-validate and calculate weighted averages
      if (aggregatedData.data_sources.length >= this.minSourcesForValidation) {
        const validated = this.crossValidateData(aggregatedData.data_sources);
        aggregatedData.review_count = validated.review_count;
        aggregatedData.average_rating = validated.average_rating;
        aggregatedData.validated = true;
      } else if (aggregatedData.data_sources.length === 1) {
        // Use single source (less reliable)
        const singleSource = aggregatedData.data_sources[0];
        aggregatedData.review_count = singleSource.review_count || 0;
        aggregatedData.average_rating = singleSource.rating || 0;
        aggregatedData.validated = false;
      } else {
        logger.warn(`Insufficient data sources for POI ${poi.id}`);
        aggregatedData.validated = false;
      }

      return aggregatedData;
    } catch (error) {
      logger.error('Data aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Scrape data from a specific source
   */
  async scrapeSource(poi, sourceName) {
    logger.info(`Scraping ${sourceName} for POI: ${poi.name}`);

    try {
      switch (sourceName) {
        case 'google_places':
          return await this.scrapeGooglePlaces(poi);

        case 'tripadvisor':
          return await this.scrapeTripAdvisor(poi);

        case 'booking_com':
          return await this.scrapeBooking(poi);

        default:
          logger.warn(`Unsupported source: ${sourceName}`);
          return null;
      }
    } catch (error) {
      logger.error(`Scraping ${sourceName} failed:`, error);
      return null;
    }
  }

  /**
   * Scrape Google Places
   */
  async scrapeGooglePlaces(poi) {
    const searchQuery = `${poi.name}, ${poi.city}, ${poi.country}`;

    const results = await apifyService.scrapeGooglePlaces(searchQuery, {
      maxResults: 5,
      poiId: poi.id,
      triggeredBy: 'data_aggregation',
    });

    if (!results || results.length === 0) {
      return null;
    }

    // Find best match
    const bestMatch = this.findBestMatch(poi, results);

    if (!bestMatch) {
      return null;
    }

    return {
      source_id: bestMatch.placeId,
      source_url: bestMatch.url,
      rating: bestMatch.rating || 0,
      review_count: bestMatch.reviewsCount || 0,
      price_level: bestMatch.priceLevel || null,
      ranking: null,
      raw_data: bestMatch,
    };
  }

  /**
   * Scrape TripAdvisor
   */
  async scrapeTripAdvisor(poi) {
    // For TripAdvisor, we need the URL
    // If we don't have it, try to find it first
    if (!poi.tripadvisor_id) {
      logger.warn(`No TripAdvisor ID for POI ${poi.id}`);
      return null;
    }

    const url = `https://www.tripadvisor.com/${poi.tripadvisor_id}`;

    const results = await apifyService.scrapeTripAdvisor([url], {
      maxReviews: 50,
      poiId: poi.id,
      triggeredBy: 'data_aggregation',
    });

    if (!results || results.length === 0) {
      return null;
    }

    const data = results[0];

    return {
      source_id: poi.tripadvisor_id,
      source_url: url,
      rating: data.rating || 0,
      review_count: data.reviewsCount || 0,
      price_level: data.priceLevel || null,
      ranking: data.rankingPosition || null,
      raw_data: data,
    };
  }

  /**
   * Scrape Booking.com
   */
  async scrapeBooking(poi) {
    if (poi.category !== 'accommodation') {
      logger.info(`Skipping Booking.com for non-accommodation POI ${poi.id}`);
      return null;
    }

    const searchQuery = `${poi.name}, ${poi.city}`;

    const results = await apifyService.scrapeBooking(searchQuery, {
      maxResults: 5,
      poiId: poi.id,
      triggeredBy: 'data_aggregation',
    });

    if (!results || results.length === 0) {
      return null;
    }

    const bestMatch = this.findBestMatch(poi, results);

    if (!bestMatch) {
      return null;
    }

    return {
      source_id: bestMatch.hotel_id || bestMatch.id,
      source_url: bestMatch.url,
      rating: bestMatch.reviewScore || 0,
      review_count: bestMatch.reviewCount || 0,
      price_level: null,
      ranking: null,
      raw_data: bestMatch,
    };
  }

  /**
   * Find best matching result
   */
  findBestMatch(poi, results) {
    if (!results || results.length === 0) {
      return null;
    }

    // Simple matching: find result with highest similarity to POI name
    let bestMatch = null;
    let highestScore = 0;

    for (const result of results) {
      const resultName = result.title || result.name || '';
      const score = this.calculateNameSimilarity(poi.name, resultName);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = result;
      }
    }

    // Only return if similarity is above threshold
    return highestScore > 0.6 ? bestMatch : null;
  }

  /**
   * Calculate name similarity (simple Levenshtein-based)
   */
  calculateNameSimilarity(name1, name2) {
    const str1 = name1.toLowerCase().trim();
    const str2 = name2.toLowerCase().trim();

    // Simple substring match for now
    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;

    // Check word overlap
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    const overlap = commonWords.length / Math.max(words1.length, words2.length);

    return overlap;
  }

  /**
   * Cross-validate data from multiple sources
   */
  crossValidateData(sources) {
    logger.info(`Cross-validating data from ${sources.length} sources`);

    let totalWeightedRating = 0;
    let totalRatingWeight = 0;
    let totalReviewCount = 0;

    for (const source of sources) {
      const weight = this.sourceWeights[source.source_name] || 0.5;

      if (source.rating && source.rating > 0) {
        // Normalize rating to 0-5 scale
        const normalizedRating = this.normalizeRating(source.rating, source.source_name);
        totalWeightedRating += normalizedRating * weight;
        totalRatingWeight += weight;
      }

      if (source.review_count) {
        totalReviewCount += source.review_count;
      }
    }

    const averageRating = totalRatingWeight > 0
      ? totalWeightedRating / totalRatingWeight
      : 0;

    // Take average of review counts (they may overlap)
    const avgReviewCount = Math.round(totalReviewCount / sources.length);

    logger.info('Cross-validation complete', {
      sources: sources.length,
      averageRating,
      reviewCount: avgReviewCount,
    });

    return {
      average_rating: Math.round(averageRating * 100) / 100,
      review_count: avgReviewCount,
      source_count: sources.length,
    };
  }

  /**
   * Normalize rating to 0-5 scale
   */
  normalizeRating(rating, sourceName) {
    switch (sourceName) {
      case 'google_places':
      case 'tripadvisor':
        return rating; // Already 0-5

      case 'booking_com':
        return rating / 2; // Booking is 0-10, convert to 0-5

      case 'trustpilot':
        return rating; // Already 0-5

      default:
        return rating;
    }
  }

  /**
   * Save source data to database
   */
  async saveSourceData(poiId, sourceName, data) {
    try {
      await POIDataSource.upsert({
        poi_id: poiId,
        source_name: sourceName,
        source_id: data.source_id,
        source_url: data.source_url,
        rating: data.rating,
        review_count: data.review_count,
        price_level: data.price_level,
        ranking: data.ranking,
        raw_data: data.raw_data,
        last_scraped_at: new Date(),
        scrape_status: 'success',
      });

      logger.info(`Saved ${sourceName} data for POI ${poiId}`);
    } catch (error) {
      logger.error(`Failed to save ${sourceName} data:`, error);
    }
  }

  /**
   * Get existing source data for a POI
   */
  async getExistingData(poiId) {
    const sources = await POIDataSource.findAll({
      where: { poi_id: poiId },
      order: [['last_scraped_at', 'DESC']],
    });

    return sources;
  }
}

// Export singleton
const dataAggregationService = new DataAggregationService();
export default dataAggregationService;
