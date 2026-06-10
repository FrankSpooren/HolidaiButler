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

## 10. Baseline-strategie voor legacy findings

Bij introductie van gitleaks (2026-06-10) zijn 133 historische findings gevonden in legacy directories (voornamelijk `original-source/04-Development/*/docs/*` testing-guides en oudere `.md` documentatie). Aanpak:

| Aspect | Behandeling |
|---|---|
| **Snapshot** | `.gitleaks.baseline.json` in repo-root bevat de 133 baseline-findings (SHA1 fingerprints + file:line refs) |
| **CI workflow** | `secret-scan.yml` gebruikt deze baseline → flagt alleen NIEUWE findings sinds snapshot |
| **Pre-commit** | Lokale scan kijkt alleen naar `git diff --staged` — historische findings raken commits niet |
| **trufflehog verified scan** | Heeft 0 verified findings opgeleverd: alle historische keys zijn ongeldig (revoked/expired). Geen kritieke actie nodig. |
| **Triage** | Aparte vervolg-actie (zie `docs/security/incidents/2026-06-10-owm-key-leak.md` §8 punt 5 + spawn-task) — categoriseer per findings-rule, vervang met dummy-placeholders in docs, of `# nosec` annotatie indien legitiem voorbeeld. |

**Toevoegen aan baseline (na bewuste triage)**: na opschoning van een vondst, regenereer baseline:
```bash
gitleaks detect --config .gitleaks.toml --report-format json --report-path .gitleaks.baseline.json
git add .gitleaks.baseline.json
git commit -m "security: refresh gitleaks baseline after triage of <count> findings"
```

## 11. Wijzigingen aan dit document

Wijzigingen vereisen review door account-owner + commit-link in `docs/security/incidents/` referentie indien wijziging incident-driven is.

---

*Versie 1.0 — 2026-06-10. Initiële versie naar aanleiding van INC-2026-06-10-001 (OWM key leak).*
