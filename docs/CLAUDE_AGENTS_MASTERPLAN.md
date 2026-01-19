# HolidaiButler Claude Agents - Masterplan v3.0

> **Versie**: 3.3.0
> **Datum**: 19 januari 2026 (13:50 UTC)
> **Status**: Fase 2 Compleet, Fase 3 50% Compleet (Health Monitor + Data Sync Agent)
> **Eigenaar**: Frank Spooren

---

## 📋 Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| 1.0 | Dec 2025 | Origineel concept met agent suggesties |
| 2.0 | Jan 2026 | Technische details + deployment protocol |
| 3.0 | 14 Jan 2026 | Fase 1-2 resultaten, EU-compliance updates, geactualiseerde architectuur |
| 3.1 | 18 Jan 2026 | Data Sync Agent v2.0 Enterprise: POI lifecycle, reviews, Q&A, validation |
| 3.2 | 19 Jan 2026 | MailerLite automation-based email: group-trigger flow, custom fields, template config |
| **3.3** | **19 Jan 2026** | **Platform Health Monitor v1.0 GEACTIVEERD: 5 health check categorieën, hourly monitoring, alert integration met Owner Interface** |

---

## 🎯 Project Overzicht

### Missie
HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen.

### Huidige Bestemmingen
- **Costa Blanca** (Calpe/Alicante) - Primary
- **Texel** (Nederland) - Secondary

### Kernwaarden
- ✅ **Personalisatie**: AI-driven aanbevelingen
- ✅ **Kwaliteit**: Enterprise-level UX
- ✅ **Betrouwbaarheid**: Accurate, actuele data
- ✅ **Privacy**: GDPR-compliant, EU AI Act ready
- ✅ **EU-First**: Alle infrastructuur EU-gehost

---

## 🏗️ Architectuur Overzicht

### Infrastructuur Stack (Geactualiseerd)

| Component | Platform | Locatie | Status |
|-----------|----------|---------|--------|
| **Server** | Hetzner VPS | 🇩🇪 Duitsland | ✅ Live |
| **Database (SQL)** | MySQL | 🇩🇪 Hetzner | ✅ Live |
| **Database (NoSQL)** | MongoDB | 🇩🇪 Hetzner | ✅ Live |
| **Cache** | Redis 7.0.15 | 🇩🇪 Hetzner | ✅ Live |
| **Queue** | BullMQ | 🇩🇪 Hetzner | ✅ Live |
| **Vector DB** | ChromaDB | 🇩🇪 Hetzner | ✅ Live |
| **Error Monitoring** | Bugsink | 🇳🇱 Nederland | ✅ Live |
| **Email** | MailerLite | 🇱🇹 Litouwen (EU) | ✅ Live |
| **Alerts (Critical)** | Threema Gateway | 🇨🇭 Zwitserland | ✅ Live |

### ⚠️ Belangrijke Wijziging: Sentry → Bugsink

**Beslissing (13 Jan 2026)**: Sentry.io vervangen door Bugsink voor EU-compliance.

| Aspect | Sentry.io (Oud) | Bugsink (Nieuw) |
|--------|-----------------|-----------------|
| Bedrijf | 🇺🇸 USA | 🇳🇱 Nederland |
| GDPR | ⚠️ CLOUD Act risico | ✅ Volledig compliant |
| Data locatie | EU datacenter (US bedrijf) | 🇩🇪 Self-hosted Hetzner |
| Kosten | €0-29+/maand | €0 (self-hosted) |
| SDK | @sentry/node | @sentry/node (compatible) |

**Bugsink Details**:
- URL: https://errors.holidaibutler.com
- Server: 91.98.71.87 (Hetzner)
- Admin: Geconfigureerd
- Projects: API, Customer Portal, Admin Portal

---

## 🔧 Externe Services & API Keys

### Actieve Integraties

| Service | Functie | API Key Identifier | Status |
|---------|---------|-------------------|--------|
| **MistralAI** | HoliBot LLM | `HolidaiButler-HoliBot NEW (171125)` | ✅ |
| **MailerLite** | Email campagnes | `HolidaiButler NEW (171125)` | ✅ |
| **Apify** | Google Places scraping | Personal Token | ✅ |
| **Hetzner** | Server management | Claude API Toegang | ✅ |
| **Threema** | Critical alerts | Gateway *HOL1791 | ✅ |
| **Bugsink** | Error monitoring | Self-hosted (geen key) | ✅ |
| **Adyen** | Betalingen | Web SDK | ✅ |

### Verwijderde/Vervangen Services

| Service | Reden | Vervanger |
|---------|-------|-----------|
| Sentry.io | US bedrijf, CLOUD Act | Bugsink (NL) |
| SMS alerts | Kosten, privacy | Threema (CH) |

---

## 📊 Implementatie Status

### Fase 1: Foundation ✅ COMPLEET

| Component | Status | Datum |
|-----------|--------|-------|
| Repository structuur | ✅ | Dec 2025 |
| CI/CD pipeline | ✅ | Dec 2025 |
| Database schema | ✅ | Dec 2025 |
| Basic API endpoints | ✅ | Dec 2025 |

### Fase 2: Core Agents ✅ COMPLEET

| Component | Status | Datum | Details |
|-----------|--------|-------|---------|
| **Bugsink Migration** | ✅ | 13 Jan 2026 | EU-compliant error monitoring |
| **Redis Setup** | ✅ | 13 Jan 2026 | v7.0.15, localhost:6379 |
| **BullMQ Orchestrator** | ✅ | 13 Jan 2026 | 4 scheduled jobs |
| **Cost Controller** | ✅ | 13 Jan 2026 | MongoDB tracking, €515/maand budget |
| **Audit Trail** | ✅ | 13 Jan 2026 | 30 dagen retention |
| **Owner Interface** | ✅ | 13 Jan 2026 | Email + Threema alerts |
| **Daily Briefing** | ✅ | 13 Jan 2026 | 08:00 Amsterdam |
| **Threema Integration** | ✅ | 13 Jan 2026 | Urgency 5 alerts |
| **MailerLite Automation** | ✅ | 19 Jan 2026 | Group-trigger flow, custom fields |

### Fase 3: Specialized Agents ⏳ IN PROGRESS (50% Compleet)

| Agent | Functie | Week | Status |
|-------|---------|------|--------|
| **Platform Health Monitor v1.0** | System monitoring (5 categorieën) | 1 | ✅ Live |
| **Data Sync Agent v2.0** | POI Lifecycle, Reviews, Q&A, Validation | 2 | ✅ Live |
| Communication Flow Agent | MailerLite automation | 3 | ⏳ Planned |
| GDPR Agent | Privacy compliance | 4 | ⏳ Planned |
| Development Agents | Code/Security review | 5-6 | ⏳ Planned |

#### Platform Health Monitor v1.0 Details (Geactiveerd 19 Jan 2026)

**Health Check Categorieën:**
- **Server Health**: Ping (91.98.71.87), CPU/memory usage, disk space
- **Database Health**: MySQL, MongoDB, Redis connection status
- **API Health**: HolidaiButler API, MistralAI, Apify, ChromaDB, Bugsink
- **Frontend Health**: Production, test, dev, admin portals (latency tracking)
- **Queue Health**: BullMQ queues, worker status monitoring

**Features:**
- Full health check: Alle 5 categorieën (17+ individuele checks)
- Quick health check: Kritieke systemen only (server, mysql, redis, api)
- Alert Integration: Automatische koppeling met Owner Interface Agent
- Cooldown System: Intelligent throttling per urgency level
- History Tracking: Laatste 100 checks opgeslagen

**Scheduled Jobs:**
- `health-check`: Elk uur via BullMQ (cron: `0 * * * *`)

**Bestanden:**
- `platform-core/src/services/agents/healthMonitor/index.js`
- `platform-core/src/services/agents/healthMonitor/reporter.js`
- `platform-core/src/services/agents/healthMonitor/alertIntegration.js`
- `platform-core/src/services/agents/healthMonitor/checks/*.js` (5 files)

#### Data Sync Agent v2.0 Details (Compleet 18 Jan 2026)

**Enterprise Modules:**
- **POI Lifecycle Manager**: Creation, deactivation (30-day grace), duplicate detection, auto-categorization
- **Reviews Manager**: Sentiment analysis (NL/EN/ES), spam detection, 2-year retention policy
- **Q&A Generator**: AI-powered multi-language generation, approval workflow, priority ranking
- **Data Validator**: Schema validation, referential integrity, automatic rollback (>10% failures)
- **Sync Reporter**: Daily/weekly health reports, quality scores, email digests

**Scheduled Jobs (13 Enterprise Jobs):**
- POI Sync: Tier 1 (daily), Tier 2 (weekly), Tier 3 (monthly), Tier 4 (quarterly)
- Review Sync: Tier 1-2 (weekly), Tier 3-4 (monthly), Retention (weekly)
- Q&A Sync: Tier 1-2 (monthly), Tier 3-4 (quarterly)
- Lifecycle: Deactivation check (daily)
- Reporting: Health report (daily/weekly)

**Database Migration**: 009_data_sync_agent_enterprise.sql deployed to pxoziy_db1

### Fase 4: Strategy Agents 📅 PLANNED

| Agent | Functie | Status |
|-------|---------|--------|
| Architecture Agent | System design | 📅 |
| Learning Agent | Analytics & insights | 📅 |
| Adaptive Agent | Future planning | 📅 |

---

## 🤖 Agent Architectuur (Definitief)

### Laag 1: Core Layer (Fase 2) ✅

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   BullMQ    │  │    Cost     │  │    Audit Trail      │  │
│  │  Scheduler  │  │  Controller │  │    (MongoDB)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              OWNER INTERFACE AGENT                       ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  ││
│  │  │  MailerLite │  │   Threema   │  │ Daily Briefing  │  ││
│  │  │   (Email)   │  │  (Critical) │  │    (08:00)      │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### MailerLite Automation Configuratie (19 Jan 2026)

**Methode:** Group-trigger automation (Growing Business plan compatible)

| Aspect | Waarde |
|--------|--------|
| **Trigger Group** | System Alerts Owner |
| **Group ID** | 176972381290498029 |
| **Subscriber** | info@holidaibutler.com |
| **Re-enter limiet** | 24 uur per subscriber |

**Flow:**
1. API verwijdert subscriber uit trigger group (axios DELETE)
2. API update subscriber custom fields (axios PUT)
3. API voegt subscriber toe aan trigger group (axios POST)
4. MailerLite automation triggert automatisch
5. Email wordt verzonden met gepersonaliseerde template

**Custom Fields:**

| Field | Type | Beschrijving |
|-------|------|--------------|
| `last_system_alert` | Text | Email subject |
| `last_alert_time` | Text | Timestamp (ISO) |
| `briefing_date` | Text | Datum (Nederlands formaat) |
| `budget_spent` | Text | Uitgegeven bedrag (€) |
| `budget_percentage` | Text | % van budget |
| `budget_total` | Text | Totaal budget (€) |
| `budget_remaining` | Text | Resterend budget (€) |
| `jobs_count` | Text | Jobs uitgevoerd (24u) |
| `alerts_count` | Text | Alerts (24u) |
| `errors_count` | Text | Errors (24u) |
| `pending_count` | Text | Items pending approval |
| `status_summary` | Text | Status tekst met emoji |

**Template Configuratie:**
- Gebruik MailerLite personalization function: `{$field_name}`
- Voorbeeld: `{$briefing_date}`, `{$budget_spent}`, `{$status_summary}`
- Template is vaste HTML, alleen velden zijn dynamisch

### Laag 2: Operations Layer (Fase 3)

```
┌─────────────────────────────────────────────────────────────┐
│                   OPERATIONS AGENTS                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Platform Health │  │   Data Sync     │  │  HoliBot    │  │
│  │    Monitor      │  │     Agent       │  │   Sync      │  │
│  │                 │  │                 │  │             │  │
│  │ • Server health │  │ • POI Tier mgmt │  │ • ChromaDB  │  │
│  │ • DB checks     │  │ • Apify scraping│  │ • Embeddings│  │
│  │ • API status    │  │ • Q&A sync      │  │ • MistralAI │  │
│  │ • Portal checks │  │ • Review updates│  │             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Communication  │  │    Content &    │  │   Disaster  │  │
│  │   Flow Agent    │  │  Branding Agent │  │   Recovery  │  │
│  │                 │  │                 │  │             │  │
│  │ • User emails   │  │ • Brand check   │  │ • Backups   │  │
│  │ • Admin emails  │  │ • Tone of voice │  │ • Recovery  │  │
│  │ • Notifications │  │ • Consistency   │  │ • Failover  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Laag 3: Compliance Layer (Fase 3-4)

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPLIANCE AGENTS                          │
│  ┌─────────────────────────────────┐  ┌─────────────────┐   │
│  │      GDPR / Data Rights         │  │   EU AI Act     │   │
│  │                                 │  │   Compliance    │   │
│  │ • 72-uur deletion              │  │                 │   │
│  │ • Data export                  │  │ • Transparency  │   │
│  │ • Consent management           │  │ • Human control │   │
│  │ • Audit logging                │  │ • Bias monitor  │   │
│  └─────────────────────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Laag 4: Development Layer (Fase 3-4)

```
┌─────────────────────────────────────────────────────────────┐
│                  DEVELOPMENT AGENTS                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UX/UI     │  │    Code     │  │     Security        │  │
│  │  Reviewer   │  │   Reviewer  │  │     Reviewer        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Quality   │  │    Test &   │  │      Tech Lead      │  │
│  │   Checker   │  │  Validation │  │       Agent         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Budget Configuratie (Fase 2)

### Maandelijks Budget: €515

| Service | Budget | Type | Tracking |
|---------|--------|------|----------|
| Claude API | €300 | Variabel | Cost Controller |
| Apify | €100 | Variabel | Cost Controller |
| MistralAI | €50 | Variabel | Cost Controller |
| Hetzner | €50 | Fixed | - |
| MailerLite | €15 | Fixed | - |

### Alert Thresholds

| Level | Percentage | Actie |
|-------|------------|-------|
| Info | 50% | Log only |
| Warning | 75% | Email alert |
| High | 90% | Priority email |
| Critical | 100% | Email + Threema |

---

## 📞 Urgency & Alert Routing

### Urgency Levels

| Level | Naam | Kanaal | Response Time |
|-------|------|--------|---------------|
| 1 | Informatief | Daily Digest | Wekelijks |
| 2 | Laag | Email | 24 uur |
| 3 | Medium | Email | 4 uur |
| 4 | Hoog | Email (priority) | 1 uur |
| 5 | Kritiek | Email + Threema | Direct |

### Urgency 5 Triggers

- Production server down
- Security breach detected
- Data leak possibility
- Budget 100% exceeded + hard limit
- Database connection lost
- Critical API failure (MistralAI, Apify)

### Owner Contact

- **Email**: info@holidaibutler.com
- **Threema ID (Frank)**: V9VUJ8K6
- **Threema ID (Emiel)**: Pending (vakantie januari)

---

## 📁 Code Structuur (Geactualiseerd)

```
platform-core/src/services/
├── orchestrator/                    # ✅ FASE 2 COMPLEET
│   ├── index.js                     # Orchestrator entry point
│   ├── queues.js                    # BullMQ queue definities
│   ├── scheduler.js                 # Scheduled jobs (4 active)
│   ├── workers.js                   # Job workers
│   │
│   ├── costController/              # ✅ Budget tracking
│   │   ├── index.js
│   │   ├── budgetConfig.js          # €515/maand config
│   │   ├── costTracker.js           # API cost logging
│   │   └── models/
│   │       └── CostLog.js           # MongoDB model
│   │
│   ├── auditTrail/                  # ✅ Comprehensive logging
│   │   ├── index.js
│   │   ├── auditLogger.js           # Logging functionaliteit
│   │   └── models/
│   │       └── AuditLog.js          # MongoDB model (30d retention)
│   │
│   └── ownerInterface/              # ✅ Owner communication
│       ├── index.js
│       ├── emailService.js          # MailerLite integration
│       ├── dailyBriefing.js         # 08:00 briefing
│       └── alertHandler.js          # Urgency routing + Threema
│
├── agents/                          # FASE 3
│   ├── healthMonitor/               # ⏳ Week 1
│   │   ├── index.js
│   │   ├── checks/
│   │   │   ├── serverHealth.js
│   │   │   ├── databaseHealth.js
│   │   │   ├── apiHealth.js
│   │   │   ├── frontendHealth.js
│   │   │   └── queueHealth.js
│   │   ├── reporter.js
│   │   └── alertIntegration.js
│   │
│   ├── dataSync/                    # ✅ Week 2 COMPLEET
│   │   ├── index.js                 # v2.0 Entry point
│   │   ├── syncScheduler.js         # 13 scheduled jobs
│   │   ├── poiLifecycleManager.js   # Creation, deactivation, duplicates
│   │   ├── reviewsManager.js        # Sentiment, spam, retention
│   │   ├── qaGenerator.js           # AI-powered Q&A generation
│   │   ├── dataValidator.js         # Schema validation, rollback
│   │   └── syncReporter.js          # Health reports, alerts
│   │
│   ├── communicationFlow/           # ⏳ Week 3
│   ├── gdprAgent/                   # ⏳ Week 4
│   └── devAgents/                   # ⏳ Week 5-6
│       ├── uxReviewer/
│       ├── codeReviewer/
│       ├── securityReviewer/
│       └── qualityChecker/
│
└── holibot/                         # Bestaand
    ├── ragService.js
    ├── embeddingService.js
    └── chromaService.js
```

---

## 🗄️ Database Tabellen

### MySQL (Hetzner - pxoziy_db1)

| Tabel | Beschrijving | Agent |
|-------|--------------|-------|
| POIs | Points of Interest (+ status, tier_score, duplicate_hash) | Data Sync v2.0 |
| Q&As | AI-generated Q&A pairs (source, status, priority) | Data Sync v2.0 |
| Reviews | Reviews (sentiment_score, sentiment_label, spam_score) | Data Sync v2.0 |
| Users | Klantaccounts | Communication Flow |
| AdminUsers | Partner accounts | Communication Flow |
| agenda | Events | Data Sync |
| agenda_dates | Event datums | Data Sync |
| Tickets | Ticketverkoop | - |
| Transactions | Betalingen | - |

#### POI Enterprise Columns (v2.0)
- `status`: ENUM('active','pending_deactivation','deactivated','merged')
- `pending_deactivation_date`: DATE - 30-day grace period tracking
- `duplicate_hash`: VARCHAR(32) - MD5 for duplicate detection
- `tier_score`: DECIMAL(5,2) - Calculated tier score (0-10)

#### Reviews Enterprise Columns (v2.0)
- `sentiment_score`: DECIMAL(3,2) - Range -1.0 to 1.0
- `sentiment_label`: ENUM('positive','negative','neutral')
- `spam_score`: DECIMAL(3,2) - Range 0.0 to 1.0

#### Q&A Enterprise Columns (v2.0)
- `source`: ENUM('manual','ai_generated','imported')
- `status`: ENUM('draft','pending_review','approved','rejected')
- `priority`: INT(1) - Importance 1-5

### MongoDB (Mongoose)

| Collection | Beschrijving | Retention |
|------------|--------------|-----------|
| cost_logs | API cost tracking | 90 dagen |
| audit_logs | Agent action logs | 30 dagen |
| chat_logs | HoliBot conversations | Configurable |

### HoliBot Tabellen (MySQL)

| Tabel | Beschrijving |
|-------|--------------|
| holibot_fallbacks | Fallback responses |
| holibot_learned_preferences | User preferences |
| holibot_messages | Chat messages |
| holibot_poi_clicks | POI interactions |
| holibot_poi_ratings | POI ratings |
| holibot_sessions | Chat sessions |
| holibot_user_preferences | Explicit preferences |

---

## 🔄 Scheduled Jobs (Actief - 17 Total)

### Core Jobs (Fase 2)

| Job | Schedule | Functie |
|-----|----------|---------|
| `daily-briefing` | 08:00 | Owner briefing email |
| `cost-check` | */6 uur | Budget monitoring |
| `health-check` | */1 uur | System health |
| `weekly-cost-report` | Ma 09:00 | Wekelijks rapport |

### Data Sync Agent v2.0 Jobs (Fase 3) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `poi-sync-tier1` | Dagelijks 06:00 | Tier 1 POI sync (max 25) |
| `poi-sync-tier2` | Maandag 06:00 | Tier 2 POI sync (max 250) |
| `poi-sync-tier3` | 1e vd maand 06:00 | Tier 3 POI sync (max 1000) |
| `poi-sync-tier4` | Kwartaal (Jan/Apr/Jul/Oct) | Tier 4 POI sync |
| `poi-tier-recalc` | Zondag 03:00 | Tier herberekening |
| `review-sync-tier12` | Woensdag 05:00 | Tier 1-2 review sync |
| `review-sync-tier34` | 15e vd maand 05:00 | Tier 3-4 review sync |
| `review-retention` | Zondag 02:00 | 2-jaar retention enforcement |
| `qa-sync-tier12` | 1e vd maand 04:00 | Tier 1-2 Q&A generation |
| `qa-sync-tier34` | Kwartaal 04:00 | Tier 3-4 Q&A generation |
| `poi-deactivation-check` | Dagelijks 01:00 | Grace period processing |
| `health-report-daily` | Dagelijks 07:00 | Daily health report |
| `health-report-weekly` | Maandag 07:00 | Weekly health report + alerts |

---

## 📋 POI Tier Strategie

### Score Berekening

```javascript
score = (review_count × 0.30) + 
        (average_rating × 0.20) + 
        (tourist_relevance × 0.30) + 
        (booking_frequency × 0.20)
```

### Tier Classificatie (Geactualiseerd v2.0)

| Tier | Score | Update Frequentie | Max POIs | Beschrijving |
|------|-------|-------------------|----------|--------------|
| 1 | ≥ 8.0 | Dagelijks 06:00 | 25 | Top attractions, balanced categories |
| 2 | ≥ 7.0 | Wekelijks (maandag) | 250 | Popular + critical practical POIs |
| 3 | ≥ 5.0 | Maandelijks (1e) | 1000 | Standard POIs |
| 4 | < 5.0 | Kwartaal (Jan/Apr/Jul/Oct) | Onbeperkt | Low priority |

---

## 🔐 Security & Compliance

### GDPR Compliance

| Requirement | Implementation | Agent |
|-------------|----------------|-------|
| Data deletion | 72 uur na verzoek | GDPR Agent |
| Data export | 24 uur na verzoek | GDPR Agent |
| Consent tracking | Users tabel | Communication Flow |
| Audit trail | 30 dagen retention | Audit Trail |

### EU AI Act Compliance

| Requirement | Implementation |
|-------------|----------------|
| Transparantie | Duidelijke AI disclosure |
| Menselijke controle | Owner approval workflows |
| Bias monitoring | Learning Agent |

### Infrastructuur Security

| Aspect | Implementatie |
|--------|---------------|
| Data sovereignty | 100% EU-gehost |
| Error monitoring | Bugsink (NL, self-hosted) |
| Alerts | Threema (CH, E2E encrypted) |
| Email | MailerLite (EU) |

---

## 🌐 Omgevingen

| Omgeving | Customer Portal | Admin Portal | API |
|----------|-----------------|--------------|-----|
| **Production** | holidaibutler.com | admin.holidaibutler.com | api.holidaibutler.com |
| **Test** | test.holidaibutler.com | admin.test.holidaibutler.com | api.test.holidaibutler.com |
| **Development** | dev.holidaibutler.com | admin.dev.holidaibutler.com | api.dev.holidaibutler.com |

### Git Workflow

| Branch | Omgeving | Auto-deploy |
|--------|----------|-------------|
| `main` | Production | Ja (na approval) |
| `test` | Test/Staging | Ja |
| `dev` | Development | Ja |

---

## ⚠️ Kritieke Regels

### NOOIT doen:
- ❌ Direct naar `main` pushen zonder approval
- ❌ API keys in code of documenten hardcoden
- ❌ Dependencies updaten zonder impact check
- ❌ Database schema's wijzigen zonder migratie
- ❌ User data verwijderen zonder GDPR protocol
- ❌ US-based services gebruiken voor EU user data
- ❌ Sentry.io of andere US monitoring tools

### ALTIJD doen:
- ✅ Tests draaien voor commit
- ✅ Owner notificeren bij kritieke wijzigingen
- ✅ Audit trail bijhouden
- ✅ EU-compliant services gebruiken
- ✅ Cost tracking voor API calls
- ✅ Error logging naar Bugsink

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Status |
|----------|---------|--------|
| CLAUDE.md | GitHub repo root | ✅ v2.3.0 (19 Jan 2026) |
| Fase 2 Docs | docs/agents/fase2/ | ✅ Actueel |
| Fase 3 Prompts | docs/agents/fase3/ | ⏳ Ready |
| API Docs | docs/api/ | ✅ |
| Deployment Guide | infrastructure/README.md | ✅ |

---

## 📞 Contact & Escalatie

| Rol | Naam | Contact |
|-----|------|---------|
| Owner | Frank Spooren | info@holidaibutler.com |
| Co-Owner | Emiel | (Threema ID pending) |

---

*Dit document is de single source of truth voor de HolidaiButler Claude Agents architectuur. Laatste update: 19 januari 2026.*
