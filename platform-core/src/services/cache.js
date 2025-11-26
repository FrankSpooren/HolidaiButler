/**
 * Caching Service
 * Enterprise-level caching layer with Redis
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes

    // Cache key prefixes
    this.prefixes = {
      poi: 'poi:',
      poiScore: 'poi_score:',
      poiData: 'poi_data:',
      apiUsage: 'api_usage:',
      stats: 'stats:',
      weather: 'weather:',
      topAttractions: 'top_attractions:',
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    if (this.isConnected) {
      return;
    }

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_CACHE_DB || '1'), // Use separate DB for cache
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Cache service connected to Redis');
      });

      this.redis.on('error', (err) => {
        logger.error('Cache Redis error:', err);
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Cache Redis reconnecting...');
      });

      await this.redis.ping();
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value);
      }

      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Cache POI data
   */
  async cachePOI(poiId, data, ttl = 3600) {
    const key = this.prefixes.poi + poiId;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached POI data
   */
  async getCachedPOI(poiId) {
    const key = this.prefixes.poi + poiId;
    return await this.get(key);
  }

  /**
   * Cache POI score
   */
  async cachePOIScore(poiId, score, ttl = 3600) {
    const key = this.prefixes.poiScore + poiId;
    return await this.set(key, score, ttl);
  }

  /**
   * Get cached POI score
   */
  async getCachedPOIScore(poiId) {
    const key = this.prefixes.poiScore + poiId;
    return await this.get(key);
  }

  /**
   * Cache POI source data
   */
  async cachePOIData(poiId, source, data, ttl = 86400) {
    // 24 hours for source data
    const key = `${this.prefixes.poiData}${poiId}:${source}`;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached POI source data
   */
  async getCachedPOIData(poiId, source) {
    const key = `${this.prefixes.poiData}${poiId}:${source}`;
    return await this.get(key);
  }

  /**
   * Cache statistics
   */
  async cacheStats(type, data, ttl = 600) {
    // 10 minutes for stats
    const key = this.prefixes.stats + type;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached statistics
   */
  async getCachedStats(type) {
    const key = this.prefixes.stats + type;
    return await this.get(key);
  }

  /**
   * Cache weather recommendations
   */
  async cacheWeatherRecommendations(city, weather, data, ttl = 1800) {
    // 30 minutes
    const key = `${this.prefixes.weather}${city}:${weather}`;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached weather recommendations
   */
  async getCachedWeatherRecommendations(city, weather) {
    const key = `${this.prefixes.weather}${city}:${weather}`;
    return await this.get(key);
  }

  /**
   * Invalidate POI cache
   */
  async invalidatePOI(poiId) {
    await this.del(this.prefixes.poi + poiId);
    await this.del(this.prefixes.poiScore + poiId);
    await this.delPattern(`${this.prefixes.poiData}${poiId}:*`);
    logger.info(`Cache invalidated for POI: ${poiId}`);
  }

  /**
   * Invalidate city cache
   */
  async invalidateCity(city) {
    await this.delPattern(`${this.prefixes.weather}${city}:*`);
    await this.delPattern(`${this.prefixes.stats}city:${city}*`);
    logger.info(`Cache invalidated for city: ${city}`);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();

      return {
        connected: true,
        dbSize,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Parse Redis INFO output
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const stats = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    }

    return stats;
  }

  /**
   * Flush all cache
   */
  async flush() {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Failed to flush cache:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Cache service disconnected');
    }
  }
}

// Export singleton
const cacheService = new CacheService();
export default cacheService;
