/**
 * Prometheus Middleware
 * Simplified version for development
 */

import metricsService from '../services/metrics.js';
import logger from '../utils/logger.js';

/**
 * Normalize route path
 */
function normalizeRoute(req) {
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    return baseUrl + req.route.path;
  }

  const path = req.path || req.url;
  const withoutUuids = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':uuid'
  );
  const withoutIds = withoutUuids.replace(/\/\d+/g, '/:id');
  return withoutIds;
}

/**
 * Prometheus metrics middleware - simplified
 */
export function prometheusMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    const route = normalizeRoute(req);
    const method = req.method;

    // Capture original res.end to measure duration
    const originalEnd = res.end.bind(res);

    res.end = function (...args) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode.toString();

      // Record basic metrics
      metricsService.recordHttpRequest(method, route, statusCode, duration);

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          method,
          route,
          duration: `${duration}ms`,
          statusCode,
        });
      }

      return originalEnd(...args);
    };

    next();
  };
}

/**
 * Metrics endpoint handler
 */
export async function metricsEndpoint(req, res) {
  try {
    const metrics = metricsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).end('Error generating metrics');
  }
}

export default prometheusMiddleware;
