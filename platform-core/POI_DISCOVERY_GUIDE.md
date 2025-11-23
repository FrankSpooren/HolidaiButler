# POI Discovery & Acquisition System

## 🎯 Overview

Advanced POI discovery system voor het automatisch verzamelen, analyseren en implementeren van complete POI-databases voor nieuwe bestemmingen. Dit systeem gebruikt multi-source data aggregatie met intelligente deduplicatie en kwaliteitsfiltering.

## ✨ Features

### Core Functionaliteit
- ✅ **Multi-source aggregatie**: Google Places, TripAdvisor, OpenStreetMap
- ✅ **Intelligente deduplicatie**: Op basis van unieke ID's, coördinaten en naam-gelijkheid
- ✅ **Configureerbare criteria**: Reviews, ratings, prijsniveau, locatie, categorie
- ✅ **Automatische classificatie**: AI-driven tier assignment
- ✅ **Budget-aware scraping**: API usage tracking en budgetbewaking
- ✅ **Progress tracking**: Real-time status updates van discovery runs
- ✅ **Herbruikbare configuraties**: Templates voor verschillende bestemmingstypes

### Data Sources
1. **Google Places** (via Apify)
   - ✅ Uitgebreide POI data
   - ✅ Review counts & ratings
   - ✅ Unieke Place ID's
   - ✅ Contact informatie

2. **OpenStreetMap** (via Overpass API)
   - ✅ Gratis data source
   - ✅ Goede coverage voor basale POI's
   - ⚠️ Beperkte review data
   - ✅ Complementair aan Google Places

3. **TripAdvisor** (via Apify)
   - ⏳ Placeholder (vereist URL-based search)
   - 🔜 Toekomstige enhancement

## 🏗️ Architectuur

### Database Models

#### DestinationConfig
Opslaan van herbruikbare discovery configuraties:
```javascript
{
  name: "Standard Beach Destination",
  categories: ["food_drinks", "beach", "activities"],
  criteria: {
    minReviews: 50,
    minRating: 4.0,
    priceLevel: [1, 2, 3]
  },
  sources: ["google_places", "osm"],
  maxPOIsPerCategory: 50
}
```

#### DiscoveryRun
Tracking van discovery operaties:
```javascript
{
  destination: "Valencia, Spain",
  status: "completed",
  pois_found: 250,
  pois_created: 180,
  pois_updated: 45,
  estimated_cost_eur: 2.50
}
```

### Services

#### POIDiscoveryService
Kernservice voor discovery operaties:
- `discoverDestination()` - Complete dataset creation
- `discoverCategory()` - Category-specific discovery
- `deduplicatePOIs()` - Intelligente deduplicatie
- `filterByCriteria()` - Kwaliteitsfiltering
- `createPOIsInDatabase()` - Database creation/updates

#### OpenStreetMapService
Gratis POI discovery via Overpass API:
- `searchPOIs()` - Search by category and location
- `queryOverpass()` - Direct Overpass QL queries
- Rate limiting voor respectvolle API usage

## 📡 API Endpoints

### Destination Discovery

#### POST /api/v1/poi-discovery/destination
Start synchrone destination discovery:
```bash
curl -X POST http://localhost:3001/api/v1/poi-discovery/destination \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Valencia, Spain",
    "categories": ["food_drinks", "museum", "beach"],
    "criteria": {
      "minReviews": 30,
      "minRating": 4.0
    },
    "sources": ["google_places", "osm"],
    "maxPOIsPerCategory": 50
  }'
```

Response:
```json
{
  "success": true,
  "run": {
    "id": "uuid",
    "destination": "Valencia, Spain",
    "status": "completed",
    "results": {
      "found": 250,
      "created": 180,
      "updated": 45,
      "skipped": 15,
      "failed": 10
    },
    "cost": {
      "apiCalls": 25,
      "estimatedCostEur": 2.50
    }
  }
}
```

#### POST /api/v1/poi-discovery/destination/async
Start asynchrone discovery (via workflow):
```bash
curl -X POST http://localhost:3001/api/v1/poi-discovery/destination/async \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Barcelona, Spain",
    "configId": "uuid-of-config"
  }'
```

Response:
```json
{
  "success": true,
  "runId": "uuid",
  "status": "pending",
  "message": "Destination discovery started. Use /runs/:id to check status."
}
```

### Discovery Runs

#### GET /api/v1/poi-discovery/runs/:id
Check discovery run status:
```bash
curl http://localhost:3001/api/v1/poi-discovery/runs/uuid
```

#### GET /api/v1/poi-discovery/runs
List recent discovery runs:
```bash
curl http://localhost:3001/api/v1/poi-discovery/runs?limit=20
```

### Configurations

#### POST /api/v1/poi-discovery/configs
Create reusable configuration:
```bash
curl -X POST http://localhost:3001/api/v1/poi-discovery/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Beach Resort",
    "description": "High-quality POIs for premium beach destinations",
    "categories": ["food_drinks", "beach", "activities", "accommodation"],
    "criteria": {
      "minReviews": 100,
      "minRating": 4.5,
      "priceLevel": [3, 4]
    },
    "sources": ["google_places"],
    "maxPOIsPerCategory": 30,
    "tags": ["premium", "beach", "luxury"]
  }'
```

#### GET /api/v1/poi-discovery/configs
List all configurations:
```bash
curl http://localhost:3001/api/v1/poi-discovery/configs
```

### Statistics

#### GET /api/v1/poi-discovery/stats
Get discovery statistics:
```bash
curl http://localhost:3001/api/v1/poi-discovery/stats
```

## 🔄 Workflows

### destination-discovery
Complete dataset creation workflow:
```bash
curl -X POST http://localhost:3001/api/v1/workflows/destination-discovery/execute \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Malaga, Spain",
    "categories": ["food_drinks", "museum", "beach"],
    "configId": "uuid-of-config"
  }'
```

### poi-enrichment
Enrich existing POIs with additional data:
```bash
curl -X POST http://localhost:3001/api/v1/workflows/poi-enrichment/execute \
  -H "Content-Type: application/json" \
  -d '{
    "poiIds": ["uuid1", "uuid2", "uuid3"],
    "sources": ["google_places", "tripadvisor"]
  }'
```

## 🚀 Quick Start

### 1. Database Setup
Run migration to create tables:
```bash
cd platform-core
node scripts/create-discovery-tables.js
```

Dit creëert:
- `destination_configs` table
- `discovery_runs` table
- 3 default configurations

### 2. Start Platform Core
```bash
npm start
```

### 3. Create Your First Discovery

#### Option A: Using Default Config
```bash
curl -X POST http://localhost:3001/api/v1/poi-discovery/destination \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Valencia, Spain",
    "configId": "uuid-of-standard-beach-config",
    "sources": ["google_places", "osm"]
  }'
```

#### Option B: Custom Discovery
```bash
curl -X POST http://localhost:3001/api/v1/poi-discovery/destination \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Valencia, Spain",
    "categories": ["food_drinks", "museum", "beach"],
    "criteria": {
      "minReviews": 50,
      "minRating": 4.0,
      "priceLevel": [1, 2, 3]
    },
    "sources": ["google_places"],
    "maxPOIsPerCategory": 50,
    "autoClassify": true
  }'
```

### 4. Monitor Progress
```bash
# Get run status
curl http://localhost:3001/api/v1/poi-discovery/runs/YOUR_RUN_ID

# Get all recent runs
curl http://localhost:3001/api/v1/poi-discovery/runs

# Get statistics
curl http://localhost:3001/api/v1/poi-discovery/stats
```

## 📊 Use Cases

### Use Case 1: Nieuwe Bestemming (Complete Dataset)
Creëer complete POI database voor Valencia:
```javascript
{
  "destination": "Valencia, Spain",
  "categories": [
    "food_drinks",
    "museum",
    "beach",
    "historical",
    "shopping",
    "activities",
    "nightlife"
  ],
  "criteria": {
    "minReviews": 30,
    "minRating": 4.0,
    "priceLevel": [1, 2, 3, 4]
  },
  "sources": ["google_places", "osm"],
  "maxPOIsPerCategory": 75
}
```

**Verwacht resultaat**: 300-500 POI's

### Use Case 2: White-Label Platform Setup
Gebruik herbruikbare config voor meerdere bestemmingen:
```bash
# 1. Create config once
POST /api/v1/poi-discovery/configs
{
  "name": "Coastal Spain Template",
  "categories": ["food_drinks", "beach", "activities"],
  "criteria": { "minReviews": 50, "minRating": 4.2 }
}

# 2. Use for multiple destinations
POST /api/v1/poi-discovery/destination
{ "destination": "Costa Brava, Spain", "configId": "template-id" }

POST /api/v1/poi-discovery/destination
{ "destination": "Costa Blanca, Spain", "configId": "template-id" }
```

### Use Case 3: Budget-Conscious Discovery
Gebruik gratis OpenStreetMap voor basis POI's:
```javascript
{
  "destination": "Barcelona, Spain",
  "categories": ["museum", "historical", "beach"],
  "sources": ["osm"], // Gratis!
  "maxPOIsPerCategory": 100
}
```

### Use Case 4: Premium Quality Dataset
Strenge criteria voor high-end bestemmingen:
```javascript
{
  "destination": "Marbella, Spain",
  "categories": ["food_drinks", "accommodation", "activities"],
  "criteria": {
    "minReviews": 100,
    "minRating": 4.5,
    "priceLevel": [3, 4] // Alleen premium
  },
  "sources": ["google_places"],
  "maxPOIsPerCategory": 25
}
```

## 💰 Cost Management

### Budget Tracking
Het systeem tracked automatisch API usage en costs:
```javascript
{
  "api_calls_made": 25,
  "estimated_cost_eur": 2.50,
  "pois_created": 180
}
```

### Cost per Source
- **Google Places** (via Apify): €0.003 per POI
- **TripAdvisor** (via Apify): €0.005 per POI
- **OpenStreetMap**: Gratis! 🎉

### Budget Optimization Tips
1. **Start met OpenStreetMap** voor basis coverage
2. **Gebruik Google Places** voor popular categories (food, activities)
3. **Filter streng** op criteria om minder POI's te scrapen
4. **Hergebruik configs** voor consistente resultaten
5. **Monitor monthly spend** via `/api/v1/integration/mailerlite/test`

## 🔍 Deduplication Logic

Het systeem gebruikt 3 strategieën voor deduplicatie:

### 1. Unique ID Matching
```javascript
// Google Place ID match
if (poi.google_place_id === existing.google_place_id) {
  // Duplicate found
}
```

### 2. Coordinate + Name Similarity
```javascript
// Within 50 meters AND 85% name similarity
const distance = calculateDistance(poi.coords, existing.coords);
const similarity = calculateNameSimilarity(poi.name, existing.name);

if (distance < 50 && similarity > 0.85) {
  // Duplicate found - merge data
}
```

### 3. Database Lookup
```javascript
// Check if POI already exists in database
const existingPOI = await POI.findOne({
  where: { google_place_id: poi.google_place_id }
});
```

## 📈 Default Configurations

Het systeem komt met 3 pre-configured templates:

### 1. Standard Beach Destination
```javascript
{
  categories: ["food_drinks", "beach", "activities", "accommodation", "nightlife"],
  criteria: { minReviews: 50, minRating: 4.0, priceLevel: [1,2,3] },
  maxPOIsPerCategory: 50
}
```

### 2. Cultural City Destination
```javascript
{
  categories: ["food_drinks", "museum", "historical", "shopping", "activities"],
  criteria: { minReviews: 30, minRating: 4.2, priceLevel: [1,2,3,4] },
  maxPOIsPerCategory: 75
}
```

### 3. Premium Destination
```javascript
{
  categories: ["food_drinks", "museum", "activities", "accommodation", "shopping"],
  criteria: { minReviews: 100, minRating: 4.5, priceLevel: [2,3,4] },
  maxPOIsPerCategory: 30
}
```

## 🛠️ Troubleshooting

### POI's worden niet gevonden
- Check of de destination naam correct is (bijv. "Valencia, Spain")
- Verhoog `maxPOIsPerCategory`
- Verlaag `minReviews` en `minRating` criteria
- Probeer meerdere sources: `["google_places", "osm"]`

### Te veel duplicaten
- Check deduplication thresholds in `POIDiscoveryService`
- Verhoog `nameSimilarityScore` threshold (default: 0.85)
- Verlaag `coordinateDistanceMeters` (default: 50m)

### Budget overschreden
- Check monthly spend: `GET /api/v1/poi-discovery/stats`
- Gebruik OpenStreetMap als gratis alternatief
- Verlaag `maxPOIsPerCategory`
- Filter strenger op criteria

### Discovery run faalt
- Check discovery run errors: `GET /api/v1/poi-discovery/runs/:id`
- Check Apify budget: Het systeem stopt automatisch bij budget limiet
- Check logs in `/logs/combined-YYYY-MM-DD.log`

## 🔐 Security & Best Practices

### API Rate Limiting
- OpenStreetMap: 1 request per second (respectful to OSM servers)
- Apify: Budget-controlled (stops at monthly limit)

### Data Validation
- Alle POI's worden gevalideerd voor required fields
- Coordinates worden gecheckt op valid ranges
- Duplicate detection voorkomt database bloat

### Error Handling
- Alle errors worden gelogd in `discovery_runs.errors`
- Failed POI's worden getrackt maar blokkeren proces niet
- Retry logic voor network failures

## 📝 Future Enhancements

### Planned Features
- [ ] TripAdvisor search integration
- [ ] Yelp integration
- [ ] Automated scheduling (weekly dataset updates)
- [ ] ML-based quality scoring
- [ ] Image scraping & validation
- [ ] Multi-language support
- [ ] Advanced geocoding

### Nice to Have
- [ ] Real-time progress WebSocket updates
- [ ] CSV/Excel export van discovery results
- [ ] POI conflict resolution UI
- [ ] Bulk config management
- [ ] Discovery run comparison tool

## 📞 Support

Voor vragen of problemen:
- Check de logs: `/logs/`
- Check API docs: `GET /api/v1/workflows`
- Check discovery stats: `GET /api/v1/poi-discovery/stats`

## 📄 License

Copyright © 2024 HolidaiButler. All rights reserved.
