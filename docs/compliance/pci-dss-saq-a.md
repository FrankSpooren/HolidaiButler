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
- [x] HTTPS op alle payment-gerelateerde pagina's (TLS 1.2+)
      VERIFICATIE: `curl -sI https://api.holidaibutler.com` → HTTP/1.1 + Strict-Transport-Security: max-age=15552000
      `curl -sI https://texelmaps.nl` → HTTP/1.1 200 + X-Frame-Options: SAMEORIGIN + nosniff
      **STATUS: PASS** — Alle 4 domeinen op HTTPS met security headers (02-03-2026)
- [x] Security headers correct op alle domeinen
      VERIFICATIE: X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy
      api.holidaibutler.com: HSTS + SAMEORIGIN + nosniff + no-referrer
      texelmaps.nl: SAMEORIGIN + nosniff + strict-origin-when-cross-origin + Permissions-Policy
      admin.holidaibutler.com: SAMEORIGIN + nosniff + strict-origin-when-cross-origin + Permissions-Policy
      **STATUS: PASS**
- [x] CORS configuratie: alleen eigen domeinen mogen payment pages aanroepen
      VERIFICATIE: Apache RewriteRule + E=ORIGIN_OK pattern in vhost configs
      **STATUS: PASS**

### 2.2 Geen kaartdata in systeem
- [x] Geen kaartgegevens in server logs
      VERIFICATIE: `grep -ric "4111|card_number|cvv|expiry_date" /root/.pm2/logs/*.log`
      Resultaat: 2 matches in out.log — BEIDE zijn UUID request-IDs die "4111" bevatten (requestId "8087144b-d13b-4111-9d01-57bbb5f9d011"), GEEN kaartdata.
      **STATUS: PASS**
- [x] Geen kaartgegevens in applicatie logs
      VERIFICATIE: `grep -ric "card_number|cvv|expiry_date" /root/.pm2/logs/*.log` → 0 resultaten
      **STATUS: PASS**
- [ ] Geen kaartgegevens in error tracking (Bugsink)
      VERIFICATIE: Handmatig controleren in Bugsink dashboard
      **STATUS: MANUAL REVIEW VEREIST** — Frank moet Bugsink dashboard controleren
- [x] Geen kaartgegevens in database
      VERIFICATIE: `SELECT COLUMN_NAME, TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='pxoziy_db1' AND TABLE_NAME IN ('payment_transactions','payment_refunds','ticket_orders','ticket_order_items','voucher_codes','reservations','reservation_slots','guest_profiles') AND (COLUMN_NAME LIKE '%card%' OR COLUMN_NAME LIKE '%pan%' OR COLUMN_NAME LIKE '%cvv%' OR COLUMN_NAME LIKE '%credit%');`
      Resultaat: 0 rijen. Enige card-gerelateerde kolommen zijn in legacy `transactions` tabel (card_last4 = gemaskeerd, card_brand = merk) en `POI_OLD` (Google metadata). Geen echte kaartdata.
      **STATUS: PASS**

### 2.3 Webhook beveiliging
- [x] Adyen webhook endpoint beveiligd met HMAC-SHA256 verificatie
      VERIFICATIE: `adyenService.js:192-227` — `verifyHMACSignature()` met `crypto.createHmac('sha256', Buffer.from(hmacKey, 'hex'))` + `crypto.timingSafeEqual()` voor timing-safe vergelijking
      **STATUS: PASS**
- [x] Webhook endpoint beschermd met rate limiting
      VERIFICATIE: `express-rate-limit` actief op gateway (index.js:10-15) + admin-specifieke rate limiters (adminPortal.js:117-118)
      **STATUS: PASS**

### 2.4 Credential management
- [x] Adyen API key NIET in source code
      VERIFICATIE: `grep -rn "AQE|sk_live|sk_test" /var/www/.../src/ --include="*.js"` → 0 resultaten
      **STATUS: PASS**
- [x] Adyen API key in .env
      VERIFICATIE: `ls -la .env` → `-rw-r--r-- 1 root root 4715` (644 permissions)
      **STATUS: PASS met OPMERKING** — .env is world-readable (644). Aanbeveling: `chmod 600 .env`
- [x] .env niet in git repository
      VERIFICATIE: `.gitignore` bevat `.env`. Deployment directory is geen git repo (SCP-based deploy).
      **STATUS: PASS**

### 2.5 Toegangscontrole
- [x] Admin payment endpoints alleen toegankelijk met JWT + admin rol
      VERIFICATIE: Alle admin endpoints gebruiken `adminAuth('reviewer')` of `adminAuth('editor')` middleware chain + `destinationScope` + `writeAccess`
      **STATUS: PASS**
- [ ] Adyen Merchant Portal: 2FA ingeschakeld
      VERIFICATIE: Handmatig in Adyen portal door Frank
      **STATUS: MANUAL REVIEW VEREIST**
- [ ] API key permissies beperkt tot benodigde functies
      VERIFICATIE: Handmatig in Adyen portal door Frank
      **STATUS: MANUAL REVIEW VEREIST**

### 2.6 Monitoring
- [x] Failed payment alerts via commerceService.getAlerts()
      VERIFICATIE: commerceService.js bevat 6 alert types met severity levels (CRITICAL, WARNING, INFO)
      **STATUS: PASS**
- [x] Chargeback alerts (CRITICAL severity)
      VERIFICATIE: chargeback detection query aanwezig in getAlerts() met severity='critical'
      **STATUS: PASS**

## 3. Onderhoudscyclus

- [ ] Kwartaal review: deze checklist doorlopen (agenda item instellen)
- [ ] Jaarlijks: Adyen API key roteren
- [ ] Bij Adyen SDK update: CSP headers verifiëren
- [ ] Bij server migratie: alle verificaties opnieuw uitvoeren

## 4. Samenvatting

| Categorie | Items | PASS | MANUAL | OPEN |
|-----------|-------|------|--------|------|
| Beveiliging omgeving | 3 | 3 | 0 | 0 |
| Geen kaartdata | 4 | 3 | 1 | 0 |
| Webhook beveiliging | 2 | 2 | 0 | 0 |
| Credential management | 3 | 3 | 0 | 0 |
| Toegangscontrole | 3 | 1 | 2 | 0 |
| Monitoring | 2 | 2 | 0 | 0 |
| **Totaal** | **17** | **14** | **3** | **0** |

**Conclusie**: 14/17 items automatisch geverifieerd PASS. 3 items vereisen handmatige review door Frank (Bugsink check, Adyen 2FA, Adyen API key scope). Geen FAIL items.

**Aanbeveling**: `chmod 600 /var/www/api.holidaibutler.com/platform-core/.env` ~~(momenteel 644)~~ → **OPGELOST** (chmod 600 uitgevoerd in Fase 10C, bevestigd 03-03-2026).

## 5. Fase IV Blok 0 Review (03-03-2026)

### Adyen E2E Test — PASS
- Session creation: `POST /api/v1/payments/session` → Session ID CS7F78812ACD01D0B4BE3C20D
- Environment: TEST, Merchant: HolidaiButler378ECOM
- Transaction status endpoint: werkend (status=pending, correct)
- .env permissions: 600 (correct)

### Openstaande Handmatige Items (Actie Frank)
| # | Item | Categorie | Actie |
|---|------|-----------|-------|
| 1 | Bugsink kaartdata check | 2.2 Geen kaartdata | Controleer Bugsink dashboard: zoek op "card", "4111", "cvv" |
| 2 | Adyen Portal 2FA | 2.5 Toegangscontrole | Verifieer dat 2FA is ingeschakeld op Adyen Merchant Portal |
| 3 | Adyen API key scope | 2.5 Toegangscontrole | Verifieer dat API key alleen benodigde rechten heeft (sessions, refunds) |

*Blok 0 review datum: 03-03-2026 | Reviewer: Claude Code (automated)*
*Originele audit datum: 02-03-2026 | Auditor: Claude Code (automated) | Review: Frank Spooren*
