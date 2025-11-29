# 🚀 Deployment Guide - POI Image Enhancement System

## Quick Start Deployment (Production Ready)

### Prerequisites Checklist

- [x] Node.js 18+ installed
- [x] MySQL/MariaDB database (Hetzner)
- [x] Redis instance
- [x] Apify account with active subscription
- [x] API keys ready (Apify, Flickr, Unsplash)

---

## Step 1: Environment Configuration

### Create `.env` File

```bash
cd platform-core
cp ../env-example.sh .env
```

### Configure Critical Variables

```bash
# ==============================================
# APIFY CONFIGURATION (REQUIRED FOR GOOGLE PLACES)
# ==============================================
# Your Apify API Token (get from env-example.sh or Apify console)
APIFY_API_TOKEN=your_apify_token_here

# Google Maps Scraper Actor
APIFY_ACTOR_ID=compass/crawler-google-places

# Monthly budget tracking (EUR)
APIFY_MONTHLY_BUDGET_EUR=50

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DB_HOST=your-hetzner-host.com
DB_PORT=3306
DB_NAME=holidaibutler
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Connection pool
DB_POOL_MIN=5
DB_POOL_MAX=20

# ==============================================
# REDIS CONFIGURATION
# ==============================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_TTL=3600

# ==============================================
# IMAGE API KEYS (OPTIONAL BUT RECOMMENDED)
# ==============================================
# Flickr API (Free tier: 3,600 requests/hour)
FLICKR_API_KEY=your_flickr_api_key
FLICKR_API_SECRET=your_flickr_api_secret

# Unsplash API (Free tier: 50 requests/hour)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key

# ==============================================
# IMAGE ENHANCEMENT SETTINGS
# ==============================================
# Enable automated image discovery cron jobs
ENABLE_IMAGE_CRON=true

# Quality thresholds
IMAGE_MIN_QUALITY_SCORE=6.0
IMAGE_AUTO_APPROVE_THRESHOLD=8.0
IMAGE_MAX_GEO_DISTANCE=500
IMAGE_MIN_RESOLUTION_WIDTH=1280
IMAGE_MIN_RESOLUTION_HEIGHT=720

# ==============================================
# SECURITY
# ==============================================
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
NODE_ENV=production
LOG_LEVEL=info

# ==============================================
# MONITORING (OPTIONAL)
# ==============================================
SENTRY_DSN=your_sentry_dsn_here
ENABLE_METRICS=true
```

---

## Step 2: Apify Setup & Verification

### Verify Apify Configuration

The system uses your existing Apify Google Maps Scraper to fetch POI images with ZERO additional cost.

**Actor Details:**
- **Name:** Google Maps Scraper
- **Actor ID:** `compass/crawler-google-places`
- **Your API Token:** See `env-example.sh` for production token

### Test Apify Connection

```bash
# Quick test script (uses APIFY_API_TOKEN from .env)
node -e "
import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'compass/crawler-google-places';

axios.get(\`https://api.apify.com/v2/acts/\${ACTOR_ID}\`, {
  params: { token: APIFY_TOKEN }
})
.then(res => console.log('✅ Apify connection OK:', res.data.data.name))
.catch(err => console.error('❌ Apify connection failed:', err.message));
"
```

**Expected Output:**
```
✅ Apify connection OK: Google Maps Scraper
```

### How the Apify Integration Works

```javascript
// The system reuses your existing Apify scraping data
// NO additional API calls = NO additional cost

1. You already scrape POI data via Apify
2. Google Maps Scraper includes imageUrls array (10-50 photos)
3. Our system analyzes these photos intelligently
4. Selects best quality image automatically
5. Cost: $0 (reuses existing scraping)
```

### Apify Actor Configuration

If you need to adjust scraping settings:

```javascript
// Default Apify run parameters (in googlePlacesImages.js)
{
  startUrls: [{
    url: `https://www.google.com/maps/place/?q=place_id:${google_place_id}`
  }],
  maxImages: 50,           // Fetch up to 50 images per POI
  includeImages: true,     // CRITICAL: Must be true
  scrapePhotos: true,      // CRITICAL: Must be true
  language: 'en'
}
```

**⚠️ IMPORTANT:** Ensure your Apify scraper has `includeImages: true` and `scrapePhotos: true`

---

## Step 3: Database Migration

### Run POI Images Schema Migration

```bash
# Connect to your Hetzner MySQL database
mysql -h your-hetzner-host.com -u your_db_user -p holidaibutler

# Run migration
source platform-core/database/migrations/002_poi_images_schema.sql
```

**Expected Output:**
```sql
Query OK, 0 rows affected (0.15 sec)
...
Migration 002: POI Images Enhancement System - COMPLETED
poi_count: 15432
image_sources: 5
```

### Verify Tables Created

```sql
SHOW TABLES LIKE 'poi_%';

-- Expected tables:
-- poi_images
-- poi_image_queue
-- poi_image_sources
-- poi_image_moderation_log
```

---

## Step 4: Install Dependencies

```bash
cd platform-core

# Install all dependencies (includes Sharp.js for image analysis)
npm install

# Verify critical packages
npm list sharp         # Computer vision library
npm list joi           # Validation
npm list validator     # Input sanitization
npm list @sentry/node  # Error tracking
```

**Expected Output:**
```
@holidaibutler/platform-core@2.0.0
├── sharp@0.33.1
├── joi@17.11.0
├── validator@13.11.0
└── @sentry/node@7.91.0
```

---

## Step 5: Configuration Validation

### Run Built-in Validation

```bash
# Validate all environment variables and connections
node src/scripts/validateConfig.js
```

**Expected Output:**
```
🔍 Validating Configuration...

✅ Environment variables: OK
✅ Database connection: OK (Hetzner MySQL)
✅ Redis connection: OK
✅ Apify API: OK (Actor: compass/crawler-google-places)
✅ Flickr API: OK (Optional - configured)
✅ Unsplash API: OK (Optional - configured)

🎉 All validations passed! System ready for deployment.
```

### Manual Configuration Test

```bash
# Test Google Places image fetching
node -e "
import GooglePlacesImageService from './src/services/googlePlacesImages.js';

const service = new GooglePlacesImageService();
console.log('Service status:', service.getStatus());
"
```

---

## Step 6: Test Run (Single POI)

### Fetch Test POI

```sql
-- Get a test POI with google_place_id
SELECT id, name, google_place_id, latitude, longitude
FROM pois
WHERE google_place_id IS NOT NULL
LIMIT 1;
```

### Run Intelligent Image Selection

```bash
# Replace {POI_UUID} with actual UUID from above
curl -X POST http://localhost:3000/api/poi-images/discover/{POI_UUID} \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["google_places"],
    "intelligentGooglePlaces": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "discovered": 23,
    "saved": 1,
    "images": [{
      "id": "...",
      "source": "google_places",
      "total_score": 8.9,
      "resolution_score": 9,
      "sharpness_score": 8.7,
      "exposure_score": 9.2,
      "quality_metadata": {
        "width": 2560,
        "height": 1440,
        "format": "jpeg"
      }
    }]
  }
}
```

---

## Step 7: Batch Processing Setup

### Add POIs to Queue

```bash
# Add Tier 1 & 2 POIs (high priority) to queue
curl -X POST http://localhost:3000/api/poi-images/queue/add \
  -H "Content-Type: application/json" \
  -d '{
    "tiers": [1, 2],
    "maxPOIs": 100,
    "forceReprocess": false
  }'
```

### Process Queue

```bash
# Start queue processor
curl -X POST http://localhost:3000/api/poi-images/queue/process \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10
  }'
```

### Monitor Progress

```bash
# Check queue status
watch -n 5 'curl -s http://localhost:3000/api/poi-images/stats/overview | jq'
```

---

## Step 8: Enable Automated Cron Jobs

### Update Environment Variable

```bash
# In .env file
ENABLE_IMAGE_CRON=true
```

### Restart Application

```bash
# Restart Node.js application
pm2 restart holidaibutler-platform-core

# Or with systemd
systemctl restart holidaibutler-platform-core
```

### Verify Cron Jobs Active

```bash
# Check logs
tail -f logs/image-discovery-cron.log

# Expected output:
# Image Discovery Cron Scheduler started
# Tasks: daily, weekly, monthly, queue_processor, cleanup
```

### Cron Schedule

```
Daily (2:00 AM):    Tier 1 & 2 POIs (top attractions)
Weekly (Mon 3 AM):  Tier 3 POIs (popular)
Monthly (1st 4 AM): Tier 4 POIs (long-tail)
Every 5 minutes:    Queue processor
Weekly (Sun 5 AM):  Cleanup old entries
```

---

## Step 9: Monitoring Setup

### Health Checks

```bash
# Liveness probe (K8s)
curl http://localhost:3000/health/liveness

# Readiness probe (K8s)
curl http://localhost:3000/health/readiness

# Detailed health with dependencies
curl http://localhost:3000/health/detailed

# Circuit breaker status
curl http://localhost:3000/health/circuit-breakers
```

### Prometheus Metrics (Optional)

```bash
# Expose metrics endpoint
curl http://localhost:3000/health/metrics

# Expected output (Prometheus format):
# holidaibutler_uptime_seconds 3600
# holidaibutler_memory_usage_bytes{type="rss"} 145678900
# holidaibutler_circuit_breaker_state{circuit="flickr"} 0
```

---

## Step 10: Production Deployment

### PM2 Process Manager (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/index.js --name holidaibutler-platform-core

# Enable auto-restart on boot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Systemd Service (Alternative)

```bash
# Create service file
sudo nano /etc/systemd/system/holidaibutler-platform-core.service
```

```ini
[Unit]
Description=HolidaiButler Platform Core
After=network.target mysql.service redis.service

[Service]
Type=simple
User=holidaibutler
WorkingDirectory=/home/holidaibutler/platform-core
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable holidaibutler-platform-core
sudo systemctl start holidaibutler-platform-core

# Check status
sudo systemctl status holidaibutler-platform-core
```

---

## Step 11: Verify Deployment

### System Check

```bash
# Run comprehensive system check
node src/scripts/systemCheck.js
```

**Expected Output:**
```
🔍 HolidaiButler Platform Core - System Check

✅ Node.js version: 18.17.0
✅ Environment: production
✅ Database: Connected (Hetzner MySQL)
✅ Redis: Connected
✅ Apify: Configured (compass/crawler-google-places)
✅ Google Places Service: Active
✅ Circuit breakers: All closed (healthy)
✅ Cron jobs: Active (5 jobs running)
✅ Queue: 0 pending, 0 processing

📊 Statistics:
- POIs in database: 15,432
- Images processed: 1,234
- Average quality score: 8.3/10
- Auto-approval rate: 82%

🎉 System is HEALTHY and ready for production!
```

### Performance Test

```bash
# Test 10 POIs processing time
time node src/jobs/poiImageDiscovery.js --max=10

# Expected: ~60 seconds for 10 POIs
```

---

## Troubleshooting

### Issue: "APIFY_API_TOKEN not configured"

**Solution:**
```bash
# Verify .env file exists and has token
grep APIFY_API_TOKEN .env

# Should show:
APIFY_API_TOKEN=your_production_token_here
```

### Issue: "Actor not found"

**Solution:**
```bash
# Verify actor ID in .env
grep APIFY_ACTOR_ID .env

# Should show:
APIFY_ACTOR_ID=compass/crawler-google-places

# Test actor access (use your token from .env)
curl "https://api.apify.com/v2/acts/compass~crawler-google-places?token=${APIFY_API_TOKEN}"
```

### Issue: "No images found"

**Diagnosis:**
```sql
-- Check if POI has google_place_id
SELECT id, name, google_place_id
FROM pois
WHERE id = 'your-poi-uuid';
```

**Solution:**
- Ensure POI has valid `google_place_id`
- Verify Apify scraper includes `imageUrls` in response
- Check Apify scraper settings: `includeImages: true`

### Issue: "Circuit breaker OPEN"

**Diagnosis:**
```bash
curl http://localhost:3000/health/circuit-breakers
```

**Solution:**
- Wait 60 seconds for automatic recovery
- Check Apify API status
- Review error logs: `tail -f logs/google-places-images.log`

---

## Maintenance

### Daily Checks

```bash
# Check system health
curl http://localhost:3000/health/detailed | jq '.status'

# Review error logs
tail -n 100 logs/error.log
```

### Weekly Tasks

```bash
# Review queue statistics
node src/jobs/poiImageDiscovery.js stats

# Clean up old queue entries
node src/jobs/poiImageDiscovery.js cleanup 30
```

### Monthly Review

```bash
# Generate quality report
node src/scripts/generateQualityReport.js

# Review API usage
curl http://localhost:3000/api/poi-images/stats/sources
```

---

## Performance Optimization

### Database Indexing

```sql
-- Verify critical indexes exist
SHOW INDEX FROM poi_images WHERE Key_name IN (
  'idx_poi_status',
  'idx_quality',
  'idx_source'
);

-- Add if missing
CREATE INDEX idx_poi_status ON poi_images(poi_id, status);
CREATE INDEX idx_quality ON poi_images(quality_score DESC);
```

### Redis Caching

```bash
# Enable Redis caching in .env
REDIS_TTL=3600  # 1 hour cache

# Monitor cache hit rate
redis-cli INFO stats | grep keyspace_hits
```

---

## Security Checklist

- [ ] API tokens stored in environment variables only
- [ ] Database credentials not in code
- [ ] JWT secret is strong (32+ characters)
- [ ] Rate limiting enabled on API endpoints
- [ ] Input validation active
- [ ] SQL injection prevention verified
- [ ] HTTPS enabled in production
- [ ] Firewall configured (MySQL, Redis ports)

---

## Support & Documentation

**Documentation:**
- Main guide: `docs/POI-IMAGE-ENHANCEMENT-GUIDE.md`
- Investment pitch: `docs/INVESTMENT-PITCH-POI-IMAGES.md`
- Testing guide: `docs/DEMO-TESTING-GUIDE.md`
- Enterprise improvements: `docs/ENTERPRISE-IMPROVEMENTS.md`

**Logs Location:**
- Application: `logs/platform-core.log`
- Image service: `logs/google-places-images.log`
- Aggregation: `logs/poi-image-aggregation.log`
- Cron jobs: `logs/image-discovery-cron.log`

**Monitoring Endpoints:**
- Health: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/health/metrics`
- Stats: `http://localhost:3000/api/poi-images/stats/overview`

---

## Success Criteria

✅ **System is production-ready when:**
- [ ] All health checks return 200 OK
- [ ] First 10 POIs processed successfully
- [ ] Average quality score ≥ 8.0
- [ ] Auto-approval rate ≥ 70%
- [ ] Cron jobs running without errors
- [ ] Circuit breakers all closed (healthy)
- [ ] No errors in logs for 24 hours

---

## Next Steps After Deployment

1. **Week 1:** Monitor first 1,000 POIs
2. **Week 2:** Scale to 10,000 POIs (full Calpe)
3. **Week 3:** Enable Flickr/Unsplash fallbacks
4. **Week 4:** Full Costa Blanca rollout (150K POIs)

---

*Deployment Guide Version 1.0 - Production Ready*
*Last Updated: November 2024*
