/**
 * Prometheus Middleware
 * ENTERPRISE: Automatic HTTP request metrics collection
 *
 * Tracks:
 * - Request duration
 * - Request/response size
 * - Status codes
 * - Active requests
 * - Route-level metrics
 *
 * Compatible with Express.js
 */

import metricsService from '../services/metrics.js';
import logger from '../utils/logger.js';

/**
 * Normalize route path
 * Converts /api/poi/123 to /api/poi/:id
 */
function normalizeRoute(req) {
  // If route is defined (by express router), use it
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    return baseUrl + req.route.path;
  }

  // Otherwise, generalize the path
  const path = req.path || req.url;

  // Replace UUIDs
  const withoutUuids = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':uuid'
  );

  // Replace numeric IDs
  const withoutIds = withoutUuids.replace(/\/\d+/g, '/:id');

  return withoutIds;
}

/**
 * Get request size in bytes
 */
function getRequestSize(req) {
  const contentLength = req.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : 0;
}

/**
 * Prometheus metrics middleware
 */
export function prometheusMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    const route = normalizeRoute(req);
    const method = req.method;

    // Track active requests
    metricsService.incrementActiveRequests(method, route);

    // Record request size
    const requestSize = getRequestSize(req);
    if (requestSize > 0) {
      metricsService.recordHttpRequestSize(method, route, requestSize);
    }

    // Capture original res.end to measure duration
    const originalEnd = res.end.bind(res);

    res.end = function (...args) {
      // Calculate duration
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const statusCode = res.statusCode.toString();

      // Record metrics
      metricsService.recordHttpRequest(method, route, statusCode, duration);
      metricsService.decrementActiveRequests(method, route);

      // Record response size if available
      const responseSize = parseInt(res.get('content-length') || '0', 10);
      if (responseSize > 0) {
        metricsService.recordHttpResponseSize(method, route, responseSize);
      }

      // Log slow requests (> 1 second)
      if (duration > 1) {
        logger.warn('Slow request detected', {
          method,
          route,
          duration: `${duration.toFixed(3)}s`,
          statusCode,
        });
      }

      // Call original end
      return originalEnd(...args);
    };

    next();
  };
}

/**
 * Metrics endpoint handler
 * Exposes /metrics endpoint for Prometheus scraping
 */
export async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', metricsService.getRegister().contentType);
    const metrics = await metricsService.getMetrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).end('Error generating metrics');
  }
}

export default prometheusMiddleware;
