const Redis = require('ioredis');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Idempotency Middleware
 * Prevents duplicate payment processing using idempotency keys
 * Critical for preventing double charges
 */

let redis = null;

// Initialize Redis connection
const initRedis = () => {
  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 2,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  redis.on('error', (err) => {
    logger.error('Redis idempotency connection error:', err);
  });

  redis.on('connect', () => {
    logger.info('Redis idempotency connected');
  });

  return redis;
};

// Idempotency key prefix
const IDEMPOTENCY_PREFIX = 'idempotency:payment:';
const DEFAULT_TTL_SECONDS = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS) || 86400; // 24 hours

/**
 * Idempotency status types
 */
const IdempotencyStatus = {
  NEW: 'new',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Generate idempotency key from request data
 * @param {Object} req - Express request
 * @returns {string} - Generated key
 */
const generateIdempotencyKey = (req) => {
  // Use provided key or generate from request fingerprint
  if (req.body.idempotencyKey) {
    return req.body.idempotencyKey;
  }

  // Generate fingerprint from user + amount + resource
  const fingerprint = [
    req.user?.id || 'anonymous',
    req.body.amount,
    req.body.currency || 'EUR',
    req.body.resourceType,
    req.body.resourceId,
    req.ip,
  ].join(':');

  return crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 32);
};

/**
 * Idempotency check middleware
 * Stores request state in Redis to prevent duplicate processing
 */
const idempotencyCheck = (options = {}) => {
  const ttlSeconds = options.ttl || DEFAULT_TTL_SECONDS;

  return async (req, res, next) => {
    // Only apply to POST/PUT requests
    if (!['POST', 'PUT'].includes(req.method)) {
      return next();
    }

    const redisClient = initRedis();

    try {
      await redisClient.connect().catch(() => {}); // Ignore if already connected
    } catch (err) {
      // If Redis is unavailable, log and continue (fail open for non-critical path)
      logger.warn('Redis unavailable for idempotency check, continuing without it');
      return next();
    }

    const idempotencyKey = generateIdempotencyKey(req);
    const redisKey = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;

    // Add key to request for later use
    req.idempotencyKey = idempotencyKey;

    try {
      // Check if key exists
      const existing = await redisClient.get(redisKey);

      if (existing) {
        const data = JSON.parse(existing);

        switch (data.status) {
          case IdempotencyStatus.PROCESSING:
            // Request is still being processed
            logger.info(`Idempotency: Request ${idempotencyKey} is still processing`);
            return res.status(409).json({
              success: false,
              error: 'Request is currently being processed',
              code: 'IDEMPOTENCY_CONFLICT',
              idempotencyKey,
            });

          case IdempotencyStatus.COMPLETED:
            // Return cached response
            logger.info(`Idempotency: Returning cached response for ${idempotencyKey}`);
            return res.status(data.statusCode || 200).json(data.response);

          case IdempotencyStatus.FAILED:
            // Allow retry if previous attempt failed
            logger.info(`Idempotency: Previous attempt failed, allowing retry for ${idempotencyKey}`);
            break;

          default:
            break;
        }
      }

      // Mark as processing
      await redisClient.set(
        redisKey,
        JSON.stringify({
          status: IdempotencyStatus.PROCESSING,
          requestedAt: new Date().toISOString(),
          userId: req.user?.id,
          ip: req.ip,
        }),
        'EX',
        ttlSeconds
      );

      // Capture original res.json to intercept response
      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        try {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

          // Store final result
          await redisClient.set(
            redisKey,
            JSON.stringify({
              status: isSuccess ? IdempotencyStatus.COMPLETED : IdempotencyStatus.FAILED,
              statusCode: res.statusCode,
              response: body,
              completedAt: new Date().toISOString(),
              userId: req.user?.id,
            }),
            'EX',
            ttlSeconds
          );
        } catch (err) {
          logger.error('Failed to store idempotency result:', err);
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Idempotency middleware error:', error);
      // Fail open - allow request to proceed
      next();
    }
  };
};

/**
 * Clean up idempotency key (for testing or manual cleanup)
 * @param {string} key - Idempotency key to remove
 */
const clearIdempotencyKey = async (key) => {
  const redisClient = initRedis();
  const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;
  await redisClient.del(redisKey);
};

/**
 * Get idempotency status
 * @param {string} key - Idempotency key
 * @returns {Object|null} - Status data or null
 */
const getIdempotencyStatus = async (key) => {
  const redisClient = initRedis();
  const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;
  const data = await redisClient.get(redisKey);
  return data ? JSON.parse(data) : null;
};

module.exports = {
  idempotencyCheck,
  clearIdempotencyKey,
  getIdempotencyStatus,
  generateIdempotencyKey,
  IdempotencyStatus,
};
