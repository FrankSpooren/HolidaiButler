/**
 * Response Caching Middleware
 * Caches API responses in Redis for improved performance
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis client (lazy initialization)
let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false
      });

      redisClient.on('error', (err) => {
        logger.warn('Response cache Redis error:', err.message);
      });
    } catch (error) {
      logger.warn('Response cache Redis initialization failed:', error.message);
      return null;
    }
  }
  return redisClient;
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, prefix = 'api') => {
  const path = req.originalUrl || req.url;
  const query = JSON.stringify(req.query || {});
  return `${prefix}:${req.method}:${path}:${Buffer.from(query).toString('base64')}`;
};

/**
 * Response Cache Middleware Factory
 *
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {string} options.prefix - Cache key prefix (default: 'cache')
 * @param {Function} options.condition - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
export const responseCache = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    prefix = 'cache',
    condition = (req, res) => res.statusCode === 200,
    keyGenerator = generateCacheKey
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if cache-control header requests no cache
    if (req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    const redis = getRedisClient();
    if (!redis) {
      return next(); // Graceful fallback if Redis unavailable
    }

    const cacheKey = keyGenerator(req, prefix);

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);

        // Add cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', data.ttl || ttl);

        return res.json(data.body);
      }

      // Cache miss - intercept response
      res.set('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to cache the response
      res.json = async (body) => {
        // Only cache if condition is met
        if (condition(req, res)) {
          try {
            const cacheData = {
              body,
              ttl,
              cachedAt: new Date().toISOString()
            };

            await redis.setex(cacheKey, ttl, JSON.stringify(cacheData));
          } catch (cacheError) {
            logger.warn('Failed to cache response:', cacheError.message);
          }
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Cache Invalidation Helper
 * Invalidate cache keys matching a pattern
 *
 * @param {string} pattern - Redis key pattern (e.g., 'cache:pois:*')
 */
export const invalidateCache = async (pattern) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    logger.warn('Cache invalidation error:', error.message);
  }
};

/**
 * POI List Cache Middleware
 * Specialized caching for POI listing endpoints
 */
export const poiListCache = responseCache({
  ttl: 600, // 10 minutes for POI lists
  prefix: 'pois',
  condition: (req, res) => res.statusCode === 200 && !req.query.search
});

/**
 * Category Cache Middleware
 * Cache category listings (rarely change)
 */
export const categoryCache = responseCache({
  ttl: 3600, // 1 hour for categories
  prefix: 'categories'
});

/**
 * Daily Tips Cache Middleware
 * Cache daily tips (changes daily)
 */
export const dailyTipCache = responseCache({
  ttl: 86400, // 24 hours
  prefix: 'daily-tip',
  keyGenerator: (req) => {
    const today = new Date().toISOString().split('T')[0];
    return `daily-tip:${today}`;
  }
});

export default responseCache;
