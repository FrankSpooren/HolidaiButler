# CLAUDE_HISTORY.md - HolidaiButler Fase Resultaten Archief

> **Versie**: 1.0.0
> **Aangemaakt**: 26 februari 2026
> **Doel**: Volledig archief van alle fase-resultaten, changelogs en bestandslijsten
> **Gebruik**: Raadpleeg ALLEEN wanneer historische details nodig zijn. Dit bestand wordt NIET automatisch geladen.

---

## Inhoudsopgave

1. [Content Pipeline Fasen (4, 4b, 6, 6b-6e)](#content-pipeline-fasen)
2. [Content Repair Pipeline (R1-R6d)](#content-repair-pipeline)
3. [Reviews Integratie (Fase 7)](#fase-7-resultaten)
4. [Agent Fasen (8A, 8A+, 8B)](#agent-fasen)
5. [Admin Portal Fasen (8C-0 t/m 9I)](#admin-portal-fasen)
6. [Fase 10A: Agent Ecosysteem Optimalisatie](#fase-10a-agent-ecosysteem-optimalisatie-26-02-2026)
7. [Fase 10A-R + 10B + 10C](#fase-10a-restant--10b--10c)
8. [Fase 11A: Agent Ecosysteem Audit + Activering](#fase-11a--agent-ecosysteem-audit--activering-27-02-2026)
9. [Fase 11B: Agent Ecosysteem Enterprise Complete](#fase-11b--agent-ecosysteem-enterprise-complete-27-02-2026)
10. [Fase 12: Verificatie, Consolidatie & Hardening](#fase-12--verificatie-consolidatie--hardening-27-02-2026)
11. [Fase II Blok A: Chatbot Upgrade](#fase-ii-blok-a--chatbot-upgrade-28-02-2026)
12. [LLM Content Generatie Details](#llm-content-generatie-details)
13. [Fase III Blok G+A: Commerce Foundation Start](#fase-iii-blok-ga--commerce-foundation-start-01-03-2026)
14. [Fase III Blok B: Ticketing Module](#fase-iii--blok-b-ticketing-module-01-03-2026)
15. [Fase III Blok C: Reservation Module](#fase-iii--blok-c-reservation-module-01-03-2026)
16. [Fase III Blok D: Chatbot-to-Book Voorbereiding](#fase-iii--blok-d-chatbot-to-book-voorbereiding-02-03-2026)
17. [Fase III Blok E: Admin Commerce Dashboard](#fase-iii--blok-e-admin-commerce-dashboard-02-03-2026)
18. [Fase III Blok F: Testing & Compliance (FASE III COMPLEET)](#fase-iii--blok-f-testing--compliance-02-03-2026)
19. [Fase IV-A: Apify Data Pipeline — Medallion Architecture](#fase-iv-a--apify-data-pipeline--medallion-architecture-03-03-2026)
20. [Fase IV-B: POI Tier Import + Owner-Managed Tiers](#fase-iv-b--poi-tier-import--owner-managed-tiers-03-03-2026)
21. [Fase IV-0: Pre-flight & Adyen Activatie](#fase-iv-0--pre-flight--adyen-activatie-03-03-2026)
22. [Fase IV Blok A: Partner Management Module](#fase-iv-blok-a--partner-management-module-03-03-2026)
23. [Volledige Changelog](#volledige-changelog)

---

## Content Pipeline Fasen

### Fase 4/4b Resultaten
| Metriek | Waarde |
|---------|--------|
| POIs gegenereerd | 2.515 |
| Success rate | 100% |
| Kosten Fase 4 | EUR 8.93 |
| Kosten Fase 4b | EUR 6.02 |
| Approved | 2.481 (98.6%) |
| Manual Review | 34 (1.4%) → Frank akkoord: USE_NEW |
| Keep OLD | 0 (0%) |
| NEW vs OLD score | +2.17 punten |

### Fase 6 Resultaten (AI Chatbot Texel "Tessa")
| Metriek | Waarde |
|---------|--------|
| QnA vectoren (Texel) | 93.241 |
| POI vectoren (Texel) | 1.739 |
| Totaal in `texel_pois` | 94.980 |
| Vectorisatie errors | 0 |
| Vectorisatie kosten | ~EUR 19 |
| Backend bestanden gewijzigd | 8 |
| Frontend bestanden gewijzigd | 5 |
| Talen ondersteund | NL, EN, DE |
| API test Texel | ✅ Correct (Texel stranden) |
| API test Calpe regressie | ✅ Geen regressie |
| Session destination_id | ✅ Correct opgeslagen |

### Fase 6b Resultaten (Quick Actions Destination Fix)
| Endpoint | Probleem | Fix | Status |
|----------|----------|-----|--------|
| GET /daily-tip | Event query gebruikte `calpe_distance`, geen `destination_id` filter | Haversine formula + `destination_id` filter, dynamic `allowedCategories` uit config | ✅ |
| POST /directions | POI lookup zonder `destination_id` filter | `destination_id` filter met fallback voor backward compat | ✅ |
| GET /suggestions | Hardcoded "Calpe" in seizoen/tijd teksten | Destination-aware greetings, tips, season highlights via `destName` parameter | ✅ |
| GET /trending | Geen destination filter in trending SQL | JOIN met POI tabel voor destination filtering, cache per destination | ✅ |

**Bestanden gewijzigd (4)**: calpe.config.js, texel.config.js (quickActionCategories), suggestionService.js (destination-aware), holibot.js (4 endpoints)

### Fase 6c Resultaten (SSL + Sentry + Suggestion Content Fix)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| SSL Certificate | **GEEN SSL cert + Apache VHost voor api.holidaibutler.com** → ERR_CERT_COMMON_NAME_INVALID voor alle API calls | Certbot cert + Apache VHost met ProxyPass naar 127.0.0.1:3001, CORS headers | ✅ |
| Sentry DSN | Frontend DSN met hyphens in key (`bd88b00e-1507...`) + .env.texel disabled + .env.production missing | DSN key zonder hyphens, alle env files gefixed (project 2 = customer-portal) | ✅ |
| Suggestion Content | TIME_BASED_SUGGESTIONS had hardcoded Calpe content (Peñón de Ifach, tapas tour) voor alle destinations | Per-destination suggestions: calpe + texel keys met lokale content (eilandcafé, duinen, Ecomare, Den Burg) | ✅ |
| SEASONAL_SUGGESTIONS | Hardcoded "stranden van Calpe", "charme van Calpe" | Refactored naar SEASONAL_CATEGORIES (destination-neutral) + getSeasonHighlight() (destination-aware) | ✅ |

**Bestanden gewijzigd**: suggestionService.js, .env, .env.texel, .env.production
**Server configs aangemaakt**: api.holidaibutler.com.conf, api.holidaibutler.com-le-ssl.conf
**SSL cert**: Let's Encrypt, geldig tot 2026-05-11
**Bugsink projects**: 1=api, 2=customer-portal, 3=admin-portal

### Fase 6d Resultaten (Destination Routing + Categories + Fuzzy Match + Spacing)
| Issue | Probleem | Fix |
|-------|----------|-----|
| Destination Routing | **ROOT CAUSE**: `getDestinationFromRequest()` deed `parseInt("texel")` → NaN → default 1 (Calpe) | Accepteert nu string ("texel", "calpe") + numeric (1, 2) via `codeToId` mapping |
| CORS Fix | `Access-Control-Allow-Origin` was `/usr/bin/bash` (shell variable expansie bug) | Apache RewriteRule met `%{HTTP:Origin}` matching |
| Category Filtering | Te veel categorieën zichtbaar, ontbrekende iconen | **Whitelist** i.p.v. blacklist: 8 categorieën Texel |
| Spacing | LLM output: "inDen Burg" — Mistral merges woorden | `fixResponseSpacing()` in ragService |
| POI Name Recognition | "12 Balcken" niet herkend als "Taveerne De Twaalf Balcken" | `normalizeDutchNumbers()` + `findFuzzyMatch()` |

**Texel categorieën (whitelist)**: Eten & Drinken, Natuur, Cultuur & Historie, Winkelen, Recreatief, Actief, Gezondheid & Verzorging, Praktisch

### Fase 6e Round 1 (X-Destination-ID + Daily Tip Overhaul)
- **ROOT CAUSE**: Alle `fetch()` calls in chat.api.ts misten `X-Destination-ID` header → Backend defaulted naar Calpe
- Fix: `defaultHeaders` getter met `X-Destination-ID: getDestinationId()` in ChatAPI class (11 fetch calls)
- Daily Tip: MistralAI call VERWIJDERD (hallucinatie), alleen POI card met `review_count >= 1` + images
- **Bestanden**: chat.api.ts, MessageList.tsx, CategoryBrowser.tsx, holibot.js, ragService.js

### Fase 6e Round 2 (Opening Hours + Dutch Icons + Streaming + Image Priority)
- Opening Hours: complete rewrite `isCurrentlyClosedFromHours()` — Dutch+English day mapping, array/object format detection
- Itinerary: Dutch types toegevoegd (natuur, actief, strand, musea, etc.)
- 60+ Nederlandse subcategorie-iconen
- Streaming spacing fix: `cleanAIText()` aangeroepen in streaming endpoint
- Image priority: `getLocalImagePriority()` — user photos priority 0, street view priority 5

### Fase 6e Round 3 (Texla→Tessa + ChromaDB + Spacing + Itinerary Images)
- 23 occurrences "Texla" → "Tessa" in 6 frontend pagina's
- ChromaDB warnings 15+ → 3 via `@chroma-core/default-embed` npm package
- Generieke camelCase split regex in `cleanAIText()`
- Itinerary images: `getImagesForPOIs()` batch-fetch toegevoegd

---

## Content Repair Pipeline

### Fase R1 Resultaten (Content Damage Assessment — 12/02/2026)

**Aanleiding**: Frank's steekproef onthulde 100% foutenpercentage in 6 Texel POIs.
**Root Cause**: Prompt "Include at least one concrete detail" zonder brondata → LLM vulde met verzonnen details.

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs met data | 48 | 47 | 95 |
| Gem. hallucinatie% | 61% | 62% | 61% |
| Severity HIGH/CRITICAL | 100% | 100% | 100% |

**Conclusie**: **NO-GO** voor productie. Content Repair Pipeline R2-R5 verplicht.

**Deliverables**: `/root/fase_r1_damage_assessment.md`, `_factcheck_texel.json`, `_calpe.json`, `_website_data_*.json`, `_r2_scrape_targets.json`, `_r3_prompt_improvements.md`, `_damage_assessment.py`

### Fase R2 Resultaten (Source Data Verrijking — 12/02/2026)

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| Websites gescrapet | 1.144 | 626 | 1.770 |
| Success rate | 95% | 88% | 92% |
| Data quality: rich | 984 | 478 | 1.462 (47%) |
| Data quality: moderate | 59 | 172 | 231 (8%) |
| Data quality: minimal | 452 | 614 | 1.066 (35%) |
| Data quality: none | 101 | 219 | 320 (10%) |
| Doorlooptijd | — | — | 380 min |

**Deliverables**: `/root/fase_r2_scraped_data.json` (13MB), `_fact_sheets.json` (29MB), `_coverage_report.md`, `_summary_for_frank.md`

### Fase R3 Resultaten (Prompt Redesign — 13/02/2026)

16 anti-hallucinatie regels, 4 kwaliteitsniveaus, categorie-specifieke guardrails.
Verwijderde R1-root causes: "Include concrete detail", "Hook with surprising element", "Be specific".

| Metriek | R1 (oud) | R3 (nieuw) |
|---------|----------|------------|
| Hallucinatie-rate | 61% | ~14% |
| PASS | 0% | 25% |
| REVIEW | 0% | 58% |
| FAIL | 100% | 8% |

**Woorddoelen**: Rich: 110-140, Moderate: 85-115, Minimal: 55-85, None: 30-60.

### Fase R4 Resultaten (Regeneratie + Verificatie Loop — 13/02/2026)

- Doorlooptijd: 449 min, Model: mistral-large-latest, Errors: 0
- Gem. hallucinatie: 19.5% (was 61% in R1)

| Kwaliteit | Aantal | PASS | REVIEW | FAIL |
|-----------|--------|------|--------|------|
| Rich | 1.462 | 91 | 1.088 | 283 |
| Moderate | 231 | 8 | 180 | 43 |
| Minimal | 1.066 | 244 | 638 | 184 |
| None | 320 | 54 | 208 | 58 |
| **Totaal** | **3.079** | **397** | **2.114** | **568** |

### Fase R5 Resultaten (Safeguards — 16/02/2026)
1.730 POIs gepromoveerd (0 errors), 1.003 geblokkeerd door safeguards. poi_content_history audit trail (1.730 entries). Safeguard regels: HIGH claim blocker, hallucinatie threshold, woordaantal, embellishment blocklist.

### Fase R6 Resultaten (Content Completion — 18/02/2026)
Stap A: Frank's review Top 150 (87 GOED, 61 AANPASSEN, 2 AFKEUREN). Stap B: 884 generieke veilige beschrijvingen. Stap C: 9.066 vertalingen NL/DE/ES (49 min parallel). Alle 3.079 POIs applied.

### Fase R6b Resultaten (Quality Hardening — 19/02/2026)
2.047 POIs claim-stripped (0 failures, AIDA behouden, 98→85 woorden). 41 POIs AM/PM sweep (68 conversies). 6.177 hervertalingen. Frank's steekproef Excel 20 POIs.

### Fase R6c Resultaten (ChromaDB Re-vectorisatie — 19/02/2026)
Texel: 6.384 vectoren, 27.6 min, €2.55. Calpe: 5.932 vectoren, 25.7 min, €2.37. 2 POI-correcties: Vuurtoren Texel + Terra Mítica.

### Fase R6d Resultaten (Openstaande Acties — 19/02/2026)
- Social media: geaccepteerd als beperking (0.2% FB, 0% IG)
- 119 POIs: alle Accommodation (bewust excluded)
- Markdown fix: 388 POIs, 1.535 velden, 0 resterend

---

## Fase 7 Resultaten (Reviews Integratie — 19/02/2026)

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| Reviews | 3.869 | 5.095 | 8.964 |
| Met review_text | ~3.200 | ~4.300 | 7.519 |
| Sentiment: positive | ~2.800 | ~3.900 | 6.691 |

**Database Schema**: 18 kolommen — 11 model + 7 extra. Reviews tabel heeft eigen `destination_id`.
**Backend**: `rating_distribution` toegevoegd aan `/reviews/summary`.
**Frontend**: `poiName` fix, mock reviews gated achter DEV check.
**Tests**: 7/7 PASS.

---

## Agent Fasen

### Fase 8A Resultaten (Agent Reparatie — 20/02/2026)

**15 Agent Naamgeving:**

| # | Agent | Nederlandse Naam | Categorie |
|---|-------|-----------------|-----------|
| 1 | Orchestrator | De Maestro | Core |
| 2 | Owner Interface | De Bode | Core |
| 3 | Health Monitor | De Dokter | Operations |
| 4 | Data Sync | De Koerier | Operations |
| 5 | HoliBot Sync | Het Geheugen | Operations |
| 6 | Communication Flow | De Gastheer | Operations |
| 7 | GDPR | De Poortwachter | Operations |
| 8 | UX/UI | De Stylist | Development |
| 9 | Code | De Corrector | Development |
| 10 | Security | De Bewaker | Development |
| 11 | Quality | De Inspecteur | Development |
| 12 | Architecture | De Architect | Strategy |
| 13 | Learning | De Leermeester | Strategy |
| 14 | Adaptive Config | De Thermostaat | Strategy |
| 15 | Prediction | De Weermeester | Strategy |

**8A Wijzigingen (7 agents):**

| Step | Agent | Wijziging |
|------|-------|-----------|
| 8A-1 (P0) | De Koerier | Column mapping fix (9 kolommen, table name casing, destination_id passthrough) |
| 8A-2 (P1) | De Bode | Per-destination stats + 7 MailerLite custom fields |
| 8A-3 (P1) | De Leermeester | MongoDB persistence: `agent_learning_patterns` collection |
| 8A-4 (P1) | De Thermostaat | Complete rewrite: simulation → alerting-only + Redis persistence |
| 8A-5 (P2) | De Stylist | DESTINATION_BRAND_COLORS map (calpe + texel) |
| 8A-6 (P2) | De Dokter | 3 nieuwe portals + SSL expiry monitoring (5 domains) |
| 8A-7 (P3) | Legacy | workers.js deprecated |

**MailerLite Custom Fields**: calpe_pois, texel_pois, calpe_reviews, texel_reviews, prediction_alerts, prediction_summary, optimization_count

### Fase 8A+ Resultaten (Monitoring & Briefing — 20/02/2026)

**Nieuwe Modules**: contentQualityChecker.js, backupHealthChecker.js, smokeTestRunner.js
**Nieuwe Jobs (5)**: content-quality-audit (Mon 05:00), backup-recency-check (Daily 07:30), smoke-test (Daily 07:45), chromadb-state-snapshot (Sun 03:00), agent-success-rate (Mon 05:30)
**MailerLite fields**: smoke_test_summary, backup_summary, content_quality_summary
**Tests**: 16/16 PASS

### Fase 8B Resultaten (Agent Multi-Destination — 20/02/2026)

**BaseAgent Pattern**: BaseAgent.js + destinationRunner.js + agentRegistry.js
**Categorie A (13)**: De Maestro, De Bode, De Dokter, De Koerier, Het Geheugen, De Gastheer, De Poortwachter, De Inspecteur, De Leermeester, De Thermostaat, De Weermeester, Content Quality Checker, Smoke Test Runner
**Categorie B (5)**: De Stylist, De Corrector, De Bewaker, De Architect, Backup Health Checker
**Threema**: Passieve env var check, status: NOT_CONFIGURED
**Config Mapping Fix**: `c.destination.id` i.p.v. `c.id`
**Tests**: 22/22 PASS

---

## Admin Portal Fasen

### Fase 8C-0 Resultaten (Foundation — 20/02/2026)

**6 Endpoints**: POST /login, POST /refresh, POST /logout, GET /me, GET /dashboard, GET /health
**Frontend**: React 18 + Vite 4 + MUI 5 + Zustand (login, dashboard, layout, i18n NL/EN)
**CI/CD**: deploy-admin-module.yml (backup + health check + rollback)
**Admin User**: admin@holidaibutler.com (id=3, role=admin)
**Tests**: 15/15 PASS

### Fase 8C-1 Resultaten (Agent Dashboard — 20/02/2026)

**1 endpoint**: GET /agents/status (18 entries, Redis cache 60s, server-side filtering)
**Dashboard**: 4 summary cards, 6 category chips, destination dropdown, sortable table, recent activity, auto-refresh 5 min
**Tests**: 12/12 PASS, adminPortal.js v1.1.0

### Fase 8D Resultaten (Feature Pack — 20/02/2026)

**12 endpoints** (v2.0.0): POI Management (4), Reviews Moderatie (3), Analytics (2), Settings (3)
**4 pagina's + 4 API services + 4 hooks + 100+ i18n keys**

### Fase 8D-FIX Resultaten (Bug Fix — 21/02/2026)

12 bugs: resolveDestinationId(), POI stats/detail/edit field renames, review summary flattened, settings keys, destinations array→object, audit-log field mapping, frontend wrapper fixes, QuickLinks, agent detail dialog, Sentry DSN. **33/33 tests PASS**, v2.1.0

### Fase 8E Resultaten (Hardening & UX — 21/02/2026)

**BLOK 1**: Backup Health regex fix, dailyBriefing URGENT subject, De Maestro calculateAgentStatus fix (→18/18 HEALTHY), MySQL backup cron
**BLOK 2**: 14 asterisk POIs fixed, 79 ES translations, 121 inactive POIs documented
**BLOK 3**: 11 UX fixes (destination filter+vlaggen, sortable columns, analytics trends, agent profielen NL, DE/ES i18n)
**BLOK 4**: 5 doc fixes
**Kosten**: ~EUR 0.50

### Fase 9A Resultaten (Enhancement — 21/02/2026)

**9A-1**: RBAC user management (4 rollen), audit log undo, agent config editing
**9A-2**: Chatbot analytics (sessions, messages, fallback rate, languages)
**9A-3**: POI category management, image ranking (display_order), branding UI, dark mode
**16 nieuwe endpoints** (35 totaal). **34/34 tests PASS**

**Bestanden**:
- NEW: admin-module/src/pages/UsersPage.jsx, api/userService.js, hooks/useUsers.js, stores/themeStore.js
- MODIFIED: adminPortal.js (v3.0.0), theme.js, AgentsPage, AnalyticsPage, POIsPage, SettingsPage, i18n (4 talen)

### Fase 9A-FIX Resultaten (Login Fix — 22/02/2026)

- Rate limiter: 5→15 req/15min
- Account lockout: 5→10 attempts, 15→5 min lock
- Sessions UUID mismatch: INSERT non-blocking (.catch)

### Fase 9B Resultaten (Bug Fix & UX — 22/02/2026)

**BLOK 1 (6 P0)**: Unicode vlag-emoji, agent bullet rendering, destination status Unknown, user creation 500, image reorder, audit actor badges 🤖/⚙️/👤
**BLOK 2 (13 UX)**: Reviews filter, agent warnings, config popup 5-sectie, scheduled jobs descriptions, category chips, environment-aware links, branding, rolnamen, enterprise password policy
**BLOK 3**: Pageview tracking GDPR-compliant (page_views MySQL, POST /track, GET /analytics/pageviews)
**2 endpoints** (37 totaal), **28/28 PASS**, v3.1.0

### Fase 9C Resultaten (Live Verificatie — 22/02/2026)

**2 P0 fixes**: POST /users permissions fix, image reorder display_order persistence
**Enterprise Agent Popup**: 4 MUI tabs (Profiel/Status/Configuratie/Warnings), AGENT_TASKS 18 agents
**UX**: Subcategory 2-level editing, branding logo upload (multer, POST endpoint)
**1 endpoint** (38 totaal), v3.2.0

### Fase 9D Resultaten (Zero-Tolerance — 22/02/2026)

**Blok 1**: UsersPage crash null-safety, category chip kleuren 5x onderscheidend, MongoDB $set/$setOnInsert conflict
**Blok 2**: POI/review audit trail via saveAuditLog + saveUndoSnapshot, buildAuditDetail backward-compat, display_order 1-based
**28/28 PASS**, v3.3.0

### Fase 9E Resultaten (Persistent Failures — 22/02/2026)

| # | Issue | Fix |
|---|-------|-----|
| P1 | Unicode ES/NL | Vlag-emoji in ALLE bronbestanden |
| P2 | Scheduled jobs popup | 40x beschrijving 3-kolom |
| P3 | Agent warnings | cron-aware thresholds + body1 |
| P4 | Agent config persistent | 3-laags: PUT + GET merge + frontend save |
| P5 | Image reorder | display_order MySQL + public API + admin API |
| P6 | Welcome email | MailerSend enterprise HTML template |

**20/20 PASS**, v3.4.0

### Fase 9F Resultaten (Admin Definitief + RBAC — 24/02/2026)

**BLOK A (6 reparaties)**: Unicode definitief, image reorder e2e (publicPOI.js ORDER BY), agent config MongoDB persist, De Dokter URL fix, rate limiter platform_admin (IP whitelist + JWT bypass + IPv6), RBAC (destinationScope + writeAccess middleware)
**BLOK B (5 functies)**: User deactivate + permanent delete, review destination vlag, subcategory, i18n 4 talen, daily email shared getSystemHealthSummary()
**BLOK C (2 images)**: Image permanent delete + auto-renumber, 1-based numbering + Primary badge
**BLOK D (2 docs)**: 9D/9E/9F resultaten, versie sync
**3 endpoints** (41 totaal), v3.6.0

### Fase 9G Resultaten (Agent Fixes + RBAC — 24/02/2026)

**P1**: Agent config tasks max 10 (MongoDB ALTIJD prefereren boven static AGENT_TASKS)
**P2**: De Dokter stale→inactive (48h threshold)
**P3**: Per-agent errorInstructions in AGENT_METADATA (18 agents troubleshooting)
**P4**: RBAC live verified (4 rollen)
**P5**: Rate limiter account lockout trusted IP exempt
**P6**: Versie cross-refs (3 locaties)
v3.7.0

### Fase 9H Resultaten (Audit & Command — 24/02/2026)

**P1**: Agent config tasks frontend race condition (staleTime 60s→5s, optimistic updates)
**P2**: De Dokter JOB_ACTOR_MAP fix (workers.js 6 mappings voor correcte agent attribution)
**P3**: 509 Accommodation POIs → is_active=0 (411 Texel + 98 Calpe)
**P4**: Pageviews dag/week/maand granulatie ToggleButtonGroup
v3.8.0, **10/10 PASS**

### Fase 9I Resultaten (UX Polish + Analytics — 25/02/2026)

**P1**: Agent Profiel MongoDB tasks sync (useEffect init, staleTime 5s)
**P2**: Daily email vs dashboard: consistent by design (timing window gedocumenteerd)
**P3**: Dark mode contrast 7 bestanden (hardcoded hex → MUI palette tokens)
**P4**: scheduledJobs i18n 4 talen + popup datum
**P5**: De Poortwachter JOB_ACTOR_MAP +3 entries (gdpr-consent-audit, gdpr-retention-check, session-cleanup)
**P6**: Analytics granulatie dag/week/maand + default dag + Cell bars + pvPeriodDateFilter bug fix
**P7**: MS 9H documentatie gaps (Lessons Learned + Beslissingen Log + Changelog)
v3.9.0, **15/15 PASS**

---

## LLM Content Generatie Details

### Mistral AI Parameters
| Parameter | Waarde |
|-----------|--------|
| Model | mistral-medium-latest |
| API | https://api.mistral.ai/v1/chat/completions |
| Rate limit | 5 requests/seconde |
| Kosten | ~EUR 0.0035/POI |
| Success rate | 100% |

### Content Kwaliteitscriteria (9 criteria, gewogen)
| # | Criterium | Gewicht |
|---|-----------|---------|
| C1 | Grammatica & Spelling | 10% |
| C2 | British English | 10% |
| C3 | Tone of Voice | 10% |
| C4 | AIDA Model | 10% |
| C5 | Woordenaantal (115-135) | 5% |
| C6 | Formatting (plain text) | 10% |
| C7 | Concreetheid | 20% |
| C8 | Lokale Verankering | 15% |
| C9 | Actualiteit | 10% |

### Content Bronnen
| Bron | POIs | Status |
|------|------|--------|
| mistral_medium_fase4 | 2.515 | ⚠️ 61% hallucinaties (R1) |
| vvv_texel | 240 | ✅ Goed |
| poi_website | 276 | ✅ Variabel |
| calpe_es | 18 | ✅ Goed |
| R2 fact sheets | 3.079 | ✅ 47% rich, 8% moderate |

---

### Fase III — Blok E: Admin Commerce Dashboard (02-03-2026)

**Doel**: Enterprise-level Commerce Dashboard in de admin portal met real-time revenue monitoring, financial reporting, fraud alerting en CSV exports. READ-ONLY aggregatie over bestaande payment, ticketing en reservation tabellen — geen nieuwe DB tabellen.

**Afhankelijkheid**: Blok A (Payments), B (Ticketing), C (Reservations), D (Chatbot-to-Book) — alle COMPLEET.

**Resultaat**: CLAUDE.md v3.56.0 → v3.57.0, MS v7.22 → v7.23, adminPortal.js v3.16.0 → v3.17.0, 89 → 99 admin endpoints.

#### Backend: commerceService.js (READ-ONLY Aggregatie)
- `getDashboard()`: 5 parallel queries — revenue (net/refunds/ticket/deposit), transaction stats (total/success/failed/refunded + success_rate), ticket stats (sold/validated/cancelled + validation_rate), reservation stats (created/completed/no_shows/cancelled + no_show_rate + avg_party_size + occupancy_rate)
- `getDailyReport()`: GROUP BY DATE — transactions, revenue breakdown, net
- `getWeeklyReport()`: GROUP BY YEARWEEK — week start/end dates
- `getMonthlyReport(year)`: 12 maanden met i18n month_names (NL/EN/DE/ES)
- `getReconciliationReport(date)`: Alle transacties + refunds voor 1 datum, summary totals
- `exportTransactionsCSV()`: UTF-8 BOM, max 10.000 rijen, Content-Disposition header
- `exportReservationsCSV()`: Idem voor reserveringen
- `exportTicketOrdersCSV()`: Idem voor ticket orders
- `getAlerts()`: 6 rule-based fraud/anomaly detection types:
  - `chargeback` — enig chargeback status
  - `low_success_rate` — < 70% in afgelopen 7 dagen
  - `unusual_amount` — > €500 individuele transactie
  - `multiple_refunds` — > 2 refunds per order
  - `rapid_transactions` — > 10 transacties/uur
  - `noshow_spike` — > 30% no-show rate recent
- `getTopPOIs()`: 4 metrics (revenue, tickets_sold, reservations, occupancy), configurable limit

#### Admin API Endpoints (10 nieuw, 99 totaal)
- `commerceAuth` middleware: alleen `platform_admin` + `poi_owner` (NIET content_editor/reviewer)
- `getCommerceDestinationId()`: platform_admin ziet alle/specifieke, poi_owner alleen eigen destination
- `getDefaultDateRange()`: eerste dag huidige maand → vandaag
- GET `/commerce/dashboard` — KPI overview
- GET `/commerce/reports/daily` — dagelijks rapport (max 90 dagen)
- GET `/commerce/reports/weekly` — wekelijks rapport (max 1 jaar)
- GET `/commerce/reports/monthly` — maandelijks rapport (per jaar)
- GET `/commerce/reports/reconciliation` — reconciliatie (1 datum)
- GET `/commerce/export/transactions` — CSV download
- GET `/commerce/export/reservations` — CSV download
- GET `/commerce/export/tickets` — CSV download
- GET `/commerce/alerts` — fraud/anomalie meldingen
- GET `/commerce/top-pois` — top POIs per metric

#### Frontend: CommercePage.jsx (4 Tabs)
- **Dashboard Tab**: 4 KPI cards (revenue/transactions/tickets/reservations), Recharts BarChart (stacked ticket+deposit revenue), ticket stats box, reservation stats box, top POIs table
- **Reports Tab**: daily/weekly/monthly toggle, LineChart (net revenue), financial data table, reconciliation section met date picker
- **Alerts Tab**: severity-coded alert cards (critical=red, warning=orange, info=blue), empty state met check icon
- **Export Tab**: 3 CSV export cards (transactions, reservations, tickets), blob download flow

#### Supporting Files
- `admin-module/src/api/commerceService.js` — API client (10 endpoints)
- `admin-module/src/utils/currencyFormat.js` — `formatCents(amountCents, locale)` + `formatPercentage(value)`
- `admin-module/src/App.jsx` — Route: `/commerce` → CommercePage
- `admin-module/src/components/layout/Sidebar.jsx` — Commerce menu item (ShoppingCartIcon, allowedRoles: platform_admin + poi_owner)
- i18n: ~50 commerce keys in NL/EN/DE/ES + nav.commerce + common.load/name/category

#### Bestanden Overzicht
| Bestand | Status | Beschrijving |
|---------|--------|--------------|
| `platform-core/src/services/commerce/commerceService.js` | NIEUW | READ-ONLY aggregatie service (~450 regels) |
| `platform-core/src/routes/adminPortal.js` | GEWIJZIGD | v3.16.0→v3.17.0, 10 commerce endpoints |
| `admin-module/src/api/commerceService.js` | NIEUW | Frontend API client |
| `admin-module/src/utils/currencyFormat.js` | NIEUW | Euro formatting utility |
| `admin-module/src/pages/CommercePage.jsx` | NIEUW | 4-tab commerce dashboard (~505 regels) |
| `admin-module/src/App.jsx` | GEWIJZIGD | Route toevoeging |
| `admin-module/src/components/layout/Sidebar.jsx` | GEWIJZIGD | Menu item + RBAC |
| `admin-module/src/i18n/nl.json` | GEWIJZIGD | ~50 commerce keys |
| `admin-module/src/i18n/en.json` | GEWIJZIGD | ~50 commerce keys |
| `admin-module/src/i18n/de.json` | GEWIJZIGD | ~50 commerce keys |
| `admin-module/src/i18n/es.json` | GEWIJZIGD | ~50 commerce keys |

**Totaal**: 11 bestanden (4 nieuw + 7 gewijzigd), 0 DB wijzigingen, 10 nieuwe endpoints.

#### Verificatie
- Backend: 10/10 endpoints getest via curl met JWT auth
- Dashboard: real data (2 transacties, 7 tickets, 5 reserveringen)
- Monthly report: i18n month_names correct (NL/EN/DE/ES)
- CSV export: UTF-8 BOM, proper headers, Content-Disposition
- RBAC: platform_admin 200 OK, unauthenticated 401
- Frontend: build succesvol (Vite 4, 1.4MB bundle), deployed dev/test/prod

---

## Fase IV-B — POI Tier Import + Owner-Managed Tiers (03-03-2026)

**Doel**: Frank's manuele POI tier-indeling importeren in de database en De Koerier agent configureren om deze indeling te respecteren voor Apify-powered sync scheduling.

### Probleem

De Koerier's `getPOIsForUpdate()` berekende tiers **dynamisch** op basis van `tier_score` (runtime berekening). Frank's manuele tier-indeling uit Excel werd genegeerd. De `tier` kolom (TINYINT DEFAULT 4) bestond wel in de migratie maar was niet aangemaakt op productie en werd niet gebruikt door de sync pipeline.

### Oplossing

#### Database: Tier Kolom + Import (2.695 POIs)

```sql
ALTER TABLE POI ADD COLUMN tier TINYINT DEFAULT 4 COMMENT 'Manual tier assignment (1-4) by owner';
ALTER TABLE POI ADD INDEX idx_poi_tier (tier);
-- 2.695 UPDATE statements uit Excel
```

Tier distributie na import:
| Destination | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Totaal |
|------------|--------|--------|--------|--------|--------|
| Calpe | 2 | 116 | 691 | 784 | 1.593 |
| Texel | 18 | 39 | 255 | 1.427 | 1.739 |
| **Totaal** | **20** | **155** | **946** | **2.211** | **3.332** |

Tier 4 is hoger dan Excel (Calpe +154, Texel +483) omdat POIs niet in het Excel bestand default tier 4 kregen.

#### poiTierManager.js v2.0 — Owner-Managed Tiers

Kernwijziging: `getPOIsForUpdate()` query nu op stored `tier` kolom:

```js
// VOOR (v1.0): Alle POIs ophalen → scores berekenen → in-memory filteren
const [pois] = await sequelize.query('SELECT ... FROM POI ORDER BY last_updated ASC');
return pois.filter(poi => calculateTierScore(poi) >= minScore && ...);

// NA (v2.0): Directe query op stored tier kolom
const [pois] = await sequelize.query(
  'SELECT ... FROM POI WHERE tier = ? AND (is_active = 1 OR is_active IS NULL)',
  { replacements: [tier] }
);
```

`classifyAllPOIs()` (poi-tier-recalc job, zondag 03:00) herberekent alleen `tier_score` (informatief), wijzigt `tier` kolom NIET.

Verwijderd:
- Balanced Tier 1 category selection (7 nature, 8 food, 5 culture, 5 active)
- Practical critical override (ziekenhuizen, apotheken → forced Tier 2)
- `TIER1_CATEGORY_TARGETS`, `PRACTICAL_CRITICAL_TERMS` constants
- `selectBalancedTier1()`, `getTier1CategoryTargets()`, `determineTier()`, `isPracticalCritical()`, `isAccommodation()` methoden

#### De Koerier index.js — Cleanup

- `getTier1CategoryTargets()` methode verwijderd
- `tier1CategoryTargets` uit `getStatus()` response verwijderd
- `getPOIsForTiers()` aangepast: query nu op `tier IN (?)` i.p.v. `tier_score` ranges

#### Admin Portal — Tier Display

- Backend: `tier` kolom toegevoegd aan GET /pois (lijst) + GET /pois/:id (detail) response
- Frontend: Sync & Metadata Card toont "Tier X (score: Y.YY)" i.p.v. alleen tier_score

### BullMQ Cron Schedules (ongewijzigd — stonden al correct)

| Tier | Job | Cron | Frequentie |
|------|-----|------|-----------|
| 1 | poi-sync-tier1 | `0 6 * * *` | Dagelijks 06:00 |
| 2 | poi-sync-tier2 | `0 6 * * 1` | Wekelijks maandag 06:00 |
| 3 | poi-sync-tier3 | `0 6 1 * *` | Maandelijks 1e 06:00 |
| 4 | poi-sync-tier4 | `0 6 1 1,4,7,10 *` | Kwartaal 06:00 |
| — | poi-tier-recalc | `0 3 * * 0` | Zondag 03:00 (alleen tier_score) |

### Bestanden Gewijzigd

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `platform-core/src/services/agents/dataSync/poiTierManager.js` | v2.0 rewrite: query op tier kolom, score-only recalc |
| 2 | `platform-core/src/services/agents/dataSync/index.js` | Verwijderd: getTier1CategoryTargets(), getPOIsForTiers() tier_score→tier |
| 3 | `platform-core/src/routes/adminPortal.js` | tier kolom in GET /pois + GET /pois/:id |
| 4 | `admin-module/src/pages/POIsPage.jsx` | Sync card: "Tier X (score)" display |
| 5 | `scripts/tier_updates.sql` | 2.695 UPDATE statements uit Excel |

### Commit

- **Commit**: `e2dabce` — `feat: Fase IV-B — POI Tier Import + De Koerier Owner-Managed Tiers`
- **Pushed**: dev → test → main
- **CI/CD**: Deployed op Hetzner, PM2 herstart

---

## Fase IV-0 — Pre-flight & Adyen Activatie (03-03-2026)

### Probleem
Fase III Commerce Foundation (Payment/Ticketing/Reservation/Chatbot-to-Book) was volledig gebouwd maar nooit end-to-end getest. Alle 7 commerce feature flags stonden op `false`. PCI DSS en GDPR hadden openstaande handmatige items.

### Oplossing — Blok 0 Pre-flight

**Stap 0.1: Adyen E2E Test**
- Session creation: `POST /api/v1/payments/session` → Session ID `CS7F78812ACD01D0B4BE3C20D`
- Environment: `TEST`, Merchant: `HolidaiButler378ECOM`
- Transaction status endpoint: werkend (status=pending, correct voor nieuwe sessie)
- Client Key: `test_GTHKLMCCOV...` (correct test prefix)
- .env permissions: `600` (PCI DSS vereiste, bevestigd)

**Stap 0.2: Feature Flag Activatie (Calpe)**
- `hasBooking`: false → **true**
- `hasTicketing`: false → **true**
- `hasReservations`: false → **true**
- `hasChatToBook`: false → **true**
- `hasGuestCheckout`: was al true
- `hasDeposits`: false (bewust — toekomstig)
- `hasDynamicPricing`: false (bewust — toekomstig)
- Texel: nog niet geactiveerd (later)

**Stap 0.3: PCI DSS + GDPR Review**
- PCI DSS SAQ-A: 14/17 PASS, 3 handmatige items voor Frank (Bugsink check, Adyen 2FA, API key scope)
- GDPR: 27/31 PASS, 2 handmatige items voor Frank (Mistral AI DPA, Bugsink DPA)
- .env permissions: 600 (bevestigd, was al gecorrigeerd in Fase 10C)
- Compliance docs geüpdatet met Blok 0 review secties en GDPR readiness voor Intermediair module

**Bijkomende Fix: Legacy PM2 Process**
- `holidaibutler-reservations` (PM2 #4): ERRORED met 16+ restarts
- Root cause: legacy `reservations-module/` met corrupte node_modules (missing lodash)
- Dit is NIET de Fase III reservationService (die draait in platform-core)
- Actie: Process gestopt om crash loop te voorkomen

### Bestanden Gewijzigd
| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `platform-core/config/destinations/calpe.config.js` | Feature flags hasBooking/hasTicketing/hasReservations/hasChatToBook → true |
| 2 | `docs/compliance/pci-dss-saq-a.md` | Blok 0 review sectie, Adyen E2E test resultaat, .env 600 bevestiging |
| 3 | `docs/compliance/gdpr-compliance-checklist.md` | Blok 0 review sectie, GDPR readiness Intermediair module |

---

## Fase IV Blok A — Partner Management Module (03-03-2026)

### Doel
POI-eigenaars (restaurants, attracties, activiteiten) als partners registreren met commissie-afspraken. Basis voor de Intermediair-module (Blok B+).

### Multi-Tenant Configuratielaag Analyse
Architectuuradvies (Directus + Unleash, 3 maart 2026) geanalyseerd. Conclusie: Blok A is forward-compatible by design (`destination_id` FK's, REST API's, `destinationScope` middleware). Het advies is een Fase V+ item (trigger: eerste B2B-klant), NIET een blocker voor Fase IV. Feitelijke correctie: advies vermeldt PostgreSQL, platform gebruikt MySQL 8.0.

### Resultaten
- **Database**: 3 tabellen (`partners`, `partner_pois`, `partner_onboarding`) op Hetzner
- **Backend**: `partnerService.js` — CRUD, onboarding workflow (5 stappen), IBAN/BTW validatie (NL/BE/ES), contract status transitions (draft→pending→active→suspended/terminated), dashboard KPIs, partner-POI koppelingen
- **Admin API**: 7 endpoints in adminPortal.js v3.18.0 (99→106 totaal)
  - GET /partners (list + pagination + search + status filter)
  - GET /partners/stats (dashboard KPIs)
  - GET /partners/:id (detail + POIs + onboarding)
  - POST /partners (create + auto onboarding steps)
  - PUT /partners/:id (update)
  - PUT /partners/:id/status (contract transition + audit)
  - GET /partners/:id/transactions (placeholder Blok B)
- **Frontend**: PartnersPage.jsx — stats cards, partners tabel, detail dialog (4 tabs: Profiel/POIs/Onboarding/Transacties), 3-stappen create wizard (MUI Stepper), contract status management
- **i18n**: 4 talen (EN/NL/DE/ES), ~40 keys per taal
- **Sidebar**: Partners menu item (HandshakeIcon, platform_admin only)

### Bestanden
| # | Bestand | Actie |
|---|---------|-------|
| 1 | `platform-core/database/migrations/011_partner_tables.sql` | NEW |
| 2 | `platform-core/src/services/partner/partnerService.js` | NEW |
| 3 | `platform-core/src/routes/adminPortal.js` | EDIT (+7 endpoints, v3.18.0) |
| 4 | `admin-module/src/api/partnerService.js` | NEW |
| 5 | `admin-module/src/hooks/usePartners.js` | NEW |
| 6 | `admin-module/src/pages/PartnersPage.jsx` | NEW |
| 7 | `admin-module/src/App.jsx` | EDIT (+route) |
| 8 | `admin-module/src/components/layout/Sidebar.jsx` | EDIT (+menu item) |
| 9-12 | `admin-module/src/i18n/{en,nl,de,es}.json` | EDIT (+~40 keys) |
| 13 | `CLAUDE.md` | EDIT (v3.62.0) |
| 14 | `docs/strategy/HolidaiButler_Master_Strategie.md` | EDIT (v7.28) |
| 15 | `CLAUDE_HISTORY.md` | EDIT (+Blok A sectie) |

---

## Volledige Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **3.62.0** | **2026-03-03** | **Fase IV Blok A**: Partner Management Module. 3 DB tabellen, partnerService.js, 7 admin endpoints (106 totaal), PartnersPage.jsx, i18n 4 talen. Multi-tenant analyse. |
| **3.61.0** | **2026-03-03** | **Fase IV-0**: Pre-flight & Adyen Activatie. Adyen E2E test PASS. Feature flags Calpe geactiveerd. PCI DSS + GDPR Blok 0 review. Compliance docs geüpdatet. |
| 3.60.0 | 2026-03-03 | **Fase IV-B**: POI Tier Import + Owner-Managed Tiers. 2.695 POI tier-assignments uit Excel. poiTierManager.js v2.0: query op stored tier kolom. Admin Portal tier display. |
| **3.59.0** | **2026-03-03** | **Fase IV-A**: Apify Data Pipeline — Medallion Architecture (Bronze/Silver/Gold). poi_apify_raw tabel, poiSyncService.js rewrite, Apify backfill 1.023 POIs, 9.363 reviews, Admin Sync & Metadata card, Customer Portal dynamic amenities. Review sentiment fix. i18n hardcoded strings fix (10 bestanden, 95+ keys, 6 talen). |
| **3.58.0** | **2026-03-02** | **Fase III Blok F**: Testing & Compliance — FASE III VOLLEDIG COMPLEET. PCI DSS SAQ-A, 17 payment tests, GDPR audit, security audit. 7 compliance documenten. |
| **3.57.0** | **2026-03-02** | **Fase III Blok E**: Admin Commerce Dashboard. commerceService.js, 10 endpoints (99 totaal), CommercePage.jsx 4 tabs, CSV export, i18n 4 talen. |
| **3.56.0** | **2026-03-02** | **Fase III Blok D**: Chatbot-to-Book Voorbereiding. 4 booking sub-intents, ragService v2.6, 7 feature flags. |
| **3.55.0** | **2026-03-01** | **Fase III Blok C**: Reservation Module. 3 DB tabellen, 17 endpoints, slot locking, GDPR. |
| **3.54.0** | **2026-03-01** | **Fase III Blok B**: Ticketing Module. 5 DB tabellen, 21 endpoints, Redis inventory locking, QR HMAC, BullMQ. |
| **3.53.0** | **2026-03-01** | **Fase III Blok G+A**: Legal docs + Payment Engine. 6 juridische templates. Adyen SDK v30. |
| **3.52.0** | **2026-03-01** | **Fase II Blok D**: Customer Portal UX Upgrade. usePageMeta, Breadcrumbs 4 talen, PWA service worker. FASE II COMPLEET. |
| **3.51.0** | **2026-03-01** | **Fase II Blok C**: Agenda Module Upgrade. Multi-destination, iCal feeds, admin CRUD. adminPortal.js v3.13.0. |
| **3.50.0** | **2026-03-01** | **Fase II Blok B**: POI Module Verbetering. Freshness, clustering, image proxy. adminPortal.js v3.12.0. |
| **3.49.0** | **2026-02-28** | **Fase II Blok A**: Chatbot Upgrade. contextService.js, ragService v2.5, 12 intents, booking/escalation. |
| **3.48.0** | **2026-02-28** | Strategic Roadmap Advisory v2.0 geïntegreerd in CLAUDE.md + MS. WarreWijzer destination_id 4. |
| **3.47.0** | **2026-02-27** | **Fase 12**: Verificatie, Consolidatie & Enterprise Hardening. 7 blokken, 34 tests, runtime metrics. MS v7.13. |
| **3.46.0** | **2026-02-27** | **Fase 11B**: Agent Ecosysteem Enterprise Complete (Niveau 7). 10 blokken: individuele logging (B), trending (D), escalatie (C), issues+SLA (F), Admin Issues module (G), trending chips (E), baselines+anomaliedetectie (H), cross-agent correlatie (I). 22 bestanden, 7 nieuw. adminPortal.js v3.11.0 (47 endpoints). |
| **3.45.0** | **2026-02-27** | **Fase 11A**: Agent ecosysteem audit (18 agents, 40 jobs). 3 dev agents geactiveerd: De Bewaker (npm audit), De Corrector (code scan), De Stylist (TTFB+headers). AuditLog status enum fix. |
| **3.44.0** | **2026-02-26** | **Fase 10C**: Apache security headers (5 domeinen), live verificatie 10A, aspirationele agents labeling, Sessions.user_id VARCHAR(36) fix. |
| **3.43.0** | **2026-02-26** | **Fase 10A-R + 10B**: Agent config datacorruptie fix, Threema CONFIGURED, npm audit (17→2 vuln), security headers audit. |
| **3.42.0** | **2026-02-26** | **Fase 10A**: Agent deactivering (3), dashboard eerlijkheid (4 statussen), resultaten tab. adminPortal.js v3.10.0 (42 endpoints). |
| **3.41.0** | **2026-02-26** | **CLAUDE.md herstructurering**: Gesplitst in compact CLAUDE.md (~550 regels) + CLAUDE_HISTORY.md (archief). ~75% minder context. |
| **3.40.0** | **2026-02-25** | **Fase 9I**: 7 items (P1-P7). Dark mode contrast, analytics granulatie, agent profiel sync, scheduledJobs i18n, JOB_ACTOR_MAP +3, pvPeriodDateFilter bug fix. adminPortal.js v3.9.0. 15/15 PASS. |
| **3.39.0** | **2026-02-24** | **Fase 9H**: 4 items. Agent config race condition, De Dokter JOB_ACTOR_MAP, 509 Accommodation POIs inactive, pageviews granulatie. adminPortal.js v3.8.0. 10/10 PASS. |
| **3.38.0** | **2026-02-24** | **Fase 9G**: 6 items. Agent config max 10, De Dokter stale→inactive, errorInstructions, RBAC verified, rate limiter exempt, versie cross-refs. adminPortal.js v3.7.0. |
| **3.37.0** | **2026-02-24** | **Fase 9F**: 4 blokken (A:6 reparaties, B:5 functies, C:2 images, D:2 docs). RBAC, image delete, user deactivate. 3 endpoints. adminPortal.js v3.6.0. |
| **3.36.0** | **2026-02-22** | **Fase 9E**: 6 persistent failures. Unicode, scheduled jobs, agent warnings, config 3-laags, image reorder e2e, MailerSend welcome email. adminPortal.js v3.4.0. |
| **3.35.0** | **2026-02-22** | **Fase 9D**: 8 bugs (38% score). UsersPage crash, category chips, MongoDB conflict, audit trail, display_order. adminPortal.js v3.3.0. 28/28 PASS. |
| **3.34.0** | **2026-02-22** | **Fase 9C**: User creation fix, image reorder, enterprise 4-tab agent popup, subcategory, logo upload. 1 endpoint (38). adminPortal.js v3.2.0. |
| **3.33.0** | **2026-02-22** | **Fase 9B**: 6 P0 bugs, 13 UX fixes, pageview tracking, enterprise password. 2 endpoints (37). adminPortal.js v3.1.0. 28/28 PASS. |
| **3.32.1** | **2026-02-22** | **Fase 9A-FIX**: Rate limiter 5→15, lockout 5→10/5min, Sessions UUID non-blocking. |
| **3.32.0** | **2026-02-21** | **Fase 9A**: RBAC, undo, agent config, chatbot analytics, POI categories, image ranking, branding, dark mode. 16 endpoints (35). 34/34 PASS. |
| **3.31.0** | **2026-02-21** | **Fase 8E**: Agent fixes (4), content audit (3), 11 UX fixes, 5 doc fixes. ~EUR 0.50. |
| **3.30.0** | **2026-02-21** | **Fase 8D-FIX**: 12 bugs. resolveDestinationId, field renames, review flattening. 33/33 PASS. |
| **3.29.0** | **2026-02-20** | **Fase 8D**: POI Management, Reviews Moderatie, Analytics, Settings. 12 endpoints. adminPortal.js v2.0.0. |
| **3.28.0** | **2026-02-20** | **Fase 8C-1**: Agent Dashboard. GET /agents/status. 12/12 PASS. adminPortal.js v1.1.0. |
| **3.27.0** | **2026-02-20** | **Fase 8C-0**: Admin Portal Foundation. 6 endpoints, JWT auth, CI/CD. 15/15 PASS. |
| **3.26.0** | **2026-02-20** | **Fase 8B**: BaseAgent pattern, 18 agents dest-aware, Threema config. 22/22 PASS. |
| **3.25.0** | **2026-02-20** | **Fase 8A+**: 3 monitoring modules, 5 jobs, daily briefing expansion. 16/16 PASS. |
| **3.24.0** | **2026-02-20** | **Fase 8A**: 7 agents gerepareerd. De Koerier column mapping, De Bode stats, legacy deprecated. |
| **3.23.0** | **2026-02-19** | **Fase 7**: 8.964 reviews live. rating_distribution, poiName fix. 7/7 PASS. |
| **3.22.0** | **2026-02-19** | **Fase R6d**: Social media besluit, 119 POIs inventarisatie, 388 markdown fix. |
| **3.21.0** | **2026-02-19** | **Fase R6c Calpe**: 5.932 vectoren re-vectorisatie. €2.37. |
| **3.20.0** | **2026-02-19** | **Fase R6c Texel**: 6.384 vectoren, 2 POI-correcties. €2.55. |
| **3.19.0** | **2026-02-19** | **Fase R6b**: 2.047 claim-stripped, AM/PM sweep, 6.177 hervertalingen. |
| **3.18.0** | **2026-02-18** | **Fase R6**: 3.079 POIs productie-gereed, 9.066 vertalingen. |
| **3.17.0** | **2026-02-16** | **Fase R5**: 1.730 gepromoveerd, safeguards, audit trail. |
| **3.16.0** | **2026-02-13** | **Fase R4**: 3.079 POIs regeneratie, 19.5% hallucinatie. 449 min. |
| **3.15.0** | **2026-02-13** | **Fase R3**: Prompt redesign, 61%→14% test. |
| **3.14.0** | **2026-02-13** | **Fase R2**: 1.923 websites, 3.079 fact sheets. |
| **3.13.0** | **2026-02-12** | **Fase R1**: 61% hallucinatie, NO-GO. |
| **3.12.0** | **2026-02-11** | **Fase 6e R3**: Texla→Tessa, ChromaDB warnings, itinerary images. |
| **3.11.0** | **2026-02-11** | **Fase 6e R2**: Opening hours, Dutch icons, streaming fix. |
| **3.10.0** | **2026-02-11** | **Fase 6e R1**: X-Destination-ID, daily tip overhaul. |
| **3.9.0** | **2026-02-10** | **Fase 6d**: Destination routing, CORS, categories, fuzzy match. |
| **3.8.0** | **2026-02-10** | **Fase 6c**: SSL cert, Sentry DSN, suggestion content. |
| **3.7.0** | **2026-02-09** | **Fase 6b**: Quick actions destination fix. |
| **3.6.0** | **2026-02-08** | **Fase 6**: Tessa chatbot, 94.980 vectoren. |
| **3.5.0** | **2026-02-08** | **Fase 5b-5c**: Frontend verificatie, image fix. |
| **3.4.0** | **2026-02-07** | **Fase 5**: Content apply + translation. |
| **3.3.0** | **2026-02-06** | **Fase 4b**: Content vergelijking. |
| **3.2.0** | **2026-02-05** | **Fase 4**: Full LLM run 2.515 POIs. |
| **3.1.0** | **2026-02-05** | **Fase 3b**: LLM pilot 100 POIs. |
| **3.0.0** | **2026-02-02** | **Fase 3**: Texel data quality. |

### Hetzner Fase Output Bestanden
```
/root/
├── fase3_pilot_output.json, fase3_quality_analysis.md, fase3_replacement_advice.md
├── fase4_full_output.json, fase4_generation_report.md, fase4_quality_*.json/md, fase4_checkpoint.json
├── fase4b_comparison_summary.md, fase4b_review_required.json, fase4b_category_analysis.md, fase4b_*.py/json
├── fase_r1_damage_assessment.md/py, fase_r1_factcheck_*.json, fase_r1_website_data_*.json
├── fase_r2_scraped_data.json, fase_r2_fact_sheets.json, fase_r2_coverage_report.md
├── fase_r3_prompt_templates.py, fase_r3_test_*.py/json/md
├── fase_r5_monitoring.py, fase_r5_promotion_report.md
├── texel_old_nl_archive.json, texel_image_linker*.py/json/log
├── texel_vectorize_qna.py, texel_vectorize_output.log
├── markdown_fix_post_r6b.py, markdown_fix_backup_20260219.json, markdown_fix_log_20260219.json
└── inventarisatie_119_pois.py, inventarisatie_pois_zonder_content.json
```

---

## Fase 10A: Agent Ecosysteem Optimalisatie (26-02-2026)

### Context
Gebaseerd op `Strategische_Agent_Ecosysteem_Analyse_v2_DEFINITIEF.md` — 5 items, waarvan items 1-2 al eerder geverifieerd:
- Item 1 (Apify sync): Scenario A bevestigd — De Koerier ★★★★☆
- Item 2 (Threema): CONFIGURED, alle 3 env vars aanwezig

### Item 3: Agent Deactivering
| Agent | ID | Reden | active |
|-------|-----|-------|--------|
| De Architect | architect | Onvoldoende waarde (★★☆☆☆). Reactiveren bij 3+ destinations. | `false` |
| De Leermeester | leermeester | Onvoldoende waarde (★★☆☆☆). Reactiveren bij voldoende gebruikersdata. | `false` |
| De Thermostaat | thermostaat | Onvoldoende waarde (★★☆☆☆). Reactiveren bij complexere configuratie-eisen. | `false` |

- `AGENT_METADATA` entries: `active: false`, `deactivatedReason`, `deactivatedDate: '2026-02-26'`
- `calculateAgentStatus()`: nieuwe `meta` parameter, returns `'deactivated'` voor inactive agents
- Alle 4 call sites bijgewerkt (agent loop, smokeTest, contentQuality, thermostaat)

### Item 4: Dashboard Eerlijkheid
- Summary cards: Gezond / Waarschuwing / Fout / Gedeactiveerd (was: ...unknown)
- `STATUS_COLORS.deactivated: '#bdbdbd'` in `utils/agents.js`
- Sort order: `{ error: 0, warning: 1, unknown: 2, healthy: 3, deactivated: 4 }`
- Deactivated rows: `opacity: 0.6`, lichte achtergrond
- Agent profiel dialog: Alert banner met deactivatedSince + deactivatedReason
- i18n: NL/EN/DE/ES — 'deactivated' + results tab keys

### Item 5: Resultaten Tab
- **Backend**: `GET /agents/:key/results` endpoint in adminPortal.js
  - MongoDB audit_logs: last 5 runs per agent (30d window)
  - Monitoring collection supplement: smoke_test_results, content_quality_audits, backup_health_checks
  - Response: `{ agent: { id, name, active }, results: [{ timestamp, action, status, duration, destination, details, result }] }`
- **Frontend**: Results tab in AgentDetailDialog (tab 3, between Status and Config)
  - `useAgentResults(agentKey)` hook + `fetchAgentResults()` API call
  - Table: Datum, Actie, Status (met kleur dot), Bestemming (chip), Duur, Details
  - Skeleton loading, empty state alert

### Bestanden Gewijzigd (9 bestanden, +309/-23 regels)
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/routes/adminPortal.js` | v3.10.0: 3 agents deactivated, calculateAgentStatus meta param, summary.deactivated, GET /agents/:key/results |
| `admin-module/src/pages/AgentsPage.jsx` | Summary cards deactivated, sort order, row opacity, deactivated banner, Results tab |
| `admin-module/src/utils/agents.js` | STATUS_COLORS.deactivated |
| `admin-module/src/hooks/useAgentStatus.js` | useAgentResults hook |
| `admin-module/src/api/agentService.js` | fetchAgentResults |
| `admin-module/src/i18n/nl.json` | deactivated, results tab, detail keys |
| `admin-module/src/i18n/en.json` | deactivated, results tab, detail keys |
| `admin-module/src/i18n/de.json` | deactivated, results tab, detail keys |
| `admin-module/src/i18n/es.json` | deactivated, results tab, detail keys |

### Deploy
- Commit: bfef3a5, pushed dev→test→main
- Hetzner: adminPortal.js via SCP, pm2 restart, admin frontend build+deploy
- CLAUDE.md v3.42.0

---

## Fase 10A-Restant + 10B: Datacorruptie Fix + Security Hardening (26-02-2026)

### Overzicht
- **10A-Restant**: Agent config datacorruptie fix + Threema verificatie + CLAUDE.md versie-fix
- **10B**: Security Hardening (npm audit, secrets scan, security headers, De Bewaker audit)
- **Kosten**: EUR 0
- **adminPortal.js**: v3.10.0 (placeholder validatie toegevoegd)

### 10A-Restant Items

**A. Agent Config Tasks Datacorruptie Fix (P0)**
- **A1 Diagnose**: MongoDB `agent_configurations` collectie — 2 entries. `contentQuality` had gecorrumpeerde tasks: `["Grammatica...", "Task 2", "Task 3", "Task 4", "Task 5", "Task 6"]`. Overige 16 agents: geen MongoDB config (OK, static fallback).
- **A2 Backend Fix**: Placeholder validatie op PUT `/agents/config/:key` — rejects `Task N` patterns, empty strings, non-string items. Console warning bij reject.
- **A3 Frontend Fix**: Initialisatie filter (`/^Task \d+$/` + empty string removal) bij laden van MongoDB tasks + save handler bescherming.
- **A4 Restore**: contentQuality tasks hersteld naar 4 correcte taken uit AGENT_TASKS static data. `updated_by: 'claude-restore-10a'`.

**B. Live Verificatie 10A Items 3-5**
- B1 Dashboard: API verificatie PASS — summary: 15 healthy, 0 warning, 0 error, 3 deactivated
- B2 Resultaten Tab: maestro (5), dokter (5), contentQuality (5), architect (5, active=false) — alle PASS
- B3 calculateAgentStatus(): 4 call sites, alle 3-parameter (met meta) — PASS

**C. Threema Status Definitief**
- Env vars ZIJN gezet op Hetzner: `THREEMA_GATEWAY_ID=*HOL1791`, `THREEMA_SECRET`, `OWNER_THREEMA_ID=V9VUJ8K6`
- Smoke test confirmeert: `all_configured: true, status: CONFIGURED`
- Risico Register geüpdatet: "Open" → "Gemitigeerd"

**D. CLAUDE.md versie-fix**: adminPortal.js v3.9.0 → v3.10.0 in Admin Portal architectuur sectie

### 10B Security Hardening Items

**D1 npm audit (voor fix)**:
| Project | Critical | High | Moderate | Totaal |
|---------|----------|------|----------|--------|
| platform-core | 1 | 4 | 2 | 7 |
| admin-module | 0 | 2 | 2 | 4 |
| customer-portal | 0 | 4 | 2 | 6 |

**D2 npm audit fix (na fix)**:
| Project | Vulnerabilities | Status |
|---------|----------------|--------|
| platform-core | **0** | Volledig opgelost |
| admin-module | **2 moderate** (esbuild/vite dev-only) | Laag risico |
| customer-portal | **0** | Volledig opgelost |

**D3 Hardcoded Secrets**: `auth.js:29` DEV_FALLBACK_USER password (LAAG risico, dev-only). Geen productie-credentials in broncode.

**D4 Security Headers**:
- API (Express/Helmet): ALLE headers aanwezig (HSTS, CSP, X-Frame, X-Content-Type, Referrer-Policy)
- Frontend vhosts (Apache): ALLE headers ONTBREKEN — aanbeveling P1
- Server header exposed op alle domeinen

**D5 De Bewaker**: 0 security scan audit_log entries. Aspirationele agent (★☆).

**D6 Rapport**: `/root/fase_10b_security_rapport.md` op Hetzner

### Bestanden Gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/routes/adminPortal.js` | Placeholder validatie PUT /agents/config |
| `admin-module/src/pages/AgentsPage.jsx` | Tasks init filter + save handler filter |
| `docs/strategy/HolidaiButler_Master_Strategie.md` | v7.8→v7.9 (10A-R + 10B) |
| `CLAUDE.md` | v3.42.0→v3.43.0 |
| `CLAUDE_HISTORY.md` | 10A-R + 10B secties |
| `platform-core/package-lock.json` | npm audit fix |
| `customer-portal/frontend/package-lock.json` | npm audit fix |

### Deploy
- Backend: SCP adminPortal.js + PM2 restart
- Frontend: admin-module build + tar deploy naar prod
- npm audit fix: platform-core op Hetzner, customer-portal lokaal
- MongoDB: contentQuality tasks restored
- Security rapport: `/root/fase_10b_security_rapport.md`
- CLAUDE.md v3.43.0, MS v7.9

---

## Fase 10C: Apache Hardening + Agent Eerlijkheid + Live Verificatie (26-02-2026)

### Blok A: Apache Security Headers (P1)
- **Inventarisatie**: 5 frontend/admin domeinen hadden 0 security headers, API had 6 (Helmet)
- **ServerTokens**: `OS` → `Prod`, `ServerSignature Off` in `/etc/apache2/conf-enabled/security.conf`
- **Headers toegevoegd** aan 5 VHost SSL configs: X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), Permissions-Policy (camera/mic/geo denied)
- **Bonus fix**: texelmaps.nl `sites-enabled` was regulier bestand (niet symlink) — gefixed
- **Verificatie**: 5/5 domeinen tonen 4 headers + `Server: Apache` (geen versienummer), HTTP 200, API health OK
- Backup: `/root/backups/apache_sites_20260226_204046`
- CSP bewust NIET toegevoegd (complex, kan frontend breken — apart item)

### Blok B: Live Verificatie 10A Dashboard (P1)
- **B1 Summary cards**: 4 categorieën (healthy=14/15, warning=0/1, error=0, deactivated=3), 18 agents totaal, 0 "unknown"
- **B2 Deactivated agents**: Architect/Leermeester/Thermostaat — status=deactivated, active=false, reason+date correct
- **B3 Results tab**: 4 agents getest (maestro/dokter/architect/contentQuality), alle tonen 5 results met correcte kolommen (timestamp, action, status, destination, duration, details), data van vandaag, architect (deactivated) toont historische data zonder crash
- **B4 calculateAgentStatus()**: 4 call sites (lijnen 1305, 1470, 1534, 1562, 1605), alle met 3 parameters (lastRun, schedule, meta)
- **10/10 PASS**

### Blok C: Aspirationele Agents Eerlijk Labelen (P2)
- **Diagnose**: De Stylist 0 entries, De Corrector 0 entries, De Bewaker 0 entries (actor.name), 4 dev-layer scheduled jobs actief
- **Frank's keuze**: Alleen labelen, NIET deactiveren
- **Implementatie**: 3 agents in AGENT_METADATA bijgewerkt:
  - Description: "Minimaal: [wat agent NIET doet]"
  - Tasks: gereduceerd tot wat agent DAADWERKELIJK doet
  - output_description: eerlijk over output (geen rapporten / via dev-layer wrapper)
  - `functionalityLevel: 'minimal'` toegevoegd
- Scheduled jobs behouden (4 dev-layer jobs)

### Blok D: Sessions UUID Fix (P2)
- **Backup**: `/root/backups/Sessions_backup_20260226_205851.sql`
- **Schema**: user_id was INT(11), 55 rows
- **FK constraint**: `fk_session_user` (Sessions.user_id → Users.id) moest eerst gedropped worden
- **ALTER**: `Sessions MODIFY user_id VARCHAR(36) NOT NULL`
- **Verificatie**: user_id = VARCHAR(36), 55 rows preserved, login OK, 0 "Data truncated" errors
- **Risico Register**: "Workaround" → "Gemitigeerd"

### Bestanden Gewijzigd
| Bestand | Wijziging |
|---------|-----------|
| `/etc/apache2/conf-enabled/security.conf` | ServerTokens Prod, ServerSignature Off |
| `/etc/apache2/sites-available/*-le-ssl.conf` (5x) | Security headers blok |
| `platform-core/src/routes/adminPortal.js` | Honest labeling 3 agents |
| `CLAUDE.md` | v3.44.0 |
| `CLAUDE_HISTORY.md` | 10C sectie |
| `docs/strategy/HolidaiButler_Master_Strategie.md` | v7.10 |
| MySQL: `Sessions.user_id` | INT(11) → VARCHAR(36) |

### Deploy
- Apache: configtest + graceful reload (5 VHosts + security.conf)
- Backend: SCP adminPortal.js + PM2 restart
- MySQL: ALTER TABLE Sessions (met backup + FK drop)
- CLAUDE.md v3.44.0, MS v7.10

---

## Fase 11A — Agent Ecosysteem Audit + Activering (27-02-2026)

**Doel**: Complete ecosysteem röntgenfoto + 3 aspirationele agents daadwerkelijk activeren

### Blok A: Ecosysteem Audit (BASELINE)
- 18.320 audit_log entries (30d), 22.380 all-time
- Actor mapping: `actor.name` field (object), NOT `actorName` (flat string)
- 7 PRODUCTIEF agents, 2 OPERATIONEEL, 4 MINIMAAL, 3 GEDEACTIVEERD
- 40 BullMQ jobs confirmed (teller was correct)
- Strategy-layer jobs (Leermeester/Thermostaat) still run despite deactivation
- Dev-layer: 277 entries maar alleen `agent_initialized` (239) + `project_quality_check_completed` (38)

### Blok B: De Bewaker — npm audit (GEACTIVEERD)
- `securityReviewer.js`: execute() met `npm audit --json`, 60s timeout
- Workers.js: `dev-security-scan` → securityReviewer.execute() (was: full checkProject)
- Resultaat: 1C/4H/3M/0L (16 total), alert fired for critical
- Schedule: dagelijks 02:00

### Blok C: De Corrector — Code Scan (GEACTIVEERD)
- `codeReviewer.js`: execute() met grep-based scan (console.log, secrets, TODO/FIXME)
- Workers.js: `dev-quality-report` → codeReviewer.execute() (was: full checkProject)
- Resultaat: 182 files, 61.622 lines, 372 console.logs, 10 TODOs
- Schedule: wekelijks maandag 06:00

### Blok D: De Stylist — Performance Check (GEACTIVEERD)
- `uxReviewer.js`: execute() met HTTP TTFB + status + headers check op 4 domeinen
- Workers.js: `dev-dependency-audit` → uxReviewer.execute() (was: full checkProject)
- Resultaat: 4 domeinen, avg TTFB 42ms, all OK: true
- Schedule: wekelijks zondag 03:00

### Bug Fix: AuditLog Status Enum
- Mongoose enum: `initiated`, `completed`, `failed`, `pending_approval`
- Alle 3 agents gebruikten `status: 'success'` → gefixed naar `status: 'completed'`

### Bestanden gewijzigd
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/services/agents/devLayer/reviewers/securityReviewer.js` | execute() + execSync import |
| `platform-core/src/services/agents/devLayer/reviewers/codeReviewer.js` | execute() + execSync import |
| `platform-core/src/services/agents/devLayer/reviewers/uxReviewer.js` | execute() + https import |
| `platform-core/src/services/orchestrator/workers.js` | 3 job handlers → direct reviewer calls |
| `platform-core/src/routes/adminPortal.js` | AGENT_METADATA: 3 agents functionalityLevel minimal→active |
| `CLAUDE.md` | v3.45.0 |
| `CLAUDE_HISTORY.md` | Fase 11A section |
| `docs/strategy/HolidaiButler_Master_Strategie.md` | v7.11 |

### Deploy
- SCP: 5 bestanden naar Hetzner
- PM2 restart: 3× (na elk blok B/C/D)
- CLAUDE.md v3.45.0, MS v7.11
- Git: commit + push dev→test→main

---

## Fase 11B — Agent Ecosysteem Enterprise Complete (27-02-2026)

**Doel**: Agent ecosysteem van Niveau 2-3 naar Niveau 7 (Zelflerend). 10 blokken (A→J), 22 bestanden, 1.944 insertions, EUR 0.

### Blok A: Documentatie schuld 11A inlossen
- CLAUDE_HISTORY.md bijgewerkt met 11A resultaten (was vergeten in vorige sessie)

### Blok B: Individuele agent logging (FUNDAMENT)
- 3 dev agents loggen nu individueel als `security-reviewer`, `code-reviewer`, `ux-ui-reviewer`
- Voorheen alleen als `dev-layer` — nu traceerbaar per agent
- `logAgent()` calls toegevoegd aan alle 3 reviewers na succesvolle execute()

### Blok D: Trending week-over-week + trendHelper.js
- `trendHelper.js`: `calculateTrend(agentName, action, metricPath)` — vergelijkt laatste 2 scans
- Richting: BETTER/WORSE/FASTER/SLOWER/STABLE/FIRST_SCAN
- Geïntegreerd in alle 3 dev agents (security vulns, code consoleLogs, perf avgTtfb)
- Trend opgeslagen in audit_log metadata

### Blok C: Escalatie via De Bode briefing
- `dailyBriefing.js`: Nieuwe sectie "Agent Issues & Bevindingen"
- Security: critical/high vulns → URGENT briefing
- Code: >400 console.logs → waarschuwing
- Performance: avg TTFB >500ms → waarschuwing
- Alle trends getoond in briefing

### Blok F: Agent Issues collectie (MongoDB + raiseIssue)
- `agentIssues.js`: MongoDB `agent_issues` collectie
- `raiseIssue()`: deduplicatie op issueKey, auto-increment occurrences
- `resolveIssue()`, `getOpenIssues()`, `getIssueStats()`
- SLA tracking: P1=24h, P2=72h, P3=168h, P4=336h
- Status lifecycle: open → acknowledged → in_progress → resolved / wont_fix / auto_closed

### Blok G: Admin Portal Issues module (backend + frontend)
- 5 endpoints: GET /issues, GET /issues/stats, PUT /issues/:id/status, GET /issues/:id, GET /issues/:id/timeline
- `IssuesPage.jsx`: Stats cards, filter bar (status/severity/agent), sortable tabel, detail drawer met timeline
- `issueService.js` + `useIssues.js` hook
- Sidebar nav + App.jsx route
- i18n: NL/EN/DE/ES compleet (issues sectie + common keys)

### Blok E: Dashboard trending chips + actorNames fix
- AGENT_METADATA actorNames fix: dev agents nu `['security-reviewer', 'dev-layer']` etc.
- Results endpoint: merge `metadata.trend` into result object (trend was in metadata, niet result)
- Trend kolom in results tab: Chip met kleur (error=WORSE/SLOWER, success=BETTER/FASTER)
- i18n: `agents.detail.resultTrend` + 6 trend richtingen in 4 talen

### Blok H: Baselines & anomaliedetectie (Niveau 7A)
- `baselineService.js`: Rolling average over 14 scans, 2σ threshold
- `calculateBaseline()`: mean + stdDev + count
- `detectAnomaly()`: returns isAnomaly + deviation + direction
- `runAnomalyDetection()`: 4 metrics (total vulns, critical vulns, consoleLogs, avgTtfb)
- Auto-creates issues via `raiseIssue()` bij detectie
- Geïntegreerd in dailyBriefing.js (dagelijks)

### Blok I: Cross-agent intelligence (Niveau 7B)
- `correlationService.js`: 4 correlaties:
  1. Security + Performance concurrent decline
  2. Console.log growth >10% en >300
  3. Persistent health issues (>3/7 dagen)
  4. Issue backlog (>3 issues ouder dan 7 dagen)
- Draait wekelijks (maandag) als onderdeel van De Bode briefing
- Admin endpoint: GET /intelligence/report
- Logged als `correlation-engine` in audit_logs

### Blok J: Documentatie + Deploy
- CLAUDE.md v3.46.0, MS v7.12, adminPortal.js v3.11.0
- Deployed naar Hetzner + PM2 restart
- Git commit 74adf6b, pushed dev→test→main

### Bestanden gewijzigd (22 bestanden)

**Nieuw (7)**:
| Bestand | Beschrijving |
|---------|-----------|
| `platform-core/src/services/agents/devLayer/reviewers/trendHelper.js` | Week-over-week trending |
| `platform-core/src/services/agents/base/agentIssues.js` | Agent issues MongoDB + SLA |
| `platform-core/src/services/agents/base/baselineService.js` | Baselines + anomaliedetectie |
| `platform-core/src/services/agents/base/correlationService.js` | Cross-agent correlatie |
| `admin-module/src/pages/IssuesPage.jsx` | Issues admin pagina |
| `admin-module/src/api/issueService.js` | Issues API service |
| `admin-module/src/hooks/useIssues.js` | Issues React hook |

**Gewijzigd (15)**:
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/routes/adminPortal.js` | v3.11.0: 6 endpoints, actorNames fix, trend merge, intelligence |
| `platform-core/src/services/agents/devLayer/reviewers/securityReviewer.js` | Individuele logging + trending |
| `platform-core/src/services/agents/devLayer/reviewers/codeReviewer.js` | Individuele logging + trending |
| `platform-core/src/services/agents/devLayer/reviewers/uxReviewer.js` | Individuele logging + trending |
| `platform-core/src/services/orchestrator/ownerInterface/dailyBriefing.js` | Escalatie + anomalie + correlatie |
| `platform-core/src/services/orchestrator/workers.js` | npm audit fix import |
| `admin-module/src/App.jsx` | Issues route |
| `admin-module/src/components/layout/Sidebar.jsx` | Issues nav item |
| `admin-module/src/pages/AgentsPage.jsx` | Trend column in results tab |
| `admin-module/src/i18n/nl.json` | Issues + trend keys |
| `admin-module/src/i18n/en.json` | Issues + trend keys |
| `admin-module/src/i18n/de.json` | Issues + trend keys + common keys |
| `admin-module/src/i18n/es.json` | Issues + trend keys + common keys |
| `CLAUDE.md` | v3.46.0 |
| `docs/strategy/HolidaiButler_Master_Strategie.md` | v7.12 |

## Fase II Blok A — Chatbot Upgrade (28-02-2026)

**Doel**: Chatbot upgraden naar enterprise-level met contextueel bewustzijn, multi-turn geheugen, booking intent detectie, en menselijke fallback. Eerste blok van Fase II (Active Module Upgrade).

**Stap 0**: Codebase verificatie op Hetzner. Bevinding: 9 npm vulnerabilities (was 0 na Fase 12). Opgelost met `npm audit fix` → 0 vulnerabilities. POI counts lager dan verwacht (1439 Calpe, 1257 Texel actief vs 1538/1660 in docs). 0 Texel agenda events (gap voor Blok C).

### A.1: Architectuur Analyse
- **RAG pipeline**: Zero temporal awareness, geen seizoen/weer/tijd context
- **Conversation memory**: Frontend-only, 6 berichten max (history.slice(-6))
- **Intent classificatie**: 10 intents, keyword-based, geen booking/escalation
- **Suggesties**: suggestionService al goed, maar geen context-integratie
- **preferenceService.rerankPois**: Gedefinieerd maar nooit aangeroepen

### A.2: Context Awareness (contextService.js — NIEUW)
- **Nieuw bestand**: `platform-core/src/services/holibot/contextService.js` (~310 regels)
- **Temporeel bewustzijn**: Dag, datum, tijdstip (ochtend/middag/avond/nacht), seizoen, weekend detectie
- **Locatiebewustzijn**: Per-destination context (eiland vs kuststad), timezone-aware
- **Sessie-context**: In-memory Map met 24h TTL, trackt besproken POIs/categorieën
- **Prompt-injectie**: `buildPromptContext()` genereert meertalig contextblok (NL/EN/DE/ES)
- **Aanbevelingshinten**: Per tijdstip × seizoen combinatie (strand, terras, musea, etc.)
- **GDPR-compliant**: Geen persoonlijke data, alleen sessie-gebaseerd, in-memory met auto-cleanup
- **Integratie**: ragService importeert contextService, injecteert context tussen system prompt en RAG instructies

### A.3: Multi-turn Memory Verbetering
- **History window**: `slice(-6)` → `slice(-10)` (3 occurrences in ragService.js)
- **Follow-up detectie**: `hasPronounReference()` uitgebreid met 17+ patronen:
  - NL: "die eerste", "de tweede", "iets anders", "meer opties", "en die andere"
  - EN: "the first one", "something else", "more options", "what about"
  - DE: "der erste", "etwas anderes", "mehr optionen"
  - ES: "el primero", "algo diferente", "más opciones"
- **Ordinal reference resolution**: "de eerste" → matcht tegen eerste POI uit sessie-context
- **lastPois tracking**: contextService session data meegegeven aan `buildEnhancedSearchQuery()`
- **POI tracking in streaming**: Na chatbot response worden genoemde POIs/categorieën getrackt

### A.4: Proactieve Suggesties
- Bestaande suggestionService was al goed geïmplementeerd
- Context-integratie gerealiseerd via contextService prompt-injectie (tijdstip/seizoen hints)
- Geen additionele code nodig — bestaande logica voldoet

### A.5: Chat-to-Book Voorbereiding
- **Booking intent** toegevoegd aan intentService.js (priority 2)
- Keywords in 6 talen: 'boeken', 'reserveren', 'book', 'reserve', 'tickets', 'buchen', 'reservieren', 'reservar', 'boka', 'zarezerwować'
- **Interceptie in holibot.js**: Vóór RAG-call, friendly fallback in 4 talen
- **Logging**: Gelogd als `booking-intent` source in holibot_sessions

### A.6: Menselijke Fallback
- **Human escalation intent** toegevoegd aan intentService.js (priority 1)
- Keywords: 'kan ik iemand spreken', 'complaint', 'medewerker', 'customer service', 'klacht', 'Beschwerde', 'queja'
- **Destination-specifiek contact**: Texel → info@texelmaps.nl, Calpe → info@holidaibutler.com
- **Interceptie in holibot.js**: Vóór RAG-call, vriendelijke doorverwijzing

### A.7: Testing & Deployment
4 test scenarios uitgevoerd:
1. **Texel NL**: "Wat kan ik vandaag doen op Texel?" → Context-aware antwoord ✅
2. **Calpe EN**: "What are good restaurants in Calpe?" → POI-based antwoord ✅
3. **Booking DE**: "Kann ich einen Tisch reservieren?" → Booking intent fallback ✅
4. **Escalation EN**: "I need to speak to someone" → Contact info getoond ✅

Alle 3 sites bereikbaar (200 OK). PM2 restart succesvol.

### Bestanden gewijzigd (5 bestanden)

**Nieuw (1)**:
| Bestand | Beschrijving |
|---------|-----------|
| `platform-core/src/services/holibot/contextService.js` | Temporeel/locatie/sessie context service |

**Gewijzigd (4)**:
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/services/holibot/ragService.js` | v2.5: context-injectie, 10-bericht window, follow-up detectie, ordinal refs |
| `platform-core/src/routes/holibot.js` | v2.9: booking/escalation interceptie, POI tracking, sessionId passing |
| `platform-core/src/services/holibot/intentService.js` | +2 intents (booking, human_escalation) in 6 talen |
| `platform-core/src/services/holibot/index.js` | contextService export |

**Commit**: `09a373b`, pushed dev → test → main
**Kosten**: EUR 0

---

## Fase II Blok B — POI Module Verbetering (28-02 / 01-03-2026)

### B.1: Analyse huidige POI module
Analyse van POI module architectuur, filtering, images, admin tools. Identified 5 verbeterpunten.

### B.2: Content Freshness Score
- `freshnessService.js`: Berekent freshness score 0-100 op basis van data-leeftijd, reviews, images, contact info completeness
- BullMQ job #41: `freshness-weekly-check` (wekelijks zondag 05:00)
- Freshness data beschikbaar in admin CSV export

### B.3: POI Browse UX verbetering

**3 sub-features**:

1. **Kaart-clustering**: `MarkerClusterGroup.tsx` wrapper voor leaflet.markercluster (react-leaflet v5 compatible via `createPathComponent`). Custom colored clusters (groen/oranje/rood per grootte). 200 POIs, `disableClusteringAtZoom={17}`.

2. **Smart Filters (Multi-select categorieën)**: `selectedCategory: string` → `selectedCategories: string[]`. URL parameter persistence via `useSearchParams` (categories, q, view, openNow, rating, minReviews, price, distance, access).

3. **Sticky CTAs**: POIDetailModal krijgt sticky bottom bar met Directions/Website/Call knoppen. Responsive (icon-only op <380px).

**Bestanden (7)**:
| Bestand | Type | Wijziging |
|---------|------|-----------|
| `customer-portal/frontend/src/features/poi/components/MarkerClusterGroup.tsx` | NEW | Leaflet cluster wrapper |
| `customer-portal/frontend/src/features/poi/components/MapView.tsx` | MOD | Clustering support, 200 POIs |
| `customer-portal/frontend/src/features/poi/components/MapView.css` | MOD | Cluster icon styling |
| `customer-portal/frontend/src/pages/POILandingPage.tsx` | MOD | Multi-select categories, URL params |
| `customer-portal/frontend/src/features/poi/components/POIDetailModal.tsx` | MOD | Sticky CTA bar |
| `customer-portal/frontend/src/features/poi/components/POIDetailModal.css` | MOD | Sticky CTA styling |
| `customer-portal/frontend/package.json` | MOD | +leaflet.markercluster |

**Commit**: `f69f589`, pushed dev → test → main

### B.4: POI Image Optimalisatie

**Backend**: Image resize proxy met Sharp (`imageResize.js`)
- Endpoint: `/api/v1/img/<path>?w=<width>&q=<quality>&f=<format>`
- Allowed widths: [200, 400, 600, 800, 1200] (snapped to nearest)
- Formats: jpg (mozjpeg), webp, avif
- Disk cache: `/storage/poi-images-cache/` met 30-dag browser cache headers
- Security: path traversal preventie, extension validation

**Frontend**: `imageUrl.ts` utility + 4 componenten updated
- `getResizedImageUrl()`, `getImageSrcSet()`, `IMAGE_SIZES_ATTR`
- srcSet, sizes, loading="lazy", decoding="async" op alle POI images
- Performance: 200px thumbnail = 7KB (98.6% reductie van 497KB origineel)

**Bestanden (7)**:
| Bestand | Type | Wijziging |
|---------|------|-----------|
| `platform-core/src/routes/imageResize.js` | NEW | Sharp image resize proxy |
| `platform-core/src/index.js` | MOD | Mount /api/v1/img route |
| `customer-portal/frontend/src/shared/utils/imageUrl.ts` | NEW | srcSet utility |
| `customer-portal/frontend/src/features/poi/components/POITileCarousel.tsx` | MOD | srcSet, sizes, lazy |
| `customer-portal/frontend/src/features/poi/components/POIAirbnbGallery.tsx` | MOD | srcSet, sizes, lazy |
| `customer-portal/frontend/src/features/poi/components/POIImage.tsx` | MOD | srcSet, sizes |
| `customer-portal/frontend/src/features/poi/components/POIThumbnail.tsx` | MOD | lazy loading, resize |

**Commit**: `822bb11`, pushed dev → test → main

### B.5: Admin POI Tools Uitbreiding

4 nieuwe endpoints in `adminPortal.js` v3.12.0 (51 endpoints totaal):

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/pois/bulk-status` | POST | Bulk activate/deactivate (max 500, RBAC) |
| `/pois/bulk-category` | POST | Bulk category change (max 500, RBAC) |
| `/pois/:id/tile-description` | PATCH | Quick inline edit (max 500 chars) |
| `/pois/export` | GET | CSV export met filters (destination, category, freshness, active, search) |

Bug fix: bulk endpoints rapporteren nu `affectedRows` i.p.v. input count.

**Bestanden (1)**:
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/routes/adminPortal.js` | v3.11.0 → v3.12.0, +4 endpoints, affectedRows fix |

**Commit**: `7466eba`, pushed dev → test → main

### Blok B Samenvatting
- **5 sub-blokken**: B.1 Analyse, B.2 Freshness, B.3 Browse UX, B.4 Images, B.5 Admin Tools
- **15 bestanden gewijzigd/nieuw**, 3 commits
- **Key metrics**: 98.6% image size reductie, 200 POI clustering, multi-select filters met URL persistence, 51 admin endpoints
- **Kosten**: EUR 0 (geen externe API calls)

---

## Fase II Blok C — Agenda Module Upgrade (01-03-2026)

### C.1: Analyse
Agenda module audit: 314 events (all Calpe), 4 read-only endpoints, hardcoded Calpe distance filter, no category support in backend, no admin CRUD, no iCal support.

### C.2: Multi-Destination + Category Backend
- `getDestinationId()`: X-Destination-ID header support (string + numeric)
- `buildDestinationFilter()`: Replaces hardcoded `calpe_distance <= 25` with `destination_id = ?`
- `detectCategory()`: 8 categories from keyword analysis (music, festivals, markets, active, nature, food, culture, creative)
- `?category=music,festivals` filter now functional
- Search expanded to include `title_en`

### C.4: iCal Calendar Integration
- `GET /agenda/events/:id/ical` - Download single event iCal (all upcoming dates)
- `GET /agenda/feed.ics` - Subscription feed (Google/Apple Calendar compatible)
- RFC 5545 compliant: VEVENT, UID, GEO, proper DTSTART/DTEND handling
- 1h cache for subscription feeds, configurable `?weeks=` (default 8, max 26)

### C.5: Admin Agenda Tools
5 new endpoints in adminPortal.js v3.13.0 (56 endpoints total):

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/agenda/events` | GET | List events with filters (dateRange, search, destination) |
| `/agenda/events/:id` | GET | Event detail with all dates |
| `/agenda/events/:id` | PUT | Update event fields (14 allowed fields) |
| `/agenda/events/:id` | DELETE | Delete event + dates (admin only) |
| `/agenda/stats` | GET | Statistics per destination |

### Blok C Bestanden (2)
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/routes/agenda.js` | Complete rewrite: multi-destination, categories, iCal, 6 endpoints |
| `platform-core/src/routes/adminPortal.js` | v3.12.0 → v3.13.0, +5 agenda admin endpoints |

**Commit**: `ab2ab26`, pushed dev → test → main

---

## Fase II Blok D — Customer Portal UX Upgrade (01-03-2026)

### D.1: Analyse
Comprehensive UX audit van customer-portal: 21 routes, good code splitting, React 19 + React Router 7. Gevonden gaps: geen SEO meta tags (document.title altijd default), geen breadcrumbs, geen skip-to-content (WCAG), geen service worker (PWA), WCAG modal reeds aanwezig.

### D.2: usePageMeta Hook (SEO)
Nieuwe shared hook `usePageMeta.ts` voor dynamische SEO meta tags:
- Sets `document.title` als `{title} | {siteName}`
- Creates/updates OG meta tags: og:title, og:site_name, og:type, og:description, og:url, og:image
- Separate `setMeta()` (property-based) en `setNameMeta()` (name-based) helpers
- Cleanup: restores default title on unmount
- Multi-destination aware via `useDestination()` (domain, name)
- Applied to Homepage, POILandingPage, AgendaPage

### D.3: Breadcrumbs Component
Nieuwe shared component `Breadcrumbs.tsx` + `Breadcrumbs.css`:
- Multi-language route labels (EN, NL, DE, ES) voor 13 routes
- `ChevronRight` separators + `Home` icon (lucide-react)
- `currentLabel` prop override voor dynamische pagina's (bijv. POI naam)
- Hidden on homepage, skip numeric ID segments tenzij currentLabel
- Responsive: kleinere font + max-width op mobile (<640px)

### D.4: Accessibility (WCAG)
- Skip-to-content link in `RootLayout.tsx` (`<a href="#main-content">`)
- `id="main-content"` op `<main>` element
- `role="main"` attribuut
- CSS: `.skip-to-content` hidden until keyboard focus (position absolute, top -40px → top 0 on :focus)

### D.5: PWA Service Worker
- `public/sw.js`: 3 cache strategieën
  - **Cache-first**: Static assets (CSS, JS, images, fonts)
  - **Network-first**: API calls (`/api/`)
  - **Network-first + offline fallback**: Navigation requests
- Cache versioning (`v1`), cleanup oude caches
- Registration in `main.tsx` (production-only):
  ```typescript
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  ```

### Blok D Bestanden (8)
| Bestand | Type | Wijziging |
|---------|------|-----------|
| `customer-portal/frontend/src/shared/hooks/usePageMeta.ts` | NEW | Dynamic SEO meta hook |
| `customer-portal/frontend/src/shared/components/Breadcrumbs.tsx` | NEW | Multi-language breadcrumbs |
| `customer-portal/frontend/src/shared/components/Breadcrumbs.css` | NEW | Breadcrumb styling |
| `customer-portal/frontend/src/layouts/RootLayout.tsx` | MOD | Skip-to-content, Breadcrumbs, main id/role |
| `customer-portal/frontend/src/index.css` | MOD | .skip-to-content styles |
| `customer-portal/frontend/public/sw.js` | NEW | Service worker (3 strategies) |
| `customer-portal/frontend/src/main.tsx` | MOD | SW registration (production) |
| `customer-portal/frontend/src/pages/Homepage.tsx` | MOD | usePageMeta() |
| `customer-portal/frontend/src/pages/POILandingPage.tsx` | MOD | usePageMeta() |
| `customer-portal/frontend/src/pages/AgendaPage.tsx` | MOD | usePageMeta() |

**Commit**: `529fd7b`, pushed dev → test → main
**Deploy**: Calpe (holidaibutler.com) + Texel (texelmaps.nl), both Vite build OK

### Blok D Samenvatting
- **5 sub-blokken**: D.1 Analyse, D.2 SEO Meta, D.3 Breadcrumbs, D.4 Accessibility, D.5 PWA
- **10 bestanden gewijzigd/nieuw**, 1 commit
- **Key deliverables**: Dynamic SEO (OG tags per page), multi-language breadcrumbs (4 talen), WCAG skip-to-content, service worker (offline-capable PWA)
- **Kosten**: EUR 0 (geen externe API calls)

---

## Fase III Blok G+A — Commerce Foundation Start (01-03-2026)

### Blok G: Juridische Documentatie
6 concept-templates gegenereerd in `docs/legal/`:
- `juridisch-advies-checklist.md` — 7 core juridische vragen voor commerce
- `concept-algemene-voorwaarden-nl.md` — Concept AV (NL)
- `concept-verwerkersovereenkomst-nl.md` — Concept verwerkersovereenkomst
- `concept-partner-agreement-nl.md` — Concept partner overeenkomst

Adyen setup documentatie:
- `docs/adyen-setup-checklist.md` — Stap-voor-stap Adyen configuratie
- `docs/adyen-env-template.md` — Environment variabelen template

### Blok A: Payment Engine / Adyen Integratie

#### Database
2 nieuwe tabellen via SSH SQL migratie:
- `payment_transactions` — 22 kolommen incl. UUID, Adyen PSP reference, idempotency key, bedragen in centen, status lifecycle
- `payment_refunds` — 15 kolommen incl. refund UUID, reason, admin user tracking
- Backup: `/root/backups/pre_fase3_blokA_20260301_180119.sql` (114MB)

#### Backend Services (ESM)
| Bestand | Type | Beschrijving |
|---------|------|--------------|
| `platform-core/src/services/payment/adyenService.js` | NEW | Adyen SDK v30 wrapper (sessions, capture, refund, cancel, HMAC verify) |
| `platform-core/src/services/payment/paymentService.js` | NEW | Business logic (5 core + 5 admin functies, DB queries) |
| `platform-core/src/routes/payment.js` | NEW | 3 customer + 1 health endpoint |
| `platform-core/src/index.js` | MOD | Payment routes mount, webhook raw body bypass |
| `platform-core/src/routes/adminPortal.js` | MOD | v3.14.0, +5 admin payment endpoints |

#### API Endpoints
**Customer-facing (3):**
- `POST /api/v1/payments/session` — Create Adyen payment session
- `POST /api/v1/payments/webhook` — Adyen webhook handler (HMAC verified)
- `GET /api/v1/payments/:uuid/status` — Transaction status lookup
- `GET /api/v1/payments/health` — Adyen connection test

**Admin (5):**
- `GET /api/v1/admin-portal/payments` — List transactions (filtered by destination)
- `GET /api/v1/admin-portal/payments/stats` — Payment statistics dashboard
- `GET /api/v1/admin-portal/payments/reconciliation?date=YYYY-MM-DD` — Reconciliation report
- `GET /api/v1/admin-portal/payments/:id` — Transaction detail + refunds
- `POST /api/v1/admin-portal/payments/:id/refund` — Initiate refund

#### Frontend
| Bestand | Type | Beschrijving |
|---------|------|--------------|
| `customer-portal/frontend/src/pages/payment/PaymentPage.tsx` | NEW | Checkout page, mounts AdyenCheckoutComponent |
| `customer-portal/frontend/src/pages/payment/PaymentResultPage.tsx` | NEW | Success/pending/failed result page |
| `customer-portal/frontend/src/routes/router.tsx` | MOD | +2 routes: /checkout/:orderType/:orderId, /payment/result/:transactionUuid? |
| `customer-portal/frontend/src/shared/config/apiConfig.ts` | MOD | Payment port 3005→3001 |
| `customer-portal/frontend/src/shared/services/payment.api.ts` | MOD | AdyenSessionData interface, createPaymentSession(), getTransactionStatus() |
| `customer-portal/frontend/src/lib/api/index.ts` | MOD | Payment URL→platform-core 3001 |

#### Key Technische Details
- **Adyen SDK v30**: CheckoutAPI met sub-API pattern (`checkout.PaymentsApi.sessions()`, `checkout.ModificationsApi.captureAuthorisedPayment()`)
- **PCI DSS SAQ-A**: Adyen Drop-in iframe, geen kaartdata op onze servers
- **HMAC webhook verificatie**: `crypto.createHmac('sha256', hmacKey hex)` + `timingSafeEqual()`
- **Idempotency**: SHA256(order_type + order_id + timestamp) als key
- **Merchant reference**: `HB-{dest_id}-{order_type}-{order_id}-{timestamp}`
- **Single-port**: Alle commerce via platform-core (3001), NIET aparte microservices

#### Bugs gefixed
1. `SyntaxError: Named export 'CheckoutAPI' not found` — @adyen/api-library is CommonJS → `import pkg; const { Client, CheckoutAPI } = pkg;`
2. `ERR_MODULE_NOT_FOUND` — @adyen/api-library niet in package.json → `npm install @adyen/api-library qrcode`
3. `this.checkout.sessions is not a function` — SDK v30 gebruikt sub-API's → `checkout.PaymentsApi.sessions()`
4. Admin payments empty voor platform_admin — `destScope null` fallback naar `1` → fixed naar `null` (alle destinations)

#### Verificatie Resultaten
- Health: `adyen: "connected"`, `environment: "TEST"`
- Session: Adyen sessie succesvol (CS1868DF5A02941FDFC0C72A4)
- DB: Transaction UUID correct opgeslagen, destination_id=2
- Admin list: Platform admin ziet alle transacties
- Admin stats: Statistieken correct
- Admin detail: Transactie + refunds data
- PM2: Stabiel, geen crashes

**Commits**: `50d2c0a`, `db589ab`, `313646a`, `e901e81`, `f52d83c`
**Deploy**: Hetzner (SCP + PM2 restart), alle branches (dev/test/main)

---

### Fase III — Blok B: Ticketing Module (01-03-2026)

**CLAUDE.md**: v3.53.0 → v3.54.0

#### Database (5 tabellen)
1. `tickets` — Ticket definities (name, type, pricing, validity, translations)
2. `ticket_inventory` — Beschikbaarheid per datum/tijdslot (capacity tracking)
3. `ticket_orders` — Bestellingen (order_uuid, order_number HB-T-YYMMDD-XXXX, QR data)
4. `ticket_order_items` — Order line items (ticket, inventory, quantity, pricing)
5. `voucher_codes` — Kortingscodes (percentage/fixed, max uses, date range, scope)

Legacy tabellen (`tickets` old, `bookings`, `availability`) gedropped (0 rows).

#### Nieuwe Bestanden (3)
| Bestand | Beschrijving |
|---------|-------------|
| `platform-core/src/services/ticketing/inventoryService.js` | Redis inventory locking + MySQL FOR UPDATE transactie + reservation lifecycle |
| `platform-core/src/services/ticketing/ticketingService.js` | 10 functies: getAvailableTickets, createOrder, processPayment, confirmOrder, cancelOrder, validateQR, applyVoucher, getOrderDetails, validateVoucher, getTicketDetail |
| `platform-core/src/routes/ticketing.js` | 6 customer endpoints + health |

#### Gewijzigde Bestanden (4)
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/index.js` | Mount ticketing routes |
| `platform-core/src/routes/adminPortal.js` | 15 admin endpoints, header v3.15.0 |
| `platform-core/src/services/orchestrator/scheduler.js` | `release-expired-ticket-reservations` (every minute) |
| `platform-core/src/services/orchestrator/workers.js` | New case + JOB_ACTOR_MAP entry |

#### Customer Endpoints (6)
| Method | Path | Functie |
|--------|------|---------|
| GET | `/api/v1/tickets/health` | Health check |
| GET | `/api/v1/tickets/:destinationId` | Browse tickets met availability |
| GET | `/api/v1/tickets/:destinationId/:ticketId` | Ticket detail |
| POST | `/api/v1/tickets/order` | Create order + reserve inventory |
| POST | `/api/v1/tickets/order/:orderId/pay` | Create Adyen payment session |
| GET | `/api/v1/tickets/order/:orderUuid` | Order details + QR image |
| POST | `/api/v1/tickets/voucher/validate` | Preview voucher discount |

#### Admin Endpoints (15)
Tickets CRUD, inventory management, orders list/detail/cancel, QR validation, stats, vouchers CRUD.
Totaal admin endpoints: 61 + 15 = **76**.

#### Key Architectuurbeslissingen
1. **MySQL FOR UPDATE + explicit transaction**: `mysqlSequelize.transaction()` wraps SELECT FOR UPDATE + UPDATE voor atomiciteit
2. **Redis als optioneel**: Safe wrappers — werkt ook zonder Redis, maar mist dan distributed locking
3. **QR format**: `HB:{order_uuid}:{hmac_8chars}` — HMAC-SHA256 met QR_SECRET_KEY, timing-safe vergelijking
4. **Route ordering**: Specifieke routes (order/*, voucher/*, health) MOETEN voor `/:destinationId` wildcard
5. **Admin destScope**: platform_admin krijgt `null` scope → POST/create endpoints accepteren `destination_id` uit request body
6. **15-min checkout window**: Orders krijgen `expires_at`, BullMQ job released inventory + markeert als expired

#### Bugs Gevonden & Opgelost
1. Express route capture: `/:destinationId` matched "health", "order", "voucher" → route ordering fix
2. reserved_count = 0: SELECT FOR UPDATE zonder expliciete transactie → `mysqlSequelize.transaction()` fix
3. Admin POST MISSING_DESTINATION: platform_admin destScope=null → fallback naar `req.body.destination_id`

#### E2E Verificatie (18/18 PASS)
Health, browse, detail, order+reserve, order details, payment session, cancel, voucher create+validate, order+voucher, QR validation, admin orders/vouchers/tickets/stats/detail, double-scan rejection, invalid QR rejection, multi-destination isolation.

**Scheduled Jobs**: 42 totaal (was 40)

---

### Fase III — Blok C: Reservation Module (01-03-2026)

**CLAUDE.md**: v3.54.0 → v3.55.0

#### Database (3 tabellen + 1 ALTER TABLE)
- `reservation_slots` (13 kolommen): poi_id, destination_id, slot_date, slot_time_start/end, slot_duration_minutes, total_tables, total_seats, reserved_seats, is_available
- `guest_profiles` (20 kolommen): destination_id, email, phone, first_name, last_name, dietary_preferences (JSON), allergies (JSON), no_show_count, is_blacklisted, blacklist_reason, consent_data_storage, consent_marketing, data_retention_until
- `reservations` (26 kolommen): destination_id, reservation_uuid, reservation_number (HB-R-YYMMDD-XXXX), slot_id, poi_id, guest_profile_id, party_size, deposit_required/cents/status, status (6 statuses), qr_code_data, reminder flags, cancellation fields
- `ALTER TABLE POI ADD COLUMN has_reservations BOOLEAN DEFAULT FALSE`

#### Nieuwe bestanden (2)
| Bestand | Beschrijving |
|---------|--------------|
| `platform-core/src/services/reservation/reservationService.js` | 7 core functies + QR validatie + guest profiles + 4 BullMQ job functies (810 regels) |
| `platform-core/src/routes/reservations.js` | 4 customer-facing endpoints + health check + rate limiting |

#### Gewijzigde bestanden (4)
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/index.js` | Import + mount reservation routes |
| `platform-core/src/routes/adminPortal.js` | v3.15.0 → v3.16.0: 13 admin endpoints (reservations CRUD, slots CRUD, guests, stats, calendar) |
| `platform-core/src/services/orchestrator/scheduler.js` | 4 nieuwe BullMQ jobs (expired cleanup, 24h+1h reminders, GDPR guest cleanup) |
| `platform-core/src/services/orchestrator/workers.js` | 4 case handlers + JOB_ACTOR_MAP entries |

#### Customer Endpoints (4)
| Method | Path | Functie |
|--------|------|---------|
| GET | `/api/v1/reservations/slots/:poiId` | Browse beschikbare slots |
| POST | `/api/v1/reservations` | Maak reservering (+ QR + guest profile) |
| GET | `/api/v1/reservations/:uuid` | Reserveringsdetails (public) |
| PUT | `/api/v1/reservations/:uuid/cancel` | Annuleer reservering (guest) |

#### Admin Endpoints (13)
| Method | Path | Functie |
|--------|------|---------|
| GET | `/reservations` | Lijst reserveringen (paginated, filtered) |
| GET | `/reservations/stats` | Statistieken (no-show rate, top POIs, etc.) |
| GET | `/reservations/calendar/:poiId` | Kalenderoverzicht (maand) |
| GET | `/reservations/slots/:poiId` | Slot lijst met beschikbaarheid |
| POST | `/reservations/slots/:poiId` | Slots aanmaken (bulk) |
| PUT | `/reservations/slots/:id` | Slot wijzigen (seats validation) |
| GET | `/reservations/:id` | Reservering detail (+ guest profiel) |
| PUT | `/reservations/:id/status` | Status wijzigen (confirm/cancel) |
| POST | `/reservations/:id/no-show` | No-show markeren (auto-blacklist) |
| POST | `/reservations/:id/complete` | Reservering voltooien |
| GET | `/guests` | Lijst gastprofielen |
| GET | `/guests/:id` | Gastprofiel + geschiedenis |
| PUT | `/guests/:id/blacklist` | Blacklist toggle (manual override) |

#### BullMQ Jobs (4 nieuwe → 46 totaal)
| Job | Schedule | Functie |
|-----|----------|---------|
| `reservation-expired-cleanup` | */5 * * * * | Release expired deposit_pending (30 min) |
| `reservation-reminder-24h` | 0 * * * * | 24h reminder voor confirmed reserveringen |
| `reservation-reminder-1h` | */15 * * * * | 1h reminder voor confirmed reserveringen |
| `guest-data-retention-cleanup` | 0 3 * * 0 | GDPR guest profile cleanup (24 maanden) |

#### Architectuur Beslissingen
- **QR format**: `HB-R:{uuid}:{hmac8}` (prefix `HB-R` vs `HB` voor tickets — aparte secret)
- **Reservation number**: `HB-R-YYMMDD-XXXX` (auto-increment per dag)
- **Guest profile**: Upsert op email+destination_id, GDPR consent tracking
- **Auto-blacklist**: 3 no-shows → is_blacklisted=TRUE, blacklist_reason="auto: 3 no-shows"
- **Deposit flow**: deposit_pending → pay → confirmed; no-show = forfait (geen refund)
- **Redis + MySQL dual lock**: Zelfde pattern als ticketing (SETNX + FOR UPDATE)
- **Seat validation**: Cannot lower total_seats below current reserved_seats

#### Bugs Fixed
- `google_formatted_address` → `address` (POI tabel kolom naam)
- Legacy `reservations` + `guests` + `restaurants` tabellen gedropped (FK orphan op `transactions`)
- `has_reservations` kolom toegevoegd aan POI tabel

#### E2E Test Resultaten (20/20 PASS)
1. Browse available slots ✅
2. Create reservation (confirmed + QR) ✅
3. Get reservation details by UUID ✅
4. Admin: List reservations ✅
5. Admin: Reservation stats ✅
6. Admin: Calendar view ✅
7. Admin: Guest profiles ✅
8. Verify reserved_seats updated ✅
9. Admin: Mark no-show ✅
10. Verify no-show effects (seats released, count incremented) ✅
11. Auto-blacklist after 3 no-shows ✅
12. Blacklisted guest blocked from booking ✅
13. Admin: Manual unblacklist ✅
14. Unblacklisted guest can rebook ✅
15. Customer cancel ✅
16. Verify cancel effects (seats released, status updated) ✅
17. Race condition (2 concurrent, 1 success + 1 INSUFFICIENT_SEATS) ✅
18. Slot update validation (seats below reserved blocked) ✅
19. Slot update (valid) ✅
20. Admin: Venue cancel ✅

---

### Fase III — Blok D: Chatbot-to-Book Voorbereiding (02-03-2026)

**CLAUDE.md**: v3.55.0 → v3.56.0

**Doel**: Chatbot voorbereiden op commerce-integratie. Booking sub-intent classificatie, conversational booking flow, booking context tracking, multilingual response templates, en feature flag gating. Chatbot verzamelt selectiedata (POI, datum, details) maar redirect naar payment/form pagina's voor PII — GDPR design beslissing.

#### Nieuwe bestanden (2)
| Bestand | Beschrijving |
|---------|-------------|
| `platform-core/src/services/holibot/bookingMessages.js` | 16 message templates in 5 talen (NL/EN/DE/ES/FR), DESTINATION_PREPOSITIONS ("op Texel"/"in Calpe"), MODULE_NAMES, DESTINATION_CONTACTS, getBookingMessage() helper (~230 regels) |
| `platform-core/src/services/holibot/bookingParser.js` | parseDate (ISO/EU/relatief/maandnamen), parseTime (HH:MM/AM-PM/"half zeven"), parseNumber (5 talen woord-naar-getal), parseConfirmation, parseOrderNumber (HB-[TR]-YYMMDD-XXXX), parseBookingInput, parseSpecialRequests (~260 regels) |

#### Gewijzigde bestanden (7)
| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/services/holibot/intentService.js` | +BOOKING_SUBINTENTS (4 sub-intents, 5 talen elk), +classifyBookingSubIntent() methode, FR bug fix ("réserver une table") |
| `platform-core/src/services/holibot/contextService.js` | v1.0→v1.1: +BOOKING_STEPS constant, +6 methoden (startBookingContext, updateBookingStep, getBookingContext, cancelBookingContext, isBookingTimeout, getNextBookingStep) |
| `platform-core/src/services/holibot/ragService.js` | v2.5→v2.6: +handleBookingFlow(), +7 helper methoden (_generateBookingStepResponse, _extractPoiFromMessage, _generateFriendlyBookingFallback, _generateModuleNotAvailable, _generateInvalidInputMessage, _buildCheckoutUrl, _buildReservationUrl) ~300 regels |
| `platform-core/src/routes/holibot.js` | v2.9→v3.0: booking flow routing (active context check, cancel detection, sub-intent → handleBookingFlow), streaming endpoint booking interceptie |
| `platform-core/config/destinations/calpe.config.js` | +7 commerce feature flags (all false) |
| `platform-core/config/destinations/texel.config.js` | +7 commerce feature flags (all false) |
| `platform-core/config/destinations/alicante.config.js` | +7 commerce feature flags (all false) |

#### Booking Sub-Intents (4)
| Sub-Intent | Vereist Module | Feature Flag | Voorbeeld |
|------------|---------------|--------------|-----------|
| `booking_ticket` | ticketing | hasTicketing | "Ik wil kaartjes kopen" |
| `booking_reservation` | reservation | hasReservations | "Tafel reserveren bij..." |
| `booking_activity` | ticketing | hasTicketing | "Duiktrip boeken" |
| `booking_status` | null | — | "Status van mijn bestelling" |

#### Commerce Feature Flags (7 per destination)
`hasBooking`, `hasTicketing`, `hasReservations`, `hasChatToBook`, `hasGuestCheckout`, `hasDeposits`, `hasDynamicPricing` — alle `false` tot live testing per destination.

#### Conversational Flow Architectuur
1. User stuurt bericht → intentService classificeert als `booking` intent
2. classifyBookingSubIntent() bepaalt sub-intent (ticket/reservation/activity/status)
3. ragService.handleBookingFlow() checkt feature flags → start booking context
4. Context trackt: type, stap (BOOKING_STEPS), geselecteerde POI, datum, aantallen
5. Elke stap: parser extraheert data → volgende stap of checkout redirect
6. 15-min timeout op booking context (GDPR: geen PII in-memory)
7. Cancel keywords ("stop", "annuleer", "cancel") beëindigen flow

#### Bug Fix
- **FR patroon matching**: "Je veux réserver une table" → `general_search` i.p.v. `booking_reservation`
- **Oorzaak**: `String.includes("réserver table")` matcht niet met "une" ertussen
- **Fix**: Expliciete patronen "réserver une table", "acheter des billets", "réserver une activité" toegevoegd

#### E2E Verificatie (12/12 PASS)
1. NL ticket intent ("Ik wil kaartjes kopen voor Ecomare") ✅
2. EN reservation intent ("I'd like to book a table") ✅
3. DE activity intent ("Ich möchte eine Bootstour buchen") ✅
4. ES ticket intent ("Quiero comprar entradas") ✅
5. FR reservation intent ("Je veux réserver une table") ✅ (na bug fix)
6. NL status intent ("Wat is de status van mijn bestelling?") ✅
7. Destination preposition "op Texel" ✅
8. Destination preposition "in Calpe" ✅
9. Correct contact email per destination ✅
10. Non-booking query still routes to RAG ✅
11. Feature flag gating (hasChatToBook=false → friendly fallback) ✅
12. Streaming endpoint returns JSON (niet SSE) voor booking ✅

**Kosten**: EUR 0 (geen externe API calls)

---

### Fase III — Blok E: Admin Commerce Dashboard (02-03-2026)

*(Details in vorige sectie hierboven)*

---

### Fase III — Blok F: Testing & Compliance (02-03-2026)

**LAATSTE BLOK FASE III — Na afronding is Fase III VOLLEDIG COMPLEET**

#### Pre-flight Fixes (Stap 0)
- **Fix 0B**: MS footer geconsolideerd van 2 regels naar 1 (persistent issue 4 blokken)
- **Fix 0C**: MS roadmap tabel "+E" toegevoegd
- **Fix 0D**: CLAUDE.md repo structuur — frontend componenten correct gedocumenteerd (3e keer gemeld)
- **Fix 0E**: Versie-sync checklist expliciet "MS Footer (GECONSOLIDEERDE regel)" toegevoegd
- **Fix 0F**: Database backup: 114 MB pre-blok-F backup

#### Compliance Documenten (7 bestanden)

| Document | Inhoud | Resultaat |
|----------|--------|-----------|
| `pci-dss-saq-a.md` | PCI DSS SAQ-A checklist, 17 items | 14 PASS, 3 MANUAL |
| `payment-test-results.md` | 17 payment test scenarios | 7 verified (code), 10 BLOCKED (Adyen frontend) |
| `ticketing-race-condition-tests.md` | 5 concurrent access tests | 5/5 VERIFIED (code review) |
| `reservation-double-booking-tests.md` | 5 slot locking + 1 deposit test | 5/5 VERIFIED + 1 N/A |
| `gdpr-compliance-checklist.md` | 31-item GDPR audit | 27 PASS, 2 MANUAL, 1 OPEN, 1 N/A |
| `security-audit.md` | 8-item security audit | 7 PASS + 1 FINDING (fixed) |
| `fase3-test-summary.md` | Consolidatie samenvatting | 84 tests totaal |

#### Security Verificaties Uitgevoerd
- HTTPS + security headers: 4 domeinen PASS (HSTS, SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy)
- API keys niet in source code: 0 matches (alleen .env referenties)
- .env permissions: 644 → **600** (gefixt tijdens audit)
- SQL injection preventie: Alle commerce queries parameterized (:replacements)
- PII in logs: 0 kaartdata matches (2 UUID false positives)
- npm audit: 0 vulnerabilities
- Webhook HMAC: SHA-256 + crypto.timingSafeEqual()
- Rate limiting: express-rate-limit op gateway + admin endpoints

#### GDPR Compliance Verificaties
- guest_profiles: consent_data_storage, consent_marketing, consent_given_at, data_retention_until columns ✅
- 5 BullMQ GDPR jobs: gdpr-overdue-check (4h), gdpr-export-cleanup (daily), gdpr-retention-check (monthly), gdpr-consent-audit (weekly), guest-data-retention-cleanup (weekly)
- 0 expired guest profiles (cleanup working)
- Geen payment auto-delete (7 jaar fiscale verplichting)
- Session TTL: 24 uur (chatbot), 15 min (booking context)
- Alle data processing EU/EEA + CH (adequaat)

#### Totaal Test Score
| Categorie | Tests | PASS | Verified | Blocked | Manual | N/A |
|-----------|-------|------|----------|---------|--------|-----|
| PCI DSS | 17 | 14 | 0 | 0 | 3 | 0 |
| Payment | 17 | 0 | 7 | 10 | 0 | 0 |
| Ticketing | 5 | 0 | 5 | 0 | 0 | 0 |
| Reservation | 6 | 0 | 5 | 0 | 0 | 1 |
| GDPR | 31 | 27 | 0 | 0 | 2 | 1 |
| Security | 8 | 7 | 0 | 0 | 0 | 0 |
| **Totaal** | **84** | **48** | **17** | **10** | **5** | **2** |

**0 FAIL items. Fase III markeerbaar als COMPLEET.**

#### Bestanden Overzicht

**Nieuwe bestanden (7)**:
| Bestand | Beschrijving |
|---------|--------------|
| `docs/compliance/pci-dss-saq-a.md` | PCI DSS SAQ-A checklist |
| `docs/compliance/payment-test-results.md` | 17 payment test scenarios |
| `docs/compliance/ticketing-race-condition-tests.md` | 5 race condition tests |
| `docs/compliance/reservation-double-booking-tests.md` | 5-6 double-booking tests |
| `docs/compliance/gdpr-compliance-checklist.md` | 31-item GDPR audit |
| `docs/compliance/security-audit.md` | 8-item security audit |
| `docs/compliance/fase3-test-summary.md` | Consolidatie samenvatting |

**Gewijzigde bestanden (4)**:
| Bestand | Wijziging |
|---------|-----------|
| `CLAUDE.md` | v3.57.0 → v3.58.0, Fase III COMPLEET, III-F rij, repo structure +compliance, changelog |
| `docs/strategy/HolidaiButler_Master_Strategie.md` | v7.23 → v7.24, Fase III COMPLEET, footer, changelog |
| `CLAUDE_HISTORY.md` | Blok F sectie, TOC entry #18 |
| Hetzner `.env` | chmod 644 → 600 (security fix) |

**FASE III COMMERCE FOUNDATION — VOLLEDIG COMPLEET**

Blokken: G (Legal) + A (Payment) + B (Ticketing) + C (Reservation) + D (Chatbot-to-Book) + E (Admin Commerce) + F (Testing & Compliance)

**Kosten**: EUR 0 (geen externe API calls)

---

## Fase IV-A — Apify Data Pipeline — Medallion Architecture (03-03-2026)

**Doel**: Volledige Apify data pipeline implementeren met Medallion Architecture (Bronze → Silver → Gold). Van de ~80 velden die Apify Google Maps Scraper levert, werden er slechts 7 opgeslagen. Kostbare data (reviewsDistribution, popularTimes, accessibility, amenities, parking, social media, reviews) ging verloren.

### Database Schema (Bronze Layer)

**Nieuwe tabel**: `poi_apify_raw`
```sql
CREATE TABLE poi_apify_raw (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  google_placeid VARCHAR(255) NOT NULL,
  destination_id INT NOT NULL DEFAULT 1,
  apify_run_id VARCHAR(100),
  apify_dataset_id VARCHAR(100),
  raw_json LONGTEXT NOT NULL,
  google_rating DECIMAL(2,1),
  google_review_count INT,
  permanently_closed TINYINT(1) DEFAULT 0,
  temporarily_closed TINYINT(1) DEFAULT 0,
  images_count INT,
  validation_status ENUM('valid','warning','error') DEFAULT 'valid',
  validation_notes TEXT,
  scraped_at DATETIME NOT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE
);
```

**Nieuwe POI kolommen** (ALTER TABLE POI):
- `popular_times_json` LONGTEXT — Apify popularTimesHistogram (7 dagen × 18 uur)
- `parking_info` JSON — Apify parking data
- `service_options` JSON — Apify service options
- `reviews_distribution` JSON — Apify {oneStar..fiveStar}
- `review_tags` JSON — Apify reviewsTags [{title, count}]
- `people_also_search` JSON — Apify related places
- `last_apify_sync` DATETIME — Timestamp laatste sync

**Bestaande kolommen nu gevuld**: amenities, accessibility_features, opening_hours_json, facebook_url, instagram_url, google_rating, google_review_count

### Backend Pipeline — poiSyncService.js (Silver Layer)

Volledige herschrijving van `updatePOI()` + 5 nieuwe methoden:

| Methode | Beschrijving |
|---------|--------------|
| `saveRawData()` | Bronze opslag: complete Apify JSON → poi_apify_raw + validatie checkpoint |
| `validateRawData()` | **Checkpoint 1**: Data validatie (permanent closed, invalid rating, missing data) → valid/warning/error |
| `detectSignificantChanges()` | **Checkpoint 2**: Change detection (rating ≥0.5 drop, permanent sluiting) → AuditLog warning |
| `updatePOI()` | Silver extractie: 80+ velden uit Apify → POI tabel (COALESCE voor bestaande data) |
| `extractReviews()` | Reviews uit Apify → reviews tabel (upsert op google_review_id, sentiment classificatie) |
| `updateFreshnessScore()` | **Checkpoint 3**: Freshness scoring (100 = fresh na succesvolle sync) |

**Review sentiment classificatie**: rating ≥ 4 → positive, rating = 3 → neutral, rating ≤ 2 → negative

### Apify Backfill Script

**Bestand**: `scripts/apify_backfill.py`

| Metriek | Waarde |
|---------|--------|
| Apify historische runs | 3.167 |
| Unieke POIs (na dedup op placeId) | 1.023 |
| Reviews geïmporteerd | 9.363 |
| Errors | 0 |
| Dedup strategie | Laatste run per placeId wint |

Het script hergebruikt historische Apify datasets via de Apify API, parsed de resultaten, en voert ze door de Bronze → Silver pipeline.

### Review Sentiment Fix

**Probleem**: 9.363 reviews hadden allemaal sentiment 'neutral' (default waarde). 5-sterren reviews werden als "neutraal" gelabeld.

**Fix (3-laags)**:
1. **Database UPDATE**: `UPDATE reviews SET sentiment = CASE WHEN rating >= 4 THEN 'positive' WHEN rating = 3 THEN 'neutral' ELSE 'negative' END WHERE sentiment = 'neutral' AND rating IS NOT NULL`
2. **Backfill script**: `apify_backfill.py` sentiment classificatie bij import
3. **Live pipeline**: `extractReviews()` in poiSyncService.js classificeert nieuwe reviews automatisch

### Customer Portal i18n Fix (Hardcoded Strings)

**Probleem**: 50+ Engelse strings waren hardcoded in React componenten, zichtbaar in NL/DE/ES/SV/PL taalversies. Multi-destinatie error.

**Omvang**:
- 10 bestanden gewijzigd
- 95+ nieuwe vertaalsleutels toegevoegd
- 6 talen: NL, EN, DE, ES, SV, PL
- 39 Google Maps feature name vertalingen per taal (bijv. "Wheelchair accessible entrance" → "Rolstoeltoegankelijke ingang")

**Gewijzigde componenten**:

| Bestand | Wijzigingen |
|---------|-------------|
| `translations.ts` | +95 keys: reviews sectie (14), writeReviewModal (21), gallery (3), featureNames (39×6 talen), sort/filter labels |
| `sentimentAnalysis.ts` | `formatVisitDate()` + `formatRelativeTime()` refactored met optionele i18n parameters + locale mapping |
| `POIReviewSection.tsx` | 14 hardcoded strings → `t.reviews.*` |
| `POIReviewCard.tsx` | Sentiment labels, travel party labels, date formatting, "Read more"/"Helpful" → i18n |
| `POIReviewFilters.tsx` | SORT_OPTIONS verplaatst naar component body, alle filter/sort labels → i18n |
| `WriteReviewModal.tsx` | 18+ strings → `t.reviews.writeReviewModal.*` (was al useLanguage maar gebruikte het niet) |
| `POIAirbnbGallery.tsx` | 3 gallery strings → `t.poi.gallery.*` |
| `POIDetailPage.tsx` | Section titles ("About", "Opening Hours", "Contact", "Details", "Reviews"), budget labels, opening status, error states, highlights/perfectFor, feature names → i18n |
| `POIDetailModal.tsx` | Feature name vertalingen: `t.poi.amenities.featureNames[f.name] || f.name` |

**Feature name vertaalstrategie**: Record<string, string> lookup dictionary per taal. Apify levert Engelse Google Maps labels, lookup vertaalt naar lokale taal. Fallback naar origineel Engels als key niet in dictionary.

**Verificatie**: TypeScript 0 errors (`npx tsc --noEmit`), Vite production build OK (`npx vite build`).

### Admin Portal — Sync & Metadata Card (Gold Layer)

**Backend uitbreiding**: GET `/pois/:id` nu inclusief:
- `lastApifyScrape` (scrapedAt, permanentlyClosed, temporarilyClosed, imagesCount, validationStatus, validationNotes)
- `totalScrapes` count
- `google_rating`, `google_review_count`, `tier_score`, `content_freshness_score/status`, `reviews_distribution`

**Frontend**: Sync & Metadata Card in POI detail met:
- Laatste Apify Sync datum
- Tier Score
- Google Rating (met review count)
- Freshness chip (fresh/aging/unverified)
- Quality alerts (error/warning uit validatie)

### Customer Portal — Nieuwe Data (Gold Layer)

**Public API uitgebreid** (`formatPOIForPublic()`):
- `popular_times`, `parking`, `service_options`, `reviews_distribution`

**Frontend**: Dynamic amenities/parking/accessibility uit Apify data (i.p.v. hardcoded checks).

### Quality Checkpoint Overzicht

| # | Checkpoint | Waar | Trigger | Actie |
|---|-----------|------|---------|-------|
| 1 | Data Validatie | `validateRawData()` | Elke scrape | Markeert valid/warning/error in poi_apify_raw |
| 2 | Change Detection | `detectSignificantChanges()` | Elke POI update | Logt waarschuwing bij rating drop ≥0.5, sluiting |
| 3 | Freshness Update | `updateFreshnessScore()` | Na succesvolle sync | Zet freshness op 'fresh' (100) |
| 4 | Business Status | In `updatePOI()` | Elke scrape | Deactiveert POI als permanentlyClosed |
| 5 | Review Dedup | In `extractReviews()` | Elke scrape | Skip bestaande reviews (op google_review_id) |

### Bestanden Overzicht

**Gewijzigd (12)**:

| Bestand | Wijziging |
|---------|-----------|
| `platform-core/src/services/agents/dataSync/poiSyncService.js` | Volledige herschrijving updatePOI() + 5 nieuwe methoden |
| `platform-core/src/services/agents/dataSync/poiTierManager.js` | destination_id in SELECT queries |
| `platform-core/src/routes/adminPortal.js` | GET /pois/:id uitgebreid (sync metadata + last scrape) |
| `platform-core/src/routes/publicPOI.js` | formatPOIForPublic() uitgebreid |
| `admin-module/src/pages/POIsPage.jsx` | +Sync & Metadata Card |
| `admin-module/src/i18n/nl.json` + en/de/es | +vertaalsleutels syncInfo |
| `customer-portal/frontend/src/i18n/translations.ts` | +95 keys, 6 talen, 39 feature names per taal |
| `customer-portal/frontend/src/features/poi/utils/sentimentAnalysis.ts` | i18n refactoring |
| `customer-portal/frontend/src/features/poi/components/POIReviewSection.tsx` | i18n 14 strings |
| `customer-portal/frontend/src/features/poi/components/POIReviewCard.tsx` | i18n labels/dates |
| `customer-portal/frontend/src/features/poi/components/POIReviewFilters.tsx` | i18n filters/sort |
| `customer-portal/frontend/src/features/poi/components/WriteReviewModal.tsx` | i18n 18+ strings |
| `customer-portal/frontend/src/features/poi/components/POIAirbnbGallery.tsx` | i18n gallery strings |
| `customer-portal/frontend/src/pages/POIDetailPage.tsx` | i18n section titles/features/budget |
| `customer-portal/frontend/src/features/poi/components/POIDetailModal.tsx` | i18n feature names |

**Nieuw (1)**:

| Bestand | Beschrijving |
|---------|--------------|
| `scripts/apify_backfill.py` | Apify historische data backfill (Bronze→Silver pipeline) |

**Kosten**: EUR 0

---

*Dit archief bevat alle historische details. Voor actuele project context, zie CLAUDE.md.*
