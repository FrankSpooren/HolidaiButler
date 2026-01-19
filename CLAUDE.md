# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 2.4.0
> **Laatst bijgewerkt**: 19 januari 2026 (13:50 UTC)  
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
│       └── deploy-holibot.yml  # CI/CD workflow
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
│   │   │       └── dataSync/      # ✅ Data Sync Agent v2.0
│   │   │           ├── index.js
│   │   │           ├── syncScheduler.js
│   │   │           ├── poiLifecycleManager.js
│   │   │           ├── reviewsManager.js
│   │   │           ├── qaGenerator.js
│   │   │           ├── dataValidator.js
│   │   │           └── syncReporter.js
│   │   └── middleware/
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
│       └── fase3/          # ⏳ Specialized agents
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
| **GitHub Actions** | `.github/workflows/deploy-holibot.yml` |

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

### DevOps
| Tool | Doel |
|------|------|
| Docker + Docker Compose | Containerization |
| Vitest, Jest, Playwright | Testing |
| ESLint + Prettier | Linting |
| GitHub Actions | CI/CD |
| BullMQ | Job scheduling |
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
MISTRAL_API_KEY=             # HoliBot LLM

# EU-Compliant Services
MAILERLITE_API_KEY=          # Email marketing (EU)
THREEMA_GATEWAY_ID=          # Critical alerts (CH)
THREEMA_SECRET=              # Threema API secret
OWNER_THREEMA_ID=            # Owner Threema ID

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
| ChromaDB | Vector database | 🇩🇪 Hetzner | ✅ |
| MistralAI | Chatbot LLM | 🇫🇷 Frankrijk | ✅ |
| MailerLite | Email flows | 🇱🇹 EU | ✅ |
| **Bugsink** | **Error monitoring** | 🇳🇱 **Nederland (self-hosted)** | ✅ |
| Threema | Critical alerts | 🇨🇭 Zwitserland | ✅ |
| Apify | Data scraping | - | ✅ |
| Adyen | Betalingen | 🇳🇱 Nederland | ✅ |

### ⚠️ Verwijderde Services

| Service | Reden | Vervanger |
|---------|-------|-----------|
| Sentry.io | US bedrijf, CLOUD Act risico | Bugsink (NL) |
| SMS alerts | Kosten, privacy concerns | Threema (CH) |

---

## 📊 Database Structuur

### MySQL (Hetzner - pxoziy_db1 database)
| Tabel | Beschrijving | Sync Frequentie |
|-------|--------------|-----------------|
| POIs | Points of Interest (+ status, tier_score, duplicate_hash) | Tier-based |
| Q&As | AI-generated Q&A pairs (NL/EN/ES, approval workflow) | Maandelijks |
| Reviews | Reviews met sentiment analysis, spam scores | Wekelijks/Maandelijks |
| Users | Klantaccounts | Realtime |
| AdminUsers | Partner accounts | Realtime |
| agenda | Events | Dagelijks |
| agenda_dates | Event datums | Bij event update |
| Tickets | Ticketverkoop | Realtime |
| Transactions | Betalingen | Realtime |

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

### ChromaDB (Vector Database)
- POI embeddings
- Q&A embeddings
- Semantic search indices

---

## 🤖 Claude Agents Architectuur

### Fase 2 - Core Layer ✅ COMPLEET

| Agent | Functie | Status |
|-------|---------|--------|
| **Orchestrator Agent** | Centrale coördinatie + Cost Controller | ✅ Live |
| **Owner Interface Agent** | Email + Threema communicatie | ✅ Live |

#### Orchestrator Components
- BullMQ Scheduler (17 recurring jobs)
- Cost Controller (€515/maand budget)
- Audit Trail (30 dagen retention)

#### Owner Interface Components
- MailerLite Email Service (Automation-based)
- Threema Gateway (urgency 5)
- Daily Briefing (08:00)

#### MailerLite Automation Configuratie
**Methode:** Group-trigger automation (Growing Business plan compatible)
- **Trigger:** Subscriber joins group "System Alerts Owner"
- **Flow:** API removes → updates fields → re-adds subscriber → automation triggers
- **Limiet:** 1 email per 24 uur per subscriber (MailerLite platform limiet)
- **Template:** Vaste template met dynamic fields via personalization

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

### Fase 3 - Operations Layer ⏳ IN PROGRESS (50% Compleet)

| Agent | Functie | Status |
|-------|---------|--------|
| **Platform Health Monitor v1.0** | System monitoring (5 categorieën) | ✅ Live |
| **Data Sync Agent v2.0** | POI Lifecycle, Reviews, Q&A, Validation | ✅ Live |
| Communication Flow Agent | Email automation | ⏳ Planned |
| GDPR Agent | Privacy compliance | ⏳ Planned |

#### Platform Health Monitor v1.0 Components (NIEUW - 19 Jan 2026)
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

### Fase 4 - Development Layer 📅 PLANNED

| Agent | Functie |
|-------|---------|
| UX/UI Reviewer | Interface kwaliteit |
| Code Reviewer | Code quality |
| Security Reviewer | Security audits |
| Quality Checker | Tests & linting |

**Volledige specificaties**: Zie `docs/agents/` en `CLAUDE_AGENTS_MASTERPLAN_v3.md`

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

---

## 🌍 Multi-Destination Support

### Huidige Bestemmingen
1. **Calpe** (Costa Blanca, Spanje) - Primary
2. **Texel** (Nederland) - Secondary

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
| Agent Masterplan | `CLAUDE_AGENTS_MASTERPLAN_v3.md` |
| Fase 2 Docs | `docs/agents/fase2/` |
| Fase 3 Docs | `docs/agents/fase3/` |
| API Documentatie | `docs/api/` |
| Deployment Guide | `infrastructure/README.md` |
| Contributing Guide | `CONTRIBUTING.md` |

---

## 📋 Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **2.4.0** | **2026-01-19** | **Platform Health Monitor v1.0 LIVE: 5 health check categorieën, hourly monitoring, alert integration** |
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

**Locaties van dit bestand:**
- GitHub: `HolidaiButler/CLAUDE.md` (alle branches)
- Hetzner: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
