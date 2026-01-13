# Fase 2: Core Agents Implementatie

> **Periode**: Week 3-4
> **Focus**: Orchestrator Agent, Owner Interface Agent, Cost Controller
> **Status**: In ontwikkeling

---

## Overzicht Fase 2

Fase 2 implementeert de **CORE laag** van het agent systeem - de twee kritieke agents die alle andere agents aansturen en de communicatie met de owners verzorgen.

| Agent | Prioriteit | Functie |
|-------|------------|---------|
| Orchestrator Agent | P0 | Centrale coördinatie + Cost Controller |
| Owner Interface Agent | P0 | Communicatie met Frank & Emiel |

---

## Business Context (uit Investor Presentatie)

HolidaiButler positioneert zich als:
- **"The AI-Powered Travel Companion for Alicante, Built on Local Trust"**
- Focus op **hyper-lokale relevantie** en **data kwaliteit**
- **EU AI Act compliant** (USP vs. US-based competitors)
- Doelgroep: 30-70 jaar, €120+/dag, 3+ dagen verblijf
- Markten: SPA, UK, NL, GER, BE, FRA, Nordics

### Differentiators t.o.v. Concurrentie
| Feature | HolidaiButler | Mindtrip | Gemini AI | GuideGeek |
|---------|---------------|----------|-----------|-----------|
| Local data alliance | Ja | Gedeeltelijk | Nee | Nee |
| Personalization | Ja | Ja | Ja | Gedeeltelijk |
| Real-time updates | Ja | Gedeeltelijk | Nee | Nee |
| EU AI Act compliant | Ja | Nee | Gedeeltelijk | Nee |

**Impact op agents**: Alle agents moeten deze USPs waarborgen in hun operaties.

---

# AGENT A.0: ORCHESTRATOR AGENT

## Basis Informatie

| Eigenschap | Waarde |
|------------|--------|
| **Naam** | Orchestrator Agent |
| **Laag** | CORE |
| **Prioriteit** | P0 - Kritiek |
| **Includes** | Cost Controller module |

## Doel

Centrale coördinatie van alle 17 agents met:
1. Workflow orchestratie
2. Quality gate voor productie
3. Kosten monitoring (Cost Controller)
4. Conflict resolution
5. Audit trail

## Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Scheduler  │  │   Router    │  │   Cost Controller   │  │
│  │  (BullMQ)   │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Quality   │  │  Conflict   │  │    Audit Trail      │  │
│  │    Gate     │  │  Resolver   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
    │Operations│    │ Development  │    │   Strategy   │
    │  Agents  │    │    Agents    │    │    Agents    │
    └──────────┘    └──────────────┘    └──────────────┘
```

## Modules

### 1. Scheduler (BullMQ)

```javascript
// Scheduling configuratie
const schedules = {
  // Health checks
  'health-check': '*/5 * * * *',           // Elke 5 min

  // Data sync (tier-based)
  'poi-sync-tier1': '0 * * * *',           // Elk uur
  'poi-sync-tier2': '0 6,18 * * *',        // 2x per dag
  'poi-sync-tier3': '0 3 * * 0',           // Wekelijks
  'poi-sync-tier4': '0 3 1 * *',           // Maandelijks

  // Backups
  'backup-critical': '0 * * * *',          // Elk uur
  'backup-full': '0 3 * * *',              // Dagelijks 03:00

  // Cost monitoring
  'cost-check': '0 8 * * *',               // Dagelijks 08:00
  'cost-weekly-report': '0 9 * * 1',       // Maandag 09:00

  // Maintenance
  'chromadb-consistency': '0 4 * * *',     // Dagelijks 04:00
  'audit-cleanup': '0 2 * * 0',            // Wekelijks zondag
};
```

### 2. Router

Bepaalt welke agent(s) een taak moeten uitvoeren:

```javascript
const routingRules = {
  // Trigger -> Agent(s)
  'pr-created': ['code-reviewer', 'security-reviewer'],
  'pr-ui-changes': ['ux-ui-reviewer'],
  'poi-updated': ['holibot-sync', 'content-branding'],
  'user-deleted': ['gdpr-agent'],
  'partner-deleted': ['gdpr-agent', 'owner-interface'], // Needs approval
  'deployment-complete': ['health-monitor', 'test-validation'],
  'error-spike': ['health-monitor', 'owner-interface'],
  'budget-75': ['owner-interface'],
  'budget-90': ['owner-interface', 'cost-controller-pause'],
};
```

### 3. Cost Controller

```javascript
const costConfig = {
  budgets: {
    'claude-api': { monthly: 300, currency: 'EUR', hardLimit: 400 },
    'apify': { monthly: 100, currency: 'EUR', hardLimit: 150 },
    'mistral-ai': { monthly: 50, currency: 'EUR', hardLimit: 75 },
    'hetzner': { monthly: 50, currency: 'EUR', fixed: true },
    'mailerlite': { monthly: 15, currency: 'EUR', fixed: true },
  },

  alerts: [
    { threshold: 0.50, action: 'log' },
    { threshold: 0.75, action: 'notify-owner' },
    { threshold: 0.90, action: 'notify-owner-urgent' },
    { threshold: 1.00, action: 'pause-non-critical' },
  ],

  subscriptionReminders: {
    daysBefore: 30,
    services: ['claude-api', 'apify', 'mistral-ai', 'mailerlite'],
  },
};
```

### 4. Quality Gate

Voorkomt dat code naar productie gaat zonder volledige review:

```javascript
const qualityGate = {
  requiredChecks: [
    'code-reviewer-approved',
    'security-reviewer-approved',
    'tests-passed',
    'no-console-logs',
    'no-hardcoded-secrets',
    'typescript-no-errors',
  ],

  conditionalChecks: {
    'ui-changes': ['ux-ui-reviewer-approved', 'lighthouse-80+'],
    'database-changes': ['owner-approval'],
    'api-changes': ['api-docs-updated'],
  },

  autoApprove: {
    'dev-branch': true,
    'test-branch': true,
    'main-branch': false, // Always needs owner approval
  },
};
```

### 5. Conflict Resolver

```javascript
const conflictRules = {
  // Twee agents willen dezelfde resource
  'database-write-conflict': 'queue-fifo',

  // Agents geven tegenstrijdig advies
  'review-disagreement': 'escalate-to-owner',

  // Resource exhaustion
  'api-rate-limit': 'backoff-exponential',

  // Prioriteit conflicten
  'task-priority-conflict': 'p0-first',
};
```

### 6. Audit Trail

```javascript
const auditConfig = {
  logEvents: [
    'agent-started',
    'agent-completed',
    'agent-failed',
    'approval-requested',
    'approval-granted',
    'approval-denied',
    'deployment-triggered',
    'cost-alert',
    'escalation',
  ],

  storage: {
    type: 'mongodb',
    collection: 'agent_audit_logs',
    retention: '90d',
  },

  fields: [
    'timestamp',
    'agent_id',
    'action',
    'target',
    'result',
    'duration_ms',
    'metadata',
  ],
};
```

## Triggers

| Trigger | Frequentie | Beschrijving |
|---------|------------|--------------|
| Always-on | Continu | Luistert naar events |
| Scheduled | Cron-based | Zie scheduler config |
| Webhook | Event-driven | GitHub, MailerLite, etc. |
| Manual | On-demand | Owner request |

## Output

- Agent status dashboard
- Cost reports (dagelijks/wekelijks)
- Approval requests naar Owner Interface
- Audit logs
- Performance metrics

## Escalatie naar Owner

| Situatie | Urgentie | Kanaal |
|----------|----------|--------|
| Budget > 90% | 4 | Email + SMS |
| Kritieke agent failure | 4 | Email + SMS |
| Security incident | 5 | Direct call |
| Conflict niet oplosbaar | 3 | Email |
| Quality gate blocked 24h+ | 3 | Email |

## Technische Implementatie

### Bestandslocatie
```
platform-core/
├── src/
│   └── agents/
│       └── orchestrator/
│           ├── index.ts              # Main entry
│           ├── scheduler.ts          # BullMQ setup
│           ├── router.ts             # Event routing
│           ├── costController.ts     # Budget monitoring
│           ├── qualityGate.ts        # PR checks
│           ├── conflictResolver.ts   # Conflict handling
│           ├── auditTrail.ts         # Logging
│           └── types.ts              # TypeScript types
```

### Dependencies
```json
{
  "bullmq": "^4.x",
  "ioredis": "^5.x",
  "@sentry/node": "^7.x",
  "node-cron": "^3.x"
}
```

### Environment Variables
```bash
# Redis (voor BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cost APIs
ANTHROPIC_API_KEY=
APIFY_TOKEN=
MISTRAL_API_KEY=

# Alerts
ALERT_EMAIL=info@holidaibutler.com
ALERT_SMS_ENABLED=false
```

---

## Implementatie Stappenplan

### Week 3: Orchestrator Basis

| Dag | Taak | Deliverable |
|-----|------|-------------|
| 1 | Redis setup op Hetzner | Redis running |
| 2 | BullMQ scheduler implementeren | Basis schedules werken |
| 3 | Cost Controller API integrations | API reads werken |
| 4 | Audit trail MongoDB setup | Logging werkt |
| 5 | Testing & debugging | Orchestrator v0.1 |

### Week 4: Owner Interface & Integratie

| Dag | Taak | Deliverable |
|-----|------|-------------|
| 1-2 | Owner Interface Agent | Email notifications |
| 3 | Quality Gate basis | PR checks |
| 4 | Router implementeren | Event routing |
| 5 | End-to-end testing | Fase 2 complete |

---

*Document versie 1.0 - Fase 2 Orchestrator Agent*
