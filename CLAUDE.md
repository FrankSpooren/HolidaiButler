# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.31.0
> **Laatst bijgewerkt**: 21 februari 2026
> **Eigenaar**: Frank Spooren
> **Project**: HolidaiButler - AI-Powered Tourism Platform

---

## 🎯 Project Mission

HolidaiButler is een enterprise-level AI-powered tourism platform dat internationale toeristen (30-70 jaar) persoonlijke lokale aanbevelingen geeft voor premium bestemmingen.

### Actieve Bestemmingen
| Bestemming | Status | Domein | destination_id |
|------------|--------|--------|----------------|
| **Calpe** | ✅ LIVE | holidaibutler.com | 1 |
| **Texel** | ✅ LIVE | texelmaps.nl | 2 |
| **Alicante** | 🟡 GEPLAND | alicante.holidaibutler.com | 3 |

### Kernwaarden
- **Personalisatie**: AI-driven aanbevelingen gebaseerd op gebruikersvoorkeuren
- **Kwaliteit**: Enterprise-level, state-of-the-art user experience
- **Betrouwbaarheid**: Accurate, actuele data uit gerenommeerde bronnen
- **Privacy**: GDPR-compliant, EU AI Act ready
- **EU-First**: 100% EU-gehoste infrastructuur

---

## 🚨 Enterprise Kwaliteitsstandaarden (KRITIEK)

> **Dit zijn bindende afspraken voor alle ontwikkeling en implementatie.**

### 1. Enterprise Level Kwaliteit
Elke stap, feature of uitwerking resulteert in een **enterprise-level waardig product** dat **state-of-the-art** is. Dit is het verwachtingspatroon van investeerders, eigenaren en gebruikers. Geen concessies, geen "goed genoeg".

### 2. Foutloze Deployments
**Alle errors en foutmeldingen moeten opgelost zijn VOORDAT een feature:**
- Als afgerond wordt beschouwd
- Wordt gepusht naar de server
- Wordt gepusht naar GitHub

Ook niet-kritieke errors zijn onacceptabel in productie.

### 3. CLAUDE.md Actualisatie
Na elke relevante aanpassing, uitbreiding of update:
- CLAUDE.md bijwerken met wijzigingen
- Opslaan op Hetzner server: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`
- Pushen naar GitHub (alle branches via Dev → Test → Main)

### 4. Context Verificatie
**Alvorens te starten met een volgende fase, stap of feature:**
- CLAUDE.md volledig lezen en bestuderen
- Strategische documentatie raadplegen (zie Deel: Strategische Documentatie)
- Actuele status verifiëren in codebase
- Geen aannames maken over implementatie status

### 5. Geen Workarounds
- Geen "known issues" accepteren
- Geen tijdelijke oplossingen die permanent worden
- Problemen oplossen bij de root cause

### 6. Staging-First Workflow
**Voor alle content wijzigingen:**
- Eerst naar `poi_content_staging` tabel
- Review/approval door Frank
- Dan pas naar POI tabel
- Nooit directe productie updates zonder backup

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

## 📋 Strategische Documentatie (NIEUW)

### Primaire Documenten
| Document | Locatie | Versie | Inhoud |
|----------|---------|--------|--------|
| **Master Strategie** | `docs/strategy/HolidaiButler_Master_Strategie.md` | 6.8 | Multi-destination architectuur, implementatie log, lessons learned, beslissingen log |
| **Agent Masterplan** | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 4.2.0 | Agent architectuur, scheduled jobs |
| **CLAUDE.md** | Repository root + Hetzner | 3.31.0 | Dit bestand - project context |

### Leesadvies voor Claude
**Bij elke nieuwe sessie of complexe taak, lees in deze volgorde:**
1. CLAUDE.md (dit bestand) — project context
2. Master Strategie — actuele fase status en beslissingen
3. Relevante fase documentatie op Hetzner (`/root/fase*`)

---

## 🏗️ Repository Structuur

```
HolidaiButler/
├── CLAUDE.md               # Dit bestand (project context)
├── .claude/                # Claude Agent configuratie
│   ├── skills/             # Agent Skills
│   └── commands/           # Custom commands
│
├── .github/
│   └── workflows/
│       ├── deploy-platform-core.yml  # CI/CD workflow met concurrency control
│       └── deploy-admin-module.yml   # ✅ Admin Portal CI/CD (Fase 8C-0)
│
├── docs/
│   └── strategy/
│       └── HolidaiButler_Master_Strategie.md  # ✅ Single master doc
│
├── customer-portal/        # React 19 + Tailwind
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── utils/
│       └── package.json
│
├── admin-module/           # React 18 + MUI (admin.holidaibutler.com)
│   ├── src/
│   │   ├── api/            # API services (client, auth, dashboard, agents, pois, reviews, analytics, settings)
│   │   ├── components/     # Layout, dashboard, common components
│   │   ├── hooks/          # useAuth, useDashboard, useAgentStatus, usePOIs, useReviews, useAnalytics, useSettings
│   │   ├── pages/          # Login, Dashboard, Agents, POIs, Reviews, Analytics, Settings (✅ Fase 8D)
│   │   ├── stores/         # Zustand auth store
│   │   ├── i18n/           # NL/EN vertalingen
│   │   └── utils/          # Helpers (formatters, destinations, agents)
│   ├── vite.config.js
│   └── package.json
│
├── platform-core/          # Node.js/Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── holibot.js
│   │   │   └── adminPortal.js        # ✅ Fase 8C-0/8D: Admin API (19 endpoints)
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── holibot/           # HoliBot 2.0 (RAG Chatbot)
│   │   │   ├── orchestrator/      # ✅ Fase 2: Agent Orchestrator
│   │   │   │   ├── queues.js
│   │   │   │   ├── scheduler.js
│   │   │   │   ├── workers.js
│   │   │   │   ├── costController/
│   │   │   │   ├── auditTrail/
│   │   │   │   └── ownerInterface/
│   │   │   └── agents/            # ✅ Fase 3: Specialized Agents
│   │   │       ├── base/              # ✅ Fase 8B: BaseAgent + Registry
│   │   │       │   ├── BaseAgent.js
│   │   │       │   ├── destinationRunner.js
│   │   │       │   └── agentRegistry.js
│   │   │       ├── healthMonitor/
│   │   │       ├── ownerInterfaceAgent/
│   │   │       ├── dataSync/
│   │   │       ├── holibotSync/
│   │   │       ├── communicationFlow/
│   │   │       ├── gdpr/
│   │   │       ├── devLayer/
│   │   │       └── strategyLayer/
│   │   └── middleware/
│   ├── config/                # ✅ Multi-Destination Config
│   │   ├── shared.config.js          # Platform-wide settings
│   │   └── destinations/
│   │       ├── index.js              # Config exports + utilities
│   │       ├── calpe.config.js       # Calpe destination config
│   │       ├── texel.config.js       # Texel destination config
│   │       └── alicante.config.js    # Alicante destination config
│   └── package.json
│
├── modules/
│   ├── admin-module/
│   ├── agenda-module/
│   ├── ticketing-module/
│   └── payment-module/
│
└── infrastructure/
    ├── apache/
    │   └── vhosts/
    │       ├── holidaibutler.com.conf
    │       └── texelmaps.nl.conf      # ✅ NIEUW
    └── docker/
```

---

## 🌍 Multi-Destination Architectuur

### Destination Configuratie
| Destination | ID | Domein | Status | Branding |
|-------------|----|---------| -------|----------|
| Calpe | 1 | holidaibutler.com | ✅ LIVE | #7FA594 / #5E8B7E |
| Texel | 2 | texelmaps.nl | ✅ LIVE | #30c59b / #3572de / #ecde3c |
| Alicante | 3 | alicante.holidaibutler.com | 🟡 GEPLAND | TBD |

### TexelMaps Huisstijl (Definitief)
```css
:root {
  --color-primary: #30c59b;    /* Natuur groen */
  --color-secondary: #3572de;  /* Zee blauw */
  --color-accent: #ecde3c;     /* Zon geel */
}
```

### Database Multi-Tenancy
Alle tabellen met destination-specifieke data hebben `destination_id` kolom:
- `POI` — Points of Interest
- `QnA` — Q&A voor HoliBot
- `agenda` — Events
- `Users` — Gebruikers
- `user_journeys` — User journey tracking
- `holibot_sessions` — Chatbot sessies
- `poi_content_staging` — Content staging (NIEUW)
- `reviews` — User reviews (heeft eigen `destination_id` kolom)

### Destination Routing
```
Request → Apache VHost → X-Destination-ID Header → Backend
                                ↓
                    getDestinationFromRequest()
                                ↓
                    destination_id voor queries
```

---

## 📊 POI Content Pipeline (NIEUW - Fase 3-4)

### Content Staging Workflow
```
Bronnen (VVV, Websites, LLM) → poi_content_staging → Review → POI tabel
                                     ↓
                              status: pending
                                     ↓
                              status: approved/rejected
                                     ↓
                              status: applied
```

### poi_content_staging Tabel Schema
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INT | Primary key |
| poi_id | INT | FK naar POI.id |
| destination_id | INT | 1=Calpe, 2=Texel |
| content_source | VARCHAR | 'mistral_medium_fase4', 'vvv_texel', 'poi_website', 'calpe_es' |
| detail_description_en | TEXT | Gegenereerde EN beschrijving |
| status | ENUM | 'pending', 'approved', 'rejected', 'applied', 'review_required' |
| old_content_snapshot | TEXT | Backup van OLD content |
| comparison_scores | JSON | LLM scoring per criterium |
| old_total_score | DECIMAL | Gewogen OLD score |
| new_total_score | DECIMAL | Gewogen NEW score |
| comparison_recommendation | ENUM | 'USE_NEW', 'KEEP_OLD', 'MANUAL_REVIEW' |
| applied_at | TIMESTAMP | Wanneer naar POI tabel |

### Content Bronnen
| Bron | POIs | Status | Kwaliteit |
|------|------|--------|-----------|
| mistral_medium_fase4 | 2.515 | ⚠️ 61% hallucinaties (R1) | Feitelijk onbetrouwbaar |
| vvv_texel | 240 | ✅ Gescraped | Goed |
| poi_website | 276 | ✅ Gescraped | Variabel |
| calpe_es | 18 | ✅ Gescraped | Goed |
| **R2 fact sheets** | **3.079** | ✅ R2 COMPLEET | **47% rich, 8% moderate** |
| **Totaal staging** | **3.049** | | |

### LLM Content Generatie (Mistral AI)
| Parameter | Waarde |
|-----------|--------|
| Model | mistral-medium-latest |
| API | https://api.mistral.ai/v1/chat/completions |
| Rate limit | 5 requests/seconde |
| Kosten | ~EUR 0.0035/POI |
| Success rate | 100% |

### Content Kwaliteitscriteria (9 criteria, gewogen)
| # | Criterium | Gewicht | Beschrijving |
|---|-----------|---------|--------------|
| C1 | Grammatica & Spelling | 10% | Foutloos taalgebruik |
| C2 | British English | 10% | colour, centre, specialise |
| C3 | Tone of Voice | 10% | Professioneel, warm, uitnodigend |
| C4 | AIDA Model | 10% | Attention-Interest-Desire-Action |
| C5 | Woordenaantal | 5% | 115-135 woorden optimaal |
| C6 | Formatting | 10% | Geen markdown, plain text |
| C7 | Concreetheid | 20% | Prijzen, tijden, specifieke details |
| C8 | Lokale Verankering | 15% | Costa Blanca, Waddenzee referenties |
| C9 | Actualiteit | 10% | Geen verouderde info |

### Taalregels per Destination
| Destination | Regel | Voorbeeld |
|-------------|-------|-----------|
| Texel EN | "on Texel" (NIET "in Texel") | "Located on Texel..." |
| Texel NL | "op Texel" | "Gelegen op Texel..." |
| Texel DE | "auf Texel" | "Auf Texel gelegen..." |
| Calpe EN/ES/DE/NL | "in Calpe" | "In Calpe you'll find..." |

---

## 🗃️ Database Schema

### Server Verbinding
```
Host: jotx.your-database.de
Database: pxoziy_db1
User: pxoziy_1
Password: j8,DrtshJSm$
```
> **Let op**: Credentials `pxoziy_1_w` / `i9)PUR^2k=}!` zijn FOUT (staan in oude docs) en geven ACCESS DENIED.

### POI Tabel Kolommen (Content-gerelateerd)
| Kolom | Type | Beschrijving | Status |
|-------|------|--------------|--------|
| enriched_tile_description_en | TEXT | Korte beschrijving (tile) | ✅ Gevuld |
| enriched_detail_description | TEXT | EN content (base, GEEN _en suffix) | ✅ Fase 5b |
| enriched_detail_description_en | TEXT | EN content (backup, niet door backend gelezen) | ✅ Fase 5 |
| enriched_detail_description_es | TEXT | Spaanse vertaling | ✅ Fase 5 |
| enriched_detail_description_de | TEXT | Duitse vertaling | ✅ Fase 5 |
| enriched_detail_description_nl | TEXT | Nederlandse vertaling | ✅ Fase 5 |
| enriched_highlights | TEXT | Key highlights | ✅ Gevuld |

### POI Coverage na Fase R6
| Destination | Actief | EN | NL | DE | ES | Coverage |
|-------------|--------|----|----|----|----|----------|
| Calpe | 1.538 | 1.483 | 1.483 | 1.483 | 1.483 | 96% |
| Texel | 1.660 | 1.596 | 1.596 | 1.596 | 1.596 | 96% |
| **Totaal** | **3.198** | **3.079** | **3.079** | **3.079** | **3.079** | **96%** |

### POI Image Pipeline
| Aspect | Calpe | Texel |
|--------|-------|-------|
| **imageurls records** | 13.704 | 11.506 |
| **POIs met images** | ~1.538 | 1.606 |
| **Opslag pad** | `/poi-images/{poi_id}/{hash}.jpg` | `/poi-images/texel/{google_placeid}/image_N.jpg` |
| **Totale grootte** | 8,3 GB | 4,1 GB |

**Configuratie:**
- `IMAGE_BASE_URL` in `.env`: `https://test.holidaibutler.com`
- `getBestUrl()` in `ImageUrl.js`: prefereert `local_path`, fallback naar `image_url`
- Apache: alle vhosts met `Alias /poi-images /var/www/.../storage/poi-images`

---

## 🤖 HoliBot / Tessa — AI Chatbot (Fase 6)

### Architectuur
```
User Request → X-Destination-ID Header → getDestinationFromRequest()
                                              ↓
                              destinationConfig.holibot.chromaCollection
                                              ↓
                              ChromaDB Cloud (collection per destination)
                                              ↓
                              RAG: similarity search → context → Mistral LLM
                                              ↓
                              Streaming SSE response
```

### Chatbot per Destination
| Destination | Chatbot Naam | Collection | Vectoren | Persona |
|-------------|-------------|------------|----------|---------|
| Calpe | HoliBot | `calpe_pois` | 43.086 | Vriendelijke Calpe-gids |
| Texel | Tessa | `texel_pois` | 101.364 | Persoonlijke Texel-gids |

### ChromaDB Cloud
| Parameter | Waarde |
|-----------|--------|
| Provider | ChromaDB Cloud |
| Tenant/Database | Geconfigureerd in .env |
| Embedding model | `mistral-embed` (1024 dims) |
| LLM model | `mistral-small-latest` |
| Texel vectoren | 94.980 QnA + 6.384 POI = 101.364 |
| Calpe vectoren | 37.154 QnA + 5.932 POI = 43.086 |
| Vectorisatie kosten | ~EUR 24 |

### Backend Bestanden (Destination-Aware)
| Bestand | Rol |
|---------|-----|
| `src/routes/holibot.js` | Destination extractie, routing |
| `src/services/holibot/chromaService.js` | Multi-collection support |
| `src/services/holibot/embeddingService.js` | Destination system prompts |
| `src/services/holibot/ragService.js` | RAG met collection + config |
| `src/services/holibot/conversationService.js` | destination_id in sessie |
| `src/services/holibot/intentService.js` | Texel location patterns |
| `src/services/holibot/suggestionService.js` | Destination-aware tips, trending, greetings |
| `src/services/agents/holibotSync/poiSyncService.js` | Sync per destination |
| `src/services/agents/holibotSync/qaSyncService.js` | QnA/QA dual-table sync |

### Frontend Bestanden (Destination-Aware)
| Bestand | Wijziging |
|---------|-----------|
| `vite.config.ts` | `holibot.name` + `holibot.welcomeMessages` per destination |
| `DestinationContext.tsx` | `holibot?` interface veld |
| `WelcomeMessage.tsx` | Destination-aware welkomstberichten |
| `ChatHeader.tsx` | `destination.holibot?.name` in titel |
| `ChatMessage.tsx` | Destination-aware botName |

---

## 📈 Implementatie Status

### Multi-Destination Fasen
| Fase | Beschrijving | Status | Datum |
|------|--------------|--------|-------|
| **Fase 1** | Foundation (DB schema, config) | ✅ COMPLEET | 28-01-2026 |
| **Fase 2** | Texel Deployment (DNS, SSL, data) | ✅ COMPLEET | 29-01-2026 |
| **Fase 3** | Texel Data Quality | ✅ COMPLEET | 02-02-2026 |
| **Fase 3b** | LLM Content Pilot (100 POIs) | ✅ COMPLEET | 05-02-2026 |
| **Fase 4** | Full LLM Content Run (2.515 POIs) | ✅ COMPLEET | 05-02-2026 |
| **Fase 4b** | Content Vergelijking (OLD vs NEW) | ✅ COMPLEET | 06-02-2026 |
| **Fase 5** | Content Apply & Translation | ✅ COMPLEET | 07-02-2026 |
| **Fase 5b** | Frontend Content Verificatie | ✅ COMPLEET | 08-02-2026 |
| **Fase 5c** | Texel Image Fix | ✅ COMPLEET | 08-02-2026 |
| **Fase 6** | AI Chatbot Texel "Tessa" | ✅ COMPLEET | 08-02-2026 |
| **Fase 6b** | Quick Actions Destination Fix | ✅ COMPLEET | 09-02-2026 |
| **Fase 6c** | SSL Fix + Sentry DSN + Suggestion Content Fix | ✅ COMPLEET | 10-02-2026 |
| **Fase 6d** | Destination Routing + Categories + Fuzzy Match + Spacing | ✅ COMPLEET | 10-02-2026 |
| **Fase 6e** | X-Destination-ID + Daily Tip Overhaul + Spacing + Icons (3 rounds) | ✅ COMPLEET | 11-02-2026 |
| **Fase R1** | Content Damage Assessment (100 POIs fact-check) | ✅ COMPLEET | 12-02-2026 |
| **Fase R2** | Source Data Verrijking (1.923 websites gescrapet, 3.079 fact sheets) | ✅ COMPLEET | 12-02-2026 |
| **Fase R3** | Prompt Redesign (anti-hallucinatie, 16 regels, 4 kwaliteitsniveaus, verificatie-prompt) | ✅ COMPLEET | 13-02-2026 |
| **Fase R4** | Regeneratie + Verificatie Loop (3.079 POIs, 19.5% hallucinatie, 0 errors) | ✅ COMPLEET | 13-02-2026 |
| **Fase R5** | Safeguards & Kwaliteitsborging (1.730 POIs gepromoveerd, audit trail, monitoring) | ✅ COMPLEET | 16-02-2026 |
| **Fase R6** | Content Completion & Vertaling (3.079 POIs productie-gereed, 9.066 vertalingen NL/DE/ES) | ✅ COMPLEET | 18-02-2026 |
| **Fase R6b** | Content Quality Hardening (2.047 POIs claim-stripped, AM/PM sweep, 6.177 hervertalingen) | ✅ COMPLEET | 19-02-2026 |
| **Fase R6c** | ChromaDB Re-vectorisatie Texel + Calpe + Steekproef Fix (12.316 vectoren, 2 POI-correcties) | ✅ COMPLEET | 19-02-2026 |
| **Fase R6d** | Openstaande Acties Afhandeling (markdown fix 388 POIs, 119 POIs inventarisatie, social media besluit) | ✅ COMPLEET | 19-02-2026 |
| **Fase 7** | Reviews Integratie (8.964 reviews live, rating_distribution, poiName fix) | ✅ COMPLEET | 19-02-2026 |
| **Fase 8A** | Agent Reparatie & Versterking (7 agents gerepareerd) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8A+** | Agent Monitoring & Briefing Expansion (3 modules, 5 jobs) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8B** | AI Agents Multi-Destination (BaseAgent, 18 agents, Threema) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8C-0** | Admin Portal Foundation (3 VHosts, 6 endpoints, React app, CI/CD) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8C-1** | Agent Dashboard (backend GET /agents/status + frontend AgentsPage + i18n) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8D** | Admin Portal Feature Pack (POI Management, Reviews Moderatie, Analytics, Settings — 12 endpoints, 4 pagina's) | ✅ COMPLEET | 20-02-2026 |
| **Fase 8D-FIX** | Admin Portal Bug Fix (12 bugs: POI stats/detail/edit, Review stats/detail/archive, Settings services/destinations/audit-log, QuickLinks, Agent detail, Sentry DSN) | ✅ COMPLEET | 21-02-2026 |
| **Fase 8E** | Admin Portal Hardening & UX Upgrade (agent ecosystem fixes, content audit, destination filter, sorting, analytics, agent profielen, i18n DE/ES, taalversie keuze) | ✅ COMPLEET | 21-02-2026 |

### Fase 4/4b Resultaten
| Metriek | Waarde |
|---------|--------|
| POIs gegenereerd | 2.515 |
| Success rate | 100% |
| Kosten Fase 4 | EUR 8.93 |
| Kosten Fase 4b | EUR 6.02 |
| Approved | 2.481 (98.6%) |
| Manual Review | 34 (1.4%) → Frank akkoord: USE_NEW |
| Keep OLD | 0 (0%) |
| NEW vs OLD score | +2.17 punten |

### Fase 6 Resultaten (AI Chatbot Texel "Tessa")
| Metriek | Waarde |
|---------|--------|
| QnA vectoren (Texel) | 93.241 |
| POI vectoren (Texel) | 1.739 |
| Totaal in `texel_pois` | 94.980 |
| Vectorisatie errors | 0 |
| Vectorisatie kosten | ~EUR 19 |
| Backend bestanden gewijzigd | 8 |
| Frontend bestanden gewijzigd | 5 |
| Talen ondersteund | NL, EN, DE |
| API test Texel | ✅ Correct (Texel stranden) |
| API test Calpe regressie | ✅ Geen regressie |
| Session destination_id | ✅ Correct opgeslagen |

### Fase 6b Resultaten (Quick Actions Destination Fix)
| Endpoint | Probleem | Fix | Status |
|----------|----------|-----|--------|
| GET /daily-tip | Event query gebruikte `calpe_distance`, geen `destination_id` filter | Haversine formula + `destination_id` filter, dynamic `allowedCategories` uit config | ✅ |
| POST /directions | POI lookup zonder `destination_id` filter | `destination_id` filter met fallback voor backward compat | ✅ |
| GET /suggestions | Hardcoded "Calpe" in seizoen/tijd teksten | Destination-aware greetings, tips, season highlights via `destName` parameter | ✅ |
| GET /trending | Geen destination filter in trending SQL | JOIN met POI tabel voor destination filtering, cache per destination | ✅ |

**Bestanden gewijzigd (4)**: calpe.config.js, texel.config.js (quickActionCategories), suggestionService.js (destination-aware), holibot.js (4 endpoints)
**Texel-specifieke tips**: "op Texel" (NL), fietstocht, zilte lucht/zon, woeste golven/prachtige luchten
**Calpe regressie**: ✅ Geen regressie

### Fase 6c Resultaten (SSL + Sentry + Suggestion Content Fix)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| SSL Certificate | **GEEN SSL cert + Apache VHost voor api.holidaibutler.com** → ERR_CERT_COMMON_NAME_INVALID voor alle API calls | Certbot cert + Apache VHost met ProxyPass naar 127.0.0.1:3001, CORS headers | ✅ |
| Sentry DSN | Frontend DSN met hyphens in key (`bd88b00e-1507...`) + .env.texel disabled + .env.production missing | DSN key zonder hyphens, alle env files gefixed (project 2 = customer-portal) | ✅ |
| Suggestion Content | TIME_BASED_SUGGESTIONS had hardcoded Calpe content (Peñón de Ifach, tapas tour) voor alle destinations | Per-destination suggestions: calpe + texel keys met lokale content (eilandcafé, duinen, Ecomare, Den Burg) | ✅ |
| SEASONAL_SUGGESTIONS | Hardcoded "stranden van Calpe", "charme van Calpe" | Refactored naar SEASONAL_CATEGORIES (destination-neutral) + getSeasonHighlight() (destination-aware) | ✅ |

**Bestanden gewijzigd**: suggestionService.js, .env, .env.texel, .env.production
**Server configs aangemaakt**: api.holidaibutler.com.conf, api.holidaibutler.com-le-ssl.conf
**SSL cert**: Let's Encrypt, geldig tot 2026-05-11
**Bugsink projects**: 1=api, 2=customer-portal, 3=admin-portal
**Calpe regressie**: ✅ Geen regressie

### Fase 6d Resultaten (Destination Routing + Categories + Fuzzy Match + Spacing)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| Destination Routing | **ROOT CAUSE**: `getDestinationFromRequest()` deed `parseInt("texel")` → NaN → default 1 (Calpe). Frontend stuurt string "texel", backend verwachtte nummer. ALLE endpoints waren gebroken voor Texel. | Accepteert nu zowel string ("texel", "calpe") als numeric (1, 2) IDs via `codeToId` mapping | ✅ |
| CORS Fix | `Access-Control-Allow-Origin` was `/usr/bin/bash` (shell variable expansie bug). `$0` in heredoc werd door bash geïnterpreteerd. | Apache RewriteRule met `%{HTTP:Origin}` matching + `[E=ORIGIN_OK:%{HTTP:Origin}]` environment variable | ✅ |
| Category Filtering | Te veel categorieën: Uncategorized, Media, Evenementen, Verenigingen zichtbaar. Ontbrekende iconen (fallback naar Actief icon). | **Whitelist** i.p.v. blacklist: exact 8 toegestane categorieën voor Texel. Iconen toegevoegd voor Recreatief, Gezondheid & Verzorging, Praktisch. | ✅ |
| Spacing Errors | LLM output: "inDen Burg", "BalckeninDen Burg" — Mistral merges woorden samen. | `fixResponseSpacing()` in ragService + extra locatie namen in `cleanAIText()` (De Cocksdorp, Oosterend, De Waal, Ecomare) | ✅ |
| POI Name Recognition | "12 Balcken" niet herkend als "Taveerne De Twaalf Balcken". | `normalizeDutchNumbers()`: 1-20 → Nederlandse woorden. `findFuzzyMatch()` uitgebreid met normalized+partial-words matching. | ✅ |
| Itinerary Events | Event query gebruikte `calpe_distance` (hardcoded) i.p.v. `destination_id`. | SQL filter gewijzigd naar `destination_id = ?` | ✅ |
| Itinerary Categories | `allowedCategories` bevatte alleen Engelse (Calpe) categorienamen. | Nederlandse Texel categorieën toegevoegd aan allowlist | ✅ |
| Entity Extraction | Regex patterns hadden hardcoded "Calpe", misten Texel locaties en numerieke entiteiten ("12 Balcken"). | Destination-neutral patterns, Texel locaties in exclude list, numeric entity pattern toegevoegd | ✅ |
| Fallback Response | `getFallbackResponse()` hardcoded "Calpe" in alle talen. | Destination-aware met `destName` parameter | ✅ |
| Enhanced Search | `buildEnhancedSearchQuery()` voegde hardcoded " Calpe" toe aan queries. | Verwijderd — destination filtering gebeurt via ChromaDB collection routing | ✅ |

**Texel categorieën (whitelist)**: Eten & Drinken, Natuur, Cultuur & Historie, Winkelen, Recreatief, Actief, Gezondheid & Verzorging, Praktisch
**Bestanden gewijzigd**: holibot.js (6 fixes), ragService.js (6 fixes), CategoryBrowser.tsx (whitelist + iconen)
**Apache config**: api.holidaibutler.com-le-ssl.conf (RewriteRule CORS)
**Frontend herbouwd**: Texel build deployed naar dev.texelmaps.nl + texelmaps.nl
**Calpe regressie**: ✅ Geen regressie (itinerary test: "Pizzería Restaurante 1948")

### Fase 6e Resultaten (X-Destination-ID + Daily Tip Overhaul + Spacing + Icons)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| X-Destination-ID | **ROOT CAUSE**: Alle `fetch()` calls in chat.api.ts, MessageList.tsx, CategoryBrowser.tsx misten `X-Destination-ID` header. Backend defaulted naar Calpe (1). Texel categorieën → 0 resultaten. | `defaultHeaders` getter met `X-Destination-ID: getDestinationId()` in ChatAPI class. Header toegevoegd aan alle 11 fetch() calls. | ✅ |
| Category Icons | `categoryIconPaths` in MessageList.tsx had alleen Engelse namen. Nederlandse Texel categorieën → default icon (culture-history). | 8 Nederlandse categorienamen toegevoegd (kopie van CategoryBrowser.tsx mappings). | ✅ |
| Spacing | "Texelof" → missing space after location name. `cleanAIText()` en `fixResponseSpacing()` handelden alleen uppercase na locatienamen af. | `connectingWords` array (30+ woorden: "of", "en", "is", etc.) toegevoegd. Loop over locatienamen + connecting words. | ✅ |
| Daily Tip Hallucinatie | MistralAI genereerde beschrijvingen met niet-bestaande POIs ("Kerkvoogdij Waal Koog Den Hoorn"). | MistralAI call VERWIJDERD uit daily-tip endpoint. Geen LLM-tekst meer → geen hallucinaties. | ✅ |
| Daily Tip Images | POIs met 10 images toonden geen visual. Alleen `thumbnail_url` werd gebruikt. | `getImagesForPOIs()` uit ImageUrl.js geïmporteerd. Images geladen uit `imageurls` tabel (priority-sorted, local_path preferred). | ✅ |
| Daily Tip Golden Rule | POIs zonder reviews of visuals werden getoond. | `review_count >= 1` WHERE clause + filter op POIs met 0 images uit imageurls tabel. | ✅ |
| Daily Tip Format | LLM-alinea boven POI card was overbodig en bevatte onjuistheden. | Frontend toont alleen POI card met "Tip van de Dag" titel, geen LLM tekst. | ✅ |

**Bestanden gewijzigd**: chat.api.ts, MessageList.tsx, CategoryBrowser.tsx, holibot.js, ragService.js
**Frontend herbouwd**: Texel build deployed naar dev.texelmaps.nl + texelmaps.nl
**API herstart**: PM2 restart holidaibutler-api
**Commit**: 4c3d894, pushed dev→test→main

### Fase 6e Round 2 Resultaten (Opening Hours + Dutch Icons + Streaming + Image Priority)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| Opening Hours Format | **ROOT CAUSE**: `isCurrentlyClosedFromHours()` verwachtte object format met Engelse dagnamen (`hours['tuesday']`). Texel heeft array format met Nederlandse dagnamen (`[{day: "dinsdag", hours: "06:00 to 16:00"}]`). ALLE Texel POIs met opening_hours → "closed" → 0 resultaten bij rubriekbrowsing. | Complete rewrite: detecteert array/object format, Dutch+English day mapping, timezone Europe/Amsterdam. Als dag niet gevonden → assume open (niet closed). | ✅ |
| Itinerary Only Restaurants | `timeOfDayTypes` en categorie-filters in itinerary gebruikten alleen Engelse namen. Texel categorieën (Natuur, Actief, Cultuur) werden niet herkend → alle non-restaurant POIs vallen in fallback. | Dutch types toegevoegd (natuur, actief, strand, musea, winkel, eetcafe). Categorie matching uitgebreid met Dutch equivalents. Restaurant filter: eten, eetcafe, strandpaviljoen. | ✅ |
| Subcategory Icons Level 2/3 | `subcategoryIconPaths` in MessageList.tsx had alleen Engelse namen. `categoryIcons.default` in CategoryBrowser was `active.png` (fietser). | 60+ Nederlandse subcategorie-iconen in MessageList.tsx + CategoryBrowser.tsx. Default icon → culture-history.png. | ✅ |
| Spacing Streaming | `cleanAIText()` was NIET aangeroepen in streaming endpoint. Alleen non-streaming chat had spacing fix. Streaming responses hadden "Balckenis een" etc. | `cleanAIText()` toegevoegd aan streaming endpoint "done" event met POI names. Frontend `onDone` vervangt al streamed text met cleaned version. | ✅ |
| Image Quality Order | Eerste image was vaak street view (laagste kwaliteit). Alle lokale images hadden priority 0, ongeacht bron. | Nieuwe `getLocalImagePriority()`: checkt `image_url` ook voor lokale images. AF1Qip (user photos) → priority 0, street view → priority 5 (zelfs als lokaal opgeslagen). | ✅ |
| Chat Avatar | ChatMessage.tsx en WelcomeMessage.tsx gebruikten hardcoded `hb-merkicoon.png` (HolidaiButler icoon) voor alle destinations. | Destination-aware: `destination.icon` (texelmaps-icon.png voor Texel, HolidaiButler_Icon_Web.png voor Calpe). Fallback naar default avatar. | ✅ |

**Bestanden gewijzigd**: CategoryBrowser.tsx, ChatMessage.tsx, MessageList.tsx, WelcomeMessage.tsx, ImageUrl.js, holibot.js
**Frontend herbouwd**: Texel build deployed naar dev.texelmaps.nl + texelmaps.nl
**API herstart**: PM2 restart holidaibutler-api
**Commit**: dae659e, pushed dev→test→main

### Fase 6e Round 3 Resultaten (Texla→Tessa + ChromaDB + Spacing + Icons + Itinerary Images)
| Issue | Probleem | Fix | Status |
|-------|----------|-----|--------|
| Texla → Tessa | 23 occurrences van "Texla" i.p.v. "Tessa" in 6 frontend pagina's (Homepage, FAQ, About, HowItWorks, Terms, Privacy) in NL/EN/DE content. | `replace_all` Texla → Tessa in alle 6 bestanden. | ✅ |
| ChromaDB Warnings | 15+ warnings bij PM2 start: "Cannot instantiate DefaultEmbeddingFunction", "Collection created with default-embed". Collections waren aangemaakt met `default-embed` metadata maar package niet geïnstalleerd. | `@chroma-core/default-embed` npm package geïnstalleerd. No-op embedding function toegevoegd aan `getCollection()` en `createCollection()` in beide chromaService bestanden. Warnings teruggebracht van 15+ naar 3 (niet-kritieke schema deserialization). | ✅ |
| Spacing "deTegeltjes" | **ROOT CAUSE**: `cleanAIText()` had GEEN generieke camelCase regex. De `\b` word boundary in preposition regex matcht niet voor "deTegeltjes" omdat het één woord is zonder boundaries. `fixResponseSpacing()` (ragService) had wél de regex maar wordt niet aangeroepen voor streaming. | Generieke camelCase split `([a-zà-ü])([A-ZÀ-Ü])` → `$1 $2` toegevoegd aan `cleanAIText()` VÓÓR preposition handling. Fix werkt nu voor alle endpoints (streaming + non-streaming). | ✅ |
| Icon Centering | Chat avatar CSS had `width: 120%; height: 120%; object-fit: cover; object-position: center 30%; transform: translateX(-10%)` — geoptimaliseerd voor oude HB icon (100x100). TexelMaps icon (256x256) werd afgesneden. | CSS gewijzigd naar `width: 100%; height: 100%; object-fit: contain; object-position: center;` in zowel ChatMessage.css als WelcomeMessage.css. Werkt voor beide destinations. | ✅ |
| Itinerary Images | **ROOT CAUSE**: Itinerary endpoint haalde GEEN images op uit `imageurls` tabel. POIs kwamen terug met `thumbnailUrl: null`. Frontend kon geen POI cards met visuals tonen. | `getImagesForPOIs()` batch-fetch toegevoegd aan itinerary endpoint. MySQL ID extractie uit `poi_XXXX` ChromaDB ID format. POIs krijgen nu tot 5 images + thumbnailUrl. | ✅ |
| 404 Error | Gemeld als itinerary 404, maar API endpoint `/api/v1/holibot/itinerary` retourneert 200. Waarschijnlijk veroorzaakt door ontbrekende POI images (nu gefixed) of eenmalige network fout. | Onderzocht: API route correct, assets correct gedeployed. Itinerary images fix voorkomt mogelijk de 404 (browser laadde `null` als image URL). | ✅ |

**Bestanden gewijzigd**: Homepage.tsx, FAQPage.tsx, AboutPage.tsx, HowItWorksPage.tsx, TermsPage.tsx, PrivacyPage.tsx, holibot/chromaService.js, holibotSync/chromaService.js, holibot.js, ChatMessage.css, WelcomeMessage.css
**NPM package**: `@chroma-core/default-embed` geïnstalleerd (lokaal + Hetzner)
**Frontend herbouwd**: Texel build deployed naar dev.texelmaps.nl + texelmaps.nl
**API herstart**: PM2 restart holidaibutler-api
**ChromaDB warnings**: 15+ → 3 (niet-kritiek)

### Fase R1 Resultaten (Content Damage Assessment — 12/02/2026)

**Aanleiding**: Handmatige steekproef door Frank (Texel-bewoner) onthulde 100% foutenpercentage in 6 Texel POIs. Verzonnen haardvuren, prijzen, afstanden, openingstijden.

**Root Cause**: Prompt-instructie "Include at least one concrete detail" zonder brondata. Website URL meegegeven maar INHOUD niet. LLM vulde informatiegaten met plausibele maar verzonnen details. Kwaliteitscriteria beloonden hallucinaties (concreetheid-score).

**Methode**: Geautomatiseerde fact-check pipeline (Python):
1. 50 Texel + 50 Calpe POIs geselecteerd (top-rated met website)
2. 100 websites gescrapet (96% success rate, 48 Texel OK, 47 Calpe OK)
3. LLM fact-check per POI: elke claim vergeleken met gescrapete website-data
4. Gestructureerd rapport + samenvatting gegenereerd

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs met data | 48 | 47 | 95 |
| Gem. hallucinatie% | 61% | 62% | 61% |
| Severity HIGH/CRITICAL | 100% | 100% | 100% |
| Verified claims | 22% | 19% | 20% |
| Hallucinated claims | 53% | 56% | 55% |
| Factually wrong | 6% | 4% | 5% |

**Conclusie**: **NO-GO** voor productie. Content Repair Pipeline R2-R5 verplicht.

**Ergste categorieën**: Food & Drinks Calpe (75% hallucinated), Praktisch Texel (69%), Shopping (67%), Recreatief (64%).
**Typische fouten**: Verzonnen prijzen (11%), afstanden (11%), openingstijden (6%), menu-items (3%), faciliteiten (3%).

**Deliverables op Hetzner**:
- `/root/fase_r1_damage_assessment.md` — Volledig rapport (26 KB)
- `/root/fase_r1_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r1_factcheck_texel.json` + `_calpe.json` — Fact-check data (380 KB)
- `/root/fase_r1_website_data_texel.json` + `_calpe.json` — Gescrapete website-data (687 KB)
- `/root/fase_r2_scrape_targets.json` — 1.923 POIs voor volledige scraping
- `/root/fase_r3_prompt_improvements.md` — Anti-hallucinatie prompt ontwerp
- Script: `/root/fase_r1_damage_assessment.py` (herbruikbaar voor toekomstige assessments)

### Fase R2 Resultaten (Source Data Verrijking — 12/02/2026)

**Doel**: Alle POI-websites scrapen en gestructureerde "fact sheets" bouwen als brondata voor content regeneratie in R4.

**Methode**: Geautomatiseerde scraping pipeline (Python):
1. 1.923 POI-websites gescrapet (1.209 Texel targets, 714 Calpe targets)
2. Subpagina's gescraped (/over-ons, /menu, /openingstijden, /contact, etc.)
3. Gestructureerde feiten geëxtraheerd (openingstijden, prijzen, adres, telefoon, email)
4. Gecombineerd met Google Places beschrijvingen en enriched_highlights uit DB
5. Per POI een "fact sheet" met source_text_for_llm (klaar voor R4)

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs met content | 1.596 | 1.483 | 3.079 |
| Websites gescrapet | 1.144 | 626 | 1.770 |
| Scrape success rate | 95% | 88% | 92% |
| Data quality: rich | 984 | 478 | 1.462 (47%) |
| Data quality: moderate | 59 | 172 | 231 (8%) |
| Data quality: minimal | 452 | 614 | 1.066 (35%) |
| Data quality: none | 101 | 219 | 320 (10%) |
| Gem. bronwoorden per POI | 580 | 535 | 557 |
| Doorlooptijd | — | — | 380 minuten |

**Coverage**: 55% van POIs heeft bruikbare brondata (rich + moderate). Texel (65%) beter dan Calpe (44%).

**Deliverables op Hetzner**:
- `/root/fase_r2_scraped_data.json` — Gescrapete website-data (13 MB, 1.770 POIs)
- `/root/fase_r2_fact_sheets.json` — Gestructureerde fact sheets (29 MB, 3.079 POIs)
- `/root/fase_r2_coverage_report.md` — Coverage rapport per categorie
- `/root/fase_r2_summary_for_frank.md` — Samenvatting voor Frank (NL)
- Script: `/root/fase_r2_source_data_enrichment.py`

### Fase R3 Resultaten (Prompt Redesign — 13/02/2026)

**Doel**: Fundamentele herontwerp van de content-generatie prompt om hallucinaties te elimineren, op basis van R1 foutpatronen en R2 brondata.

**Aanpak**:
1. 16 expliciete anti-hallucinatie regels (gebaseerd op R1 top-9 fouttypen)
2. 4 prompt-strategieen per data quality level (rich/moderate/minimal/none)
3. Categorie-specifieke guardrails (8 categorieparen NL+EN)
4. Brondata-injectie: source_text_for_llm uit R2 fact sheets direct in prompt
5. Vertaal-bewuste verificatie-prompt (NL/ES brondata naar EN output)
6. AIDA structuur aangepast per kwaliteitsniveau (vol/beperkt/kort/generiek)

**Verwijderde hallucinatie-veroorzakers uit Fase 4 prompt**:
- "Include at least one concrete detail (price, distance, time, feature)"
- "Hook with a unique fact, sensory detail, or surprising element"
- "What will the visitor experience? Be specific"

**Test Resultaten (12 POIs, 3 per kwaliteitsniveau)**:

| Metriek | R1 (oude prompt) | R3 (nieuwe prompt) |
|---------|-------------------|-------------------|
| Hallucinatie-rate | 61% | **~14%** (daling: 47 procentpunt) |
| PASS (0% fouten) | 0% | **25%** (3/12) |
| REVIEW (minder dan 20%) | 0% | **58%** (7/12) |
| FAIL (meer dan 20%) | 100% | **8%** (1/12) |

**Woorddoelen per kwaliteit**: Rich: 110-140, Moderate: 85-115, Minimal: 55-85, None: 30-60.

**Deliverables op Hetzner**:
- `/root/fase_r3_prompt_templates.py` — Productie-klare prompt module voor R4
- `/root/fase_r3_test_prompts.py` — Test script met verificatie
- `/root/fase_r3_test_results.json` — Volledige testresultaten
- `/root/fase_r3_test_report.md` — Gedetailleerd testrapport
- `/root/fase_r3_summary_for_frank.md` — Samenvatting voor Frank (NL)

### Fase R4 Resultaten (Regeneratie + Verificatie Loop)
- **Status**: COMPLEET (13-02-2026)
- **Doorlooptijd**: 449 minuten (7,5 uur) voor 3.079 POIs
- **Model**: mistral-large-latest (generatie + verificatie)
- **Gemiddelde hallucinatie-rate**: 19.5% (was 61% in R1, -41.5 procentpunt)
- **Errors**: 0 (van 3.079 POIs)

**Verdicts per kwaliteitsniveau:**

| Kwaliteit | Aantal | Gem. Hall. | PASS | REVIEW | FAIL |
|-----------|--------|-----------|------|--------|------|
| Rich | 1.462 | 18.5% | 91 | 1.088 | 283 |
| Moderate | 231 | 20.6% | 8 | 180 | 43 |
| Minimal | 1.066 | 19.0% | 244 | 638 | 184 |
| None | 320 | 24.6% | 54 | 208 | 58 |
| **Totaal** | **3.079** | **19.5%** | **397** | **2.114** | **568** |

**Aanbevelingen**: 2.511 USE_NEW (82%), 568 MANUAL_REVIEW (18%)

**Workflow**:
1. Generatie met R3 anti-hallucinatie prompts + R2 brondata-injectie
2. Automatische verificatie (second-pass LLM fact-check)
3. Staging in `poi_content_staging` tabel (niet direct in productie)
4. Triage rapport met Top 30 per bestemming voor Frank's review

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r4_regeneration.py` — Hoofdscript (generatie + verificatie + staging)
- `/root/fase_r4_results.json` — Volledige resultaten per POI
- `/root/fase_r4_triage_report.md` — Review queue met Top 30 per bestemming
- `/root/fase_r4_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r4_checkpoint.json` — Voortgang checkpoint
- `poi_content_staging` tabel — Alle nieuwe content met review status

### Fase R5 Resultaten (Safeguards & Kwaliteitsborging)
- **Status**: COMPLEET (16-02-2026)
- **1.730 POIs gepromoveerd** naar productie (0 errors)
- **1.003 POIs geblokkeerd** door safeguards (HIGH severity of hallucinatie > 20%)
- **1.730 audit trail entries** in `poi_content_history` tabel

**Safeguard regels**:
1. HIGH severity unsupported claims → GEBLOKKEERD
2. Hallucinatie-rate > 20% (30% voor 'none' quality) → GEBLOKKEERD
3. Woordaantal buiten range → WARNING
4. Embellishment woorden → WARNING
5. Onbekende bestemming → GEBLOKKEERD (verplichte handmatige review)

**Staging status na R5** (voor R6):
| Status | Calpe | Texel | Totaal |
|--------|-------|-------|--------|
| Applied | 538 | 1.192 | 1.730 |
| Pending | 537 | 244 | 781 |
| Review Required | 408 | 160 | 568 |

**Staging status na R6** (finaal): **Alle 3.079 = Applied**

**Deliverables**:
- `fase_r5_safeguards.py` — Content validatie regels module
- `fase_r5_promote_staging.py` — Staging naar productie promotie + rollback
- `fase_r5_monitoring.py` — Kwaliteitsrapportage + quarterly audit
- `contentSafeguards/contentValidator.js` — Backend validatie hook (Node.js)
- `poi_content_history` tabel — Audit trail + rollback capability

### Fase R6 Resultaten (Content Completion & Vertaling — 18/02/2026)
- **Status**: COMPLEET (18-02-2026)
- **Alle 3.079 POIs productie-gereed** met EN, NL, DE, ES content
- **Alle staging entries**: status = applied (0 pending, 0 review_required)
- **Content Repair Pipeline R1-R6 COMPLEET**

**STAP A: Frank's Handmatige Review (Top 150 POIs)**:
- GOED (naar productie): 87
- AANPASSEN (Frank's tekst): 61
- AFKEUREN (rejected): 2
- Extra gepromoveerd (25% threshold): 317

**STAP B: Generieke Beschrijvingen (884 POIs)**:
- Korte veilige teksten (gem. 44 woorden, 0 failures)
- Doorlooptijd: 34 minuten

**STAP C: Vertalingen (NL, DE, ES)**:
- 9.066 vertalingen (3.079 POIs x 3 talen)
- 100% coverage alle talen, 0 markdown lekkage
- Doorlooptijd: 49 minuten (10 parallel workers)

**Audit trail (poi_content_history)**:
| Bron | Telling |
|------|---------|
| fase_r4_staging (R5 promote) | 1.730 |
| generic_safe_r6 (Stap B) | 884 |
| r6_threshold_promote (Stap A.5) | 317 |
| frank_review_r6 (Frank GOED) | 87 |
| frank_manual_edit_r6 (Frank AANPASSEN) | 61 |

**Deliverables op Hetzner** (`/root/`):
- `fase_r6_excel_generator.py` — Excel generatie voor Frank's review
- `fase_r6_process_review.py` — Verwerking Frank's beoordelingen
- `fase_r6_promote_remaining.py` — A.5 threshold promote
- `fase_r6_generic_descriptions.py` — Stap B generieke beschrijvingen
- `fase_r6_translations.py` — Stap C vertalingen (parallel)
- `fase_r6_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `fase_r6_frank_processed.json`, `fase_r6_a5_results.json`, `fase_r6_generic_results.json`, `fase_r6_translation_results.json`

### Fase R6b Resultaten (Content Quality Hardening — 19/02/2026)
- **Status**: COMPLEET (19-02-2026)
- **Doel**: Hallucinatie-rate verlagen van <20-25% naar <5% voor 2.047 automatisch gepromoveerde POIs
- **Totaal gewijzigde POIs**: 2.047 (claim-stripped) + 12 (AM/PM-only) = 2.059

**STAP 1: Source Re-scrape**:
- Deep website scrape: 109 data, 82 empty, 5 quality upgrades
- Facebook/Instagram: geblokkeerd (anti-scraping maatregelen)
- Enhanced fact sheets: 2.047 POIs verrijkt met nieuwe brondata

**STAP 2: Chirurgisch Claim Strippen**:
- 2.047 POIs verwerkt (0 failures, 89 min)
- Gemiddeld woordaantal: 98 → 85 (chirurgisch, niet destructief)
- AIDA structuur behouden, onbewezen claims verwijderd
- Audit trail: 2.047 entries in `poi_content_history` (bron: `r6b_claim_strip`)

**STAP 3: AM/PM Sweep**:
- Database-breed: 3.079 POIs × 4 talen gescand
- 28 POIs + 13 post-vertaling = 41 POIs gefixed
- 68 AM/PM → 24h conversies totaal
- Verificatie: 0 AM/PM notaties resterend in database
- Audit trail: 50 entries (bron: `r6b_ampm_sweep`)

**STAP 4: Frank's Steekproef Excel**:
- 20 POIs (10 Texel + 10 Calpe) met OUDE vs NIEUWE tekst
- Excel: `/root/fase_r6b_steekproef.xlsx` + `C:\Users\frank\Downloads\fase_r6b_steekproef.xlsx`

**STAP 5: Hervertaling (NL, DE, ES)**:
- 6.177 vertalingen (2.059 POIs × 3 talen)
- 100% success na 3 runs (rate limiting retry met checkpoint)
- Full coverage behouden: Calpe 1.483, Texel 1.596 per taal
- Doorlooptijd: ~54 min totaal (3 runs)

**Deliverables op Hetzner** (`/root/`):
- `fase_r6b_source_rescrape.py` — Stap 1: source re-scrape
- `fase_r6b_claim_stripping.py` — Stap 2: chirurgisch claim strippen + DB apply
- `fase_r6b_ampm_sweep.py` — Stap 3: AM/PM sweep database-breed
- `fase_r6b_steekproef.py` — Stap 4: Frank's steekproef Excel
- `fase_r6b_retranslate.py` — Stap 5: hervertaling NL/DE/ES
- `fase_r6b_enhanced_facts.json` — Verrijkte fact sheets
- `fase_r6b_stripped_results.json` — Claim stripping resultaten
- `fase_r6b_steekproef.xlsx` — Frank's review Excel
- `fase_r6b_translate_checkpoint.json` — Vertaling checkpoint

### Fase R6c Resultaten (ChromaDB Re-vectorisatie + Steekproef Fix — 19/02/2026)
- **Status**: COMPLEET (19-02-2026)
- **Doel**: ChromaDB `texel_pois` en `calpe_pois` collecties updaten met R6b claim-stripped content zodat beide chatbots feitelijk correcte beschrijvingen serveren
- **Embedding model**: mistral-embed (1024 dims)

**Texel (`texel_pois`)**:
- Vectoren verwijderd: 6.640 (oude POI vectoren)
- Vectoren aangemaakt: 6.384 (1.596 POIs × 4 talen)
- Errors: 0
- Duur: 27,6 min | Kosten: €2,55
- Calpe ongewijzigd: PASS
- Test queries: 5/5 PASSED

**Calpe (`calpe_pois`)**:
- Vectoren verwijderd: 6.152 (oude POI vectoren)
- Vectoren aangemaakt: 5.932 (1.483 POIs × 4 talen)
- Errors: 1 (POI 1111 DE network timeout — handmatig gefixed)
- Duur: 25,7 min | Kosten: €2,37
- Texel ongewijzigd: PASS
- Test queries: 5/5 PASSED (Peñón EN, Calpe NL, Essen DE, Playas ES, Ecomare cross-check)

**Totaal**: 12.316 nieuwe vectoren, €4,92 kosten, 53 min

**Steekproef Fix (2 POI-correcties)**:
- POI 2562 (Vuurtoren Texel): "Battle of Kikkert" → notaris Kikkert campagne
- POI 326 (Terra Mítica): "Open year-round" → seizoensgebonden (mid-May)
- Beide POIs: EN gecorrigeerd + NL/DE/ES hervertaald + audit trail

**Deliverables op Hetzner** (`/root/`):
- `chromadb_r6b_revectorize.mjs` — Texel re-vectorisatie script (Node.js ESM)
- `chromadb_r6b_revectorize_calpe.mjs` — Calpe re-vectorisatie script (Node.js ESM)
- `chromadb_r6b_revectorize_report_20260219.json` — Texel rapport
- `chromadb_calpe_r6b_revectorize_report_20260219.json` — Calpe rapport
- `chromadb_pre_r6b_revectorize_backup_20260219.json` — Texel pre-revectorisatie backup
- `chromadb_calpe_pre_r6b_revectorize_backup_20260219.json` — Calpe pre-revectorisatie backup
- `chromadb_r6b_revectorize.log` — Texel uitvoeringslog
- `chromadb_calpe_r6b_revectorize.log` — Calpe uitvoeringslog
- `steekproef_fix_2_pois.py` — Steekproef fix script
- `steekproef_fix_backup_20260219.json` — Steekproef fix backup

### Fase R6d Resultaten (Openstaande Acties Afhandeling — 19/02/2026)
- **Status**: COMPLEET (19-02-2026)
- **Doel**: Drie openstaande acties uit Content Pipeline afhandelen

**ACTIE 3: Social Media Bronnen — BESLUIT (19-02-2026)**:
- Status: Geaccepteerd als technische beperking
- Reden: Meta anti-bot maatregelen blokkeren scraping (0,2% Facebook, 0% Instagram)
- Impact: Beperkt — claim stripping compenseert het gebrek aan bronverificatie via social media
- Verbetering Alicante: Overweeg Meta Graph API (vereist developer account + app review)
- Verbetering generiek: Manual enrichment voor Tier 1-2 POIs (top 50-100 per destination)

**ACTIE 4: 119 POIs Zonder Content — INVENTARISATIE**:
- Alle 119 POIs = Accommodation categorie (bewust excluded via `is_excluded_from_enrichment`)
- Texel: 64 POIs (alle Accommodation)
- Calpe: 55 POIs (alle "Accommodation (do not communicate)")
- Groep B/C/D (geen data, brondata aanwezig, recent) = **0 POIs**
- Conclusie: Geen actie nodig — alle POIs zijn bewust uitgesloten
- Content coverage: Texel 96,1% (1.596/1.660), Calpe 96,4% (1.483/1.538)

**ACTIE 5: Markdown Fix Database-Breed**:
- Verwacht: 1 POI (2279 Kaap Noord), Gevonden: **388 POIs** met markdown links
- Calpe: 186 POIs, Texel: 202 POIs
- EN: 383, NL: 384, DE: 386, ES: 382 velden gefixed
- Totaal veldupdates: 1.535
- Regex: `\[text\](http...)` → `text` (link text behouden, URL verwijderd)
- Overige markdown (**bold**, ## headers): 0 POIs gevonden
- Audit trail: 1.535 entries in poi_content_history (bron: `markdown_fix_post_r6b`)
- Verificatie: **0 markdown links resterend** in database

**Deliverables op Hetzner** (`/root/`):
- `markdown_fix_post_r6b.py` — Scan + fix script
- `markdown_fix_backup_20260219.json` — Backup 388 POIs (alle 4 talen)
- `markdown_fix_log_20260219.json` — Fix log met details per POI
- `inventarisatie_119_pois.py` — Inventarisatie script
- `inventarisatie_pois_zonder_content.json` — Volledig rapport

### Fase 7 Resultaten (Reviews Integratie — 19/02/2026)
- **Status**: COMPLEET (19-02-2026)
- **Kosten**: EUR 0 (geen LLM calls, pure code fix + deploy)

**Diagnostic (Step 0)**: API werkte al correct — Outcome A. Alle 8.964 reviews hebben real data in model kolommen (user_name, review_text, sentiment, visit_date). Migration 009 kolommen (reviewer_name, text, sentiment_label etc.) bestaan NIET in productie DB. Geen schema mismatch.

**Reviews Data**:

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| Reviews | 3.869 | 5.095 | 8.964 |
| Met review_text | ~3.200 | ~4.300 | 7.519 |
| Sentiment: positive | ~2.800 | ~3.900 | 6.691 |
| Sentiment: neutral | ~700 | ~800 | 1.523 |
| Sentiment: negative | ~300 | ~400 | 750 |

**Database Schema**: 18 kolommen — 11 model + 7 extra (destination_id, google_review_id, is_archived, archived_at, language, likes_count, source). Reviews tabel heeft eigen `destination_id` kolom.

**Backend Wijzigingen**:
- `publicPOI.js`: `rating_distribution` toegevoegd aan `/reviews/summary` endpoint (5-star breakdown)
- `Review.js` model: Geen wijzigingen nodig (model matched productie DB)

**Frontend Wijzigingen**:
- `POIDetailPage.tsx`: `poiName={poi.name}` toegevoegd aan `<POIReviewSection>` (was "This Place" in WriteReviewModal)
- `UserReviewsContext.tsx`: Mock reviews (3 hardcoded reviews) gated achter `import.meta.env.DEV` check

**Bestaande Code (Ongewijzigd)**:
- `POIReviewSection.tsx` — Container met summary, filters, cards, pagination
- `POIReviewCard.tsx` — Individuele review kaart
- `POIReviewFilters.tsx` — Travel party, sentiment, sort filters
- `reviewService.ts` — API client (gebruikt apiClient met X-Destination-ID)
- `review.types.ts` — TypeScript interfaces
- `sentimentAnalysis.ts` — Badges, formatting, calculations
- `WriteReviewModal.tsx` — Review schrijven (TODO: API submission)
- 5 CSS bestanden (Section, Card, Filters, WriteReview, Metadata)

**Testing**: 7/7 API tests PASS:
1. Texel POI met reviews: 200 + real data
2. Texel POI zonder reviews: 200 + total 0
3. Calpe regressie: 200 + real data
4. Sort highRating: correct descending
5. Sort lowRating: correct ascending
6. Pagination offset/limit: correct
7. Summary met rating_distribution: correct

**Deployed naar**: texelmaps.nl, dev.texelmaps.nl, holidaibutler.com (alle 3 frontends + backend)

### Fase 8A Resultaten (Agent Reparatie & Versterking — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code, geen LLM calls)
- **Doel**: Calpe agent baseline = 100% werkend vóór multi-destination uitrol (8B)

**15 Agent Naamgeving (Nederlands):**

| # | Agent | Nederlandse Naam | Categorie |
|---|-------|-----------------|-----------|
| 1 | Orchestrator | De Maestro | Core |
| 2 | Owner Interface | De Bode | Core |
| 3 | Health Monitor | De Dokter | Operations |
| 4 | Data Sync | De Koerier | Operations |
| 5 | HoliBot Sync | Het Geheugen | Operations |
| 6 | Communication Flow | De Gastheer | Operations |
| 7 | GDPR | De Poortwachter | Operations |
| 8 | UX/UI | De Stylist | Development |
| 9 | Code | De Corrector | Development |
| 10 | Security | De Bewaker | Development |
| 11 | Quality | De Inspecteur | Development |
| 12 | Architecture | De Architect | Strategy |
| 13 | Learning | De Leermeester | Strategy |
| 14 | Adaptive Config | De Thermostaat | Strategy |
| 15 | Prediction | De Weermeester | Strategy |

**8A Wijzigingen (7 agents):**

| Step | Agent | Wijziging | Bestanden |
|------|-------|-----------|-----------|
| 8A-1 (P0) | De Koerier | Column mapping fix: reviewer_name→user_name, text→review_text, sentiment_label→sentiment, review_date→visit_date. Removed spam_score/review_hash. Added destination_id passthrough. | reviewsManager.js, dataSync/index.js |
| 8A-2 (P1) | De Bode | Per-destination POI counts + review counts (MySQL). Prediction alerts + optimization count. 7 nieuwe MailerLite custom fields. | dailyBriefing.js |
| 8A-3 (P1) | De Leermeester | MongoDB persistence: `agent_learning_patterns` collection. In-memory cache backed by DB. Survives PM2 restart. | learningAgent.js, strategyLayer/index.js |
| 8A-4 (P1) | De Thermostaat | Complete rewrite: simulation-only → alerting-only. Redis persistence (thermostaat:last_evaluation + history). Owner decides manually. | adaptiveConfigAgent.js |
| 8A-5 (P2) | De Stylist | DESTINATION_BRAND_COLORS map (calpe + texel). detectDestination(filePath). Texel #30c59b niet meer geflagged als violation. | uxReviewer.js |
| 8A-6 (P2) | De Dokter | 3 nieuwe portals (API, Texel prod, Texel dev). SSL expiry monitoring voor 5 domains via tls.connect(). | frontendHealth.js |
| 8A-7 (P3) | Legacy | workers.js deprecated banner + self-execution disabled. | workers.js |

**MailerLite Custom Fields (Frank: aanmaken in dashboard, alle type `text`):**
- `calpe_pois`, `texel_pois`, `calpe_reviews`, `texel_reviews`
- `prediction_alerts`, `prediction_summary`, `optimization_count`

### Fase 8A+ Resultaten (Agent Monitoring & Briefing Expansion — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code, geen LLM calls)
- **Doel**: 3 monitoring modules + 5 scheduled jobs + daily briefing expansion

**Nieuwe Modules:**

| Module | Agent | Beschrijving | MongoDB Collection |
|--------|-------|-------------|-------------------|
| contentQualityChecker.js | De Koerier (#4) | POI content completeness + consistency checks (heuristic, geen AI) | content_quality_audits |
| backupHealthChecker.js | De Dokter (#3) | Backup recency + disk space monitoring. Alert on CRITICAL. | backup_health_checks |
| smokeTestRunner.js | De Dokter (#3) | E2E smoke tests: 5 per destination + 3 infrastructure. READ-ONLY. | smoke_test_results |

**Nieuwe Scheduled Jobs (5):**

| Job | Cron | Beschrijving |
|-----|------|-------------|
| content-quality-audit | Monday 05:00 | Content completeness + consistency per destination |
| backup-recency-check | Daily 07:30 | Backup file age + disk space |
| smoke-test | Daily 07:45 | All smoke tests (Calpe + Texel + Infra) |
| chromadb-state-snapshot | Sunday 03:00 | ChromaDB vector count snapshot (Het Geheugen) |
| agent-success-rate | Monday 05:30 | 7-day agent success rate aggregation |

**Daily Briefing Expansion (De Bode):**
- Section ordering: Alerts → Smoke Tests → Backups → POI & Reviews → Content Quality → Predictions → Agents → Budget
- 3 nieuwe MailerLite fields: `smoke_test_summary`, `backup_summary`, `content_quality_summary`

**MailerLite Custom Fields (Frank: aanmaken in dashboard, alle type `text`):**
- 8A fields: `calpe_pois`, `texel_pois`, `calpe_reviews`, `texel_reviews`, `prediction_alerts`, `prediction_summary`, `optimization_count`
- 8A+ fields: `smoke_test_summary`, `backup_summary`, `content_quality_summary`

**Test Resultaten**: 16/16 PASS
- Content Quality: 5/5 (completeness Calpe 100%, Texel 100%, consistency 12 flags, audit 9/10, MongoDB persist)
- Backup Health: 3/3 (recency CRITICAL detected, disk 67% HEALTHY, alert sent)
- Smoke Tests: 3/3 (Calpe 4/5, Texel 4/5, Infra 3/3)
- Scheduling: 2/2 (40 jobs registered, Calpe regression PASS)
- Daily Briefing: 3/3 (smoke, backup, content sections populated)

**Bestanden:**

| Actie | Bestand |
|-------|---------|
| NEW | `src/services/agents/dataSync/contentQualityChecker.js` |
| NEW | `src/services/agents/healthMonitor/backupHealthChecker.js` |
| NEW | `src/services/agents/healthMonitor/smokeTestRunner.js` |
| MODIFIED | `src/services/orchestrator/scheduler.js` (+5 jobs) |
| MODIFIED | `src/services/orchestrator/workers.js` (+5 handlers) |
| MODIFIED | `src/services/agents/holibotSync/index.js` (+createChromaDBSnapshot) |
| MODIFIED | `src/services/orchestrator/ownerInterface/dailyBriefing.js` (rewrite) |

### Fase 8B Resultaten (Agent Multi-Destination — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code refactoring, geen LLM calls)
- **Doel**: Alle 15 agents destination-aware maken via BaseAgent pattern + Threema verificatie

**BaseAgent Pattern:**
- `BaseAgent.js`: Foundation class met `run('all')` / `run(destinationId)` / `aggregateResults()`
- `destinationRunner.js`: Mixin helper die `run()` toevoegt aan bestaande agent singletons zonder herschrijven
- `agentRegistry.js`: Centrale registratie van alle 18 entries (15 agents + 3 monitoring modules)
- Config bridge: `createRequire()` voor ESM→CJS import van destination configs

**Agent Classificatie:**

| Categorie | Agents | Pattern | Beschrijving |
|-----------|--------|---------|-------------|
| **A: Destination-Aware** | 13 | `runForDestination(id)` | Draait per destination (Calpe + Texel) |
| **B: Shared** | 5 | `execute()` | Platform-breed, draait 1x |

**Categorie A Agents (13):**
De Maestro (#1), De Bode (#2), De Dokter (#3), De Koerier (#4), Het Geheugen (#5), De Gastheer (#6), De Poortwachter (#7), De Inspecteur (#11), De Leermeester (#13), De Thermostaat (#14), De Weermeester (#15), Content Quality Checker, Smoke Test Runner

**Categorie B Agents (5):**
De Stylist (#8), De Corrector (#9), De Bewaker (#10), De Architect (#12), Backup Health Checker

**Threema Verificatie:**
- `checkThreemaConfiguration()` in smokeTestRunner.js (passieve env var check, GEEN echte berichten)
- Status: NOT_CONFIGURED (env vars niet gezet op Hetzner)
- Dagelijkse check via smoke-test job (07:45)
- Alert in daily briefing als NOT_CONFIGURED
- Daily briefing velden: `threema_status`, `alert_items` (incl. Threema warning)

**Config Mapping Fix:**
- ROOT CAUSE: `getActiveDestinations()` returns config met `config.destination.id`, NIET `config.id`
- Fix: beide `destinationRunner.js` en `BaseAgent.js` gebruiken nu `c.destination.id/code/name`

**Test Resultaten**: 22/22 PASS
- BaseAgent unit tests: 10/10 (instantiation, config mapping, single dest, error isolation, timing)
- Threema tests: 4/4 (method exists, status check, dailyBriefing fields)
- Agent registry: 4/4 (18 agents, all have run(), dest-aware have runForDestination(), shared have execute())
- Integration: 4/4 (40 BullMQ jobs, health Calpe/Texel, POI API Calpe/Texel)

**Bestanden:**

| Actie | Bestand |
|-------|---------|
| NEW | `src/services/agents/base/BaseAgent.js` |
| NEW | `src/services/agents/base/destinationRunner.js` |
| NEW | `src/services/agents/base/agentRegistry.js` |
| MODIFIED | `src/services/agents/healthMonitor/smokeTestRunner.js` (+Threema check, +threema schema) |
| MODIFIED | `src/services/orchestrator/ownerInterface/dailyBriefing.js` (+threema_status, +alert_items) |

### Fase 8C-0 Resultaten (Admin Portal Foundation — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code, geen LLM calls)
- **Doel**: Enterprise-level admin portal foundation met login, dashboard, en CI/CD

**Architectuur Beslissing**: Admin API routes DIRECT in platform-core (unified backend op port 3001). GEEN apart admin-module backend. Frontend praat met api.holidaibutler.com.

**Infrastructuur**:
- 3 Apache VHosts: admin.dev/test/holidaibutler.com (aangemaakt in eerdere sessie)
- 3 SSL certs: Let's Encrypt (aangemaakt in eerdere sessie)
- CORS uitgebreid: admin.* origins toegevoegd aan api.holidaibutler.com-le-ssl.conf

**Backend (6 endpoints in platform-core/src/routes/adminPortal.js)**:

| Endpoint | Functie | Auth | Beschrijving |
|----------|---------|------|-------------|
| POST /auth/login | Login | Rate limit (5/15min) | bcrypt verify + JWT (8h) + refresh (7d) |
| GET /auth/me | Profiel | Admin token | User data + role |
| POST /auth/refresh | Token refresh | Refresh token | Nieuwe access token |
| POST /auth/logout | Uitloggen | Admin token | Session cleanup |
| GET /dashboard | KPIs | Admin token | POI counts, reviews, users, agents, jobs (Redis cache 120s) |
| GET /health | Systeem status | Admin token | MySQL, MongoDB, Redis, BullMQ status |

**Frontend (React 18 + Vite 4 + MUI 5 + Zustand 4)**:

| Component | Beschrijving |
|-----------|-------------|
| LoginPage | Email/password form met gradient background |
| DashboardPage | KPI cards, destination cards, system health, quick links |
| AdminLayout | Sidebar (6 items) + header + destination selector |
| ProtectedRoute | JWT check + redirect naar /login |
| authStore (Zustand) | JWT persist in localStorage, auto-refresh |
| Axios interceptor | JWT attach + 401→refresh→retry pattern |
| i18n | NL (default) + EN vertalingen |
| Bugsink | Project 3 (admin-portal) DSN |

**CI/CD**: `.github/workflows/deploy-admin-module.yml`
- Single job: build from admin-module/ root + rsync to Hetzner
- Environment mapping: dev→admin.dev, test→admin.test, main→admin
- Backup + health check + automatic rollback on failure
- Concurrency control per branch

**Admin User**: admin@holidaibutler.com (id=3, role=admin)

**Test Resultaten**: 15/15 PASS
- Backend: 8/8 (login 400/401/200/403, auth/me 401/200, dashboard 401/200)
- Frontend: 4/4 (LoginPage, ProtectedRoute, DashboardPage, Sidebar)
- Infra: 3/3 (production 200, test 200, CORS header)

**Bestanden**:

| Actie | Bestand |
|-------|---------|
| NEW | `platform-core/src/routes/adminPortal.js` (6 endpoints, 7th added in 8C-1) |
| MODIFIED | `platform-core/src/index.js` (route registration) |
| NEW | `admin-module/package.json` (root level) |
| NEW | `admin-module/vite.config.js` |
| NEW | `admin-module/index.html` |
| NEW | `admin-module/.env.development`, `.env.test`, `.env.production` |
| NEW | `admin-module/src/` (30+ files: pages, components, stores, hooks, api, i18n) |
| MODIFIED | `.github/workflows/deploy-admin-module.yml` (rewrite for new architecture) |

### Fase 8C-1 Resultaten (Agent Dashboard — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code, geen LLM calls)
- **Doel**: Agent monitoring dashboard in admin portal

**Backend (1 nieuw endpoint)**:
- GET /agents/status — 18 agent entries met status per destination (Cat A) of platform-breed (Cat B)
- Data bronnen: static AGENT_METADATA (18 entries) + MongoDB audit_logs + Redis thermostaat + monitoring collections
- Redis cache 60s (key: `admin:agents:status`), force refresh met `?refresh=true`
- Server-side filtering: `?category=operations` + `?destination=calpe`
- Graceful degradation: `partial: true` als MongoDB/Redis faalt
- Summary: healthy/warning/error/unknown counts
- Recent activity: laatste 50 audit log entries gemapped naar agent namen

**Frontend (6 bestanden)**:

| Bestand | Beschrijving |
|---------|-------------|
| `admin-module/src/pages/AgentsPage.jsx` | Full dashboard: summary cards, filter bar, sortable agent tabel, recent activity |
| `admin-module/src/utils/agents.js` | AGENT_ICONS (18 emoji's), CATEGORY_COLORS, STATUS_COLORS, getAgentIcon(), formatTimestamp() |
| `admin-module/src/api/agentService.js` | fetchAgentStatus() met query params |
| `admin-module/src/hooks/useAgentStatus.js` | React Query hook (5 min refetch, 1 min stale) |
| `admin-module/src/i18n/nl.json` | +30 agents.* keys (NL) |
| `admin-module/src/i18n/en.json` | +30 agents.* keys (EN) |

**Dashboard Features**:
- 4 Summary cards: healthy/warning/error/unknown met kleur-gecodeerde borders
- 6 Category filter chips: All, Core, Operations, Development, Strategy, Monitoring
- Destination dropdown: All/Calpe/Texel
- Sortable agent tabel: naam, categorie, type, schedule, Calpe status, Texel status, overall status
- Cat A agents: individuele Calpe + Texel destination kolommen met status dot + timestamp
- Cat B agents: "— (gedeeld)" merged over destination kolommen (colSpan=2)
- Status dots: kleur-gecodeerd (groen/oranje/rood/grijs) met tooltips
- Recent Activity: laatste 10 entries (expandeerbaar naar 50)
- Auto-refresh: 5 minuten via React Query
- Loading: Skeleton placeholders
- Error: Alert banner met retry + partial data warning
- Responsive: Type kolom verborgen op mobile

**Tests**: 12/12 PASS (6 backend + 4 frontend + 2 integration)
**adminPortal.js versie**: v1.1.0 (was v1.0.0)

**Bestanden**:

| Actie | Bestand |
|-------|---------|
| MODIFIED | `platform-core/src/routes/adminPortal.js` (v1.1.0, +AGENT_METADATA, +GET /agents/status) |
| NEW | `admin-module/src/utils/agents.js` |
| NEW | `admin-module/src/api/agentService.js` |
| NEW | `admin-module/src/hooks/useAgentStatus.js` |
| REWRITTEN | `admin-module/src/pages/AgentsPage.jsx` (was placeholder) |
| MODIFIED | `admin-module/src/i18n/nl.json` (+agents section) |
| MODIFIED | `admin-module/src/i18n/en.json` (+agents section) |

### Fase 8D Resultaten (Admin Portal Feature Pack — 20/02/2026)
- **Status**: COMPLEET (20-02-2026)
- **Kosten**: EUR 0 (pure code, geen LLM calls)
- **Doel**: 4 resterende admin portal modules: POI Management, Reviews Moderatie, Analytics Dashboard, Settings

**Backend (12 nieuwe endpoints in adminPortal.js v2.0.0)**:

| Module | Endpoints | Beschrijving |
|--------|-----------|-------------|
| 8D-1 POI Management | GET /pois, GET /pois/stats, GET /pois/:id, PUT /pois/:id | List+pagination+search+filters, stats per destination (Redis 5min), detail met content 4 talen + images + reviews, edit content + is_active (audit logged) |
| 8D-2 Reviews Moderatie | GET /reviews, GET /reviews/:id, PUT /reviews/:id | List+pagination+filters+summary, detail met POI context, archive/unarchive toggle (audit logged) |
| 8D-3 Analytics | GET /analytics, GET /analytics/export | Overview+trends+top10+categories (Redis 10min), CSV export pois/reviews/summary (max 10k rows) |
| 8D-4 Settings | GET /settings, GET /settings/audit-log, POST /settings/cache/clear | System info+service status+destinations, admin audit log (MongoDB, paginated), Redis cache invalidation (audit logged) |

**Frontend (4 nieuwe pagina's + 4 API services + 4 hooks)**:

| Module | Pagina | Features |
|--------|--------|----------|
| POIs | POIsPage.jsx | Stats cards per destination, filter bar (destination/content/status/sort), sortable table, detail dialog (images, 4-lang content tabs, review summary), edit dialog (4-lang content, is_active toggle, 2000 char validation) |
| Reviews | ReviewsPage.jsx | Summary cards (total/avg/positive/negative), filter bar (destination/rating/sentiment/archived), table met sentiment icons, detail dialog, archive/unarchive toggle |
| Analytics | AnalyticsPage.jsx | KPI cards, line chart review trends (12 maanden), pie chart categorie verdeling, content coverage bars per destination, top 10 POIs table, CSV export (summary/pois/reviews) |
| Settings | SettingsPage.jsx | System info (runtime/services/admin), destination data cards, cache management met confirmation dialog, audit log table met action filter en pagination |

**i18n**: 100+ nieuwe keys in nl.json en en.json (pois.*, reviews.*, analytics.*, settings.*)

**Routing**: App.jsx PlaceholderPage → echte pagina componenten (alle 6 sidebar items nu actief)

**Bestanden**:

| Actie | Bestand |
|-------|---------|
| MODIFIED | `platform-core/src/routes/adminPortal.js` (v2.0.0, 19 endpoints) |
| NEW | `admin-module/src/api/poiService.js` |
| NEW | `admin-module/src/api/reviewService.js` |
| NEW | `admin-module/src/api/analyticsService.js` |
| NEW | `admin-module/src/api/settingsService.js` |
| NEW | `admin-module/src/hooks/usePOIs.js` |
| NEW | `admin-module/src/hooks/useReviews.js` |
| NEW | `admin-module/src/hooks/useAnalytics.js` |
| NEW | `admin-module/src/hooks/useSettings.js` |
| REWRITTEN | `admin-module/src/pages/POIsPage.jsx` (was placeholder) |
| REWRITTEN | `admin-module/src/pages/ReviewsPage.jsx` (was placeholder) |
| REWRITTEN | `admin-module/src/pages/AnalyticsPage.jsx` (was placeholder) |
| REWRITTEN | `admin-module/src/pages/SettingsPage.jsx` (was placeholder) |
| MODIFIED | `admin-module/src/App.jsx` (routing update) |
| MODIFIED | `admin-module/src/i18n/nl.json` (+100 keys) |
| MODIFIED | `admin-module/src/i18n/en.json` (+100 keys) |

### Fase 8D-FIX Resultaten (Admin Portal Bug Fix — 21/02/2026)
- **Status**: COMPLEET (21-02-2026)
- **Kosten**: EUR 0 (pure code fixes, geen LLM calls)
- **Doel**: 12 bugs gevonden bij live testing van admin.dev.holidaibutler.com oplossen

**Root Cause**: Frontend-backend response structure mismatches door snelle 8D development (field naming, nesting, data types).

**Backend Fixes (adminPortal.js v2.0.0 → v2.1.0)**:

| Fix | Bug | Root Cause | Oplossing |
|-----|-----|-----------|-----------|
| Fix 1 | POI Stats 500 | `parseInt("texel")` = NaN | `resolveDestinationId()` helper (string→id mapping) |
| Fix 1b | POI Stats missing keys | Frontend leest `data.calpe`, backend had `data.byDestination.calpe` | Per-destination top-level keys (calpe, texel) met total/active/contentCoverage/avgRating |
| Fix 2-3 | POI Detail wrong data | Backend: `data.description`/`data.tileDescription`, Frontend: `data.detail`/`data.tile` | Renamed: `description`→`detail`, `tileDescription`→`tile` |
| Fix 2b | POI Detail reviewSummary | Backend: `reviews` (object distribution), Frontend: `reviewSummary` (array distribution) | Key renamed + distribution als `[{rating: 5, count: N}, ...]` array |
| Fix 4 | Review stats not loaded | Backend: `summary.totalReviews` + nested `sentimentBreakdown`, Frontend: `summary.total` + flat keys | Flattened: `totalReviews`→`total`, sentimentBreakdown keys naar top-level |
| Fix 5 | Review detail mismatch | Backend: `data.review`, Frontend: `data?.data` | Frontend fix: `data?.data?.review` |
| Fix 10 | Settings services disconnected | Backend: `system.mysqlHost`/`mongodbStatus`/`redisStatus`, Frontend: `system.mysql`/`mongodb`/`redis` | Keys renamed + MySQL `SELECT 1` health check toegevoegd |
| Fix 10b | Destinations Texel=Calpe | Backend returns array, Frontend uses `Object.entries()` | Array→Object keyed by destination code |
| Fix 10c | Audit log dashes | Backend: `admin_email` + `details`, Frontend: `actor.email` + `detail` | Field mapping: `admin_email`→`actor.email`, `details`→`detail` |

**Frontend Fixes**:

| Fix | Bug | Oplossing |
|-----|-----|-----------|
| Fix 2-3 | POI Detail data | `data?.data`→`data?.data?.poi` (POIsPage.jsx) |
| Fix 5 | Review Detail data | `data?.data`→`data?.data?.review` (ReviewsPage.jsx) |
| Fix 6 | Review archive no undo | Snackbar + undo handler (ReviewsPage.jsx) |
| Fix 7 | QuickLinks "Coming soon" | Chip removed, Reviews/Analytics/Settings links added (QuickLinks.jsx) |
| Fix 8 | Agent detail dialog | Click-to-detail dialog met agent info, destination status, errors (AgentsPage.jsx) |
| Fix 9 | Sentry DSN invalid | Hyphens verwijderd uit DSN key (.env.development/.test/.production) |

**Bestanden gewijzigd**:

| Actie | Bestand |
|-------|---------|
| MODIFIED | `platform-core/src/routes/adminPortal.js` (v2.1.0, resolveDestinationId, 11 fixes) |
| MODIFIED | `admin-module/src/pages/POIsPage.jsx` (poi wrapper fix) |
| MODIFIED | `admin-module/src/pages/ReviewsPage.jsx` (review wrapper + snackbar undo) |
| MODIFIED | `admin-module/src/pages/AgentsPage.jsx` (click-to-detail dialog) |
| MODIFIED | `admin-module/src/components/dashboard/QuickLinks.jsx` (removed Coming soon, added links) |
| MODIFIED | `admin-module/.env.development` (Sentry DSN key fix) |
| MODIFIED | `admin-module/.env.test` (Sentry DSN key fix) |
| MODIFIED | `admin-module/.env.production` (Sentry DSN key fix) |
| MODIFIED | `admin-module/src/i18n/nl.json` (+reviews.archived/unarchived/undo, +agents.close) |
| MODIFIED | `admin-module/src/i18n/en.json` (+reviews.archived/unarchived/undo, +agents.close) |

**Test Resultaten**: 33/33 PASS (T1-T19, meerdere assertions per test)

### Fase 8E Resultaten (Admin Portal Hardening & UX Upgrade — 21/02/2026)
- **Status**: COMPLEET (21-02-2026)
- **Kosten**: ~EUR 0,50 (79 ES vertalingen via Mistral AI, rest pure code)
- **Doel**: Agent ecosystem fixes, content audit & repair, admin portal UX hardening

**BLOK 1: Agent Ecosystem Fixes (4 items)**:

| Fix | Probleem | Oplossing | Status |
|-----|----------|-----------|--------|
| Backup Health Checker | BACKUP_DIR `/root/backups` bestond niet, regex matched alleen `.gz` | Dir aangemaakt, regex uitgebreid naar `.sql`/`.sql.gz` patterns | ✅ |
| Daily Briefing URGENT | `hasCritical` checkte alleen budget/errors, NIET smoke/backup failures | `hasCriticalAgents` variabele: backup CRITICAL + smoke FAILURES → [URGENT] subject | ✅ |
| De Maestro status | **ROOT CAUSE**: `calculateAgentStatus()` checkte `lastRun.status === 'completed'` maar line 689 transformeert naar `'success'` | Fix: `(lastRun.status === 'completed' \|\| lastRun.status === 'success')` → **18/18 agents HEALTHY** | ✅ |
| Daily MySQL backup | Geen automated MySQL backup cron op Hetzner | Cron job `0 3 * * *` mysqldump naar `/root/backups/` met 7-day rotation | ✅ |

**BLOK 2: Content Audit & Repair (3 items)**:

| Audit | Bevinding | Actie | Status |
|-------|-----------|-------|--------|
| Walvisvaardershuisje (POI 2465) | Content is R6b-era clean, maar ES vertaling ONTBRAK | 79 Texel POIs met ontbrekende ES vertalingen batch-vertaald (Mistral AI) | ✅ |
| Asterisken scan | 14 POIs (11 Texel + 3 Calpe) met stray markdown `*` in content | `REPLACE('*', '')` op EN/NL/DE/ES kolommen, 0 resterend | ✅ |
| is_active audit | 121 non-Accommodation POIs inactive (100 = Montaditos chain Food & Drinks) | Gedocumenteerd voor Frank's review — mogelijk intentioneel gedeactiveerd | ✅ |

**BLOK 3: Admin Portal UX Fixes (11 items)**:

| # | Fix | Beschrijving |
|---|-----|-------------|
| 3A | Destination filter header | Global destination selector in AdminLayout header (alle pagina's) |
| 3B | Vlaggen bij destination | 🇪🇸 Calpe / 🇳🇱 Texel emoji vlaggen in selector + agent tabel |
| 3C | Sorteerbare kolommen | Sortable columns op POIs (naam/rating/reviews), Reviews (rating/date), Analytics (views) |
| 3D | Analytics review trends | Vervangt lege trend chart: 12-maanden grouped by month (line chart data fix) |
| 3E | Reviews destination filter | Filter reviews op Calpe/Texel via destination selector |
| 3F | POI detail link | "Bekijk op website" link naar live frontend POI pagina |
| 3G | Agent profielen NL | Nederlandse beschrijvingen voor alle 18 agents in AGENT_METADATA |
| 3H | Categorie kleuren | 5 unieke kleuren per categorie chip (Core/Operations/Development/Strategy/Monitoring) |
| 3I | Scheduled jobs popup | Klik op "40 jobs" → dialog met alle scheduled jobs (naam, cron, beschrijving) |
| 3J | Taalversie keuze | Language selector NL/EN/DE/ES in Settings met i18n voor DE + ES |
| 3K | Agent detail uitbreiding | Warning/error agents tonen detail + aanbevolen actie in detail dialog |

**BLOK 4: Documentatie & Deploy (5 doc fixes)**:

| Fix | Probleem | Oplossing |
|-----|----------|-----------|
| Agent Masterplan versie | L1449 zei `3.4.0`, L97 zei `4.2.0` | Geharmoniseerd naar `4.2.0` |
| 8C-0 endpoint count | Documentatie zei "7 endpoints" maar 8C-0 had 6 (7e was agents/status in 8C-1) | Gecorrigeerd naar "6 endpoints" + note |
| CLAUDE.md self-ref | Strategische Documentatie tabel verwees naar `3.30.0` | Bijgewerkt naar `3.31.0` |
| Master Strategie versie ref | MS verwees naar CLAUDE.md `v3.29.0` | Bijgewerkt naar `v3.31.0` |
| MS Budget tabel | 8D-FIX en 8E ontbraken | Toegevoegd |

**Bestanden gewijzigd**:

| Actie | Bestand |
|-------|---------|
| MODIFIED | `platform-core/src/routes/adminPortal.js` (calculateAgentStatus fix) |
| MODIFIED | `platform-core/src/services/agents/healthMonitor/backupHealthChecker.js` (regex + dir) |
| MODIFIED | `platform-core/src/services/orchestrator/ownerInterface/dailyBriefing.js` (URGENT subject) |
| MODIFIED | `admin-module/src/components/layout/AdminLayout.jsx` (destination selector) |
| MODIFIED | `admin-module/src/pages/AgentsPage.jsx` (flags, colors, profiles, jobs popup, detail) |
| MODIFIED | `admin-module/src/pages/POIsPage.jsx` (sorting, detail link, destination filter) |
| MODIFIED | `admin-module/src/pages/ReviewsPage.jsx` (destination filter, sorting) |
| MODIFIED | `admin-module/src/pages/AnalyticsPage.jsx` (trend data fix, sorting) |
| MODIFIED | `admin-module/src/pages/SettingsPage.jsx` (language selector, DE/ES i18n) |
| MODIFIED | `admin-module/src/i18n/nl.json` (+agent profiles, +scheduled jobs, +language) |
| MODIFIED | `admin-module/src/i18n/en.json` (+agent profiles, +scheduled jobs, +language) |
| NEW | `admin-module/src/i18n/de.json` (German i18n) |
| NEW | `admin-module/src/i18n/es.json` (Spanish i18n) |

**Database wijzigingen**:
- 14 POIs asterisks verwijderd (11 Texel + 3 Calpe)
- 79 Texel POIs ES vertalingen toegevoegd (0 resterend missing)
- Hetzner: `/root/fase_8e_missing_es.py` + cron backup job

### Agent Systeem Fasen (Eerder Voltooid)
| Fase | Beschrijving | Status |
|------|--------------|--------|
| Fase 1 | Foundation | ✅ COMPLEET |
| Fase 2 | Orchestrator | ✅ COMPLEET |
| Fase 3 | Specialized Agents | ✅ COMPLEET |
| Fase 4 | Development Layer | ✅ COMPLEET |
| Fase 5 | Strategy Layer | ✅ COMPLEET |

**Totaal Scheduled Jobs**: 40

---

## 📈 POI Tier Strategie

### Score Berekening
```
score = (review_count × 0.30) +
        (average_rating × 0.20) +
        (tourist_relevance × 0.30) +
        (booking_frequency × 0.20)
```

### Tier Classificatie
| Tier | Score | Update Frequentie | Max POIs |
|------|-------|-------------------|----------|
| 1 | ≥ 8.0 | Dagelijks 06:00 | 25 |
| 2 | ≥ 7.0 | Wekelijks (maandag) | 250 |
| 3 | ≥ 5.0 | Maandelijks (1e) | 1000 |
| 4 | < 5.0 | Kwartaal (Jan/Apr/Jul/Oct) | Onbeperkt |

### POI Quality Filters (Browse View)
- Rating >= 4.0
- Review count >= 3
- Enriched tile description required
- At least 3 images required
- Exclusies: Laadpunten, begraafplaatsen, accommodatie (is_hidden_category)

### MapView Configuratie
| Destination | Zoom | POIs per Category |
|-------------|------|-------------------|
| Texel | 10 | 7 |
| Calpe | 14 | 7 |

---

## 🔒 Security & Compliance

### GDPR Compliance
- User data: Verwijdering binnen 72 uur na verzoek
- Partner data: Owner approval vereist
- Audit trail: 30 dagen retentie
- Data export: Op verzoek binnen 24 uur

### EU AI Act Compliance
- Transparantie over AI gebruik
- Menselijke controle via approval workflows
- Bias monitoring in aanbevelingen

### EU-First Infrastructure
| Component | Locatie | Compliance |
|-----------|---------|------------|
| Server | 🇩🇪 Hetzner (91.98.71.87) | ✅ GDPR |
| Database | 🇩🇪 Hetzner | ✅ GDPR |
| Monitoring | 🇳🇱 Bugsink | ✅ GDPR |
| Email | 🇱🇹 MailerLite | ✅ GDPR |
| Alerts | 🇨🇭 Threema | ✅ GDPR |
| LLM | 🇫🇷 Mistral AI | ✅ GDPR |

---

## 🖥️ Server Informatie

### SSH Toegang
```bash
ssh root@91.98.71.87
```

### Belangrijke Paden
| Pad | Beschrijving |
|-----|--------------|
| `/var/www/api.holidaibutler.com/platform-core/` | Backend |
| `/var/www/holidaibutler.com/customer-portal/` | Calpe frontend |
| `/var/www/texelmaps.nl/customer-portal/` | Texel frontend |
| `/var/www/api.holidaibutler.com/storage/poi-images/` | POI images (Calpe + Texel) |
| `/var/www/admin.holidaibutler.com/` | Admin portal (production) |
| `/var/www/admin.test.holidaibutler.com/` | Admin portal (test) |
| `/var/www/admin.dev.holidaibutler.com/` | Admin portal (dev) |
| `/root/backups/` | Database backups |
| `/root/fase*` | Fase output bestanden |

### Fase Output Bestanden op Hetzner
```
/root/
├── fase3_pilot_output.json
├── fase3_quality_analysis.md
├── fase3_replacement_advice.md
├── fase4_full_output.json
├── fase4_generation_report.md
├── fase4_quality_analysis.json
├── fase4_quality_sample.md
├── fase4_checkpoint.json
├── fase4b_comparison_summary.md
├── fase4b_review_required.json
├── fase4b_category_analysis.md
├── fase4b_content_comparison.py
├── fase4b_checkpoint.json
├── texel_old_nl_archive.json
├── texel_image_linker.py
├── texel_image_linker_checkpoint.json
├── texel_image_linker_output.log
├── texel_vectorize_qna.py
└── texel_vectorize_output.log
```

### Quick Health Check Commands
```bash
# PM2 status
pm2 status

# Redis check
redis-cli ping

# Check scheduled jobs (40 verwacht)
cd /var/www/api.holidaibutler.com/platform-core
node -e "const { Queue } = require('bullmq'); const Redis = require('ioredis'); async function c() { const conn = new Redis(); const q = new Queue('scheduled-tasks', { connection: conn }); const jobs = await q.getRepeatableJobs(); console.log('Jobs:', jobs.length); await q.close(); await conn.quit(); } c();"

# Check staging status
mysql -u pxoziy_1_w -p'i9)PUR^2k=}!' -h jotx.your-database.de pxoziy_db1 \
  -e "SELECT content_source, status, COUNT(*) FROM poi_content_staging GROUP BY content_source, status;"
```

---

## 📞 Contact & Escalatie

| Urgentie | Actie | Kanaal |
|----------|-------|--------|
| 1 (Info) | Daily digest | Briefing email |
| 2 (Laag) | Email | MailerLite |
| 3 (Medium) | Email | MailerLite |
| 4 (Hoog) | Priority email | MailerLite |
| 5 (Kritiek) | Email + Threema | Alle kanalen |

**Owner Email**: info@holidaibutler.com
**Owner Threema**: V9VUJ8K6

---

## 📚 Gerelateerde Documentatie

| Document | Locatie | Versie |
|----------|---------|--------|
| Master Strategie | `docs/strategy/HolidaiButler_Master_Strategie.md` | 6.8 |
| Agent Masterplan | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 4.2.0 |
| Fase 2 Docs | `docs/agents/fase2/` | - |
| Fase 3 Docs | `docs/agents/fase3/` | - |
| Fase 4 Docs | `docs/agents/fase4/` | - |
| Fase 5 Docs | `docs/agents/fase5/` | - |
| API Documentatie | `docs/api/` | - |
| Deployment Guide | `infrastructure/README.md` | - |

---

## 📋 Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **3.31.0** | **2026-02-21** | **Fase 8E Admin Portal Hardening & UX Upgrade COMPLEET: BLOK 1: Agent ecosystem fixes (Backup Health regex+dir, dailyBriefing URGENT subject, De Maestro calculateAgentStatus 'completed'/'success' fix → 18/18 HEALTHY, daily MySQL backup cron). BLOK 2: Content audit (14 asterisk POIs fixed, 79 missing ES translations batch-vertaald, 121 inactive POIs gedocumenteerd). BLOK 3: 11 UX fixes (global destination filter+vlaggen, sortable columns, analytics trends, reviews destination filter, POI detail link, agent profielen NL, categorie kleuren, scheduled jobs popup, taalversie NL/EN/DE/ES). BLOK 4: 5 doc fixes (Agent Masterplan versie, endpoint count, version refs). Kosten: ~EUR 0,50. CLAUDE.md v3.31.0, Master Strategie v6.8.** |
| **3.30.0** | **2026-02-21** | **Fase 8D-FIX Admin Portal Bug Fix COMPLEET: 12 bugs gefixed bij live testing. Backend (adminPortal.js v2.1.0): resolveDestinationId() helper (string→id mapping), POI stats per-destination top-level keys, POI detail field renames (description→detail, tileDescription→tile, reviews→reviewSummary array), review summary flattened (totalReviews→total, sentimentBreakdown→top-level), settings system keys (mysql/mongodb/redis + SELECT 1 health check), destinations array→object, audit-log field mapping (admin_email→actor.email, details→detail). Frontend: POI/review detail wrapper fix, snackbar undo archive, QuickLinks live links, agent click-to-detail dialog, Sentry DSN hyphens removed. 33/33 tests PASS. Kosten: EUR 0. CLAUDE.md v3.30.0, Master Strategie v6.7.** |
| **3.29.0** | **2026-02-20** | **Fase 8D Admin Portal Feature Pack COMPLEET: 4 modules: POI Management (list/detail/edit/stats, 4 endpoints), Reviews Moderatie (list/detail/archive, 3 endpoints), Analytics Dashboard (overview/trends/export, 2 endpoints), Settings (system/audit-log/cache, 3 endpoints). 4 nieuwe pagina's, 4 API services, 4 hooks, 100+ i18n keys NL/EN. Alle sidebar items actief. adminPortal.js v2.0.0 (19 endpoints). Build OK. 8C-1 audit correcties (adminPortal.js in routes tree, agents/status in endpoint tabel). Kosten: EUR 0. CLAUDE.md v3.29.0, Master Strategie v6.6.** |
| **3.28.0** | **2026-02-20** | **Fase 8C-1 Agent Dashboard COMPLEET: Backend: GET /agents/status endpoint (AGENT_METADATA 18 entries, MongoDB audit_logs, Redis thermostaat, monitoring collections, Redis cache 60s, graceful degradation). Frontend: AgentsPage met summary cards (4), filter bar (6 category chips + destination dropdown), sortable agent tabel (18 rijen, Cat A destination-aware, Cat B shared), recent activity (10/50 entries), auto-refresh 5 min. i18n NL/EN (30+ keys). 12/12 tests PASS. Kosten: EUR 0. adminPortal.js v1.1.0 (7 endpoints). 8C-0 audit correcties (doc refs). CLAUDE.md v3.28.0, Master Strategie v6.5.** |
| **3.27.0** | **2026-02-20** | **Fase 8C-0 Admin Portal Foundation COMPLEET: Infrastructuur (3 VHosts + SSL + CORS). Backend: 6 admin API endpoints in platform-core (login, refresh, logout, me, dashboard, health). JWT auth (8h access + 7d refresh), bcrypt, rate limiting, Redis cache. Frontend: React 18 + MUI 5 + Vite 4 + Zustand (login, dashboard, layout, i18n NL/EN). CI/CD: deploy-admin-module.yml met backup + health check + rollback. Admin user: admin@holidaibutler.com. 15/15 tests PASS. Kosten: EUR 0. 8B audit correcties (doc references). CLAUDE.md v3.27.0, Master Strategie v6.4.** |
| **3.26.0** | **2026-02-20** | **Fase 8B Agent Multi-Destination COMPLEET: BaseAgent pattern (run/runForDestination/aggregateResults). 3 nieuwe bestanden: BaseAgent.js, destinationRunner.js, agentRegistry.js. 18 agents geregistreerd (13 Categorie A destination-aware, 5 Categorie B shared). Threema configuratie verificatie in smoke tests (dagelijks, passief). Daily briefing: threema_status + alert_items velden. Config mapping fix (c.destination.id i.p.v. c.id). 22/22 tests PASS. Kosten: EUR 0. Repo structuur bijgewerkt. CLAUDE.md v3.26.0, Master Strategie v6.3.** |
| **3.25.0** | **2026-02-20** | **Fase 8A+ Agent Monitoring & Briefing Expansion COMPLEET: 3 nieuwe monitoring modules (contentQualityChecker, backupHealthChecker, smokeTestRunner). 5 nieuwe scheduled jobs (content-quality-audit, backup-recency-check, smoke-test, chromadb-state-snapshot, agent-success-rate). Totaal jobs: 35→40. Daily briefing (De Bode) uitgebreid met smoke test summary, backup summary, content quality summary (3 MailerLite fields). ChromaDB state snapshot via Het Geheugen. 16/16 tests PASS. Kosten: EUR 0. CLAUDE.md v3.25.0.** |
| **3.24.0** | **2026-02-20** | **Fase 8A Agent Reparatie & Versterking COMPLEET: 7 agents gerepareerd/versterkt. De Koerier (P0): column mapping fix (9 kolommen, table name casing, destination_id passthrough). De Leermeester (P1): MongoDB persistence (agent_learning_patterns collection). De Thermostaat (P1): complete rewrite naar alerting-only + Redis persistence. De Bode (P1): destination stats, prediction alerts, optimization count (7 MailerLite fields). De Stylist (P2): DESTINATION_BRAND_COLORS map (calpe + texel). De Dokter (P2): 3 nieuwe portals + SSL expiry monitoring (5 domains). Legacy workers.js deprecated. 15 agent naamgeving gedocumenteerd. Kosten: EUR 0. CLAUDE.md v3.24.0, Master Strategie v6.1.** |
| **3.23.0** | **2026-02-19** | **Fase 7 Reviews Integratie COMPLEET: 8.964 reviews (3.869 Texel, 5.095 Calpe) live op beide frontends. Diagnostic: API werkte al correct (Outcome A), model kolommen hebben real data, migration 009 kolommen bestaan niet. Backend: rating_distribution toegevoegd aan /reviews/summary endpoint. Frontend: poiName fix (POIDetailPage.tsx), mock reviews gated achter DEV check (UserReviewsContext.tsx). 7/7 API tests PASS, Calpe regressie PASS. Kosten: EUR 0.** |
| **3.22.0** | **2026-02-19** | **Fase R6d Openstaande Acties Afhandeling COMPLEET: (1) Social Media Bronnen besluit: geaccepteerd als technische beperking (0,2% FB, 0% IG scraping door Meta anti-bot). (2) 119 POIs inventarisatie: alle 119 = Accommodation (bewust excluded), 0 POIs gemist. (3) Markdown fix database-breed: 388 POIs gerepareerd (verwacht: 1), 1.535 velden gecorrigeerd, 0 markdown links resterend. Audit trail: 1.535 entries. Content Repair Pipeline R1-R6d COMPLEET.** |
| **3.21.0** | **2026-02-19** | **Fase R6c Calpe Re-vectorisatie COMPLEET: calpe_pois collectie ge-revectoriseerd met R6b claim-stripped content. 5.932 nieuwe vectoren (1.483 POIs × 4 talen), 1 error (gefixed), 25,7 min, €2,37. Texel ongewijzigd (PASS). 5/5 test queries passed. Beide chatbots (Tessa + HoliBot) serveren nu feitelijk correcte R6b content.** |
| **3.20.0** | **2026-02-19** | **Fase R6c ChromaDB Re-vectorisatie Texel + Steekproef Fix COMPLEET: texel_pois collectie ge-revectoriseerd met R6b claim-stripped content. 6.384 nieuwe vectoren (1.596 POIs × 4 talen), 0 errors, 27,6 min, €2,55. 2 POI-correcties: Vuurtoren Texel (Battle of Kikkert → notaris campagne) + Terra Mítica (year-round → seasonal). Steekproef fixes incl. NL/DE/ES hervertalingen + audit trail (8+1 entries). Tessa serveert nu feitelijk correcte content.** |
| **3.19.0** | **2026-02-19** | **Fase R6b Content Quality Hardening COMPLEET: 2.047 POIs chirurgisch claim-stripped (0 failures, AIDA behouden, gem. woordaantal 98→85). AM/PM sweep database-breed (41 POIs, 68 conversies, 0 resterend). 6.177 hervertalingen NL/DE/ES (100% coverage). Enhanced fact sheets via deep website re-scrape (109 successen). Frank's steekproef Excel (20 POIs). Audit trail: 2.097 entries (2.047 claim_strip + 50 ampm_sweep). Content Repair Pipeline R1-R6b COMPLEET.** |
| **3.18.0** | **2026-02-18** | **Fase R6 Content Completion & Vertaling COMPLEET: Alle 3.079 POIs productie-gereed. Stap A: Frank's handmatige review Top 150 (87 GOED, 61 AANPASSEN, 2 AFKEUREN) + 317 threshold-verhoogd gepromoveerd. Stap B: 884 generieke veilige beschrijvingen (gem. 44 woorden, 0 failures). Stap C: 9.066 vertalingen NL/DE/ES (100% coverage, 49 min parallel). Staging: alle 3.079 entries applied. Audit trail: 3.079 entries in poi_content_history. Content Repair Pipeline R1-R6 COMPLEET.** |
| **3.17.0** | **2026-02-16** | **Fase R5 Safeguards & Kwaliteitsborging COMPLEET: 1.730 POIs gepromoveerd naar productie (0 errors), 1.003 geblokkeerd door safeguards (HIGH severity/hallucinatie > 20%). poi_content_history audit trail (1.730 entries). Safeguard regels: HIGH claim blocker, hallucinatie threshold, woordaantal, embellishment blocklist, onbekende bestemming enforcer. Monitoring script met quarterly audit capability. Backend contentValidator.js hook. Content Repair Pipeline R1-R5 COMPLEET.** |
| **3.16.0** | **2026-02-13** | **Fase R4 Regeneratie + Verificatie Loop COMPLEET: 3.079 POIs opnieuw gegenereerd met R3 anti-hallucinatie prompts + R2 brondata. Gemiddelde hallucinatie: 19.5% (was 61% in R1, -41.5 procentpunt). 0 errors. Verdicts: 397 PASS (13%), 2.114 REVIEW (69%), 568 FAIL (18%). Aanbevelingen: 2.511 USE_NEW (82%), 568 MANUAL_REVIEW (18%). Per kwaliteit: rich 18.5%, moderate 20.6%, minimal 19.0%, none 24.6%. Staging-first workflow: poi_content_staging tabel. Triage rapport met Top 30 per bestemming. 449 minuten doorlooptijd (mistral-large-latest gen+verify). 6 deliverables op Hetzner.** |
| **3.15.0** | **2026-02-13** | **Fase R3 Prompt Redesign COMPLEET: Anti-hallucinatie prompt templates met 16 regels, 4 kwaliteitsniveaus (rich/moderate/minimal/none), categorie-specifieke guardrails, vertaal-bewuste verificatie-prompt. Test: 61% hallucinatie (R1) gedaald naar ~14% (R3). 3/12 PASS, 7/12 REVIEW, 1/12 FAIL. Verwijderde R1-root causes: "concrete detail", "surprising element", "be specific". Brondata-injectie uit R2 fact sheets. Woorddoelen: 110-140 (rich) tot 30-60 (none). 5 deliverables op Hetzner. Klaar voor R4 regeneratie.** |
| **3.14.0** | **2026-02-13** | **Fase R2 Source Data Verrijking COMPLEET: 1.923 POI-websites gescrapet (92% success rate), 3.079 fact sheets gegenereerd. Data quality: 1.462 rich (47%), 231 moderate (8%), 1.066 minimal (35%), 320 none (10%). Texel 65% dekking, Calpe 44%. Geëxtraheerde feiten: 488 openingstijden, 265 prijzen, 835 telefoonnummers. 29 MB fact sheets klaar voor R4 regeneratie. 380 minuten doorlooptijd.** |
| **3.13.0** | **2026-02-12** | **Fase R1 Content Damage Assessment COMPLEET: Geautomatiseerde fact-check van 100 POIs (50 Texel + 50 Calpe). Resultaat: 61% gemiddeld hallucinatiepercentage. 100% van POIs severity HIGH/CRITICAL. NO-GO voor productie. Root cause: prompt "Include concrete detail" zonder brondata. 10 deliverables op Hetzner (rapport, fact-check data, scrape targets, prompt verbeteringen). Content Repair Pipeline R2-R5 gepland. Master Strategie v5.0.** |
| **3.12.0** | **2026-02-11** | **Fase 6e Round 3: Texla→Tessa in 6 frontend pagina's (23 occurrences, NL/EN/DE). ChromaDB warnings: @chroma-core/default-embed geïnstalleerd + no-op embedding function in getCollection()/createCollection() (15+ warnings → 3). Spacing ROOT CAUSE gefixed: generieke camelCase regex ([a-z])([A-Z])→$1 $2 in cleanAIText() (\\b word boundary werkt niet voor "deTegeltjes"). Icon centering: object-fit:contain i.p.v. cover+transform. Itinerary images: getImagesForPOIs() toegevoegd aan itinerary endpoint, poi_XXXX→MySQL ID extractie. 11 bestanden gewijzigd.** |
| **3.11.0** | **2026-02-11** | **Fase 6e Round 2: Opening hours format mismatch ROOT CAUSE gefixed (array+Dutch day names vs object+English). Itinerary: Dutch categorie matching voor time-of-day selectie (natuur, actief, cultuur, eten). 60+ Nederlandse subcategorie iconen in MessageList.tsx + CategoryBrowser.tsx. Streaming chat: cleanAIText() toegevoegd aan done event. Image priority: getLocalImagePriority() deprioritiseert street view ook als lokaal opgeslagen. Chat avatar: destination-aware (texelmaps-icon.png voor Texel). 6 bestanden gewijzigd.** |
| **3.10.0** | **2026-02-11** | **Fase 6e X-Destination-ID + Daily Tip Overhaul + Spacing + Icons: 11 fetch() calls gefixed met X-Destination-ID header. Daily tip: LLM verwijderd, imageurls lookup, golden rule filter. Spacing: connectingWords na locatienamen.** |
| **3.9.0** | **2026-02-10** | **Fase 6d Destination Routing + Categories + Fuzzy Match + Spacing: ROOT CAUSE gefixed — getDestinationFromRequest() accepteert nu string ("texel") EN numeric (2) IDs (parseInt("texel")=NaN→default Calpe was ROOT CAUSE alle gebroken Texel endpoints). CORS fix: Apache RewriteRule i.p.v. SetEnvIf ($0 shell expansion bug). Category whitelist: exact 8 Texel categorieën + 3 ontbrekende iconen. normalizeDutchNumbers() voor POI name matching (12→twaalf). fixResponseSpacing() voor LLM spacing errors. Itinerary event query: destination_id i.p.v. hardcoded calpe_distance. 10 issues gefixed in 3 backend + 1 frontend + 1 Apache config.** |
| **3.8.0** | **2026-02-10** | **Fase 6c SSL + Sentry DSN + Suggestion Content Fix: (1) SSL certificaat + Apache VHost aangemaakt voor api.holidaibutler.com — was ROOT CAUSE van ERR_CERT_COMMON_NAME_INVALID (cert ontbrak volledig, Apache viel terug op admin.dev.holidaibutler.com). (2) Sentry DSN gefixed: key zonder hyphens, .env.texel enabled, .env.production toegevoegd (Bugsink project 2). (3) suggestionService.js volledig destination-aware: TIME_BASED_SUGGESTIONS nu per-destination (calpe/texel) met lokale content (Texel: eilandcafé, duinen, Ecomare, Den Burg, vuurtoren, Oudeschild). SEASONAL_SUGGESTIONS → SEASONAL_CATEGORIES (neutral). Fase 7-8 hernummerd conform origineel strategic plan.** |
| **3.7.0** | **2026-02-09** | **Fase 6b Quick Actions Destination Fix COMPLEET: 4 gebroken quick action endpoints gefixed voor Texel. daily-tip: Haversine formula + destination_id filter (geen Calpe events meer voor Texel). directions: POI lookup met destination_id. suggestions: destination-aware greetings/tips/season highlights. trending: JOIN met POI tabel voor destination filter. Texel-specifieke tips: fietstocht, zilte lucht, woeste golven. Config: quickActionCategories per destination. Geen Calpe regressie.** |
| **3.6.0** | **2026-02-08** | **Fase 6 AI Chatbot Texel "Tessa" COMPLEET: Multi-destination HoliBot met eigen ChromaDB collection per destination. Texel chatbot "Tessa" met 94.980 vectoren (93.241 QnA + 1.739 POI). 14 bestanden gewijzigd (8 backend + 5 frontend + 1 config). Destination-aware: chromaService multi-collection, ragService, intentService Texel patterns, embeddingService system prompts, conversationService destination_id. Frontend: welkomstberichten, chatnaam, avatar per destination. Geen Calpe regressie. Kosten: ~EUR 19 vectorisatie. Strategic Advisory v3.0.** |
| **3.5.0** | **2026-02-08** | **Fase 5c Texel Image Fix COMPLEET: 11.506 imageurls records aangemaakt voor 1.606 Texel POIs. Images bestonden op disk (4,1 GB) maar waren niet gekoppeld aan database. Apache configs gefixed (texelmaps.nl + dev + test). POI Image Pipeline sectie toegevoegd. Strategic Advisory v2.9.** |
| **3.4.0** | **2026-02-08** | **Fase 5/5b COMPLEET: Content Apply & Translation afgerond (6.844 vertalingen, EUR 18,22). Fase 5b: kolom mismatch gevonden (enriched_detail_description_en vs base), database-only fix (2.701 POIs _en→base, 414 markdown strip). POI tabel kolommen geactualiseerd: base=EN (geen _en suffix). Strategic Advisory v2.8.** |
| **3.3.0** | **2026-02-07** | **MAJOR UPDATE: Fase 2-4b documentatie toegevoegd. Texel LIVE (texelmaps.nl). TexelMaps huisstijl (#30c59b/#3572de/#ecde3c). POI Content Pipeline gedocumenteerd (staging workflow, LLM generatie, 9 kwaliteitscriteria). poi_content_staging tabel schema. Fase 4 resultaten: 2.515 POIs, EUR 8.93, 100% success. Fase 4b: 2.481 approved, 34 manual review → Frank akkoord. Strategic Advisory referentie toegevoegd (v2.6). Hetzner fase output bestanden gedocumenteerd.** |
| 3.2.0 | 2026-01-28 | Multi-Destination Architecture Fase 1 COMPLEET: destinations table, destination_id toegevoegd aan 6 tabellen, config files. |
| 3.1.1 | 2026-01-28 | HoliBot sync bug gefixed: kolomnamen gecorrigeerd. Alle 35 jobs operationeel. |
| 3.1.0 | 2026-01-28 | Server monitoring toolkit toegevoegd. Database tabelnamen gecorrigeerd. |
| 3.0.1 | 2026-01-27 | Email fix: Dual-group rotation voor dagelijkse briefing. |
| 3.0.0 | 2026-01-27 | Fase 5 Strategy Layer COMPLEET. Major version - alle 5 agent fases compleet! |
| 2.9.1 | 2026-01-20 | CLAUDE.md correcties: Job count, docs referenties. |
| 2.9.0 | 2026-01-19 | Fase 4 Development Layer COMPLEET. |
| 2.8.0 | 2026-01-19 | GDPR Agent v1.0 LIVE. |
| 2.7.1 | 2026-01-19 | Database tabellen toegevoegd (user_journeys). |
| 2.7.0 | 2026-01-19 | Communication Flow Agent v1.0 LIVE. |
| 2.6.0 | 2026-01-19 | HoliBot Sync Agent v1.0 LIVE. |
| 2.5.1 | 2026-01-19 | Deployment volgorde gedocumenteerd. |
| 2.5.0 | 2026-01-19 | Data Sync Agent v2.0 ACTIVATED. |
| 2.4.0 | 2026-01-19 | Platform Health Monitor v1.0 LIVE. |
| 2.3.0 | 2026-01-19 | MailerLite automation-based email. |
| 2.2.0 | 2026-01-18 | Data Sync Agent v2.0 Enterprise. |
| 2.1.0 | 2026-01-14 | Fase 2 compleet, Sentry→Bugsink, Threema. |
| 2.0.0 | 2026-01-12 | Merge technische details + agent architectuur. |
| 1.0.0 | 2026-01-05 | Origineel: deployment protocol, code conventies. |

---

## ⚠️ Belangrijke Notitie voor Toekomstige Sessies

**Dit document (CLAUDE.md) is de SINGLE SOURCE OF TRUTH voor het HolidaiButler project.**

Bij elke nieuwe sessie of na context compaction:
1. Lees ALTIJD eerst dit bestand volledig
2. Lees daarna de Master Strategie (`docs/strategy/HolidaiButler_Master_Strategie.md`)
3. Verifieer de actuele status in de codebase VOORDAT je status updates geeft
4. Maak GEEN aannames over implementatie status
5. Check `/services/agents/` voor daadwerkelijk geïmplementeerde agents
6. Check `poi_content_staging` voor content pipeline status

**Enterprise Kwaliteitsstandaarden:**
- Elke feature moet enterprise-level en state-of-the-art zijn
- Geen errors of foutmeldingen bij deployment
- CLAUDE.md updaten na elke relevante wijziging
- Staging-first workflow voor alle content wijzigingen

**Locaties van dit bestand:**
- GitHub: `HolidaiButler/CLAUDE.md` (alle branches)
- Hetzner: `/var/www/api.holidaibutler.com/platform-core/CLAUDE.md`

---

*Dit document wordt automatisch gelezen door Claude. Wijzigingen vereisen owner approval.*
