/**
 * Metrics Service
 * Enterprise-level metrics collection (Prometheus-compatible)
 */

import logger from '../utils/logger.js';

class MetricsService {
  constructor() {
    this.metrics = {
      // HTTP metrics
      httpRequests: {
        total: 0,
        byStatusCode: {},
        byMethod: {},
        byPath: {},
      },

      // API metrics
      apiCalls: {
        total: 0,
        byService: {},
        failures: 0,
        totalDuration: 0,
      },

      // POI Classification metrics
      poiClassification: {
        total: 0,
        byTier: { 1: 0, 2: 0, 3: 0, 4: 0 },
        tierChanges: 0,
        failures: 0,
        totalDuration: 0,
      },

      // Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      },

      // Circuit breaker metrics
      circuitBreakers: {},

      // Database metrics
      database: {
        queries: 0,
        failures: 0,
        totalDuration: 0,
      },

      // Workflow metrics
      workflows: {},
    };

    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method, path, statusCode, duration) {
    this.metrics.httpRequests.total++;

    // By status code
    this.metrics.httpRequests.byStatusCode[statusCode] =
      (this.metrics.httpRequests.byStatusCode[statusCode] || 0) + 1;

    // By method
    this.metrics.httpRequests.byMethod[method] =
      (this.metrics.httpRequests.byMethod[method] || 0) + 1;

    // By path (simplified)
    const simplifiedPath = this.simplifyPath(path);
    this.metrics.httpRequests.byPath[simplifiedPath] =
      (this.metrics.httpRequests.byPath[simplifiedPath] || 0) + 1;
  }

  /**
   * Record API call
   */
  recordApiCall(service, success, duration) {
    this.metrics.apiCalls.total++;
    this.metrics.apiCalls.totalDuration += duration;

    if (!this.metrics.apiCalls.byService[service]) {
      this.metrics.apiCalls.byService[service] = {
        total: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
      };
    }

    this.metrics.apiCalls.byService[service].total++;
    this.metrics.apiCalls.byService[service].totalDuration += duration;

    if (success) {
      this.metrics.apiCalls.byService[service].successes++;
    } else {
      this.metrics.apiCalls.byService[service].failures++;
      this.metrics.apiCalls.failures++;
    }
  }

  /**
   * Record POI classification
   */
  recordPOIClassification(tier, success, duration, tierChanged = false) {
    this.metrics.poiClassification.total++;
    this.metrics.poiClassification.totalDuration += duration;

    if (success) {
      this.metrics.poiClassification.byTier[tier]++;
      if (tierChanged) {
        this.metrics.poiClassification.tierChanges++;
      }
    } else {
      this.metrics.poiClassification.failures++;
    }
  }

  /**
   * Record cache operation
   */
  recordCache(operation, success = true) {
    if (success) {
      this.metrics.cache[operation]++;
    }
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(success, duration) {
    this.metrics.database.queries++;
    this.metrics.database.totalDuration += duration;

    if (!success) {
      this.metrics.database.failures++;
    }
  }

  /**
   * Record workflow execution
   */
  recordWorkflow(name, success, duration) {
    if (!this.metrics.workflows[name]) {
      this.metrics.workflows[name] = {
        total: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
      };
    }

    this.metrics.workflows[name].total++;
    this.metrics.workflows[name].totalDuration += duration;

    if (success) {
      this.metrics.workflows[name].successes++;
    } else {
      this.metrics.workflows[name].failures++;
    }
  }

  /**
   * Update circuit breaker metrics
   */
  updateCircuitBreakerMetrics(breakerStats) {
    this.metrics.circuitBreakers = breakerStats;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      uptime,
      timestamp: new Date().toISOString(),
      ...this.metrics,
      calculated: {
        avgHttpResponseTime:
          this.metrics.httpRequests.total > 0
            ? Math.round(this.metrics.httpRequests.totalDuration / this.metrics.httpRequests.total)
            : 0,
        avgApiCallTime:
          this.metrics.apiCalls.total > 0
            ? Math.round(this.metrics.apiCalls.totalDuration / this.metrics.apiCalls.total)
            : 0,
        avgClassificationTime:
          this.metrics.poiClassification.total > 0
            ? Math.round(
                this.metrics.poiClassification.totalDuration / this.metrics.poiClassification.total
              )
            : 0,
        cacheHitRate:
          this.metrics.cache.hits + this.metrics.cache.misses > 0
            ? (
                (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) *
                100
              ).toFixed(2) + '%'
            : '0%',
        apiSuccessRate:
          this.metrics.apiCalls.total > 0
            ? (
                ((this.metrics.apiCalls.total - this.metrics.apiCalls.failures) /
                  this.metrics.apiCalls.total) *
                100
              ).toFixed(2) + '%'
            : '100%',
      },
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    let output = [];

    // HTTP requests
    output.push('# HELP http_requests_total Total HTTP requests');
    output.push('# TYPE http_requests_total counter');
    output.push(`http_requests_total ${metrics.httpRequests.total}`);

    // HTTP requests by status
    output.push('# HELP http_requests_by_status HTTP requests by status code');
    output.push('# TYPE http_requests_by_status counter');
    for (const [status, count] of Object.entries(metrics.httpRequests.byStatusCode)) {
      output.push(`http_requests_by_status{status="${status}"} ${count}`);
    }

    // API calls
    output.push('# HELP api_calls_total Total API calls');
    output.push('# TYPE api_calls_total counter');
    output.push(`api_calls_total ${metrics.apiCalls.total}`);

    // API failures
    output.push('# HELP api_failures_total Total API failures');
    output.push('# TYPE api_failures_total counter');
    output.push(`api_failures_total ${metrics.apiCalls.failures}`);

    // POI classifications
    output.push('# HELP poi_classifications_total Total POI classifications');
    output.push('# TYPE poi_classifications_total counter');
    output.push(`poi_classifications_total ${metrics.poiClassification.total}`);

    // Cache hits/misses
    output.push('# HELP cache_hits_total Total cache hits');
    output.push('# TYPE cache_hits_total counter');
    output.push(`cache_hits_total ${metrics.cache.hits}`);

    output.push('# HELP cache_misses_total Total cache misses');
    output.push('# TYPE cache_misses_total counter');
    output.push(`cache_misses_total ${metrics.cache.misses}`);

    // Uptime
    output.push('# HELP uptime_seconds Uptime in seconds');
    output.push('# TYPE uptime_seconds gauge');
    output.push(`uptime_seconds ${metrics.uptime}`);

    return output.join('\n');
  }

  /**
   * Simplify path for metrics
   */
  simplifyPath(path) {
    // Replace UUIDs with :id
    return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  }

  /**
   * Start periodic updates (for background metrics collection)
   */
  startPeriodicUpdates() {
    logger.info('Metrics periodic updates started (no-op in basic mode)');
    // In basic mode, metrics are collected on-demand
    // This could be extended to push metrics to external systems
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      httpRequests: { total: 0, byStatusCode: {}, byMethod: {}, byPath: {} },
      apiCalls: { total: 0, byService: {}, failures: 0, totalDuration: 0 },
      poiClassification: {
        total: 0,
        byTier: { 1: 0, 2: 0, 3: 0, 4: 0 },
        tierChanges: 0,
        failures: 0,
        totalDuration: 0,
      },
      cache: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      circuitBreakers: {},
      database: { queries: 0, failures: 0, totalDuration: 0 },
      workflows: {},
    };
    this.startTime = Date.now();
    logger.info('Metrics reset');
  }
}

// Export singleton
const metricsService = new MetricsService();
export default metricsService;
