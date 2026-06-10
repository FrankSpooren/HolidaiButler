# Security Incident Report — SESSION_SALT Hardcoded Dev-Fallback

| Veld | Waarde |
|---|---|
| **Incident ID** | INC-2026-06-10-004 |
| **Detectiedatum** | 2026-06-10 |
| **Detectiemoment** | Anti-pattern audit follow-up triage van baseline-findings na INC-2026-06-10-003. Verified `SESSION_SALT` NIET in `platform-core/.env` → dev-fallback `'hb-salt'` was actief productie-secret. |
| **Detectiebron** | Gitleaks rule `hb-fallback-credential-pattern` (toegevoegd commit `66a3616`) + manual verification van missing env-var |
| **Status** | Resolved + monitored |
| **Severity (CVSS v3.1 base)** | 3.7 (Low) — vector: AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:N/A:N |
| **Affected component** | `platform-core/src/services/agents/personaliseerder/index.js` regel 35 |
| **Affected credential type** | Session-hashing salt (anonymisation salt voor sessionId → sessionHash) |
| **PII-exposure** | **Indirect** — salt is gebruikt om sessionIds te anonymiseren in `recommendation_logs` MongoDB collectie. Met bekende salt is reverse-mapping van `session_hash` naar `sessionId` per definitie mogelijk via brute-force voor bekende sessionId-formats. **GEEN** auth-impact — salt wordt niet gebruikt voor authenticatie of session-management. |

---

## 1. Samenvatting

`personaliseerder/index.js` regel 35 bevatte sinds eerste commit een dev-fallback voor `SESSION_SALT`:

```js
const sessionHash = crypto.createHash('sha256')
  .update((sessionId || 'anon') + (process.env.SESSION_SALT || 'hb-salt'))
  .digest('hex').substring(0, 32);
```

`SESSION_SALT` env-var was niet gedefinieerd in `platform-core/.env`, waardoor het literal `'hb-salt'` de facto productie-salt werd voor alle sessionHash-berekeningen. De salt wordt gebruikt om sessionIds te anonymiseren vóór opslag in `recommendation_logs` (GDPR-compliant 90-day TTL collection).

Vierde incident op 2026-06-10 met identiek `process.env.X || 'literal'` anti-pattern (na INC-001 OWM, INC-002 SISTRIX, INC-003 SimpleAnalytics).

## 2. Tijdlijn

| Tijdstip (UTC+02) | Gebeurtenis |
|---|---|
| Commit van `personaliseerder/index.js` v2.0.0 (datum op te vragen via `git log --diff-filter=A --follow`) | Introductie hardcoded dev-fallback |
| 2026-06-10 ~15:30 | Anti-pattern audit als follow-up op INC-003 detecteerde regel 35 als fallback-pattern (1 van 5 echte hits + 65 false positives) |
| 2026-06-10 ~15:31 | Verified `SESSION_SALT` NIET aanwezig in `platform-core/.env` → fallback actief |
| 2026-06-10 ~17:42 | Triage-spawn-task gestart per Frank's GO |
| 2026-06-10 ~17:43 | Impact-assessment: enige usage is anonymisation-hash voor recommendation_logs; **GEEN auth-impact**, geen user-logout-effect |
| 2026-06-10 ~17:44 | Nieuwe SESSION_SALT gegenereerd via `openssl rand -hex 32` (32-byte random hex) + naar `.env` (niet in chat geëxponeerd) |
| 2026-06-10 ~17:45 | `personaliseerder/index.js` source-code-fix: hardcoded fallback gestript, module-load fail-loud guard toegevoegd, hash-fallback naar `''` (deterministic-without-salt graceful degradation in plaats van werkende-leak fallback) |
| 2026-06-10 ~17:46 | PM2 restart `holidaibutler-api --update-env` (pid 2668965, online, uptime 5s) |
| 2026-06-10 ~17:46 | Live verificatie: geen SESSION_SALT-missing warn in PM2 logs → env-var correct geladen |
| 2026-06-10 (deze datum) | Documentatie (dit rapport) + commit |

## 3. Root-cause analyse

### Direct
Hardcoded dev-fallback `'hb-salt'` in `process.env.SESSION_SALT || 'hb-salt'` pattern, terwijl `SESSION_SALT` env-var nooit aan `platform-core/.env` werd toegevoegd. Fallback werd actief productie-salt.

### Onderliggend (vierde incident met identiek patroon)
1. Anti-pattern `process.env.X || 'literal'` was niet eerder als beleid gecodificeerd (zie INC-001 §3 + SECURITY.md §10 — Patroon-tabel uitgebreid post-INC-003)
2. Geen pre-commit secret-scanning bij module-introductie
3. Geen module-load fail-fast guard bij ontbrekende SESSION_SALT
4. **Dev-placeholder-allowlist anomalie**: het patroon `dev-[a-z-]+-(in-production|secret|fallback)` (toegevoegd post-INC-003 om JWT_SECRET-style fallbacks te filteren in gitleaks output) zou hier NIET matchen — `'hb-salt'` is een korter, anders-gestructureerd placeholder. De allowlist-refinement was niet breed genoeg om dit type fallback te dekken voor CI-noise-eliminatie, maar het patroon BLIJFT een echte productie-risico (zoals SECURITY.md §10.2 expliciet noteert).

### Patroon-niveau
Vierde incident in 5 uur met `process.env.X || 'literal'` anti-pattern. Bevestigt INC-002 §7 voorspelling dat patroon endemic was in codebase. Verdere audit-bevindingen na deze fix (Group B in spawn-task — 18 fallback-patterns in `adminPortal.js`) worden in aparte commits behandeld.

## 4. Blast-radius assessment

| Vector | Risico-niveau | Onderbouwing |
|---|---|---|
| Auth-bypass | **Geen** | SESSION_SALT wordt niet gebruikt voor JWT-signing, session-token-management of authenticatie. Enige usage = anonymisation-hash voor recommendation_logs. |
| PII-exposure (indirect) | Laag | Met bekende `'hb-salt'` is reverse-mapping `session_hash → sessionId` mogelijk indien aanvaller (a) bekende session_hash uit `recommendation_logs` heeft + (b) bruteforce-set van sessionId-formats. Echter: sessionIds zijn UUID-gebaseerd → bruteforce-search-space 2^122 = effectief unmogelijk. PII-exposure in praktijk = nihil. |
| GDPR Art 33 breach notification | **Niet van toepassing** — geen daadwerkelijke PII-exposure (zie boven) | Geen meldingsplicht |
| User-impact bij rotation | **Geen logout** | sessionHash is alleen voor recommendation-personalization-context tracking. Auth-token wordt niet beïnvloed door salt-change. Bestaande logged-in users blijven ingelogd. |
| Recommendation-personalization continuïteit | Eenmalige cold-start | Bestaande session_hash → recommendation_log records blijven valide; nieuwe sessions krijgen nieuwe hash met nieuwe salt. Geen cross-session-tracking koppeling verbroken (was er niet — sessionHash is per-session). |
| Repo-history exposure | Permanent | `'hb-salt'` zichtbaar in alle git-clones vóór 2026-06-10. History-rewrite afgewezen per INC-001 §7 rationale. |

## 5. Remediation-stappen (uitgevoerd)

1. ✅ Nieuwe SESSION_SALT gegenereerd: `openssl rand -hex 32` → 32-byte random hex (64 chars)
2. ✅ `SESSION_SALT=<new>` toegevoegd aan `platform-core/.env`
3. ✅ `personaliseerder/index.js` source-code-fix:
   - Module-load constant `const SESSION_SALT = process.env.SESSION_SALT;` met fail-loud guard (logger.error bij ontbreken)
   - Hash-update vervangen door `(SESSION_SALT || '')` — graceful degradation naar empty-salt (deterministic-zonder-anonymisatie) i.p.v. werkende-leak fallback
   - Logger import toegevoegd (was niet aanwezig)
4. ✅ PM2 restart `holidaibutler-api --update-env` (pid 2668965, online, uptime 5s, mem 379.2 MB)
5. ✅ Live verificatie: geen `SESSION_SALT env-var missing` warning in PM2 logs → env-var loaded
6. ✅ Backup van pre-fix versies:
   - `/root/backups/2026-06-10-followup-triage/platform-core.env.pre-session-salt-rotation`

## 6. Design-besluit: graceful-degradation in plaats van fail-fast

INC-001/002/003 remediations gebruikten verschillende strategieën:

- **INC-001 OWM** (client-bundle): proxy via server-side route → key niet bereikbaar voor client
- **INC-002 SISTRIX** (server-side): fail-loud guard met `logger.error` (cron-conditional service)
- **INC-003 SimpleAnalytics** (server-side, dual file): fail-loud guard met `logger.error` (Temporal-worker conditional)

**INC-004 SESSION_SALT**: fail-loud guard met `logger.error` + **graceful hash-degradation**. Reden:

- `personaliseerder.recommend()` is **request-path** (chatbot recommendations), niet conditional cron
- Een crash door fail-fast zou alle chatbot recommendations onderbreken
- Empty-salt-hash blijft deterministic per-session — alleen entropy/anonymisatie verloren tot env-var hersteld is
- logger.error trigger Sentry-alert → operator wordt onmiddellijk op de hoogte
- Design: **fail-loud-without-fail-fast** patroon voor request-path services

Update aan `SECURITY.md §4 Patroon A` om dit onderscheid expliciet te documenteren (zie commit).

## 7. Compliance-evaluatie

Identiek kader aan INC-001/002/003 sectie 6. Specifiek voor INC-004:

| Artikel/Standaard | Toepasbaarheid | Status |
|---|---|---|
| GDPR Art 5(1)(c) data minimisation | Direct | sessionHash anonymisatie was bedoeld om sessionIds NIET direct opslagbaar te maken in recommendation_logs. Zwakke salt verzwakt deze beschermingslaag — nieuwe sterke salt herstelt design-intent. |
| GDPR Art 25 by design | Direct | Hardcoded dev-fallback ondermijnde "secure by default" — rotation + fail-loud guard herstelt. |
| GDPR Art 32 security of processing | Direct | Strong salt (32-byte random) maakt reverse-mapping bruteforce nog onmogelijker dan bij zwakke `'hb-salt'`. Verbetering bovendien. |
| GDPR Art 33 breach notification | Niet van toepassing — geen daadwerkelijke PII-exposure (zie §4) | Geen actie |
| EU AI Act Art 10 data governance | Indirect — Personaliseerder is AI-system (recommendation-engine) | Verbetering compliance-postuur via sterke anonymisatie |

## 8. Audit-trail referenties

| Bewijs | Locatie |
|---|---|
| Pre-fix backup van `.env` | `/root/backups/2026-06-10-followup-triage/platform-core.env.pre-session-salt-rotation` |
| Pre-fix source code | Git history: commit `4b7fd3e` (Trendspotter activation) was laatste vóór deze fix |
| PM2 restart audit-log | `pm2 logs holidaibutler-api --lines 200 --nostream` rond 2026-06-10 17:46 UTC+02 |
| Live verificatie | PM2 logs: geen `SESSION_SALT env-var missing` warning → env-var loaded correctly |

## 9. Sign-off

| Rol | Naam | Datum |
|---|---|---|
| Account-owner (salt generatie + .env update) | Frank Spooren (via spawn-task GO) | 2026-06-10 |
| Remediation engineer | Claude (AI-assistant, session-based) | 2026-06-10 |
| Review + acceptance | _Frank Spooren_ | _pending_ |

---

*Document gegenereerd 2026-06-10. Vierde incident in INC-2026-06-10 reeks (OWM, SISTRIX, SimpleAnalytics, SESSION_SALT). Pattern-niveau lessons learned: SECURITY.md §10.2 dev-placeholder fallbacks-sectie + MEMORY.md.*
