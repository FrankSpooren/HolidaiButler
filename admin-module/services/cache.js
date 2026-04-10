/**
 * Redis Caching Service for Admin Module
 * Enterprise-grade caching layer for performance optimization
 */

import Redis from 'ioredis';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.prefixes = {
      poi: 'admin:poi:',
      user: 'admin:user:',
      config: 'admin:config:',
      stats: 'admin:stats:',
      session: 'admin:session:',
      upload: 'admin:upload:'
    };

    // TTL in seconds
    this.ttl = {
      poi: 3600,           // 1 hour
      user: 1800,          // 30 minutes
      config: 7200,        // 2 hours
      stats: 600,          // 10 minutes
      session: 86400,      // 24 hours
      upload: 3600         // 1 hour
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB_ADMIN || '3'), // Separate DB for admin
        retryStrategy: (times) => {
          // In development, stop retrying after 3 attempts to avoid log spam
          if (process.env.NODE_ENV === 'development' && times > 3) {
            logger.info('Redis not available - running without cache (development mode)');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1, // Reduce retries per request
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false // Don't queue commands when disconnected
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis cache connected (Admin Module)');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis cache error:', error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });

      // Test connection with lazyConnect
      await this.redis.connect();
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Generic get operation
   */
  async get(key) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache read');
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Generic set operation
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache write');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete single key
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache pattern delete error:', { pattern, error: error.message });
      return false;
    }
  }

  /**
   * Cache POI data
   */
  async cachePOI(poiId, data, ttl = null) {
    const key = this.prefixes.poi + poiId;
    return await this.set(key, data, ttl || this.ttl.poi);
  }

  /**
   * Get cached POI
   */
  async getPOI(poiId) {
    const key = this.prefixes.poi + poiId;
    return await this.get(key);
  }

  /**
   * Invalidate POI cache
   */
  async invalidatePOI(poiId) {
    const key = this.prefixes.poi + poiId;
    return await this.del(key);
  }

  /**
   * Cache POI list
   */
  async cachePOIList(filters, data, ttl = null) {
    const key = `${this.prefixes.poi}list:${JSON.stringify(filters)}`;
    return await this.set(key, data, ttl || this.ttl.poi);
  }

  /**
   * Get cached POI list
   */
  async getPOIList(filters) {
    const key = `${this.prefixes.poi}list:${JSON.stringify(filters)}`;
    return await this.get(key);
  }

  /**
   * Invalidate all POI caches
   */
  async invalidateAllPOIs() {
    return await this.delPattern(`${this.prefixes.poi}*`);
  }

  /**
   * Cache admin user
   */
  async cacheUser(userId, data, ttl = null) {
    const key = this.prefixes.user + userId;
    return await this.set(key, data, ttl || this.ttl.user);
  }

  /**
   * Get cached user
   */
  async getUser(userId) {
    const key = this.prefixes.user + userId;
    return await this.get(key);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId) {
    const key = this.prefixes.user + userId;
    return await this.del(key);
  }

  /**
   * Cache platform configuration
   */
  async cacheConfig(configKey, data, ttl = null) {
    const key = this.prefixes.config + configKey;
    return await this.set(key, data, ttl || this.ttl.config);
  }

  /**
   * Get cached configuration
   */
  async getConfig(configKey) {
    const key = this.prefixes.config + configKey;
    return await this.get(key);
  }

  /**
   * Invalidate configuration cache
   */
  async invalidateConfig(configKey = null) {
    if (configKey) {
      const key = this.prefixes.config + configKey;
      return await this.del(key);
    } else {
      // Invalidate all config
      return await this.delPattern(`${this.prefixes.config}*`);
    }
  }

  /**
   * Cache statistics
   */
  async cacheStats(key, data, ttl = null) {
    const fullKey = this.prefixes.stats + key;
    return await this.set(fullKey, data, ttl || this.ttl.stats);
  }

  /**
   * Get cached statistics
   */
  async getStats(key) {
    const fullKey = this.prefixes.stats + key;
    return await this.get(fullKey);
  }

  /**
   * Cache admin session
   */
  async cacheSession(sessionId, data, ttl = null) {
    const key = this.prefixes.session + sessionId;
    return await this.set(key, data, ttl || this.ttl.session);
  }

  /**
   * Get cached session
   */
  async getSession(sessionId) {
    const key = this.prefixes.session + sessionId;
    return await this.get(key);
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId) {
    const key = this.prefixes.session + sessionId;
    return await this.del(key);
  }

  /**
   * Cache upload metadata
   */
  async cacheUpload(uploadId, data, ttl = null) {
    const key = this.prefixes.upload + uploadId;
    return await this.set(key, data, ttl || this.ttl.upload);
  }

  /**
   * Get cached upload
   */
  async getUpload(uploadId) {
    const key = this.prefixes.upload + uploadId;
    return await this.get(key);
  }

  /**
   * Clear all cache
   */
  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.redis.flushdb();
      logger.info('Admin cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStatistics() {
    if (!this.isConnected) {
      return {
        connected: false,
        message: 'Redis not connected'
      };
    }

    try {
      const info = await this.redis.info('stats');

      // Parse stats
      const stats = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        connected: true,
        totalKeys: await this.redis.dbsize(),
        keysByPrefix: {
          pois: await this.redis.keys(this.prefixes.poi + '*').then(k => k.length),
          users: await this.redis.keys(this.prefixes.user + '*').then(k => k.length),
          config: await this.redis.keys(this.prefixes.config + '*').then(k => k.length),
          stats: await this.redis.keys(this.prefixes.stats + '*').then(k => k.length),
          sessions: await this.redis.keys(this.prefixes.session + '*').then(k => k.length),
          uploads: await this.redis.keys(this.prefixes.upload + '*').then(k => k.length)
        },
        stats: {
          totalConnectionsReceived: stats.total_connections_received,
          totalCommandsProcessed: stats.total_commands_processed,
          keyspaceHits: stats.keyspace_hits,
          keyspaceMisses: stats.keyspace_misses,
          hitRate: stats.keyspace_hits && stats.keyspace_misses
            ? ((parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) * 100).toFixed(2) + '%'
            : 'N/A'
        }
      };
    } catch (error) {
      logger.error('Error getting cache statistics:', error);
      return {
        connected: this.isConnected,
        error: error.message
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis cache disconnected (Admin Module)');
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
