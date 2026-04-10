/**
 * Load Testing Suite with k6
 * ENTERPRISE: Performance validation and capacity planning
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 *   macOS: brew install k6
 *   Linux: sudo apt-get install k6
 *
 * Run tests:
 *   k6 run load-test.js                    # Default (smoke test)
 *   k6 run -e TEST_TYPE=load load-test.js  # Load test
 *   k6 run -e TEST_TYPE=stress load-test.js # Stress test
 *   k6 run -e TEST_TYPE=spike load-test.js  # Spike test
 *
 * Environment variables:
 *   API_BASE_URL: Target API (default: http://localhost:3001)
 *   TEST_TYPE: smoke | load | stress | spike (default: smoke)
 *   DURATION: Test duration (default: varies by test type)
 *   VUS: Virtual users (default: varies by test type)
 *
 * Metrics collected:
 *   - HTTP request duration (p50, p95, p99)
 *   - Request rate (requests/second)
 *   - Error rate (%)
 *   - Data transfer (MB/s)
 *   - Custom: Cache hit rate, DB query time
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';
const TEST_TYPE = __ENV.TEST_TYPE || 'smoke';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const dbQueryDuration = new Trend('db_query_duration');
const classificationDuration = new Trend('classification_duration');
const errorRate = new Rate('error_rate');
const requestDuration = new Trend('request_duration');

// Test scenarios configuration
const scenarios = {
  // Smoke test: Minimal load to verify system works
  smoke: {
    executor: 'constant-vus',
    vus: 2,
    duration: '1m',
    thresholds: {
      http_req_duration: ['p95<1000'], // 95% of requests < 1s
      http_req_failed: ['rate<0.01'], // Error rate < 1%
    },
  },

  // Load test: Normal expected load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 }, // Ramp up to 20 users
      { duration: '5m', target: 20 }, // Stay at 20 users
      { duration: '2m', target: 50 }, // Ramp up to 50 users
      { duration: '5m', target: 50 }, // Stay at 50 users
      { duration: '2m', target: 0 }, // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p95<800'], // 95% < 800ms
      http_req_failed: ['rate<0.05'], // Error rate < 5%
    },
  },

  // Stress test: Find breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 }, // Ramp to 50
      { duration: '5m', target: 50 }, // Hold 50
      { duration: '2m', target: 100 }, // Ramp to 100
      { duration: '5m', target: 100 }, // Hold 100
      { duration: '2m', target: 200 }, // Ramp to 200
      { duration: '5m', target: 200 }, // Hold 200
      { duration: '5m', target: 0 }, // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p95<2000'], // 95% < 2s (degraded but functional)
      http_req_failed: ['rate<0.1'], // Error rate < 10%
    },
  },

  // Spike test: Sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 }, // Baseline
      { duration: '30s', target: 200 }, // SPIKE!
      { duration: '3m', target: 200 }, // Hold spike
      { duration: '1m', target: 20 }, // Return to baseline
      { duration: '1m', target: 0 }, // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p95<3000'], // 95% < 3s (degraded)
      http_req_failed: ['rate<0.15'], // Error rate < 15%
    },
  },
};

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

export const options = scenarios[TEST_TYPE];

// ============================================================================
// TEST DATA
// ============================================================================

const cities = ['Valencia', 'Amsterdam', 'Barcelona', 'Rotterdam', 'Madrid'];
const categories = [
  'food_drinks',
  'museum',
  'beach',
  'historical',
  'activities',
];
const tiers = [1, 2, 3, 4];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function measureRequest(name, fn) {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;

  requestDuration.add(duration);

  check(result, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: has body`]: (r) => r.body.length > 0,
  });

  errorRate.add(result.status !== 200 ? 1 : 0);

  return result;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export default function () {
  const baseURL = API_BASE_URL;

  // Test 1: Health check (lightweight)
  measureRequest('health', () => http.get(`${baseURL}/health`));

  sleep(0.5);

  // Test 2: Get POIs by tier (most common query)
  const tier = randomItem(tiers);
  const city = randomItem(cities);

  const tierResponse = measureRequest('tier-list', () =>
    http.get(`${baseURL}/api/v1/poi-classification/tier/${tier}?city=${city}`)
  );

  // Check for cache hit header
  if (tierResponse.headers['X-Cache-Hit']) {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }

  sleep(1);

  // Test 3: Get POI statistics
  measureRequest('stats', () =>
    http.get(`${baseURL}/api/v1/poi-classification/stats?city=${city}`)
  );

  sleep(0.5);

  // Test 4: Get POIs due for update (admin endpoint)
  measureRequest('due-for-update', () =>
    http.get(
      `${baseURL}/api/v1/poi-classification/due-for-update?tier=${tier}&limit=50`
    )
  );

  sleep(1);

  // Test 5: Weather recommendations
  const weather = randomItem(['sunny', 'rainy', 'cloudy']);
  measureRequest('weather-recommendations', () =>
    http.get(
      `${baseURL}/api/v1/poi-classification/recommendations/weather?city=${city}&weather=${weather}`
    )
  );

  sleep(0.5);

  // Test 6: Metrics endpoint (Prometheus scraping simulation)
  if (Math.random() < 0.1) {
    // 10% of requests check metrics
    measureRequest('metrics', () => http.get(`${baseURL}/metrics`));
  }

  sleep(1);
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  K6 LOAD TEST STARTING                     ║
╠════════════════════════════════════════════════════════════╣
║ Target:     ${API_BASE_URL.padEnd(45)}║
║ Test Type:  ${TEST_TYPE.toUpperCase().padEnd(45)}║
║ Duration:   ${(options.duration || 'varies').padEnd(45)}║
║ Max VUs:    ${(options.vus || options.stages?.[0]?.target || 'varies').toString().padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Warmup: Send a few requests to warm up caches
  console.log('Warming up caches...');
  for (let i = 0; i < 5; i++) {
    http.get(`${API_BASE_URL}/health`);
    http.get(`${API_BASE_URL}/api/v1/poi-classification/tier/1?city=Valencia`);
  }

  console.log('Cache warmup complete. Starting load test...\n');
}

export function handleSummary(data) {
  const summary = {
    test_type: TEST_TYPE,
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    metrics: {
      http_reqs: data.metrics.http_reqs.values.count,
      http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration.values['p(99)'],
      http_req_failed_rate:
        (data.metrics.http_req_failed.values.rate * 100).toFixed(2) + '%',
      vus_max: data.metrics.vus_max.values.max,
      data_received_mb: (
        data.metrics.data_received.values.count /
        1024 /
        1024
      ).toFixed(2),
    },
  };

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   LOAD TEST SUMMARY                        ║
╠════════════════════════════════════════════════════════════╣
║ Total Requests:    ${summary.metrics.http_reqs.toString().padEnd(35)}║
║ p95 Duration:      ${summary.metrics.http_req_duration_p95.toFixed(2)}ms${' '.padEnd(31)}║
║ p99 Duration:      ${summary.metrics.http_req_duration_p99.toFixed(2)}ms${' '.padEnd(31)}║
║ Error Rate:        ${summary.metrics.http_req_failed_rate.padEnd(35)}║
║ Max VUs:           ${summary.metrics.vus_max.toString().padEnd(35)}║
║ Data Received:     ${summary.metrics.data_received_mb} MB${' '.padEnd(31)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Assessment
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate * 100;

  console.log('\nPerformance Assessment:');

  if (p95 < 500 && errorRate < 1) {
    console.log('✅ EXCELLENT - System performing optimally');
  } else if (p95 < 1000 && errorRate < 5) {
    console.log('✅ GOOD - System performing well');
  } else if (p95 < 2000 && errorRate < 10) {
    console.log('⚠️  ACCEPTABLE - System under stress but functional');
  } else {
    console.log(
      '❌ POOR - System struggling, optimization needed'
    );
  }

  console.log('\nRecommendations:');
  if (p95 > 1000) {
    console.log('  - Consider adding more cache layers');
    console.log('  - Review database query performance');
    console.log('  - Check if composite indexes are being used');
  }
  if (errorRate > 5) {
    console.log('  - Investigate error logs');
    console.log('  - Check circuit breaker states');
    console.log('  - Review rate limiting configuration');
  }

  console.log('\n');

  return {
    'summary.json': JSON.stringify(summary, null, 2),
    stdout: '', // k6 will still print default summary
  };
}
