# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.41.0
> **Laatst bijgewerkt**: 26 februari 2026
> **Eigenaar**: Frank Spooren
> **Project**: HolidaiButler - AI-Powered Tourism Platform

---

## 🎯 Project Mission

HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen.

### Actieve Bestemmingen
| Bestemming | Status | Domein | destination_id |
|------------|--------|--------|----------------|
| **Calpe** | ✅ LIVE | holidaibutler.com | 1 |
| **Texel** | ✅ LIVE | texelmaps.nl | 2 |
| **Alicante** | 🟡 GEPLAND | alicante.holidaibutler.com | 3 |

---

## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)

> **Dit zijn bindende afspraken voor alle ontwikkeling en implementatie.**

1. **Enterprise Level Kwaliteit**: Elke stap resulteert in een enterprise-level waardig, state-of-the-art product. Geen concessies.
2. **Foutloze Deployments**: Alle errors opgelost VOORDAT een feature als afgerond beschouwd wordt, gepusht wordt naar server of GitHub.
3. **CLAUDE.md Actualisatie**: Na elke aanpassing dit bestand bijwerken, opslaan op Hetzner + pushen naar GitHub.
4. **Context Verificatie**: CLAUDE.md + Master Strategie lezen, actuele status verifiëren in codebase, geen aannames.
5. **Geen Workarounds**: Problemen oplossen bij de root cause.
6. **Staging-First Workflow**: Content wijzigingen eerst naar `poi_content_staging`, review door Frank, dan pas naar POI tabel.

---

## 👤 Over de Eigenaar

**Frank Spooren** is een strategisch marketeer, GEEN developer.
- Leg technische zaken **altijd begrijpelijk** uit
- Geef **stap-voor-stap instructies** waar nodig
- Benoem **risico's en impact** duidelijk
- Vraag bij twijfel **altijd bevestiging** voordat je kritieke acties uitvoert
- Email: **info@holidaibutler.com**

---

## 📋 Strategische Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| **Master Strategie** | `docs/strategy/HolidaiButler_Master_Strategie.md` | 7.8 |
| **Agent Masterplan** | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 4.2.0 |
| **CLAUDE.md** | Repository root + Hetzner | 3.41.0 |
| **CLAUDE_HISTORY.md** | Repository root | 1.0.0 |

> **CLAUDE_HISTORY.md** bevat volledige fase-resultaten, changelogs en bestandslijsten per fase. Raadpleeg dit bestand ALLEEN wanneer historische details nodig zijn.

---

## 🏗️ Repository Structuur

```
HolidaiButler/
├── CLAUDE.md                    # Dit bestand (compact project context)
├── CLAUDE_HISTORY.md            # Volledige fase-resultaten archief
├── .claude/                     # Claude Agent configuratie
├── .github/workflows/
│   ├── deploy-platform-core.yml # CI/CD backend
│   └── deploy-admin-module.yml  # CI/CD admin portal
├── docs/strategy/
│   └── HolidaiButler_Master_Strategie.md
├── customer-portal/frontend/    # React 19 + Tailwind
│   └── src/ (components, pages, hooks, utils)
├── admin-module/                # React 18 + MUI 5 (admin.holidaibutler.com)
│   └── src/ (api, components, hooks, pages, stores, i18n, utils)
├── platform-core/               # Node.js/Express backend
│   └── src/
│       ├── routes/ (holibot.js, adminPortal.js v3.9.0)
│       ├── services/
│       │   ├── holibot/         # HoliBot 2.0 (RAG Chatbot)
│       │   ├── orchestrator/    # BullMQ scheduler, workers, costController, auditTrail, ownerInterface
│       │   └── agents/          # 18 agents (base/, healthMonitor/, dataSync/, holibotSync/, etc.)
│       ├── middleware/ (auth.js met RBAC, rate limiting, IP whitelist)
│       └── config/destinations/  # calpe.config.js, texel.config.js, alicante.config.js
└── infrastructure/ (apache vhosts, docker)
```

---

## 🌍 Multi-Destination Architectuur

### Configuratie
| Destination | ID | Domein | Branding |
|-------------|----|---------| ---------|
| Calpe | 1 | holidaibutler.com | #7FA594 / #5E8B7E |
| Texel | 2 | texelmaps.nl | #30c59b / #3572de / #ecde3c |
| Alicante | 3 | alicante.holidaibutler.com | TBD |

### Database Multi-Tenancy
Alle tabellen met destination-specifieke data hebben `destination_id` kolom: POI, QnA, agenda, Users, user_journeys, holibot_sessions, poi_content_staging, reviews.

### Routing
```
Request → Apache VHost → X-Destination-ID Header → getDestinationFromRequest() → destination_id voor queries
```
`getDestinationFromRequest()` accepteert string ("texel") en numeric (2) IDs.

---

## 🗃️ Database Schema

### Server Verbinding
```
Host: jotx.your-database.de | DB: pxoziy_db1 | User: pxoziy_1 | Password: j8,DrtshJSm$
```
> **Let op**: Credentials `pxoziy_1_w` / `i9)PUR^2k=}!` zijn FOUT — geven ACCESS DENIED.

### POI Content Kolommen
| Kolom | Beschrijving |
|-------|--------------|
| enriched_tile_description_en | Korte beschrijving (tile) |
| enriched_detail_description | EN content (base — backend leest DEZE kolom) |
| enriched_detail_description_en | EN backup (niet door backend gelezen) |
| enriched_detail_description_es/de/nl | Vertalingen |
| enriched_highlights | Key highlights |

### POI Coverage
| Destination | Actief | EN/NL/DE/ES | Coverage |
|-------------|--------|-------------|----------|
| Calpe | 1.538 | 1.483 | 96% |
| Texel | 1.660 | 1.596 | 96% |
| **Totaal** | **3.198** | **3.079** | **96%** |

### POI Images
- Calpe: 13.704 imageurls, 8.3 GB, pad: `/poi-images/{poi_id}/{hash}.jpg`
- Texel: 11.506 imageurls, 4.1 GB, pad: `/poi-images/texel/{google_placeid}/image_N.jpg`
- `IMAGE_BASE_URL` in `.env`: `https://test.holidaibutler.com`
- `getBestUrl()` in `ImageUrl.js`: prefereert `local_path`, fallback `image_url`

### Content Staging Schema
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| poi_id | INT | FK naar POI.id |
| destination_id | INT | 1=Calpe, 2=Texel |
| content_source | VARCHAR | 'mistral_medium_fase4', 'vvv_texel', 'poi_website', 'calpe_es' |
| status | ENUM | 'pending', 'approved', 'rejected', 'applied', 'review_required' |
| comparison_recommendation | ENUM | 'USE_NEW', 'KEEP_OLD', 'MANUAL_REVIEW' |

---

## 🤖 HoliBot / Tessa — AI Chatbot

### Architectuur
```
User → X-Destination-ID → destinationConfig.holibot.chromaCollection → ChromaDB Cloud → RAG → Mistral LLM → SSE
```

| Destination | Naam | Collection | Vectoren | Embedding |
|-------------|------|------------|----------|-----------|
| Calpe | HoliBot | calpe_pois | 43.086 | mistral-embed (1024d) |
| Texel | Tessa | texel_pois | 101.364 | mistral-embed (1024d) |

### Key Files
- Backend: `holibot.js`, `chromaService.js`, `embeddingService.js`, `ragService.js`, `conversationService.js`, `intentService.js`, `suggestionService.js`
- Frontend: `vite.config.ts` (holibot config), `DestinationContext.tsx`, `WelcomeMessage.tsx`, `ChatHeader.tsx`, `ChatMessage.tsx`

### Taalregels
| Destination | Regel |
|-------------|-------|
| Texel EN/NL/DE | "on/op/auf Texel" (NIET "in Texel") |
| Calpe EN/ES/DE/NL | "in Calpe" |

---

## 📈 Implementatie Status

### Fase Overzicht (alle ✅ COMPLEET)
| Fase | Beschrijving | Datum | Key Output |
|------|--------------|-------|------------|
| 1 | Foundation (DB schema, config) | 28-01 | Multi-tenant DB |
| 2 | Texel Deployment (DNS, SSL, data) | 29-01 | texelmaps.nl live |
| 3 | Texel Data Quality | 02-02 | Data cleanup |
| 3b | LLM Content Pilot (100 POIs) | 05-02 | Mistral pipeline |
| 4 | Full LLM Content Run (2.515 POIs) | 05-02 | €8.93, 100% success |
| 4b | Content Vergelijking (OLD vs NEW) | 06-02 | 98.6% approved |
| 5 | Content Apply & Translation | 07-02 | 4-talen live |
| 5b-5c | Frontend Verificatie + Image Fix | 08-02 | Texel compleet |
| 6 | AI Chatbot Texel "Tessa" | 08-02 | 94.980 vectoren |
| 6b-6e | Chatbot fixes (3 rounds) | 09-11-02 | Routing, icons, spacing, images |
| R1 | Content Damage Assessment | 12-02 | 61% hallucinatie → NO-GO |
| R2 | Source Data Verrijking | 12-02 | 3.079 fact sheets |
| R3 | Prompt Redesign (anti-hallucinatie) | 13-02 | 61%→14% hallucinatie |
| R4 | Regeneratie + Verificatie (3.079 POIs) | 13-02 | 19.5% hallucinatie |
| R5 | Safeguards & Kwaliteitsborging | 16-02 | 1.730 gepromoveerd |
| R6 | Content Completion & Vertaling | 18-02 | 9.066 vertalingen |
| R6b | Content Quality Hardening | 19-02 | 2.047 claim-stripped |
| R6c | ChromaDB Re-vectorisatie | 19-02 | 12.316 vectoren |
| R6d | Openstaande Acties | 19-02 | 388 POIs markdown fix |
| 7 | Reviews Integratie | 19-02 | 8.964 reviews live |
| 8A | Agent Reparatie (7 agents) | 20-02 | 18/18 healthy |
| 8A+ | Monitoring & Briefing (3 modules, 5 jobs) | 20-02 | 40 scheduled jobs |
| 8B | Agent Multi-Destination (BaseAgent) | 20-02 | 18 agents dest-aware |
| 8C-0 | Admin Portal Foundation | 20-02 | 6 endpoints, CI/CD |
| 8C-1 | Agent Dashboard | 20-02 | GET /agents/status |
| 8D | Admin Portal Feature Pack | 20-02 | 19 endpoints |
| 8D-FIX | Bug Fix (12 bugs) | 21-02 | Frontend-backend alignment |
| 8E | Hardening & UX (4 blokken) | 21-02 | i18n DE/ES, content audit |
| 9A | Enhancement (RBAC, Config, Dark Mode) | 21-02 | 35 endpoints |
| 9A-FIX | Login Fix (rate limiter, lockout) | 22-02 | 15req/15min |
| 9B | Bug Fix & UX (6 P0, 13 UX, pageviews) | 22-02 | 37 endpoints |
| 9C | Live Verificatie (4-tab agent popup) | 22-02 | 38 endpoints |
| 9D | Zero-Tolerance (8 persistent bugs) | 22-02 | Audit trail fix |
| 9E | Persistent Failures Definitief | 22-02 | RBAC + MailerSend |
| 9F | Admin Definitief + RBAC | 24-02 | 41 endpoints, v3.6.0 |
| 9G | Agent Fixes + RBAC Verificatie | 24-02 | v3.7.0 |
| 9H | Audit & Command (JOB_ACTOR_MAP) | 24-02 | v3.8.0 |
| 9I | UX Polish + Analytics | 25-02 | v3.9.0 |

> **Volledige resultaatdetails per fase**: zie **CLAUDE_HISTORY.md**

---

## 🤖 Agent Systeem

### 18 Agents (15 agents + 3 monitoring modules)
| # | Agent | Naam | Categorie | Type | Schedule |
|---|-------|------|-----------|------|----------|
| 1 | Orchestrator | De Maestro | Core | A (dest) | Continuous |
| 2 | Owner Interface | De Bode | Core | A | Daily 08:00 |
| 3 | Health Monitor | De Dokter | Operations | A | Daily |
| 4 | Data Sync | De Koerier | Operations | A | Tier-based |
| 5 | HoliBot Sync | Het Geheugen | Operations | A | Daily + Sunday |
| 6 | Communication Flow | De Gastheer | Operations | A | Daily |
| 7 | GDPR | De Poortwachter | Operations | A | Daily |
| 8 | UX/UI | De Stylist | Development | B (shared) | Weekly |
| 9 | Code | De Corrector | Development | B | Weekly |
| 10 | Security | De Bewaker | Development | B | Weekly |
| 11 | Quality | De Inspecteur | Development | A | Weekly |
| 12 | Architecture | De Architect | Strategy | B | Monthly |
| 13 | Learning | De Leermeester | Strategy | A | Daily |
| 14 | Adaptive Config | De Thermostaat | Strategy | A | Every 30 min |
| 15 | Prediction | De Weermeester | Strategy | A | Daily |
| — | Content Quality | (module) | Monitoring | A | Monday 05:00 |
| — | Backup Health | (module) | Monitoring | B | Daily 07:30 |
| — | Smoke Test | (module) | Monitoring | A | Daily 07:45 |

**Type A** = destination-aware (`runForDestination(id)`), **Type B** = shared/platform-breed (`execute()`)

### BaseAgent Pattern
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper voor bestaande agent singletons
- `agentRegistry.js`: Centrale registratie 18 entries

### Scheduled Jobs: 40 totaal
- BullMQ queue: `scheduled-tasks`
- Workers: `src/services/orchestrator/workers.js` (incl. JOB_ACTOR_MAP voor correct agent attribution)

### Bekende Agent Issues (9I Audit)
- **Agent config tasks**: Datacorruptie 7e cyclus — taaknamen overschreven met placeholders "Task 2-6"
- **Dashboard "17 Gezond"**: Betekent "jobs crashen niet", NIET "agents leveren waarde"
- **Aspirationele agents**: De Stylist (★☆), De Corrector (★☆), De Architect (★★), De Leermeester (★★), De Thermostaat (★★) — naam belooft meer dan functionaliteit
- **Geplande upgrades**: npm audit, OWASP ZAP, Puppeteer/Lighthouse, ESLint (Fase 10A-D)

---

## 🖥️ Admin Portal

### Architectuur
- **Frontend**: React 18 + MUI 5 + Vite 4 + Zustand 4 + React Query
- **Backend**: Geïntegreerd in platform-core (`adminPortal.js` v3.9.0)
- **Auth**: JWT (8h access + 7d refresh), bcrypt, RBAC (4 rollen)
- **i18n**: NL (default), EN, DE, ES
- **Endpoints**: 41 admin endpoints

### RBAC Rollen
| Rol | Scope | Rechten |
|-----|-------|---------|
| platform_admin | Alle destinations | Volledig + user management + rate limiter exempt |
| poi_owner | Eigen destination | CRUD POIs + reviews + analytics |
| content_editor | Eigen destination | Edit POIs + reviews (geen delete/users) |
| content_reviewer | Eigen destination | Read-only |

### Key Middleware
- `adminAuth`: JWT verificatie + rol extractie
- `destinationScope`: Filtert data op basis van rol + destination
- `writeAccess`: Blokkeert schrijfacties voor content_reviewer
- `adminApiRateLimiter`: 300 req/15min, platform_admin exempt via IP whitelist + JWT bypass
- Rate limiter: 15 req/15min login, account lockout 10 attempts/5min

### Admin User
- Email: admin@holidaibutler.com
- Password: HolidaiAdmin2026
- Wachtwoord: enterprise 7-punts policy

---

## 📈 POI Tier Strategie

### Score: `(review_count × 0.30) + (avg_rating × 0.20) + (tourist_relevance × 0.30) + (booking_frequency × 0.20)`

| Tier | Score | Frequentie | Max POIs |
|------|-------|-----------|----------|
| 1 | ≥ 8.0 | Dagelijks 06:00 | 25 |
| 2 | ≥ 7.0 | Wekelijks | 250 |
| 3 | ≥ 5.0 | Maandelijks | 1.000 |
| 4 | < 5.0 | Kwartaal | Onbeperkt |

### Browse View Filters
Rating ≥ 4.0, reviews ≥ 3, tile description required, ≥ 3 images, exclusies: laadpunten/begraafplaatsen/accommodatie.

---

## 🔒 Security & Compliance

### GDPR: Verwijdering 72h, audit trail 30d, export 24h
### EU AI Act: Transparantie, menselijke controle, bias monitoring

### EU-First Infrastructure
| Component | Locatie | Provider |
|-----------|---------|----------|
| Server + DB | 🇩🇪 | Hetzner (91.98.71.87) |
| Monitoring | 🇳🇱 | Bugsink |
| Email | 🇱🇹 | MailerLite |
| Alerts | 🇨🇭 | Threema |
| LLM | 🇫🇷 | Mistral AI |
| Vector DB | — | ChromaDB Cloud |

---

## 🖥️ Server Informatie

### SSH: `ssh root@91.98.71.87`

### Belangrijke Paden
| Pad | Beschrijving |
|-----|--------------|
| `/var/www/api.holidaibutler.com/platform-core/` | Backend |
| `/var/www/holidaibutler.com/customer-portal/` | Calpe frontend |
| `/var/www/texelmaps.nl/customer-portal/` | Texel frontend |
| `/var/www/api.holidaibutler.com/storage/poi-images/` | POI images |
| `/var/www/admin.holidaibutler.com/` | Admin portal (prod) |
| `/var/www/admin.test.holidaibutler.com/` | Admin portal (test) |
| `/var/www/admin.dev.holidaibutler.com/` | Admin portal (dev) |
| `/root/backups/` | Database backups |
| `/root/fase*` | Fase output bestanden |

### Quick Health Check Commands
```bash
pm2 status                    # PM2 processes
redis-cli ping                # Redis
# BullMQ jobs (verwacht: 40)
cd /var/www/api.holidaibutler.com/platform-core
node -e "const { Queue } = require('bullmq'); const Redis = require('ioredis'); async function c() { const conn = new Redis(); const q = new Queue('scheduled-tasks', { connection: conn }); const jobs = await q.getRepeatableJobs(); console.log('Jobs:', jobs.length); await q.close(); await conn.quit(); } c();"
```

---

## 📞 Contact & Escalatie

| Urgentie | Kanaal |
|----------|--------|
| 1-3 (Info-Medium) | MailerLite email |
| 4 (Hoog) | Priority email |
| 5 (Kritiek) | Email + Threema |

**Owner Email**: info@holidaibutler.com | **Threema**: V9VUJ8K6

---

## 📋 Changelog (laatste 3 versies)

| Versie | Datum | Samenvatting |
|--------|-------|-------------|
| **3.41.0** | **2026-02-26** | **CLAUDE.md herstructurering**: Gesplitst in compact CLAUDE.md (~550 regels) + CLAUDE_HISTORY.md (volledig archief). Doel: ~75% minder context usage in Claude Code sessies. Versie cross-refs bijgewerkt. |
| **3.40.0** | 2026-02-25 | Fase 9I: 7 items (dark mode contrast, analytics granulatie, agent profiel sync, scheduledJobs i18n, JOB_ACTOR_MAP +3). adminPortal.js v3.9.0. |
| **3.39.0** | 2026-02-24 | Fase 9H: 4 items (agent config race condition, De Dokter JOB_ACTOR_MAP, 509 Accommodation POIs inactive, pageviews granulatie). adminPortal.js v3.8.0. |

> **Volledige changelog (v3.0.0 - v3.38.0)**: zie CLAUDE_HISTORY.md

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 7.8 |
| Agent Masterplan | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 4.2.0 |
| Fase History | `CLAUDE_HISTORY.md` | 1.0.0 |
| API Docs | `docs/api/` | — |
| Deployment Guide | `infrastructure/README.md` | — |

---

**Dit document (CLAUDE.md) is de SINGLE SOURCE OF TRUTH voor het HolidaiButler project.**

Bij elke nieuwe sessie:
1. Lees dit bestand
2. Raadpleeg Master Strategie voor actuele fase + beslissingen
3. Raadpleeg CLAUDE_HISTORY.md ALLEEN als historische details nodig zijn
4. Verifieer actuele status in codebase — geen aannames

**Locaties**:
- GitHub: `HolidaiButler/CLAUDE.md` (alle branches)
- Hetzner: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
