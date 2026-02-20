# HolidaiButler Claude Agents - Masterplan v4.2

> **Versie**: 4.2.0
> **Datum**: 20 februari 2026
> **Status**: Fase 8A + 8A+ + 8B COMPLEET — 18 agents (13 destination-aware, 5 shared), 40 scheduled jobs, BaseAgent pattern
> **Eigenaar**: Frank Spooren

---

## 📊 Executive Summary (Voor Partners & Investeerders)

### Platform Status: VOLLEDIG OPERATIONEEL ✅

HolidaiButler heeft een volledig geautomatiseerd AI-agents ecosysteem geïmplementeerd dat 24/7 draait op enterprise-level EU-gehoste infrastructuur. Het systeem omvat:

| Metric | Waarde |
|--------|--------|
| **Actieve AI Agents** | 18 geregistreerd (15 agents + 3 monitoring modules) |
| **Scheduled Jobs** | 40 geautomatiseerde taken |
| **Uptime Target** | 99.9% |
| **EU Compliance** | 100% GDPR & EU AI Act ready |
| **Maandelijks Budget** | €515 (volledig gecontroleerd) |

### Technische Differentiatie

1. **100% EU-Hosted**: Geen US CLOUD Act risico's - alle data binnen EU
2. **Predictieve AI**: Proactieve issue detectie voordat problemen escaleren
3. **Self-Learning**: Systeem optimaliseert zichzelf op basis van patronen
4. **Enterprise Security**: OWASP Top 10 compliance, dagelijkse security scans
5. **Schaalbaar**: Architectuur ondersteunt multi-destination uitbreiding

### Implementatie Tijdlijn

```
Dec 2025  ████████████████  Foundation (Complete)
Jan 2026  ████████████████  Core Agents (Complete)
          ████████████████  Operations Layer (Complete)
          ████████████████  Development Layer (Complete)
          ████████████████  Strategy Layer (Complete)
```

**Resultaat**: Van concept naar volledig operationeel enterprise platform in <2 maanden.

---

## 📋 Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **4.1** | **28 Jan 2026** | **HoliBot Sync bugfix (SQL kolommen gecorrigeerd), alle 35 jobs operationeel met 0 failures. MASTERPLAN finaal voor partners/investeerders.** |
| 4.0 | 27 Jan 2026 | Fase 5 Strategy Layer COMPLEET: Architecture Advisor, Learning Agent, Adaptive Config Agent, Prediction Agent. 35 jobs totaal. Alle fases compleet! |
| 3.6 | 19 Jan 2026 | Fase 4 Development Layer COMPLEET: UX/UI, Code, Security Reviewers + Quality Checker. 31 jobs. |
| 3.5 | 19 Jan 2026 | GDPR Agent v1.0 LIVE: Art. 7/15/17/20/30 compliance. 28 jobs. Fase 3 100% compleet. |
| 3.4 | 19 Jan 2026 | HoliBot Sync + Communication Flow Agents LIVE. 24 jobs. |
| 3.3 | 19 Jan 2026 | Platform Health Monitor v1.0 GEACTIVEERD. |
| 3.2 | 19 Jan 2026 | MailerLite automation configuratie. |
| 3.1 | 18 Jan 2026 | Data Sync Agent v2.0 Enterprise. |
| 3.0 | 14 Jan 2026 | Fase 1-2 resultaten, EU-compliance updates. |
| 2.0 | Jan 2026 | Technische details + deployment protocol. |
| 1.0 | Dec 2025 | Origineel concept. |

---

## 🎯 Project Overzicht

### Missie
HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen.

### Huidige Bestemmingen
- **Costa Blanca** (Calpe/Alicante) - Primary
- **Texel** (Nederland) - Secondary

### Kernwaarden
| Waarde | Status | Implementatie |
|--------|--------|---------------|
| **Personalisatie** | ✅ | AI-driven aanbevelingen via HoliBot |
| **Kwaliteit** | ✅ | Enterprise-level UX met automated reviews |
| **Betrouwbaarheid** | ✅ | 35 scheduled jobs voor data actualiteit |
| **Privacy** | ✅ | GDPR Agent + EU-only infrastructuur |
| **EU-First** | ✅ | 100% EU-gehoste services |

---

## 🏗️ Architectuur Overzicht

### Infrastructuur Stack

| Component | Platform | Locatie | Status | Kosten |
|-----------|----------|---------|--------|--------|
| **Server** | Hetzner VPS | 🇩🇪 Duitsland | ✅ Live | €50/mnd |
| **Database (SQL)** | MySQL | 🇩🇪 Hetzner | ✅ Live | Incl. |
| **Database (NoSQL)** | MongoDB | 🇩🇪 Hetzner | ✅ Live | Incl. |
| **Cache** | Redis 7.0.15 | 🇩🇪 Hetzner | ✅ Live | Incl. |
| **Queue** | BullMQ | 🇩🇪 Hetzner | ✅ Live | Incl. |
| **Vector DB** | ChromaDB Cloud | Cloud | ✅ Live | Incl. |
| **Error Monitoring** | Bugsink | 🇳🇱 Nederland | ✅ Live | €0 |
| **Email** | MailerLite | 🇱🇹 EU | ✅ Live | €15/mnd |
| **Alerts (Critical)** | Threema Gateway | 🇨🇭 Zwitserland | ✅ Live | ~€5/mnd |

### EU Compliance: Waarom Dit Belangrijk Is

| Aspect | US-Based (Bijv. Sentry.io) | EU-Based (HolidaiButler) |
|--------|---------------------------|-------------------------|
| **CLOUD Act** | ⚠️ US overheid kan data opvragen | ✅ Niet van toepassing |
| **GDPR** | ⚠️ Complexe DPA's nodig | ✅ Native compliant |
| **Data Sovereignty** | ⚠️ Data kan US bereiken | ✅ 100% binnen EU |
| **Investeerders** | ⚠️ Due diligence risico | ✅ Clean compliance |

---

## 🔧 Externe Services & API Keys

### Actieve Integraties

| Service | Functie | Locatie | Status |
|---------|---------|---------|--------|
| **MistralAI** | HoliBot LLM + Embeddings | 🇫🇷 Frankrijk | ✅ |
| **MailerLite** | Email campagnes | 🇱🇹 Litouwen | ✅ |
| **Apify** | Google Places scraping | - | ✅ |
| **Hetzner** | Server management | 🇩🇪 Duitsland | ✅ |
| **Threema** | Critical alerts (E2E encrypted) | 🇨🇭 Zwitserland | ✅ |
| **Bugsink** | Error monitoring (self-hosted) | 🇳🇱 Nederland | ✅ |
| **Adyen** | Betalingen | 🇳🇱 Nederland | ✅ |
| **ChromaDB Cloud** | Vector database | Cloud | ✅ |

---

## 📊 Implementatie Status: COMPLEET

### Fase 1: Foundation ✅ COMPLEET (Dec 2025)

| Component | Status |
|-----------|--------|
| Repository structuur | ✅ |
| CI/CD pipeline (GitHub Actions) | ✅ |
| Database schema (MySQL + MongoDB) | ✅ |
| Basic API endpoints | ✅ |

### Fase 2: Core Agents ✅ COMPLEET (Jan 2026)

| Component | Status | Functie |
|-----------|--------|---------|
| **BullMQ Orchestrator** | ✅ | Centrale job scheduling |
| **Cost Controller** | ✅ | Budget tracking €515/mnd |
| **Audit Trail** | ✅ | 30 dagen logging |
| **Owner Interface** | ✅ | Email + Threema alerts |
| **Daily Briefing** | ✅ | 08:00 automatisch rapport |
| **MailerLite Automation** | ✅ | Dual-group rotation |

### Fase 3: Operations Layer ✅ COMPLEET (Jan 2026)

| Agent | Functie | Jobs | Status |
|-------|---------|------|--------|
| **Platform Health Monitor v1.0** | System monitoring (5 categorieën) | 1 | ✅ Live |
| **Data Sync Agent v2.0** | POI, Reviews, Q&A management | 13 | ✅ Live |
| **HoliBot Sync Agent v1.0** | ChromaDB vector sync | 4 | ✅ Live |
| **Communication Flow Agent v1.0** | User journeys, notifications | 3 | ✅ Live |
| **GDPR Agent v1.0** | Privacy compliance | 4 | ✅ Live |

### Fase 4: Development Layer ✅ COMPLEET (Jan 2026)

| Agent | Functie | Status |
|-------|---------|--------|
| **UX/UI Reviewer v1.0** | Brand compliance, WCAG accessibility | ✅ Live |
| **Code Reviewer v1.0** | Conventions, error handling, performance | ✅ Live |
| **Security Reviewer v1.0** | OWASP Top 10, secrets detection | ✅ Live |
| **Quality Checker v1.0** | Orchestration, ESLint, tests, audits | ✅ Live |

### Fase 5: Strategy Layer ✅ COMPLEET (Jan 2026)

| Agent | Functie | Status |
|-------|---------|--------|
| **Architecture Advisor v1.0** | System design recommendations | ✅ Live |
| **Learning Agent v1.0** | Pattern analysis, optimization | ✅ Live |
| **Adaptive Config Agent v1.0** | Dynamic configuration tuning | ✅ Live |
| **Prediction Agent v1.0** | Proactive issue detection | ✅ Live |

---

## 🔄 Multi-Destination Pattern (Fase 8B)

### BaseAgent & destinationRunner

Alle agents zijn destination-aware gemaakt via twee complementaire patterns:

| Bestand | Beschrijving |
|---------|-------------|
| `src/services/agents/base/BaseAgent.js` | Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()` |
| `src/services/agents/base/destinationRunner.js` | Mixin helper die `runForDestination()` toevoegt aan bestaande singletons |
| `src/services/agents/base/agentRegistry.js` | Centrale registratie van alle 18 agents met metadata (naam, categorie, type) |

### Agent Classificatie (18 entries)

| Categorie | Agents | Pattern | Beschrijving |
|-----------|--------|---------|-------------|
| **A: Destination-Aware** (13) | Maestro, Bode, Dokter, Koerier, Geheugen, Gastheer, Poortwachter, Inspecteur, Leermeester, Thermostaat, Weermeester, Content Quality, Smoke Test | `runForDestination(id)` | Draait per destination |
| **B: Shared** (5) | Stylist, Corrector, Bewaker, Architect, Backup Health | `execute()` | Platform-breed, draait 1x |

### Scheduled Jobs: 40 totaal

Fase 8A+ voegde 5 nieuwe jobs toe (35→40):
- `content-quality-audit` (Monday 05:00)
- `backup-recency-check` (Daily 07:30)
- `smoke-test` (Daily 07:45)
- `chromadb-state-snapshot` (Sunday 03:00)
- `agent-success-rate` (Monday 05:30)

---

## 🤖 Agent Architectuur (Visueel)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRATEGY LAYER (Fase 5)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Architecture │ │   Learning   │ │   Adaptive   │ │ Prediction │ │
│  │   Advisor    │ │    Agent     │ │    Config    │ │   Agent    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────┴───────────────────────────────────┐
│                   DEVELOPMENT LAYER (Fase 4)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │   UX/UI      │ │    Code      │ │   Security   │ │  Quality   │ │
│  │  Reviewer    │ │   Reviewer   │ │   Reviewer   │ │  Checker   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────┴───────────────────────────────────┐
│                   OPERATIONS LAYER (Fase 3)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │   Platform   │ │  Data Sync   │ │   HoliBot    │ │Communication│
│  │Health Monitor│ │    Agent     │ │    Sync      │ │    Flow    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│  ┌──────────────┐                                                   │
│  │    GDPR      │                                                   │
│  │    Agent     │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────┴───────────────────────────────────┐
│                      CORE LAYER (Fase 2)                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR AGENT                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐ │  │
│  │  │   BullMQ    │  │    Cost     │  │     Audit Trail       │ │  │
│  │  │  Scheduler  │  │  Controller │  │      (MongoDB)        │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  OWNER INTERFACE AGENT                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐ │  │
│  │  │  MailerLite │  │   Threema   │  │   Daily Briefing      │ │  │
│  │  │   (Email)   │  │  (Critical) │  │      (08:00)          │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Scheduled Jobs Overzicht (35 Totaal)

### Job Verdeling per Agent

| Agent | Aantal Jobs | Frequentie Range |
|-------|-------------|------------------|
| Core (Orchestrator) | 4 | Uurlijks - Wekelijks |
| Data Sync Agent | 13 | Dagelijks - Kwartaal |
| HoliBot Sync Agent | 4 | Dagelijks - Wekelijks |
| Communication Flow | 3 | 15 min - Wekelijks |
| GDPR Agent | 4 | 4 uur - Maandelijks |
| Development Layer | 3 | Dagelijks - Wekelijks |
| Strategy Layer | 4 | 30 min - Wekelijks |
| **Totaal** | **35** | |

### Dagelijkse Job Schedule

```
00:00 ─────────────────────────────────────────────────
01:00  poi-deactivation-check
02:00  dev-security-scan, gdpr-retention-check (1e vd mnd)
03:00  poi-tier-recalc (zo), comm-user-sync, strategy-learning
       dev-dependency-audit (zo), gdpr-export-cleanup
04:00  qa-sync, holibot-full-reindex (zo), gdpr-consent-audit (zo)
       comm-cleanup (zo)
05:00  review-sync, holibot-cleanup
06:00  poi-sync-tier1/2/3/4, strategy-assessment (ma), dev-quality-report (ma)
06:30  holibot-poi-sync
07:00  holibot-qa-sync, health-report-daily/weekly
08:00  daily-briefing ──── Owner ontvangt dagelijks rapport
09:00  weekly-cost-report (ma)
─────────────────────────────────────────────────────
       health-check (elk uur)
       cost-check (elke 6 uur)
       strategy-config-eval (elke 30 min)
       strategy-prediction (elke 6 uur)
       gdpr-overdue-check (elke 4 uur)
       comm-journey-processor (elke 15 min)
```

---

## 💰 Budget & Cost Control

### Maandelijks Budget: €515

| Service | Budget | Type | Tracking |
|---------|--------|------|----------|
| Claude API | €300 | Variabel | Cost Controller |
| Apify | €100 | Variabel | Cost Controller |
| MistralAI | €50 | Variabel | Cost Controller |
| Hetzner | €50 | Fixed | - |
| MailerLite | €15 | Fixed | - |

### Automatische Alert Thresholds

| Level | Budget % | Actie |
|-------|----------|-------|
| Info | 50% | Log only |
| Warning | 75% | Email alert |
| High | 90% | Priority email |
| Critical | 100% | Email + Threema |

---

## 🔐 Security & Compliance

### GDPR Compliance Matrix

| GDPR Artikel | Vereiste | Implementatie | Agent |
|--------------|----------|---------------|-------|
| Art. 7 | Consent | Consent tracking per categorie | GDPR Agent |
| Art. 15 | Right of Access | Data export (JSON) binnen 24u | GDPR Agent |
| Art. 17 | Right to Erasure | Verwijdering binnen 72u | GDPR Agent |
| Art. 20 | Data Portability | ZIP/CSV export | GDPR Agent |
| Art. 30 | Processing Records | Automatische data inventory | GDPR Agent |

### Security Measures

| Categorie | Implementatie | Frequentie |
|-----------|---------------|------------|
| **OWASP Top 10** | Automated security scans | Dagelijks |
| **Dependency Audit** | Vulnerability scanning | Wekelijks |
| **Secrets Detection** | Hardcoded credentials check | Per commit |
| **API Security** | Rate limiting, CORS, validation | Realtime |
| **E2E Encryption** | Threema voor critical alerts | Realtime |

### EU AI Act Readiness

| Vereiste | Status | Implementatie |
|----------|--------|---------------|
| Transparantie | ✅ | AI disclosure in chatbot |
| Menselijke controle | ✅ | Owner approval workflows |
| Bias monitoring | ✅ | Learning Agent tracking |
| Risk classification | ✅ | Low-risk tourism recommendation |

---

## 🗄️ Database Architectuur

### MySQL Tabellen (Primary Data)

| Tabel | Records | Agent | Beschrijving |
|-------|---------|-------|--------------|
| POI | ~1,600 | Data Sync | Points of Interest |
| QA | Variable | Data Sync | AI-generated Q&A pairs |
| Reviews | Variable | Data Sync | Sentiment-analyzed reviews |
| Users | Variable | Comm Flow | Klantaccounts |
| user_journeys | Variable | Comm Flow | Journey tracking |
| user_consent | Variable | GDPR | Consent per categorie |
| gdpr_deletion_requests | Variable | GDPR | 72u deadline tracking |

### MongoDB Collections (Operational Data)

| Collection | Retention | Beschrijving |
|------------|-----------|--------------|
| cost_logs | 90 dagen | API cost tracking |
| audit_logs | 30 dagen | Agent action logs |
| chat_logs | Configurable | HoliBot conversations |

### ChromaDB Collections (Vector Data)

| Collection | Beschrijving | Sync |
|------------|--------------|------|
| holidaibutler_pois | POI embeddings voor semantic search | Dagelijks 06:30 |
| holidaibutler_qas | Q&A embeddings voor chatbot | Dagelijks 07:00 |

---

## 📈 Key Performance Indicators

### System Health (Target vs Actual)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | 99.9% | 99.9%+ | ✅ |
| Failed Jobs | 0 | 0 | ✅ |
| Response Time | <500ms | ~200ms | ✅ |
| Error Rate | <0.1% | <0.05% | ✅ |

### Automation Coverage

| Area | Manual Before | Automated Now | Savings |
|------|---------------|---------------|---------|
| Health Monitoring | Dagelijks | Elk uur | 8+ uur/dag |
| Data Sync | Wekelijks | Dagelijks-Kwartaal | 20+ uur/week |
| Security Scans | Maandelijks | Dagelijks | 4+ uur/maand |
| GDPR Compliance | Per request | Automatisch | 2+ uur/request |
| Reporting | Handmatig | Dagelijks 08:00 | 5+ uur/week |

---

## 🚀 Roadmap & Schaalbaarheid

### Multi-Destination Expansion

De architectuur ondersteunt eenvoudige uitbreiding naar nieuwe bestemmingen:

| Stap | Effort | Beschrijving |
|------|--------|--------------|
| 1. Data Collection | 2-4 weken | POI scraping voor nieuwe bestemming |
| 2. Q&A Generation | 1-2 weken | AI-generated content |
| 3. Vector Indexing | 1 dag | ChromaDB sync |
| 4. Configuration | 1 dag | Destination settings |

### Potentiële Uitbreidingen

| Feature | Prioriteit | Architectuur Ready |
|---------|------------|-------------------|
| Nieuwe bestemmingen | Hoog | ✅ |
| Multi-language support | Medium | ✅ (NL/EN/ES/DE/SV/PL) |
| Partner portal | Medium | ✅ |
| White-label oplossing | Laag | ✅ |
| Mobile app | Laag | ✅ (API ready) |

---

## 📞 Contact & Escalatie

### Ownership

| Rol | Naam | Contact |
|-----|------|---------|
| Owner/Founder | Frank Spooren | info@holidaibutler.com |
| Technical Lead | Claude Agents | Automated |

### Alert Routing

| Urgentie | Kanaal | Response Time |
|----------|--------|---------------|
| 1-3 (Info-Medium) | Email | 24-4 uur |
| 4 (Hoog) | Priority Email | 1 uur |
| 5 (Kritiek) | Email + Threema | Direct |

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Status |
|----------|---------|--------|
| CLAUDE.md (Project Context) | GitHub repo root | ✅ v3.1.1 |
| Fase 2 Documentation | docs/Agents/fase2/ | ✅ |
| Fase 4 Documentation | docs/Agents/fase4/ | ✅ |
| Fase 5 Documentation | docs/Agents/fase5/ | ✅ |
| API Documentation | docs/api/ | ✅ |
| Deployment Guide | infrastructure/README.md | ✅ |

---

## ✅ Conclusie

HolidaiButler beschikt over een **volledig operationeel, enterprise-level AI-agents ecosysteem** dat:

1. **24/7 autonoom draait** met 35 scheduled jobs
2. **100% EU-compliant** is (GDPR + EU AI Act ready)
3. **Zichzelf optimaliseert** via Learning Agent en Adaptive Config
4. **Proactief problemen detecteert** via Prediction Agent
5. **Automatisch rapporteert** via Daily Briefing
6. **Schaalbaar is** voor multi-destination uitbreiding

Het platform is **investment-ready** met clean compliance, gedocumenteerde architectuur, en bewezen operationele stabiliteit.

---

*Dit document is de single source of truth voor de HolidaiButler Claude Agents architectuur.*
*Laatste update: 28 januari 2026 (v4.1.0)*
*Volgende review: Bij significante wijzigingen of nieuwe fase*
