# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 1.0.0  
> **Laatst bijgewerkt**: 12 januari 2026  
> **Eigenaar**: Frank Spooren  
> **Project**: HolidaiButler - AI-Powered Tourism Platform

---

## 🎯 Project Mission

HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen, met huidige focus op **Costa Blanca (Calpe/Alicante)** en **Texel**.

### Kernwaarden
- **Personalisatie**: AI-driven aanbevelingen gebaseerd op gebruikersvoorkeuren
- **Kwaliteit**: Enterprise-level, state-of-the-art user experience
- **Betrouwbaarheid**: Accurate, actuele data uit gerenommeerde bronnen
- **Privacy**: GDPR-compliant, EU AI Act ready

---

## 👤 Over de Eigenaar

**Frank Spooren** is een strategisch marketeer, GEEN developer.

### Communicatie Richtlijnen
- Leg technische zaken **altijd begrijpelijk** uit
- Geef **stap-voor-stap instructies** waar nodig
- Benoem **risico's en impact** duidelijk
- Vraag bij twijfel **altijd bevestiging** voordat je kritieke acties uitvoert
- Stuur rapportages naar: **info@holidaibutler.com**

### Werkproces Vereisten
1. **Altijd fact-based** - geen aannames maken
2. **Input regel voor regel analyseren** - niet scannen
3. **Punt voor punt uitwerken** met controlemechanisme + verificatie
4. **Volledige context gebruiken** - raadpleeg skills en documentatie

---

## 🏗️ Repository Structuur

```
HolidaiButler/
├── .claude/                    # Claude Agent configuratie
│   ├── skills/                 # Agent Skills (zie Skills sectie)
│   └── commands/               # Custom commands
│
├── customer-portal/            # React 19 + Tailwind (holidaibutler.com)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
│
├── admin-module/               # React 18 + MUI (admin.holidaibutler.com)
│   ├── src/
│   └── package.json
│
├── platform-core/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   └── middleware/
│   └── package.json
│
├── modules/
│   ├── agenda-module/          # Events en agenda
│   ├── payment-module/         # Adyen integratie
│   ├── reservations-module/    # Boekingen
│   └── ticketing-module/       # Ticket verkoop
│
├── infrastructure/             # Docker configs
├── docs/                       # Documentatie
└── agents/                     # Claude Agent implementaties
```

---

## 🔧 Tech Stack

### Customer Portal (holidaibutler.com)
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React + TypeScript | 19 |
| Build | Vite | 7 |
| Styling | Tailwind CSS | 4 |
| State | Zustand + TanStack Query | 5 |
| Routing | React Router | 7 |
| Forms | React Hook Form + Zod | - |
| i18n | i18next | - |
| Maps | Leaflet + React-Leaflet | - |
| Animaties | Framer Motion | - |
| Betalingen | Adyen Web SDK | - |

### Admin Portal (admin.holidaibutler.com)
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React | 18 |
| Build | Vite | 4 |
| UI Library | Material UI (MUI) | 5 |
| State | Zustand + React Query | 4/3 |
| Routing | React Router | 6 |
| Charts | Recharts | - |
| WYSIWYG | React Quill | - |

### Backend (Platform Core)
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Runtime | Node.js | 18+ |
| Framework | Express | 4 |
| Database | MySQL (Sequelize) + MongoDB (Mongoose) | - |
| Caching | Redis + ioredis | - |
| Queue | BullMQ | - |
| Auth | JWT + bcrypt | - |
| Logging | Winston | - |
| Monitoring | Sentry | - |
| Email | MailerLite | - |
| Scraping | Apify Client | - |

### DevOps
| Tool | Doel |
|------|------|
| Docker + Docker Compose | Containerization |
| Vitest, Jest, Playwright | Testing |
| ESLint + Prettier | Linting |
| GitHub Actions | CI/CD |
| BullMQ | Job scheduling |

---

## 🌿 Branch Strategy

| Branch | Doel | URL | Auto-deploy |
|--------|------|-----|-------------|
| `main` | Productie | holidaibutler.com | Ja, na approval |
| `test` | Staging/QA | test.holidaibutler.com | Ja |
| `dev` | Development | dev.holidaibutler.com | Ja |
| `feature/*` | Nieuwe features | - | Nee |

### Git Workflow
1. Nieuwe feature → maak branch van `dev`
2. Development klaar → PR naar `dev`
3. Code review door agent(s)
4. Merge naar `dev` → auto-deploy naar dev environment
5. QA goedkeuring → merge naar `test`
6. Owner approval → merge naar `main`

---

## 🔌 Externe Integraties

### API Keys (NOOIT hardcoden!)
Alle keys staan in `.env` files (niet in repo):

```bash
# Locatie: platform-core/.env
ANTHROPIC_API_KEY=       # Claude API
MISTRAL_API_KEY=         # HoliBot LLM
MAILERLITE_API_KEY=      # Email marketing
APIFY_TOKEN=             # Data scraping
HETZNER_API_TOKEN=       # Server management
ADYEN_API_KEY=           # Betalingen
SENTRY_DSN=              # Error monitoring
```

### Integratie Overzicht
| Platform | Functie | Documentatie |
|----------|---------|--------------|
| Hetzner | Server hosting (91.98.71.87) | infrastructure/README.md |
| GitHub | Code repository | .github/README.md |
| ChromaDB | Vector database | docs/chromadb.md |
| MistralAI | Chatbot LLM | docs/holibot.md |
| MailerLite | Email flows | docs/mailerlite.md |
| Apify | Data scraping | docs/apify.md |
| Adyen | Betalingen | docs/adyen.md |
| Sentry | Error monitoring | docs/sentry.md |

---

## 📊 Database Structuur

### MySQL (Hetzner - attexel database)
| Tabel | Beschrijving | Sync Frequentie |
|-------|--------------|-----------------|
| POIs | Points of Interest | Tier-based (zie POI Strategy) |
| Q&As | Vraag-antwoord pairs | Bij POI update |
| Reviews | Gebruikersreviews | 6-maandelijks |
| Users | Klantaccounts | Realtime |
| AdminUsers | Partner accounts | Realtime |
| agenda | Events | Dagelijks |
| agenda_dates | Event datums | Bij event update |
| Tickets | Ticketverkoop | Realtime |
| Transactions | Betalingen | Realtime |

### MongoDB (via Mongoose)
- Chat logs
- User preferences
- Analytics data
- Session data

### ChromaDB (Vector Database)
- POI embeddings
- Q&A embeddings
- Semantic search indices

---

## 🤖 Claude Agents Architectuur

Dit project maakt gebruik van 17 Claude Agents:

### Core Layer
- **Orchestrator Agent** - Centrale coördinatie
- **Owner Interface Agent** - Communicatie met eigenaar

### Operations Layer
- **Platform Health Monitor** - System monitoring
- **Data Sync Agent** - Database synchronisatie
- **Communication Flow Agent** - Email automatisering
- **HoliBot Sync Agent** - Vector database
- **Data Rights (GDPR) Agent** - Privacy compliance
- **Content & Branding Agent** - Merkidentiteit
- **Disaster Recovery Agent** - Backup & recovery
- **Test & Validation Agent** - Quality assurance

### Development Layer
- **UX/UI Reviewer** - Interface kwaliteit
- **Code Reviewer** - Code quality
- **Security Reviewer** - Security audits
- **Quality Checker** - Tests & linting

### Strategy Layer
- **Architecture Agent** - System design
- **Learning Agent** - Analytics & insights
- **Adaptive Agent** - Future planning

**Volledige specificaties**: Zie `.claude/skills/agents/` directory

---

## ⚠️ Kritieke Regels

### NOOIT doen:
- ❌ Direct naar `main` pushen zonder approval
- ❌ API keys in code of documenten zetten
- ❌ Dependencies updaten zonder impact check
- ❌ Database schema's wijzigen zonder migratie
- ❌ API endpoints verwijderen (breaking changes)
- ❌ User data verwijderen zonder GDPR protocol
- ❌ POI data verwijderen zonder owner approval

### ALTIJD doen:
- ✅ Tests draaien voor commit (`npm test`)
- ✅ Conventional commit messages gebruiken
- ✅ TypeScript types toevoegen aan nieuwe code
- ✅ Error handling implementeren
- ✅ Owner notificeren bij kritieke wijzigingen
- ✅ Skills raadplegen voor domeinkennis
- ✅ Audit trail bijhouden voor data wijzigingen

---

## 📝 Commit Message Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: customer, admin, core, modules, infra, agents

Voorbeelden:
feat(customer): add POI thumbnail component
fix(core): resolve database connection timeout
docs(agents): update orchestrator specification
```

---

## 🎨 Design System

### Brand Colors
| Naam | Hex | Gebruik |
|------|-----|---------|
| Header Gradient Start | #7FA594 | Header achtergrond |
| Header Gradient Mid | #5E8B7E | - |
| Header Gradient End | #4A7066 | - |
| Gouden Accent | #D4AF37 | CTAs, highlights |
| Button Primary | #8BA99D | Knoppen |
| Text Primary | #2C3E50 | Hoofdtekst |
| Text Secondary | #687684 | Subtekst |

### Typography
- **Font**: Inter
- **Headings**: Bold, Primary color
- **Body**: Regular, 16px

### UX Principes
- Miller's Law: Beperk keuzestress
- Jakob's Law: Herkenbare patronen
- Proximity Principle: Groepeer gerelateerde elementen
- Hick's Law: Progressive disclosure
- Fitts' Law: Mobile thumb-friendly CTAs
- WCAG: Accessibility compliance

---

## 🌍 Multi-Destination Support

### Huidige Bestemmingen
1. **Calpe** (Costa Blanca, Spanje) - Primary
2. **Texel** (Nederland) - Secondary

### Bestemming-specifieke Skills
Elke bestemming heeft eigen skills in `.claude/skills/destinations/`:
- `DESTINATION.md` - Algemene info
- `poi-categories.md` - POI categorieën
- `local-events.md` - Lokale evenementen
- `seasonal.md` - Seizoensinformatie

---

## 📈 POI Tier Strategie

POIs worden automatisch geclassificeerd op basis van een gewogen score:

### Score Berekening
```
score = (review_count × 0.30) + 
        (average_rating × 0.20) + 
        (tourist_relevance × 0.30) + 
        (booking_frequency × 0.20)
```

### Tier Classificatie
| Tier | Score | Update Frequentie |
|------|-------|-------------------|
| 1 | ≥ 8.5 | Realtime |
| 2 | ≥ 7.0 | Dagelijks |
| 3 | ≥ 5.0 | Wekelijks |
| 4 | < 5.0 | Maandelijks |

### Data Bronnen
- Google Places (via Apify)
- TripAdvisor
- TheFork
- Trustpilot
- Booking.com

---

## 🔐 Security & Compliance

### GDPR Compliance
- User data: Verwijdering binnen 72 uur na verzoek
- Partner data: Owner approval vereist
- Audit trail: 30 dagen retentie
- Data export: Op verzoek binnen 24 uur

### EU AI Act Compliance
- Transparantie over AI gebruik
- Menselijke controle via approval workflows
- Bias monitoring in aanbevelingen

---

## 📞 Contact & Escalatie

| Urgentie | Actie | Timeout |
|----------|-------|---------|
| 1 (Info) | Email digest | Wekelijks |
| 2 (Laag) | Email | 24 uur |
| 3 (Medium) | Email + Dashboard alert | 4 uur |
| 4 (Hoog) | Email + SMS | 1 uur |
| 5 (Kritiek) | Alle kanalen | Direct |

**Owner Email**: info@holidaibutler.com

---

## 📚 Gerelateerde Documentatie

- Agent Specificaties: `.claude/skills/agents/`
- API Documentatie: `docs/api/`
- Deployment Guide: `infrastructure/README.md`
- Contributing Guide: `CONTRIBUTING.md`

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
