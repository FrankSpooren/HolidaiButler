# Fase IV Intermediair & Financieel — E2E Test Scenario's
## Datum: 04-03-2026
## Methode: Code review op productie server (SSH grep/read)

---

## 1A. Intermediary State Machine (tests 1-8)

Bron: `intermediaryService.js` op Hetzner `/var/www/api.holidaibutler.com/platform-core/src/services/intermediary/`

| # | Test | Verificatie | Bewijs | Status |
|---|------|-------------|--------|--------|
| 1 | **Happy path**: voorstel→toestemming→bevestiging→delen→reminder→review | ALLOWED_TRANSITIONS map (line 42-51) definieert alle 6 forward transitions | `voorstel: ['toestemming', 'cancelled', 'expired']`, `toestemming: ['bevestiging', 'cancelled']`, etc. | VERIFIED (code) |
| 2 | **Cancel flow**: voorstel→cancelled met reden | cancelTransaction() (line 392) + cancellation_reason parameter | `if (!validateTransition(tx.status, 'cancelled'))` + `SET status = 'cancelled', cancellation_reason = :reason` | VERIFIED (code) |
| 3 | **Cancel mid-flow**: toestemming→cancelled | ALLOWED_TRANSITIONS: `toestemming: ['bevestiging', 'cancelled']` | 'cancelled' staat in allowed array voor toestemming, bevestiging | VERIFIED (code) |
| 4 | **Ongeldige transitie**: voorstel→bevestiging (skip toestemming) | validateTransition() (line 56): checks `ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)` | voorstel allowed = ['toestemming', 'cancelled', 'expired'] → 'bevestiging' NOT included → returns false | VERIFIED (code) |
| 5 | **Ongeldige transitie**: review→voorstel (backward) | ALLOWED_TRANSITIONS: `review: []` (lege array) | Geen backward transitions mogelijk vanuit terminal states | VERIFIED (code) |
| 6 | **Cancel terminal**: cancelled→voorstel | ALLOWED_TRANSITIONS: `cancelled: []` (lege array) | Terminal state, geen transitions meer mogelijk | VERIFIED (code) |
| 7 | **ACID commissie**: bedrag + payment_transactions atomisch | `mysqlSequelize.transaction()` (line 222) met explicit rollback | INSERT intermediary_transaction + UPDATE commission in single transaction, `t.rollback()` bij fout | VERIFIED (code) |
| 8 | **Commission override**: POI-level > partner-level > default | Commission lookup (line 127-138): partner_pois override → partner default → system default | Cascade query met COALESCE op partner_pois.commission_rate, partners.default_commission_rate | VERIFIED (code) |

## 1B. QR & Voucher Validatie (tests 9-12)

Bron: `intermediaryService.js` — QR functies

| # | Test | Verificatie | Bewijs | Status |
|---|------|-------------|--------|--------|
| 9 | **QR formaat**: HB-I:{uuid}:{hmac8} | generateQRData() (line 80-84) | `crypto.createHmac('sha256', INTERMEDIARY_QR_SECRET).update(transactionUuid).digest('hex').substring(0, 8)` → `HB-I:${uuid}:${hmac}` | VERIFIED (code) |
| 10 | **QR validatie → status update** | validateQR() + timingSafeEqual (line 89) | `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))` — timing-safe vergelijking tegen side-channel attacks | VERIFIED (code) |
| 11 | **QR hergebruik → REJECTED** | qr_validated flag check (line 445) | `if (tx.qr_validated) { return { success: false, message: 'Already validated at ...' } }` | VERIFIED (code) |
| 12 | **QR tampering → REJECTED** | HMAC mismatch detectie | timingSafeEqual returns false bij gewijzigde signature → error response | VERIFIED (code) |

## 1C. Financial Settlements (tests 13-16)

Bron: `financialService.js` op Hetzner

| # | Test | Verificatie | Bewijs | Status |
|---|------|-------------|--------|--------|
| 13 | **Settlement creatie**: batch + payouts per partner | createSettlementBatch() met `mysqlSequelize.transaction()` (line 167) | INSERT settlement_batch + N INSERT partner_payouts + N INSERT financial_audit_log, allemaal in 1 transactie | VERIFIED (code) |
| 14 | **Settlement state machine**: approve→process→complete | 3 aparte transition functions + validateTransition() (line 53) | State machine: `draft→calculated→approved→processing→completed` met guards op elke transitie | VERIFIED (code) |
| 15 | **BTW 21% berekening** | createCreditNote() met `mysqlSequelize.transaction()` (line 454) | `subtotal_cents = commission_cents`, `vat_cents = Math.round(subtotal * vatRate)`, `total = subtotal + vat` | VERIFIED (code) |
| 16 | **Partner data snapshot**: IBAN/company bevroren | Partner data gekopieerd bij payout creatie (line 354) | `partner_iban, partner_company_name, partner_vat_number` gekopieerd van partner tabel naar partner_payouts rij | VERIFIED (code) |

## 1D. Edge Cases & Error Handling (tests 17-20)

| # | Test | Verificatie | Bewijs | Status |
|---|------|-------------|--------|--------|
| 17 | **Invalid partner_id → error vóór insert** | Partner existence check in createTransaction() (line 111-121) | `SELECT id FROM partners WHERE id = :partnerId AND destination_id = :destId` → throws als 0 results | VERIFIED (code) |
| 18 | **Bedragen altijd INT (centen)** | grep `_cents` in intermediaryService.js + financialService.js | Alle bedragen: amount_cents, commission_cents, partner_amount_cents, subtotal_cents, vat_cents, payout_cents — allemaal INT, nooit FLOAT | VERIFIED (code) |
| 19 | **Destination scoping**: poi_owner alleen eigen data | `destinationScope` middleware op ALLE 31 intermediary+financial routes | Elke GET/POST/PUT route heeft `adminAuth() + destinationScope` → WHERE destination_id = ? injection | VERIFIED (code) |
| 20 | **CSV export**: BOM + escaping | buildCSV() (financialService.js line 92-106) | `const BOM = '\uFEFF'`, velden met `,`/`"`/`\n` → double-quote escaped (`""`) | VERIFIED (code) |

---

## Samenvatting

| Categorie | Tests | VERIFIED | FAIL | BLOCKED |
|-----------|-------|----------|------|---------|
| State Machine | 8 | 8 | 0 | 0 |
| QR & Voucher | 4 | 4 | 0 | 0 |
| Financial | 4 | 4 | 0 | 0 |
| Edge Cases | 4 | 4 | 0 | 0 |
| **Totaal** | **20** | **20** | **0** | **0** |

**20/20 tests VERIFIED via code review. 0 FAIL. 0 BLOCKED.**

### Verificatiemethode
Alle tests zijn geverifieerd via SSH code review op de productieserver (`91.98.71.87`). De backend services (intermediaryService.js: 43 parameterized queries, financialService.js: 81 parameterized queries) zijn direct op de server geïnspecteerd. Functionele E2E testing (browser-based) wordt uitgevoerd bij feature flag activatie (Week 1-3, zie fase4-feature-flag-plan.md).
