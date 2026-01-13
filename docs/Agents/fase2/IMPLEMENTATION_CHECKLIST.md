# Fase 2: Implementatie Checklist

> **Periode**: Week 3-4
> **Doel**: Orchestrator Agent, Owner Interface Agent, Cost Controller operationeel

---

## Pre-Implementatie Checklist

### Infrastructuur
- [ ] Redis geinstalleerd op Hetzner server
- [ ] MongoDB collection voor audit logs aangemaakt
- [ ] BullMQ dependencies geinstalleerd
- [ ] MailerLite API key beschikbaar

### Accounts & Credentials
- [ ] Anthropic usage dashboard toegang
- [ ] Apify account met API token
- [ ] Mistral AI account
- [ ] MailerLite account met API key

### Owners Configuratie
- [ ] Frank's email bevestigd: frankspooren@hotmail.com
- [ ] Emiel's email bevestigd: emiellangeberg@gmail.com
- [ ] SMS notificaties: disabled (bevestigen)
- [ ] Dagelijkse briefing tijd: 08:00 CET (bevestigen)

---

## Week 3: Orchestrator Agent

### Dag 1: Redis & BullMQ Setup

```bash
# Op Hetzner server
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Test
redis-cli ping
# Expected: PONG
```

```bash
# In platform-core
cd /var/www/api.holidaibutler.com/platform-core
npm install bullmq ioredis
```

**Deliverable**: Redis running, BullMQ geinstalleerd

---

### Dag 2: Scheduler Implementatie

```bash
# Maak agent folder structuur
mkdir -p src/agents/orchestrator
```

Implementeer:
- [ ] `src/agents/orchestrator/scheduler.ts`
- [ ] Basis cron jobs voor health check
- [ ] Test met simpele logging job

**Deliverable**: Scheduler draait, jobs worden gelogd

---

### Dag 3: Cost Controller Basis

Implementeer:
- [ ] `src/agents/orchestrator/costController/tracker.ts`
- [ ] MongoDB schema voor cost_entries
- [ ] Handmatige cost entry functie

**Deliverable**: Kosten kunnen worden gelogd naar database

---

### Dag 4: Audit Trail

Implementeer:
- [ ] `src/agents/orchestrator/auditTrail.ts`
- [ ] MongoDB schema voor audit_logs
- [ ] Logging helper functies

**Deliverable**: Alle acties worden gelogd

---

### Dag 5: Testing & Integratie

- [ ] End-to-end test scheduler
- [ ] Test audit trail logging
- [ ] Test cost tracking
- [ ] Bug fixes

**Deliverable**: Orchestrator v0.1 stabiel

---

## Week 4: Owner Interface & Finalisatie

### Dag 1: Owner Interface Basis

```bash
mkdir -p src/agents/owner-interface
npm install @mailerlite/mailerlite-nodejs handlebars
```

Implementeer:
- [ ] `src/agents/owner-interface/index.ts`
- [ ] MailerLite integratie
- [ ] Basis email versturen functie

**Deliverable**: Test email succesvol verstuurd

---

### Dag 2: Daily Briefing

Implementeer:
- [ ] `src/agents/owner-interface/dailyBriefing.ts`
- [ ] Email template (Handlebars)
- [ ] Cron job voor 08:00

**Deliverable**: Dagelijkse briefing email wordt verstuurd

---

### Dag 3: Approval System

Implementeer:
- [ ] `src/agents/owner-interface/approvalManager.ts`
- [ ] Approval request email template
- [ ] API endpoints voor approve/deny
- [ ] Token validatie

**Deliverable**: Approval workflow werkt end-to-end

---

### Dag 4: Integratie Orchestrator <-> Owner Interface

Implementeer:
- [ ] Router in Orchestrator
- [ ] Event handling
- [ ] Urgency classifier

**Deliverable**: Orchestrator kan Owner Interface triggeren

---

### Dag 5: Testing & Go-Live

- [ ] Full end-to-end test
- [ ] Test met echte approval flow
- [ ] Test cost alerts
- [ ] Documentatie bijwerken
- [ ] Go-live Fase 2

**Deliverable**: Fase 2 compleet

---

## Bestanden om te Maken

```
platform-core/src/agents/
├── orchestrator/
│   ├── index.ts
│   ├── scheduler.ts
│   ├── router.ts
│   ├── qualityGate.ts
│   ├── conflictResolver.ts
│   ├── auditTrail.ts
│   ├── costController/
│   │   ├── index.ts
│   │   ├── tracker.ts
│   │   ├── alerts.ts
│   │   ├── reports.ts
│   │   └── types.ts
│   └── types.ts
│
└── owner-interface/
    ├── index.ts
    ├── notificationConsolidator.ts
    ├── urgencyClassifier.ts
    ├── approvalManager.ts
    ├── dailyBriefing.ts
    ├── weeklyDigest.ts
    ├── responseRouter.ts
    ├── templates/
    │   ├── daily-briefing.hbs
    │   ├── weekly-digest.hbs
    │   ├── approval-request.hbs
    │   └── cost-alert.hbs
    └── types.ts
```

---

## Environment Variables toe te voegen

```bash
# .env toevoegingen voor Fase 2

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MailerLite
MAILERLITE_API_KEY=your-api-key-here

# Owners
OWNER_FRANK_EMAIL=frankspooren@hotmail.com
OWNER_EMIEL_EMAIL=emiellangeberg@gmail.com

# Budgets
BUDGET_CLAUDE_MONTHLY=300
BUDGET_APIFY_MONTHLY=100
BUDGET_MISTRAL_MONTHLY=50

# Approval System
APPROVAL_TOKEN_SECRET=generate-random-secret
APP_BASE_URL=https://api.holidaibutler.com
```

---

## Definition of Done - Fase 2

### Orchestrator Agent
- [ ] Scheduler draait met alle geplande jobs
- [ ] Audit trail logt alle acties
- [ ] Cost tracking werkt voor Claude API
- [ ] Router kan events naar juiste agents sturen

### Owner Interface Agent
- [ ] Dagelijkse briefing wordt verstuurd om 08:00
- [ ] Approval emails worden correct verstuurd
- [ ] Approve/Deny links werken
- [ ] Urgentie classificatie werkt

### Cost Controller
- [ ] Budget usage wordt bijgehouden
- [ ] Alerts worden getriggerd bij thresholds
- [ ] Weekly cost report wordt gegenereerd

### Integratie
- [ ] Orchestrator kan Owner Interface triggeren
- [ ] Owner responses worden correct gerouteerd
- [ ] Sentry monitort alle errors

---

## Vragen voor Owner voordat we starten

1. **MailerLite API key**: Heb je deze beschikbaar?
2. **Redis**: Mag dit op dezelfde server als de app?
3. **Daily briefing tijd**: Is 08:00 CET correct?
4. **SMS notificaties**: Willen jullie dit activeren voor urgentie 5?
5. **Emiel**: Is hij op de hoogte van dit systeem en de email notificaties?

---

## Volgende Stap

Zodra bovenstaande vragen beantwoord zijn, kunnen we starten met:

**Week 3, Dag 1**: Redis installeren op Hetzner server via Claude Code

---

*Document versie 1.0 - Fase 2 Implementation Checklist*
