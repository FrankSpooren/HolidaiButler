const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Redis Cache Service
 * Provides caching functionality for payment methods, sessions, and other data
 * Includes connection pooling, error handling, and cache invalidation
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;

    // Cache configuration
    this.config = {
      prefix: 'hb:payment:',
      defaultTTL: 3600, // 1 hour
      paymentMethodsTTL: 86400, // 24 hours
      sessionTTL: 1800, // 30 minutes
      transactionTTL: 7200, // 2 hours
    };

    // Cache key prefixes
    this.keys = {
      PAYMENT_METHODS: 'payment_methods:',
      SESSION: 'session:',
      TRANSACTION: 'transaction:',
      USER_METHODS: 'user_methods:',
      RATE_LIMIT: 'rate_limit:',
      LOCK: 'lock:',
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._createConnection();
    return this.connectionPromise;
  }

  async _createConnection() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 2,
        keyPrefix: this.config.prefix,
        retryStrategy: (times) => {
          if (times > 10) {
            logger.error('Redis connection failed after 10 attempts');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: false,
        enableReadyCheck: true,
        enableOfflineQueue: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis cache error:', err);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis cache reconnecting...');
      });

      // Wait for connection
      await this.client.ping();
      this.isConnected = true;

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis cache:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  // ========== BASIC OPERATIONS ==========

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    if (!this.isAvailable()) {
      logger.debug('Cache unavailable, skipping get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    if (!this.isAvailable()) {
      logger.debug('Cache unavailable, skipping set');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'user:123:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delByPattern(pattern) {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      // Remove prefix that was added by ioredis
      const keysWithoutPrefix = keys.map(k => k.replace(this.config.prefix, ''));
      await this.client.del(...keysWithoutPrefix);
      return keys.length;
    } catch (error) {
      logger.error('Cache delete by pattern error:', { pattern, error: error.message });
      return 0;
    }
  }

  // ========== PAYMENT METHODS CACHING ==========

  /**
   * Get cached payment methods for country/currency
   * @param {string} country - Country code
   * @param {string} currency - Currency code
   * @returns {Promise<Array|null>} - Payment methods or null
   */
  async getPaymentMethods(country, currency) {
    const key = `${this.keys.PAYMENT_METHODS}${country}:${currency}`;
    return this.get(key);
  }

  /**
   * Cache payment methods for country/currency
   * @param {string} country - Country code
   * @param {string} currency - Currency code
   * @param {Array} methods - Payment methods
   * @returns {Promise<boolean>} - Success status
   */
  async setPaymentMethods(country, currency, methods) {
    const key = `${this.keys.PAYMENT_METHODS}${country}:${currency}`;
    return this.set(key, methods, this.config.paymentMethodsTTL);
  }

  /**
   * Invalidate payment methods cache for country
   * @param {string} country - Country code (optional, invalidates all if not provided)
   */
  async invalidatePaymentMethods(country = null) {
    const pattern = country
      ? `${this.keys.PAYMENT_METHODS}${country}:*`
      : `${this.keys.PAYMENT_METHODS}*`;
    return this.delByPattern(pattern);
  }

  // ========== USER PAYMENT METHODS CACHING ==========

  /**
   * Get cached user payment methods
   * @param {string} userId - User ID
   * @returns {Promise<Array|null>} - Payment methods or null
   */
  async getUserPaymentMethods(userId) {
    const key = `${this.keys.USER_METHODS}${userId}`;
    return this.get(key);
  }

  /**
   * Cache user payment methods
   * @param {string} userId - User ID
   * @param {Array} methods - Payment methods
   * @returns {Promise<boolean>} - Success status
   */
  async setUserPaymentMethods(userId, methods) {
    const key = `${this.keys.USER_METHODS}${userId}`;
    return this.set(key, methods, this.config.paymentMethodsTTL);
  }

  /**
   * Invalidate user payment methods cache
   * @param {string} userId - User ID
   */
  async invalidateUserPaymentMethods(userId) {
    const key = `${this.keys.USER_METHODS}${userId}`;
    return this.del(key);
  }

  // ========== TRANSACTION CACHING ==========

  /**
   * Cache transaction data
   * @param {string} transactionId - Transaction ID
   * @param {Object} transaction - Transaction data
   * @returns {Promise<boolean>} - Success status
   */
  async cacheTransaction(transactionId, transaction) {
    const key = `${this.keys.TRANSACTION}${transactionId}`;
    return this.set(key, transaction, this.config.transactionTTL);
  }

  /**
   * Get cached transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object|null>} - Transaction or null
   */
  async getTransaction(transactionId) {
    const key = `${this.keys.TRANSACTION}${transactionId}`;
    return this.get(key);
  }

  /**
   * Invalidate transaction cache
   * @param {string} transactionId - Transaction ID
   */
  async invalidateTransaction(transactionId) {
    const key = `${this.keys.TRANSACTION}${transactionId}`;
    return this.del(key);
  }

  // ========== DISTRIBUTED LOCKING ==========

  /**
   * Acquire a distributed lock
   * @param {string} resource - Resource to lock
   * @param {number} ttl - Lock TTL in seconds (default: 30)
   * @returns {Promise<string|null>} - Lock token or null if failed
   */
  async acquireLock(resource, ttl = 30) {
    if (!this.isAvailable()) {
      return null;
    }

    const lockKey = `${this.keys.LOCK}${resource}`;
    const token = require('uuid').v4();

    try {
      const result = await this.client.set(lockKey, token, 'EX', ttl, 'NX');
      if (result === 'OK') {
        logger.debug(`Lock acquired: ${resource}`);
        return token;
      }
      return null;
    } catch (error) {
      logger.error('Failed to acquire lock:', { resource, error: error.message });
      return null;
    }
  }

  /**
   * Release a distributed lock
   * @param {string} resource - Resource to unlock
   * @param {string} token - Lock token
   * @returns {Promise<boolean>} - Success status
   */
  async releaseLock(resource, token) {
    if (!this.isAvailable()) {
      return false;
    }

    const lockKey = `${this.keys.LOCK}${resource}`;

    try {
      // Use Lua script for atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, lockKey, token);
      const success = result === 1;

      if (success) {
        logger.debug(`Lock released: ${resource}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to release lock:', { resource, error: error.message });
      return false;
    }
  }

  // ========== HEALTH CHECK ==========

  /**
   * Check cache health
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    const status = {
      connected: this.isConnected,
      latencyMs: null,
      error: null,
    };

    if (!this.client) {
      status.error = 'Client not initialized';
      return status;
    }

    try {
      const start = Date.now();
      await this.client.ping();
      status.latencyMs = Date.now() - start;
      status.connected = true;
    } catch (error) {
      status.connected = false;
      status.error = error.message;
    }

    return status;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');

      return {
        info: this._parseRedisInfo(info),
        memory: this._parseRedisInfo(memory),
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  _parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  // ========== CLEANUP ==========

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
      logger.info('Redis cache disconnected');
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
