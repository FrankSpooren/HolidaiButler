# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.16.0
> **Laatst bijgewerkt**: 13 februari 2026
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
| **Strategic Advisory** | `docs/strategy/HolidaiButler_Multi_Destination_Strategic_Advisory.md` | 2.8 | Multi-destination architectuur, implementatie log, lessons learned, beslissingen log |
| **Agent Masterplan** | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 3.4.0 | Agent architectuur, scheduled jobs |
| **CLAUDE.md** | Repository root + Hetzner | 3.4.0 | Dit bestand - project context |

### Leesadvies voor Claude
**Bij elke nieuwe sessie of complexe taak, lees in deze volgorde:**
1. CLAUDE.md (dit bestand) — project context
2. Strategic Advisory — actuele fase status en beslissingen
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
│       └── deploy-platform-core.yml  # CI/CD workflow met concurrency control
│
├── docs/
│   └── strategy/
│       └── HolidaiButler_Multi_Destination_Strategic_Advisory.md  # ✅ NIEUW
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
│   └── package.json
│
├── platform-core/          # Node.js/Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── holibot.js
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

### POI Coverage na Fase 4
| Destination | Totaal | Met EN Content | Coverage |
|-------------|--------|----------------|----------|
| Calpe | 1.495 | ~1.442 | 96% |
| Texel | 1.142 | ~1.073 | 94% |

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
| Calpe | HoliBot | `calpe_pois` | ~3.000 | Vriendelijke Calpe-gids |
| Texel | Tessa | `texel_pois` | 94.980 | Persoonlijke Texel-gids |

### ChromaDB Cloud
| Parameter | Waarde |
|-----------|--------|
| Provider | ChromaDB Cloud |
| Tenant/Database | Geconfigureerd in .env |
| Embedding model | `mistral-embed` (1024 dims) |
| LLM model | `mistral-small-latest` |
| Texel vectoren | 93.241 QnA + 1.739 POI = 94.980 |
| Vectorisatie kosten | ~EUR 19 |

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
| **Fase R5** | Safeguards & Kwaliteitsborging | ❌ GEPLAND | - |
| **Fase 7** | Reviews Integratie | ⏸️ WACHT | - |
| **Fase 8** | AI Agents Multi-Destination (15 agents) | ⏸️ WACHT | - |
| **Fase 8b** | Agent Dashboard (Admin Portal) | ⏸️ WACHT | - |

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

### Agent Systeem Fasen (Eerder Voltooid)
| Fase | Beschrijving | Status |
|------|--------------|--------|
| Fase 1 | Foundation | ✅ COMPLEET |
| Fase 2 | Orchestrator | ✅ COMPLEET |
| Fase 3 | Specialized Agents | ✅ COMPLEET |
| Fase 4 | Development Layer | ✅ COMPLEET |
| Fase 5 | Strategy Layer | ✅ COMPLEET |

**Totaal Scheduled Jobs**: 35

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

# Check scheduled jobs (35 verwacht)
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
| Strategic Advisory | `docs/strategy/HolidaiButler_Multi_Destination_Strategic_Advisory.md` | 3.0 |
| Agent Masterplan | `docs/CLAUDE_AGENTS_MASTERPLAN.md` | 3.4.0 |
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
2. Lees daarna de Strategic Advisory (`docs/strategy/HolidaiButler_Multi_Destination_Strategic_Advisory.md`)
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
