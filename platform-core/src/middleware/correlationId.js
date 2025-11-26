/**
 * Correlation ID Middleware
 * ENTERPRISE: Distributed tracing with unique request IDs
 *
 * Features:
 * - Generates unique correlation ID for each request
 * - Accepts X-Correlation-ID header from upstream services
 * - Stores correlation ID in AsyncLocalStorage (thread-safe)
 * - Adds correlation ID to all log messages
 * - Returns correlation ID in response headers
 *
 * Benefits:
 * - Trace requests across microservices
 * - Debug distributed systems
 * - Link logs from different services
 * - Performance analysis per request
 *
 * Usage:
 *   app.use(correlationIdMiddleware());
 *
 * Standards:
 * - RFC 7231 (HTTP) for header propagation
 * - UUIDv4 for unique IDs
 */

import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// AsyncLocalStorage for correlation context
// This is Node.js's thread-safe way to store request-specific data
const correlationContext = new AsyncLocalStorage();

/**
 * Generate UUID v4
 */
function generateCorrelationId() {
  return crypto.randomUUID();
}

/**
 * Get current correlation ID from async context
 */
export function getCorrelationId() {
  return correlationContext.getStore()?.correlationId || 'no-correlation-id';
}

/**
 * Get current user ID from async context
 */
export function getUserId() {
  return correlationContext.getStore()?.userId || 'anonymous';
}

/**
 * Get current request metadata from async context
 */
export function getRequestContext() {
  return correlationContext.getStore() || {};
}

/**
 * Correlation ID middleware
 * Extracts or generates correlation ID and stores in AsyncLocalStorage
 */
export function correlationIdMiddleware(options = {}) {
  const {
    headerName = 'X-Correlation-ID',
    generateId = generateCorrelationId,
    includeInResponse = true,
  } = options;

  return (req, res, next) => {
    // Get correlation ID from header or generate new one
    const correlationId =
      req.get(headerName) ||
      req.get(headerName.toLowerCase()) ||
      generateId();

    // Extract user info from auth middleware (if available)
    const userId = req.user?.id || 'anonymous';
    const userEmail = req.user?.email || null;

    // Create request context
    const context = {
      correlationId,
      userId,
      userEmail,
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      startTime: Date.now(),
    };

    // Store context in AsyncLocalStorage
    correlationContext.run(context, () => {
      // Add correlation ID to response headers
      if (includeInResponse) {
        res.setHeader(headerName, correlationId);
      }

      // Add correlation ID to request object for convenience
      req.correlationId = correlationId;
      req.context = context;

      // Log request start
      logger.info('Request started', {
        correlationId,
        userId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: context.ip,
      });

      // Capture response finish to log request completion
      const originalEnd = res.end.bind(res);
      res.end = function (...args) {
        const duration = Date.now() - context.startTime;
        const statusCode = res.statusCode;

        logger.info('Request completed', {
          correlationId,
          userId,
          method: req.method,
          path: req.path,
          statusCode,
          duration: `${duration}ms`,
        });

        return originalEnd(...args);
      };

      next();
    });
  };
}

/**
 * Enhanced logger with correlation ID
 * Automatically includes correlation ID in all log messages
 */
export function createContextLogger() {
  return {
    info: (message, meta = {}) => {
      const context = getRequestContext();
      logger.info(message, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...meta,
      });
    },

    warn: (message, meta = {}) => {
      const context = getRequestContext();
      logger.warn(message, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...meta,
      });
    },

    error: (message, meta = {}) => {
      const context = getRequestContext();
      logger.error(message, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...meta,
      });
    },

    debug: (message, meta = {}) => {
      const context = getRequestContext();
      logger.debug(message, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...meta,
      });
    },

    // Custom methods
    integration: (event, data = {}) => {
      const context = getRequestContext();
      logger.integration(event, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...data,
      });
    },

    workflow: (workflowName, step, data = {}) => {
      const context = getRequestContext();
      logger.workflow(workflowName, step, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...data,
      });
    },

    moduleCall: (module, endpoint, data = {}) => {
      const context = getRequestContext();
      logger.moduleCall(module, endpoint, {
        correlationId: context.correlationId,
        userId: context.userId,
        ...data,
      });
    },
  };
}

// Export singleton context-aware logger
export const contextLogger = createContextLogger();

export default correlationIdMiddleware;
