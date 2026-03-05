# HolidaiButler Architectuur Audit — Rapport

> **Versie**: 1.0
> **Datum**: 5 maart 2026
> **Auditor**: Claude Code (Opus 4.6)
> **Scope**: Volledige codebase inventarisatie + Directus CMS evaluatie
> **Status**: DEFINITIEF

---

## Correcties op het Briefingdocument

Het originele briefingdocument bevatte enkele onjuiste aannames die hierbij gecorrigeerd worden:

| Item | Briefing | Werkelijkheid |
|------|----------|---------------|
| Database | PostgreSQL | **MySQL/MariaDB** (host: jotx.your-database.de) |
| Agents | 15 gespecialiseerd | **21 agents** (15 core + 3 monitoring + 3 commerce) |
| Scheduled Jobs | 35 | **54 BullMQ jobs** |
| Admin Portal | "self-built" | **Enterprise-grade** React 18 + MUI 5, 137 endpoints, 9.347 LOC frontend |

---

## FASE 1: INVENTARISATIE

### 1.1 Database Schema Analyse

#### Overzicht

| Metriek | Waarde |
|---------|--------|
| Database engine | MySQL/MariaDB (InnoDB) |
| Host | jotx.your-database.de (Hetzner DE) |
| Totaal tabellen | **67** |
| Actief gebruikte tabellen | **~50** (rest: legacy/placeholder) |
| Totale datagrootte | **~260 MB** |
| Stored procedures | **0** |
| Triggers | **0** |
| Tabellen met destination_id | **27** |
| Tabellen met vertaalbare content | **4** (POI, agenda, tickets, Categories) |

#### Volledige Tabellenlijst (67 tabellen)

##### Core Content (8 tabellen, ~155 MB)
| Tabel | Records | Grootte | destination_id | Beschrijving |
|-------|---------|---------|----------------|-------------|
| POI | 1.653 | 90,5 MB | Ja | Hoofdtabel: 96 kolommen, 80+ Apify-velden, 4-talige content |
| QnA | 125.323 | 53,6 MB | Ja | Vraag-antwoord paren per POI |
| poi_apify_raw | 981 | 34,7 MB | Ja | Bronze layer: raw Apify JSON |
| poi_content_staging | 5.625 | 22,3 MB | Ja | Content staging pipeline |
| poi_content_history | 4.804 | 10,8 MB | Nee | Versiegeschiedenis content |
| imageurls | 25.428 | 15,5 MB | Nee (via POI FK) | POI afbeeldingen (8,3+4,1 GB op disk) |
| reviews | 17.679 | 8,8 MB | Ja | Google/Apify reviews met sentiment |
| Categories | 279 | 0,2 MB | Ja | Categorieenstructuur (hiearchisch) |

##### User & Auth (12 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| AdminUsers | 4 | Nee | Legacy admin users (INT id) |
| admin_users | 6 | Via allowed_destinations | Actuele admin users (UUID id, RBAC) |
| AdminUser_ActivityLog | 100 | Nee | Audit trail admin acties |
| AdminUser_OwnedPOIs | 0 | Nee | POI-ownership mapping |
| Users | 10 | Ja | Frontend/chatbot users |
| users | 1 | Nee | Legacy users tabel |
| Sessions | 132 | Nee | JWT sessies (access+refresh token) |
| Roles | 4 | Nee | RBAC roldefinities |
| Permissions | 21 | Nee | Granulaire permissies |
| User_Permissions | 0 | Nee | User↔Permission koppeling |
| User_Preferences | 4 | Nee | Taalvoorkeur etc. |
| User_Interactions | 0 | Nee | Legacy POI interacties |

##### Commerce & Payment (11 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| payment_transactions | 3 | Ja | Adyen betalingen (UUID, idempotency) |
| payment_refunds | 0 | Ja | Refund tracking |
| tickets | 1 | Ja | Ticket definities (6 types, meertalig) |
| ticket_inventory | 3 | Ja | Slot-based beschikbaarheid |
| ticket_orders | 3 | Ja | Orders met QR code |
| ticket_order_items | 3 | Nee | Order regelitems |
| voucher_codes | 1 | Ja | Kortingscodes |
| reservation_slots | 3 | Ja | Tijdsloten voor reserveringen |
| reservations | 5 | Ja | Reserveringen met QR, no-show tracking |
| guest_profiles | 2 | Ja | Gastprofielen (blacklist, GDPR) |
| transactions | 0 | Nee | Legacy transacties |

##### Intermediair & Financieel (6 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| partners | 0 | Ja | Partnerregistratie (IBAN, BTW, contract) |
| partner_pois | 0 | Nee | Partner↔POI koppeling |
| partner_onboarding | 0 | Nee | 3-stappen onboarding |
| intermediary_transactions | 0 | Ja | 6-stappen state machine, QR HMAC |
| settlement_batches | 0 | Ja | Financiele afrekenbatches |
| partner_payouts | 0 | Ja | Uitbetalingen per partner |
| credit_notes | 0 | Ja | Creditnota's (BTW 21%) |
| financial_audit_log | 0 | Ja | Onveranderlijke audit trail |

##### Chatbot & Analytics (10 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| holibot_sessions | 204 | Ja | Chatsessies |
| holibot_messages | 410 | Nee (via session FK) | Chatberichten |
| holibot_fallbacks | 63 | Nee | Fallback-analyse |
| holibot_poi_clicks | 0 | Nee | POI-klik tracking |
| holibot_poi_ratings | 0 | Nee | In-chat POI ratings |
| holibot_user_preferences | 1 | Nee | Chatbot leert voorkeuren |
| holibot_learned_preferences | 0 | Nee | ML-voorkeuren |
| page_views | 228 | Ja | GDPR-compliant pageviews |
| user_journeys | 0 | Ja | Email journeys |
| journey_scheduled_emails | 0 | Nee | Geplande emails |

##### GDPR & Compliance (4 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| consent_history | 3 | Nee | Art. 7 consent audit trail |
| user_consent | 8 | Nee | Actieve consent status |
| gdpr_deletion_requests | 0 | Nee | Art. 17 verwijderverzoeken (72h SLA) |
| GDPR_Logs | 0 | Nee | GDPR operatie logs |
| Email_Verification_Logs | 0 | Nee | Email verificatie audit |

##### Configuratie (3 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| destinations | 3 | — | Bestemmingsconfiguratie (feature flags, talen) |
| PlatformConfig | 1 | Nee | Legacy platformconfig |
| platform_config | 1 | Nee | Actuele platformconfig |

##### Agenda & Events (3 tabellen)
| Tabel | Records | destination_id | Beschrijving |
|-------|---------|----------------|-------------|
| agenda | 249 | Ja | Evenementen (meertalig: NL/EN/ES) |
| agenda_dates | 2.351 | Nee (via FK) | Meerdere datums per event |
| events | 0 | Nee | Legacy events systeem |

##### Legacy/Ongebruikt (10 tabellen)
| Tabel | Records | Beschrijving |
|-------|---------|-------------|
| POI_OLD | 1.241 | Backup pre-enrichment |
| QnA_OLD | 31.189 | Backup pre-enrichment |
| POI_ImportExportHistory | 0 | Ongebruikt |
| ChatSession | 12 | Legacy chatsessies |
| ChatSessionCleanupLog | 1 | Legacy cleanup |
| floor_plans | 0 | Restaurant plattegronden (ongebruikt) |
| restaurant_availability | 0 | Legacy beschikbaarheid |
| tables | 0 | Restaurant tafels (ongebruikt) |
| waitlist | 0 | Wachtlijst (ongebruikt) |
| guest_notes | 0 | Gastnotities (ongebruikt) |

#### Foreign Key Relaties

**73 foreign keys** gedefinieerd. Belangrijkste relatienetwerk:

```
destinations (3)
  ├── POI (1.653) ─── imageurls (25.428)
  │     ├── QnA (125.323)
  │     ├── reviews (17.679)
  │     ├── poi_apify_raw (981)
  │     ├── poi_content_staging (5.625)
  │     ├── tickets → ticket_inventory → ticket_order_items
  │     ├── reservation_slots → reservations
  │     └── partner_pois → partners
  ├── partners (0)
  │     ├── intermediary_transactions (0) → settlement_batches → partner_payouts → credit_notes
  │     └── partner_onboarding
  ├── payment_transactions (3) → payment_refunds
  ├── Users (10) → Sessions, user_consent, consent_history, user_journeys
  ├── admin_users (6) → AdminUser_ActivityLog
  ├── holibot_sessions (204) → holibot_messages (410)
  └── agenda (249) → agenda_dates (2.351)
```

#### Gevoelige/Versleutelde Velden

| Tabel | Veld | Type | Gevoeligheid |
|-------|------|------|-------------|
| AdminUsers/admin_users | password | bcrypt hash | HOOG |
| AdminUsers/admin_users | two_factor_secret | TOTP secret | HOOG |
| AdminUsers/admin_users | reset_password_token | Random token | MEDIUM |
| Users | password_hash | bcrypt hash | HOOG |
| Users | totp_secret | TOTP secret | HOOG |
| partners | iban | IBAN (plaintext) | HOOG |
| partner_payouts | partner_iban | IBAN snapshot | HOOG |
| Sessions | access_token_hash, refresh_token | JWT tokens | MEDIUM |
| payment_transactions | idempotency_key | UUID | LAAG |
| intermediary_transactions | qr_code_data | HMAC-signed | MEDIUM |
| guest_profiles | email, phone | PII | HOOG (GDPR) |

#### Vertaalbare Content

| Tabel | Basis | Vertalingen | Talen |
|-------|-------|-------------|-------|
| POI | enriched_tile_description, enriched_detail_description | _nl, _de, _es, _en, _sv, _pl | 6 |
| agenda | title, short_description, long_description | _en, _es | 2 |
| tickets | name, description | _en, _de, _es | 3 |
| Categories | name | _nl, _en, _de | 3 |

---

### 1.2 Admin Portal Analyse

#### Technologie Stack

| Component | Technologie | Versie |
|-----------|------------|--------|
| Frontend framework | React | 18 |
| UI library | Material-UI (MUI) | 5 |
| Build tool | Vite | 4.5.0 |
| State management | Zustand | 4.4.4 |
| Data fetching | React Query | 4.36.1 |
| HTTP client | Axios | 1.5.1 |
| Charts | Recharts | 2.9.0 |
| i18n | i18next | NL/EN/DE/ES |
| Backend | Node.js/Express | Geintegreerd in platform-core |
| Auth | JWT + bcrypt + RBAC | 4 rollen |

#### Codebase Omvang

| Component | Bestanden | Regels Code |
|-----------|-----------|-------------|
| Admin frontend (admin-module/src/) | 63 | 9.347 |
| Admin API (adminPortal.js) | 1 | 8.513 |
| Intermediary service | 1 | 738 |
| Financial service | 1 | 1.139 |
| Commerce service | 1 | 719 |
| Ticketing service | 1 | 805 |
| Reservation service | 1 | 810 |
| Partner service | 1 | 479 |
| Auth middleware | 1 | ~300 |
| **Totaal Admin-gerelateerd** | **~71** | **~22.850** |

#### Feature-lijst (137 API Endpoints)

| Entiteit | Endpoints | CRUD Operaties |
|----------|-----------|----------------|
| Auth | 4 | Login, refresh, logout, me |
| Dashboard | 3 | KPI aggregatie, health, agent status |
| POIs | 6 | List, stats, categories, detail, update, image reorder |
| Reviews | 3 | List, detail, archive/unarchive |
| Analytics | 4 | Overview, chatbot, trends, snapshot |
| Settings | 9 | Config, audit log, undo, cache, branding, logo upload |
| Users | 7 | CRUD, password reset |
| Agents | 3 | Results, config, config update |
| Payment | 5 | List, stats, reconciliation, detail, refund |
| Ticketing | 15 | CRUD tickets, inventory, orders, QR validatie, vouchers |
| Reservations | 13 | CRUD slots, bookings, no-show, complete, guests, blacklist |
| Commerce | 10 | Dashboard, reports, export CSV, fraud alerts |
| Partners | 7 | CRUD, stats, status transitions, transactions |
| Intermediary | 11 | CRUD, state transitions, QR, funnel, export |
| Financial | 20 | Settlements, payouts, credit notes, exports, audit log |
| **Totaal** | **137** | |

#### Authenticatie & Autorisatie

**RBAC Model (4 rollen):**

| Rol | Niveau | Scope | Rechten |
|-----|--------|-------|---------|
| platform_admin | 100 | Alle destinations | Volledig + user management + rate limiter exempt |
| poi_owner | 70 | Eigen destination + POIs | CRUD POIs + reviews + analytics + commerce |
| content_editor | 50 | Eigen destination | Edit POIs + reviews (geen delete/users/finance) |
| content_reviewer | 30 | Eigen destination | Read-only |

**Middleware stack:**
1. `adminAuth()` — JWT verificatie + rol extractie + destination scope
2. `destinationScope()` — Filtert queries op allowed_destinations of owned_pois
3. `writeAccess()` — Blokkeert schrijfacties voor content_reviewer
4. `adminApiRateLimiter` — 300 req/15min (platform_admin exempt)
5. Rate limiting login: 15 req/15min, lockout na 10 pogingen/5min

#### Custom Business Logica (KRITIEK)

**1. Intermediary State Machine (738 LOC)**
- 6-stappen workflow: voorstel → toestemming → bevestiging → delen → reminder → review
- ACID commissieberekening (fixed-point integer arithmetic, centen)
- QR HMAC-SHA256 generatie + timingSafeEqual verificatie
- Transactienummering: HB-I-YYMMDD-XXXX
- BullMQ: reminders, review requests, expiry

**2. Financial Service (1.139 LOC)**
- 3 geneste state machines (settlement, payout, credit note)
- BTW 21% berekening (fixed-point)
- Partner data snapshots (onveranderlijk bij settlement)
- Onveranderlijke audit trail met reversibele acties
- Auto-complete batch (1e v/d maand)
- 4 CSV exports met UTF-8 BOM + quote escaping

**3. Ticketing Service (805 LOC)**
- Redis-based distributed inventory locking (30 min checkout window)
- QR HMAC-SHA256 generatie + offline verificatie
- Voucher discount logica
- Order state machine: pending → paid → confirmed → used/cancelled

**4. Reservation Service (810 LOC)**
- Redis slot locking (5s TTL, race condition preventie)
- Guest profiel management + no-show tracking
- Auto-blacklist bij 3 no-shows
- GDPR data anonimisering (24 maanden retentie)

**5. Commerce Service (719 LOC)**
- READ-ONLY aggregatie over payment/ticketing/reservation tabellen
- 6 fraud alert types (refund rate, failed tx, high-value, country anomaly, rapid repeat, zero-value)
- CSV export met BOM + escaping

#### File Upload & Media Management
- Brand logo upload: Multer, MIME whitelist (PNG/JPEG/WebP), 5 MB limiet
- POI image reordering: display_order updates
- Opslag: `/storage/branding/{destinationId}/`
- **Geen** directe POI image upload via Admin Portal (images komen via Apify pipeline)

#### Externe Integraties (vanuit Admin Portal)
| Service | Functie | Integratietype |
|---------|---------|---------------|
| Adyen | Betalingen, refunds, webhooks | REST API + HMAC verificatie |
| Apify | POI scraping, reviews | REST API (Medallion pipeline) |
| MailerLite | Email automation | REST API (subscriber sync) |
| Threema | Kritieke alerts | REST API |
| Mistral AI | Embeddings, Q&A generatie | REST API |
| ChromaDB Cloud | Vector opslag chatbot | HTTP API |
| Redis | Caching, inventory locks, BullMQ | Local (127.0.0.1:6379) |
| MongoDB | Agent audit trail, config | MongoDB Atlas |

#### UI Pagina's (15 views)

| Pagina | LOC | Tabs | Beschrijving |
|--------|-----|------|-------------|
| AgentsPage | 1.093 | — | Agent dashboard, run history, config editor |
| POIsPage | 773 | — | POI lijst/detail, bulk edit, image reorder |
| SettingsPage | 625 | — | Branding, audit log, cache, logo upload |
| AnalyticsPage | 605 | — | Pageviews, trends, snapshots, chatbot |
| FinancialPage | 603 | 5 | Dashboard/Settlements/Payouts/Credit/Export |
| PartnersPage | 594 | 4 | Overview/Transactions/KPIs/Onboarding |
| UsersPage | 584 | — | Admin user CRUD, password reset |
| IntermediaryPage | 533 | 4 | Dashboard/Transacties/Afrekeningen/Export |
| CommercePage | 504 | 4 | Dashboard/Reports/Alerts/Export |
| ReviewsPage | 445 | — | Review archief, detail modal |
| IssuesPage | 351 | — | Agent issues, SLA tracking |
| DashboardPage | 218 | — | KPI cards, health status |
| LoginPage | — | — | JWT login + rate limiting |

#### Hosting/Deployment
- **Frontend**: Vite SPA build → Apache vhost (admin.holidaibutler.com)
- **Backend**: Node.js/Express op Hetzner (PM2 process: holidaibutler-api, port 3001)
- **CI/CD**: GitHub Actions (deploy-admin-module.yml, deploy-platform-core.yml)

---

### 1.3 Agents Analyse (21 Agents)

| # | Agent | Nederlandse Naam | Categorie | Type | DB Read | DB Write | Externe APIs | Trigger | Admin Portal Dependency |
|---|-------|-----------------|-----------|------|---------|----------|-------------|---------|------------------------|
| 1 | Orchestrator | De Maestro | Core | A | BullMQ queue state | BullMQ job routing | — | Continuous | **Geen** (alleen DB) |
| 2 | Owner Interface | De Bode | Core | A | Alle agent results, health data | MongoDB audit trail | MailerLite, Threema | Daily 08:00 | **Geen** (eigen endpoints) |
| 3 | Health Monitor | De Dokter | Operations | A | System metrics, PM2, Redis | MongoDB health results | API health checks (intern) | Hourly | **Geen** |
| 4 | Data Sync | De Koerier | Operations | A | POI, reviews, QnA, poi_apify_raw | POI (updates), reviews, QnA | Apify, Mistral, OSM | Tier-based | **Geen** (direct DB) |
| 5 | HoliBot Sync | Het Geheugen | Operations | A | POI, QnA | — (ChromaDB only) | ChromaDB Cloud, Mistral | Daily + Sunday | **Geen** |
| 6 | Communication | De Gastheer | Operations | A | Users, user_journeys, holibot_sessions | user_journeys, journey_scheduled_emails | MailerLite, SMTP | Daily | **Geen** |
| 7 | GDPR | De Poortwachter | Operations | A | Users, consent, sessions, guest_profiles | user_consent, audit_log, users (anonymize) | — | Daily | **Geen** |
| 8 | UX/UI | De Stylist | Development | B | — | MongoDB results | Frontend health checks | Weekly | **Geen** |
| 9 | Code | De Corrector | Development | B | — | MongoDB results | npm audit, ESLint | Weekly | **Geen** |
| 10 | Security | De Bewaker | Development | B | — | MongoDB results | npm audit, CVE checks | Weekly | **Geen** |
| 11 | Quality | De Inspecteur | Development | A | POI (content scores) | POI (quality_score updates) | — | Weekly | **Geen** |
| 12 | Architecture | De Architect | Strategy | B | — | MongoDB results | — | **DEACTIVATED** | **Geen** |
| 13 | Learning | De Leermeester | Strategy | A | Diverse analytics | MongoDB results | — | **DEACTIVATED** | **Geen** |
| 14 | Config | De Thermostaat | Strategy | A | Health metrics | MongoDB config | — | **DEACTIVATED** | **Geen** |
| 15 | Prediction | De Weermeester | Strategy | A | pageviews, holibot_sessions | MongoDB results | — | Daily | **Geen** |
| — | Content Quality | (module) | Monitoring | A | POI (descriptions, claims) | POI (quality_score) | — | Monday 05:00 | **Geen** |
| — | Backup Health | (module) | Monitoring | B | — | MongoDB results | MySQL/MongoDB backup checks | Daily 07:30 | **Geen** |
| — | Smoke Test | (module) | Monitoring | A | — | MongoDB results | HTTP endpoint checks | Daily 07:45 | **Geen** |
| 19 | Intermediary Monitor | De Makelaar | Operations | A | intermediary_transactions, partners | MongoDB audit | — | Every 15 min | **Geen** |
| 20 | Financial Monitor | De Kassier | Operations | B | settlement_batches, payouts, audit_log | MongoDB audit | — | Daily 06:30 | **Geen** |
| 21 | Inventory Sync | De Magazijnier | Operations | A | ticket_inventory, reservation_slots | ticket_inventory (sync) | Redis | Every 30 min | **Geen** |

**Conclusie: GEEN enkele agent is afhankelijk van de Admin Portal.** Alle agents communiceren **direct met de database** (MySQL/MongoDB/Redis/ChromaDB). De Admin Portal en het agent-systeem zijn volledig ontkoppeld — ze delen alleen de database.

---

### 1.4 Scheduled Jobs Analyse (54 Jobs)

| Categorie | Jobs | Frequentie | Mutatie? |
|-----------|------|-----------|---------|
| **Owner/Cost** | daily-briefing, weekly-cost-report, cost-check | Dagelijks/wekelijks | Nee (READ) |
| **Health/Monitoring** | health-check, backup-recency-check, smoke-test | Dagelijks/uurlijks | Nee (READ) |
| **Content Quality** | content-quality-audit, content-freshness-check, agent-success-rate | Wekelijks | Write (POI quality scores) |
| **GDPR** | gdpr-overdue-check, gdpr-export-cleanup, gdpr-retention-check, gdpr-consent-audit, guest-data-retention-cleanup, intermediary-guest-anonymize | Dagelijks/wekelijks/maandelijks | Write (anonymisatie, cleanup) |
| **Dev Layer** | dev-security-scan, dev-dependency-audit, dev-quality-report | Wekelijks | Nee (READ) |
| **Data Sync** | poi-sync-tier1/2/3/4, chromadb-state-snapshot | Tier-based | Write (POI updates) |
| **Ticketing** | release-expired-ticket-reservations | Elke minuut | Write (order status) |
| **Reservations** | reservation-expired-cleanup, reservation-reminder-24h, reservation-reminder-1h | 5-60 min | Write (status, reminders) |
| **Intermediary** | intermediary-reminder, intermediary-review-request, intermediary-monitor | 15 min - 6 uur | Write (reminders, monitoring) |
| **Financial** | financial-auto-settlement, financial-unsettled-alert, financial-monitor | Dagelijks/maandelijks | Write (settlements) |
| **Inventory** | inventory-sync | Elke 30 min | Write (Redis↔MySQL sync) |

---

### 1.5 Frontend Analyse

#### Customer Portal

| Aspect | Detail |
|--------|--------|
| Framework | React 19.1.1 + Tailwind CSS 4.1 |
| Bundler | Vite 7.1.7 |
| State | Zustand 5.0.8 + React Query 5.90.6 |
| Routing | React Router 7.9.5 |
| Maps | Leaflet 1.9.4 + Marker Cluster |
| Payment | Adyen Web 6.12.0 |
| i18n | i18next 25.6.0 |
| Monitoring | Sentry 8.48.0 |
| Bestanden | 185 TypeScript/TSX files |
| LOC | 41.034 |

#### Content Rendering
- **Client-side SPA** (Vite build, geen SSR)
- Content via REST API calls (`/api/v1/pois`, `/api/v1/agenda`, etc.)
- Real-time: SSE streaming voor chatbot (`/api/v1/holibot/chat/stream`)

#### Multi-Destination Awareness
- **Build-time**: `VITE_DESTINATION_ID` environment variable
- **Runtime**: `X-Destination-ID` header op alle API requests
- **DestinationContext**: Branding, talen, categoriefilters, chatbot config per bestemming
- **Apache VHosts**: holidaibutler.com → Calpe, texelmaps.nl → Texel

#### Data Consumptie
| API | Endpoint | Beschrijving |
|-----|----------|-------------|
| POIs | /api/v1/pois | Lijst + detail + filters |
| Chat | /api/v1/holibot | SSE streaming chatbot |
| Tickets | /api/v1/ticketing | Beschikbaarheid + bestellen |
| Reservations | /api/v1/reservations | Slots + boeken |
| Payments | /api/v1/payments | Adyen sessies + status |
| Agenda | /api/v1/agenda | Evenementen + iCal feed |
| Categories | /api/v1/categories | Destination-scoped categorieën |

---

## FASE 2: ANALYSE

### 2.1 Directus Compatibiliteit per Tabel

#### Legenda
- **Ja** = Directus kan wrappen zonder schema-wijziging
- **Ja**** = Kan wrappen maar met beperkingen (JSON-velden, ENUM types)
- **Nee** = Moet Directus NIET wrappen (interne/technische tabellen)

| Tabel | Directus Wrap? | Toelichting |
|-------|---------------|-------------|
| **POI** | Ja* | 96 kolommen, veel LONGTEXT JSON-velden. Directus kan dit wrappen maar de UI wordt onpraktisch groot. Custom display nodig voor JSON velden (amenities, opening_hours_json, etc.) |
| **QnA** | Ja | Simpele structuur. FK op google_placeid (VARCHAR, niet INT) — Directus moet dit als M2O relatie configureren |
| **reviews** | Ja | Standaard structuur |
| **imageurls** | Ja | Simpele FK naar POI. Directus eigen file management is anders (bestanden vs URLs) |
| **agenda** | Ja | Meertalige kolommen (_en, _es) |
| **agenda_dates** | Ja | Simpele 1:N relatie |
| **Categories** | Ja | Hiërarchisch (parent_id self-reference). Directus ondersteunt dit |
| **destinations** | Ja* | JSON-velden (feature_flags, config, supported_languages) — Directus kan JSON tonen maar geen typed editing |
| **partners** | Ja* | IBAN validatie moet custom. ENUM voor contract_status |
| **partner_pois** | Ja | Junction table |
| **partner_onboarding** | Ja | Simpele structuur |
| **intermediary_transactions** | Ja* | ENUM met Nederlandse waarden (voorstel, toestemming, etc.) — Directus toont raw values |
| **settlement_batches** | Ja* | 6-waardige ENUM status |
| **partner_payouts** | Ja* | IBAN snapshot, 6-waardige ENUM |
| **credit_notes** | Ja | Standaard structuur |
| **financial_audit_log** | Ja | Append-only, read-only in UI |
| **payment_transactions** | Ja* | Complex ENUM status, Adyen-specifieke velden |
| **tickets** | Ja* | Meertalige kolommen, JSON pricing_tiers |
| **ticket_inventory** | Ja | Standaard structuur |
| **ticket_orders** | Ja* | QR code data, complex status ENUM |
| **ticket_order_items** | Ja | Junction table |
| **voucher_codes** | Ja* | JSON applicable_ticket_types |
| **reservation_slots** | Ja | Standaard structuur |
| **reservations** | Ja* | Complex ENUM status, QR data |
| **guest_profiles** | Ja | Standaard structuur |
| **Users** | Ja* | Dubbele Users/users tabellen (legacy). Directus zou eigen users tabel toevoegen |
| **admin_users** | **Nee** | Directus heeft eigen user management. Conflicterend |
| **AdminUsers** | **Nee** | Legacy, niet wrappen |
| **Sessions** | **Nee** | JWT sessie management — intern |
| **Roles/Permissions** | **Nee** | Directus heeft eigen RBAC |
| **poi_apify_raw** | Ja* | LONGTEXT raw_json (>100KB per record) — Directus UI wordt traag |
| **poi_content_staging** | Ja | Content pipeline |
| **poi_content_history** | Ja | Versiebeheer |
| **holibot_**** | **Nee** | Interne chatbot tabellen — geen admin beheer nodig |
| **page_views** | **Nee** | Analytics tracking — intern |
| **GDPR_*/consent_*/** | **Nee** | Compliance-intern |
| **user_journeys/journey_*/** | **Nee** | Email automation — intern |
| **POI_OLD/QnA_OLD** | **Nee** | Legacy backup |
| **transactions/events/floor_plans/tables/waitlist** | **Nee** | Legacy/ongebruikt |

**Samenvatting**: ~30 tabellen geschikt voor Directus wrapping, ~20 NIET wrappen (intern/legacy), ~17 met beperkingen.

#### Custom Data Types
- **Geen probleem**: MySQL ENUM, LONGTEXT JSON, DECIMAL — Directus ondersteunt deze
- **Aandachtspunt**: Nederlandse ENUM waarden (`voorstel`, `toestemming`) — Directus toont raw waarden

#### Stored Procedures/Triggers
- **Geen**: 0 stored procedures, 0 triggers. Directus ondervindt hier geen hinder.

---

### 2.2 Admin Portal Functionaliteit vs. Directus Out-of-the-Box

#### Classificatie
- **A** = Directus biedt dit out-of-the-box
- **B** = Directus biedt dit met extension/plugin
- **C** = Directus biedt dit NIET — vereist custom development
- **D** = Niet relevant voor Directus

| # | Feature | Huidige Implementatie | Directus | Toelichting |
|---|---------|----------------------|----------|-------------|
| 1 | POI CRUD | adminPortal.js + POIsPage.jsx | **A** | Directus collection UI. Maar 96 kolommen = onoverzichtelijk |
| 2 | POI Image Reorder | PUT /pois/:id/images | **B** | Directus file management + custom interface voor display_order |
| 3 | Review Management | List/archive/unarchive | **A** | Standaard CRUD |
| 4 | Category Management | Hiërarchisch met parent_id | **A** | Directus ondersteunt self-referencing relations |
| 5 | Admin User CRUD | 4 RBAC rollen, destination scope | **B** | Directus RBAC is anders gestructureerd. POI-ownership vereist custom policy |
| 6 | Dashboard KPIs | Aggregatie over meerdere tabellen | **C** | Directus heeft geen dashboard aggregatie. Vereist custom endpoint of Insights extension |
| 7 | Agent Dashboard | Status polling, run history, config | **D** | Niet relevant — agents zijn onafhankelijk |
| 8 | Agent Issues/SLA | Issue tracking met SLA timers | **D** | Niet relevant |
| 9 | Analytics | Pageviews, trends, chatbot metrics | **C** | Geen analyticsmodule in Directus |
| 10 | Settings/Branding | Logo upload, cache clear, audit log | **B** | Directus heeft eigen settings. Logo upload via Files module |
| 11 | **Payment Management** | Transacties, refunds, reconciliatie | **C** | Directus heeft geen payment module. Vereist volledige custom backend |
| 12 | **Ticketing CRUD** | Tickets, inventory, orders, QR | **C** | State machines, Redis locking, HMAC QR — niet in CMS |
| 13 | **Reservation Management** | Slots, bookings, no-show, blacklist | **C** | Slot locking, auto-blacklist logica — niet in CMS |
| 14 | **Commerce Dashboard** | Revenue, reports, fraud alerts | **C** | Multi-tabel aggregatie, fraud detectie — niet in CMS |
| 15 | **Partner Management** | CRUD, onboarding, IBAN validatie | **B/C** | CRUD = B, maar onboarding workflow + IBAN validatie = C |
| 16 | **Intermediary State Machine** | 6-stappen workflow, QR HMAC, commissie | **C** | Complexe state machine, crypto — absoluut niet in CMS |
| 17 | **Financial Process** | 3 state machines, BTW, settlements, audit trail | **C** | Financiele logica — absoluut niet in CMS |
| 18 | **Financial Export** | CSV met BOM, BTW samenvatting | **C** | Custom export formatting |
| 19 | i18n (4 talen) | i18next NL/EN/DE/ES | **A** | Directus heeft meertaligheid ingebouwd |
| 20 | RBAC + destination scope | Per-POI ownership, per-destination | **B** | Directus RBAC is minder granulairq dan huidige implementatie |
| 21 | Rate limiting | 300 req/15min, login 15 req/15min | **C** | Directus heeft basis rate limiting, niet zo configureerbaar |
| 22 | Audit trail | Reversibele acties, admin activity log | **A** | Directus heeft ingebouwde revisions/activity log |
| 23 | Dark mode | MUI theme toggle | **A** | Directus heeft dark mode |
| 24 | Multi-destination routing | X-Destination-ID header | **B** | Directus ondersteunt dit niet native. Vereist custom middleware |

#### Samenvatting

| Classificatie | Aantal Features | Percentage |
|---------------|----------------|-----------|
| **A** (out-of-the-box) | 7 | 29% |
| **B** (met extension) | 5 | 21% |
| **C** (custom development nodig) | 10 | 42% |
| **D** (niet relevant) | 2 | 8% |

**Conclusie**: Slechts 29% van de Admin Portal functionaliteit is out-of-the-box beschikbaar in Directus. **42% vereist custom development** — dit zijn de commerce, financiele en intermediaire features die het hart van het businessmodel vormen.

---

### 2.3 Agent Impact Analyse

| # | Agent | DB Read | DB Write | Admin Portal Dep. | Impact | Toelichting |
|---|-------|---------|----------|-------------------|--------|-------------|
| 1 | De Maestro | BullMQ | BullMQ | Geen | **GROEN** | Puur BullMQ orchestratie |
| 2 | De Bode | Alle agent data | MongoDB | Geen | **GROEN** | Leest alleen resultaten |
| 3 | De Dokter | System metrics | MongoDB | Geen | **GROEN** | Health checks |
| 4 | De Koerier | POI, reviews, QnA, poi_apify_raw | POI, reviews, QnA | Geen | **GROEN** | Direct DB, geen portal dependency |
| 5 | Het Geheugen | POI, QnA | ChromaDB | Geen | **GROEN** | Vector sync |
| 6 | De Gastheer | Users, journeys | user_journeys | Geen | **GROEN** | Email automation |
| 7 | De Poortwachter | Alle PII tabellen | consent, users (anon) | Geen | **GROEN** | GDPR compliance |
| 8 | De Stylist | — | MongoDB | Geen | **GROEN** | Frontend audit |
| 9 | De Corrector | — | MongoDB | Geen | **GROEN** | Code quality |
| 10 | De Bewaker | — | MongoDB | Geen | **GROEN** | Security scan |
| 11 | De Inspecteur | POI | POI (quality) | Geen | **GROEN** | Content quality |
| 12 | De Architect | — | MongoDB | Geen | **GROEN** | Gedeactiveerd |
| 13 | De Leermeester | Analytics | MongoDB | Geen | **GROEN** | Gedeactiveerd |
| 14 | De Thermostaat | Health | MongoDB | Geen | **GROEN** | Gedeactiveerd |
| 15 | De Weermeester | pageviews, sessions | MongoDB | Geen | **GROEN** | Predictie |
| — | Content Quality | POI | POI | Geen | **GROEN** | Quality scoring |
| — | Backup Health | — | MongoDB | Geen | **GROEN** | Backup check |
| — | Smoke Test | — | MongoDB | Geen | **GROEN** | Endpoint tests |
| 19 | De Makelaar | intermediary_transactions | MongoDB | Geen | **GROEN** | Transaction monitoring |
| 20 | De Kassier | settlements, payouts | MongoDB | Geen | **GROEN** | Financial monitoring |
| 21 | De Magazijnier | inventory, reservations | ticket_inventory | Geen | **GROEN** | Redis↔MySQL sync |

**Conclusie: ALLE 21 agents zijn GROEN.** Geen enkele agent is afhankelijk van de Admin Portal. Ze communiceren allemaal direct met de database. Directus heeft **nul impact** op het agent-systeem, ongeacht welk scenario wordt gekozen.

---

### 2.4 Risico-inschatting Self-Built Admin Portal

| Criterium | Beoordeling | Toelichting |
|-----------|-------------|-------------|
| **Codebase omvang** | 22.850 LOC (71 bestanden) | Beheersbaar. Geconcentreerd in ~10 key files |
| **Test coverage** | Laag (geen unit tests) | Risico. Compliance tests zijn documentatie-gebaseerd, niet automated |
| **Security** | **GOED** | JWT+bcrypt, RBAC 4 rollen, rate limiting, HMAC QR, parameterized queries (124 in services), .env 600 permissions |
| **Schaalbaarheid** | **GOED** voor huidige schaal | Redis caching, React Query deduplication, destination scoping. Bottleneck bij 50+ tenants: build-time destination config |
| **Onderhoudslast** | **MEDIUM** | 10 npm dependencies (focused). MUI 5 stable. React 18 LTS. Geen breaking changes verwacht |
| **Documentatie** | **GOED** | CLAUDE.md (source of truth), 12 compliance docs, structured commit history |
| **Single developer risk** | **HOOG** | Claude is primaire developer. Frank is niet-technisch. Bij problemen geen fallback |

---

## FASE 3: SCENARIO-EVALUATIE

### Scenario A: Directus als Configuratielaag NAAST Admin Portal

**Directus doet**: tenant_config, branding, module-activatie, frontend template engine
**Admin Portal doet**: POI-beheer, reviews, images, commerce, finance (zoals nu)

#### Evaluatie

| Aspect | Beoordeling |
|--------|-------------|
| **Complexiteit** | **HOOG** — Twee admin-systemen, twee auth-systemen, data-synchronisatie nodig |
| **Gebruikerservaring** | **SLECHT** — Lokale partners moeten twee interfaces leren. Twee logins |
| **Onderhoudslast** | **HOGER** dan nu — Bestaande portal + Directus + synchronisatielaag |
| **Data-consistentie** | **RISICO** — Branding in Directus, content in Admin Portal. Mismatch bij fouten |
| **Voordeel** | Tenant-configuratie snel op te zetten (Directus is hier sterk) |
| **Nadeel** | Fragmentatie. Lokale partners zien twee werelden |
| **Geschatte effort** | 80-120 uur (Directus setup + sync laag) |

### Scenario B: Directus als VERVANGING van Admin Portal

**Directus doet**: ALLES
**Admin Portal**: wordt uitgefaseerd

#### Evaluatie

| Aspect | Beoordeling |
|--------|-------------|
| **Haalbaarheid** | **LAAG** — 42% van features vereist custom development. Directus extensions zijn beperkt |
| **Wat Directus NIET kan** | State machines (intermediary, financial), Redis locking, QR HMAC, fraud detection, BullMQ jobs, Adyen integratie, commissieberekening, BTW, CSV export met BOM, auto-blacklist |
| **Migratieplan** | Onrealistisch — zou neerkomen op herschrijving van 12.000+ LOC business logica als Directus extensions |
| **Impact op agents** | **GEEN** — agents zijn onafhankelijk (allemaal GROEN) |
| **Risico** | **EXTREEM HOOG** — Directus extensions ecosystem is onvolwassen voor financial/commerce logica |
| **Geschatte effort** | 600-900+ uur custom development |
| **Kosten** | €60.000-120.000 (bij €100/uur) |

**Wat verlies je**:
- Fine-grained RBAC (per-POI ownership)
- Custom rate limiting
- Integrated audit trail met reversibele acties
- CSV exports met accountant-ready formatting

**Wat win je**:
- Directus community + security patches
- Content editing UI (maar alleen voor 29% van de features)

### Scenario C: Admin Portal Doorontwikkelen ZONDER Directus

**Admin Portal doet**: alles, inclusief tenant-config en multi-tenant beheer
**Database**: uitbreiden met tenant-tabellen

#### Evaluatie

| Aspect | Beoordeling |
|--------|-------------|
| **Ontwikkeltijd tenant-config** | 40-80 uur — destinations tabel uitbreiden, config UI in SettingsPage |
| **Branding per tenant** | 20-40 uur — al deels aanwezig (branding endpoint, logo upload) |
| **Module-activatie** | **AL AANWEZIG** — feature_flags in destinations tabel |
| **Page builder** | 80-120 uur — nieuw te bouwen (maar kan simpeler: template selectie i.p.v. drag-drop) |
| **Onderhoudslast 3-5 jaar** | **BEHEERSBAAR** — React 18 LTS, MUI 5 stable, Node.js LTS |
| **Schaalbaarheid 50 tenants** | **HAALBAAR** met aanpassingen — build-time → runtime destination config, DB connection pooling |
| **Single point of failure** | **JA** — maar dit geldt ook voor Scenario A en B (Claude blijft developer) |
| **Voordeel** | Maximale controle, geen externe dependencies, bestaande architectuur benut |
| **Geschatte effort** | 120-200 uur voor multi-tenant readiness |

---

## FASE 4: DELIVERABLES

### 4.1 Inventarisatie-samenvatting

| Component | Aantal | Toelichting |
|-----------|--------|-------------|
| Database tabellen | 67 | 50 actief, 17 legacy/intern |
| Database records | ~234.000 | POI+QnA+imageurls+reviews dominant |
| Database grootte | ~260 MB | POI tabel alleen 90 MB |
| Foreign keys | 73 | Goed genormaliseerd schema |
| Tabellen met destination_id | 27 | Multi-tenancy fundament aanwezig |
| Admin Portal endpoints | 137 | Verdeeld over 15 entiteiten |
| Admin Portal LOC | ~22.850 | Frontend 9.347 + Backend services ~13.500 |
| Customer Portal LOC | 41.034 | React 19 + TypeScript |
| Backend LOC | 76.534 | Node.js/Express |
| Agents | 21 | 15 core + 3 monitoring + 3 commerce |
| Scheduled jobs | 54 | BullMQ + Redis |
| Externe integraties | 8 | Adyen, Apify, MailerLite, Threema, Mistral, ChromaDB, Sentry, Redis |

### 4.2 Compatibiliteitsmatrix

| Categorie | Tabellen | Directus Wrap? |
|-----------|---------|---------------|
| Core Content | POI, QnA, reviews, imageurls, Categories | **Ja** (met beperkingen voor POI's 96 kolommen) |
| Agenda | agenda, agenda_dates | **Ja** |
| Commerce | payment_transactions, tickets, orders, reservations | **Ja** (read-only CRUD, NIET business logica) |
| Intermediary | intermediary_transactions, settlements, payouts | **Ja** (read-only CRUD, NIET state machines) |
| Partners | partners, partner_pois, partner_onboarding | **Ja** (CRUD, NIET onboarding workflow) |
| Auth/Users | admin_users, Sessions, Roles, Permissions | **NIET wrappen** — conflicteert met Directus auth |
| Chatbot | holibot_* (7 tabellen) | **NIET wrappen** — intern |
| GDPR | consent_*, GDPR_Logs, gdpr_deletion_requests | **NIET wrappen** — compliance-intern |
| Config | destinations, platform_config | **Ja** |
| Legacy | POI_OLD, QnA_OLD, events, transactions, etc. | **NIET wrappen** |

### 4.3 Feature-mapping (A/B/C/D)

| Feature | Classificatie | Must-Have? |
|---------|--------------|-----------|
| POI CRUD | A | Must-have |
| Review management | A | Must-have |
| Category management | A | Nice-to-have |
| Audit trail | A | Must-have |
| i18n meertaligheid | A | Must-have |
| Dark mode | A | Nice-to-have |
| Admin user CRUD | B | Must-have |
| Image management | B | Must-have |
| Branding/logo | B | Must-have |
| RBAC destination scope | B | Must-have |
| Multi-destination routing | B | Must-have |
| **Dashboard KPIs** | **C** | **Must-have** |
| **Payment management** | **C** | **Must-have** |
| **Ticketing (inventory, QR, orders)** | **C** | **Must-have** |
| **Reservations (slots, blacklist)** | **C** | **Must-have** |
| **Commerce dashboard + fraud** | **C** | **Must-have** |
| **Partner onboarding workflow** | **C** | **Must-have** |
| **Intermediary state machine** | **C** | **Must-have** |
| **Financial (settlements, BTW, CSV)** | **C** | **Must-have** |
| **Rate limiting** | **C** | **Must-have** |
| Agent dashboard | D | Nice-to-have |
| Agent issues/SLA | D | Nice-to-have |

**10 van de 13 must-have features scoren C (custom development nodig)**

### 4.4 Agent Impact Matrix

**ALLE 21 agents: GROEN**

Geen enkele agent is afhankelijk van de Admin Portal. Alle agents communiceren direct met MySQL, MongoDB, Redis of ChromaDB. Directus heeft nul impact op het agent-systeem.

### 4.5 Scenario-vergelijking

| Criterium | A: Directus Naast | B: Directus Vervangt | C: Portal Doorontwikkelen |
|-----------|-------------------|---------------------|--------------------------|
| **Time-to-market** | 3-4 weken | 6-12 maanden | 3-6 weken |
| **Onderhoudslast (3-5 jaar)** | HOOG (2 systemen) | EXTREEM HOOG (Directus extensions) | MEDIUM (1 systeem) |
| **Schaalbaarheid (50+ tenants)** | MEDIUM | LAAG (extensions schalen slecht) | HOOG (na runtime config migratie) |
| **Gebruiksvriendelijkheid partners** | SLECHT (2 interfaces) | GOED (1 interface, maar beperkt) | GOED (1 interface, custom) |
| **Impact bestaande architectuur** | MEDIUM (sync laag) | EXTREEM HOOG (volledige herschrijving) | LAAG (incrementeel) |
| **Kosten** | €8.000-12.000 | €60.000-120.000 | €12.000-20.000 |
| **Risicoprofiel** | MEDIUM | EXTREEM HOOG | LAAG |
| **Toekomstbestendigheid** | LAAG (fragmentatie) | MEDIUM (community, maar lock-in) | HOOG (volledige controle) |

#### Scores (1-10, hoger = beter)

| Criterium | Gewicht | A | B | C |
|-----------|---------|---|---|---|
| Time-to-market | 15% | 7 | 2 | 8 |
| Onderhoudslast | 20% | 4 | 2 | 7 |
| Schaalbaarheid | 15% | 5 | 3 | 8 |
| Gebruiksvriendelijkheid | 10% | 3 | 6 | 7 |
| Impact architectuur | 15% | 5 | 1 | 9 |
| Kosten | 10% | 6 | 2 | 7 |
| Risicoprofiel | 10% | 5 | 1 | 8 |
| Toekomstbestendigheid | 5% | 4 | 5 | 8 |
| **Gewogen Totaal** | **100%** | **4,85** | **2,35** | **7,70** |

### 4.6 Aanbeveling

## **Scenario C: Admin Portal Doorontwikkelen ZONDER Directus**

### Onderbouwing

1. **42% van de features vereist custom development** — Directus lost het kernprobleem niet op. De complexiteit zit niet in content management (wat Directus goed doet) maar in commerce, finance en state machines (wat Directus niet kan).

2. **Multi-tenancy fundament is AL aanwezig** — 27 tabellen hebben `destination_id`, de `destinations` tabel heeft `feature_flags` en `config` JSON-velden, en de Admin Portal ondersteunt al destination scoping + branding. De stap naar 50+ tenants vereist:
   - Build-time → runtime destination config migratie (~40 uur)
   - Destination CRUD in Admin Portal (~20 uur)
   - Template-gebaseerde frontend generatie (~60 uur)
   - Totaal: ~120-200 uur

3. **Agents zijn volledig ontkoppeld** — Alle 21 agents communiceren direct met de database. Geen enkel scenario vereist agent-aanpassingen.

4. **Directus introduceert complexiteit zonder proportioneel voordeel** — Bij Scenario A krijg je twee admin-systemen (fragmentatie), bij Scenario B een herschrijving van 600-900 uur. In beide gevallen is Directus overkill voor wat effectief een configuratie-uitbreiding is.

5. **De bestaande codebase is goed** — 137 endpoints, RBAC, rate limiting, HMAC crypto, ACID transactions, audit trails. Tech debt is laag. De Admin Portal is enterprise-grade, niet "self-built" in de zin van fragiel.

6. **Context: Claude als developer, emigratie oktober 2026** — Met Claude als primaire developer is de bestaande codebase het meest productieve pad. Een migratie naar Directus zou maanden kosten en afbreukrisico opleveren, juist wanneer stabiliteit nodig is.

### Concreet Stappenplan (Scenario C)

| Stap | Beschrijving | Geschatte Uren | Prioriteit |
|------|--------------|---------------|-----------|
| 1 | Runtime destination config (verwijder VITE_DESTINATION_ID build-time dependency) | 40 | P0 |
| 2 | Destination CRUD in Admin Portal (create/update destinations zonder code change) | 20 | P0 |
| 3 | Template-selectie systeem voor frontend (5-10 templates, branding tokens) | 60 | P1 |
| 4 | White-label domain routing (wildcard DNS + dynamic Apache vhosts) | 20 | P1 |
| 5 | Onboarding wizard voor nieuwe tenants (destination + branding + feature flags) | 40 | P2 |
| 6 | Automated test suite (Playwright E2E, unit tests voor services) | 80 | P2 |
| **Totaal** | | **~260 uur** | |

### Wanneer Directus WEL Overwegen

Directus wordt relevant als:
- Er een **dedicated technical team** is (niet solo-Claude)
- De focus verschuift naar **pure content management** voor 100+ niet-technische content editors
- De commerce/finance features **niet meer relevant** zijn (bijv. pivot naar pure content platform)

Voor de huidige situatie — startup-budget, Claude als developer, 50+ white-label ambitie, complex commerce model — is doorontwikkelen van de bestaande Admin Portal de verstandigste keuze.

---

*Dit rapport is gegenereerd op basis van directe database queries, codebase analyse (76.534 LOC backend, 9.347 LOC admin, 41.034 LOC frontend), en productie-server verificatie via SSH.*
