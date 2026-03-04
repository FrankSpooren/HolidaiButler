# FASE III — BLOK E: ADMIN COMMERCE DASHBOARD
## HolidaiButler Platform — Claude Code Uitvoeringscommando
### Versie 1.0 — 02-03-2026

---

## DEEL 1: AUDIT BLOK D — CHATBOT-TO-BOOK VOORBEREIDING

> **Doel**: Toetsing of Blok D volledig en op enterprise-level kwaliteit is uitgevoerd conform het Blok D Command Document, inclusief verificatie dat de 8 openstaande documentatie-issues uit de Blok C audit zijn opgelost.

### 1.1 Blok C Audit Issues — Fix Verificatie

| # | Issue uit Blok C Audit | Status na Blok D | Bewijs |
|---|------------------------|------------------|--------|
| 1 | MS Roadmap tabel: "Blok G+A+B" i.p.v. "+C" | OPGELOST | MS r1324 nu "Blok G+A+B+C+D COMPLEET" |
| 2 | MS Footer volledig verouderd | OPGELOST | MS r1603-1604 nu correct: 89/v3.16.0/46/v3.56.0 |
| 3 | CLAUDE.md Admin Portal v3.15.0 | OPGELOST | CLAUDE.md r309 nu v3.16.0 |
| 4 | CLAUDE.md Gerelateerde Doc verkeerde MS versie | OPGELOST | CLAUDE.md r503 nu MS v7.22 |
| 5 | BullMQ health check "verwacht: 40" | OPGELOST | CLAUDE.md r465 nu "verwacht: 46" |
| 6 | Multi-tenancy lijst miste commerce tabellen | OPGELOST | CLAUDE.md r105 nu alle 10 commerce tabellen |
| 7 | MS datum "28 februari" | OPGELOST | MS r4 nu "2 maart 2026" |
| 8 | Frontend componenten Blok B+C niet gedocumenteerd | NIET OPGELOST | Niet opgesomd in CLAUDE.md of MS |

**Resultaat**: 7 van 8 Blok C issues opgelost. Significante verbetering.

### 1.2 Blok D Verificatie — Planned vs Delivered

| # | Requirement (Blok D Command) | Geleverd? | Bewijs |
|---|------------------------------|-----------|--------|
| D.1 | 4 booking sub-intents (ticket/reservation/activity/status) | JA | CLAUDE.md r181, MS r1355 |
| D.2 | 5 talen incl. FR (WarreWijzer prep) | JA | MS changelog v7.22 |
| D.3 | Conversational booking flow ragService v2.6 | JA | CLAUDE.md r174, MS r1355 |
| D.4 | Booking context tracking contextService v1.1 | JA | CLAUDE.md r186, MS r1355 |
| D.5 | 7 commerce feature flags per destination | JA | CLAUDE.md r183 (alle 7 benoemd) |
| D.6 | bookingMessages.js + bookingParser.js | JA | CLAUDE.md r174 Key Files |
| D.7 | holibot.js v3.0 routing integratie | JA | CLAUDE.md r174 |
| D.8 | 12/12 E2E tests PASS | JA | CLAUDE.md r488, MS v7.22 |
| D.9 | Geen PII in booking context (GDPR) | JA | CLAUDE.md r184 |
| D.10 | Destination prepositions correct per taal | JA | MS v7.22: "destination preposities" |
| D.11 | Feature flags alle false tot live testing | JA | CLAUDE.md r183 |
| D.12 | 15 min timeout booking sessie | JA | CLAUDE.md r184, MS v7.22 |
| D.13 | CLAUDE.md v3.55.0 naar v3.56.0 | JA | CLAUDE.md header r3 |
| D.14 | MS v7.21 naar v7.22 | JA | MS header r5 |
| D.15 | Implementatie Status tabel nieuwe rij III-D | JA | CLAUDE.md r255 |
| D.16 | Chatbot Capabilities sectie bijgewerkt | JA | CLAUDE.md r177-186 compleet |
| D.17 | Bug fix FR pattern | BONUS | MS v7.22: "Bug fix: FR reserverpatroon" |

**Score: 16/16 requirements geleverd + 1 bonus bug fix.**

### 1.3 Blok D Kwaliteitsbeoordeling

| Criterium | Beoordeling | Toelichting |
|-----------|-------------|-------------|
| Intent classificatie | ENTERPRISE | 4 sub-intents, 5 talen, confidence-based scoring |
| Conversational flow | ENTERPRISE | Multi-step met timeout, cancel, fallback |
| GDPR compliance | ENTERPRISE | Geen PII in booking context, 15 min auto-cleanup |
| Feature flags | ENTERPRISE | 7 granulaire flags, graceful degradation, per-destination |
| Taalregel compliance | ENTERPRISE | Correcte voorzetsels per bestemming per taal |
| Architectuur | ENTERPRISE | Chatbot verzamelt geen PII, stuurt door naar forms |
| Multi-destination | ENTERPRISE | Feature flags + prepositions + contact info per destination |
| WarreWijzer voorbereiding | ENTERPRISE | FR taal toegevoegd, destination_id 4 config ready |
| Test coverage | ENTERPRISE | 12/12 E2E + FR bug fix ontdekt en opgelost |

### 1.4 Geidentificeerde Issues — VERPLICHT OP TE LOSSEN BIJ BLOK E

#### ISSUE 1: CLAUDE.md Strategische Documentatie Tabel — MS Versie Achterloopt (P2 — MEDIUM)

**Probleem**: CLAUDE.md Strategische Documentatie tabel (r52) toont:
```
| Master Strategie | docs/strategy/... | 7.21 |
```
Moet zijn: **7.22** — de MS is immers bijgewerkt naar v7.22 bij Blok D.

De Gerelateerde Documentatie tabel (r503) toont WEL correct v7.22.

**Impact**: Twee tabellen in hetzelfde document met conflicterende versie-informatie. Dit is EXACT hetzelfde type inconsistentie als bij de Blok C audit (Issue 4). De versie-sync checklist uit het Blok D command bevatte dit item expliciet, maar het is toch gemist.

**Patroon**: De Strategische Documentatie tabel (bovenin CLAUDE.md) wordt STRUCTUREEL vergeten bij updates, terwijl de Gerelateerde Documentatie tabel (onderin) WEL wordt bijgewerkt. Root cause: twee tabellen met dezelfde informatie op verschillende locaties.

**Structurele fix**: Verwijder de versie-kolom uit de Strategische Documentatie tabel (r50-56) OF verwijs naar "zie Gerelateerde Documentatie voor versies" OF consolideer naar een enkele tabel. Implementeer bij Stap 0 van Blok E.

#### ISSUE 2: Versie-Sync Checklist Niet Structureel Verankerd (P2 — MEDIUM)

**Probleem**: De versie-sync checklist die in het Blok D command was voorgeschreven als structurele oplossing is NIET opgenomen in CLAUDE.md als Enterprise Kwaliteitsstandaard. Daardoor is het een eenmalige instructie die in toekomstige blokken kan worden overgeslagen.

**Structurele fix**: Voeg een compact versie-sync sectie toe aan CLAUDE.md Enterprise Kwaliteitsstandaarden (punt 7) of als aparte sectie, zodat Claude Code het bij ELKE sessie leest.

#### ISSUE 3: Frontend Componenten Commerce Niet Gedocumenteerd (P3 — LAAG, terugkerend)

**Probleem**: Zowel Ticketing (8 componenten), Reservation (7 componenten), als Chatbot-to-Book frontend wijzigingen zijn NIET individueel opgesomd in CLAUDE.md. Alleen backend bestanden en endpoints zijn gedocumenteerd.

**Impact**: Laag — frontend componenten zijn in de codebase aanwezig en werkend (E2E tests bewijzen dit). Maar voor toekomstige sessies is het nuttig om te weten welke componenten bestaan.

**Actie**: Bij Blok E (dat nieuwe frontend admin componenten toevoegt) verifieer en documenteer ALLE commerce frontend componenten in CLAUDE.md repository structuur.

### 1.5 Blok D Eindoordeel

| Aspect | Score |
|--------|-------|
| Functioneel compleet | 10/10 — alle 16 requirements geleverd |
| Enterprise kwaliteit | 10/10 — GDPR, feature flags, multi-destination, 5 talen |
| Documentatie | 8.5/10 — 1 versie-sync issue (structureel patroon), frontend niet gedocumenteerd |
| Architectuur | 10/10 — PII-vrij chatbot design, clean separation of concerns |
| Test coverage | 10/10 — 12/12 E2E + bug fix FR patroon |
| Blok C issue fixes | 9/10 — 7 van 8 issues opgelost |
| **TOTAAL** | **9.6/10 — Enterprise-level, geen workarounds, geen tijdelijke oplossingen** |

**CONCLUSIE**: Blok D is uitstekend uitgevoerd. Het architectuurbesluit om de chatbot GEEN PII te laten verzamelen is een sterk enterprise design pattern. De conversational flow met feature flags, timeout, en graceful degradation is productie-klaar. De enige verbeterpunten zijn documentatie-gerelateerd (versie-sync, frontend componenten). De verbetering ten opzichte van Blok C (7/8 issues opgelost) toont dat de kwaliteitsfeedback-loop werkt.

---

## DEEL 2: BLOK E UITVOERINGSCOMMANDO — ADMIN COMMERCE DASHBOARD

> **Dit is een direct uitvoerbaar Claude Code command. Lees CLAUDE.md + Master Strategie EERST.**

---

### STAP 0: PRE-FLIGHT CHECKS + STRUCTURELE FIXES (VERPLICHT)

```
VOER UIT VOORDAT JE AAN BLOK E BEGINT:

=== 0A. REFERENTIE DOCUMENTEN LEZEN ===
1. Lees /CLAUDE.md (verwacht: v3.56.0)
2. Lees /docs/strategy/HolidaiButler_Master_Strategie.md (verwacht: v7.22)
3. Lees dit command document VOLLEDIG
4. Verifieer in codebase: adminPortal.js (verwacht: v3.16.0, 89 endpoints)

=== 0B. STRUCTURELE FIX ISSUE 1 — CLAUDE.md Dubbele Documentatie Tabellen ===

De Strategische Documentatie tabel (r50-56) en Gerelateerde Documentatie tabel (r498-507)
bevatten overlappende informatie en raken structureel out-of-sync.

OPLOSSING: Consolideer naar EEN tabel.

Verwijder de versie-kolom uit de Strategische Documentatie tabel (r50-56).
Wijzig naar:

| Document | Locatie |
|----------|---------|
| **Master Strategie** | `docs/strategy/HolidaiButler_Master_Strategie.md` |
| **Agent Masterplan** | `docs/CLAUDE_AGENTS_MASTERPLAN.md` |
| **CLAUDE.md** | Repository root + Hetzner |
| **CLAUDE_HISTORY.md** | Repository root |

> Zie **Gerelateerde Documentatie** (onderaan dit document) voor actuele versienummers.

Dit voorkomt structureel dat twee tabellen out-of-sync raken.

=== 0C. STRUCTURELE FIX ISSUE 2 — Versie-Sync Standaard in Enterprise Kwaliteitsstandaarden ===

Voeg toe aan CLAUDE.md Enterprise Kwaliteitsstandaarden (na punt 6):

7. **Versie-Sync Controle**: Na elke fase/blok controleer:
   □ CLAUDE.md header versie
   □ MS header versie + datum + status
   □ CLAUDE.md Gerelateerde Documentatie versies
   □ CLAUDE.md Admin Portal versie + endpoint count
   □ CLAUDE.md BullMQ health check getal
   □ CLAUDE.md Scheduled Jobs getal
   □ MS Roadmap tabel Fase III status
   □ MS Fase III detail sectie
   □ MS Changelog + Footer

=== 0D. FIX ISSUE 3 — Frontend Componenten Documentatie ===

Verifieer aanwezige frontend componenten in codebase en voeg toe aan CLAUDE.md
Repository Structuur onder customer-portal/frontend:

□ Controleer: customer-portal/frontend/src/components/Ticketing/
   Verwacht: TicketList, TicketCard, TicketSelector, TicketCheckout,
   TicketConfirmation, TicketOrderHistory, VoucherInput, QRDisplay
□ Controleer: customer-portal/frontend/src/components/Reservations/
   Verwacht: ReservationWidget, SlotPicker, PartySizeSelector,
   GuestDetailsForm, ReservationConfirmation, ReservationHistory,
   ReservationCancel
□ Controleer: customer-portal/frontend/src/components/Payment/
   Verwacht: PaymentPage, PaymentResultPage
□ Documenteer ALLE gevonden componenten in CLAUDE.md repository structuur

=== 0E. DATABASE BACKUP ===
□ mysqldump -u pxoziy_1 -p pxoziy_db1 > /root/backups/pre-fase3-blokE-$(date +%Y%m%d-%H%M%S).sql
□ Verifieer backup: ls -la /root/backups/pre-fase3-blokE-*.sql

=== 0F. FEATURE BRANCH ===
□ git checkout -b feature/fase3-blok-e
□ git push origin feature/fase3-blok-e

=== 0G. BESTAANDE COMMERCE DATA INVENTARISATIE ===
Voordat je dashboard endpoints bouwt, inventariseer de beschikbare data:
□ SELECT COUNT(*) FROM payment_transactions WHERE destination_id IN (1,2);
□ SELECT COUNT(*) FROM ticket_orders WHERE destination_id IN (1,2);
□ SELECT COUNT(*) FROM reservations WHERE destination_id IN (1,2);
□ Noteer: zijn er al testdata? Zo niet, dashboard moet elegant met 0-data omgaan.
```

---

### STAP 1: COMMERCE SERVICE LAYER

Maak `/src/services/commerce/commerceService.js`:

```javascript
// === COMMERCE SERVICE — Aggregatie over Payment + Ticketing + Reservation ===
// Dit is een READ-ONLY service die data uit bestaande tabellen aggregeert.
// GEEN nieuwe database tabellen nodig.

// ARCHITECTUUR BESLUIT:
// commerceService.js leest uit:
//   - payment_transactions (Blok A)
//   - payment_refunds (Blok A)
//   - ticket_orders + ticket_order_items (Blok B)
//   - tickets + ticket_inventory (Blok B)
//   - reservations (Blok C)
//   - reservation_slots (Blok C)
//   - guest_profiles (Blok C)
//
// Alle queries MOETEN:
//   - destination_id filter hebben (multi-tenant)
//   - Bedragen in CENTEN (integers) retourneren
//   - Date ranges als parameters accepteren (from/to)
//   - Performant zijn (indexes gebruiken, geen full table scans)

const commerceService = {

    // ============================================================
    // 1. REVENUE DASHBOARD — Overzicht voor een periode
    // ============================================================
    
    async getDashboard(destinationId, dateFrom, dateTo) {
        // Query 1: Revenue aggregatie
        // SELECT 
        //   COUNT(*) as total_transactions,
        //   SUM(CASE WHEN status='captured' THEN amount_cents ELSE 0 END) as total_revenue_cents,
        //   SUM(CASE WHEN status='captured' AND payment_type='ticket' THEN amount_cents ELSE 0 END) as ticket_revenue_cents,
        //   SUM(CASE WHEN status='captured' AND payment_type='reservation_deposit' THEN amount_cents ELSE 0 END) as reservation_revenue_cents,
        //   SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed_count,
        //   SUM(CASE WHEN status='refunded' OR status='partially_refunded' THEN 1 ELSE 0 END) as refunded_count
        // FROM payment_transactions
        // WHERE destination_id = ? AND created_at BETWEEN ? AND ?
        
        // Query 2: Refund totaal
        // SELECT SUM(refund_amount_cents) as total_refunds_cents
        // FROM payment_refunds
        // WHERE destination_id = ? AND created_at BETWEEN ? AND ?
        
        // Query 3: Ticket statistieken
        // SELECT 
        //   SUM(quantity) as tickets_sold,
        //   SUM(CASE WHEN toi.validated_at IS NOT NULL THEN toi.quantity ELSE 0 END) as tickets_validated,
        //   SUM(CASE WHEN toi.status='cancelled' THEN toi.quantity ELSE 0 END) as tickets_cancelled
        // FROM ticket_orders to
        // JOIN ticket_order_items toi ON toi.order_id = to.id
        // WHERE to.destination_id = ? AND to.created_at BETWEEN ? AND ?
        
        // Query 4: Reservation statistieken
        // SELECT 
        //   COUNT(*) as total_reservations,
        //   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        //   SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) as no_shows,
        //   SUM(CASE WHEN status LIKE 'cancelled%' THEN 1 ELSE 0 END) as cancelled,
        //   AVG(party_size) as avg_party_size
        // FROM reservations
        // WHERE destination_id = ? AND created_at BETWEEN ? AND ?
        
        // Query 5: Bezettingsgraad
        // SELECT 
        //   SUM(reserved_seats) as total_reserved,
        //   SUM(total_seats) as total_capacity
        // FROM reservation_slots
        // WHERE destination_id = ? AND slot_date BETWEEN ? AND ?
        
        // Combineer tot dashboard object
        return {
            period: { from: dateFrom, to: dateTo },
            revenue: {
                total_cents,
                ticket_cents,
                reservation_deposit_cents,
                refunds_cents,
                net_revenue_cents  // total - refunds
            },
            transactions: {
                total,
                successful,
                failed,
                refunded,
                success_rate  // (successful / total * 100).toFixed(1)
            },
            tickets: {
                sold,
                validated,
                cancelled,
                validation_rate  // (validated / sold * 100).toFixed(1)
            },
            reservations: {
                created: total_reservations,
                completed,
                no_shows,
                cancelled,
                no_show_rate,  // (no_shows / total * 100).toFixed(1)
                avg_party_size,
                occupancy_rate  // (total_reserved / total_capacity * 100).toFixed(1)
            }
        };
    },

    // ============================================================
    // 2. FINANCIAL REPORTS — Dagelijks/Wekelijks/Maandelijks
    // ============================================================
    
    async getDailyReport(destinationId, dateFrom, dateTo) {
        // GROUP BY DATE(created_at) — retourneer array per dag:
        // SELECT 
        //   DATE(created_at) as date,
        //   COUNT(*) as transactions,
        //   SUM(CASE WHEN status='captured' THEN amount_cents ELSE 0 END) as revenue_cents,
        //   SUM(CASE WHEN status='captured' AND payment_type='ticket' THEN amount_cents ELSE 0 END) as ticket_cents,
        //   SUM(CASE WHEN status='captured' AND payment_type='reservation_deposit' THEN amount_cents ELSE 0 END) as deposit_cents
        // FROM payment_transactions
        // WHERE destination_id = ? AND created_at BETWEEN ? AND ?
        // GROUP BY DATE(created_at)
        // ORDER BY date ASC
        
        // Voeg refunds per dag toe:
        // SELECT DATE(created_at) as date, SUM(refund_amount_cents) as refunds_cents
        // FROM payment_refunds WHERE destination_id = ? AND ...
        // GROUP BY DATE(created_at)
        
        // Merge in JavaScript: per datum revenue - refunds = net
        return dailyRows;
    },
    
    async getWeeklyReport(destinationId, dateFrom, dateTo) {
        // Zelfde als daily maar GROUP BY YEARWEEK(created_at, 1)
        // Week 1 = ISO week (maandag start)
        return weeklyRows;
    },
    
    async getMonthlyReport(destinationId, year) {
        // GROUP BY MONTH(created_at) WHERE YEAR(created_at) = ?
        // Retourneer array 12 maanden (incl. 0-waarden voor lege maanden)
        return monthlyRows;
    },

    // ============================================================
    // 3. RECONCILIATION REPORT — Afstemming met Adyen
    // ============================================================
    
    async getReconciliationReport(destinationId, date) {
        // Doel: vergelijking tussen HB database en Adyen settlement
        // 
        // Query: ALLE transacties op opgegeven datum
        // SELECT 
        //   id, adyen_psp_reference, amount_cents, currency, status, 
        //   payment_method, created_at
        // FROM payment_transactions
        // WHERE destination_id = ? AND DATE(created_at) = ?
        // ORDER BY created_at ASC
        //
        // PLUS: refunds op die datum
        // SELECT 
        //   pr.id, pr.original_transaction_id, pt.adyen_psp_reference,
        //   pr.refund_amount_cents, pr.status, pr.created_at
        // FROM payment_refunds pr
        // JOIN payment_transactions pt ON pt.id = pr.original_transaction_id  
        // WHERE pr.destination_id = ? AND DATE(pr.created_at) = ?
        
        return {
            date,
            destination_id: destinationId,
            transactions: transactionRows,
            refunds: refundRows,
            summary: {
                total_captured_cents,
                total_refunded_cents,
                net_cents,
                transaction_count,
                refund_count
            },
            // NOTE: Werkelijke Adyen settlement data moet handmatig vergeleken worden
            // via het Adyen Merchant Portal. Dit rapport levert het HB-side overzicht.
            reconciliation_note: 'Vergelijk dit rapport met Adyen Merchant Portal settlements voor de opgegeven datum.'
        };
    },

    // ============================================================
    // 4. CSV EXPORT
    // ============================================================
    
    async exportTransactionsCSV(destinationId, dateFrom, dateTo) {
        // Query: Alle payment_transactions in periode
        // Kolommen: id, adyen_psp_reference, payment_type, amount_cents, 
        //   currency, status, payment_method, customer_email (GDPR: alleen admin),
        //   created_at, updated_at
        //
        // PLUS kolom: amount_eur (amount_cents / 100 geformatteerd) voor leesbaarheid
        //
        // Format: CSV met UTF-8 BOM (Excel compatibility)
        // Filename: commerce_transactions_{destination}_{from}_{to}.csv
        
        return { csv_string, filename, row_count };
    },
    
    async exportReservationsCSV(destinationId, dateFrom, dateTo) {
        // Kolommen: reservation_number, poi_name, guest_name (admin only),
        //   date, time, party_size, status, deposit_cents, special_requests, created_at
        return { csv_string, filename, row_count };
    },
    
    async exportTicketOrdersCSV(destinationId, dateFrom, dateTo) {
        // Kolommen: order_number, customer_email, items (ticket names + quantities),
        //   total_cents, status, payment_status, created_at
        return { csv_string, filename, row_count };
    },

    // ============================================================
    // 5. FRAUD DETECTION / ANOMALY ALERTS
    // ============================================================
    
    async getAlerts(destinationId) {
        // Anomalie detectie queries — GEEN ML, regel-gebaseerd
        
        const alerts = [];
        
        // ALERT 1: Chargebacks (CRITICAL)
        // SELECT * FROM payment_transactions 
        // WHERE destination_id = ? AND status = 'chargeback' 
        // AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        // Als count > 0 → CRITICAL alert
        
        // ALERT 2: Hoge failure rate (WARNING)
        // Bereken success_rate afgelopen 24h
        // Als < 80% EN total > 5 → WARNING "Payment success rate below 80%"
        
        // ALERT 3: Unusual amount (INFO)
        // SELECT AVG(amount_cents) as avg, STDDEV(amount_cents) as std 
        // FROM payment_transactions WHERE destination_id = ? AND status='captured'
        // AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
        // Check recente transacties > avg + 2*std → INFO per transactie
        
        // ALERT 4: Multiple refunds same customer (WARNING)
        // SELECT customer_email, COUNT(*) as refund_count
        // FROM payment_refunds pr JOIN payment_transactions pt ON ...
        // WHERE pr.destination_id = ? AND pr.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        // GROUP BY customer_email HAVING refund_count >= 3
        // → WARNING per klant
        
        // ALERT 5: Rapid small transactions (WARNING)
        // SELECT customer_ip, COUNT(*) as tx_count, 
        //   MIN(created_at) as first_tx, MAX(created_at) as last_tx
        // FROM payment_transactions
        // WHERE destination_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        // GROUP BY customer_ip HAVING tx_count >= 5
        // AND TIMESTAMPDIFF(MINUTE, first_tx, last_tx) < 10
        // → WARNING per IP
        
        // ALERT 6: No-show spike (WARNING)
        // Bereken no_show_rate afgelopen 7 dagen
        // Vergelijk met 30-dag baseline
        // Als > baseline + 20 percentage points → WARNING
        
        // Sorteer: CRITICAL first, dan WARNING, dan INFO
        alerts.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
        
        return {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            info: alerts.filter(a => a.severity === 'info').length,
            alerts
        };
    },

    // ============================================================
    // 6. TOP PERFORMERS — POI Ranking
    // ============================================================
    
    async getTopPOIs(destinationId, dateFrom, dateTo, metric, limit = 10) {
        // metric = 'revenue' | 'tickets_sold' | 'reservations' | 'occupancy'
        
        // revenue: JOIN ticket_order_items → POI, SUM(amount_cents) GROUP BY poi_id
        // tickets_sold: SUM(quantity) GROUP BY poi_id
        // reservations: COUNT(*) FROM reservations GROUP BY poi_id
        // occupancy: SUM(reserved_seats) / SUM(total_seats) GROUP BY poi_id
        
        // ALTIJD: JOIN POI voor naam + categorie
        // ORDER BY metric DESC LIMIT ?
        
        return topPois;
    }
};

module.exports = commerceService;
```

---

### STAP 2: ADMIN API ENDPOINTS

Voeg toe aan `/src/routes/adminPortal.js` (v3.16.0 naar v3.17.0):

```javascript
// === COMMERCE DASHBOARD ENDPOINTS ===
// 8 nieuwe endpoints in adminPortal.js
// ALLE endpoints: adminAuth + destinationScope middleware
// ALLE endpoints: destinationId uit query parameter of JWT destination scope

// -------------------------------------------------------------------
// E.1 REVENUE DASHBOARD
// -------------------------------------------------------------------

// GET /api/admin/commerce/dashboard
// Query: destinationId (verplicht), from (ISO date), to (ISO date)
// Default periode: huidige maand (1e tot vandaag)
// Response: commerceService.getDashboard() resultaat
// Middleware: adminAuth, destinationScope
// Rate limit: standaard admin (300/15min)
//
// Speciale behandeling 0-data:
// Als ALLE waarden 0 → voeg "empty": true toe aan response
// Frontend kan dit gebruiken om "Nog geen commerce data" te tonen

// -------------------------------------------------------------------
// E.2 FINANCIAL REPORTS
// -------------------------------------------------------------------

// GET /api/admin/commerce/reports/daily
// Query: destinationId, from, to (verplicht — max range 90 dagen)
// Response: array per dag: { date, transactions, revenue_cents, ticket_cents, deposit_cents, refunds_cents, net_cents }
// Validatie: from <= to, range <= 90 dagen, from niet in toekomst

// GET /api/admin/commerce/reports/weekly
// Query: destinationId, from, to (verplicht — max range 1 jaar)
// Response: array per ISO week: { year, week, transactions, revenue_cents, ... }

// GET /api/admin/commerce/reports/monthly
// Query: destinationId, year (verplicht)
// Response: array 12 maanden: { month, month_name, transactions, revenue_cents, ... }
// month_name in admin taal (i18n: NL/EN/DE/ES)

// -------------------------------------------------------------------
// E.3 RECONCILIATION
// -------------------------------------------------------------------

// GET /api/admin/commerce/reports/reconciliation
// Query: destinationId, date (verplicht — enkele datum)
// Response: transacties + refunds + samenvatting voor die dag
// Doel: admin kan dit vergelijken met Adyen Merchant Portal

// -------------------------------------------------------------------
// E.4 CSV EXPORT
// -------------------------------------------------------------------

// GET /api/admin/commerce/export/transactions
// Query: destinationId, from, to, format=csv
// Response: Content-Type: text/csv, Content-Disposition: attachment; filename=...
// UTF-8 BOM voor Excel compatibility
// Max export: 10.000 rijen (pagination hint als meer)

// GET /api/admin/commerce/export/reservations
// Zelfde pattern, reservation data

// GET /api/admin/commerce/export/tickets
// Zelfde pattern, ticket order data

// -------------------------------------------------------------------
// E.5 FRAUD / ANOMALY ALERTS
// -------------------------------------------------------------------

// GET /api/admin/commerce/alerts
// Query: destinationId
// Response: commerceService.getAlerts() resultaat
// Gesorteerd op severity (critical first)

// -------------------------------------------------------------------
// E.6 TOP PERFORMERS
// -------------------------------------------------------------------

// GET /api/admin/commerce/top-pois
// Query: destinationId, from, to, metric (revenue|tickets_sold|reservations|occupancy), limit (default 10, max 50)
// Response: array { poi_id, poi_name, category, value, rank }

// -------------------------------------------------------------------
// ENDPOINT SAMENVATTING
// -------------------------------------------------------------------
// Totaal nieuwe endpoints: 8
//   1. GET /api/admin/commerce/dashboard
//   2. GET /api/admin/commerce/reports/daily
//   3. GET /api/admin/commerce/reports/weekly
//   4. GET /api/admin/commerce/reports/monthly
//   5. GET /api/admin/commerce/reports/reconciliation
//   6. GET /api/admin/commerce/export/transactions  (+ /reservations + /tickets = 3 sub-endpoints)
//   7. GET /api/admin/commerce/alerts
//   8. GET /api/admin/commerce/top-pois
//
// adminPortal.js v3.16.0 → v3.17.0
// Admin endpoints totaal: 89 + 8 = 97
//
// NOOT: De 3 CSV export sub-endpoints (/transactions, /reservations, /tickets)
// tellen als 1 logisch endpoint "commerce export" maar zijn technisch 3 routes.
// Voor consistente telling: 89 + 8 = 97 (individuele routes) OF 89 + 6 = 95 (logische endpoints).
// KEUZE: Tel individuele routes → 97 endpoints. Dit is consistent met eerdere telling
// waar elke route als apart endpoint werd geteld.
```

---

### STAP 3: ADMIN FRONTEND — COMMERCE PAGINA

Maak frontend componenten in `admin-module/src/pages/CommercePage/`:

```
admin-module/src/pages/CommercePage/
├── CommercePage.jsx           # Hoofd pagina met tabs
├── DashboardTab.jsx           # Revenue overview + KPI cards
├── ReportsTab.jsx             # Financial reports met periode selectie
├── AlertsTab.jsx              # Fraud/anomaly alerts lijst
├── ExportTab.jsx              # CSV export interface
└── components/
    ├── RevenueCards.jsx        # 4 KPI summary cards bovenaan
    ├── RevenueChart.jsx        # Recharts BarChart/LineChart daily/weekly/monthly
    ├── TransactionTable.jsx    # Tabel met recente transacties
    ├── ReservationStats.jsx    # Reservation-specifieke statistieken
    ├── TicketStats.jsx         # Ticket-specifieke statistieken
    ├── AlertCard.jsx           # Individuele alert card (severity color coded)
    ├── TopPOIsList.jsx         # Top performing POIs ranking
    ├── PeriodSelector.jsx      # DatePicker from/to + quick presets (vandaag/week/maand/kwartaal/jaar)
    └── ReconciliationView.jsx  # Reconciliation rapport display
```

#### 3.1 CommercePage.jsx — Hoofd Layout

```jsx
// MUI Tabs: Dashboard | Reports | Alerts | Export
// Standaard tab: Dashboard
// destinationId selector (zelfde als andere admin pagina's)
// i18n: NL/EN/DE/ES
//
// Route: /commerce (toevoegen aan admin React Router)
// Sidebar menu item: "Commerce" met shopping-cart icon
// Alleen zichtbaar voor: platform_admin, poi_owner (niet content_editor, content_reviewer)
// writeAccess check: NIET nodig (alle endpoints zijn read-only + export)
// UITZONDERING: poi_owner en content_editor mogen ALLEEN hun eigen destination zien
```

#### 3.2 DashboardTab.jsx — Revenue Overview

```jsx
// Layout (desktop):
// ┌─────────┬─────────┬─────────┬─────────┐
// │ Revenue │ Trans.  │ Tickets │ Reserv. │  ← 4 KPI Cards
// └─────────┴─────────┴─────────┴─────────┘
// ┌─────────────────────────────────────────┐
// │         Revenue Chart (Recharts)        │  ← BarChart of LineChart
// │         daily/weekly/monthly toggle      │
// └─────────────────────────────────────────┘
// ┌──────────────────┬──────────────────────┐
// │   Ticket Stats   │  Reservation Stats   │  ← Side by side
// └──────────────────┴──────────────────────┘
// ┌─────────────────────────────────────────┐
// │         Top POIs (by revenue)           │  ← Top 10
// └─────────────────────────────────────────┘

// KPI Cards format:
// - Netto Revenue: "EUR X.XXX,XX" (centen naar euro formatting)
// - Transacties: "42 (93.3% success)" 
// - Tickets: "120 verkocht, 98 gevalideerd"
// - Reserveringen: "35 geboekt, 72.5% bezetting"
//
// MUI Card componenten, destination-aware kleuren (Calpe groen, Texel blauw)
// 
// PeriodSelector bovenaan: from/to datepickers + quick presets
// Quick presets: Vandaag, Deze Week, Deze Maand, Dit Kwartaal, Dit Jaar
//
// BELANGRIJK: Als empty=true → toon friendly "Nog geen commerce data" kaart
// met tekst: "Er zijn nog geen transacties voor deze periode. Commerce features worden
// geactiveerd zodra de eerste live test succesvol is."
```

#### 3.3 ReportsTab.jsx — Financial Reports

```jsx
// Granulatie toggle: Dagelijks | Wekelijks | Maandelijks
// DatePicker voor from/to (dagelijks/wekelijks) of jaar (maandelijks)
//
// Tabel met kolommen:
// | Periode | Transacties | Tickets (EUR) | Deposits (EUR) | Refunds (EUR) | Netto (EUR) |
//
// Recharts LineChart eronder: netto revenue over tijd
//
// Reconciliation sectie:
// DatePicker voor enkele datum
// Tabel: alle transacties op die dag met PSP reference, bedrag, status
// "Download reconciliation rapport" → CSV
//
// Euro formatting: amount_cents / 100 met 2 decimalen, EUR prefix
// i18n: NL decimaal separator = komma, EN = punt
```

#### 3.4 AlertsTab.jsx — Fraud/Anomaly Alerts

```jsx
// Alert cards gesorteerd op severity
// Severity kleuren:
//   CRITICAL: MUI error.main (rood), pulserende badge
//   WARNING: MUI warning.main (oranje)
//   INFO: MUI info.main (blauw)
//
// Per alert: type, beschrijving, timestamp, betrokken transactie(s)/klant(en)
// Geen "dismiss" functionaliteit (alerts zijn informatief, verdwijnen als conditie opgelost)
//
// Header summary: "2 Critical, 3 Warning, 5 Info"
// Als geen alerts: friendly "Geen anomalieen gedetecteerd" met check-circle icon
```

#### 3.5 ExportTab.jsx — CSV Export

```jsx
// 3 export types: Transacties | Reserveringen | Ticket Orders
// Per type: DatePicker from/to + Download knop
//
// Download flow:
// 1. Klik "Download CSV"
// 2. Fetch endpoint met responseType: 'blob'
// 3. Create Blob URL → trigger download
// 4. Success toast: "X rijen geexporteerd"
//
// Max 10.000 rijen per export → toon waarschuwing als limiet bereikt
// "Er zijn meer dan 10.000 rijen. Verklein de periode voor een volledig export."
```

---

### STAP 4: i18n UITBREIDING

Voeg toe aan `admin-module/src/i18n/` voor alle 4 talen (NL/EN/DE/ES):

```javascript
// Nieuwe commerce keys per taal:
commerce: {
    title: 'Commerce Dashboard',
    dashboard: 'Dashboard',
    reports: 'Rapporten',
    alerts: 'Alerts',
    export: 'Export',
    
    // KPI Cards
    revenue: 'Netto Omzet',
    transactions: 'Transacties',
    tickets_sold: 'Tickets Verkocht',
    reservations_created: 'Reserveringen',
    success_rate: 'Succespercentage',
    validation_rate: 'Validatiepercentage',
    no_show_rate: 'No-show Percentage',
    occupancy_rate: 'Bezettingsgraad',
    avg_party_size: 'Gem. Groepsgrootte',
    
    // Reports
    daily: 'Dagelijks',
    weekly: 'Wekelijks',
    monthly: 'Maandelijks',
    reconciliation: 'Afstemming',
    period: 'Periode',
    date: 'Datum',
    net_revenue: 'Netto Omzet',
    ticket_revenue: 'Ticket Omzet',
    deposit_revenue: 'Borg Omzet',
    refunds: 'Terugbetalingen',
    reconciliation_note: 'Vergelijk dit rapport met het Adyen Merchant Portal voor de gekozen datum.',
    
    // Alerts
    no_alerts: 'Geen anomalieen gedetecteerd',
    critical: 'Kritiek',
    warning: 'Waarschuwing',
    info: 'Informatie',
    alert_chargeback: 'Chargeback ontvangen',
    alert_low_success: 'Laag slagingspercentage betalingen',
    alert_unusual_amount: 'Ongebruikelijk hoog bedrag',
    alert_multiple_refunds: 'Meerdere terugbetalingen zelfde klant',
    alert_rapid_transactions: 'Verdacht patroon: snelle transacties',
    alert_noshow_spike: 'No-show piek gedetecteerd',
    
    // Export
    export_transactions: 'Transacties exporteren',
    export_reservations: 'Reserveringen exporteren',
    export_tickets: 'Ticket orders exporteren',
    download_csv: 'Download CSV',
    rows_exported: '{count} rijen geexporteerd',
    export_limit_warning: 'Meer dan 10.000 rijen. Verklein de periode voor een volledig export.',
    
    // Top POIs
    top_pois: 'Top Locaties',
    by_revenue: 'Op omzet',
    by_tickets: 'Op tickets',
    by_reservations: 'Op reserveringen',
    by_occupancy: 'Op bezetting',
    
    // Empty state
    no_data: 'Nog geen commerce data',
    no_data_description: 'Er zijn nog geen transacties voor deze periode. Commerce features worden geactiveerd zodra de eerste live test succesvol is.',
    
    // Period presets
    today: 'Vandaag',
    this_week: 'Deze week',
    this_month: 'Deze maand',
    this_quarter: 'Dit kwartaal',
    this_year: 'Dit jaar'
}
// ALLE keys vertalen naar EN, DE, ES (zelfde pattern als bestaande i18n bestanden)
```

---

### STAP 5: ADMIN ROUTER + SIDEBAR

```javascript
// === admin-module/src/App.jsx of router configuratie ===

// Voeg route toe:
// <Route path="/commerce" element={<CommercePage />} />

// === admin-module/src/components/Sidebar.jsx ===

// Voeg menu item toe NA bestaande items:
// Icon: ShoppingCartOutlined (MUI)
// Label: i18n commerce.title
// Path: /commerce
// Zichtbaar voor: platform_admin, poi_owner
// NIET zichtbaar voor: content_editor, content_reviewer (geen commerce rechten)
```

---

### STAP 6: EURO FORMATTING UTILITY

Maak `admin-module/src/utils/currencyFormat.js`:

```javascript
// === CURRENCY FORMATTING ===
// Centraal voor alle commerce pagina's

export function formatCents(amountCents, locale = 'nl-NL') {
    // Converteer centen naar euro's met 2 decimalen
    const euros = amountCents / 100;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(euros);
}

// Voorbeelden:
// formatCents(12500) → "€ 125,00" (NL)
// formatCents(12500, 'en-US') → "€125.00" (EN)
// formatCents(0) → "€ 0,00"
// formatCents(-5000) → "-€ 50,00" (refund)

export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined) return '—';
    return `${Number(value).toFixed(decimals)}%`;
}

// locale mapping voor admin i18n:
// NL → nl-NL
// EN → en-GB (Europees Engels, EUR met punt)
// DE → de-DE
// ES → es-ES
```

---

### STAP 7: DARK MODE SUPPORT

```javascript
// ALLE nieuwe Commerce componenten MOETEN dark mode ondersteunen.
// Gebruik MUI theme palette tokens, GEEN hardcoded kleuren.
//
// Pattern (conform Fase 9I dark mode implementatie):
// - Achtergrond: theme.palette.background.paper (NIET 'white' of '#fff')
// - Tekst: theme.palette.text.primary (NIET 'black' of '#000')
// - Charts: theme.palette.primary.main, secondary.main, etc.
// - Alert severity: theme.palette.error.main / warning.main / info.main
// - Borders: theme.palette.divider
//
// Recharts theme integratie:
// - CartesianGrid stroke: theme.palette.divider
// - Axis tick fill: theme.palette.text.secondary
// - Tooltip background: theme.palette.background.paper
```

---

### STAP 8: RBAC + SECURITY

```javascript
// === RBAC VOOR COMMERCE ENDPOINTS ===

// Alle commerce endpoints gebruiken:
// 1. adminAuth middleware (JWT verificatie)
// 2. destinationScope middleware (filtert op destination_id van de user)
// 3. writeAccess NIET nodig (alle endpoints zijn read-only)

// RBAC matrix:
// | Endpoint                        | platform_admin | poi_owner | content_editor | content_reviewer |
// |--------------------------------|----------------|-----------|----------------|------------------|
// | GET /commerce/dashboard         | ALLE dest      | EIGEN     | GEEN           | GEEN             |
// | GET /commerce/reports/*         | ALLE dest      | EIGEN     | GEEN           | GEEN             |
// | GET /commerce/export/*          | ALLE dest      | EIGEN     | GEEN           | GEEN             |
// | GET /commerce/alerts            | ALLE dest      | EIGEN     | GEEN           | GEEN             |
// | GET /commerce/top-pois          | ALLE dest      | EIGEN     | GEEN           | GEEN             |

// SECURITY:
// - CSV exports bevatten customer_email → alleen admin rollen
// - Geen PII in alert descriptions (gebruik transaction_id, NIET customer_email)
// - Rate limiting: standaard admin rate limiter (300/15min)
// - Input validatie: from/to datum format, year 2020-2100, destinationId 1-4
// - SQL injection: parameterized queries OVERAL (? placeholders)
```

---

### STAP 9: VERIFICATIE BLOK E

```
=== BACKEND API TESTS ===
□ GET /api/admin/commerce/dashboard?destinationId=1&from=2026-03-01&to=2026-03-31 → 200 OK
□ GET /api/admin/commerce/dashboard?destinationId=1 (geen from/to) → default huidige maand → 200 OK
□ GET /api/admin/commerce/dashboard (geen destinationId) → 400 Bad Request
□ GET /api/admin/commerce/dashboard → 0-data response met empty: true
□ GET /api/admin/commerce/reports/daily?destinationId=1&from=2026-03-01&to=2026-03-31 → 200 OK array
□ GET /api/admin/commerce/reports/weekly → 200 OK array
□ GET /api/admin/commerce/reports/monthly?destinationId=1&year=2026 → 200 OK 12 maanden
□ GET /api/admin/commerce/reports/reconciliation?destinationId=1&date=2026-03-01 → 200 OK
□ GET /api/admin/commerce/export/transactions → Content-Type: text/csv, UTF-8 BOM
□ GET /api/admin/commerce/export/reservations → CSV download
□ GET /api/admin/commerce/export/tickets → CSV download
□ GET /api/admin/commerce/alerts?destinationId=1 → 200 OK (evt. lege alerts array)
□ GET /api/admin/commerce/top-pois?destinationId=1&metric=revenue → 200 OK array

=== RBAC TESTS ===
□ platform_admin: alle commerce endpoints bereikbaar voor alle destinations
□ poi_owner (destination 1): alleen destination 1 data, destination 2 → 403
□ content_editor: alle commerce endpoints → 403 Forbidden
□ content_reviewer: alle commerce endpoints → 403 Forbidden
□ Geen JWT: alle commerce endpoints → 401 Unauthorized

=== FRONTEND TESTS ===
□ Commerce pagina bereikbaar via /commerce
□ Sidebar menu item zichtbaar voor platform_admin + poi_owner
□ Sidebar menu item NIET zichtbaar voor content_editor + content_reviewer
□ Dashboard tab: 4 KPI cards tonen data of "Nog geen commerce data"
□ Revenue chart: Recharts BarChart/LineChart rendert zonder errors
□ Period selector: from/to datepickers + quick presets werkend
□ Reports tab: dagelijks/wekelijks/maandelijks toggle werkend
□ Reconciliation: datum picker + transactie tabel
□ Alerts tab: alert cards met correcte severity kleuren
□ Export tab: CSV download triggert correct
□ Dark mode: alle componenten correct in dark theme
□ i18n: NL/EN/DE/ES correcte labels
□ Mobile responsive: acceptabele layout op tablets
□ 0-data: friendly empty state op alle tabs

=== INTEGRATIE TESTS ===
□ Commerce dashboard data consistent met bestaande admin endpoints:
   - ticket stats matchen GET /api/admin/tickets/stats
   - reservation stats matchen GET /api/admin/reservations/stats
□ CSV export data consistent met dashboard data (zelfde totalen)
□ Destination filter werkt correct (geen cross-destination data leakage)

=== ENTERPRISE QUALITY ===
□ Alle bedragen in CENTEN (integers) backend → EUR formatting frontend
□ destination_id op ALLE queries (multi-tenant)
□ Error handling: try/catch op alle async service functies
□ Input validatie: datum format, range limits, destinationId whitelist
□ Logging: structured met destination_id, action, period
□ Geen PII in server logs
□ SQL: parameterized queries, geen string concatenation
□ Dark mode: MUI palette tokens, geen hardcoded kleuren
□ CSV: UTF-8 BOM voor Excel compatibility
```

---

### STAP 10: DOCUMENTATIE UPDATES

```
=== CLAUDE.md (v3.56.0 → v3.57.0) ===

□ FIX: Strategische Documentatie tabel — verwijder versie-kolom (Stap 0B)
□ FIX: Enterprise Kwaliteitsstandaarden — punt 7 versie-sync (Stap 0C)
□ FIX: Frontend componenten documentatie (Stap 0D)
□ Fase III status: "Blok G+A+B+C+D+E COMPLEET"
□ Admin Portal: v3.16.0 → v3.17.0, 89 → 97 endpoints
□ Repository structuur: voeg commerce/ service toe, CommercePage frontend
□ Implementatie Status tabel: nieuwe rij III-E
□ Changelog: v3.57.0 entry

=== Master Strategie (v7.22 → v7.23) ===

□ Fase III detail: Admin Commerce (Blok E) → COMPLEET
□ Roadmap tabel: "Blok G+A+B+C+D+E COMPLEET"
□ Changelog: v7.23 entry
□ Header Status + Datum + Footer: ALLE syncen

=== VERSIE-SYNC CHECKLIST (verplicht) ===
□ CLAUDE.md header versie = v3.57.0
□ MS header versie = v7.23
□ MS header status vermeldt v3.57.0
□ CLAUDE.md Gerelateerde Documentatie: MS = v7.23
□ CLAUDE.md Admin Portal: v3.17.0 + 97 endpoints
□ CLAUDE.md BullMQ health check: 46 (ongewijzigd)
□ CLAUDE.md Scheduled Jobs: 46 (ongewijzigd)
□ MS Roadmap tabel: "Blok G+A+B+C+D+E COMPLEET"
□ MS Fase III detail: Blok E = COMPLEET
□ MS Footer: 97 endpoints, v3.17.0, 46 jobs, v3.57.0

=== Git Workflow ===
□ git add -A
□ git commit -m "Fase III Blok E: Admin Commerce Dashboard COMPLEET - 8 endpoints (dashboard, reports daily/weekly/monthly, reconciliation, export x3, alerts, top-pois), commerceService.js, CommercePage frontend (4 tabs, Recharts, CSV export, i18n 4 talen, dark mode)"
□ git push origin feature/fase3-blok-e
□ Merge: feature/fase3-blok-e → dev → test → main
□ PM2 restart: pm2 restart all
□ Deploy: admin portal alle 3 omgevingen (dev/test/prod)

=== Smoke Test Na Deployment ===
□ admin.holidaibutler.com → login → Commerce pagina bereikbaar
□ Dashboard tab toont KPI cards (waarschijnlijk 0-data → empty state)
□ CSV export download werkt
□ pm2 status → alle processes online
□ BullMQ jobs: 46 (ongewijzigd — Blok E voegt geen jobs toe)
```

---

### STAP 11: SAMENVATTING & VERWACHT RESULTAAT

| Aspect | Voor Blok E | Na Blok E |
|--------|-------------|-----------|
| Backend service | — | commerceService.js (6 functies) |
| Admin endpoints | 89 | 97 (+8 commerce) |
| Admin pagina's | POI, Agents, Analytics, Users | + Commerce (4 tabs) |
| Frontend componenten | — | CommercePage + 8 sub-componenten |
| CSV export | Alleen POI CSV | + Transactions + Reservations + Tickets CSV |
| Fraud detection | — | 6 regel-gebaseerde alert types |
| Charts | Analytics pageviews | + Revenue charts (Recharts) |
| adminPortal.js | v3.16.0 | v3.17.0 |
| CLAUDE.md | v3.56.0 | v3.57.0 |
| Master Strategie | v7.22 | v7.23 |
| Scheduled jobs | 46 | 46 (ongewijzigd) |
| Database tabellen | 10 commerce | 10 (ongewijzigd — read-only aggregatie) |

**Geschatte inspanning**: 20-30 uur
**Volgende blok**: Blok F (Testing & Compliance) — PCI DSS docs, payment test matrix, GDPR checklist

---

## APPENDIX A: TRANSITIE NAAR BLOK F

Na Blok E is de Commerce Foundation technisch volledig:
- Blok A: Payment Engine (Adyen)
- Blok B: Ticketing (inventory, orders, QR, vouchers)
- Blok C: Reservering (slots, guests, GDPR)
- Blok D: Chatbot-to-Book (intents, flow, feature flags)
- Blok E: Admin Commerce Dashboard (reporting, alerts, export)

**Blok F** (Testing & Compliance) is het sluitstuk dat:
1. PCI DSS SAQ-A documentatie completeert
2. Payment test matrix uitvoert (iDEAL, card, 3DS, refund, webhook)
3. Ticketing race condition tests uitvoert (concurrent access, expired reservations)
4. Reservation double-booking tests uitvoert (slot locking, blacklist)
5. GDPR compliance checklist verifieert
6. Security audit uitvoert (geen PII in logs, API keys alleen in .env)

Na Blok F kan Fase III als COMPLEET worden gemarkeerd en is het platform klaar voor Fase IV (Intermediair Module).

## APPENDIX B: NAAMCONVENTIES (herinnering)

| Destination | ID | Chatbot | Domein | Voorzetsels |
|-------------|-----|---------|--------|-------------|
| Calpe | 1 | HoliBot | holidaibutler.com | in Calpe |
| Texel | 2 | Tessa | texelmaps.nl | op Texel |
| Alicante | 3 | TBD | alicante.holidaibutler.com | in Alicante |
| WarreWijzer | 4 | Wijze Warre | warrewijzer.be | bij WarreWijzer |

---

*Dit document is het uitvoeringscommando voor Fase III Blok E. Behandel als direct uitvoerbaar door Claude Code.*
*Auteur: Claude (Strategic Analysis) | Datum: 02-03-2026 | Gebaseerd op: CLAUDE.md v3.56.0, MS v7.22, Fase III Command v1.0*
