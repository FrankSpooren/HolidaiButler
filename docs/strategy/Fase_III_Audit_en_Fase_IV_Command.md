# Fase III Audit & Fase IV Command
## HolidaiButler Platform — Enterprise Kwaliteitstoetsing

**Datum**: 2 maart 2026
**Scope**: Audit Fase III (Blok G+A+B+C+D+E+F) + Command Fase IV (Intermediair & Revenue)
**Doel**: Toetsing enterprise-level kwaliteit + openstaande punten meenemen in Fase IV

---

## DEEL 1: FASE III AUDIT — UITVOERING VOLGENS PLANNING

### 1.1 Blok-voor-Blok Beoordeling

**Blok G — Juridische Documentatie**: ✅ Conform planning. 6 concept-templates (AV, verwerkersovereenkomst, partner agreement, Adyen setup docs). Dit zijn juridische concepten, geen definitieve versies — is voldoende als startpunt, maar vereist juridische review vóór live transacties.

**Blok A — Payment Engine / Adyen**: ✅ Conform planning. Adyen SDK v30, Sessions flow (PCI DSS SAQ-A compliant), HMAC-SHA256 webhook verificatie, 2 DB tabellen (payment_transactions, payment_refunds), 3 customer + 5 admin endpoints. Architectuurbeslissing: Adyen Sessions flow = correcte keuze (Adyen handelt PCI scope af).

**Blok B — Ticketing Module**: ✅ Conform planning. 5 DB tabellen, Redis inventory locking + MySQL FOR UPDATE transactie (dual-lock), QR HMAC-SHA256, voucher systeem, BullMQ expired reservation job. 6 customer + 15 admin endpoints.

**Blok C — Reservation Module**: ✅ Conform planning. 3 DB tabellen + ALTER TABLE POI (reservation fields), Redis slot locking, auto-blacklist (3 no-shows), 4 BullMQ jobs (expired, reminders, GDPR guest cleanup), GDPR data retention 24 maanden.

**Blok D — Chatbot-to-Book**: ✅ Conform planning. 4 booking sub-intents in 5 talen (incl. FR), conversational booking flow (ragService v2.6), booking context tracking (contextService v1.1, 15-min timeout), 7 commerce feature flags per destination, bookingMessages.js + bookingParser.js.

**Blok E — Admin Commerce Dashboard**: ✅ Conform planning. commerceService.js (READ-ONLY aggregatie), CommercePage.jsx met 4 tabs (Dashboard KPIs + Recharts, Reports + reconciliatie, Alerts 6 fraud types, Export CSV BOM), RBAC platform_admin + poi_owner, 10 endpoints (99 totaal).

**Blok F — Testing & Compliance**: ✅ Conform planning. PCI DSS SAQ-A checklist, payment tests, race condition tests, GDPR audit, security audit, 7 compliance documenten.

**Conclusie**: Alle 7 blokken zijn uitgevoerd conform de planning uit de Strategic Roadmap Advisory v2.0. De documentatie in zowel CLAUDE.md (v3.58.0) als Master Strategie (v7.24) is gesynchroniseerd. Endpoint count (99), adminPortal.js versie (v3.17.0), en scheduled jobs (46) zijn consistent.

---

## DEEL 2: ENTERPRISE KWALITEITSTOETSING — BEVINDINGEN

### 2.1 Bevindingen die Aandacht Vereisen vóór of tijdens Fase IV

#### ⚠️ BEVINDING 1: Adyen End-to-End Testing Incompleet (HOOG)

**Status**: 7/17 payment test scenario's zijn code-verified, 10/17 zijn "blocked — Adyen frontend". Dit betekent dat de Adyen Drop-in component nog niet in een browser is getest met een echte (test) Adyen-omgeving.

**Risico**: De Payment Engine is het fundament voor de Intermediair-module. Zonder bewezen end-to-end Adyen-flow (sessie aanmaken → Drop-in renderen → testbetaling → webhook ontvangen → transactie afronden) bestaat het risico dat de Intermediair-module bouwt op niet-geverifieerde betaalinfrastructuur.

**Aanbeveling**: Adyen Test-omgeving configureren en 5 kernscenario's live testen (iDEAL, card, refund, webhook, error handling) als eerste stap van Fase IV. Dit vereist: Adyen Test API Key + Merchant Account configuratie, test frontend deployment met Drop-in component.

**Meenemen in Fase IV**: JA — als Pre-flight Blok 0.

#### ⚠️ BEVINDING 2: Commerce Feature Flags = Alle FALSE (MIDDEL)

**Status**: Alle 7 commerce feature flags (hasBooking, hasTicketing, hasReservations, hasChatToBook, hasGuestCheckout, hasDeposits, hasDynamicPricing) staan op `false` voor alle destinations.

**Risico**: De volledige commerce pipeline (ticketing, reservering, chatbot-to-book) is gebouwd maar nog nooit end-to-end getest in een live omgeving met flags op `true`.

**Aanbeveling**: Staged activatie: eerst één flag tegelijk op test-omgeving, dan combinaties, dan productie.

**Meenemen in Fase IV**: JA — als onderdeel van activatiestrategie.

#### ⚠️ BEVINDING 3: PCI DSS SAQ-A — 3 Handmatige Items (MIDDEL)

**Status**: 14/17 auto-verified PASS, 3 items vereisen handmatige bevestiging.

**Risico**: Zonder volledige PCI DSS compliance mag Adyen productie niet geactiveerd worden.

**Aanbeveling**: De 3 handmatige items documenteren en afronden als onderdeel van Adyen-activatie.

**Meenemen in Fase IV**: JA — als onderdeel Pre-flight Blok 0.

#### ⚠️ BEVINDING 4: GDPR Compliance — 4 Items Niet-Automatisch (MIDDEL)

**Status**: 27/31 PASS, 2 handmatig, 2 anderszins.

**Risico**: GDPR compliance is wettelijk verplicht. De Intermediair-module verwerkt extra persoonsgegevens (commissiedata, financiële transacties).

**Aanbeveling**: De 4 resterende GDPR items afronden. De Intermediair-module moet vanaf ontwerp GDPR-by-design zijn met expliciete data retention, consent logging, en DSAR-support.

**Meenemen in Fase IV**: JA — als architectuureis.

#### ⚠️ BEVINDING 5: Juridisch Advies Commissiemodel (HOOG — EXTERN)

**Status**: De Strategic Roadmap Advisory stelt expliciet: "Win juridisch advies in over het commissie/intermediairmodel vóór Fase IV start."

**Risico**: Het financiële model (commissie-inhouding via HolidaiButler als intermediair) heeft juridische en fiscale implicaties die de architectuur beïnvloeden (BTW, factuurplicht, bemiddelingsvergoeding vs. provisie, aansprakelijkheid).

**Aanbeveling**: Dit is een **blokkerend extern punt**. De technische architectuur van de Intermediair-module hangt af van het juridische kader. Twee scenario's:
- **Scenario A**: Frank heeft al juridisch advies ingewonnen → architectuur direct bouwen conform advies
- **Scenario B**: Nog geen advies → Fase IV starten met een flexibele state machine die beide modellen ondersteunt (pure bemiddeling vs. eigenhandel), juridisch advies parallel inwinnen

**Meenemen in Fase IV**: JA — als beslispunt vóór start.

#### ℹ️ BEVINDING 6: Adyen KYC-status Onbekend (MIDDEL)

**Status**: Adyen account details zijn bekend (Merchant Account = HolidaiButler378ECOM), maar de KYC-status (goedgekeurd / in behandeling / niet gestart) is niet gedocumenteerd.

**Risico**: Adyen KYC kan weken duren. Zonder goedgekeurd KYC-proces is live betaling niet mogelijk.

**Aanbeveling**: KYC-status verifiëren bij Adyen. Als niet gestart: onmiddellijk starten.

**Meenemen in Fase IV**: JA — als pre-flight verificatie.

### 2.2 Bevindingen die Correct Opgelost Zijn (Geen Actie Nodig)

| Item | Was Probleem | Huidige Status |
|------|-------------|----------------|
| Sessions.user_id UUID mismatch | INT vs CHAR(36) crash | ✅ Definitief opgelost (10C): ALTER TABLE VARCHAR(36) |
| Frontend security headers | Ontbraken op 5 domeinen | ✅ Opgelost (10C): X-Frame-Options + 3 headers |
| Agent config datacorruptie | 7e cyclus placeholders | ✅ Opgelost (10A-R): dual-layer validatie |
| npm vulnerabilities | 17 vulnerabilities | ✅ Opgelost (11B): 0C/0H/0M |
| Agent status berekening | Stale = error (vals alarm) | ✅ Opgelost (9G): cron-aware thresholds |
| JOB_ACTOR_MAP attributie | Alles als 'orchestrator' | ✅ Opgelost (9H): 9 correcte mappings |
| RBAC scoping | Niet live geverifieerd | ✅ Geverifieerd (9G): 4 rollen, middleware actief |
| Rate limiter exemption | Admin locked door eigen security | ✅ Opgelost (9F): IP whitelist + JWT bypass |

### 2.3 Geaccepteerde Risico's (Bewust Besloten)

| Item | Status | Rationale |
|------|--------|-----------|
| CSP headers niet geïmplementeerd | Open — bewust uitgesteld | Kan inline scripts/fonts/CDN breken; vereist uitgebreide testing |
| 3 agents gedeactiveerd | Geaccepteerd | Architect/Leermeester/Thermostaat — reactiveren bij bewezen ROI |
| SSL cert vervalt 2026-05-11 | Gemonitord | De Dokter monitort; auto-renewal via certbot |
| Opening repetitie ("The scent of" 162x) | Open | Cosmetisch, geen functioneel risico |
| Baseline 2σ kalibratie | Open | Na 4+ weken data herkalibreren |

### 2.4 Architectuurkwaliteit — Geen Workarounds Gevonden

Na doorlichting van de volledige documentatie zijn er **geen tijdelijke oplossingen of workarounds** geïdentificeerd die later een probleem kunnen vormen:

- **Dual-lock mechanisme** (Redis + MySQL FOR UPDATE) voor inventory en slot locking = enterprise-grade patroon
- **HMAC-SHA256 QR-codes** = offline valideerbaar, niet te vervalsen
- **BullMQ jobs** voor expired reservations, reminders, en GDPR cleanup = robuust en schaalbaar
- **Commerce feature flags per destination** = gecontroleerde activatie zonder code-wijzigingen
- **READ-ONLY commerceService.js** = aggregatie-laag die nooit data muteert (veilig)
- **bookingParser.js** = dedicated parser i.p.v. regex-in-ragService (separation of concerns)
- **contextService.js v1.1** = in-memory tracking met TTL (GDPR-compliant, geen PII persistentie)

De eerder geïdentificeerde Sessions.user_id workaround (non-blocking .catch()) is permanent opgelost via ALTER TABLE in Fase 10C.

---

## DEEL 3: FASE IV COMMAND — INTERMEDIAIR & REVENUE

### 3.0 Beslispunten voor Frank vóór Start

| # | Beslispunt | Impact | Deadline |
|---|-----------|--------|----------|
| 1 | **Juridisch advies commissiemodel**: Is er advies ingewonnen? Zo ja, welk model (bemiddeling vs. eigenhandel)? | Bepaalt financiële architectuur | Vóór start Blok B |
| 2 | **Adyen KYC-status**: Goedgekeurd of niet? | Blokkeert live betalingen | Verifieer vandaag |
| 3 | **Commissiepercentage**: Wat is het beoogde % per transactietype? | Bepaalt financiële berekeningen | Vóór start Blok B |
| 4 | **Eerste activatie-destination**: Calpe of Texel eerst? | Bepaalt test-strategie | Vóór start Blok C |
| 5 | **Partner acquisitie**: Zijn er al POI-contacten die willen meedoen? | Bepaalt of live testing mogelijk is | Parallel |

---

### 3.1 Fase IV Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERMEDIAIR MODULE                         │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  State        │    │  Financieel   │    │  Partner      │   │
│  │  Machine      │───▶│  Proces       │───▶│  Management   │   │
│  │  (Communicatie)│    │  (ACID)       │    │  (CRM lite)   │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                    │            │
│  ┌──────▼───────────────────▼────────────────────▼───────┐   │
│  │              intermediairService.js                     │   │
│  │   State transitions + Financial calculations + Audit   │   │
│  └────────────────────────┬──────────────────────────────┘   │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────────────┐   │
│  │  Afhankelijkheden (Fase III):                          │   │
│  │  paymentService.js | ticketingService.js |             │   │
│  │  reservationService.js | ragService.js v2.6            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Agents (nieuw):                                              │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Intermediair │  │ Financial      │  │ Inventory Sync  │     │
│  │ Agent        │  │ Monitor Agent  │  │ Agent           │     │
│  └────────────┘  └────────────────┘  └────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Blokindeling Fase IV

| Blok | Naam | Inhoud | Afhankelijk van |
|------|------|--------|-----------------|
| **0** | **Pre-flight & Adyen Activatie** | Adyen E2E test, feature flag activatie, PCI/GDPR afronden | Fase III compleet |
| **A** | **Partner Management Module** | Partner registratie, onboarding, commissie-afspraken, CRM | Blok 0 |
| **B** | **Intermediair State Machine** | Communicatieproces: voorstel → toestemming → bevestiging → delen → reminder → review | Blok A + juridisch advies |
| **C** | **Financieel Proces** | Commissie-inhouding, settlement, reconciliatie, facturatie, audit trail | Blok B |
| **D** | **Agent Ecosysteem v5.1** | 3 nieuwe agents: Intermediair, Financial Monitor, Inventory Sync | Blok B+C |
| **E** | **Admin Intermediair Dashboard** | Partner overzicht, transactie monitoring, settlement rapportage, fraud alerting | Blok C+D |
| **F** | **Testing & Go-Live Prep** | E2E tests, live partner pilot, feature flag activatie productie | Blok E |

---

## DEEL 4: CLAUDE CODE COMMAND — FASE IV

```markdown
# ╔══════════════════════════════════════════════════════════════════╗
# ║  FASE IV: INTERMEDIAIR & REVENUE — CLAUDE CODE COMMAND          ║
# ║  HolidaiButler Platform                                         ║
# ║  Datum: 2 maart 2026                                            ║
# ║  Eigenaar: Frank Spooren                                        ║
# ╚══════════════════════════════════════════════════════════════════╝

## CONTEXT

Lees ALTIJD eerst:
1. CLAUDE.md (repo root) — source of truth, v3.58.0
2. Master Strategie (docs/strategy/) — v7.24
3. CLAUDE_HISTORY.md — ALLEEN als historische details nodig zijn

FASE III (Commerce Foundation) is VOLLEDIG COMPLEET:
- Payment Engine (Adyen SDK v30, sessions flow, HMAC webhooks)
- Ticketing Module (5 DB tabellen, Redis dual-lock, QR HMAC-SHA256)
- Reservation Module (3 DB tabellen, slot locking, GDPR cleanup)
- Chatbot-to-Book (ragService v2.6, 4 booking sub-intents, 5 talen)
- Admin Commerce Dashboard (commerceService.js, 10 endpoints)
- 99 admin endpoints, adminPortal.js v3.17.0, 46 scheduled jobs

## ENTERPRISE KWALITEITSSTANDAARDEN (BINDEND)

1. Enterprise Level Kwaliteit: Elke stap = enterprise-level, state-of-the-art. Geen concessies.
2. Foutloze Deployments: Alle errors opgelost VOORDAT feature als afgerond beschouwd wordt.
3. CLAUDE.md Actualisatie: Na elke blok bijwerken + push naar Hetzner + GitHub.
4. Context Verificatie: CLAUDE.md + MS lezen, actuele status verifiëren, geen aannames.
5. Geen Workarounds: Root cause oplossing, geen tijdelijke fixes.
6. Versie-Sync Controle: Na elk blok — CLAUDE.md header, MS header + status, endpoints, jobs, etc.

## PRE-FLIGHT CHECKS (VERPLICHT VOOR ELKE BLOK)

Voordat je aan een blok begint:
1. ✅ Lees CLAUDE.md actuele versie
2. ✅ SSH naar Hetzner: `pm2 status` + `redis-cli ping` + BullMQ job count (verwacht: 46+)
3. ✅ Verifieer DB schema: `DESCRIBE <tabel>` voor elke tabel die je gaat wijzigen
4. ✅ Verifieer bestaande code: `cat <bestand>` voordat je wijzigt
5. ✅ Git status: `git status` + `git log --oneline -5` op Hetzner

## ═══════════════════════════════════════════════════════════════
## BLOK 0: PRE-FLIGHT & ADYEN ACTIVATIE
## ═══════════════════════════════════════════════════════════════

### Doel
De Fase III commerce-modules end-to-end valideren voordat de
Intermediair-module erop bouwt. Feature flags activeren op test-omgeving.

### Stap 0.1: Adyen Test-Omgeving Verificatie

1. SSH naar Hetzner
2. Verifieer Adyen configuratie in `.env`:
   - ADYEN_API_KEY (test key)
   - ADYEN_MERCHANT_ACCOUNT (HolidaiButler378ECOM)
   - ADYEN_HMAC_KEY
   - ADYEN_CLIENT_KEY (frontend)
   - ADYEN_ENVIRONMENT=test
3. Test sessie-aanmaak via curl:
   ```bash
   curl -X POST https://api.holidaibutler.com/api/v1/payments/sessions \
     -H "Content-Type: application/json" \
     -H "X-Destination-ID: calpe" \
     -d '{"amount": 1000, "currency": "EUR", "returnUrl": "https://holidaibutler.com/payment/result"}'
   ```
4. Documenteer resultaat (sessie ID, of error + root cause)

### Stap 0.2: Feature Flag Activatie (TEST alleen)

1. Update `config/destinations/calpe.config.js`:
   ```javascript
   commerce: {
     hasBooking: true,      // was: false
     hasTicketing: true,     // was: false
     hasReservations: true,  // was: false
     hasChatToBook: true,    // was: false
     hasGuestCheckout: false,  // bewust false
     hasDeposits: false,       // bewust false
     hasDynamicPricing: false  // bewust false
   }
   ```
2. Deploy naar TEST-omgeving ALLEEN (NIET main)
3. Verifieer: chatbot toont booking-opties, ticketing-pagina laadt, reservering-formulier toont

### Stap 0.3: PCI DSS + GDPR Afrondende Items

1. De 3 handmatige PCI DSS items uit docs/compliance/pci-dss-saq-a.md afronden
2. De 4 resterende GDPR items uit docs/compliance/gdpr-compliance-checklist.md afronden
3. Documenteer resultaten in compliance-bestanden
4. .env permissions verifiëren: `ls -la .env` → verwacht: 600 (niet 644)

### Stap 0.4: Documentatie

- CLAUDE.md bijwerken: Blok 0 resultaten, feature flag status
- MS bijwerken: Fase IV Blok 0 entry
- Versie-sync controle

### Verificatie Blok 0
- [ ] Adyen sessie-aanmaak succesvol op test
- [ ] Feature flags actief op test-omgeving
- [ ] PCI DSS + GDPR items afgerond
- [ ] .env permissions correct
- [ ] CLAUDE.md + MS bijgewerkt

## ═══════════════════════════════════════════════════════════════
## BLOK A: PARTNER MANAGEMENT MODULE
## ═══════════════════════════════════════════════════════════════

### Doel
POI-eigenaars (restaurants, attracties, activiteiten) als partners
registreren met commissie-afspraken, zodat de Intermediair-module
weet met WIE er gecommuniceerd wordt en WELKE afspraken gelden.

### Stap A.1: Database Schema

Maak de volgende tabellen aan:

```sql
-- Partners tabel (POI-eigenaars die meedoen aan het intermediair-programma)
CREATE TABLE partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  poi_id INT,                           -- FK naar POI (optioneel: partner kan meerdere POIs hebben)
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  iban VARCHAR(34),                      -- Europees rekeningnummer voor settlements
  kvk_number VARCHAR(20),               -- KvK / BTW-nummer
  vat_number VARCHAR(20),               -- BTW-identificatienummer
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,  -- Commissie % (standaard 15%)
  commission_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  contract_status ENUM('draft', 'pending', 'active', 'suspended', 'terminated') DEFAULT 'draft',
  contract_start_date DATE,
  contract_end_date DATE,
  onboarding_completed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  INDEX idx_destination (destination_id),
  INDEX idx_poi (poi_id),
  INDEX idx_contract_status (contract_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner POI koppelingen (1 partner kan meerdere POIs beheren)
CREATE TABLE partner_pois (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  poi_id INT NOT NULL,
  commission_override DECIMAL(5,2),    -- Afwijkend % voor specifiek POI
  services_offered JSON,                -- Welke diensten: ["ticketing", "reservation", "activities"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  UNIQUE KEY uk_partner_poi (partner_id, poi_id),
  INDEX idx_poi_id (poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner onboarding stappen
CREATE TABLE partner_onboarding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
  completed_at DATETIME,
  completed_by VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  INDEX idx_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Stap A.2: Partner Service (Backend)

Maak `platform-core/src/services/partner/partnerService.js`:
- CRUD operaties voor partners
- Partner-POI koppelingen beheer
- Onboarding workflow tracking
- Commissie-rate berekeningen
- Validatie: IBAN format (NL/BE/ES), BTW-nummer, KvK-nummer
- GDPR: partner data is zakelijk (geen natuurlijke persoon beperking), maar wel audit trail

### Stap A.3: Partner API Endpoints

Voeg toe aan `adminPortal.js`:

**Admin endpoints (RBAC: platform_admin):**
- `GET /api/v1/admin-portal/partners` — lijst met filters (destination, status, search)
- `GET /api/v1/admin-portal/partners/:id` — detail incl. POIs en onboarding
- `POST /api/v1/admin-portal/partners` — aanmaken + start onboarding
- `PUT /api/v1/admin-portal/partners/:id` — bijwerken
- `PUT /api/v1/admin-portal/partners/:id/status` — contract status wijzigen
- `GET /api/v1/admin-portal/partners/:id/transactions` — transactie-overzicht per partner
- `GET /api/v1/admin-portal/partners/stats` — dashboard KPIs (actieve partners, omzet, commissie)

**Geschatte toename**: 7 endpoints → 106 totaal admin endpoints.

### Stap A.4: Admin Frontend — PartnersPage

Maak `admin-module/src/pages/PartnersPage.jsx`:
- Tabel met partners (naam, destination, status, commissie%, # POIs, omzet)
- Partner detail dialog (profiel + POIs + onboarding + transacties)
- Partner aanmaken wizard (3 stappen: bedrijfsgegevens → POI-koppeling → commissie-afspraken)
- Contract status management (draft → pending → active → suspended/terminated)
- i18n 4 talen

### Stap A.5: Documentatie + Deploy

- CLAUDE.md bijwerken: Blok A resultaten, schema, endpoints
- MS bijwerken: Fase IV Blok A entry
- Deploy dev → test → main
- Versie-sync controle

### Verificatie Blok A
- [ ] Partner tabellen aangemaakt op Hetzner
- [ ] 7 admin endpoints werkend (test via curl/Postman)
- [ ] PartnersPage rendert in admin portal
- [ ] Partner CRUD correct (aanmaken, bewerken, status wijzigen)
- [ ] RBAC: alleen platform_admin heeft toegang
- [ ] i18n 4 talen
- [ ] CLAUDE.md + MS bijgewerkt

## ═══════════════════════════════════════════════════════════════
## BLOK B: INTERMEDIAIR STATE MACHINE
## ═══════════════════════════════════════════════════════════════

### Doel
Het communicatie- en orkestratieproces implementeren als een
finite state machine met ACID-compliant transities.

### State Machine Definitie

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌──────────┐
│ INITIATED │───▶│ PROPOSED  │───▶│ PARTNER_     │───▶│ CONFIRMED│
│           │    │ (naar     │    │ ACCEPTED     │    │ (betaling│
│ (klant    │    │  partner) │    │ (partner     │    │  voldaan) │
│  start)   │    │           │    │  akkoord)    │    │          │
└──────────┘    └───────────┘    └──────────────┘    └──────────┘
                     │                  │                   │
                     ▼                  ▼                   ▼
               ┌───────────┐    ┌──────────────┐    ┌──────────┐
               │ PARTNER_  │    │ EXPIRED      │    │ SHARED   │
               │ DECLINED  │    │ (timeout)    │    │ (QR/email│
               └───────────┘    └──────────────┘    │  verstuurd)│
                                                     └─────┬────┘
                                                           │
                                                     ┌─────▼────┐
                                                     │ COMPLETED │
                                                     │ (klant    │
                                                     │  feedback)│
                                                     └─────┬────┘
                                                           │
                                                     ┌─────▼────┐
                                                     │ REVIEWED  │
                                                     │ (review   │
                                                     │  geplaatst)│
                                                     └──────────┘
```

**Mogelijke overgangen (transitions)**:
- INITIATED → PROPOSED (systeem stuurt voorstel naar partner)
- PROPOSED → PARTNER_ACCEPTED (partner bevestigt)
- PROPOSED → PARTNER_DECLINED (partner weigert)
- PROPOSED → EXPIRED (geen reactie binnen timeout)
- PARTNER_ACCEPTED → CONFIRMED (klant betaalt)
- CONFIRMED → SHARED (QR/confirmatie verstuurd naar klant)
- SHARED → COMPLETED (na bezoek/activiteit)
- COMPLETED → REVIEWED (klant plaatst review)

**Elke transitie is idempotent**: herhaald aanroepen levert hetzelfde resultaat.

### Stap B.1: Database Schema

```sql
-- Intermediair transacties (het commerciële hart)
CREATE TABLE intermediary_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_uuid CHAR(36) NOT NULL UNIQUE,
  destination_id INT NOT NULL,
  -- Betrokken partijen
  customer_session_id VARCHAR(255),      -- Anonieme sessie (GDPR)
  customer_email VARCHAR(255),           -- Optioneel, voor confirmatie
  customer_name VARCHAR(255),            -- Optioneel
  partner_id INT NOT NULL,
  poi_id INT NOT NULL,
  -- Type en details
  transaction_type ENUM('ticket', 'reservation', 'activity') NOT NULL,
  reference_id INT,                      -- FK naar tickets/reservations/activities tabel
  reference_type VARCHAR(50),            -- 'ticket_order', 'reservation', 'activity_booking'
  -- State machine
  status ENUM('initiated', 'proposed', 'partner_accepted', 'partner_declined',
              'expired', 'confirmed', 'shared', 'completed', 'reviewed',
              'cancelled', 'refunded', 'disputed') NOT NULL DEFAULT 'initiated',
  status_history JSON,                   -- Array van {status, timestamp, actor, reason}
  -- Financieel
  gross_amount DECIMAL(10,2) NOT NULL,   -- Bruto bedrag (wat klant betaalt)
  commission_rate DECIMAL(5,2) NOT NULL, -- Commissie % op moment van transactie
  commission_amount DECIMAL(10,2) NOT NULL, -- Berekende commissie
  net_amount DECIMAL(10,2) NOT NULL,     -- Netto voor partner (gross - commission)
  currency CHAR(3) DEFAULT 'EUR',
  -- Adyen koppeling
  payment_transaction_id INT,            -- FK naar payment_transactions
  -- Timing
  proposed_at DATETIME,
  partner_responded_at DATETIME,
  confirmed_at DATETIME,
  shared_at DATETIME,
  completed_at DATETIME,
  reviewed_at DATETIME,
  expires_at DATETIME,                   -- Auto-expire na X uur
  -- QR en validatie
  qr_code_hash VARCHAR(64),             -- HMAC-SHA256 (hergebruik Fase III patroon)
  qr_validated_at DATETIME,
  -- Metadata
  notes TEXT,
  metadata JSON,                         -- Flexibel veld voor extra context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Indexes
  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  INDEX idx_status (status),
  INDEX idx_destination_status (destination_id, status),
  INDEX idx_partner (partner_id),
  INDEX idx_customer_email (customer_email),
  INDEX idx_created (created_at),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settlement tracking (periodieke uitbetalingen aan partners)
CREATE TABLE settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settlement_uuid CHAR(36) NOT NULL UNIQUE,
  partner_id INT NOT NULL,
  destination_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_transactions INT DEFAULT 0,
  total_gross DECIMAL(10,2) DEFAULT 0.00,
  total_commission DECIMAL(10,2) DEFAULT 0.00,
  total_net DECIMAL(10,2) DEFAULT 0.00,
  currency CHAR(3) DEFAULT 'EUR',
  status ENUM('pending', 'calculated', 'approved', 'paid', 'disputed') DEFAULT 'pending',
  paid_at DATETIME,
  payment_reference VARCHAR(255),
  invoice_number VARCHAR(50),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  INDEX idx_partner_period (partner_id, period_start),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Stap B.2: Intermediair Service (Backend)

Maak `platform-core/src/services/intermediary/intermediaryService.js`:

```javascript
// Kern: State Machine met ACID-compliant transities
class IntermediaryService {
  // Elke transitie in een MySQL transactie
  async transition(transactionId, newStatus, actor, reason) {
    // 1. BEGIN TRANSACTION
    // 2. SELECT ... FOR UPDATE (lock de rij)
    // 3. Valideer transitie (huidige status → nieuwe status)
    // 4. UPDATE status + status_history (append)
    // 5. Trigger side-effects (email, webhook, BullMQ job)
    // 6. COMMIT
    // 7. Audit log (MongoDB)
    // Idempotent: als status al = newStatus, return success (geen error)
  }

  // Financiële berekening (altijd op moment van transactie-aanmaak)
  calculateCommission(grossAmount, commissionRate) {
    // Afrondingsregel: altijd naar boven afronden op 2 decimalen
    // commission = Math.ceil(grossAmount * commissionRate / 100 * 100) / 100
    // net = grossAmount - commission
  }

  // Auto-expire: BullMQ job controleert elke 15 minuten
  async expireStaleTransactions() {
    // PROPOSED langer dan 24u → EXPIRED
    // PARTNER_ACCEPTED langer dan 48u zonder betaling → EXPIRED
  }
}
```

### Stap B.3: Customer API Endpoints

Maak `platform-core/src/routes/intermediary.js`:

**Customer endpoints (geen auth, sessie-gebaseerd):**
- `POST /api/v1/intermediary/initiate` — Start transactie (via chatbot of directe boeking)
- `GET /api/v1/intermediary/:uuid/status` — Status opvragen (polling)
- `POST /api/v1/intermediary/:uuid/confirm` — Bevestig + start betaling
- `GET /api/v1/intermediary/:uuid/qr` — QR-code ophalen (na betaling)
- `POST /api/v1/intermediary/:uuid/review` — Review plaatsen

**Partner endpoints (partner auth via token in email):**
- `GET /api/v1/intermediary/partner/:token/pending` — Openstaande voorstellen
- `POST /api/v1/intermediary/partner/:token/respond` — Accepteren/weigeren
- `GET /api/v1/intermediary/partner/:token/history` — Transactie-geschiedenis

### Stap B.4: Partner Notificatie Systeem

Gebruik bestaande Nodemailer SMTP relay (Fase 9F):
- Voorstel email naar partner (met accept/decline links + token)
- Bevestiging email naar klant (met QR-code)
- Reminder email (24u voor activiteit)
- Review-verzoek email (24u na activiteit)

Template systeem: `intermediaryEmails.js` met HTML templates per event type × 4 talen.

### Stap B.5: BullMQ Jobs

Voeg toe aan scheduler.js:
- `intermediary-expire-check` — Elke 15 min: PROPOSED/PARTNER_ACCEPTED → EXPIRED
- `intermediary-reminder` — Dagelijks 10:00: 24u-voor-activiteit reminder naar klant
- `intermediary-review-request` — Dagelijks 11:00: 24u-na-activiteit review-verzoek
- `intermediary-settlement-calc` — Wekelijks maandag 06:00: settlement berekening

### Stap B.6: Chatbot Integratie

Update `ragService.js` (v2.6 → v2.7):
- Nieuwe intent: `intermediary_booking` (onderscheid van bestaande booking_ticket/reservation)
- Flow: klant vraagt → chatbot identificeert POI + type → initieert intermediair transactie
- Terugkoppeling: status updates in chat-thread ("Je voorstel is verstuurd naar [partner]")

### Stap B.7: Documentatie + Deploy

### Verificatie Blok B
- [ ] intermediary_transactions + settlements tabellen aangemaakt
- [ ] State machine transities correct (alle paden testen)
- [ ] Idempotentie: dubbele transitie = geen error
- [ ] ACID: transactie-failure → rollback (geen half-afgeronde states)
- [ ] Commissie-berekening correct (edge cases: 0%, 100%, afrondingen)
- [ ] Auto-expire job draait (15 min interval)
- [ ] Partner notificatie emails verzonden
- [ ] QR-code generatie + validatie werkt (HMAC-SHA256)
- [ ] Chatbot intermediary_booking intent correct
- [ ] 5+ customer endpoints werkend
- [ ] 3+ partner endpoints werkend
- [ ] CLAUDE.md + MS bijgewerkt

## ═══════════════════════════════════════════════════════════════
## BLOK C: FINANCIEEL PROCES
## ═══════════════════════════════════════════════════════════════

### Doel
ACID-compliant financieel systeem: commissie-inhouding, settlement,
reconciliatie, en (concept) facturatie.

### Stap C.1: Settlement Service

Maak `platform-core/src/services/intermediary/settlementService.js`:
- Wekelijkse settlement berekening per partner (alle COMPLETED transacties)
- Settlement goedkeuring workflow (platform_admin)
- Reconciliatie: vergelijk berekende commissie vs. Adyen-transacties
- Export: CSV + (concept) factuur-PDF per settlement
- IBAN validatie voor uitbetalingen

### Stap C.2: Financial Reporting

Voeg financiële rapportage toe aan commerceService.js:
- Revenue per destination, per partner, per transactietype
- Commissie-inkomsten per periode (dag/week/maand)
- Outstanding settlements (nog niet uitbetaald)
- Transactie-funnel: initiated → confirmed → completed (conversion rates)

### Stap C.3: Adyen Payout Integratie (Voorbereiding)

Voorbereid de architectuur voor Adyen Payouts (partner-uitbetalingen):
- payout.js service stub met interface-definitie
- IBAN-gebaseerde SEPA-overschrijving flow
- NOTE: Daadwerkelijke activatie NA juridisch advies + Adyen Payout-goedkeuring

### Verificatie Blok C
- [ ] Settlement berekening correct (steekproef: handmatig narekenbaar)
- [ ] Reconciliatie matcht Adyen data
- [ ] CSV export met BOM (UTF-8) voor Excel
- [ ] Financial KPIs in admin commerce dashboard
- [ ] Payout service stub aanwezig (niet actief)

## ═══════════════════════════════════════════════════════════════
## BLOK D: AGENT ECOSYSTEEM v5.1
## ═══════════════════════════════════════════════════════════════

### Doel
3 nieuwe agents toevoegen aan het bestaande Niveau 7 ecosysteem.

### Stap D.1: Intermediair Agent (De Makelaar)

**Categorie A** (destination-aware), schedule: continuous (event-driven)

Verantwoordelijkheden:
- Monitort de state machine: stuck transacties detecteren
- Escaleert: PROPOSED > 12u zonder reactie → reminder naar partner
- Escaleert: 3+ DECLINED in 24u → alert naar owner
- Rapporteert: conversion rates per partner, response times
- Audit: alle transities loggen in MongoDB audit_logs

### Stap D.2: Financial Monitor Agent (De Kassier)

**Categorie B** (shared/platform-breed), schedule: dagelijks 06:30

Verantwoordelijkheden:
- Reconciliatie: dagelijkse vergelijking Adyen settlement vs. interne administratie
- Anomaliedetectie: onverwacht hoge/lage transactiebedragen (2σ baseline)
- Settlement status: openstaande settlements > 7 dagen → alert
- Fraud indicators: zelfde klant × zelfde POI × korte tijd
- Rapporteert aan De Bode (daily briefing sectie)

### Stap D.3: Inventory Sync Agent (De Magazijnier)

**Categorie A** (destination-aware), schedule: elke 30 min

Verantwoordelijkheden:
- Beschikbaarheid sync: Redis inventory vs. MySQL ticketinventaris
- Reservation slots: beschikbare slots per POI per dag
- Stale detection: slots die > 2u gereserveerd maar niet bevestigd
- Alert: inventory < 10% remaining voor populaire items

### Stap D.4: AGENT_METADATA + Registratie

- Voeg 3 entries toe aan AGENT_METADATA in adminPortal.js (21 totaal)
- Voeg toe aan agentRegistry.js
- JOB_ACTOR_MAP: 3 nieuwe mappings in workers.js
- BullMQ scheduler: 3 nieuwe jobs → 49+ scheduled jobs totaal
- Daily briefing: 3 nieuwe secties (intermediary_summary, financial_summary, inventory_summary)
- Per-agent errorInstructions toevoegen

### Verificatie Blok D
- [ ] 3 agents geregistreerd (21 totaal)
- [ ] 3 nieuwe BullMQ jobs draaiend (49+ totaal)
- [ ] De Makelaar: detecteert stuck transacties
- [ ] De Kassier: dagelijkse reconciliatie rapport
- [ ] De Magazijnier: inventory sync correct
- [ ] Daily briefing bevat 3 nieuwe secties
- [ ] AGENT_METADATA compleet + errorInstructions
- [ ] Admin agent dashboard toont 3 nieuwe agents

## ═══════════════════════════════════════════════════════════════
## BLOK E: ADMIN INTERMEDIAIR DASHBOARD
## ═══════════════════════════════════════════════════════════════

### Doel
Admin module uitbreiden met Intermediair-specifieke functionaliteit.

### Stap E.1: Admin API Endpoints

Voeg toe aan adminPortal.js:
- `GET /api/v1/admin-portal/intermediary/transactions` — lijst met filters
- `GET /api/v1/admin-portal/intermediary/transactions/:id` — detail
- `PUT /api/v1/admin-portal/intermediary/transactions/:id/status` — handmatige statuswijziging
- `GET /api/v1/admin-portal/intermediary/funnel` — conversie-funnel data
- `GET /api/v1/admin-portal/intermediary/settlements` — settlement overzicht
- `PUT /api/v1/admin-portal/intermediary/settlements/:id/approve` — settlement goedkeuren
- `GET /api/v1/admin-portal/intermediary/settlements/:id/export` — CSV/PDF export
- `GET /api/v1/admin-portal/intermediary/kpis` — financiële KPIs

**Geschatte toename**: 8 endpoints → 114+ totaal admin endpoints.

### Stap E.2: Admin Frontend

Maak `admin-module/src/pages/IntermediaryPage.jsx`:
- Tab 1: **Transacties** — tabel met status badges, partner naam, bedrag, conversie
- Tab 2: **Partners** — link naar PartnersPage, partner health scores
- Tab 3: **Settlements** — maand/week overzicht, approve/reject workflow
- Tab 4: **Analytics** — conversie-funnel Recharts, revenue trendlijn, partner ranking

### Stap E.3: i18n + RBAC

- i18n: ~60 nieuwe keys in NL/EN/DE/ES
- RBAC: platform_admin volledige toegang, poi_owner ziet eigen partner-data

### Verificatie Blok E
- [ ] 8 admin endpoints werkend
- [ ] IntermediaryPage rendert (4 tabs)
- [ ] Settlement goedkeuring workflow correct
- [ ] Funnel-visualisatie toont correcte data
- [ ] RBAC scoping werkt (poi_owner vs. platform_admin)
- [ ] i18n 4 talen

## ═══════════════════════════════════════════════════════════════
## BLOK F: TESTING & GO-LIVE PREP
## ═══════════════════════════════════════════════════════════════

### Doel
End-to-end validatie van de complete Intermediair flow.

### Stap F.1: E2E Test Scenario's

Minimaal 20 test scenario's:
1. Happy path: initiated → proposed → accepted → confirmed → shared → completed → reviewed
2. Partner decline: proposed → partner_declined
3. Timeout: proposed → expired (24u)
4. Payment failure: partner_accepted → betaling mislukt → retry
5. Refund: confirmed → refund request → refunded
6. Concurrent booking: 2 klanten zelfde slot → inventory lock
7. Commission calculation: diverse bedragen + percentages
8. Settlement: weekafsluiting → berekening → goedkeuring
9. QR validatie: geldige QR → COMPLETED
10. QR hergebruik: zelfde QR nogmaals → REJECTED
11-20: Edge cases per transactietype (ticket/reservation/activity)

### Stap F.2: Security Audit Intermediair

- Rate limiting op customer endpoints (geen auth → abuse-risico)
- CSRF protectie op partner response endpoints
- Token-based partner auth: cryptografisch veilig, time-limited
- SQL injection: alle queries parameterized
- IBAN validatie: server-side (niet vertrouwen op frontend)

### Stap F.3: GDPR Compliance Intermediair

- Customer data: sessie-gebaseerd, email optioneel, wis na 24 maanden
- Partner data: zakelijk, niet onder GDPR persoonsgegevens (maar wel audit trail)
- Settlement data: 7 jaar bewaarplicht (fiscaal)
- Logging: geen PII in audit_logs, alleen transactie-UUID

### Stap F.4: Feature Flag Activatie Plan

Staged rollout:
1. **Week 1**: Test-omgeving, alle flags, 10 test-transacties
2. **Week 2**: Productie Calpe, hasChatToBook=true ALLEEN (chatbot kan verwijzen, niet voltooien)
3. **Week 3**: Productie Calpe, volledige intermediair flow met 1 testpartner
4. **Week 4**: Evaluatie + besluit uitrol Texel

### Stap F.5: Documentatie Finale

- docs/compliance/ aanvullen met Intermediair-specifieke tests
- CLAUDE.md: Fase IV COMPLEET + alle versienummers
- MS: Fase IV volledige entry + Blok A-F details
- Versie-sync controle (finaal)

### Verificatie Blok F
- [ ] 20/20 E2E tests PASS
- [ ] Security audit: 0 kritieke bevindingen
- [ ] GDPR compliance: alle items afgedekt
- [ ] Feature flag plan gedocumenteerd
- [ ] CLAUDE.md + MS: Fase IV COMPLEET
- [ ] Versie-sync: alle versienummers consistent

## ═══════════════════════════════════════════════════════════════
## AFRONDENDE INSTRUCTIES
## ═══════════════════════════════════════════════════════════════

### Na Elk Blok

1. Update CLAUDE.md:
   - Header versie verhogen (3.58.0 → 3.59.0 etc.)
   - Fase IV blok entry toevoegen aan Implementatie Status
   - Endpoints + jobs aantallen bijwerken
   - adminPortal.js versie bijwerken (v3.17.0 → v3.18.0 etc.)

2. Update Master Strategie:
   - Fase overzicht tabel: Fase IV blok entry
   - Roadmap tabel: status bijwerken
   - Changelog entry
   - Footer bijwerken

3. Deploy naar Hetzner:
   - SCP CLAUDE.md naar Hetzner
   - Git push (dev → test → main, ALTIJD in volgorde)
   - PM2 restart na backend wijzigingen
   - Admin frontend: lokaal builden, dist/ deployen via tar pipe

4. Versie-sync controle:
   - CLAUDE.md header versie
   - MS header versie + datum + status
   - Admin Portal versie + endpoint count
   - BullMQ/Scheduled Jobs getal
   - MS Changelog + Footer

### Openstaande Punten uit Fase III (Meenemen)

Deze items uit de Fase III audit worden meegenomen in Fase IV:
- ⚠️ Adyen E2E testing (Blok 0)
- ⚠️ Feature flag activatie (Blok 0 + Blok F)
- ⚠️ PCI DSS handmatige items (Blok 0)
- ⚠️ GDPR resterende items (Blok 0 + Blok F)
- ⚠️ Juridisch advies commissiemodel (beslispunt vóór Blok B)
- ⚠️ Adyen KYC-status (verifieer bij start)

### Budget Schatting Fase IV

| Component | Geschatte kosten |
|-----------|-----------------|
| API calls (Mistral, Adyen test) | ~EUR 5-10 |
| Adyen test-transacties | EUR 0 (test-omgeving) |
| Email verzending (Nodemailer) | EUR 0 (SMTP relay) |
| **Totaal API kosten** | **~EUR 5-10** |
| **Development effort** | **120-160 uur** |
```

---

*Einde Fase IV Command*
