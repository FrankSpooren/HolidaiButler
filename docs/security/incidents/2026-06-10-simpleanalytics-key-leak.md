# Security Incident Report — SimpleAnalytics API Key Hardcoded Fallback

| Veld | Waarde |
|---|---|
| **Incident ID** | INC-2026-06-10-003 |
| **Detectiedatum** | 2026-06-10 |
| **Detectiemoment** | Anti-pattern audit als vervolg op INC-2026-06-10-001 + INC-2026-06-10-002 (zelfde dag) — `grep -E 'process\.env\.[A-Z_]+\s*\|\|\s*['\''"][^'\''"]{6,}'` over `platform-core/src` |
| **Detectiebron** | INC-002 §7 punt 1 ("audit-actie aanbeveling") — systematische grep over alle fallback-credential-patronen |
| **Status** | Resolved + monitored |
| **Severity (CVSS v3.1 base)** | 5.0 (Medium) — vector: AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N |
| **Affected component** | `platform-core/src/services/agents/trendspotter/websiteTrafficCollector.js` regel 12+13 + `platform-core/src/services/agents/reisleider/index.js` regel 61 |
| **Affected key type** | SimpleAnalytics API key + User-Id (account-context) |
| **PII-exposure** | Geen — SimpleAnalytics is privacy-first by design (geen cookies, geen tracking, geen PII-verzameling); API gibt alleen geaggregeerde page-view-counts |
| **Vendor jurisdictie** | SimpleAnalytics B.V., Tilburg NL — **EU-soeverein** (GDPR-compliant by design, ePrivacy Directive compliant, EU-hosted data) |

---

## 1. Samenvatting

Twee source-files bevatten de SimpleAnalytics API key + User-Id als hardcoded fallback in het anti-pattern `process.env.X || 'literal'`:

1. `websiteTrafficCollector.js` (Trendspotter agent — wekelijkse content-trending) regels 12 + 13
2. `reisleider/index.js` (Reisleider agent — content-context per destinatie) regel 61 — duplicate van zelfde key

`SA_API_KEY` env-var was niet gedefinieerd in `platform-core/.env`, waardoor de hardcoded waarde de facto productie-credential werd voor beide agents bij activatie.

Belangrijk: het account is **wel actief** (in tegenstelling tot INC-002 SISTRIX waar het account-tier inadequaat was). Frank gebruikt SimpleAnalytics actief voor calpetrip.com traffic-monitoring. De gelekte key was daarmee een echte productie-credential, niet ghost.

Vendor-evaluatie tijdens triage bevestigt: SimpleAnalytics (Tilburg NL) past **volledig** binnen HolidaiButler's "EU data USP" — geen alternatieven nodig.

## 2. Tijdlijn

| Tijdstip (UTC+02) | Gebeurtenis |
|---|---|
| Commit van `websiteTrafficCollector.js` v2.0.0 (datum op te vragen via `git log --diff-filter=A --follow`) | Introductie hardcoded fallback in Trendspotter |
| Commit van `reisleider/index.js` SA-block | Duplicaat hardcoded fallback in Reisleider |
| 2026-06-10 ~15:30 (post-INC-002 audit) | Detectie via `grep` over `process.env.X || 'literal'` patroon |
| 2026-06-10 ~16:00 | Initiële labeling als "SimilarWeb" (foutieve aanname op basis van `SA_` prefix); Frank vroeg vendor-jurisdictie EU/UK |
| 2026-06-10 ~16:30 | URL-string-inspectie corrigeerde aanname: `simpleanalytics.com` endpoint = SimpleAnalytics, niet SimilarWeb. Tilburg NL vestiging, EU-soeverein. |
| 2026-06-10 ~17:00 | Frank bevestigt: SimpleAnalytics-account bestaat + wordt actief gebruikt voor calpetrip.com; key in source = werkelijke productie-key (gelekt) |
| 2026-06-10 ~17:04 | Nieuwe SA-key gegenereerd door Frank op SimpleAnalytics dashboard, oude gerevokeerd |
| 2026-06-10 ~17:05 | `SA_API_KEY=<new>` + `SA_USER_ID=<existing>` toegevoegd aan `platform-core/.env`; live-probe HTTP 200 + reële calpetrip.com-data |
| 2026-06-10 ~17:08 | `websiteTrafficCollector.js` v2.1.0: hardcoded fallback gestript, fail-loud guard toegevoegd; `reisleider/index.js`: hardcoded fallback gestript + null-check + domain-mapping-correctie (`holidaibutler.com` → `calpetrip.com` voor Calpe destination — bestaande consistency-bug opgelost) |
| 2026-06-10 ~17:10 | PM2 restart `holidaibutler-api --update-env` (pid 2662295, online, uptime 5s) |
| 2026-06-10 (deze datum) | Documentatie (dit rapport) + SECURITY.md §10 update + commit |

## 3. Root-cause analyse

### Direct
Hardcoded API key + User-Id in twee source-files met `process.env.X || 'literal'` fallback-pattern, terwijl `SA_API_KEY` env-var nooit aan `platform-core/.env` werd toegevoegd. Fallback was actief productie-credential.

### Onderliggend (identiek aan INC-001 + INC-002)
1. **Anti-pattern niet eerder als beleid gecodificeerd** — `SECURITY.md §4 Patroon C` werd toegevoegd op zelfde dag als INC-001 detectie
2. **Geen pre-commit secret-scanning** — gitleaks ruleset werd geïntroduceerd na deze incidenten
3. **Geen module-load fail-fast guard** — proces draaide door zonder env-var, met fallback als werkende credential
4. **Code-duplication**: zelfde SA-key in twee files (geen DRY-helper). Verhoogt blast-radius bij rotation én vergroot kans op missed-cleanup

### Patroon-niveau
Derde incident binnen 4 uur met identiek `process.env.X || 'literal'` anti-pattern (INC-001 OWM, INC-002 SISTRIX, INC-003 SimpleAnalytics). Bevestigt INC-002 §7 vermoeden dat het patroon niet geïsoleerd was. Audit-grep vond:
- 73 totaal matches van `process.env.X || ...`
- 65 = legitimate (URL fallbacks `localhost:3003`, model names `mistral-small-latest`, dev-paths)
- 5 actief credential-leaks waarvan deze 3 SA-instances (websiteTrafficCollector × 2 + reisleider × 1) + SESSION_SALT-fallback in personaliseerder + reservation-QR-secret in reservations-on-hold module

## 4. Blast-radius assessment

| Vector | Risico-niveau | Onderbouwing |
|---|---|---|
| PII-exposure | Geen | SimpleAnalytics verzamelt structureel geen PII (privacy-first design) — gelekte key geeft alleen toegang tot geaggregeerde page-view-counts van calpetrip.com + texelmaps.nl |
| Financiële impact | Klein | SimpleAnalytics free-tier of paid-tier per pageview-volume; abuse-monitoring via SA-dashboard |
| Service-disruption | Geen waargenomen | Trendspotter+Reisleider agents waren niet via Temporal worker geactiveerd (zero CostLogs, zero worker-runs gevonden); de gelekte key werd door HB-platform niet operationeel gebruikt |
| Reputatie / compliance | Beperkt | Private repo + EU-soevereine vendor (Tilburg NL) — geen Schrems-II/SCC-problematiek |
| Repo-history exposure | Permanent | Key zichtbaar in alle git-clones vóór 2026-06-10. History-rewrite afgewezen per INC-001 §7 rationale (private repo + key geroteerd + dev-team-friction) |

## 5. Remediation-stappen (uitgevoerd)

1. ✅ SimpleAnalytics-key revocatie + nieuwe key generatie via SA-dashboard (Frank-actie)
2. ✅ `SA_API_KEY=<new>` + `SA_USER_ID=<existing>` toegevoegd aan `platform-core/.env`
3. ✅ Live-validatie nieuwe key via SA `/calpetrip.com.json` HTTP-probe: status 200 + reële calpetrip.com hostname-data (`ok: true`)
4. ✅ `websiteTrafficCollector.js` source-code-fix (v2.1.0):
   - Regels 12+13: `process.env.SA_API_KEY || '<literal>'` + `process.env.SA_USER_ID || '<literal>'` vervangen door clean env-var-only assignments
   - Module-load fail-loud guard toegevoegd (`logger.error` als beide env-vars missing — niet fail-fast omdat agent in conditional weekly cron draait; crash = onnodige disruption)
   - JSDoc geüpdatet met "rotated per INC-2026-06-10-003" + SECURITY.md §4 referentie
5. ✅ `reisleider/index.js` source-code-fix:
   - Regel 61: `process.env.SA_API_KEY || '<literal>'` vervangen door clean env-var assignment + null-check in `if`-conditional
   - User-Id header toegevoegd (was eerder ontbrekend in reisleider's SA-call — bug door duplicate-code)
   - Domain-mapping `holidaibutler.com` → `calpetrip.com` voor Calpe (id=1) — bestaande consistency-bug met `websiteTrafficCollector.js` DEST_DOMAINS opgelost
6. ✅ PM2 restart `holidaibutler-api --update-env` (pid 2662295, online, uptime 5s, mem 369.8 MB)
7. ✅ Backup van pre-fix versies:
   - `/root/backups/2026-06-10-baseline-triage/platform-core.env.pre-sa-rotation`

## 6. Compliance-evaluatie

Identiek kader aan INC-001 + INC-002 sectie 6. Specifiek voor INC-003:

| Artikel/Standaard | Toepasbaarheid | Status |
|---|---|---|
| GDPR Art 33 breach notification (72h) | **Niet van toepassing** — geen PII-toegang via gelekte credential | Geen actie vereist |
| GDPR Art 25/32 design/security | Direct relevant | Patroon nu via SECURITY.md §10 anti-pattern-catalogus + gitleaks toolimg gehandhaafd |
| EU AI Act Art 10 data governance | Direct relevant — SimpleAnalytics levert input voor Trendspotter agent → content-AI | SimpleAnalytics is EU-soeverein (Tilburg NL) — past in AI-input-keten compliance |
| EU AI Act Art 50 transparency | Indirect — Trendspotter+Reisleider integratie zal AI-content beïnvloeden | Provenance-pattern (zoals weatherPreviewHandler v6) MOET toegepast worden bij activatie |
| ISO/IEC 27001:2022 Annex A.8.24 | Direct | Beleid + tooling al uitgebreid |
| OWASP Top 10 A02 | Direct | Tooling-detectie post-update zou dit blokkeren |

## 7. Lessons learned + procedural improvements

1. **Anti-pattern catalogus uitgebreid** in `SECURITY.md §10` met aanvulling van fallback-credential-detectie — recommended gitleaks rule `hb-fallback-credential-pattern` met regex `process\.env\.[A-Z_]+\s*\|\|\s*['"][a-zA-Z0-9_\-]{16,}['"]` (toegevoegd in deze commit + .gitleaks.toml refresh)

2. **Audit-bevinding**: 5 echte credential-fallbacks in audit, waarvan deze 3 nu geremedieerd. Resterend:
   - `personaliseerder/index.js` regel 35: `SESSION_SALT || 'hb-salt'` — session-hashing salt, MEDIUM severity (separate beslissing pending Frank)
   - `reservationService.js` regel 35: `RESERVATION_QR_SECRET || 'dev-reservation-secret'` — SKIP per MEMORY.md (reservations on-hold)

3. **Architectuur-verbetering**: SimpleAnalytics-call duplicaat tussen `websiteTrafficCollector.js` en `reisleider/index.js` schendt DRY-principe. Recommend: shared helper `platform-core/src/lib/simpleAnalytics.js` met single `fetchTrafficData(domain, dateRange)` function. Vervolg-actie bij Trendspotter+Reisleider activatie.

4. **Vendor-verificatie was incompleet** bij eerste detectie — ik labelde `SA_*` consistent als "SimilarWeb" zonder URL-string-inspectie. Frank corrigeerde via vendor-jurisdictie-vraag. **Lesson**: bij elke nieuwe afkorting/prefix → grep URL-strings + vendor-domain VÓÓR conclusie. Toegevoegd aan MEMORY.md anti-pattern register.

5. **EU-soevereine vendors zijn een feature**: SimpleAnalytics (Tilburg NL) past perfect in HB's EU-data USP. Bij toekomstige nieuwe integraties → expliciete vendor-jurisdictie-check als onderdeel van architectuur-besluit (toegevoegd aan SECURITY.md §3 als best-practice).

## 8. Trendspotter + Reisleider — roadmap-item

Tijdens triage werd vastgesteld dat beide agents code-paths hebben maar **niet via Temporal worker geactiveerd zijn** (0 CostLogs, 0 worker-runs). Activatie aanbevolen door Frank — separate werk-item:

- Registreer agents in `agentRegistry.js`
- Configureer cron-schedule (Temporal workflow: weekly Sunday 03:45 per JSDoc)
- Cost-log integratie (analoog aan weatherPreviewHandler — service='simpleanalytics')
- Brand-knowledge-style filter voor trending-data per destination (geen cross-tenant pollutie)
- Multi-tenant test (domain-mapping consistent over beide files)
- Provenance-signatures (EU AI Act Art 50) voor AI-content die op SA-data is gebaseerd

Spawn-task aanbevolen voor uitwerking — niet onderdeel van deze security-fix.

## 9. Audit-trail referenties

| Bewijs | Locatie |
|---|---|
| Pre-fix backup van `.env` | `/root/backups/2026-06-10-baseline-triage/platform-core.env.pre-sa-rotation` |
| Pre-fix source code | Git history: laatste commit vóór deze fix |
| PM2 restart audit-log | `pm2 logs holidaibutler-api --lines 200 --nostream` rond 2026-06-10 17:10 UTC+02 |
| Live SA key-validatie | curl-output van probe (status 200, `ok: true`, calpetrip.com hostname-data) |
| Anti-pattern audit-output | Shell-output van `grep -E 'process\.env\.[A-Z_]+\s*\|\|\s*['\''"][^'\''"]{6,}'` over `platform-core/src` |

## 10. Sign-off

| Rol | Naam | Datum |
|---|---|---|
| Account-owner (key rotation) | Frank Spooren | 2026-06-10 |
| Remediation engineer | Claude (AI-assistant, session-based) | 2026-06-10 |
| Review + acceptance | _Frank Spooren_ | _pending_ |

---

*Document gegenereerd 2026-06-10. Derde incident in INC-2026-06-10 reeks (OWM, SISTRIX, SimpleAnalytics). Patroon-niveau lessons learned: SECURITY.md §10 + MEMORY.md anti-pattern register.*
