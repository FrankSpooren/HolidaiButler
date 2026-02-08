# CLAUDE.md - HolidaiButler Project Context

> **Versie**: 3.6.0
> **Laatst bijgewerkt**: 8 februari 2026 (23:00 UTC)
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
| mistral_medium_fase4 | 2.515 | ✅ Gegenereerd | Excellent (9.96/10) |
| vvv_texel | 240 | ✅ Gescraped | Goed |
| poi_website | 276 | ✅ Gescraped | Variabel |
| calpe_es | 18 | ✅ Gescraped | Goed |
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
User: pxoziy_1_w
Password: i9)PUR^2k=}!
```

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
| **Fase 7** | Alicante Preparation | ⏸️ WACHT | - |
| **Fase 8** | Stabilization | ⏸️ WACHT | - |

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
