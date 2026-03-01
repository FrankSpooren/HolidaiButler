/**
 * Metrics Collection Service for Ticketing Module
 * Prometheus-compatible metrics for monitoring and observability
 */

import logger from '../utils/logger.js';

class MetricsService {
  constructor() {
    this.metrics = {
      // HTTP metrics
      http: {
        requests_total: 0,
        requests_by_status: {},
        requests_by_method: {},
        requests_by_path: {},
        response_time_ms: []
      },

      // Booking metrics
      bookings: {
        created_total: 0,
        confirmed_total: 0,
        cancelled_total: 0,
        failed_total: 0,
        by_ticket_type: {},
        by_status: {},
        revenue_total: 0
      },

      // Ticket metrics
      tickets: {
        viewed_total: 0,
        searched_total: 0,
        by_category: {},
        by_location: {},
        availability_checks: 0
      },

      // Availability metrics
      availability: {
        checks_total: 0,
        updates_total: 0,
        sold_out_events: 0
      },

      // Database metrics
      database: {
        queries_total: 0,
        query_errors: 0,
        query_duration_ms: [],
        connections_active: 0
      },

      // Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      },

      // Circuit breaker metrics
      circuitBreakers: {},

      // External API metrics
      externalAPIs: {
        calls_total: 0,
        calls_by_service: {},
        failures: 0,
        duration_ms: []
      }
    };

    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordHTTPRequest(method, path, statusCode, durationMs) {
    this.metrics.http.requests_total++;

    // By status
    this.metrics.http.requests_by_status[statusCode] =
      (this.metrics.http.requests_by_status[statusCode] || 0) + 1;

    // By method
    this.metrics.http.requests_by_method[method] =
      (this.metrics.http.requests_by_method[method] || 0) + 1;

    // By path (normalize to avoid too many unique paths)
    const normalizedPath = this.normalizePath(path);
    this.metrics.http.requests_by_path[normalizedPath] =
      (this.metrics.http.requests_by_path[normalizedPath] || 0) + 1;

    // Response time
    this.metrics.http.response_time_ms.push(durationMs);

    // Keep only last 1000 response times
    if (this.metrics.http.response_time_ms.length > 1000) {
      this.metrics.http.response_time_ms.shift();
    }
  }

  /**
   * Record booking creation
   */
  recordBookingCreated(ticketType, amount) {
    this.metrics.bookings.created_total++;
    this.metrics.bookings.by_ticket_type[ticketType] =
      (this.metrics.bookings.by_ticket_type[ticketType] || 0) + 1;
    this.metrics.bookings.revenue_total += amount;
  }

  /**
   * Record booking confirmation
   */
  recordBookingConfirmed() {
    this.metrics.bookings.confirmed_total++;
  }

  /**
   * Record booking cancellation
   */
  recordBookingCancelled(refundAmount = 0) {
    this.metrics.bookings.cancelled_total++;
    this.metrics.bookings.revenue_total -= refundAmount;
  }

  /**
   * Record booking failure
   */
  recordBookingFailed() {
    this.metrics.bookings.failed_total++;
  }

  /**
   * Record booking status change
   */
  recordBookingStatus(status) {
    this.metrics.bookings.by_status[status] =
      (this.metrics.bookings.by_status[status] || 0) + 1;
  }

  /**
   * Record ticket view
   */
  recordTicketView(category, location) {
    this.metrics.tickets.viewed_total++;

    if (category) {
      this.metrics.tickets.by_category[category] =
        (this.metrics.tickets.by_category[category] || 0) + 1;
    }

    if (location) {
      this.metrics.tickets.by_location[location] =
        (this.metrics.tickets.by_location[location] || 0) + 1;
    }
  }

  /**
   * Record ticket search
   */
  recordTicketSearch() {
    this.metrics.tickets.searched_total++;
  }

  /**
   * Record availability check
   */
  recordAvailabilityCheck() {
    this.metrics.availability.checks_total++;
  }

  /**
   * Record availability update
   */
  recordAvailabilityUpdate() {
    this.metrics.availability.updates_total++;
  }

  /**
   * Record sold out event
   */
  recordSoldOut() {
    this.metrics.availability.sold_out_events++;
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(durationMs, error = false) {
    this.metrics.database.queries_total++;

    if (error) {
      this.metrics.database.query_errors++;
    }

    this.metrics.database.query_duration_ms.push(durationMs);

    // Keep only last 1000 durations
    if (this.metrics.database.query_duration_ms.length > 1000) {
      this.metrics.database.query_duration_ms.shift();
    }
  }

  /**
   * Update database connections count
   */
  updateDatabaseConnections(count) {
    this.metrics.database.connections_active = count;
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  /**
   * Record cache set
   */
  recordCacheSet() {
    this.metrics.cache.sets++;
  }

  /**
   * Record cache delete
   */
  recordCacheDelete() {
    this.metrics.cache.deletes++;
  }

  /**
   * Record circuit breaker state
   */
  recordCircuitBreakerState(name, state, metrics) {
    this.metrics.circuitBreakers[name] = {
      state,
      ...metrics,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Record external API call
   */
  recordExternalAPICall(service, success, durationMs) {
    this.metrics.externalAPIs.calls_total++;

    if (!this.metrics.externalAPIs.calls_by_service[service]) {
      this.metrics.externalAPIs.calls_by_service[service] = {
        total: 0,
        success: 0,
        failures: 0
      };
    }

    this.metrics.externalAPIs.calls_by_service[service].total++;

    if (success) {
      this.metrics.externalAPIs.calls_by_service[service].success++;
    } else {
      this.metrics.externalAPIs.calls_by_service[service].failures++;
      this.metrics.externalAPIs.failures++;
    }

    this.metrics.externalAPIs.duration_ms.push(durationMs);

    // Keep only last 1000 durations
    if (this.metrics.externalAPIs.duration_ms.length > 1000) {
      this.metrics.externalAPIs.duration_ms.shift();
    }
  }

  /**
   * Normalize path to avoid too many unique metrics
   */
  normalizePath(path) {
    // Replace IDs with placeholders
    return path
      .replace(/\/[0-9a-f]{24}\b/gi, '/:id') // MongoDB ObjectIds
      .replace(/\/[0-9]+\b/g, '/:id')        // Numeric IDs
      .replace(/\/[0-9a-f-]{36}\b/gi, '/:uuid'); // UUIDs
  }

  /**
   * Calculate average
   */
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);

    return {
      timestamp: new Date().toISOString(),
      uptime_seconds: uptimeSeconds,

      http: {
        ...this.metrics.http,
        avg_response_time_ms: this.calculateAverage(this.metrics.http.response_time_ms),
        p95_response_time_ms: this.calculatePercentile(this.metrics.http.response_time_ms, 95),
        p99_response_time_ms: this.calculatePercentile(this.metrics.http.response_time_ms, 99)
      },

      bookings: {
        ...this.metrics.bookings,
        success_rate: this.metrics.bookings.created_total > 0
          ? ((this.metrics.bookings.confirmed_total / this.metrics.bookings.created_total) * 100).toFixed(2) + '%'
          : 'N/A',
        cancellation_rate: this.metrics.bookings.created_total > 0
          ? ((this.metrics.bookings.cancelled_total / this.metrics.bookings.created_total) * 100).toFixed(2) + '%'
          : 'N/A'
      },

      tickets: this.metrics.tickets,
      availability: this.metrics.availability,

      database: {
        ...this.metrics.database,
        avg_query_duration_ms: this.calculateAverage(this.metrics.database.query_duration_ms),
        p95_query_duration_ms: this.calculatePercentile(this.metrics.database.query_duration_ms, 95),
        error_rate: this.metrics.database.queries_total > 0
          ? ((this.metrics.database.query_errors / this.metrics.database.queries_total) * 100).toFixed(2) + '%'
          : 'N/A'
      },

      cache: {
        ...this.metrics.cache,
        hit_rate: (this.metrics.cache.hits + this.metrics.cache.misses) > 0
          ? ((this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100).toFixed(2) + '%'
          : 'N/A'
      },

      circuit_breakers: this.metrics.circuitBreakers,

      external_apis: {
        ...this.metrics.externalAPIs,
        avg_duration_ms: this.calculateAverage(this.metrics.externalAPIs.duration_ms),
        p95_duration_ms: this.calculatePercentile(this.metrics.externalAPIs.duration_ms, 95),
        success_rate: this.metrics.externalAPIs.calls_total > 0
          ? (((this.metrics.externalAPIs.calls_total - this.metrics.externalAPIs.failures) / this.metrics.externalAPIs.calls_total) * 100).toFixed(2) + '%'
          : 'N/A'
      }
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics() {
    const metrics = this.getAllMetrics();
    let output = '# Ticketing Module Metrics\n\n';

    // HTTP metrics
    output += `# TYPE ticketing_http_requests_total counter\n`;
    output += `ticketing_http_requests_total ${metrics.http.requests_total}\n\n`;

    for (const [status, count] of Object.entries(metrics.http.requests_by_status)) {
      output += `ticketing_http_requests_by_status{status="${status}"} ${count}\n`;
    }
    output += '\n';

    // Booking metrics
    output += `# TYPE ticketing_bookings_total counter\n`;
    output += `ticketing_bookings_total{status="created"} ${metrics.bookings.created_total}\n`;
    output += `ticketing_bookings_total{status="confirmed"} ${metrics.bookings.confirmed_total}\n`;
    output += `ticketing_bookings_total{status="cancelled"} ${metrics.bookings.cancelled_total}\n`;
    output += `ticketing_bookings_total{status="failed"} ${metrics.bookings.failed_total}\n\n`;

    output += `# TYPE ticketing_revenue_total counter\n`;
    output += `ticketing_revenue_total ${metrics.bookings.revenue_total}\n\n`;

    // Cache metrics
    output += `# TYPE ticketing_cache_hits_total counter\n`;
    output += `ticketing_cache_hits_total ${metrics.cache.hits}\n\n`;

    output += `# TYPE ticketing_cache_misses_total counter\n`;
    output += `ticketing_cache_misses_total ${metrics.cache.misses}\n\n`;

    // Database metrics
    output += `# TYPE ticketing_database_queries_total counter\n`;
    output += `ticketing_database_queries_total ${metrics.database.queries_total}\n\n`;

    output += `# TYPE ticketing_database_errors_total counter\n`;
    output += `ticketing_database_errors_total ${metrics.database.query_errors}\n\n`;

    return output;
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      if (typeof this.metrics[key] === 'object') {
        if (Array.isArray(this.metrics[key])) {
          this.metrics[key] = [];
        } else {
          Object.keys(this.metrics[key]).forEach(subKey => {
            if (typeof this.metrics[key][subKey] === 'number') {
              this.metrics[key][subKey] = 0;
            } else if (Array.isArray(this.metrics[key][subKey])) {
              this.metrics[key][subKey] = [];
            } else if (typeof this.metrics[key][subKey] === 'object') {
              this.metrics[key][subKey] = {};
            }
          });
        }
      }
    });

    this.startTime = Date.now();
    logger.info('Metrics reset');
  }
}

// Export singleton instance
const metricsService = new MetricsService();
export default metricsService;
