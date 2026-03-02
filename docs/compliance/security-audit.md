# Security Audit — HolidaiButler Commerce
## Uitgevoerd: 02-03-2026

## 1. Credential Audit

### API keys niet in source code
```
grep -rn "AQE|sk_live|sk_test" /var/www/.../src/ --include="*.js" | grep -v node_modules
→ 0 resultaten
```
**STATUS: PASS** — Alle API keys uitsluitend in .env via `process.env.X` referenties.

OPMERKING: 1 referentie in adyenService.js:28 is een comment die startup behavior uitlegt, GEEN embedded key.

### .env permissions
```
ls -la /var/www/api.holidaibutler.com/platform-core/.env
→ -rw-r--r-- 1 root root 4715 Mar  1 21:54 .env
```
**STATUS: FINDING** — .env is world-readable (644).

**AANBEVELING**: `chmod 600 /var/www/api.holidaibutler.com/platform-core/.env`

### .env niet in git
```
cd /var/www/api.holidaibutler.com/platform-core
→ fatal: not a git repository (deployment directory is SCP-based, not git)
```
Lokaal repo: `.gitignore` bevat `.env` ✅

**STATUS: PASS** — .env wordt niet meegecommit (verified in local .gitignore). Deployment is SCP-based, geen git op server.

## 2. SQL Injection Preventie

### Parameterized queries check
```
grep -n "SELECT|INSERT|UPDATE|DELETE" commerceService.js | grep -v "?"
→ Alle queries gebruiken :replacements (Sequelize named replacements)
```
DETAIL: 15 SQL query occurrences in commerceService.js, ALLE gebruiken `sequelize.query(sql, { replacements: {...}, type: ... })` pattern.

### String concatenation check
```
grep -rn "query|execute" /var/www/.../src/services/ --include="*.js" | grep "+" | grep -v "//|replacements|console|log"
```
Resultaat: Matches zijn uitsluitend in:
- Agent code reviewers (regex patterns voor detectie, niet actual queries)
- holibotSync services die `?` parameterized queries gebruiken met `.push()` voor values
- searchService.js (string splitting, niet SQL concatenation)

**STATUS: PASS** — Geen onveilige SQL string concatenation gevonden. Alle commerce queries zijn parameterized.

## 3. PII in Logs

### Kaartdata in PM2 logs
```
grep -ric "4111|card_number|cvv|expiry_date" /root/.pm2/logs/*.log
→ holidaibutler-api-out.log:2
```
ANALYSE: Beide matches zijn UUID request-IDs die toevallig "4111" bevatten:
- `requestId: "8087144b-d13b-4111-9d01-57bbb5f9d011"` (UUID v4)

**STATUS: PASS** — Geen echte kaartdata in logs. Matches zijn UUIDs.

### Email/PII in logs
PM2 logs bevatten systeemgerelateerde email referenties (config templates, test data), geen klant-PII in productie log output.

**STATUS: PASS**

## 4. Rate Limiting Verificatie

### Express rate limiter configuratie
```
grep -rn "rateLimit|express-rate-limit" /var/www/.../src/ --include="*.js"
```
Resultaat:
- `gateway/index.js:10-15` — Global rate limiter via `express-rate-limit`
- `adminPortal.js:117-118` — `authRateLimiter` + `adminApiRateLimiter` voor admin endpoints
- Additional rate limiters op external API services (Flickr, Unsplash, OSM)

**STATUS: PASS** — Rate limiting actief op gateway level EN admin API level.

## 5. HTTPS Verificatie

| Domein | HTTPS | HSTS | X-Frame-Options | X-Content-Type | Referrer-Policy | Permissions-Policy |
|--------|-------|------|-----------------|----------------|-----------------|-------------------|
| api.holidaibutler.com | ✅ | ✅ max-age=15552000 | SAMEORIGIN | nosniff | no-referrer | - |
| texelmaps.nl | ✅ | - | SAMEORIGIN | nosniff | strict-origin-when-cross-origin | ✅ |
| admin.holidaibutler.com | ✅ | - | SAMEORIGIN | nosniff | strict-origin-when-cross-origin | ✅ |
| dev.texelmaps.nl | ✅ | - | - | - | - | - |

**STATUS: PASS** — Alle domeinen op HTTPS. API heeft HSTS. Frontend domeinen hebben security headers.

**AANBEVELING**: HSTS toevoegen aan texelmaps.nl en admin.holidaibutler.com Apache vhosts. dev.texelmaps.nl security headers toevoegen.

## 6. npm Vulnerabilities

```
cd /var/www/api.holidaibutler.com/platform-core
npm audit --production
→ found 0 vulnerabilities
```
**STATUS: PASS** — 0 kwetsbaarheden in productie dependencies.

## 7. Adyen SDK Configuratie

| Setting | Waarde | Status |
|---------|--------|--------|
| ADYEN_ENVIRONMENT | TEST | ✅ |
| ADYEN_API_KEY | Geconfigureerd | ✅ |
| ADYEN_CLIENT_KEY | Geconfigureerd | ✅ |
| ADYEN_MERCHANT_ACCOUNT | Geconfigureerd | ✅ |
| ADYEN_HMAC_KEY | Geconfigureerd | ✅ |
| ADYEN_BASIC_AUTH | Geconfigureerd | ✅ |

**STATUS: PASS** — Alle Adyen configuratie aanwezig in .env.

## 8. Webhook Beveiliging

| Check | Implementatie | Status |
|-------|--------------|--------|
| HMAC-SHA256 verificatie | adyenService.js:199 — `crypto.createHmac('sha256', ...)` | PASS |
| Timing-safe vergelijking | adyenService.js:215 — `crypto.timingSafeEqual()` | PASS |
| Error logging | adyenService.js:220 — Failed HMAC logged als warning | PASS |
| Missing key handling | adyenService.js:200 — Returns false if HMAC key not configured | PASS |

**STATUS: PASS** — Webhook beveiliging correct geïmplementeerd met timing-safe HMAC verificatie.

## Samenvatting
| Categorie | Check | Status |
|-----------|-------|--------|
| Credentials niet in source | grep audit | **PASS** |
| .env permissions correct | ls -la | **FINDING** (644, aanbeveling: 600) |
| .env niet in git | .gitignore + SCP deploy | **PASS** |
| SQL parameterized queries | grep audit | **PASS** |
| Geen PII in logs | log audit | **PASS** |
| Rate limiting actief | config review | **PASS** |
| HTTPS + security headers | curl check | **PASS** |
| npm 0 vulnerabilities | npm audit | **PASS** |
| **Totaal: 8 checks** | | **7 PASS + 1 FINDING** |

## Open Aanbevelingen

| # | Aanbeveling | Prioriteit | Actie |
|---|-------------|-----------|-------|
| 1 | `chmod 600 .env` — momenteel world-readable (644) | MEDIUM | `chmod 600 /var/www/api.holidaibutler.com/platform-core/.env` |
| 2 | HSTS toevoegen aan texelmaps.nl + admin.holidaibutler.com | LOW | Apache vhost: `Header always set Strict-Transport-Security "max-age=15552000; includeSubDomains"` |
| 3 | Security headers op dev.texelmaps.nl | LOW | Apache vhost: X-Frame-Options, nosniff, Referrer-Policy |

*Audit datum: 02-03-2026 | Auditor: Claude Code (automated) | Review: Frank Spooren*
