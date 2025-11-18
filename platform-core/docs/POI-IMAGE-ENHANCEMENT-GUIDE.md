# POI Image Enhancement Guide

## Overzicht

Dit document beschrijft het geautomatiseerde proces voor het verbeteren van POI-afbeeldingen in het HolidaiButler platform. Het systeem vervangt de huidige Google Places images met hoogwaardige, geverifieerde afbeeldingen van betrouwbare bronnen zoals Flickr en Unsplash.

## Probleemstelling

De huidige POI-afbeeldingen worden gevoed via Google Places (via Apify scraper: `compass/crawler-google-places`). Deze aanpak heeft meerdere beperkingen:

1. **Kwaliteitsproblemen**: Lage resolutie, slechte belichting, inconsistente fotografie
2. **Relevantie**: Afbeeldingen corresponderen niet altijd met de juiste POI
3. **Licenties**: Onduidelijke gebruiksrechten voor commercieel gebruik
4. **Consistentie**: Geen gestandaardiseerde fotostijl

## Oplossing: Multi-Source Image Aggregation

Het nieuwe systeem verzamelt automatisch hoogwaardige afbeeldingen van meerdere bronnen en valideert deze tegen POI-gegevens.

### Beschikbare Data per POI

Via de Hetzner MySQL database zijn de volgende gegevens beschikbaar:

```javascript
{
  id: "uuid",
  name: "POI naam",
  category: "restaurant|attraction|hotel|...",

  // Locatiegegevens
  latitude: 38.8403,
  longitude: -0.0563,
  address: "Straatnaam 123",
  city: "Calpe",
  region: "Valencia",
  country: "ES",

  // Externe IDs
  google_place_id: "ChIJ...",
  tripadvisor_id: "...",
  booking_com_id: "...",

  // Metadata
  tier: 1-4,
  poi_score: 0-10,
  verified: boolean
}
```

### Image Bronnen

#### 1. Flickr API
**Voordelen:**
- Geotagged images met GPS-coördinaten
- Creative Commons licenties beschikbaar
- Hoge resolutie beschikbaar
- Tags en metadata voor validatie
- Gratis API tier: 3600 requests/uur

**Zoekstrategie:**
```javascript
// Geo-radius search
lat=38.8403&lon=-0.0563&radius=0.1km&tags=restaurant

// Text + location search
text="Restaurant Name Calpe"&lat=38.8403&lon=-0.0563

// License filtering
license=4,5,7,8,9,10 // CC licenties
```

**API Endpoints:**
- `flickr.photos.search` - Zoek foto's op locatie/tags
- `flickr.photos.getSizes` - Verkrijg alle beschikbare resoluties
- `flickr.photos.getInfo` - Metadata, EXIF, licentie info
- `flickr.photos.geo.getLocation` - GPS coördinaten van foto

#### 2. Unsplash API
**Voordelen:**
- Professionele fotografie
- Gratis voor commercieel gebruik
- Consistent hoge kwaliteit
- Gratis tier: 50 requests/uur

**Zoekstrategie:**
```javascript
// Location-based search
query="Calpe Spain restaurant seafood"&orientation=landscape

// Category-specific
query="beach resort Valencia Spain"&per_page=30
```

**API Endpoints:**
- `GET /search/photos` - Zoek foto's
- `GET /photos/:id` - Foto details en resoluties

#### 3. Google Places Photos (Bestaand)
**Gebruik:**
- Fallback optie als geen andere bronnen beschikbaar
- Alleen voor niet-commerciële POI's (publieke gebouwen, landmarks)

### Image Quality Criteria

Elke afbeelding wordt beoordeeld op:

1. **Resolutie**: Minimaal 1920x1080px (Full HD)
2. **Aspect Ratio**: 16:9 of 4:3 bij voorkeur
3. **Geo-validatie**: Max 200m afstand tot POI coördinaten
4. **Relevantie**: Tag matching met POI categorie/naam
5. **Licentie**: Creative Commons of commercieel toegestaan
6. **Duplicaten**: Hash-based deduplicatie

### Quality Scoring Algoritme

```javascript
imageScore = (
  resolutionScore * 0.25 +      // 0-10 points
  geoAccuracy * 0.30 +           // 0-10 points
  tagRelevance * 0.25 +          // 0-10 points
  licenseQuality * 0.10 +        // 0-10 points
  recency * 0.10                 // 0-10 points
)

// Minimale acceptance: imageScore >= 6.0
```

**Resolutie Score:**
```javascript
if (width >= 3840 && height >= 2160) return 10; // 4K
if (width >= 2560 && height >= 1440) return 9;  // 2K
if (width >= 1920 && height >= 1080) return 8;  // Full HD
if (width >= 1280 && height >= 720) return 6;   // HD
return 0; // Rejected
```

**Geo Accuracy:**
```javascript
distance = haversineDistance(photoLat, photoLon, poiLat, poiLon)
if (distance <= 50m) return 10;
if (distance <= 100m) return 8;
if (distance <= 200m) return 6;
if (distance <= 500m) return 3;
return 0; // Rejected
```

**Tag Relevance:**
```javascript
poiKeywords = extractKeywords(poi.name, poi.category, poi.description)
photoTags = photo.tags.map(t => t.toLowerCase())
matchCount = intersection(poiKeywords, photoTags).length
return Math.min(10, matchCount * 2)
```

## Database Schema

### Nieuwe Tabel: `poi_images`

```sql
CREATE TABLE poi_images (
  id VARCHAR(36) PRIMARY KEY,
  poi_id VARCHAR(36) NOT NULL,

  -- Image gegevens
  source_type ENUM('flickr', 'unsplash', 'google_places', 'manual') NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL,

  -- Resoluties
  url_original TEXT,
  url_large TEXT NOT NULL,      -- 1920x1080+
  url_medium TEXT,               -- 1280x720
  url_thumbnail TEXT,            -- 400x300

  -- Metadata
  width INT NOT NULL,
  height INT NOT NULL,
  file_size INT,                 -- Bytes
  mime_type VARCHAR(50),

  -- Attribution
  author_name VARCHAR(255),
  author_url TEXT,
  license_type VARCHAR(100),     -- 'CC-BY', 'CC-BY-SA', 'Unsplash License', etc.
  license_url TEXT,

  -- Geo-validatie
  photo_latitude DECIMAL(10, 8),
  photo_longitude DECIMAL(11, 8),
  distance_to_poi DECIMAL(10, 2), -- Meters

  -- Quality metrics
  quality_score DECIMAL(3, 2),    -- 0.00 - 10.00
  resolution_score INT,           -- 0-10
  geo_accuracy_score INT,         -- 0-10
  tag_relevance_score INT,        -- 0-10

  -- Image type
  image_type ENUM('exterior', 'interior', 'food', 'view', 'amenity', 'event', 'people', 'logo') DEFAULT 'exterior',
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,

  -- Status
  status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
  verified_by VARCHAR(36),       -- Admin user ID
  verified_at TIMESTAMP NULL,

  -- Tags en beschrijving
  tags JSON,                      -- Array van tags
  caption TEXT,
  alt_text VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
  INDEX idx_poi_status (poi_id, status),
  INDEX idx_quality (quality_score DESC),
  INDEX idx_source (source_type, source_id),
  UNIQUE KEY unique_source (source_type, source_id, poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Tabel: `poi_image_queue`

Voor batch processing van image discovery:

```sql
CREATE TABLE poi_image_queue (
  id VARCHAR(36) PRIMARY KEY,
  poi_id VARCHAR(36) NOT NULL,

  -- Queue status
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  priority INT DEFAULT 5,         -- 1-10, based on POI tier

  -- Processing info
  sources_to_check JSON,          -- ['flickr', 'unsplash']
  images_found INT DEFAULT 0,
  images_approved INT DEFAULT 0,

  -- Error handling
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  next_retry_at TIMESTAMP NULL,

  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
  INDEX idx_status_priority (status, priority DESC),
  INDEX idx_next_retry (next_retry_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Update `api_usage_log`

Voeg image API tracking toe:

```sql
ALTER TABLE api_usage_log
ADD COLUMN api_type ENUM('apify', 'google_places', 'tripadvisor', 'booking', 'flickr', 'unsplash')
AFTER id;
```

## Automation Workflow

### 1. Image Discovery Proces

```
┌─────────────────┐
│  POI Database   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Selecteer POI's voor       │
│  image enhancement          │
│  (tier-based prioriteit)    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Voeg toe aan               │
│  poi_image_queue            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Image Aggregation Service  │
│  ┌─────────────────────┐   │
│  │ 1. Flickr Search    │   │
│  │ 2. Unsplash Search  │   │
│  │ 3. Quality Check    │   │
│  │ 4. Geo Validation   │   │
│  │ 5. Deduplication    │   │
│  └─────────────────────┘   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Store in poi_images        │
│  (status = 'pending')       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Auto-approve if            │
│  quality_score >= 8.0       │
│  Else: Manual review        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Activate voor POI          │
│  (is_primary = true)        │
└─────────────────────────────┘
```

### 2. Cron Jobs

**Dagelijkse Image Discovery (Tier 1 & 2 POI's)**
```bash
# Elke dag om 2:00 AM
0 2 * * * /usr/bin/node /path/to/imageDiscovery.js --tiers=1,2 --max=100
```

**Wekelijkse Image Discovery (Tier 3 POI's)**
```bash
# Elke maandag om 3:00 AM
0 3 * * 1 /usr/bin/node /path/to/imageDiscovery.js --tiers=3 --max=500
```

**Maandelijkse Image Discovery (Tier 4 POI's)**
```bash
# Eerste dag van de maand om 4:00 AM
0 4 1 * * /usr/bin/node /path/to/imageDiscovery.js --tiers=4 --max=1000
```

**Queue Processor (Elke 5 minuten)**
```bash
*/5 * * * * /usr/bin/node /path/to/processImageQueue.js --batch-size=10
```

### 3. Budget Management

**Flickr API:**
- Gratis tier: 3600 requests/uur
- Per POI: ~3-5 requests (search + getSizes + getInfo)
- Capaciteit: ~720-1200 POI's per uur

**Unsplash API:**
- Gratis tier: 50 requests/uur
- Per POI: ~1-2 requests
- Capaciteit: ~25-50 POI's per uur

**Gecombineerde Strategie:**
```javascript
// Prioriteit
1. Flickr (goedkoop, veel data)
2. Unsplash (kwaliteit, beperkt)
3. Google Places (fallback)

// Daily budget
flickrRequests = 10000 / dag
unsplashRequests = 1000 / dag

// POI processing rate
~300 POI's per dag (met beide bronnen)
```

## API Rate Limiting

### Flickr Service

```javascript
class FlickrRateLimiter {
  constructor() {
    this.requestsPerHour = 3600;
    this.requestWindow = []; // Timestamps
  }

  async throttle() {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Clean old requests
    this.requestWindow = this.requestWindow.filter(t => t > hourAgo);

    if (this.requestWindow.length >= this.requestsPerHour) {
      const oldestRequest = this.requestWindow[0];
      const waitTime = oldestRequest + 3600000 - now;
      await sleep(waitTime);
    }

    this.requestWindow.push(now);
  }
}
```

### Unsplash Service

```javascript
class UnsplashRateLimiter {
  constructor() {
    this.requestsPerHour = 50;
    this.requestWindow = [];
  }

  async throttle() {
    // Similar to Flickr, but with 50/hour limit
  }
}
```

## Image Processing Pipeline

### 1. Download & Resize

```javascript
async function processImage(imageUrl, poi) {
  // Download original
  const original = await downloadImage(imageUrl);

  // Generate resizes
  const sizes = {
    original: original,
    large: await sharp(original).resize(1920, 1080, { fit: 'inside' }).toBuffer(),
    medium: await sharp(original).resize(1280, 720, { fit: 'inside' }).toBuffer(),
    thumbnail: await sharp(original).resize(400, 300, { fit: 'cover' }).toBuffer()
  };

  // Upload to storage (S3/Cloudinary)
  const urls = {};
  for (const [size, buffer] of Object.entries(sizes)) {
    urls[`url_${size}`] = await uploadToStorage(buffer, `poi/${poi.id}/${size}`);
  }

  return urls;
}
```

### 2. Storage Strategie

**Optie A: AWS S3**
```javascript
// Directory structuur
s3://holidaibutler-images/
  poi/
    {poi-id}/
      original/
        {image-id}.jpg
      large/
        {image-id}.jpg
      medium/
        {image-id}.jpg
      thumbnail/
        {image-id}.jpg
```

**Optie B: Cloudinary**
```javascript
// Gebruik transformaties
https://res.cloudinary.com/{cloud}/image/upload/
  c_fill,w_1920,h_1080,q_auto,f_auto/poi/{poi-id}/{image-id}
```

### 3. CDN Integratie

- CloudFlare of AWS CloudFront voor image delivery
- Automatische WebP conversie voor moderne browsers
- Lazy loading support met placeholder images

## Validatie & Quality Assurance

### Automatische Validatie

```javascript
async function validateImage(image, poi) {
  const checks = {
    resolution: checkResolution(image.width, image.height),
    geoDistance: calculateDistance(image.latitude, image.longitude, poi.latitude, poi.longitude),
    tagRelevance: checkTagRelevance(image.tags, poi),
    license: validateLicense(image.license_type),
    duplicate: checkDuplicates(image.hash, poi.id)
  };

  if (checks.duplicate) {
    return { valid: false, reason: 'Duplicate image' };
  }

  if (checks.resolution < 6) {
    return { valid: false, reason: 'Resolution too low' };
  }

  if (checks.geoDistance > 500) {
    return { valid: false, reason: 'Too far from POI location' };
  }

  const qualityScore = calculateQualityScore(checks);

  return {
    valid: qualityScore >= 6.0,
    qualityScore,
    autoApprove: qualityScore >= 8.0
  };
}
```

### Manual Review Interface

Voor images met score 6.0-7.9:

```javascript
// Admin API endpoint
GET /api/admin/poi-images/pending
POST /api/admin/poi-images/:id/approve
POST /api/admin/poi-images/:id/reject
POST /api/admin/poi-images/:id/set-primary
```

## Monitoring & Logging

### Metrics

```javascript
// Daily metrics
{
  poisProcessed: 234,
  imagesDiscovered: 1204,
  imagesApproved: 856,
  imagesRejected: 348,

  // Per bron
  flickrImages: 654,
  unsplashImages: 202,
  googlePlacesImages: 348,

  // API usage
  flickrRequests: 2341,
  unsplashRequests: 456,

  // Quality
  averageQualityScore: 7.8,
  autoApprovalRate: 0.71
}
```

### Error Handling

```javascript
// Retry logic
async function processWithRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);

      logger.warn(`Retry ${attempt}/${maxAttempts}`, { error: error.message });
    }
  }
}
```

## Implementatie Checklist

- [ ] Database migrations voor `poi_images` en `poi_image_queue`
- [ ] Flickr API service implementatie
- [ ] Unsplash API service implementatie
- [ ] Image Aggregation Service
- [ ] Quality validation algoritme
- [ ] Image processing pipeline (sharp)
- [ ] Storage integratie (S3/Cloudinary)
- [ ] Rate limiting voor APIs
- [ ] Cron jobs voor automation
- [ ] Queue processor
- [ ] Admin API endpoints
- [ ] Admin UI voor image review
- [ ] Monitoring dashboard
- [ ] Error alerting (Sentry)
- [ ] Budget tracking voor APIs
- [ ] Documentation updates

## Security Overwegingen

1. **API Keys**: Opslaan in environment variables, nooit in code
2. **Rate Limiting**: Implementeer per-IP limiting op admin endpoints
3. **Input Validation**: Valideer alle POI data voor SQL injection
4. **Image Validation**: Scan geüploade images op malware
5. **CORS**: Restrictieve CORS headers voor image URLs
6. **Authentication**: Vereist admin rol voor manual review endpoints

## Performance Optimalisatie

1. **Caching**: Redis cache voor frequently accessed images
2. **Lazy Loading**: Only load thumbnails initially
3. **Parallel Processing**: Process multiple POI's simultaneously
4. **Database Indexing**: Optimize queries met composite indexes
5. **CDN**: CloudFlare voor worldwide image delivery
6. **Compression**: WebP voor 30-50% smaller files

## Toekomstige Uitbreidingen

1. **AI Image Analysis**: Google Vision API voor automated tagging
2. **User-Generated Content**: Allow users to upload POI images
3. **Seasonal Images**: Collect images per season voor seasonal POI's
4. **360° Photos**: Support voor panoramic images
5. **Video Content**: Short video clips van POI's
6. **Instagram Integration**: Scrape geotagged Instagram posts
7. **Image Moderation**: ML model voor inappropriate content detection

## Referenties

- [Flickr API Documentation](https://www.flickr.com/services/api/)
- [Unsplash API Documentation](https://unsplash.com/documentation)
- [Creative Commons Licenses](https://creativecommons.org/licenses/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Haversine Distance Formula](https://en.wikipedia.org/wiki/Haversine_formula)
