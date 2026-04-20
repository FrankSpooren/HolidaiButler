# HolidaiButler Master Strategie
## Multi-Destination Architecture & Texel 100% Implementatie

**Datum**: 20 april 2026
**Versie**: 8.14
**Eigenaar**: Frank Spooren
**Auteur**: Claude (Strategic Analysis & Implementation)
**Classificatie**: Strategisch / Vertrouwelijk
**Status**: FASE IV COMPLEET. FASE V IN PROGRESS. FASE VI IN PROGRESS. **Media Library v2.0 Enterprise COMPLEET (v4.48.0)**: 20 opdrachten, 4 fasen (ML-1 t/m ML-4). media tabel 12 naar 40 kolommen. 4 nieuwe tabellen. 33 nieuwe endpoints (285 totaal). 15 frontend componenten (~2.500 LOC). Image editor (12 filters). 3 AI endpoints. GDPR compliance. i18n 5 talen. adminPortal.js v3.47.0. 66 BullMQ jobs. CLAUDE.md v4.48.0. MS v8.09. **Content Studio UX & Undo COMPLEET (v4.47.0)**: Sanitization consistentie (auto-fill was enige route zonder sanitizer). 7 enterprise tooltips op alle actiebuttons. Undo functionaliteit voor auto-fill, auto-schedule en campagne. Calendar edit button + concept koppeling. Publish performance records voor Analytics. Auto-fill concept+image koppeling. 252 admin endpoints. adminPortal.js v3.44.0. CLAUDE.md v4.47.0. MS v8.08. **Content Studio Multi-Tenant Fixes COMPLEET (v4.45.0)**: 12 fixes voor BUTE content_only destination — manual items, repurpose, image resolution, publisher multi-tenant, social account config, multi-tenant publishing, media picker. generateFromTitle() voor items zonder body. BUTECS System User token + igAccountId geconfigureerd. 252 admin endpoints. adminPortal.js v3.44.0. CLAUDE.md v4.45.0. MS v8.06. **Corporate Landing Page Upgrade COMPLEET (v4.44.0)**: Volledige redesign holidaibutler.com B2B pagina — 9 opdrachten. Hero "25 AI Agents. Eén Platform. Nul concessies." + demo modal (zakelijke e-mail validatie). 9 module cards met gecorrigeerde USP-teksten. Count-up stats balk (251/100+/35+/25/1). "Van Data, via Beleving tot Resultaat" procesbeschrijving met 3 geverifieerde KPI proof points (HubSpot/Statista/ETC). Live projecten showcase (CalpeTrip/TexelMaps/PubliQio). EU-First Technology Stack (6 providers met vlaggen). i18n 5 talen (NL/EN/DE/ES/FR) via extern i18n.js (162 keys). Mobiele UX: scroll-snap carousels, floating CTA, taal-dropdown met vlaggen, hamburger menu. Privacy pagina (11 secties GDPR) + PubliQio privacy geharmoniseerd. 252 admin endpoints. adminPortal.js v3.44.0. CLAUDE.md v4.44.0. MS v8.05.

> **Dit document vervangt**:
> - `HolidaiButler_Multi_Destination_Strategic_Advisory.md` (v3.1)
> - `HolidaiButler_Strategic_Status_Actieplan.md` (v1.0)
> - `Claude_Code_Texel_100_Percent_Fase6_7_8.md` (v3.0)
>
> **Source of truth voor project context**: `CLAUDE.md` (v3.89.0) in repo root + Hetzner

---

## Deel 1: Implementatie Voortgang

### 1.1 Fase Overzicht

| Fase | Beschrijving | Status | Start | Einde | Kosten |
|------|--------------|--------|-------|-------|--------|
| **Fase 1** | Foundation (DB schema, config, server dirs) | ✅ COMPLEET | 28-01 | 28-01 | EUR 0 |
| **Fase 2** | Texel Deployment (DNS, SSL, data import) | ✅ COMPLEET | 29-01 | 29-01 | EUR 0 |
| **Fase 3** | Texel Data Quality (POI sync, categories, branding) | ✅ COMPLEET | 02-02 | 05-02 | EUR 0 |
| **Fase 3b** | LLM Content Pilot (100 POIs) | ✅ COMPLEET | 05-02 | 05-02 | EUR 0,24 |
| **Fase 4** | Full LLM Content Run (2.515 POIs) | ✅ COMPLEET | 05-02 | 05-02 | EUR 8,93 |
| **Fase 4b** | Content Vergelijking (OLD vs NEW) | ✅ COMPLEET | 06-02 | 06-02 | EUR 6,02 |
| **Fase 5** | Content Apply & Translation | ✅ COMPLEET | 07-02 | 08-02 | EUR 18,22 |
| **Fase 5b** | Frontend Content Verificatie | ✅ COMPLEET | 08-02 | 08-02 | EUR 0 |
| **Fase 5c** | Texel Image Fix | ✅ COMPLEET | 08-02 | 08-02 | EUR 0 |
| **Fase 6** | AI Chatbot Texel "Tessa" | ✅ COMPLEET | 08-02 | 08-02 | ~EUR 19 |
| **Fase 6b** | Quick Actions Destination Fix | ✅ COMPLEET | 09-02 | 09-02 | EUR 0 |
| **Fase 6c** | SSL Fix + Sentry DSN + Suggestion Content | ✅ COMPLEET | 10-02 | 10-02 | EUR 0 |
| **Fase 6d** | Destination Routing + Categories + Fuzzy Match + Spacing | ✅ COMPLEET | 10-02 | 10-02 | EUR 0 |
| **Fase 6e** | X-Destination-ID + Daily Tip + Spacing + Icons (3 rounds) | ✅ COMPLEET | 11-02 | 11-02 | EUR 0 |
| **Fase R1** | Content Damage Assessment (100 POIs fact-check) | ✅ COMPLEET | 12-02 | 12-02 | ~EUR 1 |
| **Fase R2** | Source Data Verrijking (1.923 websites, 3.079 fact sheets) | ✅ COMPLEET | 12-02-2026 | 13-02-2026 | EUR 0 |
| **Fase R3** | Prompt Redesign (16 anti-hallucinatie regels, 4 kwaliteitsniveaus, verificatie-prompt) | ✅ COMPLEET | 13-02-2026 | ~14% hallucinatie (was 61%) | EUR 0.50 |
| **Fase R4** | Regeneratie + Verificatie Loop (3.079 POIs, 19.5% hallucinatie, 0 errors) | ✅ COMPLEET | 13-02-2026 | 19.5% hallucinatie (was 61%) | ~EUR 12 |
| **Fase R5** | Safeguards & Kwaliteitsborging (1.730 POIs gepromoveerd, audit trail, monitoring) | ✅ COMPLEET | 16-02-2026 | 1.730 promoted, 1.003 blocked | EUR 0 |
| **Fase R6** | Content Completion & Vertaling (884 generic + 9.066 vertalingen NL/DE/ES) | ✅ COMPLEET | 18-02-2026 | 3.079 POIs × 4 talen | ~EUR 8 |
| **Fase R6b** | Content Quality Hardening (2.047 POIs claim-stripped, AM/PM sweep, 6.177 hervertalingen) | ✅ COMPLEET | 19-02-2026 | <5% hallucinatie (geschat) | ~EUR 6 |
| **Fase R6c** | ChromaDB Re-vectorisatie Texel + Calpe + Steekproef Fix (12.316 vectoren, 2 POI-correcties) | ✅ COMPLEET | 19-02-2026 | 10/10 test queries PASS | EUR 4,92 |
| **Fase R6d** | Openstaande Acties (markdown fix 388 POIs, 119 POIs inventarisatie, social media besluit) | ✅ COMPLEET | 19-02-2026 | 0 markdown resterend | EUR 0 |
| **Fase 7** | Reviews Integratie (8.964 reviews live, rating_distribution, poiName fix) | ✅ COMPLEET | 19-02-2026 | 7/7 API tests PASS | EUR 0 |
| **Fase 8A** | Agent Reparatie & Versterking (7 agents) | ✅ COMPLEET | 20-02-2026 | 20-02-2026 | EUR 0 |
| **Fase 8A+** | Agent Monitoring & Briefing Expansion (3 modules, 5 jobs, 40 totaal) | ✅ COMPLEET | 20-02-2026 | 16/16 tests PASS | EUR 0 |
| **Fase 8B** | Agent Multi-Destination (BaseAgent, 18 agents, Threema) | ✅ COMPLEET | 20-02-2026 | 22/22 tests PASS | EUR 0 |
| **Fase 8C-0** | Admin Portal Foundation (infra, backend, frontend, CI/CD) | ✅ COMPLEET | 20-02-2026 | 15/15 tests PASS | EUR 0 |
| **Fase 8C-1** | Agent Dashboard (backend + frontend + i18n) | ✅ COMPLEET | 20-02-2026 | 12/12 tests PASS | EUR 0 |
| **Fase 8D** | Admin Portal Feature Pack (POIs, Reviews, Analytics, Settings — 12 endpoints, 4 pagina's) | ✅ COMPLEET | 20-02-2026 | Build OK, 401 auth OK | EUR 0 |
| **Fase 8D-FIX** | Admin Portal Bug Fix (12 bugs: response structure mismatches, destination filters, Sentry DSN, UX) | ✅ COMPLEET | 21-02-2026 | 33/33 tests PASS | EUR 0 |
| **Fase 8E** | Admin Portal Hardening & UX Upgrade (agent ecosystem fixes, content audit, destination filter, sorting, analytics, agent profielen, i18n DE/ES, taalversie) | ✅ COMPLEET | 21-02-2026 | 18/18 agents HEALTHY | ~EUR 0,50 |
| **Fase 9A** | Admin Portal Enhancement (RBAC + Undo + Agent Config, Chatbot Analytics, POI Category/Image/Branding, Dark Mode — 16 nieuwe endpoints, 35 totaal) | ✅ COMPLEET | 21-02-2026 | Build OK, 0 errors | EUR 0 |
| **Fase 9A-FIX** | Admin Login Fix (rate limiter 5→15, lockout 5→10/5min, Sessions UUID non-blocking) | ✅ COMPLEET | 22-02-2026 | Login OK | EUR 0 |
| **Fase 9B** | Admin Portal Bug Fix & UX Hardening (6 P0 bugs, 13 UX fixes, pageview tracking, enterprise password policy — 2 nieuwe endpoints, 37 totaal) | ✅ COMPLEET | 22-02-2026 | 28/28 tests PASS | EUR 0 |
| **Fase 9C** | Admin Portal Live Verificatie & Reparatie (user creation fix, image reorder e2e, enterprise agent profiel popup 4-tab, subcategory editing, logo upload — 1 nieuw endpoint, 38 totaal) | ✅ COMPLEET | 22-02-2026 | Deploy 6 omgevingen | EUR 0 |
| **Fase 9D** | Admin Portal Zero-Tolerance Reparatie (8 persistente bugs, UsersPage null-safety, category kleuren, MongoDB conflict, undo snapshots POI/review, buildAuditDetail, display_order — 28/28 tests) | ✅ COMPLEET | 22-02-2026 | 28/28 PASS | EUR 0 |
| **Fase 9E** | Persistent Failures Definitief (6 items: Unicode emoji, scheduled jobs popup, agent warnings threshold, agent config persist, image reorder e2e, welcome email — adminPortal.js v3.4.0) | ✅ COMPLEET | 22-02-2026 | 20/20 PASS | EUR 0 |
| **Fase 9F** | Admin Portal Definitief + RBAC (4 blokken: A=reparaties, B=functies, C=images, D=documentatie — adminPortal.js v3.6.0) | ✅ COMPLEET | 24-02-2026 | Live getest | EUR 0 |
| **Fase 9G** | Agent Fixes + RBAC Verificatie (P1: agent config tasks max 10, P2: De Dokter stale→inactive, P3: errorInstructions, P4: RBAC live verified, P5: rate limiter exempt, P6: documentatie — adminPortal.js v3.7.0) | ✅ COMPLEET | 24-02-2026 | 25/25 rate limiter PASS | EUR 0 |
| **Fase 9H** | Audit & Command (P1: agent config tasks frontend race condition fix 6e cyclus, P2: De Dokter JOB_ACTOR_MAP fix 5e cyclus, P3: 509 Accommodation POIs→inactive, P4: pageviews dag/week/maand granulatie — adminPortal.js v3.8.0) | ✅ COMPLEET | 24-02-2026 | 10/10 tests PASS | EUR 0 |
| **Fase 9I** | UX Polish + Data Consistentie + Analytics (7 items: backup+token, MongoDB tasks sync, shared health summary, dark mode contrast, scheduledJobs i18n, analytics granulatie, MS documentatie — adminPortal.js v3.9.0) | ✅ COMPLEET | 25-02-2026 | 15/15 tests PASS | EUR 0 |
| **Fase 10A** | Agent Ecosysteem Optimalisatie (Apify Scenario A, Threema CONFIGURED, 3 agents gedeactiveerd, dashboard eerlijkheid 4 statussen, resultaten tab — adminPortal.js v3.10.0, 42 endpoints) | ✅ COMPLEET | 26-02-2026 | 9 bestanden, +309/-23 | EUR 0 |
| **Fase 10A-R** | Restant: Agent config datacorruptie fix (backend validatie + frontend filter + MongoDB restore), Threema CONFIGURED geverifieerd, CLAUDE.md versie-fix | ✅ COMPLEET | 26-02-2026 | 0 placeholders | EUR 0 |
| **Fase 10B** | Security Hardening: npm audit fix (17→2 vuln), hardcoded secrets scan, security headers audit, De Bewaker status — rapport op Hetzner | ✅ COMPLEET | 26-02-2026 | 0C/0H vulnerabilities | EUR 0 |
| **Fase 10C** | Apache Hardening (5 domeinen headers + ServerTokens) + Live Verificatie 10A (10/10 PASS) + Aspirationele agents eerlijk gelabeld + Sessions.user_id VARCHAR(36) | ✅ COMPLEET | 26-02-2026 | 5 domeinen beveiligd | EUR 0 |
| **Fase 11A** | Agent Ecosysteem Audit + Activering (18 agents, 40 jobs, 18.320 entries/30d). 3 dev agents geactiveerd: De Bewaker (npm audit), De Corrector (code scan), De Stylist (TTFB+headers). AuditLog enum fix. | ✅ COMPLEET | 27-02-2026 | 3 agents geactiveerd | EUR 0 |
| **Fase 11B** | Agent Ecosysteem Enterprise Complete — Niveau 7 (Zelflerend). 10 blokken: individuele logging, trending, escalatie, issues+SLA, Admin Issues module (5 endpoints), trending chips, baselines+anomaliedetectie (2σ), cross-agent correlatie. adminPortal.js v3.11.0 (47 endpoints). | ✅ COMPLEET | 27-02-2026 | 22 bestanden, 7 nieuw | EUR 0 |
| **Fase 12** | Verificatie, Consolidatie & Enterprise Hardening. 7 blokken: A) server verificatie 16/16, B) MS v7.13 completeness (5 gaps), C) CLAUDE.md versie fix, D) AuditLog status sanitizer + QA→QnA + Reviews case fix, E) 34 enterprise tests (trendHelper, agentIssues, baselineService, correlationService), F) runtime metrics aggregatie, G) documentatie + deploy. | ✅ COMPLEET | 27-02-2026 | 7 bestanden gewijzigd, 1 nieuw | EUR 0 |
| **Fase II-A** | Chatbot Upgrade — Contextueel bewustzijn (contextService.js), multi-turn memory (10 msg, follow-up NL/EN/DE/ES, ordinal refs), booking intent (6 talen), human escalation (destination-specifiek contact), ragService v2.5 | ✅ COMPLEET | 28-02-2026 | 5 bestanden, 4 tests PASS | EUR 0 |
| **Fase II-B** | POI Module Verbetering — Freshness Score, leaflet.markercluster, multi-select categories + URL params, Sharp image resize proxy (98.6% reductie), sticky CTAs, 4 admin endpoints | ✅ COMPLEET | 01-03-2026 | 15 bestanden, 3 commits | EUR 0 |
| **Fase II-C** | Agenda Module Upgrade — Multi-destination (X-Destination-ID), auto-category detectie (8 categorieën), iCal feeds (RFC 5545), admin CRUD (5 endpoints), agenda.js rewrite | ✅ COMPLEET | 01-03-2026 | 2 bestanden, 11 endpoints | EUR 0 |
| **Fase II-D** | Customer Portal UX Upgrade — usePageMeta hook (SEO/OG), Breadcrumbs (4 talen, 13 routes), skip-to-content (WCAG), PWA service worker (3 cache strategies) | ✅ COMPLEET | 01-03-2026 | 10 bestanden, 1 commit | EUR 0 |
| **Fase IV-A** | Apify Data Pipeline — Medallion Architecture (Bronze/Silver/Gold). `poi_apify_raw` tabel, poiSyncService.js rewrite (6 methoden, 3 quality checkpoints), Apify backfill (1.023 POIs, 3.167 runs), 9.363 reviews import, Admin Sync & Metadata card, Customer Portal dynamic amenities/parking. Review sentiment fix (9.363 reviews). i18n hardcoded strings fix (10 bestanden, 95+ keys, 6 talen). | ✅ COMPLEET | 03-03-2026 | 12 bestanden, Bronze+Silver+Gold | EUR 0 |
| **Fase IV-B** | POI Tier Import + Owner-Managed Tiers. 2.695 POI tier-assignments uit Excel. `POI.tier` kolom primair. poiTierManager.js v2.0: query op stored tier. BullMQ crons: T1 dagelijks, T2 wekelijks, T3 maandelijks, T4 kwartaal. Admin Portal tier display. | ✅ COMPLEET | 03-03-2026 | 4 bestanden, 2.695 POIs | EUR 0 |
| **Fase IV-0** | Pre-flight & Adyen Activatie (Blok 0). Adyen E2E test PASS (session creation, transaction status, HMAC webhook). Feature flags Calpe geactiveerd (hasBooking/hasTicketing/hasReservations/hasChatToBook=true). PCI DSS Blok 0 review + GDPR Blok 0 review. .env 600. Compliance docs geüpdatet. | ✅ COMPLEET | 03-03-2026 | 3 bestanden, compliance docs | EUR 0 |
| **Fase IV Blok A** | Partner Management Module. 3 DB tabellen (partners, partner_pois, partner_onboarding). partnerService.js (CRUD, onboarding, IBAN/BTW validatie, contract transitions). 7 admin endpoints (106 totaal), adminPortal.js v3.18.0. PartnersPage.jsx (stats, tabel, detail 4 tabs, 3-step wizard). i18n 4 talen. Forward-compatible multi-tenant analyse. | ✅ COMPLEET | 03-03-2026 | 15 bestanden | EUR 0 |
| **Fase IV Blok B** | Intermediair State Machine. 1 DB tabel (intermediary_transactions) + ALTER TABLE payment_transactions. intermediaryService.js (13 functies, 6-stappen state machine, ACID commissie, QR HMAC-SHA256, payout report). 9 admin endpoints (115 totaal), adminPortal.js v3.19.0. 2 BullMQ jobs (48 totaal). hasIntermediary feature flag. PartnersPage transactions tab. i18n 4 talen. | ✅ COMPLEET | 04-03-2026 | 19 bestanden | EUR 0 |

### 1.2 Budget Overzicht

| Component | Geschat | Werkelijk | Status |
|-----------|---------|-----------|--------|
| Fase 3b Content Pilot | EUR 1 | EUR 0,24 | ✅ |
| Fase 4 Content Generatie | EUR 10 | EUR 8,93 | ✅ |
| Fase 4b Content Vergelijking | EUR 8 | EUR 6,02 | ✅ |
| Fase 5 Vertalingen | EUR 25 | EUR 18,22 | ✅ |
| Fase 6 Vectorisatie | EUR 25 | EUR 19,00 | ✅ |
| Fase R1-R4 Content Repair | EUR 15 | EUR 13,50 | ✅ |
| Fase R6 Content Completion | EUR 10 | EUR 8,00 | ✅ |
| Fase 7 Reviews | EUR 0 | EUR 0 | ✅ |
| Fase 8A Agents Reparatie | EUR 0 | EUR 0 | ✅ |
| Fase 8B Agents Multi-Destination | EUR 0 | EUR 0 | ✅ |
| Fase 8C-0 Admin Portal Foundation | EUR 0 | EUR 0 | ✅ |
| Fase 8C-1 Agent Dashboard | EUR 0 | EUR 0 | ✅ |
| Fase 8D Admin Portal Feature Pack | EUR 0 | EUR 0 | ✅ |
| Fase 8D-FIX Admin Portal Bug Fix | EUR 0 | EUR 0 | ✅ |
| Fase 8E Admin Portal Hardening & UX | EUR 1 | EUR 0,50 | ✅ |
| Fase 9A Admin Portal Enhancement | EUR 0 | EUR 0 | ✅ |
| Fase 9A-FIX Admin Login Fix | EUR 0 | EUR 0 | ✅ |
| Fase 9B Admin Portal Bug Fix & UX Hardening | EUR 0 | EUR 0 | ✅ |
| Fase 9C Admin Portal Live Verificatie & Reparatie | EUR 0 | EUR 0 | ✅ |
| Fase 9D Admin Portal Zero-Tolerance Reparatie | EUR 0 | EUR 0 | ✅ |
| Fase 9E Persistent Failures Definitief | EUR 0 | EUR 0 | ✅ |
| Fase 9F Admin Portal Definitief + RBAC | EUR 0 | EUR 0 | ✅ |
| Fase 9G Agent Fixes + RBAC Verificatie | EUR 0 | EUR 0 | ✅ |
| Fase 9H Audit & Command | EUR 0 | EUR 0 | ✅ |
| Fase 9I UX Polish + Analytics | EUR 0 | EUR 0 | ✅ |
| Fase 10A Agent Ecosysteem Optimalisatie | EUR 0 | EUR 0 | ✅ |
| Fase 10A-R Restant (config fix, Threema, versie) | EUR 0 | EUR 0 | ✅ |
| Fase 10B Security Hardening | EUR 0 | EUR 0 | ✅ |
| Fase 10C Apache Hardening + Agent Eerlijkheid + Sessions Fix | EUR 0 | EUR 0 | ✅ |
| Fase 11A Agent Ecosysteem Audit + Activering | EUR 0 | EUR 0 | ✅ |
| Fase 11B Agent Ecosysteem Enterprise Complete | EUR 0 | EUR 0 | ✅ |
| Fase II-A Chatbot Upgrade | EUR 0 | EUR 0 | ✅ |
| **Totaal** | **EUR 95** | **EUR 74,41** | **78,3% van budget** |

### 1.3 Openstaande Componenten

| # | Component | Fase | Prioriteit | Blokkeert Launch? | Details |
|---|-----------|------|------------|-------------------|---------|
| ~~B~~ | ~~Reviews Integratie~~ | ~~Fase 7~~ | ~~P0~~ | ~~JA~~ | ✅ **COMPLEET** (19-02-2026) |
| ~~C~~ | ~~AI Agents Multi-Destination~~ | ~~Fase 8B~~ | ~~P1~~ | ~~Operationeel~~ | ✅ **COMPLEET** (20-02-2026) — BaseAgent pattern, 18 agents, Threema |
| ~~D~~ | ~~Agent Dashboard (Admin Portal)~~ | ~~Fase 8C~~ | ~~P1~~ | ~~Operationeel~~ | ✅ **COMPLEET** (20-02-2026) — Agent Dashboard + 4 feature modules |
| E | Alicante Launch Prep | TBD | P1 | NEE (Calpe/Texel live) | Config, DNS, SSL, data, branding, chatbot |
| E2 | WarreWijzer Launch Prep | Fase V | P1 | NEE | destination_id 4, 5 talen, ~300 POIs, Wijze Warre chatbot. Zie Deel 10 |
| F | Content-Security-Policy Headers | TBD | P2 | NEE | CSP op alle 5 domeinen na uitgebreide testing |
| ~~G~~ | ~~Agent Ecosysteem Enterprise Complete~~ | ~~11B~~ | ~~P1~~ | ~~NEE~~ | ✅ **COMPLEET** (27-02-2026) — Niveau 7: logging, trending, issues, anomaliedetectie, correlatie |
| H | De Weermeester Audit | TBD | P3 | NEE | Verificatie output, strategy-layer evaluatie |
| I | Gedeactiveerde agents evaluatie | TBD | P3 | NEE | De Architect, De Leermeester, De Thermostaat — reactiveren bij bewezen ROI |

---

## Deel 2: Voltooide Fasen - Detail

### Fase 1: Foundation (28-01-2026)

**Database schema migratie:**
- `destinations` tabel met INT id (niet VARCHAR) + `code` VARCHAR(50)
- `destination_id` INT DEFAULT 1 toegevoegd aan 6 tabellen: POI, QA, agenda, Users, user_journeys, holibot_sessions
- Foreign keys + indexes voor performance
- Calpe=1, Texel=2, Alicante=3

**Server structuur:**
- Apache VHosts met `RequestHeader set X-Destination-ID` (niet SetEnv)
- Storage: `/var/www/api.holidaibutler.com/storage/destinations/{dest}/poi-images/`
- Symlink voor Calpe backward compatibility
- Config in `platform-core/config/destinations/` (index.js + per-destination configs)

### Fase 2: Texel Deployment (29-01-2026)

- DNS via Hetzner, SSL certbot (texelmaps.nl)
- Data import: POI 1.772, Categories 671, QnA 96.093, Reviews 3.929
- GitHub Actions matrix deployment (calpe/texel)
- VITE_DESTINATION_ID in frontend builds

### Fase 3: Texel Data Quality (02-05/02/2026)

- POI sync: 1.772 → 1.739 (97 deleted, 64 added), google_placeid als unique key
- Category hierarchie: 671 → 129 (14 level 1 + 115 level 2), 7 button categories
- Visibility flags: is_searchable_only (161), is_hidden_category (411)
- MapView: zoom 10 (Texel) vs 14 (Calpe), perCategory=7
- Branding: #30c59b/#3572de/#ecde3c, TexelMaps logo, VVV Texel partner badge
- CSS variabelen migratie: 33+ bestanden
- Performance: code splitting, lazy loading, bundle -32%
- VVV Texel scraping via GraphQL API: 240 POIs, 115 POIs contactdata
- Calpe.es scraping: 18 POIs, POI websites: 276 POIs

### Fase 4+4b: Content Generatie & Vergelijking (05-06/02/2026)

- 2.515 POIs via Mistral Medium (1.442 Calpe + 1.073 Texel)
- 100% success, 0 failures, EUR 8,93
- Kwaliteit: markdown 0%, British English 97,6%, avg 135 woorden
- Vergelijking: 2.481 approved (98,6%), 34 manual review (1,4%), 0 keep old
- NEW scoort +2,17 punten boven OLD (9,96 vs 7,79)

### Fase 5+5b+5c: Content Apply, Verificatie & Images (07-08/02/2026)

- 2.515 POIs applied, 6.844 vertalingen, EUR 18,22, 0 errors
- Kritieke fix: `enriched_detail_description_en` → `enriched_detail_description` (base kolom = EN)
- Texel image fix: 11.506 imageurls records voor 1.606 POIs (4,1 GB op disk)
- Apache Alias configs gefixed voor alle texelmaps.nl vhosts

### Fase 6: AI Chatbot Texel "Tessa" (08/02/2026)

- ChromaDB: 94.980 vectoren (93.241 QnA + 1.739 POI) in `texel_pois` collection
- Backend: 8 bestanden (chromaService, embeddingService, ragService, conversationService, intentService, holibot.js, poiSyncService, qaSyncService)
- Frontend: 5 bestanden (vite.config.ts, DestinationContext.tsx, WelcomeMessage.tsx, ChatHeader.tsx, ChatMessage.tsx)
- Config-driven persona: name="Tessa", collection="texel_pois", welcomeMessages NL/EN/DE
- Pattern: `getDestinationFromRequest(req)` → destinationConfig → collectionName

### Fase 6b: Quick Actions Destination Fix (09/02/2026)

| Endpoint | Probleem | Fix |
|----------|----------|-----|
| GET /daily-tip | calpe_distance + geen destination_id | Haversine + destination_id filter |
| POST /directions | POI lookup zonder destination filter | destination_id filter + fallback |
| GET /suggestions | Hardcoded "Calpe" teksten | Destination-aware greetings/tips |
| GET /trending | Geen destination filter | JOIN POI tabel |

Texel-specifieke tips per eigenaar feedback:
- Afternoon: "Maak een fietstocht over het eiland!"
- Summer: "Smeer je goed in door de zilte lucht en zon!"
- Spring/Autumn: "Neem winddichte kleding mee"
- Winter: "Flinke wind, woeste golven en prachtige luchten"

### Fase 6c: SSL + Sentry + Suggestion Content (10/02/2026)

| Issue | Fix |
|-------|-----|
| SSL Certificate voor api.holidaibutler.com | Certbot cert + Apache VHost met ProxyPass, CORS headers |
| Sentry DSN met hyphens in key | DSN key zonder hyphens, alle env files gefixed (project 2 = customer-portal) |
| SuggestionService hardcoded Calpe | Per-destination suggestions: calpe + texel keys met lokale content |
| SEASONAL_SUGGESTIONS hardcoded | Refactored naar SEASONAL_CATEGORIES (neutral) + getSeasonHighlight() (aware) |

SSL cert geldig tot 2026-05-11. Bugsink projects: 1=api, 2=customer-portal, 3=admin-portal.

### Fase 6d: Destination Routing ROOT CAUSE + 10 Fixes (10/02/2026)

**ROOT CAUSE**: `getDestinationFromRequest()` deed `parseInt("texel")` → NaN → default 1 (Calpe).
Frontend stuurt string "texel" via `VITE_DESTINATION_ID`, backend verwachtte nummer. ALLE endpoints waren gebroken voor Texel.

| # | Issue | Fix |
|---|-------|-----|
| 1 | **Destination Routing** (ROOT CAUSE) | `codeToId` mapping: accepteert string ("texel") EN numeric (2) |
| 2 | **CORS `/usr/bin/bash`** | Apache RewriteRule i.p.v. SetEnvIf met $0 |
| 3 | **Category Filtering** | Whitelist (8 categorieeen) i.p.v. blacklist |
| 4 | **Spacing Errors** | `fixResponseSpacing()` + extra locatienamen in cleanAIText |
| 5 | **POI Name Recognition** | `normalizeDutchNumbers()` (1-20 → NL woorden) + partial-words fuzzy matching |
| 6 | **Itinerary Events** | `calpe_distance` → `destination_id = ?` |
| 7 | **Itinerary Categories** | NL Texel categorieeen toegevoegd aan allowlist |
| 8 | **Entity Extraction** | Destination-neutral patterns, Texel locaties in exclude list |
| 9 | **Fallback Response** | Destination-aware `destName` parameter |
| 10 | **Enhanced Search** | Hardcoded " Calpe" verwijderd uit query builder |

**Texel categorieeen (whitelist)**: Eten & Drinken, Natuur, Cultuur & Historie, Winkelen, Recreatief, Actief, Gezondheid & Verzorging, Praktisch

**Bestanden gewijzigd**: holibot.js (6 fixes), ragService.js (6 fixes), CategoryBrowser.tsx (whitelist + iconen), api.holidaibutler.com-le-ssl.conf (CORS RewriteRule)

**Git**: commit f9ec10e, pushed dev → test → main

### Fase 6e: X-Destination-ID + Daily Tip + Spacing + Icons — 3 Rounds (11/02/2026)

**Round 1**: X-Destination-ID headers (11 fetch calls), Daily Tip LLM verwijderd, imageurls lookup, spacing connectingWords, Dutch category icons.
**Round 2**: Opening hours format mismatch (array+Dutch vs object+English), Dutch itinerary categories, 60+ subcategory icons, streaming cleanAIText, image priority sort, destination-aware chat avatar.
**Round 3**: Texla→Tessa (23 occurrences, 6 files), ChromaDB warnings (@chroma-core/default-embed + no-op), camelCase spacing regex, icon centering (contain vs cover), itinerary images (getImagesForPOIs + poi_XXXX ID extraction).

**Commits**: 4c3d894, dae659e, 02629c6, afe23a5 — pushed dev → test → main

### Content Repair Pipeline — Fase R1: Damage Assessment (12/02/2026)

**Aanleiding**: Handmatige steekproef door Frank (Texel-bewoner) onthulde systematische feitelijke hallucinaties in Fase 4 LLM-output. 6/6 gecontroleerde Texel POIs bevatten verzonnen details.

**Root Cause**: Het LLM (Mistral Medium) ontving per POI ONVOLDOENDE feitelijke brondata. Alleen naam, coördinaten, categorie, highlights werden meegegeven. De website-URL werd wél meegegeven maar de INHOUD van die website NIET. De prompt-instructie "Include at least one concrete detail" dwong het LLM om details te verzinnen.

**Methode**: Geautomatiseerde fact-check pipeline:
1. 50 Texel + 50 Calpe POIs geselecteerd (Top-rated met website)
2. Alle 100 websites gescrapet (96% success rate)
3. LLM fact-check: elke claim in de gegenereerde tekst vergeleken met website-data
4. Gestructureerd rapport gegenereerd

**Resultaten**:

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs gecontroleerd | 48 | 47 | 95 |
| Gemiddeld hallucinatie% | 61% | 62% | 61% |
| POIs severity HIGH/CRITICAL | 48 (100%) | 47 (100%) | 95 (100%) |
| Verified claims | 22% | 19% | 20% |
| Hallucinated claims | 53% | 56% | 55% |
| Factually wrong claims | 6% | 4% | 5% |

**Conclusie**: **NO-GO** voor productie. Content Repair Pipeline R2-R5 verplicht.

**Ergste categorieën**: Food & Drinks Calpe (75% hallucinated), Praktisch Texel (69%), Shopping (67%), Recreatief (64%).

**Typische foutpatronen**: Verzonnen prijzen (11%), verzonnen afstanden (11%), verzonnen openingstijden (6%), verzonnen menu-items (3%), verzonnen faciliteiten (3%).

**Deliverables op Hetzner**:
- `/root/fase_r1_damage_assessment.md` — Volledig rapport
- `/root/fase_r1_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r1_factcheck_texel.json` + `_calpe.json` — Fact-check data
- `/root/fase_r2_scrape_targets.json` — 1.923 POIs voor volledige scraping
- `/root/fase_r3_prompt_improvements.md` — Anti-hallucinatie prompt ontwerp

**Lessons Learned**:
1. Feitelijke correctheid moet ALTIJD onderdeel zijn van kwaliteitscriteria
2. "Concreetheid" in kwaliteitsscoring beloont hallucinaties — een verzonnen prijs scoort hoger dan geen prijs
3. Website URL meegeven ≠ website INHOUD meegeven — het LLM leest de URL niet
4. Anti-hallucinatie prompt regels: "verzin NOOIT details", "gebruik ALLEEN brondata"

**Risico Register**:
- LLM hallucinatie-risico bij onvoldoende brondata → MATERIEEL BEWEZEN (61% foutenpercentage)
- Kwaliteitscriteria die hallucinaties belonen → GEFIXED in R3 prompt ontwerp
- Vertalingen gebaseerd op foutieve content → ✅ Gemitigeerd (R6 hervertaling na R4 regeneratie)

### Content Repair Pipeline — Fase R2: Source Data Verrijking (12-13/02/2026)

**Doel**: Alle POI-websites scrapen en gestructureerde "fact sheets" bouwen als brondata voor content regeneratie in R4.

**Methode**: Geautomatiseerde scraping pipeline:
1. 1.923 POI-websites gescrapet (1.209 Texel, 714 Calpe)
2. Per website: hoofdpagina + subpagina's (/over-ons, /menu, /openingstijden, etc.)
3. Gestructureerde feiten geëxtraheerd (openingstijden, prijzen, adres, telefoon, email)
4. Gecombineerd met Google Places beschrijvingen en enriched_highlights uit DB
5. Per POI een "fact sheet" met source_text_for_llm (klaar voor R4)

**Resultaten**:

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs met content | 1.596 | 1.483 | 3.079 |
| Websites gescrapet | 1.144 | 626 | 1.770 |
| Scrape success rate | 95% | 88% | 92% |
| Data quality: rich | 984 (62%) | 478 (32%) | 1.462 (47%) |
| Data quality: moderate | 59 (4%) | 172 (12%) | 231 (8%) |
| Data quality: minimal | 452 (28%) | 614 (41%) | 1.066 (35%) |
| Data quality: none | 101 (6%) | 219 (15%) | 320 (10%) |
| Gem. bronwoorden per POI | 580 | 535 | 557 |
| Doorlooptijd | — | — | 380 minuten |

**Coverage**: 55% van POIs heeft bruikbare brondata (rich + moderate). Texel (65%) significant beter dan Calpe (44%).

**Geëxtraheerde feiten**: 488 openingstijden, 265 prijzen, 3.073 adressen, 835 telefoonnummers, 825 e-mailadressen, 1.036 features/kenmerken.

**Prompt Strategie per Data Quality** (voor R4):
- **Rich** (1.462): Volledige AIDA met grounded facts, 120-140 woorden
- **Moderate** (231): AIDA met beschikbare facts + generiek, 100-120 woorden
- **Minimal** (1.066): Korte veilige beschrijving, 70-90 woorden
- **None** (320): Generieke template, 40-60 woorden

**Deliverables op Hetzner**:
- `/root/fase_r2_scraped_data.json` — Gescrapete website-data (13 MB, 1.770 POIs)
- `/root/fase_r2_fact_sheets.json` — Gestructureerde fact sheets (29 MB, 3.079 POIs)
- `/root/fase_r2_coverage_report.md` — Coverage rapport per categorie
- `/root/fase_r2_summary_for_frank.md` — Samenvatting voor Frank (NL)
- Script: `/root/fase_r2_source_data_enrichment.py`

### Content Repair Pipeline — Fase R3: Prompt Redesign (13/02/2026)

**Doel**: Fundamentele herontwerp van de content-generatie prompt om hallucinaties te elimineren, op basis van R1 foutpatronen en R2 brondata.

**Aanpak**:
1. 16 expliciete anti-hallucinatie regels (gebaseerd op R1 top-9 fouttypen: fabricatie, openingstijden, prijzen, afstanden, menu-items, awards, sensorisch, faciliteiten, historisch)
2. 4 prompt-strategieen per data quality level (rich/moderate/minimal/none)
3. Categorie-specifieke guardrails (8 categorieparen NL+EN)
4. Brondata-injectie: source_text_for_llm uit R2 fact sheets direct in prompt
5. Vertaal-bewuste verificatie-prompt (NL/ES brondata naar EN output)
6. Verwijderde R1-root causes: "concrete detail", "surprising element", "be specific"

**Verwijderde hallucinatie-veroorzakers** (root cause uit R1):
- Rule 8: "Include at least one concrete detail (price, distance, time, feature)"
- AIDA Attention: "Hook with a unique fact, sensory detail, or surprising element"
- AIDA Desire: "What will the visitor experience? Be specific"
- Geen brondata in prompt (enkel URL, niet de inhoud)

**Test Resultaten (12 POIs, 3 per kwaliteitsniveau)**:

| Metriek | R1 (oude prompt) | R3 (nieuwe prompt) | Verbetering |
|---------|-------------------|-------------------|-------------|
| Hallucinatie-rate | 61% | ~14% | -47 procentpunt |
| PASS (0% fouten) | 0% | 25% (3/12) | +25pp |
| REVIEW (minder dan 20%) | 0% | 58% (7/12) | +58pp |
| FAIL (meer dan 20%) | 100% | 8% (1/12) | -92pp |

**Opgeloste fouttypen** (0 gevallen in test):
- Verzonnen prijzen (was 11.2% van R1 fouten)
- Verzonnen afstanden (was 10.9%)
- Verzonnen menu-items bij minimal/none POIs (was 3.6%)
- Verzonnen openingstijden (was 16.6%)
- Verzonnen faciliteiten (was 2.4%)

**Woorddoelen per kwaliteit**: Rich: 110-140, Moderate: 85-115, Minimal: 55-85, None: 30-60.

**Deliverables op Hetzner**:
- `/root/fase_r3_prompt_templates.py` — Productie-klare prompt module voor R4
- `/root/fase_r3_test_prompts.py` — Test script met verificatie
- `/root/fase_r3_test_results.json` — Volledige testresultaten
- `/root/fase_r3_test_report.md` — Gedetailleerd testrapport
- `/root/fase_r3_summary_for_frank.md` — Samenvatting voor Frank (NL)

### Content Repair Pipeline — Fase R4: Regeneratie + Verificatie Loop

**Status**: ✅ COMPLEET (13 februari 2026)
**Doorlooptijd**: 449 minuten (7,5 uur)
**Kosten**: ~EUR 12 (Mistral API — generatie + verificatie voor 3.079 POIs)

**Methode**: Twee-pass LLM pipeline per POI:
1. **Generatie**: R3 anti-hallucinatie prompts + R2 brondata-injectie → nieuwe beschrijving
2. **Verificatie**: Second-pass LLM fact-check → verdict (PASS/REVIEW/FAIL) + hallucinatie-rate
3. **Staging**: Resultaat in `poi_content_staging` tabel (niet direct in productie)

**Resultaten**:

| Kwaliteit | Aantal | Gem. Hall. | PASS | REVIEW | FAIL |
|-----------|--------|-----------|------|--------|------|
| Rich | 1.462 | 18.5% | 91 | 1.088 | 283 |
| Moderate | 231 | 20.6% | 8 | 180 | 43 |
| Minimal | 1.066 | 19.0% | 244 | 638 | 184 |
| None | 320 | 24.6% | 54 | 208 | 58 |
| **Totaal** | **3.079** | **19.5%** | **397** | **2.114** | **568** |

**Vergelijking met R1**: Hallucinatie-rate gedaald van 61% naar 19.5% (-41.5 procentpunt).

**Aanbevelingen**: 2.511 USE_NEW (82%), 568 MANUAL_REVIEW (18%)

**Volgende stappen**:
1. Frank: Review Top 30 per bestemming in triage rapport
2. Goedgekeurde content van staging naar productie (POI tabel)
3. Vertalingen opnieuw draaien (Fase 5 herhaling)
4. Fase R5: Safeguards implementeren (permanente fact-check)

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r4_regeneration.py` — Hoofdscript
- `/root/fase_r4_results.json` — Volledige resultaten per POI
- `/root/fase_r4_triage_report.md` — Review queue per bestemming
- `/root/fase_r4_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `poi_content_staging` tabel — Alle nieuwe content met review status

### Content Repair Pipeline — Fase R5: Safeguards & Kwaliteitsborging

**Status**: ✅ COMPLEET (16 februari 2026)
**Kosten**: EUR 0 (geen LLM calls nodig)

**Resultaten**:
- **1.730 POIs gepromoveerd** naar productie (POI tabel) — 0 errors
- **1.003 POIs geblokkeerd** door safeguards — HIGH severity claims of hallucinatie > 20%
- **1.730 audit trail entries** in `poi_content_history` tabel
- Monitoring rapport met hallucination distributie, per-destination breakdown

**Safeguard regels (permanent)**:
1. HIGH severity unsupported claims → GEBLOKKEERD
2. Hallucinatie-rate > 20% (30% voor 'none' quality) → GEBLOKKEERD
3. Onbekende bestemming → GEBLOKKEERD (verplichte handmatige review)
4. Woordaantal buiten range → WARNING
5. Embellishment woorden blocklist → WARNING

**Remaining**: 781 pending + 568 review_required = 1.349 POIs nog in staging voor Frank's review.

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r5_safeguards.py` — Content validatie regels module
- `/root/fase_r5_promote_staging.py` — Staging promotie + rollback
- `/root/fase_r5_monitoring.py` — Kwaliteitsrapportage + quarterly audit
- `/root/fase_r5_quality_report.md` — Gegenereerd kwaliteitsrapport
- `poi_content_history` tabel — Audit trail + rollback capability

### Content Repair Pipeline — Fase R6: Content Completion & Vertaling

**Status**: ✅ COMPLEET (18 februari 2026)
**Kosten**: ~EUR 8 (Mistral API — generic descriptions + 3 talen × 3.079 POIs)

**Doel**: Alle 1.349 resterende POIs in staging afhandelen + alle 3.079 POIs vertalen naar NL, DE, ES.

**4-stappen aanpak**:

| Stap | Beschrijving | Resultaat |
|------|--------------|-----------|
| **A.4** | Frank's Top 150 review verwerken (Excel) | 87 GOED → productie, 61 AANPASSEN → Frank's tekst, 2 AFKEUREN |
| **A.5** | Resterende pending promoveren (threshold 25%) | 317 gepromoveerd, 382 geblokkeerd |
| **B** | Generieke veilige beschrijvingen (40-70 woorden) | 884 gegenereerd, 0 failed, gem. 44 woorden |
| **C** | Vertalingen NL, DE, ES (parallel, 10 workers) | 9.066 vertalingen, 49 minuten, 0 missing |

**Resultaten**:

| Metric | Calpe | Texel | Totaal |
|--------|-------|-------|--------|
| POIs met EN content | 1.483 | 1.596 | 3.079 |
| POIs met NL content | 1.483 | 1.596 | 3.079 |
| POIs met DE content | 1.483 | 1.596 | 3.079 |
| POIs met ES content | 1.483 | 1.596 | 3.079 |
| Staging status | applied | applied | **Alle 3.079 = applied** |

**Kwaliteitschecks**:
- 0 POIs met EN maar zonder NL vertaling
- 0 vertalingen met markdown lekkage (**)
- 3 "in Texel" matches (false positives — POI-namen bevatten "in Texel")
- 884 generieke beschrijvingen: gem. 44 woorden, range 27-58

**Performance**: Vertaalscript herschreven van sequentieel (~10 uur geschat) naar parallel met `concurrent.futures.ThreadPoolExecutor` (10 workers). Resultaat: 49 minuten voor 8.766 vertalingen (178/min).

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r6_process_review.py` — Frank's Excel review verwerking
- `/root/fase_r6_promote_remaining.py` — Threshold-based promotie (25%)
- `/root/fase_r6_generic_descriptions.py` — Generieke beschrijvingen
- `/root/fase_r6_translations.py` — Parallelle vertalingen (10 workers)
- `/root/fase_r6_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r6_translation_results.json` — Vertaalresultaten

**Content Repair Pipeline R1-R6b: COMPLEET**
- R1: Damage Assessment → 61% hallucinatie ontdekt
- R2: Source Data → 1.923 websites gescrapet, 3.079 fact sheets
- R3: Prompt Redesign → 61% → ~14% hallucinatie
- R4: Regeneratie → 3.079 POIs, 19.5% hallucinatie
- R5: Safeguards → 1.730 gepromoveerd, audit trail
- R6: Content Completion → Alle 3.079 POIs × 4 talen = 12.316 beschrijvingen in productie
- R6b: Quality Hardening → **2.047 POIs chirurgisch gestript, AM/PM sweep, 6.177 hervertalingen, <5% hallucinatie (geschat)**

### Content Repair Pipeline — Fase R6b: Content Quality Hardening (19/02/2026)

**Doel**: Hallucinatiepercentage verlagen van <20-25% naar <5% door chirurgische verwijdering van onverifieerbare claims.

**STAP 1: Brondata Verrijking (re-scrape)**:
- 2.047 POIs opnieuw geanalyseerd tegen verrijkte brondata
- Facebook (541 URLs): 1 succesvol (platform anti-scraping)
- Instagram (412 URLs): 0 succesvol (platform anti-scraping)
- Deep website re-scrape: 109/191 met data (57% hit rate)
- 5 POIs opgewaardeerd naar betere kwaliteitscategorie

**STAP 2: Surgical Claim Stripping**:
- 2.047 POIs chirurgisch gestript (100% success rate, 0 failures)
- AIDA structuur behouden (Attention-Interest-Desire-Action)
- Gemiddeld woordaantal: 98 → 85 (-13%)
- Doorlooptijd: 89 minuten (Mistral medium-latest)

**STAP 3: AM/PM Sweep**:
- Database-breed: alle POIs × 4 talen gecontroleerd
- 50 AM/PM notaties geconverteerd naar 24-uursklok
- Na afloop: 0 AM/PM resterend

**STAP 4: Frank's Steekproef**:
- Excel met 20 POIs (10 Texel, 10 Calpe) voor handmatige controle
- Bestand: `/root/fase_r6b_steekproef.xlsx`

**STAP 5: Hervertaling**:
- 2.059 POIs × 3 talen = 6.177 vertalingen (100% success)
- Inclusief 12 extra POIs met alleen AM/PM-fixes

**STAP 6: Verificatie**:
- AM/PM remaining: 0 (PASS)
- 4-talen dekking: 100% (Calpe 1.483 + Texel 1.596)
- Audit trail: 2.097 entries (2.047 claim_strip + 50 ampm_sweep)

**Deliverables op Hetzner** (`/root/`):
- `fase_r6b_source_rescrape.py` — STAP 1: Brondata re-scrape
- `fase_r6b_claim_stripping.py` — STAP 2: Claim stripping
- `fase_r6b_ampm_sweep.py` — STAP 3: AM/PM sweep
- `fase_r6b_steekproef.py` — STAP 4: Steekproef Excel
- `fase_r6b_retranslate.py` — STAP 5: Hervertaling
- `fase_r6b_summary_for_frank.md` — Samenvatting voor Frank (NL)

---

## Deel 3: Openstaande Fasen - Instructies

### Fase 7: Reviews Integratie (19/02/2026)

**Status**: ✅ COMPLEET (19 februari 2026)
**Kosten**: EUR 0 (geen LLM calls)

**Aanleiding**: Texel frontend toonde vermoedelijk placeholder reviews i.p.v. echte data. Database bevat 8.964 reviews (3.869 Texel, 5.095 Calpe).

**Diagnostic (Outcome A — API werkte al)**:
- Complete review systeem bestond al (7+ frontend componenten, 4 API endpoints, Sequelize model)
- API endpoint retourneerde correct real review data voor beide destinations
- Migration 009 kolommen (reviewer_name, text, sentiment_label) bestaan NIET in productie DB
- Model kolommen (user_name, review_text, sentiment) hebben real data (0 anonymous, 7.519 met tekst)
- Root cause "placeholder reviews": waarschijnlijk verouderde frontend build op texelmaps.nl

**Backend wijzigingen**:
- `publicPOI.js`: `rating_distribution` toegevoegd aan `/reviews/summary` endpoint (5-star breakdown: {5: N, 4: N, 3: N, 2: N, 1: N})

**Frontend wijzigingen**:
- `POIDetailPage.tsx`: `poiName={poi.name}` toegevoegd aan `<POIReviewSection>` (WriteReviewModal toonde "This Place")
- `UserReviewsContext.tsx`: 3 hardcoded mock reviews gated achter `import.meta.env.DEV` check (waren geladen voor alle users)

**Reviews Database Schema** (18 kolommen):
- 11 model kolommen: id, poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at, updated_at
- 7 extra kolommen: destination_id, google_review_id, is_archived, archived_at, language, likes_count, source

**Bestaande Code (ongewijzigd)**: POIReviewSection.tsx, POIReviewCard.tsx, POIReviewFilters.tsx, reviewService.ts, review.types.ts, sentimentAnalysis.ts, WriteReviewModal.tsx, ReviewEditModal.tsx, 5 CSS bestanden

**Testing**: 7/7 API tests PASS (Texel reviews, empty state, Calpe regressie, highRating sort, lowRating sort, pagination, summary met rating_distribution)

**Deployed**: texelmaps.nl + dev.texelmaps.nl + holidaibutler.com + backend PM2 restart

---

### Fase 8A: Agent Reparatie & Versterking (20/02/2026)

**Status**: ✅ COMPLEET (20 februari 2026)
**Kosten**: EUR 0 (pure code, geen LLM calls)

**Doel**: Calpe agent baseline = 100% werkend. Fixen wat kapot is vóór multi-destination uitrol (8B).

**15 Agents met Nederlandse namen en 8A status:**

| # | Agent | Nederlandse Naam | Categorie | 8A Status | Fase 8B |
|---|-------|-----------------|-----------|-----------|---------|
| 1 | Orchestrator | De Maestro | Core | ✅ Werkend | ✅ Cat A |
| 2 | Owner Interface | De Bode | Core | ✅ **8A: Versterkt** (destination stats, predictions) | ✅ Cat A |
| 3 | Health Monitor | De Dokter | Operations | ✅ **8A: Versterkt** (Texel URLs + SSL monitoring) | ✅ Cat A |
| 4 | Data Sync | De Koerier | Operations | ✅ **8A: Gerepareerd** (column mapping fix) | ✅ Cat A |
| 5 | HoliBot Sync | Het Geheugen | Operations | ✅ Werkend (Fase 6) | ✅ Cat A |
| 6 | Communication Flow | De Gastheer | Operations | ✅ Werkend | ✅ Cat A |
| 7 | GDPR | De Poortwachter | Operations | ✅ Werkend | ✅ Cat A |
| 8 | UX/UI | De Stylist | Development | ✅ **11A: Geactiveerd** (TTFB + headers check, 4 domeinen, wekelijks) | ✅ Cat B |
| 9 | Code | De Corrector | Development | ✅ **11A: Geactiveerd** (grep code scan: console.logs + secrets + TODOs, wekelijks) | ✅ Cat B |
| 10 | Security | De Bewaker | Development | ✅ **11A: Geactiveerd** (npm audit scan, dagelijks) | ✅ Cat B |
| 11 | Quality | De Inspecteur | Development | ✅ Werkend | ✅ Cat A |
| 12 | Architecture | De Architect | Strategy | ⛔ **10A: GEDEACTIVEERD** (onvoldoende waarde, reactiveren bij 3+ dest.) | ✅ Cat B |
| 13 | Learning | De Leermeester | Strategy | ⛔ **10A: GEDEACTIVEERD** (geen meetbare output, reactiveren bij bewezen ROI) | ✅ Cat A |
| 14 | Adaptive Config | De Thermostaat | Strategy | ⛔ **10A: GEDEACTIVEERD** (alerting-only overlap met De Dokter) | ✅ Cat A |
| 15 | Prediction | De Weermeester | Strategy | ✅ Werkend | ✅ Cat A |

**8A Wijzigingen per agent:**

| # | Agent | Wijziging | Prioriteit |
|---|-------|-----------|-----------|
| 8A-1 | De Koerier | Column mapping fix (reviewer_name→user_name, text→review_text, etc.), destination_id passthrough | P0 |
| 8A-2 | De Bode | Per-destination POI counts, review counts, prediction alerts, optimization count (7 nieuwe MailerLite fields) | P1 |
| 8A-3 | De Leermeester | MongoDB `agent_learning_patterns` collection, in-memory cache backed by persistent storage | P1 |
| 8A-4 | De Thermostaat | Complete rewrite: simulation-only → alerting-only. Redis persistence (thermostaat:last_evaluation + history) | P1 |
| 8A-5 | De Stylist | DESTINATION_BRAND_COLORS map (calpe + texel), detectDestination(filePath), destination-aware color check | P2 |
| 8A-6 | De Dokter | 3 nieuwe portals (API, Texel prod, Texel dev), SSL expiry monitoring voor 5 domains | P2 |
| 8A-7 | Legacy | workers.js deprecated banner, self-execution disabled | P3 |

### Fase 8A+: Agent Monitoring & Briefing Expansion (20/02/2026) — Detail

> **Audit gap D2 inhaal**: Deze subsectie was ontbrekend in v6.2 (alleen fase overzicht).

**Doel**: Proactieve monitoring en uitgebreide dagelijkse briefing voor Frank.

**3 Nieuwe Modules:**

| Module | Agent | Beschrijving | MongoDB Collection |
|--------|-------|-------------|-------------------|
| contentQualityChecker.js | De Koerier (#4) | POI content completeness + consistency checks (heuristic, geen AI) | content_quality_audits |
| backupHealthChecker.js | De Dokter (#3) | Backup recency + disk space monitoring. Alert on CRITICAL. | backup_health_checks |
| smokeTestRunner.js | De Dokter (#3) | E2E smoke tests: 5 per destination + 3 infrastructure. READ-ONLY. | smoke_test_results |

**5 Nieuwe Scheduled Jobs (totaal: 35→40):**

| Job | Cron | Beschrijving |
|-----|------|-------------|
| content-quality-audit | Monday 05:00 | Content completeness + consistency per destination |
| backup-recency-check | Daily 07:30 | Backup file age + disk space |
| smoke-test | Daily 07:45 | All smoke tests (Calpe + Texel + Infra) |
| chromadb-state-snapshot | Sunday 03:00 | ChromaDB vector count snapshot (Het Geheugen) |
| agent-success-rate | Monday 05:30 | 7-day agent success rate aggregation |

**Daily Briefing Expansion:**
- Section ordering: Alerts → Smoke Tests → Backups → POI & Reviews → Content Quality → Predictions → Agents → Budget
- 3 nieuwe MailerLite fields: `smoke_test_summary`, `backup_summary`, `content_quality_summary`

**Test Resultaten**: 16/16 PASS

**Bestanden:**

| Actie | Bestand |
|-------|---------|
| NEW | `src/services/agents/dataSync/contentQualityChecker.js` |
| NEW | `src/services/agents/healthMonitor/backupHealthChecker.js` |
| NEW | `src/services/agents/healthMonitor/smokeTestRunner.js` |
| MODIFIED | `src/services/orchestrator/scheduler.js` (+5 jobs) |
| MODIFIED | `src/services/orchestrator/workers.js` (+5 handlers) |
| MODIFIED | `src/services/agents/holibotSync/index.js` (+createChromaDBSnapshot) |
| MODIFIED | `src/services/orchestrator/ownerInterface/dailyBriefing.js` (rewrite) |

### Fase 8B: Agent Multi-Destination (20/02/2026) — Detail

**Doel**: Alle 15 agents destination-aware maken via BaseAgent pattern + Threema verificatie.

**BaseAgent Pattern:**
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper die `run()` toevoegt aan bestaande agent singletons zonder herschrijven
- `agentRegistry.js`: Centrale registratie van alle 18 entries (15 agents + 3 monitoring modules)
- Config bridge: `createRequire()` voor ESM→CJS import van destination configs

**Agent Classificatie:**

| Categorie | Agents | Pattern | Beschrijving |
|-----------|--------|---------|-------------|
| **A: Destination-Aware** | 13 | `runForDestination(id)` | Draait per destination (Calpe + Texel) |
| **B: Shared** | 5 | `execute()` | Platform-breed, draait 1x |

**Categorie A (13):** De Maestro, De Bode, De Dokter, De Koerier, Het Geheugen, De Gastheer, De Poortwachter, De Inspecteur, De Leermeester, De Thermostaat, De Weermeester, Content Quality Checker, Smoke Test Runner

**Categorie B (5):** De Stylist, De Corrector, De Bewaker, De Architect, Backup Health Checker

**Threema Verificatie:**
- `checkThreemaConfiguration()` in smokeTestRunner.js (passieve env var check, GEEN echte berichten)
- Status: NOT_CONFIGURED (env vars niet gezet op Hetzner)
- Dagelijkse check via smoke-test job (07:45), alert in daily briefing als NOT_CONFIGURED

**Config Mapping Fix:**
- ROOT CAUSE: `getActiveDestinations()` returns config met `config.destination.id`, NIET `config.id`
- Fix: beide `destinationRunner.js` en `BaseAgent.js` gebruiken nu `c.destination.id/code/name`

**Test Resultaten**: 22/22 PASS
- BaseAgent unit tests: 10/10 (instantiation, config mapping, single dest, error isolation, timing)
- Threema tests: 4/4 (method exists, status check, dailyBriefing fields)
- Agent registry: 4/4 (18 agents, all have run(), dest-aware have runForDestination(), shared have execute())
- Integration: 4/4 (40 BullMQ jobs, health Calpe/Texel, POI API Calpe/Texel)

**Bestanden:**

| Actie | Bestand |
|-------|---------|
| NEW | `src/services/agents/base/BaseAgent.js` |
| NEW | `src/services/agents/base/destinationRunner.js` |
| NEW | `src/services/agents/base/agentRegistry.js` |
| MODIFIED | `src/services/agents/healthMonitor/smokeTestRunner.js` (+Threema check, +threema schema) |
| MODIFIED | `src/services/orchestrator/ownerInterface/dailyBriefing.js` (+threema_status, +alert_items) |

---

### Fase 8C-0: Admin Portal Foundation (20/02/2026)

**Status**: COMPLEET | **Kosten**: EUR 0 | **Tests**: 15/15 PASS

**Architectuurbesluit**: Admin API endpoints DIRECT in platform-core (unified backend, port 3001). Geen apart admin-module backend op port 3003.

**Infrastructuur**: 3 Apache VHosts (admin.dev/test/holidaibutler.com), 3 SSL certs (Let's Encrypt), CORS uitgebreid voor admin origins.

**Backend** (platform-core/src/routes/adminPortal.js):
- POST /auth/login — bcrypt + JWT (8h) + refresh (7d) + rate limit (5/15min)
- GET /auth/me — user data + role
- POST /auth/refresh — token refresh via sessions tabel
- POST /auth/logout — session cleanup
- GET /dashboard — POI counts, reviews, users, agents, jobs (Redis cache 120s)
- GET /health — MySQL, MongoDB, Redis, BullMQ status

**Frontend** (admin-module/ root):
- React 18 + Vite 4 + MUI 5 + Zustand 4 + @tanstack/react-query 4
- LoginPage, DashboardPage (KPIs, destination cards, system health), AdminLayout (sidebar + header)
- JWT persist + auto-refresh interceptor, i18n NL/EN, Bugsink project 3

**CI/CD**: .github/workflows/deploy-admin-module.yml — single job, 3-environment deploy, backup + health check + rollback

**Admin User**: admin@holidaibutler.com (id=3, role=admin)

---

### Fase 8C: Agent Dashboard (Admin Portal)

**Vereisten (per eigenaar):**
- Frank wil dagelijks eenvoudig kunnen monitoren
- 15 agents met status per destination (Calpe/Texel)
- Auto-refresh 5 minuten
- Filter op categorie/destination
- Recente activiteit log
- Error/warning highlighting

**Fase 8C Resultaten:**

Fase 8C is uitgevoerd in twee stappen:
- **8C-0**: Foundation (6 admin API endpoints, React 18 + MUI 5 frontend, 3 VHosts + SSL, CI/CD). 15/15 tests PASS.
- **8C-1**: Agent Dashboard (GET /agents/status, 18 agent entries, summary cards, filter bar, sortable tabel, recent activity). 12/12 tests PASS.

Zie Fase 8C-0 en 8C-1 secties hierboven voor volledige resultaten.

---

## Deel 4: Architectuur

### 4.1 Repository Strategie

**Monorepo** met destination-agnostische code en bestemming-specifieke configuratie.

```
HolidaiButler/
├── CLAUDE.md                      # Project context (source of truth)
├── platform-core/                 # Node.js/Express backend (gedeeld)
│   ├── config/destinations/       # Config per destination
│   │   ├── index.js               # getDestinationConfig(), getDestinationById()
│   │   ├── calpe.config.js
│   │   └── texel.config.js
│   └── src/
│       ├── routes/
│       │   ├── holibot.js         # HoliBot API (destination-aware)
│       │   └── adminPortal.js     # Admin Portal API (35 endpoints)
│       └── services/holibot/      # RAG pipeline
├── customer-portal/frontend/      # React 19 + Tailwind (per destination build)
├── admin-module/                  # React 18 + MUI 5 (admin.holidaibutler.com)
│   └── src/
│       ├── api/                   # API services (auth, agents, pois, reviews, analytics, settings, users)
│       ├── hooks/                 # React Query hooks
│       ├── pages/                 # Dashboard, Agents, POIs, Reviews, Analytics, Settings, Users
│       ├── stores/                # Zustand (auth, theme)
│       └── i18n/                  # NL/EN/DE/ES vertalingen
├── docs/strategy/                 # Dit document
└── infrastructure/apache/         # VHost templates
```

### 4.2 Branch Strategie

Gedeelde branches + feature flags (niet per-destination branches):
- `main` → Productie (alle destinations)
- `test` → Staging
- `dev` → Development
- Deploy volgorde: ALTIJD dev → test → main (wacht tussen elke push)

### 4.3 Destination Routing

```
Frontend (VITE_DESTINATION_ID="texel")
  → API request met X-Destination-ID header
    → getDestinationFromRequest(req) {
        // Accepteert string ("texel") EN numeric (2) IDs
        const codeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
        // Returns { destinationId, destinationConfig, collectionName }
      }
      → ChromaDB collection routing (calpe_pois / texel_pois / warrewijzer_pois)
      → Config-driven persona (name, prompts, welcome messages)
```

### 4.4 Database Schema

Shared Database met INT destination_id:
- `destinations` tabel: id INT PK + code VARCHAR(50) UNIQUE
- 6 tabellen met destination_id: POI, QA, agenda, Users, user_journeys, holibot_sessions
- EN content = base kolom (`enriched_detail_description`, GEEN _en suffix)
- Backend `getTranslatedField()`: base voor EN, `base + '_' + lang` voor andere talen

### 4.5 Server Structuur

```
/var/www/
├── api.holidaibutler.com/platform-core/   # Backend (PM2: holidaibutler-api, port 3001)
│   ├── config/destinations/
│   ├── storage/poi-images/                # Calpe (symlink) + Texel images
│   └── CLAUDE.md                          # Sync met repo
├── holidaibutler.com/                     # Calpe frontend
├── texelmaps.nl/                          # Texel frontend (DIRECT, geen subfolder)
├── dev.texelmaps.nl/                      # Texel dev
└── admin.holidaibutler.com/               # Admin portal
```

### 4.6 Apache CORS (api.holidaibutler.com)

```apache
# RewriteRule i.p.v. SetEnvIf (NOOIT $0 in heredoc!)
RewriteCond %{HTTP:Origin} ^https://(texelmaps\.nl|dev\.texelmaps\.nl|...) [NC]
RewriteRule .* - [E=ORIGIN_OK:%{HTTP:Origin}]
Header always set Access-Control-Allow-Origin "%{ORIGIN_OK}e" env=ORIGIN_OK
```

---

## Deel 5: Lessons Learned

### Fase 1 (28-01) - Foundation
- INT destination_id is beter dan VARCHAR (performance, FK constraints)
- RequestHeader boven SetEnv (betrouwbaarder backend routing)
- Symlinks voor backward compatibility
- Backup VOOR migratie

### Fase 2 (29-01) - Texel Deployment
- google_placeid als POI referentie (QnA gebruikt dit, niet poi_id)
- Batch inserts (1000) voor 96K+ records
- VITE_DESTINATION_ID voor frontend destination awareness

### Fase 3 (02-05/02) - Data Quality
- CRLF line endings breken SQL matching (Windows → Linux)
- 3-level category hierarchy: category → subcategory → poi_type
- Destination-specifieke zoom levels: Texel 10, Calpe 14
- Variable shadowing bug: altijd unieke namen (limit→perCategoryLimit)
- Deploy volgorde: ALTIJD dev→test→main met wachttijd

### Fase 4+4b (05-06/02) - Content Generatie
- Mistral Medium convergeert rond 135 woorden (target 115-125 is niet haalbaar)
- Checkpoint systeem + nohup: SSH dropout na 1.300 POIs, maar alles bewaard
- enriched_detail_description (base) = OLD EN kolom, NIET _en variant
- NEW scoort beter op ALLE 9 criteria, 0% keep old

### Fase 5+5b+5c (07-08/02) - Content Apply & Images
- Backend EN = base kolom (GEEN _en suffix) — altijd backend code verifiëren vóór DB writes
- Markdown lekkage in vertalingen: post-processing regex strip nodig
- imageurls tabel ALTIJD vullen bij image download (bestanden zonder records onzichtbaar)
- mysqldump vereist --no-defaults op Hetzner (my.cnf conflict)
- Python output buffering: gebruik -u flag of PYTHONUNBUFFERED=1

### Fase 6 (08/02) - AI Chatbot Tessa
- Config-driven persona: nieuwe destination = alleen config toevoegen
- ChromaDB separate collection per destination voorkomt cross-destination leakage
- getDestinationFromRequest() als centrale helper voor alle endpoints

### Fase 6b (09/02) - Quick Actions
- Na multi-destination refactor: ALTIJD alle endpoints testen
- calpe_distance kolom niet herbruikbaar; Haversine is universeel
- Eigenaar feedback op user-facing teksten is essentieel (NL grammatica)

### Fase 6c (10/02) - SSL + Sentry
- api.holidaibutler.com had GEEN eigen SSL cert + VHost (gebruikte wildcard)
- Sentry DSN keys: GEEN hyphens in hex key
- Bugsink projects per applicatie: 1=api, 2=customer-portal, 3=admin-portal

### Fase 6d (10/02) - Destination Routing ROOT CAUSE
- **KRITIEK**: `parseInt("texel")` = NaN → default 1 (Calpe). NOOIT parseInt() direct gebruiken op destination IDs — altijd codeToId mapping
- **NOOIT `$0` in heredoc** — bash interpreteert als shell name (`/usr/bin/bash`). Gebruik `cat <<'EOF'` (single-quoted) OF escape `\$0`
- Whitelist > blacklist voor category filtering (voorkomt ongewenste categorieën bij nieuwe data)
- Dutch number normalization voor fuzzy matching ("12 Balcken" → "twaalf Balcken")
- LLM spacing fix nodig: Mistral mergt woorden samen ("inDen Burg")

### Fase 7 (19/02) - Reviews Integratie
- ALTIJD diagnosticeren VOORDAT je code wijzigt — API bleek al te werken (Outcome A)
- reviewsManager.js (data sync) schrijft naar niet-bestaande kolommen — reviews waren via andere methode geïmporteerd
- Vite build modes (--mode texel / --mode production) gebruiken dezelfde dist/ directory — NOOIT parallel builden
- SCP deployment: oude build artifacts blijven op server (disk space waste) — overweeg `rsync --delete` of pre-clean
- Mock data in Context providers kan per ongeluk in productie terechtkomen — altijd gaten achter DEV check

### Fase 8A (20/02) - Agent Reparatie
- In-memory Maps (learningStore, configHistory) gaan verloren bij PM2 restart — altijd persistent storage (MongoDB/Redis)
- Agents die config wijzigen moeten alerting-only zijn tenzij owner expliciet auto-apply goedkeurt
- reviewsManager.js schreef naar kolommen die NIET BESTAAN in productie — altijd `DESCRIBE table` vóór INSERT fixes
- Legacy workers.js was niet geïmporteerd maar ook niet gemarkeerd als deprecated — altijd opruimen
- Brand colors hardcoded voor 1 destination → gebruik per-destination map + detectDestination() helper
- SSL cert monitoring kan met native Node.js `tls.connect()` — geen externe dependency nodig

### Fase 8A+ (20/02) - Agent Monitoring & Briefing Expansion
- Smoke tests moeten READ-ONLY zijn — nooit destructieve acties in monitoring
- POI table timestamp kolom heet `last_updated`, NIET `updated_at` — altijd DESCRIBE eerst
- Backup monitoring: recency check op file age, CRITICAL threshold = 48 uur
- Daily briefing section ordering: Alerts eerst (urgentie), dan diagnostics, dan stats
- ChromaDB state snapshots: vector count per collection als baseline voor drift-detectie

### Fase 8B (20/02) - Agent Multi-Destination
- **KRITIEK**: `getActiveDestinations()` returns config objecten waar id op `config.destination.id` zit, NIET `config.id` — config structure altijd verifiëren met console.log/inspect
- Mixin pattern (`wrapWithDestinationAwareness`) werkt beter dan inheritance voor bestaande singletons — geen herschrijving nodig
- `createRequire()` bridge nodig voor ESM→CJS imports van destination configs
- Threema verificatie: alleen passieve env var check (NOOIT echte berichten sturen in tests — kost EUR 0.05/bericht)
- Agent registry centraliseert metadata maar importeert NIET de agents zelf (voorkomt circular dependencies + DB connections bij import)
- Test scripts op Hetzner: altijd `sed -i 's/\r$//'` voor Windows line endings
- BullMQ timeout bij agent imports: split tests in groepen en gebruik `timeout` command

### Fase 8C-0 (20/02) - Admin Portal Foundation
- **KRITIEK**: Unified backend architectuur — admin routes in platform-core, NIET apart admin-module backend. Voorkomt port conflicten en dubbele dependencies
- Bash `!` in wachtwoorden (bijv. `HB-Admin-2026!`) veroorzaakt history expansion via SSH. Fix: single-quoted heredoc `<<'EOF'` of schrijf naar tempfile
- Rate limiter (express-rate-limit) slaat in-memory op per IP — bij testen via SSH allemaal zelfde server IP. Test via localhost:3001 om rate limit te bypassen
- POI tabel kolom heet `is_active` (NIET `active`) — SQL queries altijd verifiëren tegen actueel schema
- Vite build chunk warnings (614KB) zijn acceptabel voor admin portal — alleen intern gebruik, geen SEO-gevoelig

### Fase 8C-1 (20/02) - Agent Dashboard
- Static AGENT_METADATA (18 entries) in adminPortal.js > dynamic registry import — voorkomt DB connections bij route load
- MongoDB audit_logs als primary data source voor agent status (Redis te beperkt voor historische data)
- Graceful degradation pattern: als MongoDB/Redis faalt, return partial data met `partial: true` flag
- Server-side filtering + Redis cache (60s) voor agent status — frontend refetcht elke 5 min

### Fase 8D (20/02) - Admin Portal Feature Pack
- **KRITIEK**: DB table names zijn case-sensitive: `POI` (uppercase), `reviews` (lowercase), `Users` (uppercase) — altijd SSH `DESCRIBE table` vóór SQL schrijven
- **KRITIEK**: `model_reviews` tabel bestaat NIET — command doc refereerde naar verkeerde tabelnaam; correcte tabel = `reviews`
- Column `category` (NIET `main_category`), `subcategory` (NIET `sub_category`), `last_updated` (NIET `updated_at`)
- EN content = base kolom `enriched_detail_description` (GEEN _en suffix) — consistent met Fase 5b lesson
- React Query `keepPreviousData` voor smooth pagination transitions (geen flash naar loading state)
- CSV export: `responseType: 'blob'` in axios + `createObjectURL` + temporary anchor element pattern
- Redis caching strategie: 5min voor POI stats, 10min voor analytics, 60s voor agents, GEEN cache op list endpoints (te dynamisch)
- Audit log via MongoDB `insertOne` op elke PUT/POST actie — actor.type='admin' + IP logging
- Parameterized SQL via Sequelize `replacements` (NOOIT string interpolatie — SQL injection prevention)

### Fase 8E (21/02) - Admin Portal Hardening & UX Upgrade
- **KRITIEK**: Live owner testing is ONMISBAAR — onthult data mapping, UX flows en content inconsistenties die automated tests missen
- Agent status moet INTEGRAAL in daily briefing — niet alleen error counts maar per-agent health (De Maestro fix: 'completed' vs 'success' status mismatch)
- Destination filter moet GLOBAL state zijn (niet per-pagina) — gebruiker verwacht consistente filtering over alle admin modules
- i18n: alle user-facing tekst ALTIJD in geselecteerde taal — geen mix van NL/EN in dezelfde view
- Content audit als standaard hardening stap: zelfs na R6b pipeline bleken 14 POIs asterisks en 79 POIs missing ES translations te hebben
- `calculateAgentStatus()`: MongoDB stores 'completed', maar transformatie naar 'success' voor frontend → status vergelijking moet BEIDE waarden accepteren

### Fase 9A (21/02) - Admin Portal Enhancement
- RBAC: `adminAuth(minRole)` middleware met role hierarchy — editor kan alles wat reviewer kan + schrijfacties
- Audit undo: alleen `reversible: true` acties ondersteunen undo — bewaar snapshot in `previousData` veld bij elke audit entry
- Agent config: MongoDB `agent_configurations` collection als override layer boven static AGENT_METADATA — frontend hoeft niet te weten welke bron
- Chatbot analytics: `holibot_sessions` tabel bevat sessie metadata, `holibot_message_log` bevat per-bericht data met `response_time_ms`
- Image reorder: `display_order` kolom in `imageurls` tabel. COALESCE(display_order, 999) zorgt dat niet-geordende images onderaan staan
- Branding: DEFAULT_BRAND_CONFIG constante als fallback — MongoDB `brand_configurations` voor customization. Hex validatie server-side
- Dark mode: Zustand store met `localStorage` persist — geen backend call nodig, instant toggle
- Autocomplete freeSolo: `Autocomplete` met `freeSolo` prop maakt zowel bestaande categorieën selecteerbaar als nieuwe invoerbaar
- Analytics trend/snapshot endpoints: generiek ontwerp met `metric` parameter — herbruikbaar voor toekomstige KPIs

### Fase 8D-FIX (21/02) - Admin Portal Bug Fix
- **KRITIEK**: Frontend-backend response structure ALTIJD contractueel definiëren — 8D had 12 mismatches door snelle development
- `resolveDestinationId()` helper: centraal string→numeric destination mapping (voorkomt `parseInt("texel")` = NaN)
- POI detail: content veldnamen moeten matchen met frontend keys (`detail` niet `description`, `tile` niet `tileDescription`)
- Review summary: frontend verwacht flat keys (`total`, `positive`), NIET geneste objecten (`sentimentBreakdown.positive`)
- Settings: service health keys moeten exact matchen met frontend (`mysql`, `mongodb`, `redis` — NIET `mysqlHost`, `mongodbStatus`)
- Destinations endpoint: frontend gebruikt `Object.entries()` → response MOET object zijn (niet array)
- Audit log: consistent field mapping (`actor.email` niet `admin_email`, `detail` niet `details`)
- Bugsink/Sentry DSN: keys mogen GEEN hyphens bevatten (Bugsink specifiek)
- Analytics export retourneert CSV (niet JSON) — test scripts moeten non-JSON responses afhandelen

### Fase 9A-FIX (22/02) - Admin Login Fix
- Rate limiter: 5 req/15min te streng voor development — 15 req/15min is productie-ready
- Account lockout: 5 attempts / 15 min lock te agressief — 10 attempts / 5 min lock is enterprise standaard
- Sessions tabel: `user_id INT(11)` vs admin_users `CHAR(36)` UUID mismatch → non-blocking INSERT met `.catch()` als workaround. Permanente fix: `ALTER TABLE Sessions MODIFY user_id VARCHAR(36)`

### Fase 9B (22/02) - Admin Portal Bug Fix & UX Hardening
- Unicode: NOOIT escaped sequences (`\uD83C\uDDEA\uD83C\uDDF8`) in JSX source code — altijd literal emoji characters of `{'🇪🇸'}` syntax
- Enterprise password policy: ALTIJD implementeren VÓÓR eerste user creation — niet achteraf toevoegen
- Agent detail popup: owner verwacht VOLLEDIG profiel (5 secties), niet minimale metadata — investeer in rijke AGENT_METADATA
- Image reorder: end-to-end verificatie essentieel (admin → DB → Redis cache invalidation → frontend)
- Actor type in audit log: essentieel voor traceerbaarheid — admin/agent/system badges geven instant context
- Pageview tracking: GDPR compliant = geen PII (geen IP, geen user agent) — fire-and-forget met rate limiting
- Role name consistency: standaardiseer naar Engels in ALLE i18n bestanden voor platform-wide consistency

### Fase 9C (22/02) - Admin Portal Live Verificatie & Reparatie
- KRITIEK: "PASS" zonder live frontend verificatie is WAARDELOOS — altijd browser-level testen na deploy
- KRITIEK: npm run build + rsync naar ALLE omgevingen is verplichte stap, niet optioneel
- KRITIEK: Customer-portal backend queries MOETEN image ordering respecteren — admin-only fix is halve fix
- Agent profiel: VOLLEDIGE metadata in AGENT_TASKS map = single source of truth voor display + functionaliteit
- Redis cache: ALTIJD flushen na data-wijzigingen die door zowel admin als customer-portal gelezen worden
- Logo upload: multer met diskStorage + destination-aware filename voorkomt overwrite tussen destinations
- Subcategory editing: controleer altijd eerst of kolom (sub_subcategory) daadwerkelijk bestaat in DB schema

### Fase 9D (22/02) - Admin Portal Zero-Tolerance Reparatie
- "Reeds geïmplementeerd" claims = escapisme — 4/4 keer vals gebleken bij live verificatie, altijd browser-level bewijzen
- Backend-plumbing fixes zonder user-facing resultaat tellen NIET als "bug fixes" — alleen zichtbaar resultaat telt
- Cherry-picking makkelijke items i.p.v. de daadwerkelijk gemelde bugs = structureel probleem dat leidt tot herhaaldelijke cycli

### Fase 9E (22/02) - Persistent Failures Definitief
- Unicode: ALTIJD zoeken in ALLE bronbestanden (i18n JSON, backend AGENT_METADATA, frontend JSX) + build output verifiëren — partial fixes leiden tot herhaalde cycli
- Agent status berekening: `calculateAgentStatus()` moet rekening houden met individueel agent schedule (wekelijks/maandelijks ≠ dagelijks) — stale threshold verschilt per schedule
- Agent config persist: 3 lagen (backend PUT endpoint, backend GET merge met AGENT_METADATA, frontend save handler) moeten ALLE 3 correct werken — partial implementatie = niet-werkend
- Image ordering: `COALESCE(display_order, 999)` in SQL + ORDER BY voldoende — Sequelize include order werkt niet standaard, gebruik `separate: true` of raw SQL
- Welcome email: non-blocking pattern (`.then()/.catch()`) — user IS aangemaakt, email falen mag NOOIT een 500 veroorzaken

### Fase 9F (24/02) - Admin Portal Definitief + RBAC
- Admin API routes op `/api/v1/admin-portal` — NIET `/api/v1/admin` (dat is legacy process `holidaibutler-admin-api` PM2 #2)
- Rate limiter exemptions: IP whitelist + JWT role check samen — defense in depth, niet alleen IP of alleen JWT
- Image display_order ALTIJD 1-based — 0-based leidt tot verwarring bij frontend numbering badges
- Image delete + auto-renumber: ALTIJD in SQL transactie-stijl (DELETE → SELECT remaining → UPDATE 1,2,3...) om gaten te voorkomen
- Shared health summary: getSystemHealthSummary() als single source of truth — dashboard en daily email MOETEN dezelfde data tonen
- User deactivate vs delete: aparte acties met aparte confirmatie — voorkomt onbedoeld permanent verlies

### Fase 9G (24/02) - Agent Fixes + RBAC Verificatie
- Agent config tasks: MongoDB `$set` MOET de VOLLEDIGE tasks array opslaan. Static AGENT_TASKS in GET merge NOOIT boven MongoDB prefereren als MongoDB tasks array bestaan (length > 0). Root cause van "max 4 limiet" was GET merge die static fallback pakte.
- Account lockout vs rate limiter: TWEE aparte blokkademechanismen — IP-based `authRateLimiter` (15/15min) EN per-account lockout (10 attempts → 5 min lock). Beide retourneren HTTP 429. Trusted IP exempt moet BEIDE mechanismen overslaan.
- `isExemptAdminIP()` moet geëxporteerd worden als het in meerdere modules nodig is — private functions in middleware zijn niet herbruikbaar
- Per-agent `errorInstructions` in AGENT_METADATA: voorkomt dat admins zelf moeten zoeken hoe een error op te lossen — concrete genummerde stappen per agent
- Stale agent error entries: na 48+ uur zonder nieuwe run → status "inactive" tonen, niet "error" — voorkomt valse alarmen in admin dashboard

### Fase 9H (24/02) - Audit & Command
- Agent config tasks frontend race condition: React Query `staleTime: 60000` (60s) cache = root cause van "data niet persistent" illusie bij dialog reopen. Fix: staleTime 5s, `optimisticUpdate` handles new entries (`.map()` missed first-time saves), state init verplaatst naar `useEffect` hooks (was in render body → race condition met cache), `refetchType: 'all'` voor immediate refetch
- JOB_ACTOR_MAP essentieel voor agent status: `workers.js` logde ALLE scheduled jobs als `actor.name = 'orchestrator'` → `calculateAgentStatus()` vond geen recente runs voor specifieke agents → valse "error" status. Map van BullMQ job-name → agent actorName (6→9 mappings) is verplicht voor correcte audit_log attributie
- warningDetail stale vs failed: "Agent draait niet volgens schema" (stale, >48h) en "Laatste run mislukt" (failed status) zijn fundamenteel verschillende problemen — UI moet dit onderscheid tonen
- Accommodation POIs bulk inactivatie: 509 POIs → is_active=0 als bewuste categorische beslissing. Altijd `COUNT(*)` verificatie na bulk-update

### Fase 9I (25/02) - UX Polish + Data Consistentie + Analytics
- MUI dark mode: NOOIT hardcoded hex colors (`#f8fafc`, `#e2e8f0`) — altijd palette tokens (`action.hover`, `action.disabledBackground`, `divider`). Hardcoded kleuren breken in dark mode. Uitzondering: theme.js zelf en intentionele dark mode palette definities
- SQL column ambiguity in JOINs: `created_at` in WHERE is ambiguous als zowel `page_views` als `POI` tabel die kolom hebben. Oplossing: aparte filter strings — `periodDateFilter` (ongequalificeerd, single-table) en `pvPeriodDateFilter` (`pv.created_at`, JOINed queries)
- MUI sx theme callback variabele shadowing: `(t) => ...` in sx prop conflicteert met `const { t } = useTranslation()` in dezelfde scope. Altijd `(theme) =>` gebruiken als parameternaam
- Admin-module build workflow: React source NIET op Hetzner — build lokaal, deploy dist/ via tar pipe naar alle 3 admin vhosts. Backend bestanden wel individueel SCP'en

### Fase 10A (26/02) - Agent Ecosysteem Optimalisatie
- Agent deactivering: `active: false` + `deactivatedReason` + `deactivatedDate` in AGENT_METADATA — `calculateAgentStatus()` retourneert 'deactivated' als eerste check (vóór lastRun/cron evaluatie)
- calculateAgentStatus() meta parameter: functie-signatuur `(lastRun, schedule, meta)` — alle 4 call sites moeten meta doorgeven, anders wordt deactivated status gemist
- Dashboard eerlijkheid: 4 statussen (healthy/warning/error/deactivated) i.p.v. 5 (unknown verwijderd) — gedeactiveerde agents krijgen opacity 0.6 + info banner met reden en datum
- Resultaten tab: MongoDB audit_logs als primaire bron (last 30 days, limit 5 per agent) + monitoring collections als supplement voor smokeTest/contentQuality/backupHealth agents
- Strategy-layer agents (Architect/Leermeester/Thermostaat) hebben GEEN dedicated BullMQ jobs — hun entries in SCHEDULED_JOBS_METADATA zijn metadata-only voor dashboard display

### Fase 10A-Restant (26/02) - Agent Config Datacorruptie Fix
- Agent config MongoDB collectie: `agent_configurations` (NIET `agent_configs`) — altijd collectienaam verifiëren vóór queries
- Placeholder patroon `/^Task \d+$/` is eenvoudig maar effectief als validatie — backend MOET inkomende data valideren, niet alleen structuur maar ook inhoud
- Frontend moet MongoDB data NIET blind vertrouwen — client-side filter op laden voorkomt dat gecorrumpeerde data zichtbaar wordt
- Dual-layer bescherming (backend reject + frontend filter) is essentieel voor data-integriteit — enkel backend of enkel frontend is onvoldoende
- MongoDB restore: `updated_by` veld meegeven voor audit trail bij handmatige correcties

### Fase 10B (26/02) - Security Hardening
- `npm audit fix` (ZONDER --force) lost het merendeel op — force vermijden tenzij breaking changes geaccepteerd zijn
- Express/Helmet dekt API security headers automatisch — Apache frontend vhosts hebben GEEN equivalent en vereisen handmatige Header directives
- Dev-only dependencies (esbuild, vite) tellen mee in audit maar draaien NIET in productie — documenteer als geaccepteerd risico
- De Bewaker agent (security-reviewer) heeft 0 security scans uitgevoerd — aspirationele agents zijn een structureel patroon dat bij volgende fase moet worden geadresseerd
- `Server: Apache/2.4.58` header exposed op alle domeinen — `ServerTokens Prod` in apache2.conf verbergt versienummer

### Fase 10C (26/02) - Apache Hardening + Agent Eerlijkheid + Live Verificatie
- `sites-enabled` bestanden kunnen reguliere bestanden zijn i.p.v. symlinks — altijd verifiëren na wijziging in `sites-available`
- CSP header bewust NIET toevoegen in eerste fase — kan inline scripts/fonts/CDN breken, vereist uitgebreide testing
- FK constraints blokkeren ALTER TABLE — altijd foreign keys checken vóór schema wijzigingen
- Aspirationele agents: eerlijk labelen is beter dan deactiveren als de eigenaar ze wil behouden — `functionalityLevel` veld biedt gradueel onderscheid
- Live verificatie via API is een betrouwbare proxy voor browser tests bij goed gestructureerde endpoints

### Fase 11A (27/02) - Agent Ecosysteem Audit + Activering
- MongoDB `actor` veld is een object `{type, name}` — NIET een flat `actorName` string. Altijd `$actor.name` gebruiken in aggregaties
- AuditLog Mongoose enum voor `status`: valide waarden zijn `initiated`, `completed`, `failed`, `pending_approval` — NIET `success`/`error`. Alle 3 reviewer execute() methods moesten gefixed worden
- Dev-layer wrapper patroon: individuele agents (Stylist/Corrector/Bewaker) loggen onder `dev-layer` actornaam (277 entries/30d), niet individueel. Idem strategy-layer (1.126 entries/30d)
- Oude `checkProject()` methode runde lint+tests+build+audit (alle 4) per dev job — vervangen door dedicated lightweight `execute()` methods per reviewer
- npm audit exit code: npm retourneert exit code 1 als er vulnerabilities zijn (niet alleen bij fouten) — vang stdout ook bij non-zero exit

### Fase 11B (27/02) - Agent Ecosysteem Enterprise Complete (Niveau 7)
- Individuele `actorName` per reviewer (security-reviewer, code-reviewer, ux-ui-reviewer) in workers.js JOB_ACTOR_MAP vervangt dev-layer wrapper — maakt per-agent filtering en status berekening mogelijk
- `trendHelper.js` berekent week-over-week deltas uit audit_log entries — geen externe dependencies, puur MongoDB aggregatie op `metadata` velden
- `agentIssues.js` als aparte MongoDB collectie met CRUD + auto-assignment + SLA tracking — gescheiden van audit_logs (ander lifecycle: open/in_progress/resolved vs one-shot log entries)
- `baselineService.js` gebruikt 2σ (standaarddeviatie) threshold voor anomaliedetectie — simpel maar effectief, initiële baselines uit 14 entries, kalibratie na 4+ weken data
- `correlationService.js` zoekt cross-agent patronen in recente audit_log entries — wekelijks maandag, niet real-time (daily = ruis, monthly = te traag)
- Admin Issues module: 5 endpoints in adminPortal.js — hergebruik bestaand JWT/RBAC middleware, frontend IssuesPage met status cards + sortable tabel
- Trending chips hergebruiken bestaand `/agents/:key/results` endpoint → `metadata.trend` — geen apart API endpoint nodig
- `npm audit fix` (zonder --force) loste 1C/4H/3M → 0 vulnerabilities op als eerste blok — clean security baseline vóór enterprise features
- MongoDB Atlas (NIET localhost) als audit_log storage — connection URI via `MONGODB_URI` env var, belangrijk voor verificatiescripts op Hetzner

---

## Deel 6: Beslissingen Log

| Datum | Beslissing | Rationale | Beslisser |
|-------|------------|-----------|-----------|
| 28-01 | Monorepo behouden | 90%+ gedeelde code | Strategic Advisory |
| 28-01 | Shared DB met INT destination_id | Performance, FK constraints | Claude Code |
| 28-01 | texelmaps.nl als eigen domein | Brand differentiatie | Owner |
| 28-01 | RequestHeader i.p.v. SetEnv | Betrouwbaarder backend routing | Claude Code |
| 03-02 | TexelMaps huisstijl definitief | #30c59b/#3572de/#ecde3c | Owner |
| 03-02 | VVV Texel partner badge | Lokale autoriteit, vertrouwen | Owner |
| 05-02 | Mistral Medium voor content | EUR 0.00235/POI, 0% errors | Claude Code |
| 05-02 | Staging-first workflow | Review voordat POI update | Claude Code |
| 06-02 | Texel 1.073 auto-approved | OLD=NL, onbruikbaar als EN | Claude Code |
| 07-02 | 34 manual review → USE_NEW | Frank akkoord | Owner |
| 08-02 | Base kolom = EN content | Backend getTranslatedField() leest base | Claude Code |
| 08-02 | Linker script i.p.v. re-download | 4,1 GB images bestaan al op disk | Claude Code |
| 08-02 | Chatbot naam: Tessa | Eiland-expert persona | Owner |
| 08-02 | ChromaDB separate collections | Cross-destination leakage voorkomen | Claude Code |
| 09-02 | Haversine i.p.v. calpe_distance | Universeel voor alle destinations | Claude Code |
| 09-02 | Texel tips per eigenaar specificatie | Fietstocht, zilte lucht, woeste golven | Owner |
| 10-02 | codeToId mapping i.p.v. parseInt | Frontend stuurt string IDs | Claude Code |
| 10-02 | Category whitelist i.p.v. blacklist | 8 exacte categorieën, voorkomt leakage | Claude Code |
| 10-02 | RewriteRule i.p.v. SetEnvIf CORS | $0 bug in heredoc vermijden | Claude Code |
| 10-02 | 3 strategische docs → 1 master | Overzicht, minder update-werk | Owner |
| 19-02 | Diagnostic-first approach Fase 7 | Test API vóór code wijzigingen — bleek al te werken | Claude Code |
| 19-02 | rating_distribution aan summary endpoint | 5-star breakdown voor frontend UX | Claude Code |
| 19-02 | Mock data DEV-only gating | Voorkom placeholder reviews in productie | Claude Code |
| 20-02 | Fase 8 drieledig: 8A→8B→8C | Eerst repareren, dan multi-destination, dan dashboard | Claude Code |
| 20-02 | De Thermostaat alerting-only | Geen auto-apply config wijzigingen — owner beslist | Claude Code |
| 20-02 | De Leermeester MongoDB persistence | `agent_learning_patterns` collection, survives PM2 restart | Claude Code |
| 20-02 | De Dokter SSL monitoring | Native tls.connect() voor cert expiry check, geen npm dependency | Claude Code |
| 20-02 | 3 monitoring modules (8A+) | Content quality, backup health, smoke tests — proactief i.p.v. reactief | Claude Code |
| 20-02 | Daily briefing section reorder | Alerts + smoke tests eerst, urgentie-driven ordering | Claude Code |
| 20-02 | Smoke tests READ-ONLY | Monitoring mag nooit data wijzigen of kosten genereren | Claude Code |
| 20-02 | BaseAgent mixin i.p.v. inheritance (8B) | Bestaande agent singletons wrappen, geen herschrijving nodig | Claude Code |
| 20-02 | 13/5 agent split (Cat A/B) | Destination-aware vs shared — sommige agents zijn inherent platform-breed | Claude Code |
| 20-02 | Threema passieve check only | ENV var check, NOOIT echte berichten (EUR 0.05/bericht) | Claude Code |
| 20-02 | Agent registry metadata-only | Geen daadwerkelijke agent imports in registry (voorkomt DB connections) | Claude Code |
| 20-02 | Unified backend (admin in platform-core) | Geen apart admin-module backend — voorkomt port conflicten, shared middleware | Claude Code |
| 20-02 | MUI 5 voor admin portal | Enterprise-grade component library, consistent met brand theming | Claude Code |
| 20-02 | SPA routing via Apache RewriteRule | Voorkomt 404 bij page refresh, standaard voor React apps | Claude Code |
| 20-02 | Static AGENT_METADATA i.p.v. registry import (8C-1) | Dependency isolation — agent registry zou DB connections triggeren bij route load | Claude Code |
| 20-02 | Graceful degradation admin endpoints | `partial: true` flag als MongoDB/Redis faalt — dashboard altijd bereikbaar | Claude Code |
| 20-02 | Pre-flight DB schema check via SSH (8D) | Command doc had verkeerde table/column names — altijd DESCRIBE vóór SQL | Claude Code |
| 20-02 | Redis caching strategie per endpoint type (8D) | Stats = 5min, analytics = 10min, agents = 60s, lists = geen cache | Claude Code |
| 20-02 | keepPreviousData voor admin list hooks | Smooth pagination zonder flash naar loading state | Claude Code |
| 20-02 | adminPortal.js als single backend file | Alle 19 admin endpoints in één bestand — eenvoudiger deployment + beheer | Claude Code |
| 21-02 | Global destination filter in AdminLayout (8E) | Consistente filtering over alle pagina's — niet per-pagina state | Claude Code |
| 21-02 | De Maestro status dual-check 'completed'/'success' (8E) | MongoDB audit_logs slaan 'completed' op, maar AGENT_METADATA transform naar 'success' — accepteer beide | Claude Code |
| 21-02 | i18n DE/ES via aparte JSON bestanden (8E) | Zelfde structuur als nl.json/en.json — schaalbaar voor toekomstige talen | Claude Code |
| 21-02 | 121 inactive POIs niet auto-reactiveren (8E) | Mogelijk intentioneel gedeactiveerd (100 = Montaditos chain) — Frank beslist | Frank / Claude Code |
| 21-02 | Daily MySQL backup cron met 7-day rotation (8E) | Backup Health Checker had CRITICAL door ontbreken automated backups — nu dagelijks 03:00 | Claude Code |
| 21-02 | resolveDestinationId() centraal helper (8D-FIX) | Voorkomt parseInt("texel")=NaN door centraal string→numeric mapping — herbruikbaar door alle endpoints | Claude Code |
| 21-02 | Response structure contract als lesson (8D-FIX) | 12 mismatches door snelle 8D dev — frontend-backend keys ALTIJD vooraf definiëren | Claude Code |
| 21-02 | RBAC met 4 rollen (9A-1) | platform_admin > poi_owner > editor > reviewer — minimale privilege per endpoint | Claude Code |
| 21-02 | Audit undo via MongoDB snapshots (9A-1) | Reversible actions (POI edit, review archive) slaan snapshot op voor undo — audit trail behouden | Claude Code |
| 21-02 | Agent config in MongoDB (9A-1) | AGENT_METADATA in adminPortal.js is static fallback — MongoDB overschrijft displayName/emoji/description/active | Claude Code |
| 21-02 | Chatbot analytics from holibot_sessions (9A-2) | Sessions + messages + languages uit MySQL, avg response uit holibot_message_log — geen extra tracking nodig | Claude Code |
| 21-02 | display_order voor image ranking (9A-3) | ALTER TABLE imageurls ADD display_order — COALESCE(display_order, 999) als fallback voor niet-geordende images | Claude Code |
| 21-02 | Branding defaults + MongoDB override (9A-3) | DEFAULT_BRAND_CONFIG als fallback, MongoDB brand_configurations voor customization — werkt ook als MongoDB offline | Claude Code |
| 21-02 | Dark mode via Zustand + localStorage (9A-3) | MUI buildTheme(mode) factory, persist voorkeur — geen backend nodig | Claude Code |
| 22-02 | Rate limiter 5→15 req/15min (9A-FIX) | 5 was te streng voor admin testing — locked account na normale gebruik | Claude Code |
| 22-02 | Account lockout 5→10 attempts, 15→5 min (9A-FIX) | Proportioneler voor admin panel met enkele gebruikers | Claude Code |
| 22-02 | Sessions INSERT non-blocking (9A-FIX) | Sessions.user_id=INT vs admin_users.id=UUID(CHAR 36) → "Data truncated" crash. Non-blocking .catch() als workaround | Claude Code |
| 22-02 | Literal emoji in JSX (9B) | Unicode escape sequences gaven rendering problemen in browsers — literal characters altijd veilig | Claude Code |
| 22-02 | Enterprise password policy (9B) | 12+ chars, uppercase, lowercase, digit, special — standaard enterprise security requirement | Frank |
| 22-02 | Pageview tracking GDPR compliant (9B) | Geen IP, geen user agent, fire-and-forget — privacy-first analytics | Claude Code |
| 22-02 | Role names in Engels (9B) | POI Owner / Content Editor / Content Reviewer — consistent in alle 4 talen | Frank |
| 22-02 | Enterprise agent popup 4-tab design (9C) | Profiel/Status/Configuratie/Warnings — alle agent info in 1 popup i.p.v. verspreid | Claude Code |
| 22-02 | multer diskStorage voor logo upload (9C) | Destination-aware filenames ({dest}_logo.ext), max 2MB, PNG/JPG/SVG only | Claude Code |
| 22-02 | 2-level category editing (9C) | sub_subcategory kolom bestaat niet in DB — alleen category + subcategory wijzigbaar | Claude Code |
| 22-02 | Branding uitbreiding met brand_name/payoff (9C) | MongoDB brand_configurations uitgebreid — GET/PUT endpoints teruggeven/accepteren | Claude Code |
| 22-02 | saveAuditLog + saveUndoSnapshot refactor (9D) | POI update + review archive handlers moeten BEIDE functies aanroepen — directe MongoDB insert mist undo capability | Claude Code |
| 22-02 | buildAuditDetail backward-compat (9D) | Oude action names (poi_update, review_archive) + nieuwe (poi_content_updated, review_archived) beide ondersteunen voor bestaande audit log entries | Claude Code |
| 22-02 | Unicode all-files sweep (9E) | Escaped sequences in ALLE bronbestanden (i18n, AGENT_METADATA, JSX) vervangen — niet alleen frontend | Claude Code |
| 22-02 | calculateAgentStatus cron-aware (9E) | Wekelijkse/maandelijkse agents krijgen ruimere stale threshold (7d/31d) i.p.v. default 25h | Claude Code |
| 22-02 | Agent config 3-layer persist (9E) | PUT endpoint → MongoDB, GET /agents/status BRON 1b merge, frontend save handler — alle 3 lagen vereist | Claude Code |
| 22-02 | Welcome email non-blocking (9E) | MailerSend via emailService.sendEmail() met .then()/.catch() — user creation mag niet falen bij email error | Claude Code |
| 24-02 | RBAC destination/POI scoping (9F) | destinationScope + writeAccess middleware — destination_id/owned_pois in admin_users bepaalt wat editor/poi_owner mag zien/wijzigen | Claude Code |
| 24-02 | Rate limiter exemption voor platform_admin (9F) | IP whitelist via env var + JWT role check — admin moet niet gelocked worden door eigen security | Claude Code |
| 24-02 | Deactiveren vs Verwijderen als aparte acties (9F) | PUT /deactivate (toggle, reversibel) en DELETE (permanent, confirm required) — voorkomt onbedoeld dataverlies | Claude Code |
| 24-02 | Image nummering display_order 1-N, Primair = 1 (9F) | 1-based i.p.v. 0-based — frontend toont Primary badge voor positie 1, genummerd 2-N | Claude Code |
| 24-02 | Shared getSystemHealthSummary() (9F) | Enkele functie in auditTrail/index.js voor dashboard + daily email — voorkomt data discrepanties | Claude Code |
| 24-02 | EmailService Nodemailer SMTP relay (9F) | MailerSend SDK vervangen door Nodemailer met SMTP relay (port 587) — robuuster, minder dependencies | Claude Code |
| 24-02 | MongoDB tasks ALTIJD boven static AGENT_TASKS (9G) | GET /agents/status merge: als MongoDB tasks array.length > 0 → gebruik MongoDB, anders static fallback. Voorkomt "max 4 limiet" bug | Claude Code |
| 24-02 | Account lockout trusted IP exempt (9G) | `isExemptAdminIP(req)` check VOOR lockout check EN attempts increment — server-side testing mag account niet locken | Claude Code |
| 24-02 | Per-agent errorInstructions (9G) | Concrete troubleshooting stappen per agent in AGENT_METADATA — admin hoeft niet zelf te zoeken in PM2 logs | Claude Code |
| 24-02 | Stale agent → inactive (9G) | Agents zonder runs in 48+ uur krijgen status "inactive" i.p.v. "error" — voorkomt valse alarmen | Claude Code |
| 24-02 | React Query staleTime 60s→5s + optimistic update (9H) | 60s cache = root cause van "data niet persistent" illusie bij agent config dialog — 5s + useEffect init + refetchType 'all' | Claude Code |
| 24-02 | JOB_ACTOR_MAP 6→9 entries (9H) | workers.js logde ALLE jobs als 'orchestrator' → valse agent errors. health-check→health-monitor, gdpr-consent-audit→gdpr, session-cleanup→communication-flow | Claude Code |
| 24-02 | 509 Accommodation POIs → inactive (9H) | Accommodation bewust uitgesloten van content enrichment — POIs hoeven niet actief te zijn in frontend | Claude Code |
| 24-02 | Pageviews dag/week/maand granulatie (9H) | ToggleButtonGroup default 'day' i.p.v. 'month' — fijnmaziger inzicht voor admin, backend period-aware SQL filtering | Claude Code |
| 25-02 | MUI palette tokens verplicht (9I) | Hardcoded hex colors (#f8fafc, #e2e8f0) breken dark mode — action.hover/action.disabledBackground/divider zijn theme-aware | Claude Code |
| 25-02 | pvPeriodDateFilter voor JOINed queries (9I) | SQL 'created_at' ambiguous in page_views + POI JOIN — aparte filter met pv. prefix voor topPois query | Claude Code |
| 25-02 | Admin-module lokaal builden (9I) | React source niet op Hetzner — dist/ deployen via tar pipe naar 3 vhosts, backend via SCP + PM2 restart | Claude Code |
| 26-02 | 3 agents gedeactiveerd (10A) | De Architect (★★☆), De Leermeester (geen meetbare output), De Thermostaat (overlap De Dokter) — reactiveren bij bewezen ROI/3+ destinations | Claude Code |
| 26-02 | Dashboard 4 statussen (10A) | healthy/warning/error/deactivated — 'unknown' verwijderd, gedeactiveerde agents visueel onderscheiden (opacity 0.6) | Claude Code |
| 26-02 | Resultaten tab in agent popup (10A) | GET /agents/:key/results — MongoDB audit_logs + monitoring collections, laatste 5 runs per agent | Claude Code |
| 26-02 | Apify Scenario A bevestigd (10A) | Geen Apify integratie nodig voor Fase 10A — bestaande Hetzner scraping voldoet, Apify optioneel voor toekomstige schaalvergroting | Claude Code |
| 26-02 | Dual-layer placeholder validatie (10A-R) | Backend rejects `Task N` pattern + frontend filtert bij load+save — voorkomt datacorruptie in MongoDB agent_configurations | Claude Code |
| 26-02 | MongoDB collection = agent_configurations (10A-R) | NIET agent_configs — altijd `listCollections()` checken bij nieuwe MongoDB operaties | Claude Code |
| 26-02 | Threama CONFIGURED geverifieerd (10A-R) | Env vars gezet (*HOL1791 / V9VUJ8K6), smoke test bevestigt `all_configured: true` — Risico Register bijgewerkt | Claude Code |
| 26-02 | npm audit fix zonder --force (10B) | 17→2 vulnerabilities (2 dev-only moderate). --force vermijden om breaking changes te voorkomen | Claude Code |
| 26-02 | Frontend security headers = Apache (10B) | Express/Helmet dekt API. Apache vhosts missen X-Frame-Options, CSP, X-Content-Type — P1 aanbeveling voor hardening | Claude Code |
| 26-02 | De Bewaker aspirationeel (10B) | 0 security scan entries in audit_logs — agent naam belooft meer dan functionaliteit, bewust gedocumenteerd | Claude Code |
| 26-02 | Apache security headers 4x (10C) | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — CSP bewust overgeslagen (complex) | Claude Code |
| 26-02 | ServerTokens Prod (10C) | Apache versienummer verbergen op alle domeinen — voorkomt version fingerprinting | Claude Code |
| 26-02 | Aspirationele agents labelen (10C) | Frank kiest "alleen labelen, niet deactiveren" — eerlijke beschrijvingen + functionalityLevel: minimal | Owner + Claude Code |
| 26-02 | Sessions.user_id VARCHAR(36) (10C) | FK fk_session_user gedropped + ALTER TABLE — permanente fix voor UUID/INT mismatch | Claude Code |
| 26-02 | texelmaps.nl sites-enabled symlink (10C) | Regulier bestand vervangen door symlink naar sites-available — voorkomt config drift | Claude Code |
| 27-02 | Grep-based code scan i.p.v. ESLint (11A) | ESLint v10 zonder config file — grep betrouwbaarder voor basismetrieken (console.log, secrets, TODOs) | Claude Code |
| 27-02 | Bestaande BullMQ jobs hergebruiken (11A) | dev-security-scan/dev-quality-report/dev-dependency-audit bestonden al — workers handlers vervangen i.p.v. nieuwe jobs aanmaken | Claude Code |
| 27-02 | HTTPS-based TTFB check (11A) | Node.js native https module voor performance — geen Puppeteer/Lighthouse dependency nodig voor basismetrieken | Claude Code |
| 27-02 | AuditLog status 'completed'/'failed' (11A) | Mongoose enum accepteert NIET 'success'/'error' — uniforme enum waarden across codebase | Claude Code |
| 27-02 | functionalityLevel 'minimal'→'active' (11A) | 3 dev agents nu daadwerkelijk functioneel — AGENT_METADATA bijgewerkt naar werkelijke capabilities | Claude Code |
| 27-02 | Individuele actorName per reviewer (11B) | `security-reviewer`, `code-reviewer`, `ux-ui-reviewer` in JOB_ACTOR_MAP — vervangt `dev-layer` wrapper voor precise audit trail attribution | Claude Code |
| 27-02 | Trend data in metadata (11B) | `metadata.trend` per audit_log entry — queryable zonder aparte collection, trendHelper.js berekent week-over-week deltas | Claude Code |
| 27-02 | De Bode dev insights (11B) | Development findings in daily briefing als `dev_insights` sectie — niet via Threema (te ruisig voor dev bevindingen) | Claude Code |
| 27-02 | Aparte agent_issues collectie (11B) | Gescheiden van audit_logs — ander lifecycle (open/in_progress/resolved) met auto-assignment + SLA tracking | Claude Code |
| 27-02 | 2σ anomaliedrempel (11B) | Standaarddeviatie-gebaseerde threshold in baselineService — simpel statistisch, geen ML nodig voor 3 metrieken met wekelijkse data | Claude Code |
| 27-02 | Correlatierapport wekelijks maandag (11B) | Dagelijks = ruis, maandelijks = te traag — wekelijks biedt actionable insights zonder alert fatigue | Claude Code |
| 27-02 | npm audit fix als eerste blok (11B) | Clean security baseline (1C/4H/3M→0) vóór enterprise features — audit fix zonder --force (geen breaking changes) | Claude Code |
| 27-02 | Admin Issues module 5 endpoints (11B) | GET/POST/PUT list/create/update/assign/stats — hergebruik bestaand JWT/RBAC middleware, frontend met status cards | Claude Code |
| 01-03 | Roadmap v2.0 integreren in CLAUDE.md + MS | Eén strategisch advies-document naast bestaande CLAUDE.md + MS is verwarrend — integratie maakt Roadmap overbodig | Owner |
| 01-03 | WarreWijzer = destination_id 4 | Alicante behoudt destination_id 3, WarreWijzer krijgt 4 — voorkomt breaking changes in config | Strategic Advisory |
| 01-03 | Fundament-eerst fasering (I-VI) als leidend | 6-fasen strategische roadmap: Foundation → Active Modules → Commerce → Intermediair → UX+WarreWijzer → Polish | Strategic Advisory |
| 01-03 | Vlaams profiel (BENL) ≠ Nederlands (NL) | WarreWijzer vereist aparte Vlaams-Nederlandse taalversie — tone-of-voice, uitdrukkingen, spelling fundamenteel anders | Owner |
| 01-03 | UX-Features Agenda 3 correcties | Kolom C→"Waarom werkt het", Kolom F→"Bron URL", Feature 2→"Kaart-clustering" | Owner |
| 28-02 | contextService.js als losse service (II-A) | Eigen service i.p.v. ragService vermenging — separation of concerns, testbaar, herbruikbaar voor WarreWijzer | Claude Code |
| 28-02 | In-memory sessie tracking (II-A) | Map met TTL i.p.v. Redis/DB — GDPR-compliant (geen persistente persoonsdata), eenvoudig, voldoende voor huidige schaal | Claude Code |
| 28-02 | 10-bericht sliding window (II-A) | Was 6, nu 10 — balans tussen context kwaliteit en token kosten. Summary injection (>10) uitgesteld (complexity vs value) | Claude Code |
| 28-02 | Booking intent = friendly fallback (II-A) | Classificeren + loggen, NIET afhandelen — Fase III/IV voorbereiding. Gebruiker krijgt vriendelijke doorverwijzing | Claude Code |

---

## Deel 7: Risico Register

| Risico | Impact | Status |
|--------|--------|--------|
| parseInt("texel") = NaN → Calpe default | Hoog | ✅ Gemitigeerd (codeToId mapping) |
| $0 in heredoc = /usr/bin/bash | Hoog | ✅ Gemitigeerd (RewriteRule) |
| Kolom mismatch _en vs base | Hoog | ✅ Gemitigeerd (COPY + STRIP) |
| Texel images op disk maar niet in DB | Hoog | ✅ Gemitigeerd (linker script) |
| API SSL cert ontbrak | Hoog | ✅ Gemitigeerd (certbot) |
| Markdown lekkage in vertalingen | Laag | ✅ Gemitigeerd (regex strip) |
| 337 Texel Accommodation zonder EN | Laag | Geaccepteerd (is_hidden_category) |
| Opening repetitie ("The scent of" 162x) | Laag | Open |
| PL/SV kolommen ongebruikt | Laag | Open — kandidaten voor opschonen |
| Sessions.user_id INT vs admin UUID | Medium | ✅ Gemitigeerd — ALTER TABLE MODIFY VARCHAR(36), FK dropped, backward compatible |
| SSL cert vervalt 2026-05-11 | Medium | ✅ Gemitigeerd (De Dokter SSL monitoring) |
| Config structure mismatch (c.id vs c.destination.id) | Hoog | ✅ Gemitigeerd (config mapping fix in BaseAgent + destinationRunner) |
| Threema Gateway configuratie | Medium | ✅ Gemitigeerd — env vars gezet (*HOL1791 / V9VUJ8K6), smoke test: CONFIGURED |
| Agent registry circular imports | Medium | ✅ Gemitigeerd (metadata-only registry, geen agent imports) |
| Windows line endings in deploy scripts | Laag | ✅ Gemitigeerd (sed strip protocol) |
| Agent status threshold berekening | Medium | ✅ Gemitigeerd (cron-aware thresholds: dagelijks 25h, wekelijks 7d, maandelijks 31d) |
| Frontend security headers ontbreken | Hoog | ✅ Gemitigeerd (10C) — 4 headers + ServerTokens Prod op alle 5 frontend/admin domeinen |
| Aspirationele agents (Stylist/Corrector/Bewaker) | Laag | ✅ Opgelost (11A) — alle 3 geactiveerd met execute() methods, functionalityLevel: active |
| AuditLog status enum mismatch | Medium | ✅ Gemitigeerd (11A) — 'success'/'error' vervangen door 'completed'/'failed' in alle 3 reviewer files |
| Individuele logging = meer audit_log entries | Laag | ✅ Geaccepteerd (11B) — 22 entries/cyclus (10+6+6) vs 3 wrapper entries, MongoDB groei acceptabel, monitoring via baselines |
| Baseline 2σ threshold kalibratie | Laag | Open (11B) — Initiële baselines uit 14 entries, mogelijke herkalibratie na 4+ weken data |
| npm audit 0 vulnerabilities | Laag | ✅ Gemitigeerd (11B) — `npm audit fix` (geen --force): 1C/4H/3M → 0C/0H/0M/0L, 2 dev-only moderate resterend |
| WarreWijzer Vlaams vs NL taalversie | Middel | Open — Native Vlaams review nodig, apart BENL profiel vereist |
| WarreWijzer data-kwaliteit (~300 POIs) | Middel | Open — POI Tier validatie in Fase V, 4.5+ rating filter |
| Adyen compliance vertraging | Hoog | Open — Vroeg starten KYC-proces, administratief proces blokkeert geen development |
| Intermediair juridisch complex | Hoog | Open — Juridisch advies nodig voor commissie/intermediairmodel vóór Fase IV |
| UX redesign scope creep | Middel | Open — Wireframes eerst goedkeuren, progressive disclosure |

---

## Deel 8: Technische Referentie

### Kritieke Code Patronen

```javascript
// Destination routing (holibot.js)
function getDestinationFromRequest(req) {
  const headerValue = req.headers['x-destination-id'];
  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;
  const codeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
  return codeToId[headerValue?.toLowerCase()] || 1;
}

// Content kolom (publicPOI.js)
getTranslatedField(data, fieldBase, lang) {
  return lang === 'en' ? data[fieldBase] : data[fieldBase + '_' + lang];
}
// EN = enriched_detail_description (base, GEEN _en)

// Spacing fix (ragService.js)
fixResponseSpacing(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}
```

### Server Commando's

```bash
# PM2 restart backend
ssh root@91.98.71.87 "pm2 restart holidaibutler-api"

# Deploy backend file
scp platform-core/src/routes/holibot.js root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/src/routes/

# Deploy CLAUDE.md
scp CLAUDE.md root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/

# Build + deploy Texel frontend
cd customer-portal/frontend && npm run build -- --mode texel
scp -r dist/* root@91.98.71.87:/var/www/texelmaps.nl/

# Apache reload
ssh root@91.98.71.87 "apachectl graceful"

# MySQL (altijd --no-defaults op Hetzner)
ssh root@91.98.71.87 "mysqldump --no-defaults -u pxoziy_1 -p'j8,DrtshJSm$' pxoziy_db1 POI > /root/backups/poi_backup.sql"
```

---

## Deel 9: Strategische Roadmap

> **Bron**: Strategic Roadmap Advisory v2.0 (28-02-2026), volledig geïntegreerd. Dat document is hiermee overbodig.

### 9.1 Kernadvies: Fundament-Eerst Strategie

Enterprise-level kwaliteit vereist dat het fundament foutloos functioneert voordat er modules op gebouwd worden. Met Fase 12 (27-02-2026) is dit fundament gerealiseerd: Agent Ecosysteem Niveau 7 (Zelflerend), Admin Portal 47 endpoints, 0 vulnerabilities, volledige RBAC. De focus verschuift nu naar commerce-modules en nieuwe bestemmingen.

### 9.2 Aanbevolen Implementatievolgorde

| # | Fase | Projecten | Duur | Prioriteit | Status |
|---|------|-----------|------|------------|--------|
| I | Foundation Hardening | Agents Audit, Processen, Platform Core | 4-6 wkn | KRITIEK | ✅ COMPLEET |
| II | Active Module Upgrade | Chatbot, POI, Agenda, Customer Portal | 6-8 wkn | HOOG | ✅ COMPLEET (Blok A+B+C+D) |
| III | Commerce Foundation | Payment/Adyen, Ticketing, Reservering | 8-12 wkn | HOOG | ✅ COMPLEET (Blok G+A+B+C+D+E+F) |
| IV | Intermediair & Revenue | Data Pipeline + Intermediair module + Agent | 6-8 wkn | HOOG | ✅ COMPLEET (Blok A+B+C+D+E+F) |
| **V** | **Multi-Tenant Configuratielaag** | **Next.js SSR + Component Library + Tenant-Theming + Page Builder + Stabilisatie** | **12 wkn** | **HOOG** | **🟡 IN PROGRESS** |
| **VI** | **UX Revolution + WarreWijzer** | **Mobiele UX polish op Next.js + WarreWijzer uitrol als 3e tenant** | **6-8 wkn** | **MIDDEL** | **🟡 IN PROGRESS (VI-A COMPLEET)** |
| VII | Polish, Scale & Launch | E2E testing, load testing, DR, go-live multi-tenant platform | 3-4 wkn | MIDDEL | GEPLAND |
| CM | AI Content Generatie Module (Trending, Content Engine, Publishing, Analytics) | 🟡 IN PROGRESS (Fase A+B COMPLEET) | 12 wkn |
| CUX | Corporate UX Upgrade (Sidebar, Kalender, Analytics, Dashboard, Onboarding, Performance, WCAG) | ✅ COMPLEET (v4.52-v4.54) | apr 2026 |

### 9.3 Afhankelijkheden & Integratiekaart

| Bron | → | Afhankelijk project | Type |
|------|---|---------------------|------|
| Agents v5.0 | → | Alle modules | Hard |
| Platform Core | → | Alle modules | Hard |
| Payment Engine | → | Ticketing, Reservering | Hard |
| Ticketing + Reservering | → | Intermediair Module | Hard |
| Alle modules gedefinieerd | → | Mobiele UX Redesign | Sterk |
| Multi-dest framework valid | → | WarreWijzer uitrol | Sterk |
| Chatbot upgrade | → | Intermediair (chat-to-book) | Medium |
| POI module upgrade | → | Ticketing (POI-linked) | Medium |

### 9.4 Per Module: Enterprise-Level Advies

**Fase II — Active Module Upgrade:**
- **Chatbot**: ✅ Blok A COMPLEET — contextService.js (temporeel/locatie/sessie), ragService v2.5, 12 intents (booking + escalation)
- **POI Module**: ✅ Blok B COMPLEET — Content Freshness Score, leaflet.markercluster (200 POIs), multi-select categories + URL params, Sharp image resize proxy (98.6% reductie), sticky CTAs, 4 admin endpoints (bulk-status, bulk-category, tile-edit, CSV export)
- **Agenda Module**: ✅ Blok C COMPLEET — Multi-destination (X-Destination-ID, geen hardcoded Calpe), auto-category detectie (8 categorieën), iCal feed (single + subscription RFC 5545), admin CRUD (list/get/update/delete/stats), agenda.js complete rewrite
- **Customer Portal**: ✅ Blok D COMPLEET — usePageMeta hook (dynamic document.title + OG tags per page), Breadcrumbs component (4 talen, 13 routes, currentLabel override), WCAG skip-to-content link, PWA service worker (cache-first static, network-first API, offline fallback navigation)

**Fase III — Commerce Foundation:**
- **Legal (Blok G)**: ✅ COMPLEET — 6 juridische concept-templates (AV, verwerkersovereenkomst, partner agreement), Adyen setup docs
- **Payment/Adyen (Blok A)**: ✅ COMPLEET — Adyen SDK v30, Sessions flow, PCI DSS SAQ-A, 2 DB tabellen, 3 customer + 5 admin endpoints, HMAC webhook verificatie, frontend PaymentPage + PaymentResultPage
- **Ticketing (Blok B)**: ✅ COMPLEET — 5 DB tabellen, 6 customer + 15 admin endpoints, Redis inventory locking + MySQL FOR UPDATE transactie, QR HMAC-SHA256, voucher systeem, BullMQ expired reservation job
- **Reservering (Blok C)**: ✅ COMPLEET — 3 DB tabellen + ALTER TABLE POI, 4 customer + 13 admin endpoints, Redis slot locking, QR HMAC-SHA256, auto-blacklist (3 no-shows), 4 BullMQ jobs (expired/reminders/GDPR), GDPR data retention 24 maanden, 89 admin endpoints, 46 scheduled jobs
- **Chatbot-to-Book (Blok D)**: ✅ COMPLEET — 4 booking sub-intents (5 talen incl. FR), conversational booking flow (ragService v2.6), booking context tracking (contextService v1.1), 7 commerce feature flags per destination, bookingMessages.js + bookingParser.js, holibot.js v3.0, 12/12 E2E tests
- **Admin Commerce (Blok E)**: ✅ COMPLEET — commerceService.js (READ-ONLY aggregatie), 10 admin endpoints (99 totaal), CommercePage.jsx (4 tabs: Dashboard KPIs + Recharts, Reports + reconciliatie, Alerts 6 fraud types, Export CSV BOM), currencyFormat.js, i18n 4 talen (~50 keys), RBAC platform_admin + poi_owner, adminPortal.js v3.17.0
- **Testing/Compliance (Blok F)**: ✅ COMPLEET — PCI DSS SAQ-A checklist (14/17 auto-verified), 17 payment tests (7 verified + 10 blocked Adyen frontend), 5 ticketing race condition tests, 5 reservation double-booking tests, 31-item GDPR audit (27 PASS), 8-item security audit (7 PASS + .env fix), 7 compliance documenten in docs/compliance/. **FASE III VOLLEDIG COMPLEET.**

**Fase IV — Data Pipeline & Intermediair Module:**
- **Blok A: Apify Data Pipeline — Medallion Architecture** ✅ COMPLEET (03-03-2026): Bronze (`poi_apify_raw` tabel, raw JSON opslag, validatie checkpoints), Silver (POI tabel 80+ velden, reviews extractie), Gold (Customer Portal + Admin Portal). poiSyncService.js rewrite (6 methoden, 3 quality checkpoints). Apify backfill 1.023 POIs (3.167 historische runs). 9.363 reviews geïmporteerd. Admin Sync & Metadata card. Customer Portal dynamic amenities/parking/accessibility. Review sentiment fix. i18n hardcoded strings fix (10 bestanden, 95+ keys, 6 talen).
- **Blok B: POI Tier Import + Owner-Managed Tiers** ✅ COMPLEET (03-03-2026): 2.695 POI tier-assignments uit Excel (Frank's manuele review). `POI.tier` kolom (TINYINT DEFAULT 4) nu primair voor sync scheduling. poiTierManager.js v2.0: `getPOIsForUpdate()` query op stored tier kolom i.p.v. runtime score berekening. `classifyAllPOIs()` herberekent alleen tier_score (informatief). BullMQ crons: T1 dagelijks 06:00, T2 wekelijks ma, T3 maandelijks 1e, T4 kwartaal. Distributie: Calpe T1=2/T2=116/T3=691/T4=784, Texel T1=18/T2=39/T3=255/T4=1427.
- **Blok A: Partner Management Module** ✅ COMPLEET (03-03-2026): 3 DB tabellen (partners, partner_pois, partner_onboarding). partnerService.js (CRUD, onboarding, IBAN/BTW validatie, contract status transitions, KPIs). 7 admin endpoints (106 totaal). PartnersPage.jsx (stats, tabel, detail 4 tabs, 3-step wizard). i18n 4 talen. Forward-compatible multi-tenant analyse.
- **Blok B: Intermediair State Machine** ✅ COMPLEET (04-03-2026): 1 DB tabel (intermediary_transactions) + ALTER TABLE payment_transactions (order_type). intermediaryService.js (13 functies: 6-stappen state machine, ACID commissieberekening, QR HMAC-SHA256, payout report). 9 admin endpoints (115 totaal). 2 BullMQ jobs (48 totaal). Feature flag hasIntermediary. PartnersPage transactions tab. i18n 4 talen.
- **Blok C: Financieel Proces** ✅ COMPLEET (04-03-2026): 4 DB tabellen (settlement_batches, partner_payouts, credit_notes, financial_audit_log). financialService.js (25 functies, 3 state machines, ACID settlements, BTW 21%, CSV exports). 20 admin endpoints (135 totaal). 2 BullMQ jobs (50 totaal). Feature flag hasFinancial. FinancialPage.jsx (5 tabs). i18n 4 talen.
- **Blok D: Agent Ecosysteem v5.1** ✅ COMPLEET (04-03-2026): 3 nieuwe agents: De Makelaar (intermediary monitor, Type A, elke 15 min), De Kassier (financial monitor, Type B, dagelijks 06:30), De Magazijnier (inventory sync, Type A, elke 30 min). 21 agents totaal (+3). 53 BullMQ jobs (+3). agentRegistry.js, AGENT_METADATA, workers.js, scheduler.js, dailyBriefing.js bijgewerkt. adminPortal.js v3.21.0.
- **Blok E: Admin Intermediair Dashboard** ✅ COMPLEET (04-03-2026): IntermediaryPage.jsx (4 tabs: Dashboard KPIs + conversie funnel Recharts, Transacties tabel + detail dialog + state timeline + actie buttons, Afrekeningen link naar Financial, Export CSV). 2 nieuwe admin endpoints (funnel + CSV export, 137 totaal). i18n 4 talen (~25 nieuwe keys). adminPortal.js v3.22.0.
- **Blok F: Testing & Compliance — FASE IV COMPLEET** ✅ COMPLEET (04-03-2026): 42 tests (20 E2E VERIFIED + 10 security PASS + 8 GDPR PASS + 4 feature flag MANUAL). 5 compliance documenten. 1 BullMQ job (intermediary-guest-anonymize, GDPR 24 maanden, 54 totaal). 4-weken staged rollout plan. 0 FAIL, 0 CRITICAL findings.

**Fase V — Multi-Tenant Configuratielaag (12 weken):**

*Architectuurbeslissing (5 maart 2026)*: Na evaluatie van Directus, Payload CMS 3.0, en architectuuraudit is besloten: GEEN extern CMS. Next.js 15 + React 19 + Tailwind CSS 4 + bestaande HB API.

- **V.0 Foundation** ✅ COMPLEET (05-03-2026): Next.js 15 project, middleware tenant-resolutie, HB API client, Apache vhost dev.holidaibutler.com, PM2 (port 3002). DB: destinations.branding JSON + pages tabel. Calpe homepage live (5 blocks).
- **V.1 Component Library MVP** ✅ COMPLEET (05-03-2026): 7 blocks (Hero, PoiGrid, EventCalendar, RichText, CardGroup, Map, ChatbotWidget). Layout (Header 5 nav items, Footer, Nav). UI (Button, Card, Rating, Badge). Theme systeem (CSS Custom Properties). ChatbotWidget: SSE streaming, floating bubble, 3 chatbot namen.
- **V.2 Calpe Pilot** ✅ COMPLEET (05-03-2026): 6 Calpe pagina's live (home, explore, events, restaurants, about, contact). POI detail route (/poi/:id). Testimonials block. Navigatie updates. 7 routes HTTP 200.
- **V.3 Texel** ✅ COMPLEET (05-03-2026): Texel live op dev.texelmaps.nl. Eigen branding (#30c59b groen, Montserrat/Open Sans). 6 pagina's, 1.660 POIs, Tessa chatbot. Apache VHost reverse proxy. Multi-tenant model 100% data-driven gevalideerd — geen frontend code-wijzigingen nodig.
- **V.4 Admin Portal Editors** ✅ COMPLEET (05-03-2026): 8 nieuwe admin endpoints (145 totaal), adminPortal.js v3.23.0. BrandingPage.jsx (7 kleurvelden, Google Fonts, logo upload, payoff per taal, stijl, live preview). PagesPage.jsx (CRUD, block editor 7 types, templates, status toggle). NavigationPage.jsx (nav items per destination, reordering, preview). 3 API services + 3 React Query hooks. i18n 4 talen (~90 keys). Dynamic navigation in Next.js Header.tsx (data-driven, hardcoded fallback). pages.js route fix in index.js. 20 bestanden (+2.150 regels). 15/15 deploy tests PASS.
- **V.5 P1 Blocks + Wildcard DNS Schaling** ✅ COMPLEET (06-03-2026): 5 nieuwe blocks: Cta (pure presentational, 3 bg styles), Gallery ('use client', lightbox met keyboard nav), Faq ('use client', accordion met aria-expanded), TicketShop ('use client', feature-gated ticketing, grid/list layout, prijs formatting), ReservationWidget ('use client', feature-gated reservations, zoekformulier + tijdslots). 2 SSR-safe wrappers (TicketShopWrapper, ReservationWidgetWrapper). Block registry 7→12. 3 Next.js API proxy routes (tickets, reservable-pois, reservation-slots/[poiId]). 7 nieuwe TypeScript interfaces. 3 nieuwe API functies (fetchTickets, fetchReservablePois, fetchAvailableSlots). Admin Portal PagesPage.jsx: BLOCK_TYPES 7→12, dropdown met i18n labels (4 talen). Middleware wildcard subdomain detection `*.holidaibutler.com` → slug = subdomain (met RESERVED_SUBDOMAINS safeguard). Apache wildcard VHost (HTTP). certbot-dns-hetzner geïnstalleerd (wildcard SSL cert pending DNS token). Pages route fix op Hetzner. 20 bestanden (+783 regels). Calpe 6/6 + Texel 6/6 regressie PASS.
- **V.6 Ontbrekende Blocks + Block Upgrades** ✅ COMPLEET (06-03-2026): 8 nieuwe blocks: Video (YouTube-nocookie/Vimeo/self-hosted, 3 layouts, VideoPlayer client component), SocialFeed (privacy-first consent placeholder, 4 platforms, SocialFeedWrapper Pattern D), ContactForm (honeypot + GDPR consent, configureerbare velden), Newsletter (MailerLite subscriber API), WeatherWidget (Open-Meteo API, ISR 30 min, compact/detailed, inline weer-iconen), Banner (info/warning/success/promo, dismissible localStorage), Partners (logo grid, grayscale hover), Downloads (file type iconen). 2 block upgrades: Hero (+video background), Gallery (+mixed media GalleryItem). Block registry 12→20. 3 nieuwe admin endpoints (148 totaal): social-links GET/PUT, translate POST (Mistral AI). 2 nieuwe public endpoints + 2 API proxy routes: contact POST, newsletter/subscribe POST. Auto-translate frontend op 3 admin pagina's. Social Media Links in BrandingPage. DB ALTERs: destinations.latitude/longitude/social_links. adminPortal.js v3.24.0. ~35 bestanden. Calpe 6/6 + Texel 6/6 regressie PASS.

- **Wave 1 Enterprise Admin Portal — Visuele Block Editor** ✅ COMPLEET (07-03-2026): JSON textarea vervangen door dedicated form editors per block type. 12 herbruikbare field components (TextField, NumberField, SelectField, SwitchField, ColorField, ImageUploadField, TranslatableField met 4 talen + auto-vertaal Mistral, ButtonListField, ItemListField, RichTextField TipTap WYSIWYG, CategoryFilterField). 20 block editors (React.lazy code-split). Block selector dialog (5 categorieën: Content/Media/Data/Interactie/Commerce, MUI Dialog, 3-kolom card grid). @dnd-kit drag-and-drop block reordering. Live preview iframe (postMessage protocol, responsive toggles Desktop/Tablet/Mobile). Typography hierarchy (6 levels: H1-H4/Body/Small, 18 CSS custom properties, live preview per level in BrandingPage). Block image upload endpoint (multer, 5MB, PNG/JPG/WebP/SVG). Apache CSP frame-ancestors fix voor preview iframe. 10 npm packages. 1 nieuw admin endpoint (149 totaal). adminPortal.js v3.25.0. ~38 nieuwe + ~8 gewijzigde bestanden (~3.200 LOC). 7/8 API tests PASS.

- **Wave 2+3 Professionele Features + Excellence** ✅ COMPLEET (07-03-2026): Wave 2 (8 features): Pagina-hiërarchie (parent_id FK + tree-view UI met expand/collapse), Media Library (4 CRUD endpoints + MediaPage.jsx grid/upload/filter/detail), 8 page templates (PageTemplateDialog), favicon/navicon upload, OG image upload, 5 button style varianten (15 CSS vars), footer config (data-driven Footer.tsx kolommen/copyright/social/newsletter), block-level styling (BlockStyleEditor: bg/border/padding/fullWidth + hb-websites wrapper). Wave 3 (3 features): Brand Visuals (upload 3-5 hero images + BrandVisualPicker quick-pick in HeroEditor), revisie-geschiedenis UI (PageRevisionsDialog, auto-snapshot bij save, max 20 per pagina, restore functie), GDPR Cookie Consent Banner (CookieBanner.tsx: 3 niveaus essential/analytics/marketing, 5 talen NL/EN/DE/ES/FR, tenant-aware kleuren, SocialFeed marketing consent gating via CustomEvent). 2 nieuwe DB tabellen (media, page_revisions) + 2 ALTER TABLE (pages.parent_id, pages.og_image_path). 8 nieuwe admin endpoints (157 totaal). 7 nieuwe + 22 gewijzigde bestanden (~2.300 LOC). Admin-module + hb-websites build 0 errors.

- **Command v5.0 Stap 1 — Bugfix + Stabilisatie** ✅ COMPLEET (07-03-2026): 4 kritieke bugfixes na handmatige browser-test. BUG-1: BlockErrorBoundary per block (React Error Boundary, crashende blocks tonen fallback i.p.v. hele pagina breken). BUG-2: media.uploaded_by type mismatch (INT→VARCHAR(36), admin_users.id is UUID). BUG-3: Logo/favicon/navicon broken (resolveAssetUrl() helper + HB_ASSET_URL env var voor browser-facing URLs, HB_API_URL=localhost niet zichtbaar voor browser). BUG-4: Map.tsx herschreven met POI markers (Leaflet markers met popup naam/categorie/rating/link, auto-fit bounds, Leaflet icon fix, /api/pois Next.js proxy route). DB data geverifieerd: 5 blocks met gevulde props op Calpe home. 1 DB migration (ALTER TABLE media). 3 nieuwe bestanden (BlockErrorBoundary.tsx, BlockRenderer.tsx, /api/pois/route.ts) + 4 gewijzigde bestanden (Map.tsx, Header.tsx, layout.tsx, page.tsx) + 1 migration. Deploy + build 0 errors.

- **Command v5.0 Stap 2 — Falende API Test Fix** ✅ COMPLEET (07-03-2026): ticketing-module test suite fix (recursieve ioredis require loop, bull queue mock, service mocks). 5/5 suites, 88/88 tests PASS (was 4/5, 70/70). Wave 1 8/8 API tests PASS.

- **Command v5.0 Stap 3+4 — Wave 2/3 Verificatie + Deploy** ✅ COMPLEET (07-03-2026): Code review Wave 2/3 alle features PASS. API endpoint tests (Media, Pages, Branding, Revisions) OK. Bugfix: pages SEO kolommen (`seo_title_de/es`, `seo_description_de/es`) ontbraken → migration 003. hb-websites 7/8 checks PASS. Admin build + deploy.

- **Command v5.0 Stap 5 — Sidebar Herstructurering** ✅ COMPLEET (07-03-2026): Flat 16-item MENU_ITEMS → 5 gegroepeerde MENU_SECTIONS (Overzicht, Content & Data, Commerce, Platform, Systeem). Typography overline sectiehoofdingen + Divider. Secties auto-hidden per RBAC role. i18n 4 talen.

- **Command v5.0 Stap 6 — Dashboard Improvements** ✅ COMPLEET (07-03-2026): QuickLinks hardcoded labels → i18n + 3 nieuwe links (Media, Branding, Pages) met RBAC. SCHEDULED_JOBS 40→54 entries (sync met BullMQ: +De Makelaar/Kassier/Magazijnier, reservation/ticket cleanup, GDPR, cost controller, POI tier).

- **Command v5.0 Stap 7 — Admin Portal Hardening** ✅ COMPLEET (07-03-2026): CRITICAL auth token fix: BrandingPage + PagesPage gebruikten `localStorage.getItem('admin_token')` (FOUT) → bare fetch() vervangen door axios client met auto-auth interceptor. 8 hardcoded UI strings → i18n. 17 nieuwe i18n keys (4 talen). 8 bestanden gewijzigd.

- **Command v5.0 Stap 8 — hb-websites Frontend Hardening** ✅ COMPLEET (07-03-2026): XSS preventie: sanitizeHtml() server-safe utility op RichText + FAQ blocks. Error handling: try/catch op alle 6 API proxy routes (502 fallback). Security: console.log → dev-only (4x), postMessage origin validation (trusted domains whitelist), API error log sanitized (pathname only). 14 bestanden (1 nieuw). Build + deploy 0 errors.

- **Repair Command v6.0 — Browser-Verified Fixes (3 rondes)** ✅ COMPLEET (07-08-03-2026): **Ronde 1** (07-03): 6 blokken gediagnosticeerd op Hetzner. BLOK A: express.static media/block-images. BLOK B: preview iframe PREVIEW_DOMAINS mapping. BLOK C: map = content issue. BLOK D: sidebar = browser cache. BLOK E: logo restored. BLOK F: frontend bevestigd. **Ronde 2** (08-03): Favicon/navicon upload endpoint `/:destination/:type` met VALID_BRANDING_TYPES + auto-save MySQL branding JSON. Apache X-Frame-Options → CSP frame-ancestors voor preview iframe embedding. **Ronde 3** (08-03): STORAGE_ROOT architectuurwijziging — alle upload directories (branding, media, block-images) verplaatst BUITEN platform-core naar `/var/www/.../storage/` om CI/CD wipes te overleven. Apache routing fix: alleen `/api/v1`, `/api/auth`, `/api/consent` naar backend (3001), Next.js API routes (`/api/pois` etc.) naar port 3002. 21 media files + 2 logos hersteld. 4 bestanden gewijzigd. Commits f591b49, 482435e, cfea86f.

- **Command v7.0 — Fase V Voltooiing (8 stappen)** ✅ COMPLEET (08-03-2026): **STAP 1A**: Dark mode leesbaarheid — 9 bestanden hardcoded kleuren (`#fafafa`, `#e2e8f0`, `#1e293b`, `#fff`) → MUI theme tokens (`action.hover`, `divider`, `text.primary`, `background.paper`). Bestanden: Header.jsx, MediaPage.jsx, PagesPage.jsx, NavigationPage.jsx, BlockStyleEditor.jsx, BlockEditorCard.jsx, LoginPage.jsx. **STAP 1B**: BrandingPage 12 flat Cards → 9 MUI Accordions (default expanded: Colors + Logo & Brand). SafeImage component (broken image handler met error state). Footer wireframe preview (dashed-border boxes). Global footer info Alert. **STAP 1C**: Media Library bulk select — Checkbox overlay per item, Select All/Deselect All toggle, bulk delete met bevestigingsdialog (`Promise.allSettled`). **STAP 2B**: Chatbot 4 quick actions in 4 talen (NL/EN/DE/ES): Programma samenstellen, Zoeken op Rubriek, Routebeschrijving, Tip van de Dag. **STAP 2C**: Hero block crash fix — null-guard op image prop (`hasImage` check), `onError` handler op img tags. **STAP 2D+2E**: POI category filters — DB page blocks gecorrigeerd: Calpe explore `["restaurant","museum"]` → correcte categorieën (`Food & Drinks`, `Culture & History`, etc.), Texel explore geen filter → Nederlandse categorieën (`Eten & Drinken`, `Natuur`, etc.). Restaurants pagina's waren al correct. **STAP 3A**: 6 design templates (Modern/Klassiek/Elegant/Kleurrijk/Zakelijk/Minimaal) — frontend-only presets die BrandingPage formulier vullen. Template selector dialog met kleur-preview cards. `brandingTemplates.js` nieuw bestand. **STAP 3B**: 5 geavanceerde stijlopties (spacingScale, shadowIntensity, imageStyle, headingTextTransform) + 4 CSS custom properties (`--hb-spacing-scale`, `--hb-shadow`, `--hb-image-radius`, `--hb-heading-transform`) in theme.ts. **STAP 4**: SEO hardening — `sitemap.ts` (dynamisch per tenant, pagina's + top 100 POIs, ISR 1h), `robots.ts` (allow `/`, disallow `/api/`, `/_next/`, `/preview/`), `seo.ts` uitgebreid met 5 JSON-LD schemas (WebSite, BreadcrumbList, FAQPage, Event, LocalBusiness) + canonical URL + hreflang alternates + Twitter Cards (`summary_large_image`). `page.tsx` injecteert JSON-LD scripts. **STAP 6**: Playwright E2E — `playwright.config.ts` (3 projecten: calpe-desktop, texel-desktop, calpe-mobile) + 15 test bestanden (93 tests): homepage, navigation, explore, restaurants, events, contact, poi-detail, chatbot, seo, responsive, cookie-banner, theme, blocks, performance, accessibility. **STAP 7**: Dashboard uitgebreid met 3 nieuwe cards: WebsiteStatsCard (pagina's/blocks/media), CommerceOverviewCard (transacties/tickets/reserveringen), ChatbotPerformanceCard (sessions/berichten/avg responstijd). 1 nieuw bestand, 3 SEO bestanden, 15 test bestanden, ~16 gewijzigde bestanden. Admin-module build 0 errors.

- **Command v7.1 — Frank's Feedback Fixes (7 stappen)** ✅ COMPLEET (08-03-2026): **STAP 1**: Block i18n resolution — `resolveLocalizedProps()` recursieve utility in `i18n.ts`. Root cause fix Hero crash: TranslatableField slaat i18n-objecten op (`{en:"...",nl:"..."}`), block components verwachtten strings → React crashte op "Objects are not valid as a React child". Nieuwe utility detecteert i18n-objecten (keys subset van supported locales) en resolvet naar locale-specifieke strings. `page.tsx` roept `resolveLocalizedProps(block.props, locale)` aan vóór block rendering. **STAP 2**: Hero height prop — 4 opties (compact/default/tall/fullscreen) met Tailwind mapping. `resolveAssetUrl()` voor images. HeroEditor.jsx SelectField "Height". **STAP 3**: Map gekleurde markers per categorie — `CATEGORY_COLORS` mapping (8 kleur-groepen voor EN Calpe + NL Texel categorieën). `L.divIcon` met gekleurde cirkel (24px, witte border, schaduw). Legenda onder kaart (alleen gebruikte kleuren). `.hb-marker` CSS override. **STAP 4**: Quick action chatbot buttons — CustomEvent patroon `hb:chatbot:open`. `chatbot-actions.ts` (shared QUICK_ACTIONS 4 talen + `openChatbotWithMessage()` dispatcher). `ChatbotButton.tsx` ('use client' wrapper). ChatbotWidget.tsx event listener. Hero.tsx + Cta.tsx: `btn.variant === 'chatbot'` → ChatbotButton rendering. ButtonListField.jsx: 'Chatbot Action' variant + action dropdown. **STAP 5**: Button style defaults — `hexToRgb/rgbToHex/darkenHex/contrastColor/deriveButtonDefaults` helpers in BrandingPage.jsx. Lege button kleuren auto-derived van primary/secondary bij form init. **STAP 6**: Footer i18n — `resolveTitle()` helper in Footer.tsx voor `string | Record<string,string>` backward-compatible. Admin: copyright + column title TextField → TranslatableField. **STAP 7**: Branding uitbreiding — Chatbot Config accordion (naam, welkomstbericht TranslatableField). Header Style accordion (solid/transparent variant, sticky toggle). Header.tsx: transparent/sticky support. layout.tsx: chatbotName doorgeven. 18 bestanden (1 nieuw: ChatbotButton.tsx + 17 gewijzigd). Build 0 errors. Deploy Hetzner + admin 3 omgevingen. Commit 5daab9e.

- **Command v8.0 — Fase V Final — Customer Portal Kwaliteit** ✅ COMPLEET (08-03-2026): **STAP 1**: Chatbot SSE proxy route (`/api/holibot/chat/stream`) — Next.js API route proxyt naar backend, browser hoeft niet meer naar localhost:3001. **STAP 2**: POI categorie filtering fix — backend `categories` (meervoud) support + `min_reviews` filter + quality sort. **STAP 3**: POI detail pagina volledig uitgebouwd — 2-kolom layout (main + sidebar), openingstijden dual-format (Calpe object / Texel array), amenities, accessibility, parking, highlights, enriched description, reviews distribution bar chart, social links, Google Maps link. OpeningHours + FeatureList componenten. POI type: 19→42 velden. **STAP 4**: Reviews veldnamen fix (user_name, review_text, visit_date) + Testimonials.tsx. **STAP 5**: Button color preview fix — deriveButtonDefaults lege string → fallback kleuren. 3 nieuwe + 9 gewijzigde bestanden. Commits 3c325cc + 6d425fc.

- **Repair Command v9.0 — Chirurgisch Repair dev.holidaibutler.com** ✅ COMPLEET (09-03-2026): 9 fixes na browser-diagnose. **FIX 1**: Chatbot sessionId (useRef UUID) + SSE proxy numeric destination ID mapping (eigen DESTINATION_IDS, niet browser header). **FIX 2**: Homepage PoiGrid categoryFilter verwijderd (geen match met DB categorieën: "restaurant"≠"Food & Drinks") + Partners block verwijderd (geen logos data). **FIX 3**: Footer text-on-primary→text-white (donkere tekst op donkere bg). **FIX 4**: POI detail image fallback (gradient placeholder met locatie-icoon + enriched_tile_description als samenvatting). **FIX 5**: Restaurants categoryFilter→alleen `["Food & Drinks"]` + min_rating/min_reviews alleen met categoryFilter. **FIX 6**: BrandingPage button empty string check (b.buttons.primary?.bg i.p.v. Object.keys().length). **FIX 7**: Events DateBlock fallback (datum als visueel element zonder image). **FIX 8**: PoiGrid round-robin categorie mix (interleave per categorie voor visuele variatie). **FIX 9**: BrandingPage i18n crash fix — resolveI18nDisplay() helper voor footer wireframe preview (col.title + copyright objecten). 8 bestanden gewijzigd + 2 SQL updates (pages id=1, id=4).

- **Diagnostic Repair v10.0 — 8 Browser-Verified Fixes** ✅ COMPLEET (09-03-2026): Nieuw protocol: DIAGNOSE→FIX→BEWIJS (diagnostische output VOOR en NA elke wijziging). **FIX 1**: Chatbot Calpe retourneerde Texel data — root cause: `calpe.config.js` chromaCollection was `holidaibutler_pois` (oud, bevat Texel data) i.p.v. `calpe_pois`. Bewijs: curl retourneert nu Calpe restaurants. **FIX 2**: POI detail crash (HTTP 500→200) — FeatureList.tsx `normalizeItem()` functie normaliseert `[{key: boolean}]` objecten naar strings, skipt `false` features. **FIX 3**: Homepage 0 POIs — v9's `EXCLUDED_CATEGORIES` post-fetch filter faalde omdat API met `sort=rating:desc` alleen Shopping retourneerde. Fix: `TOURIST_CATEGORIES` whitelist direct naar API als `categories` param (Food & Drinks, Beaches & Nature, Culture & History, Active, Recreation, Nightlife + NL equivalenten). Nu 6 POIs zichtbaar met round-robin mix. **FIX 4**: Button color swatches wit — IIFE merge pattern: DB values + `deriveButtonDefaults()`, lege strings vallen terug op derived kleuren. **FIX 5+6**: Footer + Restaurants reeds werkend (v9 bewezen). **FIX 7**: POI category badges — `CATEGORY_COLORS` mapping (8 kleur-groepen voor EN+NL categorieën, inline styles). Bewijs: `#FEE2E2` (Food) + `#FFEDD5` (Active) distinct. **FIX 8**: Chatbot config uitbreiding — ColorField, position Select (bottom-right/left), 4 quick action Checkboxes met FormControlLabel. 3 bestanden gewijzigd. Commit 75566b1.

- **Chirurgisch Command v11.0 — 10 Fixes, 12 Acceptatiecriteria** ✅ COMPLEET (09-03-2026): Frank's correcties op initial plan verwerkt (4 corrections). **FIX 1+6**: Tip van de Dag — dedicated `/daily-tip` Next.js API proxy route naar `GET /api/v1/holibot/daily-tip` endpoint. ChatbotWidget TipCard component (POI/Event card met naam, afbeelding, categorie, rating, adres, "Bekijk details" link, refresh knop). localStorage excludes voor dagelijkse rotatie. `__TIP_VAN_DE_DAG__` sentinel interceptie in sendMessage(). **FIX 3**: POI detail image layout — responsive per image count: 1 image full-width, 2-3 images main + thumbnails eronder, 4+ images grid layout. Geen wit gat meer. **FIX 4**: Event detail pagina (`/event/:id`) — intern, niet extern (was songkick.com). Nieuwe `fetchEvent()` in api.ts. EventCalendar links intern. Hero image/DateBlock placeholder, alle datums, locatie, categorie badge. SEO metadata. **FIX 5**: BrandingPage preview panel uitgebreid — alle 5 button variants (Primary/Secondary/Outline/Ghost/Link) met actuele stijlen, shadow preview, image style preview, heading transform, spacing indicatie. **FIX 7**: Quick action buttons in blocks — ButtonListField.jsx 4 chatbot actions (plan_day, browse_categories, route_planner, tip_of_day) met ACTION_MESSAGES mapping. Hero.tsx + Cta.tsx geven `btn.chatbotAction` door aan ChatbotButton → CustomEvent `hb:chatbot:open` → ChatbotWidget. **FIX 8**: Filter chips — PoiFilterBar (categorie chips met kleurcodering, client-side filter) + EventFilterBar (Vandaag/Deze week/Deze maand, client-side datum filter). PoiGridFiltered + EventCalendarFiltered server wrapper blocks. Block registry 20→22. **FIX 9**: Footer social icons — backend fallback in pages.js: als `destinations.social_links` NULL, fallback naar `branding.socialLinks` (waar Admin Portal de data opslaat). Frank's ingevoerde URLs (Instagram, Facebook, LinkedIn) nu zichtbaar in footer. **FIX 10**: quickActionFilter prop doorgewired via layout.tsx naar ChatbotWidget. Admin Portal chatbot config quickActions array filtert welke actions getoond worden. 6 nieuwe + 10 gewijzigde bestanden. 12/12 acceptatiecriteria PASS.

- **Command v12.0 — 8 Fixes + Onboarding Wizard, 11 Acceptatiecriteria** ✅ COMPLEET (09-03-2026): **FIX 1**: Hero chatbot button 404 — DATA fix: `variant: "secondary"` + `href: "/chatbot"` → `variant: "chatbot"` + `chatbotAction: "general"` in pages DB. Hero.tsx rendert nu ChatbotButton (geen Link). **FIX 2B**: POI detail map toonde ALLE 500 POIs — Map.tsx `staticMarkers` prop: als markers meegegeven, skip fetch-all en render alleen die markers. `poi/[id]/page.tsx` geeft 1 marker mee. MapProps interface uitgebreid met MapMarker type. **FIX 4**: Categorie kleuren matchen nu Customer Portal — CATEGORY_COLORS in PoiGrid.tsx, PoiFilterBar.tsx, Map.tsx bijgewerkt met gradient-derived kleuren uit `categoryConfig.ts` (Calpe EN + Texel NL). **FIX 6**: Footer brand kolom toonde social icons — social rendering verwijderd uit `case 'brand'`. `{ type: 'social', title: 'Social' }` toegevoegd aan default footer columns. **FIX 8**: Onboarding wizard — OnboardingPage.jsx met 5-stappen MUI Stepper (Basis/Branding/Modules/Navigatie/Pagina's). Backend `POST /api/v1/admin-portal/onboarding/create` endpoint: INSERT destinations + INSERT pages (6 templates) + nav_items in config JSON. RBAC platform_admin. DNS/Apache instructies dialog. Sidebar menu-item. i18n 4 talen. 158 admin endpoints (+1). **FIX 2A/3/5/7**: verificatie reeds werkend (v11). 1 nieuw + 11 gewijzigde bestanden + 1 DB update. 11/11 acceptatiecriteria PASS.

Technische blauwdruk: `HolidaiButler_Technische_Blauwdruk_v3_Definitief_NextJS_HB_API.docx`

**Fase VI — UX Revolution + WarreWijzer (6-8 weken):**

Nu de Next.js frontend en component library er staan (Fase V), focust Fase VI op:
- **Mobiele UX polish**: Benchmark Google Maps, TripAdvisor, GetYourGuide. Miller's Law, Jakob's Law, Hick's Law toepassen op de Next.js blocks. Touch-optimalisatie, gesture support, skeleton loading.
- **WarreWijzer content**: ~300 POIs importeren (Apify + OpenStreetMap), Wijze Warre chatbot configureren (5 talen: BENL/NL/FR/DE/EN), agenda-bronnen koppelen, branding conform warredal.be.
- **UX-features uit Deel 11**: Geïntegreerd in de Next.js block library (filter patterns, navigation patterns, card interactions).
- **A11y audit**: WCAG AA op alle blocks, keyboard navigatie, screen reader testing.

**Fase VII — Polish, Scale & Launch (3-4 weken):**
- **E2E test suite**: Playwright tests voor alle blocks × alle tenants × alle locales.
- **Load testing**: k6/Artillery 10.000 concurrent users op Next.js + API.
- **CDN**: Cloudflare/BunnyCDN voor POI-images (12.4 GB) en Next.js static assets.
- **Disaster recovery**: RTO < 4h, RPO < 1h. Database read replica voor analytics.
- **Go-live**: Migratie van Vite SPA naar Next.js SSR per bestemming (geleidelijk, met 301 redirects).
- **Monitoring**: Lighthouse CI in pipeline, Core Web Vitals tracking, Sentry voor Next.js.

### 9.5 State-of-the-Art Vervolgstappen

Met het enterprise-fundament op orde zijn deze vervolgstappen nodig voor state-of-the-art niveau:

**A. Predictive Intelligence Layer (Agent Niveau 8)**
- De Weermeester → real-time predictive analytics met ML-modellen
- Seizoensgebonden POI-aanbevelingen op basis van historische pageview- en chatbot-data
- Recommendation Engine (gebruikersgedrag × weer × tijd × locatie)
- Gedeactiveerde strategy-agents reactiveren met gereviseerde, bewezen nuttige taken

**B. Autonomous Self-Healing & Observability**
- Grafana/Prometheus stack voor real-time metrics (response times, error rates, throughput)
- Self-healing: agents detecteren en herstellen automatisch foutpatronen
- Distributed tracing (OpenTelemetry) end-to-end
- Canary deployments met automatische rollback (2σ baselines al aanwezig)

**C. Advanced Content Intelligence**
- A/B testing framework POI-beschrijvingen (engagement meting)
- Content Freshness Score: automatische detectie verouderde POI-info via scheduled scraping
- Multi-modal content: image captioning, video thumbnail extractie, TTS audio guides
- RAG 2.0: hybride search (keyword + semantic + geo) voor chatbot

**D. Platform Resilience & Schaalbaarheid**
- Load testing (k6/Artillery) 10.000 concurrent users
- Database read replica voor analytics zonder productie-impact
- CDN (Cloudflare/BunnyCDN) voor POI-images (huidige 12.4 GB single server)
- Disaster recovery RTO < 4h, RPO < 1h (backups al dagelijks)
- Redis Cluster high-availability (huidige single-node)

**E. Regulatory & Compliance Excellence**
- EU AI Act Transparency Dashboard (model versies, decision logs, bias monitoring)
- GDPR DSAR automation (export binnen 24h, nu handmatig)
- Content-Security-Policy headers alle domeinen
- Jaarlijkse penetration test + vulnerability disclosure policy

**F. Developer Experience & CI/CD Excellence**
- ✅ CI/CD trigger optimalisatie (26-03-2026): hb-websites + platform-core main-only triggers (waren 3x redundant)
- Feature flags per destination
- E2E test suite (Playwright/Cypress) alle kritieke user flows
- Staging smoke tests per PR
- API versioning (v1/v2) backward compatibility
- OPEN: Aparte deploy-paden per omgeving voor hb-websites + platform-core (zodat dev/test/main triggers weer zinvol worden)

### 9.6 Tijdlijn & Budgetindicatie

| Fase | Effort (uren) | Doorlooptijd | API kosten | Overig |
|------|--------------|--------------|------------|--------|
| I: Foundation Hardening | 80-120 | 4-6 weken | ~20-40 EUR | ✅ COMPLEET (EUR 74,41) |
| II: Active Module Upgrade | 100-140 | 6-8 weken | ~30-50 EUR | ✅ COMPLEET |
| III: Commerce Foundation | 160-240 | 8-12 weken | ~10-20 EUR | ✅ COMPLEET |
| IV: Intermediair Module | 120-160 | 6-8 weken | ~10-20 EUR | ✅ COMPLEET |
| **V: Multi-Tenant Configuratielaag** | **200-280** | **12 weken** | **~0 EUR** | **Next.js + blocks** |
| VI: UX + WarreWijzer | 120-180 | 6-8 weken | ~40-80 EUR | WarreWijzer POIs |
| VII: Polish & Launch | 60-80 | 3-4 weken | ~20-30 EUR | Load testing |
| **TOTAAL** | **840-1.200** | **42-56 weken** | **~130-240 EUR** | **+ externe kosten** |

### 9.7 Directe Vervolgstappen

1. **Start Fase II**: Active Module Upgrade — focus Chatbot upgrade en POI-module verbetering
2. **UX-Features Agenda** (Deel 11) integreren in Fase II Customer Portal planning
3. **Adyen account setup + KYC-proces** nu starten (administratief, blokkeert geen development)
4. **Juridisch advies** commissie/intermediairmodel inwinnen vóór Fase IV
5. **WarreWijzer POI Discovery** (Apify + OpenStreetMap) alvast parallel starten
6. **State-of-the-art vervolgstappen** (9.5) geleidelijk integreren in reguliere fasen

---

## Deel 10: WarreWijzer Briefing

> **Bron**: WarreWijzer_starting_points.docx (28-02-2026), volledig geïntegreerd.

### 10.1 Concept & Positionering

- **Type**: Recreatiedomein (NIET toeristische gemeente) — vereist aangepaste POI-categorisatie
- **Website**: www.warrewijzer.be
- **destination_id**: 4 (Alicante behoudt 3)
- **Locatie**: Ketelstraat 77, 3680 Maaseik, België
- **USPs**: Back to basic, slow living, reconnect to nature, offline, bewust

### 10.2 Doelgroep

- **Primair**: Gezinnen met kinderen (t/m 14 jaar), actieve senioren (55-75 jaar)
- **Herkomst**: België, Zuid-Nederland, Duitse grensstreek
- **Profiel**: Hoger opgeleid, 1.5-2.5× modaal inkomen
- **Interesses**: Actief, natuur, cultuur, gastronomie

### 10.3 Taalversies (5 talen)

| Taal | Code | Chatbot-naam | Prioriteit |
|------|------|-------------|------------|
| Vlaams-Nederlands | BENL | Wijze Warre | Primair |
| Nederlands | NL | Wijze Warre | Primair |
| Frans | FR | Nader te bepalen | Secundair |
| Duits | DE | Nader te bepalen | Secundair |
| Engels | EN | WarreXplore | Tertiair |

**LET OP**: Vlaams profiel ≠ Nederlands profiel. Verschillende tone-of-voice, uitdrukkingen, spelling (bv. "ge" vs "je"). Grootste doelgroep is Vlaanderen.

### 10.4 Technische Architectuur

**Omgevingen:**
- Dev: dev.warrewijzer.be | Admin: admin.dev.warrewijzer.be
- Test: test.warrewijzer.be | Admin: admin.test.warrewijzer.be
- Main: www.warrewijzer.be | Admin: admin.warrewijzer.be

**Database**: pxoziy_db1 op Hetzner, destination_id = 4
**Tabellen**: POI, reviews, QnA, agenda, agenda_dates, admin_users, page_views, destinations
**DNS**: Hetzner nameservers (hydrogen, oxygen, helium)
**GitHub**: Dev/Test/Main branches conform multi-destinatie strategie

### 10.5 POI-strategie

- **Aantal**: circa 300 POIs
- **Selectiecriteria**: Gemiddelde reviewscore 4.5+, aantal reviews, toeristische/thematische relevantie
- **Actieradius**: circa 15 km + selectie unieke POIs binnen 25-30 km
- **Categoriemix**: Actief (25%), Cultuur (25%), Gastronomie (20%), Natuur (30%)
- **Maps-template**: Max 25 POIs initieel, dynamische aanpassing bij zoom/filter
- **POI Tier 1-4**: Conform Calpe/Texel configuratie

**Databronnen:**
- Apify (compass/crawler-google-places) met directe image download naar Hetzner `/var/www/api.holidaibutler.com/storage/poi-images/`
- OpenStreetMap (postcodegebied 3680)
- Visit Maaseik (cultuur, wandelen, fietsen, musea, eten & drinken)
- Wandelen in Limburg, TripAdvisor, AllTrails
- Natuurgebieden: Tosch-Langeren, Wateringen, Rubensgoed, Bergerven
- Golfbanen regio Maaseik

### 10.6 Chatbot: Wijze Warre

- **Configuratie**: Conform Calpe/Texel (timeOfDayTypes, POI-deduplicatie, SpellService Levenshtein fuzzy, anti-hallucinatie MistralAI)
- **Quick Actions (4x)**: Programma samenstellen, tip van de dag, routebeschrijving, zoeken op rubriek
- **Spraak**: Google Cloud TTS | Chirp3-HD (vrouw), GDPR/AI Act getoetst
- **Q&A vectorisatie**: 50 per POI per taalversie in ChromaDB
- **Tone-of-voice**: Vriendelijk, betrouwbaar, respectvol. Vlaams profiel als primaire doelgroep

### 10.7 Agenda-bronnen

- Visit Maaseik evenementen
- Uit in Vlaanderen (Maaseik)
- Wattedoen.be (Maaseik)
- ALLEvents.in (Maaseik)
- Cultuurcentrum Achterolmen
- Mazine magazine
- Bibliotheek Maaseik
- Maaseik.be (plechtigheden, kermissen)
- Cultuur Smakers Maaseik

### 10.8 Security & Compliance

Volledig conform Calpe/Texel: SSL/TLS, HTTPS, rate limiting (10 req/s + burst), DDoS bescherming, beveiligde DB verbindingen, CORS, request validatie, audit logging. 100% GDPR en EU AI Act compliant.

### 10.9 Look & Feel

Branding, lettertype, kleurcodes en sprookjesfiguren conform warredal.be. Mobile-first principe altijd leidend. Design thinking gecombineerd met evidence-based design.

---

## Deel 11: UX-Features Agenda

> **Bron**: UX-features_design_agenda_HolidaiButler.xlsx + Strategic Roadmap Advisory v2.0 correcties.

### 11.1 Correcties (v2.0)

| Locatie | Was | Wordt | Reden |
|---------|-----|-------|-------|
| Kolom C titel | Waarom moet het er? | Waarom werkt het | Betere afspiegeling: beschrijft waarom een feature effectief is |
| Kolom F titel | Demo URL | Bron URL | De kolom bevat referentie-/bronlinks, geen demo's |
| Feature #2 naam | Kaart-visualisering | Kaart-clustering | Specificer: betreft clustering-functionaliteit |

### 11.2 Top 10 Features (highlights)

| # | Feature | Waarom werkt het | Proof-of-work | Status |
|---|---------|------------------|---------------|--------|
| 1 | Gepersonaliseerde zoekresultaten | Persoonlijke relevantie, hogere conversie | Airbnb, Google, GetYourGuide | Concept |
| 2 | Kaart-clustering & kaart-fixed discovery | Ruimtelijk inzicht, snellere navigatie | Google Maps, Citymapper | Concept |
| 3 | Smart/advanced Filters | Minder keuzestress, snellere resultaten | Airbnb, Booking, GetYourGuide | Concept |
| 4 | Sticky CTA's/affiliate banners | Makkelijker mobiel gebruik | Booking.com, GetYourGuide | Concept |
| 5 | Agenda-synchronisatie | Verlaagd frictie, grotere conversie | Triplt, Outlook, Fantastical | Concept |
| 6 | Gedeelde/aanpasbare agenda's | Vermindert coördinatie-overhead | TimeTrees, Google Kalender | Concept |
| 7 | Chatbot: Wijze Warre / Tessa / HoliBot | Persoonlijke 24/7 AI-gids per bestemming | MistralAI, ChromaDB RAG | Live |
| 11 | Micro-interacties, motion, affordances | Snelle waardering, minder cognitieve belasting | Duolingo, Google Material | Concept |
| 12 | Toegankelijkheid & multi-language | Bereik & wettelijke plicht, inclusie | Booking.com, WSC, Apple | Deels live |
| 18 | Natural Language Input | Verlaagde drempel | Fantastical, Google Calendar | Deels live |

> Volledige 25 features met alle kolommen: zie Excel-bronbestand UX-features_design_agenda_HolidaiButler.xlsx.

---

## Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **8.14** | **2026-04-20** | **Corporate UX Upgrade (v4.52.0→v4.54.0)**. v4.52.0: Content Studio Polish (12 opdrachten, Content Top 25, kalender dag/week, i18n 5 talen, health-check job, 282 endpoints). v4.53.0: Content Items Enterprise Density + ConceptDialog Focus Mode (density toggle, keyboard nav j/k/Enter, inline titel editing, full-screen F-key, auto-save draft 10s, CORS publiqio.com, 289 endpoints). v4.54.0: Corporate UX Upgrade Command v4.0 — sidebar herstructurering, kalender corporate polish (mini-kalender, keyboard nav, workload indicator, CSV/ICS export, print view), analytics herstructurering, Platform Dashboard (personaliseerbare KPI widgets, delta badges), Onboarding Widget Intercom-stijl (persistent cirkel, 6-10 stappen, NotificationsCenter, createPortal), performance (code-splitting 6 chunks, asset cleanup 1.3GB→7.9MB), WCAG 2.1 AA (21 fixes). 295 endpoints. 74 BullMQ jobs. adminPortal.js v3.47.0. |
| 8.13 | 2026-04-18 | PubliQio Content Studio Polish v4.52.0: 12 opdrachten, Content Top 25 overzicht, 5 UX bugfixes, kalender dag/week, i18n 5 talen, health-check job. 282 endpoints, 74 jobs. |
| 8.12 | 2026-04-15 | PubliQio Content Bronnen v4.51.0: 19 opdrachten, 6 sub-tabs, 7 BullMQ jobs, visual discovery pipeline, GSC integratie. 279 endpoints, 72 jobs. |
| **8.04** | **09-04-2026** | **PubliQio Landing Page Polish & Branding (v4.43.0)**. PubliQioText component (9 locaties), 7e USP, ConceptMockup herbouwd, mobiele progressive disclosure, taalswitch vlaggen, login+demo dark theme, PrivacyPage GDPR, admin sidebar branding, per-user voorkeurstaal (preferred_language + PATCH endpoint). 252 endpoints. adminPortal.js v3.44.0. CLAUDE.md v4.43.0. |
| **7.94** | **03-04-2026** | **Content Studio Multi-Source Image Integratie**. Pexels API client (pexelsClient.js: searchPexels, landscape, genormaliseerde objects). Flickr API client (flickrClient.js: searchFlickr, commercial-use license filter CC BY/CC BY-SA/CC0/PDM). imageSelector.js cascading fallback: tier 4a Unsplash (0.3) → 4b Pexels (0.25) → 4c Flickr (0.2). 2 admin endpoints: POST /content/images/pexels + /content/images/flickr. contentService.js searchPexels() + searchFlickr(). Env vars PEXELS_API_KEY + FLICKR_API_KEY + FLICKR_API_SECRET. Verified: Pexels 200 OK, Flickr 200 OK (CC-licensed). 248 endpoints. CLAUDE.md v4.34.0. |
| **7.92** | **01-04-2026** | **Fase VI-C Desktop Template Polish + Encoding Fix + Page Builder Completie COMPLEET**. BLOK H: Inter font (branding→Inter), Restaurants uit nav, WCAG dubbel icoon (Nav.tsx verwijderd). BLOK I: Quick actions (Routebeschrijving+Zoeken op Rubriek), Je/U audit (payoff "Uw"→"Je", DE "Sie"→"du"). **Encoding fix**: 176 DB records double-encoded UTF-8 (50 tile_nl + 29 tile_en + 92 highlights + 3 namen + destinations branding/config). Python fix_encoding.py. Calpe 100% clean. BLOK J: Footer 4-kolom (Brand+Social/PLATFORM/SUPPORT/JURIDISCH, "Gemaakt met ❤️ op Texel"). ProgramCard categorie-tijdsloten (Winkelen 0.5u+2 POIs, Activiteit 1.5u, Ontbijt 1u). BLOK K: Chatbot CategoryBrowser+ItineraryWizard CalpeTrip CSS (gold borders, hover). Quick action routing (ChatbotWidget event handler). WCAG modal viewport fix. POI paginering: "Meer POI's laden" (offset-based, 1.159 POIs). PoiGridFiltered zonder default categorie-filter. CalpeTrip mobiel BESCHERMD (PROTECTED_FILES.md). **Page Builder 100%**: 35 blocks, 36 editors (0 gaps), 8 templates (Homepage/Explore/Events updated). TestimonialsEditor nieuw. desktop_hero/desktop_program_tip/desktop_events/category_grid editors geregistreerd. CLAUDE.md v4.32.0. |
| **7.90** | **29-03-2026** | **Fase VI-C: Desktop Homepage Redesign (Texel testomgeving) — BLOK A-E+F+G COMPLEET**. BLOK A: Calpetrip referenties gefixed (getPortalUrl→relatief, MapPreview generiek, analytics logo_clicked). DesktopHero met chatbot-input + quick actions + achtergrondafbeelding. BLOK B: DesktopProgramTip 2-kolom (60/40, forceShow prop). DesktopEvents 3-kolom grid. CategoryGrid 4-kolom (gradient, POI counts meta.total). BLOK C: Map overlay (bottom-4, "Ontdek ruim 1.600 locaties"). Map 20 POIs round-robin toeristische categorieën (was 500+). Legenda NL i18n (Eten & Drinken/Stranden & Natuur/Cultuur & Historie/Actief & Sport/Recreatief). PoiGrid title prop. BLOK D: Footer info@texelmaps.nl, MobileBottomNav md:hidden, responsive 9/10 PASS. BLOK E: 7 command block-type aliassen, Homepage template 11 blocks, admin 3x deployed. BLOK F: Calpe ongewijzigd (afspraak — pas na Texel goedkeuring). E2E: Texel 6/6, Calpe 4/4, 0 cross-dest leaks. Block registry 26→35. CLAUDE.md v4.30.0. |
| **7.88** | **27-03-2026** | **Mobiele Page Builder Integratie + Desktop Redesign + Routing COMPLEET**. (A) Block Visibility Systeem: `visibility` property op BlockConfig (all/mobile/desktop). 4 mobile block types. Hardcoded MobileHomepage verwijderd. (B) Desktop homepage redesign: compact hero + poi_grid + event_calendar grid + map + chatbot CTA. Oude static blocks verwijderd. (C) Apache: calpetrip.com ALL traffic → Next.js port 3002 (was: alleen mobiel). Oude Vite SPA niet meer gebruikt. holidaibutler.com B2B corporate page hersteld. (D) Admin Portal: 4 editors, 'Mobiel' categorie, visibility selector. (E) Alle Calpe+Texel pages published. Block registry 22→26. Toekomstbestendig: nieuwe bestemmingen via Admin Portal page builder. CLAUDE.md v4.28.0. |
| **7.87** | **26-03-2026** | **CI/CD Optimalisatie + ProgramCard Fixes**. deploy-hb-websites.yml + deploy-platform-core.yml triggers gewijzigd: `branches: [dev, test, main]` → `branches: [main]`. Root cause: beide workflows deployen naar 1 server-pad (geen aparte dev/test/prod directories zoals admin-module/customer-portal wél hebben). Gevolg: elke commit triggerde 3 redundante deploys die in de concurrency queue stonden, cascading failures veroorzaakten, en ~66% onnodige GH Actions runs. admin-module + customer-portal behouden 3-branch triggers (hebben aparte deploy-paden). ProgramCard: event dagdeel-filtering + toerisme-relevantie (NON_TOURIST_EVENT_KEYWORDS, DAY_PART_HOUR_RANGES) + minimum 3 items. Calpe avond maxFood 1→3 (root cause: avondprogramma Food & Drinks dominant, maar maxFood=1 blokkeerde alles behalve 1 restaurant + schaarse non-food avond-POIs). CLAUDE.md v4.27.0. |
| **7.75** | **21-03-2026** | **Command v16.0: Mobiele Homepage Quality — 14 Punten + Extra's COMPLEET. 503 API fix (adminPortal.js syntax error). Onboarding buttons conform template (rounded-xl, Inter font). Map category IDs fix (Beach,Nature→beaches). Profiel→login na onboarding. Leaflet z-index isolation (map overlap fix). ProgramCard time-of-day dynamisch (ochtend/middag/avond). 24h klok fix (nooit boven 23:30). Onboarding dismissed→sessionStorage. CTA→itinerary wizard direct. 1 platform-core + 6 hb-websites bestanden. 8/8 verificatie PASS. CLAUDE.md v4.15.0.** |
| **7.74** | **20-03-2026** | **Fase VI-B Feedback: 7 Fixes COMPLEET. Inter font, Tip deep links, language params, WCAG, hamburger menu, CALPETRIP font, bottom nav SVGs. 6 bestanden. Commit 5d3bb00. CLAUDE.md v4.14.0.** |
| **7.73** | **18-03-2026** | **Fase VI-B Mobile Homepage & Onboarding — 7 Blokken COMPLEET. BLOK A: MobileBottomNav (5 tabs). BLOK B: OnboardingSheet (4-stappen bottom-sheet, i18n). BLOK C: MobileHeader (gradient, SVG flags, WCAG). BLOK D: ProgramCard + TipOfTheDay + TodayEvents + MapPreview. BLOK E: Admin BrandingPage "Mobiele Homepage" accordion + 2 API endpoints + config doorvoering. BLOK F: 9/9 verificatie PASS. 9 nieuwe + 4 gewijzigde bestanden (1.712 LOC). Commit be8cc00. CLAUDE.md v4.13.0.** |
| **7.72** | **18-03-2026** | **Content Studio Completie — Alle 12 Opdrachten 100% COMPLEET. FIX 1: `score_calibrations` DB tabel aangemaakt (OPDRACHT 4 completie). FIX 3: Image refresh button fix — `excludeIds` + RAND() randomisatie in imageSelector.js, frontend exclude current IDs bij refresh. Geverifieerd: 100% andere images bij refresh. 1 DB tabel + 3 bestanden. CLAUDE.md v4.12.0.** |
| **7.71** | **18-03-2026** | **OPDRACHT 7/7B: Content Studio Image Quality — Enterprise Image Selection COMPLEET. media_ids resolve (poi: prefix strip, w=600 webp, alt text). POI auto-detectie, diversity filter, content-type limits, forSuggestion 6 results, PlatformPreview images. STATUS_LABELS crash fix, ContentImageSection rewrite. 5 bestanden. CLAUDE.md v4.11.0.** |
| **7.70** | **16-03-2026** | **CS v6.0 Chirurgisch: Browser-Verified Remediatie — 7 Fixes COMPLEET. FIX 1: SEO scoring fairness (auto-derive meta desc, paragraph credit, softer links). FIX 3: Auto-attach images (selectImages() + DB fixes imageurls/display_order/filename). FIX 5: Pinterest+YouTube OAuth callbacks + LinkedIn .default fix + Pinterest activated. FIX 6: Meta System User→Page Token exchange (_getPageAccessToken 1h cache), analytics working (2 likes, 1 comment in content_performance). FIX 7: PlatformPreview blog-on-social detection. Token encryption SHA-256 key fix. 7 bestanden. CLAUDE.md v4.10.0.** |
| **7.69** | **16-03-2026** | **Content Studio TO DO P0+P1 Enterprise Quality COMPLEET. P0: PlatformPreview auto-adapt (smart truncation, platform health indicators, tips). repurposeContent() enterprise rewrite (PLATFORM_EXAMPLES, creatieve instructies per platform, 2 retries, SEO scoring). Auto-attach images bij generatie (keyword REGEXP match media+POI). Pinterest OAuth v5 + YouTube OAuth 2.0 connect endpoints. SocialAccountsCards herschreven (7 platforms). P1: DeepL Pro actief. Auto-crop bij publicatie (Sharp). UTM parameters in Publisher flow. 2 endpoints (212 totaal). adminPortal.js v3.32.0. CLAUDE.md v4.9.0.** |
| **7.68** | **16-03-2026** | **Content Studio v5.0 Remediatie — 8 Blokken COMPLEET. P0: BLOK 3 repurposeContent() AI platform-specifiek (niet copy-paste), BLOK 4 publish workflow (Nu Publiceren/Inplannen + best time), BLOK 2 image management (attach/detach + suggesties). P1: BLOK 1 SEO v2.0 bevestigd, BLOK 8 mistral-medium-latest + DeepL translator ready, BLOK 5 Social Accounts tab, BLOK 6 BestTimeToPost UI. P2: BLOK 7 ApprovalTimeline. 2 endpoints (210 totaal). adminPortal.js v3.31.0. CLAUDE.md v4.8.0.** |
| **7.53** | **09-03-2026** | **Repair Command v9.0: Chirurgisch Repair — dev.holidaibutler.com Kwaliteit COMPLEET. 9 fixes: chatbot sessionId + SSE proxy numeric dest ID, homepage PoiGrid categoryFilter + Partners block verwijderd, footer text-white, POI detail image fallback + tile description, restaurants categoryFilter, BrandingPage button empty string check, events DateBlock fallback, PoiGrid round-robin mix, BrandingPage i18n crash fix (resolveI18nDisplay). 8 bestanden + 2 SQL updates. CLAUDE.md v3.91.0.** |
| **7.52** | **08-03-2026** | **Command v8.0: Fase V Final — Customer Portal Kwaliteit COMPLEET. Chatbot SSE proxy route. POI categorie filtering (categories meervoud + min_reviews). POI detail pagina (openingstijden, amenities, accessibility, parking, highlights, reviews distribution, 2-kolom layout, 42 velden). Reviews veldnamen fix. Button color preview fix. 3 nieuwe + 9 gewijzigde bestanden. CLAUDE.md v3.90.0.** |
| **7.51** | **08-03-2026** | **Command v7.1: Frank's Feedback Fixes COMPLEET (7 stappen)**. Block i18n resolution (resolveLocalizedProps, Hero crash fix). Hero height + image URL. Map gekleurde markers (8 categorieën, L.divIcon, legenda). Quick action chatbot buttons (CustomEvent hb:chatbot:open, ChatbotButton.tsx). Button style defaults (auto-derive). Footer i18n (resolveTitle). Branding chatbot config + header style. 18 bestanden. Commit 5daab9e. CLAUDE.md v3.89.0. |
| **7.50** | **08-03-2026** | **Command v7.0: Fase V Voltooiing COMPLEET (8 stappen)**. STAP 1A: dark mode 9 bestanden → MUI tokens. STAP 1B: BrandingPage Accordions + SafeImage + footer wireframe. STAP 1C: Media bulk select/delete. STAP 2B: chatbot 4 quick actions (4 talen). STAP 2C: Hero crash fix. STAP 2D+2E: POI category filters DB fix (explore + restaurants). STAP 3A: 6 design templates. STAP 3B: 5 geavanceerde stijlopties + CSS vars. STAP 4: SEO sitemap + robots + JSON-LD + canonical + hreflang + Twitter Cards. STAP 6: Playwright 15 tests (93 specs). STAP 7: Dashboard +3 cards. CLAUDE.md v3.88.0. |
| **7.49** | **08-03-2026** | **Repair Command v6.0 COMPLEET (3 rondes)**. Ronde 2: favicon/navicon upload endpoint + CSP frame-ancestors. Ronde 3: STORAGE_ROOT extern storage (CI/CD-proof) + Apache API routing fix (Next.js port 3002). 21 media + 2 logos hersteld. CLAUDE.md v3.87.0. |
| **7.48** | **07-03-2026** | **Repair Command v6.0 Ronde 1: Browser-Verified Fixes**. 6 blokken gediagnosticeerd + 4 fixes: BLOK A express.static media/block-images, BLOK B preview iframe website render, BLOK E logo branding files restored, BLOK F frontend bevestigd. BLOK C = content issue, BLOK D = browser cache. CLAUDE.md v3.86.0. |
| **7.47** | **07-03-2026** | **Command v5.0 Stap 2-8 COMPLEET. Stap 2: API test fix (88/88 PASS). Stap 3+4: Wave 2/3 verificatie + SEO migration 003. Stap 5: Sidebar herstructurering (5 secties). Stap 6: Dashboard QuickLinks i18n + SCHEDULED_JOBS 40→54. Stap 7: Admin auth token CRITICAL fix (bare fetch→axios client) + 17 i18n keys. Stap 8: XSS sanitizer, 6 API route try/catch, postMessage origin validation, console.log dev-only. CLAUDE.md v3.85.0.** |
| **7.45** | **07-03-2026** | **Command v5.0 Stap 1: Bugfix + Stabilisatie COMPLEET. 4 kritieke bugfixes: BUG-1 BlockErrorBoundary per block, BUG-2 media.uploaded_by INT→VARCHAR(36), BUG-3 resolveAssetUrl() + HB_ASSET_URL, BUG-4 Map.tsx POI markers + /api/pois proxy. 1 DB migration. 3 nieuwe + 4 gewijzigde bestanden. Deploy + build 0 errors. CLAUDE.md v3.79.0.** |
| **7.43** | **07-03-2026** | **Wave 2+3: Professionele Features + Excellence COMPLEET. Wave 2: pagina-hiërarchie (parent_id + tree-view), media library (4 CRUD endpoints + MediaPage), 8 page templates, favicon/navicon upload, OG image upload, 5 button style varianten (15 CSS vars), footer config (data-driven), block-level styling (BlockStyleEditor + hb-websites wrapper). Wave 3: brand visuals (upload + HeroEditor quick-pick), revisie-geschiedenis UI (PageRevisionsDialog), GDPR cookie consent banner (3 niveaus, 5 talen, tenant-aware). 2 nieuwe DB tabellen + 2 ALTER TABLE. 8 nieuwe endpoints (157 totaal). ~2.300 LOC. CLAUDE.md v3.77.0.** |
| **7.41** | **07-03-2026** | **Wave 1: Enterprise Admin Portal — Visuele Block Editor COMPLEET. 12 field components, 20 block editors (React.lazy), block selector dialog (5 categorieën), @dnd-kit drag-and-drop, TipTap WYSIWYG, live preview iframe, typography hierarchy (18 CSS vars). 1 nieuw endpoint (149 totaal). adminPortal.js v3.25.0. ~3.200 LOC. CLAUDE.md v3.75.0.** |
| **7.40** | **06-03-2026** | **Fase V.6 Bugfix Ronde. Root cause openEdit fix: pages LIST endpoint miste layout/title_de/title_es/seo_* velden → blocks leeg + vertalingen verloren. Fix: openEdit fetcht nu GET /pages/:id. Overige fixes: Helmet CORP cross-origin, SettingsPage payoff i18n rendering, adminAuth()/writeAccess() factory invocatie, React 19 ESLint fixes, HeroProps/VideoProps interface alignment. Calpe homepage blocks hersteld. 4 commits. CLAUDE.md v3.74.0.** |
| **7.39** | **06-03-2026** | **Fase V.6: Ontbrekende Blocks + Block Upgrades COMPLEET. 8 nieuwe blocks (Video, SocialFeed, ContactForm, Newsletter, WeatherWidget, Banner, Partners, Downloads). 2 block upgrades (Hero +video bg, Gallery +mixed media). Block registry 12→20. 3 nieuwe admin endpoints (148 totaal). 2 public endpoints + 2 API proxy routes. Auto-translate frontend (Mistral AI) op 3 admin pagina's. Social Media Links in BrandingPage. DB ALTERs lat/lon/social_links. adminPortal.js v3.24.0. ~35 bestanden. Calpe 6/6 + Texel 6/6 PASS. CLAUDE.md v3.73.0.** |
| **7.38** | **06-03-2026** | **Fase V.5: P1 Blocks + Wildcard DNS Schaling COMPLEET. 5 nieuwe blocks (Cta, Gallery, Faq, TicketShop, ReservationWidget). Block registry 7→12. 3 API proxy routes. Admin block editor 12 types + i18n 4 talen. Middleware wildcard `*.holidaibutler.com`. Apache wildcard VHost. 20 bestanden (+783 regels). Calpe 6/6 + Texel 6/6 PASS. CLAUDE.md v3.72.0.** |
| **7.37** | **05-03-2026** | **Fase V.4: Admin Portal Editors (Branding, Pages, Navigation) COMPLEET. 8 nieuwe admin endpoints (145 totaal), adminPortal.js v3.23.0. BrandingPage, PagesPage, NavigationPage. 3 API services + 3 hooks. i18n 4 talen. Dynamic navigation Header.tsx. 20 bestanden (+2.150 regels). 15/15 tests PASS. CLAUDE.md v3.71.0.** |
| **7.36** | **05-03-2026** | **Fase V.3: Texel als tweede tenant COMPLEET. dev.texelmaps.nl live met eigen branding, 6 pagina's, 1.660 POIs, Tessa chatbot. Multi-tenant 100% data-driven gevalideerd. CLAUDE.md v3.70.0.** |
| **7.35** | **05-03-2026** | **Fase V.0+V.1+V.2 COMPLEET. Next.js 15 live op dev.holidaibutler.com. 7 blocks, ChatbotWidget SSE streaming, POI detail route, Testimonials block, 6 Calpe pagina's, navigatie. CLAUDE.md v3.69.0.** |
| **7.34** | **05-03-2026** | **Fase V Start: Multi-Tenant Configuratielaag — Architectuurbeslissing DEFINITIEF. Next.js 15 + bestaande HB API (geen extern CMS). Roadmap herschreven: Fase V = Multi-Tenant (12 wkn), Fase VI = UX+WarreWijzer (6-8 wkn), Fase VII = Polish+Launch (3-4 wkn). Technische blauwdruk v3.0. CLAUDE.md v3.68.0.** |
| **7.33** | **04-03-2026** | **Fase IV Blok F: Testing & Compliance — FASE IV VOLLEDIG COMPLEET. 42 tests (20 E2E + 10 security + 8 GDPR + 4 feature flag). 5 compliance documenten. 1 BullMQ job (intermediary-guest-anonymize). 54 BullMQ jobs totaal. 4-weken staged rollout plan. 0 FAIL. CLAUDE.md v3.67.0.** |
| 7.32 | 04-03-2026 | Fase IV Blok E: Admin Intermediair Dashboard COMPLEET. IntermediaryPage.jsx (4 tabs: Dashboard + conversie funnel, Transacties + detail dialog, Afrekeningen link, Export CSV). 2 nieuwe admin endpoints (137 totaal). i18n 4 talen. adminPortal.js v3.22.0. CLAUDE.md v3.66.0. |
| 7.31 | 04-03-2026 | Fase IV Blok D: Agent Ecosysteem v5.1 COMPLEET. 3 nieuwe agents: De Makelaar (intermediary monitor, elke 15 min), De Kassier (financial monitor, dagelijks 06:30), De Magazijnier (inventory sync, elke 30 min). 21 agents totaal (+3). 53 BullMQ jobs (+3). agentRegistry.js, AGENT_METADATA, workers.js, scheduler.js, dailyBriefing.js bijgewerkt. adminPortal.js v3.21.0. CLAUDE.md v3.65.0. |
| **7.30** | **04-03-2026** | **Fase IV Blok C: Financieel Proces COMPLEET. 4 DB tabellen (settlement_batches, partner_payouts, credit_notes, financial_audit_log). financialService.js (25 functies, 3 state machines). 20 admin endpoints (135 totaal). 2 BullMQ jobs (50 totaal). Feature flag hasFinancial. FinancialPage.jsx (5 tabs). adminPortal.js v3.21.0. CLAUDE.md v3.64.0.** |
| 7.29 | 04-03-2026 | Fase IV Blok B: Intermediair State Machine COMPLEET. intermediary_transactions tabel, intermediaryService.js (13 functies, 6-stappen state machine, ACID commissie, QR HMAC), 9 admin endpoints (115 totaal), 2 BullMQ jobs (48 totaal), hasIntermediary feature flag, PartnersPage transactions tab, i18n 4 talen. adminPortal.js v3.19.0. CLAUDE.md v3.63.0. |
| **7.28** | **03-03-2026** | **Fase IV Blok A: Partner Management Module COMPLEET. 3 DB tabellen, partnerService.js, 7 admin endpoints (106 totaal), PartnersPage.jsx, i18n 4 talen. Forward-compatible multi-tenant analyse (Directus+Unleash = Fase V+). CLAUDE.md v3.62.0.** |
| **7.27** | **03-03-2026** | **Fase IV-0: Pre-flight & Adyen Activatie COMPLEET. Adyen E2E test PASS (session creation, transaction status, HMAC webhook). Feature flags Calpe geactiveerd (hasBooking/hasTicketing/hasReservations/hasChatToBook=true). PCI DSS + GDPR Blok 0 review. Compliance docs geüpdatet. .env permissions 600. Legacy PM2 reservations-module gestopt. CLAUDE.md v3.61.0.** |
| 7.26 | 03-03-2026 | Fase IV-B: POI Tier Import + Owner-Managed Tiers COMPLEET. 2.695 POI tier-assignments, poiTierManager.js v2.0, Admin Portal tier display. CLAUDE.md v3.60.0. |
| 7.25 | 03-03-2026 | Fase IV-A: Apify Data Pipeline — Medallion Architecture COMPLEET. Bronze/Silver/Gold pipeline, Apify backfill 1.023 POIs, 9.363 reviews, i18n fix 10 bestanden. CLAUDE.md v3.59.0. |
| 7.24 | 02-03-2026 | Fase III Blok F: Testing & Compliance — FASE III VOLLEDIG COMPLEET. CLAUDE.md v3.58.0. |
| 7.23 | 02-03-2026 | Fase III Blok E: Admin Commerce Dashboard COMPLEET. commerceService.js, 10 admin endpoints (99 totaal), CommercePage.jsx 4 tabs, CSV export BOM, i18n 4 talen, RBAC. adminPortal.js v3.17.0. CLAUDE.md v3.57.0. |
| **7.22** | **02-03-2026** | **Fase III Blok D: Chatbot-to-Book Voorbereiding COMPLEET. 4 booking sub-intents (ticket/reservation/activity/status) in 5 talen (NL/EN/DE/ES/FR). Conversational booking flow in ragService v2.6 (~300 regels). Booking context tracking (contextService v1.1, 15-min timeout). bookingMessages.js (16 templates, 5 talen, destination preposities). bookingParser.js (datum/tijd/getal/bevestiging parsing). 7 commerce feature flags (3 destinations). holibot.js v3.0. 12/12 E2E tests PASS. Bug fix: FR "réserver une table" patroon. CLAUDE.md v3.56.0.** |
| **7.21** | **01-03-2026** | **Fase III Blok C: Reservation Module COMPLEET. 3 DB tabellen + ALTER TABLE POI, 4 customer + 13 admin endpoints, Redis slot locking, QR HMAC-SHA256, auto-blacklist, 4 BullMQ jobs, GDPR guest cleanup. 89 admin endpoints, 46 scheduled jobs. 20/20 E2E tests PASS. CLAUDE.md v3.55.0.** |
| 7.20 | 01-03-2026 | Fase III Blok B: Ticketing Module COMPLEET. 76 admin endpoints, 42 scheduled jobs. 18/18 E2E tests PASS. CLAUDE.md v3.54.0. |
| **7.19** | **01-03-2026** | **Fase III Blok G+A: Legal docs + Payment Engine COMPLEET. 6 juridische templates. Adyen SDK v30, Sessions flow, 2 DB tabellen, 3+5 endpoints. CLAUDE.md v3.53.0.** |
| **7.18** | **01-03-2026** | **Fase II Blok D: Customer Portal UX Upgrade COMPLEET. usePageMeta hook (SEO/OG), Breadcrumbs (4 talen), skip-to-content (WCAG), PWA service worker. 10 bestanden. FASE II VOLLEDIG COMPLEET (Blok A+B+C+D). CLAUDE.md v3.52.0.** |
| 7.17 | 01-03-2026 | Fase II Blok C: Agenda Module Upgrade COMPLEET. Multi-destination, auto-category, iCal feeds, admin CRUD. adminPortal.js v3.13.0. |
| **7.16** | **01-03-2026** | **Fase II Blok B: POI Module Verbetering COMPLEET. Freshness, clustering, image proxy, admin tools. adminPortal.js v3.12.0. CLAUDE.md v3.50.0.** |
| **7.15** | **28-02-2026** | **Fase II Blok A: Chatbot Upgrade COMPLEET. contextService.js, ragService v2.5, 12 intents, booking/escalation. CLAUDE.md v3.49.0.** |
| **7.14** | **01-03-2026** | **Strategic Roadmap Advisory v2.0 geïntegreerd. WarreWijzer destination_id 4. Nieuwe Delen 9/10/11. CLAUDE.md v3.48.0.** |
| **7.13** | **27-02-2026** | **Fase 12: Verificatie, Consolidatie & Enterprise Hardening COMPLEET. 7 blokken: (A) server verificatie 16/16, (B) MS v7.13 completeness audit (5 gaps gefixed), (C) CLAUDE.md versie fix, (D) AuditLog status sanitizer + QA→QnA + Reviews case fix, (E) 34/34 enterprise tests (trendHelper, agentIssues, baselineService, correlationService), (F) runtime metrics aggregatie, (G) documentatie + deploy. 7 bestanden gewijzigd, 1 nieuw. CLAUDE.md v3.47.0.** |
| **7.12** | **27-02-2026** | **Fase 11B Agent Ecosysteem Enterprise Complete — Niveau 7 (Zelflerend) COMPLEET. 10 blokken: (A) npm audit fix 1C/4H/3M→0, (B) individuele actorName per reviewer in JOB_ACTOR_MAP, (C) De Bode escalatie dev_insights, (D) trendHelper.js week-over-week trending, (E) trending chips in admin resultaten tab, (F) agentIssues.js MongoDB CRUD + SLA tracking, (G) Admin Issues module 5 endpoints, (H) baselineService.js + anomaliedetectie 2σ, (I) correlationService.js cross-agent rapport, (J) deploy + documentatie. 22 bestanden (7 nieuw + 15 gewijzigd). adminPortal.js v3.11.0 (47 endpoints). 9 Lessons Learned, 8 Beslissingen Log entries, 3 Risico Register entries. CLAUDE.md v3.46.0.** |
| **7.11** | **27-02-2026** | **Fase 11A Agent Ecosysteem Audit + Activering COMPLEET. (A) Ecosysteem audit: 18 agents, 40 BullMQ jobs, 18.320 MongoDB entries/30d (22.380 all-time), 7 agents met individuele logs + rest via wrapper actors (dev-layer, strategy-layer). (B) De Bewaker geactiveerd: npm audit scan, 1C/4H/3M/0L (16 total), dagelijks via dev-security-scan. (C) De Corrector geactiveerd: grep-based code scan, 182 files/61.622 lines/372 console.logs/10 TODOs, wekelijks via dev-quality-report. (D) De Stylist verrijkt: HTTPS TTFB+status+headers check op 4 domeinen, avg 42ms, wekelijks via dev-dependency-audit. AuditLog Mongoose enum fix: 'success'→'completed', 'error'→'failed' in alle 3 reviewer files. Workers.js: lightweight execute() i.p.v. heavy checkProject(). AGENT_METADATA: functionalityLevel 'minimal'→'active' voor 3 agents. 5 Lessons Learned, 6 Beslissingen Log, 2 Risico Register entries. CLAUDE.md v3.45.0.** |
| **7.10** | **26-02-2026** | **Fase 10C Apache Hardening + Agent Eerlijkheid + Live Verificatie COMPLEET. (A) Apache security headers op 5 domeinen (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) + ServerTokens Prod + ServerSignature Off. texelmaps.nl sites-enabled symlink fix. (B) Live verificatie 10A: 10/10 PASS (summary cards, deactivated agents, results tab, calculateAgentStatus). (C) Aspirationele agents eerlijk gelabeld (Stylist/Corrector/Bewaker): description + tasks + output_description bijgewerkt naar actuele functionaliteit, functionalityLevel: minimal. Frank kiest: labelen, NIET deactiveren. (D) Sessions.user_id INT→VARCHAR(36): FK dropped, ALTER TABLE, login OK, 0 truncation errors. 5 Lessons Learned, 5 Beslissingen Log, 2 Risico Register entries. CLAUDE.md v3.44.0.** |
| **7.9** | **26-02-2026** | **Fase 10A-Restant + 10B Security Hardening COMPLEET. 10A-R: Agent config datacorruptie fix (backend placeholder validatie + frontend filter + MongoDB restore contentQuality tasks), Threama CONFIGURED geverifieerd (smoke test), CLAUDE.md versie-fix. 10B: npm audit fix (17→2 vulnerabilities, 0 critical/high), hardcoded secrets scan (1 dev-only DEV_FALLBACK_USER, 0 productie), security headers audit (API OK via Helmet, frontend Apache vhosts missen headers → P1), De Bewaker 0 security scans (aspirationeel), `/root/fase_10b_security_rapport.md`. 7 Beslissingen Log entries. adminPortal.js v3.10.0. CLAUDE.md v3.43.0.** |
| **7.8** | **26-02-2026** | **Fase 10A Agent Ecosysteem Optimalisatie COMPLEET: 5 items. (1) Apify Scenario A: bevestigd, geen integratie nodig. (2) Threema: CONFIGURED status in smoke tests. (3) Agent deactivering: De Architect, De Leermeester, De Thermostaat → active=false in AGENT_METADATA + calculateAgentStatus() meta parameter. (4) Dashboard eerlijkheid: 4 statussen (healthy/warning/error/deactivated), opacity 0.6 + info banner voor gedeactiveerde agents, i18n 4 talen. (5) Resultaten tab: GET /agents/:key/results (MongoDB audit_logs + monitoring collections, laatste 5 runs), frontend tabel met timestamp/action/status/destination/duration/details. 9 bestanden gewijzigd (+309/-23). adminPortal.js v3.10.0 (42 endpoints). Kosten: EUR 0. CLAUDE.md v3.42.0.** |
| **7.7** | **25-02-2026** | **Fase 9I UX Polish + Data Consistentie + Analytics COMPLEET: 7 items. P1: Hetzner backup verificatie + Mistral token refresh. P2: Agent profiel tab MongoDB tasks sync (useEffect init, staleTime 5s). P3: Daily email vs dashboard data consistentie (shared getSystemHealthSummary). P4: Dark mode contrast alle pagina's (7 bestanden, palette tokens i.p.v. hardcoded hex). P5: scheduledJobs i18n 4 talen + popup datum fix. P6: Analytics granulatie dag/week/maand + default dag + cel-bars kleuren. P7: MS documentatie gaps 9H (Lessons Learned, Beslissingen Log, Changelog). Bug fix: SQL created_at ambiguity in pageviews JOIN → pvPeriodDateFilter. 14 bestanden gewijzigd. adminPortal.js v3.9.0. 15/15 tests PASS. Kosten: EUR 0. CLAUDE.md v3.40.0.** |
| **7.6** | **24-02-2026** | **Fase 9H Audit & Command COMPLEET: 4 items uit audit, 2× diagnose-first (6e+5e cyclus). P1: Agent config tasks frontend race condition fix (staleTime 60s→5s, optimistic update handles new entries, state init → useEffect hooks, refetchType 'all'). P2: De Dokter error JOB_ACTOR_MAP fix (workers.js logde alle jobs als 'orchestrator', nu 9 mappings naar correcte agent actorNames + warningDetail stale vs failed distinction). P3: 509 Accommodation POIs → is_active=0 (411 Texel + 98 Calpe). P4: Pageviews dag/week/maand granulatie (ToggleButtonGroup + backend period-aware filtering + i18n 4 talen). adminPortal.js v3.8.0. Kosten: EUR 0. CLAUDE.md v3.39.0.** |
| **7.5** | **24-02-2026** | **Fase 9G Agent Fixes + RBAC Verificatie COMPLEET: 6 gefocuste items uit 9F audit. P1: Agent config tasks max 10 (MongoDB tasks ALTIJD prefereren boven static AGENT_TASKS in GET merge). P2: De Dokter stale error → inactive status (48h threshold). P3: Per-agent errorInstructions in AGENT_METADATA (18 agents, concrete troubleshooting stappen, frontend Instructies sectie). P4: RBAC live verified (4 rollen, destinationScope + writeAccess middleware actief). P5: Rate limiter account lockout trusted IP exempt (isExemptAdminIP geëxporteerd, isTrustedIP check lockout + attempts, 25 pogingen PASS). P6: Versie cross-refs + 9G documentatie. adminPortal.js v3.7.0. Kosten: EUR 0. CLAUDE.md v3.38.0.** |
| **7.4** | **24-02-2026** | **Fase 9F Admin Portal Definitief + RBAC COMPLEET: 4 blokken (15 items). Blok A: 6 reparaties (unicode emoji definitief, image reorder publicPOI.js ORDER BY, agent config tasks MongoDB persist, De Dokter smoke test URL fix, platform_admin rate limiter exemption met IP whitelist + JWT bypass + IPv6, RBAC scoping met destinationScope + writeAccess middleware). Blok B: 5 functies (user deactivate vs permanent delete, review destination vlag-emoji, subcategory in POI tabel, agent config + scheduled jobs i18n 4 talen, daily email shared getSystemHealthSummary). Blok C: 2 image features (permanent delete + auto-renumber, nummering 1-based + Primary badge). Blok D: 2 documentatie (9D/9E/9F Resultaten secties CLAUDE.md + versie sync). EmailService: MailerSend→Nodemailer SMTP relay. 3 nieuwe endpoints. adminPortal.js v3.6.0. Kosten: EUR 0. CLAUDE.md v3.37.0.** |
| **7.3** | **22-02-2026** | **Fase 9E Persistent Failures Definitief COMPLEET: 6 persistent failures uit audit (5 herhaaldelijk gefaald in 3-5 cycli + 1 nieuw). P1: Unicode ES/NL definitief → vlag-emoji in alle bestanden (i18n, backend AGENT_METADATA, frontend). P2: Scheduled jobs 40x met beschrijving kolom in 3-kolom popup. P3: Agent warnings threshold fix (calculateAgentStatus cron-aware voor weekly/monthly schedules) + leesbare tekst (body1 i.p.v. monospace). P4: Agent config MongoDB 3-laags persist (PUT endpoint + GET /agents/status BRON 1b merge + frontend save handler). P5: Image reorder e2e verified (display_order in MySQL, public API, admin API, geen Redis cache). P6: Welcome email via MailerSend (enterprise HTML template, non-blocking, login URL + credentials + rol). adminPortal.js v3.4.0. Kosten: EUR 0. CLAUDE.md v3.36.0.** |
| **7.2** | **22-02-2026** | **Fase 9D Admin Portal Zero-Tolerance Reparatie COMPLEET: 8 persistente bugs uit 9C audit (38% score). Blok 1: UsersPage crash null-safety (isSelf bij editUser=null, MUI Dialog eager eval). Category chip kleuren 5x maximaal onderscheidend. MongoDB $set/$setOnInsert conflict fix. Blok 2: POI update + review archive handlers met saveAuditLog + saveUndoSnapshot. buildAuditDetail backward-compatible (oude + nieuwe action names). display_order in POI detail image response. 28/28 live tests PASS. adminPortal.js v3.3.0. Kosten: EUR 0. CLAUDE.md v3.35.0.** |
| **7.1** | **22-02-2026** | **Fase 9C Admin Portal Live Verificatie & Reparatie COMPLEET: Blok 1: 2 P0 fixes (user creation permissions kolom, image reorder display_order e2e). Blok 2A: Enterprise agent profiel popup (4 MUI tabs, AGENT_TASKS 18 agents, per-destination status, PM2 log copy). Blok 2B-2G: subcategory editing, logo upload (multer + POST endpoint + preview + i18n), 4 items reeds bevestigd. Blok 3: Deploy 6 omgevingen. 1 nieuw endpoint (38 totaal). adminPortal.js v3.2.0. Kosten: EUR 0. CLAUDE.md v3.34.0.** |
| **7.0** | **22-02-2026** | **Fase 9B Admin Portal Bug Fix & UX Hardening COMPLEET: Blok 1: 6 P0 bugs (unicode emoji fix, agent status Unknown→actual, user creation 500→201, image reorder persistence, daily email severity prefix, audit log actor type). Blok 2: 13 UX fixes (reviews destination filter, agent warning details+actions, NL/EN agent descriptions, extended agent config popup 5-section, scheduled job descriptions, category chip colors, environment-aware frontend links, branding merknaam+payoff, is_active audit, role name consistency, real user names, enterprise password policy). Blok 3: Pageview tracking (page_views tabel, POST /track, GET /analytics/pageviews, AnalyticsPage section). 6 doc fixes (8E test count, 9A test count, MS version refs, 9A-FIX row, rate limiter). 2 nieuwe endpoints (37 totaal). adminPortal.js v3.1.0. 28/28 tests PASS. Kosten: EUR 0. CLAUDE.md v3.33.0.** |
| **6.9.1** | **22-02-2026** | **Fase 9A-FIX Admin Login Fix: 3 bugs opgelost bij live testing. (1) authRateLimiter 5→15 req/15min. (2) Account lockout threshold 5→10 attempts, lock duration 15→5 min. (3) Sessions.user_id INT(11) vs admin_users CHAR(36) UUID mismatch → INSERT crash. Fix: non-blocking .catch(). Admin wachtwoord: HolidaiAdmin2026. CLAUDE.md v3.32.1.** |
| **6.9** | **21-02-2026** | **Fase 9A Admin Portal Enhancement COMPLEET: 3 sub-fases. 9A-1: RBAC user management (CRUD, 4 rollen, soft-delete, password reset), audit log undo (reversible actions + MongoDB snapshot), agent config editing (displayName, emoji, description, active). 9A-2: Chatbot analytics (sessions, messages, avg response, fallback rate, language distribution), analytics trend API, analytics snapshot. 9A-3: POI category management (filter dropdown + autocomplete), image ranking (display_order, reorder UI), branding UI (color management per destination), dark mode (Zustand + MUI theme factory). 16 nieuwe endpoints (35 totaal). 4 nieuwe bestanden (userService.js, useUsers.js, UsersPage.jsx, themeStore.js). Kosten: EUR 0. CLAUDE.md v3.32.0.** |
| **6.8** | **21-02-2026** | **Fase 8E Admin Portal Hardening & UX Upgrade COMPLEET: BLOK 1: Agent ecosystem fixes (Backup Health regex+dir, dailyBriefing URGENT, De Maestro calculateAgentStatus fix → 18/18 HEALTHY, daily MySQL backup cron). BLOK 2: Content audit (14 asterisk POIs fixed, 79 missing ES translations, 121 inactive POIs gedocumenteerd). BLOK 3: 11 UX fixes (global destination filter+vlaggen, sortable columns, analytics trends, reviews filter, POI detail link, agent profielen NL, categorie kleuren, scheduled jobs popup, taalversie NL/EN/DE/ES). BLOK 4: 5 doc fixes. Kosten: ~EUR 0,50. CLAUDE.md v3.31.0.** |
| **6.7** | **21-02-2026** | **Fase 8D-FIX Admin Portal Bug Fix COMPLEET: 12 bugs gefixed bij live testing. Backend (adminPortal.js v2.1.0): resolveDestinationId() helper, POI stats per-destination keys, POI detail field renames, review summary flattened, settings system keys, destinations object format, audit-log field mapping. Frontend: POI/review detail wrapper fix, snackbar undo, QuickLinks live, agent detail dialog, Sentry DSN fix. 33/33 tests PASS. Kosten: EUR 0. CLAUDE.md v3.30.0.** |
| **6.6** | **20-02-2026** | **Fase 8D Admin Portal Feature Pack COMPLEET: 4 modules — POI Management (list/detail/edit/stats, 4 endpoints), Reviews Moderatie (list/detail/archive, 3 endpoints), Analytics (overview/trends/export, 2 endpoints), Settings (system/audit-log/cache, 3 endpoints). 12 nieuwe endpoints, 4 pagina's, 4 API services, 4 React Query hooks, 100+ i18n keys NL/EN. adminPortal.js v2.0.0 (35 endpoints totaal). Alle 6 admin sidebar items actief. Pre-flight DB schema check via SSH (command doc had verkeerde table/column names). Deployed naar alle 3 omgevingen + Hetzner. Kosten: EUR 0. CLAUDE.md v3.29.0.** |
| **6.5** | **20-02-2026** | **Fase 8C-1 Agent Dashboard COMPLEET: Backend GET /agents/status (AGENT_METADATA 18 entries, MongoDB audit_logs, Redis thermostaat+cache, monitoring collections, graceful degradation). Frontend AgentsPage: 4 summary cards, 6 category filter chips, destination dropdown, sortable agent tabel (Cat A destination-aware, Cat B shared), recent activity (10/50), auto-refresh 5 min, i18n NL/EN (30+ keys). 12/12 tests PASS. Kosten: EUR 0. adminPortal.js v1.1.0 (7 endpoints). Lessons: static metadata > registry import (dependency isolation), MongoDB audit_logs als primary source (Redis te beperkt). CLAUDE.md v3.28.0.** |
| **6.4** | **20-02-2026** | **Fase 8C-0 Admin Portal Foundation COMPLEET: 3 VHosts + SSL + CORS. 6 admin API endpoints in platform-core (login, refresh, logout, me, dashboard, health). JWT auth (8h+7d), bcrypt, rate limiting, Redis cache. React 18 + MUI 5 + Vite 4 + Zustand frontend (login, dashboard, i18n NL/EN). CI/CD: deploy-admin-module.yml met backup + rollback. Admin user: admin@holidaibutler.com. 15/15 tests PASS. Typo fixes: threama→threema. Kosten: EUR 0. CLAUDE.md v3.27.0.** |
| **6.3** | **20-02-2026** | **Fase 8B Agent Multi-Destination COMPLEET: BaseAgent pattern (run/runForDestination/aggregateResults). 3 nieuwe bestanden: BaseAgent.js, destinationRunner.js, agentRegistry.js. 18 agents geregistreerd (13 Categorie A destination-aware, 5 Categorie B shared). Threema configuratie verificatie in smoke tests (dagelijks, passief). Config mapping fix (c.destination.id i.p.v. c.id). 22/22 tests PASS. Audit gap D2 inhaal: Fase 8A+ detail subsectie toegevoegd. Lessons Learned 8A+/8B. Beslissingen Log 8A+/8B. Risico Register 8A+/8B. Kosten: EUR 0. CLAUDE.md v3.26.0.** |
| **6.2** | **20-02-2026** | **Fase 8A+ Agent Monitoring & Briefing Expansion COMPLEET: 3 nieuwe monitoring modules (contentQualityChecker, backupHealthChecker, smokeTestRunner). 5 nieuwe scheduled jobs (totaal 35→40). Daily briefing uitgebreid met smoke test/backup/content quality sections + 3 nieuwe MailerLite fields. ChromaDB state snapshot via Het Geheugen. 16/16 tests PASS. Kosten: EUR 0.** |
| **6.1** | **20-02-2026** | **Fase 8A Agent Reparatie & Versterking COMPLEET: 7 agents gerepareerd/versterkt. De Koerier: column mapping fix (9 kolommen). De Leermeester: MongoDB persistence (agent_learning_patterns). De Thermostaat: herschreven naar alerting-only + Redis. De Bode: destination stats + predictions (7 MailerLite fields). De Stylist: Texel brand colors (DESTINATION_BRAND_COLORS map). De Dokter: 3 nieuwe portals + SSL monitoring (5 domains). Legacy workers.js deprecated. Kosten: EUR 0.** |
| **6.0** | **19-02-2026** | **Fase 7 Reviews Integratie COMPLEET: 8.964 reviews (3.869 Texel, 5.095 Calpe) live op beide frontends. API werkte al correct (Outcome A). Backend: rating_distribution toegevoegd. Frontend: poiName fix + mock data DEV-only. 7/7 API tests PASS. Reviews verwijderd uit Openstaande Componenten. Kosten: EUR 0.** |
| **7.71** | **18-03-2026** | **OPDRACHT 7/7B: Content Studio Image Quality — Enterprise Image Selection. OPDRACHT 7: media_ids resolve (poi: prefix strip, w=600 webp, alt text). OPDRACHT 7B: POI auto-detectie uit titel, diversity filter (usedImageIds), content-type limieten (blog=3, social=1), imageSelector.js forSuggestion 6 results, PlatformPreview images (was grey placeholder). Frontend: STATUS_LABELS crash fix (StatusChip i18n), ContentImageSection rewrite (3-6 alternatieven inline, click-to-select). 5 bestanden. 212 endpoints. adminPortal.js v3.32.0. CLAUDE.md v4.11.0.** |
| **7.70** | **16-03-2026** | **CS v6.0 Chirurgisch: Browser-Verified Remediatie — 7 Fixes. SEO scoring fairness (auto-derive meta desc, paragraph credit, softer links, MAX_ROUNDS=3). Auto-attach images (selectImages() + imageurls fixes). Pinterest+YouTube OAuth callbacks + LinkedIn .default fix. Meta System User→Page Token exchange (1h cache), Facebook analytics werkend. Token encryption SHA-256 key fix. PlatformPreview blog-on-social. 7 bestanden. CLAUDE.md v4.10.0.** |
| **7.67** | **15-03-2026** | **Content Module Waves 5+6: Enterprise Workflow + Platform Completion. Wave 5: approval logging (content_approval_log), version control (content_item_revisions, auto-snapshot), team comments (content_comments), content pillars (content_pillars, 4 Calpe geseeded), best-time-to-post analyse (bestTimeCalculator.js, 90-day data), UTM tracking (utmBuilder.js), hashtag engine (hashtagEngine.js), bulk operations (approve/reject/schedule/delete). PlatformPreview.jsx multi-platform mockups + real-time validation. ContentStudioPage enhanced: right sidebar panels (SEO/Preview/Comments/History), character counter, bulk toolbar. Wave 6: X API v2 client (xClient.js), Pinterest API v5 client (pinterestClient.js), 14 content templates (contentTemplates.js, 3 destinations), publish retry BullMQ job (content-publish-retry, max 3 attempts), brand score checking endpoint, SocialAccountsCards.jsx (6 platforms, token expiry countdown). content-weekly-report BullMQ job (Monday 08:00). 4 DB tabellen. 19 API endpoints (208 totaal). 2 BullMQ jobs (62 totaal). adminPortal.js v3.30.0. CLAUDE.md v4.7.0.** |
| **7.66** | **15-03-2026** | **Enterprise SEO v2.0 + Tone of Voice + Agent Fixes. seoAnalyzer.js v2.0: content-type-aware scoring (blog/social/video elk 7 checks). SEO-aware Mistral prompts (criteria embedded). SEO_MINIMUM_SCORE=80. Auto-improve loop + "AI Verbeter" button. toneOfVoice.js v2.0: data-driven (DB branding JSON + 5-min cache + fallback). BrandingPage Tone of Voice accordion (8 velden). 5 agent runtime fixes: financialMonitor guest_email, syncReporter spam_score verwijderd, trendAggregator ENUM validatie, googleTrendsCollector Apify timeRange fix, holibotSync getOrCreateCollection. 1 endpoint (189 totaal). 60 jobs. 25 agents. adminPortal.js v3.28.0. CLAUDE.md v4.6.0.** |
| **7.65** | **15-03-2026** | **Fase D: Content Intelligence — Analytics Dashboard + Feedback Loop + Swat.io. BLOK D.0: Content Analyse Dashboard — 3 nieuwe analytics endpoints (overview met KPI+groei+tijdreeks, per-item met sort/filter/paginatie, platform vergelijking met CTR+engagement rate). ContentAnalyseTab.jsx (3 sub-tabs: Overzicht/Per Item/Platformen, LineChart, PieChart content type, BarChart CTR vergelijking, groeipercentage chips). Performance tab vervangen door Analyse tab. BLOK D.1: Feedback Loop (Optie B — standalone in Trendspotter). feedbackLoop.js: wekelijks correleer trending keywords met content_performance, boost/penalize relevance_score. BullMQ content-feedback-loop (zondag 04:00). BLOK D.2: Swat.io Evaluatie Rapport — aanbeveling: nu NIET switchen (geen publieke API, kosten ~EUR 3.600-6.000/jaar, workflow duplicatie). 3 endpoints (188 totaal). 1 job (60 totaal). adminPortal.js v3.28.0. CLAUDE.md v4.3.0.** |
| **7.63** | **15-03-2026** | **Fase C: Content Publishing — De Uitgever Agent + Social Media + Calendar. Publisher Agent (#25 De Uitgever): Meta Graph API v25.0 (Facebook + Instagram two-step container), LinkedIn Marketing API, platform client factory. Content Calendar tab (maandweergave, seizoensoverlay, inplannen/publiceren). Performance tab (KPI cards, Recharts BarChart+PieChart, top content). Seasonal Config tab (CRUD, activeren, thema's, hero image override). Social Accounts (connect/disconnect, AES-256-CBC). LinkedIn OAuth callback. DB migration content_items +3 kolommen + ENUM uitgebreid. 2 social_accounts geseeded. 17 nieuwe API endpoints (185 totaal). 3 BullMQ jobs (59 totaal). 25 agents (+1). 3 frontend tabs, 17 API methods, 16 hooks. i18n 4 talen. adminPortal.js v3.27.0. CLAUDE.md v4.1.0.** |
| **7.62** | **14-03-2026** | **Fase B: Content Engine — AI Content Generatie Motor. De Redacteur Agent (#23, Mistral AI content generatie, tone-of-voice, vertaling, formatting). De SEO Meester Agent (#24, SEO analyse, Flesch-Kincaid per taal, SISTRIX integratie). Content Suggestie Engine (3 endpoints). Content Generator UI (7 endpoints, ContentStudioPage 3 tabs). 10 nieuwe + 7 gewijzigde bestanden. 24 agents, 56 jobs, 168 endpoints. adminPortal.js v3.26.0. CLAUDE.md v4.0.0.** |
| **7.61** | **11-03-2026** | **Command v15.1 — Fase VI-B Features + Admin Fixes. DEEL A: Hero chatbot "general" filter, events slide-in drawer (EventDetailDrawer + EventCard + API proxy), block selector dark mode. DEEL B: SearchBar (debounced autocomplete), LanguageSwitcher (cookie locale override), chatbot speech-to-text (Web Speech API), chatbot refresh button. Admin: OnboardingPage React Error #31 fix, design templates → Onboarding, POI module + AI Content. 5 nieuwe + 8 gewijzigde bestanden (724 LOC). CLAUDE.md v3.99.0.** |
| **7.99** | **07-04-2026** | **Hybride B/C Image Keywords 100% COMPLEET + Image Picker UX**. Pixtral 12B batch finale: 25.426/25.632 images verwerkt (99,2%), 12 errors (0,05%), 206 skipped (te groot/missing), totale kosten **€2,67** (was geschat €6-7), looptijd ~6u met 1x checkpoint resume. Velden: keywords_visual, visual_description, visual_mood, visual_setting. Image picker POI-tab UX upgrade: placeholder "Zoek op naam, categorie, sfeer (terrace, romantic, beach)...", helperText uitlegt FULLTEXT zoekbereik, toont poi_category + AI visual_description per resultaat. CLAUDE.md v4.38.1.** |
| **7.98** | **06-04-2026** | **CalpeTrip Blog Live + POI Frontend Fix + Blog Analytics. POIsPage "Bekijk op frontend" URL fix (holidaibutler.com→calpetrip.com). generateFromPOI timeout 120s→600s. 2e blog gepubliceerd ("Plan Your Calpe Trip") met CalpeTrip mobile screenshot. 4 SA blog events (list_viewed, card_clicked, article_viewed, back_clicked). blogs.js URL image resolver. CLAUDE.md v4.38.0.** |
| **7.97** | **06-04-2026** | **Async Content Generation + 8 Content Studio Bug Fixes + Image Keywords Hybride B/C. Async: /concepts/generate retourneert instant, achtergrond-generatie (setImmediate), frontend polling elke 5s, DB ENUM 'generating'. 8 bugs: Website platform, hashtag afbreking, media_ids/social_metadata opslaan, UTM check, editorial arcering, blog HTML, meta description woordgrens, website_analytics prompt. Image keywords: FULLTEXT search op keywords_verified (26.415 Apify) + keywords_visual (Pixtral 12B). Apify image_id fix + 1.208 wees-images. SA v3.0: sendBeacon + IntersectionObserver + desktop tracking. SEO_MINIMUM_SCORE 50, MAX_ROUNDS 1. CLAUDE.md v4.37.0.** |
| **7.96** | **06-04-2026** | **Content Studio Enterprise Redesign Opdracht 1-4 + CalpeTrip Blog. ConceptDialog 2-panel (1326 LOC): platform tabs, body editor, vertaal-tabs, SEO/Brand Score, PlatformPreview, publish/schedule acties, blog-modus (TipTap WYSIWYG). Facebook publish fix (page ID social_accounts). Prompt engineering per kanaaltype (Quality Checklist). UTM tracking. Blog: public API /api/v1/blogs, CalpeTrip.com blog route (customer-portal SPA), BlogGrid block + editor. CalpeTrip hybride architectuur gedocumenteerd. Taaldetectie Accept-Language (fallback EN). 249 endpoints, adminPortal.js v3.41.0, 37 block editors. CLAUDE.md v4.36.0.** |
| **7.95** | **06-04-2026** | **Simple Analytics Event Tracking v3.0. sendBeacon fallback, 50 events, 27 bestanden. CLAUDE.md v4.35.0.** |
| **7.60** | **10-03-2026** | **Command v15.0 — UX Polish (Fase VI-A). 7 fixes: ChatbotWidget mobile responsive (calc(100vw-1.5rem)), loading skeletons (Skeleton.tsx + Suspense SSR streaming), animaties (fadeInUp, stagger, hover lift, image fade-in, prefers-reduced-motion), Hero/DateBlock responsive tekst, Map responsive hoogte (300/400/500px), ScrollToTop button, font preloading. 2 nieuwe + 10 gewijzigde bestanden. CLAUDE.md v3.98.0.** |
| **7.59** | **10-03-2026** | **Command v14.0 DEEL B: Browser-Verificatie + CI/CD Workflow. POI detail HTTP 500 fix (PoiImageGallery.tsx 'use client' — React 19 Server Component event handler beperking). deploy-hb-websites.yml CI/CD workflow aangemaakt + fixed (rsync --delete wiped server-only files → verwijderd, config files aan Git). tsconfig.json exclude playwright/tests. Server hersteld (214 PM2 restarts). Workflow dev+main SUCCESS. CLAUDE.md v3.97.0.** |
| **7.58** | **10-03-2026** | **Command v14.0 DEEL A: 5 Resterende Fixes — Customer Portal Kwaliteit. FIX 1: Footer navigation data-driven (tenant.config.nav_items) + custom HTML. FIX 2: ButtonRenderer generiek component (Hero/Cta refactored, CardGroup+Banner chatbot variant). FIX 3: POI detail image layout (4 varianten, vaste verhoudingen). FIX 4: POI detail slide-in drawer (PoiDetailDrawer+PoiCard CustomEvent, API proxy). FIX 5: Filter modals POI+Event (categorie/rating/reviews/sort/datum, slide-in, i18n). 7 nieuwe + 11 gewijzigde bestanden. 10/10 Hetzner PASS. CLAUDE.md v3.96.0.** |
| **7.57** | **10-03-2026** | **Command v13.0 DEEL A: 5 Resterende Bugs BLOKKEREND. BUG 1: Chatbot destination mixing fix (calpe.config.js chromaCollection holidaibutler_pois→calpe_pois). BUG 2: Chatbot kleur chatbotColor prop (layout.tsx→ChatbotWidget). BUG 3: Categorie kleuren Customer Portal exact match (gradient-primary bg + witte tekst). BUG 4: Filter bars DB block types fix (poi_grid→poi_grid_filtered, 6 rijen). BUG 5: Footer brand logo (resolveAssetUrl + img). 5 code + 1 config + 6 DB. 5/5 PASS. CLAUDE.md v3.95.0.** |
| **7.56** | **09-03-2026** | **Command v12.0: 8 fixes + Onboarding Wizard, 11 acceptatiecriteria PASS. Hero chatbot button DATA fix (variant→chatbot). POI detail map single marker (staticMarkers prop). Categorie kleuren Customer Portal match (3 bestanden). Footer brand social icons verwijderd. Onboarding wizard 5-stappen (OnboardingPage.jsx + POST /onboarding/create, 158 endpoints). 1+11 bestanden + 1 DB update. CLAUDE.md v3.94.0.** |
| **7.55** | **09-03-2026** | **Chirurgisch Command v11.0: 10 fixes, 12 acceptatiecriteria PASS. Tip van de Dag /daily-tip endpoint + TipCard. Event detail intern (/event/:id). POI image responsive. BrandingPage preview 5 buttons. Quick action buttons in blocks. Filter chips (PoiFilterBar/EventFilterBar). Footer social icons backend fallback. quickActionFilter doorwiring. 6+10 bestanden. CLAUDE.md v3.93.0.** |
| **7.54** | **09-03-2026** | **Diagnostic Repair v10.0: 8 browser-verified fixes (DIAGNOSE→FIX→BEWIJS protocol). Chatbot ChromaDB calpe_pois (root cause 5e keer), FeatureList crash fix, Homepage TOURIST_CATEGORIES whitelist, Button merge deriveButtonDefaults, Category color badges, Chatbot config uitbreiding. CLAUDE.md v3.92.0.** |
| **5.9** | **19-02-2026** | **Fase R6d Openstaande Acties COMPLEET: (1) Markdown fix: 388 POIs gerepareerd (1.535 velden, 0 resterend). (2) 119 POIs inventarisatie: alle Accommodation (bewust excluded). (3) Social media bronnen: geaccepteerd als technische beperking (Meta anti-bot). Content Repair Pipeline R1-R6d COMPLEET.** |
| **5.8** | **19-02-2026** | **Fase R6c Calpe Re-vectorisatie COMPLEET: calpe_pois collectie ge-revectoriseerd met R6b content. 5.932 vectoren (1.483 POIs × 4 talen), 1 error (gefixed), 25,7 min, EUR 2,37. Texel ongewijzigd (PASS). 5/5 test queries passed. Beide chatbots (Tessa + HoliBot) serveren nu R6b claim-stripped content. Totaal R6c: 12.316 vectoren, EUR 4,92.** |
| **5.7** | **19-02-2026** | **Fase R6c ChromaDB Re-vectorisatie Texel + Steekproef Fix COMPLEET: texel_pois collectie ge-revectoriseerd met R6b content. 6.384 vectoren (1.596 POIs × 4 talen), 0 errors, 27,6 min, EUR 2,55. 2 POI-correcties (Vuurtoren Texel + Terra Mítica). 5/5 test queries passed. Tessa serveert nu feitelijk correcte content.** |
| **5.6** | **19-02-2026** | **Fase R6b Content Quality Hardening COMPLEET: 2.047 POIs chirurgisch claim-stripped (0 failures, AIDA behouden, gem. woordaantal 98→85). AM/PM sweep database-breed (50 conversies, 0 resterend). 6.177 hervertalingen NL/DE/ES (100% coverage). Audit trail: 2.097 entries. Content Repair Pipeline R1-R6b COMPLEET.** |
| **5.5** | **18-02-2026** | **Fase R6 Content Completion & Vertaling COMPLEET: Alle 3.079 POIs × 4 talen (EN/NL/DE/ES) = 12.316 beschrijvingen in productie. 884 generieke beschrijvingen, 9.066 vertalingen, 0 missing. Content Repair Pipeline R1-R6 COMPLEET.** |
| **5.4** | **16-02-2026** | **Fase R5 Safeguards COMPLEET: 1.730 POIs gepromoveerd naar productie. 1.003 geblokkeerd door safeguards. Audit trail. Monitoring. Content Repair Pipeline R1-R5 COMPLEET.** |
| **5.3** | **13-02-2026** | **Fase R4 Regeneratie + Verificatie Loop COMPLEET: 3.079 POIs opnieuw gegenereerd. Hallucinatie: 19.5% (was 61%). 0 errors. 397 PASS, 2.114 REVIEW, 568 FAIL. Staging-first workflow. ~EUR 12 Mistral API.** |
| **4.0** | **10-02-2026** | **MASTER DOCUMENT: 3 strategische documenten geintegreerd (Strategic Advisory v3.1, Status Actieplan v1.0, Claude Code Commando v3.0). Bijgewerkt met Fase 6c (SSL, Sentry, Suggestions) en Fase 6d (ROOT CAUSE destination routing, CORS, categories, fuzzy matching, spacing, itinerary). Alle 13 voltooide fasen gedocumenteerd. Budget: EUR 52,41 van EUR 69 (76%). Resterende fasen: 7 (Reviews), 8 (Agents), 8b (Dashboard).** |

---

*Dit document wordt bijgewerkt na elke implementatiefase.*
*Laatst bijgewerkt: 20 april 2026 — Corporate UX Upgrade (v4.54.0): sidebar, kalender, analytics, dashboard, onboarding widget, performance, WCAG. 295 endpoints, adminPortal.js v3.47.0. 74 scheduled jobs. 25 agents. CLAUDE.md v4.54.0. MS v8.14.*
