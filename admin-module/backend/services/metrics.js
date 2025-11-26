/**
 * Metrics Collection Service for Admin Module
 * Prometheus-compatible metrics for monitoring and observability
 */

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

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

      // POI management metrics
      pois: {
        created_total: 0,
        updated_total: 0,
        deleted_total: 0,
        total_count: 0,
        by_category: {},
        by_city: {},
        verified_count: 0
      },

      // Admin user metrics
      users: {
        login_total: 0,
        login_failures: 0,
        active_sessions: 0,
        by_role: {}
      },

      // Upload metrics
      uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        total_size_bytes: 0,
        by_type: {}
      },

      // Platform configuration metrics
      config: {
        updates_total: 0,
        by_key: {}
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
   * Record POI creation
   */
  recordPOICreated(category, city) {
    this.metrics.pois.created_total++;
    this.metrics.pois.total_count++;

    if (category) {
      this.metrics.pois.by_category[category] =
        (this.metrics.pois.by_category[category] || 0) + 1;
    }

    if (city) {
      this.metrics.pois.by_city[city] =
        (this.metrics.pois.by_city[city] || 0) + 1;
    }
  }

  /**
   * Record POI update
   */
  recordPOIUpdated() {
    this.metrics.pois.updated_total++;
  }

  /**
   * Record POI deletion
   */
  recordPOIDeleted(category, city) {
    this.metrics.pois.deleted_total++;
    this.metrics.pois.total_count--;

    if (category && this.metrics.pois.by_category[category]) {
      this.metrics.pois.by_category[category]--;
    }

    if (city && this.metrics.pois.by_city[city]) {
      this.metrics.pois.by_city[city]--;
    }
  }

  /**
   * Record POI verification
   */
  recordPOIVerified() {
    this.metrics.pois.verified_count++;
  }

  /**
   * Update total POI count
   */
  updatePOICount(count) {
    this.metrics.pois.total_count = count;
  }

  /**
   * Record admin login
   */
  recordAdminLogin(success, role = null) {
    this.metrics.users.login_total++;

    if (!success) {
      this.metrics.users.login_failures++;
    }

    if (success && role) {
      this.metrics.users.by_role[role] =
        (this.metrics.users.by_role[role] || 0) + 1;
    }
  }

  /**
   * Update active sessions count
   */
  updateActiveSessions(count) {
    this.metrics.users.active_sessions = count;
  }

  /**
   * Record file upload
   */
  recordUpload(success, sizeBytes, fileType) {
    this.metrics.uploads.total++;

    if (success) {
      this.metrics.uploads.successful++;
      this.metrics.uploads.total_size_bytes += sizeBytes;

      if (fileType) {
        this.metrics.uploads.by_type[fileType] =
          (this.metrics.uploads.by_type[fileType] || 0) + 1;
      }
    } else {
      this.metrics.uploads.failed++;
    }
  }

  /**
   * Record configuration update
   */
  recordConfigUpdate(key) {
    this.metrics.config.updates_total++;

    if (key) {
      this.metrics.config.by_key[key] =
        (this.metrics.config.by_key[key] || 0) + 1;
    }
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

      pois: this.metrics.pois,

      users: {
        ...this.metrics.users,
        login_success_rate: this.metrics.users.login_total > 0
          ? (((this.metrics.users.login_total - this.metrics.users.login_failures) / this.metrics.users.login_total) * 100).toFixed(2) + '%'
          : 'N/A'
      },

      uploads: {
        ...this.metrics.uploads,
        success_rate: this.metrics.uploads.total > 0
          ? ((this.metrics.uploads.successful / this.metrics.uploads.total) * 100).toFixed(2) + '%'
          : 'N/A',
        avg_size_bytes: this.metrics.uploads.successful > 0
          ? Math.round(this.metrics.uploads.total_size_bytes / this.metrics.uploads.successful)
          : 0
      },

      config: this.metrics.config,

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
    let output = '# Admin Module Metrics\n\n';

    // HTTP metrics
    output += `# TYPE admin_http_requests_total counter\n`;
    output += `admin_http_requests_total ${metrics.http.requests_total}\n\n`;

    for (const [status, count] of Object.entries(metrics.http.requests_by_status)) {
      output += `admin_http_requests_by_status{status="${status}"} ${count}\n`;
    }
    output += '\n';

    // POI metrics
    output += `# TYPE admin_pois_total gauge\n`;
    output += `admin_pois_total ${metrics.pois.total_count}\n\n`;

    output += `# TYPE admin_pois_created_total counter\n`;
    output += `admin_pois_created_total ${metrics.pois.created_total}\n\n`;

    output += `# TYPE admin_pois_updated_total counter\n`;
    output += `admin_pois_updated_total ${metrics.pois.updated_total}\n\n`;

    output += `# TYPE admin_pois_deleted_total counter\n`;
    output += `admin_pois_deleted_total ${metrics.pois.deleted_total}\n\n`;

    // User metrics
    output += `# TYPE admin_logins_total counter\n`;
    output += `admin_logins_total ${metrics.users.login_total}\n\n`;

    output += `# TYPE admin_login_failures_total counter\n`;
    output += `admin_login_failures_total ${metrics.users.login_failures}\n\n`;

    output += `# TYPE admin_active_sessions gauge\n`;
    output += `admin_active_sessions ${metrics.users.active_sessions}\n\n`;

    // Upload metrics
    output += `# TYPE admin_uploads_total counter\n`;
    output += `admin_uploads_total ${metrics.uploads.total}\n\n`;

    output += `# TYPE admin_uploads_bytes_total counter\n`;
    output += `admin_uploads_bytes_total ${metrics.uploads.total_size_bytes}\n\n`;

    // Cache metrics
    output += `# TYPE admin_cache_hits_total counter\n`;
    output += `admin_cache_hits_total ${metrics.cache.hits}\n\n`;

    output += `# TYPE admin_cache_misses_total counter\n`;
    output += `admin_cache_misses_total ${metrics.cache.misses}\n\n`;

    // Database metrics
    output += `# TYPE admin_database_queries_total counter\n`;
    output += `admin_database_queries_total ${metrics.database.queries_total}\n\n`;

    output += `# TYPE admin_database_errors_total counter\n`;
    output += `admin_database_errors_total ${metrics.database.query_errors}\n\n`;

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
    logger.info('Admin metrics reset');
  }
}

// Export singleton instance
const metricsService = new MetricsService();
export default metricsService;
