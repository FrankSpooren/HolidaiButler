/**
 * POI Classification Workflows
 * Tier-based update schedules for AI-driven POI classification
 *
 * Tier 1: Realtime/Hourly updates
 * Tier 2: Daily updates
 * Tier 3: Weekly updates
 * Tier 4: Monthly updates
 */

import workflowManager from '../workflowManager.js';
import poiClassificationService from '../../services/poiClassification.js';
import logger from '../../utils/logger.js';

/**
 * Tier 1 POI Updates (Realtime/Hourly)
 * High-value POIs that need frequent updates
 */
workflowManager.register('poi-tier1-updates', {
  name: 'POI Tier 1 Updates',
  description: 'Updates Tier 1 POIs (realtime/hourly)',
  handler: async (data) => {
    logger.workflow('poi-tier1-updates', 'starting', {});

    try {
      // Get Tier 1 POIs due for update
      const pois = await poiClassificationService.getPOIsFor Update(1, 50);

      logger.info(`Found ${pois.length} Tier 1 POIs for update`);

      if (pois.length === 0) {
        return {
          success: true,
          updated: 0,
          message: 'No Tier 1 POIs due for update',
        };
      }

      // Update each POI
      const poiIds = pois.map(p => p.id);
      const results = await poiClassificationService.batchClassify(poiIds, {
        updateData: true,
        updateTouristRelevance: false, // Don't update relevance every hour
        updateBookingFrequency: true,
        sources: ['google_places'], // Only Google for hourly (cost-effective)
      });

      logger.workflow('poi-tier1-updates', 'completed', results);

      return {
        success: true,
        ...results,
        tier: 1,
      };
    } catch (error) {
      logger.error('Tier 1 POI updates failed:', error);
      throw error;
    }
  },
  timeout: 300000, // 5 minutes
});

/**
 * Tier 2 POI Updates (Daily)
 * Important POIs with daily updates
 */
workflowManager.register('poi-tier2-updates', {
  name: 'POI Tier 2 Updates',
  description: 'Updates Tier 2 POIs (daily)',
  handler: async (data) => {
    logger.workflow('poi-tier2-updates', 'starting', {});

    try {
      const pois = await poiClassificationService.getPOIsForUpdate(2, 100);

      logger.info(`Found ${pois.length} Tier 2 POIs for update`);

      if (pois.length === 0) {
        return {
          success: true,
          updated: 0,
          message: 'No Tier 2 POIs due for update',
        };
      }

      const poiIds = pois.map(p => p.id);
      const results = await poiClassificationService.batchClassify(poiIds, {
        updateData: true,
        updateTouristRelevance: false,
        updateBookingFrequency: true,
        sources: ['google_places', 'tripadvisor'], // Multiple sources for better accuracy
      });

      logger.workflow('poi-tier2-updates', 'completed', results);

      return {
        success: true,
        ...results,
        tier: 2,
      };
    } catch (error) {
      logger.error('Tier 2 POI updates failed:', error);
      throw error;
    }
  },
  timeout: 600000, // 10 minutes
});

/**
 * Tier 3 POI Updates (Weekly)
 * Regular POIs with weekly updates
 */
workflowManager.register('poi-tier3-updates', {
  name: 'POI Tier 3 Updates',
  description: 'Updates Tier 3 POIs (weekly)',
  handler: async (data) => {
    logger.workflow('poi-tier3-updates', 'starting', {});

    try {
      const pois = await poiClassificationService.getPOIsForUpdate(3, 200);

      logger.info(`Found ${pois.length} Tier 3 POIs for update`);

      if (pois.length === 0) {
        return {
          success: true,
          updated: 0,
          message: 'No Tier 3 POIs due for update',
        };
      }

      const poiIds = pois.map(p => p.id);
      const results = await poiClassificationService.batchClassify(poiIds, {
        updateData: true,
        updateTouristRelevance: true, // Update relevance weekly
        updateBookingFrequency: true,
        sources: ['google_places', 'tripadvisor'],
      });

      logger.workflow('poi-tier3-updates', 'completed', results);

      return {
        success: true,
        ...results,
        tier: 3,
      };
    } catch (error) {
      logger.error('Tier 3 POI updates failed:', error);
      throw error;
    }
  },
  timeout: 900000, // 15 minutes
});

/**
 * Tier 4 POI Updates (Monthly)
 * Low-priority POIs with monthly updates
 */
workflowManager.register('poi-tier4-updates', {
  name: 'POI Tier 4 Updates',
  description: 'Updates Tier 4 POIs (monthly)',
  handler: async (data) => {
    logger.workflow('poi-tier4-updates', 'starting', {});

    try {
      const pois = await poiClassificationService.getPOIsForUpdate(4, 500);

      logger.info(`Found ${pois.length} Tier 4 POIs for update`);

      if (pois.length === 0) {
        return {
          success: true,
          updated: 0,
          message: 'No Tier 4 POIs due for update',
        };
      }

      const poiIds = pois.map(p => p.id);
      const results = await poiClassificationService.batchClassify(poiIds, {
        updateData: true,
        updateTouristRelevance: true,
        updateBookingFrequency: true,
        sources: ['google_places'], // Single source for cost efficiency
      });

      logger.workflow('poi-tier4-updates', 'completed', results);

      return {
        success: true,
        ...results,
        tier: 4,
      };
    } catch (error) {
      logger.error('Tier 4 POI updates failed:', error);
      throw error;
    }
  },
  timeout: 1800000, // 30 minutes
});

/**
 * Quarterly Tier Rebalancing
 * Reviews all POIs and rebalances tier distribution
 */
workflowManager.register('poi-quarterly-review', {
  name: 'POI Quarterly Review',
  description: 'Quarterly review and rebalancing of all POI tiers',
  handler: async (data) => {
    logger.workflow('poi-quarterly-review', 'starting', {});

    try {
      const POI = (await import('../../models/POI.js')).default;

      // Get all active POIs
      const allPois = await POI.findAll({
        where: { active: true },
        attributes: ['id'],
      });

      logger.info(`Quarterly review: ${allPois.length} POIs`);

      // Full reclassification with all data sources
      const poiIds = allPois.map(p => p.id);

      const results = await poiClassificationService.batchClassify(poiIds, {
        updateData: true,
        updateTouristRelevance: true,
        updateBookingFrequency: true,
        sources: ['google_places', 'tripadvisor', 'booking_com'],
      });

      // Balance tier distribution for each city
      const cities = await POI.findAll({
        attributes: [[POI.sequelize.fn('DISTINCT', POI.sequelize.col('city')), 'city']],
        raw: true,
      });

      const balancingResults = [];
      for (const { city } of cities) {
        for (let tier = 1; tier <= 3; tier++) {
          const balance = await poiClassificationService.balanceTierDistribution(tier, city);
          balancingResults.push(balance);
        }
      }

      logger.workflow('poi-quarterly-review', 'completed', {
        ...results,
        citiesBalanced: cities.length,
      });

      return {
        success: true,
        ...results,
        balancing: balancingResults,
      };
    } catch (error) {
      logger.error('Quarterly review failed:', error);
      throw error;
    }
  },
  timeout: 3600000, // 60 minutes
});

/**
 * New POI Discovery
 * Discovers and adds new POIs from external sources
 */
workflowManager.register('poi-discovery', {
  name: 'POI Discovery',
  description: 'Discovers and adds new POIs',
  handler: async (data) => {
    logger.workflow('poi-discovery', 'starting', data);

    const { city, category, maxResults = 20 } = data;

    if (!city) {
      throw new Error('City is required for POI discovery');
    }

    try {
      const apifyService = (await import('../../services/apify.js')).default;
      const POI = (await import('../../models/POI.js')).default;

      // Search query based on category
      const categoryQueries = {
        food_drinks: `restaurants in ${city}`,
        museum: `museums in ${city}`,
        historical: `historical sites in ${city}`,
        beach: `beaches near ${city}`,
        shopping: `shopping in ${city}`,
        activities: `things to do in ${city}`,
      };

      const query = category ? categoryQueries[category] : `attractions in ${city}`;

      logger.info(`Discovering POIs: ${query}`);

      // Scrape from Google Places
      const results = await apifyService.scrapeGooglePlaces(query, {
        maxResults,
        triggeredBy: 'poi_discovery',
      });

      const newPOIs = [];

      for (const result of results) {
        // Check if POI already exists
        const existing = await POI.findOne({
          where: { google_place_id: result.placeId },
        });

        if (existing) {
          logger.info(`POI already exists: ${result.title}`);
          continue;
        }

        // Create new POI
        const poi = await POI.create({
          name: result.title,
          slug: result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: result.description || '',
          category: category || 'activities',
          address: result.address,
          city: result.city || city,
          country: result.country || 'Netherlands',
          latitude: result.location?.lat,
          longitude: result.location?.lng,
          phone: result.phone,
          website: result.website,
          google_place_id: result.placeId,
          review_count: result.reviewsCount || 0,
          average_rating: result.rating || 0,
          tier: 4, // Start at tier 4
          active: true,
        });

        // Initial classification
        await poiClassificationService.classifyPOI(poi.id, {
          updateData: false, // We already have Google data
          updateTouristRelevance: true,
          updateBookingFrequency: false,
        });

        newPOIs.push(poi);
        logger.info(`New POI added: ${poi.name}`);
      }

      logger.workflow('poi-discovery', 'completed', {
        city,
        category,
        found: results.length,
        added: newPOIs.length,
      });

      return {
        success: true,
        city,
        category,
        found: results.length,
        added: newPOIs.length,
        pois: newPOIs,
      };
    } catch (error) {
      logger.error('POI discovery failed:', error);
      throw error;
    }
  },
  timeout: 600000, // 10 minutes
});

logger.info('POI classification workflows registered');
