/**
 * Idempotency Middleware
 * ENTERPRISE: Prevents duplicate request processing via Redis-based key storage
 *
 * RFC 7231 Section 4.2.2 - Idempotent Methods
 * Implementation based on Stripe's idempotency pattern
 *
 * Flow:
 * 1. Client sends Idempotency-Key header
 * 2. Check Redis for cached response
 * 3. If found: return cached response (409 if in progress)
 * 4. If not found: process request, cache response
 * 5. TTL: 24 hours (configurable)
 *
 * Security:
 * - Keys are user-scoped to prevent cross-user replay
 * - SHA-256 fingerprint includes method, path, body
 * - Response bodies limited to 1MB to prevent Redis memory exhaustion
 */

import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// Idempotency key prefix
const IDEMPOTENCY_PREFIX = 'idempotency:';
const PROCESSING_PREFIX = 'idempotency:processing:';

// Default TTL: 24 hours
const DEFAULT_TTL = 24 * 60 * 60;

// Max response size to cache: 1MB
const MAX_RESPONSE_SIZE = 1024 * 1024;

/**
 * Generate request fingerprint
 * Includes method, path, and body hash for additional safety
 */
function generateFingerprint(req) {
  const components = [
    req.method,
    req.path,
    JSON.stringify(req.body || {}),
  ];

  return crypto
    .createHash('sha256')
    .update(components.join(':'))
    .digest('hex')
    .substring(0, 16); // First 16 chars for brevity
}

/**
 * Build Redis key
 * Format: idempotency:{userId}:{idempotencyKey}:{fingerprint}
 */
function buildRedisKey(userId, idempotencyKey, fingerprint) {
  return `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}:${fingerprint}`;
}

/**
 * Build processing lock key
 */
function buildProcessingKey(userId, idempotencyKey, fingerprint) {
  return `${PROCESSING_PREFIX}${userId}:${idempotencyKey}:${fingerprint}`;
}

/**
 * Idempotency middleware
 * Only applies to mutating operations: POST, PUT, DELETE, PATCH
 *
 * Usage:
 *   router.post('/resource', idempotency(), async (req, res) => { ... });
 *
 * Options:
 * - ttl: Cache TTL in seconds (default: 24 hours)
 * - methods: HTTP methods to apply idempotency (default: POST, PUT, DELETE, PATCH)
 * - headerName: Idempotency header name (default: Idempotency-Key)
 * - required: If true, reject requests without idempotency key (default: false)
 */
export function idempotency(options = {}) {
  const {
    ttl = DEFAULT_TTL,
    methods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    headerName = 'Idempotency-Key',
    required = false,
  } = options;

  return async (req, res, next) => {
    // Only apply to mutating operations
    if (!methods.includes(req.method)) {
      return next();
    }

    // Get idempotency key from header
    const idempotencyKey = req.get(headerName) || req.get(headerName.toLowerCase());

    // If no key and not required, skip idempotency
    if (!idempotencyKey) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: 'Idempotency Key Required',
          message: `${headerName} header is required for ${req.method} requests`,
        });
      }
      return next();
    }

    // Validate idempotency key format (UUIDv4 or similar)
    if (!/^[a-zA-Z0-9_-]{16,255}$/.test(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Idempotency Key',
        message: 'Idempotency-Key must be 16-255 alphanumeric characters, hyphens, or underscores',
      });
    }

    // Get user ID (from auth middleware)
    const userId = req.user?.id || 'anonymous';

    // Generate request fingerprint
    const fingerprint = generateFingerprint(req);

    // Build Redis keys
    const cacheKey = buildRedisKey(userId, idempotencyKey, fingerprint);
    const processingKey = buildProcessingKey(userId, idempotencyKey, fingerprint);

    try {
      // Check if request is currently being processed
      const isProcessing = await redis.get(processingKey);
      if (isProcessing) {
        logger.warn('Duplicate request detected (processing)', {
          userId,
          idempotencyKey,
          method: req.method,
          path: req.path,
        });

        return res.status(409).json({
          success: false,
          error: 'Request In Progress',
          message: 'A request with this Idempotency-Key is currently being processed',
          idempotencyKey,
        });
      }

      // Check if we have a cached response
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        logger.info('Returning cached idempotent response', {
          userId,
          idempotencyKey,
          method: req.method,
          path: req.path,
        });

        const { statusCode, headers, body } = JSON.parse(cachedResponse);

        // Set cached response headers
        Object.entries(headers).forEach(([key, value]) => {
          res.set(key, value);
        });

        // Add idempotency header
        res.set('X-Idempotency-Replay', 'true');

        return res.status(statusCode).json(body);
      }

      // Set processing lock (5 minute TTL to prevent deadlocks)
      await redis.setex(processingKey, 300, '1');

      // Capture the original res.json to intercept response
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);

      let statusCode = 200;

      // Override res.status to capture status code
      res.status = function (code) {
        statusCode = code;
        return originalStatus(code);
      };

      // Override res.json to cache response
      res.json = async function (body) {
        // Only cache successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          const responseData = {
            statusCode,
            headers: {
              'Content-Type': 'application/json',
            },
            body,
          };

          const responseString = JSON.stringify(responseData);

          // Only cache if response is under size limit
          if (responseString.length <= MAX_RESPONSE_SIZE) {
            try {
              await redis.setex(cacheKey, ttl, responseString);

              logger.info('Cached idempotent response', {
                userId,
                idempotencyKey,
                method: req.method,
                path: req.path,
                statusCode,
                ttl,
              });
            } catch (error) {
              logger.error('Failed to cache idempotent response', {
                userId,
                idempotencyKey,
                error: error.message,
              });
            }
          } else {
            logger.warn('Response too large to cache', {
              userId,
              idempotencyKey,
              size: responseString.length,
              maxSize: MAX_RESPONSE_SIZE,
            });
          }
        }

        // Clear processing lock
        await redis.del(processingKey);

        return originalJson(body);
      };

      // Handle errors (clear processing lock)
      const originalNext = next;
      next = async (error) => {
        if (error) {
          await redis.del(processingKey);
        }
        return originalNext(error);
      };

      next();
    } catch (error) {
      logger.error('Idempotency middleware error', {
        userId,
        idempotencyKey,
        error: error.message,
      });

      // On Redis error, fail open (allow request through)
      // This prevents Redis outages from breaking the service
      logger.warn('Idempotency check failed, allowing request through', {
        userId,
        idempotencyKey,
      });

      next();
    }
  };
}

/**
 * Strict idempotency middleware
 * Requires idempotency key for all mutating operations
 */
export function strictIdempotency(options = {}) {
  return idempotency({ ...options, required: true });
}

/**
 * Clear idempotency cache for a specific key
 * Useful for testing or manual cache invalidation
 */
export async function clearIdempotencyKey(userId, idempotencyKey, req) {
  const fingerprint = generateFingerprint(req);
  const cacheKey = buildRedisKey(userId, idempotencyKey, fingerprint);
  const processingKey = buildProcessingKey(userId, idempotencyKey, fingerprint);

  await redis.del(cacheKey);
  await redis.del(processingKey);

  logger.info('Cleared idempotency cache', { userId, idempotencyKey });
}

/**
 * Clear all idempotency cache for a user
 * Useful for cleanup or testing
 */
export async function clearUserIdempotencyCache(userId) {
  const pattern = `${IDEMPOTENCY_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info('Cleared user idempotency cache', { userId, count: keys.length });
  }

  return keys.length;
}

export default idempotency;
