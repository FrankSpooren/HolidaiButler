/**
 * Redis Caching Service for Ticketing Module
 * Enterprise-grade caching layer for performance optimization
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.prefixes = {
      ticket: 'ticket:',
      booking: 'booking:',
      availability: 'availability:',
      stats: 'stats:',
      user: 'user:',
      session: 'session:'
    };

    // TTL in seconds
    this.ttl = {
      ticket: 3600,        // 1 hour
      booking: 1800,       // 30 minutes
      availability: 300,   // 5 minutes
      stats: 600,          // 10 minutes
      user: 3600,          // 1 hour
      session: 86400       // 24 hours
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
        db: parseInt(process.env.REDIS_DB_TICKETING || '2'), // Separate DB for ticketing
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis cache connected (Ticketing Module)');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis cache error:', error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });

      // Test connection
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
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
   * Cache ticket data
   */
  async cacheTicket(ticketId, data, ttl = null) {
    const key = this.prefixes.ticket + ticketId;
    return await this.set(key, data, ttl || this.ttl.ticket);
  }

  /**
   * Get cached ticket
   */
  async getTicket(ticketId) {
    const key = this.prefixes.ticket + ticketId;
    return await this.get(key);
  }

  /**
   * Invalidate ticket cache
   */
  async invalidateTicket(ticketId) {
    const key = this.prefixes.ticket + ticketId;
    return await this.del(key);
  }

  /**
   * Cache booking data
   */
  async cacheBooking(bookingId, data, ttl = null) {
    const key = this.prefixes.booking + bookingId;
    return await this.set(key, data, ttl || this.ttl.booking);
  }

  /**
   * Get cached booking
   */
  async getBooking(bookingId) {
    const key = this.prefixes.booking + bookingId;
    return await this.get(key);
  }

  /**
   * Invalidate booking cache
   */
  async invalidateBooking(bookingId) {
    const key = this.prefixes.booking + bookingId;
    await this.del(key);
    // Also invalidate related ticket cache
    await this.delPattern(`${this.prefixes.ticket}*:booking:${bookingId}`);
    return true;
  }

  /**
   * Cache availability data
   */
  async cacheAvailability(ticketId, date, data, ttl = null) {
    const key = `${this.prefixes.availability}${ticketId}:${date}`;
    return await this.set(key, data, ttl || this.ttl.availability);
  }

  /**
   * Get cached availability
   */
  async getAvailability(ticketId, date) {
    const key = `${this.prefixes.availability}${ticketId}:${date}`;
    return await this.get(key);
  }

  /**
   * Invalidate availability cache
   */
  async invalidateAvailability(ticketId, date = null) {
    if (date) {
      const key = `${this.prefixes.availability}${ticketId}:${date}`;
      return await this.del(key);
    } else {
      // Invalidate all availability for this ticket
      return await this.delPattern(`${this.prefixes.availability}${ticketId}:*`);
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
   * Cache user session
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
   * Clear all cache
   */
  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.redis.flushdb();
      logger.info('Cache flushed successfully');
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
      const keyspace = await this.redis.info('keyspace');

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
          tickets: await this.redis.keys(this.prefixes.ticket + '*').then(k => k.length),
          bookings: await this.redis.keys(this.prefixes.booking + '*').then(k => k.length),
          availability: await this.redis.keys(this.prefixes.availability + '*').then(k => k.length),
          stats: await this.redis.keys(this.prefixes.stats + '*').then(k => k.length),
          users: await this.redis.keys(this.prefixes.user + '*').then(k => k.length),
          sessions: await this.redis.keys(this.prefixes.session + '*').then(k => k.length)
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
      logger.info('Redis cache disconnected');
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
