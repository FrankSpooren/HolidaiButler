# Node 22 LTS Migration Plan — HolidaiButler Platform

**Document type**: Planning-deliverable (geen uitvoer-document)
**Sessie**: FASE B Planning (post-v5.6.2)
**Datum opgesteld**: 2026-05-18
**Branch**: `feature/node22-migration-plan-2026-05-18`
**Baseline HEAD**: `1a45160` (v5.6.2 — FASE A Extra Blokken A4+A5+A6 afgesloten)
**Productie Node runtime**: v20.19.6
**Target Node runtime**: **v22.22.3 LTS (codename Jod, released 2026-05-13)**

---

## 1. Executive summary

AWS SDK v3 emitteert sinds v3.1045.x een `NodeVersionSupportWarning`: vanaf januari 2027 vereist de SDK Node ≥22. Deze planning beschrijft een staged migratie van Node 20.19.6 naar Node 22.22.3 LTS, opgedeeld in **5 uitvoer-sessies** (~25–26.5u actief werk + ~14–16 dagen kalendertijd inclusief gedifferentieerde soak-periodes), waarbij `holidaibutler-prod` eerst wordt gespiegeld naar een PII-gescrubde staging-VPS via Hetzner snapshot voor cumulatief 192u staging-soak vóór productie-cutover.

**Definitieve target prod-cutover**: 30 juni 2026 (6 maanden buffer vóór AWS jan-2027 deadline).

**Geen blockers gedetecteerd** in de top-30 dependency scan: alle huidige versies van Mongoose, Sentry, OpenTelemetry, Temporal, BullMQ, Express, Sequelize, mysql2, ioredis, Socket.IO, Sharp en de MCP/AI-SDK's ondersteunen Node 22.

**Twee latent-risico's** voor follow-up (geen showstoppers voor Node 22 zelf):
1. `@walletpass/pass-js` latest (7.x) vereist Node ≥24.12 — we blijven op 6.9.1 (engines `>=8`).
2. `puppeteer-core` latest (25.x) vereist Node ≥22.12 — onze 24.43.1 blijft compatibel; eventuele latere puppeteer-bumps vereisen Node 22.12+ (de meeste 22 LTS patches voldoen daaraan binnen weken).

**Test-strategie**: Optie A — Hetzner snapshot + PII-scrub + staging-VPS + cumulatief 192u staging-soak + gedifferentieerd 24/48/72u prod-soak per wave (blast-radius weighted).

**GDPR retention** (Art. 5(1)(e) compliant): snapshots 90d ná prod-cutover, staging-VPS 30d ná prod-cutover, hard-delete cron op dag 91.

---

## 2. Baseline state (vastgelegd 2026-05-18)

| Aspect | Waarde |
|---|---|
| Server | `holidaibutler-prod` (91.98.71.87, Hetzner) |
| Repo | `/var/www/api.holidaibutler.com` |
| HEAD | `1a45160 docs(v5.6.2): FASE A Extra Blokken (A4+A5+A6)` |
| Branch | `dev` (afgeleid: `feature/node22-migration-plan-2026-05-18`) |
| Node-runtime productie | `v20.19.6` (systeem-binary `/usr/bin/node`, **geen nvm**) |
| PM2 processes | 13 (11 online, 1 stopped: admin-api, 1 errored: reservations) |
| Productie health | `https://api.holidaibutler.com/health` → healthy (MySQL+MongoDB) |
| Recente tags | `v5.6.2`, `pre-blok-a4a5a6-fase-a-extra-2026-05-18`, `v5.6.1`, `v5.6.0` |
| Repo-discovery noot | Platform-core hostst **9 van 13 PM2 processen** (holidaibutler-api + hb-temporal-worker + 7 MCP servers) via één node_modules tree — atomair Node-binary swap vereist |

**Pre-existing exclusions** (FASE C scope, niet onderdeel van Node 22 migratie):
- `holidaibutler-reservations` (id 4, errored) — niet draaiend, wordt apart geadresseerd in Ticketing/Reservations FASE C
- `holidaibutler-admin-api` (id 2, stopped) — beleidskeuze: of starten + meenemen, of permanent verwijderen (zie Vraag #1 in §10)

---

## 3. Blok P1 — Per-service Node-runtime + engines-compat scan

### 3.1 Codebase ↔ PM2 process mapping

13 PM2 processen draaien uit **6 unieke `package.json`-trees**. Dit verandert de upgrade-volgorde radicaal: het is niet "13 services één-voor-één", maar **6 codebase-eenheden** waarbij platform-core een atomic-swap van 9 processen vereist.

| PM2 process | id | Codebase (cwd) | `package.json` engines.node |
|---|---|---|---|
| `holidaibutler-api` | 6 | `platform-core/` | `>=18.0.0` |
| `hb-temporal-worker` | 5 | `platform-core/` | `>=18.0.0` |
| `hb-mcp-mistral` | 7 | `platform-core/` (`src/mcp/servers/...`) | `>=18.0.0` |
| `hb-mcp-apify` | 8 | `platform-core/` | `>=18.0.0` |
| `hb-mcp-deepl` | 9 | `platform-core/` | `>=18.0.0` |
| `hb-mcp-pixtral` | 10 | `platform-core/` | `>=18.0.0` |
| `hb-mcp-chromadb` | 11 | `platform-core/` | `>=18.0.0` |
| `hb-mcp-sistrix` | 12 | `platform-core/` | `>=18.0.0` |
| `holidaibutler-agenda` | 0 | `agenda-module/backend/` | `>=18.0.0` |
| `holidaibutler-ticketing` | 1 | `ticketing-module/backend/` | `>=18.0.0` |
| `holidaibutler-admin-api` | 2 | `admin-module/backend/` (stopped) | `>=18.0.0` |
| `holidaibutler-reservations` | 4 | `reservations-module/backend/` (errored) | `>=18.0.0` |
| `hb-websites` | 3 | `hb-websites/` (Next.js, gestart via npm) | `null` (Next 15.5.12 vereist Node ≥18.18) |

### 3.2 Top-level dependency counts per codebase

| Codebase | Top-level deps | Native bindings (rebuild bij Node major) | Bijzonderheden |
|---|---|---|---|
| `platform-core` | **65** | `sharp 0.33.5`, `@sentry/profiling-node 10.53.1` | Bevat AWS SDK, Sentry, OTel, Temporal, Mongoose, BullMQ, MCP-SDK, OpenAI, Mistral |
| `ticketing-module/backend` | 26 | `@walletpass/pass-js 6.9.1`, `passkit-generator 3.5.5`, `firebase-admin 12.0.0` | Pass-kit native bindings; Apple Wallet certs |
| `agenda-module/backend` | 22 | (geen native bindings) | Standaard Express+Sequelize stack |
| `reservations-module/backend` | 20 | (geen native bindings) | Errored, FASE C scope |
| `admin-module/backend` | 15 | (geen native bindings) | Stopped, kleinste deps |
| `hb-websites` | 9 | (geen native bindings — Next.js standalone) | Next 15.5.12 + React 19.2.3 (modern) |

### 3.3 ESM gotchas scan

| Onderzoekspunt | Resultaat |
|---|---|
| `assert { type: 'json' }` syntax (deprecated in 22) | **0 voorkomens** in `platform-core/src/` en alle backend `src/`-trees |
| `with { type: 'json' }` syntax (Node 22 modern) | **0 voorkomens** (geen JSON imports nodig in huidige code) |
| `tsconfig.json` in repo | **Geen** (pure JS ESM, geen TypeScript-compile-target check nodig) |
| Pure ESM `"type":"module"` | Platform-core ja, backend modules ja (geverifieerd via `package.json`) |
| `package.json "imports"` map gotchas | Niet in gebruik |

**Conclusie**: ESM-laag is zonder breaking-change pad naar Node 22.

---

## 4. Blok P2 — Per-dependency Node 22 compat-matrix

### 4.1 Hot-package matrix (geverifieerd via `npm view`)

Alle huidige geïnstalleerde versies zijn **Node 22-compatible**. Latest-kolom is informatief — geen automatische upgrade tijdens Node-binary swap (single-variable change).

| Package | Huidige versie | Latest | engines.node (latest) | Node 22 OK | Native binding | Opmerking |
|---|---|---|---|---|---|---|
| `@aws-sdk/client-s3` | 3.1045.0 | 3.1048.0 | `>=20.0.0` | Ja | Nee | Hard cutoff jan-2027 voor nieuwere releases (de driver van deze migratie) |
| `mongoose` | 9.6.2 | 9.6.2 | `>=20.19.0` | Ja | Nee | Al latest (v5.5.0) |
| `@sentry/node` | 10.53.1 | 10.53.1 | `>=18` | Ja | Nee | Al latest (v5.2.0) |
| `@sentry/profiling-node` | 10.53.1 | 10.53.1 | `>=18` | Ja | **Ja (libuv profiler)** | Rebuild vereist na Node-swap |
| `@sentry/opentelemetry` | 10.53.1 | 10.53.1 | `>=18` | Ja | Nee | — |
| `@opentelemetry/sdk-node` | 0.218.0 | 0.218.0 | `^18.19.0 \|\| >=20.6.0` | Ja | Nee | Al latest (v5.1.1) |
| `@opentelemetry/auto-instrumentations-node` | 0.76.0 | 0.76.0 | `^18.19.0 \|\| >=20.6.0` | Ja | Nee | — |
| `@temporalio/worker` (en client/activity/workflow) | 1.16.1 | 1.17.2 | `>=20.0.0` | Ja | **Ja (Rust core binding)** | Rebuild vereist; latest minor-bump optioneel |
| `bullmq` | 5.66.5 | 5.76.10 | `>=12.22.0` | Ja | Nee | Minor patches beschikbaar |
| `bull` | 4.12.0 | 4.16.5 | `>=12` | Ja | Nee | Legacy lib, geen breaking change op 22 |
| `express` | 4.18.2 | 5.2.1 | `>=18` | Ja | Nee | **NIET upgraden naar 5.x** tijdens Node-swap (Express 5 = breaking) |
| `mysql2` | 3.6.5 / 3.15.3 | 3.22.3 | `>=8.0` | Ja | Nee | — |
| `sequelize` | 6.35.x / 6.37.7 | 6.37.8 | `>=10.0.0` | Ja | Nee | — |
| `ioredis` | 5.3.2 / 5.8.2 | 5.10.1 | `>=12.22.0` | Ja | Nee | — |
| `redis` (node-redis) | 4.6.11 / 4.7.1 | 5.12.1 | `>=18.19.0` | Ja | Nee | Latest is major-bump, niet meenemen |
| `socket.io` | 4.8.3 | 4.8.3 | `>=10.2.0` | Ja | Nee | Al latest |
| `sharp` | 0.33.5 | 0.34.5 | `^18.17.0 \|\| ^20.3.0 \|\| >=21.0.0` | Ja | **Ja (libvips)** | Rebuild vereist; latest minor optioneel |
| `puppeteer-core` | 24.43.1 | 25.0.3 | `>=22.12.0` (latest) | Ja (huidige) | Nee (extern Chromium) | **Latest 25.x vereist 22.12+** — pin minor LTS na install |
| `@modelcontextprotocol/sdk` | 1.29.0 | 1.29.0 | `>=18` | Ja | Nee | Al latest |
| `@mistralai/mistralai` | 1.11.0 | 2.2.1 | (geen) | Ja | Nee | Latest is major (v2), niet meenemen |
| `openai` | 4.77.0 | 6.38.0 | (geen) | Ja | Nee | Latest is major (v6), niet meenemen |
| `pm2` | (server-global) | 7.0.1 | `>=18.0.0` | Ja | Nee | Apart te overwegen — geen onderdeel van app-deps |
| `next` (hb-websites) | 15.5.12 | 16.2.6 | `>=20.9.0` | Ja | Nee | Latest is major; niet meenemen |
| `react` / `react-dom` | 19.2.3 | (semver-stabiel) | n.v.t. | Ja | Nee | — |
| `@walletpass/pass-js` | 6.9.1 | 7.2.0 | `>=24.12.0` (latest) | Ja (huidige `>=8`) | **Ja (pkcs7 crypto)** | **Pin op 6.x** — latest vereist Node 24 |
| `passkit-generator` | 3.5.5 | 3.5.7 | `>=14.21.3` | Ja | Nee | Patch-bump beschikbaar |
| `firebase-admin` | 12.0.0 | 13.10.0 | `>=18` | Ja | Nee (gRPC pre-built) | Latest is major (v13), niet meenemen |
| `twilio` | 4.23.0 | 6.0.2 | `>=20.0.0` (latest) | Ja (huidige `>=14`) | Nee | Latest is major (v6), niet meenemen |
| `umzug` | 3.7.0 | 3.8.3 | `>=12` | Ja | Nee | — |
| `node-cron` | 3.0.3 | 4.2.1 | `>=6.0.0` | Ja | Nee | — |
| `nodemailer` | 8.0.1 | 8.0.7 | `>=6.0.0` | Ja | Nee | — |
| `chromadb` | 3.1.8 | 3.4.3 | `>=20` | Ja | Nee | — |
| `@google-cloud/text-to-speech` | 5.5.0 | 6.4.1 | `>=18` | Ja | Nee | Latest is major, niet meenemen |

### 4.2 AWS SDK warning herkomst

De `NodeVersionSupportWarning` zit niet in `engines.node` van het package, maar wordt at-runtime door `@aws-sdk/client-s3 ≥3.1045` emit via `warnIfDeprecatedNodeJSVersion()`. Geen workaround anders dan Node-binary upgrade naar 22.x. Na upgrade verdwijnt de warning permanent.

### 4.3 Native bindings — concrete rebuild-stappen

Per service moet na de Node-binary swap een `npm rebuild` worden uitgevoerd voor packages met C++/Rust bindings:

| Codebase | `npm rebuild` doelen | Geschatte rebuild tijd |
|---|---|---|
| `platform-core` | `sharp`, `@sentry/profiling-node`, `@temporalio/core-bridge` (transitief van `@temporalio/worker`) | 3–5 min |
| `ticketing-module/backend` | `@walletpass/pass-js`, eventueel `passkit-generator` (verifiëren) | 2 min |
| `agenda-module/backend` | (geen native bindings) | n.v.t. |
| `admin-module/backend` | (geen native bindings) | n.v.t. |
| `reservations-module/backend` | (geen — FASE C scope) | n.v.t. |
| `hb-websites` | (Next.js standalone, geen rebuild nodig na Node-swap voor `next start`) | n.v.t. |

---

## 5. Blok P3 — PM2 ecosystem upgrade-volgorde

### 5.1 Strategische keuze: nvm-based of NodeSource-based

Productie heeft Node v20.19.6 als systeem-binary `/usr/bin/node`, **nvm is niet aanwezig**. Twee paden voor Node 22:

| Optie | Voordeel | Nadeel | Rollback-tijd |
|---|---|---|---|
| **A. nvm installeren als pre-werk** | Per-process `interpreter` switch via PM2 ecosystem.config; co-existence van Node 20+22 mogelijk; instant rollback via `nvm use 20` | Eenmalige nvm-install (~5 min) | <1 min per process |
| B. APT-based NodeSource upgrade | Geen extra tool; consistent met huidige install-methode | Geen co-existence; system-wide swap; rollback vereist apt downgrade + dependency-conflict-risico | 10–20 min per service |

**Aanbeveling**: Optie A (nvm). Reden: per-codebase incrementele migratie, atomair rollback per PM2-process via ecosystem.config update, geen apt-pakket conflicten met andere systeem-services (Apache, MariaDB, Redis).

### 5.2 Upgrade-volgorde (verfijnd na codebase mapping uit §3.1)

De prompt-suggestie was "MCP servers eerst". Dit moet **bijgesteld** worden: alle 9 platform-core processen delen één `node_modules`, dus de native bindings (sharp, profiling-node, @temporalio/core-bridge) zijn ABI-gebonden aan één Node-major. Na `npm rebuild` onder Node 22 kunnen ze NIET meer onder Node 20 draaien. Platform-core moet daarom **atomair** geüpgraded worden (alle 9 processen tegelijk via `pm2 reload all` op platform-core namespace).

**Productie cutover volgorde** (per uitvoer-sessie genummerd):

| # | Sessie | Service / codebase | Aantal PM2 processen | Reden voor volgorde |
|---|---|---|---|---|
| 1 | **Sessie 1: Pre-werk** | `nvm install 22.22.3` + `nvm alias default 22.22.3` (maar zonder gebruik) | 0 | Geen state-wijziging; alleen Node 22 binary beschikbaar op disk |
| 2 | **Sessie 1: Pre-werk** | PM2 ecosystem.config.js refactor: voeg `interpreter` field toe per process (initieel naar Node 20 path) | 0 | Nul-impact change; ecosystem.config.js wordt actief bij volgende `pm2 reload <name>` |
| 3 | **Sessie 2 (staging)** | Hetzner snapshot productie → restore naar staging-VPS → herhaal alle stappen 4–8 op staging | n.v.t. | Zie §6 |
| 4 | **Sessie 3 (prod): Wave 1** | `holidaibutler-agenda` (lichtste backend, geen native bindings) | 1 | Minste blast-radius; valideert nvm+PM2 interpreter switch pattern |
| 5 | **Sessie 3: Wave 2** | `holidaibutler-admin-api` — **conditioneel**: meenemen of permanent verwijderen wordt bepaald na onderzoek in Sessie 1 pre-werk (zie §10.1) | 1 of 0 | 15 deps, geen native, lage complexiteit indien meegenomen |
| 6 | **Sessie 3: Wave 3** | `holidaibutler-ticketing` (passkit + firebase-admin native rebuilds) | 1 | Eerste service met native bindings — verifieert rebuild-pad voor platform-core wave; **48u soak** wegens 3 native bindings |
| 7 | **Sessie 3: Wave 4** | `hb-websites` (Next.js, standalone) | 1 | Onafhankelijk van platform-core; React frontend; 24u soak |
| 8 | **Sessie 4 (prod): Wave 5** | `platform-core` atomair: `holidaibutler-api` + `hb-temporal-worker` + 6 MCP servers (mistral/apify/deepl/pixtral/chromadb/sistrix) | **8** (apify is 1 van 6 MCP) | Grootste blast-radius; native rebuilds (sharp, profiling-node, temporalio core); **72u soak** wegens 3 native bindings + 8 processen + tenant-data flow |
| skip | — | `holidaibutler-reservations` | 1 | Errored, FASE C scope — wordt opnieuw geactiveerd na ticketing/reservations consolidation sessie, dan ook Node 22 ineens |

**Telling kruisvalidatie**: 1+1+1+1+8 = 12 active processes + 1 skipped (reservations) = 13 totaal. Klopt met PM2 list.

Noot bij MCP-telling: PM2 list toont 6 MCP processen (mistral, apify, deepl, pixtral, chromadb, sistrix), niet 7 zoals prompt-tekst suggereert. Originele prompt regel 56–60 noemt 6 namen; "7" in prompt-tekst was vermoedelijk telling-fout. Plan-document houdt 6 MCP aan.

### 5.3 Rollback-protocol per service

Voor elk PM2 process geldt het volgende rollback-pad (uitgewerkt in uitvoer-sessie):

```text
# Pre-cutover voorbereidingen (vóór Sessie 3 start):
1. git tag pre-node22-migration-2026-MM-DD                    # globale rollback-anchor
2. cp /var/www/api.holidaibutler.com/ecosystem.config.js \
     /root/backups/2026-MM-DD/ecosystem.config.pre-node22.js  # PM2 config snapshot
3. tar -czf /root/backups/2026-MM-DD/node_modules-{service}.tar.gz \
     <service>/node_modules                                   # native bindings snapshot per service

# Rollback per service (single-service regressie):
1. pm2 stop <service-name>
2. pm2 delete <service-name>
3. cp /root/backups/.../ecosystem.config.pre-node22.js ecosystem.config.js
4. tar -xzf /root/backups/.../node_modules-<service>.tar.gz   # herstel Node 20 bindings
5. pm2 start ecosystem.config.js --only <service-name>
6. pm2 logs <service-name> --lines 100                        # verifieer healthy
# Doel-tijd: <5 min per service

# Catastrofale rollback (alle services tegelijk):
1. nvm use 20.19.6                                            # systeem-default terug
2. cp ecosystem.config.pre-node22.js ecosystem.config.js
3. for s in <services>; do tar -xzf node_modules-$s.tar.gz; done
4. pm2 reload all
# Doel-tijd: <15 min
```

---

## 6. Blok P4 — Test-strategie

### 6.1 Optie-vergelijking

| Optie | Beschrijving | Effort | Risico | Aanbeveling |
|---|---|---|---|---|
| **A. Hetzner snapshot + staging VPS** | Snapshot van `holidaibutler-prod` → restore naar nieuwe `holidaibutler-staging` VPS → Node 22 upgrade + soak op staging → cutover op prod | 1 dag setup + 24u soak | Laag (echte productie-replica, clean rollback) | **Gekozen** |
| B. Containerization (Dockerfile per service) | Per-service Dockerfile, lokale Node 22 test, daarna prod-container deploy | 5–10 dagen | Middel (zware refactor, nieuwe abstractie-laag, runtime-omgeving verschilt van prod) | Niet — out of scope voor migratie-vehicle |
| C. In-place blue-green via nvm | Node 22 install naast 20 op prod, PM2 ecosystem switch per process, rollback via `nvm use 20` + `pm2 reload` | 2u | Hoog (regressies hebben direct prod-impact, geen pre-cutover soak) | Niet — overslaat staging-validatie |

### 6.2 Optie A — gedetailleerde uitvoer-plan

**Voorwaarden vóór snapshot**:
- v5.6.2 productie heeft geen openstaande incidenten (geverifieerd via PM2 logs in §2)
- Frank's akkoord voor staging-VPS kosten (Hetzner CX22 ~€6/maand voor 30 dagen test-periode, Hetzner snapshot ~€0.0119/GB/maand, productie disk grootte te verifiëren)
- DNS-only staging-subdomain `staging.api.holidaibutler.com` voor health-checks

**Staging cutover sequence**:
1. `hcloud server create-image --type snapshot holidaibutler-prod` → snapshot-ID noteren (= `pre-node22-prod-snapshot-<date>`, retention 90d ná prod-cutover)
2. `hcloud server create --image <snapshot-id> --name holidaibutler-staging --type cx22 --location nbg1`
3. SSH naar staging, verifieer alle 13 PM2 processen draaien identiek
4. **PII-scrub SQL script** op staging: anonymizeer `users.email`, `customers.email/phone/address`, `bookings.guest_name/email`, `ticketing.passkit_holder_name` (GDPR Art. 32 — minimaliseer PII-exposure op niet-productie omgeving). Script lokaal voorbereiden vóór Sessie 2, atomic transaction
5. Voer Sessie 1 pre-werk uit op staging (nvm install, ecosystem.config refactor)
6. Voer Sessie 3 Wave 1 (`holidaibutler-agenda`) → **24u soak**
7. Voer Sessie 3 Wave 2 (`holidaibutler-admin-api` — conditioneel per §10.1) → **24u soak**
8. Voer Sessie 3 Wave 3 (`holidaibutler-ticketing`) → **48u soak** (3 native bindings)
9. Voer Sessie 3 Wave 4 (`hb-websites`) → **24u soak**
10. Voer Sessie 4 Wave 5 (`platform-core` atomic) op staging → **72u soak** (grootste blast-radius)
11. Per-wave: monitor health-endpoints, PM2 `unstable_restarts ≤ 0`, Tempo traces, Sentry error-rate, native-binding smoke (sharp resize / Temporal workflow / Apple Wallet pass)
12. Smoke test suite (zie §6.3) groen op staging vóór elke prod-wave
13. Snapshot staging als rollback-anchor (`post-staging-validated-snapshot-<date>`, retention 90d ná prod-cutover)
14. Bij staging volledig groen (cumulatief ≥192u soak = ~8 dagen): Frank's akkoord voor prod-cutover

**Productie cutover sequence** (na staging-validatie):
- Identiek aan staging stappen 4–7, maar met explicit rollback-tag-trigger bij eerste P0 alert

### 6.3 Smoke test scope

Verplicht groen voor go/no-go per wave:

| Test categorie | Specifieke checks | Bron |
|---|---|---|
| Health endpoints | `GET /health` returns 200 + `{"status":"healthy","services":{"mysql":"connected","mongodb":"connected"}}` | platform-core |
| OTel traces | Service `holidaibutler-api` tags zichtbaar in Tempo binnen 60s na request | Blok A6 (Grafana 11.3 + Tempo) |
| Sentry | Error rate ongewijzigd t.o.v. 24u pre-cutover baseline | Sentry self-hosted (v5.2.0) |
| PM2 stability | `unstable_restarts` = 0 voor alle processen na 30 min uptime | PM2 |
| MCP servers | Functionele query per MCP (mistral/apify/deepl/pixtral/chromadb/sistrix) via admin Content Studio | platform-core |
| Temporal worker | Workflow execution succesvol (1 test-workflow trigger + completion) | Blok A5 (Temporal eigen OTel/Sentry) |
| Native bindings | `sharp` resize-test op POI image; `@sentry/profiling-node` profiles aanwezig in Sentry | platform-core |
| Wallet pass | 1 Apple Wallet pass generate test (ticketing-module) | ticketing |
| Frontend | hb-websites `/` rendert; admin module SSO login werkt | hb-websites + admin |

---

## 7. Blok P5 — Effort + risico schatting

### 7.1 Per-service / per-fase effort

| Fase / service | Effort schatting | Risico-niveau | Rollback-complexiteit |
|---|---|---|---|
| Sessie 1 — pre-werk (nvm install + ecosystem.config refactor + admin-module onderzoek) | 2.5u | Laag | n.v.t. (geen state-wijziging) |
| Sessie 2 — Hetzner snapshot + staging-VPS provisioning + **PII-scrub SQL script** + initial staging health-check | 4.5u | Laag | Snapshot-restore (~30 min) |
| Sessie 2/3 — Staging Node 22 upgrade volledig + cumulatief 192u soak (24+24+48+24+72) | 6u actief + ~8d kalendertijd passieve soak | Laag-Middel | nvm use 20 + ecosystem.config restore op staging |
| Sessie 3 Wave 1 — `holidaibutler-agenda` (24u prod-soak na cutover) | 1.5u | Laag | <5 min |
| Sessie 3 Wave 2 — `holidaibutler-admin-api` (conditioneel; 24u prod-soak) | 0–1.5u (afhankelijk van §10.1 onderzoek-uitkomst) | Laag | <5 min |
| Sessie 3 Wave 3 — `holidaibutler-ticketing` (3 native rebuilds; 48u prod-soak) | 2.5u | Middel | <10 min (native rebuild verificatie nodig) |
| Sessie 3 Wave 4 — `hb-websites` (Next.js standalone; 24u prod-soak) | 2u | Middel (frontend impact) | <10 min |
| Sessie 4 Wave 5 — `platform-core` atomic (8 processen, 3 native rebuilds; 72u prod-soak) | 4u | **Hoog** (grootste blast-radius) | <15 min (native bindings restore + pm2 reload all) |
| Sessie 5 — Post-cutover 30d monitoring + warning-cleanup verificatie + 90d snapshot retention cron + MEMORY/CLAUDE update | 2u | Laag | n.v.t. |
| **Totaal actief werk** | **~25–26.5u** (range door §10.1 conditie) | | |
| **Totaal kalendertijd** | **~14–16 dagen** (incl. cumulatief 192u staging soak + per-wave prod-soak conform §6.2) | | |

### 7.2 Risico-register

| Risico | Waarschijnlijkheid | Impact | Mitigatie |
|---|---|---|---|
| `sharp` libvips ABI-mismatch na rebuild | Laag | Hoog (image-pipeline down) | Snapshot van `node_modules` vóór swap; rebuild op staging eerst |
| `@sentry/profiling-node` libuv binding mismatch | Laag | Middel (profiling weg, maar app draait) | Idem; profiling is non-essential — degrade gracefully |
| `@temporalio/core-bridge` Rust binding mismatch | Laag | Hoog (workflow-executie kapot) | Rebuild op staging eerst + Temporal test-workflow in smoke suite |
| AWS SDK regio-bound credential behaviour change | Zeer laag | Middel | AWS SDK 3.x is Node-runtime onafhankelijk voor credentials; geen wijziging verwacht |
| PM2 ecosystem.config.js interpreter-path typo | Middel | Middel (process start niet) | Validatie via `pm2 prettylist` na elke wijziging vóór `pm2 reload` |
| `puppeteer-core 24.43.1` ABI-issue met Node 22 | Laag | Laag (alleen MCP gebruikt — degradeert tot HTTP fallback) | Test in smoke suite |
| Parallel Claude sessie merge-conflict op `ecosystem.config.js` | Middel | Laag | MEMORY-regel: `git log --oneline -5` vóór elke commit; deze planning-sessie heeft branch-discipline (feature/node22-...) |
| Hetzner snapshot blijkt corrupt | Zeer laag | Hoog (geen staging mogelijk) | Hetzner snapshot SLA + Hetzner support; alternatief: clone via `dd` op block-device |

---

## 8. Voorwaarden voor start FASE B uitvoer

De volgende prerequisites moeten vóór Sessie 1 (pre-werk) groen staan:

1. **Frank's akkoord** op dit plan-document (review + merge naar `dev` + tag `plan/node22-v1.0`)
2. **Hetzner kostenakkoord** voor staging-VPS (~€6/maand voor 30d-actief-na-cutover + ~€0.36/maand snapshot storage voor 30GB × 90d retention)
3. **`holidaibutler-admin-api` onderzoek** (Sessie 1 pre-werk, max 0.5u): grep usage van endpoints + DB-tabel-isolatie check → beslissing meenemen (Wave 2) of `git rm` codebase
4. **`holidaibutler-reservations` confirmation**: blijft errored / FASE C scope tot Ticketing/Reservations consolidation
5. **`nvm` install op productie** als allereerste Sessie 1 pre-werk stap (`curl ... nvm-sh/nvm/v0.40.1/install.sh | bash` → `nvm install 22.22.3` → `nvm alias default 20.19.6` zodat huidige binary system-wide ongewijzigd blijft)
6. **GDPR retention policy** (Optie A per §10.5): 90d snapshot retention, 30d staging-VPS levensduur, PII-scrub SQL voorbereid vóór Sessie 2, DPA / privacy notice update (jouw juridische review buiten technisch scope)
7. **Onderhoudsvenster-planning**: 24/48/72u-soak periodes geven impact-vrije productie; communicatie naar destinations niet nodig (geen breaking API change verwacht), maar wel naar Frank vóór Wave 5 cutover
8. **AWS SDK jan-2027 deadline-tracking**: blijft in MEMORY.md (al gedaan via v5.6.x changelog); doel is ruim vóór dat datum afronden — definitieve target-cutover prod = **uiterlijk 30 juni 2026** (per §10.6)
9. **Geen openstaande FASE A regressies**: v5.6.2 wijzigingen (Grafana/Tempo + Temporal OTel/Sentry) hebben 7-daagse soak (15-05 tot 22-05) — Sessie 1 vroegst plannen 22-05-2026

---

## 9. Optionele blokken (P6 + P7)

### 9.1 Blok P6 — Node 22 nieuwe features (informatief)

Features relevant voor HolidaiButler-roadmap, niet binnen scope van deze migratie:

- **Native WebSocket client** (sinds 22.x stable) — relevant voor toekomstige realtime-features (Temporal-status push, calendar-collaboration)
- **`--watch` flag** (sinds 18+, verbeterd in 22) — DX-verbetering voor lokale ontwikkeling, geen prod-impact
- **`node:test` built-in test runner** — nu mature; alternatief voor Vitest/Jest in toekomst (geen migratie-prioriteit)
- **Import attributes finalized syntax** (`with { type: 'json' }`) — relevant indien we JSON imports gaan gebruiken; geen huidige usage
- **V8 12.4 → 12.7** — performance-winst zonder code-wijziging (~5–15% op AI workloads volgens benchmarks)
- **WASI 1.0 stable** — niet binnen scope HolidaiButler

### 9.2 Blok P7 — Latente warnings inventariseren

Te documenteren in een vervolg-uitvoer-sessie (pre-Sessie 3) door PM2 logs te grepen:

| Warning | Bron | Verwachte oplossing |
|---|---|---|
| `NodeVersionSupportWarning` (AWS SDK) | `@aws-sdk/client-s3 ≥3.1045` | Verdwijnt automatisch na Node 22 cutover (primair doel van deze migratie) |
| Andere `(node:XXX) [DEP0XXX]` warnings | PM2 logs grep | Per warning beoordelen — sommige Node 20-specifieke deprecations zijn al opgelost in 22 |
| Mongoose deprecation-warnings | mongoose 9.6.2 | Geen huidig issue verwacht (al latest in v5.5.0) |
| OpenTelemetry deprecation-warnings | OTel 0.218 | Geen huidig issue verwacht (al latest in v5.1.1) |
| Sentry SDK warnings | Sentry 10.x | Geen huidig issue verwacht (al latest in v5.2.0) |

---

## 10. Definitieve scope (Frank's beslissingen 2026-05-18)

Alle 5 open beslispunten zijn beantwoord. Onderstaande beslissingen zijn vastleggend voor alle uitvoer-sessies.

### 10.1 `holidaibutler-admin-api` — Onderzoeken vóór beslissing

**Beslissing**: NIET blind meenemen, NIET blind verwijderen. Sessie 1 pre-werk (max 0.5u) bevat onderzoek:
1. Grep `admin-module/backend/src/routes/` voor endpoint-paths
2. Cross-check tegen `platform-core/src/admin/*` of `routes/admin*` — bestaan dezelfde paths daar?
3. DB-tabel inventaris: heeft `admin-module/backend` exclusieve tabellen (geen overlap met platform-core)?
4. Uitkomst rapporteren aan Frank vóór Wave 2:
   - **Scenario A** (functionaliteit gemigreerd naar platform-core): `git rm -r admin-module/backend/` + remove uit `ecosystem.config.js` + commit `chore(cleanup): permanent verwijderen admin-module/backend (gemigreerd)` → duurzame opruiming, Wave 2 skip
   - **Scenario B** (unieke functionaliteit): starten + Wave 2 cutover (+1.5u effort)

**Onderbouwing**: een proces in stopped-state zonder owner is technical debt; bewuste beslissing-op-feiten sluit kwetsbaarheid duurzaam af.

### 10.2 Staging-VPS levensduur + snapshot retention — Optie A (GDPR-compliant)

**Beslissing**:
- `pre-node22-prod-snapshot-<date>`: bewaar **90 dagen** ná succesvolle prod-cutover
- `post-staging-validated-snapshot-<date>`: bewaar **90 dagen** ná succesvolle prod-cutover
- Staging-VPS actief: **30 dagen** ná succesvolle prod-cutover, daarna `hcloud server delete` (snapshot blijft als anker)
- Hard-delete snapshots op dag 91 via cron-job in Sessie 5 (post-cutover)
- **PII-scrub SQL script** vóór staging-tests in Sessie 2 (+0.5u): anonymizeer email/naam/telefoon/wallet-holder in alle PII-tabellen
- **DPA / privacy notice update**: retention-policy expliciet documenteren ("technical backups voor disaster recovery worden maximaal 90 dagen bewaard") — jouw juridische review buiten technisch scope

**Onderbouwing**: GDPR Art. 5(1)(e) Storage Limitation + Art. 17 Right to Erasure. AP-handhaving Art. 5 actief, reputatie-risico bij onbeperkt bewaren weegt zwaarder dan financieel boete-risico. EU AI Act stelt geen directe constraint op snapshot-retention voor deze migratie (HolidaiButler content-generation valt vooralsnog niet onder Annex III high-risk).

### 10.3 Native rebuild soak-duur — Gedifferentieerd o.b.v. blast-radius

**Beslissing**: per-wave soak-duur gekoppeld aan native-binding count + blast-radius:

| Wave | Service | Native bindings | Prod-soak |
|---|---|---|---|
| 1 | agenda | 0 | **24u** |
| 2 | admin (conditioneel) | 0 | **24u** |
| 3 | ticketing | 3 (passkit, pass-js, firebase gRPC) | **48u** |
| 4 | hb-websites | 0 (Next standalone) | **24u** |
| 5 | platform-core atomic | 3 (sharp, profiling-node, temporalio core) | **72u** |

Cumulatief staging-soak: ~192u (~8 dagen kalendertijd vóór eerste prod-wave begint).

**Onderbouwing**: risk-weighted soak voorkomt overspecificatie op simpele services + onderspecificatie op kritieke services. Wave 5 verdient 72u omdat Sentry profiler memory-druk patroon pas na 24+u ABI-issues blootlegt + Temporal workflows zijn long-running.

### 10.4 PM2 v6 → v7 upgrade — STRIKT SEPARAAT

**Beslissing**: NIET meenemen in Node 22 sessies. PM2 v6.x blijft op productie.

**Voorwaarde in Sessie 1 pre-werk**: verifieer huidige PM2-versie (`pm2 -v`) + bevestig dat huidige versie engines.node-compatible is met Node 22.22.3 via `npm view pm2@<huidige> engines.node`. Verwachting: alle PM2 v6.x versies hebben `engines.node >=12` of `>=14` — Node 22 dekt dat ruim.

Future FASE-stroom: "FASE D PM2 v7 upgrade" als eigen project ná 30d post-Node22-cutover stabilisatie.

**Onderbouwing**: single-variable-change principe — orthogonale changes ontkoppelen is fundament van diagnoseerbaarheid in productie. PM2 v6→v7 is major-bump met eigen schema-changes (ecosystem.config.js), eigen CLI breaking changes, eigen soak.

### 10.5 Target cutover datum — Uiterlijk 30 juni 2026

**Beslissing**: definitieve target = **30 juni 2026** (eind Q2 / vroege Q3 2026) voor Wave 5 prod-cutover compleet, post-cutover monitoring start.

**Mijlpaal-planning** (per uitvoer-sessie):

| Mijlpaal | Streefdatum | Go/no-go gate |
|---|---|---|
| v5.6.2 7-daagse FASE A soak | 15-05 → 22-05-2026 | Geen P0/P1 regressies in v5.6.2 |
| Sessie 1 pre-werk (nvm install + ecosystem.config refactor + admin-module onderzoek + PII-scrub SQL voorbereid) | week 22 (vanaf 25-05) | nvm install groen + Frank's admin-module beslissing |
| Sessie 2 staging snapshot + provisioning + PII-scrub uitvoer | week 23 | Staging health-check 13/13 PM2 processes online |
| Sessie 3/4 staging Node 22 alle 5 waves + cumulatief 192u soak | week 23–24 | Smoke suite groen + Sentry error-rate ≤ baseline |
| Sessie 3 prod Wave 1 (agenda) + 24u soak | week 25 | PM2 unstable_restarts=0 + health-endpoint 200 |
| Sessie 3 prod Wave 2 (admin conditioneel) + 24u soak | week 25 | Idem |
| Sessie 3 prod Wave 3 (ticketing) + 48u soak | week 25 | + Apple Wallet pass-generate smoke |
| Sessie 3 prod Wave 4 (hb-websites) + 24u soak | week 25–26 | + frontend render-smoke |
| Sessie 4 prod Wave 5 (platform-core atomic) + 72u soak | week 26 | + Temporal workflow + sharp resize + MCP-queries groen |
| Sessie 5 post-cutover 30d monitoring + 90d snapshot retention cron + MEMORY/CLAUDE update | week 27+ | n.v.t. (verlengde monitoring) |
| Target cutover prod compleet | **uiterlijk 30 juni 2026** | Alle 5 waves geverifieerd in productie |

Marge t.o.v. AWS hard cutoff (jan-2027): **6 maanden buffer** voor onverwachte regressies + holiday-season freeze.

**Onderbouwing**: alle planning is rond, geen technische blockers, geen rationele reden tot uitstel. Eerdere cutover = langere periode Node 22 productie-leertijd vóór externe deadline.

---

## 11. Status-rapport (einde planning-sessie + Frank's beslissingen verwerkt)

| Aspect | Waarde |
|---|---|
| Plan-document | `docs/migrations/NODE-22-MIGRATION-PLAN.md` (gepatcht met definitieve scope 2026-05-18) |
| Per-service inventaris | 6 unieke codebases mapped naar 13 PM2 processen |
| Per-dependency compat-matrix | 30+ top-packages geverifieerd, 0 blockers voor Node 22 |
| Test-strategie | Optie A (Hetzner snapshot + staging-VPS + cumulatief 192u staging soak + PII-scrub) |
| Snapshot retention | 90d ná prod-cutover (GDPR Art. 5(1)(e) compliant) |
| Staging-VPS levensduur | 30d ná prod-cutover |
| Soak-strategie | Gedifferentieerd: Wave 1+2+4 = 24u, Wave 3 = 48u, Wave 5 = 72u |
| PM2 v6→v7 upgrade | STRIKT SEPARAAT — Future FASE D, niet in Node 22 sessies |
| Target cutover prod compleet | **30 juni 2026** (6 maanden buffer vóór AWS jan-2027 deadline) |
| Effort-totaal schatting | ~25–26.5u actief over 5 uitvoer-sessies + ~14–16 dagen kalendertijd (incl. soaks) |
| MEMORY.md uitbreiding | +2 regels: ESM JSON imports guardrail + GDPR 90d snapshot retention |
| Volgende stap | Frank reviewt gepatcht plan + akkoord voor merge naar `dev` + tag `plan/node22-v1.0` + start FASE B Sessie 1 (pre-werk) als nieuwe sessie |

---

## Bijlage A — Anti-pattern guards toegepast in deze planning

- Reflectie-vraag *"Is dit planning of uitvoering?"* toegepast: alle aanbevolen acties zijn condition-checks of documentatie, geen `npm install`/`nvm install`/`pm2 reload` uitgevoerd in deze sessie.
- Geen verboden rationaliseringen ("pragmatisch", "voor nu", "minimale effort") in scope-keuzes: elke beslissing heeft expliciete motivering.
- Bewijs eerst, claim daarna: alle versie-claims geverifieerd via `npm view` of `jq -r .dependencies` directe queries — geen MEMORY-stale aannames.
- Anchor-strings i.p.v. line numbers in toekomstige patch-instructies (zie §5.3 rollback-protocol gebruikt service-namen, niet regel-nummers).
- Branch-discipline: planning-sessie op `feature/node22-migration-plan-2026-05-18`, geen merge naar `dev` zonder Frank's akkoord.
- Parallel-sessie detectie: gedaan via `git log --oneline -5` aan start van sessie; baseline shift van v5.6.1 naar v5.6.2 expliciet gemeld in §2.
