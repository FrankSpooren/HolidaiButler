# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.2.0
> **Laatst bijgewerkt**: 28 januari 2026 (17:10 UTC)
> **Eigenaar**: Frank Spooren
> **Project**: HolidaiButler - AI-Powered Tourism Platform

---

## 🎯 Project Mission

HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen, met huidige focus op **Costa Blanca (Calpe/Alicante)** en **Texel**.

### Kernwaarden
- **Personalisatie**: AI-driven aanbevelingen gebaseerd op gebruikersvoorkeuren
- **Kwaliteit**: Enterprise-level, state-of-the-art user experience
- **Betrouwbaarheid**: Accurate, actuele data uit gerenommeerde bronnen
- **Privacy**: GDPR-compliant, EU AI Act ready
- **EU-First**: 100% EU-gehoste infrastructuur

---

## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)

> **Dit zijn bindende afspraken voor alle ontwikkeling en implementatie.**

### 1. Enterprise Level Kwaliteit
Elke stap, feature of uitwerking resulteert in een **enterprise-level waardig product** dat **state-of-the-art** is. Dit is het verwachtingspatroon van investeerders, eigenaren en gebruikers. Geen concessies, geen "goed genoeg".

### 2. Foutloze Deployments
**Alle errors en foutmeldingen moeten opgelost zijn VOORDAT een feature:**
- Als afgerond wordt beschouwd
- Wordt gepusht naar de server
- Wordt gepusht naar GitHub

Ook niet-kritieke errors zijn onacceptabel in productie.

### 3. CLAUDE.md Actualisatie
Na elke relevante aanpassing, uitbreiding of update:
- CLAUDE.md bijwerken met wijzigingen
- Opslaan op Hetzner server: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`
- Pushen naar GitHub (alle branches via Dev → Test → Main)

### 4. Context Verificatie
**Alvorens te starten met een volgende fase, stap of feature:**
- CLAUDE.md volledig lezen en bestuderen
- Actuele status verifiëren in codebase
- Geen aannames maken over implementatie status

### 5. Geen Workarounds
- Geen "known issues" accepteren
- Geen tijdelijke oplossingen die permanent worden
- Problemen oplossen bij de root cause

---

## 👤 Over de Eigenaar

**Frank Spooren** is een strategisch marketeer, GEEN developer.

### Communicatie Richtlijnen
- Leg technische zaken **altijd begrijpelijk** uit
- Geef **stap-voor-stap instructies** waar nodig
- Benoem **risico's en impact** duidelijk
- Vraag bij twijfel **altijd bevestiging** voordat je kritieke acties uitvoert
- Stuur rapportages naar: **info@holidaibutler.com**

### Werkproces Vereisten
1. **Altijd fact-based** - geen aannames maken
2. **Input regel voor regel analyseren** - niet scannen
3. **Punt voor punt uitwerken** met controlemechanisme + verificatie
4. **Volledige context gebruiken** - raadpleeg skills en documentatie

---

## 🏗️ Repository Structuur

```
HolidaiButler/
├── CLAUDE.md               # Dit bestand (project context)
├── .claude/                # Claude Agent configuratie
│   ├── skills/             # Agent Skills
│   └── commands/           # Custom commands
│
├── .github/
│   └── workflows/
│       └── deploy-platform-core.yml  # CI/CD workflow met concurrency control
│
├── customer-portal/        # React 19 + Tailwind (holidaibutler.com)
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── utils/
│       └── package.json
│
├── admin-module/           # React 18 + MUI (admin.holidaibutler.com)
│   ├── src/
│   └── package.json
│
├── platform-core/          # Node.js/Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── holibot.js
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── holibot/           # HoliBot 2.0 (RAG Chatbot)
│   │   │   ├── orchestrator/      # ✅ Fase 2: Agent Orchestrator
│   │   │   │   ├── queues.js
│   │   │   │   ├── scheduler.js
│   │   │   │   ├── workers.js
│   │   │   │   ├── costController/
│   │   │   │   ├── auditTrail/
│   │   │   │   └── ownerInterface/
│   │   │   └── agents/            # ✅ Fase 3: Specialized Agents
│   │   │       ├── healthMonitor/ # ✅ Platform Health Monitor v1.0
│   │   │       │   ├── index.js
│   │   │       │   ├── reporter.js
│   │   │       │   ├── alertIntegration.js
│   │   │       │   └── checks/
│   │   │       │       ├── serverHealth.js
│   │   │       │       ├── databaseHealth.js
│   │   │       │       ├── apiHealth.js
│   │   │       │       ├── frontendHealth.js
│   │   │       │       └── queueHealth.js
│   │   │       ├── ownerInterfaceAgent/  # ✅ Owner Interface Agent v1.1
│   │   │       │   └── index.js
│   │   │       ├── dataSync/      # ✅ Data Sync Agent v2.0
│   │   │       │   ├── index.js
│   │   │       │   ├── syncScheduler.js
│   │   │       │   ├── poiLifecycleManager.js
│   │   │       │   ├── reviewsManager.js
│   │   │       │   ├── qaGenerator.js
│   │   │       │   ├── dataValidator.js
│   │   │       │   └── syncReporter.js
│   │   │       ├── holibotSync/   # ✅ HoliBot Sync Agent v1.0
│   │   │       │   ├── index.js
│   │   │       │   ├── chromaService.js    # ChromaDB Cloud client
│   │   │       │   ├── embeddingService.js # MistralAI embeddings
│   │   │       │   ├── poiSyncService.js   # POI vector sync
│   │   │       │   ├── qaSyncService.js    # Q&A vector sync
│   │   │       │   └── syncScheduler.js    # 4 scheduled jobs
│   │   │       ├── communicationFlow/  # ✅ Communication Flow Agent v1.0
│   │   │       │   ├── index.js
│   │   │       │   ├── userJourneyManager.js  # User journey automation
│   │   │       │   ├── mailerliteService.js   # MailerLite integration
│   │   │       │   ├── notificationRouter.js  # Multi-channel routing
│   │   │       │   └── syncScheduler.js       # 3 scheduled jobs
│   │   │       ├── gdpr/               # ✅ GDPR Agent v1.0
│   │   │       │   ├── index.js               # Main entry point
│   │   │       │   ├── dataInventory.js       # Art. 30 data mapping
│   │   │       │   ├── dataExporter.js        # Art. 15/20 data export
│   │   │       │   ├── dataEraser.js          # Art. 17 right to erasure
│   │   │       │   ├── consentManager.js      # Art. 7 consent tracking
│   │   │       │   └── syncScheduler.js       # 4 scheduled jobs
│   │   │       ├── devLayer/           # ✅ Fase 4: Development Layer v1.0
│   │   │       │   ├── index.js               # Main entry point
│   │   │       │   ├── qualityChecker.js      # Orchestration & CI/CD
│   │   │       │   ├── syncScheduler.js       # 3 scheduled jobs
│   │   │       │   └── reviewers/
│   │   │       │       ├── uxReviewer.js      # UX/UI quality analysis
│   │   │       │       ├── codeReviewer.js    # Code standards & patterns
│   │   │       │       └── securityReviewer.js # OWASP Top 10 & security
│   │   │       └── strategyLayer/     # ✅ Fase 5: Strategy Layer v1.0 (NIEUW)
│   │   │           ├── index.js               # Main entry point
│   │   │           ├── architectureAdvisor.js # System design recommendations
│   │   │           ├── learningAgent.js       # Pattern learning & optimization
│   │   │           ├── adaptiveConfigAgent.js # Dynamic config tuning
│   │   │           ├── predictionAgent.js     # Proactive issue detection
│   │   │           ├── syncScheduler.js       # 4 scheduled jobs
│   │   │           └── analyzers/
│   │   │               └── patternAnalyzer.js # Core pattern detection engine
│   │   └── middleware/
│   ├── config/                # ✅ Multi-Destination Config (NIEUW)
│   │   ├── shared.config.js          # Platform-wide settings
│   │   └── destinations/
│   │       ├── index.js              # Config exports + utilities
│   │       ├── calpe.config.js       # Calpe destination config
│   │       ├── texel.config.js       # Texel destination config
│   │       └── alicante.config.js    # Alicante destination config
│   ├── migrations/            # ✅ Database Migrations (NIEUW)
│   │   └── 001_multi_destination.sql
│   └── package.json
│
├── modules/
│   ├── agenda-module/
│   ├── payment-module/
│   ├── reservations-module/
│   └── ticketing-module/
│
├── infrastructure/         # Docker configs
├── docs/
│   └── agents/
│       ├── fase2/          # ✅ Orchestrator documentatie
│       ├── fase3/          # ✅ Specialized agents
│       └── fase4/          # ✅ Development Layer documentatie
└── agents/                 # Claude Agent implementaties
```

---

## 🖥️ Server & Deployment

### Server Details
| Aspect | Waarde |
|--------|--------|
| **Server IP** | 91.98.71.87 (Hetzner, 🇩🇪 Duitsland) |
| **Deploy path** | `/var/www/api.holidaibutler.com/platform-core` |
| **PM2 process** | `holidaibutler-api` |
| **GitHub Actions** | `.github/workflows/deploy-platform-core.yml` |

### HoliBot API Endpoints
- **Base path**: `/api/v1/holibot/*`
- **Routes file**: `platform-core/src/routes/holibot.js`

---

## 🌐 Omgevingen & URLs

| Omgeving | Customer Portal | Admin Portal | API URL | Branch |
|----------|-----------------|--------------|---------|--------|
| **Production** | holidaibutler.com | admin.holidaibutler.com | api.holidaibutler.com | `main` |
| **Test** | test.holidaibutler.com | admin.test.holidaibutler.com | api.test.holidaibutler.com | `test` |
| **Development** | dev.holidaibutler.com | admin.dev.holidaibutler.com | api.dev.holidaibutler.com | `dev` |

---

## 🔧 Tech Stack

### Customer Portal (holidaibutler.com)
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React + TypeScript | 19 |
| Build | Vite | 7 |
| Styling | Tailwind CSS | 4 |
| State | Zustand + TanStack Query | 5 |
| Routing | React Router | 7 |
| Forms | React Hook Form + Zod | - |
| i18n | i18next | - |
| Maps | Leaflet + React-Leaflet | - |
| Animaties | Framer Motion | - |
| Betalingen | Adyen Web SDK | - |

### Admin Portal (admin.holidaibutler.com)
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React | 18 |
| Build | Vite | 4 |
| UI Library | Material UI (MUI) | 5 |
| State | Zustand + React Query | 4/3 |
| Routing | React Router | 6 |
| Charts | Recharts | - |
| WYSIWYG | React Quill | - |

### Backend (Platform Core)
| Component | Technologie | Versie | Status |
|-----------|-------------|--------|--------|
| Runtime | Node.js | 18+ | ✅ |
| Framework | Express | 4 | ✅ |
| Database | MySQL (Sequelize) + MongoDB (Mongoose) | - | ✅ |
| Caching | Redis + ioredis | 7.0.15 | ✅ |
| Queue | BullMQ | - | ✅ |
| Auth | JWT + bcrypt | - | ✅ |
| Logging | Winston | - | ✅ |
| **Monitoring** | **Bugsink (EU-hosted)** | - | ✅ |
| Email | MailerLite | - | ✅ |
| Alerts | Threema Gateway | - | ✅ |
| Scraping | Apify Client | - | ✅ |
| **Vector DB** | **ChromaDB Cloud** | 3.1.8 | ✅ |
| **Embeddings** | **MistralAI** | - | ✅ |

### DevOps
| Tool | Doel |
|------|------|
| Docker + Docker Compose | Containerization |
| Vitest, Jest, Playwright | Testing |
| ESLint + Prettier | Linting |
| GitHub Actions | CI/CD |
| BullMQ | Job scheduling (35 jobs) |
| **Bugsink** | Error tracking (EU) |

---

## 🌿 Branch Strategy

| Branch | Doel | URL | Auto-deploy |
|--------|------|-----|-------------|
| `main` | Productie | holidaibutler.com | Ja, na approval |
| `test` | Staging/QA | test.holidaibutler.com | Ja |
| `dev` | Development | dev.holidaibutler.com | Ja |
| `feature/*` | Nieuwe features | - | Nee |

### Git Workflow
1. Nieuwe feature → maak branch van `dev`
2. Development klaar → PR naar `dev`
3. Code review door agent(s)
4. Merge naar `dev` → auto-deploy naar dev environment
5. QA goedkeuring → merge naar `test`
6. Owner approval → merge naar `main`

### ⚠️ Deployment Volgorde (KRITIEK)
**ALTIJD deployen in volgorde: Dev → Test → Main**

```bash
# Stap 1: Push naar dev, wacht op deployment success
git push origin dev
# Wacht tot workflow compleet (2-3 min)

# Stap 2: Push naar test, wacht op deployment success
git push origin dev:test
# Wacht tot workflow compleet (2-3 min)

# Stap 3: Push naar main (productie)
git push origin dev:main
```

**Waarom:** GitHub Actions concurrency control queued workflows. Bij gelijktijdige pushes worden intermediate workflows gecanceld. Dit veroorzaakt gemiste deployments.

**Workflow file:** `.github/workflows/deploy-platform-core.yml` bevat concurrency control om race conditions te voorkomen.

---

## 🔑 Belangrijke Code Conventies

### AI Text Processing
```javascript
// Gebruik cleanAIText() voor ALLE AI-gegenereerde tekst
// Locatie: platform-core/src/routes/holibot.js
const cleanedText = cleanAIText(aiResponse);
```

### POI Filtering
```javascript
// Gebruik isPOIClosed() om gesloten POIs te filteren
if (isPOIClosed(poi)) {
  // Skip deze POI
}
```

### Image Handling
- **Model**: `ImageUrl` voor meerdere afbeeldingen per POI
- **Prioriteit**: Lokale afbeeldingen boven externe URLs
- **Fallback**: Category gradient + icon

---

## 📌 Externe Integraties

### API Keys (NOOIT hardcoden!)
Alle keys staan in `.env` files (niet in repo):

```bash
# Locatie: platform-core/.env

# AI Services
ANTHROPIC_API_KEY=           # Claude API
MISTRAL_API_KEY=             # HoliBot LLM + Embeddings

# EU-Compliant Services
MAILERLITE_API_KEY=          # Email marketing (EU)
THREEMA_GATEWAY_ID=          # Critical alerts (CH)
THREEMA_SECRET=              # Threema API secret
OWNER_THREEMA_ID=            # Owner Threema ID

# ChromaDB Cloud (Vector Database)
CHROMADB_API_KEY=            # ChromaDB Cloud API key
CHROMADB_TENANT=             # ChromaDB tenant ID
CHROMADB_DATABASE=           # ChromaDB database name
CHROMADB_COLLECTION_NAME=    # Default collection

# Data Services
APIFY_TOKEN=                 # Data scraping
HETZNER_API_TOKEN=           # Server management
ADYEN_API_KEY=               # Betalingen

# Monitoring (EU-hosted)
SENTRY_DSN=                  # Bugsink EU-hosted (Sentry SDK compatible)

# Database
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Integratie Overzicht

| Platform | Functie | Locatie | Status |
|----------|---------|---------|--------|
| Hetzner | Server hosting | 🇩🇪 Duitsland | ✅ |
| GitHub | Code repository | - | ✅ |
| **ChromaDB Cloud** | **Vector database** | **Cloud** | ✅ |
| MistralAI | Chatbot LLM + Embeddings | 🇫🇷 Frankrijk | ✅ |
| MailerLite | Email flows | 🇱🇹 EU | ✅ |
| **Bugsink** | **Error monitoring** | 🇳🇱 **Nederland (self-hosted)** | ✅ |
| Threema | Critical alerts | 🇨🇭 Zwitserland | ✅ |
| Apify | Data scraping | - | ✅ |
| Adyen | Betalingen | 🇳🇱 Nederland | ✅ |

### ⚠️ Verwijderde Services

| Service | Reden | Vervanger | Account Status |
|---------|-------|-----------|----------------|
| Sentry.io | US bedrijf, CLOUD Act risico | Bugsink (NL) | **Kan verwijderd worden** |
| SMS alerts | Kosten, privacy concerns | Threema (CH) | N.v.t. |

> **Actie:** Sentry.io account kan volledig verwijderd worden. Bugsink is 100% compatibel (zelfde SDK).

---

## 📊 Database Structuur

### MySQL (Hetzner - pxoziy_db1 database)
| Tabel | Beschrijving | Sync Frequentie |
|-------|--------------|-----------------|
| POI | Points of Interest (+ status, tier_score, duplicate_hash) | Tier-based |
| QA | AI-generated Q&A pairs (NL/EN/ES, approval workflow) | Maandelijks |
| Reviews | Reviews met sentiment analysis, spam scores | Wekelijks/Maandelijks |
| Users | Klantaccounts | Realtime |
| AdminUsers | Partner accounts | Realtime |
| agenda | Events | Dagelijks |
| agenda_dates | Event datums | Bij event update |
| Tickets | Ticketverkoop | Realtime |
| Transactions | Betalingen | Realtime |
| user_journeys | Journey tracking per user (Communication Flow) | Elke 15 min |
| journey_scheduled_emails | Scheduled email queue (Communication Flow) | Elke 15 min |
| user_consent | GDPR consent tracking (essential, analytics, personalization, marketing) | Realtime |
| gdpr_deletion_requests | Art. 17 deletion requests (72h deadline tracking) | Elke 4 uur |

#### POI Enterprise Columns (v2.0)
- `status`: active/pending_deactivation/deactivated/merged
- `pending_deactivation_date`: 30-day grace period tracking
- `duplicate_hash`: MD5 for duplicate detection
- `tier_score`: Calculated tier score (0-10)

#### Reviews Enterprise Columns (v2.0)
- `sentiment_score`: -1.0 to 1.0 sentiment analysis
- `sentiment_label`: positive/negative/neutral
- `spam_score`: 0.0 to 1.0 spam detection

#### Q&A Enterprise Columns (v2.0)
- `source`: manual/ai_generated/imported
- `status`: draft/pending_review/approved/rejected
- `priority`: 1-5 importance ranking

### MongoDB (via Mongoose)
| Collection | Beschrijving | Retention |
|------------|--------------|-----------|
| cost_logs | API cost tracking | 90 dagen |
| audit_logs | Agent action logs | 30 dagen |
| chat_logs | HoliBot conversations | Configurable |

### ChromaDB Cloud (Vector Database)
| Collection | Beschrijving | Sync |
|------------|--------------|------|
| `holidaibutler_pois` | POI vector embeddings | Dagelijks 06:30 |
| `holidaibutler_qas` | Q&A vector embeddings | Dagelijks 07:00 |
| `calpe_pois` | Legacy POI collection | - |

---

## 🤖 Claude Agents Architectuur

### Fase 2 - Core Layer ✅ COMPLEET

| Agent | Functie | Status |
|-------|---------|--------|
| **Orchestrator Agent** | Centrale coördinatie + Cost Controller | ✅ Live |
| **Owner Interface Agent** | Email + Threema communicatie | ✅ Live |

#### Orchestrator Components
- BullMQ Scheduler (35 recurring jobs)
- Cost Controller (€515/maand budget)
- Audit Trail (30 dagen retention)

#### Owner Interface Components
- MailerLite Email Service (Automation-based)
- Threema Gateway (urgency 5)
- Daily Briefing (08:00)

#### MailerLite Automation Configuratie
**Methode:** Dual-group rotation (Growing Business plan compatible)
- **Probleem:** MailerLite re-entry cooldown >24h per subscriber per automation
- **Oplossing:** Twee groepen/automations die dagelijks alterneren (48h per groep)
- **Group 1:** "System Alerts Owner" (ID: 176972381290498029) → Automation "Daily system update"
- **Group 2:** "System Alerts Owner 2" (ID: 177755949282362712) → Automation "Daily system update 2"
- **Rotatie:** Even dag-van-jaar → Group 1, oneven dag-van-jaar → Group 2
- **Flow:** API removes → updates fields → re-adds subscriber → automation triggers
- **Template:** Vaste template met dynamic fields via personalization
- **Plan limiet:** Campaign API HTML content vereist Advanced plan (niet beschikbaar)

**Custom Fields (MailerLite):**
| Field | Beschrijving |
|-------|--------------|
| `last_system_alert` | Email subject |
| `briefing_date` | Datum (Nederlands) |
| `budget_spent` | Uitgegeven bedrag |
| `budget_percentage` | % van budget |
| `budget_remaining` | Resterend budget |
| `jobs_count` | Jobs uitgevoerd (24u) |
| `errors_count` | Errors (24u) |
| `status_summary` | Status tekst |

### Fase 3 - Operations Layer ✅ COMPLEET (100%)

| Agent | Functie | Status |
|-------|---------|--------|
| **Platform Health Monitor v1.0** | System monitoring (5 categorieën) | ✅ Live |
| **Data Sync Agent v2.0** | POI Lifecycle, Reviews, Q&A, Validation | ✅ Live |
| **HoliBot Sync Agent v1.0** | ChromaDB vector sync voor chatbot | ✅ Live |
| **Communication Flow Agent v1.0** | User journeys, notifications, MailerLite sync | ✅ Live |
| **GDPR Agent v1.0** | Privacy compliance (Art. 7, 15, 17, 20, 30) | ✅ Live |

#### Platform Health Monitor v1.0 Components
- **Server Health**: Ping, CPU/memory usage, disk space monitoring
- **Database Health**: MySQL, MongoDB, Redis connection checks
- **API Health**: HolidaiButler API, MistralAI, Apify, ChromaDB, Bugsink
- **Frontend Health**: Production, test, dev, admin portals (latency tracking)
- **Queue Health**: BullMQ queues status, worker monitoring
- **Alert Integration**: Automatische koppeling met Owner Interface Agent
- **Scheduled**: Elk uur via BullMQ (hourly full health check)
- **Cooldowns**: Intelligent alert throttling (5min critical → 24h info)

#### Data Sync Agent v2.0 Components
- **POI Lifecycle Manager**: Creation, deactivation (30-day grace), duplicate detection
- **Reviews Manager**: Sentiment analysis, spam detection, 2-year retention
- **Q&A Generator**: AI-powered multi-language (NL/EN/ES) generation
- **Data Validator**: Schema validation, referential integrity, auto-rollback
- **Sync Reporter**: Daily/weekly health reports, quality scores, alerts
- **Scheduled Jobs**: 13 enterprise jobs (POI sync, review sync, Q&A sync, etc.)

#### HoliBot Sync Agent v1.0 Components (NIEUW - 19 Jan 2026)
- **ChromaDB Cloud Service**: CloudClient voor vector database connectie
- **Embedding Service**: MistralAI embedding generatie (mistral-embed model)
- **POI Sync Service**: Synchroniseert POI data naar ChromaDB voor vector search
- **Q&A Sync Service**: Synchroniseert Q&A data naar ChromaDB voor vector search
- **Sync Scheduler**: 4 scheduled jobs voor ChromaDB synchronisatie

**HoliBot Sync Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `holibot-poi-sync` | 06:30 dagelijks | POI sync naar ChromaDB (na Data Sync) |
| `holibot-qa-sync` | 07:00 dagelijks | Q&A sync naar ChromaDB |
| `holibot-full-reindex` | Zondag 04:00 | Volledige ChromaDB reindex |
| `holibot-cleanup` | 05:00 dagelijks | Cleanup deactivated/rejected items |

**ChromaDB Collections:**
- `holidaibutler_pois`: POI vector embeddings voor semantic search
- `holidaibutler_qas`: Q&A vector embeddings voor chatbot context

#### Communication Flow Agent v1.0 Components (NIEUW - 19 Jan 2026)
- **User Journey Manager**: Automated customer journeys (welcome, booking, re-engagement, review)
- **MailerLite Service**: Extended email automation, user sync, campaign management
- **Notification Router**: Multi-channel routing (email, Threema) based on urgency
- **Sync Scheduler**: 3 scheduled jobs for communication automation

**Communication Flow Scheduled Jobs (3):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `comm-journey-processor` | Elke 15 minuten | Process pending journey emails |
| `comm-user-sync` | 03:00 dagelijks | Sync users to MailerLite |
| `comm-cleanup` | Zondag 04:00 | Cleanup completed journeys (90 days) |

**User Journey Types:**
- `WELCOME`: New user onboarding (day 0, 2, 7)
- `BOOKING_CONFIRMATION`: Post-booking flow (day 0, -3, +1)
- `RE_ENGAGEMENT`: Inactive user reactivation (day 30, 60, 90)
- `REVIEW_REQUEST`: Post-visit review solicitation (day 1, 7)

**Database Tables:**
- `user_journeys`: Journey tracking per user
- `journey_scheduled_emails`: Scheduled email queue

#### GDPR Agent v1.0 Components (NIEUW - 19 Jan 2026)
- **Data Inventory**: Maps all personal data locations per Art. 30 GDPR
- **Data Exporter**: Handles Art. 15 (Access) and Art. 20 (Portability) requests
- **Data Eraser**: Handles Art. 17 (Right to Erasure) with 72h deadline
- **Consent Manager**: Tracks Art. 7 consent (essential, analytics, personalization, marketing)
- **Sync Scheduler**: 4 scheduled jobs for GDPR compliance monitoring

**GDPR Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `gdpr-overdue-check` | Elke 4 uur | Check 72h deletion deadline violations |
| `gdpr-export-cleanup` | 03:00 dagelijks | Cleanup old export files (7+ days) |
| `gdpr-retention-check` | 1e van maand 02:00 | Check data retention compliance |
| `gdpr-consent-audit` | Zondag 04:00 | Generate consent statistics report |

**GDPR Articles Implemented:**
- **Art. 7**: Conditions for Consent (consent tracking)
- **Art. 15**: Right of Access (data export JSON)
- **Art. 17**: Right to Erasure (72h deadline, owner approval for partners)
- **Art. 20**: Data Portability (portable ZIP/CSV export)
- **Art. 30**: Records of Processing Activities (data inventory)

**Database Tables:**
- `user_consent`: Consent tracking per user
- `gdpr_deletion_requests`: Deletion request tracking with approval workflow

### Fase 4 - Development Layer ✅ COMPLEET (100%)

| Agent | Functie | Status |
|-------|---------|--------|
| **UX/UI Reviewer v1.0** | Interface quality (brand colors, a11y, responsive, UX principles) | ✅ Live |
| **Code Reviewer v1.0** | Code quality (conventions, error handling, performance, docs) | ✅ Live |
| **Security Reviewer v1.0** | Security audits (OWASP Top 10, secrets detection, GDPR) | ✅ Live |
| **Quality Checker v1.0** | Orchestration, lint, tests, dependency audit, CI/CD | ✅ Live |

#### Development Layer Agent v1.0 Components (NIEUW - 19 Jan 2026)
- **UX/UI Reviewer**: Brand color compliance, typography, WCAG accessibility, responsive design, UX principles (Miller's Law, Hick's Law, Fitts' Law)
- **Code Reviewer**: HolidaiButler conventions, error handling patterns, performance anti-patterns, security patterns, code complexity, documentation
- **Security Reviewer**: OWASP Top 10 2021 checks (A01-Broken Access Control, A02-Cryptographic Failures, A03-Injection, A07-Auth Failures, A10-SSRF), API security (rate limiting, CORS, input validation), authentication patterns, GDPR data protection alignment, hardcoded secrets detection
- **Quality Checker**: Orchestrates all reviewers, ESLint integration, test runner, dependency audit

**Quality Thresholds:**
- PASS: Score ≥ 80%
- WARNING: Score 60-79%
- FAIL: Score < 60%
- CRITICAL: Any critical security issue detected

**Development Layer Scheduled Jobs (3):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `dev-security-scan` | 02:00 dagelijks | Full security scan of all projects |
| `dev-dependency-audit` | Zondag 03:00 | Dependency vulnerability audit |
| `dev-quality-report` | Maandag 06:00 | Weekly quality report generation |

**Volledige specificaties**: Zie `docs/agents/fase4/` en `docs/CLAUDE_AGENTS_MASTERPLAN.md` (v3.4.0)

### Fase 5 - Strategy Layer ✅ COMPLEET (100%)

| Agent | Functie | Status |
|-------|---------|--------|
| **Architecture Advisor v1.0** | System design recommendations, health assessment (5 categories) | ✅ Live |
| **Learning Agent v1.0** | Pattern analysis, optimization suggestions | ✅ Live |
| **Adaptive Config Agent v1.0** | Dynamic configuration tuning (rate limiting, queue, cache, alerts) | ✅ Live |
| **Prediction Agent v1.0** | Proactive issue detection, forecasting | ✅ Live |

#### Strategy Layer Agent v1.0 Components (NIEUW - 27 Jan 2026)
- **Pattern Analyzer**: Core pattern detection engine (errors, performance, costs, user journeys)
- **Architecture Advisor**: System design recommendations, health assessment across 5 categories (stability, performance, cost efficiency, scalability, EU compliance)
- **Learning Agent**: Pattern recognition, trend analysis, optimization suggestions with confidence scores
- **Adaptive Config Agent**: Dynamic configuration tuning for rate limiting, queue concurrency, cache TTLs, alert thresholds. Rule-based triggers (HIGH_TRAFFIC, HIGH_ERROR_RATE, LOW_RESOURCES, PEAK_HOURS)
- **Prediction Agent**: Proactive issue detection using linear regression trends. Predicts resource exhaustion, error escalation, cost overruns, performance decline
- **Sync Scheduler**: 4 scheduled jobs for strategy analysis and optimization

**Strategy Layer Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `strategy-assessment` | Maandag 06:00 | Weekly architecture assessment |
| `strategy-learning` | 03:00 dagelijks | Learning cycle and optimizations |
| `strategy-prediction` | Elke 6 uur | Predictive analysis for proactive alerts |
| `strategy-config-eval` | Elke 30 minuten | System metrics evaluation and config adaptation |

**Architecture Assessment Categories:**
- Stability (error patterns, recurring issues)
- Performance (degradation, peak usage)
- Cost Efficiency (budget anomalies, service costs)
- Scalability (queue backlog, database connections)
- EU Compliance (service locations, GDPR agent status)

**Prediction Models:**
- Resource Exhaustion (disk, memory trend analysis)
- Error Escalation (hourly error rate trending)
- Cost Overrun (projected monthly vs budget)
- Performance Decline (multi-metric degradation)

**Volledige specificaties**: Zie `docs/agents/fase5/`

---

## 📊 Scheduled Jobs Overzicht (35 totaal)

### Core Jobs (4)
| Job | Schedule | Component |
|-----|----------|-----------|
| `health-check` | Elk uur | Platform Health Monitor |
| `daily-briefing` | 08:00 dagelijks | Owner Interface |
| `cost-check` | Elke 6 uur | Cost Controller |
| `weekly-cost-report` | Maandag 09:00 | Cost Controller |

### Data Sync Jobs (13)
| Job | Schedule | Component |
|-----|----------|-----------|
| `poi-sync-tier1` | 06:00 dagelijks | Data Sync Agent |
| `poi-sync-tier2` | Maandag 06:00 | Data Sync Agent |
| `poi-sync-tier3` | 1e van maand 06:00 | Data Sync Agent |
| `poi-sync-tier4` | Kwartaal 06:00 | Data Sync Agent |
| `poi-tier-recalc` | Zondag 03:00 | Data Sync Agent |
| `poi-deactivation-check` | 01:00 dagelijks | Data Sync Agent |
| `review-sync-tier12` | Woensdag 05:00 | Data Sync Agent |
| `review-sync-tier34` | 15e van maand 05:00 | Data Sync Agent |
| `review-retention` | Zondag 02:00 | Data Sync Agent |
| `qa-sync-tier12` | 1e van maand 04:00 | Data Sync Agent |
| `qa-sync-tier34` | Kwartaal 04:00 | Data Sync Agent |
| `health-report-daily` | 07:00 dagelijks | Data Sync Agent |
| `health-report-weekly` | Maandag 07:00 | Data Sync Agent |

### HoliBot Sync Jobs (4)
| Job | Schedule | Component |
|-----|----------|-----------|
| `holibot-poi-sync` | 06:30 dagelijks | HoliBot Sync Agent |
| `holibot-qa-sync` | 07:00 dagelijks | HoliBot Sync Agent |
| `holibot-full-reindex` | Zondag 04:00 | HoliBot Sync Agent |
| `holibot-cleanup` | 05:00 dagelijks | HoliBot Sync Agent |

### Communication Flow Jobs (3)
| Job | Schedule | Component |
|-----|----------|-----------|
| `comm-journey-processor` | Elke 15 minuten | Communication Flow Agent |
| `comm-user-sync` | 03:00 dagelijks | Communication Flow Agent |
| `comm-cleanup` | Zondag 04:00 | Communication Flow Agent |

### GDPR Jobs (4)
| Job | Schedule | Component |
|-----|----------|-----------|
| `gdpr-overdue-check` | Elke 4 uur | GDPR Agent |
| `gdpr-export-cleanup` | 03:00 dagelijks | GDPR Agent |
| `gdpr-retention-check` | 1e van maand 02:00 | GDPR Agent |
| `gdpr-consent-audit` | Zondag 04:00 | GDPR Agent |

### Development Layer Jobs (3)
| Job | Schedule | Component |
|-----|----------|-----------|
| `dev-security-scan` | 02:00 dagelijks | Development Layer Agent |
| `dev-dependency-audit` | Zondag 03:00 | Development Layer Agent |
| `dev-quality-report` | Maandag 06:00 | Development Layer Agent |

### Strategy Layer Jobs (4)
| Job | Schedule | Component |
|-----|----------|-----------|
| `strategy-assessment` | Maandag 06:00 | Strategy Layer Agent |
| `strategy-learning` | 03:00 dagelijks | Strategy Layer Agent |
| `strategy-prediction` | Elke 6 uur | Strategy Layer Agent |
| `strategy-config-eval` | Elke 30 minuten | Strategy Layer Agent |

---

## ⚠️ Kritieke Regels

### NOOIT doen:
- ❌ Direct naar `main` pushen zonder approval
- ❌ API keys in code of documenten zetten
- ❌ Dependencies updaten zonder impact check
- ❌ Database schema's wijzigen zonder migratie
- ❌ API endpoints verwijderen (breaking changes)
- ❌ User data verwijderen zonder GDPR protocol
- ❌ POI data verwijderen zonder owner approval
- ❌ Direct naar productie server via SSH voor code wijzigingen
- ❌ **US-based monitoring services gebruiken (geen Sentry.io)**
- ❌ **Features deployen met bekende errors of foutmeldingen**
- ❌ **Starten met nieuwe fase/feature zonder CLAUDE.md te lezen**

### ALTIJD doen:
- ✅ Tests draaien voor commit (`npm test`)
- ✅ Conventional commit messages gebruiken
- ✅ TypeScript types toevoegen aan nieuwe code
- ✅ Error handling implementeren
- ✅ Owner notificeren bij kritieke wijzigingen
- ✅ Skills raadplegen voor domeinkennis
- ✅ Audit trail bijhouden voor data wijzigingen
- ✅ `cleanAIText()` gebruiken voor AI-gegenereerde tekst
- ✅ `isPOIClosed()` gebruiken om gesloten POIs te filteren
- ✅ **EU-compliant services gebruiken**
- ✅ **Errors loggen naar Bugsink**
- ✅ **CLAUDE.md updaten na elke relevante wijziging**
- ✅ **Alle errors oplossen vóór deployment**

---

## 📝 Commit Message Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: customer, admin, core, modules, infra, agents

Voorbeelden:
feat(customer): add POI thumbnail component
fix(core): resolve database connection timeout
docs(agents): update orchestrator specification
feat(orchestrator): add Threema integration for critical alerts
feat(agents): add HoliBot Sync Agent for ChromaDB vector sync
```

---

## 🎨 Design System

### Brand Colors
| Naam | Hex | Gebruik |
|------|-----|---------|
| Header Gradient Start | #7FA594 | Header achtergrond |
| Header Gradient Mid | #5E8B7E | - |
| Header Gradient End | #4A7066 | - |
| Gouden Accent | #D4AF37 | CTAs, highlights |
| Button Primary | #8BA99D | Knoppen |
| Text Primary | #2C3E50 | Hoofdtekst |
| Text Secondary | #687684 | Subtekst |

### Typography
- **Font**: Inter
- **Headings**: Bold, Primary color
- **Body**: Regular, 16px

### UX Principes
- Miller's Law: Beperk keuzestress
- Jakob's Law: Herkenbare patronen
- Proximity Principle: Groepeer gerelateerde elementen
- Hick's Law: Progressive disclosure
- Fitts' Law: Mobile thumb-friendly CTAs
- WCAG: Accessibility compliance

> **Note:** Deze UX principes worden automatisch gevalideerd door de UX/UI Reviewer Agent (Fase 4). Zie sectie "Development Layer Agent v1.0 Components".

---

## 🌍 Multi-Destination Architecture

### Bestemmingen Database (destinations table)
| ID | Code | Display Name | Country | Status | Domain |
|----|------|--------------|---------|--------|--------|
| 1 | calpe | Calpe | Spain | ✅ Active | holidaibutler.com |
| 2 | texel | Texel | Netherlands | ⏸️ Planned | texelmaps.nl |
| 3 | alicante | Alicante | Spain | ⏸️ Planned | alicante.holidaibutler.com |

### Database Multi-Tenancy
Tabellen met `destination_id` foreign key:
- `POI` (1593 records → Calpe)
- `QA` (0 records)
- `agenda` (314 records → Calpe)
- `Users` (10 records → Calpe)
- `user_journeys` (0 records)
- `holibot_sessions` (169 records → Calpe)

### Configuration Files
```
platform-core/config/
├── shared.config.js           # Platform-wide settings
└── destinations/
    ├── index.js               # Export + utility functions
    ├── calpe.config.js        # Calpe configuration
    ├── texel.config.js        # Texel configuration
    └── alicante.config.js     # Alicante configuration
```

### Migration Files
```
platform-core/migrations/
└── 001_multi_destination.sql  # Multi-destination schema migration
```

### Destination Config Utility Functions
```javascript
import { getDestinationConfig, isFeatureEnabled } from './config/destinations';

// Get config by code
const config = getDestinationConfig('calpe');

// Check feature availability
if (isFeatureEnabled('calpe', 'holibot')) {
  // Feature enabled
}
```

### Bestemming-specifieke Skills
Elke bestemming heeft eigen skills in `.claude/skills/destinations/`:
- `DESTINATION.md` - Algemene info
- `poi-categories.md` - POI categorieën
- `local-events.md` - Lokale evenementen
- `seasonal.md` - Seizoensinformatie

---

## 📈 POI Tier Strategie

### Score Berekening
```
score = (review_count × 0.30) +
        (average_rating × 0.20) +
        (tourist_relevance × 0.30) +
        (booking_frequency × 0.20)
```

### Tier Classificatie
| Tier | Score | Update Frequentie | Max POIs |
|------|-------|-------------------|----------|
| 1 | ≥ 8.0 | Dagelijks 06:00 | 25 |
| 2 | ≥ 7.0 | Wekelijks (maandag) | 250 |
| 3 | ≥ 5.0 | Maandelijks (1e) | 1000 |
| 4 | < 5.0 | Kwartaal (Jan/Apr/Jul/Oct) | Onbeperkt |

### Data Bronnen
- Google Places (via Apify)
- TripAdvisor
- TheFork
- Trustpilot
- Booking.com

---

## 🔒 Security & Compliance

### GDPR Compliance
- User data: Verwijdering binnen 72 uur na verzoek
- Partner data: Owner approval vereist
- Audit trail: 30 dagen retentie
- Data export: Op verzoek binnen 24 uur

### EU AI Act Compliance
- Transparantie over AI gebruik
- Menselijke controle via approval workflows
- Bias monitoring in aanbevelingen

### EU-First Infrastructure
| Component | Locatie | Compliance |
|-----------|---------|------------|
| Server | 🇩🇪 Hetzner | ✅ GDPR |
| Database | 🇩🇪 Hetzner | ✅ GDPR |
| Monitoring | 🇳🇱 Bugsink | ✅ GDPR |
| Email | 🇱🇹 MailerLite | ✅ GDPR |
| Alerts | 🇨🇭 Threema | ✅ GDPR |

---

## 📞 Contact & Escalatie

| Urgentie | Actie | Kanaal |
|----------|-------|--------|
| 1 (Info) | Daily digest | Briefing email |
| 2 (Laag) | Email | MailerLite |
| 3 (Medium) | Email | MailerLite |
| 4 (Hoog) | Priority email | MailerLite |
| 5 (Kritiek) | Email + Threema | Alle kanalen |

**Owner Email**: info@holidaibutler.com
**Owner Threema**: V9VUJ8K6

---

## 📚 Gerelateerde Documentatie

| Document | Locatie |
|----------|---------|
| Agent Masterplan | `docs/CLAUDE_AGENTS_MASTERPLAN.md` (v3.4.0) |
| Fase 2 Docs | `docs/agents/fase2/` |
| Fase 3 Docs | `docs/agents/fase3/` |
| Fase 4 Docs | `docs/agents/fase4/` |
| Fase 5 Docs | `docs/agents/fase5/` |
| API Documentatie | `docs/api/` |
| Deployment Guide | `infrastructure/README.md` |
| Contributing Guide | `CONTRIBUTING.md` |

---

## 🖥️ Server Monitoring & Onderhoud

### Quick Health Check Commands
```bash
# SSH naar server
ssh root@91.98.71.87

# PM2 status
pm2 status

# Redis check
redis-cli ping

# Check scheduled jobs (35 verwacht)
cd /var/www/api.holidaibutler.com/platform-core
node -e "const { Queue } = require('bullmq'); const Redis = require('ioredis'); async function c() { const conn = new Redis(); const q = new Queue('scheduled-tasks', { connection: conn }); const jobs = await q.getRepeatableJobs(); console.log('Jobs:', jobs.length); await q.close(); await conn.quit(); } c();"

# Check failed jobs
node -e "const { Queue } = require('bullmq'); const Redis = require('ioredis'); async function c() { const conn = new Redis(); const q = new Queue('scheduled-tasks', { connection: conn }); const failed = await q.getFailedCount(); console.log('Failed:', failed); await q.close(); await conn.quit(); } c();"

# PM2 logs (laatste errors)
pm2 logs holidaibutler-api --lines 50 --nostream 2>&1 | grep -iE "error|failed"
```

### Server Disk Status (28 jan 2026)
| Path | Grootte | Status |
|------|---------|--------|
| `/` (totaal) | 38 GB | 48% gebruikt |
| `/var/www/api.holidaibutler.com/` | 9.0 GB | Actief |
| `/var/www/api.holidaibutler.com/storage/poi-images/` | 8.3 GB | 1576 afbeeldingen |
| `/var/www/backups/` | 870 MB | Opgeschoond (was 2.8 GB) |

### Queue Name
**Let op:** De BullMQ queue heet `scheduled-tasks` (NIET `scheduled-jobs`)

### Bekende Issues (28 jan 2026)
| Issue | Status | Oorzaak |
|-------|--------|---------|
| HoliBot sync jobs falen | ✅ Gefixed | Tabel- en kolomnamen gecorrigeerd |
| Daily briefing email | ✅ Gefixed | Dual-group rotation actief, cooldowns moeten verlopen |

---

## 📋 Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **3.2.0** | **2026-01-28** | **Multi-Destination Architecture Fase 1 COMPLEET: destinations table (3 destinations), destination_id toegevoegd aan 6 tabellen (POI, QA, agenda, Users, user_journeys, holibot_sessions), config files (shared + 3 destinations), migration file. Database backup gemaakt.** |
| 3.1.1 | 2026-01-28 | HoliBot sync bug gefixed: kolomnamen gecorrigeerd (rating, tier_score, city AS destination, last_updated). Alle 35 jobs operationeel, 0 failed. |
| **3.1.0** | **2026-01-28** | **Server monitoring toolkit toegevoegd. Database tabelnamen gecorrigeerd (POI/QA, niet POIs/QAs). HoliBot sync issue gedocumenteerd. Server opschoning: backups van 2.8GB naar 870MB. SSH key hersteld voor root@91.98.71.87.** |
| 3.0.1 | 2026-01-27 | Email fix: Dual-group rotation voor dagelijkse briefing. MailerLite re-entry cooldown (>24h) omzeild door 2 groepen/automations die dagelijks alterneren (48h per groep). Campaign API HTML content niet beschikbaar op Growing Business plan. |
| 3.0.0 | 2026-01-27 | Fase 5 Strategy Layer COMPLEET: Architecture Advisor, Learning Agent, Adaptive Config Agent, Prediction Agent. Pattern analysis, proactive issue detection, dynamic config tuning. 4 nieuwe jobs (35 totaal). Major version - alle 5 fases compleet! |
| 2.9.1 | 2026-01-20 | CLAUDE.md correcties: Job count (31), docs/agents/fase4/ toegevoegd, MASTERPLAN referentie fix, OWASP details (A01/A02/A03/A07/A10), quality thresholds, UX Reviewer cross-reference. |
| 2.9.0 | 2026-01-19 | Fase 4 Development Layer COMPLEET: UX/UI Reviewer, Code Reviewer, Security Reviewer, Quality Checker. OWASP Top 10 checks, brand compliance, code conventions. 3 nieuwe jobs (31 totaal). Fase 4 nu 100% compleet! |
| 2.8.0 | 2026-01-19 | GDPR Agent v1.0 LIVE: Art. 7/15/17/20/30 compliance, data export, erasure (72h), consent management. 4 nieuwe jobs (28 totaal). Fase 3 nu 100% compleet! |
| 2.7.1 | 2026-01-19 | Database tabellen toegevoegd (user_journeys, journey_scheduled_emails), MASTERPLAN referentie gecorrigeerd naar v3.4.0 |
| 2.7.0 | 2026-01-19 | Communication Flow Agent v1.0 LIVE: User journeys, notification routing, MailerLite sync. 3 nieuwe jobs (24 totaal). Fase 3 nu 87.5% compleet. |
| 2.6.0 | 2026-01-19 | HoliBot Sync Agent v1.0 LIVE: ChromaDB Cloud sync, MistralAI embeddings, 4 jobs. Enterprise kwaliteitsstandaarden toegevoegd. Fase 3 nu 75% compleet. |
| 2.5.1 | 2026-01-19 | Deployment volgorde gedocumenteerd (Dev→Test→Main), concurrency control fix, Sentry.io kan verwijderd |
| 2.5.0 | 2026-01-19 | Data Sync Agent v2.0 ACTIVATED: 17 scheduled jobs live (13 data sync + 4 core), all components operational |
| 2.4.0 | 2026-01-19 | Platform Health Monitor v1.0 LIVE: 5 health check categorieën, hourly monitoring, alert integration |
| 2.3.0 | 2026-01-19 | MailerLite automation-based email, custom fields, group-trigger flow |
| 2.2.0 | 2026-01-18 | Data Sync Agent v2.0 Enterprise: POI lifecycle, reviews, Q&A, validation |
| 2.1.0 | 2026-01-14 | Fase 2 compleet, Sentry→Bugsink, Threema, EU-compliance |
| 2.0.0 | 2026-01-12 | Merge technische details + agent architectuur |
| 1.0.0 | 2026-01-05 | Origineel: deployment protocol, code conventies |

---

## ⚠️ Belangrijke Notitie voor Toekomstige Sessies

**Dit document (CLAUDE.md) is de SINGLE SOURCE OF TRUTH voor het HolidaiButler Agents project.**

Bij elke nieuwe sessie of na context compaction:
1. Lees ALTIJD eerst dit bestand volledig
2. Verifieer de actuele status in de codebase VOORDAT je status updates geeft
3. Maak GEEN aannames over implementatie status
4. Check `/services/agents/` voor daadwerkelijk geïmplementeerde agents
5. Check `/services/orchestrator/workers.js` voor actieve job handlers

**Enterprise Kwaliteitsstandaarden:**
- Elke feature moet enterprise-level en state-of-the-art zijn
- Geen errors of foutmeldingen bij deployment
- CLAUDE.md updaten na elke relevante wijziging

**Locaties van dit bestand:**
- GitHub: `HolidaiButler/CLAUDE.md` (alle branches)
- Hetzner: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
