# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.81.0
> **Laatst bijgewerkt**: 7 maart 2026
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
| **WarreWijzer** | 🟡 GEPLAND | warrewijzer.be | 4 |

---

## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)

> **Dit zijn bindende afspraken voor alle ontwikkeling en implementatie.**

1. **Enterprise Level Kwaliteit**: Elke stap resulteert in een enterprise-level waardig, state-of-the-art product. Geen concessies.
2. **Foutloze Deployments**: Alle errors opgelost VOORDAT een feature als afgerond beschouwd wordt, gepusht wordt naar server of GitHub.
3. **CLAUDE.md Actualisatie**: Na elke aanpassing dit bestand bijwerken, opslaan op Hetzner + pushen naar GitHub.
4. **Context Verificatie**: CLAUDE.md + Master Strategie lezen, actuele status verifiëren in codebase, geen aannames.
5. **Geen Workarounds**: Problemen oplossen bij de root cause.
6. **Staging-First Workflow**: Content wijzigingen eerst naar `poi_content_staging`, review door Frank, dan pas naar POI tabel.
7. **Versie-Sync Controle**: Na elke fase/blok controleer: CLAUDE.md header versie, MS header versie + datum + status, Gerelateerde Documentatie versies, Admin Portal versie + endpoint count, BullMQ/Scheduled Jobs getal, MS Roadmap tabel + Fase detail + Changelog + MS Footer (GECONSOLIDEERDE regel: datum, fase status, blokken, endpoints, admin versie, jobs, CLAUDE.md versie, MS versie).

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

| Document | Locatie |
|----------|---------|
| **Master Strategie** | `docs/strategy/HolidaiButler_Master_Strategie.md` |
| **Agent Masterplan** | `docs/CLAUDE_AGENTS_MASTERPLAN.md` |
| **CLAUDE.md** | Repository root + Hetzner |
| **CLAUDE_HISTORY.md** | Repository root |

> Actuele versienummers: zie **Gerelateerde Documentatie** (onderaan dit document).
> **CLAUDE_HISTORY.md** bevat volledige fase-resultaten, changelogs en bestandslijsten per fase. Raadpleeg dit bestand ALLEEN wanneer historische details nodig zijn.
> **Strategic Roadmap Advisory v2.0** (28-02-2026) is volledig geïntegreerd in CLAUDE.md en Master Strategie. Dat document hoeft niet meer geraadpleegd te worden.

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
├── docs/compliance/             # Fase III + IV compliance documenten (12 totaal)
│   ├── pci-dss-saq-a.md        # PCI DSS SAQ-A checklist + verificatie
│   ├── payment-test-results.md  # 17 payment test scenarios
│   ├── ticketing-race-condition-tests.md  # 5 concurrent access tests
│   ├── reservation-double-booking-tests.md # 5 slot locking tests
│   ├── gdpr-compliance-checklist.md  # 31-item GDPR audit
│   ├── security-audit.md        # 8-item security audit
│   ├── fase3-test-summary.md    # Fase III consolidatie samenvatting
│   ├── fase4-intermediary-tests.md  # 20 E2E test scenario's intermediair+financieel
│   ├── fase4-security-audit.md  # 10-item security audit Fase IV
│   ├── gdpr-intermediary-addendum.md  # GDPR addendum intermediair data
│   ├── fase4-feature-flag-plan.md  # 4-weken staged rollout plan
│   └── fase4-test-summary.md    # Fase IV consolidatie samenvatting
├── customer-portal/frontend/    # React 19 + Tailwind
│   └── src/
│       ├── features/ticketing/  # AvailabilityChecker, BookingFlow, AdyenCheckout, MyTickets, TicketCard, TicketDetail
│       ├── pages/               # TicketsPage, ReservationsPage, BookingFlow, payment/PaymentPage, payment/PaymentResultPage
│       ├── shared/services/     # ticketing.api.ts, payment.api.ts, reservations.api.ts
│       └── components/, hooks/, utils/
├── admin-module/                # React 18 + MUI 5 (admin.holidaibutler.com)
│   └── src/
│       ├── pages/               # CommercePage (4 tabs), DashboardPage, AgentsPage, POIsPage, etc.
│       ├── api/                 # commerceService.js, client.js
│       ├── utils/               # currencyFormat.js
│       └── components/, hooks/, stores/, i18n/
├── scripts/                     # Utility scripts (Python)
│   └── apify_backfill.py        # Apify historische data backfill (Bronze→Silver)
├── platform-core/               # Node.js/Express backend
│   └── src/
│       ├── routes/ (holibot.js, ticketing.js, reservations.js, adminPortal.js v3.25.0)
│       ├── services/
│       │   ├── holibot/         # HoliBot 2.0 (RAG Chatbot)
│       │   ├── ticketing/       # Ticketing Module (inventoryService.js, ticketingService.js)
│       │   ├── reservation/     # Reservation Module (reservationService.js)
│       │   ├── commerce/        # Commerce Dashboard aggregation (commerceService.js)
│       │   ├── intermediary/    # Intermediary State Machine (intermediaryService.js)
│       │   ├── financial/       # Financial Process (financialService.js)
│       │   ├── orchestrator/    # BullMQ scheduler, workers, costController, auditTrail, ownerInterface
│       │   └── agents/          # 21 agents (base/, healthMonitor/, dataSync/, holibotSync/, intermediaryMonitor/, financialMonitor/, inventorySync/, etc.)
│       ├── middleware/ (auth.js met RBAC, rate limiting, IP whitelist)
│       └── config/destinations/  # calpe.config.js, texel.config.js, alicante.config.js (+ commerce feature flags)
├── hb-websites/                 # Next.js 15 publieke websites (Fase V)
│   └── src/
│       ├── app/                 # App Router (tenant-themed SSR)
│       ├── blocks/              # Page builder blocks (20: Hero, PoiGrid, EventCalendar, RichText, CardGroup, Map, Testimonials, Cta, Gallery, Faq, TicketShop, ReservationWidget, Video, SocialFeed, ContactForm, Newsletter, WeatherWidget, Banner, Partners, Downloads)
│       ├── components/          # Layout (Header/Footer) + UI (Button/Card) + Modules (Chatbot)
│       ├── lib/                 # API client, theme engine, block registry
│       ├── types/               # TypeScript type definities
│       └── middleware.ts        # Tenant-resolutie (domein → tenant slug)
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
| WarreWijzer | 4 | warrewijzer.be | Conform warredal.be |

### Database Multi-Tenancy
Alle tabellen met destination-specifieke data hebben `destination_id` kolom: POI, QnA, agenda, Users, user_journeys, holibot_sessions, poi_content_staging, reviews, payment_transactions, payment_refunds, tickets, ticket_inventory, ticket_orders, ticket_order_items, voucher_codes, reservation_slots, guest_profiles, reservations, poi_apify_raw, intermediary_transactions, settlement_batches, partner_payouts, credit_notes, financial_audit_log, media.

### Routing
```
Request → Apache VHost → X-Destination-ID Header → getDestinationFromRequest() → destination_id voor queries
```
`getDestinationFromRequest()` accepteert string ("texel", "warrewijzer") en numeric (2, 4) IDs.

### Frontend Architectuur (Fase V — 5 maart 2026)

**Architectuurbeslissing**: Next.js 15 + React 19 + Tailwind CSS 4 + bestaande HB API. Geen extern CMS.

Na evaluatie van Directus (database-first CMS), Payload CMS 3.0 (Next.js-native CMS), en architectuuraudit (67 tabellen, 137 endpoints, 21 agents, 54 jobs) is besloten:
- **Geen extern CMS**: 42% van must-have features vereist custom development in elk CMS
- **Next.js 15**: SSR voor SEO + tenant-theming via CSS Custom Properties + aansluiting op bestaande React codebase
- **Bestaande HB API**: dezelfde /api/v1/* endpoints, X-Destination-ID header scoping
- **Admin Portal uitbreiden**: Branding Editor, Page Layout Editor, Navigation Editor
- **Block-based page builder**: 20 blocks live, configureerbare layouts per pagina per tenant
- **Geautomatiseerde tenant onboarding**: nieuwe bestemming = configuratie in Admin Portal, geen development
- **Wildcard DNS**: `*.holidaibutler.com` → automatische subdomain-based tenant detectie via middleware

| Component | Technologie | Rol |
|-----------|------------|-----|
| Publieke websites | Next.js 15 (React 19) | SSR, App Router, Server Components |
| Styling | Tailwind CSS 4 | CSS Custom Properties voor tenant-theming |
| Data-bron | Bestaande HB API | /api/v1/*, X-Destination-ID scoping |
| Tenant-resolutie | Next.js middleware | Domein → tenant slug → x-tenant-slug header (+ wildcard `*.holidaibutler.com`) |
| Module-activatie | destinations.feature_flags | Bestaand JSON veld, server-side evaluatie |
| Page layouts | pages tabel (NIEUW) | JSON block-configuraties per pagina per tenant |
| Branding | destinations.branding (NIEUW) | JSON: kleuren, fonts, logo, stijl per tenant |

**Technische blauwdruk**: `HolidaiButler_Technische_Blauwdruk_v3_Definitief_NextJS_HB_API.docx`

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

### Apify Data Pipeline (Medallion Architecture — Fase IV-A)
```
Bronze: poi_apify_raw (raw JSON per scrape, validatie status, key fields geëxtraheerd)
Silver: POI tabel (80+ velden uit Apify: rating, reviews, amenities, accessibility, parking, popular_times, social media)
Gold:   Customer Portal + Admin Portal (dynamic rendering)
```
- **Nieuwe tabel**: `poi_apify_raw` (id, poi_id, google_placeid, destination_id, raw_json LONGTEXT, validation_status, scraped_at, processed_at)
- **Nieuwe POI kolommen**: popular_times_json, parking_info, service_options, reviews_distribution, review_tags, people_also_search, last_apify_sync
- **Bestaande kolommen nu gevuld**: amenities, accessibility_features, opening_hours_json, facebook_url, instagram_url, google_rating, google_review_count
- **Quality checkpoints**: Data validatie (valid/warning/error), change detection (rating ≥0.5 drop, sluiting), freshness scoring
- **poiSyncService.js**: saveRawData(), validateRawData(), detectSignificantChanges(), updatePOI() (herschreven), extractReviews(), updateFreshnessScore()
- **Backfill**: `scripts/apify_backfill.py` — 3.167 historische runs → 1.023 unieke POIs, dedup op placeId

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
- **Image Resize Proxy** (Fase II-B.4): `/api/v1/img/<path>?w=<width>&q=<quality>&f=<format>`
  - Sharp processing, mozjpeg, disk cache in `/storage/poi-images-cache/`
  - Widths: [200, 400, 600, 800, 1200], formats: jpg/webp/avif
  - Frontend `imageUrl.ts`: srcSet + lazy loading op alle POI componenten

### Content Staging Schema
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| poi_id | INT | FK naar POI.id |
| destination_id | INT | 1=Calpe, 2=Texel |
| content_source | VARCHAR | 'mistral_medium_fase4', 'vvv_texel', 'poi_website', 'calpe_es' |
| status | ENUM | 'pending', 'approved', 'rejected', 'applied', 'review_required' |
| comparison_recommendation | ENUM | 'USE_NEW', 'KEEP_OLD', 'MANUAL_REVIEW' |

### Fase V Database Uitbreidingen
| Tabel/Kolom | Type | Beschrijving |
|-------------|------|-------------|
| `destinations.branding` | JSON | Tenant branding: kleuren, fonts, logo, stijl |
| `pages` | Nieuwe tabel | Page layouts per destination: slug, title (meertalig), seo, layout JSON, status |
| `pages.parent_id` | INT NULL | FK naar pages(id) ON DELETE SET NULL — pagina-hiërarchie |
| `pages.og_image_path` | VARCHAR(500) | Open Graph afbeelding pad (upload) |
| `media` | Nieuwe tabel | Media library: filename, mime_type, size, width/height, category ENUM, alt_text, uploaded_by VARCHAR(36) |
| `page_revisions` | Nieuwe tabel | Revisie-geschiedenis: page_id, layout JSON, changed_by, change_summary |

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
| WarreWijzer | Wijze Warre | warrewijzer_pois | TBD (~15.000) | mistral-embed (1024d) |

### Key Files
- Backend: `holibot.js` (v3.0), `chromaService.js`, `embeddingService.js`, `ragService.js` (v2.6), `conversationService.js`, `intentService.js` (12 intents + 4 booking sub-intents), `suggestionService.js`, `contextService.js` (v1.1), `bookingMessages.js`, `bookingParser.js`
- Frontend: `vite.config.ts` (holibot config), `DestinationContext.tsx`, `WelcomeMessage.tsx`, `ChatHeader.tsx`, `ChatMessage.tsx`

### Chatbot Capabilities (Fase II-A + III-D)
- **Context awareness**: Temporeel (dag/datum/seizoen/weekend), locatie (per-destination), sessie (besproken POIs/categorieën)
- **Multi-turn memory**: 10-bericht sliding window, follow-up detectie NL/EN/DE/ES, ordinal reference resolution
- **Intent classificatie**: 12 intents + 4 booking sub-intents (5 talen incl. FR) + human_escalation (4 talen)
- **Booking sub-intents**: booking_ticket, booking_reservation, booking_activity, booking_status — feature-flag gated per destination
- **Conversational booking flow**: Multi-step POI→datum→details→confirm→checkout/form redirect (ragService v2.6)
- **Feature flags**: 7 commerce flags per destination — Calpe: hasBooking/hasTicketing/hasReservations/hasChatToBook/hasGuestCheckout = **true** (Fase IV-0). Texel: nog false. hasDeposits/hasDynamicPricing = false (bewust)
- **Booking context**: In-memory tracking (15 min timeout), GDPR-compliant (geen PII in context)
- **Human escalation**: Destination-specifiek contact (Texel: info@texelmaps.nl, Calpe: info@holidaibutler.com)
- **contextService.js** (v1.1): Sessie tracking (24h TTL) + booking context tracking, GDPR-compliant

### Taalregels
| Destination | Regel |
|-------------|-------|
| Texel EN/NL/DE | "on/op/auf Texel" (NIET "in Texel") |
| Calpe EN/ES/DE/NL | "in Calpe" |
| WarreWijzer BENL/NL/FR/DE/EN | "bij WarreWijzer" of "op het domein" (NIET "in WarreWijzer"). LET OP: Vlaams profiel ≠ Nederlands |

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
| 10A | Agent Ecosysteem Optimalisatie (items 3-5) | 26-02 | v3.10.0 |
| 10A-R | Restant: config datacorruptie fix, Threema verify | 26-02 | 0 placeholders |
| 10B | Security Hardening (npm audit, headers, secrets) | 26-02 | 0C/0H vuln |
| 10C | Apache Hardening + Agent Eerlijkheid + Sessions Fix | 26-02 | 5 domeinen headers |
| 11A | Agent Ecosysteem Audit + Activering | 27-02 | 3 agents geactiveerd |
| 11B | Agent Ecosysteem Enterprise Complete | 27-02 | Niveau 7: logging, trending, issues, anomaliedetectie, correlatie |
| 12 | Verificatie, Consolidatie & Hardening | 27-02 | 3 bug fixes, 34 tests, runtime metrics, MS v7.13 |
| II-A | Chatbot Upgrade (context, memory, booking, escalation) | 28-02 | contextService.js, ragService v2.5, 12 intents |
| II-B | POI Module Verbetering (freshness, UX, images, admin) | 01-03 | Clustering, multi-select, image proxy, 51 endpoints |
| II-C | Agenda Module Upgrade (multi-dest, categories, iCal, admin) | 01-03 | 6 public + 5 admin endpoints, iCal feed, category detection |
| II-D | Customer Portal UX Upgrade (SEO, breadcrumbs, a11y, PWA) | 01-03 | usePageMeta, Breadcrumbs 4 talen, skip-to-content, service worker |
| **III-G** | **Juridische Documentatie (AV, verwerkersovereenkomst, partner)** | **01-03** | **6 concept-templates in docs/legal/** |
| **III-A** | **Payment Engine / Adyen Integratie** | **01-03** | **Adyen SDK v30, sessions flow, 3 customer + 5 admin endpoints, 2 DB tabellen** |
| **III-B** | **Ticketing Module (Inventory, Orders, QR, Vouchers)** | **01-03** | **5 DB tabellen, 6 customer + 15 admin endpoints, Redis inventory locking, QR HMAC, BullMQ expired reservation job** |
| **III-C** | **Reservation Module (Slots, Bookings, QR, Guests, GDPR)** | **01-03** | **3 DB tabellen + ALTER TABLE POI, 4 customer + 13 admin endpoints, Redis slot locking, QR HMAC, auto-blacklist, 4 BullMQ jobs, GDPR guest cleanup** |
| **III-D** | **Chatbot-to-Book Voorbereiding** | **02-03** | **4 booking sub-intents (5 talen), conversational booking flow, booking context tracking, 7 feature flags, ragService v2.6, holibot v3.0, bookingMessages.js + bookingParser.js** |
| **III-E** | **Admin Commerce Dashboard** | **02-03** | **commerceService.js (READ-ONLY aggregation), 10 admin API endpoints (99 totaal), CommercePage.jsx (4 tabs: Dashboard/Reports/Alerts/Export), Recharts grafieken, CSV export met BOM, 6 fraud alert types, i18n 4 talen, RBAC platform_admin+poi_owner** |
| **III-F** | **Testing & Compliance (FASE III COMPLEET)** | **02-03** | **PCI DSS SAQ-A checklist (14/17 PASS), 17 payment test scenarios (7 verified/10 blocked), 5 ticketing race condition tests, 5 reservation double-booking tests, 31-item GDPR audit (27 PASS), 8-item security audit (7 PASS + 1 fixed). 7 compliance documenten in docs/compliance/. .env chmod 600 fix. FASE III VOLLEDIG COMPLEET.** |
| **IV-A** | **Apify Data Pipeline — Medallion Architecture (Bronze/Silver/Gold)** | **03-03** | **`poi_apify_raw` tabel (Bronze), poiSyncService.js rewrite (6 methoden, 3 quality checkpoints), 9.363 reviews geïmporteerd, Apify backfill 1.023 POIs (3.167 runs), Admin Sync & Metadata card, Customer Portal dynamic amenities/parking. Review sentiment fix (9.363 reviews). i18n hardcoded strings fix (10 bestanden, 95+ keys, 6 talen, 39 feature names per taal).** |
| **IV-B** | **POI Tier Import + Owner-Managed Tiers** | **03-03** | **2.695 POI tier-assignments geïmporteerd uit Excel (Frank's manuele review). `POI.tier` kolom (TINYINT) nu primair. poiTierManager.js v2.0: `getPOIsForUpdate()` query op stored tier kolom i.p.v. runtime score berekening. `classifyAllPOIs()` herberekent alleen tier_score (informatief). BullMQ crons: T1 dagelijks, T2 wekelijks, T3 maandelijks, T4 kwartaal. Admin Portal: tier in lijst + detail.** |
| **IV-0** | **Pre-flight & Adyen Activatie (Blok 0)** | **03-03** | **Adyen E2E test PASS: session creation (CS7F78812ACD), transaction status, HMAC webhook. Environment=TEST, Merchant=HolidaiButler378ECOM. Feature flags Calpe geactiveerd: hasBooking/hasTicketing/hasReservations/hasChatToBook=true. PCI DSS Blok 0 review (14/17 PASS, 3 manual Frank). GDPR Blok 0 review (27/31 PASS, 2 manual Frank). .env permissions 600 bevestigd. Legacy reservations-module (PM2 #4) gestopt (crash loop, niet Fase III service). Compliance docs geüpdatet met Blok 0 review secties.** |
| **IV-A (Blok A)** | **Partner Management Module** | **03-03** | **3 DB tabellen (partners, partner_pois, partner_onboarding). partnerService.js: CRUD, onboarding workflow, IBAN/BTW validatie, contract status transitions, KPIs. 7 admin endpoints (106 totaal). PartnersPage.jsx: stats cards, tabel, detail dialog (4 tabs), 3-stappen create wizard, status management. i18n 4 talen (~40 keys). Forward-compatible met multi-tenant configuratielaag (Fase V+).** |
| **IV-B (Blok B)** | **Intermediair State Machine** | **04-03** | **1 DB tabel (intermediary_transactions) + ALTER TABLE payment_transactions. intermediaryService.js: 6-stappen state machine (voorstel→toestemming→bevestiging→delen→reminder→review), ACID commissieberekening, QR HMAC-SHA256 (HB-I:{uuid}:{hmac8}), payout report. 9 admin endpoints (115 totaal). 2 BullMQ jobs (48 totaal). Feature flag hasIntermediary. PartnersPage transactions tab. i18n 4 talen (~35 keys). adminPortal.js v3.22.0.** |
| **IV-C (Blok C)** | **Financieel Proces** | **04-03** | **4 DB tabellen (settlement_batches, partner_payouts, credit_notes, financial_audit_log) + ALTER TABLE intermediary_transactions. financialService.js: 25 functies (3 state machines, ACID settlement creation, partner data snapshotting, BTW berekening 21%, auto-complete batch, 4 CSV exports met BOM). 20 admin endpoints (135 totaal), adminPortal.js v3.22.0. 2 BullMQ jobs (50 totaal: financial-auto-settlement 1e v/d maand 04:00, financial-unsettled-alert ma 08:30). Feature flag hasFinancial. FinancialPage.jsx (5 tabs: Dashboard, Settlements, Payouts, Credit Notes, Export). i18n 4 talen (~65 keys).** |
| **IV-D (Blok D)** | **Agent Ecosysteem v5.1** | **04-03** | **3 nieuwe agents: De Makelaar (intermediary monitor, Type A, elke 15 min: stuck txns, partner escalaties, conversie metrics), De Kassier (financial monitor, Type B, dagelijks 06:30: reconciliatie, anomaliedetectie 2σ, settlement alerts, fraude-indicatoren), De Magazijnier (inventory sync, Type A, elke 30 min: Redis↔MySQL sync, stale reserveringen, low inventory). 21 agents totaal (+3). 53 BullMQ jobs (+3). agentRegistry.js, AGENT_METADATA, SCHEDULED_JOBS_METADATA, AGENT_EXTENDED_DATA bijgewerkt. Daily briefing 3 nieuwe secties. adminPortal.js v3.22.0.** |
| **IV-E (Blok E)** | **Admin Intermediair Dashboard** | **04-03** | **IntermediaryPage.jsx (4 tabs: Dashboard met KPI cards + conversie funnel Recharts, Transacties met filters + detail dialog + state timeline + actie buttons, Afrekeningen link naar Financial, Export CSV). 2 nieuwe admin endpoints (funnel + CSV export, 137 totaal). Frontend: intermediaryService.js +2 methods, useIntermediary.js +1 hook, App.jsx route, Sidebar.jsx nav item. i18n 4 talen (~25 nieuwe keys). adminPortal.js v3.22.0. RBAC: platform_admin + poi_owner.** |
| **IV-F (Blok F)** | **Testing & Compliance (FASE IV COMPLEET)** | **04-03** | **42 tests (20 E2E VERIFIED + 10 security PASS + 8 GDPR PASS + 4 feature flag MANUAL). 5 compliance documenten: fase4-intermediary-tests.md, fase4-security-audit.md, gdpr-intermediary-addendum.md, fase4-feature-flag-plan.md, fase4-test-summary.md. 1 BullMQ job (intermediary-guest-anonymize, GDPR 24 maanden). 4-weken staged rollout plan. 0 FAIL, 0 CRITICAL findings. FASE IV VOLLEDIG COMPLEET.** |
| **V Start** | **Multi-Tenant Configuratielaag — Architectuurbeslissing** | **05-03** | **Next.js 15 + React 19 + Tailwind CSS 4. Geen extern CMS. Block-based page builder. DB: destinations.branding JSON + pages tabel.** |
| **V.0+V.1+V.2** | **Foundation + Component Library + Calpe Pilot** | **05-03** | **Next.js 15 live op dev.holidaibutler.com. 7 blocks, ChatbotWidget SSE streaming, 6 Calpe pagina's, POI detail route.** |
| **V.3** | **Texel als Tweede Tenant** | **05-03** | **Texel live op dev.texelmaps.nl. Eigen branding, 6 pagina's, 1.660 POIs, Tessa chatbot. Multi-tenant 100% data-driven gevalideerd.** |
| **V.4** | **Admin Portal Editors (Branding, Pages, Navigation)** | **05-03** | **8 nieuwe admin endpoints (145 totaal). BrandingPage, PagesPage, NavigationPage. Dynamic navigation in Header.tsx. adminPortal.js v3.24.0. 20 bestanden (+2.150 regels). 15/15 tests PASS.** |
| **V.5** | **P1 Blocks + Wildcard DNS Schaling** | **06-03** | **5 nieuwe blocks: Cta (presentational), Gallery (lightbox), Faq (accordion), TicketShop (feature-gated), ReservationWidget (feature-gated). Block registry 7→12. 3 Next.js API proxy routes. Admin Portal block editor 12 types + i18n 4 talen. Middleware wildcard subdomain detection `*.holidaibutler.com`. Apache wildcard VHost (HTTP). Pages route fix op Hetzner. 20 bestanden (+783 regels). Calpe 6/6 + Texel 6/6 regressie PASS.** |
| **V.6** | **Ontbrekende Blocks + Block Upgrades** | **06-03** | **8 nieuwe blocks: Video (YouTube/Vimeo/self-hosted, 3 layouts), SocialFeed (privacy-first consent, 4 platforms), ContactForm (honeypot spam, GDPR consent), Newsletter (MailerLite subscribe), WeatherWidget (Open-Meteo API, ISR 30min, compact/detailed), Banner (4 types, dismissible localStorage), Partners (logo grid, grayscale hover), Downloads (file type icons). 2 block upgrades: Hero (+video background, mobile fallback, prefers-reduced-motion), Gallery (+mixed media items, GalleryItem type). Block registry 12→20. 3 nieuwe admin endpoints (148 totaal): social-links GET/PUT + translate POST. 2 nieuwe public endpoints: contact POST + newsletter/subscribe POST. 2 Next.js API proxy routes. Auto-translate frontend (Mistral AI) op PagesPage, BrandingPage, NavigationPage. Social Media Links sectie in BrandingPage. DB ALTERs: destinations.latitude/longitude/social_links. i18n 4 talen (8 block types + translate + social links). adminPortal.js v3.24.0. ~36 bestanden (19 nieuw + 17 gewijzigd). Bugfix ronde: PagesPage openEdit fetcht nu individuele pagina (GET /pages/:id) i.p.v. onvolledige lijst-data — fix voor lege blocks + verloren vertalingen. Helmet CORP cross-origin fix. SettingsPage payoff i18n object rendering. adminAuth()/writeAccess() factory invocatie fix op 3 endpoints. Calpe homepage blocks hersteld. Calpe 6/6 + Texel 6/6 regressie PASS.** |
| **Wave 1** | **Enterprise Admin Portal — Visuele Block Editor** | **07-03** | **JSON textarea vervangen door dedicated form editors per block type. 12 herbruikbare field components (TextField, NumberField, SelectField, SwitchField, ColorField, ImageUploadField, TranslatableField, ButtonListField, ItemListField, RichTextField TipTap WYSIWYG, CategoryFilterField). 20 block editors (React.lazy code-split). Block selector dialog (5 categorieën: Content/Media/Data/Interactie/Commerce). @dnd-kit drag-and-drop block reordering. Live preview iframe (postMessage protocol, responsive toggles Desktop/Tablet/Mobile). Typography hierarchy (6 levels: H1-H4/Body/Small, 18 CSS custom properties). Block image upload endpoint (multer, 5MB). Apache CSP frame-ancestors fix voor preview iframe. 10 npm packages (@tiptap/\*, @dnd-kit/\*, lodash.debounce). 1 nieuw admin endpoint (149 totaal). adminPortal.js v3.25.0. ~38 nieuwe + ~8 gewijzigde bestanden (~3.200 LOC). 8/8 API tests PASS.** |
| **Wave 2+3** | **Professionele Features + Excellence** | **07-03** | **Wave 2 (8 features): Pagina-hiërarchie (parent_id, tree-view UI met expand/collapse), Media Library (4 CRUD endpoints + MediaPage.jsx grid/upload/filter/detail), 8 page templates (PageTemplateDialog), favicon/navicon upload, OG image upload, 5 button style varianten (15 CSS vars), footer config (data-driven Footer.tsx), block-level styling (BlockStyleEditor: bg/border/padding/fullWidth + hb-websites wrapper). Wave 3 (3 features): Brand Visuals (upload 3-5 hero images + BrandVisualPicker in HeroEditor), revisie-geschiedenis UI (PageRevisionsDialog, auto-snapshot bij save, max 20 per pagina, restore), GDPR Cookie Consent Banner (CookieBanner.tsx: 3 niveaus essential/analytics/marketing, 5 talen NL/EN/DE/ES/FR, tenant-aware kleuren, SocialFeed marketing consent gating). 2 nieuwe DB tabellen (media, page_revisions) + 2 ALTER TABLE (pages.parent_id, pages.og_image_path). 8 nieuwe admin endpoints (157 totaal). 7 nieuwe + 22 gewijzigde bestanden (~2.300 LOC). Admin-module + hb-websites build 0 errors.** |
| **Cmd v5.0 Stap 1** | **Bugfix + Stabilisatie (4 kritieke bugs)** | **07-03** | **BUG-1: BlockErrorBoundary per block (crashende blocks tonen fallback). BUG-2: media.uploaded_by INT→VARCHAR(36) (UUID mismatch). BUG-3: resolveAssetUrl() helper voor logo/favicon/navicon (HB_ASSET_URL voor browser-facing URLs). BUG-4: Map.tsx herschreven met POI markers (Leaflet fetch + popup + auto-fit bounds + icon fix). Nieuwe /api/pois proxy route. 3 nieuwe + 4 gewijzigde bestanden. DB migration + deploy op Hetzner. Build 0 errors.** |
| **Cmd v5.0 Stap 2** | **Falende API test fix** | **07-03** | **ticketing-module/backend/tests/integration/api.test.js: recursieve ioredis require loop (Maximum call stack size exceeded) + bull queue mock + service mocks (ReminderService, NotificationService, TransferService). 5/5 suites, 88/88 tests PASS (was 4/5, 70/70). Wave 1 nu 8/8 API tests PASS.** |

> **Volledige resultaatdetails per fase**: zie **CLAUDE_HISTORY.md**

---

## 🤖 Agent Systeem

### 21 Agents (15 agents + 3 monitoring modules + 3 commerce monitoring agents) + 3 Enterprise Services (Issues, Baselines, Correlation)
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
| 12 | Architecture | De Architect | Strategy | B | ~~Monthly~~ | **DEACTIVATED** |
| 13 | Learning | De Leermeester | Strategy | A | ~~Daily~~ | **DEACTIVATED** |
| 14 | Adaptive Config | De Thermostaat | Strategy | A | ~~Every 30 min~~ | **DEACTIVATED** |
| 15 | Prediction | De Weermeester | Strategy | A | Daily |
| — | Content Quality | (module) | Monitoring | A | Monday 05:00 |
| — | Backup Health | (module) | Monitoring | B | Daily 07:30 |
| — | Smoke Test | (module) | Monitoring | A | Daily 07:45 |
| 19 | Intermediary Monitor | De Makelaar | Operations | A | Every 15 min |
| 20 | Financial Monitor | De Kassier | Operations | B | Daily 06:30 |
| 21 | Inventory Sync | De Magazijnier | Operations | A | Every 30 min |

**Type A** = destination-aware (`runForDestination(id)`), **Type B** = shared/platform-breed (`execute()`)

### BaseAgent Pattern
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper voor bestaande agent singletons
- `agentRegistry.js`: Centrale registratie 21 entries

### Scheduled Jobs: 54 totaal
- BullMQ queue: `scheduled-tasks`
- Workers: `src/services/orchestrator/workers.js` (incl. JOB_ACTOR_MAP voor correct agent attribution)

### Bekende Agent Issues
- **Agent config tasks**: ~~Datacorruptie 7e cyclus~~ → OPGELOST (10A-restant): backend placeholder validatie + frontend filter + MongoDB restore
- **Dashboard eerlijkheid** (10A): 4 statussen: Actief, Waarschuwing, Fout, Gedeactiveerd
- **Gedeactiveerde agents** (10A): De Architect, De Leermeester, De Thermostaat — `active: false` in AGENT_METADATA
- **Development agents** (11B): Individuele logging, escalatie via De Bode, week-over-week trending, agent_issues met SLA tracking, baselines + anomaliedetectie, cross-agent correlatie rapport (wekelijks maandag). Issues module in Admin Portal.
- **Security** (10C+11B): ~~Frontend vhosts missen security headers~~ → OPGELOST: 5 domeinen X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. ServerTokens Prod. npm audit 0 vulnerabilities (11B: audit fix 1C/4H/3M→0).

---

## 🖥️ Admin Portal

### Architectuur
- **Frontend**: React 18 + MUI 5 + Vite 4 + Zustand 4 + React Query
- **Backend**: Geïntegreerd in platform-core (`adminPortal.js` v3.25.0)
- **Auth**: JWT (8h access + 7d refresh), bcrypt, RBAC (4 rollen)
- **i18n**: NL (default), EN, DE, ES
- **Endpoints**: 157 admin endpoints (incl. 15 ticketing/voucher + 13 reservation/guest + 10 commerce + 7 partner + 11 intermediary + 20 financial + 8 branding/pages/navigation + 3 V.6 endpoints + 1 Wave 1 block image upload + 4 media CRUD + 1 page duplicate + 3 page revisions)

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

### Owner-Managed Tiers (v2.0 — Fase IV-B)

Tier-indeling wordt **manueel bepaald door de eigenaar** (opgeslagen in `POI.tier` kolom). De `tier_score` wordt informatief berekend maar bepaalt NIET de tier-indeling.

| Tier | Frequentie | Calpe | Texel | Totaal |
|------|-----------|-------|-------|--------|
| 1 | Dagelijks 06:00 | 2 | 18 | 20 |
| 2 | Wekelijks ma 06:00 | 116 | 39 | 155 |
| 3 | Maandelijks 1e 06:00 | 691 | 255 | 946 |
| 4 | Kwartaal 06:00 | 784 | 1.427 | 2.211 |

### tier_score (informatief): `(review_count × 0.30) + (avg_rating × 0.20) + (tourist_relevance × 0.30) + (booking_frequency × 0.20)`

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

## 🚀 Strategische Roadmap

> **Geïntegreerd vanuit**: Strategic Roadmap Advisory v2.0 (28-02-2026). Dat document is hiermee overbodig.

### Fasering

| # | Fase | Status | Doorlooptijd |
|---|------|--------|--------------|
| I | Foundation Hardening (Agents, Platform Core, Admin Portal) | ✅ COMPLEET (Fase 12) | — |
| II | Active Module Upgrade (Chatbot, POI, Agenda, Customer Portal) | ✅ COMPLEET (Blok A+B+C+D) | 6-8 wkn |
| III | Commerce Foundation (Payment/Adyen, Ticketing, Reservering) | ✅ COMPLEET (Blok G+A+B+C+D+E+F) | 8-12 wkn |
| IV | Intermediair & Revenue (Data Pipeline + Intermediair module + Agent) | ✅ COMPLEET (Blok A+B+C+D+E+F) | 6-8 wkn |
| V | Multi-Tenant Configuratielaag (Next.js SSR, Component Library, Tenant-Theming) | 🟡 IN PROGRESS (V.0-V.6 + Wave 1-3 + Cmd v5.0 COMPLEET) | 12 wkn |
| VI | UX Revolution + WarreWijzer (Mobiele UX polish, WarreWijzer uitrol op Next.js) | GEPLAND | 6-8 wkn |
| VII | Polish, Scale & Launch (E2E testing, load testing, DR, go-live multi-tenant) | GEPLAND | 3-4 wkn |

### State-of-the-Art Vervolgstappen (na Fase 12)

**A. Predictive Intelligence Layer (Agent Niveau 8)**
- De Weermeester → real-time predictive analytics met ML-modellen
- Seizoensgebonden POI-aanbevelingen op basis van historische pageview- en chatbot-data
- Recommendation Engine (gebruikersgedrag × weer × tijd × locatie)
- Gedeactiveerde strategy-agents reactiveren met bewezen nuttige taken

**B. Autonomous Self-Healing & Observability**
- Grafana/Prometheus stack voor real-time metrics
- Self-healing: agents detecteren en herstellen automatisch foutpatronen
- Distributed tracing (OpenTelemetry) end-to-end
- Canary deployments met automatische rollback (2σ baselines al aanwezig)

**C. Advanced Content Intelligence**
- A/B testing framework POI-beschrijvingen
- Content Freshness Score (scheduled scraping detectie verouderde POI-info)
- Multi-modal: image captioning, video thumbnail extractie, TTS audio guides
- RAG 2.0: hybride search (keyword + semantic + geo)

**D. Platform Resilience & Schaalbaarheid**
- Load testing (k6/Artillery) 10.000 concurrent users
- Database read replica voor analytics
- CDN (Cloudflare/BunnyCDN) voor 12.4 GB POI-images
- Disaster recovery RTO < 4h, RPO < 1h
- Redis Cluster voor high-availability

**E. Regulatory & Compliance Excellence**
- EU AI Act Transparency Dashboard (model versies, decision logs, bias monitoring)
- GDPR DSAR automation (export binnen 24h)
- Content-Security-Policy headers alle domeinen
- Jaarlijkse penetration test + vulnerability disclosure policy

**F. Developer Experience & CI/CD**
- Feature flags per destination
- E2E test suite (Playwright/Cypress)
- Staging smoke tests per PR
- API versioning (v1/v2) backward compatibility

### WarreWijzer Kernconfiguratie

| Aspect | Detail |
|--------|--------|
| **Type** | Recreatiedomein (NIET toeristische gemeente) |
| **Locatie** | Ketelstraat 77, 3680 Maaseik, België |
| **destination_id** | 4 |
| **Domein** | warrewijzer.be (dev/test/main + admin subdomains) |
| **Chatbot** | Wijze Warre (BENL/NL), WarreXplore (EN), FR/DE nader te bepalen |
| **Talen** | 5: BENL (primair), NL (primair), FR (secundair), DE (secundair), EN (tertiair) |
| **POIs** | ~300, rating 4.5+, radius 15km (+uniek 25-30km) |
| **Categoriemix** | Actief 25%, Cultuur 25%, Gastronomie 20%, Natuur 30% |
| **USPs** | Back to basic, slow living, reconnect to nature, offline, bewust |
| **Doelgroep** | Gezinnen (t/m 14j), actieve senioren (55-75), BE/NL-zuid/DE-grens |
| **Branding** | Conform warredal.be (lettertype, kleuren, sprookjesfiguren) |

> **Volledige WarreWijzer-briefing**: zie Master Strategie Deel 10

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
| `/var/www/warrewijzer.be/` | WarreWijzer frontend (TBD) |
| `/var/www/api.holidaibutler.com/hb-websites/` | Next.js publieke websites (Fase V) |
| `/root/backups/` | Database backups |
| `/root/fase*` | Fase output bestanden |

### Quick Health Check Commands
```bash
pm2 status                    # PM2 processes
redis-cli ping                # Redis
# BullMQ jobs (verwacht: 46)
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
| **3.81.0** | **2026-03-07** | **Command v5.0 Stap 2: API test fix + Stap 3 Wave 2/3 verificatie**. Ticketing integration test fix: recursieve ioredis mock + bull/service mocks. 5/5 suites, 88/88 tests PASS. Wave 2/3 browser verificatie gestart. |
| **3.79.0** | **2026-03-07** | **Command v5.0 Stap 1: Bugfix + Stabilisatie**. 4 kritieke bugfixes: BUG-1 BlockErrorBoundary per block, BUG-2 media.uploaded_by INT→VARCHAR(36), BUG-3 resolveAssetUrl() + HB_ASSET_URL voor logo/favicon/navicon, BUG-4 Map.tsx herschreven met POI markers + /api/pois proxy. 1 DB migration. 3 nieuwe + 4 gewijzigde bestanden. Deploy + build 0 errors. |
| **3.77.0** | **2026-03-07** | **Wave 2+3: Professionele Features + Excellence**. Wave 2: pagina-hiërarchie, media library, templates, button styles, footer config, block styling. Wave 3: brand visuals, revisie-geschiedenis, GDPR cookie consent. 8 endpoints (157 totaal). ~2.300 LOC. |

> **Volledige changelog (v3.0.0 - v3.38.0)**: zie CLAUDE_HISTORY.md

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 7.45 |
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
