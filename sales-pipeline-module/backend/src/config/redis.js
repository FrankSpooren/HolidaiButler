/**
 * Redis Configuration
 * Caching, session management, and real-time features
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: false
};

// Main Redis client
const redis = new Redis(redisConfig);

// Subscriber client for pub/sub
const subscriber = new Redis(redisConfig);

// Publisher client for pub/sub
const publisher = new Redis(redisConfig);

// Event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Cache helper functions
export const cacheService = {
  /**
   * Get cached value
   */
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cache value with optional TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete cached value
   */
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get TTL of key
   */
  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  },

  /**
   * Increment counter
   */
  async incr(key, by = 1) {
    try {
      return await redis.incrby(key, by);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Hash operations
   */
  async hset(key, field, value) {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache hset error for key ${key}:`, error);
      return false;
    }
  },

  async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache hget error for key ${key}:`, error);
      return null;
    }
  },

  async hgetall(key) {
    try {
      const result = await redis.hgetall(key);
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      logger.error(`Cache hgetall error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * List operations for activity feeds
   */
  async lpush(key, value) {
    try {
      return await redis.lpush(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache lpush error for key ${key}:`, error);
      return null;
    }
  },

  async lrange(key, start = 0, end = -1) {
    try {
      const values = await redis.lrange(key, start, end);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error(`Cache lrange error for key ${key}:`, error);
      return [];
    }
  },

  /**
   * Sorted set for leaderboards/rankings
   */
  async zadd(key, score, member) {
    try {
      return await redis.zadd(key, score, member);
    } catch (error) {
      logger.error(`Cache zadd error for key ${key}:`, error);
      return null;
    }
  },

  async zrange(key, start = 0, end = -1, withScores = false) {
    try {
      if (withScores) {
        return await redis.zrange(key, start, end, 'WITHSCORES');
      }
      return await redis.zrange(key, start, end);
    } catch (error) {
      logger.error(`Cache zrange error for key ${key}:`, error);
      return [];
    }
  }
};

// Pub/Sub helpers
export const pubsub = {
  async publish(channel, message) {
    try {
      const serialized = JSON.stringify(message);
      await publisher.publish(channel, serialized);
      return true;
    } catch (error) {
      logger.error(`Pub/Sub publish error for channel ${channel}:`, error);
      return false;
    }
  },

  async subscribe(channel, callback) {
    try {
      await subscriber.subscribe(channel);
      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });
      return true;
    } catch (error) {
      logger.error(`Pub/Sub subscribe error for channel ${channel}:`, error);
      return false;
    }
  },

  async unsubscribe(channel) {
    try {
      await subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      logger.error(`Pub/Sub unsubscribe error for channel ${channel}:`, error);
      return false;
    }
  }
};

// Cache key generators
export const cacheKeys = {
  user: (id) => `user:${id}`,
  userProfile: (id) => `user:${id}:profile`,
  account: (id) => `account:${id}`,
  accountContacts: (id) => `account:${id}:contacts`,
  contact: (id) => `contact:${id}`,
  deal: (id) => `deal:${id}`,
  dealsByStage: (stage) => `deals:stage:${stage}`,
  lead: (id) => `lead:${id}`,
  campaign: (id) => `campaign:${id}`,
  campaignStats: (id) => `campaign:${id}:stats`,
  dashboardStats: (userId) => `dashboard:${userId}:stats`,
  pipelineMetrics: (userId) => `pipeline:${userId}:metrics`,
  activityFeed: (userId) => `activity:${userId}:feed`,
  notifications: (userId) => `notifications:${userId}`,
  session: (token) => `session:${token}`,
  rateLimit: (ip, endpoint) => `ratelimit:${ip}:${endpoint}`
};

// Graceful shutdown
export const closeRedis = async () => {
  try {
    await redis.quit();
    await subscriber.quit();
    await publisher.quit();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
};

export { redis, subscriber, publisher };
export default redis;
