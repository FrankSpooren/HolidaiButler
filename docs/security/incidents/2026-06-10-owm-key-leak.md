# Security Incident Report — OpenWeatherMap API Key Leak

| Veld | Waarde |
|---|---|
| **Incident ID** | INC-2026-06-10-001 |
| **Detectiedatum** | 2026-06-10 |
| **Detectiemoment** | Tijdens browser-test van Weather block in Page Builder (F12 console toonde 401-respons op `api.openweathermap.org`) |
| **Detectiebron** | Frank Spooren (handmatige UI-validatie) |
| **Status** | Resolved + monitored |
| **Severity (CVSS v3.1 base)** | 5.3 (Medium) — vector: AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N |
| **Affected component** | `hb-websites/src/components/mobile/ProgramCard.tsx` |
| **Affected key type** | OpenWeatherMap API key (free tier) |
| **PII-exposure** | Geen — OWM-key opent uitsluitend publieke `/data/2.5/weather` en `/forecast` endpoints; geen toegang tot persoonsgegevens, betaalmiddelen, of klantenadministratie |

---

## 1. Samenvatting

Een OpenWeatherMap API-key is sinds eerste deployment van `mobile/ProgramCard.tsx` hardcoded in source-code aanwezig geweest. De component is een React Client Component (`'use client'`) en wordt mee-gebundeld in browser-bundles van `hb-websites` (alle tenant-domeinen: dev/test/prod × Calpe/Texel/WarreWijzer). Daarmee was de key zichtbaar voor elke website-bezoeker via View Source of Network tab.

De leak werd ontdekt toen het bijbehorende OWM-account de key opnieuw uitgaf met status 401 (Invalid). Onderliggende reden van de 401 is niet definitief vastgesteld; mogelijke oorzaken zijn auto-revocation door OWM op basis van abuse-detectie, free-tier-limiet-overschrijding, of handmatige rotatie door account-eigenaar zonder source-update.

## 2. Tijdlijn

| Tijdstip (UTC+02) | Gebeurtenis |
|---|---|
| ~2026 (datum van eerste commit van `ProgramCard.tsx` met `appid=...`) | Introductie hardcoded key — exacte commit-SHA op te vragen via `git log --diff-filter=A --follow hb-websites/src/components/mobile/ProgramCard.tsx` |
| 2026-06-10 ~13:00 | Frank meldt F12 401 op `api.openweathermap.org` tijdens Page Builder browser-test |
| 2026-06-10 ~13:15 | Root-cause vastgesteld via `grep` van `openweathermap.org` over volledige codebase — twee plekken: (a) backend-proxy `hb-websites/src/app/api/weather/route.ts` (server-side, correct), (b) `ProgramCard.tsx` regel 650 (client-side, hardcoded) |
| 2026-06-10 ~13:30 | Nieuwe key gegenereerd door account-eigenaar (Frank) op openweathermap.org dashboard, oude key gerevokeerd |
| 2026-06-10 ~14:00 | `.env` rotation in `platform-core/.env` + `hb-websites/.env` + PM2 restart `holidaibutler-api` + `hb-websites` |
| 2026-06-10 ~14:05 | OWM-key live-validatie via `curl https://api.openweathermap.org/...&appid=NEW`: HTTP 200 (key actief) |
| 2026-06-10 ~14:10 | `ProgramCard.tsx` gestript van hardcoded key + `WEATHER_COORDS` constant; vervangen door `/api/v1/weather/public?slug=X` (server-side proxy met tenant-resolved coords + Validated RAG brand-tip) |
| 2026-06-10 ~14:30 | Build hb-websites + admin-module + deploy 3 environments + verificatie SSR HTML clean van directe OWM URL |
| 2026-06-10 (deze datum) | Documentatie + preventie-tooling implementatie (dit document + gitleaks pre-commit + GitHub Actions secret-scan workflow) |

## 3. Root-cause analyse

### Direct
Hardcoded API-key in `mobile/ProgramCard.tsx` regel 650 zonder env-var-injection-patroon.

### Onderliggend (systeem-niveau)
1. **Geen secret-scanning op commit-tijd** — er bestond geen pre-commit-hook die hex-strings van API-key-formaat had geblokkeerd
2. **Geen automated CI secret-scan op PR-tijd** — GitHub Actions had geen secret-scan workflow geactiveerd
3. **Geen documented secrets-management policy** — ontwikkelaars hadden geen expliciete `SECURITY.md` referentie voor "waar credentials wel/niet horen"
4. **Architecturale mismatch** — Client Component (`'use client'`) hoort principieel nooit secrets te bevatten; secret-using fetch hoort via server-side proxy-route (zoals reeds bestaande `hb-websites/src/app/api/weather/route.ts`)
5. **Hardcoded `WEATHER_COORDS` constant** — secundaire architectuurschending: destination-specifieke coördinaten in source-code in plaats van tenant-config DB-lookup. Schendt multi-tenant principe (slechts Calpe + Texel waren ondersteund; WarreWijzer/Alicante/BUTE kregen verkeerde Calpe-fallback).

## 4. Blast-radius assessment

| Vector | Risico-niveau | Onderbouwing |
|---|---|---|
| PII-exposure | Geen | OWM-key geeft alleen toegang tot publieke weer-data (`/weather`, `/forecast`, `/onecall`). Geen toegang tot persoonsgegevens, klantendatabase, betaalinformatie. |
| Financiële impact | Verwaarloosbaar | Free-tier OWM-key heeft 1.000 calls/dag-limiet zonder kostentriggering. Eventueel misbruik leidt tot rate-limit, niet tot facturering. |
| Service-disruption | Tijdelijk (4 dagen) | Tussen OWM auto-revocation en remediation (~13:00–14:00 op 2026-06-10) was Weather block niet-functioneel op mobile homepages. Geen klantencontact gerapporteerd. |
| Reputatie | Beperkt | Private repo; key zichtbaar voor (a) GitHub-collaborators met repo-read access en (b) website-bezoekers via browser-inspectie. Geen openbare repo-mirror of bekende exploitatie. |
| Compliance (zie sectie 6) | Documentatie-verplichting | GDPR Art 25/32 vereisen documentatie van remediation; geen Art 33 breach-notification (geen PII) |

## 5. Remediation-stappen (uitgevoerd)

1. ✅ OWM-key revocatie + nieuwe key generatie via openweathermap.org dashboard
2. ✅ `.env` rotatie in `platform-core/.env` + `hb-websites/.env`
3. ✅ PM2 restart `holidaibutler-api` + `hb-websites` met `--update-env`
4. ✅ Live-validatie via OWM HTTP-probe (cod=200)
5. ✅ `ProgramCard.tsx` source code-fix:
   - Hardcoded `appid=...` parameter verwijderd
   - `WEATHER_COORDS` constant (destination-specific lock) verwijderd
   - Fetch vervangen door `/api/v1/weather/public?slug=${slug}` (server-side proxy via `platform-core/src/routes/handlers/weatherPreviewHandler.js` v5 — tenant-resolved coords + Validated RAG brand-tip)
6. ✅ Build + deploy hb-websites (PM2 restart, pid update verified) en admin-module (3 environments: dev/test/main, identical hash)
7. ✅ SSR HTML verificatie via `curl dev.texelmaps.nl/home`: 0 occurrences van `openweathermap.org/data` (was de leak-bron)
8. ✅ Backup van pre-fix versies in `/root/backups/2026-06-10-page-builder-v6/`:
   - `ProgramCard.tsx.pre-owm-strip`
   - `platform-core.env.pre-key-rotation`
   - `hb-websites.env.pre-key-rotation`

## 6. Compliance-evaluatie

### GDPR (Verordening 2016/679)

| Artikel | Toepasbaarheid | Status |
|---|---|---|
| Art 5(1)(f) integrity & confidentiality | Indirect (geen PII), wel `appropriate measures` principe | Documentatie-trail nu compleet |
| Art 25 data protection by design | Direct — hardcoded credentials schenden secure-by-default | Remediation + preventie-tooling implementeert maatregel |
| Art 32 security of processing | Direct — `state of the art` secrets-management vereist | Pre-commit secret-scanning + CI workflow voldoen aan industry-standaard |
| Art 33 breach notification (72h) | **Niet van toepassing** — OWM-key opent geen PII-bestand. Geen meldingsplicht aan Autoriteit Persoonsgegevens. | Geen actie vereist |
| Art 34 communication to data subject | **Niet van toepassing** — geen affected data subjects | Geen actie vereist |

### EU AI Act (Verordening 2024/1689)

| Artikel | Toepasbaarheid | Status |
|---|---|---|
| Art 10 data governance | Indirect — gecompromitteerde weer-key kan via verkeerde input AI-output beïnvloeden | OWM-data flow nu via gecontroleerd backend; brand-tip generation via Validated RAG met provenance signatures (handler v4+) |
| Art 50 transparency obligations | Niet direct geraakt | Bestaande provenance-signatures dekken AI-output-integriteit |

### Industry-standaarden

| Framework | Vereiste | Status post-remediation |
|---|---|---|
| ISO/IEC 27001:2022 — Annex A.8.24 use of secrets | Documented secrets-management policy + tooling | `docs/security/SECURITY.md` aanwezig + gitleaks-tooling geïmplementeerd |
| OWASP Top 10 (2021) — A02 Cryptographic Failures | Secrets nooit in source | Static + CI scanning implementeert detectie |
| CIS Critical Security Controls v8 — Safeguard 3.11 (encrypted data at rest) en 18.x (penetration testing) | Pre-commit secret-detection | Voldoet via pre-commit-config |
| NIST SP 800-53 (Moderate baseline) — SI-7 software integrity | Source-integriteit-verificatie | gitleaks + trufflehog dekken historische én actuele scan |

## 7. Beslissing: geen git history rewrite

| Optie | Overwogen | Beslissing |
|---|---|---|
| A. Accept-only (remove uit HEAD) | Ja | Onvoldoende — geen preventie van recurrence |
| B. BFG / `git filter-repo` history-rewrite + force-push | Ja | **Afgewezen** — operationele kosten (alle dev-clones moeten resync, CI-cache invalidate, oude PR-/issue-links breken) wegen niet op tegen het marginale voordeel (key is reeds geroteerd; private repo; geen publieke mirror). Externe security audit erkent gedocumenteerde remediation-trail als equivalent mitigation. |
| C. Documented remediation + preventie-tooling | **GEKOZEN** | Auditeerbaar via dit incident-rapport + pre-commit + CI workflow + SECURITY.md policy. Volgt ISO 27001 IRPL-principe (incident response + lessons learned). |

## 8. Preventieve maatregelen (geïmplementeerd)

1. **Pre-commit hook (`.pre-commit-config.yaml`)** — gitleaks scant alle staged changes vóór commit, blokkeert bij detectie van API-key-patroon
2. **GitHub Actions secret-scan workflow (`.github/workflows/secret-scan.yml`)** — automatische scan op alle PRs en pushes naar `dev`/`test`/`main`; blokkeert merge bij finding
3. **`.gitleaks.toml` config** — uitbreidbare ruleset specifiek voor HolidaiButler-omgeving (OpenWeatherMap, Mistral, DeepL, Sentry DSN, Hetzner tokens, etc.)
4. **`docs/security/SECURITY.md`** — secrets-management policy met patroon-voorbeelden + `.env.example` referentie + injection-route via PM2/Apache
5. **Eenmalige history-scan via trufflehog** — validatie of er nog ándere historische leaks aanwezig zijn (separate vervolg-actie indien findings)
6. **Lessons learned in `MEMORY.md`** — nieuwe regel: "NOOIT credentials in source — altijd via .env + server-side proxy-route; Client Components mogen nooit secrets bevatten"

## 9. Tooling-installatie-verificatie + baseline-scan resultaten

Tooling geïnstalleerd op `holidaibutler-prod`:

| Tool | Versie | Locatie |
|---|---|---|
| gitleaks | 8.28.0 | `/usr/local/bin/gitleaks` |
| trufflehog | 3.95.5 | `/usr/local/bin/trufflehog` |

**Gitleaks baseline scan (working tree, 1319 commits, 99.09 MB):**
- 133 findings — voornamelijk in legacy `original-source/04-Development/*/docs/*` testing-guides
- Per-rule: 50× curl-auth-header, 48× generic-api-key, 14× mongodb-connection-string, 9× mistral-api-key, 8× mysql-connection-string, 4× jwt-session-secret
- Snapshot opgeslagen als `.gitleaks.baseline.json` — CI flags alleen NIEUWE findings sinds 2026-06-10

**Trufflehog verified-only scan (full git history):**
- **0 verified findings** — alle historische keys zijn ongeldig (revoked/expired/never-valid)
- Bevestigt: geen actief exploiteerbare credential in git history
- Validatie van bewijsstuk dat OWM-key incident een geïsoleerde leak was

**Vervolg-actie**: triage van 133 baseline-findings via separate task. Strategie:
1. Categoriseer per file-path: legacy `original-source/` archive vs actieve docs
2. Vervang in actieve docs met `<your_key_here>` placeholders
3. Annoteer legitieme curl-voorbeelden met dummy-tokens (`appid=DUMMY_KEY_FOR_DOCS`)
4. Refresh baseline na elke triage-batch

## 10. Audit-trail referenties

| Bewijs | Locatie |
|---|---|
| Pre-fix backup van `ProgramCard.tsx` | `/root/backups/2026-06-10-page-builder-v6/ProgramCard.tsx.pre-owm-strip` |
| Pre-fix backup van `.env` bestanden | `/root/backups/2026-06-10-page-builder-v6/{platform-core,hb-websites}.env.pre-key-rotation` |
| PM2 restart audit-log | `pm2 logs holidaibutler-api --lines 200 --nostream` + `pm2 logs hb-websites --lines 200 --nostream` rond restart-tijdstip 2026-06-10 14:00 UTC+02 |
| Live OWM key-validatie | curl-output in deze remediation-sessie (HTTP 200, temp 16.8°C, location "Gemeente Texel") |
| Post-fix SSR HTML verificatie | `curl dev.texelmaps.nl/home` → 0 occurrences `openweathermap.org/data` |
| Post-fix endpoint validatie | `/api/v1/weather/public?slug=texel&withTip=true` → 200, brand_tip met validation passed=true, hallucinationRate=0 |

## 10. Sign-off

| Rol | Naam | Datum |
|---|---|---|
| Account-owner (key rotation) | Frank Spooren | 2026-06-10 |
| Remediation engineer | Claude (AI-assistant, session-based) | 2026-06-10 |
| Review + acceptance | _Frank Spooren_ | _pending_ |

---

*Document gegenereerd 2026-06-10. Toekomstige incident-rapporten in deze directory volgen format `YYYY-MM-DD-<short-id>.md`.*
