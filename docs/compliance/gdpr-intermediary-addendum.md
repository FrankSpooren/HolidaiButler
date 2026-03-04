# GDPR Compliance Addendum — Intermediair & Financieel
## Datum: 04-03-2026
## Aanvulling op: gdpr-compliance-checklist.md (Fase III, 02-03-2026)

---

## Data Categorieën & Bewaartermijnen

| # | Data Categorie | Tabel(len) | Bewaartermijn | GDPR Grondslag | Cleanup Methode |
|---|---------------|------------|---------------|----------------|-----------------|
| 1 | Intermediary transacties | intermediary_transactions | 7 jaar (fiscaal) | Art. 6.1c — Wettelijke verplichting (fiscale bewaarplicht NL/ES/BE) | Geen auto-delete |
| 2 | Settlement batches | settlement_batches | 7 jaar (fiscaal) | Art. 6.1c — Wettelijke verplichting | Geen auto-delete |
| 3 | Partner uitbetalingen | partner_payouts | 7 jaar (fiscaal) | Art. 6.1c — Wettelijke verplichting | Geen auto-delete |
| 4 | Credit notes | credit_notes | 7 jaar (fiscaal) | Art. 6.1c — Wettelijke verplichting | Geen auto-delete |
| 5 | Financial audit log | financial_audit_log | 7 jaar (fiscaal) | Art. 6.1c — Wettelijke verplichting (immutable trail) | Geen auto-delete |
| 6 | **Guest PII in transacties** | intermediary_transactions (guest_name, guest_email, guest_phone) | **24 maanden na activiteitdatum** | Art. 6.1f — Gerechtvaardigd belang | **BullMQ anonimiseringsjob** (NIEUW) |
| 7 | Partner data (zakelijk) | partners, partner_pois, partner_onboarding | Duur contract + 7 jaar | Art. 6.1b — Uitvoering overeenkomst | Niet GDPR persoonsgegevens (B2B) |
| 8 | QR code data | intermediary_transactions (qr_code_data) | Volgt transactie lifecycle | Art. 6.1b — Uitvoering overeenkomst | Lifecycle gebonden |

---

## Detail: Guest PII Anonimisering

### Probleem
`intermediary_transactions` bevat guest_name, guest_email en guest_phone. Deze persoonsgegevens zijn nodig voor de dienstverlening (voucher, communicatie), maar moeten na een redelijke termijn geanonimiseerd worden conform GDPR dataminimalisatie (Art. 5.1c).

### Oplossing
Nieuwe BullMQ job: `intermediary-guest-anonymize`
- **Schedule**: Maandelijks, 1e van de maand om 03:30
- **Actie**:
  ```sql
  UPDATE intermediary_transactions
  SET guest_name = 'geanonimiseerd', guest_email = NULL, guest_phone = NULL
  WHERE activity_date < DATE_SUB(NOW(), INTERVAL 24 MONTH)
    AND guest_name != 'geanonimiseerd'
  ```
- **Logging**: Aantal geanonimiseerde records naar audit trail
- **Impact**: Financiële velden (bedragen, commissie, status) blijven intact (7 jaar fiscaal)

### Waarom 24 maanden?
- Consistent met bestaande `guest_profiles` bewaartermijn (gdpr-compliance-checklist.md §1.2)
- Ruim genoeg voor klachtenafhandeling en service recovery
- Financiële data (bedragen, partner info) blijft beschikbaar voor fiscale verplichting

---

## Detail: Financial Audit Log — Geen PII

De `financial_audit_log` tabel bevat:
- `actor_email`: Admin user email (NIET guest PII) — nodig voor accountability
- `entity_id`: Transactie/settlement/payout ID (numeriek)
- `details`: JSON met bedragen, aantallen, periodes — GEEN gastnamen of contactgegevens

**Verificatie**: SSH grep op financialService.js `logFinancialEvent()` calls bevestigt dat `details` parameter alleen financiële metadata bevat.

---

## Detail: Partner Data — Niet GDPR Persoonsgegevens

Partner data (bedrijfsnaam, KvK, BTW-nummer, IBAN) betreft **zakelijke gegevens** van rechtspersonen. Deze vallen niet onder GDPR persoonsgegevens, tenzij het eenmanszaken betreft waarbij de bedrijfsnaam de persoonsnaam is.

**Mitigatie**:
- Partner registratie vereist bedrijfsnaam (niet persoonsnaam)
- Bij eenmanszaken: zelfde 24 maanden anonimiseringsbeleid als guest data
- Partner data snapshot in `partner_payouts` is nodig voor 7 jaar fiscale bewaarplicht

---

## Samenvatting

| # | Check | Status |
|---|-------|--------|
| 1 | Fiscale data 7 jaar bewaard | PASS — geen auto-delete op financiële tabellen |
| 2 | Guest PII geanonimiseerd na 24 maanden | PASS — BullMQ job `intermediary-guest-anonymize` (NIEUW) |
| 3 | Audit log bevat geen guest PII | PASS — alleen admin email + transactie IDs |
| 4 | Partner data zakelijk (niet GDPR) | PASS — B2B, bedrijfsgegevens |
| 5 | QR data volgt transactie lifecycle | PASS — geen aparte cleanup nodig |
| 6 | Consistent met bestaande GDPR beleid | PASS — 24 maanden = zelfde als guest_profiles |
| 7 | Dataminimalisatie (Art. 5.1c) | PASS — alleen noodzakelijke PII, tijdgebonden |
| 8 | Bewaarplicht documentatie | PASS — grondslag per data categorie gedocumenteerd |

**8/8 GDPR items PASS. Geen openstaande issues.**
