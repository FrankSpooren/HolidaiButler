# HolidaiButler Claude Agents - Masterplan v4.0

> **Versie**: 4.0.0
> **Datum**: 27 januari 2026 (13:00 UTC)
> **Status**: Fase 1-5 COMPLEET - Alle agents live (35 scheduled jobs)
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
| 3.3 | 19 Jan 2026 | Platform Health Monitor v1.0 GEACTIVEERD: 5 health check categorieën, hourly monitoring, alert integration met Owner Interface |
| 3.4 | 19 Jan 2026 | HoliBot Sync Agent v1.0 + Communication Flow Agent v1.0 LIVE: ChromaDB vector sync, user journeys, 24 scheduled jobs totaal. Fase 3 nu 87.5% compleet. |
| 3.5 | 19 Jan 2026 | GDPR Agent v1.0 LIVE: Art. 7/15/17/20/30 compliance, data export, erasure (72h), consent management. 4 nieuwe jobs (28 totaal). Fase 3 nu 100% compleet. |
| 3.6 | 19 Jan 2026 | Fase 4 Development Layer v1.0 COMPLEET: UX/UI Reviewer, Code Reviewer, Security Reviewer, Quality Checker. OWASP Top 10, brand compliance. 3 nieuwe jobs (31 totaal). |
| **4.0** | **27 Jan 2026** | **Fase 5 Strategy Layer v1.0 COMPLEET: Architecture Advisor, Learning Agent, Adaptive Config Agent, Prediction Agent. Pattern analysis, predictive alerts. 4 nieuwe jobs (35 totaal). Alle fases compleet!** |

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

### Fase 3: Operations Layer ✅ COMPLEET (100%)

| Agent | Functie | Week | Status |
|-------|---------|------|--------|
| **Platform Health Monitor v1.0** | System monitoring (5 categorieën) | 1 | ✅ Live |
| **Data Sync Agent v2.0** | POI Lifecycle, Reviews, Q&A, Validation | 2 | ✅ Live |
| **HoliBot Sync Agent v1.0** | ChromaDB vector sync voor chatbot | 2 | ✅ Live |
| **Communication Flow Agent v1.0** | User journeys, notifications, MailerLite sync | 3 | ✅ Live |
| **GDPR Agent v1.0** | Privacy compliance (Art. 7, 15, 17, 20, 30) | 4 | ✅ Live |

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

#### HoliBot Sync Agent v1.0 Details (Geactiveerd 19 Jan 2026)

**Components:**
- **ChromaDB Cloud Service**: CloudClient voor vector database connectie
- **Embedding Service**: MistralAI embedding generatie (mistral-embed model)
- **POI Sync Service**: Synchroniseert POI data naar ChromaDB voor vector search
- **Q&A Sync Service**: Synchroniseert Q&A data naar ChromaDB voor vector search
- **Sync Scheduler**: 4 scheduled jobs voor ChromaDB synchronisatie

**Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `holibot-poi-sync` | 06:30 dagelijks | POI sync naar ChromaDB (na Data Sync) |
| `holibot-qa-sync` | 07:00 dagelijks | Q&A sync naar ChromaDB |
| `holibot-full-reindex` | Zondag 04:00 | Volledige ChromaDB reindex |
| `holibot-cleanup` | 05:00 dagelijks | Cleanup deactivated/rejected items |

**ChromaDB Collections:**
- `holidaibutler_pois`: POI vector embeddings voor semantic search
- `holidaibutler_qas`: Q&A vector embeddings voor chatbot context

**Bestanden:**
- `platform-core/src/services/agents/holibotSync/index.js`
- `platform-core/src/services/agents/holibotSync/chromaService.js`
- `platform-core/src/services/agents/holibotSync/embeddingService.js`
- `platform-core/src/services/agents/holibotSync/poiSyncService.js`
- `platform-core/src/services/agents/holibotSync/qaSyncService.js`
- `platform-core/src/services/agents/holibotSync/syncScheduler.js`

#### Communication Flow Agent v1.0 Details (Geactiveerd 19 Jan 2026)

**Components:**
- **User Journey Manager**: Automated customer journeys (welcome, booking, re-engagement, review)
- **MailerLite Service**: Extended email automation, user sync, campaign management
- **Notification Router**: Multi-channel routing (email, Threema) based on urgency
- **Sync Scheduler**: 3 scheduled jobs for communication automation

**User Journey Types:**
| Journey | Beschrijving | Steps |
|---------|--------------|-------|
| `WELCOME` | New user onboarding | Day 0, 2, 7 |
| `BOOKING_CONFIRMATION` | Post-booking flow | Day 0, -3, +1 |
| `RE_ENGAGEMENT` | Inactive user reactivation | Day 30, 60, 90 |
| `REVIEW_REQUEST` | Post-visit review solicitation | Day 1, 7 |

**Scheduled Jobs (3):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `comm-journey-processor` | Elke 15 minuten | Process pending journey emails |
| `comm-user-sync` | 03:00 dagelijks | Sync users to MailerLite |
| `comm-cleanup` | Zondag 04:00 | Cleanup completed journeys (90 days) |

**Database Tables:**
- `user_journeys`: Journey tracking per user
- `journey_scheduled_emails`: Scheduled email queue

**Bestanden:**
- `platform-core/src/services/agents/communicationFlow/index.js`
- `platform-core/src/services/agents/communicationFlow/userJourneyManager.js`
- `platform-core/src/services/agents/communicationFlow/mailerliteService.js`
- `platform-core/src/services/agents/communicationFlow/notificationRouter.js`
- `platform-core/src/services/agents/communicationFlow/syncScheduler.js`

#### GDPR Agent v1.0 Details (Geactiveerd 19 Jan 2026)

**Components:**
- **Data Inventory**: Maps all personal data locations per Art. 30 GDPR
- **Data Exporter**: Handles Art. 15 (Access) and Art. 20 (Portability) requests
- **Data Eraser**: Handles Art. 17 (Right to Erasure) with 72h deadline
- **Consent Manager**: Tracks Art. 7 consent (essential, analytics, personalization, marketing)
- **Sync Scheduler**: 4 scheduled jobs for GDPR compliance monitoring

**GDPR Articles Implemented:**
| Article | Description | Implementation |
|---------|-------------|----------------|
| Art. 7 | Conditions for Consent | Consent tracking per category |
| Art. 15 | Right of Access | Data export (JSON) |
| Art. 17 | Right to Erasure | 72h deadline, owner approval for partners |
| Art. 20 | Data Portability | Portable ZIP/CSV export |
| Art. 30 | Records of Processing | Automated data inventory |

**Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `gdpr-overdue-check` | Elke 4 uur | Check 72h deletion deadline violations |
| `gdpr-export-cleanup` | 03:00 dagelijks | Cleanup old export files (7+ days) |
| `gdpr-retention-check` | 1e van maand 02:00 | Check data retention compliance |
| `gdpr-consent-audit` | Zondag 04:00 | Generate consent statistics report |

**Database Tables:**
- `user_consent`: Consent tracking per user (essential, analytics, personalization, marketing)
- `gdpr_deletion_requests`: Deletion request tracking with approval workflow

**Bestanden:**
- `platform-core/src/services/agents/gdpr/index.js`
- `platform-core/src/services/agents/gdpr/dataInventory.js`
- `platform-core/src/services/agents/gdpr/dataExporter.js`
- `platform-core/src/services/agents/gdpr/dataEraser.js`
- `platform-core/src/services/agents/gdpr/consentManager.js`
- `platform-core/src/services/agents/gdpr/syncScheduler.js`

### Fase 4: Development Layer ✅ COMPLEET (100%)

| Agent | Functie | Status |
|-------|---------|--------|
| **UX/UI Reviewer v1.0** | Interface quality (brand colors, a11y, responsive, UX principles) | ✅ Live |
| **Code Reviewer v1.0** | Code quality (conventions, error handling, performance, docs) | ✅ Live |
| **Security Reviewer v1.0** | Security audits (OWASP Top 10, secrets detection, GDPR) | ✅ Live |
| **Quality Checker v1.0** | Orchestration, lint, tests, dependency audit, CI/CD | ✅ Live |

#### Development Layer Agent v1.0 Details (Geactiveerd 19 Jan 2026)

**Components:**
- **UX/UI Reviewer**: Brand color compliance, typography, WCAG accessibility, responsive design, UX principles (Miller's Law, Hick's Law, Fitts' Law)
- **Code Reviewer**: HolidaiButler conventions, error handling patterns, performance anti-patterns, security patterns, code complexity, documentation
- **Security Reviewer**: OWASP Top 10 2021 checks (A01-Broken Access Control, A02-Cryptographic Failures, A03-Injection, A07-Auth Failures, A10-SSRF), API security (rate limiting, CORS, input validation), authentication patterns, GDPR data protection, hardcoded secrets detection
- **Quality Checker**: Orchestrates all reviewers, ESLint integration, test runner, dependency audit

**Quality Thresholds:**
| Level | Score | Result |
|-------|-------|--------|
| PASS | >= 80% | Approved |
| WARNING | 60-79% | Needs attention |
| FAIL | < 60% | Rejected |
| CRITICAL | Any critical issue | Immediate action required |

**Scheduled Jobs (3):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `dev-security-scan` | 02:00 dagelijks | Full security scan of all projects |
| `dev-dependency-audit` | Zondag 03:00 | Dependency vulnerability audit |
| `dev-quality-report` | Maandag 06:00 | Weekly quality report generation |

**Bestanden:**
- `platform-core/src/services/agents/devLayer/index.js`
- `platform-core/src/services/agents/devLayer/qualityChecker.js`
- `platform-core/src/services/agents/devLayer/syncScheduler.js`
- `platform-core/src/services/agents/devLayer/reviewers/uxReviewer.js`
- `platform-core/src/services/agents/devLayer/reviewers/codeReviewer.js`
- `platform-core/src/services/agents/devLayer/reviewers/securityReviewer.js`

### Fase 5: Strategy Layer ✅ COMPLEET (100%)

| Agent | Functie | Status |
|-------|---------|--------|
| **Architecture Advisor v1.0** | System design recommendations, health assessment | ✅ Live |
| **Learning Agent v1.0** | Pattern analysis, optimization suggestions | ✅ Live |
| **Adaptive Config Agent v1.0** | Dynamic configuration tuning | ✅ Live |
| **Prediction Agent v1.0** | Proactive issue detection, forecasting | ✅ Live |

#### Strategy Layer Agent v1.0 Details (Geactiveerd 27 Jan 2026)

**Components:**
- **Pattern Analyzer**: Shared analysis engine for error patterns (recurring, spikes), performance patterns (degradation, peaks), cost patterns (anomalies, trends), user journey patterns (drop-offs)
- **Architecture Advisor**: 5-category system assessment (stability, performance, cost efficiency, scalability, EU compliance), scored 0-100 per category with overall health score
- **Learning Agent**: Learns from error patterns, performance trends, and usage patterns. In-memory learning store with 30-day retention. Generates optimization suggestions with confidence scores
- **Adaptive Config Agent**: Dynamic configuration tuning with rule-based triggers (HIGH_TRAFFIC, HIGH_ERROR_RATE, LOW_RESOURCES, PEAK_HOURS). Manages rate limiting, queue concurrency, cache TTLs, alert thresholds
- **Prediction Agent**: Proactive issue detection with linear regression trend analysis. Predicts resource exhaustion, error escalation, cost overruns, performance decline. Sends alerts via Owner Interface for high-risk predictions

**Assessment Categories (Architecture Advisor):**
| Category | Weight | Description |
|----------|--------|-------------|
| Stability | 25% | Error rates, uptime, recovery time |
| Performance | 25% | Response times, throughput |
| Cost Efficiency | 20% | Budget utilization, cost per transaction |
| Scalability | 15% | Resource headroom, growth capacity |
| EU Compliance | 15% | GDPR, data sovereignty, EU AI Act |

**Prediction Models:**
| Model | Metric | Alert Threshold |
|-------|--------|----------------|
| Resource Exhaustion | CPU/memory/disk trends | Risk > 0.7 |
| Error Escalation | Error rate acceleration | Risk > 0.6 |
| Cost Overrun | Budget burn rate | Risk > 0.7 |
| Performance Decline | Response time trends | Risk > 0.6 |

**Scheduled Jobs (4):**
| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| `strategy-assessment` | Maandag 06:00 | Weekly architecture assessment |
| `strategy-learning` | 03:00 dagelijks | Learning cycle and optimizations |
| `strategy-prediction` | Elke 6 uur | Predictive analysis for proactive alerts |
| `strategy-config-eval` | Elke 30 minuten | System metrics evaluation and config adaptation |

**Bestanden:**
- `platform-core/src/services/agents/strategyLayer/index.js`
- `platform-core/src/services/agents/strategyLayer/analyzers/patternAnalyzer.js`
- `platform-core/src/services/agents/strategyLayer/architectureAdvisor.js`
- `platform-core/src/services/agents/strategyLayer/learningAgent.js`
- `platform-core/src/services/agents/strategyLayer/adaptiveConfigAgent.js`
- `platform-core/src/services/agents/strategyLayer/predictionAgent.js`
- `platform-core/src/services/agents/strategyLayer/syncScheduler.js`

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

### Laag 2: Operations Layer (Fase 3) ✅ COMPLEET

```
┌─────────────────────────────────────────────────────────────┐
│                   OPERATIONS AGENTS                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Platform Health │  │   Data Sync     │  │  HoliBot    │  │
│  │    Monitor ✅   │  │   Agent ✅      │  │  Sync ✅    │  │
│  │                 │  │                 │  │             │  │
│  │ • Server health │  │ • POI Tier mgmt │  │ • ChromaDB  │  │
│  │ • DB checks     │  │ • Apify scraping│  │ • Embeddings│  │
│  │ • API status    │  │ • Q&A sync      │  │ • MistralAI │  │
│  │ • Portal checks │  │ • Review updates│  │ • Vector DB │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Communication  │  │   GDPR Agent    │                    │
│  │   Flow ✅       │  │      ✅         │                    │
│  │                 │  │                 │                    │
│  │ • User journeys │  │ • 72-hr deletion│                    │
│  │ • MailerLite    │  │ • Data export   │                    │
│  │ • Notifications │  │ • Consent mgmt  │                    │
│  └─────────────────┘  └─────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Laag 3: Development Layer (Fase 4) ✅ COMPLEET

```
┌─────────────────────────────────────────────────────────────┐
│                  DEVELOPMENT AGENTS                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   UX/UI        │  │    Code         │  │  Security   │  │
│  │  Reviewer ✅   │  │   Reviewer ✅   │  │ Reviewer ✅ │  │
│  │                 │  │                 │  │             │  │
│  │ • Brand colors  │  │ • Conventions   │  │ • OWASP T10 │  │
│  │ • Typography    │  │ • Error handler │  │ • Secrets   │  │
│  │ • WCAG a11y     │  │ • Performance   │  │ • API sec   │  │
│  │ • Responsive    │  │ • Complexity    │  │ • GDPR      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                              │
│  ┌─────────────────┐                                         │
│  │   Quality       │                                         │
│  │  Checker ✅     │                                         │
│  │                 │                                         │
│  │ • Orchestration │                                         │
│  │ • ESLint        │                                         │
│  │ • Tests         │                                         │
│  │ • Dep audit     │                                         │
│  └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

### Laag 4: Strategy Layer (Fase 5) ✅ COMPLEET

```
┌─────────────────────────────────────────────────────────────┐
│                   STRATEGY AGENTS                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Architecture   │  │   Learning      │  │  Adaptive   │  │
│  │  Advisor ✅     │  │   Agent ✅      │  │ Config ✅   │  │
│  │                 │  │                 │  │             │  │
│  │ • Stability     │  │ • Error learn   │  │ • Rate limit│  │
│  │ • Performance   │  │ • Perf trends   │  │ • Queue cfg │  │
│  │ • Cost effic.   │  │ • Usage patterns│  │ • Cache TTL │  │
│  │ • Scalability   │  │ • Optimization  │  │ • Alerts    │  │
│  │ • EU Compliance │  │ • Confidence    │  │ • Auto-tune │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Prediction     │  │   Pattern       │                    │
│  │  Agent ✅       │  │  Analyzer ✅    │                    │
│  │                 │  │                 │                    │
│  │ • Resource exh. │  │ • Error spikes  │                    │
│  │ • Error escalat.│  │ • Perf degrad.  │                    │
│  │ • Cost overrun  │  │ • Cost anomaly  │                    │
│  │ • Perf decline  │  │ • Journey drops │                    │
│  └─────────────────┘  └─────────────────┘                    │
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
├── agents/                          # ✅ FASE 3-5 COMPLEET
│   ├── healthMonitor/               # ✅ Platform Health Monitor v1.0
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
│   ├── holibotSync/                 # ✅ Week 2 COMPLEET
│   │   ├── index.js                 # v1.0 Entry point
│   │   ├── chromaService.js         # ChromaDB Cloud client
│   │   ├── embeddingService.js      # MistralAI embeddings
│   │   ├── poiSyncService.js        # POI vector sync
│   │   ├── qaSyncService.js         # Q&A vector sync
│   │   └── syncScheduler.js         # 4 scheduled jobs
│   │
│   ├── communicationFlow/           # ✅ Week 3 COMPLEET
│   │   ├── index.js                 # v1.0 Entry point
│   │   ├── userJourneyManager.js    # User journey automation
│   │   ├── mailerliteService.js     # MailerLite integration
│   │   ├── notificationRouter.js    # Multi-channel routing
│   │   └── syncScheduler.js         # 3 scheduled jobs
│   │
│   ├── gdpr/                        # ✅ GDPR Agent v1.0
│   │   ├── index.js                 # Main entry point
│   │   ├── dataInventory.js         # Art. 30 data mapping
│   │   ├── dataExporter.js          # Art. 15/20 data export
│   │   ├── dataEraser.js            # Art. 17 right to erasure
│   │   ├── consentManager.js        # Art. 7 consent tracking
│   │   └── syncScheduler.js         # 4 scheduled jobs
│   │
│   ├── devLayer/                    # ✅ FASE 4 COMPLEET
│   │   ├── index.js                 # Main entry point
│   │   ├── qualityChecker.js        # Orchestration & CI/CD
│   │   ├── syncScheduler.js         # 3 scheduled jobs
│   │   └── reviewers/
│   │       ├── uxReviewer.js        # UX/UI quality analysis
│   │       ├── codeReviewer.js      # Code standards & patterns
│   │       └── securityReviewer.js  # OWASP Top 10 & security
│   │
│   └── strategyLayer/               # ✅ FASE 5 COMPLEET
│       ├── index.js                 # Main entry point
│       ├── analyzers/
│       │   └── patternAnalyzer.js   # Shared pattern analysis engine
│       ├── architectureAdvisor.js   # System design assessment
│       ├── learningAgent.js         # Pattern learning & optimization
│       ├── adaptiveConfigAgent.js   # Dynamic config tuning
│       ├── predictionAgent.js       # Proactive issue detection
│       └── syncScheduler.js         # 4 scheduled jobs
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
| user_journeys | Journey tracking per user | Communication Flow v1.0 |
| journey_scheduled_emails | Scheduled email queue | Communication Flow v1.0 |
| user_consent | GDPR consent tracking (essential, analytics, personalization, marketing) | GDPR Agent v1.0 |
| gdpr_deletion_requests | Art. 17 deletion requests (72h deadline tracking) | GDPR Agent v1.0 |
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

## 🔄 Scheduled Jobs (Actief - 35 Total)

### Core Jobs (4)

| Job | Schedule | Functie |
|-----|----------|---------|
| `daily-briefing` | 08:00 | Owner briefing email |
| `cost-check` | */6 uur | Budget monitoring |
| `health-check` | */1 uur | System health |
| `weekly-cost-report` | Ma 09:00 | Wekelijks rapport |

### Data Sync Agent v2.0 Jobs (13) ✅ LIVE

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

### HoliBot Sync Agent v1.0 Jobs (4) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `holibot-poi-sync` | 06:30 dagelijks | POI sync naar ChromaDB |
| `holibot-qa-sync` | 07:00 dagelijks | Q&A sync naar ChromaDB |
| `holibot-full-reindex` | Zondag 04:00 | Volledige ChromaDB reindex |
| `holibot-cleanup` | 05:00 dagelijks | Cleanup deactivated items |

### Communication Flow Agent v1.0 Jobs (3) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `comm-journey-processor` | Elke 15 minuten | Process pending journey emails |
| `comm-user-sync` | 03:00 dagelijks | Sync users to MailerLite |
| `comm-cleanup` | Zondag 04:00 | Cleanup completed journeys |

### GDPR Agent v1.0 Jobs (4) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `gdpr-overdue-check` | Elke 4 uur | Check 72h deletion deadline violations |
| `gdpr-export-cleanup` | 03:00 dagelijks | Cleanup old export files (7+ days) |
| `gdpr-retention-check` | 1e van maand 02:00 | Check data retention compliance |
| `gdpr-consent-audit` | Zondag 04:00 | Generate consent statistics report |

### Development Layer Agent v1.0 Jobs (3) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `dev-security-scan` | 02:00 dagelijks | Full security scan of all projects |
| `dev-dependency-audit` | Zondag 03:00 | Dependency vulnerability audit |
| `dev-quality-report` | Maandag 06:00 | Weekly quality report generation |

### Strategy Layer Agent v1.0 Jobs (4) ✅ LIVE

| Job | Schedule | Functie |
|-----|----------|---------|
| `strategy-assessment` | Maandag 06:00 | Weekly architecture assessment |
| `strategy-learning` | 03:00 dagelijks | Learning cycle and optimizations |
| `strategy-prediction` | Elke 6 uur | Predictive analysis for proactive alerts |
| `strategy-config-eval` | Elke 30 minuten | System metrics evaluation and config adaptation |

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
| CLAUDE.md | GitHub repo root | ✅ v3.0.0 (27 Jan 2026) |
| Fase 2 Docs | docs/Agents/fase2/ | ✅ Actueel |
| Fase 4 Docs | docs/Agents/fase4/ | ✅ Actueel |
| Fase 5 Docs | docs/Agents/fase5/ | ✅ Actueel |
| API Docs | docs/api/ | ✅ |
| Deployment Guide | infrastructure/README.md | ✅ |

---

## 📞 Contact & Escalatie

| Rol | Naam | Contact |
|-----|------|---------|
| Owner | Frank Spooren | info@holidaibutler.com |
| Co-Owner | Emiel | (Threema ID pending) |

---

*Dit document is de single source of truth voor de HolidaiButler Claude Agents architectuur. Laatste update: 27 januari 2026 (v4.0.0).*
