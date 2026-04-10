# POI Classification System

AI-driven tier classification systeem voor automatisch updaten, toevoegen en verwijderen van POIs in de HolidaiButler database.

## 🎯 Overzicht

Het POI Classification System is een geautomatiseerd systeem dat POI's classificeert op basis van hun relevantie en populariteit, en deze automatisch up-to-date houdt via multi-source data aggregation.

### Tier Strategie

| Tier | Update Frequentie | Score Range | Beschrijving |
|------|-------------------|-------------|--------------|
| **Tier 1** | Realtime/Hourly | ≥ 8.5 | Top POIs met hoogste waarde |
| **Tier 2** | Daily | ≥ 7.0 | Belangrijke POIs |
| **Tier 3** | Weekly | ≥ 5.0 | Reguliere POIs |
| **Tier 4** | Monthly | < 5.0 | Lage prioriteit POIs |

## 📊 POI Score Berekening

De POI score (0-10) wordt berekend met een gewogen gemiddelde van 4 variabelen:

```javascript
poi_score = (review_count * 0.3) +
            (average_rating * 0.2) +
            (tourist_relevance * 0.3) +
            (booking_frequency * 0.2)
```

### Score Componenten

#### 1. Review Count (30% weight)
- **Bron**: Google Places, TripAdvisor, Booking.com
- **Periode**: Laatste 24 maanden
- **Normalisatie**: 0-10 schaal (max 1000 reviews = 10)
- **Formule**: `min(review_count / 100, 10)`

#### 2. Average Rating (20% weight)
- **Bron**: Cross-validated van meerdere bronnen
- **Schaal**: 0-5 origineel → 0-10 genormaliseerd
- **Cross-validation**: Gewogen gemiddelde van alle bronnen
- **Formule**: `(average_rating / 5) * 10`

#### 3. Tourist Relevance (30% weight)
- **Basis score**: Per categorie (museum: 8.0, historical: 8.5, etc.)
- **Top Attractions**: Boost van 0-10 punten o.b.v. ranking
- **Location**: City center krijgt boost
- **Verification**: Geverifieerde POIs krijgen bonus
- **Schaal**: 0-10

#### 4. Booking Frequency (20% weight)
- **Bron**: Eigen ticketing module + externe platforms (TheFork)
- **Periode**: Maandelijks gemiddelde
- **Normalisatie**: 0-10 schaal (max 100/maand = 10)
- **Formule**: `min(booking_frequency / 10, 10)`

## 🔄 Data Bronnen

### Multi-Source Aggregation via Apify

Het systeem gebruikt **Apify webscraping** (€50/maand budget) voor cost-effective data aggregation:

#### Primaire Bronnen:
1. **Google Places** - Review count, ratings, location data
2. **TripAdvisor** - Top attractions, rankings, reviews
3. **Booking.com** - Accommodation ratings (voor hotels/accommodaties)
4. **TheFork** - Restaurant reserveringen (toekomstig)

#### Top Attractions Datasets:
- TripAdvisor "Top Things to Do"
- GetYourGuide featured attractions
- Booking.com top-rated
- Airbnb Experiences
- MindTrip AI recommendations

### Cross-Validation

Minimum 2 bronnen vereist voor validatie:
```javascript
- Single source: gebruikt maar gemarkeerd als "not validated"
- 2+ sources: Gewogen gemiddelde met source weights
- Source weights: Google (1.0), TripAdvisor (0.9), Booking (0.8)
```

## 🏗️ Database Schema

### POIs Table (MySQL)
```sql
- tier (1-4)
- poi_score (0-10)
- review_count
- average_rating (0-5)
- tourist_relevance (0-10)
- booking_frequency
- google_place_id, tripadvisor_id, etc.
- next_update_at
```

### POI Data Sources
Tracks data van elke bron apart voor cross-validation.

### POI Score History
Tracks score changes over tijd voor trending analysis.

### API Usage Log
Budget monitoring en cost tracking per API call.

## 🤖 Geautomatiseerde Workflows

### Cron Schedules

```javascript
// Tier 1: Every hour
'0 * * * *' → poi-tier1-updates

// Tier 2: Daily at 3:00 AM
'0 3 * * *' → poi-tier2-updates

// Tier 3: Weekly on Monday at 4:00 AM
'0 4 * * 1' → poi-tier3-updates

// Tier 4: Monthly on 1st at 5:00 AM
'0 5 1 * *' → poi-tier4-updates

// Quarterly Review: Every 3 months at 6:00 AM
'0 6 1 */3 *' → poi-quarterly-review
```

### Workflow Details

#### poi-tier1-updates (Hourly)
- Max 50 POIs per run
- Only Google Places (cost-effective)
- Updates: data, booking frequency
- No tourist relevance updates (stable)

#### poi-tier2-updates (Daily)
- Max 100 POIs per run
- Google Places + TripAdvisor
- Full data updates

#### poi-tier3-updates (Weekly)
- Max 200 POIs per run
- Google Places + TripAdvisor
- Includes tourist relevance updates

#### poi-tier4-updates (Monthly)
- Max 500 POIs per run
- Single source (Google) for efficiency
- Full updates

#### poi-quarterly-review (Every 3 months)
- ALL POIs reclassified
- All data sources (Google, TripAdvisor, Booking)
- Tier rebalancing per city
- Category distribution check

#### poi-discovery (On-demand)
- Discovers new POIs per city/category
- Auto-classification of new POIs
- Starts at Tier 4

## 💰 Budget Management

### Monthly Budget: €50

#### Cost Optimization Strategies:

1. **Tier-based Scraping**
   - Tier 1: More frequent but single source
   - Tier 4: Less frequent, minimal data

2. **Incremental Updates**
   - Cache source data
   - Only scrape if data older than threshold
   - Batch requests where possible

3. **Smart Scheduling**
   - Off-peak hours for large batches
   - Staggered updates throughout the day

4. **Budget Monitoring**
```javascript
// Auto-stop if budget exceeded
if (monthlySpent >= monthlyBudget) {
  logger.warn('Budget exceeded, skipping update');
  return;
}
```

### Cost Estimates (Apify)
- Google Places: ~€0.003 per POI
- TripAdvisor: ~€0.005 per POI
- Booking.com: ~€0.004 per POI

### Example Monthly Costs:
```
Tier 1 (50 POIs × 720 updates/month × €0.003) = €108 → REDUCE TO 25 POIs
Tier 2 (100 POIs × 30 updates/month × €0.008) = €24
Tier 3 (200 POIs × 4 updates/month × €0.008) = €6.40
Tier 4 (500 POIs × 1 update/month × €0.003) = €1.50
Quarterly (1000 POIs × 4/year × €0.015) = €15/year = €1.25/month
TOTAL ≈ €40/month (within budget)
```

## 🏙️ POI Categorieën

Supported categories met base relevance scores:

| Category | Base Score | Weather Dependent | Seasonal |
|----------|------------|-------------------|----------|
| **museum** | 8.0 | ❌ | ❌ |
| **historical** | 8.5 | ❌ | ❌ |
| **beach** | 7.5 | ✅ | ✅ Summer |
| **food_drinks** | 7.0 | ❌ | ❌ |
| **routes** | 6.5 | ✅ | ✅ |
| **activities** | 7.5 | Partially | ✅ |
| **shopping** | 6.0 | ❌ | ❌ |
| **healthcare** | 3.0 | ❌ | ❌ |
| **accommodation** | 5.0 | ❌ | ❌ |
| **nightlife** | 6.5 | ❌ | ❌ |

## 🚀 Setup & Usage

### 1. Database Migratie

Migreer bestaande POIs van MongoDB naar MySQL:

```bash
cd platform-core
node scripts/migrate-pois-to-mysql.js
```

### 2. Database Schema

Run migration:

```bash
mysql -u user -p pxoziy_db1 < database/migrations/001_poi_classification_schema.sql
```

### 3. Configuratie

Update `.env`:

```env
# Apify
APIFY_API_TOKEN=your-apify-token
APIFY_MONTHLY_BUDGET_EUR=50

# Database
DB_HOST=your-hetzner-server
DB_NAME=pxoziy_db1
```

### 4. Start Platform Core

```bash
npm start
```

Workflows starten automatisch volgens cron schedules.

## 📡 API Endpoints

### Get Statistics
```http
GET /api/v1/poi-classification/stats?city=Amsterdam
```

### Get Budget Usage
```http
GET /api/v1/poi-classification/budget
```

### Get POIs by Tier
```http
GET /api/v1/poi-classification/tier/1?city=Amsterdam&limit=50
```

### Classify Single POI
```http
POST /api/v1/poi-classification/classify/:poiId
{
  "updateData": true,
  "sources": ["google_places", "tripadvisor"]
}
```

### Batch Classify
```http
POST /api/v1/poi-classification/batch-classify
{
  "poiIds": ["uuid1", "uuid2"],
  "updateData": true
}
```

### Discover New POIs
```http
POST /api/v1/poi-classification/discover
{
  "city": "Amsterdam",
  "category": "museum",
  "maxResults": 20
}
```

### Weather-Based Recommendations
```http
GET /api/v1/poi-classification/recommendations/weather?city=Amsterdam&weather=rain&limit=10
```

### Balance Tier Distribution
```http
POST /api/v1/poi-classification/balance-tiers
{
  "tier": 1,
  "city": "Amsterdam"
}
```

### Get POIs Due for Update
```http
GET /api/v1/poi-classification/due-for-update?tier=1&limit=100
```

## 📊 Monitoring

### Logs

```bash
# View classification logs
tail -f logs/integration-*.log | grep poi

# View budget usage
tail -f logs/combined-*.log | grep apify
```

### Budget Check

```bash
curl http://localhost:3001/api/v1/poi-classification/budget
```

Response:
```json
{
  "success": true,
  "usage": {
    "year": 2024,
    "month": 1,
    "budget": 50.00,
    "spent": 32.45,
    "remaining": 17.55,
    "percentage": 64.9,
    "total_calls": 1234
  }
}
```

## 🔧 Troubleshooting

### Budget Exceeded

Als budget overschreden:
```javascript
// Automatic: Workflows skip updates
// Manual: Check budget
GET /api/v1/poi-classification/budget

// Reduce Tier 1 POIs or increase budget
```

### Missing Data Sources

Als scraping faalt:
```javascript
// Check Apify logs
tail -f logs/integration-*.log | grep apify

// Retry manually
POST /api/v1/poi-classification/classify/:poiId
```

### Tier Imbalance

Als tier distribution niet balanced:
```javascript
// Manual rebalancing
POST /api/v1/poi-classification/balance-tiers
{
  "tier": 1,
  "city": "Amsterdam"
}
```

## 🎯 Best Practices

### Voor Startup/MVP Fase (€50/maand)

1. **Start Klein**
   - Begin met 1 stad
   - Tier 1: Max 25 POIs
   - Tier 2: Max 100 POIs

2. **Optimize Sources**
   - Google Places only voor Tier 1 (hourly)
   - Google + TripAdvisor voor Tier 2/3

3. **Cache Agressief**
   - Store source data
   - Skip updates als data < 24 uur oud (Tier 1)

4. **Monitor Budget**
   - Weekly check
   - Alert bij 80% van budget

### Voor Scale-up (Toekomst)

1. **Meer Budget** (€200+/maand)
   - Meer steden
   - Meer data bronnen
   - Frequentere updates

2. **Direct APIs**
   - Google Places API
   - TripAdvisor API
   - TheFork API

3. **Machine Learning**
   - Predictive scoring
   - Anomaly detection
   - Automated category balancing

## 📈 Toekomstige Features

- [ ] AI-powered trend detection
- [ ] Automatic POI merging (duplicates)
- [ ] Image scraping en analysis
- [ ] Review sentiment analysis
- [ ] Seasonal relevance auto-adjustment
- [ ] Integration met eigen booking data
- [ ] Custom relevance weights per user segment
- [ ] A/B testing van classification algorithms

---

**Copyright © 2024 HolidaiButler. All rights reserved.**
