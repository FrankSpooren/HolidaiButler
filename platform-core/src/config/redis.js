/**
 * Redis Configuration
 * Enterprise-level Redis client for caching and pub/sub
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redis = null;
let isConnected = false;

/**
 * Create Redis client with reconnection logic
 */
const createRedisClient = () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  const client = new Redis({
    host,
    port,
    password,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis: Max retries reached, operating without cache');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 1000, 3000);
      logger.info(`Redis: Retrying connection in ${delay}ms...`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true, // Don't connect automatically
  });

  client.on('connect', () => {
    isConnected = true;
    logger.info('Redis: Connected successfully');
  });

  client.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      logger.warn('Redis: Connection refused - operating without cache');
    } else {
      logger.error('Redis: Error:', err.message);
    }
    isConnected = false;
  });

  client.on('close', () => {
    isConnected = false;
    logger.warn('Redis: Connection closed');
  });

  return client;
};

/**
 * Get Redis client (lazy initialization)
 */
const getClient = () => {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis;
};

/**
 * Connect to Redis
 */
const connect = async () => {
  try {
    const client = getClient();
    await client.connect();
    return true;
  } catch (error) {
    logger.warn('Redis: Could not connect, operating without cache:', error.message);
    return false;
  }
};

/**
 * Safe get operation (returns null if Redis unavailable)
 */
const get = async (key) => {
  if (!isConnected) return null;
  try {
    return await getClient().get(key);
  } catch (error) {
    logger.warn('Redis get error:', error.message);
    return null;
  }
};

/**
 * Safe set operation (no-op if Redis unavailable)
 */
const set = async (key, value, expireSeconds = null) => {
  if (!isConnected) return false;
  try {
    if (expireSeconds) {
      await getClient().setex(key, expireSeconds, value);
    } else {
      await getClient().set(key, value);
    }
    return true;
  } catch (error) {
    logger.warn('Redis set error:', error.message);
    return false;
  }
};

/**
 * Safe delete operation
 */
const del = async (key) => {
  if (!isConnected) return false;
  try {
    await getClient().del(key);
    return true;
  } catch (error) {
    logger.warn('Redis del error:', error.message);
    return false;
  }
};

/**
 * Check if Redis is connected
 */
const getIsConnected = () => isConnected;

/**
 * Disconnect from Redis
 */
const disconnect = async () => {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      logger.warn('Redis disconnect error:', error.message);
    }
  }
};

export default {
  getClient,
  connect,
  get,
  set,
  del,
  isConnected: getIsConnected,
  disconnect,
};
