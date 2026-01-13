# COST CONTROLLER MODULE

> Onderdeel van de Orchestrator Agent

## Basis Informatie

| Eigenschap | Waarde |
|------------|--------|
| **Naam** | Cost Controller |
| **Parent** | Orchestrator Agent |
| **Prioriteit** | P0 - Kritiek |
| **Type** | Module (niet standalone agent) |

## Doel

Real-time monitoring en beheer van alle API kosten en subscriptions om:
1. Budget overschrijdingen te voorkomen
2. Proactief te waarschuwen bij afwijkingen
3. Kosten te optimaliseren
4. Subscription renewals te tracken

## Service Budget Configuratie

```javascript
const serviceBudgets = {
  // AI Services
  'claude-api': {
    provider: 'Anthropic',
    monthlyBudget: 300,
    hardLimit: 400,
    currency: 'EUR',
    billingCycle: 'monthly',
    apiEndpoint: 'https://api.anthropic.com/v1/usage',
    costUnit: 'tokens',
    alertThresholds: [0.50, 0.75, 0.90, 1.00],
    critical: true,
  },

  'mistral-ai': {
    provider: 'Mistral AI',
    monthlyBudget: 50,
    hardLimit: 75,
    currency: 'EUR',
    billingCycle: 'monthly',
    apiEndpoint: null, // Manual tracking via dashboard
    costUnit: 'tokens',
    alertThresholds: [0.50, 0.75, 0.90],
    critical: true, // HoliBot afhankelijk
  },

  // Data Services
  'apify': {
    provider: 'Apify',
    monthlyBudget: 100,
    hardLimit: 150,
    currency: 'EUR',
    billingCycle: 'monthly',
    apiEndpoint: 'https://api.apify.com/v2/users/me/usage',
    costUnit: 'compute-units',
    alertThresholds: [0.50, 0.75, 0.90],
    critical: false, // Can pause POI updates
  },

  // Infrastructure
  'hetzner': {
    provider: 'Hetzner',
    monthlyBudget: 50,
    hardLimit: null, // Fixed cost
    currency: 'EUR',
    billingCycle: 'monthly',
    fixed: true,
    components: [
      { name: 'VPS CX31', cost: 35 },
      { name: 'Storage Box', cost: 10 },
      { name: 'Backup', cost: 5 },
    ],
  },

  // Marketing
  'mailerlite': {
    provider: 'MailerLite',
    monthlyBudget: 15,
    hardLimit: null,
    currency: 'EUR',
    billingCycle: 'monthly',
    fixed: true,
    plan: 'Growing Business',
    subscriberLimit: 1000,
  },

  // Monitoring
  'sentry': {
    provider: 'Sentry',
    monthlyBudget: 0,
    hardLimit: null,
    currency: 'EUR',
    billingCycle: 'monthly',
    plan: 'Free',
    eventLimit: 5000,
    alertThresholds: [0.80], // Alert at 80% of event quota
  },
};
```

## Totaal Budget Overzicht

| Service | Maandbudget | Hard Limit | Type |
|---------|-------------|------------|------|
| Claude API | EUR300 | EUR400 | Variabel |
| Mistral AI | EUR50 | EUR75 | Variabel |
| Apify | EUR100 | EUR150 | Variabel |
| Hetzner | EUR50 | - | Vast |
| MailerLite | EUR15 | - | Vast |
| Sentry | EUR0 | - | Gratis |
| **TOTAAL** | **EUR515** | **EUR640** | |

## Alert Systeem

```javascript
const alertActions = {
  // 50% - Alleen loggen
  0.50: {
    action: 'log',
    message: '{service} heeft 50% van maandbudget bereikt',
    notify: false,
  },

  // 75% - Owner notificatie
  0.75: {
    action: 'notify',
    urgency: 3,
    message: '{service} heeft 75% van maandbudget bereikt (EUR{spent}/EUR{budget})',
    notify: true,
    suggestions: [
      'Controleer recent usage patterns',
      'Overweeg rate limiting aan te passen',
    ],
  },

  // 90% - Urgente notificatie
  0.90: {
    action: 'notify-urgent',
    urgency: 4,
    message: '{service} nadert budgetlimiet: EUR{spent}/EUR{budget} (90%)',
    notify: true,
    suggestions: [
      'Non-kritieke taken pauzeren',
      'Budget verhoging overwegen',
    ],
  },

  // 100% - Kritieke actie
  1.00: {
    action: 'pause-non-critical',
    urgency: 5,
    message: '{service} heeft budgetlimiet bereikt!',
    notify: true,
    autoActions: [
      'Pauzeer POI sync voor Tier 3-4',
      'Pauzeer non-kritieke agents',
      'Activeer budget-saving mode',
    ],
  },
};
```

## Cost Tracking Implementation

```typescript
// costTracker.ts

interface CostEntry {
  service: string;
  timestamp: Date;
  amount: number;
  currency: string;
  units: number;
  unitType: string;
  metadata?: Record<string, any>;
}

interface DailyCostSummary {
  date: string;
  services: {
    [service: string]: {
      cost: number;
      units: number;
      percentageOfBudget: number;
    };
  };
  totalCost: number;
  projectedMonthEnd: number;
}

class CostTracker {
  private db: MongoDB;

  async recordCost(entry: CostEntry): Promise<void> {
    await this.db.collection('cost_entries').insertOne({
      ...entry,
      createdAt: new Date(),
    });

    // Check thresholds
    await this.checkBudgetThresholds(entry.service);
  }

  async getDailySpend(service: string, date: Date): Promise<number> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const result = await this.db.collection('cost_entries').aggregate([
      {
        $match: {
          service,
          timestamp: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    return result[0]?.total || 0;
  }

  async getMonthlySpend(service: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.db.collection('cost_entries').aggregate([
      {
        $match: {
          service,
          timestamp: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    return result[0]?.total || 0;
  }

  async checkBudgetThresholds(service: string): Promise<void> {
    const config = serviceBudgets[service];
    if (!config || config.fixed) return;

    const spent = await this.getMonthlySpend(service);
    const percentage = spent / config.monthlyBudget;

    for (const threshold of config.alertThresholds) {
      if (percentage >= threshold) {
        const alertConfig = alertActions[threshold];
        await this.triggerAlert(service, spent, config.monthlyBudget, alertConfig);
      }
    }
  }

  async getProjectedMonthEndCost(service: string): Promise<number> {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();

    const spent = await this.getMonthlySpend(service);
    const dailyAverage = spent / currentDay;

    return dailyAverage * daysInMonth;
  }
}
```

## API Integrations

### Claude API Usage

```typescript
// claudeUsage.ts
async function getClaudeUsage(): Promise<UsageData> {
  // Note: Anthropic doesn't have a public usage API
  // Cost tracking happens via response headers

  // Option 1: Track from response headers
  // x-ratelimit-limit-tokens
  // x-ratelimit-remaining-tokens

  // Option 2: Manual calculation
  // Input tokens: $3/million (Sonnet)
  // Output tokens: $15/million (Sonnet)

  return {
    inputTokens: await getTokenCount('input'),
    outputTokens: await getTokenCount('output'),
    estimatedCost: calculateCost(inputTokens, outputTokens),
  };
}

function calculateClaudeCost(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet 3.5 pricing (convert to EUR)
  const inputCostPerMillion = 3 * 0.92; // USD to EUR
  const outputCostPerMillion = 15 * 0.92;

  return (
    (inputTokens / 1_000_000) * inputCostPerMillion +
    (outputTokens / 1_000_000) * outputCostPerMillion
  );
}
```

### Apify Usage

```typescript
// apifyUsage.ts
async function getApifyUsage(): Promise<UsageData> {
  const response = await fetch('https://api.apify.com/v2/users/me', {
    headers: {
      Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
    },
  });

  const data = await response.json();

  return {
    computeUnits: data.proxy?.stats?.currentBillingPeriod || 0,
    estimatedCost: data.plan?.monthlyUsageBillable || 0,
  };
}
```

## Subscription Tracking

```javascript
const subscriptionReminders = {
  services: [
    {
      name: 'claude-api',
      renewalDate: null, // Pay as you go
      type: 'usage-based',
    },
    {
      name: 'apify',
      renewalDate: '2026-02-15',
      type: 'monthly',
      reminderDays: [30, 14, 7, 1],
    },
    {
      name: 'hetzner',
      renewalDate: '2026-02-01',
      type: 'monthly',
      autoRenew: true,
      reminderDays: [7],
    },
    {
      name: 'mailerlite',
      renewalDate: '2026-02-20',
      type: 'monthly',
      reminderDays: [14, 7],
    },
  ],

  checkDaily: true,
  notifyOwners: ['frank', 'emiel'],
};
```

## Reports

### Daily Cost Report (08:00)

```javascript
const dailyCostReport = {
  schedule: '0 8 * * *',

  content: {
    yesterday: {
      totalSpend: true,
      byService: true,
      anomalies: true,
    },
    monthToDate: {
      totalSpend: true,
      budgetUsage: true,
      projectedMonthEnd: true,
    },
    alerts: {
      budgetWarnings: true,
      thresholdsCrossed: true,
    },
  },

  format: 'email',
  recipients: ['daily-briefing'], // Included in daily briefing
};
```

### Weekly Cost Report (Maandag 09:00)

```javascript
const weeklyCostReport = {
  schedule: '0 9 * * 1',

  content: {
    weekSummary: {
      totalSpend: true,
      byService: true,
      comparison: 'previous-week',
    },
    trends: {
      costTrend: true,
      usageTrend: true,
      projections: true,
    },
    recommendations: {
      optimizations: true,
      budgetAdjustments: true,
    },
    upcomingRenewals: {
      next30Days: true,
    },
  },

  format: 'email',
  recipients: ['weekly-digest'],
};
```

## Budget Saving Mode

Wanneer budget kritiek wordt:

```javascript
const budgetSavingMode = {
  triggers: [
    'any-service-at-100-percent',
    'total-spend-at-90-percent',
  ],

  actions: {
    // POI Sync
    'poi-sync': {
      tier1: 'continue', // Kritiek, altijd door
      tier2: 'reduce-frequency', // Van 2x naar 1x per dag
      tier3: 'pause', // Pauzeer
      tier4: 'pause', // Pauzeer
    },

    // Agents
    'learning-agent': 'pause',
    'adaptive-agent': 'pause',
    'test-validation': 'reduce', // Alleen kritieke tests

    // Features
    'holibot-responses': 'cache-more', // Meer caching
    'email-marketing': 'pause-non-critical',
  },

  autoDisable: {
    condition: 'new-month-start',
    orCondition: 'budget-increased',
  },
};
```

## Database Schema

```sql
-- cost_entries collection (MongoDB)
{
  _id: ObjectId,
  service: String,           -- 'claude-api', 'apify', etc.
  timestamp: Date,
  amount: Number,            -- Cost in EUR
  units: Number,             -- Tokens, compute units, etc.
  unitType: String,          -- 'tokens', 'compute-units'
  operation: String,         -- 'holibot-query', 'poi-sync', etc.
  metadata: Object,
  createdAt: Date
}

-- budget_alerts collection (MongoDB)
{
  _id: ObjectId,
  service: String,
  threshold: Number,         -- 0.50, 0.75, 0.90, 1.00
  triggeredAt: Date,
  acknowledged: Boolean,
  acknowledgedBy: String,
  acknowledgedAt: Date
}

-- subscription_reminders collection (MongoDB)
{
  _id: ObjectId,
  service: String,
  renewalDate: Date,
  remindersSent: [Date],
  status: String             -- 'upcoming', 'due', 'renewed'
}
```

## Bestandslocatie

```
platform-core/
├── src/
│   └── agents/
│       └── orchestrator/
│           └── costController/
│               ├── index.ts
│               ├── tracker.ts
│               ├── alerts.ts
│               ├── reports.ts
│               ├── subscriptions.ts
│               ├── budgetSavingMode.ts
│               ├── integrations/
│               │   ├── claude.ts
│               │   ├── apify.ts
│               │   ├── mistral.ts
│               │   └── index.ts
│               └── types.ts
```

## Environment Variables

```bash
# API Keys for usage tracking
ANTHROPIC_API_KEY=
APIFY_TOKEN=
MISTRAL_API_KEY=

# Budget configuration
BUDGET_CLAUDE_MONTHLY=300
BUDGET_APIFY_MONTHLY=100
BUDGET_MISTRAL_MONTHLY=50

# Alerts
COST_ALERT_EMAIL=info@holidaibutler.com
BUDGET_SAVING_MODE_AUTO=true
```

---

*Document versie 1.0 - Cost Controller Module*
