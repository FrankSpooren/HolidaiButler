# POI Image Enhancement - Setup Guide

Quick setup guide voor het POI Image Enhancement systeem.

## Overzicht

Dit systeem verbetert automatisch de kwaliteit van POI-afbeeldingen door gebruik te maken van Flickr en Unsplash APIs. Het systeem:

- Zoekt automatisch hoogwaardige images voor POI's
- Valideert images op basis van GPS-locatie, resolutie en relevantie
- Scoort images automatisch (0-10 scale)
- Keurt images automatisch goed bij score ≥8.0
- Beheert API rate limits en budgets

## Vereisten

1. **Database**: MySQL/MariaDB (Hetzner)
2. **Node.js**: v18+ met ES modules support
3. **API Keys**:
   - Flickr API Key (gratis, 3600 req/uur)
   - Unsplash Access Key (gratis, 50 req/uur)

## Stap 1: Database Setup

```bash
# Voer database migrations uit
mysql -h your-hetzner-host -u your-user -p your-database < platform-core/database/migrations/002_poi_images_schema.sql
```

Dit creëert de volgende tabellen:
- `poi_images` - Image storage
- `poi_image_queue` - Processing queue
- `poi_image_sources` - Source configuration
- `poi_image_moderation_log` - Audit log

## Stap 2: API Keys Verkrijgen

### Flickr API

1. Ga naar https://www.flickr.com/services/apps/create/
2. Kies "Apply for a Non-Commercial Key"
3. Vul applicatie details in
4. Kopieer API Key en Secret

### Unsplash API

1. Ga naar https://unsplash.com/oauth/applications
2. Klik "New Application"
3. Accepteer terms en vul app details in
4. Kopieer Access Key en Secret Key

## Stap 3: Environment Configuratie

Voeg toe aan je `.env` bestand:

```bash
# Flickr API
FLICKR_API_KEY=your_flickr_api_key_here
FLICKR_API_SECRET=your_flickr_api_secret_here

# Unsplash API
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
UNSPLASH_SECRET_KEY=your_unsplash_secret_key_here

# Enable cron jobs (set to true for production)
ENABLE_IMAGE_CRON=false

# Optional: Logging
LOG_LEVEL=info
```

## Stap 4: Dependencies Installeren

```bash
cd platform-core
npm install
```

Vereiste packages (worden automatisch geïnstalleerd):
- `axios` - HTTP requests
- `node-cron` - Cron job scheduler
- `winston` - Logging
- `sharp` - Image processing (optioneel)

## Stap 5: Test de Services

### Test Flickr Service

```javascript
import FlickrService from './src/services/flickr.js';

const flickr = new FlickrService();

// Test search
const photos = await flickr.searchByLocation({
  lat: 38.8403,
  lon: -0.0563,
  radius: 0.1,
  perPage: 5
});

console.log(`Found ${photos.length} photos`);
console.log('Rate limit:', flickr.getRateLimitStatus());
```

### Test Unsplash Service

```javascript
import UnsplashService from './src/services/unsplash.js';

const unsplash = new UnsplashService();

// Test search
const result = await unsplash.searchPhotos({
  query: 'Calpe Spain beach',
  perPage: 5
});

console.log(`Found ${result.total} photos`);
console.log('Rate limit:', unsplash.getRateLimitStatus());
```

## Stap 6: Image Discovery Uitvoeren

### Manueel (voor testing)

```bash
cd platform-core

# Discover images voor Tier 1 & 2 POIs
node src/jobs/poiImageDiscovery.js daily

# Process queue
node src/jobs/poiImageDiscovery.js queue 10

# View statistics
node src/jobs/poiImageDiscovery.js stats
```

### Via API

```bash
# Trigger discovery voor specifieke POI
curl -X POST http://localhost:3000/api/poi-images/discover/POI_UUID \
  -H "Content-Type: application/json" \
  -d '{"sources": ["flickr", "unsplash"], "maxImages": 10}'

# Add POIs to queue
curl -X POST http://localhost:3000/api/poi-images/queue/add \
  -H "Content-Type: application/json" \
  -d '{"tiers": [1,2], "maxPOIs": 100}'

# Process queue
curl -X POST http://localhost:3000/api/poi-images/queue/process \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
```

## Stap 7: Cron Jobs Activeren (Productie)

Update `.env`:

```bash
ENABLE_IMAGE_CRON=true
NODE_ENV=production
```

Cron schema:
- **Daily** (2:00 AM): Tier 1 & 2 POIs
- **Weekly** (Monday 3:00 AM): Tier 3 POIs
- **Monthly** (1st, 4:00 AM): Tier 4 POIs
- **Every 5 min**: Queue processor
- **Weekly** (Sunday 5:00 AM): Cleanup old entries

## API Endpoints

### Image Management

```
GET    /api/poi-images/poi/:poiId          # Get images voor POI
GET    /api/poi-images/:id                 # Get image details
GET    /api/poi-images/pending             # Images pending review
POST   /api/poi-images/:id/approve         # Approve image
POST   /api/poi-images/:id/reject          # Reject image
POST   /api/poi-images/:id/set-primary     # Set as primary
DELETE /api/poi-images/:id                 # Delete image
```

### Discovery & Queue

```
POST   /api/poi-images/discover/:poiId     # Trigger discovery
POST   /api/poi-images/queue/add           # Add to queue
POST   /api/poi-images/queue/process       # Process queue
GET    /api/poi-images/queue/stats         # Queue statistics
```

### Statistics

```
GET    /api/poi-images/stats/overview      # Overall stats
GET    /api/poi-images/stats/sources       # Source rate limits
```

## Monitoring

### View Logs

```bash
# Image aggregation logs
tail -f logs/poi-image-aggregation.log

# Flickr service logs
tail -f logs/flickr-service.log

# Unsplash service logs
tail -f logs/unsplash-service.log

# Cron job logs
tail -f logs/image-discovery-cron.log
```

### Check Rate Limits

```bash
curl http://localhost:3000/api/poi-images/stats/sources
```

Response:
```json
{
  "rateLimits": {
    "flickr": {
      "requestsInLastHour": 234,
      "remainingRequests": 3366,
      "percentUsed": "6.50"
    },
    "unsplash": {
      "requestsInLastHour": 12,
      "remainingRequests": 38,
      "percentUsed": "24.00"
    }
  }
}
```

### Database Statistics

```sql
-- Overall image stats
SELECT * FROM poi_images_summary LIMIT 10;

-- Queue status
SELECT * FROM poi_image_queue_status;

-- Source performance
SELECT
  source_type,
  COUNT(*) as total,
  AVG(quality_score) as avg_score,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
FROM poi_images
GROUP BY source_type;
```

## Quality Scoring

Images worden automatisch gescoord op basis van:

| Criteria | Weight | Description |
|----------|--------|-------------|
| Resolutie | 25% | Min 1280x720, optimaal 1920x1080+ |
| Geo Accuracy | 30% | GPS afstand tot POI (<50m = 10pt) |
| Tag Relevance | 25% | Match met POI naam/categorie |
| License Quality | 10% | CC0/Public Domain = 10pt |
| Recency | 10% | <1 jaar = 10pt, >10 jaar = 2pt |

**Auto-approval**: Score ≥8.0
**Manual review**: Score 6.0-7.9
**Rejected**: Score <6.0

## Troubleshooting

### "Flickr API key is required"

Controleer `.env` file:
```bash
grep FLICKR .env
```

### "Rate limit reached"

Wait of check current usage:
```bash
node -e "import('./src/services/flickr.js').then(m => console.log(new m.default().getRateLimitStatus()))"
```

### Geen images gevonden

1. Check POI heeft GPS coordinates:
   ```sql
   SELECT id, name, latitude, longitude FROM pois WHERE id = 'POI_UUID';
   ```

2. Test met grotere radius:
   ```javascript
   flickr.searchByLocation({ lat, lon, radius: 1.0 }) // 1km
   ```

3. Check API keys zijn geldig

### Images niet auto-approved

Check quality scores:
```sql
SELECT
  id,
  quality_score,
  resolution_score,
  geo_accuracy_score,
  tag_relevance_score
FROM poi_images
WHERE poi_id = 'POI_UUID'
ORDER BY quality_score DESC;
```

## Best Practices

1. **Start klein**: Test eerst met 10-20 POIs
2. **Monitor rate limits**: Check dashboard regelmatig
3. **Review pending images**: Auto-approval is niet 100%
4. **Backup database**: Voor migration
5. **Log monitoring**: Set up alerts voor errors

## Support

Voor vragen of issues:
- Check logs in `logs/` directory
- Review documentatie in `POI-IMAGE-ENHANCEMENT-GUIDE.md`
- Database schema in `database/migrations/002_poi_images_schema.sql`

## Next Steps

1. Test manueel met enkele POIs
2. Review resultaten in database
3. Adjust quality thresholds indien nodig
4. Enable cron jobs voor productie
5. Monitor performance en costs
