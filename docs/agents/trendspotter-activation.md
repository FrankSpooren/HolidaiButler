# Trendspotter + Reisleider Activation

## Overview

Twee voorheen-slapende agents in `platform-core/src/services/agents/{trendspotter,reisleider}/` zijn op 2026-06-10 geactiveerd via Temporal worker.

- **Trendspotter** (`A.17 — De Trendspotter`): weekly cron, verzamelt trending keywords per destination uit twee bronnen (SimpleAnalytics own-site signals + Google Trends via Apify) → opgeslagen in `trending_data` tabel met EU AI Act Art 50 provenance signatures
- **Reisleider** (`Fase 6 P2 — Customer Journey Agent`): on-demand context-aggregator per destination, levert journey-stats + chatbot-stats + pageview-funnel + SA-traffic-summary aan content-redacteur en andere consumers

## Activation triggers

| Workflow | Schedule / Trigger | Task Queue | Workflow ID Format |
|---|---|---|---|
| `trendspotterWeeklyWorkflow` | Temporal Schedule `trendspotter-weekly-v1`, cron `45 3 * * 0` (Sunday 03:45 UTC = 05:45 CEST / 04:45 CET), overlap policy `SKIP` | `hb-agents` | `<schedule>-<timestamp>` |
| `reisleiderContextWorkflow` | On-demand via `client.workflow.start()`, geen schedule | `hb-agents` | Caller-bepaald |

## Architecture (Trendspotter weekly cycle)

```
Temporal Schedule (cron 45 3 * * 0)
        ▼
trendspotterWeeklyWorkflow
        ▼
  getActiveDestinationIdsForSA() → [1, 2]
        ▼
  for each destId:
        ▼
    runTrendspotterForDestination(destId) ← activity (10min startToCloseTimeout, max 3 retries, 30s initial backoff, 2.0 coefficient)
        ▼
    trendspotterAgent.runForDestination(destId)
        ├── Step 1: websiteTrafficCollector.collect(destId)
        │     ├── SA-call /pages?domain=<calpetrip.com|texelmaps.nl> (15s timeout)
        │     ├── SA-call /events?domain=<...>
        │     ├── path-naar-keyword classification (Homepage, POI Overzicht, etc.)
        │     ├── UPSERT trending_data met provenance SHA-256 signature in raw_data JSON
        │     └── logCost(destId, 2) → cost_logs (service='simpleanalytics')
        │
        └── Step 2: googleTrendsCollector.collect(destId)
              ├── Apify Google Trends Actor invocation
              ├── trendAggregator.aggregate(destId, trendsData)
              └── season-boost + UPSERT to trending_data
        ▼
    sleep('5 seconds') (inter-destination rate-limit spread)
        ▼
  summary { startedAt, completedAt, total_destinations, succeeded, failed, total_keywords_collected, results[] }
        ▼
  pushDashboardEvent('trendspotter', 'weekly-cycle-completed', ...)
```

## Multi-tenant isolation

- `getActiveDestinationIdsForSA()` returnt alleen destinations met DEST_DOMAINS mapping (Calpe id=1 → calpetrip.com, Texel id=2 → texelmaps.nl)
- Per-destination try/catch in workflow loop: één destination-failure blokkeert nooit andere destinations
- Per-source try/catch binnen `trendspotterAgent.runForDestination`: SA-failure blokkeert nooit Google Trends pad en vice versa
- Provenance signature uniek per `(destinationId, weekNumber, year)` — geen cross-tenant pollutie van AI-input

## Provenance (EU AI Act Art 50)

`websiteTrafficCollector` schrijft per insert/update naar `trending_data.raw_data` JSON:
```json
{
  "_provenance": {
    "signature": "<SHA-256>",
    "payload_summary": { "source": "simpleanalytics", "week_number": 24, "year": 2026, "keyword_count": 1 }
  },
  "_source": "simpleanalytics",
  "_vendor": "SimpleAnalytics B.V., Tilburg NL (EU GDPR-compliant)",
  "_collected_at": "2026-06-10T17:27:23.123Z",
  "pages_count": 15,
  "events_count": 5
}
```

De signature is een SHA-256 hash over `(source, destination_id, week_number, year, keyword_count, sorted_keywords_hash, collected_at)`. Tampered content is detecteerbaar door re-hash en vergelijking.

## First-run verification (2026-06-10 17:27 — 17:37 UTC)

Manual trigger via `client.workflow.start('trendspotterWeeklyWorkflow')`:

| Destination | SA keywords | GT keywords | Aggregated | Errors | Duration |
|---|---|---|---|---|---|
| Calpe (id=1, calpetrip.com) | 1 | 0 (GT timeout) | 0 | 0 | 311s |
| Texel (id=2, texelmaps.nl) | 0 (no recent events) | 1 (`wadden sea`) | 1 | 0 | 287s |

**Summary**: `{ total_destinations: 2, succeeded: 2, failed: 0, total_keywords_collected: 2 }`

Database state (`trending_data` last 15 minutes):
- ID 303: destination 1, keyword `website: Homepage`, source `website_analytics`, relevance 10.0, week 24, provenance `1c0ab60259f9...`
- ID 304: destination 2, keyword `wadden sea`, source `google_trends`, relevance 4.7, week 24

## Manual trigger (development / debugging)

```bash
cd /var/www/api.holidaibutler.com/platform-core
node -e "
import('./node_modules/@temporalio/client/lib/index.js').then(async m => {
  const conn = await m.Connection.connect({ address: 'localhost:7233' });
  const client = new m.Client({ connection: conn, namespace: 'hb-production' });
  const handle = await client.workflow.start('trendspotterWeeklyWorkflow', {
    args: [{ triggeredBy: 'manual-debug' }],
    taskQueue: 'hb-agents',
    workflowId: 'trendspotter-manual-' + Date.now(),
  });
  console.log('Workflow ID:', handle.workflowId);
  const result = await handle.result();
  console.log('Result:', JSON.stringify(result, null, 2));
  await conn.close();
});
"
```

Reisleider on-demand voor 1 destination:
```bash
node -e "
import('./node_modules/@temporalio/client/lib/index.js').then(async m => {
  const conn = await m.Connection.connect({ address: 'localhost:7233' });
  const client = new m.Client({ connection: conn, namespace: 'hb-production' });
  const handle = await client.workflow.start('reisleiderContextWorkflow', {
    args: [{ destinationId: 1, triggeredBy: 'manual-debug' }],
    taskQueue: 'hb-agents',
    workflowId: 'reisleider-manual-' + Date.now(),
  });
  console.log('Result:', JSON.stringify(await handle.result(), null, 2));
  await conn.close();
});
"
```

## Schedule management

Setup (idempotent, run once after deploy):
```bash
cd /var/www/api.holidaibutler.com/platform-core
node scripts/temporal/setupTrendspotterSchedule.js
```

Delete schedule (pause activation):
```bash
node scripts/temporal/setupTrendspotterSchedule.js --delete
```

List schedules:
```bash
node -e "
import('./node_modules/@temporalio/client/lib/index.js').then(async m => {
  const conn = await m.Connection.connect({ address: 'localhost:7233' });
  const client = new m.Client({ connection: conn, namespace: 'hb-production' });
  for await (const s of client.schedule.list()) {
    console.log(s.scheduleId, '→ next:', s.info?.nextActionTimes?.[0]);
  }
  await conn.close();
});
"
```

## Cost-log integration

CostLog enum extended (commit volgt deze sessie):
- Added: `'simpleanalytics'`, `'sistrix'` (sistrix was used by INC-2026-06-10-002 but never registered)
- Existing: `claude`, `mistral`, `apify`, `mailerlite`, `hetzner`, `openweather`, `deepl`, `other`

`websiteTrafficCollector` schrijft `service='simpleanalytics', operation='pages+events', cost=0.0` per destination cycle (free-tier SA — cost tracked voor audit-trail consistency).

`reisleider` schrijft `service='simpleanalytics', operation='reisleider-context-aggregate'` per Reisleider invocation met SA-call.

## Known issues + follow-up (separate session)

### Issue 1 — MongoDB cost-log buffer timeout in Temporal-worker context (MEDIUM)

**Symptoom**: `[websiteTrafficCollector] cost-log failed (non-blocking): Operation cost_logs.insertOne() buffering timed out after 10000ms`

**Diagnose**: Lazy-import van `CostLog.js` in Temporal-activity-context establisheert geen mongoose-connection. Andere agents (weather, content) draaien in main API process waar mongoose al connected is via app-bootstrap.

**Impact**: Trending_data wordt correct geschreven (MySQL connection werkt), maar cost-log audit-trail voor SA-calls ontbreekt momenteel. Niet-blocking voor functionaliteit.

**Resolution (tweede sessie)**:
- Optie A: explicit `mongoose.connect()` check in `logCost()` helper met automatic reconnect
- Optie B: shared `costLogger.js` service met connection-pooling die door zowel main API als Temporal worker gebruikt wordt
- Optie C: post-workflow batch-write naar cost_logs via main API endpoint

Recommendation: Optie B (shared service) — consistent met Trendspotter+Reisleider DRY-principle aanbevolen in INC-003 §7 punt 3.

### Issue 2 — Google Trends per-keyword timeout

**Symptoom**: `[GoogleTrendsCollector] Failed for keyword "calpe": The operation was aborted due to timeout`

**Diagnose**: Apify Google Trends Actor heeft per-call latency die soms > timeout (~30s). Voor 5+ keywords per destination = cumulatief lang.

**Impact**: Sommige keywords gemist; aggregate-counts lager dan optimaal. Niet-fatal.

**Resolution (separate scope)**: parallelisatie + retry-policy in `googleTrendsCollector`. Niet onderdeel van activation-scope.

### Issue 3 — Brand-knowledge filter ontbreekt (DEFERRED to second session)

**Status**: Per Frank's spawn-task scope §6 — `buildBrandContextStructured()` integratie in trendAggregator om page-titles vs POI/brand-knowledge entities te matchen. Niet vandaag geïmplementeerd; trending-data wordt nu raw saved.

**Impact**: Cosmetic content-strategy noise (off-brand pageviews komen door als trending-keyword). Niet-blocker voor downstream consumers die zelf filtering kunnen toepassen.

**Resolution (tweede sessie)**: voeg `brandContext = await buildBrandContextStructured(destId)` toe in `websiteTrafficCollector.collect`, filter trends waar `keyword` niet matched met `brandContext.entities` of `brandContext.sources`.

## Monitoring (Tempo trace queries)

Trendspotter spans verschijnen onder service-name `hb-temporal-worker` via OpenTelemetry auto-instrumentation. Tempo HTTP API:

```bash
# Recent trendspotter activities (last 1 hour)
curl -s "http://localhost:3200/api/search?tags=service.name=hb-temporal-worker&start=$(date -u -d '1 hour ago' +%s)&end=$(date -u +%s)&limit=20" | jq '.traces[] | select(.rootServiceName == "hb-temporal-worker")'

# Workflow failures (Sentry)
# https://sentry.holidaibutler.com → project hb-platform-core → search "trendspotter"
```

## Roadmap (Q3 2026 — not in scope)

- Trendspotter UI in admin-portal: dashboard voor trending-data per destination + week + source filter
- Content-redacteur consumption: AI-content-generation triggers obv top-N trending keywords per week
- A/B testing: trending-driven content vs evergreen baseline → conversion-impact metrics
- Multi-source weighting: SimpleAnalytics own-site signals krijgen hogere relevance bij content-strategy beslissing (own-audience > broader market)

## Files (deploy 2026-06-10)

| File | Status | Description |
|---|---|---|
| `platform-core/src/services/orchestrator/costController/models/CostLog.js` | modified | + `simpleanalytics`, `sistrix` in enum |
| `platform-core/src/services/agents/trendspotter/websiteTrafficCollector.js` | v2.1.0 → v2.2.0 | + logCost helper + provenance generator + raw_data JSON write |
| `platform-core/src/services/agents/trendspotter/index.js` | v1.0.0 → v1.1.0 | + websiteTrafficCollector orchestration + per-source isolation |
| `platform-core/src/services/agents/reisleider/index.js` | modified | + inline cost-log in SA-block |
| `platform-core/src/temporal/activities/agentActivities.js` | new | Wraps trendspotter + reisleider + getActiveDestinationIdsForSA |
| `platform-core/src/temporal/activities/index.js` | modified | Imports + exports agentActivities |
| `platform-core/src/temporal/workflows/trendspotterWeeklyWorkflow.js` | new | Weekly cron workflow with per-destination retry |
| `platform-core/src/temporal/workflows/reisleiderContextWorkflow.js` | new | On-demand context-aggregation workflow |
| `platform-core/src/temporal/workflows/index.js` | modified | + 2 new workflow exports |
| `platform-core/scripts/temporal/setupTrendspotterSchedule.js` | new | Idempotent Temporal Schedule registration |
| `docs/agents/trendspotter-activation.md` | new | This document |

## Version log

- v1.0.0 (2026-06-10): initial activation — registration + workflows + scheduling + first manual verification
