# HolidaiButler - Gap Analyse Testomgeving

**Datum:** 9 december 2025
**Doel:** Identificeren van ontbrekende functionaliteit in https://test.holidaibutler.com
**Bronnen vergelijking:**
- `original-source/04-Development/backend/` (volledige backend implementatie)
- `platform-core/` (huidige productie implementatie)

---

## Executive Summary

De testomgeving (`platform-core`) bevat momenteel slechts **~15%** van de volledige backend functionaliteit uit de `original-source`. De huidige implementatie is primair gericht op **public POI endpoints** zonder authenticatie, terwijl de originele backend een volledig **enterprise-level platform** is met gebruikersbeheer, AI-chat, ticketing, en meer.

### Huidige Status Testomgeving
| Component | Status |
|-----------|--------|
| POI Read (public) | ✅ Werkend |
| POI Categories/Cities | ✅ Werkend |
| Health Check | ✅ Werkend |
| Database Connection | ✅ Werkend (read-only) |

### Ontbrekende Kernfunctionaliteit
| Component | Prioriteit | Complexiteit |
|-----------|------------|--------------|
| User Authentication | 🔴 HOOG | Medium |
| HoliBot AI Chat | 🔴 HOOG | Hoog |
| User Onboarding | 🟡 MEDIUM | Medium |
| Q&A Systeem | 🟡 MEDIUM | Laag |
| Ticketing Module | 🟡 MEDIUM | Hoog |
| POI CRUD (Admin) | 🟡 MEDIUM | Medium |
| OAuth (Google/Facebook) | 🟢 LAAG | Medium |
| Data Scrapers | 🟢 LAAG | Hoog |

---

## Gedetailleerde Gap Analyse

### 1. AUTHENTICATIE & GEBRUIKERSBEHEER

#### 1.1 Ontbrekend: User Registration & Login
**Bron:** `original-source/04-Development/backend/src/controllers/auth.controller.js`

**Ontbrekende endpoints:**
```
POST /api/v1/auth/signup         - Nieuwe gebruiker registreren
POST /api/v1/auth/login          - Inloggen met email/password
POST /api/v1/auth/logout         - Uitloggen
POST /api/v1/auth/refresh-token  - Token vernieuwen
POST /api/v1/auth/verify-email   - Email verificatie
POST /api/v1/auth/resend-verification - Verificatie opnieuw versturen
POST /api/v1/auth/forgot-password - Wachtwoord vergeten
POST /api/v1/auth/reset-password  - Wachtwoord resetten
```

**Features:**
- JWT token-based authentication (access + refresh tokens)
- Email verificatie via MailerLite
- Password reset flow
- Rate limiting voor verificatie emails
- GDPR audit logging
- Bcrypt password hashing (12 rounds)

**Database tabellen vereist:**
- `Users` (email, password_hash, uuid, email_verified, etc.)
- `Sessions` (refresh_token, user_id, expires_at)
- `Email_Verification_Logs` (GDPR audit)

**Impact:** Zonder authenticatie kunnen gebruikers geen persoonlijke voorkeuren opslaan en is personalisatie onmogelijk.

---

#### 1.2 Ontbrekend: OAuth Login
**Bron:** `original-source/04-Development/backend/src/controllers/oauth.controller.js`

**Ontbrekende endpoints:**
```
GET  /api/v1/auth/oauth/google/authorize  - Start Google OAuth flow
GET  /api/v1/auth/oauth/google/callback   - Google callback
GET  /api/v1/auth/oauth/facebook/authorize - Start Facebook OAuth flow
GET  /api/v1/auth/oauth/facebook/callback  - Facebook callback
```

**Features:**
- Google OAuth2 login
- Facebook OAuth login
- Account linking (OAuth + email/password)

**Database migratie:** `migrations/24_ADD_OAUTH_SUPPORT.sql`

---

### 2. HOLIBOT AI CHAT

#### 2.1 Ontbrekend: HoliBot Controller
**Bron:** `original-source/04-Development/backend/src/controllers/holibot.controller.js`

**Ontbrekende endpoints:**
```
POST /api/v1/holibot/chat              - AI chat met Mistral
GET  /api/v1/holibot/categories        - Categorieën met POI counts
GET  /api/v1/holibot/pois              - POI zoeken voor widget
POST /api/v1/holibot/recommendations   - Persoonlijkheids-gebaseerde aanbevelingen
GET  /api/v1/holibot/pois/:id/reviews  - Reviews en trust signals
GET  /api/v1/holibot/daily-tip         - Dagelijkse POI tip (AI gegenereerd)
```

**Features:**
- Mistral AI integratie (intent recognition + response generation)
- Personality-aware recommendations (cognitive/physical/social)
- Trust score berekening
- Daily tip rotatie per categorie
- User preference matching
- AI-gegenereerde beschrijvingen (NL)

**Dependencies:**
- Mistral API key (`MISTRAL_API_KEY`)
- `@mistralai/mistralai` npm package

---

#### 2.2 Ontbrekend: Mistral Service
**Bron:** `original-source/04-Development/backend/src/services/chat/mistralService.js`

**Features:**
- Intent analyse met AI
- Fallback naar pattern-based detection
- Natural language response generatie
- Context-aware conversations
- Search term extraction
- Dietary restriction detection
- Proximity detection (nearme, beach, center)

**Intent types:**
- `search_poi` - Zoeken naar locaties
- `get_info` - Specifieke informatie opvragen
- `compare_poi` - Locaties vergelijken
- `find_nearby` - Nabije locaties zoeken

---

### 3. USER ONBOARDING

#### 3.1 Ontbrekend: Onboarding Flow
**Bron:** `original-source/04-Development/backend/src/controllers/onboarding.controller.js`

**Ontbrekende endpoints:**
```
GET  /api/v1/onboarding/status           - Onboarding voortgang
POST /api/v1/onboarding/step/:stepNumber - Stap data opslaan
POST /api/v1/onboarding/complete         - Onboarding afronden
```

**5-Stappen Onboarding Flow:**
1. **Travel Companion** - couple, family, solo, group
2. **Interests** - max 8 interesses selecteren
3. **Trip Context** - stay_type (pleasure/business), visit_status (first-time/returning/local)
4. **Optional Preferences** - dietary_preferences, accessibility_needs
5. **Account Creation** - bevestiging

**Database tabellen vereist:**
- `User_Preferences` (travel_companion, interests, stay_type, visit_status, dietary_preferences, accessibility_needs)

**Impact:** Zonder onboarding kunnen gebruikersvoorkeuren niet worden verzameld voor personalisatie.

---

### 4. Q&A SYSTEEM

#### 4.1 Ontbrekend: Questions & Answers
**Bron:** `original-source/04-Development/backend/src/controllers/qna.controller.js`

**Ontbrekende endpoints:**
```
GET  /api/v1/qna      - Q&As ophalen (met filters)
POST /api/v1/qna      - Nieuwe Q&A toevoegen (auth required)
```

**Features:**
- Multi-language support (nl, en, de, es, sv)
- Filter op google_placeid (POI link)
- Filter op category
- Verified Q&As
- Helpful count sorting

**Database tabel:** `QnA` (google_placeid, question, answer, category, language, source, verified, helpful_count)

---

### 5. POI UITBREIDINGEN

#### 5.1 Ontbrekend: Geavanceerde POI Queries
**Bron:** `original-source/04-Development/backend/src/controllers/poi.controller.js`

**Ontbrekende features in huidige `/api/v1/pois`:**
```javascript
// Multi-category filtering
?categories=Food,Active              // OR logic

// Location-based filtering (Haversine)
?lat=38.64&lon=0.04&radius=10       // km radius

// Price range filtering
?price_min=1&price_max=3            // €-€€€

// Open now filtering
?open_now=true                       // Application-side filter op opening_hours JSON

// Cursor-based pagination (enterprise performance)
?cursor=123                          // O(limit) vs O(limit*offset)

// GeoJSON export
GET /api/v1/pois/geojson            // Voor map visualisatie

// Google Place ID lookup
GET /api/v1/pois/google/:placeid    // POI by google_placeid
```

**Ontbrekende helper functie:**
```javascript
function isOpenNow(openingHours) {
  // Checks if POI is currently open based on opening_hours JSON
  // Uses Europe/Amsterdam timezone
}
```

---

#### 5.2 Ontbrekend: POI Admin CRUD
**Bron:** `original-source/04-Development/backend/src/routes/poi.routes.js`

**Ontbrekende admin endpoints (auth required):**
```
POST   /api/v1/pois        - Nieuwe POI aanmaken
PUT    /api/v1/pois/:id    - POI updaten
DELETE /api/v1/pois/:id    - POI verwijderen
PATCH  /api/v1/pois/:id/verify - POI verifiëren
```

**Database veld:** `is_active` (voor soft delete)

---

### 6. TICKETING MODULE

#### 6.1 Ontbrekend: Complete Ticketing Systeem
**Bron:** `original-source/04-Development/backend/src/routes/index.js` (regel 27-34)

Het origineel integreert een **volledige ticketing module**:
```javascript
const ticketingModels = require('../../../ticketing-module/backend/models-sequelize');
ticketingModels.initialize(sequelize, { User, POI });
router.use('/ticketing', ticketingRoutes);
```

**Ontbrekende endpoints:**
```
GET    /api/v1/ticketing/events      - Evenementen ophalen
GET    /api/v1/ticketing/tickets     - Beschikbare tickets
POST   /api/v1/ticketing/order       - Ticket bestellen
GET    /api/v1/ticketing/orders/:id  - Order status
```

**Impact:** Geen mogelijkheid voor ticket verkoop of evenement beheer.

---

### 7. DATA ENRICHMENT & SCRAPERS

#### 7.1 Ontbrekend: External Data Scrapers
**Bron:** `original-source/04-Development/backend/modules/`

**Ontbrekende scrapers:**
| Scraper | Doel |
|---------|------|
| `getyourguide-scraper.js` | Tours & activities |
| `tripadvisor-scraper.js` | Reviews & ratings |
| `thefork-scraper.js` | Restaurant data |
| `mindtripai-scraper.js` | Travel intelligence |
| `social-media-discovery.js` | Social media links |

**Impact:** Geen automatische data verrijking van externe bronnen.

---

#### 7.2 Ontbrekend: POI Content Enrichment
**Bron:** `original-source/04-Development/backend/poi-content-enrichment.js`

**Features:**
- AI-gegenereerde beschrijvingen
- Image enhancement
- Quality audit scoring
- Automated data cleanup

**Scripts:**
- `enrich-poi-data.js`
- `poi-image-enhancer.js`
- `quality-audit-poi-content.js`
- `phase2-enrichment.js`

---

### 8. EMAIL SERVICE (MAILERLITE)

#### 8.1 Ontbrekend: Email Integratie
**Bron:** `original-source/04-Development/backend/src/services/mailerlite.js`

**Features:**
- Verification email verzenden
- Password reset email verzenden
- Rate limiting check
- Newsletter subscription

**Vereist:** `MAILERLITE_API_KEY` environment variable

---

### 9. PERMISSIONS & ROLES

#### 9.1 Ontbrekend: Granular Permissions
**Bron:** `original-source/04-Development/backend/src/controllers/permissions.controller.js`

**Ontbrekende endpoints:**
```
GET  /api/v1/permissions         - Alle permissions
GET  /api/v1/permissions/roles   - Alle roles
POST /api/v1/permissions/assign  - Permission toewijzen
```

**Database migratie:** `migrations/23_ADD_GRANULAR_PERMISSIONS.sql`

**Roles:** admin, editor, moderator, user

---

### 10. DATABASE MIGRATIES

#### 10.1 Ontbrekende Migraties
**Bron:** `original-source/04-Development/backend/migrations/`

| Migratie | Beschrijving |
|----------|--------------|
| `19_ADD_EMAIL_VERIFICATION.sql` | Email verificatie velden |
| `20_ADD_PASSWORD_RESET.sql` | Password reset velden |
| `21_ADD_OPENING_HOURS.sql` | Opening hours JSON veld |
| `22_OPTIMIZE_POI_INDEXES.sql` | Database indexes optimalisatie |
| `23_ADD_GRANULAR_PERMISSIONS.sql` | Role-based permissions |
| `24_ADD_OAUTH_SUPPORT.sql` | OAuth velden |
| `25_ADD_POI_IS_ACTIVE.sql` | Soft delete veld |
| `add-chat-sessions.js` | Chat sessie tabellen |
| `add-enrichment-columns.js` | POI enrichment velden |

---

## Prioriteit Matrix

### Fase 1: Kritieke Functionaliteit (Week 1-2)
| Item | Geschatte Effort |
|------|------------------|
| User Authentication (signup/login/logout) | 3 dagen |
| JWT middleware integratie | 1 dag |
| Basic HoliBot chat endpoint | 2 dagen |
| Mistral service setup | 1 dag |
| **Totaal Fase 1** | **7 dagen** |

### Fase 2: Core Platform (Week 3-4)
| Item | Geschatte Effort |
|------|------------------|
| User onboarding flow | 2 dagen |
| POI advanced queries (location, open_now) | 2 dagen |
| Q&A endpoints | 1 dag |
| Email verificatie (MailerLite) | 2 dagen |
| Password reset flow | 1 dag |
| **Totaal Fase 2** | **8 dagen** |

### Fase 3: Enhanced Features (Week 5-6)
| Item | Geschatte Effort |
|------|------------------|
| HoliBot recommendations | 2 dagen |
| Daily tip feature | 1 dag |
| Trust signals & reviews | 1 dag |
| POI admin CRUD | 2 dagen |
| OAuth integratie | 3 dagen |
| **Totaal Fase 3** | **9 dagen** |

### Fase 4: Enterprise Features (Week 7-8)
| Item | Geschatte Effort |
|------|------------------|
| Ticketing module integratie | 5 dagen |
| Permissions systeem | 2 dagen |
| Data scrapers | 3 dagen |
| Content enrichment automation | 2 dagen |
| **Totaal Fase 4** | **12 dagen** |

---

## Aanbevelingen

### Directe Acties (Quick Wins)
1. **Copy controllers** van `original-source` naar `platform-core`:
   - `auth.controller.js`
   - `holibot.controller.js`
   - `onboarding.controller.js`
   - `qna.controller.js`

2. **Services toevoegen**:
   - `mailerlite.js`
   - `chat/mistralService.js`
   - `chat/sessionService.js`
   - `chat/searchService.js`

3. **Middleware activeren**:
   - JWT auth middleware (al aanwezig in platform-core)

4. **Environment variabelen toevoegen**:
   ```env
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   MISTRAL_API_KEY=<your-key>
   MISTRAL_MODEL=mistral-small-latest
   MAILERLITE_API_KEY=<your-key>
   ```

### Database Acties
1. **Migraties uitvoeren** (via KonsoleH of phpMyAdmin):
   - `19_ADD_EMAIL_VERIFICATION.sql`
   - `20_ADD_PASSWORD_RESET.sql`
   - `21_ADD_OPENING_HOURS.sql`
   - `24_ADD_OAUTH_SUPPORT.sql`
   - `25_ADD_POI_IS_ACTIVE.sql`

2. **Write-access configureren** voor `pxoziy_1_w` user in KonsoleH

### Frontend Afstemming
Controleer of de customer-portal frontend de volgende endpoints verwacht:
- `/api/v1/auth/*` - Authenticatie
- `/api/v1/holibot/*` - Chat widget
- `/api/v1/onboarding/*` - Onboarding flow

---

## Conclusie

De huidige testomgeving is functioneel maar **zeer beperkt**. Om HolidaiButler als volledig platform te laten functioneren, moet minimaal **Fase 1 en 2** worden geïmplementeerd (circa 15 werkdagen).

De **hoogste prioriteit** is:
1. ✅ User Authentication - zonder dit geen personalisatie mogelijk
2. ✅ HoliBot Chat - core feature voor de widget
3. ✅ User Onboarding - verzamelt voorkeuren voor AI personalisatie

De code in `original-source` is **enterprise-grade** en kan grotendeels hergebruikt worden. Het voornaamste werk is integratie, testen, en database migraties.

---

*Analyse uitgevoerd door Claude Code - 9 december 2025*
