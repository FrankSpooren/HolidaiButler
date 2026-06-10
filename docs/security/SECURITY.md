# HolidaiButler Security Policy

> Geldig voor: alle code-repositories binnen het HolidaiButler-platform (platform-core, hb-websites, admin-module, mobile, customer-portal, ticketing, reservations, payments).

## 1. Scope

Dit document beschrijft het secrets-management-beleid en de veiligheidsverwachtingen voor alle ontwikkelaars en CI/CD-pipelines die in deze monorepo werken. Naleving is **verplicht** — pre-commit-hooks en CI-workflows blokkeren commits/PRs die deze regels schenden.

## 2. Wat zijn secrets?

Een **secret** is elk gegeven dat ongeautoriseerd gebruik mogelijk maakt of vertrouwelijke informatie blootlegt. Concreet:

| Categorie | Voorbeelden | Voorbeeld-format |
|---|---|---|
| API-keys derde partijen | OpenWeatherMap, Mistral, DeepL, Sentry DSN, Apify, Pixtral, Anthropic, OpenAI, Meta, Stripe, Adyen | Hex-strings 32+ chars; OpenAI `sk-...`; Stripe `sk_live_...`; Sentry `https://...@sentry.io/...` |
| Database-credentials | MySQL/MariaDB password, MongoDB URI, Redis password | `mysql://user:PASSWORD@host:port/db`; `mongodb+srv://...`; |
| JWT / session-secrets | `JWT_SECRET`, `SESSION_SECRET`, signing-keys voor cookies/CSRF | High-entropy random 32+ char strings |
| OAuth tokens | Refresh tokens, access tokens, System User tokens (Meta) | EAA... voor Meta; `gh_pat_...` voor GitHub |
| Cloud credentials | Hetzner API tokens, AWS/Azure/GCP creds, SSH private keys | `hcloud_...`; `-----BEGIN RSA PRIVATE KEY-----` |
| Internal infrastructure | Tempo basic-auth, ChromaDB API key, Temporal worker tokens | Project-specific |
| Webhooks / callbacks | Slack-webhook URL, Discord-webhook URL, payment-provider webhook secrets | `https://hooks.slack.com/services/...` |
| Personal Identifiable Information (PII) | Klant-emails, names, BSN, IBAN — alleen voor test-fixtures geldt: **anonymized of synthetic only** | n.v.t. (vermeld voor compleetheid) |

## 3. Beleid: waar credentials WEL en NIET horen

### WEL toegestaan

| Locatie | Toepassing | Versie-beheerd? |
|---|---|---|
| `<project>/.env` (lokaal + production) | Runtime configuratie voor PM2/Node-processen | **NEE** — `.env` staat in `.gitignore` |
| `<project>/.env.example` | Template met dummy-values voor onboarding (zoals `OPENWEATHER_API_KEY=your_key_here`) | JA |
| PM2 ecosystem-config (`ecosystem.config.js`) | Reference naar env-vars via `process.env.X` — nooit hardcoded waarden | JA (zonder waarden) |
| Apache `SetEnv` of `Environment` directives | Vhost-niveau env-injectie | JA (zonder waarden — referenced via `${VAR}`) |
| GitHub Actions Secrets (`secrets.X`) | CI/CD pipeline-injectie | JA (alleen reference, niet de waarde) |
| Server-side `/api/*` routes met `process.env.X` | Backend-proxies die credentials gebruiken zonder ze naar client te lekken | JA |

### NIET toegestaan

| Locatie | Reden |
|---|---|
| Source-code (`.ts`, `.tsx`, `.jsx`, `.js`, `.py`, `.sql`) | Wordt naar git gecommit + (voor Client Components) naar browser-bundle gestuurd |
| Client Components (`'use client'` directive) — direct of indirect via imports | Bundles worden naar elke website-bezoeker gestuurd; secrets daar = publieke leak |
| Tests, fixtures, README, docs | Source-control bewaart history; secrets blijven retrievable |
| `console.log` / `logger.info` calls met credential-waardes | Server-side logs kunnen via Sentry, Loki, Tempo of journalctl uitlekken |
| Chat-berichten, Slack-DM, e-mail, Jira-tickets | Buiten gecontroleerde scope |
| Browser localStorage, sessionStorage, cookies (non-httpOnly) | Toegankelijk voor XSS-payload |
| Mobile app-bundles (`@hb/mobile`) | Reverse-engineering toegankelijk |

## 4. Implementatie-patronen

### Patroon A — Backend secret-gebruik (CORRECT)

```js
// platform-core/src/routes/handlers/weatherPreviewHandler.js
const apiKey = process.env.OPENWEATHER_API_KEY;
if (!apiKey) return res.status(500).json({ error: 'MISSING_API_KEY' });

const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`;
const r = await fetch(url);  // Server-side only — credential never leaves Node process
```

Configuratie:
```bash
# platform-core/.env (NOT committed)
OPENWEATHER_API_KEY=<real key>
```
```bash
# platform-core/.env.example (committed)
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

### Patroon B — Client Component fetch (CORRECT)

```tsx
// hb-websites/src/components/mobile/ProgramCard.tsx ('use client')
async function fetchWeather() {
  const slug = getDestinationSlug() || 'calpe';
  const res = await fetch(`/api/v1/weather/public?slug=${slug}`);
  // Same-origin proxy — credential blijft server-side
  if (!res.ok) return null;
  return res.json();
}
```

De proxy-route `/api/v1/weather/public` draait op platform-core (poort 3001), routed via Apache vhost `ProxyPass /api/v1 http://localhost:3001/api/v1`. Credentials worden alleen op de server gelezen.

### Patroon C — Anti-patroon (NOOIT)

```tsx
// ❌ NOOIT — secret in client bundle
async function fetchWeather() {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?appid=abc123...`);
  //                                                                            ^^^^^^^^
  //                                                            Hardcoded API-key in source — leaked to browser bundle
}
```

```js
// ❌ NOOIT — fallback credential in source
const apiKey = process.env.MISTRAL_API_KEY || 'sk-default-key-for-dev';
//                                              ^^^^^^^^^^^^^^^^^^^^^
//                                              Fallback is een leak van een werkende key
```

## 5. Tooling — geautomatiseerde handhaving

### 5.1 Pre-commit (lokaal)

`.pre-commit-config.yaml` in repo-root activeert [gitleaks](https://github.com/gitleaks/gitleaks):

```bash
# Eénmalig per ontwikkelaar (na clone):
pip install --user pre-commit
pre-commit install
# Daarna: bij elke `git commit` worden staged changes automatisch gescand
```

Bij detectie van een patroon dat overeenkomt met `.gitleaks.toml` rules wordt de commit geblokkeerd met een readable error-message.

### 5.2 CI Secret-scan (GitHub Actions)

`.github/workflows/secret-scan.yml` draait op elke push naar `dev`/`test`/`main` en elke PR. Faalt de workflow → PR-merge geblokkeerd. Bovendien aangevuld met GitHub's ingebouwde Secret Scanning (gratis op private repos sinds 2023, activatie via Settings → Code security and analysis).

### 5.3 Periodieke history-scan

Quartaal-actie (handmatig of via maandelijkse cron):
```bash
trufflehog git file://. --no-update --json | jq 'select(.Verified == true)'
```

Detecteert leaks die ontstaan zijn vóór tool-introductie of in commits die de huidige rules ontwijken.

## 6. Incident-response procedure

Bij vermoeden van een credential leak:

1. **Detect** — log de detectie-bron (F12 melding, gitleaks-alert, externe partij-melding, gebruiker-report)
2. **Contain** — roteer onmiddellijk de gecompromitteerde credential bij de issuing-partij (OWM dashboard, Mistral console, etc.). Stuur géén SMS/e-mail met de oude waarde.
3. **Eradicate** — verwijder de bron uit source-code; vervang door correct patroon (sectie 4); commit fix
4. **Recover** — verifieer dat de nieuwe credential werkt + dat de oude niet meer in de codebase voorkomt
5. **Document** — schrijf incident-rapport in `docs/security/incidents/YYYY-MM-DD-<short-id>.md` met:
   - Tijdlijn
   - Root-cause (direct + onderliggend)
   - Blast-radius assessment
   - Remediation-stappen
   - GDPR/EU AI Act/industry-norm-evaluatie
   - Lessons learned + preventieve maatregelen
6. **Notify** — bij PII-betrokkenheid: GDPR Art 33 breach-notification aan Autoriteit Persoonsgegevens binnen 72 uur

Voorbeeld-rapport: `docs/security/incidents/2026-06-10-owm-key-leak.md`

## 7. Verantwoordelijkheden

| Rol | Verantwoordelijkheid |
|---|---|
| **Ontwikkelaar** | Volgt patronen sectie 4 — nooit credentials in source; gebruikt `.env` + `process.env.X` |
| **Code-reviewer** | Vraagt expliciet om bevestiging dat geen credentials zijn toegevoegd; checkt `.env.example` updates bij nieuwe env-vars |
| **CI/CD-eigenaar** | Houdt gitleaks-versie + ruleset actueel; reviewt `.github/workflows/secret-scan.yml` quarterly |
| **Frank Spooren (account-owner)** | Roteert credentials bij incident; houdt GitHub Actions Secrets up-to-date; eindverantwoordelijk voor compliance-evaluatie per incident |

## 8. Compliance-mapping

| Standaard | Sectie / Control | Implementatie |
|---|---|---|
| GDPR Art 25 | Data protection by design | Patroon-document (sectie 4) + tooling (sectie 5) |
| GDPR Art 32 | Security of processing | Pre-commit + CI + incident-procedure |
| EU AI Act Art 10 | Data governance | Server-side secret-flow zorgt voor controlled AI-input-keten |
| ISO/IEC 27001:2022 Annex A.8.24 | Use of secrets | Sectie 3 beleidsstatement + sectie 5 tooling |
| ISO/IEC 27001:2022 Annex A.5.24-26 | Information security incident management | Sectie 6 procedure |
| OWASP Top 10 (2021) A02 | Cryptographic Failures | Patroon C anti-pattern + tooling-detectie |
| CIS Controls v8 — 3.11 | Encrypted Sensitive Data at Rest | `.env` files met restrictieve file-permissions (`chmod 600`) |
| CIS Controls v8 — 18.1 | Penetration Testing | Periodieke history-scan (sectie 5.3) |

## 9. Baseline-strategie voor legacy findings

### 10.1 Initiële baseline (2026-06-10)

Bij introductie van gitleaks (2026-06-10) zijn 133 historische findings gevonden in legacy directories. Trufflehog verified-scan: 0 verified findings — alle historische keys zijn revoked/expired.

### 10.2 Triage-resultaat (2026-06-10, dezelfde dag)

Via 4 commits over ~30 minuten verlaagd van 133 → **3 (97.7% reductie)** zonder destructieve git-history-rewrite:

| Stap | Commit | Categorie | Δ | Cumulatief |
|---|---|---|---|---|
| A | `881d2ea` | Legacy archive allowlist (`original-source/`, `Original docs/`, `fase_r*.py`, `CLAUDE_HISTORY.md`) | -90 | 43 |
| C+D | `949a7db` | Templates + workflows + test fixtures allowlist (env-templates, `.github/workflows/*.yml`, `__tests__/*.test.*`, dummy-credential regexes, GitHub Actions secret-expressions) | -16 | 27 |
| B | (zie `git log --grep "group B"`) | Docs-placeholder rule-tuning (`Bearer YOUR_TOKEN`, `your-secret-key-*`, `JWT_SECRET="your-..."`) | -24 | 3 |
| Tijdens triage ontdekt: INC-2026-06-10-002 SISTRIX-key hardcoded fallback | (zie `git log --grep "INC-2026-06-10-002"`) | Source-code fix (separate incident) | n.v.t. | 3 |

### 10.3 Permanente baseline (3 findings)

Drie findings zijn niet zonder destructieve `git filter-repo` history-rewrite verwijderbaar; remediation-rationale conform INC-001 §7 (Optie B history-rewrite afgewezen):

| File | Commit | Reden permanent |
|---|---|---|
| `platform-core/src/services/agents/seoMeester/sistrixClient.js` | `93db8e81` (oude commit) | INC-2026-06-10-002 — key is geroteerd + HEAD is gestript; old commit blijft in history |
| `kubernetes_production.txt` | `e8716a59` | File is verwijderd uit working-tree; alleen in oude commit |
| `kubernetes_production.txt` | `814f9560` | File is verwijderd uit working-tree; alleen in oude commit |

**Files SKIP per project-MEMORY** (ticketing-module on-hold, NIET aanraken — geen onderdeel van permanent baseline omdat alle eerder gevonden findings via Group A/C/D allowlist verdwenen):
- `ticketing-module/WALLET_SETUP_GUIDE.md` (4 — al door legacy-archive-allowlist gedekt via subdirectory-context)
- `TICKETING_MODULE_ENTERPRISE_AUDIT_REPORT.md` (2 — file deleted from HEAD, history-only)

### 10.4 Onderhoudsprotocol

**Bij nieuwe sanering** (toekomstige findings die via allowlist of strip kunnen worden weggewerkt):
```bash
gitleaks detect --config .gitleaks.toml --report-format json --report-path .gitleaks.baseline.json
git add .gitleaks.baseline.json
git commit -m "security: refresh gitleaks baseline after triage of <count> findings"
```

**Bij nieuwe permanente finding** (history-only, niet via working-tree fixable):
- Documenteer in deze tabel (10.3) met file + commit + reden
- Geen actie nodig — baseline draagt het auto-mee

**Periodieke audit** (eens per kwartaal):
- `trufflehog git file://. --only-verified --no-update` over volledige history — detecteert leaks die door huidige rules ontwijken
- Bij verified finding: incident-procedure (sectie 6) — roteer, strip, document

## 10. Bekende secrets-anti-patterns (geleerd uit INC-001 + INC-002 + INC-003 + INC-004)

| Patroon | Waarom anti | Voorbeeld | Detectie |
|---|---|---|---|
| `process.env.X \|\| 'literal'` fallback (**herhaald in 3 incidents**: INC-001 OWM client-bundle, INC-002 SISTRIX server-side, INC-003 SimpleAnalytics server-side ×2) | Literal acts als productie-fallback wanneer env-var ontbreekt; effectief permanent gelekt + onverwijderbaar uit history | `const KEY = process.env.API_KEY \|\| 'sk-...';` | **gitleaks rule `hb-fallback-credential-pattern` (geïmplementeerd post-INC-003)** — regex `process\.env\.[A-Z_]+\s*\|\|\s*['"][a-zA-Z0-9_\-]{16,}['"]` |
| Hardcoded API-key in Client Component (`'use client'`) | Bundle wordt naar browser gepushed — leaked naar alle bezoekers | `appid=abc123` in TSX | gitleaks rule `hb-openweathermap-api-key` etc. + SECURITY.md Patroon-C anti-pattern |
| Hardcoded credentials in JSDoc-comment | Even sneeuwbal-effect: gelijk gelekt als regel-12-literal | `* API Key: D2bX5y...` in `*.js` doc-comment | gitleaks default `generic-api-key` rule |
| Destination-specifieke hardcoded constants in multi-tenant code | Multi-tenant architectuur overtreden + impliciete fallback voor afwezige tenants | `const WEATHER_COORDS = { calpe: ..., texel: ... }` | Geen automated rule; review-checklist + `SECURITY.md §4 Patroon B` |
| Code-duplication van credential-gebruik (zelfde key in 2+ files) | DRY-schending; bij rotation moet je elke kopie vinden; vergroot kans op missed-cleanup. **Voorbeeld INC-003**: SA_API_KEY hardcoded in zowel `websiteTrafficCollector.js` als `reisleider/index.js` | `const SA_KEY = process.env.SA_KEY \|\| '...';` in 2 files | Review-checklist: shared helper-module verplicht bij multi-file credential-gebruik (bv. `platform-core/src/lib/<vendor>.js`) |
| Vendor-jurisdictie niet expliciet geverifieerd bij integratie-keuze | EU-data-USP-schending kan in non-EU/non-adequate-third-country-doorgifte | (Gefingeerd:) integratie met UK/US/non-adequate-vendor zonder Schrems-II analyse | Architectuur-besluit-checklist: vendor HQ + data-residency expliciet documenteren in incident-doc § 1 (zoals INC-003 SimpleAnalytics = Tilburg NL) |

### 10.2 Dev-placeholder fallbacks — separate review-list

Sommige fallback-strings zien er uit als "duidelijk dev-only" (bv. `dev-secret-change-in-production`, `your-super-secret-key-min-32-chars`). De `hb-fallback-credential-pattern` allowlist filtert deze om CI-noise te voorkomen, MAAR het anti-pattern blijft een potentiële incident-bron: als de echte env-var ontbreekt op een server, wordt de dev-placeholder een werkende productie-credential (precies wat in INC-001/002/003 gebeurde).

**Periodieke audit (kwartaal)**: handmatige grep over `dev-.*-(in-production|secret|fallback)` patronen + verifieer dat bijbehorende env-var in alle `.env` files is gedefinieerd:
```bash
grep -rn --include='*.js' --include='*.ts' -E "dev-[a-z-]+-(in-production|secret|fallback)" platform-core/src admin-module/src hb-websites/src
# Per match: grep '^<ENV_VAR>=' alle .env files — verifieer dat reale credential aanwezig is
```

Bekende dev-placeholder fallbacks status (post-Group-A/B triage 2026-06-10):
- ✅ `platform-core/src/services/realtimeService.js:24`: `JWT_SECRET || 'dev-secret-change-in-production'` — `JWT_SECRET` verified in `.env` (fallback inactief, anti-pattern blijft als code-smell voor toekomstige cleanup)
- ✅ `platform-core/src/services/agents/personaliseerder/index.js:35`: ~~`SESSION_SALT || 'hb-salt'`~~ — **GERESOLVEERD INC-2026-06-10-004** (commit `e10b321`): salt geroteerd, fallback gestript, fail-loud guard + graceful hash-degradation toegevoegd
- ✅ `platform-core/src/routes/adminPortal.js:5651-5652`: ~~SA_API_KEY/SA_USER_ID hardcoded fallback~~ — **GERESOLVEERD Group B triage** (commit `8a34531`): 3e overgeziene locatie van INC-003 leak; HEAD gestript, env-var-only met HTTP 503 request-time guard
- ⏳ `platform-core/src/routes/adminPortal.js:15950`: `SOCIAL_TOKEN_ENCRYPTION_KEY || JWT_SECRET || 'default-key'` — **NEW INCIDENT-KANDIDAAT INC-2026-06-10-005** — AES-256-CBC OAuth-token-encryption-key met fallback-chain naar literal `'default-key'`. Severity HIGH wegens encryption-key fallback. Niet automatisch gedetecteerd door `hb-fallback-credential-pattern` regex (`'default-key'` is 11 chars, regex eist 16+). Vereist apart Frank-akkoord wegens OAuth-token re-encryption migration impact.
- 🚫 `platform-core/src/services/reservation/reservationService.js:35`: `RESERVATION_QR_SECRET || 'dev-reservation-secret'` (SKIP — reservations-module on-hold per MEMORY.md)

Bij ontbrekende env-var: behandel als incident (analoog aan INC-001/002/003/004 procedure).

### 10.1 Vendor-verificatie best-practice

Bij elke nieuwe externe-API-integratie:
1. **URL-string-inspectie** vóór vendor-labeling (afkortingen kunnen misleiden — `SA_*` kan SimpleAnalytics OF SimilarWeb OF SearchAtlas zijn; bij Claude-assisted code-review GEEN aanname op basis van prefix)
2. **Vendor HQ + data-residency** documenteren in JSDoc op de file die credentials gebruikt
3. **Compliance-check** tegen GDPR + EU AI Act + HB's EU-data-USP — preferentie voor EU-soevereine providers
4. **Status-check**: actief account-eigenaarschap binnen HB-team bevestigen vóór code-introductie (voorkomt ghost-credentials)

## 11. Wijzigingen aan dit document

Wijzigingen vereisen review door account-owner + commit-link in `docs/security/incidents/` referentie indien wijziging incident-driven is.

---

*Versie 1.0 — 2026-06-10. Initiële versie naar aanleiding van INC-2026-06-10-001 (OWM key leak).*
