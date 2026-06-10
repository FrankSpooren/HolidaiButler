# Openstaande Taken — Sessie 2026-06-10 End-of-Day

> **Doel**: continuatie-richtlijn voor volgende sessie. Bevat (1) Frank's low-effort acties, (2) tech-acties met prioriteit, (3) incident-kandidaten met severity, (4) spawn-task commando's ready-to-paste.

## 1. Frank's persoonlijke acties (low-effort, geen Claude-sessie nodig)

| # | Actie | Effort | Wanneer | Bewijs gewenst |
|---|---|---|---|---|
| F1 | Lokale `pip install --user pre-commit && pre-commit install` op werkstation(s) | 30 sec | Bij eerstvolgende `git commit` | `pre-commit --version` output |
| F2 | GitHub Settings → Code security and analysis: Secret Scanning + Push Protection activeren op `FrankSpooren/HolidaiButler` | 1 min | Volgende GitHub-sessie | Screenshot Settings-pagina met beide ON |
| F3 | GitHub Dependabot triage: 326 vulnerabilities (3 critical, 149 high, 157 moderate, 17 low) op default branch — separate v5.x security-sessie | 1-2u | Op prioriteit | `https://github.com/FrankSpooren/HolidaiButler/security/dependabot` |
| F4 | Browser-test Texel Page Builder Weather block (live preview layout switch + validation badges + Voorbeeld-iframe) | 5 min | Bij eerstvolgende admin-sessie | Schermprint / commentaar |
| F5 | Monitoring eerste echte Trendspotter cron-run | Passief | Zondag 2026-06-14 03:45 UTC | `pm2 logs hb-temporal-worker --lines 200` rond cron-tijd OF `trending_data` rows met `week_number = 24/25` |

## 2. Tech-acties — prioriteit-ranking

### P0 — INCIDENT-CANDIDATE (HIGH severity)

**INC-2026-06-10-005 SOCIAL_TOKEN_ENCRYPTION_KEY**

| Aspect | Detail |
|---|---|
| Locatie | `platform-core/src/routes/adminPortal.js:15950` |
| Pattern | `process.env.SOCIAL_TOKEN_ENCRYPTION_KEY \|\| process.env.JWT_SECRET \|\| 'default-key'` voor AES-256-CBC OAuth-token encryption in `social_accounts` tabel |
| Severity | HIGH (encryption-key + IV-zwakheid + fallback-chain) |
| Impact | OAuth-tokens van bestaande social_accounts moeten re-encrypted worden bij key-rotation. Migration impact: één-op-één decrypt-met-oude-key + re-encrypt-met-nieuwe-key over alle social_accounts.access_token records |
| Frank-akkoord | Vereist (migration timing + scope) |

**Bijbehorende design-issues** (niet alleen rotation):
- (a) `SOCIAL_TOKEN_ENCRYPTION_KEY` shared met `JWT_SECRET` = separation-of-concerns schending
- (b) `Buffer.alloc(16, 0)` static zero-IV = encryption deterministic + zwak — vereist random-IV-per-encryption (stored alongside ciphertext)
- (c) `'default-key'` 11-char literal fallback = onder gitleaks 16+-char regex — niet automatisch gedetecteerd

### P1 — Follow-up van afgeronde activations

**T1. MongoDB cost_logs buffer-timeout in Temporal-worker context (Trendspotter follow-up)**

| Aspect | Detail |
|---|---|
| Locatie | `websiteTrafficCollector.js` logCost helper + `reisleider/index.js` inline cost-log block |
| Symptoom | `Operation \`cost_logs.insertOne()\` buffering timed out after 10000ms` in Temporal worker logs |
| Diagnose | Lazy-import van CostLog model in Temporal-activity context establisheert geen mongoose-connection. Main API process heeft mongoose connected via app-bootstrap; worker niet. |
| Impact | Trending_data writes OK (MySQL connected), maar cost-log audit-trail voor SA-calls ontbreekt. Non-blocking. |
| Resolution | Optie B (aanbevolen): shared `platform-core/src/services/costLogger.js` met connection-pooling, gebruikt door main API + worker + andere services. Consistent met DRY-principle uit INC-003 §7 punt 3. |

**T2. Brand-knowledge filter in trendAggregator (Trendspotter tweede activation cycle)**

| Aspect | Detail |
|---|---|
| Spawn-task scope | Per Frank's vorige spawn-task §6 |
| Implementatie | `buildBrandContextStructured(destId)` integratie in `websiteTrafficCollector.collect()` → filter trends waar keyword niet matched met `brandContext.entities` of `brandContext.sources` |
| Impact | Cosmetic — off-brand pageviews komen nu door als trending-keyword (low priority) |

**T3. Google Trends per-keyword timeout optimization**

| Aspect | Detail |
|---|---|
| Locatie | `googleTrendsCollector.js` Apify Actor invocations |
| Symptoom | Per-call latency soms > 30s → keywords missed; cumulative duration ~5min per destination |
| Resolution | Parallelize keyword-calls + retry-policy in collector. Niet onderdeel van activation scope. |

### P2 — Strategische dependencies

**T4. Dependabot triage** (overlapt met F3): 326 vulnerabilities op default branch. Separate security-sprint nodig — niet in scope van credential-incidents. Verdienen aparte spawn-task na F3 inzicht.

## 3. Permanente baseline-tracking

`docs/security/SECURITY.md` §9.3 documenteert 29 baseline findings als permanent (history-only, niet fixable zonder destructive `git filter-repo`):

- 18× `adminPortal.js` historical SA fallback (lines 4870-5641 in oude commits)
- 2× `kubernetes_production.txt` (file gone from HEAD)
- 2× `adminPortal.js.bak.fase1` (backup file)
- 2× `websiteTrafficCollector.js` (post-INC-003 historical)
- 2× `sistrixClient.js` (post-INC-002 historical)
- 1× `reisleider/index.js` (post-INC-003 historical)
- 2× `warredal-candidate-matcher/backend/src/config/database.js` (niet-HB project, legacy artifact)

CI workflow `gitleaks-action` gebruikt `.gitleaks.baseline.json` voor delta-mode — flagt alleen NIEUWE findings, niet de 29 permanente.

## 4. Spawn-task command voor volgende sessie

### Variant A — INC-005 SOCIAL_TOKEN_ENCRYPTION_KEY remediation (single focus)

```
Remediate INC-2026-06-10-005 — SOCIAL_TOKEN_ENCRYPTION_KEY hardcoded fallback-chain ending in 'default-key' for AES-256-CBC OAuth-token encryption in social_accounts table.

CONTEXT:
- Repo: /var/www/api.holidaibutler.com op holidaibutler-prod (Hetzner), branch dev
- Location: platform-core/src/routes/adminPortal.js:15950
- Pattern: const encryptionKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
- Cipher: createCipheriv('aes-256-cbc', sha256(key), Buffer.alloc(16, 0))
- Storage: social_accounts.access_token column (encrypted hex string per OAuth provider)
- Previous incidents (pattern reference): INC-2026-06-10-001/002/003/004 in docs/security/incidents/
- Policy: docs/security/SECURITY.md §10 anti-patterns catalogue
- MEMORY.md regel "INC-2026-06-10-005 candidate gedocumenteerd" (10-06-2026)

DESIGN-ISSUES (3 te fixen, niet alleen rotation):
1. Encryption-key shared met JWT_SECRET = separation-of-concerns schending
2. Static zero-IV (Buffer.alloc(16, 0)) = deterministic-encryption-weakness
3. 'default-key' fallback = trivial-decryption risico bij dual-missing env-vars

REMEDIATION SCOPE:
A. Generate dedicated SOCIAL_TOKEN_ENCRYPTION_KEY (32-byte random hex via openssl rand -hex 32) — Frank action via session
B. Migration script: decrypt-met-oude-key (JWT_SECRET-fallback chain) + re-encrypt-met-nieuwe-key + random-IV-per-record over alle social_accounts.access_token records. Migration moet idempotent + reversible (rollback-pad behouden).
C. Source-code-fix in adminPortal.js:15950:
   - Strip fallback-chain: const encryptionKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
   - Fail-loud-zonder-fail-fast guard (request-path service)
   - Vervang static zero-IV door crypto.randomBytes(16) + store alongside ciphertext (format: 'iv:ciphertext' hex)
   - Decrypt-pad: parse 'iv:ciphertext', use iv parameter in createDecipheriv
D. Schema-additie: social_accounts.access_token_iv column OR change encoded format
E. Write docs/security/incidents/2026-06-10-social-token-encryption-key-leak.md (analoog aan INC-001/002/003/004 format)
F. Commit: security: rotate SOCIAL_TOKEN_ENCRYPTION_KEY + random-IV migration (INC-2026-06-10-005)
G. Push wacht op Frank's GO

VEILIGHEIDSREGELS (per project MEMORY.md):
- Branch checken vóór commit (git branch --show-current → dev)
- Backup .env vóór key-update
- Backup social_accounts tabel vóór migration (mysqldump met --single-transaction)
- Frank's parallel-sessie files (imageSelector, mediaProcessingWorker, mediaService) niet aanraken
- Hardcoded credentials NOOIT in chat tonen
- Migration test op staging eerst (indien beschikbaar) — anders direct prod met rollback-pad gereed
- Geen push zonder Frank's expliciete OK

VERWACHTE OPLEVERING:
- Aantal commits + scope per commit
- Migration uitvoeringsbewijs (rows affected count, rollback-script tested)
- Live verificatie: OAuth-token decrypt+gebruik werkt (curl social-accounts endpoint)
- INC-005 incident-rapport (10 secties)
- Update SECURITY.md §10.2 status (INC-005 RESOLVED)
- Geen push (wacht GO)

START VERWACHTING: 2-3 commits in 1 sessie. Migration is hoofdwerk (~30 min code + ~15 min DB-impact test).
```

### Variant B — Bredere security-hygiene sweep (volgende prio na INC-005)

```
Tackle remaining security-hygiene + dependency-debt na INC-001/002/003/004 op 10-06-2026:

1. INC-2026-06-10-005 SOCIAL_TOKEN_ENCRYPTION_KEY remediation (zie Variant A scope)
2. T1 MongoDB cost_logs buffer-timeout fix (Trendspotter follow-up):
   - Implement shared platform-core/src/services/costLogger.js met connection-pooling
   - Gebruikt door main API + Temporal worker + andere services
   - Replace lazy-import patterns in websiteTrafficCollector + reisleider + weatherPreviewHandler
   - Test SA cost-log entries verschijnen na Temporal trigger
3. T2 Brand-knowledge filter in trendAggregator (per Frank's vorige spawn-task scope §6):
   - buildBrandContextStructured integratie in websiteTrafficCollector.collect()
   - Filter trends waar keyword niet matched met brandContext.entities/sources
   - Update docs/agents/trendspotter-activation.md status
4. Pre-PR/push smoke-tests: pre-commit hook actief op nieuwe additions

VEILIGHEIDSREGELS: identiek aan vorige spawn-task (branch checken, geen mobile/ticketing/payments, geen push zonder GO, hardcoded credentials NOOIT in chat).

VERWACHTE OPLEVERING: 4-6 commits over 1-2 sessies. Eindstaat: 0 actieve fallback-credential-anti-patterns + working cost-log in Temporal-worker context + brand-knowledge filtering in Trendspotter.
```

## 5. Strategische context (1-regel-samenvattingen voor nieuwe sessie)

| Domein | Status nu |
|---|---|
| Page Builder Weather block | v6 enterprise Validated RAG actief — 5% hallucinatie-threshold, weather-bucket guidance, multi-tenant geographic-relevance, EU AI Act provenance |
| Security tooling | gitleaks 8.28.0 + trufflehog 3.95.5 op server; CI workflow delta-mode; baseline 29 permanent + 0 actieve fallbacks in HEAD |
| Incidents 2026-06-10 | 4 geremedieerd (OWM, SISTRIX, SimpleAnalytics, SESSION_SALT) + 1 candidate (SOCIAL_TOKEN_ENCRYPTION_KEY) |
| Trendspotter+Reisleider | Geactiveerd via Temporal worker, weekly cron Sunday 03:45 UTC, eerste run 2026-06-14 |
| EU-vendor-stack | Mistral + DeepL + OpenWeather + SimpleAnalytics + SISTRIX + Pixtral — alle EU/UK-adequacy compliant |
| Documentatie | CLAUDE.md v5.11.0 + MEMORY.md 4 nieuwe regels + 4 INC-rapporten + SECURITY.md §10 anti-pattern catalogus + docs/agents/trendspotter-activation.md |

## 6. Branch-status end-of-day

- `dev`: gepusht naar `origin/dev` (commit `cc6cb9d` HEAD)
- `test`: merged van dev + gepusht (`b94ade7` merge-commit)
- `main`: merged van test + gepusht (`4699586` merge-commit)
- Frank's parallel-sessie files (imageSelector.js, mediaProcessingWorker.js, mediaService.js) ongewijzigd in werkdir — separate workflow

---

*Document gegenereerd 2026-06-10 end-of-day. Bij eerstvolgende sessie: lees dit eerst + MEMORY.md hoofd-deel + CLAUDE.md v5.11.0 changelog-entry.*
