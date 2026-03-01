/**
 * Redis Cache Service
 * Centralized caching for the Reservations Module
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;

    // Cache key prefixes
    this.prefixes = {
      reservation: 'res:reservation:',
      restaurant: 'res:restaurant:',
      availability: 'res:availability:',
      guest: 'res:guest:',
      table: 'res:table:',
      waitlist: 'res:waitlist:',
      stats: 'res:stats:',
      lock: 'res:lock:',
    };

    // Default TTLs (in seconds)
    this.ttl = {
      reservation: 1800,    // 30 minutes
      restaurant: 3600,     // 1 hour
      availability: 300,    // 5 minutes (frequently changes)
      guest: 3600,          // 1 hour
      table: 3600,          // 1 hour
      waitlist: 900,        // 15 minutes
      stats: 600,           // 10 minutes
      lock: 900,            // 15 minutes (reservation lock)
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    try {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

      this.client = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB_RESERVATIONS) || 2,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      await this.client.connect();
      this.isConnected = true;

      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
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
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error(`Cache delete by pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  // ========== RESERVATION CACHING ==========

  async cacheReservation(reservationId, data) {
    const key = `${this.prefixes.reservation}${reservationId}`;
    return this.set(key, data, this.ttl.reservation);
  }

  async getReservation(reservationId) {
    const key = `${this.prefixes.reservation}${reservationId}`;
    return this.get(key);
  }

  async invalidateReservation(reservationId) {
    const key = `${this.prefixes.reservation}${reservationId}`;
    return this.del(key);
  }

  // ========== RESTAURANT CACHING ==========

  async cacheRestaurant(restaurantId, data) {
    const key = `${this.prefixes.restaurant}${restaurantId}`;
    return this.set(key, data, this.ttl.restaurant);
  }

  async getRestaurant(restaurantId) {
    const key = `${this.prefixes.restaurant}${restaurantId}`;
    return this.get(key);
  }

  async invalidateRestaurant(restaurantId) {
    const key = `${this.prefixes.restaurant}${restaurantId}`;
    await this.del(key);
    // Also invalidate related availability cache
    await this.delByPattern(`${this.prefixes.availability}${restaurantId}:*`);
    return true;
  }

  // ========== AVAILABILITY CACHING ==========

  async cacheAvailability(restaurantId, date, data) {
    const key = `${this.prefixes.availability}${restaurantId}:${date}`;
    return this.set(key, data, this.ttl.availability);
  }

  async getAvailability(restaurantId, date) {
    const key = `${this.prefixes.availability}${restaurantId}:${date}`;
    return this.get(key);
  }

  async invalidateAvailability(restaurantId, date = null) {
    if (date) {
      const key = `${this.prefixes.availability}${restaurantId}:${date}`;
      return this.del(key);
    }
    // Invalidate all availability for restaurant
    return this.delByPattern(`${this.prefixes.availability}${restaurantId}:*`);
  }

  // ========== GUEST CACHING ==========

  async cacheGuest(guestId, data) {
    const key = `${this.prefixes.guest}${guestId}`;
    return this.set(key, data, this.ttl.guest);
  }

  async getGuest(guestId) {
    const key = `${this.prefixes.guest}${guestId}`;
    return this.get(key);
  }

  async invalidateGuest(guestId) {
    const key = `${this.prefixes.guest}${guestId}`;
    return this.del(key);
  }

  async cacheGuestByEmail(email, data) {
    const key = `${this.prefixes.guest}email:${email.toLowerCase()}`;
    return this.set(key, data, this.ttl.guest);
  }

  async getGuestByEmail(email) {
    const key = `${this.prefixes.guest}email:${email.toLowerCase()}`;
    return this.get(key);
  }

  // ========== TABLE CACHING ==========

  async cacheTables(restaurantId, data) {
    const key = `${this.prefixes.table}restaurant:${restaurantId}`;
    return this.set(key, data, this.ttl.table);
  }

  async getTables(restaurantId) {
    const key = `${this.prefixes.table}restaurant:${restaurantId}`;
    return this.get(key);
  }

  async invalidateTables(restaurantId) {
    const key = `${this.prefixes.table}restaurant:${restaurantId}`;
    return this.del(key);
  }

  // ========== RESERVATION LOCKS ==========

  /**
   * Acquire lock for reservation slot (15-minute hold)
   */
  async acquireLock(restaurantId, date, time, lockId) {
    const key = `${this.prefixes.lock}${restaurantId}:${date}:${time}`;

    if (!this.isConnected) {
      return true; // Allow without Redis
    }

    try {
      // Use SET NX (only set if not exists)
      const result = await this.client.set(key, lockId, {
        NX: true,
        EX: this.ttl.lock,
      });

      return result === 'OK';
    } catch (error) {
      logger.error('Lock acquisition error:', error);
      return true; // Allow on error
    }
  }

  /**
   * Release reservation lock
   */
  async releaseLock(restaurantId, date, time, lockId) {
    const key = `${this.prefixes.lock}${restaurantId}:${date}:${time}`;

    if (!this.isConnected) {
      return true;
    }

    try {
      // Only delete if lock belongs to this lockId
      const currentLock = await this.client.get(key);
      if (currentLock === lockId) {
        await this.client.del(key);
      }
      return true;
    } catch (error) {
      logger.error('Lock release error:', error);
      return false;
    }
  }

  /**
   * Check if slot is locked
   */
  async isLocked(restaurantId, date, time) {
    const key = `${this.prefixes.lock}${restaurantId}:${date}:${time}`;

    if (!this.isConnected) {
      return false;
    }

    try {
      const lock = await this.client.get(key);
      return lock !== null;
    } catch (error) {
      logger.error('Lock check error:', error);
      return false;
    }
  }

  // ========== STATISTICS ==========

  async cacheStats(key, data) {
    const fullKey = `${this.prefixes.stats}${key}`;
    return this.set(fullKey, data, this.ttl.stats);
  }

  async getStats(key) {
    const fullKey = `${this.prefixes.stats}${key}`;
    return this.get(fullKey);
  }

  // ========== UTILITIES ==========

  /**
   * Flush all reservations cache
   */
  async flushAll() {
    if (!this.isConnected) {
      return false;
    }

    try {
      logger.warn('Flushing all reservation cache keys');
      await this.delByPattern('res:*');
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
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();

      return {
        connected: true,
        keys: dbSize,
        memory: info,
      };
    } catch (error) {
      logger.error('Cache statistics error:', error);
      return { connected: true, error: error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isConnected) {
      return { healthy: false, reason: 'Not connected' };
    }

    try {
      await this.client.ping();
      return { healthy: true };
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
