# Error Monitoring Platform Analyse: EU-Compliance voor HolidaiButler

**Datum**: 13 januari 2026
**Doel**: Strategische evaluatie Sentry.io vs. Europese alternatieven
**Context**: HolidaiButler USP is EU-compliance (GDPR, EU AI Act)

---

## Samenvatting: Strategische Misalignment

HolidaiButler positioneert zich als **"The AI-Powered Travel Companion for Alicante, Built on Local Trust"** met als USP:
- EU AI Act compliant (concurrentievoordeel vs. US-based competitors)
- Local data alliance
- GDPR compliance
- Europese technologie stack (Mistral AI, Hetzner, MailerLite)

**Het gebruik van Sentry.io (Amerikaans bedrijf) ondermijnt deze USP.**

---

## Vergelijkingsoverzicht

| Criterium | **Sentry.io** | **GlitchTip** | **Bugfender** | **Bugsink** | **AppSignal** |
|-----------|---------------|---------------|---------------|-------------|---------------|
| **Herkomst** | USA (San Francisco) | USA (Burke Software) | Duitsland | Nederland | Nederland |
| **EU Data Center** | Optioneel (Frankfurt) | Hosted (Frankfurt) | Nederland | Finland/Duitsland | EU |
| **GDPR Compliant** | Ja | Ja | Ja + ISO 27001 | Ja | Ja + ISO 27001 |
| **Juridische entiteit EU** | Nee | Nee | Ja | Ja | Ja |
| **Self-hosting optie** | Complex (16GB RAM min) | Simpel (4 componenten) | On-Premises | Zeer simpel (1 container) | Nee |
| **AI Training Data** | Opt-out nodig | Geen | Geen | Geen | Geen |
| **Sentry SDK Compatible** | Native | Ja | Eigen SDK | Ja | Eigen SDK |
| **Startup Geschikt** | Matig | Zeer goed | Matig | Zeer goed | Goed |

---

## Gedetailleerde Analyse per Criterium

### I. KOSTEN (Budget: Startup met beperkte middelen)

| Platform | Gratis Plan | Betaald (Basis) | Enterprise | Self-hosted Kosten |
|----------|-------------|-----------------|------------|-------------------|
| **Sentry.io** | 5K events/maand | €29/maand (Team) | €89/maand+ | Complex, €50+/maand infra |
| **GlitchTip** | Gratis (self-host) | €15/100K events | €50/500K | ~€5-10/maand (Hetzner) |
| **Bugfender** | Basic gratis | €29/maand | €399+/maand | Enterprise-only |
| **Bugsink** | Gratis (self-host) | €15/maand (hosted) | Op aanvraag | ~€5/maand (1 container) |
| **AppSignal** | 50K requests | €23/maand | Op aanvraag | Niet beschikbaar |

**Winnaar Kosten**: **Bugsink** of **GlitchTip** (self-hosted op Hetzner: ~€5/maand)

**HolidaiButler context**: Jullie hebben al een Hetzner server (91.98.71.87). Self-hosted Bugsink of GlitchTip kost praktisch €0 extra.

---

### II. REPUTATIE EN BETROUWBAARHEID

| Platform | Opgericht | Gebruikers | Reviews | Stabiliteit |
|----------|-----------|------------|---------|-------------|
| **Sentry.io** | 2012 | Miljoenen | 4.6/5 (G2) | Zeer stabiel |
| **GlitchTip** | 2020 | Duizenden | 4.5/5 | Stabiel |
| **Bugfender** | 2015 | 1.800+ teams | 4.7/5 | Stabiel |
| **Bugsink** | 2023 | Groeiend | Nieuw | Opkomend |
| **AppSignal** | 2012 | 1.500+ teams | 4.8/5 | Zeer stabiel |

**Winnaar Reputatie**: **Sentry.io** (marktleider) gevolgd door **AppSignal** (beste EU-alternatief)

**Nuance**: Bugsink is nieuw maar actief ontwikkeld door een Nederlandse developer. Voor startups is "battle-tested" minder kritiek dan voor enterprises.

---

### III. DATA PRIVACY & VEILIGHEID (GDPR, EU AI Act)

| Platform | GDPR | EU AI Act | Data Locatie | AI Training | US Cloud Act Risico |
|----------|------|-----------|--------------|-------------|---------------------|
| **Sentry.io** | Compliant | Onduidelijk | EU optie, maar US entity | Opt-out vereist | **JA** |
| **GlitchTip** | Compliant | N.v.t. | EU (Frankfurt) | Geen | US bedrijf |
| **Bugfender** | + ISO 27001 | Compliant | EU (Nederland) | Geen | **GEEN** |
| **Bugsink** | Compliant | Compliant | EU (Finland/DE) | Geen | **GEEN** |
| **AppSignal** | + ISO 27001 + HIPAA | Compliant | EU | Geen | **GEEN** |

**KRITIEK PUNT: US CLOUD Act**

Sentry.io is een Amerikaans bedrijf. Ondanks EU datacenter optie:
- Geen EU juridische entiteit
- Onderworpen aan US wetgeving (CLOUD Act, FISA Section 702)
- US autoriteiten kunnen data opvragen zonder EU kennis
- Dit is een **fundamenteel risico** dat niet op te lossen is met technische maatregelen

**Winnaar Privacy**: **AppSignal**, **Bugsink**, of **Bugfender** (alle drie 100% EU)

---

### IV. SERVICES IN RELATIE TOT HOLIDAIBUTLER BEHOEFTEN

HolidaiButler tech stack:
- Backend: Node.js/TypeScript (NestJS)
- Frontend: React (Customer Portal), React (Admin Portal)
- Database: PostgreSQL, ChromaDB
- Hosting: Hetzner (Linux)

| Platform | Node.js | React | PostgreSQL | Hetzner | Integraties |
|----------|---------|-------|------------|---------|-------------|
| **Sentry.io** | Uitstekend | Uitstekend | Ja | Ja | Slack, GitHub, Jira |
| **GlitchTip** | Via Sentry SDK | Via Sentry SDK | Ja | Ja | Email, Webhook |
| **Bugfender** | Ja | React Native | Ja | Ja | Slack, Zapier, Jira |
| **Bugsink** | Via Sentry SDK | Via Sentry SDK | Ja | Aanbevolen | Email, Webhook |
| **AppSignal** | Uitstekend | JavaScript | Ja | Ja | Slack, Teams, Jira |

**Winnaar Services**: **Sentry.io** of **AppSignal** (meest complete feature set)

**Nuance voor HolidaiButler**:
- Jullie primaire behoefte is **error tracking**, niet full APM
- GlitchTip en Bugsink dekken 95% van jullie behoeften
- Performance monitoring kan later worden toegevoegd

---

### V. TECHNOLOGISCHE SPECIFICATIES

| Platform | Architectuur | Resource Gebruik | Installatie | Migratie van Sentry |
|----------|--------------|------------------|-------------|---------------------|
| **Sentry.io (self-host)** | 58+ services | Min. 16GB RAM | Complex (uren-dagen) | N.v.t. |
| **GlitchTip** | 4 componenten | 2-4GB RAM | Simpel (30 min) | Drop-in (DSN wijzigen) |
| **Bugfender** | SaaS only | N.v.t. | Minuten | SDK migratie nodig |
| **Bugsink** | 1 container | <1GB RAM | Zeer simpel (10 min) | Drop-in (DSN wijzigen) |
| **AppSignal** | SaaS only | N.v.t. | Minuten | SDK migratie nodig |

**Performance bij hoog volume**:
- Bugsink: 2.5 miljoen events/dag op €5/maand VPS
- GlitchTip: Vergelijkbaar, iets meer resources nodig

**Winnaar Technologie (voor self-hosted)**: **Bugsink** (simpelste architectuur)

---

### VI. STRATEGISCHE ALIGNMENT MET HOLIDAIBUTLER VISIE

**Toegevoegd criterium**: Hoe goed past het platform bij jullie **"EU-first, privacy-focused"** positionering?

| Platform | EU-First Alignment | Communiceerbaar naar Partners | Investeerder Appeal |
|----------|-------------------|------------------------------|---------------------|
| **Sentry.io** | Conflicteert met USP | "We gebruiken US tooling" | Inconsistent |
| **GlitchTip** | US bedrijf, maar self-host mogelijk | "We hosten zelf in EU" | Acceptabel |
| **Bugfender** | 100% EU | "Duitse partner" | Sterk |
| **Bugsink** | 100% NL | "Nederlandse partner" | Zeer sterk |
| **AppSignal** | 100% NL | "Nederlandse partner" | Zeer sterk |

**Winnaar Strategische Alignment**: **Bugsink** of **AppSignal** (beide Nederlands!)

---

## EINDADVIES

### Optie A: Bugsink (Self-Hosted) — **AANBEVOLEN**

**Waarom**:
1. **Nederlands bedrijf** - Perfect voor EU-compliance verhaal
2. **Self-hosted op bestaande Hetzner** - €0 extra kosten
3. **Sentry SDK compatible** - Minimale migratie (alleen DSN wijzigen)
4. **Simpelste architectuur** - Minste onderhoud
5. **Volledige data soevereiniteit** - Data verlaat nooit jullie server

**Implementatie**:
```bash
# Op Hetzner server (91.98.71.87)
docker pull bugsink/bugsink:latest
docker run -d \
  -e SECRET_KEY=$(openssl rand -base64 50) \
  -e CREATE_SUPERUSER=admin:secure_password \
  -e PORT=8000 \
  -p 8000:8000 \
  --name bugsink \
  bugsink/bugsink
```

**Migratie**: Alleen de DSN URL aanpassen in alle Sentry SDK configuraties.

---

### Optie B: AppSignal (SaaS) — ALTERNATIEF

**Waarom**:
1. **Nederlands bedrijf** met sterke reputatie
2. **Meer features** (APM, logs, host monitoring)
3. **Geen self-hosting overhead**
4. **ISO 27001 + HIPAA certified**

**Nadeel**: €23/maand kosten, minder data controle

---

### Optie C: GlitchTip (Self-Hosted) — BUDGET ALTERNATIEF

**Waarom**:
1. Sentry-compatible, meer features dan Bugsink
2. Gratis self-hosted
3. EU datacenter (Frankfurt) beschikbaar

**Nadeel**: US bedrijf (Burke Software)

---

## MIGRATIEPLAN (van Sentry naar Bugsink)

### Fase 1: Setup (1-2 uur)
1. Docker container deployen op Hetzner
2. Nginx reverse proxy configureren
3. SSL certificaat (Let's Encrypt)

### Fase 2: Test (1 dag)
1. Bugsink testen met staging omgeving
2. DSN configureren in test environment
3. Verify error capturing werkt

### Fase 3: Productie Migratie (1-2 uur)
1. DSN wijzigen in alle environments:
   - Backend API
   - Customer Portal
   - Admin Portal
2. Sentry account behouden voor historische data (90 dagen)

### Fase 4: Cleanup
1. Na 90 dagen: Sentry account sluiten
2. Documentatie updaten

---

## CONCLUSIE

| Aspect | Advies |
|--------|--------|
| **Primaire keuze** | **Bugsink** (self-hosted) |
| **Alternatief (meer features)** | **AppSignal** (SaaS) |
| **Budget alternatief** | **GlitchTip** (self-hosted) |
| **Sentry behouden?** | Nee - conflicteert met EU-first strategie |

**HolidaiButler's USP vereist consistente keuzes.** Het gebruik van Sentry ondermijnt de geloofwaardigheid van jullie "EU AI Act compliant" en "Built on Local Trust" positionering. Bugsink (Nederlands) of AppSignal (Nederlands) zijn strategisch superieure keuzes.

---

## BONUS: EU WhatsApp Alternatieven voor Owner Notifications

Gezien dezelfde EU-first strategie, hier opties voor kritieke alerts (Fase 2: Owner Interface):

| Platform | Herkomst | Type | Kosten | Aanbeveling |
|----------|----------|------|--------|-------------|
| **Wire** | Zwitserland | Secure Messenger | Business tier | Enterprise-grade |
| **Teamwire** | Duitsland | Business Messenger | Op aanvraag | GDPR certified |
| **Threema** | Zwitserland | Secure Messenger | ~€1.99 eenmalig | Privacy-first |
| **Signal** | USA (non-profit) | Secure Messenger | Gratis | US, maar open-source |

**Aanbeveling voor HolidaiButler**:
- **Email (MailerLite)** voor urgentie 1-4 - Jullie hebben dit al
- **Threema** of **Signal** voor urgentie 5 - Goedkoop, secure
- WhatsApp Business API via **EU-hosted provider** (zoals Chatarmin DE) is ook GDPR-compliant

---

*Document versie 1.0 - Error Monitoring Platform Analyse*
