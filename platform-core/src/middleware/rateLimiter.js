/**
 * Rate Limiting Middleware
 * Distributed rate limiting using Redis for enterprise-grade protection
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Create Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_RATELIMIT_DB || '1'),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (error) => {
  logger.error('Rate limiter Redis error:', error);
});

redis.on('connect', () => {
  logger.info('Rate limiter Redis connected');
});

/**
 * Standard rate limit handler
 */
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(429).json({
    success: false,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Skip rate limiting for successful OPTIONS requests
 */
const skipSuccessfulRequests = (req, res) => {
  return req.method === 'OPTIONS' && res.statusCode < 400;
};

/**
 * Standard API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const standardLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:standard:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: skipSuccessfulRequests,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
});

/**
 * Strict rate limiter for expensive operations
 * 10 requests per hour (e.g., POI discovery)
 */
export const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:strict:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 requests per hour
  message: 'Too many expensive operations, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipSuccessfulRequests,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

/**
 * Lenient rate limiter for read operations
 * 1000 requests per 15 minutes
 */
export const readLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:read:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per window
  message: 'Too many read requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipSuccessfulRequests,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

/**
 * Auth endpoints rate limiter
 * 5 requests per 15 minutes (prevent brute force)
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 auth attempts
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use IP for auth (can't use user ID before auth)
    return req.ip;
  },
});

/**
 * Per-user rate limiter
 * Custom limits based on user tier (for future subscription model)
 */
export function createUserRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:user:',
    }),
    windowMs,
    max: async (req) => {
      // Future: fetch user tier and return custom limit
      // For now, return default
      return req.user?.rateLimit || maxRequests;
    },
    message: 'User rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipSuccessfulRequests,
    handler: rateLimitHandler,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
  });
}

/**
 * Graceful shutdown
 */
export async function closeRateLimiter() {
  try {
    await redis.quit();
    logger.info('Rate limiter Redis connection closed');
  } catch (error) {
    logger.error('Error closing rate limiter Redis:', error);
  }
}

export default {
  standardLimiter,
  strictLimiter,
  readLimiter,
  authLimiter,
  createUserRateLimiter,
  closeRateLimiter,
};
