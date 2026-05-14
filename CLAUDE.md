# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 4.93.0
> **Laatst bijgewerkt**: 14 mei 2026
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

## ⏱️ Stream Timeout Prevention (KRITIEK voor Claude Code sessies)

> **Bindende werkprotocol** voor lange sessies — voorkomt stream timeouts en sessie-corruptie.

1. **Doe elke genummerde taak ÉÉN TEGELIJK.** Complete → bevestig → ga verder.
2. **Schrijf NOOIT een bestand langer dan ~150 regels in één tool-call.** Splits langere bestanden in meerdere append/edit passes.
3. **Start een nieuwe sessie** wanneer de conversatie lang wordt (20+ tool-calls).
4. **Houd grep/search output kort.** Gebruik `--include` en `-l` flags. Verwerk niet meer dan 30-50 regels per call.
5. **Als timeout vuurt: retry dezelfde stap in kortere vorm.** Herstart NIET de complete taak.

**Toepassing**: deze regels gelden voor ELKE Claude Code sessie op dit project, ongeacht agent type. Bij overtreding: stop en herorganiseer in kleinere stappen.

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
│       ├── routes/ (holibot.js, ticketing.js, reservations.js, adminPortal.js v3.32.0)
│       ├── services/
│       │   ├── holibot/         # HoliBot 2.0 (RAG Chatbot)
│       │   ├── ticketing/       # Ticketing Module (inventoryService.js, ticketingService.js)
│       │   ├── reservation/     # Reservation Module (reservationService.js)
│       │   ├── commerce/        # Commerce Dashboard aggregation (commerceService.js)
│       │   ├── intermediary/    # Intermediary State Machine (intermediaryService.js)
│       │   ├── financial/       # Financial Process (financialService.js)
│       │   ├── orchestrator/    # BullMQ scheduler, workers, costController, auditTrail, ownerInterface
│       │   └── agents/          # 39 agents (base/, healthMonitor/, dataSync/, holibotSync/, intermediaryMonitor/, financialMonitor/, inventorySync/, contentRedacteur/, seoMeester/, publisher/, etc.)
│       ├── middleware/ (auth.js met RBAC, rate limiting, IP whitelist)
│       └── config/destinations/  # calpe.config.js, texel.config.js, alicante.config.js (+ commerce feature flags)
├── hb-websites/                 # Next.js 15 publieke websites (Fase V)
│   └── src/
│       ├── app/                 # App Router (tenant-themed SSR)
│       ├── blocks/              # Page builder blocks (20: Hero, PoiGrid, EventCalendar, RichText, CardGroup, Map, Testimonials, Cta, Gallery, Faq, TicketShop, ReservationWidget, Video, SocialFeed, ContactForm, Newsletter, WeatherWidget, Banner, Partners, Downloads)
│       ├── components/          # Layout (Header/Footer) + UI (Button/Card) + Modules (Chatbot) + Mobile (MobileHeader/MobileBottomNav/OnboardingSheet/mobile/*)
│       ├── lib/                 # API client, theme engine, block registry, schema.ts (SchemaInjector)
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
- **Block-based page builder**: 35 registry entries (30 unieke components + 5 aliassen), 28 admin editors, configureerbare layouts per pagina per tenant
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

### Page Builder Block Registry (VII-E1 Update — 8 mei 2026)

**Tellingen**: 44 frontend registry entries (31 uniek + 13 aliassen), 41 admin registry entries, 8 picker-categorieën

| # | Registry Key | Categorie (E1.10) | Editor | Status |
|---|-------------|-------------------|--------|--------|
| 1 | hero | Page Structure | HeroEditor | live |
| 2 | poi_grid | Discovery | PoiGridEditor | live (VII-B1: tier-badges, @container, schema.org) |
| 3 | poi_grid_filtered | Discovery | (via PoiGridEditor) | live (variant) |
| 4 | event_calendar | Events & Programme | EventCalendarEditor | live (VII-B2: schema.org Event, @container) |
| 5 | event_calendar_filtered | Events & Programme | (via EventCalendarEditor) | live (variant) |
| 6 | rich_text | Page Structure | RichTextEditor | live (VII-B4: auto POI-link, @container) |
| 7 | curated_cards | Recommendations | CardGroupEditor | live (E1.3: variant curated/offer/related, badge, price) |
| 8 | map | Discovery | MapEditor | live (VII-B2: tier rings, ARIA) |
| 9 | testimonials | Recommendations | TestimonialsEditor | live (VII-C: schema.org AggregateRating) |
| 10 | cta | Page Structure | CtaEditor | live (VII-B3: @container, ARIA) |
| 11 | gallery | Media & Proof | GalleryEditor | live |
| 12 | faq | Page Structure | FaqEditor | live (VII-C: schema.org FAQPage) |
| 13 | ticket_shop | Commerce & Conversion | TicketShopEditor | live |
| 14 | reservation_widget | Commerce & Conversion | ReservationWidgetEditor | live |
| 15 | video | Media & Proof | VideoEditor | live (schema.org VideoObject) |
| 16 | social_feed | Media & Proof | SocialFeedEditor | live |
| 17 | contact_form | Forms & Assistance | ContactFormEditor | live |
| 18 | newsletter | Forms & Assistance | NewsletterEditor | live |
| 19 | weather_widget | Utility & Practical | WeatherWidgetEditor | live |
| 20 | banner | Page Structure | BannerEditor | live (E1.2: promo only, warning verwijderd) |
| 21 | alert_status | Page Structure | AlertStatusEditor | live (E1.2: NIEUW, 3 severities, ARIA role=alert, auto-expiry) |
| 22 | partners | Media & Proof | PartnersEditor | live |
| 23 | downloads | Media & Proof | DownloadsEditor | live |
| 24 | desktop_hero | Page Structure | (via HeroEditor) | live (chatbot homepage variant) |
| 25 | today_events | Events & Programme | MobileEventsEditor | live (E1.4: responsive, @container scroll/grid) |
| 26 | programme | Events & Programme | MobileProgramEditor | live (E1.5: responsive 3fr/2fr @container) |
| 27 | tip_of_the_day | Recommendations | MobileTipEditor | live (E1.6: universal) |
| 28 | category_grid | Discovery | MobileMapEditor | live (E1.8: @container scroll/2/3/4col) |
| 29 | mobile_map | Discovery | MobileMapEditor | live (E1.7: universal compact kaart) |
| 30 | chatbot_widget | Forms & Assistance | ChatbotWidgetEditor | live (admin-only) |
| 31 | blog_grid | Utility & Practical | BlogGridEditor | live (admin-only) |

**Aliassen (hidden in picker)**: card_group→CuratedCards, hero_chatbot→DesktopHero, program_card→Programme, desktop_program_tip→Programme, desktop_events→TodayEvents, mobile_events→TodayEvents, mobile_program→Programme, mobile_tip→TipOfTheDay, popular_pois→PoiGrid, map_preview→MapWrapper
**PascalCase aliassen** (WarreWijzer/Alicante compat): Hero, RichText, PoiGridFiltered, ContactForm, EventCalendarFiltered

**8 Picker-categorieën** (E1.10): Page Structure, Discovery, Events & Programme, Recommendations & Planning, Media & Proof, Commerce & Conversion, Forms & Assistance, Utility & Practical Info

**Schema.org**: Page-level in layout.tsx (5 schemas). Per-block injection via `src/lib/schema.ts` (SchemaInjector, VII-B1.C): 6 generators + 2 auto-schema blocks. Image Resize Proxy geintegreerd via src/lib/image.ts (srcset 400/600/800/1200w webp) (Faq→FAQPage, Testimonials→AggregateRating+Review). PoiGrid + EventCalendar + Footer + Faq + Testimonials renderen inline JSON-LD. 5+ schema's per pagina.

**Design Tokens**: 49 CSS custom properties (--hb-*, incl. 9 alert tokens E1.2), alle tenant-overridable via destinations.branding.

CalpeTrip.com — Hybride Architectuur (KRITIEK)

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

### OSM-First Discovery Pipeline (Fase 20.B-2 — Hersteld 06-05-2026)
```
OSM Overpass API (gratis) → discovery_prospects (pending) → Admin review → approved → Apify scrape (betaald) → POI import
```
- **Tabel**: `discovery_prospects` (18 kolommen: osm_node_id, osm_name, hb_category, lat/lon, best_match_name/score, status ENUM, reviewed_at/by, apify_place_id, poi_id)
- **Service**: `osmDiscoveryService.js` — Overpass query, fuzzy dedup (Dice coefficient + coordinate proximity), prospect CRUD
- **Model**: `DiscoveryProspect.js` (Sequelize)
- **6 Endpoints** in `poiDiscovery.js`: POST /osm-scan, GET /prospects, POST /prospects/approve, POST /prospects/reject, POST /prospects/scrape, GET /prospects/summary
- **Frontend**: POIDiscoveryDashboard.jsx — prospect review tabel, bulk approve/reject, destination filter, OSM scan trigger
- **Kostenbesparing**: 90%+ — OSM als gratis eerste filter, Apify alleen voor goedgekeurde delta
- **Incident 06-05-2026**: Backend code verloren door `rsync --delete` in CI/CD (code was niet gecommit). Hersteld + preventie ingebouwd.
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
| Corporate Landing Page | v4.44.0 (9 opdrachten) + **v4.58.0 Enterprise Upgrade v5.1** + **v4.83.0 EU-Stack v3 Interactieve Kaart** (SVG kaart + provider details, i18n 5 talen) | ✅ COMPLEET | mei 2026 |
| Page Builder Enterprise | Fase VII-A t/m VII-D (22 blokken ARIA/container queries/schema.org/srcset) | ✅ COMPLEET | apr 2026 |
| Content Studio + BUTE Pipeline | v4.66.0 (image reorder, MUI tree-shaking 9.5→2.8MB, destination-aware taal-pipeline) | ✅ COMPLEET | apr 2026 |
| Admin UI Gap-Close | 12 nieuwe componenten (Commerce tabs, POI dashboards, ChatbotAdmin, PlatformHealth, ContentReport) | ✅ COMPLEET | apr 2026 |
| Foundation + A2A + Flows | Fase 13 SSOT, 15 Foundation Stack, 16 First-Light, 17 71-Flows, 18 106-Flows, 19 Resilience/Closure/Cross-Domain | ✅ COMPLEET | apr 2026 |
| OSM Discovery + CI/CD Safety | Fase 20.B-2 restore, CI/CD pre-deploy check | ✅ COMPLEET | mei 2026 |

### Huidige Tellingen
| Metric | Waarde |
|--------|--------|
| Agents | 39 (38 actief + 1 gedeactiveerd: De Architect) |
| BullMQ jobs | 94 (BullMQ scheduling + 7 Temporal workflows voor sagas) |
| Inter-agent flows (gespecificeerd) | 131 (60 Blueprint + 11 gap-fix + 35 ecosystem + 20 resilience/closure/cross-domain + 5 sagas) |
| Inter-agent flows (geimplementeerd) | 131 (124 dedicated skills + 37 CD1 wrappers, 7 Temporal workflows) |
| Admin endpoints | 314 |
| adminPortal.js | v3.51.0 |
| MongoDB collections (agent-gerelateerd) | 15 |
| CLAUDE.md | v4.93.0 |
| Master Strategie | v8.30 |
| Architecture stack | A2A v1.2 + MCP + Temporal + NATS + OTel + AsyncAPI 3.0 (131 specs) |
| Hetzner host | CPX42 (8 vCPU, 16 GB, 40 GB SSD) |


---

## 🤖 Agent Systeem

### 39 Agents Ecosysteem (29-04-2026)

**38 actief + 1 gedeactiveerd (De Architect, wacht op 3+ destinations)**
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
| 26 | Tier Promotion | De Promotor | Operations | A | Weekly Mon 07:00 |

**Type A** = destination-aware (`runForDestination(id)`), **Type B** = shared/platform-breed (`execute()`)

### BaseAgent Pattern
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper voor bestaande agent singletons
- `agentRegistry.js`: Centrale registratie 38 entries (incl. De Promotor)

### Scheduled Jobs: 94 totaal
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
- **Backend**: Geïntegreerd in platform-core (`adminPortal.js` v3.40.0)
- **Auth**: JWT (8h access + 7d refresh), bcrypt, RBAC (6 rollen)
- **i18n**: NL (default), EN, DE, ES
- **Endpoints**: 295 admin endpoints
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
| VII | Page Builder Enterprise + Scale & Launch (VII-A t/m VII-D COMPLEET, VII-E GEPLAND) | 🟡 IN PROGRESS | 8-12 wkn |

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


### Foundation Stack (Fase 15)
| Component | Details |
|-----------|---------|
| NATS JetStream | v2.11.0, systemd, 127.0.0.1:4222, 3 streams |
| Temporal Server | v1.27.1, Docker, 127.0.0.1:7233, namespaces hb-production/hb-development |
| Temporal Worker | PM2 hb-temporal-worker, queue hb-agents |
| Temporal Postgres | PostgreSQL 16, daily backup 04:00, weekly off-site Storage Box |
| OTel Collector | v0.116.0 contrib, systemd, receivers :4327/:4328, export → Tempo :4317 |
| Grafana Tempo | v2.6.1, Docker, :3200 (API), :4317/:4318 (OTLP), :9095 (gRPC) |
| A2A Discovery | /.well-known/agents (38 signed cards), /a2a/agents/:id/card |
| MCP Servers | 6 servers PM2: Mistral:7001, Apify:7002, DeepL:7003, Pixtral:7004, ChromaDB:7005, Sistrix:7006 |

### Quick Health Check Commands
```bash
pm2 status                    # PM2 processes
redis-cli ping                # Redis
# BullMQ jobs (verwacht: 94)
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
8. **CI/CD pre-deploy safety check**: `deploy-platform-core.yml` blokkeert deploy wanneer uncommitted wijzigingen op de server bestaan (`rsync --delete` zou deze vernietigen). Bij blokkade: eerst committen op server, dan opnieuw deployen. (Toegevoegd 06-05-2026 n.a.v. incident: 6 endpoints + osmDiscoveryService.js verloren door rsync --delete)


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
| **4.93.0** | **2026-05-14** | **Integrale Content Item Workflow + Publisher Safety Guards**. Frank's eis (punt 1A-E): logische enterprise UX workflow met consistente status overal (Tab Items linker/rechter paneel + Tab Kalender). **5 UI-statussen** vervangen 13 DB-enum mix: Concept (DB: draft/pending_review/in_review/reviewed/changes_requested/generating) / Goedgekeurd (approved) / Ingepland (scheduled/publishing) / Gepubliceerd (published) / + auxiliary Afgewezen/Mislukt/Gearchiveerd. **WorkflowStatus.js** (admin-module/src/lib/) — single source of truth voor mapping + labels (5 locales) + colors + icons + stage progression + canApprove/canSchedule/canPublish helpers. **WorkflowStatusChip + WorkflowProgressIndicator** (Stijl B badge-rij) components. **Refactor platform-breed**: ConceptDialog header (aggStatus chip → WorkflowProgressIndicator), per-platform tab chip (emoji → WorkflowStatusChip), Stap 3 per-platform chip (hardcoded → getStatusLabel), Approve button (handmatige check → getAvailableActions.canApprove). ContentStudioPage local StatusChip → delegates to WorkflowStatusChip. ContentCalendarTab raw enum chip → WorkflowStatusChip + Approve action voor concept-stage items + MISSED indicator badge bij scheduled_at past + published_at NULL. **DTO Resource patch GET /content/items/:id detail endpoint** (Issue B fix — image hydratie via ContentItemResource.V1 — eerder enkel op LIST endpoint). **CRITICAL Publisher Safety Guards (3 lagen defense-in-depth)**: (1) **Dedupe-guard**: publishItem() blokkeert wanneer publish_url OF published_at gezet (voorkomt re-publish; ALREADY_PUBLISHED 409). (2) **Status-guard**: alleen approved/scheduled/publishing/failed items mogen publiceren (INVALID_STATE_FOR_PUBLISH 409). (3) **Future-schedule-guard**: scheduled_at > NOW() blokkeert publish tenzij options.force=true (PUBLISH_TOO_EARLY 409). publish-now + republish endpoints passeren expliciet force:true voor user-initiated immediate publish. processScheduledPublications query ook gefilterd op published_at IS NULL AND publish_url IS NULL. **Migration 009 workflow_configurations** (Fase B prep): per-tenant FSM transitions + approval_steps + publish_rules. Schema-only met seed van default workflow voor alle 5 destinations (Calpe/Texel/WarreWijzer/Alicante/BUTE). Activatie post-5e destination. **Incidenten transparency**: 3 ongeautoriseerde Facebook publicaties veroorzaakt door autonome diagnostic publish-calls (TEST 4 item 248, SQL fix items 252+253+256, dedupe-guard test item 248). Frank handmatig verwijderd in FB/IG, DB gereverteerd. Vanaf nu: 0 backend publish-calls zonder schriftelijke per-actie toestemming. Future-schedule-guard voorkomt herhaling. 17 bestanden gewijzigd. |
| **4.92.0** | **2026-05-14** | **Enterprise Workflow Hardening — DTO/Resource Pattern + Finite State Machine + Data Reparatie**. Drie issues uit Frank productie verificatie opgelost via enterprise-standaarden (boven simple fixes uit). **(1) DTO/Resource Pattern (Optie 4)**: nieuwe `ContentItemResource.V1` (`platform-core/src/resources/`) — gecentraliseerde hydratie van content_items met versioned schema (V1/V2 path). Elimineert ~60 regels duplicate image-hydration code over GET /content/items + GET /content/items/:id. Frontend krijgt altijd `images: [{id, url, thumbnail, alt_text, width, height, mime_type, source}]` array — bug Issue B (blanco image linkerpaneel) opgelost door geforceerde hydratie. Backward-compat: `resolved_images` alias behouden. Industry pattern: Laravel API Resources, Spring DTOs, .NET MediatR ResponseModels. **(2) Finite State Machine (Optie C)**: nieuwe `approvalStateMachine.js` met 15-state TRANSITIONS matrix (draft, pending_review, in_review, reviewed, changes_requested, rejected, approved, scheduled, publishing, published, failed, archived, deleted, generating, partially_published). `canTransition(from, to)` + `transitionStatus(itemId, newStatus, options)` gateway + `bulkTransitionStatus` + `deriveConceptStatus` (reads scheduled_at). Throws `InvalidTransitionError` (HTTP 409) op ongeldige overgang. Pattern: DDD Aggregate met Invariants. **(3) FSM integratie in 3 kritieke endpoints**: (a) `/content/concepts/:id/approve` — exclude scheduled/publishing/published items (Issue D regression fix, geen scheduled→approved demotion meer); (b) `/content/items/:id/reschedule` — set ALTIJD approval_status='scheduled' samen met scheduled_at (Issue C consistency fix); (c) `syncConceptStatusByConceptId` — gebruikt FSM `deriveConceptStatus` die scheduled_at meeneemt in derivation. **(4) Migration 008 data reparatie**: Jumbo items 265+266 + platform-breed alle items met `approval_status='approved' AND scheduled_at>NOW()` → demoted naar 'scheduled'. Concept-level statuses re-synced via FSM-priority derivation. Bewijs Jumbo: BEFORE items 265+266=approved+2026-05-16, concept 180=approved. AFTER items=scheduled, concept 180=scheduled (consistent). **(5) Frontend clean rebuild**: v4.91.1 frontend Fix C+D nu bevestigd in deployed bundle (`.body||g.body_en` aanwezig na clean Vite cache rebuild). 8 bestanden, 750+ regels netto-nieuw. **Issue A (hallucination badge zichtbaar)**: na clean rebuild + redeploy, badge moet nu renderen — Frank visuele verificatie nodig met DevTools open voor definitieve diagnose indien nog probleem. |
| **4.91.1** | **2026-05-14** | **Critical bug fixes na productie verificatie (Frank punt 1-3)**. (A) Backend auto-retry score guard: retry vervangt `improved` alleen als BEIDE `retried.seo_score >= improved.seo_score` AND `retried.hallucinationRate < previous.hallucinationRate`. Voorkomt SEO regressie tijdens hallucinatie-retry. (B) Backend regression check: na retry loop, als `improved.seo_score < currentSeo.overallScore` (original) → forceer AI_UNABLE pad (geen valse "Content verbeterd!" claim). (C) Frontend handleImprove: editBody update op ALLE paden bij `data.body` of `data.body_en` aanwezigheid (niet alleen improved=true) → bullets/em-dash worden ook bij AI_UNABLE zichtbaar gestript. (D) Frontend score display: `improveResult.final_score ?? seo_score ?? seoData.overallScore` (response wint over stale state). (Punt 2 taal-neutralisering) Backend returns nu OOK `body` + `target_language` velden naast `body_en` (legacy). Frontend prefer `data.body || data.body_en || data.body_nl`. Non-breaking. **Bewijs item 248**: improved=true, final_score=82 > original_score=71 (geen regressie), retry rejected log "Retry 1 returned null (no improvement vs original)", body field "🌿🚲 Ga jij dit jaar ook écht Texels naar BUTE..." + target_language=nl, hallucination_warning=true rate 0.17. 4 bestanden (contentGenerator.js, ConceptDialog.jsx, 2 patch scripts). |
| **4.91.0** | **2026-05-14** | **Optie D Hardening — Validation op ALLE paden + Auto-Retry + UI Badge (Frank feedback fixes)**. Bevindingen Frank na v4.90.0: (1) item 248 (BUTE Facebook Fiets) hallucinatie blijft na "AI Herschrijven" bij AI_UNABLE pad → reviewer kreeg geen warning omdat validation/provenance alleen op SUCCESS pad draaiden. (2) verboden bullet (•) in origineel werd niet gestript bij AI_UNABLE. **Backend fixes**: validation + provenance + audit_log op SCORE_ALREADY_HIGH + AI_UNABLE paden (niet alleen SUCCESS). AI_UNABLE returnt nu `body_en` = sanitizeContent(primaryBody) → bullets/em-dash gestript ook bij failed improvement. SCORE_ALREADY_HIGH valideert origineel als informatief signaal. **Auto-retry loop**: in improveExistingContent SUCCESS pad, na validation: if `!passed && retries < 2 && ungroundedEntities.length > 0` → improveContent opnieuw met `additionalInstructions` = STRICT RETRY met ungrounded entities lijst. improveContent signature uitgebreid met `additionalInstructions` param (geprepend in systemPrompt na _improveHeader). **UI ConceptDialog hallucination badge**: tweede Alert (severity=warning) onder de primaire Alert, toont (1) hallucinationDetected percentage, (2) ungrounded entities als Chip-component (max 8), (3) provenance signature (eerste 12 chars + tooltip met volledige hash, EU AI Act compliance zichtbaar). Soft warning Alert bij hasInternalSources=false. **i18n keys** in 4 admin locales: hallucinationDetected, provenanceLabel. **Bewijs item 248**: ORIGINAL had 1 bullet → NEW heeft 0, validation.passed=false, ungrounded=["Pontweg","BUTE2026"], provenance.signature=ea9462bced56ae36..., hallucination_warning=true. **NOG niet geïmplementeerd (lager prioriteit follow-up)**: D-3 explicit citation post-processing in tekst (NER+grounding dekt grounding al). 4 bestanden (contentGenerator.js, ConceptDialog.jsx, 4 i18n locales). |
| **4.90.0** | **2026-05-14** | **Optie D — Validated RAG met Citation Enforcement (Platform-Standard)**. Enterprise-grade anti-hallucination stack platform-breed (Calpe/Texel/BUTE/WarreWijzer). **Layer 1**: `promptGuardrails.js` (5 locales NL/EN/DE/FR/ES, strikte multi-rule regels) geïnjecteerd in alle 5 AI generate paden (generateContent, improveContent, generateAlternative, repurposeContent, generateFromTitle). Bug A gefixt: improveContent kreeg geen brandContext → AI behield hallucinaties tijdens SEO-verbetering. **Layer 1+**: `brandKnowledgeSearch.js` (ChromaDB semantic retrieval, backfill endpoint POST /brand-sources/rebuild-embeddings). **Layer 3 (D-2)**: `outputValidator.js` met Mistral-NER + entity grounding + per-zin cosine similarity (Layer 3+). Threshold via feature flag `ai_content.hallucination_threshold` (default 0.10). **Layer 5**: EU AI Act Article 50 — `provenanceService.js` met SHA-256 signature + tamper detection, content_items.provenance JSON kolom (migration 007). **D-4**: GET /brand-sources/ai-quality dashboard endpoint (per-destination metrics + recent failures). **Audit**: ai_generation_log met validation_passed + ungrounded_entities + retries. **Foundation services**: `featureFlagService.js` (polymorphic scope + audit), `websiteScraperService.js` (cheerio + readability + turndown voor Wix SSR), `mistralAgentsService.js` (EU web_search fallback beta), `aiQualityOrchestrator.js` (retry orchestratie). **Frontend**: ConceptDialog i18n melding `t('contentStudio.rewriteResult.*')` met code-mapping (4 locales nl/en/de/es). **BUTE bewijs**: item 250 De strippenkaart — AI verwijst nu naar Landgoed De Bonte Belevenis + 16 mei + Fiets mee (uit butefair.nl scrape KB#5), validator detecteert Zeehondenspeurtocht + Kid Bingo als ungrounded (30% rate, FAIL > 10%), provenance signature 3bc18460..., source_ids [5,4,3]. **DB**: migration 006 (feature_flags + audit + ai_generation_log + brand_knowledge ALTER), 006a (UNIQUE fix), 007 (provenance). **Deps**: cheerio + @mozilla/readability + jsdom + turndown. 28 bestanden, 15.7K insertions. |
| **4.89.0** | **2026-05-13** | **Vite Chunk Splitting**: i18n lazy-load (alleen actieve taal sync, 4 talen on-demand), recharts uit manualChunks (auto-split per lazy page), Sentry lazy init + apart chunk. Initiële load 1.86MB→863KB (-54%), gzip 570KB→263KB. 3 bestanden. |
| **4.88.0** | **2026-05-13** | **AI Text Gateway Sanitization (Optie C) + 2 Bug Fixes**. (1) ContentImageSection pickerId `String()` fix (numerieke media IDs crashten `.startsWith()`). (2) contentSanitizer bullets/en-dashes naar komma i.p.v. hyphen. (3) contentFormatter `stripMarkdown()` stopte met `•` herintroduceren. (4) **Gateway-level `sanitizeAIText()`**: lichtgewicht sanitizer zonder platform-logica, toegepast in `embeddingService.generateChatCompletion()` + streaming. 5 bypass-callers beveiligd: qaGenerator, translationService, holibotInsightsService, visualAnalyzer, mediaProcessingWorker. **AI-output bescherming**: 2/11 → 11/11 paden. 7 bestanden gewijzigd. |
| **4.87.0** | **2026-05-11** | **Content Studio Popup Consolidatie + 4 Bug Fixes**. Twee duplicate content item popups (ContentItemDialog 904 LOC + ConceptDialog 1881 LOC) geconsolideerd naar één ConceptDialog. **ContentItemDialog volledig verwijderd** (-916 LOC uit ContentStudioPage.jsx). **6 governance-features gemigreerd** naar ConceptDialog: Beoordeling (Approve/Reject/Retry/Share met SEO-gate), Workflow Status (4-staps visuele indicator + audit trail), Comments (team-opmerkingen), Versiegeschiedenis (revisions + restore), Delen naar andere bestemming, Share dialog. Acties-kolom "Bewerken" omgeleid naar ConceptDialog. **4 bug fixes**: (1) SEO-drempel 80→70 + geen harde blokkade (Approve altijd beschikbaar), (2) Titel opslaan gebroken (updateItem→updateConcept), (3) Preview images afgesneden (objectFit cover→contain), (4) FB Approve geblokkeerd (gevolg van #1). 3 bestanden gewijzigd (ConceptDialog.jsx +284 LOC, ContentStudioPage.jsx -916 LOC, PlatformPreview.jsx). |
| **4.86.0** | **2026-05-11** | **Fase VII-E4: Editor UX-Upgrade COMPLEET**. C1 Block Picker: search input, feature-flag gating (optie b), dependency warnings, Alles-tab met counts. C2 Template: apply-template-defaults endpoint met diff-preview + confirmation (optie b). C3 Quality Validation: pageQualityValidator.js (6 dimensies: content/SEO/a11y/data/performance/template), warnings-only (optie b), PageQualityPanel.jsx in editor. C5 WYSIWYG Preview: iframe laadt echte pagina i.p.v. wireframe, Apache CSP frame-ancestors globaal. DB migratie: Texel homepage 11 blocks (desktop/mobile split) naar 7 universele responsive blocks. |
| **4.85.0** | **2026-05-11** | **Fase VII-E3: Page Builder Templates & Page Library COMPLEET**. 24 template configs (9 bestaand upgraded + 15 nieuw). templateDefaults.js service. template_type + metadata kolommen pages tabel. Slug-based routing /event/[id]/[slug] + /poi/[id]/[slug] (307 redirect). Template API: GET /admin-portal/templates + POST /pages/from-template. 6 schema.org generators (EventDetail, PoiDetail, Article, CollectionPage, TouristTrip + category-aware subtype mapping). Admin pageTemplates.js uitgebreid (9→24 templates). Categorieen: basic, discovery, events, editorial, commerce, detail, mobile, campaign. |

> **Volledige changelog (v3.0.0 - v4.31.0)**: zie CLAUDE_HISTORY.md

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 8.30 |
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
