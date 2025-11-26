# Performance & Load Testing Suite

Enterprise-grade load testing for capacity planning and performance validation.

## Quick Start

### Install k6

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6
```

### Run Tests

```bash
# Smoke test (quick validation)
k6 run load-test.js

# Load test (normal traffic simulation)
k6 run -e TEST_TYPE=load load-test.js

# Stress test (find breaking point)
k6 run -e TEST_TYPE=stress load-test.js

# Spike test (sudden traffic surge)
k6 run -e TEST_TYPE=spike load-test.js

# Custom configuration
k6 run -e TEST_TYPE=load -e API_BASE_URL=https://api.example.com load-test.js
```

## Test Types

### 🚬 Smoke Test (Default)
**Purpose**: Quick validation that system works
**Duration**: 1 minute
**Load**: 2 concurrent users
**Use Case**: After deployments, code changes

```bash
k6 run load-test.js
```

**Success Criteria**:
- ✅ p95 latency < 1000ms
- ✅ Error rate < 1%

---

### 📈 Load Test
**Purpose**: Normal expected traffic simulation
**Duration**: 16 minutes
**Load**: Ramp 0 → 20 → 50 users
**Use Case**: Capacity planning, baseline performance

```bash
k6 run -e TEST_TYPE=load load-test.js
```

**Success Criteria**:
- ✅ p95 latency < 800ms
- ✅ Error rate < 5%

**Load Pattern**:
```
Users
  50 ┤     ┌─────────┐
  40 ┤     │         │
  30 ┤     │         │
  20 ┤ ┌───┘         └──┐
  10 ┤ │                │
   0 └─┘                └──
     0  2  5  7  12 14  16 min
```

---

### 💪 Stress Test
**Purpose**: Find system breaking point
**Duration**: 26 minutes
**Load**: Ramp 0 → 50 → 100 → 200 users
**Use Case**: Capacity limits, bottleneck identification

```bash
k6 run -e TEST_TYPE=stress load-test.js
```

**Success Criteria**:
- ✅ p95 latency < 2000ms (degraded but functional)
- ✅ Error rate < 10%

**Load Pattern**:
```
Users
 200 ┤           ┌───────┐
 150 ┤           │       │
 100 ┤       ┌───┘       │
  50 ┤   ┌───┘           │
   0 └───┘               └─────
     0   5   10   15   20   26 min
```

---

### ⚡ Spike Test
**Purpose**: Sudden traffic surge handling
**Duration**: 6.5 minutes
**Load**: 20 → 200 → 20 users (rapid spike)
**Use Case**: Black Friday, viral events, DDoS resilience

```bash
k6 run -e TEST_TYPE=spike load-test.js
```

**Success Criteria**:
- ✅ p95 latency < 3000ms
- ✅ Error rate < 15%
- ✅ System recovers after spike

**Load Pattern**:
```
Users
 200 ┤   ┌───────┐
 150 ┤   │       │
 100 ┤   │       │
  50 ┤ ──┘       └──
   0 └─────────────────
     0 1 2 3 4 5 6.5 min
       SPIKE!
```

## Metrics Collected

### HTTP Metrics
- **http_req_duration**: Request latency (p50, p95, p99)
- **http_req_failed**: Error rate (%)
- **http_reqs**: Total requests
- **data_received**: Data transfer (MB)

### Custom Metrics
- **cache_hit_rate**: Cache effectiveness (%)
- **db_query_duration**: Database performance (ms)
- **classification_duration**: AI classification speed (ms)
- **error_rate**: Application errors (%)

## Interpreting Results

### Excellent Performance ✅
```
http_req_duration............: avg=250ms p95=500ms p99=800ms
http_req_failed..............: 0.5%
cache_hit_rate...............: 85%
```
- ✅ p95 < 500ms
- ✅ Error rate < 1%
- ✅ Cache hit rate > 80%

### Good Performance ✅
```
http_req_duration............: avg=400ms p95=900ms p99=1200ms
http_req_failed..............: 3%
cache_hit_rate...............: 70%
```
- ✅ p95 < 1000ms
- ✅ Error rate < 5%
- ✅ Cache hit rate > 60%

### Acceptable Performance ⚠️
```
http_req_duration............: avg=800ms p95=1800ms p99=2500ms
http_req_failed..............: 8%
cache_hit_rate...............: 50%
```
- ⚠️ p95 < 2000ms
- ⚠️ Error rate < 10%
- ⚠️ System functional but degraded

### Poor Performance ❌
```
http_req_duration............: avg=2000ms p95=5000ms p99=10000ms
http_req_failed..............: 20%
cache_hit_rate...............: 30%
```
- ❌ p95 > 2000ms
- ❌ Error rate > 10%
- ❌ Optimization needed immediately

## Test Endpoints

The load test exercises these endpoints:

1. **Health Check** - `GET /health`
2. **Tier List** - `GET /api/v1/poi-classification/tier/:tier?city=X`
3. **Statistics** - `GET /api/v1/poi-classification/stats?city=X`
4. **Update Queue** - `GET /api/v1/poi-classification/due-for-update`
5. **Weather Recommendations** - `GET /api/v1/poi-classification/recommendations/weather`
6. **Metrics** - `GET /metrics` (10% of requests)

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/performance-test.yml
name: Performance Tests
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke test
        run: k6 run performance-tests/load-test.js
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: summary.json
```

## Continuous Monitoring

### Grafana + InfluxDB

Stream k6 results to Grafana for real-time monitoring:

```bash
# Start InfluxDB
docker run -d -p 8086:8086 influxdb:1.8

# Run test with output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

### Prometheus + Grafana

Use k6 Prometheus exporter:

```bash
# Run test with Prometheus output
k6 run --out experimental-prometheus-rw load-test.js
```

## Troubleshooting

### High Latency

**Symptoms**: p95 > 1000ms

**Diagnosis**:
```bash
# Check database query performance
mysql> SELECT * FROM sys.statement_analysis WHERE query LIKE '%pois%' ORDER BY total_latency DESC LIMIT 10;

# Check cache hit rate
grep "Cache hit" logs/combined-*.log | wc -l
grep "Cache miss" logs/combined-*.log | wc -l

# Check circuit breaker states
curl http://localhost:3001/metrics | grep circuit_breaker_state
```

**Solutions**:
1. Add composite database indexes (see `database/migrations/`)
2. Increase cache TTL for frequently accessed data
3. Add Redis connection pooling
4. Scale horizontally (add more instances)

### High Error Rate

**Symptoms**: error_rate > 5%

**Diagnosis**:
```bash
# Check error logs
grep "ERROR" logs/error-*.log | tail -n 50

# Check circuit breaker status
curl http://localhost:3001/metrics | grep circuit_breaker

# Check rate limiting
grep "429" logs/combined-*.log | wc -l
```

**Solutions**:
1. Review circuit breaker configuration
2. Adjust rate limits
3. Check external API availability (Apify, Google Places)
4. Increase database connection pool

### Low Cache Hit Rate

**Symptoms**: cache_hit_rate < 60%

**Diagnosis**:
```bash
# Check Redis memory
redis-cli INFO memory

# Check cache operations
curl http://localhost:3001/metrics | grep cache_operations
```

**Solutions**:
1. Increase cache TTL
2. Warm up cache on startup
3. Add cache prefetching for popular queries
4. Increase Redis max memory

## Performance Benchmarks

### Expected Performance (100K POIs, 8GB RAM, 4 CPU)

| Test Type | Max VUs | p95 Latency | Error Rate | Throughput |
|-----------|---------|-------------|------------|------------|
| Smoke | 2 | 200ms | 0% | 10 req/s |
| Load | 50 | 600ms | 2% | 80 req/s |
| Stress | 200 | 1800ms | 8% | 150 req/s |
| Spike | 200 | 2500ms | 12% | 120 req/s |

### Enterprise Targets (Production)

| Metric | Target | Excellent | Good | Acceptable |
|--------|--------|-----------|------|------------|
| p95 Latency | < 500ms | < 300ms | < 800ms | < 2000ms |
| p99 Latency | < 1000ms | < 500ms | < 1200ms | < 3000ms |
| Error Rate | < 1% | < 0.5% | < 5% | < 10% |
| Cache Hit Rate | > 80% | > 90% | > 70% | > 50% |
| Throughput | > 100 req/s | > 200 req/s | > 80 req/s | > 50 req/s |

## Next Steps

1. **Baseline**: Run smoke test after deployment
2. **Weekly**: Run load test to track performance trends
3. **Monthly**: Run stress test to verify capacity
4. **Before Events**: Run spike test for Black Friday, campaigns

---

**💡 Pro Tip**: Run tests from multiple regions to test geographic latency and CDN effectiveness.
