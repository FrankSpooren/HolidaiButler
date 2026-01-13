# AGENT A.1: OWNER INTERFACE AGENT

## Basis Informatie

| Eigenschap | Waarde |
|------------|--------|
| **Naam** | Owner Interface Agent |
| **Laag** | CORE |
| **Prioriteit** | P0 - Kritiek |
| **Afhankelijk van** | Orchestrator Agent |

## Doel

Primaire communicatielaag tussen het agent systeem en de owners:
1. **Frank Spooren** - Co-founder/CCO (frankspooren@hotmail.com)
2. **Emiel Langeberg** - Co-founder/CTO (emiellangeberg@gmail.com)

## Architectuur

```
+-------------------------------------------------------------+
|                   OWNER INTERFACE AGENT                      |
+-------------------------------------------------------------+
|  +-----------+  +-----------+  +---------------------+       |
|  |Notification|  | Approval |  |    Response         |       |
|  |Consolidator|  | Manager  |  |    Router           |       |
|  +-----------+  +-----------+  +---------------------+       |
|                                                              |
|  +-----------+  +-----------+  +---------------------+       |
|  |  Daily    |  |  Weekly   |  |   Urgency           |       |
|  | Briefing  |  |  Digest   |  |   Classifier        |       |
|  +-----------+  +-----------+  +---------------------+       |
+-------------------------------------------------------------+
          |                |                    |
          v                v                    v
    +----------+    +--------------+    +--------------+
    |MailerLite|    |    SMS       |    |  Dashboard   |
    |  Email   |    | (Optional)   |    |    API       |
    +----------+    +--------------+    +--------------+
```

## Owners Configuratie

```javascript
const owners = {
  frank: {
    name: 'Frank Spooren',
    role: 'CCO',
    email: 'frankspooren@hotmail.com',
    altEmail: 'info@holidaibutler.com',
    phone: null, // SMS disabled
    preferences: {
      dailyBriefing: true,
      briefingTime: '08:00',
      timezone: 'Europe/Amsterdam',
      language: 'nl',
    },
    responsibilities: [
      'business-decisions',
      'partner-relations',
      'content-quality',
      'marketing',
    ],
  },

  emiel: {
    name: 'Emiel Langeberg',
    role: 'CTO',
    email: 'emiellangeberg@gmail.com',
    phone: null,
    preferences: {
      dailyBriefing: true,
      briefingTime: '08:00',
      timezone: 'Europe/Amsterdam',
      language: 'nl',
    },
    responsibilities: [
      'technical-decisions',
      'architecture',
      'security',
      'infrastructure',
    ],
  },
};
```

## Modules

### 1. Notification Consolidator

Bundelt gerelateerde notificaties om inbox overload te voorkomen:

```javascript
const consolidationRules = {
  // Bundel meerdere POI updates
  'poi-updates': {
    window: '1h',
    maxItems: 50,
    template: 'poi-batch-update',
  },

  // Bundel code review requests
  'code-reviews': {
    window: '4h',
    maxItems: 10,
    template: 'code-review-batch',
  },

  // Nooit bundelen - altijd direct
  'never-consolidate': [
    'security-incident',
    'production-down',
    'budget-critical',
    'partner-deletion',
  ],
};
```

### 2. Urgency Classifier

```javascript
const urgencyLevels = {
  1: {
    name: 'Informatief',
    description: 'Geen actie nodig, ter info',
    channel: 'daily-briefing',
    response: 'none',
  },
  2: {
    name: 'Laag',
    description: 'Actie gewenst binnen 1 week',
    channel: 'email',
    response: '7d',
  },
  3: {
    name: 'Medium',
    description: 'Actie gewenst binnen 48 uur',
    channel: 'email',
    response: '48h',
  },
  4: {
    name: 'Hoog',
    description: 'Actie vereist binnen 24 uur',
    channel: 'email-priority',
    response: '24h',
  },
  5: {
    name: 'Kritiek',
    description: 'Directe actie vereist',
    channel: 'email-sms',
    response: 'immediate',
  },
};

// Classificatie regels
const urgencyRules = {
  // Urgentie 5 - Kritiek
  'production-down': 5,
  'security-breach': 5,
  'data-leak': 5,

  // Urgentie 4 - Hoog
  'budget-90-percent': 4,
  'critical-agent-failure': 4,
  'partner-deletion-request': 4,
  'database-schema-change': 4,

  // Urgentie 3 - Medium
  'code-to-main': 3,
  'poi-deletion': 3,
  'budget-75-percent': 3,

  // Urgentie 2 - Laag
  'new-feature-proposal': 2,
  'performance-suggestion': 2,

  // Urgentie 1 - Informatief
  'daily-stats': 1,
  'weekly-summary': 1,
};
```

### 3. Approval Manager

```javascript
const approvalWorkflows = {
  'code-to-main': {
    requiredApprovers: ['frank', 'emiel'], // Either one
    approvalMode: 'any',
    timeout: '24h',
    timeoutAction: 'remind',
    maxReminders: 3,
    reminderInterval: '8h',
    context: [
      'pr-summary',
      'code-review-status',
      'test-results',
      'affected-files',
    ],
  },

  'partner-deletion': {
    requiredApprovers: ['frank'], // Business decision
    approvalMode: 'specific',
    timeout: '72h',
    timeoutAction: 'remind',
    context: [
      'partner-name',
      'reason',
      'affected-pois',
      'financial-impact',
    ],
  },

  'poi-bulk-deletion': {
    requiredApprovers: ['frank', 'emiel'],
    approvalMode: 'any',
    timeout: '48h',
    timeoutAction: 'remind',
    context: [
      'poi-count',
      'categories-affected',
      'reason',
    ],
  },

  'database-schema-change': {
    requiredApprovers: ['emiel'], // Technical decision
    approvalMode: 'specific',
    timeout: '48h',
    timeoutAction: 'remind',
    context: [
      'migration-sql',
      'rollback-plan',
      'affected-tables',
      'downtime-estimate',
    ],
  },

  'budget-increase': {
    requiredApprovers: ['frank', 'emiel'],
    approvalMode: 'all', // Both must approve
    timeout: '72h',
    timeoutAction: 'auto-deny',
    context: [
      'service',
      'current-budget',
      'requested-budget',
      'justification',
    ],
  },
};
```

### 4. Daily Briefing

```javascript
const dailyBriefingConfig = {
  schedule: '08:00',
  timezone: 'Europe/Amsterdam',

  sections: [
    {
      name: 'System Health',
      source: 'health-monitor',
      items: [
        'uptime-percentage',
        'error-count-24h',
        'response-time-avg',
      ],
    },
    {
      name: 'Pending Approvals',
      source: 'approval-manager',
      priority: 'high', // Bovenaan
    },
    {
      name: 'Cost Status',
      source: 'cost-controller',
      items: [
        'budget-usage-percentage',
        'projected-month-end',
        'anomalies',
      ],
    },
    {
      name: 'Agent Activity',
      source: 'orchestrator',
      items: [
        'tasks-completed-24h',
        'tasks-failed-24h',
        'active-agents',
      ],
    },
    {
      name: 'Platform Stats',
      source: 'database',
      items: [
        'active-users',
        'new-users-24h',
        'holibot-queries-24h',
      ],
    },
  ],

  template: 'daily-briefing-nl', // Nederlandse template
};
```

### 5. Weekly Digest

```javascript
const weeklyDigestConfig = {
  schedule: 'monday 09:00',
  timezone: 'Europe/Amsterdam',

  sections: [
    {
      name: 'Week Overview',
      items: [
        'total-tasks-completed',
        'total-errors',
        'uptime-percentage',
      ],
    },
    {
      name: 'Cost Report',
      items: [
        'total-spend',
        'budget-remaining',
        'cost-per-service',
        'comparison-last-week',
      ],
    },
    {
      name: 'Development Activity',
      items: [
        'prs-merged',
        'commits-count',
        'features-deployed',
      ],
    },
    {
      name: 'Data Quality',
      items: [
        'pois-added',
        'pois-updated',
        'pois-removed',
        'data-sync-success-rate',
      ],
    },
    {
      name: 'User Engagement',
      items: [
        'holibot-queries',
        'popular-queries',
        'failed-queries',
      ],
    },
    {
      name: 'Recommendations',
      source: 'learning-agent',
      items: [
        'improvement-suggestions',
        'anomalies-detected',
      ],
    },
  ],
};
```

### 6. Response Router

```javascript
const responseRouting = {
  // Approval responses
  'approval-granted': {
    actions: [
      'log-to-audit',
      'notify-requesting-agent',
      'execute-pending-action',
    ],
  },

  'approval-denied': {
    actions: [
      'log-to-audit',
      'notify-requesting-agent',
      'cancel-pending-action',
      'request-alternative', // Vraag om alternatief
    ],
  },

  // Owner commands
  'pause-agent': {
    validate: ['agent-exists'],
    actions: ['pause-agent', 'log-to-audit'],
  },

  'resume-agent': {
    validate: ['agent-exists', 'agent-paused'],
    actions: ['resume-agent', 'log-to-audit'],
  },

  'force-sync': {
    validate: ['destination-exists'],
    actions: ['trigger-data-sync', 'log-to-audit'],
  },
};
```

## Email Templates (MailerLite)

### Template: Approval Request

```html
<!-- Subject: [HolidaiButler] Goedkeuring vereist: {action_type} -->

Beste {owner_name},

Er is een actie die jouw goedkeuring vereist:

**Actie**: {action_description}
**Deadline**: {deadline}
**Urgentie**: {urgency_level}

**Context:**
{context_details}

**Opties:**
[Goedkeuren]({approve_url})
[Afwijzen]({deny_url})
[Meer info nodig]({info_url})

---
HolidaiButler Agent System
```

### Template: Daily Briefing

```html
<!-- Subject: [HolidaiButler] Dagelijkse Briefing - {date} -->

Goedemorgen {owner_name},

Hier is je dagelijkse update:

## Systeem Status
- Uptime: {uptime}%
- Errors (24h): {error_count}
- Response tijd: {avg_response_time}ms

## Wachtend op Goedkeuring
{pending_approvals_list}

## Kosten Status
- Budget gebruikt: {budget_used}%
- Verwacht einde maand: EUR{projected_cost}

## Agent Activiteit
- Taken voltooid: {tasks_completed}
- Taken gefaald: {tasks_failed}

---
[Bekijk dashboard]({dashboard_url})
```

## Triggers

| Trigger | Bron | Actie |
|---------|------|-------|
| Approval needed | Orchestrator | Send approval email |
| 08:00 daily | Cron | Send daily briefing |
| Monday 09:00 | Cron | Send weekly digest |
| Urgentie 4-5 | Any agent | Send immediate notification |
| Owner response | Email webhook | Route to appropriate agent |

## Technische Implementatie

### Bestandslocatie
```
platform-core/
├── src/
│   └── agents/
│       └── owner-interface/
│           ├── index.ts
│           ├── notificationConsolidator.ts
│           ├── urgencyClassifier.ts
│           ├── approvalManager.ts
│           ├── dailyBriefing.ts
│           ├── weeklyDigest.ts
│           ├── responseRouter.ts
│           ├── emailTemplates.ts
│           └── types.ts
```

### MailerLite Integratie

```typescript
// mailerlite.ts
import MailerLite from '@mailerlite/mailerlite-nodejs';

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY,
});

interface SendEmailParams {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

export async function sendOwnerEmail(params: SendEmailParams) {
  const { to, subject, template, variables } = params;

  // Log to audit trail
  await logToAudit({
    action: 'email-sent',
    target: to,
    template,
    timestamp: new Date(),
  });

  // Send via MailerLite
  return mailerlite.emails.send({
    from: 'agents@holidaibutler.com',
    to,
    subject,
    html: renderTemplate(template, variables),
  });
}
```

### Approval URL Handler

```typescript
// approvalHandler.ts
import express from 'express';

const router = express.Router();

// GET /api/v1/approvals/:id/approve
router.get('/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;

  // Validate token
  const approval = await validateApprovalToken(id, token);
  if (!approval) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Process approval
  await processApproval(id, 'approved');

  // Redirect to confirmation page
  res.redirect(`/approval-confirmed?id=${id}&action=approved`);
});

// GET /api/v1/approvals/:id/deny
router.get('/approvals/:id/deny', async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;

  const approval = await validateApprovalToken(id, token);
  if (!approval) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  await processApproval(id, 'denied');

  res.redirect(`/approval-confirmed?id=${id}&action=denied`);
});
```

## Dependencies

```json
{
  "@mailerlite/mailerlite-nodejs": "^1.x",
  "handlebars": "^4.x",
  "node-cron": "^3.x"
}
```

## Environment Variables

```bash
# MailerLite
MAILERLITE_API_KEY=

# Owner emails
OWNER_FRANK_EMAIL=frankspooren@hotmail.com
OWNER_EMIEL_EMAIL=emiellangeberg@gmail.com

# Approval URLs
APP_BASE_URL=https://api.holidaibutler.com
APPROVAL_TOKEN_SECRET=

# SMS (optional, disabled by default)
SMS_ENABLED=false
```

---

*Document versie 1.0 - Fase 2 Owner Interface Agent*
