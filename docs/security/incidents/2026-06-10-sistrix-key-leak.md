# Security Incident Report — SISTRIX API Key Hardcoded Fallback

| Veld | Waarde |
|---|---|
| **Incident ID** | INC-2026-06-10-002 |
| **Detectiedatum** | 2026-06-10 |
| **Detectiemoment** | Tijdens triage van gitleaks-baseline (133 historische findings) post-INC-2026-06-10-001 |
| **Detectiebron** | Triage-spawn-task — inspectie van resterende baseline findings na Categorie A/C/D allowlist-tuning |
| **Status** | Resolved + monitored |
| **Severity (CVSS v3.1 base)** | 4.3 (Medium) — vector: AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:N/A:N |
| **Affected component** | `platform-core/src/services/agents/seoMeester/sistrixClient.js` regels 5 + 12 |
| **Affected key type** | SISTRIX SEO API key (credit-based, paid tier) |
| **PII-exposure** | Geen — SISTRIX API geeft toegang tot SEO-data (visibility-index, keyword-rankings, competitor-data); geen toegang tot HolidaiButler-klantgegevens of betaalmiddelen |

---

## 1. Samenvatting

`sistrixClient.js` bevatte sinds de eerste commit (zie sectie 2) twee instances van de SISTRIX API key:

1. **JSDoc-comment regel 5**: `* API Key: D2bX5yPqbAIG9q3z8dwdbLvH9ZeQgWFq (Bonn, DE — EU-compliant)`
2. **Code-fallback regel 12**: `const SISTRIX_API_KEY = process.env.SISTRIX_API_KEY || 'D2bX5yPqbAIG9q3z8dwdbLvH9ZeQgWFq';`

Cruciaal: `process.env.SISTRIX_API_KEY` was **NIET gedefinieerd** in `platform-core/.env`, waardoor de fallback-waarde actief in productie werd gebruikt voor SISTRIX-calls. De fallback-pattern schendt het `SECURITY.md §4` Patroon-A-principe en is exact het anti-pattern dat in `SECURITY.md §4 Patroon C` als "NOOIT" wordt gemarkeerd.

In tegenstelling tot INC-2026-06-10-001 (OWM, client-bundle leak) is `sistrixClient.js` een Server-Side service-file. De key lekt NIET naar de browser-bundle, maar wel naar de git commit history van het private repo + alle GitHub-side mirrors/backups.

## 2. Tijdlijn

| Tijdstip (UTC+02) | Gebeurtenis |
|---|---|
| Commit `93db8e81` (eerste commit van `sistrixClient.js` — exacte datum op te vragen via `git log --diff-filter=A --follow platform-core/src/services/agents/seoMeester/sistrixClient.js`) | Introductie hardcoded API key + fallback-pattern |
| 2026-06-10 14:55 (tijdens baseline-triage) | Detectie tijdens inspectie van resterende 27 gitleaks-findings |
| 2026-06-10 15:00 | Frank ontvangt rapport — nieuwe key gegenereerd via sistrix.com dashboard, oude gerevokeerd |
| 2026-06-10 15:02 | Nieuwe key toegevoegd aan `platform-core/.env` als `SISTRIX_API_KEY=...` (PM2 picks up via `--update-env`) |
| 2026-06-10 15:04 | `sistrixClient.js` stripped: JSDoc-comment vervangen, regel 12 vervangen door `const SISTRIX_API_KEY = process.env.SISTRIX_API_KEY;` + fail-loud guard |
| 2026-06-10 15:05 | Live-validatie nieuwe key via SISTRIX `/credits` endpoint: HTTP 200 (key herkend; package-niveau-error is een separate sales-vraag) |
| 2026-06-10 15:06 | PM2 restart `holidaibutler-api --update-env` (pid 2647116, uptime 5s, online) |
| 2026-06-10 (deze datum) | Documentatie (dit rapport) + commit |

## 3. Root-cause analyse

### Direct
Hardcoded API key in source code + fallback-pattern dat in afwezigheid van env-var actief gebruikt werd.

### Onderliggend
1. **Geen env-var configuratie tijdens module-introductie** — `SISTRIX_API_KEY` werd nooit aan `platform-core/.env` toegevoegd, waardoor de fallback de facto productie-credential werd
2. **Fallback-pattern (`X || 'literal'`) als bekend anti-pattern** niet eerder gecodificeerd — `SECURITY.md §4 Patroon C` werd geïntroduceerd in INC-2026-06-10-001 (zelfde dag); deze leak bestond reeds langer maar werd pas via gitleaks-triage zichtbaar
3. **Geen module-load-time fail-fast** — bij ontbrekende env-var startte het proces door met fallback in plaats van expliciet te falen
4. **Geen secret-scanning op commit-tijd** (INC-2026-06-10-001 §3 onderliggend punt 1) — gitleaks pre-commit had deze ingang bij eerste commit van `sistrixClient.js` geblokkeerd

### Patroon-niveau
Beide INC-001 (OWM) en INC-002 (SISTRIX) zijn varianten van hetzelfde anti-pattern: **literal credential als fallback voor missing env-var**. Beide werden ontdekt op 2026-06-10 binnen 2 uur van elkaar. Conclusie: het anti-pattern was niet geïsoleerd — andere modules in de codebase verdienen audit.

## 4. Blast-radius assessment

| Vector | Risico-niveau | Onderbouwing |
|---|---|---|
| PII-exposure | Geen | SISTRIX-key geeft alleen toegang tot SEO-data over public domains; geen klantgegevens, geen betaalinformatie |
| Financiële impact | Klein | SISTRIX is credit-based (betaald per call). Bij externe abuse van gelekte key zou credit-pool sneller opgaan, maar weekly BullMQ-throttling beperkt aanvankelijke impact. Geen kostentriggering zonder package-upgrade. |
| Service-disruption | Geen waargenomen | Weekly BullMQ-scheduled SEO-jobs werkten ongestoord met fallback-credential |
| Reputatie / compliance | Beperkt | Private repo; key zichtbaar voor GitHub-collaborators + Anthropic-side caching. Sistrix.com is EU GDPR-compliant (Bonn DE), dus geen jurisdictie-issue |
| Repo-history exposure | Permanent | Key zichtbaar in alle git-clones vóór 2026-06-10 (commit-history rewrite afgewezen per INC-001 §7 — zelfde rationale geldt hier) |

## 5. Remediation-stappen (uitgevoerd)

1. ✅ SISTRIX-key revocatie + nieuwe key generatie via sistrix.com dashboard (Frank-actie)
2. ✅ `SISTRIX_API_KEY=<new>` toegevoegd aan `platform-core/.env` (env-var nu officieel onderdeel van configuratie)
3. ✅ `sistrixClient.js` source-code-fix:
   - Regel 5 JSDoc: `API Key: <literal>` vervangen door `Credentials: process.env.SISTRIX_API_KEY (required, no fallback)`
   - Regel 12: `process.env.SISTRIX_API_KEY || '<literal>'` vervangen door `process.env.SISTRIX_API_KEY`
   - Added: module-load-time fail-loud guard (`logger.error` als env-var missing) — fail-loud i.p.v. fail-fast omdat SISTRIX-module is conditioneel (alleen weekly cron); een crash zou de hele platform-core down brengen
4. ✅ PM2 restart `holidaibutler-api --update-env` (pid 2647116, online, uptime 5s, mem 378.2 MB)
5. ✅ Live-validatie nieuwe key via SISTRIX `/credits` HTTP-probe: status 200 (key herkend; package-niveau-respons = separate sales-aangelegenheid)
6. ✅ Backup van pre-fix versies:
   - `/root/backups/2026-06-10-baseline-triage/platform-core.env.pre-sistrix-rotation`

## 6. Compliance-evaluatie

Identiek kader aan INC-2026-06-10-001 sectie 6 (zie `2026-06-10-owm-key-leak.md`). Samenvatting:

| Artikel/Standaard | Toepasbaarheid | Status |
|---|---|---|
| GDPR Art 33 breach notification (72h) | **Niet van toepassing** — geen PII-toegang | Geen actie vereist |
| GDPR Art 25/32 design/security | Direct relevant | Remediation + tooling-versterking (zie sectie 8) |
| EU AI Act Art 10 data governance | Indirect — SEO-data informeert AI content-generation; verkeerde input → verkeerde output | Geen architecturale wijziging nodig |
| ISO/IEC 27001:2022 Annex A.8.24 | Direct | Beleid uitgebreid (sectie 8) |
| OWASP Top 10 A02 Cryptographic Failures | Direct | Tooling-detectie zou dit bij introductie van module hebben geblokkeerd |

## 7. Lessons learned + procedural improvements

1. **Audit-actie**: in vervolg-sessie systematisch grep over `process.env.X || '` patroon in alle source-files (zowel `platform-core/src/**`, `admin-module/src/**`, `hb-websites/src/**`) om te valideren dat geen andere fallback-credentials bestaan. Eerste grep-batch toonde alleen `sistrixClient.js` + `ProgramCard.tsx` (al gefixt) — maar comprehensive audit verdient bevestiging.

2. **`.gitleaks.toml` rule-verfijning**: voeg een specifieke rule toe voor `||` fallback-pattern:
   ```toml
   [[rules]]
   id = "hb-fallback-credential-pattern"
   description = "Anti-pattern: process.env.X || 'literal' (literal acts as production fallback)"
   regex = '''process\.env\.[A-Z_]+\s*\|\|\s*['"][a-zA-Z0-9_\-]{16,}['"]'''
   tags = ["antipattern", "fallback-credential"]
   ```
   Deze rule blokkeert het hele patroon — niet alleen specifieke key-formats. Future-proof tegen modules met nieuwe API-providers.

3. **Module-load-time guard**: voor alle services met credentials, fail-loud bij missing env-var (logger.error + degraded mode), of fail-fast bij critical services (throw). Patroon documenteren in `SECURITY.md §4 Patroon A`.

4. **Frank's actie-lijst toevoegen**: na incident, scan voor andere SEO/marketing/analytics integraties die mogelijk hetzelfde anti-pattern gebruiken.

## 8. Audit-trail referenties

| Bewijs | Locatie |
|---|---|
| Pre-fix backup van `sistrixClient.js` (impliciet via git history) | Commit-hash op te vragen via `git log --all --follow platform-core/src/services/agents/seoMeester/sistrixClient.js` |
| Pre-fix backup van `.env` | `/root/backups/2026-06-10-baseline-triage/platform-core.env.pre-sistrix-rotation` |
| PM2 restart audit-log | `pm2 logs holidaibutler-api --lines 200 --nostream` rond 2026-06-10 15:06 UTC+02 |
| Live SISTRIX key-validatie | curl-output: status 200, `error_code: 5000` (package-tier message, niet auth-fail) |

## 9. Sign-off

| Rol | Naam | Datum |
|---|---|---|
| Account-owner (key rotation) | Frank Spooren | 2026-06-10 |
| Remediation engineer | Claude (AI-assistant, session-based) | 2026-06-10 |
| Review + acceptance | _Frank Spooren_ | _pending_ |

---

*Document gegenereerd 2026-06-10. Volgt format gedefinieerd in INC-2026-06-10-001 §10.*
