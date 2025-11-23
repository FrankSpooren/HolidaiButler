/**
 * Prometheus Metrics Service
 * ENTERPRISE: Real-time monitoring and observability
 *
 * Metrics Categories:
 * - HTTP request metrics (duration, status codes, throughput)
 * - Database metrics (query duration, connection pool)
 * - Circuit breaker metrics (state, failure rate)
 * - Business metrics (POI creation rate, classification success)
 * - Cache metrics (hit rate, eviction rate)
 * - External API metrics (Apify usage, cost tracking)
 *
 * Prometheus Best Practices:
 * - Use histograms for latency (not gauges)
 * - Use counters for events (monotonically increasing)
 * - Use gauges for current values (can go up/down)
 * - Label cardinality kept low (avoid high-cardinality labels like user IDs)
 */

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import logger from '../utils/logger.js';

// Create custom registry
const register = new Registry();

// Default labels for all metrics
register.setDefaultLabels({
  app: 'holidai-butler',
  environment: process.env.NODE_ENV || 'development',
});

/**
 * HTTP Request Metrics
 */

// HTTP request duration histogram
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // 10ms to 10s
  registers: [register],
});

// HTTP request total counter
const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request size
const httpRequestSize = new Summary({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  registers: [register],
});

// HTTP response size
const httpResponseSize = new Summary({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  registers: [register],
});

/**
 * Database Metrics
 */

// Database query duration
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5], // 1ms to 5s
  registers: [register],
});

// Database connection pool
const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['state'], // idle, active, waiting
  registers: [register],
});

// Database transaction total
const dbTransactionTotal = new Counter({
  name: 'db_transactions_total',
  help: 'Total number of database transactions',
  labelNames: ['status'], // committed, rolled_back
  registers: [register],
});

/**
 * Circuit Breaker Metrics
 */

// Circuit breaker state
const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['service'],
  registers: [register],
});

// Circuit breaker failure rate
const circuitBreakerFailureRate = new Gauge({
  name: 'circuit_breaker_failure_rate_percent',
  help: 'Circuit breaker failure rate percentage',
  labelNames: ['service'],
  registers: [register],
});

// Circuit breaker requests total
const circuitBreakerRequestsTotal = new Counter({
  name: 'circuit_breaker_requests_total',
  help: 'Total number of requests through circuit breaker',
  labelNames: ['service', 'status'], // success, failure, rejected
  registers: [register],
});

/**
 * Business Metrics (POI System)
 */

// POI creation rate
const poiCreationTotal = new Counter({
  name: 'poi_creation_total',
  help: 'Total number of POIs created',
  labelNames: ['source', 'category', 'status'], // created, failed, duplicate
  registers: [register],
});

// POI classification duration
const poiClassificationDuration = new Histogram({
  name: 'poi_classification_duration_seconds',
  help: 'Duration of POI classification in seconds',
  labelNames: ['tier', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
  registers: [register],
});

// POI by tier gauge
const poiByTier = new Gauge({
  name: 'poi_total_by_tier',
  help: 'Total number of POIs by tier',
  labelNames: ['tier', 'city'],
  registers: [register],
});

// POI score histogram
const poiScoreDistribution = new Histogram({
  name: 'poi_score_distribution',
  help: 'Distribution of POI scores',
  labelNames: ['tier'],
  buckets: [0, 2, 4, 6, 8, 10], // 0-10 score range
  registers: [register],
});

/**
 * Cache Metrics
 */

// Cache hit/miss counter
const cacheOperationsTotal = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'], // get/set/del, hit/miss/error
  registers: [register],
});

// Cache operation duration
const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1], // 1ms to 100ms
  registers: [register],
});

// Cache size (items)
const cacheSize = new Gauge({
  name: 'cache_size_items',
  help: 'Current number of items in cache',
  labelNames: ['cache_type'], // idempotency, rate_limit, etc.
  registers: [register],
});

/**
 * External API Metrics
 */

// External API request duration
const externalApiDuration = new Histogram({
  name: 'external_api_duration_seconds',
  help: 'Duration of external API requests in seconds',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // 100ms to 60s
  registers: [register],
});

// External API cost tracker
const externalApiCost = new Counter({
  name: 'external_api_cost_eur',
  help: 'Total cost of external API usage in EUR',
  labelNames: ['service', 'operation'],
  registers: [register],
});

// External API requests total
const externalApiRequestsTotal = new Counter({
  name: 'external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['service', 'operation', 'status'],
  registers: [register],
});

/**
 * System Metrics
 */

// Active requests gauge
const activeRequests = new Gauge({
  name: 'active_requests',
  help: 'Number of requests currently being processed',
  labelNames: ['method', 'route'],
  registers: [register],
});

// Event bus events
const eventBusEventsTotal = new Counter({
  name: 'event_bus_events_total',
  help: 'Total number of events published to event bus',
  labelNames: ['event_type', 'status'],
  registers: [register],
});

/**
 * Metrics Service Class
 */
class MetricsService {
  constructor() {
    this.register = register;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    return this.register.metrics();
  }

  /**
   * Get registry (for custom metrics)
   */
  getRegister() {
    return this.register;
  }

  // HTTP Metrics
  recordHttpRequest(method, route, statusCode, duration) {
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    httpRequestTotal.labels(method, route, statusCode).inc();
  }

  recordHttpRequestSize(method, route, size) {
    httpRequestSize.labels(method, route).observe(size);
  }

  recordHttpResponseSize(method, route, size) {
    httpResponseSize.labels(method, route).observe(size);
  }

  incrementActiveRequests(method, route) {
    activeRequests.labels(method, route).inc();
  }

  decrementActiveRequests(method, route) {
    activeRequests.labels(method, route).dec();
  }

  // Database Metrics
  recordDbQuery(operation, table, status, duration) {
    dbQueryDuration.labels(operation, table, status).observe(duration);
  }

  recordDbTransaction(status) {
    dbTransactionTotal.labels(status).inc();
  }

  setDbConnectionPoolSize(idle, active, waiting) {
    dbConnectionPoolSize.labels('idle').set(idle);
    dbConnectionPoolSize.labels('active').set(active);
    dbConnectionPoolSize.labels('waiting').set(waiting);
  }

  // Circuit Breaker Metrics
  setCircuitBreakerState(service, state) {
    // Map state to number: CLOSED=0, HALF_OPEN=1, OPEN=2
    const stateMap = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 };
    circuitBreakerState.labels(service).set(stateMap[state] || 0);
  }

  setCircuitBreakerFailureRate(service, failureRate) {
    circuitBreakerFailureRate.labels(service).set(failureRate);
  }

  recordCircuitBreakerRequest(service, status) {
    circuitBreakerRequestsTotal.labels(service, status).inc();
  }

  // POI Business Metrics
  recordPoiCreation(source, category, status) {
    poiCreationTotal.labels(source, category, status).inc();
  }

  recordPoiClassification(tier, status, duration) {
    poiClassificationDuration.labels(tier, status).observe(duration);
  }

  setPoiCountByTier(tier, city, count) {
    poiByTier.labels(tier, city).set(count);
  }

  recordPoiScore(tier, score) {
    poiScoreDistribution.labels(tier).observe(score);
  }

  // Cache Metrics
  recordCacheOperation(operation, status, duration = null) {
    cacheOperationsTotal.labels(operation, status).inc();
    if (duration !== null) {
      cacheOperationDuration.labels(operation).observe(duration);
    }
  }

  setCacheSize(cacheType, size) {
    cacheSize.labels(cacheType).set(size);
  }

  // External API Metrics
  recordExternalApiRequest(service, operation, status, duration, cost = 0) {
    externalApiDuration.labels(service, operation, status).observe(duration);
    externalApiRequestsTotal.labels(service, operation, status).inc();
    if (cost > 0) {
      externalApiCost.labels(service, operation).inc(cost);
    }
  }

  // Event Bus Metrics
  recordEventBusEvent(eventType, status = 'published') {
    eventBusEventsTotal.labels(eventType, status).inc();
  }

  /**
   * Update POI statistics (called periodically)
   */
  async updatePoiStatistics() {
    try {
      const POI = (await import('../models/POI.js')).default;
      const { mysqlSequelize } = await import('../config/database.js');

      // Count POIs by tier and city
      const [results] = await mysqlSequelize.query(`
        SELECT tier, city, COUNT(*) as count
        FROM pois
        WHERE active = TRUE
        GROUP BY tier, city
      `);

      results.forEach((row) => {
        this.setPoiCountByTier(row.tier, row.city || 'unknown', row.count);
      });

      logger.debug('Updated POI statistics metrics');
    } catch (error) {
      logger.error('Failed to update POI statistics:', error);
    }
  }

  /**
   * Update circuit breaker statistics (called periodically)
   */
  async updateCircuitBreakerStatistics() {
    try {
      const circuitBreakerManager = (await import('./circuitBreaker.js')).default;
      const stats = await circuitBreakerManager.getAllStats();

      stats.forEach((stat) => {
        this.setCircuitBreakerState(stat.name, stat.state);
        this.setCircuitBreakerFailureRate(stat.name, stat.failureRate);
      });

      logger.debug('Updated circuit breaker metrics');
    } catch (error) {
      logger.error('Failed to update circuit breaker stats:', error);
    }
  }

  /**
   * Start periodic metrics updates
   */
  startPeriodicUpdates(interval = 60000) {
    // Update POI statistics every minute
    setInterval(() => this.updatePoiStatistics(), interval);

    // Update circuit breaker statistics every 30 seconds
    setInterval(() => this.updateCircuitBreakerStatistics(), interval / 2);

    logger.info('Started periodic metrics updates', { interval });
  }
}

// Export singleton
const metricsService = new MetricsService();
export default metricsService;

// Export for testing
export { MetricsService };
