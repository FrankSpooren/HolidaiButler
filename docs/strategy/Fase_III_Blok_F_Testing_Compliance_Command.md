# FASE III — BLOK F: TESTING & COMPLIANCE
## HolidaiButler Platform — Claude Code Uitvoeringscommando
### Versie 1.0 — 02-03-2026
### LAATSTE BLOK FASE III — Na afronding is Fase III VOLLEDIG COMPLEET

---

## DEEL 1: AUDIT BLOK E — ADMIN COMMERCE DASHBOARD

> **Doel**: Toetsing of Blok E volledig en op enterprise-level kwaliteit is uitgevoerd conform het Blok E Command Document, inclusief verificatie dat de 3 openstaande issues uit de Blok D audit zijn opgelost.

### 1.1 Blok D Audit Issues — Fix Verificatie

| # | Issue uit Blok D Audit | Status na Blok E | Bewijs |
|---|------------------------|------------------|--------|
| 1 | CLAUDE.md Strategische Documentatie tabel had versie-kolom die structureel out-of-sync raakte met Gerelateerde Documentatie tabel | OPGELOST | CLAUDE.md r49-58: versie-kolom verwijderd, verwijzing "Actuele versienummers: zie Gerelateerde Documentatie" |
| 2 | Versie-sync checklist niet structureel verankerd in Enterprise Kwaliteitsstandaarden | OPGELOST | CLAUDE.md r34 punt 7: "Versie-Sync Controle" met volledige checklist |
| 3 | Frontend componenten Ticketing/Reservation/Payment niet individueel gedocumenteerd in repo structuur | NIET OPGELOST | Repository structuur (r66-93) toont nog steeds alleen generieke mappen zonder commerce componenten |

**Resultaat**: 2 van 3 structurele issues opgelost. De twee P2-issues (dubbele tabellen, versie-sync standaard) zijn correct gefixt. Issue 3 (P3, frontend componenten) is nu voor de DERDE achtereenvolgende keer niet opgepakt.

### 1.2 Blok E Verificatie — Planned vs Delivered

| # | Requirement (Blok E Command) | Geleverd? | Bewijs |
|---|------------------------------|-----------|--------|
| E.1 | commerceService.js (READ-ONLY aggregatie) | JA | CLAUDE.md r87: "commerce/ Commerce Dashboard aggregation (commerceService.js)", MS r1356 |
| E.2 | Revenue Dashboard endpoint | JA | CLAUDE.md r492: "dashboard" in 10 endpoints |
| E.3 | Financial Reports (daily/weekly/monthly) | JA | CLAUDE.md r492: "daily/weekly/monthly reports" |
| E.4 | Reconciliation report | JA | CLAUDE.md r492: "reconciliation" |
| E.5 | CSV Export (3 types: transactions/reservations/tickets) | JA | CLAUDE.md r492: "3 CSV exports" |
| E.6 | Fraud/Anomaly alerts (6 types) | JA | CLAUDE.md r492: "alerts (6 fraud types)" |
| E.7 | Top POIs ranking | JA | CLAUDE.md r492: "top POIs" |
| E.8 | CommercePage.jsx met 4 tabs | JA | CLAUDE.md r259 + r492: "4 tabs: Dashboard KPIs + Recharts, Reports + reconciliatie, Alerts, Export CSV" |
| E.9 | currencyFormat.js utility (centen→EUR) | JA | CLAUDE.md r492: "currencyFormat.js utility" |
| E.10 | i18n 4 talen (~50 keys) | JA | CLAUDE.md r492 + MS r1356 |
| E.11 | RBAC: platform_admin + poi_owner | JA | CLAUDE.md r492 + MS r1356 |
| E.12 | Dark mode support | NIET VERIFIEERBAAR | Niet expliciet vermeld in changelog — waarschijnlijk geïmplementeerd via MUI theme tokens maar niet gedocumenteerd |
| E.13 | 0-data empty state handling | NIET VERIFIEERBAAR | Niet expliciet vermeld — zou in CommercePage zitten maar niet gedocumenteerd |
| E.14 | adminPortal.js v3.16.0 → v3.17.0 | JA | CLAUDE.md r82 + r313 |
| E.15 | Admin endpoints 89 → 97+ | JA (99) | CLAUDE.md r316: "99 admin endpoints" — 10 endpoints i.p.v. verwachte 8, want CSV exports individueel geteld |
| E.16 | CLAUDE.md v3.56.0 → v3.57.0 | JA | CLAUDE.md header r3 |
| E.17 | MS v7.22 → v7.23 | JA | MS header r5, CLAUDE.md r505 |
| E.18 | Implementatie Status tabel rij III-E | JA | CLAUDE.md r259 |
| E.19 | Stap 0B: Strategische Doc tabel fix | JA | Zie 1.1 Issue 1 |
| E.20 | Stap 0C: Versie-sync als Enterprise standaard | JA | Zie 1.1 Issue 2 |
| E.21 | Stap 0D: Frontend componenten documentatie | NEE | Zie 1.1 Issue 3 |
| E.22 | Versie-sync checklist doorlopen na Blok E | GEDEELTELIJK | CLAUDE.md intern consistent, MS NIET — zie Issues hieronder |

**Score: 18/22 requirements volledig geleverd, 2 niet verifieerbaar, 2 niet uitgevoerd.**

### 1.3 Blok E Kwaliteitsbeoordeling

| Criterium | Beoordeling | Toelichting |
|-----------|-------------|-------------|
| Backend architectuur | ENTERPRISE | READ-ONLY aggregatieservice, geen nieuwe DB tabellen, clean separation |
| Endpoint design | ENTERPRISE | 10 granulaire endpoints, multi-destination, date range filtering |
| Financial reporting | ENTERPRISE | Daily/weekly/monthly + reconciliation voor Adyen afstemming |
| Fraud detection | ENTERPRISE | 6 regel-gebaseerde alert types met severity levels |
| CSV export | ENTERPRISE | UTF-8 BOM voor Excel, 3 export types |
| Frontend | ENTERPRISE | 4-tab layout, Recharts visualisatie, MUI |
| i18n | ENTERPRISE | 4 talen, ~50 keys |
| RBAC | ENTERPRISE | Correcte scoping — commerce alleen voor admin + owner |
| Multi-destination | ENTERPRISE | destination_id op alle queries (conform bestaand patroon) |

### 1.4 Geidentificeerde Issues — VERPLICHT OP TE LOSSEN BIJ BLOK F

#### ISSUE 1 (P1 — KRITIEK): MS Footer Detailregel VOLLEDIG Verouderd

**Probleem**: Master Strategie footer r1605:
```
Fase III IN PROGRESS: Blok G+A+B+C+D ✅ (Legal + Payment + Ticketing + Reservering + Chatbot-to-Book). Admin Portal: 89 endpoints, adminPortal.js v3.16.0. 46 scheduled jobs. CLAUDE.md v3.56.0.
```

Moet zijn:
```
Fase III IN PROGRESS: Blok G+A+B+C+D+E ✅ (Legal + Payment + Ticketing + Reservering + Chatbot-to-Book + Admin Commerce). Admin Portal: 99 endpoints, adminPortal.js v3.17.0. 46 scheduled jobs. CLAUDE.md v3.57.0.
```

**VIER waarden fout**: Blok-lijst (mist +E + beschrijving), endpoint count (89→99), adminPortal.js versie (v3.16.0→v3.17.0), CLAUDE.md versie (v3.56.0→v3.57.0).

**Patroon**: Dit is nu het VIERDE achtereenvolgende blok (B→C→D→E) waar de MS footer detailregel niet wordt bijgewerkt. De eerste footerregel (r1604, narratief) wordt WEL bijgewerkt, maar de tweede (r1605, gestructureerde data) wordt STRUCTUREEL overgeslagen.

**Root cause analyse**: De versie-sync checklist (punt 7 Enterprise Kwaliteitsstandaarden) vermeldt "MS Footer" maar niet expliciet genoeg welke TWEE regels moeten worden bijgewerkt. De implementatie update consequent r1604 (narratief) maar vergeet r1605 (data).

**Structurele fix**: Twee opties:
1. CONSOLIDEER de twee footerregels naar EEN regel die alle informatie bevat
2. OF: maak de versie-sync checklist EXPLICIET: "MS Footer regel 1 (narratief) EN regel 2 (data: blokken, endpoints, versies)"

Aanbeveling: Optie 1 — consolideer naar EEN footerregel. Twee regels met overlappende informatie is dezelfde fout als de dubbele documentatie-tabellen in CLAUDE.md (al opgelost bij Blok E).

#### ISSUE 2 (P2 — MEDIUM): MS Roadmap Tabel Mist "+E"

**Probleem**: MS Roadmap tabel r1324:
```
| III | Commerce Foundation | ... | 🟢 IN PROGRESS (Blok G+A+B+C+D COMPLEET) |
```
Mist "+E". Moet zijn: `Blok G+A+B+C+D+E COMPLEET`

**Noot**: CLAUDE.md roadmap tabel (r383) is WEL correct: "Blok G+A+B+C+D+E COMPLEET". Alleen de MS roadmap tabel is gemist.

#### ISSUE 3 (P3 — LAAG, PERSISTENT): Frontend Commerce Componenten Niet Gedocumenteerd

**Probleem**: Nu voor de DERDE keer gemeld (Blok C audit → Blok D audit → Blok E audit). De CLAUDE.md repository structuur documenteert GEEN individuele frontend commerce componenten:
- Customer portal: Ticketing/, Reservation/, Payment/ componenten
- Admin module: CommercePage/ componenten

**Actie**: Bij Blok F definitief oplossen door verifiëren + documenteren. Aangezien dit een P3 is die drie keer is overgeslagen, moet de instructie EXPLICIETER zijn — niet "verifieer en documenteer" maar een exacte tekstwijziging.

### 1.5 Eindoordeel Blok E

| Aspect | Score |
|--------|-------|
| Functioneel compleet | 9.5/10 — 18/22 requirements, 2 niet verifieerbaar (dark mode/empty state) |
| Enterprise kwaliteit | 10/10 — READ-ONLY aggregatie, fraud alerts, CSV BOM, RBAC |
| Documentatie CLAUDE.md | 9.5/10 — intern consistent, alle versies correct, structurele fixes toegepast |
| Documentatie MS | 6/10 — Roadmap tabel mist "+E", footer VIERDE keer niet bijgewerkt |
| Architectuur | 10/10 — geen nieuwe DB tabellen, clean read-only pattern |
| Blok D issue fixes | 8/10 — 2/3 structurele issues opgelost |
| **TOTAAL** | **8.8/10 — Enterprise-level, geen workarounds, MS documentatie structureel achterblijvend** |

**CONCLUSIE**: Blok E is functioneel uitstekend uitgevoerd. De READ-ONLY aggregatielaag, 6 fraud alert types, reconciliation report, en CSV export met BOM zijn productie-klaar. 10 endpoints (meer dan de geplande 8) is correct — individuele CSV routes terecht apart geteld. De twee structurele fixes uit mijn Blok D audit (dubbele tabellen, versie-sync standaard) zijn correct geïmplementeerd.

Het MS documentatieprobleem is nu STRUCTUREEL: vier achtereenvolgende blokken met dezelfde footer-issue. Bij Blok F moet dit DEFINITIEF worden opgelost door de dubbele footerregel te consolideren naar één regel, naar het voorbeeld van de succesvolle fix van de dubbele documentatie-tabellen in CLAUDE.md.

---

## DEEL 2: BLOK F UITVOERINGSCOMMANDO — TESTING & COMPLIANCE

> **Dit is het LAATSTE blok van Fase III. Na succesvolle afronding wordt Fase III als VOLLEDIG COMPLEET gemarkeerd.**
> **Dit is een direct uitvoerbaar Claude Code command. Lees CLAUDE.md + Master Strategie EERST.**

---

### STAP 0: PRE-FLIGHT CHECKS + DEFINITIEVE DOCUMENTATIE FIXES (VERPLICHT)

```
VOER UIT VOORDAT JE AAN BLOK F BEGINT:

=== 0A. REFERENTIE DOCUMENTEN LEZEN ===
1. Lees /CLAUDE.md (verwacht: v3.57.0)
2. Lees /docs/strategy/HolidaiButler_Master_Strategie.md (verwacht: v7.23)
3. Lees dit command document VOLLEDIG
4. Verifieer in codebase: adminPortal.js (verwacht: v3.17.0, 99 endpoints)
5. Lees /docs/legal/ — concept juridische templates (Blok G)

=== 0B. DEFINITIEVE FIX ISSUE 1 — MS Footer Consolidatie ===

De MS heeft twee footerregels die structureel out-of-sync raken.
Dit is EXACT hetzelfde patroon als de dubbele CLAUDE.md documentatie-tabellen
(opgelost bij Blok E). Pas dezelfde oplossing toe.

VERWIJDER de twee bestaande footerregels (r1604 + r1605) en VERVANG door
EEN geconsolideerde footerregel:

*Laatst bijgewerkt: [DATUM] — [LAATSTE FASE/BLOK]. Fase III: Blok [BLOKKEN] COMPLEET. Admin Portal: [X] endpoints, adminPortal.js v[X]. [X] scheduled jobs. CLAUDE.md v[X]. MS v[X].*

Na Blok F ziet dit er zo uit:
*Laatst bijgewerkt: [DATUM] — Fase III COMPLEET. Blok G+A+B+C+D+E+F ✅. Admin Portal: 99 endpoints, adminPortal.js v3.17.0. 46 scheduled jobs. CLAUDE.md v3.58.0. MS v7.24.*

Door EEN regel te hebben (i.p.v. twee) wordt het structureel onmogelijk
dat de regels out-of-sync raken.

=== 0C. FIX ISSUE 2 — MS Roadmap Tabel ===

MS Roadmap tabel r1324 wijzigen:
VAN: "🟢 IN PROGRESS (Blok G+A+B+C+D COMPLEET)"
NAAR: "🟢 IN PROGRESS (Blok G+A+B+C+D+E COMPLEET)"

Let op: na Blok F voltooiing zal dit OPNIEUW gewijzigd worden naar:
"✅ COMPLEET (Blok G+A+B+C+D+E+F)" — zie Stap 8.

=== 0D. DEFINITIEVE FIX ISSUE 3 — Frontend Componenten Documentatie ===

Dit issue is nu DRIE keer gemeld en DRIE keer overgeslagen.
Hieronder de EXACTE tekst die in CLAUDE.md moet komen.

WIJZIG CLAUDE.md Repository Structuur (r66-93).
VOEG TOE onder "customer-portal/frontend/":

```
customer-portal/frontend/    # React 19 + Tailwind
│   └── src/
│       ├── components/
│       │   ├── Ticketing/       # TicketList, TicketCard, TicketSelector, TicketCheckout, TicketConfirmation, TicketOrderHistory, VoucherInput, QRDisplay
│       │   ├── Reservations/    # ReservationWidget, SlotPicker, PartySizeSelector, GuestDetailsForm, ReservationConfirmation, ReservationHistory
│       │   └── Payment/         # PaymentPage, PaymentResultPage (Adyen Drop-in)
│       ├── pages/, hooks/, utils/
```

VOEG TOE onder "admin-module/":

```
admin-module/                # React 18 + MUI 5 (admin.holidaibutler.com)
│   └── src/
│       ├── pages/
│       │   ├── CommercePage/    # CommercePage (4 tabs), DashboardTab, ReportsTab, AlertsTab, ExportTab
│       │   └── ... (bestaande: POIPage, AgentsPage, UsersPage, AnalyticsPage, etc.)
│       ├── components/, api/, hooks/, stores/, i18n/, utils/
```

VERIFIEER EERST of de genoemde componenten daadwerkelijk bestaan in de codebase.
Pas de lijst aan op basis van wat werkelijk aanwezig is.

=== 0E. VERSIE-SYNC CHECKLIST — MS FOOTER FIX TOEPASSEN ===

Pas de versie-sync checklist aan in CLAUDE.md punt 7 Enterprise Kwaliteitsstandaarden.
VOEG TOE aan de checklist:
"MS Footer (GECONSOLIDEERDE regel): datum, fase status, blokken, endpoints, admin versie, jobs, CLAUDE.md versie, MS versie"

Dit vervangt de vage "MS Footer" in de huidige checklist.

=== 0F. DATABASE BACKUP ===
□ mysqldump -u pxoziy_1 -p pxoziy_db1 > /root/backups/pre-fase3-blokF-$(date +%Y%m%d-%H%M%S).sql
□ Verifieer backup: ls -la /root/backups/pre-fase3-blokF-*.sql

=== 0G. FEATURE BRANCH ===
□ git checkout -b feature/fase3-blok-f
□ git push origin feature/fase3-blok-f
```

---

### STAP 1: PCI DSS SAQ-A COMPLIANCE DOCUMENTATIE

Maak `/docs/compliance/pci-dss-saq-a.md`:

```markdown
# PCI DSS SAQ-A Compliance — HolidaiButler

## 1. Scope Assessment

HolidaiButler gebruikt Adyen Drop-in/Components voor alle betalingsverwerking.
Dit betekent dat de SAQ-A (Self-Assessment Questionnaire A) van toepassing is.

### Wat HolidaiButler WEL doet:
- Redirect klanten naar Adyen-gehoste betaalpagina componenten
- Ontvangen van Adyen webhooks (alleen transactie status, GEEN kaartgegevens)
- Opslaan van Adyen PSP Reference (transactie ID)
- Opslaan van betaalstatus (captured/failed/refunded)

### Wat HolidaiButler NIET doet:
- Ontvangen van kaartgegevens op eigen servers
- Opslaan van kaartgegevens in database
- Loggen van kaartgegevens
- Verwerken van kaartgegevens in enige vorm

### Conclusie: SAQ-A is van toepassing (geen kaartdata in scope)

## 2. SAQ-A Checklist

### 2.1 Beveiliging van de omgeving
- [ ] HTTPS op alle payment-gerelateerde pagina's (TLS 1.2+)
      VERIFICATIE: `curl -sI https://holidaibutler.com | grep -i strict`
                   `curl -sI https://texelmaps.nl | grep -i strict`
- [ ] Adyen Content Security Policy (CSP) headers correct
      VERIFICATIE: controleer Apache vhost config voor script-src die Adyen domains toestaat
- [ ] CORS configuratie: alleen eigen domeinen mogen payment pages aanroepen
      VERIFICATIE: controleer Apache CORS headers

### 2.2 Geen kaartdata in systeem
- [ ] Geen kaartgegevens in server logs
      VERIFICATIE: `grep -ri "card\|pan\|cvv\|expiry" /var/log/apache2/*.log | head -20`
      (verwacht: 0 resultaten of alleen URL parameters zonder echte data)
- [ ] Geen kaartgegevens in applicatie logs
      VERIFICATIE: `grep -ri "card\|pan\|cvv\|4111\|4212\|5100" /root/.pm2/logs/*.log | head -20`
- [ ] Geen kaartgegevens in error tracking (Bugsink)
      VERIFICATIE: handmatig controleren in Bugsink dashboard
- [ ] Geen kaartgegevens in database
      VERIFICATIE: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA='pxoziy_db1' 
                    AND COLUMN_NAME LIKE '%card%' OR COLUMN_NAME LIKE '%pan%' 
                    OR COLUMN_NAME LIKE '%cvv%';`
      (verwacht: 0 resultaten)

### 2.3 Webhook beveiliging
- [ ] Adyen webhook endpoint beveiligd met HMAC-SHA256 verificatie
      VERIFICATIE: controleer middleware in payment webhook route
- [ ] Webhook endpoint accepteert alleen POST van Adyen IP ranges
      VERIFICATIE: controleer rate limiting + IP filtering op webhook route

### 2.4 Credential management
- [ ] Adyen API key NIET in source code
      VERIFICATIE: `grep -r "AQE" /var/www/api.holidaibutler.com/platform-core/src/ | grep -v node_modules`
      (verwacht: 0 resultaten — key alleen in .env)
- [ ] Adyen API key in .env met restrictieve permissions
      VERIFICATIE: `ls -la /var/www/api.holidaibutler.com/platform-core/.env` (verwacht: 600 of 640)
- [ ] .env niet in git repository
      VERIFICATIE: `grep ".env" /var/www/api.holidaibutler.com/platform-core/.gitignore`

### 2.5 Toegangscontrole
- [ ] Admin payment endpoints alleen toegankelijk met JWT + admin rol
      VERIFICATIE: test zonder JWT → verwacht 401
- [ ] Adyen Merchant Portal: 2FA ingeschakeld
      VERIFICATIE: handmatig in Adyen portal
- [ ] API key permissies beperkt tot benodigde functies
      VERIFICATIE: handmatig in Adyen portal

### 2.6 Monitoring
- [ ] Failed payment alerts via commerceService.getAlerts()
      VERIFICATIE: controleer alert logic in commerceService.js
- [ ] Chargeback alerts (CRITICAL severity)
      VERIFICATIE: controleer chargeback detection query

## 3. Onderhoudscyclus

- [ ] Kwartaal review: deze checklist doorlopen (agenda item instellen)
- [ ] Jaarlijks: Adyen API key roteren
- [ ] Bij Adyen SDK update: CSP headers verifiëren
- [ ] Bij server migratie: alle verificaties opnieuw uitvoeren
```

---

### STAP 2: PAYMENT TEST MATRIX — UITVOERING

Maak `/docs/compliance/payment-test-results.md` EN voer de tests UIT:

```markdown
# Payment Test Matrix — HolidaiButler
## Uitgevoerd: [DATUM]
## Omgeving: TEST (Adyen test environment)

### Voorvereisten
- Adyen test merchant account actief
- Test API keys geconfigureerd in .env
- Test mode enabled (payment URLs verwijzen naar Adyen test sandbox)

## Test Scenario's

### 2.1 iDEAL Transacties (primaire betaalmethode NL)
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 1 | iDEAL succes | Selecteer iDEAL → test bank → confirm | payment_transactions.status = 'captured', webhook ontvangen | □ | |
| 2 | iDEAL geannuleerd | Selecteer iDEAL → test bank → cancel | status = 'cancelled', inventory/slot released | □ | |
| 3 | iDEAL pending | Selecteer iDEAL → test bank → pending | status = 'pending', inventory reserved | □ | |

### 2.2 Credit Card Transacties
| # | Scenario | Test Kaart | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 4 | Card succes | 4111 1111 1111 1111 | status = 'captured' | □ | |
| 5 | Card 3DS challenge | 4212 3456 7890 1237 | 3DS challenge → authenticatie → captured | □ | |
| 6 | Card decline | 4000 0000 0000 0002 | status = 'refused', error_code aanwezig | □ | |
| 7 | Card insufficient funds | 4000 0000 0000 0036 | status = 'refused', reason = 'Insufficient funds' | □ | |

### 2.3 Refund Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 8 | Full refund | Admin: refund op captured transactie | status = 'refunded', payment_refunds record aangemaakt | □ | |
| 9 | Partial refund | Admin: partial refund (50%) | status = 'partially_refunded', correct bedrag in refund record | □ | |
| 10 | Refund failed payment | Admin: refund op niet-captured | Error: kan niet refunden, 400 response | □ | |

### 2.4 Webhook Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 11 | Webhook AUTHORISATION | Adyen stuurt AUTHORISATION notification | payment_transactions record bijgewerkt | □ | |
| 12 | Webhook CANCELLATION | Adyen stuurt CANCELLATION notification | status bijgewerkt, inventory/slot released | □ | |
| 13 | Webhook REFUND | Adyen stuurt REFUND notification | payment_refunds record aangemaakt/bijgewerkt | □ | |
| 14 | Duplicate webhook | Zelfde notification 2x sturen | Idempotent verwerking, geen duplicate records | □ | |
| 15 | Invalid HMAC webhook | Notification met verkeerde HMAC | 401 Unauthorized, niet verwerkt | □ | |

### 2.5 Session/Timeout Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 16 | Session expired | Start checkout → wacht > 15 min | Session expired, inventory released, BullMQ job verified | □ | |
| 17 | Browser close | Start checkout → sluit browser | Na 15 min: session expired via BullMQ cleanup | □ | |

## Samenvatting
| Categorie | Tests | Geslaagd | Gefaald | N/A |
|-----------|-------|----------|---------|-----|
| iDEAL | 3 | | | |
| Credit Card | 4 | | | |
| Refund | 3 | | | |
| Webhook | 5 | | | |
| Session/Timeout | 2 | | | |
| **Totaal** | **17** | | | |
```

**UITVOERING**: Voer alle bovenstaande tests daadwerkelijk uit in de test omgeving. Vul de Status kolom in met PASS/FAIL. Documenteer eventuele issues in de Notities kolom. Bij FAIL: fix het probleem VOORDAT je doorgaat.

⚠️ **BELANGRIJK**: Als er geen Adyen test credentials geconfigureerd zijn, of als de test environment niet bereikbaar is, documenteer dit en markeer tests als "BLOCKED — [reden]". Test scenario's die niet uitgevoerd kunnen worden door ontbrekende configuratie moeten WEL in de documentatie staan voor toekomstig gebruik.

---

### STAP 3: TICKETING RACE CONDITION TESTS — UITVOERING

Maak `/docs/compliance/ticketing-race-condition-tests.md` EN voer tests UIT:

```markdown
# Ticketing Race Condition Tests — HolidaiButler
## Uitgevoerd: [DATUM]

### Doel: Verifieer dat Redis + MySQL dual lock mechanisme correct werkt onder concurrent access

## Test Scenario's

### 3.1 Last Ticket Scenario
| # | Scenario | Setup | Test Actie | Verwacht | Status | Notities |
|---|----------|-------|-----------|----------|--------|----------|
| 1 | Laatste ticket | 1 ticket remaining in inventory | 2 gelijktijdige reserve requests | Precies 1 success + 1 INSUFFICIENT_INVENTORY | □ | |

TEST COMMANDO:
```bash
# Terminal 1 + 2 gelijktijdig:
curl -X POST http://localhost:3000/api/v1/tickets/reserve \
  -H "Content-Type: application/json" \
  -H "X-Destination-ID: 1" \
  -d '{"inventory_id": [TEST_ID], "quantity": 1}'
```

### 3.2 Concurrent Reserve — Capacity Limit
| # | Scenario | Setup | Test | Verwacht | Status |
|---|----------|-------|------|----------|--------|
| 2 | 10 concurrent, 5 capacity | ticket_inventory.available_count = 5 | 10 parallelle reserve requests | Max 5 success, rest INSUFFICIENT | □ |

TEST COMMANDO:
```bash
# Parallel met xargs of een eenvoudig Node.js script:
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/api/v1/tickets/reserve \
    -H "Content-Type: application/json" \
    -H "X-Destination-ID: 1" \
    -d '{"inventory_id": [TEST_ID], "quantity": 1}' &
done
wait
# Tel successen: verwacht exact 5
```

### 3.3 Reserve + Expire + Release
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 3 | Reserve → timeout → release | Reserve 1 ticket, wacht 15+ min | BullMQ job: order expired, reserved_count -1, available_count +1 | □ |

VERIFICATIE:
```sql
-- Voor reserve:
SELECT available_count, reserved_count FROM ticket_inventory WHERE id = [TEST_ID];
-- Na reserve (direct):
-- available_count -1, reserved_count +1
-- Na 15+ min (BullMQ expired job):
-- available_count +1, reserved_count -1 (terug naar origineel)
```

### 3.4 Reserve + Pay + Confirm (full flow)
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 4 | Complete checkout flow | Reserve → betaal (test) → webhook → confirm | sold_count +1, QR code gegenereerd met HMAC, ticket status 'confirmed' | □ |

### 3.5 Redis Lock Failure Fallback
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 5 | Redis down | Stop Redis → probeer reserve | MySQL FOR UPDATE als fallback OF graceful error | □ |

VERIFICATIE: `redis-cli shutdown` → test → `redis-server` restart

## Samenvatting
| Test | Status |
|------|--------|
| Last ticket (dual request) | □ |
| Concurrent capacity limit | □ |
| Reserve + expire + release | □ |
| Full checkout flow | □ |
| Redis failure fallback | □ |
| **Totaal: 5 tests** | |
```

---

### STAP 4: RESERVATION DOUBLE-BOOKING TESTS — UITVOERING

Maak `/docs/compliance/reservation-double-booking-tests.md` EN voer tests UIT:

```markdown
# Reservation Double-Booking Tests — HolidaiButler
## Uitgevoerd: [DATUM]

### Doel: Verifieer dat Redis slot locking + MySQL FOR UPDATE geen double-bookings toestaat

## Test Scenario's

### 4.1 Same Slot Double-Booking
| # | Scenario | Setup | Test | Verwacht | Status |
|---|----------|-------|------|----------|--------|
| 1 | Zelfde slot, vol | reservation_slot: total_seats=2, reserved_seats=0 | 2 gelijktijdige requests met party_size=2 | 1 success + 1 SLOT_FULL | □ |

### 4.2 Overboeking Preventie
| # | Scenario | Setup | Test | Verwacht | Status |
|---|----------|-------|------|----------|--------|
| 2 | Party > remaining | total_seats=4, reserved_seats=2 | Request met party_size=3 | INSUFFICIENT_CAPACITY (3 > 2 remaining) | □ |

### 4.3 Blacklisted Guest
| # | Scenario | Setup | Test | Verwacht | Status |
|---|----------|-------|------|----------|--------|
| 3 | 3+ no-shows | guest_profiles.no_show_count=3, is_blacklisted=1 | Reservation aanmaken met blacklisted guest email | 403 GUEST_BLACKLISTED, reservation geweigerd | □ |

### 4.4 No-Show Tracking
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 4 | No-show registratie | Admin markeert reservation als no-show | guest_profiles.no_show_count +1, als count >= 3 → is_blacklisted = 1 | □ |

### 4.5 Cancel + Seat Release
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 5 | Cancel confirmed reservation | Customer cancelt reservation | reserved_seats -party_size, status='cancelled_by_guest' | □ |

### 4.6 Deposit Flow (indien actief)
| # | Scenario | Test | Verwacht | Status |
|---|----------|------|----------|--------|
| 6 | Deposit required | POI met deposit_required=true | Reservation flow triggert payment sessie voor deposit bedrag | □ / N/A |

⚠️ Test 6 kan N/A zijn als hasDeposits feature flag = false

## Samenvatting
| Test | Status |
|------|--------|
| Double-booking preventie | □ |
| Overboeking preventie | □ |
| Blacklisted guest | □ |
| No-show auto-blacklist | □ |
| Cancel + seat release | □ |
| Deposit flow | □ / N/A |
| **Totaal: 5-6 tests** | |
```

---

### STAP 5: GDPR COMPLIANCE AUDIT

Maak `/docs/compliance/gdpr-compliance-checklist.md`:

```markdown
# GDPR Compliance Checklist — HolidaiButler Commerce
## Audit datum: [DATUM]
## Auditor: Claude Code (automated) + Frank Spooren (review)

## 1. Data Retention

### 1.1 Payment Data (7 jaar — fiscale verplichting)
| Check | Verwacht | Status |
|-------|----------|--------|
| payment_transactions bewaartermijn | 7 jaar (fiscale verplichting NL/ES/BE) | □ |
| Auto-delete na 7 jaar | GEEN auto-delete — fiscale data moet bewaard blijven | □ |
| Anonimisering na 7 jaar | Optioneel: customer_email → hashed | □ |

VERIFICATIE: Controleer of er GEEN BullMQ job is die payment_transactions verwijdert

### 1.2 Guest Profiles (24 maanden — GDPR minimalisatie)
| Check | Verwacht | Status |
|-------|----------|--------|
| data_retention_until kolom | Aanwezig in guest_profiles | □ |
| Automatische cleanup | BullMQ weekly job (gdpr-guest-cleanup) | □ |
| Bewaartermijn | 24 maanden na laatste activiteit | □ |

VERIFICATIE:
```sql
SELECT COUNT(*) FROM guest_profiles WHERE data_retention_until < NOW();
-- Als > 0: cleanup job heeft achterstand OF draait niet correct
```
```bash
# Verifieer BullMQ job:
cd /var/www/api.holidaibutler.com/platform-core
node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');
async function c() {
  const conn = new Redis();
  const q = new Queue('scheduled-tasks', { connection: conn });
  const jobs = await q.getRepeatableJobs();
  const gdpr = jobs.filter(j => j.name.includes('gdpr') || j.name.includes('guest'));
  console.log('GDPR jobs:', gdpr.map(j => j.name + ' - ' + j.pattern));
  await q.close(); await conn.quit();
}
c();
"
```

### 1.3 Booking Context (15 minuten — in-memory)
| Check | Verwacht | Status |
|-------|----------|--------|
| Geen PII in booking context | Alleen poi_id, datum, tijd, aantallen | □ |
| Auto-timeout | 15 minuten → contextService.isBookingTimeout() | □ |
| Geen persistente opslag | In-memory only (Redis session, niet DB) | □ |

### 1.4 Chatbot Sessions (24h TTL)
| Check | Verwacht | Status |
|-------|----------|--------|
| Session TTL | 24 uur | □ |
| Geen PII in sessies | Alleen poi referenties, categorieën, intents | □ |

## 2. Consent Tracking

| Check | Verwacht | Status |
|-------|----------|--------|
| consent_data_storage kolom in guest_profiles | Boolean, verplicht bij registratie | □ |
| consent_marketing kolom in guest_profiles | Boolean, opt-in (default false) | □ |
| Consent timestamp | created_at als consent moment | □ |

VERIFICATIE:
```sql
DESCRIBE guest_profiles;
-- Verwacht: consent_data_storage TINYINT, consent_marketing TINYINT
```

## 3. Right to Erasure (Art. 17)

| Check | Verwacht | Status |
|-------|----------|--------|
| Guest data export endpoint | GET /api/admin/guests/:id/export → JSON | □ |
| Guest data delete endpoint | Cascade delete op reservations + guest_profiles | □ |
| Audit trail van deletion | Gelogd in audit_trail | □ |

VERIFICATIE:
```bash
# Test export endpoint:
curl -s http://localhost:3000/api/admin/guests/[TEST_ID]/export \
  -H "Authorization: Bearer [ADMIN_JWT]" | jq .

# Verwacht: JSON met alle guest data (naam, email, reserveringen)
```

## 4. Data Minimalisatie

| Check | Verwacht | Status |
|-------|----------|--------|
| Chatbot verzamelt geen PII | Architectuurbesluit Blok D: doorverwijzing naar forms | □ |
| Server logs bevatten geen PII | Geen email/naam/kaartdata in PM2 logs | □ |
| CSV exports: alleen admin toegang | RBAC: platform_admin + poi_owner | □ |

VERIFICATIE:
```bash
# Check PM2 logs voor PII:
grep -ri "@\|email\|naam\|name" /root/.pm2/logs/*.log | grep -v "node_modules\|config\|template" | head -20
# Beoordeel: zijn er echte klantgegevens in logs?
```

## 5. Cross-Border Data

| Check | Verwacht | Status |
|-------|----------|--------|
| Server locatie: EU (Duitsland) | Hetzner 91.98.71.87 | □ |
| Vector DB: ChromaDB Cloud | Locatie verifiëren | □ |
| LLM: Mistral AI (Frankrijk) | EU-gehost | □ |
| Email: MailerLite (Litouwen) | EU-gehost | □ |
| Monitoring: Bugsink (Nederland) | EU-gehost | □ |
| Alerts: Threema (Zwitserland) | EU-adequaat (CH adequacy decision) | □ |

CONCLUSIE: Alle data processing binnen EU/EEA + adequaat land (CH).

## 6. Verwerkersovereenkomsten

| Partner/Service | Verwerkersovereenkomst | Status |
|----------------|----------------------|--------|
| Adyen (payments) | Via Adyen Terms of Service (standaard) | □ |
| Hetzner (hosting) | DPA via Hetzner Data Processing Agreement | □ |
| ChromaDB Cloud | Te verifiëren | □ |
| Mistral AI (LLM) | DPA vereist — verifiëren | □ |
| MailerLite (email) | DPA via MailerLite DPA pagina | □ |
| Bugsink (monitoring) | Te verifiëren | □ |

⚠️ Items met "Te verifiëren" moeten door Frank handmatig worden nagegaan.
Concept verwerkersovereenkomst template: zie /docs/legal/concept-verwerkersovereenkomst-nl.md

## Totaal Samenvatting
| Categorie | Items | Compleet | Open |
|-----------|-------|----------|------|
| Data Retention | 4 | | |
| Consent Tracking | 3 | | |
| Right to Erasure | 3 | | |
| Data Minimalisatie | 3 | | |
| Cross-Border | 6 | | |
| Verwerkersovereenkomsten | 6 | | |
| **Totaal** | **25** | | |
```

---

### STAP 6: SECURITY AUDIT — GEAUTOMATISEERD

Maak `/docs/compliance/security-audit.md` EN voer verificaties UIT:

```markdown
# Security Audit — HolidaiButler Commerce
## Uitgevoerd: [DATUM]

## 1. Credential Audit

```bash
# API keys niet in source code:
grep -rn "ADYEN_API_KEY\|sk_\|AQE\|HMAC_KEY" \
  /var/www/api.holidaibutler.com/platform-core/src/ \
  --include="*.js" | grep -v node_modules | grep -v ".env"
# Verwacht: 0 resultaten (keys alleen in .env referenties als process.env.X)

# .env permissions:
ls -la /var/www/api.holidaibutler.com/platform-core/.env
# Verwacht: -rw------- of -rw-r----- (niet world-readable)

# .env niet in git:
cd /var/www/api.holidaibutler.com/platform-core
git log --all --diff-filter=A -- .env
# Verwacht: geen resultaten (nooit gecommit)
```

## 2. SQL Injection Preventie

```bash
# Zoek naar string concatenation in SQL queries:
grep -rn "query\|execute" /var/www/api.holidaibutler.com/platform-core/src/services/ \
  --include="*.js" | grep -v "node_modules" | grep "+" | grep -v "//" | head -20
# Beoordeel: zijn er queries met string concatenation i.p.v. parameterized queries?

# Zoek specifiek in commerce services:
grep -n "SELECT\|INSERT\|UPDATE\|DELETE" \
  /var/www/api.holidaibutler.com/platform-core/src/services/commerce/commerceService.js \
  | grep -v "?" 
# Verwacht: ALLE queries gebruiken ? placeholders
```

## 3. PII in Logs

```bash
# Check voor email adressen in PM2 logs (afgelopen 7 dagen):
find /root/.pm2/logs/ -name "*.log" -mtime -7 -exec grep -l "@.*\." {} \;
# Beoordeel per bestand: zijn het klant-emails of systeem-emails?

# Check voor kaartdata patronen:
grep -rn "4111\|4000\|5100\|card_number\|cvv\|expiry_date" /root/.pm2/logs/*.log
# Verwacht: 0 resultaten (ook geen test card numbers in productie logs)
```

## 4. Rate Limiting Verificatie

```bash
# Payment endpoints rate limiting:
# Test: 15 snelle requests naar payment endpoint
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/v1/tickets/reserve \
    -H "Content-Type: application/json" \
    -H "X-Destination-ID: 1" \
    -d '{}' &
done
wait
# Verwacht: eerste X succesvol (of 400 voor invalid input), daarna 429 Too Many Requests
```

## 5. HTTPS Verificatie

```bash
# Alle domeinen op HTTPS:
for domain in holidaibutler.com texelmaps.nl admin.holidaibutler.com; do
  echo "=== $domain ==="
  curl -sI "https://$domain" | grep -E "HTTP|Strict|X-Frame|X-Content-Type|Referrer"
done
# Verwacht per domein:
# HTTP/2 200 (of 301/302)
# Strict-Transport-Security (HSTS)
# X-Frame-Options: DENY of SAMEORIGIN
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

## 6. npm Vulnerabilities

```bash
cd /var/www/api.holidaibutler.com/platform-core
npm audit --production
# Verwacht: 0 vulnerabilities (of alleen low/info)
# Als critical/high: documenteer en plan fix
```

## Samenvatting
| Categorie | Check | Status |
|-----------|-------|--------|
| Credentials niet in source | grep audit | □ |
| .env permissions correct | ls -la | □ |
| .env niet in git | git log | □ |
| SQL parameterized queries | grep audit | □ |
| Geen PII in logs | log audit | □ |
| Rate limiting actief | burst test | □ |
| HTTPS + security headers | curl check | □ |
| npm 0 vulnerabilities | npm audit | □ |
| **Totaal: 8 checks** | | |
```

---

### STAP 7: TESTRESULTATEN CONSOLIDATIE

Maak `/docs/compliance/fase3-test-summary.md`:

```markdown
# Fase III Commerce Foundation — Test & Compliance Samenvatting
## Datum: [DATUM]
## Status: [PASS/FAIL/PARTIAL]

## Module Overzicht

| Module | Blok | Tests | Pass | Fail | Blocked | Score |
|--------|------|-------|------|------|---------|-------|
| Payment Engine | A | 17 | | | | |
| Ticketing | B | 5 | | | | |
| Reservation | C | 5-6 | | | | |
| GDPR | — | 25 | | | | |
| Security | — | 8 | | | | |
| **Totaal** | | **60-61** | | | | |

## Compliance Status

| Framework | Status | Document |
|-----------|--------|----------|
| PCI DSS SAQ-A | □ | /docs/compliance/pci-dss-saq-a.md |
| GDPR Commerce | □ | /docs/compliance/gdpr-compliance-checklist.md |
| Security Baseline | □ | /docs/compliance/security-audit.md |

## Open Issues
(Documenteer eventuele gefaalde tests of ontbrekende items)

| # | Issue | Severity | Module | Actie |
|---|-------|----------|--------|-------|
| | | | | |

## Conclusie
Fase III Commerce Foundation is [COMPLEET/NIET COMPLEET] op basis van
bovenstaande test- en compliance resultaten.

Alle critical en high issues moeten opgelost zijn voordat Fase III
als COMPLEET wordt gemarkeerd.
```

---

### STAP 8: DOCUMENTATIE UPDATES — FASE III AFSLUITING

```
=== CLAUDE.md (v3.57.0 → v3.58.0) ===

□ Fase III status: WIJZIG van "🟢 IN PROGRESS (Blok G+A+B+C+D+E COMPLEET)"
  NAAR: "✅ COMPLEET (Blok G+A+B+C+D+E+F)"
□ Implementatie Status tabel: nieuwe rij III-F met:
  "Testing & Compliance (Blok F)" | "[DATUM]" | 
  "PCI DSS SAQ-A checklist, 17 payment tests, 5 ticketing race condition tests,
   5 reservation double-booking tests, GDPR 25-item checklist, security 8-item audit.
   docs/compliance/ (6 documenten). Fase III COMPLEET."
□ Changelog: v3.58.0 entry
□ Repository structuur: voeg /docs/compliance/ toe
□ Frontend componenten fix (Stap 0D)

=== Master Strategie (v7.23 → v7.24) ===

□ Fase III detail: Testing/Compliance (Blok F) → COMPLEET
□ Roadmap tabel: WIJZIG van "🟢 IN PROGRESS (Blok G+A+B+C+D+E COMPLEET)"
  NAAR: "✅ COMPLEET (Blok G+A+B+C+D+E+F)"
  ⚠️ LET OP: momenteel staat er foutief "Blok G+A+B+C+D COMPLEET" (Issue 2)
  Dit moet in EEN keer gecorrigeerd worden naar COMPLEET met alle blokken.
□ Changelog: v7.24 entry
□ Header Status: "FASE III COMPLEET" (i.p.v. "IN PROGRESS")
□ Header Datum: [DATUM]
□ Footer (GECONSOLIDEERDE regel — Stap 0B):
  *Laatst bijgewerkt: [DATUM] — Fase III COMPLEET. Blok G+A+B+C+D+E+F ✅.
   Admin Portal: 99 endpoints, adminPortal.js v3.17.0. 46 scheduled jobs.
   CLAUDE.md v3.58.0. MS v7.24.*

=== VERSIE-SYNC CHECKLIST (verplicht — punt 7 Enterprise Standaarden) ===
□ CLAUDE.md header versie = v3.58.0
□ MS header versie = v7.24
□ MS header status = "FASE III COMPLEET"
□ MS header datum = [DATUM]
□ CLAUDE.md Gerelateerde Documentatie: MS = v7.24
□ CLAUDE.md Admin Portal: v3.17.0 + 99 endpoints (ongewijzigd)
□ CLAUDE.md BullMQ health check: 46 (ongewijzigd)
□ CLAUDE.md Scheduled Jobs: 46 (ongewijzigd)
□ MS Roadmap tabel: "✅ COMPLEET (Blok G+A+B+C+D+E+F)"
□ MS Fase III detail: Blok F = COMPLEET
□ MS Footer (GECONSOLIDEERDE ENKELE REGEL): alle waarden correct

=== Git Workflow ===
□ git add -A
□ git commit -m "Fase III Blok F: Testing & Compliance COMPLEET — PCI DSS SAQ-A,
  17 payment tests, 5 ticketing race condition tests, 5 reservation double-booking tests,
  GDPR 25-item checklist, security 8-item audit. 6 compliance documenten.
  FASE III VOLLEDIG COMPLEET (Blok G+A+B+C+D+E+F)."
□ git push origin feature/fase3-blok-f
□ Merge: feature/fase3-blok-f → dev → test → main
□ PM2 restart: pm2 restart all

=== Smoke Test Na Deployment ===
□ pm2 status → alle processes online
□ BullMQ jobs: 46 (ongewijzigd)
□ Commerce dashboard bereikbaar
□ /docs/compliance/ → 6 documenten aanwezig
□ Geen errors in PM2 logs (laatste 100 regels)
```

---

### STAP 9: SAMENVATTING & VERWACHT RESULTAAT

| Aspect | Voor Blok F | Na Blok F |
|--------|-------------|-----------|
| Compliance documenten | /docs/legal/ (Blok G) | + /docs/compliance/ (6 documenten) |
| PCI DSS | Adyen SDK geïmplementeerd | SAQ-A checklist + verificatie |
| Payment tests | E2E tests (geautomatiseerd) | + 17 handmatige test scenarios |
| Race condition tests | Unit tests | + 5 concurrent access tests |
| Double-booking tests | Unit tests | + 5-6 slot locking tests |
| GDPR audit | Implementatie (Blok C) | + 25-item compliance checklist |
| Security audit | npm audit 0 vuln (Fase 10B) | + 8-item commerce security audit |
| Admin endpoints | 99 | 99 (ongewijzigd) |
| Scheduled jobs | 46 | 46 (ongewijzigd) |
| Database tabellen | 10 commerce | 10 (ongewijzigd) |
| adminPortal.js | v3.17.0 | v3.17.0 (ongewijzigd) |
| CLAUDE.md | v3.57.0 | v3.58.0 |
| Master Strategie | v7.23 | v7.24 |
| **Fase III Status** | **IN PROGRESS** | **COMPLEET** |

**Geschatte inspanning**: 15-20 uur

**Na Blok F**: Fase III Commerce Foundation is VOLLEDIG COMPLEET:
- Blok G: Legal Documentation
- Blok A: Payment Engine / Adyen
- Blok B: Ticketing Module
- Blok C: Reservation Module
- Blok D: Chatbot-to-Book
- Blok E: Admin Commerce Dashboard
- Blok F: Testing & Compliance

**Volgende fase**: Fase IV (Intermediair & Revenue) — het commercieel hart van HolidaiButler met het intermediair-model state machine.

---

## APPENDIX A: FASE III VOLLEDIG OVERZICHT

| Blok | Module | Datum | Key Deliverables |
|------|--------|-------|-----------------|
| G | Legal Documentation | 01-03 | 6 juridische concept-templates |
| A | Payment Engine / Adyen | 01-03 | Adyen SDK v30, sessions, webhooks, 2 DB tabellen, 8 endpoints |
| B | Ticketing Module | 01-03 | 5 DB tabellen, 21 endpoints, Redis locking, QR HMAC, vouchers |
| C | Reservation Module | 01-03 | 3 DB tabellen + ALTER, 17 endpoints, slot locking, auto-blacklist, 4 BullMQ jobs |
| D | Chatbot-to-Book | 02-03 | 4 booking sub-intents (5 talen), conversational flow, 7 feature flags |
| E | Admin Commerce Dashboard | 02-03 | commerceService.js, 10 endpoints (99 totaal), CommercePage (4 tabs), CSV export |
| F | Testing & Compliance | 02-03 | PCI DSS SAQ-A, 60+ tests, GDPR checklist, security audit |

**Totaal Fase III**: 10 DB tabellen, 56 commerce endpoints, 4 BullMQ jobs, 7 feature flags, 6 compliance documenten, ~60 tests.

## APPENDIX B: NAAMCONVENTIES (herinnering)

| Destination | ID | Chatbot | Domein | Voorzetsels |
|-------------|-----|---------|--------|-------------|
| Calpe | 1 | HoliBot | holidaibutler.com | in Calpe |
| Texel | 2 | Tessa | texelmaps.nl | op Texel |
| Alicante | 3 | TBD | alicante.holidaibutler.com | in Alicante |
| WarreWijzer | 4 | Wijze Warre | warrewijzer.be | bij WarreWijzer |

---

*Dit document is het uitvoeringscommando voor Fase III Blok F — het LAATSTE blok van Fase III.*
*Na succesvolle afronding is Fase III Commerce Foundation VOLLEDIG COMPLEET.*
*Auteur: Claude (Strategic Analysis) | Datum: 02-03-2026 | Gebaseerd op: CLAUDE.md v3.57.0, MS v7.23, Fase III Command v1.0*
