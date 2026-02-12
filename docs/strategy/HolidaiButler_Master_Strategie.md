# HolidaiButler Master Strategie
## Multi-Destination Architecture & Texel 100% Implementatie

**Datum**: 12 februari 2026
**Versie**: 5.0
**Eigenaar**: Frank Spooren
**Auteur**: Claude (Strategic Analysis & Implementation)
**Classificatie**: Strategisch / Vertrouwelijk
**Status**: FASE R1 COMPLEET - Content Damage Assessment. 61% hallucinatiepercentage in LLM-gegenereerde content. NO-GO voor productie. Content Repair Pipeline R2-R5 gepland.

> **Dit document vervangt**:
> - `HolidaiButler_Multi_Destination_Strategic_Advisory.md` (v3.1)
> - `HolidaiButler_Strategic_Status_Actieplan.md` (v1.0)
> - `Claude_Code_Texel_100_Percent_Fase6_7_8.md` (v3.0)
>
> **Source of truth voor project context**: `CLAUDE.md` (v3.13.0) in repo root + Hetzner

---

## Deel 1: Implementatie Voortgang

### 1.1 Fase Overzicht

| Fase | Beschrijving | Status | Start | Einde | Kosten |
|------|--------------|--------|-------|-------|--------|
| **Fase 1** | Foundation (DB schema, config, server dirs) | ✅ COMPLEET | 28-01 | 28-01 | EUR 0 |
| **Fase 2** | Texel Deployment (DNS, SSL, data import) | ✅ COMPLEET | 29-01 | 29-01 | EUR 0 |
| **Fase 3** | Texel Data Quality (POI sync, categories, branding) | ✅ COMPLEET | 02-02 | 05-02 | EUR 0 |
| **Fase 3b** | LLM Content Pilot (100 POIs) | ✅ COMPLEET | 05-02 | 05-02 | EUR 0,24 |
| **Fase 4** | Full LLM Content Run (2.515 POIs) | ✅ COMPLEET | 05-02 | 05-02 | EUR 8,93 |
| **Fase 4b** | Content Vergelijking (OLD vs NEW) | ✅ COMPLEET | 06-02 | 06-02 | EUR 6,02 |
| **Fase 5** | Content Apply & Translation | ✅ COMPLEET | 07-02 | 08-02 | EUR 18,22 |
| **Fase 5b** | Frontend Content Verificatie | ✅ COMPLEET | 08-02 | 08-02 | EUR 0 |
| **Fase 5c** | Texel Image Fix | ✅ COMPLEET | 08-02 | 08-02 | EUR 0 |
| **Fase 6** | AI Chatbot Texel "Tessa" | ✅ COMPLEET | 08-02 | 08-02 | ~EUR 19 |
| **Fase 6b** | Quick Actions Destination Fix | ✅ COMPLEET | 09-02 | 09-02 | EUR 0 |
| **Fase 6c** | SSL Fix + Sentry DSN + Suggestion Content | ✅ COMPLEET | 10-02 | 10-02 | EUR 0 |
| **Fase 6d** | Destination Routing + Categories + Fuzzy Match + Spacing | ✅ COMPLEET | 10-02 | 10-02 | EUR 0 |
| **Fase 6e** | X-Destination-ID + Daily Tip + Spacing + Icons (3 rounds) | ✅ COMPLEET | 11-02 | 11-02 | EUR 0 |
| **Fase R1** | Content Damage Assessment (100 POIs fact-check) | ✅ COMPLEET | 12-02 | 12-02 | ~EUR 1 |
| **Fase R2** | Source Data Verrijking (website scraping alle POIs) | ❌ OPEN | - | - | ~EUR 0 |
| **Fase R3** | Prompt Redesign (anti-hallucinatie) | ❌ OPEN | - | - | EUR 0 |
| **Fase R4** | Regeneratie + Verificatie Loop | ❌ OPEN | - | - | ~EUR 13 |
| **Fase R5** | Safeguards & Kwaliteitsborging | ❌ OPEN | - | - | EUR 0 |
| **Fase 7** | Reviews Integratie | ❌ OPEN | - | - | ~EUR 0 |
| **Fase 8** | AI Agents Multi-Destination (15 agents) | ❌ OPEN | - | - | ~EUR 0 |
| **Fase 8b** | Agent Dashboard (Admin Portal) | ❌ OPEN | - | - | ~EUR 0 |

### 1.2 Budget Overzicht

| Component | Geschat | Werkelijk | Status |
|-----------|---------|-----------|--------|
| Fase 3b Content Pilot | EUR 1 | EUR 0,24 | ✅ |
| Fase 4 Content Generatie | EUR 10 | EUR 8,93 | ✅ |
| Fase 4b Content Vergelijking | EUR 8 | EUR 6,02 | ✅ |
| Fase 5 Vertalingen | EUR 25 | EUR 18,22 | ✅ |
| Fase 6 Vectorisatie | EUR 25 | EUR 19,00 | ✅ |
| Fase 7 Reviews | EUR 0 | - | ❌ |
| Fase 8 Agents | EUR 0 | - | ❌ |
| **Totaal** | **EUR 69** | **EUR 52,41** | **76,0% van budget** |

### 1.3 Openstaande Componenten

| # | Component | Fase | Prioriteit | Blokkeert Launch? | Details |
|---|-----------|------|------------|-------------------|---------|
| B | **Reviews Integratie** | Fase 7 | P0 | JA - user trust | ~3.929 Texel reviews, placeholder verwijderen |
| C | **AI Agents Multi-Destination** | Fase 8 | P1 | Operationeel | 15 agents destination-aware maken |
| D | **Agent Dashboard (Admin Portal)** | Fase 8b | P1 | Operationeel | Monitoring dashboard voor 15 agents |

---

## Deel 2: Voltooide Fasen - Detail

### Fase 1: Foundation (28-01-2026)

**Database schema migratie:**
- `destinations` tabel met INT id (niet VARCHAR) + `code` VARCHAR(50)
- `destination_id` INT DEFAULT 1 toegevoegd aan 6 tabellen: POI, QA, agenda, Users, user_journeys, holibot_sessions
- Foreign keys + indexes voor performance
- Calpe=1, Texel=2, Alicante=3

**Server structuur:**
- Apache VHosts met `RequestHeader set X-Destination-ID` (niet SetEnv)
- Storage: `/var/www/api.holidaibutler.com/storage/destinations/{dest}/poi-images/`
- Symlink voor Calpe backward compatibility
- Config in `platform-core/config/destinations/` (index.js + per-destination configs)

### Fase 2: Texel Deployment (29-01-2026)

- DNS via Hetzner, SSL certbot (texelmaps.nl)
- Data import: POI 1.772, Categories 671, QnA 96.093, Reviews 3.929
- GitHub Actions matrix deployment (calpe/texel)
- VITE_DESTINATION_ID in frontend builds

### Fase 3: Texel Data Quality (02-05/02/2026)

- POI sync: 1.772 → 1.739 (97 deleted, 64 added), google_placeid als unique key
- Category hierarchie: 671 → 129 (14 level 1 + 115 level 2), 7 button categories
- Visibility flags: is_searchable_only (161), is_hidden_category (411)
- MapView: zoom 10 (Texel) vs 14 (Calpe), perCategory=7
- Branding: #30c59b/#3572de/#ecde3c, TexelMaps logo, VVV Texel partner badge
- CSS variabelen migratie: 33+ bestanden
- Performance: code splitting, lazy loading, bundle -32%
- VVV Texel scraping via GraphQL API: 240 POIs, 115 POIs contactdata
- Calpe.es scraping: 18 POIs, POI websites: 276 POIs

### Fase 4+4b: Content Generatie & Vergelijking (05-06/02/2026)

- 2.515 POIs via Mistral Medium (1.442 Calpe + 1.073 Texel)
- 100% success, 0 failures, EUR 8,93
- Kwaliteit: markdown 0%, British English 97,6%, avg 135 woorden
- Vergelijking: 2.481 approved (98,6%), 34 manual review (1,4%), 0 keep old
- NEW scoort +2,17 punten boven OLD (9,96 vs 7,79)

### Fase 5+5b+5c: Content Apply, Verificatie & Images (07-08/02/2026)

- 2.515 POIs applied, 6.844 vertalingen, EUR 18,22, 0 errors
- Kritieke fix: `enriched_detail_description_en` → `enriched_detail_description` (base kolom = EN)
- Texel image fix: 11.506 imageurls records voor 1.606 POIs (4,1 GB op disk)
- Apache Alias configs gefixed voor alle texelmaps.nl vhosts

### Fase 6: AI Chatbot Texel "Tessa" (08/02/2026)

- ChromaDB: 94.980 vectoren (93.241 QnA + 1.739 POI) in `texel_pois` collection
- Backend: 8 bestanden (chromaService, embeddingService, ragService, conversationService, intentService, holibot.js, poiSyncService, qaSyncService)
- Frontend: 5 bestanden (vite.config.ts, DestinationContext.tsx, WelcomeMessage.tsx, ChatHeader.tsx, ChatMessage.tsx)
- Config-driven persona: name="Tessa", collection="texel_pois", welcomeMessages NL/EN/DE
- Pattern: `getDestinationFromRequest(req)` → destinationConfig → collectionName

### Fase 6b: Quick Actions Destination Fix (09/02/2026)

| Endpoint | Probleem | Fix |
|----------|----------|-----|
| GET /daily-tip | calpe_distance + geen destination_id | Haversine + destination_id filter |
| POST /directions | POI lookup zonder destination filter | destination_id filter + fallback |
| GET /suggestions | Hardcoded "Calpe" teksten | Destination-aware greetings/tips |
| GET /trending | Geen destination filter | JOIN POI tabel |

Texel-specifieke tips per eigenaar feedback:
- Afternoon: "Maak een fietstocht over het eiland!"
- Summer: "Smeer je goed in door de zilte lucht en zon!"
- Spring/Autumn: "Neem winddichte kleding mee"
- Winter: "Flinke wind, woeste golven en prachtige luchten"

### Fase 6c: SSL + Sentry + Suggestion Content (10/02/2026)

| Issue | Fix |
|-------|-----|
| SSL Certificate voor api.holidaibutler.com | Certbot cert + Apache VHost met ProxyPass, CORS headers |
| Sentry DSN met hyphens in key | DSN key zonder hyphens, alle env files gefixed (project 2 = customer-portal) |
| SuggestionService hardcoded Calpe | Per-destination suggestions: calpe + texel keys met lokale content |
| SEASONAL_SUGGESTIONS hardcoded | Refactored naar SEASONAL_CATEGORIES (neutral) + getSeasonHighlight() (aware) |

SSL cert geldig tot 2026-05-11. Bugsink projects: 1=api, 2=customer-portal, 3=admin-portal.

### Fase 6d: Destination Routing ROOT CAUSE + 10 Fixes (10/02/2026)

**ROOT CAUSE**: `getDestinationFromRequest()` deed `parseInt("texel")` → NaN → default 1 (Calpe).
Frontend stuurt string "texel" via `VITE_DESTINATION_ID`, backend verwachtte nummer. ALLE endpoints waren gebroken voor Texel.

| # | Issue | Fix |
|---|-------|-----|
| 1 | **Destination Routing** (ROOT CAUSE) | `codeToId` mapping: accepteert string ("texel") EN numeric (2) |
| 2 | **CORS `/usr/bin/bash`** | Apache RewriteRule i.p.v. SetEnvIf met $0 |
| 3 | **Category Filtering** | Whitelist (8 categorieeen) i.p.v. blacklist |
| 4 | **Spacing Errors** | `fixResponseSpacing()` + extra locatienamen in cleanAIText |
| 5 | **POI Name Recognition** | `normalizeDutchNumbers()` (1-20 → NL woorden) + partial-words fuzzy matching |
| 6 | **Itinerary Events** | `calpe_distance` → `destination_id = ?` |
| 7 | **Itinerary Categories** | NL Texel categorieeen toegevoegd aan allowlist |
| 8 | **Entity Extraction** | Destination-neutral patterns, Texel locaties in exclude list |
| 9 | **Fallback Response** | Destination-aware `destName` parameter |
| 10 | **Enhanced Search** | Hardcoded " Calpe" verwijderd uit query builder |

**Texel categorieeen (whitelist)**: Eten & Drinken, Natuur, Cultuur & Historie, Winkelen, Recreatief, Actief, Gezondheid & Verzorging, Praktisch

**Bestanden gewijzigd**: holibot.js (6 fixes), ragService.js (6 fixes), CategoryBrowser.tsx (whitelist + iconen), api.holidaibutler.com-le-ssl.conf (CORS RewriteRule)

**Git**: commit f9ec10e, pushed dev → test → main

### Fase 6e: X-Destination-ID + Daily Tip + Spacing + Icons — 3 Rounds (11/02/2026)

**Round 1**: X-Destination-ID headers (11 fetch calls), Daily Tip LLM verwijderd, imageurls lookup, spacing connectingWords, Dutch category icons.
**Round 2**: Opening hours format mismatch (array+Dutch vs object+English), Dutch itinerary categories, 60+ subcategory icons, streaming cleanAIText, image priority sort, destination-aware chat avatar.
**Round 3**: Texla→Tessa (23 occurrences, 6 files), ChromaDB warnings (@chroma-core/default-embed + no-op), camelCase spacing regex, icon centering (contain vs cover), itinerary images (getImagesForPOIs + poi_XXXX ID extraction).

**Commits**: 4c3d894, dae659e, 02629c6, afe23a5 — pushed dev → test → main

### Content Repair Pipeline — Fase R1: Damage Assessment (12/02/2026)

**Aanleiding**: Handmatige steekproef door Frank (Texel-bewoner) onthulde systematische feitelijke hallucinaties in Fase 4 LLM-output. 6/6 gecontroleerde Texel POIs bevatten verzonnen details.

**Root Cause**: Het LLM (Mistral Medium) ontving per POI ONVOLDOENDE feitelijke brondata. Alleen naam, coördinaten, categorie, highlights werden meegegeven. De website-URL werd wél meegegeven maar de INHOUD van die website NIET. De prompt-instructie "Include at least one concrete detail" dwong het LLM om details te verzinnen.

**Methode**: Geautomatiseerde fact-check pipeline:
1. 50 Texel + 50 Calpe POIs geselecteerd (Top-rated met website)
2. Alle 100 websites gescrapet (96% success rate)
3. LLM fact-check: elke claim in de gegenereerde tekst vergeleken met website-data
4. Gestructureerd rapport gegenereerd

**Resultaten**:

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs gecontroleerd | 48 | 47 | 95 |
| Gemiddeld hallucinatie% | 61% | 62% | 61% |
| POIs severity HIGH/CRITICAL | 48 (100%) | 47 (100%) | 95 (100%) |
| Verified claims | 22% | 19% | 20% |
| Hallucinated claims | 53% | 56% | 55% |
| Factually wrong claims | 6% | 4% | 5% |

**Conclusie**: **NO-GO** voor productie. Content Repair Pipeline R2-R5 verplicht.

**Ergste categorieën**: Food & Drinks Calpe (75% hallucinated), Praktisch Texel (69%), Shopping (67%), Recreatief (64%).

**Typische foutpatronen**: Verzonnen prijzen (11%), verzonnen afstanden (11%), verzonnen openingstijden (6%), verzonnen menu-items (3%), verzonnen faciliteiten (3%).

**Deliverables op Hetzner**:
- `/root/fase_r1_damage_assessment.md` — Volledig rapport
- `/root/fase_r1_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r1_factcheck_texel.json` + `_calpe.json` — Fact-check data
- `/root/fase_r2_scrape_targets.json` — 1.923 POIs voor volledige scraping
- `/root/fase_r3_prompt_improvements.md` — Anti-hallucinatie prompt ontwerp

**Lessons Learned**:
1. Feitelijke correctheid moet ALTIJD onderdeel zijn van kwaliteitscriteria
2. "Concreetheid" in kwaliteitsscoring beloont hallucinaties — een verzonnen prijs scoort hoger dan geen prijs
3. Website URL meegeven ≠ website INHOUD meegeven — het LLM leest de URL niet
4. Anti-hallucinatie prompt regels: "verzin NOOIT details", "gebruik ALLEEN brondata"

**Risico Register**:
- LLM hallucinatie-risico bij onvoldoende brondata → MATERIEEL BEWEZEN (61% foutenpercentage)
- Kwaliteitscriteria die hallucinaties belonen → GEFIXED in R3 prompt ontwerp
- Vertalingen gebaseerd op foutieve content → MOET opnieuw na R4

---

## Deel 3: Openstaande Fasen - Instructies

### Fase 7: Reviews Integratie

**Scope:**
- Reviews tabel: ~8.964 totaal (Calpe ~5.035, Texel ~3.929)
- Frontend toont momenteel PLACEHOLDER reviews voor Texel
- Calpe heeft werkende reviews integratie

**Stappen:**

| Stap | Beschrijving | Status |
|------|--------------|--------|
| B.1 | Analyseer Calpe reviews code (API + frontend) | ❌ |
| B.2 | Verifieer reviews tabel kolommen en destination_id | ❌ |
| B.3 | API endpoint destination-aware maken | ❌ |
| B.4 | Frontend ReviewsSection destination-aware | ❌ |
| B.5 | Placeholder verwijderen, echte data koppelen | ❌ |
| B.6 | UI consistent met Calpe | ❌ |
| B.7 | Testing NL/EN/DE + mobile | ❌ |

**Claude Code Commando - Fase 7:**

```
FASE 7: REVIEWS INTEGRATIE TEXEL

INSTRUCTIE VOOR CLAUDE CODE:
Je gaat Fase 7 uitvoeren: integratie van echte reviews data in de Texel frontend.
Momenteel toont de frontend placeholder reviews - dit moet vervangen worden
door echte data uit de reviews tabel.

STAP 0: STRATEGISCHE DOCUMENTATIE ANALYSEREN (VERPLICHT!)

LEES VOORDAT JE BEGINT:
1. CLAUDE.md - Check Fase 6d status = COMPLEET
2. docs/strategy/HolidaiButler_Master_Strategie.md - Actuele status
3. Calpe reviews implementatie:
   grep -r "review" platform-core/src/routes/ --include="*.js"
   grep -r "review" customer-portal/frontend/src/ --include="*.tsx"

BEVESTIG:
- [ ] Fase 6d (Destination Routing Fix) = COMPLEET
- [ ] Reviews API endpoint geidentificeerd
- [ ] Frontend ReviewsSection component geidentificeerd

CONTEXT:
- Reviews tabel: ~8.964 totaal (Calpe ~5.035, Texel ~3.929)
- getDestinationFromRequest() accepteert string ("texel") EN numeric (2) IDs
- Texel destination_id = 2

UITVOERING:
B.1 - Analyseer Calpe reviews code (API + frontend)
B.2 - Verifieer reviews tabel kolommen en destination_id
B.3 - API endpoint destination-aware maken (indien nodig)
B.4 - Frontend ReviewsSection component destination-aware
B.5 - Placeholder verwijderen, echte data koppelen
B.6 - UI consistent met Calpe
B.7 - Testing NL/EN/DE + mobile + Calpe regressie

NA AFRONDING - DOCUMENTATIE UPDATE (VERPLICHT!):
1. CLAUDE.md: Fase 7 status + resultaten
2. docs/strategy/HolidaiButler_Master_Strategie.md: Fase 7 detail + lessons learned
3. Git commit & push (dev -> test -> main)
4. CLAUDE.md naar Hetzner: scp CLAUDE.md root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/
```

---

### Fase 8: AI Agents Multi-Destination (15 Agents)

**15 Agents:**

| # | Agent | Categorie | Destination-Aware | Status |
|---|-------|-----------|-------------------|--------|
| 1 | Orchestrator | Core | ❌ | OPEN |
| 2 | Owner Interface | Core | ❌ | OPEN |
| 3 | Health Monitor | Operations | ❌ | OPEN |
| 4 | Data Sync | Operations | ❌ | OPEN |
| 5 | HoliBot Sync | Operations | ✅ (Fase 6) | COMPLEET |
| 6 | Communication Flow | Operations | ❌ | OPEN |
| 7 | GDPR | Operations | ❌ | OPEN |
| 8 | UX/UI | Development | ❌ | OPEN |
| 9 | Code | Development | ❌ | OPEN |
| 10 | Security | Development | ❌ | OPEN |
| 11 | Quality | Development | ❌ | OPEN |
| 12 | Architecture | Strategy | ❌ | OPEN |
| 13 | Learning | Strategy | ❌ | OPEN |
| 14 | Adaptive Config | Strategy | ❌ | OPEN |
| 15 | Prediction | Strategy | ❌ | OPEN |

**Claude Code Commando - Fase 8:**

```
FASE 8: AI AGENTS MULTI-DESTINATION (15 AGENTS)

INSTRUCTIE VOOR CLAUDE CODE:
Je gaat Fase 8 uitvoeren: maak de 15 AI agents destination-aware.
Dit is de meest complexe fase - plan zorgvuldig en werk incrementeel.

STAP 0: STRATEGISCHE DOCUMENTATIE ANALYSEREN (VERPLICHT!)

LEES VOORDAT JE BEGINT:
1. CLAUDE.md - Check Fase 7 = COMPLEET
2. docs/strategy/HolidaiButler_Master_Strategie.md - Actuele status
3. Agent Masterplan: docs/CLAUDE_AGENTS_MASTERPLAN.md
4. Bestaande agent code: ls -la platform-core/src/services/agents/

MULTI-DESTINATION VEREISTEN:
- Agents moeten destination_id parameter ondersteunen
- Per-destination scheduling mogelijk
- Aggregated reporting voor owner
- getDestinationFromRequest() hergebruiken (accepteert string + numeric IDs)

UITVOERING:
Per agent: BaseAgent refactor -> runForDestination(destinationId) -> aggregateResults()

NA AFRONDING - DOCUMENTATIE UPDATE (VERPLICHT!):
1. CLAUDE.md + 2. Master Strategie + 3. Git + 4. Hetzner
```

---

### Fase 8b: Agent Dashboard (Admin Portal)

**Vereisten (per eigenaar):**
- Frank wil dagelijks eenvoudig kunnen monitoren
- 15 agents met status per destination (Calpe/Texel)
- Auto-refresh 5 minuten
- Filter op categorie/destination
- Recente activiteit log
- Error/warning highlighting

**Claude Code Commando - Fase 8b:**

```
FASE 8b: AGENT DASHBOARD IN ADMIN PORTAL

INSTRUCTIE VOOR CLAUDE CODE:
Je gaat Fase 8b uitvoeren: implementeer een Agent Dashboard in de Admin Portal
zodat Frank dagelijks kan monitoren wat de 15 agents doen/hebben gedaan.

STAP 0: STRATEGISCHE DOCUMENTATIE ANALYSEREN (VERPLICHT!)

LEES VOORDAT JE BEGINT:
1. CLAUDE.md - Check Fase 8 = COMPLEET
2. docs/strategy/HolidaiButler_Master_Strategie.md
3. Admin Portal structuur: ls -la admin-module/src/pages/

DASHBOARD WIREFRAME:
- Overview cards: Calpe/Texel status, Active agents count, Errors
- Filter bar: [Alle] [Core] [Operations] [Development] [Strategy] + Destination
- Agent tabel: #, Name, Calpe status, Texel status, Last run, Status
- Activity log: laatste 50 entries

UITVOERING:
1. Backend API: GET /admin/agents/status (admin auth required)
2. Frontend: AgentDashboard.tsx met useQuery (refetchInterval 5min)
3. Routing + navigation
4. Testing
5. Documentatie update (CLAUDE.md + Master Strategie + Git + Hetzner)
```

---

## Deel 4: Architectuur

### 4.1 Repository Strategie

**Monorepo** met destination-agnostische code en bestemming-specifieke configuratie.

```
HolidaiButler/
├── CLAUDE.md                      # Project context (source of truth)
├── platform-core/                 # Node.js/Express backend (gedeeld)
│   ├── config/destinations/       # Config per destination
│   │   ├── index.js               # getDestinationConfig(), getDestinationById()
│   │   ├── calpe.config.js
│   │   └── texel.config.js
│   └── src/
│       ├── routes/holibot.js      # HoliBot API (destination-aware)
│       └── services/holibot/      # RAG pipeline
├── customer-portal/frontend/      # React 19 + Tailwind (per destination build)
├── admin-module/                  # React 18 + MUI (admin.holidaibutler.com)
├── docs/strategy/                 # Dit document
└── infrastructure/apache/         # VHost templates
```

### 4.2 Branch Strategie

Gedeelde branches + feature flags (niet per-destination branches):
- `main` → Productie (alle destinations)
- `test` → Staging
- `dev` → Development
- Deploy volgorde: ALTIJD dev → test → main (wacht tussen elke push)

### 4.3 Destination Routing

```
Frontend (VITE_DESTINATION_ID="texel")
  → API request met X-Destination-ID header
    → getDestinationFromRequest(req) {
        // Accepteert string ("texel") EN numeric (2) IDs
        const codeToId = { calpe: 1, texel: 2, alicante: 3 };
        // Returns { destinationId, destinationConfig, collectionName }
      }
      → ChromaDB collection routing (calpe_pois / texel_pois)
      → Config-driven persona (name, prompts, welcome messages)
```

### 4.4 Database Schema

Shared Database met INT destination_id:
- `destinations` tabel: id INT PK + code VARCHAR(50) UNIQUE
- 6 tabellen met destination_id: POI, QA, agenda, Users, user_journeys, holibot_sessions
- EN content = base kolom (`enriched_detail_description`, GEEN _en suffix)
- Backend `getTranslatedField()`: base voor EN, `base + '_' + lang` voor andere talen

### 4.5 Server Structuur

```
/var/www/
├── api.holidaibutler.com/platform-core/   # Backend (PM2: holidaibutler-api, port 3001)
│   ├── config/destinations/
│   ├── storage/poi-images/                # Calpe (symlink) + Texel images
│   └── CLAUDE.md                          # Sync met repo
├── holidaibutler.com/                     # Calpe frontend
├── texelmaps.nl/                          # Texel frontend (DIRECT, geen subfolder)
├── dev.texelmaps.nl/                      # Texel dev
└── admin.holidaibutler.com/               # Admin portal
```

### 4.6 Apache CORS (api.holidaibutler.com)

```apache
# RewriteRule i.p.v. SetEnvIf (NOOIT $0 in heredoc!)
RewriteCond %{HTTP:Origin} ^https://(texelmaps\.nl|dev\.texelmaps\.nl|...) [NC]
RewriteRule .* - [E=ORIGIN_OK:%{HTTP:Origin}]
Header always set Access-Control-Allow-Origin "%{ORIGIN_OK}e" env=ORIGIN_OK
```

---

## Deel 5: Lessons Learned

### Fase 1 (28-01) - Foundation
- INT destination_id is beter dan VARCHAR (performance, FK constraints)
- RequestHeader boven SetEnv (betrouwbaarder backend routing)
- Symlinks voor backward compatibility
- Backup VOOR migratie

### Fase 2 (29-01) - Texel Deployment
- google_placeid als POI referentie (QnA gebruikt dit, niet poi_id)
- Batch inserts (1000) voor 96K+ records
- VITE_DESTINATION_ID voor frontend destination awareness

### Fase 3 (02-05/02) - Data Quality
- CRLF line endings breken SQL matching (Windows → Linux)
- 3-level category hierarchy: category → subcategory → poi_type
- Destination-specifieke zoom levels: Texel 10, Calpe 14
- Variable shadowing bug: altijd unieke namen (limit→perCategoryLimit)
- Deploy volgorde: ALTIJD dev→test→main met wachttijd

### Fase 4+4b (05-06/02) - Content Generatie
- Mistral Medium convergeert rond 135 woorden (target 115-125 is niet haalbaar)
- Checkpoint systeem + nohup: SSH dropout na 1.300 POIs, maar alles bewaard
- enriched_detail_description (base) = OLD EN kolom, NIET _en variant
- NEW scoort beter op ALLE 9 criteria, 0% keep old

### Fase 5+5b+5c (07-08/02) - Content Apply & Images
- Backend EN = base kolom (GEEN _en suffix) — altijd backend code verifiëren vóór DB writes
- Markdown lekkage in vertalingen: post-processing regex strip nodig
- imageurls tabel ALTIJD vullen bij image download (bestanden zonder records onzichtbaar)
- mysqldump vereist --no-defaults op Hetzner (my.cnf conflict)
- Python output buffering: gebruik -u flag of PYTHONUNBUFFERED=1

### Fase 6 (08/02) - AI Chatbot Tessa
- Config-driven persona: nieuwe destination = alleen config toevoegen
- ChromaDB separate collection per destination voorkomt cross-destination leakage
- getDestinationFromRequest() als centrale helper voor alle endpoints

### Fase 6b (09/02) - Quick Actions
- Na multi-destination refactor: ALTIJD alle endpoints testen
- calpe_distance kolom niet herbruikbaar; Haversine is universeel
- Eigenaar feedback op user-facing teksten is essentieel (NL grammatica)

### Fase 6c (10/02) - SSL + Sentry
- api.holidaibutler.com had GEEN eigen SSL cert + VHost (gebruikte wildcard)
- Sentry DSN keys: GEEN hyphens in hex key
- Bugsink projects per applicatie: 1=api, 2=customer-portal, 3=admin-portal

### Fase 6d (10/02) - Destination Routing ROOT CAUSE
- **KRITIEK**: `parseInt("texel")` = NaN → default 1 (Calpe). NOOIT parseInt() direct gebruiken op destination IDs — altijd codeToId mapping
- **NOOIT `$0` in heredoc** — bash interpreteert als shell name (`/usr/bin/bash`). Gebruik `cat <<'EOF'` (single-quoted) OF escape `\$0`
- Whitelist > blacklist voor category filtering (voorkomt ongewenste categorieën bij nieuwe data)
- Dutch number normalization voor fuzzy matching ("12 Balcken" → "twaalf Balcken")
- LLM spacing fix nodig: Mistral mergt woorden samen ("inDen Burg")

---

## Deel 6: Beslissingen Log

| Datum | Beslissing | Rationale | Beslisser |
|-------|------------|-----------|-----------|
| 28-01 | Monorepo behouden | 90%+ gedeelde code | Strategic Advisory |
| 28-01 | Shared DB met INT destination_id | Performance, FK constraints | Claude Code |
| 28-01 | texelmaps.nl als eigen domein | Brand differentiatie | Owner |
| 28-01 | RequestHeader i.p.v. SetEnv | Betrouwbaarder backend routing | Claude Code |
| 03-02 | TexelMaps huisstijl definitief | #30c59b/#3572de/#ecde3c | Owner |
| 03-02 | VVV Texel partner badge | Lokale autoriteit, vertrouwen | Owner |
| 05-02 | Mistral Medium voor content | EUR 0.00235/POI, 0% errors | Claude Code |
| 05-02 | Staging-first workflow | Review voordat POI update | Claude Code |
| 06-02 | Texel 1.073 auto-approved | OLD=NL, onbruikbaar als EN | Claude Code |
| 07-02 | 34 manual review → USE_NEW | Frank akkoord | Owner |
| 08-02 | Base kolom = EN content | Backend getTranslatedField() leest base | Claude Code |
| 08-02 | Linker script i.p.v. re-download | 4,1 GB images bestaan al op disk | Claude Code |
| 08-02 | Chatbot naam: Tessa | Eiland-expert persona | Owner |
| 08-02 | ChromaDB separate collections | Cross-destination leakage voorkomen | Claude Code |
| 09-02 | Haversine i.p.v. calpe_distance | Universeel voor alle destinations | Claude Code |
| 09-02 | Texel tips per eigenaar specificatie | Fietstocht, zilte lucht, woeste golven | Owner |
| 10-02 | codeToId mapping i.p.v. parseInt | Frontend stuurt string IDs | Claude Code |
| 10-02 | Category whitelist i.p.v. blacklist | 8 exacte categorieën, voorkomt leakage | Claude Code |
| 10-02 | RewriteRule i.p.v. SetEnvIf CORS | $0 bug in heredoc vermijden | Claude Code |
| 10-02 | 3 strategische docs → 1 master | Overzicht, minder update-werk | Owner |

---

## Deel 7: Risico Register

| Risico | Impact | Status |
|--------|--------|--------|
| parseInt("texel") = NaN → Calpe default | Hoog | ✅ Gemitigeerd (codeToId mapping) |
| $0 in heredoc = /usr/bin/bash | Hoog | ✅ Gemitigeerd (RewriteRule) |
| Kolom mismatch _en vs base | Hoog | ✅ Gemitigeerd (COPY + STRIP) |
| Texel images op disk maar niet in DB | Hoog | ✅ Gemitigeerd (linker script) |
| API SSL cert ontbrak | Hoog | ✅ Gemitigeerd (certbot) |
| Markdown lekkage in vertalingen | Laag | ✅ Gemitigeerd (regex strip) |
| 337 Texel Accommodation zonder EN | Laag | Geaccepteerd (is_hidden_category) |
| Opening repetitie ("The scent of" 162x) | Laag | Open |
| PL/SV kolommen ongebruikt | Laag | Open — kandidaten voor opschonen |
| SSL cert vervalt 2026-05-11 | Medium | Open — renewal nodig |

---

## Deel 8: Technische Referentie

### Kritieke Code Patronen

```javascript
// Destination routing (holibot.js)
function getDestinationFromRequest(req) {
  const headerValue = req.headers['x-destination-id'];
  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;
  const codeToId = { calpe: 1, texel: 2, alicante: 3 };
  return codeToId[headerValue?.toLowerCase()] || 1;
}

// Content kolom (publicPOI.js)
getTranslatedField(data, fieldBase, lang) {
  return lang === 'en' ? data[fieldBase] : data[fieldBase + '_' + lang];
}
// EN = enriched_detail_description (base, GEEN _en)

// Spacing fix (ragService.js)
fixResponseSpacing(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}
```

### Server Commando's

```bash
# PM2 restart backend
ssh root@91.98.71.87 "pm2 restart holidaibutler-api"

# Deploy backend file
scp platform-core/src/routes/holibot.js root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/src/routes/

# Deploy CLAUDE.md
scp CLAUDE.md root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/

# Build + deploy Texel frontend
cd customer-portal/frontend && npm run build -- --mode texel
scp -r dist/* root@91.98.71.87:/var/www/texelmaps.nl/

# Apache reload
ssh root@91.98.71.87 "apachectl graceful"

# MySQL (altijd --no-defaults op Hetzner)
ssh root@91.98.71.87 "mysqldump --no-defaults -u pxoziy_1 -p'j8,DrtshJSm$' pxoziy_db1 POI > /root/backups/poi_backup.sql"
```

---

## Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **4.0** | **10-02-2026** | **MASTER DOCUMENT: 3 strategische documenten geintegreerd (Strategic Advisory v3.1, Status Actieplan v1.0, Claude Code Commando v3.0). Bijgewerkt met Fase 6c (SSL, Sentry, Suggestions) en Fase 6d (ROOT CAUSE destination routing, CORS, categories, fuzzy matching, spacing, itinerary). Alle 13 voltooide fasen gedocumenteerd. Budget: EUR 52,41 van EUR 69 (76%). Resterende fasen: 7 (Reviews), 8 (Agents), 8b (Dashboard).** |

---

*Dit document wordt bijgewerkt na elke implementatiefase.*
*Laatst bijgewerkt: 10 februari 2026 - Fase 6d COMPLEET, Master Document v4.0*
*Volgende fase: Fase 7 Reviews Integratie (P0 - blokkeert launch)*
