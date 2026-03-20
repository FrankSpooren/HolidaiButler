# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 4.14.0
> **Laatst bijgewerkt**: 20 maart 2026
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
│   ├── deploy-admin-module.yml  # CI/CD admin portal
│   └── deploy-hb-websites.yml   # CI/CD Next.js websites
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
│       ├── routes/ (holibot.js, ticketing.js, reservations.js, adminPortal.js v3.32.0)
│       ├── services/
│       │   ├── holibot/         # HoliBot 2.0 (RAG Chatbot)
│       │   ├── ticketing/       # Ticketing Module (inventoryService.js, ticketingService.js)
│       │   ├── reservation/     # Reservation Module (reservationService.js)
│       │   ├── commerce/        # Commerce Dashboard aggregation (commerceService.js)
│       │   ├── intermediary/    # Intermediary State Machine (intermediaryService.js)
│       │   ├── financial/       # Financial Process (financialService.js)
│       │   ├── orchestrator/    # BullMQ scheduler, workers, costController, auditTrail, ownerInterface
│       │   └── agents/          # 25 agents (base/, healthMonitor/, dataSync/, holibotSync/, intermediaryMonitor/, financialMonitor/, inventorySync/, contentRedacteur/, seoMeester/, publisher/, etc.)
│       ├── middleware/ (auth.js met RBAC, rate limiting, IP whitelist)
│       └── config/destinations/  # calpe.config.js, texel.config.js, alicante.config.js (+ commerce feature flags)
├── hb-websites/                 # Next.js 15 publieke websites (Fase V)
│   └── src/
│       ├── app/                 # App Router (tenant-themed SSR)
│       ├── blocks/              # Page builder blocks (20: Hero, PoiGrid, EventCalendar, RichText, CardGroup, Map, Testimonials, Cta, Gallery, Faq, TicketShop, ReservationWidget, Video, SocialFeed, ContactForm, Newsletter, WeatherWidget, Banner, Partners, Downloads)
│       ├── components/          # Layout (Header/Footer) + UI (Button/Card) + Modules (Chatbot) + Mobile (MobileHeader/MobileBottomNav/OnboardingSheet/mobile/*)
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
Alle tabellen met destination-specifieke data hebben `destination_id` kolom: POI, QnA, agenda, Users, user_journeys, holibot_sessions, poi_content_staging, reviews, payment_transactions, payment_refunds, tickets, ticket_inventory, ticket_orders, ticket_order_items, voucher_codes, reservation_slots, guest_profiles, reservations, poi_apify_raw, intermediary_transactions, settlement_batches, partner_payouts, credit_notes, financial_audit_log, media, trending_data, content_suggestions, content_items, content_performance, seasonal_config, social_accounts.

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

### Content Module Database Uitbreidingen
| Tabel | Type | Beschrijving |
|-------|------|-------------|
| `trending_data` | Nieuwe tabel | Trending zoektermen per destination: keyword, volume, trend_direction, relevance_score, source, language, market, week/year |
| `content_suggestions` | Nieuwe tabel | AI-gegenereerde content suggesties: title, summary, content_type, channels, keyword_cluster, engagement_score, status |
| `content_items` | Nieuwe tabel | Gegenereerde content: type, title, body per taal (5), seo_data JSON, social_metadata, ai_model, ai_generated (EU AI Act), approval_status ENUM |
| `content_performance` | Nieuwe tabel | Performance metrics: views, clicks, engagement, reach, conversions per content item per platform |
| `seasonal_config` | Nieuwe tabel | Seizoensconfiguratie per destination: season_name, perioden, hero_image, featured_pois, strategic_themes |
| `social_accounts` | Nieuwe tabel | Social media accounts per destination: platform, account_id, encrypted tokens (AES-256), status |
| `content_approval_log` | Nieuwe tabel (Wave 5) | Approval audit trail: item_id, action, old/new status, changed_by, comment, timestamp |
| `content_comments` | Nieuwe tabel (Wave 5) | Team comments per content item: item_id, user_id, comment, timestamp |
| `content_item_revisions` | Nieuwe tabel (Wave 5) | Version control: item_id, version, snapshot JSON, changed_by, change_summary |
| `content_pillars` | Nieuwe tabel (Wave 5) | Content pillars per destination: name, description, color, target_percentage |

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
| **Cmd v5.0 Stap 3+4** | **Wave 2/3 verificatie + deploy** | **07-03** | **Code review Wave 2/3: alle features PASS. API endpoint tests: Media, Pages, Page duplicate, Branding, Revisions — alle OK. Bugfix: pages SEO kolommen (seo_title_de/es, seo_description_de/es) ontbraken → migration 003. hb-websites frontend: 7/8 checks PASS (CookieBanner client-side). Texel tenant correct (#30c59b). Admin build + deploy.** |
| **Cmd v5.0 Stap 5** | **Sidebar herstructurering** | **07-03** | **Flat 16-item MENU_ITEMS → 5 gegroepeerde MENU_SECTIONS (Overzicht, Content & Data, Commerce, Platform, Systeem). Typography overline sectiehoofdingen + Divider scheiding. Secties auto-hidden als geen zichtbare items voor user role. i18n 4 talen (5 section labels). Sidebar versie v3.25.0.** |
| **Cmd v5.0 Stap 6** | **Dashboard improvements** | **07-03** | **QuickLinks: hardcoded labels → i18n + 3 nieuwe links (Media, Branding, Pages) met RBAC. SCHEDULED_JOBS: 40→54 entries (sync met BullMQ: +De Makelaar/Kassier/Magazijnier + reservation/ticket cleanup + GDPR + cost controller + POI tier). Build + deploy 0 errors.** |
| **Cmd v5.0 Stap 7** | **Admin Portal Hardening** | **07-03** | **CRITICAL: BrandingPage + PagesPage auth token fix (`admin_token` → axios client met auto-auth). Bare fetch() → client.post(). 8 hardcoded UI strings → i18n t() calls. 17 nieuwe i18n keys (4 talen): branding.footer.*, branding.brandVisuals.*, pages.uploadOgImage/ogImageUploaded/noBlocksInCategory, common.delete/save. 8 bestanden gewijzigd.** |
| **Cmd v5.0 Stap 8** | **hb-websites Frontend Hardening** | **07-03** | **XSS preventie: sanitizeHtml() utility (server-safe, geen DOM dependency) op RichText + FAQ blocks. Error handling: try/catch op alle 6 API proxy routes (502 met safe error). Security: console.log → dev-only (4x), postMessage origin validatie (trusted domains). API error log sanitized (pathname only). 14 bestanden, 1 nieuw. Build + deploy 0 errors.** |
| **Repair Cmd v6.0** | **Browser-Verified Fixes (3 rondes)** | **07-08-03** | **Ronde 1: Pre-flight diagnostiek op Hetzner. BLOK A express.static media/block-images. BLOK B preview iframe website render. BLOK C map = content issue. BLOK D sidebar = browser cache. BLOK E logo restored. BLOK F frontend bevestigd. Ronde 2: Favicon/navicon upload endpoint (/:destination/:type, auto-save MySQL branding JSON). X-Frame-Options → CSP frame-ancestors voor preview iframe. Ronde 3: STORAGE_ROOT patroon — alle upload dirs (branding, media, block-images) verplaatst BUITEN platform-core naar `/var/www/.../storage/` om CI/CD wipes te overleven. Apache routing fix: alleen /api/v1+/api/auth+/api/consent naar backend (3001), Next.js API routes naar port 3002. 21 media files + 2 logos hersteld. 4 bestanden gewijzigd. Commits f591b49, 482435e, cfea86f.** |
| **Cmd v7.0** | **Fase V Voltooiing (8 stappen)** | **08-03** | **STAP 1A: Dark mode leesbaarheid — 9 bestanden hardcoded kleuren → MUI theme tokens (Header, MediaPage, PagesPage, NavigationPage, BlockStyleEditor, BlockEditorCard, LoginPage). STAP 1B: BrandingPage 12 flat Cards → 9 MUI Accordions (default expanded: Colors + Logo), footer wireframe preview, SafeImage component (broken image handler), global footer info Alert. STAP 1C: Media Library bulk select (Checkbox overlay, Select All/Deselect, bulk delete met bevestigingsdialog). STAP 2B: Chatbot 4 quick actions (Programma samenstellen, Zoeken op Rubriek, Routebeschrijving, Tip van de Dag) in 4 talen (NL/EN/DE/ES). STAP 2C: Hero block crash fix (null-guard image prop, onError handler). STAP 3A: 6 design templates (Modern/Klassiek/Elegant/Kleurrijk/Zakelijk/Minimaal) met template selector dialog in BrandingPage. STAP 3B: 5 geavanceerde stijlopties (spacingScale, shadowIntensity, imageStyle, headingTextTransform + bijbehorende CSS custom properties in theme.ts). STAP 4: SEO hardening (sitemap.ts dynamisch per tenant, robots.ts, seo.ts uitgebreid met JSON-LD schemas: WebSite, BreadcrumbList, FAQPage, Event, LocalBusiness + canonical + hreflang + Twitter Cards). STAP 6: Playwright E2E config + 15 test bestanden. STAP 7: Dashboard uitgebreid met WebsiteStatsCard, CommerceOverviewCard, ChatbotPerformanceCard. 1 nieuw bestand (brandingTemplates.js), 3 nieuwe SEO bestanden, 15 test bestanden, ~16 gewijzigde bestanden.** |
| **Cmd v7.1** | **Frank's Feedback Fixes (7 stappen)** | **08-03** | **STAP 1: Block i18n resolution — resolveLocalizedProps() recursieve utility in i18n.ts, Hero crash fix (TranslatableField i18n objecten → strings). STAP 2: Hero height prop (4 opties: compact/default/tall/fullscreen) + resolveAssetUrl voor images. STAP 3: Map gekleurde markers per categorie (8 kleuren, L.divIcon, legenda). STAP 4: Quick action chatbot buttons (CustomEvent hb:chatbot:open, ChatbotButton.tsx, Hero+Cta chatbot variant). STAP 5: Button style defaults (auto-derive van primary/secondary kleuren). STAP 6: Footer i18n (resolveTitle helper, TranslatableField in admin). STAP 7: Branding uitbreiding (chatbot config accordion, header style transparent/sticky). 18 bestanden (1 nieuw + 17 gewijzigd). Commit 5daab9e.** |
| **Cmd v8.0** | **Fase V Final — Customer Portal Kwaliteit** | **08-03** | **STAP 1: Chatbot SSE proxy route (/api/holibot/chat/stream) — geen localhost:3001 meer, browser-safe via Next.js proxy. STAP 2: POI categorie filtering fix — backend categories (meervoud) support + min_reviews + quality sort. STAP 3: POI detail pagina volledig uitgebouwd (openingstijden dual-format Calpe/Texel, amenities, accessibility, parking, highlights, enriched description, reviews distribution, social links, Google Maps link, 2-kolom layout). STAP 4: Reviews veldnamen fix (user_name, review_text, visit_date) + Testimonials.tsx. STAP 5: Button color preview fix (deriveButtonDefaults lege string → fallback kleuren). POI type: 19→42 velden. 3 nieuwe + 9 gewijzigde bestanden. Commits 3c325cc + 6d425fc.** |
| **Repair v9.0** | **Chirurgisch Repair — dev.holidaibutler.com Kwaliteit** | **09-03** | **9 fixes: FIX 1 chatbot sessionId (useRef UUID) + SSE proxy numeric destination ID mapping. FIX 2 homepage PoiGrid categoryFilter verwijderd (geen match DB categorieën) + Partners block verwijderd (geen logos). FIX 3 footer text-on-primary→text-white (donker-op-donker). FIX 4 POI detail image fallback (gradient placeholder + tile description samenvatting). FIX 5 restaurants categoryFilter→["Food & Drinks"] + min_rating/min_reviews alleen met categoryFilter. FIX 6 BrandingPage button empty string check. FIX 7 events DateBlock fallback (datum als visueel element). FIX 8 PoiGrid round-robin categorie mix. FIX 9 BrandingPage i18n crash — resolveI18nDisplay() voor footer wireframe preview (col.title + copyright). 8 bestanden + 2 SQL updates.** |
| **Repair v10.0** | **Diagnostic-First Repair — 8 browser-verified fixes** | **09-03** | **v10 protocol: DIAGNOSE→FIX→BEWIJS. FIX 1: Chatbot Calpe→calpe_pois ChromaDB (was holidaibutler_pois=Texel data, 5e keer gerapporteerd). FIX 2: POI detail crash — FeatureList normalizeItem() voor {key:bool} objecten (HTTP 500→200). FIX 3: Homepage 0 POIs — TOURIST_CATEGORIES whitelist naar API i.p.v. post-fetch EXCLUDED_CATEGORIES (API retourneerde alleen Shopping bij rating:desc). FIX 4: Button color swatches — IIFE merge DB values met deriveButtonDefaults (lege strings fallback). FIX 5+6: Footer + Restaurants reeds werkend (v9). FIX 7: POI category badges — CATEGORY_COLORS mapping (8 kleuren EN+NL, inline styles). FIX 8: Chatbot config — ColorField, position Select, 4 quick action Checkboxes. 3 bestanden gewijzigd. Commit 75566b1.** |
| **Repair v11.0** | **Chirurgisch Command — 10 fixes, 12 acceptatiecriteria** | **09-03** | **FIX 1+6: Tip van de Dag — dedicated `/daily-tip` proxy route + ChatbotWidget TipCard (POI/Event card, localStorage excludes, refresh knop). FIX 3: POI detail image layout responsive per image count (1/2-3/4+). FIX 4: Event detail pagina (`/event/:id`) + interne links (was songkick.com extern). FIX 5: BrandingPage preview panel uitgebreid (alle 5 button variants, shadow/spacing/image style). FIX 7: Quick action buttons in blocks — ButtonListField 4 chatbot actions + `__TIP_VAN_DE_DAG__` sentinel → ChatbotButton → ChatbotWidget chain. FIX 8: Filter chips — PoiFilterBar (categorie) + EventFilterBar (datum) + PoiGridFiltered/EventCalendarFiltered blocks. FIX 9: Footer social icons — backend fallback `branding.socialLinks` in pages.js (was NULL in social_links kolom). FIX 10: quickActionFilter prop doorgewired via layout.tsx. 6 nieuwe + 10 gewijzigde bestanden. 12/12 acceptatiecriteria PASS.** |
| **Command v12.0** | **8 fixes + Onboarding Wizard — 11 acceptatiecriteria** | **09-03** | **FIX 1: Hero chatbot button DATA fix (variant secondary→chatbot, href verwijderd). FIX 2B: POI detail map single marker (Map.tsx staticMarkers prop, skip fetch-all). FIX 4: Categorie kleuren Customer Portal match (CATEGORY_COLORS in PoiGrid/PoiFilterBar/Map, gradient-derived). FIX 6: Footer brand kolom social icons verwijderd + social default kolom. FIX 8: Onboarding wizard (OnboardingPage.jsx 5-stappen MUI Stepper, POST /onboarding/create endpoint, sidebar + i18n 4 talen). FIX 2A/3/5/7: verificatie reeds werkend (v11). 1 nieuw + 11 gewijzigde bestanden + 1 DB update. 158 endpoints. 11/11 PASS.** |
| **Command v13.0** | **5 Resterende Bugs — DEEL A BLOKKEREND** | **10-03** | **BUG 1: Chatbot destination mixing — calpe.config.js chromaCollection 'holidaibutler_pois'→'calpe_pois' (root cause sinds v10). BUG 2: Chatbot kleur niet overgenomen — chatbotColor prop toegevoegd aan ChatbotWidget + layout.tsx doorsturen van chatbotConfig.color. BUG 3: Categorie label kleuren — pastel bg/dark text → gradient-primary bg/witte tekst (Customer Portal exact match, 3 bestanden). BUG 4: Filter bars ontbreken — DB pages block types poi_grid→poi_grid_filtered + event_calendar→event_calendar_filtered (6 rijen Calpe+Texel). BUG 5: Footer brand logo ontbreekt — resolveAssetUrl + img tag in brand case. 5 code + 1 config gewijzigd + 6 DB rijen. 5/5 PASS.** |
| **Command v14.0 DEEL A** | **5 Resterende Fixes — Customer Portal Kwaliteit** | **10-03** | **FIX 1: Footer navigation data-driven (tenant.config.nav_items, zelfde als Header) + custom HTML content (dangerouslySetInnerHTML). FIX 2: ButtonRenderer generiek component (ButtonRenderer.tsx + HeroButtons.tsx client wrapper) — Hero/Cta refactored, CardGroup + Banner chatbot variant support. FIX 3: POI detail image layout herschreven (4 varianten: 0/1/2-3/4+ images, vaste verhoudingen, onError fallback). FIX 4: POI detail als slide-in drawer (PoiDetailDrawer.tsx + PoiCard.tsx CustomEvent, API proxy /api/pois/[id], body scroll lock). FIX 5: Filter modals (PoiFilterModal + EventFilterModal, categorie/rating/reviews/sort/datum, slide-in panels, i18n 4 talen). 7 nieuwe + 11 gewijzigde bestanden. React 19 render-time state sync pattern. 10/10 Hetzner verificatie PASS.** |
| **Command v14.0 DEEL B** | **Browser-Verificatie + CI/CD Workflow** | **10-03** | **POI detail HTTP 500 fix: PoiImageGallery.tsx extracted als 'use client' component (React 19 Server Components kunnen geen event handlers bevatten). deploy-hb-websites.yml CI/CD workflow aangemaakt: rsync → npm ci → next build → PM2 restart → health check → rollback bij falen. Workflow fix: rsync --delete verwijderde server-only files (package.json, tsconfig.json, postcss.config.mjs) — opgelost door --delete te verwijderen + config files aan Git toe te voegen. tsconfig.json exclude playwright.config.ts + tests/ (build failure fix). Server hersteld van errored state (214 PM2 restarts). Workflow verification: dev SUCCESS, main SUCCESS. 1 nieuw component + 3 config files + 1 workflow. Commits bba8c66 + 3eec40a.** |
| **Command v15.0** | **UX Polish (Fase VI-A) — 7 fixes** | **10-03** | **FIX 1: ChatbotWidget mobile responsive (w-[calc(100vw-1.5rem)] sm:w-[380px], max-h-[80vh]). FIX 2: Loading skeletons (Skeleton.tsx: SkeletonCard/SkeletonGrid/SkeletonDrawer + Suspense SSR streaming in page.tsx + PoiDetailDrawer skeleton). FIX 3: Animaties (fadeInUp, staggered grid, image fade-in, Card hover lift -translate-y-1, prefers-reduced-motion respect). FIX 4: Hero text responsive (text-3xl sm:text-4xl lg:text-6xl) + DateBlock responsive (h-36 sm:h-48). FIX 5: Map responsive hoogte (h-[300px] sm:h-[400px] lg:h-[500px]) + legend overflow-x-auto. FIX 6: ScrollToTop.tsx (verschijnt na 400px scroll, positioned links van chatbot). FIX 7: Font preloading (link rel=preload) + CardImage animate-image-load. 2 nieuwe + 10 gewijzigde bestanden. Commit 64cf2a4.** |
| **Command v15.1** | **Fase VI-B Features + Admin Fixes** | **11-03** | **DEEL A: Hero chatbot "general" message filter, events als slide-in drawer (EventDetailDrawer.tsx + EventCard.tsx + /api/events/[id] proxy), block selector dark mode fix (action.hover). DEEL B: SearchBar in header (debounced 300ms autocomplete, POI drawer integratie), LanguageSwitcher (cookie hb_locale, 4 talen, middleware support), chatbot speech-to-text (Web Speech API, mic button), chatbot refresh/reset button. ADMIN: OnboardingPage React Error #31 fix (object-as-child), design templates in Onboarding step 2, POI module + AI Content in Onboarding step 3. 5 nieuwe + 8 gewijzigde bestanden (724 LOC). Commit 06f648e.** |
| **Fase D** | **Content Intelligence — Analytics Dashboard + Feedback Loop + Swat.io** | **15-03** | **BLOK D.0: Content Analyse Dashboard — 3 nieuwe analytics endpoints (overview met KPI+groei+tijdreeks, per-item met sort/filter/paginatie, platform vergelijking met CTR+engagement rate). ContentAnalyseTab.jsx (3 sub-tabs: Overzicht/Per Item/Platformen, LineChart tijdreeks, PieChart content type, BarChart CTR vergelijking, groeipercentage chips). Performance tab vervangen door Analyse tab. BLOK D.1: Feedback Loop (Optie B — standalone in Trendspotter). feedbackLoop.js: wekelijks correleer trending keywords met content_performance, boost/penalize relevance_score op basis van bewezen engagement. BullMQ job content-feedback-loop (zondag 04:00). BLOK D.2: Swat.io Evaluatie Rapport — aanbeveling: nu NIET switchen (geen publieke API, kosten niet gerechtvaardigd, workflow duplicatie). BLOK D.3: Documentatie finaal. 3 API endpoints (188 totaal). 1 BullMQ job (60 totaal). 25 agents. 1 nieuw frontend tab + 3 API methods + 3 hooks. i18n 4 talen (~25 nieuwe keys). adminPortal.js v3.28.0. Admin build 0 errors.** |
| **Enterprise SEO** | **SEO Scoring v2.0 + Auto-Improve + Tone of Voice** | **15-03** | **seoAnalyzer.js v2.0: content-type-aware scoring (blog 7 checks, social_post 7 checks, video_script 7 checks). SEO-aware prompt engineering: scoring criteria embedded in Mistral AI prompts. SEO_MINIMUM_SCORE=80. Auto-improve loop: genereer→SEO check→AI rewrite→re-check. normalizeAccents() Unicode NFD voor accent-safe keyword matching. improveExistingContent() standalone export + API endpoint POST /content/items/:id/improve. "AI Verbeter" button in ContentStudioPage. Tone of Voice: toneOfVoice.js v2.0 data-driven (DB branding JSON + 5-min cache + hardcoded fallback). BrandingPage Tone of Voice accordion (8 velden: personality, audience, brandValues, coreKeywords, adjectives, avoidWords, formalAddress, samplePhrases). buildToneInstruction() async, includes brand values + core keywords + address style. Cache invalidation on branding update. 1 nieuw endpoint (189 totaal). 8 gewijzigde bestanden. i18n 4 talen (~15 nieuwe keys). adminPortal.js v3.28.0.** |
| **Agent Fixes** | **5 Agent Runtime Errors Opgelost** | **15-03** | **FIX 1: financialMonitor customer_email→guest_email (correct kolom intermediary_transactions). FIX 2: syncReporter spam_score queries verwijderd (kolom bestaat niet in reviews). FIX 3: trendAggregator trend_direction ENUM validatie vóór save. FIX 4: googleTrendsCollector timeRange 'past7Days'→'now 7-d' (Apify actor schema). FIX 5: holibotSync getCollection→getOrCreateCollection + error catch op getStatus. 5 bestanden gewijzigd. Commit f04e358.** |
| **CS v5.0** | **Content Studio Remediatie — 8 Blokken** | **16-03** | **P0: BLOK 3 repurposeContent() AI platform-specifieke regeneratie (niet copy-paste), Repurpose button+dialog. BLOK 4 publish workflow (Nu Publiceren/Inplannen dialog, best time chips). BLOK 2 image management (attach/detach endpoints, ContentImageSection, POI+Unsplash suggesties). P1: BLOK 1 SEO v2.0 bevestigd. BLOK 8 mistral-medium-latest default + DeepL translator (wacht API key) + translationService v2.0. BLOK 5 Social Accounts tab. BLOK 6 BestTimeToPost component. P2: BLOK 7 ApprovalTimeline. 2 endpoints (210 totaal). 1 nieuw bestand. adminPortal.js v3.31.0.** |
| **CS v6.0** | **Content Studio TO DO — P0+P1 Enterprise Quality** | **16-03** | **P0-4h+4i: PlatformPreview herschreven — auto-adapt content per platform (smart truncation, hashtag herpositionering, platform health indicators, tips). repurposeContent() enterprise rewrite — PLATFORM_EXAMPLES met stijlreferenties, per-platform creatieve instructies, temperature 0.8, 2 retries, SEO scoring per item. P0-4c: Auto-attach images bij generatie — keyword REGEXP match op media + POI tabellen, opgeslagen in media_ids JSON. P0-7: Social Accounts — Pinterest OAuth v5 + YouTube/Google OAuth 2.0 connect endpoints. SocialAccountsCards herschreven — 7 platforms, "Koppelen" buttons, pending status support, token vernieuwen. P1-4e: DeepL Pro API actief (was al geconfigureerd). P1-4b+4d: Auto-crop bij publicatie — Sharp resizing naar platformspecs in Publisher Agent. P1-6: UTM parameters geïntegreerd in Publisher publish flow (applyUtmToContent + destination URL met tracking). 2 endpoints (212 totaal). 7 bestanden gewijzigd. adminPortal.js v3.32.0. MS v7.69.** |
| **OPDRACHT 7/7B** | **Content Studio Image Quality — Enterprise Image Selection** | **18-03** | **OPDRACHT 7: media_ids resolve logica (poi: prefix stripping, w=600 webp, alt text uit local_path). OPDRACHT 7B: 5 enterprise image quality fixes — POI auto-detectie uit titel (LIKE match), diversity filter (usedImageIds Set, prefer unused), content-type limieten (blog=3, social=1, video=1), imageSelector.js forSuggestion optie (6 results voor UI picker), PlatformPreview images zichtbaar (was grey placeholder). Frontend: STATUS_LABELS crash fix (StatusChip i18n), ContentImageSection rewrite (geselecteerde images + 3-6 alternatieven inline, click-to-select, Meer opties dialog POI+Unsplash). 5 bestanden. MS v7.71.** |
| **Content Studio Completie** | **3 Resterende Fixes — Alle 12 Opdrachten 100% Compleet** | **18-03** | **FIX 1: `score_calibrations` DB tabel aangemaakt (OPDRACHT 4 completie — wekelijkse score calibratie). FIX 2: source_url TextField was al aanwezig (OPDRACHT 11 bevestigd compleet). FIX 3: "Nieuwe suggesties laden" refresh button fix — imageSelector.js `excludeIds` parameter + RAND() randomisatie, backend `exclude_ids` body param, frontend stuurt huidige suggestie IDs mee bij refresh. Geverifieerd: Call 1 → [21362,21363,18586-18589], Refresh → [18590-18593,13734,13731] (100% andere images). 1 DB tabel + 3 bestanden. MS v7.72.** |
| **CS v6.0 Chirurgisch** | **Browser-Verified Remediatie — 7 Fixes** | **16-03** | **FIX 1: SEO scoring fairness (auto-derive meta desc, paragraph structure credit 7/10, softer link scoring 3/10 min). MAX_ROUNDS=3. FIX 2: SEO config bevestigd. FIX 3: Auto-attach images (selectImages() in generate-from-poi, DB fixes imageurls/display_order/filename). FIX 4: Repurposed items verified (18/19/20 uniek). FIX 5: Pinterest+YouTube OAuth callback routes, LinkedIn .default fix, Pinterest token activated. FIX 6: Meta System User→Page Token exchange (_getPageAccessToken 1h cache), Facebook analytics werkend (2 likes, 1 comment → content_performance). Token encryption SHA-256 key fix. FIX 7: PlatformPreview blog-on-social detection + Repurpose guidance. 7 bestanden. Commit 3bdbd5d. MS v7.70.** |
| **Wave 5+6** | **Enterprise Workflow + Platform Completion** | **15-03** | **Wave 5: Approval logging, versie-beheer (revisions), team comments, content pillars (4 Calpe geseeded), best-time-to-post analyse, UTM tracking, hashtag engine, bulk operations (approve/reject/schedule/delete). Wave 6: X API v2 client, Pinterest API v5 client, content templates (14 templates, 3 destinations), publish retry met auto-retry, brand score checking, SocialAccountsCards UI. 4 DB tabellen (content_approval_log, content_comments, content_item_revisions, content_pillars). 19 nieuwe API endpoints (210 totaal). 2 BullMQ jobs (62 totaal). adminPortal.js v3.31.0. 8 nieuwe + 6 gewijzigde bestanden.** |
| **Fase C** | **Content Publishing — De Uitgever Agent + Social Media + Calendar** | **15-03** | **Publisher Agent (#25 De Uitgever): Meta Graph API v25.0 (Facebook + Instagram), LinkedIn Marketing API, platform client factory pattern. Content Calendar tab (maandweergave, seizoensoverlay, dag-detail, inplannen/publiceren/annuleren). Performance tab (KPI cards, per-platform BarChart + PieChart, top content tabel, Recharts). Seasonal Config tab (CRUD, activeren/deactiveren, thema's, hero image override). Social Accounts management (connect/disconnect, token refresh, encrypted storage AES-256-CBC). LinkedIn OAuth callback route. 17 nieuwe API endpoints (185 totaal). 3 BullMQ jobs (content-publish-scheduled elke 15 min, content-analytics-collect dagelijks 09:00, seasonal-check dagelijks 00:15). 59 jobs totaal (+3). 25 agents (+1). DB migration: content_items +3 kolommen (scheduled_at, platform_post_id, publish_error) + approval_status ENUM uitgebreid. 2 social_accounts geseeded (Facebook + Instagram). 3 nieuwe frontend tabs, 17 API methods, 16 React Query hooks. i18n 4 talen (~50 nieuwe keys). adminPortal.js v3.27.0. Admin build 0 errors.** |
| **Fase B** | **Content Engine — AI Content Generatie Motor** | **14-03** | **BLOK B.0: De Redacteur Agent (#23) — Mistral AI content generatie, tone-of-voice per destination (Calpe warm/Texel adventurous/WarreWijzer slow-living), meertalige vertaling, platform-specifieke formatting. 4 nieuwe bestanden. BLOK B.1: De SEO Meester Agent (#24) — SEO analyse (readability Flesch-Kincaid per taal, keyword density, heading structuur, interne link suggesties), SISTRIX integratie (visibility index, keyword rankings). 5 nieuwe bestanden. BLOK B.2: Content Suggestie Engine — 3 API endpoints (suggesties lijst, AI generatie, approve/reject). BLOK B.3: Content Generator UI — 7 API endpoints, ContentStudioPage 3 tabs actief (Trending + Suggesties + Content Items), ContentItemDialog met taaltabs + SEO sidebar, GenerateContentDialog. 1 nieuw + 7 gewijzigde bestanden. 24 agents (+2), 56 jobs (+1), 168 endpoints (+10). adminPortal.js v3.26.0. i18n 4 talen. Admin build 0 errors.** |

| **Fase VI-B Mobile** | **Mobiele Homepage & Onboarding — 7 Blokken** | **18-03** | **BLOK A: MobileBottomNav (5 tabs: Home/Explore/Chatbot/Events/More, z-40, md:hidden, 44x44px touch targets). BLOK B: OnboardingSheet (4-stappen bottom-sheet: taal/interesses/meldingen/klaar, localStorage persistence, i18n NL/EN/DE/ES, CustomEvent hb:onboarding-update). BLOK C: MobileHeader (gradient primary→secondary, brand name uit config, SVG language flags, WCAG accessibility icon, hamburger menu, i18n subtitle). BLOK D: 4 homepage content blocks — ProgramCard (3 POIs + 1 event, time slots, connector lines, chatbot CTA), TipOfTheDay (yellow gradient, /api/holibot/daily-tip), TodayEvents (horizontal scroll, category emoji), MapPreview (Leaflet, category-colored markers, overlay label). BLOK E: Admin Portal integratie — BrandingPage "Mobiele Homepage" accordion (13 velden), GET+PUT /destinations/:id/mobile-homepage endpoints, mobileHomepage JSON in branding, config doorvoering naar alle components (programSize, mapPoiLimit, mapLabel, subtitle, brandName, greeting). BLOK F: Browser verificatie 9/9 PASS. Events list API proxy (/api/events). MobileHomepage wrapper (pathname='/' only, #F5F2EC bg). 9 nieuwe + 4 gewijzigde bestanden (1.712 LOC). Commit be8cc00.** |
| **Fase VI-B Feedback** | **7 Feedback Fixes — Mobiele Homepage Polish** | **20-03** | **FIX 1: Inter font (ProgramCard DM Sans→var(--hb-font-body)). FIX 2: Tip van de Dag deep link naar specifiek POI/Event (/pois/:id, /agenda/:id). FIX 3: Language param op alle productie-links (MapPreview). FIX 4: WCAG icoon al aanwezig (dev MobileHeader + prod customer-portal Header.tsx WCAGModal). FIX 5: Hamburger menu → slide-in panel rechts (groene gradient, emoji icons, primair+secundair met separator). FIX 6: CALPETRIP text-lg→text-xl, letter-spacing 2px. FIX 7: Bottom nav colored filled SVGs (Home oranje, Agenda blauw, POIs roze, Profiel paars). Geen customer-portal deployment nodig (alle 7 fixes zijn hb-websites specifiek). 6 bestanden. Commit 5d3bb00.** |

> **Volledige resultaatdetails per fase**: zie **CLAUDE_HISTORY.md**

---

## 🤖 Agent Systeem

### 25 Agents (15 agents + 3 monitoring modules + 3 commerce monitoring + 4 content agents) + 3 Enterprise Services (Issues, Baselines, Correlation)
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
| 22 | Trendspotter | De Trendspotter | Content | A | Sunday 03:30 |
| 23 | Content Redacteur | De Redacteur | Content | A | On-demand |
| 24 | SEO Master | De SEO Meester | Content | B | Monday 04:00 |
| 25 | Publisher | De Uitgever | Content | A | Every 15 min + Daily 09:00 |

**Type A** = destination-aware (`runForDestination(id)`), **Type B** = shared/platform-breed (`execute()`)

### BaseAgent Pattern
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper voor bestaande agent singletons
- `agentRegistry.js`: Centrale registratie 25 entries

### Scheduled Jobs: 62 totaal
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
- **Backend**: Geïntegreerd in platform-core (`adminPortal.js` v3.30.0)
- **Auth**: JWT (8h access + 7d refresh), bcrypt, RBAC (4 rollen)
- **i18n**: NL (default), EN, DE, ES
- **Endpoints**: 212 admin endpoints (incl. 15 ticketing/voucher + 13 reservation/guest + 10 commerce + 7 partner + 11 intermediary + 20 financial + 8 branding/pages/navigation + 3 V.6 endpoints + 1 Wave 1 block image upload + 4 media CRUD + 1 page duplicate + 3 page revisions + 1 onboarding + 3 content trending + 3 content suggestions + 7 content items + 1 content improve + 17 content publishing/calendar/social/seasons + 3 content analytics + 16 content workflow/pillars/bulk + 3 content templates/retry/brand-score + 2 content image attach/detach)

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
| SEO Intelligence | 🇩🇪 | SISTRIX (Bonn) |

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
| V | Multi-Tenant Configuratielaag (Next.js SSR, Component Library, Tenant-Theming) | 🟡 IN PROGRESS (V.0-V.6 + Wave 1-3 + Cmd v5.0-v8.0 + v13.0-v15.0 COMPLEET) | 12 wkn |
| VI | UX Revolution + WarreWijzer (Mobiele UX polish, WarreWijzer uitrol op Next.js) | 🟡 IN PROGRESS (VI-A UX Polish + VI-B Features + VI-B Mobile Homepage COMPLEET) | 6-8 wkn |
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
| `/var/www/api.holidaibutler.com/storage/` | STORAGE_ROOT (branding, media, block-images, poi-images) — BUITEN platform-core, overleeft CI/CD |
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
# BullMQ jobs (verwacht: 62)
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
| **4.14.0** | **2026-03-20** | **Fase VI-B Feedback: 7 Fixes**. FIX 1: Inter font consistency (DM Sans→var(--hb-font-body)). FIX 2: Tip van de Dag deep links (/pois/:id, /agenda/:id). FIX 3: Language param alle productie-links. FIX 4: WCAG al aanwezig (dev+prod). FIX 5: Slide-in hamburger menu (groene gradient, emoji icons). FIX 6: CALPETRIP font vergroting. FIX 7: Gekleurde bottom nav SVG icons. 6 bestanden. Commit 5d3bb00. MS v7.74. |
| **4.13.0** | **2026-03-18** | **Fase VI-B Mobile Homepage & Onboarding — 7 Blokken**. BLOK A: MobileBottomNav (5 tabs, z-40). BLOK B: OnboardingSheet (4-stappen, localStorage, i18n). BLOK C: MobileHeader (gradient, SVG flags, WCAG). BLOK D: ProgramCard + TipOfTheDay + TodayEvents + MapPreview. BLOK E: Admin BrandingPage accordion (13 velden) + 2 API endpoints + config doorvoering. BLOK F: 9/9 verificatie PASS. 9 nieuwe + 4 gewijzigde bestanden (1.712 LOC). Commit be8cc00. MS v7.73. |
| **4.12.0** | **2026-03-18** | **Content Studio Completie — Alle 12 Opdrachten 100%**. FIX 1: `score_calibrations` DB tabel (OPDRACHT 4). FIX 3: Image refresh button fix — `excludeIds` + RAND() randomisatie in imageSelector.js, backend `exclude_ids` param, frontend exclude current IDs bij refresh. Geverifieerd: 100% andere images bij refresh. 1 DB tabel + 3 bestanden. MS v7.72. |
| **4.11.0** | **2026-03-18** | **OPDRACHT 7/7B: Content Studio Image Quality — Enterprise Image Selection**. OPDRACHT 7: media_ids resolve (poi: prefix strip, w=600 webp, alt text). OPDRACHT 7B: POI auto-detectie, diversity filter, content-type limits, forSuggestion 6 results, PlatformPreview images. Frontend: STATUS_LABELS crash fix, ContentImageSection rewrite (3-6 alternatieven). 5 bestanden. MS v7.71. |
| **4.9.0** | **2026-03-16** | **Content Studio TO DO P0+P1 — Enterprise Quality**. P0: PlatformPreview auto-adapt (smart truncation, platform health indicators, tips). repurposeContent() enterprise rewrite (PLATFORM_EXAMPLES, creatieve instructies, 2 retries, SEO scoring). Auto-attach images bij generatie (keyword REGEXP). Pinterest OAuth + YouTube OAuth connect. SocialAccountsCards herschreven (7 platforms, koppelen/vernieuwen). P1: DeepL Pro actief. Auto-crop bij publicatie (Sharp). UTM parameters in Publisher flow. 2 endpoints (212 totaal). adminPortal.js v3.32.0. MS v7.69. |
| **4.8.0** | **2026-03-16** | **Content Studio v5.0 Remediatie — 8 Blokken**. BLOK 3 (P0): repurposeContent() herschreven. BLOK 4 (P0): Publish workflow. BLOK 2 (P0): Image management. BLOK 1 (P1): SEO v2.0. BLOK 8 (P1): DeepL translator + mistral-medium. BLOK 5 (P1): Social Accounts tab. BLOK 6 (P1): BestTimeToPost. BLOK 7 (P2): ApprovalTimeline. 2 endpoints (210 totaal). adminPortal.js v3.31.0. MS v7.68. |
| **4.7.0** | **2026-03-15** | **Content Module Waves 5+6: Enterprise Workflow + Platform Completion**. Wave 5: approval logging, revisions, comments, pillars, best-time, UTM, hashtags, bulk ops. Wave 6: X API v2 + Pinterest API v5, 14 templates, publish retry, brand score. 19 endpoints (210 totaal). 2 jobs (62 totaal). adminPortal.js v3.31.0. MS v7.67. |

> **Volledige changelog (v3.0.0 - v3.38.0)**: zie CLAUDE_HISTORY.md

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 7.74 |
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
