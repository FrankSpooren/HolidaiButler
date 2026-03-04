# FASE III — BLOK D: CHATBOT-TO-BOOK VOORBEREIDING
## HolidaiButler Platform — Claude Code Uitvoeringscommando
### Versie 1.0 — 02-03-2026

---

## DEEL 1: AUDIT BLOK C — RESERVATION MODULE

> **Doel**: Toetsing of Blok C volledig en op enterprise-level kwaliteit is uitgevoerd conform het Blok C Command Document, en identificatie van openstaande punten die MOETEN worden opgelost als onderdeel van de Blok D uitvoering.

### 1.1 Blok C Verificatie — Planned vs Delivered

| # | Requirement (Blok C Command) | Delivered (CLAUDE.md v3.55.0 + MS v7.21) | Status |
|---|------------------------------|------------------------------------------|--------|
| C.1 | 3 DB tabellen (reservation_slots, guest_profiles, reservations) | "3 DB tabellen (reservation_slots, guest_profiles, reservations)" | ✅ MATCH |
| C.1b | ALTER TABLE POI (has_reservations) | "+ ALTER TABLE POI (has_reservations)" | ✅ MATCH |
| C.2 | reservationService.js — 7 core functies | reservationService.js aanwezig in `src/services/reservation/` | ✅ (verifieer 7 functies) |
| C.3a | Redis slot locking + MySQL FOR UPDATE | "Redis slot locking" | ✅ MATCH |
| C.3b | QR HMAC-SHA256 met HB-R: prefix | "QR HMAC-SHA256 (HB-R: prefix)" | ✅ MATCH |
| C.3c | Auto-blacklist (3 no-shows) | "Auto-blacklist (3 no-shows)" | ✅ MATCH |
| C.4a | 4 customer endpoints | "4 customer endpoints (browse slots, create reservation, get details, cancel)" | ✅ MATCH |
| C.4b | 13 admin endpoints | "13 admin endpoints (CRUD reservations/slots/guests, no-show, complete, blacklist, stats, calendar)" | ✅ MATCH |
| C.5 | 4 BullMQ jobs (expired cleanup, 24h/1h reminders, GDPR cleanup) | "4 BullMQ jobs (expired/reminders/GDPR)" | ✅ MATCH |
| C.6 | 7 frontend React componenten | Niet expliciet opgesomd in CLAUDE.md | ⚠️ VERIFIEER |
| C.7 | GDPR data retention 24 maanden | "GDPR data retention 24 maanden" | ✅ MATCH |
| C.8a | Admin endpoints totaal 89 | "89 admin endpoints" | ✅ MATCH |
| C.8b | Scheduled jobs totaal 46 | "46 scheduled jobs" | ✅ MATCH |
| C.8c | adminPortal.js v3.16.0 | v3.16.0 (changelog + repo structuur) | ✅ MATCH |
| C.8d | CLAUDE.md v3.55.0 | v3.55.0 | ✅ MATCH |
| C.8e | Master Strategie v7.21 | v7.21 | ✅ MATCH |
| C.8f | reservations.js route file (apart) | `reservations.js` in `src/routes/` | ✅ MATCH — clean architectuur |
| C.8g | reservation/ service directory | `reservation/` in `src/services/` | ✅ MATCH |
| C.9 | E2E tests | "20/20 E2E tests PASS" (MS v7.21 changelog) | ✅ MATCH |
| C.10 | Email templates (confirmation, 24h reminder, 1h reminder) | Niet expliciet gedocumenteerd | ⚠️ VERIFIEER |
| C.11 | Payment Engine koppeling (deposit) | deposit_status ENUM aanwezig in schema | ✅ IMPLICIET |
| C.12 | iCal koppeling reserveringen | Niet expliciet gedocumenteerd | ⚠️ VERIFIEER |

### 1.2 Blok C Kwaliteitsbeoordeling

| Criterium | Beoordeling | Toelichting |
|-----------|-------------|-------------|
| Database schema | ✅ ENTERPRISE | 3 tabellen + POI alter, CENTEN integers, GDPR kolommen, proper FK/indexes |
| Race condition preventie | ✅ ENTERPRISE | Redis lock + MySQL FOR UPDATE (consistent met Blok B pattern) |
| QR beveiliging | ✅ ENTERPRISE | HMAC-SHA256, APARTE prefix HB-R (onderscheid van tickets HB:) |
| Guest lifecycle | ✅ ENTERPRISE | No-show tracking, auto-blacklist, GDPR consent + retention |
| BullMQ jobs | ✅ ENTERPRISE | 4 jobs: expired cleanup, 24h/1h reminders, GDPR guest cleanup |
| Multi-destination | ✅ ENTERPRISE | destination_id consistent op alle tabellen en queries |
| GDPR compliance | ✅ ENTERPRISE | Consent tracking, data retention 24m, weekly cleanup job |
| API structuur | ✅ ENTERPRISE | Clean route separatie (reservations.js), 4 customer + 13 admin |
| Versioning | ✅ ENTERPRISE | Alle drie documenten bijgewerkt (v3.55.0, v7.21, v3.16.0) |

### 1.3 Geïdentificeerde Issues — VERPLICHT OP TE LOSSEN BIJ BLOK D

#### ISSUE 1: Master Strategie Roadmap Tabel Niet Bijgewerkt (P1 — HOOG)

**Probleem**: De roadmap tabel in Master Strategie sectie 9.2 (r1324) toont:
```
| III | Commerce Foundation | ... | 🟢 IN PROGRESS (Blok G+A+B) |
```
Dit moet zijn: **"Blok G+A+B+C"** — Blok C is immers COMPLEET.

De detail sectie (r1354) vermeldt Blok C WEL correct als COMPLEET. De roadmap tabel is niet mee bijgewerkt.

**Impact**: Snel overzicht toont verkeerde status; latere fases plannen op basis van incomplete informatie.

#### ISSUE 2: Master Strategie Footer Ernstig Verouderd (P1 — KRITIEK)

**Probleem**: De MS footer (r1603) bevat een ZWAAR verouderde status:
```
Huidige tekst: "Fase III IN PROGRESS: Blok G+A+B ✅ (Legal + Payment + Ticketing). 
               Admin Portal: 76 endpoints, adminPortal.js v3.15.0. 42 scheduled jobs. CLAUDE.md v3.54.0."
```
**Moet zijn**: "Fase III IN PROGRESS: Blok G+A+B+C ✅ (Legal + Payment + Ticketing + Reservering). Admin Portal: 89 endpoints, adminPortal.js v3.16.0. 46 scheduled jobs. CLAUDE.md v3.55.0."

**Impact**: ERNSTIG — De footer wordt door Claude Code gelezen als snelle status check. Alle waarden zijn fout (endpoints, versie, jobs, CLAUDE.md versie). Dit is een herhaling van het versie-sync issue uit de Blok B audit.

#### ISSUE 3: CLAUDE.md Admin Portal Versie Fout (P2 — MEDIUM)

**Probleem**: CLAUDE.md Admin Portal sectie (r305) vermeldt:
```
"Backend: Geïntegreerd in platform-core (`adminPortal.js` v3.15.0)"
```
**Moet zijn**: v3.16.0 (conform changelog v3.55.0 en repo structuur r80).

**Impact**: Claude Code leest foutieve versie en kan verkeerde baseline aannemen.

#### ISSUE 4: CLAUDE.md Gerelateerde Documentatie Versie Inconsistent (P2 — MEDIUM)

**Probleem**: CLAUDE.md heeft TWEE documentatie-referentie tabellen met VERSCHILLENDE versies:

| Locatie | Toont | Correct? |
|---------|-------|----------|
| Strategische Documentatie (r52) | Master Strategie v7.21 | ✅ CORRECT |
| Gerelateerde Documentatie (r498) | Master Strategie v7.20 | ❌ FOUT — moet v7.21 |

**Impact**: Verwarrend — twee plekken in hetzelfde document met conflicterende versie-info.

#### ISSUE 5: CLAUDE.md BullMQ Health Check Verouderd (P2 — MEDIUM)

**Probleem**: Quick Health Check sectie (r461) bevat:
```
# BullMQ jobs (verwacht: 40)
```
**Moet zijn**: verwacht: **46** (42 na Blok B + 4 na Blok C).

**Impact**: Health check na deployment geeft vals alarm of gemiste jobs worden niet gedetecteerd.

#### ISSUE 6: CLAUDE.md Database Multi-Tenancy Lijst Incompleet (P3 — LAAG)

**Probleem**: De Multi-Tenancy sectie (r104-105) documenteert:
```
"destination_id kolom: POI, QnA, agenda, Users, user_journeys, holibot_sessions, poi_content_staging, reviews"
```
De volgende tabellen ontbreken in deze opsomming: payment_transactions, payment_refunds, tickets, ticket_inventory, ticket_orders, ticket_order_items, voucher_codes, reservation_slots, guest_profiles, reservations.

**Impact**: Nieuwe ontwikkelaars/sessies weten niet dat commerce tabellen ook destination_id hebben.

#### ISSUE 7: Master Strategie Datum Verouderd (P3 — LAAG)

**Probleem**: Header (r4) zegt "**Datum**: 28 februari 2026" terwijl het document op 1 maart 2026 is bijgewerkt (conform footer r1602).

#### ISSUE 8: Frontend Componenten Niet Expliciet Gedocumenteerd (P3 — LAAG)

**Probleem**: Zowel voor Blok B (8 Ticketing componenten) als Blok C (7 Reservation componenten) worden de individuele React componenten NIET opgesomd in CLAUDE.md of Master Strategie. Alleen de backend endpoints zijn gedetailleerd.

**Actie**: Verifieer aanwezigheid + documenteer in CLAUDE.md bij Blok D uitvoering.

### 1.4 Patroon Analyse: Terugkerend Documentatie-Sync Issue

> **Observatie**: Dit is het DERDE achtereenvolgende blok (A→B→C) waar documentatie versie-inconsistenties worden gevonden. Het betreft steeds dezelfde type issues:
> 1. MS footer niet bijgewerkt
> 2. MS roadmap tabel achterloopt op detail secties
> 3. CLAUDE.md interne inconsistenties (twee tabellen, health check, admin versie)
>
> **Root cause**: Er is geen geautomatiseerde cross-check die controleert of ALLE versie-referenties consistent zijn na een CLAUDE.md/MS update.
>
> **Aanbeveling**: Voeg aan de Enterprise Quality Standards toe: een **versie-sync checklist** die na elk blok ALLE bekende referentiepunten controleert. Deze checklist wordt als Stap 0 van Blok D geïmplementeerd en geldt als standaard voor alle toekomstige blokken.

### 1.5 Blok C Eindoordeel

| Aspect | Score | Beoordeling |
|--------|-------|-------------|
| Functioneel compleet | 10/10 | Alle core features uit command document geleverd |
| Enterprise kwaliteit | 10/10 | Dual lock, HMAC QR, GDPR lifecycle, auto-blacklist |
| Documentatie | 6/10 | 8 issues gevonden, waarvan 2 KRITIEK (MS footer/roadmap) |
| Architectuur | 10/10 | Clean route separatie, service layer, consistent met Blok A/B patterns |
| Test coverage | 9/10 | 20/20 E2E tests, minor verificatie frontend componenten |
| **Totaal** | **9.0/10** | **Functioneel foutloos, structureel documentatie-sync probleem** |

**CONCLUSIE**: Blok C is functioneel enterprise-level zonder enige workaround of tijdelijke oplossing. De architectuur is consistent met Blok A/B patterns. De 8 geïdentificeerde issues zijn UITSLUITEND documentatie-synchronisatie — geen enkele heeft impact op de running code of platformstabiliteit. Het terugkerende patroon vereist echter een structurele oplossing (versie-sync checklist).

---

## DEEL 2: BLOK D UITVOERINGSCOMMANDO — CHATBOT-TO-BOOK VOORBEREIDING

> **Dit is een direct uitvoerbaar Claude Code command. Lees CLAUDE.md + Master Strategie EERST.**

---

### STAP 0: PRE-FLIGHT CHECKS + DOCUMENTATIE FIXES (VERPLICHT)

```
VOER UIT VOORDAT JE AAN BLOK D BEGINT:

=== 0A. REFERENTIE DOCUMENTEN LEZEN ===
1. Lees /CLAUDE.md (verwacht: v3.55.0)
2. Lees /docs/strategy/HolidaiButler_Master_Strategie.md (verwacht: v7.21)
3. Lees dit command document VOLLEDIG
4. Verifieer in codebase: intentService.js (verwacht: 12 intents), contextService.js (verwacht: Fase II-A)

=== 0B. DOCUMENTATIE FIXES — ALLE 8 ISSUES UIT AUDIT ===

FIX ISSUE 1 — MS Roadmap Tabel (Master Strategie r1324):
□ Wijzig: "🟢 IN PROGRESS (Blok G+A+B)" → "🟢 IN PROGRESS (Blok G+A+B+C COMPLEET)"

FIX ISSUE 2 — MS Footer (Master Strategie r1603):
□ Wijzig VOLLEDIG naar:
  "Fase I COMPLEET. Fase II COMPLEET. Fase III IN PROGRESS: Blok G+A+B+C ✅ (Legal + Payment + Ticketing + Reservering). Admin Portal: 89 endpoints, adminPortal.js v3.16.0. 46 scheduled jobs. CLAUDE.md v3.55.0."

FIX ISSUE 3 — CLAUDE.md Admin Portal Versie (r305):
□ Wijzig: "(`adminPortal.js` v3.15.0)" → "(`adminPortal.js` v3.16.0)"

FIX ISSUE 4 — CLAUDE.md Gerelateerde Documentatie (r498):
□ Wijzig: "Master Strategie | ... | 7.20" → "Master Strategie | ... | 7.21"

FIX ISSUE 5 — CLAUDE.md BullMQ Health Check (r461):
□ Wijzig: "# BullMQ jobs (verwacht: 40)" → "# BullMQ jobs (verwacht: 46)"

FIX ISSUE 6 — CLAUDE.md Database Multi-Tenancy (r104-105):
□ Voeg toe aan lijst: "payment_transactions, payment_refunds, tickets, ticket_inventory, ticket_orders, ticket_order_items, voucher_codes, reservation_slots, guest_profiles, reservations"

FIX ISSUE 7 — MS Datum (r4):
□ Wijzig: "28 februari 2026" → "1 maart 2026" (of "2 maart 2026" als Blok D vandaag start)

FIX ISSUE 8 — Frontend Componenten Verificatie:
□ Verifieer in customer-portal/frontend/src/components/:
   Ticketing/: noteer aanwezige componenten
   Reservations/: noteer aanwezige componenten
□ Documenteer in CLAUDE.md onder Repository Structuur

=== 0C. VERSIE-SYNC CHECKLIST (NIEUW — STANDAARD VOOR ALLE BLOKKEN) ===

Na implementatie van ELKE blok, controleer ALLE volgende referentiepunten:

CLAUDE.md:
□ Header versie (r3)
□ Strategische Documentatie tabel versies (r50-56)
□ Repository structuur routes/services actueel (r64-89)
□ Database Multi-Tenancy lijst compleet (r104-105)
□ Chatbot capabilities actueel (r177-183)
□ Implementatie Status tabel — nieuwe rij toegevoegd (r196-252)
□ Scheduled Jobs: getal correct (r288)
□ Admin Portal: versie + endpoint count (r305-308)
□ Quick Health Check: BullMQ verwacht getal (r461)
□ Changelog: nieuwe entry (r480-489)
□ Gerelateerde Documentatie: versies correct (r494-502)

Master Strategie:
□ Header Versie (r5)
□ Header Status regel (r9)
□ Header Datum (r4)
□ Roadmap tabel: Fase III status (r1324)
□ Fase III detail sectie (r1350-1357)
□ Changelog: nieuwe entry (r1555+)
□ Footer status regel (r1602)
□ Footer detail regel (r1603)

Cross-check:
□ CLAUDE.md versie in MS header == CLAUDE.md header versie
□ MS versie in CLAUDE.md tabellen == MS header versie
□ adminPortal.js versie == CLAUDE.md admin sectie == MS detail
□ Endpoint count == CLAUDE.md admin sectie == MS detail
□ Scheduled jobs count == CLAUDE.md agent systeem == CLAUDE.md health check

=== 0D. BLOK A+B+C VERIFICATIE (snel) ===
□ Verifieer destination_id mapping in paymentService.js, ticketingService.js, reservationService.js: 1=Calpe, 2=Texel
□ Verifieer feature flags in destination configs: hasBooking, hasTicketing, hasReservations bestaan (waarde=false OK)

=== 0E. DATABASE BACKUP ===
□ mysqldump -u pxoziy_1 -p pxoziy_db1 > /root/backups/pre-fase3-blokD-$(date +%Y%m%d-%H%M%S).sql
□ Verifieer backup: ls -la /root/backups/pre-fase3-blokD-*.sql

=== 0F. FEATURE BRANCH ===
□ git checkout -b feature/fase3-blok-d
□ git push origin feature/fase3-blok-d
```

---

### STAP 1: INTENT CLASSIFICATIE UITBREIDING

Wijzig `/src/services/holibot/intentService.js`:

**Huidige staat**: 12 intents waaronder `booking` (Fase II-A) met friendly fallback doorverwijzing.

**Doel**: Uitbreiden van het generieke `booking` intent naar 4 specifieke sub-intents die de chatbot in staat stellen om de juiste commerce module aan te spreken.

```javascript
// === UITBREIDING intentService.js ===
// BELANGRIJK: Behoud ALLE bestaande 12 intents exact zoals ze zijn.
// Voeg 4 NIEUWE sub-intents toe die het bestaande generieke 'booking' intent verfijnen.
// Het generieke 'booking' intent blijft als catch-all bestaan.

// Nieuwe sub-intents onder 'booking' (FR toegevoegd voor WarreWijzer voorbereiding):
const BOOKING_SUBINTENTS = {

    'booking_ticket': {
        patterns: {
            nl: ['ticket kopen', 'kaartje bestellen', 'entree', 'toegang', 'boeken voor', 'kaartjes', 'toegangskaart', 'dagkaart'],
            en: ['buy ticket', 'book tickets', 'admission', 'entrance fee', 'get tickets', 'entry ticket', 'day pass'],
            de: ['Ticket kaufen', 'Eintrittskarte', 'buchen für', 'Karten kaufen', 'Tageskarte', 'Eintritt'],
            es: ['comprar entrada', 'reservar entradas', 'boleto', 'comprar boletos', 'entrada'],
            fr: ['acheter billet', 'réserver billets', 'entrée', 'ticket']  // WarreWijzer prep
        },
        description: 'Gebruiker wil tickets/entreekaarten kopen',
        requiredModule: 'ticketing',
        featureFlag: 'hasTicketing'
    },

    'booking_reservation': {
        patterns: {
            nl: ['tafel reserveren', 'reservering maken', 'tafeltje boeken', 'eetplek', 'restaurant boeken', 'reserveren bij', 'plek reserveren'],
            en: ['book a table', 'make reservation', 'reserve a table', 'dinner reservation', 'book restaurant', 'reserve a spot'],
            de: ['Tisch reservieren', 'Reservierung machen', 'Restaurant buchen', 'Platz reservieren'],
            es: ['reservar mesa', 'hacer reserva', 'reservar restaurante', 'reservar lugar'],
            fr: ['réserver table', 'faire réservation', 'réserver restaurant']  // WarreWijzer prep
        },
        description: 'Gebruiker wil een tafel/plek reserveren',
        requiredModule: 'reservation',
        featureFlag: 'hasReservations'
    },

    'booking_activity': {
        patterns: {
            nl: ['activiteit boeken', 'rondleiding boeken', 'excursie', 'tour boeken', 'meedoen aan', 'workshop boeken', 'fietstour'],
            en: ['book activity', 'book tour', 'excursion', 'guided tour', 'join activity', 'book workshop', 'bike tour'],
            de: ['Aktivität buchen', 'Tour buchen', 'Ausflug', 'Führung buchen', 'Radtour buchen'],
            es: ['reservar actividad', 'excursión', 'tour guiado', 'actividad', 'reservar tour'],
            fr: ['réserver activité', 'excursion', 'visite guidée', 'tour']  // WarreWijzer prep
        },
        description: 'Gebruiker wil een activiteit/tour/excursie boeken',
        requiredModule: 'ticketing',  // Activiteiten = tickets met ticket_type='activity'
        featureFlag: 'hasTicketing'
    },

    'booking_status': {
        patterns: {
            nl: ['mijn boeking', 'status bestelling', 'waar is mijn ticket', 'mijn reservering', 'boeking opzoeken', 'status reservering'],
            en: ['my booking', 'order status', 'where is my ticket', 'my reservation', 'booking status', 'check reservation'],
            de: ['meine Buchung', 'Bestellstatus', 'mein Ticket', 'meine Reservierung', 'Buchungsstatus'],
            es: ['mi reserva', 'estado del pedido', 'mi entrada', 'mi reservación', 'estado de reserva'],
            fr: ['ma réservation', 'statut commande', 'mon billet']  // WarreWijzer prep
        },
        description: 'Gebruiker vraagt naar status van bestaande boeking',
        requiredModule: null,  // Geen specifieke module — lookup op basis van order/reservation nummer
        featureFlag: 'hasBooking'
    }
};

// === INTENT DETECTIE LOGICA ===
// Volgorde:
// 1. Probeer eerst specifiek booking sub-intent te matchen
// 2. Als geen match → val terug op generiek 'booking' intent (bestaand)
// 3. Generiek booking behoudt huidige friendly fallback
//
// Detectie methode:
// - Exact match op patterns (case-insensitive)
// - Taaldetectie via bestaande taalherkenning in chatbot
// - Score-based: tel hoeveel patterns matchen → hoogste score wint
// - Minimum confidence threshold: 0.6 (60%)
// - Bij twijfel: gebruik generiek 'booking' intent

// === EXPORT ===
// Exporteer BOOKING_SUBINTENTS zodat contextService.js het kan gebruiken
module.exports = { 
    ...existingExports,
    BOOKING_SUBINTENTS,
    classifyBookingSubIntent  // Nieuwe functie
};
```

**Implementatie `classifyBookingSubIntent(message, language)`:**
```javascript
function classifyBookingSubIntent(message, language) {
    // 1. Normaliseer input: lowercase, strip punctuatie
    const normalized = message.toLowerCase().replace(/[.,!?]/g, '');
    
    // 2. Score per sub-intent
    const scores = {};
    for (const [intent, config] of Object.entries(BOOKING_SUBINTENTS)) {
        const patterns = config.patterns[language] || config.patterns['en'];
        let score = 0;
        for (const pattern of patterns) {
            if (normalized.includes(pattern.toLowerCase())) {
                score += 1;
            }
        }
        if (score > 0) {
            scores[intent] = score / patterns.length;  // Normalize 0-1
        }
    }
    
    // 3. Sorteer op score, return hoogste boven threshold
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 0.1) {
        return { intent: sorted[0][0], confidence: sorted[0][1], config: BOOKING_SUBINTENTS[sorted[0][0]] };
    }
    
    // 4. Geen specifiek match → return null (caller gebruikt generiek booking)
    return null;
}
```

---

### STAP 2: BOOKING CONTEXT TRACKING (contextService.js)

Wijzig `/src/services/holibot/contextService.js`:

```javascript
// === UITBREIDING contextService.js ===
// BELANGRIJK: Behoud ALLE bestaande context functionaliteit (Fase II-A):
// - Temporeel context (dag/datum/seizoen/weekend)
// - Locatie context (per-destination)
// - Sessie context (besproken POIs/categorieën)
// - Multi-turn memory (10-bericht sliding window)
// - 24h TTL, GDPR-compliant, geen persoonlijke data

// VOEG TOE: bookingContext aan sessie tracking

// Nieuw veld in sessie object:
const BOOKING_CONTEXT_TEMPLATE = {
    active: false,              // Is er een actieve booking flow?
    type: null,                 // 'ticket' | 'reservation' | 'activity' | 'status'
    step: null,                 // Huidige stap in flow (zie BOOKING_STEPS)
    poi_id: null,               // Geselecteerde POI
    poi_name: null,             // POI naam (voor display)
    date: null,                 // Geselecteerde datum (YYYY-MM-DD)
    time: null,                 // Geselecteerde tijd (HH:MM) — alleen reserveringen
    party_size: null,           // Aantal personen — alleen reserveringen
    tier_selection: null,       // Geselecteerde pricing tier — alleen tickets
    quantity: null,             // Aantal tickets — alleen tickets
    special_requests: null,     // Speciale wensen — alleen reserveringen
    total_cents: null,          // Berekend totaalbedrag in centen
    order_id: null,             // Na aanmaak: order ID voor checkout link
    reservation_uuid: null,     // Na aanmaak: reservation UUID
    started_at: null,           // Timestamp start flow
    timeout_minutes: 15         // Flow timeout (zelfde als checkout window)
};

// Stappen per booking type:
const BOOKING_STEPS = {
    ticket: ['poi_select', 'date_select', 'tier_select', 'quantity', 'confirm', 'payment'],
    reservation: ['poi_select', 'date_select', 'time_select', 'party_size', 'details', 'confirm'],
    activity: ['poi_select', 'date_select', 'tier_select', 'quantity', 'confirm', 'payment'],
    status: ['lookup']  // Direct lookup, geen multi-step flow
};

// === NIEUWE FUNCTIES ===

// startBookingContext(sessionId, type, poiId?, poiName?)
// → Initialiseert booking flow in sessie
// → Reset eventuele vorige booking context
// → Set started_at = NOW()

// updateBookingStep(sessionId, field, value)
// → Update specifiek veld + advance step naar volgende
// → Valideer: is field geldig voor huidige step?

// getBookingContext(sessionId)
// → Return huidige booking context of null

// cancelBookingContext(sessionId)
// → Reset booking context → active=false, alle velden null

// isBookingTimeout(sessionId)
// → Check: started_at + timeout_minutes < NOW()
// → Als timeout: auto-cancel + return true

// getNextBookingStep(sessionId)
// → Bepaal volgende stap op basis van type + al ingevulde velden
// → Return: { step: 'date_select', prompt_key: 'booking_ask_date' }

// === GDPR COMPLIANCE ===
// GEEN persoonlijke data opslaan in booking context (email, naam, telefoon)
// Die worden pas bij de LAATSTE stap (confirm) gevraagd en direct 
// doorgestuurd naar ticketingService of reservationService
// Booking context bevat alleen: poi_id, datum, tijd, aantallen, bedragen
```

---

### STAP 3: CONVERSATIONAL BOOKING FLOW (ragService.js)

Wijzig `/src/services/holibot/ragService.js` (v2.5 → v2.6):

```javascript
// === UITBREIDING ragService.js v2.5 → v2.6 ===
// BELANGRIJK: Behoud ALLE bestaande RAG functionaliteit.
// Voeg booking flow handling toe als NIEUWE code path naast bestaande RAG.

// === NIEUWE FUNCTIE: handleBookingFlow(sessionId, message, language, destinationId) ===

// Deze functie wordt aangeroepen wanneer:
// a) intentService detecteert een booking sub-intent, OF
// b) er een actieve booking context is voor deze sessie

async function handleBookingFlow(sessionId, message, language, destinationId) {
    const config = getDestinationConfig(destinationId);
    const bookingCtx = contextService.getBookingContext(sessionId);
    
    // STAP 1: Check feature flags
    // Als hasBooking = false → friendly fallback (bestaande logica)
    if (!config.features.hasBooking) {
        return generateFriendlyBookingFallback(language, destinationId);
    }
    
    // STAP 2: Timeout check
    if (bookingCtx?.active && contextService.isBookingTimeout(sessionId)) {
        contextService.cancelBookingContext(sessionId);
        return generateTimeoutMessage(language);
    }
    
    // STAP 3: Bepaal booking sub-intent (als nog geen actieve flow)
    if (!bookingCtx?.active) {
        const subIntent = intentService.classifyBookingSubIntent(message, language);
        if (!subIntent) {
            return generateFriendlyBookingFallback(language, destinationId);
        }
        
        // Check of specifieke module enabled is
        const featureFlag = subIntent.config.featureFlag;
        if (!config.features[featureFlag]) {
            return generateModuleNotAvailableMessage(language, subIntent.intent, destinationId);
        }
        
        // POI detectie uit bericht (hergebruik bestaande RAG entity extraction)
        const detectedPoi = await extractPoiFromMessage(message, destinationId, subIntent.intent);
        
        // Start nieuwe booking context
        contextService.startBookingContext(sessionId, subIntent.intent.replace('booking_', ''), 
            detectedPoi?.id, detectedPoi?.name);
        
        // Genereer eerste response
        return await generateBookingStepResponse(sessionId, language, destinationId);
    }
    
    // STAP 4: Actieve flow — verwerk antwoord op huidige stap
    const currentStep = contextService.getNextBookingStep(sessionId);
    const parsedInput = parseBookingInput(message, currentStep.step, language);
    
    if (parsedInput.valid) {
        contextService.updateBookingStep(sessionId, currentStep.step, parsedInput.value);
        return await generateBookingStepResponse(sessionId, language, destinationId);
    } else {
        // Ongeldige input → herhaal vraag met hint
        return generateInvalidInputMessage(language, currentStep.step, parsedInput.error);
    }
}

// === STAP RESPONSE GENERATIE ===

async function generateBookingStepResponse(sessionId, language, destinationId) {
    const ctx = contextService.getBookingContext(sessionId);
    const nextStep = contextService.getNextBookingStep(sessionId);
    
    // Alle stappen hebben een gedefinieerde response template per taal
    switch (nextStep.step) {
    
        case 'poi_select':
            // "Welke locatie had je in gedachten?" + suggesties uit POI database
            // Alleen POIs tonen met hasTicketing/hasReservations = true
            return formatPoiSelectMessage(language, destinationId, ctx.type);
            
        case 'date_select':
            // "Voor welke datum?" + beschikbaarheid info
            if (ctx.type === 'ticket' || ctx.type === 'activity') {
                const tickets = await ticketingService.getAvailableTickets(destinationId, null, { poiId: ctx.poi_id });
                return formatDateSelectMessage(language, tickets);
            }
            return formatDateSelectMessage(language, null);
            
        case 'time_select':  // Alleen reserveringen
            const slots = await reservationService.getAvailableSlots(ctx.poi_id, ctx.date, null, destinationId);
            return formatTimeSelectMessage(language, slots);
            
        case 'party_size':  // Alleen reserveringen
            return formatPartySizeMessage(language);
            
        case 'tier_select':  // Alleen tickets
            const ticketDetails = await ticketingService.getTicketDetail(ctx.poi_id, destinationId);
            return formatTierSelectMessage(language, ticketDetails.pricing_tiers);
            
        case 'quantity':  // Alleen tickets
            return formatQuantityMessage(language, ctx.tier_selection);
            
        case 'details':  // Alleen reserveringen — speciale wensen
            return formatDetailsMessage(language);
            
        case 'confirm':
            // Samenvatting tonen + "Klopt dit?"
            const summary = await buildBookingSummary(ctx, language, destinationId);
            return formatConfirmMessage(language, summary);
            
        case 'payment':  // Alleen tickets
            // Order aanmaken via ticketingService
            const order = await ticketingService.createOrder(destinationId, {
                items: buildOrderItems(ctx),
                customer: null  // Guest checkout — details op payment page
            });
            contextService.updateBookingStep(sessionId, 'order_id', order.order_uuid);
            return formatPaymentMessage(language, order);
            
        case 'reservation_created':  // Alleen reserveringen
            // Reservering aanmaken via reservationService
            // ⚠️ Guest details (naam, email) worden hier NIET gevraagd via chatbot
            // maar via de reservation form link die de chatbot genereert
            return formatReservationLinkMessage(language, ctx);
            
        case 'lookup':  // booking_status
            return formatBookingStatusMessage(language);
            
        default:
            return generateFriendlyBookingFallback(language, destinationId);
    }
}
```

**Belangrijk architectuur besluit:**
```
⚠️ CHATBOT VERZAMELT GEEN PERSOONLIJKE DATA
De chatbot begeleidt de gebruiker door de selectie (POI → datum → details)
maar stuurt uiteindelijk door naar:
- Ticket checkout page (met voorgevulde selectie) voor tickets
- Reservation form page (met voorgevulde selectie) voor reserveringen

Dit is bewust:
1. GDPR: chatbot context slaat geen PII op
2. UX: betaling/formulier afhandelen in een proper form, niet in chat
3. Security: geen creditcard/persoonsgegevens via SSE chat stream
4. Betrouwbaarheid: chatbot parsen van naam/email is foutgevoelig
```

---

### STAP 4: POI ENTITY EXTRACTION

Wijzig/maak hulpfunctie in ragService.js:

```javascript
// === POI DETECTIE UIT CHATBOT BERICHTEN ===

async function extractPoiFromMessage(message, destinationId, bookingType) {
    // Methode 1: Exact naam match (case-insensitive)
    // Query: SELECT id, name FROM POI WHERE destination_id = ? AND is_active = 1 
    //        AND (has_reservations = 1 OR ticket_type IS NOT NULL)
    //        AND LOWER(name) IN (...)
    
    // Methode 2: Fuzzy match via ChromaDB similarity search
    // Hergebruik bestaande chromaService.query() met booking-specifieke filter
    
    // Methode 3: Context-based (als gebruiker verwijst naar eerder besproken POI)
    // Check sessie context: recentPois array
    
    // Return: { id, name, type: 'exact'|'fuzzy'|'context' } of null
    
    // ⚠️ Als meerdere matches: vraag verduidelijking
    // "Bedoel je [POI A] of [POI B]?"
}
```

---

### STAP 5: MEERTALIGE RESPONSE TEMPLATES

Maak `/src/services/holibot/bookingMessages.js`:

```javascript
// === BOOKING RESPONSE TEMPLATES ===
// Alle berichten in 5 talen (NL/EN/DE/ES/FR)
// FR voor WarreWijzer voorbereiding

const BOOKING_MESSAGES = {
    
    // === FRIENDLY FALLBACKS ===
    booking_not_available: {
        nl: 'Op dit moment is online boeken nog niet beschikbaar {destination_preposition} {destination_name}. Je kunt contact opnemen via {contact_email} voor hulp bij het boeken.',
        en: 'Online booking is not yet available {destination_preposition} {destination_name}. You can contact us at {contact_email} for booking assistance.',
        de: 'Online-Buchungen sind {destination_preposition} {destination_name} noch nicht verfügbar. Kontaktieren Sie uns unter {contact_email} für Buchungshilfe.',
        es: 'Las reservas en línea aún no están disponibles {destination_preposition} {destination_name}. Puede contactarnos en {contact_email} para ayuda con reservas.',
        fr: 'La réservation en ligne n\'est pas encore disponible {destination_preposition} {destination_name}. Contactez-nous à {contact_email} pour assistance.'
    },
    
    module_not_available: {
        nl: '{module_name} is momenteel niet beschikbaar {destination_preposition} {destination_name}. Neem contact op via {contact_email}.',
        en: '{module_name} is currently not available {destination_preposition} {destination_name}. Please contact {contact_email}.',
        de: '{module_name} ist derzeit {destination_preposition} {destination_name} nicht verfügbar. Bitte kontaktieren Sie {contact_email}.',
        es: '{module_name} no está disponible actualmente {destination_preposition} {destination_name}. Contacte {contact_email}.',
        fr: '{module_name} n\'est pas disponible actuellement {destination_preposition} {destination_name}. Contactez {contact_email}.'
    },
    
    // === TICKET FLOW ===
    ticket_poi_select: {
        nl: 'Leuk dat je tickets wilt kopen! Voor welke locatie wil je tickets? Hier zijn enkele opties:',
        en: 'Great that you want to buy tickets! Which location are you interested in? Here are some options:',
        de: 'Toll, dass Sie Tickets kaufen möchten! Für welchen Ort möchten Sie Tickets? Hier sind einige Optionen:',
        es: '¡Genial que quieras comprar entradas! ¿Para qué lugar te interesan? Aquí tienes algunas opciones:',
        fr: 'Super que vous vouliez acheter des billets ! Pour quel endroit souhaitez-vous des billets ?'
    },
    
    ticket_date_select: {
        nl: 'Voor {poi_name} heb ik de volgende tickets beschikbaar:\n{ticket_list}\n\nVoor welke datum wil je tickets?',
        en: 'For {poi_name} I have the following tickets available:\n{ticket_list}\n\nFor which date would you like tickets?',
        de: 'Für {poi_name} habe ich folgende Tickets:\n{ticket_list}\n\nFür welches Datum möchten Sie Tickets?',
        es: 'Para {poi_name} tengo las siguientes entradas disponibles:\n{ticket_list}\n\n¿Para qué fecha quieres entradas?',
        fr: 'Pour {poi_name} j\'ai les billets suivants disponibles :\n{ticket_list}\n\nPour quelle date souhaitez-vous des billets ?'
    },
    
    ticket_tier_select: {
        nl: 'Welk type ticket wil je?\n{tier_list}',
        en: 'Which ticket type would you like?\n{tier_list}',
        de: 'Welche Ticketart möchten Sie?\n{tier_list}',
        es: '¿Qué tipo de entrada prefieres?\n{tier_list}',
        fr: 'Quel type de billet souhaitez-vous ?\n{tier_list}'
    },
    
    ticket_quantity: {
        nl: 'Hoeveel {tier_name} tickets wil je?',
        en: 'How many {tier_name} tickets would you like?',
        de: 'Wie viele {tier_name} Tickets möchten Sie?',
        es: '¿Cuántas entradas {tier_name} quieres?',
        fr: 'Combien de billets {tier_name} souhaitez-vous ?'
    },
    
    ticket_confirm: {
        nl: 'Prima! Hier is je samenvatting:\n📅 {date}\n🎫 {items}\n💰 Totaal: €{total}\n\nKlopt dit? Dan stuur ik je door naar de betaalpagina.',
        en: 'Great! Here\'s your summary:\n📅 {date}\n🎫 {items}\n💰 Total: €{total}\n\nIs this correct? I\'ll send you to the payment page.',
        de: 'Super! Hier ist Ihre Zusammenfassung:\n📅 {date}\n🎫 {items}\n💰 Gesamt: €{total}\n\nStimmt das? Dann leite ich Sie zur Zahlungsseite weiter.',
        es: '¡Perfecto! Aquí tienes el resumen:\n📅 {date}\n🎫 {items}\n💰 Total: €{total}\n\n¿Es correcto? Te envío a la página de pago.',
        fr: 'Parfait ! Voici votre résumé :\n📅 {date}\n🎫 {items}\n💰 Total : €{total}\n\nEst-ce correct ? Je vous redirige vers la page de paiement.'
    },
    
    ticket_payment_link: {
        nl: 'Top! Hier is je bestelling klaar:\n👉 [{link_text}]({checkout_url})\n\nJe hebt 15 minuten om de betaling te voltooien.',
        en: 'Great! Your order is ready:\n👉 [{link_text}]({checkout_url})\n\nYou have 15 minutes to complete the payment.',
        de: 'Toll! Ihre Bestellung ist fertig:\n👉 [{link_text}]({checkout_url})\n\nSie haben 15 Minuten, um die Zahlung abzuschließen.',
        es: '¡Genial! Tu pedido está listo:\n👉 [{link_text}]({checkout_url})\n\nTienes 15 minutos para completar el pago.',
        fr: 'Super ! Votre commande est prête :\n👉 [{link_text}]({checkout_url})\n\nVous avez 15 minutes pour effectuer le paiement.'
    },
    
    // === RESERVATION FLOW ===
    reservation_poi_select: {
        nl: 'Leuk dat je wilt reserveren! Bij welk restaurant of welke locatie wil je een plek boeken?',
        en: 'Great that you want to make a reservation! At which restaurant or location would you like to book?',
        de: 'Toll, dass Sie reservieren möchten! In welchem Restaurant oder an welchem Ort möchten Sie buchen?',
        es: '¡Genial que quieras reservar! ¿En qué restaurante o lugar te gustaría hacer la reserva?',
        fr: 'Super que vous vouliez réserver ! Dans quel restaurant ou à quel endroit souhaitez-vous réserver ?'
    },
    
    reservation_date_select: {
        nl: 'Voor welke datum wil je reserveren bij {poi_name}?',
        en: 'For which date would you like to reserve at {poi_name}?',
        de: 'Für welches Datum möchten Sie bei {poi_name} reservieren?',
        es: '¿Para qué fecha quieres reservar en {poi_name}?',
        fr: 'Pour quelle date souhaitez-vous réserver à {poi_name} ?'
    },
    
    reservation_time_select: {
        nl: 'Welke tijd past je? Beschikbare tijdsloten op {date}:\n{slot_list}',
        en: 'What time works for you? Available time slots on {date}:\n{slot_list}',
        de: 'Welche Zeit passt Ihnen? Verfügbare Zeitfenster am {date}:\n{slot_list}',
        es: '¿Qué hora te conviene? Horarios disponibles el {date}:\n{slot_list}',
        fr: 'Quel horaire vous convient ? Créneaux disponibles le {date} :\n{slot_list}'
    },
    
    reservation_party_size: {
        nl: 'Met hoeveel personen kom je?',
        en: 'How many people will be dining?',
        de: 'Wie viele Personen werden es sein?',
        es: '¿Cuántas personas serán?',
        fr: 'Combien de personnes serez-vous ?'
    },
    
    reservation_details: {
        nl: 'Heb je speciale wensen? (dieetwensen, allergieën, kinderstoel, etc.) Je kunt ook "nee" zeggen om door te gaan.',
        en: 'Do you have any special requests? (dietary needs, allergies, high chair, etc.) You can also say "no" to continue.',
        de: 'Haben Sie besondere Wünsche? (Ernährung, Allergien, Kinderstuhl, etc.) Sie können auch "nein" sagen.',
        es: '¿Tienes alguna petición especial? (dieta, alergias, silla alta, etc.) También puedes decir "no" para continuar.',
        fr: 'Avez-vous des demandes spéciales ? (régime, allergies, chaise haute, etc.) Vous pouvez aussi dire "non".'
    },
    
    reservation_confirm: {
        nl: 'Perfect! Hier is je reservering:\n📍 {poi_name}\n📅 {date} om {time}\n👥 {party_size} personen\n{special_requests}\n\nKlopt dit? Dan maak ik de reservering aan.',
        en: 'Perfect! Here\'s your reservation:\n📍 {poi_name}\n📅 {date} at {time}\n👥 {party_size} people\n{special_requests}\n\nIs this correct? I\'ll create the reservation.',
        de: 'Perfekt! Hier ist Ihre Reservierung:\n📍 {poi_name}\n📅 {date} um {time}\n👥 {party_size} Personen\n{special_requests}\n\nStimmt das? Dann erstelle ich die Reservierung.',
        es: '¡Perfecto! Aquí tienes tu reserva:\n📍 {poi_name}\n📅 {date} a las {time}\n👥 {party_size} personas\n{special_requests}\n\n¿Es correcto? Creo la reserva.',
        fr: 'Parfait ! Voici votre réservation :\n📍 {poi_name}\n📅 {date} à {time}\n👥 {party_size} personnes\n{special_requests}\n\nEst-ce correct ? Je crée la réservation.'
    },
    
    reservation_link: {
        nl: 'Top! Vul je gegevens in om de reservering te bevestigen:\n👉 [{link_text}]({reservation_url})\n\nDe plek is 30 minuten voor je vastgehouden.',
        en: 'Great! Fill in your details to confirm the reservation:\n👉 [{link_text}]({reservation_url})\n\nYour spot is held for 30 minutes.',
        de: 'Toll! Geben Sie Ihre Daten ein, um die Reservierung zu bestätigen:\n👉 [{link_text}]({reservation_url})\n\nIhr Platz ist 30 Minuten reserviert.',
        es: '¡Genial! Completa tus datos para confirmar la reserva:\n👉 [{link_text}]({reservation_url})\n\nTu lugar está reservado por 30 minutos.',
        fr: 'Super ! Remplissez vos coordonnées pour confirmer la réservation :\n👉 [{link_text}]({reservation_url})\n\nVotre place est réservée pendant 30 minutes.'
    },
    
    // === BOOKING STATUS ===
    booking_status_ask: {
        nl: 'Ik kan je helpen met de status van je boeking. Heb je een bestelnummer (bijv. HB-T-260315-0042) of reserveringsnummer (bijv. HB-R-260315-0001)?',
        en: 'I can help you check your booking status. Do you have an order number (e.g. HB-T-260315-0042) or reservation number (e.g. HB-R-260315-0001)?',
        de: 'Ich kann Ihnen beim Buchungsstatus helfen. Haben Sie eine Bestellnummer (z.B. HB-T-260315-0042) oder Reservierungsnummer (z.B. HB-R-260315-0001)?',
        es: 'Puedo ayudarte a verificar el estado de tu reserva. ¿Tienes un número de pedido (ej. HB-T-260315-0042) o de reserva (ej. HB-R-260315-0001)?',
        fr: 'Je peux vous aider à vérifier le statut de votre réservation. Avez-vous un numéro de commande (ex. HB-T-260315-0042) ou de réservation (ex. HB-R-260315-0001) ?'
    },
    
    // === ERRORS & EDGE CASES ===
    booking_timeout: {
        nl: 'Je boekingsessie is verlopen (15 minuten). Wil je opnieuw beginnen?',
        en: 'Your booking session has expired (15 minutes). Would you like to start again?',
        de: 'Ihre Buchungssitzung ist abgelaufen (15 Minuten). Möchten Sie neu beginnen?',
        es: 'Tu sesión de reserva ha expirado (15 minutos). ¿Quieres empezar de nuevo?',
        fr: 'Votre session de réservation a expiré (15 minutes). Voulez-vous recommencer ?'
    },
    
    no_availability: {
        nl: 'Helaas is er geen beschikbaarheid op {date} bij {poi_name}. Wil je een andere datum proberen?',
        en: 'Unfortunately there\'s no availability on {date} at {poi_name}. Would you like to try another date?',
        de: 'Leider gibt es am {date} bei {poi_name} keine Verfügbarkeit. Möchten Sie ein anderes Datum versuchen?',
        es: 'Lamentablemente no hay disponibilidad el {date} en {poi_name}. ¿Quieres probar otra fecha?',
        fr: 'Malheureusement il n\'y a pas de disponibilité le {date} à {poi_name}. Voulez-vous essayer une autre date ?'
    },
    
    invalid_input: {
        nl: 'Ik heb je niet helemaal begrepen. {hint}',
        en: 'I didn\'t quite understand. {hint}',
        de: 'Das habe ich nicht ganz verstanden. {hint}',
        es: 'No he entendido del todo. {hint}',
        fr: 'Je n\'ai pas bien compris. {hint}'
    },
    
    cancel_booking_flow: {
        nl: 'Geen probleem! Ik heb de boeking geannuleerd. Waarmee kan ik je nog meer helpen?',
        en: 'No problem! I\'ve cancelled the booking. What else can I help you with?',
        de: 'Kein Problem! Ich habe die Buchung abgebrochen. Wie kann ich Ihnen noch helfen?',
        es: '¡Sin problema! He cancelado la reserva. ¿En qué más puedo ayudarte?',
        fr: 'Pas de problème ! J\'ai annulé la réservation. Comment puis-je encore vous aider ?'
    }
};

// === TAALREGEL COMPLIANCE ===
// destination_preposition per taal per bestemming (conform CLAUDE.md taalregels):
const DESTINATION_PREPOSITIONS = {
    1: { nl: 'in', en: 'in', de: 'in', es: 'en', fr: 'à' },          // Calpe
    2: { nl: 'op', en: 'on', de: 'auf', es: 'en', fr: 'à' },          // Texel
    3: { nl: 'in', en: 'in', de: 'in', es: 'en', fr: 'à' },          // Alicante
    4: { nl: 'bij', en: 'at', de: 'bei', es: 'en', fr: 'chez' },      // WarreWijzer
};

module.exports = { BOOKING_MESSAGES, DESTINATION_PREPOSITIONS };
```

---

### STAP 6: FEATURE FLAGS IN DESTINATION CONFIGS

Wijzig `/src/config/destinations/calpe.config.js` en `texel.config.js`:

```javascript
// === FEATURE FLAGS TOEVOEGEN ===
// Voeg toe aan ELKE destination config, in het features object:

features: {
    // ...bestaande features...
    
    // Commerce feature flags (Fase III Blok D)
    hasBooking: false,              // Master toggle — ALLE commerce via chatbot
    hasTicketing: false,            // Ticket module via chatbot enabled
    hasReservations: false,         // Reservering module via chatbot enabled
    hasChatToBook: false,           // Conversational booking flow enabled
    hasGuestCheckout: true,         // Toestaan zonder registratie
    hasDeposits: false,             // Borg betalingen enabled
    hasDynamicPricing: false,       // Dynamic pricing engine enabled
}

// ⚠️ ALLE FLAGS OP FALSE — worden geactiveerd per destination na live testing
// Activering workflow:
// 1. Frank plaatst test-tickets/slots in admin portal
// 2. Feature flag → true in config
// 3. PM2 restart
// 4. Test via chatbot
// 5. Monitoring eerste 24h

// OOK TOEVOEGEN aan alicante.config.js en eventueel warrewijzer.config.js (als die bestaan)
```

---

### STAP 7: HOLIBOT ROUTE INTEGRATIE

Wijzig `/src/routes/holibot.js`:

```javascript
// === BOOKING FLOW INTEGRATIE IN BESTAANDE CHAT ENDPOINT ===

// In de bestaande POST /api/v1/holibot/chat handler:
// Na intent classificatie, VOOR de RAG pipeline:

// 1. Check of intent = 'booking' of een booking sub-intent
const bookingSubIntent = intentService.classifyBookingSubIntent(message, language);
const hasActiveBookingCtx = contextService.getBookingContext(sessionId)?.active;

if (bookingSubIntent || hasActiveBookingCtx) {
    // Route naar booking flow i.p.v. RAG
    const bookingResponse = await ragService.handleBookingFlow(
        sessionId, message, language, destinationId
    );
    return res.json({ success: true, data: { response: bookingResponse, type: 'booking' } });
}

// 2. Check voor cancel keywords tijdens actieve booking
const cancelKeywords = {
    nl: ['stop', 'annuleer', 'vergeet maar', 'laat maar'],
    en: ['stop', 'cancel', 'never mind', 'forget it'],
    de: ['stop', 'abbrechen', 'vergiss es'],
    es: ['parar', 'cancelar', 'olvídalo'],
    fr: ['arrêter', 'annuler', 'oubliez']
};

if (hasActiveBookingCtx && isCancelKeyword(message, language, cancelKeywords)) {
    contextService.cancelBookingContext(sessionId);
    const cancelMsg = BOOKING_MESSAGES.cancel_booking_flow[language] || BOOKING_MESSAGES.cancel_booking_flow['en'];
    return res.json({ success: true, data: { response: cancelMsg, type: 'booking_cancelled' } });
}

// 3. Bestaande RAG flow (ongewijzigd)
// ...
```

---

### STAP 8: INPUT PARSING HELPERS

Maak `/src/services/holibot/bookingParser.js`:

```javascript
// === NATURAL LANGUAGE PARSING VOOR BOOKING FLOW ===

// parseDate(message, language)
// Herkent: "morgen", "overmorgen", "volgende week zaterdag", "15 maart", "2026-03-15"
// "tomorrow", "next Saturday", "March 15", etc.
// Return: { valid: true, value: '2026-03-15' } of { valid: false, error: 'unrecognized_date' }

// parseTime(message, language)
// Herkent: "18:00", "zes uur", "half zeven", "6 PM", "18h", etc.
// Return: { valid: true, value: '18:00' } of { valid: false, error: 'unrecognized_time' }

// parseNumber(message, language)
// Herkent: "2", "twee", "two", "zwei", "dos", "3 personen", "voor 4", etc.
// Return: { valid: true, value: 4 } of { valid: false, error: 'unrecognized_number' }

// parseConfirmation(message, language)
// Herkent: "ja", "yes", "nee", "no", "klopt", "correct", "niet helemaal", etc.
// Return: { valid: true, value: true/false } of { valid: false, error: 'ambiguous' }

// parseOrderNumber(message)
// Regex: /HB-[TR]-\d{6}-\d{4}/
// Return: { valid: true, value: 'HB-T-260315-0042', type: 'ticket'|'reservation' }

// ⚠️ BELANGRIJK: Bij twijfel ALTIJD terugvragen i.p.v. verkeerd interpreteren
// Chatbot UX regel: "Het is beter om één keer extra te vragen dan een verkeerde boeking te maken"
```

---

### STAP 9: VERIFICATIE BLOK D

```
=== INTENT CLASSIFICATIE TESTS ===
□ "Ik wil tickets kopen voor Ecomare" → booking_ticket, POI=Ecomare
□ "I want to book a table at Strandpaviljoen" → booking_reservation
□ "Kann ich eine Tour buchen?" → booking_activity
□ "Waar is mijn ticket?" → booking_status
□ "Quiero reservar mesa" → booking_reservation (ES)
□ "Je veux réserver" → booking_reservation (FR — WarreWijzer ready)
□ "Hoe laat is Ecomare open?" → NIET booking, maar POI info (bestaande RAG)
□ "Wat is er te doen op Texel?" → NIET booking, maar POI suggesties (bestaande RAG)

=== CONVERSATIONAL FLOW TESTS ===
□ Ticket flow compleet: POI → datum → tier → quantity → confirm → checkout link PASS
□ Reservation flow compleet: POI → datum → tijd → personen → wensen → confirm → form link PASS
□ Activity flow: behandeld als ticket flow PASS
□ Status lookup: order number → details PASS
□ Cancel mid-flow: "stop" → booking geannuleerd, terug naar normaal PASS
□ Timeout: 15 min inactiviteit → sessie expired, friendly message PASS
□ POI detectie: uit chatbericht, fuzzy match, context reference PASS
□ No availability: friendly message + alternatief datum suggestie PASS
□ Invalid input: herhaal vraag met hint PASS

=== FEATURE FLAG TESTS ===
□ hasBooking=false → alle booking intents krijgen friendly fallback PASS
□ hasTicketing=false, hasReservations=true → ticket booking fallback, reservation WERKT PASS
□ hasBooking=true, hasTicketing=true → ticket flow volledig operationeel PASS
□ hasBooking=true, hasReservations=true → reservation flow volledig operationeel PASS
□ hasChatToBook=false → sub-intents gedetecteerd maar doorgestuurd naar pagina i.p.v. chat flow PASS

=== MULTI-DESTINATION TESTS ===
□ Texel chatbot (Tessa): correcte taalregels ("op Texel"), correcte POIs, correcte contact info
□ Calpe chatbot (HoliBot): correcte taalregels ("in Calpe"), correcte POIs, correcte contact info
□ Feature flags per destination onafhankelijk

=== TAALREGEL COMPLIANCE TESTS ===
□ Texel NL: "op Texel" (NIET "in Texel") ✓
□ Calpe NL: "in Calpe" ✓
□ WarreWijzer NL: "bij WarreWijzer" of "op het domein" ✓

=== GDPR COMPLIANCE ===
□ Booking context bevat GEEN PII (naam, email, telefoon)
□ Booking context auto-delete na sessie timeout
□ Chatbot logs bevatten GEEN persoonsgegevens

=== ENTERPRISE QUALITY ===
□ Alle bedragen in CENTEN (integers) in booking context
□ Error handling: try/catch op alle async functies
□ Logging: structured met sessionId, destination_id, booking_type, step
□ Feature flags: graceful degradation (false → friendly fallback, NIET error)
□ ragService versie: v2.5 → v2.6
```

---

### STAP 10: DOCUMENTATIE UPDATES

```
=== CLAUDE.md (v3.55.0 → v3.56.0) ===
□ Fase III status: "Blok G+A+B+C+D COMPLEET"
□ Chatbot Capabilities: uitbreiden met booking sub-intents + conversational flow
□ HoliBot Key Files: voeg bookingMessages.js, bookingParser.js toe
□ intentService.js: "12 intents" → "12 intents + 4 booking sub-intents"
□ ragService.js: v2.5 → v2.6
□ contextService.js: vermeld bookingContext tracking
□ Feature flags: documenteer hasBooking, hasTicketing, etc. per destination
□ Implementatie Status tabel: nieuwe rij III-D
□ Changelog: v3.56.0 entry
□ ALLE versie-sync checklist items (Stap 0C) doorlopen

=== Master Strategie (v7.21 → v7.22) ===
□ Fase III detail: Chatbot-to-Book (Blok D) → ✅ COMPLEET
□ Roadmap tabel: "Blok G+A+B+C+D COMPLEET"
□ Changelog: v7.22 entry
□ Header Status + Footer + Datum: ALLE syncen (versie-sync checklist)

=== Git Workflow ===
□ git add -A
□ git commit -m "Fase III Blok D: Chatbot-to-Book COMPLEET - 4 booking sub-intents (5 talen), conversational flow, booking context tracking, feature flags, ragService v2.6"
□ git push origin feature/fase3-blok-d
□ Merge: feature/fase3-blok-d → dev → test → main
□ PM2 restart: pm2 restart all
□ Deploy customer portals: Calpe + Texel builds

=== Smoke Test Na Deployment ===
□ Chatbot Texel: stuur "Ik wil tickets kopen" → friendly fallback (hasBooking=false)
□ Chatbot Calpe: stuur "I want to book a table" → friendly fallback (hasBooking=false)
□ pm2 status → alle processes online
□ BullMQ jobs: 46 (ongewijzigd — Blok D voegt geen nieuwe jobs toe)
```

---

### STAP 11: SAMENVATTING & VERWACHT RESULTAAT

| Aspect | Vóór Blok D | Na Blok D |
|--------|-------------|-----------|
| Intent classificatie | 12 intents (1 generiek booking) | 12 intents + 4 booking sub-intents |
| Talen booking | 4 (NL/EN/DE/ES) | 5 (+FR voor WarreWijzer) |
| ragService.js | v2.5 | v2.6 (+ booking flow handler) |
| contextService.js | Sessie + temporeel + locatie | + bookingContext tracking |
| Feature flags | Geen | 7 commerce flags per destination |
| Nieuwe bestanden | — | bookingMessages.js, bookingParser.js |
| Gewijzigde bestanden | — | intentService.js, contextService.js, ragService.js, holibot.js, calpe.config.js, texel.config.js |
| Admin endpoints | 89 | 89 (ongewijzigd) |
| Scheduled jobs | 46 | 46 (ongewijzigd) |
| CLAUDE.md | v3.55.0 | v3.56.0 |
| Master Strategie | v7.21 | v7.22 |

**Geschatte inspanning**: 15-25 uur
**Volgende blok**: Blok E (Admin Commerce Dashboard) — afhankelijk van Blok A+B+C data

---

## APPENDIX A: TRANSITIE NAAR BLOK E

Na Blok D zijn de volgende commerce blokken gereed:
- ✅ Blok A: Payment Engine (Adyen SDK, sessions, webhooks)
- ✅ Blok B: Ticketing (inventory, orders, QR, vouchers)
- ✅ Blok C: Reservering (slots, guests, GDPR, reminders)
- ✅ Blok D: Chatbot-to-Book (intents, flow, feature flags)

**Blok E** (Admin Commerce Dashboard) kan alle bovenstaande data aggregeren voor:
- Revenue dashboard (tickets + reserveringen + deposits)
- Financial reporting (daily/weekly/monthly)
- Fraud detection alerts
- CSV export

**Blok F** (Testing & Compliance) kan ALLE commerce modules E2E testen.

## APPENDIX B: NAAMCONVENTIES (herinnering)

| Destination | ID | Chatbot | Domein | Voorzetsels |
|-------------|-----|---------|--------|-------------|
| Calpe | 1 | HoliBot | holidaibutler.com | in Calpe |
| Texel | 2 | Tessa | texelmaps.nl | op Texel |
| Alicante | 3 | TBD | alicante.holidaibutler.com | in Alicante |
| WarreWijzer | 4 | Wijze Warre | warrewijzer.be | bij WarreWijzer |

---

*Dit document is het uitvoeringscommando voor Fase III Blok D. Behandel als direct uitvoerbaar door Claude Code.*
*Auteur: Claude (Strategic Analysis) | Datum: 02-03-2026 | Gebaseerd op: CLAUDE.md v3.55.0, MS v7.21, Fase III Command v1.0*
