const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Redis Cache Configuration
 * Enterprise-level caching for performance optimization
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour in seconds

    // Cache key prefixes
    this.prefixes = {
      event: 'event:',
      events: 'events:',
      featured: 'featured:',
      stats: 'stats:',
      search: 'search:',
      filter: 'filter:',
    };

    // TTL configurations (in seconds)
    this.ttls = {
      event: 3600, // 1 hour
      events: 600, // 10 minutes
      featured: 1800, // 30 minutes
      stats: 3600, // 1 hour
      search: 300, // 5 minutes
      filter: 600, // 10 minutes
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis connection error:', err);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      // Test connection
      await this.client.ping();

      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) {
      logger.debug('Cache miss - Redis not connected');
      return null;
    }

    try {
      const startTime = Date.now();
      const value = await this.client.get(key);
      const duration = Date.now() - startTime;

      if (value) {
        logger.debug(`Cache HIT: ${key} (${duration}ms)`);
        return JSON.parse(value);
      }

      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
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
      await this.client.setex(key, ttl, serialized);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
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
      await this.client.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.info(`Cache cleared: ${keys.length} keys matching ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache pattern delete error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async flush() {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushdb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Generate cache key for event
   */
  getEventKey(eventId) {
    return `${this.prefixes.event}${eventId}`;
  }

  /**
   * Generate cache key for events list
   */
  getEventsKey(filters) {
    const filterString = JSON.stringify(filters);
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(filterString).digest('hex');
    return `${this.prefixes.events}${hash}`;
  }

  /**
   * Generate cache key for featured events
   */
  getFeaturedKey(limit) {
    return `${this.prefixes.featured}${limit}`;
  }

  /**
   * Generate cache key for stats
   */
  getStatsKey() {
    return `${this.prefixes.stats}all`;
  }

  /**
   * Generate cache key for search
   */
  getSearchKey(query) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(query).digest('hex');
    return `${this.prefixes.search}${hash}`;
  }

  /**
   * Cache middleware for Express
   */
  middleware(ttl) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const key = `api:${req.originalUrl}`;
      const cachedResponse = await this.get(key);

      if (cachedResponse) {
        logger.debug(`Serving from cache: ${req.originalUrl}`);
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = async (data) => {
        if (res.statusCode === 200) {
          await this.set(key, data, ttl || this.defaultTTL);
        }
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Invalidate event-related caches
   */
  async invalidateEvent(eventId) {
    await this.del(this.getEventKey(eventId));
    await this.delPattern(`${this.prefixes.events}*`);
    await this.delPattern(`${this.prefixes.featured}*`);
    await this.delPattern(`${this.prefixes.stats}*`);
    logger.info(`Invalidated caches for event: ${eventId}`);
  }

  /**
   * Invalidate all event list caches
   */
  async invalidateEventLists() {
    await this.delPattern(`${this.prefixes.events}*`);
    await this.delPattern(`${this.prefixes.featured}*`);
    await this.delPattern(`${this.prefixes.stats}*`);
    logger.info('Invalidated all event list caches');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.client.info('stats');
      const keyCount = await this.client.dbsize();

      return {
        connected: this.isConnected,
        keyCount,
        info: info,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Warm up cache with popular data
   */
  async warmUp() {
    if (!this.isConnected) {
      return false;
    }

    try {
      logger.info('Starting cache warm-up...');

      // Pre-cache featured events
      const eventService = require('../services/eventService');
      const featuredEvents = await eventService.getFeaturedEvents(10);
      await this.set(this.getFeaturedKey(10), featuredEvents, this.ttls.featured);

      // Pre-cache stats
      const stats = await eventService.getEventStatistics();
      await this.set(this.getStatsKey(), stats, this.ttls.stats);

      // Pre-cache upcoming events
      const upcomingEvents = await eventService.getEvents({ dateRange: 'upcoming', limit: 24 });
      const key = this.getEventsKey({ dateRange: 'upcoming', limit: 24 });
      await this.set(key, upcomingEvents, this.ttls.events);

      logger.info('Cache warm-up completed');
      return true;
    } catch (error) {
      logger.error('Cache warm-up error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Auto-connect on initialization (async)
if (process.env.REDIS_HOST || process.env.NODE_ENV === 'production') {
  cacheService.connect().catch(err => {
    logger.warn('Redis cache not available, running without cache:', err.message);
  });
}

module.exports = cacheService;
