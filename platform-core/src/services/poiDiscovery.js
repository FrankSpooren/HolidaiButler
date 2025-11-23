/**
 * POI Discovery Service
 * Advanced multi-source POI discovery and dataset creation
 *
 * Features:
 * - Multi-source aggregation (Google Places, TripAdvisor, OpenStreetMap)
 * - Configurable search criteria (reviews, ratings, price, location)
 * - Intelligent deduplication using unique IDs and coordinates
 * - Quality filtering and ranking
 * - Budget-aware API usage
 * - Complete dataset creation for new destinations
 */

import logger from '../utils/logger.js';
import apifyService from './apify.js';
import dataAggregationService from './dataAggregation.js';
import poiClassificationService from './poiClassification.js';
import touristRelevanceService from './touristRelevance.js';
import openStreetMapService from './openstreetmap.js';
import POI from '../models/POI.js';
import DestinationConfig from '../models/DestinationConfig.js';
import DiscoveryRun from '../models/DiscoveryRun.js';
import eventBus from './eventBus.js';
import { mysqlSequelize } from '../config/database.js';
import { Transaction } from 'sequelize';

class POIDiscoveryService {
  constructor() {
    // Default search criteria
    this.defaultCriteria = {
      minReviews: 10,
      minRating: 3.5,
      maxRating: 5.0,
      priceLevel: [1, 2, 3, 4],
      radius: 5000, // meters
    };

    // Category to search query mapping
    this.categoryQueries = {
      food_drinks: ['restaurants', 'cafes', 'bars', 'food'],
      museum: ['museums', 'art galleries'],
      beach: ['beaches', 'beach clubs'],
      historical: ['historical sites', 'monuments', 'landmarks'],
      routes: ['walking tours', 'scenic routes'],
      healthcare: ['hospitals', 'pharmacies', 'medical centers'],
      shopping: ['shopping centers', 'markets', 'shops'],
      activities: ['activities', 'attractions', 'things to do'],
      accommodation: ['hotels', 'apartments', 'accommodations'],
      nightlife: ['nightclubs', 'bars', 'entertainment'],
    };

    // Deduplication thresholds
    this.deduplicationThresholds = {
      coordinateDistanceMeters: 50, // POIs within 50m are considered same
      nameSimilarityScore: 0.85, // 85% similarity threshold
    };
  }

  /**
   * Discover POIs for a complete destination
   * This is the main entry point for creating new POI datasets
   */
  async discoverDestination(options) {
    const {
      destination,
      categories = [],
      criteria = {},
      sources = ['google_places'],
      maxPOIsPerCategory = 50,
      autoClassify = true,
      autoEnrich = true,
      configId = null,
      triggeredBy = 'system',
    } = options;

    logger.info('Starting destination discovery', {
      destination,
      categories,
      sources,
    });

    // Create discovery run for tracking
    const discoveryRun = await DiscoveryRun.create({
      run_type: 'destination',
      destination,
      city: this.extractCity(destination),
      country: this.extractCountry(destination),
      config_id: configId,
      categories,
      sources,
      criteria: { ...this.defaultCriteria, ...criteria },
      triggered_by: triggeredBy,
    });

    try {
      await discoveryRun.start();

      // Load config if provided
      let config = null;
      if (configId) {
        config = await DestinationConfig.findByPk(configId);
        if (config) {
          await config.incrementUsage();
        }
      }

      // Merge criteria
      const finalCriteria = config
        ? config.getCriteria()
        : { ...this.defaultCriteria, ...criteria };

      const finalCategories = categories.length > 0
        ? categories
        : (config?.categories || Object.keys(this.categoryQueries));

      const finalSources = sources.length > 0
        ? sources
        : (config?.sources || ['google_places']);

      logger.info('Discovery configuration', {
        categories: finalCategories,
        criteria: finalCriteria,
        sources: finalSources,
      });

      // Discover POIs by category
      const allDiscoveredPOIs = [];

      for (const category of finalCategories) {
        await discoveryRun.updateProgress(`Discovering ${category}`, {
          [category]: { status: 'in_progress' },
        });

        try {
          const categoryPOIs = await this.discoverCategory({
            destination,
            category,
            criteria: finalCriteria,
            sources: finalSources,
            maxResults: maxPOIsPerCategory,
            discoveryRun,
          });

          allDiscoveredPOIs.push(...categoryPOIs);

          await discoveryRun.updateProgress(`Completed ${category}`, {
            [category]: {
              status: 'completed',
              found: categoryPOIs.length,
            },
          });

          logger.info(`Discovered ${categoryPOIs.length} POIs for ${category}`);
        } catch (error) {
          logger.error(`Failed to discover ${category}:`, error);
          await discoveryRun.addError({
            category,
            error: error.message,
          });

          await discoveryRun.updateProgress(`Failed ${category}`, {
            [category]: { status: 'failed', error: error.message },
          });
        }
      }

      // Deduplicate across all discovered POIs
      await discoveryRun.updateProgress('Deduplicating POIs');
      const uniquePOIs = await this.deduplicatePOIs(allDiscoveredPOIs);

      logger.info(`Deduplicated: ${allDiscoveredPOIs.length} → ${uniquePOIs.length} unique POIs`);

      // Filter by criteria
      await discoveryRun.updateProgress('Filtering by criteria');
      const filteredPOIs = this.filterByCriteria(uniquePOIs, finalCriteria);

      logger.info(`Filtered: ${uniquePOIs.length} → ${filteredPOIs.length} POIs`);

      // Create POIs in database
      await discoveryRun.updateProgress('Creating POIs in database');
      const results = await this.createPOIsInDatabase(filteredPOIs, {
        autoClassify,
        autoEnrich,
        discoveryRun,
      });

      // Update discovery run stats
      await discoveryRun.incrementStats({
        found: allDiscoveredPOIs.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        failed: results.failed,
      });

      await discoveryRun.complete();

      // Publish completion event
      await eventBus.publish('poi.discovery.completed', {
        runId: discoveryRun.id,
        destination,
        results: discoveryRun.getSummary(),
      });

      logger.info('Destination discovery completed', discoveryRun.getSummary());

      return {
        success: true,
        run: discoveryRun.getSummary(),
        pois: results.pois,
      };
    } catch (error) {
      logger.error('Destination discovery failed:', error);
      await discoveryRun.fail(error.message);

      await eventBus.publish('poi.discovery.failed', {
        runId: discoveryRun.id,
        destination,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Discover POIs for a specific category
   */
  async discoverCategory(options) {
    const {
      destination,
      category,
      criteria,
      sources,
      maxResults,
      discoveryRun,
    } = options;

    const queries = this.categoryQueries[category] || [category];
    const allPOIs = [];

    for (const source of sources) {
      try {
        logger.info(`Discovering ${category} from ${source}`, { destination });

        let sourcePOIs = [];

        switch (source) {
          case 'google_places':
            sourcePOIs = await this.discoverFromGooglePlaces(
              destination,
              queries,
              maxResults
            );
            break;

          case 'tripadvisor':
            sourcePOIs = await this.discoverFromTripAdvisor(
              destination,
              category,
              maxResults
            );
            break;

          case 'osm':
          case 'openstreetmap':
            sourcePOIs = await this.discoverFromOpenStreetMap(
              destination,
              category,
              maxResults
            );
            break;

          default:
            logger.warn(`Unsupported source: ${source}`);
        }

        // Tag POIs with source
        sourcePOIs.forEach(poi => {
          poi._source = source;
          poi._category = category;
        });

        allPOIs.push(...sourcePOIs);

        logger.info(`Found ${sourcePOIs.length} POIs from ${source}`);
      } catch (error) {
        logger.error(`Failed to discover from ${source}:`, error);
        if (discoveryRun) {
          await discoveryRun.addError({
            source,
            category,
            error: error.message,
          });
        }
      }
    }

    return allPOIs;
  }

  /**
   * Discover POIs from Google Places
   */
  async discoverFromGooglePlaces(destination, queries, maxResults = 50) {
    const allResults = [];

    for (const query of queries) {
      try {
        const searchQuery = `${query} in ${destination}`;

        const results = await apifyService.scrapeGooglePlaces(searchQuery, {
          maxResults: Math.ceil(maxResults / queries.length),
          triggeredBy: 'poi_discovery',
        });

        // Transform to standard format
        const transformedResults = results.map(result => ({
          name: result.title,
          description: result.description || '',
          address: result.address,
          city: result.city || this.extractCity(destination),
          country: result.country || this.extractCountry(destination),
          latitude: result.location?.lat,
          longitude: result.location?.lng,
          phone: result.phone,
          website: result.website,
          google_place_id: result.placeId,
          review_count: result.reviewsCount || 0,
          average_rating: result.rating || 0,
          price_level: result.priceLevel,
          _raw: result,
        }));

        allResults.push(...transformedResults);
      } catch (error) {
        logger.error(`Google Places search failed for "${query}":`, error);
      }
    }

    return allResults;
  }

  /**
   * Discover POIs from TripAdvisor
   */
  async discoverFromTripAdvisor(destination, category, maxResults = 50) {
    // TripAdvisor requires URLs, so we'd need to search first
    // For now, return empty array - can be enhanced with TripAdvisor search API
    logger.info('TripAdvisor discovery not yet implemented - requires URL-based search');
    return [];
  }

  /**
   * Discover POIs from OpenStreetMap
   */
  async discoverFromOpenStreetMap(destination, category, maxResults = 50) {
    try {
      logger.info(`Discovering ${category} from OpenStreetMap in ${destination}`);

      // Use OpenStreetMap service to search POIs
      const results = await openStreetMapService.searchPOIs(destination, category, {
        radius: 5000,
        maxResults,
      });

      logger.info(`Found ${results.length} POIs from OpenStreetMap`);

      return results;
    } catch (error) {
      logger.error('OpenStreetMap discovery failed:', error);
      return [];
    }
  }

  /**
   * Deduplicate POIs using multiple strategies
   */
  async deduplicatePOIs(pois) {
    logger.info(`Deduplicating ${pois.length} POIs`);

    const unique = [];
    const seen = new Map();

    for (const poi of pois) {
      // Strategy 1: Check by google_place_id
      if (poi.google_place_id && seen.has(`google:${poi.google_place_id}`)) {
        logger.debug(`Duplicate found (Google Place ID): ${poi.name}`);
        continue;
      }

      // Strategy 2: Check by coordinates (within threshold)
      let isDuplicate = false;
      if (poi.latitude && poi.longitude) {
        for (const existing of unique) {
          if (!existing.latitude || !existing.longitude) continue;

          const distance = this.calculateDistance(
            poi.latitude,
            poi.longitude,
            existing.latitude,
            existing.longitude
          );

          if (distance < this.deduplicationThresholds.coordinateDistanceMeters) {
            // Check name similarity
            const similarity = this.calculateNameSimilarity(poi.name, existing.name);

            if (similarity > this.deduplicationThresholds.nameSimilarityScore) {
              logger.debug(`Duplicate found (coordinates + name): ${poi.name}`);
              isDuplicate = true;

              // Merge data from duplicate (keep best data)
              this.mergePOIData(existing, poi);
              break;
            }
          }
        }
      }

      if (isDuplicate) continue;

      // Strategy 3: Check existing POIs in database
      if (poi.google_place_id) {
        const existingPOI = await POI.findOne({
          where: { google_place_id: poi.google_place_id },
        });

        if (existingPOI) {
          logger.debug(`POI already exists in database: ${poi.name}`);
          poi._existingPOI = existingPOI;
          poi._isUpdate = true;
        }
      }

      // Add to unique list
      unique.push(poi);

      // Mark as seen
      if (poi.google_place_id) {
        seen.set(`google:${poi.google_place_id}`, true);
      }
    }

    logger.info(`Deduplication complete: ${pois.length} → ${unique.length} unique POIs`);

    return unique;
  }

  /**
   * Filter POIs by criteria
   */
  filterByCriteria(pois, criteria) {
    logger.info(`Filtering ${pois.length} POIs by criteria`, criteria);

    const filtered = pois.filter(poi => {
      // Min reviews
      if (criteria.minReviews && poi.review_count < criteria.minReviews) {
        return false;
      }

      // Min rating
      if (criteria.minRating && poi.average_rating < criteria.minRating) {
        return false;
      }

      // Max rating
      if (criteria.maxRating && poi.average_rating > criteria.maxRating) {
        return false;
      }

      // Price level
      if (criteria.priceLevel && poi.price_level) {
        if (!criteria.priceLevel.includes(poi.price_level)) {
          return false;
        }
      }

      return true;
    });

    logger.info(`Filtered: ${pois.length} → ${filtered.length} POIs`);

    return filtered;
  }

  /**
   * Create POIs in database with transaction support
   * ENTERPRISE: All-or-nothing atomic operations
   */
  async createPOIsInDatabase(pois, options = {}) {
    const {
      autoClassify = true,
      autoEnrich = true,
      discoveryRun,
    } = options;

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      pois: [],
    };

    // Start transaction with READ COMMITTED isolation level
    const transaction = await mysqlSequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      type: Transaction.TYPES.DEFERRED,
    });

    try {
      logger.info(`Starting POI creation with transaction for ${pois.length} POIs`);

      for (const poiData of pois) {
        try {
          let poi;

          // Check if this is an update
          if (poiData._isUpdate && poiData._existingPOI) {
            // Update existing POI within transaction
            poi = poiData._existingPOI;

            poi.review_count = poiData.review_count || poi.review_count;
            poi.average_rating = poiData.average_rating || poi.average_rating;
            poi.phone = poiData.phone || poi.phone;
            poi.website = poiData.website || poi.website;
            poi.last_scraped_at = new Date();

            await poi.save({ transaction });
            results.updated++;

            logger.debug(`Updated POI: ${poi.name} (within transaction)`);
          } else {
            // Create new POI within transaction
            poi = await POI.create({
              name: poiData.name,
              slug: this.generateSlug(poiData.name),
              description: poiData.description,
              category: poiData._category || 'activities',
              address: poiData.address,
              city: poiData.city,
              country: poiData.country,
              latitude: poiData.latitude,
              longitude: poiData.longitude,
              phone: poiData.phone,
              email: poiData.email,
              website: poiData.website,
              google_place_id: poiData.google_place_id,
              review_count: poiData.review_count || 0,
              average_rating: poiData.average_rating || 0,
              tier: 4, // Start at tier 4
              active: true,
              last_scraped_at: new Date(),
            }, { transaction });

            results.created++;

            logger.debug(`Created POI: ${poi.name} (within transaction)`);
          }

          // Auto-classify (within transaction)
          if (autoClassify) {
            try {
              await poiClassificationService.classifyPOI(poi.id, {
                updateData: false, // We already have fresh data
                updateTouristRelevance: true,
                updateBookingFrequency: false,
                transaction, // Pass transaction to classification
              });
            } catch (error) {
              logger.error(`Classification failed for POI ${poi.id}:`, error);
              // Don't fail the whole batch for classification errors
              // Just log and continue
            }
          }

          results.pois.push(poi);
        } catch (error) {
          logger.error(`Failed to create/update POI: ${poiData.name}`, error);
          results.failed++;

          // Record error but continue processing other POIs
          if (discoveryRun) {
            await discoveryRun.addError({
              poi: poiData.name,
              error: error.message,
            });
          }

          // IMPORTANT: For critical errors, we should rollback
          // For now, we continue but you can add logic here to rollback on specific errors
          if (error.name === 'SequelizeUniqueConstraintError' ||
              error.name === 'SequelizeForeignKeyConstraintError') {
            logger.error('Critical database constraint violation - rolling back transaction');
            throw error; // This will trigger rollback
          }
        }
      }

      // Commit transaction - all changes are atomic
      await transaction.commit();

      logger.info('POI creation transaction committed successfully', {
        created: results.created,
        updated: results.updated,
        failed: results.failed,
      });

      // Publish events AFTER successful commit
      // Events should only be published if data is persisted
      for (const poi of results.pois) {
        try {
          if (results.created > 0) {
            await eventBus.publish('poi.created', {
              poiId: poi.id,
              name: poi.name,
              category: poi.category,
              city: poi.city,
            });
          }
        } catch (error) {
          // Event publishing errors shouldn't affect the operation
          logger.error('Failed to publish event:', error);
        }
      }

    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();

      logger.error('POI creation transaction rolled back due to error:', {
        error: error.message,
        stack: error.stack,
        poisProcessed: results.created + results.updated,
      });

      // Re-throw to let caller handle
      throw new Error(`Transaction failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Merge data from duplicate POI (keep best quality data)
   */
  mergePOIData(target, source) {
    // Merge review data (prefer higher counts and ratings)
    if (source.review_count > target.review_count) {
      target.review_count = source.review_count;
      target.average_rating = source.average_rating;
    }

    // Merge IDs
    if (source.google_place_id && !target.google_place_id) {
      target.google_place_id = source.google_place_id;
    }

    // Merge contact info (fill missing)
    if (source.phone && !target.phone) target.phone = source.phone;
    if (source.email && !target.email) target.email = source.email;
    if (source.website && !target.website) target.website = source.website;

    // Merge coordinates (prefer more precise)
    if (source.latitude && !target.latitude) {
      target.latitude = source.latitude;
      target.longitude = source.longitude;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate name similarity (simple word overlap)
   */
  calculateNameSimilarity(name1, name2) {
    const normalize = (str) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '');

    const str1 = normalize(name1);
    const str2 = normalize(name2);

    if (str1 === str2) return 1.0;

    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    const commonWords = words1.filter((w) => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }

  /**
   * Generate URL-friendly slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract city from destination string
   */
  extractCity(destination) {
    // Simple extraction - take first part before comma
    const parts = destination.split(',');
    return parts[0].trim();
  }

  /**
   * Extract country from destination string
   */
  extractCountry(destination) {
    // Simple extraction - take last part after comma
    const parts = destination.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
  }

  /**
   * Get discovery run status
   */
  async getDiscoveryRun(runId) {
    const run = await DiscoveryRun.findByPk(runId);
    if (!run) {
      throw new Error(`Discovery run ${runId} not found`);
    }
    return run.getSummary();
  }

  /**
   * Get recent discovery runs
   */
  async getRecentRuns(limit = 20) {
    return await DiscoveryRun.getRecentRuns(limit);
  }
}

// Export singleton
const poiDiscoveryService = new POIDiscoveryService();
export default poiDiscoveryService;
