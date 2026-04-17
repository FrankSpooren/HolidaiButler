# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 4.51.0
> **Laatst bijgewerkt**: 15 april 2026
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
3. **CLAUDE.md Actualisatie**: Na elke aanpassing dit bestand bijwerken op de SERVER, committen en pushen naar GitHub.
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
│   ├── deploy-platform-core.yml # CI/CD backend (main-only trigger)
│   ├── deploy-admin-module.yml  # CI/CD admin portal (dev/test/main, 3 aparte paden)
│   └── deploy-hb-websites.yml   # CI/CD Next.js websites (main-only trigger)
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
│       ├── routes/ (holibot.js, ticketing.js, reservations.js, adminPortal.js v3.47.0, mediaRoutes.js, mediaCollectionRoutes.js)
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
Alle tabellen met destination-specifieke data hebben `destination_id` kolom: POI, QnA, agenda, Users, user_journeys, holibot_sessions, poi_content_staging, reviews, payment_transactions, payment_refunds, tickets, ticket_inventory, ticket_orders, ticket_order_items, voucher_codes, reservation_slots, guest_profiles, reservations, poi_apify_raw, intermediary_transactions, settlement_batches, partner_payouts, credit_notes, financial_audit_log, media, trending_data, content_suggestions, content_items, content_performance, seasonal_config, social_accounts, audience_personas, brand_knowledge, brand_competitors.

### Standalone Content Studio Module
- **destination_type**: ENUM `tourism` | `content_only` op destinations tabel
- **destination status**: ENUM `active` | `archived` | `deleted` + soft-delete/restore/hard-delete endpoints
- **content_only** destinations: alleen Content Studio + Media Library + Branding (geen POI, Events, Commerce, Chatbot, Pages)
- **Sidebar**: feature flag-based filtering (hasPOI, hasEvents, hasCommerce, etc.)
- **Dashboard/Media/Branding/ContentStudio**: gescopet op user's allowed_destinations

### Merk Profiel & Knowledge Base
- **brand_profile** JSON kolom op destinations: company info, missie, visie, USPs, kernwaarden, SEO keywords, content goals
- **audience_personas** tabel: doelgroepprofielen met leeftijd, locatie, interesses, pijnpunten, toon-notities
- **brand_knowledge** tabel: Knowledge Base documenten (PDF/DOCX/TXT/URL parsing), tekst-chunks voor AI context
- **brand_competitors** tabel: concurrent-analyse met Mistral AI website scan
- **brandContext.js**: assembleert volledige merk context (profiel + tone + persona + knowledge) voor elke AI content generatie
- **Website-analyse**: scan URL → toon/thema's/USPs/schrijfstijl → "Overnemen in profiel" knop → auto-seed Merk Profiel + Tone of Voice
- **Onboarding → Merk Profiel**: tone preset, doelgroep, aanspreekstijl, contactpersoon automatisch doorgezet

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
- **Block-based page builder**: 35 blocks live (incl. 4 mobile + 7 desktop homepage + aliassen), 36 admin editors (100% coverage), configureerbare layouts per pagina per tenant
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

### 🚨 CalpeTrip.com — Hybride Architectuur (KRITIEK)

> **CalpeTrip.com is GEEN Page Builder site. CalpeTrip.com is GEEN customer-portal.**
> **CalpeTrip.com draait op hb-websites (Next.js) met een STANDALONE mobiele + desktop template.**

| Aspect | CalpeTrip.com (LIVE) | Toekomstige destinations (Texel, WarreWijzer, etc.) |
|--------|---------------------|-----------------------------------------------------|
| **Codebase** | `hb-websites/` (Next.js, port 3002) | `hb-websites/` (zelfde codebase, page builder modus) |
| **Homepage** | Standalone templates (`mobile/*`, `layout.tsx`) | Page Builder blocks (`pages` tabel + `blocks/`) |
| **Configuratie** | Hardcoded + `destinations.branding` DB | Admin Portal → Pagina's & Navigatie |
| **Apache vhost** | `calpetrip.com` → proxy naar port 3002 | `texelmaps.nl` / `warrewijzer.be` → proxy naar port 3002 |
| **Routing** | `layout.tsx`: `tenantSlug !== 'texel'` → standalone MobileHomepage | Page builder rendering via `[[...slug]]/page.tsx` |

**Beschermde bestanden** (live campagne sinds 1 april 2026):
- `hb-websites/src/components/mobile/*` — NOOIT wijzigen zonder Frank's akkoord
- `hb-websites/src/components/MobileHeader.tsx` — idem
- `hb-websites/src/components/MobileBottomNav.tsx` — idem
- `hb-websites/src/components/modules/ChatbotWidget.tsx` — idem
- `hb-websites/src/app/layout.tsx` — idem

**Verplichte checks bij ELKE hb-websites wijziging:**
1. Beïnvloedt deze wijziging calpetrip.com mobiel? → STOP, vraag Frank
2. Beïnvloedt deze wijziging `destinations.branding` DB? → STOP, vraag Frank
3. Raakt dit beschermde bestanden? → STOP, vraag Frank

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
- **Image bronnen**: `google_places` (22.596), `apify_refresh` (2.611+)
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
| `media` | **Uitgebreid v2.0** | Media library: 40 kolommen incl. alt_text (5 talen), tags/tags_ai, owner/rights, GDPR consent, media_type, location, quality_tier, perceptual_hash, ai_processed, versioning, usage tracking |
| `media_collections` | Nieuwe tabel (v2.0) | Collections/albums: name, description, destination_id, cover_media_id, shared_with JSON, is_smart |
| `media_collection_items` | Nieuwe tabel (v2.0) | Collection membership: collection_id, media_id, display_order |
| `media_versions` | Nieuwe tabel (v2.0) | Versie-historie: media_id, version_number, filename, changes JSON, created_by |
| `media_audit_log` | Nieuwe tabel (v2.0) | Audit trail: media_id, action, details JSON, user_id, timestamp |
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

> **Volledige fase-details met key output**: zie **CLAUDE_HISTORY.md**

### Fasering Compact
| Groep | Fasen | Status | Periode |
|-------|-------|--------|---------|
| Foundation & Content | 1-6e, R1-R6d, 7 | ✅ COMPLEET | jan-feb 2026 |
| Agents & Admin Portal | 8A-9I, 10A-10C, 11A-11B, 12 | ✅ COMPLEET | feb 2026 |
| Active Module Upgrade | II-A t/m II-D | ✅ COMPLEET | feb-mrt 2026 |
| Commerce Foundation | III-G t/m III-F | ✅ COMPLEET | mrt 2026 |
| Intermediair & Revenue | IV-A t/m IV-F | ✅ COMPLEET | mrt 2026 |
| Multi-Tenant Next.js | V.0-V.6, Wave 1-3, Cmd v5-v8, v9-v16 | ✅ COMPLEET | mrt 2026 |
| Content Studio | Fase B, C, D, Wave 5+6, CS v5-v6, SEO, Agent Fixes | ✅ COMPLEET | mrt 2026 |
| UX & Mobile | VI-A, VI-B, VI-B Mobile, VI-B Feedback, VI-C Desktop | ✅ COMPLEET | mrt 2026 |
| Admin UX Overhaul | v4.31.0 (14 opdrachten) | ✅ COMPLEET | apr 2026 |
| POI Pipeline Optimalisatie | v4.33.0 (12 punten) | ✅ COMPLEET | apr 2026 |
| Content Studio Images | v4.34.0 (Pexels + Flickr) | ✅ COMPLEET | apr 2026 |
| Content Studio Redesign | v4.36.0 (Opdracht 1-4 + Blog + Kwaliteit) | ✅ COMPLEET | apr 2026 |
| Studio Landing Upgrade | v4.42.0 (7 opdrachten dark theme redesign + i18n 5 talen) | ✅ COMPLEET | apr 2026 |
| PubliQio Branding & Polish | v4.43.0 (10 opdrachten branding + mockup + dark popups + privacy + per-user taal) | ✅ COMPLEET | apr 2026 |
| Corporate Landing Page | v4.44.0 (9 opdrachten: hero, badges, modules, stats, proces, showcase, EU-stack, CTA, i18n 5 talen, mobiel UX) | ✅ COMPLEET | apr 2026 |
| Content Studio Multi-Tenant | v4.45.0 (12 fixes: manual items, repurpose, images, publisher, BUTE config, social publishing) | ✅ COMPLEET | apr 2026 |
| Content Studio Analytics & Calendar | v4.46.0 (publish performance records, calendar edit+concept, auto-fill concept+images, orphan repair) | ✅ COMPLEET | apr 2026 |
| Content Studio UX & Undo | v4.47.0 (sanitization, 7 tooltips, undo auto-fill/auto-schedule/campagne) | ✅ COMPLEET | apr 2026 |
| Media Library v2.0 Enterprise | v4.48.0 (ML-1 t/m ML-4: 20 opdrachten, 33 endpoints, 15 componenten, DAM+GDPR+AI+editor) | ✅ COMPLEET | apr 2026 |
| Media Library v2.1 Beyond Enterprise | v4.49.0 (V1-V4: verificatie, video/audio/GPX pipeline, preview upgrade) | ✅ COMPLEET | apr 2026 |
| Media Library v2.1 Visual Search | v4.50.0 (W1-W4: ChromaDB image embeddings, visual search API+frontend, docs) | ✅ COMPLEET | apr 2026 |

### Huidige Tellingen
| Metric | Waarde |
|--------|--------|
| Admin endpoints | 287 |
| adminPortal.js | v3.47.0 |
| Agents | 25 |
| BullMQ jobs | 66 |
| Block types | 36 (+ aliassen, +blog_grid) |
| Block editors | 37 (+BlogGridEditor) |
| Public API endpoints | 2 (GET /blogs, GET /blogs/:slug) |
| CLAUDE.md | v4.50.0 |
| Master Strategie | v8.09 |

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
- **Backend**: Geïntegreerd in platform-core (`adminPortal.js` v3.47.0)
- **Auth**: JWT (8h access + 7d refresh), bcrypt, RBAC (6 rollen)
- **i18n**: NL (default), EN, DE, ES
- **Endpoints**: 248 admin endpoints (+2: Pexels + Flickr image search)
- **Standalone Login**: studio.holidaibutler.com (Content Studio branded login, USP's, vergelijkingstabel)

### RBAC Rollen (6 rollen, hiërarchie 100→30)
| Rol | Level | Scope | Rechten |
|-----|-------|-------|---------|
| platform_admin | 100 | Alle destinations | Volledig + user management + settings + rate limiter exempt |
| destination_admin | 90 | Eigen destination(s) | Content Studio volledig (genereren, goedkeuren, publiceren, social connect) + branding + media. GEEN settings/users |
| poi_owner | 70 | Eigen POIs | CRUD eigen POIs + reviews + analytics. Geen Content Studio |
| content_manager | 60 | Eigen destination | Content Studio genereren + bewerken. Geen goedkeuring/publicatie/social |
| editor | 50 | Eigen destination | Bewerken POIs + reviews + content items |
| reviewer | 30 | Eigen destination | Read-only |

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

### Texel Sync Pauzering (per 1 april 2026)
- **T2/T3/T4 GEPAUZEERD** voor Texel (destination_id=2) — site niet live, kostenbesparing
- **T1 actief** (18 POIs dagelijks, minimale kosten)
- Config: `PAUSED_DESTINATIONS` in `poiTierManager.js` — verwijder `[2]` om te heractiveren
- Bespaart 1.315 POIs per sync-cyclus

### Image Download Pipeline (per 2 april 2026)
- **Apify `maxImages: 10`** — elke run levert nu tot 10 image URLs per POI
- **Automatische download** in `poiSyncService.downloadNewImages()` — na elke `updatePOI()` worden nieuwe images lokaal opgeslagen
- **Dedup**: checkt `imageurls` tabel op bestaande URLs, downloadt alleen nieuwe
- **Opslag**: `/var/www/api.holidaibutler.com/storage/poi-images/{poi_id}/{hash}.jpg`
- **Source**: `apify_refresh` in imageurls tabel

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
| Analytics | 🇳🇱 | Simple Analytics (Amsterdam) |

---

## 📊 Simple Analytics — Event Tracking (v3.0)

### Dashboard
`https://dashboard.simpleanalyticscdn.com/calpetrip.com/events`

### Architectuur
CalpeTrip.com heeft **twee aparte codebases** die beide naar hetzelfde SA-dashboard rapporteren:

| Visitor | Codebase | Analytics bestand | Versie |
|---------|----------|-------------------|--------|
| **Mobiel** (homepage) | `hb-websites/src/lib/analytics.ts` | Next.js 15 (port 3002) | v3.0.0 |
| **Desktop** (SPA) | `customer-portal/frontend/src/shared/utils/analytics.ts` | React 19 + Vite (SPA) | v3.0.0 |

### Tracking Mechanisme (v3.0)
```
onClick → trackEvent() / trackBeforeNav()
           ├─ window.sa_event() (SA native, als geladen)
           └─ navigator.sendBeacon() (fallback, overleeft page-navigatie)
```

**Drie verzendmethoden** (in volgorde van prioriteit):
1. `window.sa_event()` — SA's eigen functie (Image pixel), als SA-script geladen is
2. `navigator.sendBeacon()` — overleeft page unloads, gebruikt voor navigatie-events
3. Event buffer — events die vuren voordat SA geladen is worden gequeued en geflusht

**Twee typen tracking functies:**
- `trackEvent()` — voor kliks die op de pagina blijven (drawer openen, chatbot, etc.)
- `trackBeforeNav()` — voor kliks die wegnavigeren (bottom nav Agenda/POIs, externe links). Gebruikt sa_event + sendBeacon dubbel om verlies te voorkomen

### Impressie-tracking (IntersectionObserver)
Automatische `*_viewed_mobile` events wanneer een sectie 30% zichtbaar wordt in de viewport (1x per sessie):
- `program_card_viewed_mobile` — ProgramCard blok zichtbaar
- `today_events_viewed_mobile` — TodayEvents blok zichtbaar
- `map_preview_viewed_mobile` — MapPreview blok zichtbaar

### Event Inventaris (50 events)

**Chatbot** (6): `chatbot_opened`, `chatbot_message`, `chatbot_quick_tip_van_de_dag`, `chatbot_quick_programma_samenstellen`, `chatbot_quick_zoeken_op_rubriek`, `chatbot_quick_routebeschrijving`

**POI** (7): `poi_card_clicked`, `poi_detail_opened`, `poi_menu_clicked`, `poi_reservation_clicked`, `poi_booking_clicked`, `poi_similar_clicked`, `poi_website_clicked`

**Events/Agenda** (2): `event_card_clicked`, `event_detail_opened`

**Navigatie** (7): `logo_clicked`, `nav_link_clicked`, `footer_link_clicked`, `social_link_clicked`, `hamburger_menu`, `mobile_bottom_nav_*`, `scroll_to_top`

**Onboarding** (4): `onboarding_step_N`, `onboarding_completed`, `onboarding_dismissed`, `onboarding_choice`

**Homepage impressies** (3): `program_card_viewed`, `today_events_viewed`, `map_preview_viewed`

**Content** (4): `tip_of_day_viewed`, `program_item_clicked`, `program_details_clicked`, `program_cta_clicked`

**Overig** (17): `language_changed`, `wcag_modal_opened`, `search_used`, `search_result_clicked`, `category_button`, `filter_applied`, `cta_clicked`, `contact_form_submitted`, `newsletter_subscribed`, `ticket_buy_clicked`, `reservation_search_clicked`, `reservation_slot_clicked`, `faq_toggled`, `gallery_opened`, `banner_link_clicked`, `banner_dismissed`, `today_events_more_clicked`, `map_preview_clicked`

### Naamconventie
`{component}_{actie}_{device}` — device wordt automatisch gedetecteerd (`mobile` < 768px, anders `desktop`)

### Scripts (geladen in layout)
```html
<script src="https://scripts.simpleanalyticscdn.com/latest.js" />     <!-- pageviews + sa_event() -->
<script src="https://scripts.simpleanalyticscdn.com/auto-events.js" /> <!-- outbound, emails, downloads -->
<script src="https://scripts.simpleanalyticscdn.com/inline.js" />      <!-- data-sa-event HTML attributen -->
```

### Getrackte Componenten (27 bestanden)

**hb-websites (mobiel + Next.js desktop):**
analytics.ts, MobileBottomNav, MobileHeader, OnboardingSheet, ProgramCard, TipOfTheDay, TodayEvents, MapPreview, ChatbotWidget, PoiDetailDrawer, EventDetailDrawer, Nav, Footer, SearchBar, ButtonRenderer, ChatbotButton, Button, PoiCard, EventCard, PoiGrid, EventCalendar, ContactForm, Newsletter, TicketShop, ReservationWidget, Faq, Gallery, Banner

**customer-portal (desktop SPA):**
analytics.ts, Header, Footer, POICard, POIDetailModal, HoliBotContext

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
# BullMQ jobs (verwacht: 65)
cd /var/www/api.holidaibutler.com/platform-core
node -e "const { Queue } = require('bullmq'); const Redis = require('ioredis'); async function c() { const conn = new Redis(); const q = new Queue('scheduled-tasks', { connection: conn }); const jobs = await q.getRepeatableJobs(); console.log('Jobs:', jobs.length); await q.close(); await conn.quit(); } c();"
```

---

---

## 🔄 Git Workflow & Deployment (KRITIEK)

> **Ingevoerd**: 10 april 2026 — Repo consolidatie. Server is LEADING, lokaal is secondary.

### Principe: Server = Single Source of Truth

```
SERVER (Hetzner)                    GitHub                     LOKAAL (Windows)
/var/www/api.holidaibutler.com/     FrankSpooren/HolidaiButler C:\Users\frank\HolidaiButler
        |                                ^                           |
   GIT ROOT ---- git push -------->  CENTRAL REMOTE  <-- git pull -- SECONDARY
   (LEADING)                        (BACKUP+SYNC)               (ALLEEN LEZEN)
```

- **Alle code-wijzigingen** gebeuren op de SERVER via SSH (`ssh root@91.98.71.87`)
- **GitHub** is de centrale remote voor backup en synchronisatie
- **Lokaal (Windows)** is een clone voor inzage — NIET voor directe edits
- Bij laptop-crash gaat NIETS verloren: alles staat op server + GitHub

### Git Root & Repo Structuur

| Pad (relatief aan git root) | Beschrijving |
|-----------------------------|-------------|
| `platform-core/` | Backend API (PM2 #9: src/index.js) |
| `admin-module/` | React frontend (src/) + standalone backend (server.js, routes/) |
| `customer-portal/` | React customer frontend (source) |
| `hb-websites/` | Next.js publieke websites (PM2 #5) |
| `ticketing-module/` | Standalone ticketing service (PM2 #1) |
| `agenda-module/` | Standalone agenda service (PM2 #0) |
| `reservations-module/` | Standalone reservations (toekomstige upgrade) |
| `infrastructure/` | Apache vhost configs |
| `docs/` | Strategie, compliance, API docs, archive/ |
| `.github/workflows/` | CI/CD pipelines |

### Branch Strategie: dev > test > main

| Branch | Doel | Server omgeving | Wanneer deployen |
|--------|------|-----------------|------------------|
| `dev` | Actieve ontwikkeling | dev.* subdomeinen | Na elke fase/feature |
| `test` | Klant-review en QA | test.* subdomeinen | Na Frank goedkeuring op dev |
| `main` | Productie (LIVE) | Hoofddomeinen | Na Frank goedkeuring op test |

### Standaard Werkflow (per opdracht/fase)

```bash
# 1. WERK op de server (altijd op feature branch of dev)
ssh root@91.98.71.87
cd /var/www/api.holidaibutler.com

# 2. Feature branch (bij grotere wijzigingen)
git checkout dev
git pull origin dev
git checkout -b feature/naam-van-feature

# 3. Wijzigingen maken in code (edit, test, verifieer)

# 4. Commit + push naar GitHub
git add <specifieke bestanden>
git commit -m "feat/fix/docs: beschrijving"
git push origin feature/naam-van-feature

# 5. Merge naar dev (na bewijs dat het werkt)
git checkout dev
git merge feature/naam-van-feature
git push origin dev

# 6. Deploy dev-omgeving
#    Backend: pm2 restart holidaibutler-api
#    Admin:   cd admin-module && npm run build, deploy naar admin.dev.*
#    Websites: cd hb-websites && npm run build && pm2 restart hb-websites

# 7. WACHT OP FRANK REVIEW

# 8. Promotie naar test (na goedkeuring)
git checkout test && git merge dev && git push origin test
#    Deploy test-omgeving (zelfde stappen, test.* paden)

# 9. Promotie naar main (na test-goedkeuring)
git checkout main && git merge test && git push origin main
#    Deploy productie (zelfde stappen, hoofddomeinen)
#    ALTIJD: pm2 save na productie-deploy
```

### Deploy Paden per Component

| Component | Build | Deploy locatie (prod) | PM2 |
|-----------|-------|----------------------|-----|
| platform-core | geen (Node.js direct) | in-place | `pm2 restart holidaibutler-api` |
| admin-module frontend | `npm run build` | `/var/www/admin.holidaibutler.com/` | geen (static) |
| hb-websites | `npm run build` | in-place (.next/) | `pm2 restart hb-websites` |
| customer-portal | `npm run build` | `/var/www/holidaibutler.com/customer-portal/` | geen (static) |

### Lokaal Synchroniseren

```bash
# Op Windows (alleen wanneer je lokaal wilt inzien)
cd C:\Users\frank\HolidaiButler
git pull origin dev
```

### Regels

1. **NOOIT lokaal committen en pushen** — altijd via de server
2. **NOOIT direct op main werken** — altijd dev, dan test, dan main
3. **NOOIT git push --force** zonder expliciete toestemming van Frank
4. **ALTIJD specifieke bestanden stagen** (`git add bestand.js`) — NIET `git add -A`
5. **ALTIJD GitHub pushen** na elke commit — server + GitHub moeten in sync zijn
6. **Feature branches** voor grotere wijzigingen (meer dan 5 bestanden), direct op dev voor kleine fixes
7. **PM2 save** na elke productie-deploy: `pm2 save`


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
| **4.46.0** | **2026-04-12** | **Content Studio Analytics & Calendar Fixes**. **FIX 13 (Publish Performance Record)**: `publishItem()` maakt nu direct na succesvolle publish een initieel `content_performance` record aan (0-waarden), zodat gepubliceerde items onmiddellijk zichtbaar zijn in Analytics. BullMQ analytics collector vult later echte metrics aan. **FIX 14 (Calendar Edit Button)**: Kalender day-detail dialog had geen Bewerken knop. Edit-button toegevoegd die ConceptDialog opent via `onEditConcept(concept_id)` callback. `GET /content/calendar` retourneert nu `concept_id` per item. **FIX 15 (Auto-Fill Concept+Images)**: `POST /content/calendar/auto-fill` maakte items zonder `content_concepts` parent (onzichtbaar in Content Items) en zonder images. Nu maakt auto-fill concept+item+image per gegenereerd item via `selectImages()`. **FIX 16 (Orphan Repair)**: 30 orphan Calpe items retroactief aan concepts gekoppeld. 0 orphans remaining. **Bestanden**: 3 gewijzigd (`adminPortal.js`, `ContentCalendarTab.jsx`, `ContentStudioPage.jsx`) + `publisher/index.js`. |
| **4.48.0** | **2026-04-12** | **Media Library v2.0 Enterprise Upgrade (ML-1 t/m ML-4, 20 opdrachten)**. **ML-1 Schema+Backend**: media tabel 12 naar 40 kolommen (+28: alt_text 5 talen, tags/tags_ai, owner/rights, GDPR consent/license, media_type, location, quality_tier, perceptual_hash, ai_processed, versioning, usage tracking). 4 nieuwe tabellen (media_collections, media_collection_items, media_versions, media_audit_log). mediaService.js + mediaRoutes.js (23 endpoints) + mediaCollectionRoutes.js (10 endpoints). BullMQ media-processing pipeline. Pexels import. **ML-2 Frontend Rebuild**: 15 componenten (~2.500 LOC): MediaGrid (grid/list/masonry), MediaFilterDrawer (10-dimensie), MediaDetailDialog (5 tabs), MediaUploadDialog (drag-drop+AI polling), MediaCollectionsDrawer, MediaBulkActionsBar, PexelsSearchTab, MediaCleanupTab. MediaPage.jsx herbouwd. **ML-3 Image Editor+AI**: MediaImageEditor (crop/resize/12 Instagram filters/adjust/social presets). 3 AI endpoints (enhance, alt-text 5 talen, retag). Content Studio MediaSidebarPanel. Smart image suggestions. Usage tracking + cleanup. **ML-4 GDPR+Performance**: Consent tracking, export, license expiry cron. Cache-Control 24h+ETag. i18n 5 talen (~140 keys). PubliQio standalone verified. **Bestanden**: 35 (5 nieuw backend, 14 nieuw frontend, 7 gewijzigd backend, 3 gewijzigd frontend, 5 i18n, 1 migration SQL, ~5.757 LOC). 285 admin endpoints (was 252). adminPortal.js v3.47.0. 66 BullMQ jobs. |
| **4.47.0** | **2026-04-12** | **Content Studio UX: Sanitization, Tooltips & Undo**. **FIX 17 (Auto-Fill Sanitization)**: `POST /content/calendar/auto-fill` was de enige generatie-route zonder `sanitizeContent()`. Nu worden titel + body gesanitized voor opslag. AI prompt versterkt met strikte no-markdown regels. **FIX 18 (7 Action Button Tooltips)**: Enterprise UX tooltips op alle actiebuttons: Vul kalender met AI, Auto-inplannen, Nieuw Item, Campagne, Genereer Suggesties, Keyword. Elke tooltip legt de functie en verwachte output uit. **FIX 19 (Undo Functionaliteit)**: Na elke bulk AI-operatie verschijnt Snackbar met "Ongedaan maken" knop (15s zichtbaar). Auto-fill: soft-deletes concepts+items. Auto-inplannen: revert scheduled→approved. Campagne: soft-deletes concepts+items. **Bestanden**: 4 gewijzigd (`adminPortal.js`, `ContentCalendarTab.jsx`, `ContentStudioPage.jsx`, `publisher/index.js`). |
| **4.45.0** | **2026-04-11** | **PubliQio Content Studio — Multi-Tenant Fixes & BUTE Publishing (10 fixes)**. **FIX 1 (Manual Item Invisible)**: `POST /content/items/generate` manual pad maakte alleen `content_items` rij aan zonder `content_concepts` parent → items onzichtbaar in concept-based listing. Nu maakt manual creation eerst concept aan, dan item met `concept_id`. 2 orphan BUTE items gerepareerd. **FIX 2 (Repurpose contentType crash)**: `contentGenerator.js` `repurposeContent()` gebruikte undefined `contentType` variabele → `sourceItem.content_type`. **FIX 3 (Concept Image Resolution)**: `GET /content/concepts/:id` retourneerde items zonder server-side image resolution (in tegenstelling tot `GET /content/items`). Volledige image resolution (poi: + media: + fallback) toegevoegd aan concept detail endpoint. **FIX 4 (Misplaced Media File)**: Media id=147 fysiek in `storage/media/1/` maar DB `destination_id=10` → 404. Bestand gekopieerd naar `storage/media/10/`. **FIX 5 (Empty Body Repurpose)**: Nieuw `generateFromTitle()` functie in contentGenerator.js — genereert verse platform-content op basis van titel + brand context wanneer bronitem geen body heeft (handmatig aangemaakt items). **FIX 6 (AI Markdown Artifacts)**: `generateFromTitle()` miste `sanitizeContent()` + `formatForPlatform()` pipeline. Toegevoegd + prompt versterkt met strikte no-markdown regels (conform bestaande generatiefuncties). **FIX 7 (Publisher filepath SQL Error)**: `publisher/index.js` `resolveMediaLibrary()` deed `SELECT filepath` op `media` tabel — kolom bestaat niet → silent SQL error → `social_metadata.image_url` nooit gezet → Instagram publish faalt. Query gecorrigeerd. **FIX 8 (Instagram Per-Destination Account)**: `metaClient.js` gebruikte hardcoded ENV `INSTAGRAM_BUSINESS_ACCOUNT_ID` voor alle destinations. Nu leest publisher `igAccountId` uit `social_accounts.metadata` per destination, met ENV fallback. **FIX 9 (BUTE Social Account Config)**: BUTECS System User token versleuteld opgeslagen voor BUTE Facebook (page_id=102939469465160) + Instagram (igAccountId=17841452782960759) social accounts. **FIX 10 (Media Picker Destination Filter)**: `ContentImageSection.jsx` had hardcoded `destCode` mapping (alleen Texel/WarreWijzer, rest=Calpe). Vervangen door numeriek `String(destination_id)` — werkt voor alle destinations. **FIX 11 (Facebook Per-Destination Token)**: `metaClient.js` `_publishToFacebook()` forceerde ENV token (`META_PAGE_ACCESS_TOKEN`) voor page token exchange → BUTE page onbereikbaar vanuit HB API portfolio. Volgorde omgedraaid: per-destination token eerst, ENV fallback. **FIX 12 (Instagram Page Token Exchange)**: Instagram container API had geen page token exchange (gebruikte system user token direct). Page token exchange toegevoegd via `_getPageAccessToken()` met `pageId` uit `social_accounts.metadata`. Beide BUTE publishes (Facebook + Instagram) succesvol geverifieerd. Admin-module rebuild + deploy. **Bestanden**: 5 gewijzigd (`adminPortal.js`, `contentGenerator.js`, `publisher/index.js`, `metaClient.js`, `ContentImageSection.jsx`). |
| **4.44.0** | **2026-04-10** | **Corporate Landing Page Upgrade — holidaibutler.com (9 opdrachten)**. Volledige redesign van de B2B corporate pagina. **Opdracht 1 (Badges)**: 4 badges (EU-First, White Label, Local2Local, Multi-Tenancy) in hero met flagcdn.com EU-vlag, witte icon-cirkels. **Opdracht 2 (Hero)**: "25 AI Agents. Eén Platform. Nul concessies." + 2 CTA buttons (Demo Aanvragen modal + Platform Ontdekken). **Opdracht 2+ (Demo Modal)**: Contactformulier naar `demo_requests` tabel (source: `corporate_landing`), veld Functie, zakelijke e-mail validatie (40+ consumer-domeinen geblokkeerd), GDPR consent + privacybeleid link. **Opdracht 3 (Module Cards)**: 9 gecorrigeerde USP-teksten (Ongelimiteerd POIs, 35+ blocks zonder code, 100+ talen, PubliQio standalone, etc.). **Opdracht 4 (Stats)**: Count-up animatie (easeOutCubic, IntersectionObserver): 251 API Endpoints → 100+ Talen → 35+ Blocks → 25 AI Agents → 1 Platform. **Opdracht 5 (Proces)**: "Van Data, via Beleving tot Resultaat" — 3 fasen (Data/Configuratie & Modules/Groei) met groene cards + pijlen + 3 KPI proof points (HubSpot 2026, Statista/Kantar 2024, ETC 2025) met bronlinks. **Opdracht 6 (Showcase)**: CalpeTrip, TexelMaps, PubliQio als live projecten + WarreWijzer/Alicante in voorbereiding. **Opdracht 7 (EU-Stack)**: 6 EU-providers met landenvlaggen (flagcdn) in donkere sectie. **Opdracht 8 (CTA)**: Dual-button CTA + contactinfo + productenbalk. **Opdracht 9 (Responsive + i18n)**: Hamburger menu mobiel, taal-dropdown met vlaggen (PubliQio patroon), i18n.js extern vertaalbestand (162 keys × 5 talen: NL/EN/DE/ES/FR), scroll-snap carousels op mobiel (85% viewport + peek), floating CTA, mobiele padding optimalisatie. **Privacy**: `privacy.html` — 11-secties GDPR-compliant pagina in HB design + PubliQio PrivacyPage.jsx geharmoniseerd (zelfde structuur, info@, Frank Spooren, AP contactgegevens, AVG artikelnummers, 72h/24h SLA's). **Bestanden**: 3 nieuwe (`i18n.js`, `privacy.html`, admin-module PrivacyPage.jsx update) + `index.html` volledig herbouwd (~850 LOC). |
| **4.43.1** | **2026-04-09** | **PubliQio Post-Release Polish**. (1) Hero punt-uitlijning: losse "." na PubliQio wrappte naar eigen regel op mobiel → nu als `suffix="."` in PubliQioText component (geen line-break mogelijk). (2) EU badges balk mobiel responsiviteit: kleinere cirkels (28px xs), compactere gap, op xs alleen icoon + korte naam (geen subtitle), op sm+ volledige tekst. 1 bestand (LoginPage.jsx). |
| **4.43.0** | **2026-04-09** | **PubliQio Landing Page Polish & Branding (10 opdrachten)**. **Opdracht 1 (PubliQio Merknaam)**: Herbruikbaar `PubliQioText` component (witte tekst + groene Q #02C39A), toegepast op 9 locaties: header logo (vergroot 1.35rem), hero headline ("Publiceer slimmer. Sneller. Beter. PubliQio."), USP sectie-titel ("Waarom PubliQio?"), 2 tabel-titels ("PubliQio vs. concurrentie/bureau/intern" met italic witte "vs."), 2 tabel kolomheaders (wit + groene Q), social proof quote, footer logo. Alle i18n keys bijgewerkt (5 talen). **Opdracht 2 (7e USP)**: "🔍 Multi-Source Trending Analyse" als brede card onder 3×2 grid (desktop) + 7e item in horizontale scroll-snap carousel (mobiel). i18n 5 talen. **Opdracht 3 (Realistische Mockup)**: ConceptMockup.jsx volledig herbouwd: header met "calpe playas" + "Deels live" badge, Facebook/Instagram platform tabs, beach foto uit Calpe POI-database (poi_id 15, Playa Arenal), content tekst + hashtags, FB preview card, Validatie panel (5 metrics), Tip-box, "Sluiten" footer. **Opdracht 4 (Mobiele Mockup)**: Progressive disclosure: compact preview (max 200px) + gradient fade + "Bekijk volledig ▾" expand/collapse knop. Desktop ongewijzigd. **Opdracht 5 (Taalswitch Vlaggen)**: flagcdn.com vlag-iconen (20×15px) in header button + dropdown (NL/GB/DE/ES/FR). **Opdracht 6+7 (Login + Demo Popup Dark Theme)**: Beide dialogen: bgcolor #15293F, PubliQio logo, witte inputs met teal focus, gele submit-knop (#F2C94C), floating label fix (shrink bgcolor #15293F). Demo popup: "Functie" veld toegevoegd, zakelijke e-mail validatie (35+ consumer-domeinen geblokkeerd), consent tekst GDPR-aangepast. **Opdracht 8 (Footer)**: PubliQio logo + "EU-First AI Content Studio" + "Powered by HolidaiButler" + EU vlag via flagcdn (emoji-fix desktop) + Privacybeleid link. **Privacybeleid**: Nieuwe `/privacy` route + `PrivacyPage.jsx` — 11-secties GDPR-compliant privacybeleid in PubliQio dark theme (verwerkingsverantwoordelijke, gegevenstypen, rechtsgrondslag, bewaartermijnen, 5 EU-verwerkers, 7 AVG-rechten, beveiliging, cookies, EU AI Act transparantie, klachten, wijzigingen). **Opdracht 9 (Admin Sidebar)**: `Sidebar.jsx` domein-aware: studio.holidaibutler.com → "PubliQio" logo + "AI Content Studio", admin.holidaibutler.com → "HolidaiButler Admin Portal" (ongewijzigd). **Per-user voorkeurstaal**: `preferred_language VARCHAR(5)` kolom op admin_users + Users tabellen. Login response bevat preferred_language. Nieuw endpoint PATCH /auth/language (252 totaal). Frontend: landing page taalswitch → localStorage persist, login → auto-apply preferred_language, SettingsPage → server sync. Domain-default: .com=EN, .es=ES, .nl=NL. **Bestanden**: 3 nieuwe (PrivacyPage.jsx, publiqio-favicon.svg) + 8 gewijzigd (LoginPage.jsx, ConceptMockup.jsx, LoginDialog.jsx, DemoRequestDialog.jsx, Sidebar.jsx, App.jsx, SettingsPage.jsx, adminPortal.js) + 5 i18n JSON + i18n/index.js. adminPortal.js v3.44.0. |
| **4.42.0** | **2026-04-08** | **Studio Landing Page Upgrade — studio.holidaibutler.com (7 opdrachten)**. Volledige redesign van de Content Studio landing page conform design spec `studio_landing_page_design.html`. **Opdracht 1 (Layout)**: Sticky header (logo text + taalswitch + teal outlined login button), hero 2-col (copy+CTA links + `ConceptMockup.jsx` light card rechts met Tapas Trails content + Social Score 81/100 + checklist), login-card uit body → `LoginDialog.jsx` popover, nieuwe `DemoRequestDialog.jsx` met 5 velden + consent, nieuwe tabel `demo_requests` + `contact.js` persist-logic voor lead capture bewezen via live row (id=1 Frank Spooren). **Opdracht 2 (USP cards)**: 6 cards (🎯 ConceptDialog, 🚀 1-Click Campagne, 🧠 Zelflerende AI, 📊 Smart Analytics, 🎨 Hyper-Gepersonaliseerd, 📅 Slimme Kalender), dark `#15293F` cards met teal hover glow, desktop 3×2 grid, mobile horizontal scroll-snap (85% viewport + peek, geen stateful carousel meer). **Opdracht 3 (EU-First badges)**: Balk tussen hero en USP sectie met bgcolor `#15293F`, 5 badges in 32×32 uniforme cirkels: EU AI Act logo + GDPR logo (custom images in `/public/studio/`) + 3 vlaggen via `flagcdn.com/w80/` (Windows flag-emoji fix), GDPR `transform: scale(1.35)` voor gelijke visuele ring-dikte. **Opdracht 4 (Tabel 1)**: 16 features × 4 kolommen (Studio/Hootsuite/Jasper + Buffer→verwijderd na feedback), native `<table>` via `Box component="table"`, dark `#15293F` wrapper, teal highlight col op ACS, zebra rows, hover teal wash, `FeatureIcon` text glyphs (✓/⚠/✗) met semantic colors, footer tagline "16/16 ✓", inline legenda eronder. Min-width 560px met horizontal scroll mobiel. **Opdracht 5 (Tabel 2)**: 11 criteria × 3 kolommen (Studio/Intern/Bureau), inline icon + tekst per cel (niet alleen glyph), criterium-kolom fontWeight 700. Zelfde dark styling als tabel 1. **Opdracht 6 (i18n NL/EN/DE/ES/FR)**: Nieuwe `auth.studio.*` namespace in alle 5 JSON bundels (~150 keys per taal), `fr.json` NIEUW bootstrapped uit `en.json`, `STUDIO_LANGUAGES` + FR, `USP_ITEMS`/`COMPARE_FEATURES`/`COMPARE_ALTERNATIVES` herstructureerd met key-based i18n lookup, volledige vertalingen voor hero/CTAs/badges/USPs/16 features/11 criteria + 33 cel-teksten/demo dialog/login dialog/footer. Twee one-off Node patch scripts gebruikt en verwijderd. **Opdracht 7 (Polish)**: Social proof blockquote sectie tussen tabel 2 en footer (dark `#15293F` card met decoratieve `"` teal 25% opacity, italic quote, teal cite "Early Access Partner, maart 2026"), security note sectie verwijderd, footer herwerkt (hb-logo image weg, alleen tekst "Powered by **HolidaiButler** · EU-First AI Platform · © 2026" + 🇪🇺 regel). **Kritieke fixes tijdens iteraties**: demo dialog label-focus overlap (pb:2 + mt:1.5 spacing), login dialog zelfde fix, flag emoji → flagcdn PNGs, EU badges bar zichtbaarheid (transparent gradient → solid `#15293F`), ConceptMockup dark→light voor contrast. **Design tokens canoniek**: page `#0D1B2A`, panel `#15293F`, border `#2A3A4A`, accent teal `#02C39A`. Memory bestand `project_studio_landing_tokens.md` aangemaakt. **Bestanden**: 2 nieuwe (`ConceptMockup.jsx`, `LoginDialog.jsx`, `DemoRequestDialog.jsx` in `components/studio/`) + 1 gewijzigd (`pages/LoginPage.jsx` — volledig herbouwde studio-tak, ~900 LOC), 5 i18n JSON files + `i18n/index.js`, 1 backend (`routes/contact.js` + nieuwe `demo_requests` tabel). **Werkprotocol**: strikt sequentieel, pre-flight diagnose met bewijs, scope-beperking per opdracht, geen stapelen van feedback — kwaliteitsdoel bereikt na Frank's eerste pass-verificatie per opdracht. adminPortal.js versie ongewijzigd (geen backend endpoints toegevoegd, alleen DB tabel + route wijziging). |
| **4.41.0** | **2026-04-07** | **Content Studio State-of-the-Art Polish — De Laatste 5% (6 opdrachten)**. **Opdracht 1 (Command Palette Cmd+K)**: Nieuw `CommandPalette.jsx` (~210 LOC), MUI Dialog + fuzzy search + 3 secties (Navigatie/Acties/Recent), role-aware (admin-only items), arrow-key navigatie + Enter/Esc, recent items via `contentService.getItems(destId, {limit:5})`, globale `Cmd+K`/`Ctrl+K` hotkey gemount in `AdminLayout.jsx`. **Opdracht 2 (Kalender Drag & Drop)**: `@dnd-kit/core` `DndContext` + `useDraggable` items + `useDroppable` day cells + `DragOverlay` op `ContentCalendarTab.jsx`. Backend `PATCH /content/items/:id/reschedule` SQL filter verruimd: `approval_status IN ('draft','scheduled')` (cancel-schedule onveranderd). Behoud uur/min van bestaande planning, snackbar feedback, droptarget highlight (#FFF3E0 + oranje border). Alleen draggable voor draft+scheduled. **Opdracht 3 (A/B Variant Generatie)**: Nieuwe `generateAlternative()` functie in `contentGenerator.js` (~100 LOC, temperature 0.9, prompt "compleet andere invalshoek/structuur/hook", geen DB-write). `POST /content/items/:id/improve` accepteert `{mode:'alternative'}` → routeert naar generateAlternative (geen extra endpoint). Frontend `contentService.generateAlternative(id)` + `ConceptDialog` ShuffleIcon naast AI Herschrijven (beide blog + social headers) + split-view Dialog (origineel links, alternatief rechts met primary border) + `Gebruik alternatief` overschrijft body. **Opdracht 4 (Content Recycling)**: ALTER TABLE `content_suggestions` + `source VARCHAR(50)` + `original_item_id INT NULL`. Nieuw `contentRecycleService.js` — vindt top-5 published items >30 dagen oud per destination via JOIN content_performance, dedup-check op pending/approved recycle suggestions, INSERT met `source='recycle'` + `♻️ Hergebruik:` titel-prefix. Scheduler: `content-recycle-suggestions` cron `0 7 * * 2` (dinsdag 07:00 Europe/Amsterdam). Worker case + JOB_ACTOR_MAP entry. **Smoke-test PASS** op live DB destination 1: 0 candidates (alle published <30 dagen, correct). **63 BullMQ jobs totaal** (was 62). **Opdracht 5 (Micro-Interacties)**: 5/5 met `prefers-reduced-motion` fallback. (1) ConceptDialog Tabs `transition: color/background/border-bottom 200ms ease`. (2) Concept-tabel rij hover-lift `translateY(-1px) + boxShadow 1` (150ms). (3) Nieuwe `AnimatedScoreChip.jsx` (~35 LOC, requestAnimationFrame easeOutCubic 400ms count-up 0→score), gebruikt in beide SEO chips ConceptDialog. (4) Kalender "⚠ Gat" `@keyframes hbGapPulse` (opacity 1↔0.5, 2s infinite). (5) Bulk toolbar `@keyframes hbSlideDown` (translateY(-100%)→0, 250ms cubic-bezier) op beide bulk toolbars (items + suggesties). **Opdracht 6 (Documentatie + QA)**: CLAUDE.md v4.41.0, MS v8.02. Bestanden: 4 backend (`adminPortal.js` v3.43.1, `contentGenerator.js`, `scheduler.js`, `workers.js` + nieuwe `contentRecycleService.js`) + 6 frontend (`CommandPalette.jsx` NIEUW, `AnimatedScoreChip.jsx` NIEUW, `AdminLayout.jsx`, `ContentCalendarTab.jsx`, `ConceptDialog.jsx`, `contentService.js`, `ContentStudioPage.jsx`). |
| **4.40.0** | **2026-04-07** | **Content Studio Enterprise Redesign — Opdrachten 5-8 voltooid (Command v1.0 100% compleet)**. **Opdracht 5 (Platform Toevoegen / Repurpose als Tab)**: ConceptDialog `+ Platform` Tab functioneel gemaakt — opent dialog met alle 8 platforms (bestaande gedimd met checkmark), klik genereert nieuwe versie via bestaande `repurposeContent()` en koppelt aan zelfde `concept_id` zodat de nieuwe versie als nieuwe tab in hetzelfde concept verschijnt. Auto-switch naar nieuwe tab. Delete-knop per platform-versie (rode prullenbak) in rechter paneel met confirm + status-aware (niet voor reeds gepubliceerde items). Beide acties triggeren `onUpdate()` zodat de parent ContentStudioPage tabel-chips realtime refreshen. Tabs-rij niet meer verborgen voor blogs (was bug: `!isBlog` filter weggehaald). **Opdracht 6 (Content Items Tabel — Concept-Gebaseerd)**: Backend `GET /content/concepts` uitgebreid met `LEFT JOIN content_pillars` (pillar_name + pillar_color) en `MAX(seo_score)` subquery per concept. **SEO consistentie root cause fix**: `GET /content/items/:id/seo` updateedde wel `seo_data` JSON maar niet de `seo_score` kolom → tabel toonde 65 terwijl popup live 75 herberekende. Nu wordt `seo_score = analysis.overallScore` mee gepersisteerd. Kolomheader "Score" → "SEO" met tooltip die verschil met Brand Score uitlegt. Frontend: filterbalk Pillar (kleur-dot Select) + Score≥ drempels (50/60/70/80/90), Score chip 4-staps kleurschaal met pillar-dot+naam onder de score, branded platform chips (Facebook #1877F2, Instagram #E4405F, LinkedIn #0A66C2, YouTube rood, X/TikTok zwart, Pinterest, Website groen) met status-icoon (✓ ⏱ ✎). Sticky bulk toolbar verplaatst uit overvolle header naar dedicated balk boven filter-rij: Approve / Publiceer (iterates publishNow per platform-versie) / Plan in (datetime dialog → bulkSchedule) / Exporteer (CSV download) / Reject / Delete / Wis selectie. TablePagination count: `itemTotal` → `conceptTotal` (toonde flat item-count i.p.v. concept-count). **Opdracht 7 (Trending Monitor + Suggesties Upgrade)**: Backend `trendVisualizer.getTrends` bulk query laatste 4 weken per zichtbaar keyword (GROUP BY year/week_number) → `history[]` + `history_weeks[]` per trend. Nieuwe endpoint `POST /content/suggestions/:id/enrich` (251 totaal) die `brandContext` (profiel/persona/knowledge) + top-5 trending keywords (30d) combineert in Mistral prompt en JSON `{title, summary, keyword_cluster}` terugschrijft. Frontend: SOURCE_META helper voor source-iconen (🔍 Google Trends, 📊 Website Traffic / SISTRIX, 👤 Handmatig), `findMatchingPillar()` token-fuzzy match → gekleurde pillar-dot achter keyword, **inline SVG Sparkline** (vaste 0-10 schaal voor consistentie tussen rijen, score-label boven bar + week-label W11..W14 onder bar, bars per eigen score 4-staps gekleurd, "Geen historie" bij 0 datapunten), nieuwe sorteerbare Trend-kolom op `latestHistoryValue()`, **Score 4-staps kleurschaal** (`getScoreColor` helper: 8.5-10 groen / 6-8.5 blauw / 3.5-6 oranje / 0-3.5 rood) toegepast op trending Score chip + suggesties Score chip + sparkline bars. Suggesties tab: checkbox-kolom + sticky bulk toolbar (Goedkeuren/Afwijzen/Wis), Verrijk-knop (paars `AutoFixHigh`) per pending/approved suggestie, **`SuggestionPreview` platform-aware tooltip** (blog → blog hero met lead, video_script → 16:9 video frame met play-knop, social_post + facebook → timeline-card met like/share footer, + instagram → IG post met header + vierkant + caption + hashtags, + linkedin → zakelijke kaart met avatar + hashtags, X/TikTok/Pinterest → generieke fallback) — toont nu echte content (titel/summary/hashtags) i.p.v. lege gradient. Generieke prullenbak-knop voor ALLE suggestie-statussen behalve `deleted` (oude rejected-only delete verwijderd). **Opdracht 8 (Kalender + Analyse Upgrade)**: Backend `GET /content/calendar` LEFT JOIN content_concepts → content_pillars (`pillar_id` + `pillar_name` + `pillar_color` + `seo_score` per item). `GET /content/analytics/overview` uitgebreid met `summary.ctr` + `growth_ctr`, `top_this_week` (top engagement laatste 7 dagen), `by_pillar[]` (engagement per pillar via JOIN content_concepts → content_pillars), `score_correlation{high_avg_engagement, low_avg_engagement, high_items, low_items, lift_pct}` (avg engagement voor SEO ≥70 vs <70 bucket). Frontend ContentCalendarTab: **K1** pillar kleurcodering (4px linker = pillar, 3px rechter = status, lichte pillar bg, tooltip), **K2** gat-detectie toekomstige werkdagen → oranje dashed border + "⚠ Gat" label, hero berekent `gapCount`, **K3** Auto-Fill hero balk bovenaan (gradient #5E8B7E → #2C3E50, dynamische subtitle "N werkdagen zonder content", grote knoppen). Legenda uitgebreid met Gat/Pillar/Status uitleg. Frontend ContentAnalyseTab: **A1** KPI set herwerkt naar Bereik · Engagement · CTR · Groei% (klikken+views weg, CTR berekend, Groei = avg over engagement/reach/views growth), **A2** Top performer hero (goud/oranje gradient, 🏆, titel + platform + stats), **A3** Pillar donut chart (PieChart + tekstlijst met kleur-dots, absolute engagement, percentages), **A4** Score-correlatie info-kaart (paars 💡, "JA/NEE — items met SEO ≥70 halen X% meer engagement", lift% chip + bucket-gemiddelden). Bestanden: 4 backend (`adminPortal.js` → v3.43.0, `trendVisualizer.js`) + 4 frontend (`ConceptDialog.jsx`, `ContentStudioPage.jsx`, `ContentCalendarTab.jsx`, `ContentAnalyseTab.jsx`, `contentService.js`). 8 commits dev → test → main. |
| **4.39.0** | **2026-04-07** | **Content Studio Image Pipeline Hardening + i18n Blog Titles + BullMQ Generation Queue**. (1) Blog title schema: `title_en/nl/de/es/fr` kolommen op `content_items`, blogs.js serveert localized title via `COALESCE(title_${lang})`, DeepL vertalingen voor 2 live blogs (10 talen totaal). (2) Content generation: BullMQ `content-generation` queue vervangt `setImmediate` (persisted in Redis, 2 retries exponential backoff, dead-letter recovery → concept naar `draft`). Worker concurrency 2, lockDuration 10 min. Startup recovery hook reset orphaned `generating` concepts >15 min oud. (3) Realistic ETA UI: `ContentStudioPage.jsx` toont per content_type (blog 4-6 min, social 35-53 sec) + 5-fase voortgang + "loopt door op achtergrond" melding bij overschrijding. (4) **POI grounding (FIX 1)**: `findRelevantPOIs` herschreven met THEME_MAP (7 thema's) + multi-strategie query (name match + category + google_category) + limit 5→15 voor blogs, prompt versterkt "MUST link AT LEAST 5 verified places". 0 → 15 culture POIs voor "calpe old town". (5) **Image selector (FIX 2)**: title-priority theme detection (alleen Culture & History bij "calpe old town"), theme-first SQL pass (rating ≥4.0, ORDER BY rating × log(reviews)), keyword fallback met theme JOIN. 0/6 → 6/6 culture images. (6) **Centrale media resolver (FIX 3)**: nieuw endpoint `POST /content/media/resolve-batch` (250 endpoints), batch resolutie van mixed ID-formaten (URL/path/`poi:N`/`media:N`/bare numeric), dual-lookup voor legacy bare numbers (imageurls eerst, media library tweede). `ConceptDialog.resolveItemImages` refactored: gebruikt resolver i.p.v. random suggestImages fallback. (7) **Publisher (FIX 4)**: `publisher/index.js` 5-branch resolution (URL/path/`poi:`/`media:`/legacy bare number) met dual-lookup. Lost FB image-loos publish op (was `og:image` fallback naar corporate logo). (8) **ID prefix conventie**: `selectImages` returnt nu canonical prefixed ids (`poi:N`, `media:N`, of HTTP URL), generator passthrough (geen double-prefix meer). 5 backend bestanden + 2 admin bestanden + DB schema. adminPortal.js v3.42.0. |
| 4.38.1 | 2026-04-07 | **Pixtral 12B batch COMPLEET + Image picker UX**. Hybride B/C image keywords project 100% afgerond: 25.426/25.632 images verwerkt (99,2%), 12 errors (0,05%), 206 skipped, **€2,67 totale kosten** (was geschat €6-7), looptijd ~6u met 1x checkpoint resume. Image picker POI-tab UX upgrade: placeholder "Zoek op naam, categorie, sfeer (terrace, romantic, beach)...", helperText uitlegt FULLTEXT zoekbereik, toont poi_category + AI visual_description per resultaat. Backend /content/images/browse retourneert deze velden al. |
| 4.38.0 | 2026-04-06 | **CalpeTrip Blog Live + POI Frontend Fix + Blog Analytics**. POIsPage "Bekijk op frontend" URL fix: holidaibutler.com→calpetrip.com. generateFromPOI timeout 120s→600s. Blog: 2e blog "Plan Your Calpe Trip" gepubliceerd met CalpeTrip mobile screenshot. Blog analytics: 4 SA events (blog_list_viewed, blog_card_clicked, blog_article_viewed, blog_back_clicked). blogs.js URL image resolver (http:// + /path support). |
| 4.37.0 | 2026-04-06 | **Async Content Generation + Content Studio Bug Fixes + Image Keywords + SA v3.0**. Async generatie: /concepts/generate retourneert instant, generatie op achtergrond (setImmediate), frontend pollt status. DB: approval_status ENUM + 'generating'. 8 Content Studio bugs gefixt: Website platform-optie, hashtag afbreking, media_ids/social_metadata opslaan, UTM check, editorial arcering (EDITORIAL_PATTERNS), blog HTML rendering, meta description woordgrens, website_analytics prompt. Image keywords hybride B/C: FULLTEXT search op keywords_verified (26.415 Apify) + keywords_visual (Pixtral 12B, 25.632 images). Image picker POI-tab: zoek op naam, categorie, sfeer, AI-tags (placeholder + helperText + poi_category/visual_description per resultaat). Apify image_id bug fix + 1.208 wees-images geregistreerd. SA analytics v3.0: sendBeacon, IntersectionObserver, 50 events, desktop customer-portal tracking. SEO_MINIMUM_SCORE 50, MAX_ROUNDS 1. |
| 4.36.0 | 2026-04-06 | Content Studio Enterprise Redesign + CalpeTrip Blog. ConceptDialog 2-panel (Opdracht 1-4): platform tabs, body editor, vertaal-tabs, SEO/Brand Score, PlatformPreview, publish/schedule acties, blog-modus (TipTap WYSIWYG). Backend: Facebook publish fix (page ID), content generatie prompt engineering per kanaaltype (Quality Checklist), UTM tracking, em-dash/bullet sanitizer, PLATFORM_LIMITS correctie (FB 500). Blog: public API `/api/v1/blogs`, CalpeTrip.com blog route (customer-portal SPA), BlogGrid block + editor. CalpeTrip hybride architectuur gedocumenteerd. Taaldetectie via Accept-Language header (fallback EN). inline.js 404 fix. |
| 4.35.0 | 2026-04-06 | Simple Analytics Event Tracking v3.0 — Complete Coverage. sendBeacon fallback, 50 events, 27 getrackte bestanden. |
| 4.34.0 | 2026-04-03 | Content Studio Multi-Source Image Integratie. Pexels + Flickr als image bronnen naast Unsplash. imageSelector.js cascading fallback. 2 nieuwe admin endpoints (248 totaal). |
| 4.33.0 | 2026-04-02 | POI Data Pipeline Optimalisatie + Events Distance + i18n Static Pages. Apify maxImages:10, downloadNewImages(), 6 nieuwe DB kolommen, prijsfilter, POI detail action buttons, Texel sync gepauzeerd. 33 bestanden. |

> **Volledige changelog (v3.0.0 - v4.31.0)**: zie CLAUDE_HISTORY.md

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 8.11 |
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
- Hetzner: `/var/www/api.holidaibutler.com/CLAUDE.md` (git root)

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
