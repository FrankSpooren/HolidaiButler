/**
 * Enterprise Caching Service
 * Redis-based caching layer for performance optimization
 *
 * Features:
 * - Multi-tier caching strategy (L1: memory, L2: Redis)
 * - Automatic cache invalidation
 * - Cache-aside pattern
 * - Read-through caching
 * - TTL management
 * - Cache warming
 * - Metrics integration
 *
 * Cache Layers:
 * - POI data: 15 minutes TTL
 * - POI lists (by tier/city): 5 minutes TTL
 * - Classification results: 1 hour TTL
 * - User sessions: 24 hours TTL
 * - API responses (idempotency): 24 hours TTL
 *
 * Patterns:
 * - Cache-aside: Application checks cache before database
 * - Write-through: Updates both cache and database
 * - Cache invalidation: On POI updates, tier changes
 */

import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import metricsService from './metrics.js';
import { getCorrelationId } from '../middleware/correlationId.js';

// Cache key prefixes
const PREFIXES = {
  POI: 'poi:',
  POI_LIST: 'poi:list:',
  POI_TIER: 'poi:tier:',
  POI_CITY: 'poi:city:',
  POI_CLASSIFICATION: 'poi:classification:',
  POI_STATS: 'poi:stats:',
  USER_SESSION: 'session:',
  API_RESPONSE: 'api:response:',
};

// Default TTLs (in seconds)
const DEFAULT_TTL = {
  POI: 900, // 15 minutes
  POI_LIST: 300, // 5 minutes
  POI_CLASSIFICATION: 3600, // 1 hour
  POI_STATS: 600, // 10 minutes
  USER_SESSION: 86400, // 24 hours
  API_RESPONSE: 86400, // 24 hours
};

class CacheService {
  constructor() {
    this.redis = redis;
    this.enabled = !!redis;

    if (!this.enabled) {
      logger.warn('Redis not configured - caching disabled');
    }
  }

  /**
   * Build cache key with prefix
   */
  buildKey(prefix, ...parts) {
    return `${prefix}${parts.join(':')}`;
  }

  /**
   * Get value from cache
   */
  async get(key, options = {}) {
    if (!this.enabled) return null;

    const startTime = Date.now();

    try {
      const value = await this.redis.get(key);
      const duration = (Date.now() - startTime) / 1000;

      if (value) {
        metricsService.recordCacheOperation('get', 'hit', duration);
        logger.debug('Cache hit', {
          key,
          correlationId: getCorrelationId(),
        });
        return JSON.parse(value);
      }

      metricsService.recordCacheOperation('get', 'miss', duration);
      logger.debug('Cache miss', {
        key,
        correlationId: getCorrelationId(),
      });
      return null;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordCacheOperation('get', 'error', duration);
      logger.error('Cache get error', {
        key,
        error: error.message,
        correlationId: getCorrelationId(),
      });
      return null; // Fail open - return null on error
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = DEFAULT_TTL.POI) {
    if (!this.enabled) return false;

    const startTime = Date.now();

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);

      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordCacheOperation('set', 'success', duration);

      logger.debug('Cache set', {
        key,
        ttl,
        correlationId: getCorrelationId(),
      });

      return true;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordCacheOperation('set', 'error', duration);
      logger.error('Cache set error', {
        key,
        error: error.message,
        correlationId: getCorrelationId(),
      });
      return false;
    }
  }

  /**
   * Delete key(s) from cache
   */
  async del(...keys) {
    if (!this.enabled) return 0;

    const startTime = Date.now();

    try {
      const result = await this.redis.del(...keys);

      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordCacheOperation('del', 'success', duration);

      logger.debug('Cache delete', {
        keys,
        count: result,
        correlationId: getCorrelationId(),
      });

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordCacheOperation('del', 'error', duration);
      logger.error('Cache delete error', {
        keys,
        error: error.message,
        correlationId: getCorrelationId(),
      });
      return 0;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern) {
    if (!this.enabled) return 0;

    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.del(...keys);
    } catch (error) {
      logger.error('Cache pattern delete error', {
        pattern,
        error: error.message,
        correlationId: getCorrelationId(),
      });
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   * If cache miss, execute fetchFn and cache result
   */
  async getOrSet(key, fetchFn, ttl = DEFAULT_TTL.POI) {
    // Try to get from cache
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    try {
      const value = await fetchFn();

      if (value !== null && value !== undefined) {
        // Cache the result
        await this.set(key, value, ttl);
      }

      return value;
    } catch (error) {
      logger.error('Cache getOrSet fetch error', {
        key,
        error: error.message,
        correlationId: getCorrelationId(),
      });
      throw error;
    }
  }

  // === POI-specific caching methods ===

  /**
   * Get POI by ID (with caching)
   */
  async getPOI(poiId) {
    const key = this.buildKey(PREFIXES.POI, poiId);
    return await this.get(key);
  }

  /**
   * Cache POI by ID
   */
  async setPOI(poiId, poi) {
    const key = this.buildKey(PREFIXES.POI, poiId);
    return await this.set(key, poi, DEFAULT_TTL.POI);
  }

  /**
   * Invalidate POI cache
   */
  async invalidatePOI(poiId) {
    const key = this.buildKey(PREFIXES.POI, poiId);
    return await this.del(key);
  }

  /**
   * Get POIs by tier (with caching)
   */
  async getPOIsByTier(tier, city = null) {
    const key = city
      ? this.buildKey(PREFIXES.POI_TIER, tier, city)
      : this.buildKey(PREFIXES.POI_TIER, tier);

    return await this.get(key);
  }

  /**
   * Cache POIs by tier
   */
  async setPOIsByTier(tier, pois, city = null) {
    const key = city
      ? this.buildKey(PREFIXES.POI_TIER, tier, city)
      : this.buildKey(PREFIXES.POI_TIER, tier);

    return await this.set(key, pois, DEFAULT_TTL.POI_LIST);
  }

  /**
   * Invalidate tier cache
   * Called when POI tier changes
   */
  async invalidateTierCache(tier, city = null) {
    if (city) {
      const key = this.buildKey(PREFIXES.POI_TIER, tier, city);
      return await this.del(key);
    } else {
      // Invalidate all tier caches for this tier
      const pattern = this.buildKey(PREFIXES.POI_TIER, tier, '*');
      return await this.delPattern(pattern);
    }
  }

  /**
   * Get POI classification (with caching)
   */
  async getPOIClassification(poiId) {
    const key = this.buildKey(PREFIXES.POI_CLASSIFICATION, poiId);
    return await this.get(key);
  }

  /**
   * Cache POI classification
   */
  async setPOIClassification(poiId, classification) {
    const key = this.buildKey(PREFIXES.POI_CLASSIFICATION, poiId);
    return await this.set(key, classification, DEFAULT_TTL.POI_CLASSIFICATION);
  }

  /**
   * Invalidate POI classification cache
   */
  async invalidatePOIClassification(poiId) {
    const key = this.buildKey(PREFIXES.POI_CLASSIFICATION, poiId);
    return await this.del(key);
  }

  /**
   * Get POI statistics (with caching)
   */
  async getPOIStats(city = null) {
    const key = city
      ? this.buildKey(PREFIXES.POI_STATS, city)
      : this.buildKey(PREFIXES.POI_STATS, 'all');

    return await this.get(key);
  }

  /**
   * Cache POI statistics
   */
  async setPOIStats(stats, city = null) {
    const key = city
      ? this.buildKey(PREFIXES.POI_STATS, city)
      : this.buildKey(PREFIXES.POI_STATS, 'all');

    return await this.set(key, stats, DEFAULT_TTL.POI_STATS);
  }

  /**
   * Invalidate all POI-related caches
   * Called on POI update/delete
   */
  async invalidateAllPOICaches(poiId, oldTier = null, newTier = null, city = null) {
    const promises = [];

    // Invalidate single POI cache
    promises.push(this.invalidatePOI(poiId));
    promises.push(this.invalidatePOIClassification(poiId));

    // Invalidate tier caches if tier changed
    if (oldTier !== null && oldTier !== newTier) {
      promises.push(this.invalidateTierCache(oldTier, city));
    }
    if (newTier !== null) {
      promises.push(this.invalidateTierCache(newTier, city));
    }

    // Invalidate stats
    promises.push(this.delPattern(this.buildKey(PREFIXES.POI_STATS, '*')));

    // Invalidate list caches
    promises.push(this.delPattern(this.buildKey(PREFIXES.POI_LIST, '*')));

    await Promise.all(promises);

    logger.info('Invalidated POI caches', {
      poiId,
      oldTier,
      newTier,
      city,
      correlationId: getCorrelationId(),
    });
  }

  /**
   * Warm cache for frequently accessed data
   * Called on startup or periodically
   */
  async warmCache() {
    if (!this.enabled) return;

    logger.info('Starting cache warm-up', {
      correlationId: getCorrelationId(),
    });

    try {
      // Warm Tier 1 POIs (most frequently accessed)
      const POI = (await import('../models/POI.js')).default;

      const tier1POIs = await POI.findAll({
        where: { tier: 1, active: true },
        limit: 100,
      });

      for (const poi of tier1POIs) {
        await this.setPOI(poi.id, poi.toJSON());
      }

      logger.info('Cache warm-up completed', {
        tier1POIsWarmed: tier1POIs.length,
        correlationId: getCorrelationId(),
      });
    } catch (error) {
      logger.error('Cache warm-up failed', {
        error: error.message,
        correlationId: getCorrelationId(),
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');

      return {
        enabled: true,
        info: info.toString(),
        keyspace: keyspace.toString(),
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message });
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Flush all cache
   * DANGER: Use only in development/testing
   */
  async flushAll() {
    if (!this.enabled) return;

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush cache in production');
    }

    await this.redis.flushall();
    logger.warn('Cache flushed (all keys deleted)');
  }
}

// Export singleton
const cacheService = new CacheService();
export default cacheService;

// Export class for testing
export { CacheService };
