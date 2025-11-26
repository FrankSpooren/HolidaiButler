/**
 * Apify Integration Service
 * Cost-effective webscraping for POI data aggregation
 * Budget: €50/month (~$54)
 */

import { ApifyClient } from 'apify-client';
import logger from '../utils/logger.js';
import APIUsageLog from '../models/APIUsageLog.js';
import circuitBreakerManager from './circuitBreaker.js';
import metricsService from './metrics.js';

class ApifyService {
  constructor() {
    if (!process.env.APIFY_API_TOKEN) {
      logger.warn('Apify API token not configured');
      this.client = null;
      return;
    }

    this.client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    // Apify Actor IDs (popular verified actors)
    this.actors = {
      googlePlaces: 'nwua9Gu5YrADL7ZDj', // Google Maps Scraper
      tripadvisor: 'u6F0Pc34zJi0j6Ebw', // TripAdvisor Scraper
      booking: 'OtzYfK1ndEGdwWFKQ', // Booking.com Scraper
    };

    // Cost estimates (in Apify compute units)
    this.costEstimates = {
      googlePlaces: 0.003, // ~$0.003 per result
      tripadvisor: 0.005, // ~$0.005 per result
      booking: 0.004, // ~$0.004 per result
    };

    this.monthlyBudget = parseFloat(process.env.APIFY_MONTHLY_BUDGET_EUR || '50');
  }

  /**
   * Check if we're within budget
   */
  async checkBudget() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const spent = await APIUsageLog.getMonthlySpend(year, month);

    const remainingBudget = this.monthlyBudget - spent.total_cost;

    if (remainingBudget <= 0) {
      logger.warn('Monthly API budget exceeded', {
        budget: this.monthlyBudget,
        spent: spent.total_cost,
      });
      return false;
    }

    if (remainingBudget < 5) {
      logger.warn('API budget running low', {
        remaining: remainingBudget,
      });
    }

    return true;
  }

  /**
   * Log API usage
   */
  async logUsage(data) {
    try {
      await APIUsageLog.create({
        service_name: 'apify',
        actor_id: data.actorId,
        operation_type: data.operationType || 'scrape',
        items_processed: data.itemsProcessed || 1,
        credits_used: data.creditsUsed || 0,
        estimated_cost_eur: data.estimatedCost || 0,
        duration_seconds: data.duration || 0,
        status: data.status || 'success',
        error_message: data.error || null,
        poi_id: data.poiId || null,
        triggered_by: data.triggeredBy || 'system',
      });

      logger.integration('apify.usage_logged', {
        cost: data.estimatedCost,
        items: data.itemsProcessed,
      });
    } catch (error) {
      logger.error('Failed to log API usage:', error);
    }
  }

  /**
   * Scrape Google Places data
   */
  async scrapeGooglePlaces(query, options = {}) {
    if (!this.client) {
      throw new Error('Apify client not initialized');
    }

    const canProceed = await this.checkBudget();
    if (!canProceed && !options.force) {
      throw new Error('Monthly budget exceeded');
    }

    const startTime = Date.now();

    try {
      logger.info('Starting Google Places scrape', { query });

      const input = {
        searchStringsArray: Array.isArray(query) ? query : [query],
        maxCrawledPlacesPerSearch: options.maxResults || 20,
        language: 'nl',
        countryCode: 'nl',
        ...options.additionalParams,
      };

      // ENTERPRISE: Circuit breaker protection for Apify API
      const run = await circuitBreakerManager.execute(
        'apify-google-places',
        async () => {
          return await this.client.actor(this.actors.googlePlaces).call(input);
        },
        {
          failureThreshold: 50, // 50% failure rate
          timeout: 120000, // 2 minutes
          fallback: () => {
            logger.warn('Circuit breaker open for Google Places, returning empty results');
            return { defaultDatasetId: null };
          },
        }
      );

      // Handle circuit breaker fallback
      if (!run.defaultDatasetId) {
        throw new Error('Apify service unavailable (circuit breaker open)');
      }

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      const duration = Math.floor((Date.now() - startTime) / 1000);
      const estimatedCost = items.length * this.costEstimates.googlePlaces;

      await this.logUsage({
        actorId: this.actors.googlePlaces,
        operationType: 'scrape',
        itemsProcessed: items.length,
        creditsUsed: run.stats?.computeUnits || 0,
        estimatedCost,
        duration,
        status: 'success',
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      // ENTERPRISE: Record Prometheus metrics
      metricsService.recordExternalApiRequest(
        'apify',
        'google_places',
        'success',
        duration,
        estimatedCost
      );

      logger.info('Google Places scrape completed', {
        results: items.length,
        duration,
        cost: estimatedCost,
      });

      return items;
    } catch (error) {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.logUsage({
        actorId: this.actors.googlePlaces,
        operationType: 'scrape',
        itemsProcessed: 0,
        estimatedCost: 0,
        duration,
        status: 'failed',
        error: error.message,
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      // ENTERPRISE: Record failed API request metrics
      metricsService.recordExternalApiRequest(
        'apify',
        'google_places',
        'failed',
        duration,
        0
      );

      logger.error('Google Places scrape failed:', error);
      throw error;
    }
  }

  /**
   * Scrape TripAdvisor data
   */
  async scrapeTripAdvisor(urls, options = {}) {
    if (!this.client) {
      throw new Error('Apify client not initialized');
    }

    const canProceed = await this.checkBudget();
    if (!canProceed && !options.force) {
      throw new Error('Monthly budget exceeded');
    }

    const startTime = Date.now();

    try {
      logger.info('Starting TripAdvisor scrape', { urls: urls.length });

      const input = {
        startUrls: urls.map(url => ({ url })),
        maxReviews: options.maxReviews || 50,
        language: 'nl',
        currency: 'EUR',
        ...options.additionalParams,
      };

      // ENTERPRISE: Circuit breaker protection for Apify API
      const run = await circuitBreakerManager.execute(
        'apify-tripadvisor',
        async () => {
          return await this.client.actor(this.actors.tripadvisor).call(input);
        },
        {
          failureThreshold: 50,
          timeout: 120000,
          fallback: () => {
            logger.warn('Circuit breaker open for TripAdvisor, returning empty results');
            return { defaultDatasetId: null };
          },
        }
      );

      // Handle circuit breaker fallback
      if (!run.defaultDatasetId) {
        throw new Error('Apify TripAdvisor service unavailable (circuit breaker open)');
      }

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      const duration = Math.floor((Date.now() - startTime) / 1000);
      const estimatedCost = items.length * this.costEstimates.tripadvisor;

      await this.logUsage({
        actorId: this.actors.tripadvisor,
        operationType: 'scrape',
        itemsProcessed: items.length,
        creditsUsed: run.stats?.computeUnits || 0,
        estimatedCost,
        duration,
        status: 'success',
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      logger.info('TripAdvisor scrape completed', {
        results: items.length,
        duration,
        cost: estimatedCost,
      });

      return items;
    } catch (error) {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.logUsage({
        actorId: this.actors.tripadvisor,
        operationType: 'scrape',
        itemsProcessed: 0,
        estimatedCost: 0,
        duration,
        status: 'failed',
        error: error.message,
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      logger.error('TripAdvisor scrape failed:', error);
      throw error;
    }
  }

  /**
   * Scrape Booking.com data
   */
  async scrapeBooking(query, options = {}) {
    if (!this.client) {
      throw new Error('Apify client not initialized');
    }

    const canProceed = await this.checkBudget();
    if (!canProceed && !options.force) {
      throw new Error('Monthly budget exceeded');
    }

    const startTime = Date.now();

    try {
      logger.info('Starting Booking.com scrape', { query });

      const input = {
        search: query,
        destType: options.destType || 'city',
        maxItems: options.maxResults || 20,
        ...options.additionalParams,
      };

      // ENTERPRISE: Circuit breaker protection for Apify API
      const run = await circuitBreakerManager.execute(
        'apify-booking',
        async () => {
          return await this.client.actor(this.actors.booking).call(input);
        },
        {
          failureThreshold: 50,
          timeout: 120000,
          fallback: () => {
            logger.warn('Circuit breaker open for Booking.com, returning empty results');
            return { defaultDatasetId: null };
          },
        }
      );

      // Handle circuit breaker fallback
      if (!run.defaultDatasetId) {
        throw new Error('Apify Booking.com service unavailable (circuit breaker open)');
      }

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      const duration = Math.floor((Date.now() - startTime) / 1000);
      const estimatedCost = items.length * this.costEstimates.booking;

      await this.logUsage({
        actorId: this.actors.booking,
        operationType: 'scrape',
        itemsProcessed: items.length,
        creditsUsed: run.stats?.computeUnits || 0,
        estimatedCost,
        duration,
        status: 'success',
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      logger.info('Booking.com scrape completed', {
        results: items.length,
        duration,
        cost: estimatedCost,
      });

      return items;
    } catch (error) {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.logUsage({
        actorId: this.actors.booking,
        operationType: 'scrape',
        itemsProcessed: 0,
        estimatedCost: 0,
        duration,
        status: 'failed',
        error: error.message,
        poiId: options.poiId,
        triggeredBy: options.triggeredBy || 'system',
      });

      logger.error('Booking.com scrape failed:', error);
      throw error;
    }
  }

  /**
   * Get current month usage statistics
   */
  async getMonthlyUsage() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const spent = await APIUsageLog.getMonthlySpend(year, month);

    return {
      year,
      month,
      budget: this.monthlyBudget,
      spent: spent.total_cost,
      remaining: this.monthlyBudget - spent.total_cost,
      percentage: (spent.total_cost / this.monthlyBudget) * 100,
      total_calls: spent.total_calls,
    };
  }
}

// Export singleton
const apifyService = new ApifyService();
export default apifyService;
