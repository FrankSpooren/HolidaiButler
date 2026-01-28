# Platform Core - READMEFIRST

> **Leestijd**: 5 minuten
> **Versie**: 3.2.0
> **Laatste update**: 28 januari 2026
> **Maintainer**: HolidaiButler Team

---

## Quick Start

1. Lees eerst: `../CLAUDE.md` (project context)
2. Environment setup: `cp .env.example .env`
3. Dependencies: `npm install`
4. Start Redis: `redis-server` (of via Docker)
5. Start development: `npm run dev`

---

## Module Overzicht

Platform Core is het hart van HolidaiButler - de centrale API gateway en orchestrator
voor alle modules, agents en scheduled jobs. Het beheert authenticatie, database
connecties, job scheduling en inter-module communicatie.

### Kernfunctionaliteit
- API Gateway (Express.js)
- Database connecties (MySQL + MongoDB + Redis)
- Agent Orchestrator (14 AI agents)
- Job Scheduler (35 BullMQ jobs)
- HoliBot RAG Chatbot (MistralAI + ChromaDB)
- GDPR Compliance Engine

---

## Multi-Destination Support

| Destination | Status | API Base | Config |
|-------------|--------|----------|--------|
| Calpe | Active | `/api/v1/*` | `config/destinations/calpe.config.js` |
| Texel | Planned | `/api/v1/*` | `config/destinations/texel.config.js` |
| Alicante | Planned | `/api/v1/*` | `config/destinations/alicante.config.js` |

### Destination Routing
Alle API endpoints accepteren:
- Header: `X-Destination-ID: calpe`
- Query parameter: `?destination=calpe`
- Default: `calpe` (indien niet gespecificeerd)

### Database Multi-Tenancy
Tabellen met `destination_id` kolom:
- `POI` - Points of Interest
- `QA` - Q&A pairs
- `agenda` - Events
- `Users` - User accounts
- `user_journeys` - Communication flows
- `holibot_sessions` - Chat sessions

---

## Dependencies

### Interne Modules
| Module | Relatie | Communicatie |
|--------|---------|--------------|
| Admin Module | Consumer | REST API + Redis Events |
| Ticketing Module | Consumer | REST API |
| Payment Module | Consumer | REST API + Webhooks |
| Customer Portal | Consumer | REST API |

### Externe Services
| Service | Doel | Credentials |
|---------|------|-------------|
| MySQL (Hetzner) | Primary DB | `DB_*` vars |
| MongoDB | Document store | `MONGODB_URI` |
| Redis | Cache + Queue | `REDIS_HOST/PORT` |
| MistralAI | LLM + Embeddings | `MISTRAL_API_KEY` |
| ChromaDB Cloud | Vector DB | `CHROMADB_*` vars |
| MailerLite | Email automation | `MAILERLITE_API_KEY` |
| Apify | Web scraping | `APIFY_TOKEN` |
| Threema | Critical alerts | `THREEMA_*` vars |
| Bugsink | Error monitoring | `SENTRY_DSN` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment mode |
| `PORT` | No | 3000 | API server port |
| `DB_HOST` | Yes | - | MySQL host |
| `DB_USER` | Yes | - | MySQL user |
| `DB_PASSWORD` | Yes | - | MySQL password |
| `DB_NAME` | Yes | - | MySQL database name |
| `REDIS_HOST` | No | localhost | Redis host |
| `REDIS_PORT` | No | 6379 | Redis port |
| `MISTRAL_API_KEY` | Yes | - | MistralAI API key |
| `CHROMADB_API_KEY` | Yes | - | ChromaDB Cloud API key |
| `CHROMADB_TENANT` | Yes | - | ChromaDB tenant ID |
| `CHROMADB_DATABASE` | Yes | - | ChromaDB database |
| `MAILERLITE_API_KEY` | Yes | - | MailerLite API key |
| `OWNER_EMAIL` | No | info@holidaibutler.com | Owner email |

---

## API Endpoints

### Base URL
- Production: `https://api.holidaibutler.com`
- Test: `https://api.test.holidaibutler.com`
- Dev: `https://api.dev.holidaibutler.com`

### Key Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/holibot/chat` | HoliBot chat | JWT |
| GET | `/api/v1/pois` | List POIs | No |
| GET | `/api/v1/pois/:id` | Get POI details | No |
| GET | `/api/v1/agenda` | List events | No |
| POST | `/api/v1/auth/login` | User login | No |
| POST | `/api/v1/auth/register` | User registration | No |

---

## Scheduled Jobs (35 totaal)

### Core Jobs (4)
- `health-check` - Elk uur
- `daily-briefing` - 08:00 dagelijks
- `cost-check` - Elke 6 uur
- `weekly-cost-report` - Maandag 09:00

### Data Sync Jobs (13)
- `poi-sync-tier1/2/3/4` - Tier-based POI sync
- `review-sync-tier12/34` - Review synchronization
- `qa-sync-tier12/34` - Q&A synchronization
- etc.

### HoliBot Sync Jobs (4)
- `holibot-poi-sync` - 06:30 dagelijks
- `holibot-qa-sync` - 07:00 dagelijks
- `holibot-full-reindex` - Zondag 04:00
- `holibot-cleanup` - 05:00 dagelijks

Zie CLAUDE.md voor volledige job overzicht.

---

## Directory Structure

```
platform-core/
├── src/
│   ├── routes/           # API routes
│   ├── controllers/      # Request handlers
│   ├── models/           # Database models
│   ├── services/
│   │   ├── holibot/      # HoliBot chatbot
│   │   ├── orchestrator/ # Job scheduler
│   │   └── agents/       # AI agents (14)
│   └── middleware/       # Auth, validation, etc.
├── config/
│   ├── shared.config.js          # Platform-wide config
│   └── destinations/
│       ├── index.js              # Config loader
│       ├── calpe.config.js       # Calpe config
│       ├── texel.config.js       # Texel config
│       └── alicante.config.js    # Alicante config
├── migrations/           # SQL migrations
└── package.json
```

---

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

---

## Deployment

### Via GitHub Actions
Push naar de juiste branch triggert automatische deployment:
- `dev` -> api.dev.holidaibutler.com
- `test` -> api.test.holidaibutler.com
- `main` -> api.holidaibutler.com

### Deployment Volgorde (KRITIEK)
**ALTIJD deployen in volgorde: dev -> test -> main**

```bash
git push origin dev          # Wacht op completion
git push origin dev:test     # Wacht op completion
git push origin dev:main     # Productie
```

### Server Details
- IP: 91.98.71.87 (Hetzner)
- Path: `/var/www/api.holidaibutler.com/platform-core`
- PM2 Process: `holidaibutler-api`

---

## Gerelateerde Documentatie

- [CLAUDE.md](../CLAUDE.md) - Project context (SINGLE SOURCE OF TRUTH)
- [CLAUDE_AGENTS_MASTERPLAN.md](../docs/CLAUDE_AGENTS_MASTERPLAN.md) - Agent architectuur
- [Destination Configs](./config/destinations/) - Multi-destination configuration

---

## Contact

- **Eigenaar**: Frank Spooren (info@holidaibutler.com)
- **Bugs**: GitHub Issues
- **Security**: info@holidaibutler.com
