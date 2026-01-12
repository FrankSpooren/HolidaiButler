# HolidaiButler Claude Agents Implementatieplan

> **Versie**: 2.0  
> **Datum**: 12 januari 2026  
> **Auteur**: Claude AI (Anthropic)  
> **Opdrachtgever**: Frank Spooren  
> **Status**: Ter Bespreking

⚠️ **VERTROUWELIJK**: Dit document bevat bedrijfsgevoelige informatie. Niet delen zonder toestemming van de eigenaar.

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Architectuur Overzicht](#2-architectuur-overzicht)
3. [Owner Interface & Workflows](#3-owner-interface--workflows)
4. [POI Tier Strategie](#4-poi-tier-strategie-ai-driven)
5. [Skills Architectuur](#5-skills-architectuur)
6. [Implementatie Tijdlijn](#6-implementatie-tijdlijn)
7. [Bijlage A: Agent Specificaties](#bijlage-a-complete-agent-specificaties)
8. [Bijlage B: Security & API Keys](#bijlage-b-security--api-keys)
9. [Bijlage C: Glossary](#bijlage-c-glossary)

---

## 1. Executive Summary

Dit document beschrijft een enterprise-level implementatieplan voor Claude Agents binnen het HolidaiButler platform. Het plan is gebaseerd op uitgebreide analyse en feedback van de opdrachtgever.

### 1.1 Kernpunten

- 17 gespecialiseerde agents in 4 functionele lagen
- Orchestrator Agent als centrale coördinator met cost monitoring
- Owner Interface voor directe communicatie en approval workflows
- Volledige integratie met 10 externe platformen
- GDPR-compliant met automatische user data verwijdering
- Modulaire, flexibele architectuur voor toekomstige uitbreiding
- AI-driven POI Tier classificatie met multi-source data
- 12-weeks gefaseerd implementatietraject

### 1.2 Verbeterpunten t.o.v. v1.0

| # | Verbetering | Beschrijving |
|---|-------------|--------------|
| 1 | Owner Interface | Dedicated agent voor owner communicatie |
| 2 | Disaster Recovery | Uurlijkse backups voor kritieke data |
| 3 | Cost Controller | Monitoring van API kosten en budgetten |
| 4 | POI Tier Strategie | AI-driven classificatie met gewogen scores |
| 5 | Multi-Environment Monitoring | Dev, Test én Production monitoring |
| 6 | Skills Versioning | Per-bestemming skills met versie tracking |
| 7 | Flexibele Approval Timeouts | Aanpasbare wachttijden in workflows |
| 8 | Volledige Agent Specs | Alle 17 agents volledig gespecificeerd |

---

## 2. Architectuur Overzicht

### 2.1 Agent Hiërarchie

De architectuur bestaat uit 17 agents verdeeld over 4 lagen:

| # | Agent | Laag | Prioriteit |
|---|-------|------|------------|
| 0 | Orchestrator Agent | CORE | P0 |
| 1 | Owner Interface Agent | CORE | P0 |
| 2 | Platform Health Monitor | Operations | P0 |
| 3 | Data Sync Agent | Operations | P0 |
| 4 | Communication Flow Agent | Operations | P1 |
| 5 | HoliBot Sync Agent | Operations | P1 |
| 6 | Data Rights (GDPR) Agent | Operations | P0 |
| 7 | Content & Branding Agent | Operations | P1 |
| 8 | Disaster Recovery Agent | Operations | P1 |
| 9 | Test & Validation Agent | Operations | P2 |
| 10 | UX/UI Reviewer | Development | P1 |
| 11 | Code Reviewer | Development | P1 |
| 12 | Security Reviewer | Development | P1 |
| 13 | Quality Checker | Development | P2 |
| 14 | Architecture Agent | Strategy | P2 |
| 15 | Learning Agent | Strategy | P3 |
| 16 | Adaptive Agent | Strategy | P3 |

### 2.2 Externe Platformen & Integraties

| Platform | Functie | Verantwoordelijke Agent(s) |
|----------|---------|---------------------------|
| Claude Code | Coderen | Code Reviewer, Quality Checker |
| GitHub | Repository + CI/CD | Orchestrator, Dev agents |
| Hetzner Server (91.98.71.87) | Hosting | Health Monitor, DR Agent |
| Hetzner Database (MySQL) | Data storage | Data Sync, GDPR Agent |
| ChromaDB | Vector database | HoliBot Sync Agent |
| MistralAI | Chatbot LLM | HoliBot Sync, Learning Agent |
| MailerLite | Email marketing | Communication Agent |
| Apify | Data scraping | Data Sync Agent |
| Adyen Web SDK | Betalingen | Data Sync (toekomst) |
| Leaflet + React-Leaflet | Kaarten | UX/UI Reviewer |

### 2.3 Scheduling Strategie

**Gekozen aanpak: BullMQ + GitHub Actions combinatie**

| Use Case | Technologie | Reden |
|----------|-------------|-------|
| Periodieke taken | BullMQ cron patterns | Centrale queue, retry logic |
| Event-driven taken | BullMQ via webhooks | Async, geen data loss |
| Code review bij PR | GitHub Actions | Native GitHub integratie |
| Cost monitoring | BullMQ dagelijks | Budget alerts |

### 2.4 Monitoring: Sentry Setup

**Aanbeveling: Start met Sentry SaaS (gratis tier), migreer naar self-hosted bij groei.**

Waarom NIET op bestaande server (91.98.71.87)?
- Sentry is resource-heavy (50+ Docker containers)
- Monitoring paradox: kan zichzelf niet monitoren bij crash
- Productieproblemen kunnen Sentry raken

Sentry SaaS voordelen:
- Gratis tier: 5.000 errors/maand
- Geen infrastructuur beheer
- Automatische updates
- Snelle setup (15 minuten)

### 2.5 Backup Strategie (Verbeterd)

| Data Type | Frequentie | Retentie | Reden |
|-----------|------------|----------|-------|
| User accounts | Elk uur | 30 dagen | Kritieke data |
| Transactions/Bookings | Realtime (streaming) | 1 jaar | Financieel kritiek |
| POI data | Elke 6 uur | 30 dagen | Medium verandering |
| ChromaDB vectors | Dagelijks | 7 dagen | Kan geregenereerd |
| Config/Settings | Bij wijziging | 90 dagen | Event-driven |
| Full database dump | Dagelijks 03:00 | 30 dagen | Complete fallback |

### 2.6 Kosten Monitoring (Nieuw)

De Orchestrator Agent bevat een Cost Controller module:

| Service | Maandbudget | Alert bij | Hard Limit |
|---------|-------------|-----------|------------|
| Claude API | €300 | 50%, 75%, 90% | €400 |
| Apify | €100 | 50%, 75%, 90% | €150 |
| MistralAI | €50 | 50%, 75%, 90% | €75 |
| Hetzner | €50 | N/A (vast) | N/A |

**Owner ontvangt:**
- Wekelijkse cost summary
- Directe alert bij 75%+ budget
- Upgrade/downgrade aanbevelingen
- Subscription renewal reminders (30 dagen vooruit)

---

## 3. Owner Interface & Workflows

### 3.1 Approval Workflow (Flexibel)

Timeouts zijn aanpasbaar per situatie:

| Actie | Default Timeout | Aanpasbaar? | Auto-approve? |
|-------|-----------------|-------------|---------------|
| Code naar Dev | - | - | Ja |
| Code naar Test | - | - | Ja |
| Code naar Main | 24 uur | Ja (4h-72h) | Nee |
| POIs toevoegen | - | - | Ja |
| POIs verwijderen | 48 uur | Ja | Nee |
| User verwijderen | - | - | Ja (auto) |
| Partner verwijderen | 72 uur | Ja | Nee |
| Database schema wijziging | 48 uur | Ja | Nee |

> ⚠️ **Let op: User verwijderingen**  
> User account verwijderingen worden automatisch verwerkt (GDPR). Partner en POI-eigenaar verwijderingen vereisen WEL owner approval.

### 3.2 Monitored Environments

Platform Health Monitor checkt alle 3 omgevingen:

| Omgeving | Customer Portal | Admin Portal |
|----------|-----------------|--------------|
| Production | holidaibutler.com | admin.holidaibutler.com |
| Test/Staging | test.holidaibutler.com | admin.test.holidaibutler.com |
| Development | dev.holidaibutler.com | admin.dev.holidaibutler.com |

---

## 4. POI Tier Strategie (AI-Driven)

### 4.1 Score Berekening

Elke POI krijgt een gewogen score op basis van 4 variabelen:

| Variabele | Gewicht | Beschrijving |
|-----------|---------|--------------|
| Review Count | 30% | Aantal reviews afgelopen 24 maanden |
| Average Rating | 20% | Gemiddelde score afgelopen 24 maanden |
| Tourist Relevance | 30% | Toeristische actualiteit en relevantie |
| Booking Frequency | 20% | Frequentie boekingen/reserveringen |

```
score = (review_count × 0.30) + 
        (average_rating × 0.20) + 
        (tourist_relevance × 0.30) + 
        (booking_frequency × 0.20)
```

### 4.2 Tourist Relevance Score

Gebaseerd op categorie en externe bronnen:

| Categorie | Base Score | Externe Bronnen |
|-----------|------------|-----------------|
| Beaches | 1.0 | TripAdvisor, Airbnb |
| Food & Drinks | 1.0 | TheFork, TripAdvisor |
| Museums | 0.9 | GetYourGuide, Google |
| Historical Sites | 0.8 | TripAdvisor, Booking.com |
| Hiking/Cycling | 0.7 | Komoot, AllTrails |
| Golf | 0.6 | GolfAdvisor |
| Healthcare | 0.6 | Google Maps |
| Shopping | 0.5 | Google Maps |

### 4.3 Tier Classificatie

| Tier | Score Range | Update Frequentie | Actie |
|------|-------------|-------------------|-------|
| 1 | ≥ 8.5 | Realtime | Hoogste prioriteit |
| 2 | ≥ 7.0 | Dagelijks | Hoge prioriteit |
| 3 | ≥ 5.0 | Wekelijks | Normale prioriteit |
| 4 | < 5.0 | Maandelijks | Lage prioriteit |

### 4.4 Data Bronnen

- Google Places (via Apify) - Primaire bron
- TripAdvisor - Reviews en rankings
- TheFork - Restaurant data
- Trustpilot - Aanvullende reviews
- Booking.com - Accommodatie data
- GetYourGuide - Activiteiten

### 4.5 Budget-Aware Scheduling

Het systeem houdt rekening met API kosten:
- Bij < 20% budget: skip low-change POIs
- Prioriteer Tier 1 en 2 altijd
- Kwartaal audit voor tier re-classificatie
- Goede mix van categorieën in Tier 1-2 waarborgen

---

## 5. Skills Architectuur

### 5.1 Multi-Destination Skills

Skills zijn georganiseerd per bestemming met versioning:

```
.claude/skills/
├── _shared/                    # Gedeeld (alle bestemmingen)
│   ├── gdpr.md
│   ├── brand-guidelines.md
│   └── api-standards.md
├── destinations/
│   ├── _template/              # Template nieuwe bestemming
│   ├── calpe/                  # v2.3.1
│   │   ├── DESTINATION.md
│   │   ├── poi-categories.md
│   │   └── local-events.md
│   └── texel/                  # v1.8.0
│       ├── DESTINATION.md
│       └── ...
└── versioning/
    ├── CHANGELOG.md
    └── deprecation-notices.md
```

### 5.2 Versioning Rules

- Elke skill heeft version tag in YAML frontmatter
- Semantic versioning: MAJOR.MINOR.PATCH
- CHANGELOG.md wordt automatisch bijgewerkt
- Deprecation notice 30 dagen voor verwijdering
- Quarterly audit van alle skills

---

## 6. Implementatie Tijdlijn

| Fase | Week | Focus | Deliverables |
|------|------|-------|--------------|
| 1 | 1-2 | Foundation | Sentry, CLAUDE.md, BullMQ, Skills folder |
| 2 | 3-4 | Core | Orchestrator, Owner Interface, Cost Controller |
| 3 | 5-6 | Operations P0 | Health Monitor, Data Sync, GDPR |
| 4 | 7-8 | Operations P1 | Comms, Branding, HoliBot, DR |
| 5 | 9-10 | Development | UX/UI, Code, Security, Quality |
| 6 | 11-12 | Strategy | Architecture, Learning, Adaptive |

---

## BIJLAGE A: Complete Agent Specificaties

Alle 17 agents met volledige specificaties conform de UX/UI Reviewer template.

---

### A.0 Orchestrator Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | CORE |
| **Prioriteit** | P0 - Kritiek |
| **Status** | Te implementeren |

#### Doel
Centrale coördinatie van alle agents, quality gate voor productie, en kosten monitoring

#### Werkproces
- Altijd fact-based, geen aannames
- Continue monitoring van alle agent activiteiten
- Prioriteer taken bij resource constraints
- Log alle beslissingen voor audit trail

#### Takenpakket
1. Workflow orchestratie - bepaal welke agents wanneer draaien
2. Quality Gate - finale review voor productie push
3. Conflict Resolution - voorkom en los agent conflicten op
4. Cost Controller - monitor API kosten en budgetten
5. Subscription Tracking - alert bij renewals
6. Performance Monitoring - track agent success rates
7. Audit Trail - log alle acties

#### Tools & Integraties
- BullMQ
- GitHub Actions
- Sentry API
- Cost APIs (Claude, Apify, Mistral)

#### Triggers
- Continu (always-on)
- Bij elke agent actie
- Dagelijks cost check

#### Output
- Agent status dashboard
- Cost reports
- Approval requests
- Audit logs

#### Escalatie naar Owner
- Budget overschrijding > 90%
- Kritieke agent failures
- Security incidents
- Conflicten die niet auto-resolved kunnen

---

### A.1 Owner Interface Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | CORE |
| **Prioriteit** | P0 - Kritiek |
| **Status** | Te implementeren |

#### Doel
Primaire communicatielaag tussen owner(s) en het agent systeem

#### Doelgroep/Context
Owner: Frank Spooren en compagnon. Email: info@holidaibutler.com

#### Werkproces
- Consolideer alle notificaties
- Prioriteer op urgentie (1-5 schaal)
- Format berichten helder en actionable
- Track response times en escaleer indien nodig

#### Takenpakket
1. Notificatie consolidatie - bundel gerelateerde alerts
2. Approval request formatting - context + opties + deadline
3. Dagelijkse briefing - 08:00 summary email
4. Wekelijkse digest - performance + kosten + issues
5. Urgentie classificatie - bepaal juiste kanaal
6. Response routing - stuur antwoorden naar juiste agent

#### Tools & Integraties
- MailerLite API
- SMS Gateway (optioneel)
- Dashboard API

#### Triggers
- Bij elke agent die owner input nodig heeft
- Dagelijks 08:00
- Wekelijks maandag 09:00

#### Output
- Email notificaties
- Dashboard updates
- SMS bij urgentie 4-5

#### Escalatie naar Owner
- Urgentie 4-5 altijd direct
- Geen response binnen timeout
- Onduidelijke situaties

---

### A.2 Platform Health Monitor

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P0 - Kritiek |
| **Status** | Te implementeren |

#### Doel
Continue monitoring van alle systemen en omgevingen

#### Werkproces
- Check elke 5 minuten
- Categoriseer issues op urgentie
- Auto-recovery waar mogelijk
- Escaleer persistent issues

#### Takenpakket
1. Server status check (91.98.71.87)
2. MySQL database connectiviteit
3. ChromaDB vector database health
4. API endpoints - ALLE omgevingen (prod, test, dev)
5. SSL certificaat expiry check
6. Disk space monitoring
7. Memory/CPU usage alerts
8. API key validity (Mistral, Apify, etc.)

#### Tools & Integraties
- SSH
- HTTP health endpoints
- MySQL client
- ChromaDB client
- Sentry API

#### Triggers
- Elke 5 minuten (cron)
- Bij deployment
- Bij error spike

#### Output
- Health dashboard
- Alert emails
- Sentry events
- Recovery logs

#### Escalatie naar Owner
- Urgentie 3+
- Herhaalde failures (3+ achtereen)
- Security-gerelateerde issues

---

### A.3 Data Sync Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P0 - Kritiek |
| **Status** | Te implementeren |

#### Doel
Synchronisatie van ALLE Hetzner database tabellen met externe bronnen

#### Werkproces
- Volg POI Tier strategie voor frequentie
- Cross-validate met meerdere bronnen
- Budget-aware scheduling
- Quarterly tier re-classificatie

#### Takenpakket
1. POI Discovery - nieuwe locaties detecteren
2. POI Update - bestaande data actualiseren (tier-based)
3. POI Removal - permanent gesloten POIs markeren
4. Q&A Generatie - 20 pairs per taal (NL/DE/EN) bij nieuwe POI
5. Review Sync - reviews < 2 jaar ophalen (6-maandelijks)
6. Event Sync - agenda tabellen bijwerken (dagelijks)
7. User/Admin sync - realtime via webhooks
8. POI Score berekening - weighted average
9. Tier classificatie - automatisch op basis van score

#### Tools & Integraties
- Apify Client
- MySQL (Sequelize)
- MongoDB
- MistralAI API
- TripAdvisor scraper
- TheFork API

#### Triggers
- Tier-based scheduling
- Webhooks voor realtime
- Quarterly audit

#### Output
- Updated database records
- Sync reports
- Tier changes log
- Budget usage report

#### Escalatie naar Owner
- Grote data discrepanties
- API failures persistent
- Budget > 75%
- Nieuwe bestemming toevoegen

---

### A.4 Communication Flow Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Automatisering van alle email flows voor users en partners

#### Doelgroep/Context
Users: holidaibutler.com registraties. Partners: admin.holidaibutler.com registraties.

#### Werkproces
- Gebruik MailerLite templates
- Respecteer 72-uur bevestigingstermijn
- Track open/click rates
- A/B test subject lines

#### Takenpakket
1. User registratie flow - bevestiging, reminder, welkom
2. User 72-uur timeout - verwijder onbevestigde registraties
3. Admin registratie - forward naar owner, await approval
4. Marketing optin flow - reminder na 7 dagen
5. Account wijziging notificatie
6. Transactionele emails - booking confirmations, etc.

#### Tools & Integraties
- MailerLite API
- MySQL (Users, AdminUsers)
- Webhook endpoints

#### Triggers
- Webhooks bij registratie
- Cron voor timeouts
- Bij account wijzigingen

#### Output
- Verzonden emails log
- Open/click rates
- Conversion metrics

#### Escalatie naar Owner
- Admin registratie (altijd)
- Bounce rate > 5%
- Delivery issues

---

### A.5 HoliBot Sync Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Synchronisatie van vectordatabase en HoliBot tabellen

#### Werkproces
- Sync na elke POI/Q&A update
- Validate embeddings kwaliteit
- Monitor MistralAI API usage

#### Takenpakket
1. POI embeddings genereren via MistralAI
2. ChromaDB updates na Data Sync
3. HoliBot tabellen sync (7 tabellen)
4. Embedding quality validation
5. Fallback response updates

#### Tools & Integraties
- ChromaDB client
- MistralAI API
- MySQL

#### Triggers
- Na Data Sync completion
- Bij Q&A updates
- Dagelijks consistency check

#### Output
- Updated vectors
- Sync status
- Quality metrics

#### Escalatie naar Owner
- Embedding failures
- High latency responses
- MistralAI quota issues

---

### A.6 Data Rights (GDPR) Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P0 - Kritiek |
| **Status** | Te implementeren |

#### Doel
GDPR compliance: data wijzigingen, verwijderingen, exports

#### Doelgroep/Context
GDPR Art. 15 (inzage), Art. 16 (rectificatie), Art. 17 (vergetelheid), Art. 20 (portabiliteit)

#### Werkproces
- User verwijderingen: AUTO-APPROVE
- Partner/POI verwijderingen: OWNER APPROVAL
- Audit trail voor alle acties
- Data export binnen 24 uur

#### Takenpakket
1. User account wijzigingen verwerken
2. User verwijdering - automatisch binnen 72 uur
3. Partner verwijdering - await owner approval
4. POI-eigenaar verwijdering - await owner approval
5. Data export genereren (JSON/CSV)
6. Audit trail bijhouden (30 dagen retentie)
7. Consent tracking

#### Tools & Integraties
- MySQL
- MongoDB
- MailerLite
- File system voor exports

#### Triggers
- Webhooks bij wijzigingen
- Verwijderingsverzoeken
- Export requests

#### Output
- Bevestigingsmails
- Export downloads
- Audit logs

#### Escalatie naar Owner
- Partner/POI verwijderingen (altijd)
- Ongebruikelijke patronen
- Bulk requests

---

### A.7 Content & Branding Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Waarborgen van consistente merkidentiteit en content kwaliteit

#### Doelgroep/Context
Doelgroep: West-Europese toeristen (30-70 jaar), gezinnen, stellen, premium segment

#### Werkproces
- Check alle content tegen brand guidelines
- Multi-language quality (NL/DE/EN)
- Tone of voice: premium, warm, Mediterranean

#### Takenpakket
1. Brand consistency check - logo, kleuren, fonts
2. POI beschrijvingen review (alle talen)
3. Email template quality check
4. Marketing content review
5. Error message humanization
6. SEO optimalisatie per taal

#### Tools & Integraties
- Content APIs
- Translation services
- Brand guidelines skill

#### Triggers
- Bij nieuwe content
- Bij template wijzigingen
- Weekly content audit

#### Output
- Content quality scores
- Brand compliance reports
- SEO metrics

#### Escalatie naar Owner
- Major brand violations
- Cultureel ongepaste content
- SEO problemen

---

### A.8 Disaster Recovery Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Backup management en disaster recovery procedures

#### Werkproces
- Uurlijkse backups voor kritieke data
- Test restores wekelijks
- Document recovery procedures

#### Takenpakket
1. Uurlijkse backup - User accounts, Transactions
2. 6-uurlijkse backup - POI data
3. Dagelijkse backup - Full database dump, ChromaDB
4. Event-driven backup - Config wijzigingen
5. Restore procedure testing
6. Recovery time tracking

#### Tools & Integraties
- MySQL dump
- MongoDB export
- ChromaDB backup
- Cloud storage (S3/Hetzner Storage)

#### Triggers
- Scheduled (zie frequenties)
- Bij config wijzigingen
- Na major deployments

#### Output
- Backup status reports
- Recovery test results
- Storage usage

#### Escalatie naar Owner
- Backup failures
- Restore test failures
- Storage > 80% capacity

---

### A.9 Test & Validation Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Operations |
| **Prioriteit** | P2 - Medium |
| **Status** | Te implementeren |

#### Doel
Automated testing en agent performance validation

#### Werkproces
- Run tests voor elke deployment
- Monitor agent success rates
- Track performance metrics

#### Takenpakket
1. Smoke tests na deployment
2. Integration tests - API endpoints
3. Agent performance tracking
4. Error rate monitoring
5. Response time analysis
6. Test coverage tracking

#### Tools & Integraties
- Vitest
- Jest
- Playwright
- Sentry API
- Custom metrics

#### Triggers
- Na elke deployment
- Dagelijkse test suite
- Bij agent anomalies

#### Output
- Test reports
- Performance dashboards
- Coverage reports

#### Escalatie naar Owner
- Test failures in production
- Performance degradatie > 20%
- Coverage < 70%

---

### A.10 UX/UI Reviewer

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Development |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Enterprise level kwaliteit & state-of-the-art Mediterranean tourism specialist HolidaiButler-platform

#### Doelgroep/Context
West-Europese toeristen (30-70 jaar), Gezinnen en stellen, Premium segment, Interesses: actief, natuur, cultuur, gastronomie, shoppen

#### Werkproces
- Altijd fact-based, geen aannames
- Input en opdrachten REGEL VOOR REGEL analyseren (niet scannen)
- Punt voor punt oppakken, uitwerken en controlemechanisme inbouwen + verifiëren
- Volledige context project gebruiken (conversation_search + project_knowledge)

#### Takenpakket
1. Combineren design thinking met evidence-based design
2. Werken vanuit het principe van de consument
3. Intuïtief gebruik van app/website waarborgen
4. UX-principes toepassen: Miller's Law (keuzestress), Jakob's Law (patronen), Proximity, Hick's Law (progressive disclosure), Fitts' Law (thumb-friendly), Accessibility (WCAG), Trust building
5. Layout check - positioning, spacing
6. Styling check - logo, colors, fonts conform design system
7. Content hierarchy - juiste volgorde en emphasis
8. Responsiveness - mobile, tablet, desktop

#### Tools & Integraties
- Playwright screenshots
- Lighthouse API
- Accessibility checkers
- Design system skill

#### Triggers
- Bij PR met UI changes
- Na deployment
- Weekly full audit

#### Output
- UX review reports
- Accessibility scores
- Lighthouse metrics
- Screenshots met annotaties

#### Escalatie naar Owner
- WCAG violations
- Major UX issues
- Performance < 80

---

### A.11 Code Reviewer

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Development |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Code quality bewaken conform HolidaiButler standaarden

#### Doelgroep/Context
Tech stack: React 19, TypeScript, Node.js 18+, Express 4, Sequelize, Mongoose

#### Werkproces
- Review elke PR automatisch
- Focus op patterns, niet syntax
- Geef actionable feedback
- Leer van codebase conventies

#### Takenpakket
1. TypeScript strict mode compliance
2. Error handling aanwezigheid
3. Console.logs detecteren en flaggen
4. Hardcoded secrets detecteren
5. Async/await correct gebruik
6. Component naming conventions
7. API response typing
8. Database query optimization
9. Code duplication detectie

#### Tools & Integraties
- GitHub API
- ESLint
- TypeScript compiler
- AST analysis

#### Triggers
- Bij elke PR
- Scheduled codebase scans

#### Output
- PR comments
- Code quality scores
- Technical debt tracking

#### Escalatie naar Owner
- Security issues
- Breaking changes
- Major performance issues

---

### A.12 Security Reviewer

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Development |
| **Prioriteit** | P1 - Hoog |
| **Status** | Te implementeren |

#### Doel
Security audits en vulnerability detectie

#### Werkproces
- Scan alle code changes
- Monitor dependencies
- Check configurations
- Validate secrets handling

#### Takenpakket
1. API key exposure detectie
2. SQL injection vulnerability scan
3. XSS prevention check
4. CORS configuratie validatie
5. Authentication/Authorization review
6. Input validation check
7. Rate limiting verification
8. GDPR compliance in code
9. Dependency vulnerability scan (npm audit)

#### Tools & Integraties
- npm audit
- OWASP tools
- Secret scanners
- GitHub security features

#### Triggers
- Bij elke PR
- Daily dependency scan
- Weekly full audit

#### Output
- Security reports
- Vulnerability list
- Remediation suggestions

#### Escalatie naar Owner
- Critical vulnerabilities
- Exposed secrets
- Authentication bypasses

---

### A.13 Quality Checker

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Development |
| **Prioriteit** | P2 - Medium |
| **Status** | Te implementeren |

#### Doel
Automated quality gates en metrics tracking

#### Werkproces
- Block deployment bij failures
- Track trends over tijd
- Suggest improvements

#### Takenpakket
1. ESLint/Prettier compliance
2. Test coverage check (minimum 70%)
3. Bundle size analysis (< 500KB gzipped)
4. Lighthouse scores tracking
5. Broken link detection
6. API documentation completeness
7. TypeScript error count

#### Tools & Integraties
- ESLint
- Istanbul (coverage)
- Lighthouse CI
- Webpack analyzer

#### Triggers
- Bij elke PR
- Post-deployment
- Weekly trending

#### Output
- Quality dashboard
- Trend reports
- Blocking notifications

#### Escalatie naar Owner
- Coverage < 70%
- Lighthouse < 80
- Bundle size > 500KB

---

### A.14 Architecture Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Strategy |
| **Prioriteit** | P2 - Medium |
| **Status** | Te implementeren |

#### Doel
System design, architectural decisions, technology selection

#### Werkproces
- Document all decisions (ADRs)
- Evaluate trade-offs
- Plan for scale
- Track technical debt

#### Takenpakket
1. Architectural Decision Records (ADRs)
2. Technology Radar maintenance
3. System design reviews
4. Technical debt tracking
5. Scalability assessment
6. New feature architecture
7. Migration planning

#### Tools & Integraties
- Documentation tools
- Diagramming
- ADR templates

#### Triggers
- Bij major features
- Quarterly review
- Technology evaluations

#### Output
- ADRs
- Tech radar
- Architecture diagrams
- Debt backlog

#### Escalatie naar Owner
- Breaking architectural changes
- Major technology decisions
- Security architecture

---

### A.15 Learning Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Strategy |
| **Prioriteit** | P3 - Laag |
| **Status** | Te implementeren |

#### Doel
Leren van gebruikersgedrag en systeem performance

#### Werkproces
- Analyze patterns
- Generate insights
- Suggest improvements
- Feed back to other agents

#### Takenpakket
1. User behavior analysis - populaire POIs, zoektermen, drop-offs
2. HoliBot effectiveness - failed queries, user satisfaction
3. System performance learning - response times, bottlenecks
4. Content effectiveness - email rates, conversions
5. Model feedback loop - improve Q&A pairs

#### Tools & Integraties
- Analytics APIs
- Database queries
- ML pipelines

#### Triggers
- Daily analysis
- Weekly reports
- Monthly deep dives

#### Output
- Insight reports
- Improvement suggestions
- Training data updates

#### Escalatie naar Owner
- Major anomalies
- Negative trends
- Critical insights

---

### A.16 Adaptive Agent

| Eigenschap | Waarde |
|------------|--------|
| **Laag** | Strategy |
| **Prioriteit** | P3 - Laag |
| **Status** | Te implementeren |

#### Doel
Aanpassen aan veranderende omstandigheden en toekomstplanning

#### Werkproces
- Monitor external changes
- Plan for scenarios
- Recommend adaptations

#### Takenpakket
1. Scenario planning - traffic 10x, nieuwe bestemmingen
2. Scalability monitoring - thresholds, projections
3. Feature readiness assessment
4. Competitive intelligence - trends, features
5. Regulatory monitoring - GDPR changes, EU AI Act
6. Technology trend tracking

#### Tools & Integraties
- Web search
- Industry APIs
- Internal metrics

#### Triggers
- Monthly scenario review
- Quarterly strategy
- Ad-hoc alerts

#### Output
- Scenario plans
- Readiness assessments
- Strategic recommendations

#### Escalatie naar Owner
- Regulatory changes
- Competitive threats
- Capacity concerns

---

## BIJLAGE B: Security & API Keys

> 🚨 **KRITIEK: API Key Rotatie**  
> Zodra dit plan live gaat, ALLE API keys roteren. Keys stonden in plain text in oorspronkelijk document.

| Service | Actie | Nieuwe locatie |
|---------|-------|----------------|
| Mistral API | Regenereer | .env (MISTRAL_API_KEY) |
| MailerLite API | Regenereer | .env (MAILERLITE_API_KEY) |
| Apify Token | Regenereer | .env (APIFY_TOKEN) |
| Hetzner API | Regenereer | .env (HETZNER_API_TOKEN) |
| Claude API | Regenereer | .env (ANTHROPIC_API_KEY) |

---

## BIJLAGE C: Glossary

| Term | Definitie |
|------|-----------|
| Agent SDK | Anthropic's SDK voor autonome Claude agents |
| BullMQ | Redis-based job queue voor Node.js |
| ChromaDB | Open-source vector database voor AI embeddings |
| MCP | Model Context Protocol - standaard voor tool integratie |
| Orchestrator | Centrale agent die andere agents coördineert |
| POI | Point of Interest - locatie in de database |
| Progressive Disclosure | Laden van context alleen wanneer nodig |
| Skill | Herbruikbare kennisbundel voor Claude agents |
| Tier | Classificatie niveau voor POI update frequentie |
| Webhook | HTTP callback voor event-driven communicatie |

---

*--- Einde Document ---*
