# HolidaiButler Master Strategie
## Multi-Destination Architecture & Texel 100% Implementatie

**Datum**: 19 februari 2026
**Versie**: 5.6
**Eigenaar**: Frank Spooren
**Auteur**: Claude (Strategic Analysis & Implementation)
**Classificatie**: Strategisch / Vertrouwelijk
**Status**: FASE R6b COMPLEET - Content Quality Hardening. 2.047 POIs chirurgisch claim-stripped, AM/PM sweep database-breed, 6.177 hervertalingen. Content Repair Pipeline R1-R6b COMPLEET.

> **Dit document vervangt**:
> - `HolidaiButler_Multi_Destination_Strategic_Advisory.md` (v3.1)
> - `HolidaiButler_Strategic_Status_Actieplan.md` (v1.0)
> - `Claude_Code_Texel_100_Percent_Fase6_7_8.md` (v3.0)
>
> **Source of truth voor project context**: `CLAUDE.md` (v3.18.0) in repo root + Hetzner

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
| **Fase R2** | Source Data Verrijking (1.923 websites, 3.079 fact sheets) | ✅ COMPLEET | 12-02-2026 | 13-02-2026 | EUR 0 |
| **Fase R3** | Prompt Redesign (16 anti-hallucinatie regels, 4 kwaliteitsniveaus, verificatie-prompt) | ✅ COMPLEET | 13-02-2026 | ~14% hallucinatie (was 61%) | EUR 0.50 |
| **Fase R4** | Regeneratie + Verificatie Loop (3.079 POIs, 19.5% hallucinatie, 0 errors) | ✅ COMPLEET | 13-02-2026 | 19.5% hallucinatie (was 61%) | ~EUR 12 |
| **Fase R5** | Safeguards & Kwaliteitsborging (1.730 POIs gepromoveerd, audit trail, monitoring) | ✅ COMPLEET | 16-02-2026 | 1.730 promoted, 1.003 blocked | EUR 0 |
| **Fase R6** | Content Completion & Vertaling (884 generic + 9.066 vertalingen NL/DE/ES) | ✅ COMPLEET | 18-02-2026 | 3.079 POIs × 4 talen | ~EUR 8 |
| **Fase R6b** | Content Quality Hardening (2.047 POIs claim-stripped, AM/PM sweep, 6.177 hervertalingen) | ✅ COMPLEET | 19-02-2026 | <5% hallucinatie (geschat) | ~EUR 6 |
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
| Fase R1-R4 Content Repair | EUR 15 | EUR 13,50 | ✅ |
| Fase R6 Content Completion | EUR 10 | EUR 8,00 | ✅ |
| Fase 7 Reviews | EUR 0 | - | ❌ |
| Fase 8 Agents | EUR 0 | - | ❌ |
| **Totaal** | **EUR 94** | **EUR 73,91** | **78,6% van budget** |

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
- Vertalingen gebaseerd op foutieve content → ✅ Gemitigeerd (R6 hervertaling na R4 regeneratie)

### Content Repair Pipeline — Fase R2: Source Data Verrijking (12-13/02/2026)

**Doel**: Alle POI-websites scrapen en gestructureerde "fact sheets" bouwen als brondata voor content regeneratie in R4.

**Methode**: Geautomatiseerde scraping pipeline:
1. 1.923 POI-websites gescrapet (1.209 Texel, 714 Calpe)
2. Per website: hoofdpagina + subpagina's (/over-ons, /menu, /openingstijden, etc.)
3. Gestructureerde feiten geëxtraheerd (openingstijden, prijzen, adres, telefoon, email)
4. Gecombineerd met Google Places beschrijvingen en enriched_highlights uit DB
5. Per POI een "fact sheet" met source_text_for_llm (klaar voor R4)

**Resultaten**:

| Metric | Texel | Calpe | Totaal |
|--------|-------|-------|--------|
| POIs met content | 1.596 | 1.483 | 3.079 |
| Websites gescrapet | 1.144 | 626 | 1.770 |
| Scrape success rate | 95% | 88% | 92% |
| Data quality: rich | 984 (62%) | 478 (32%) | 1.462 (47%) |
| Data quality: moderate | 59 (4%) | 172 (12%) | 231 (8%) |
| Data quality: minimal | 452 (28%) | 614 (41%) | 1.066 (35%) |
| Data quality: none | 101 (6%) | 219 (15%) | 320 (10%) |
| Gem. bronwoorden per POI | 580 | 535 | 557 |
| Doorlooptijd | — | — | 380 minuten |

**Coverage**: 55% van POIs heeft bruikbare brondata (rich + moderate). Texel (65%) significant beter dan Calpe (44%).

**Geëxtraheerde feiten**: 488 openingstijden, 265 prijzen, 3.073 adressen, 835 telefoonnummers, 825 e-mailadressen, 1.036 features/kenmerken.

**Prompt Strategie per Data Quality** (voor R4):
- **Rich** (1.462): Volledige AIDA met grounded facts, 120-140 woorden
- **Moderate** (231): AIDA met beschikbare facts + generiek, 100-120 woorden
- **Minimal** (1.066): Korte veilige beschrijving, 70-90 woorden
- **None** (320): Generieke template, 40-60 woorden

**Deliverables op Hetzner**:
- `/root/fase_r2_scraped_data.json` — Gescrapete website-data (13 MB, 1.770 POIs)
- `/root/fase_r2_fact_sheets.json` — Gestructureerde fact sheets (29 MB, 3.079 POIs)
- `/root/fase_r2_coverage_report.md` — Coverage rapport per categorie
- `/root/fase_r2_summary_for_frank.md` — Samenvatting voor Frank (NL)
- Script: `/root/fase_r2_source_data_enrichment.py`

### Content Repair Pipeline — Fase R3: Prompt Redesign (13/02/2026)

**Doel**: Fundamentele herontwerp van de content-generatie prompt om hallucinaties te elimineren, op basis van R1 foutpatronen en R2 brondata.

**Aanpak**:
1. 16 expliciete anti-hallucinatie regels (gebaseerd op R1 top-9 fouttypen: fabricatie, openingstijden, prijzen, afstanden, menu-items, awards, sensorisch, faciliteiten, historisch)
2. 4 prompt-strategieen per data quality level (rich/moderate/minimal/none)
3. Categorie-specifieke guardrails (8 categorieparen NL+EN)
4. Brondata-injectie: source_text_for_llm uit R2 fact sheets direct in prompt
5. Vertaal-bewuste verificatie-prompt (NL/ES brondata naar EN output)
6. Verwijderde R1-root causes: "concrete detail", "surprising element", "be specific"

**Verwijderde hallucinatie-veroorzakers** (root cause uit R1):
- Rule 8: "Include at least one concrete detail (price, distance, time, feature)"
- AIDA Attention: "Hook with a unique fact, sensory detail, or surprising element"
- AIDA Desire: "What will the visitor experience? Be specific"
- Geen brondata in prompt (enkel URL, niet de inhoud)

**Test Resultaten (12 POIs, 3 per kwaliteitsniveau)**:

| Metriek | R1 (oude prompt) | R3 (nieuwe prompt) | Verbetering |
|---------|-------------------|-------------------|-------------|
| Hallucinatie-rate | 61% | ~14% | -47 procentpunt |
| PASS (0% fouten) | 0% | 25% (3/12) | +25pp |
| REVIEW (minder dan 20%) | 0% | 58% (7/12) | +58pp |
| FAIL (meer dan 20%) | 100% | 8% (1/12) | -92pp |

**Opgeloste fouttypen** (0 gevallen in test):
- Verzonnen prijzen (was 11.2% van R1 fouten)
- Verzonnen afstanden (was 10.9%)
- Verzonnen menu-items bij minimal/none POIs (was 3.6%)
- Verzonnen openingstijden (was 16.6%)
- Verzonnen faciliteiten (was 2.4%)

**Woorddoelen per kwaliteit**: Rich: 110-140, Moderate: 85-115, Minimal: 55-85, None: 30-60.

**Deliverables op Hetzner**:
- `/root/fase_r3_prompt_templates.py` — Productie-klare prompt module voor R4
- `/root/fase_r3_test_prompts.py` — Test script met verificatie
- `/root/fase_r3_test_results.json` — Volledige testresultaten
- `/root/fase_r3_test_report.md` — Gedetailleerd testrapport
- `/root/fase_r3_summary_for_frank.md` — Samenvatting voor Frank (NL)

### Content Repair Pipeline — Fase R4: Regeneratie + Verificatie Loop

**Status**: ✅ COMPLEET (13 februari 2026)
**Doorlooptijd**: 449 minuten (7,5 uur)
**Kosten**: ~EUR 12 (Mistral API — generatie + verificatie voor 3.079 POIs)

**Methode**: Twee-pass LLM pipeline per POI:
1. **Generatie**: R3 anti-hallucinatie prompts + R2 brondata-injectie → nieuwe beschrijving
2. **Verificatie**: Second-pass LLM fact-check → verdict (PASS/REVIEW/FAIL) + hallucinatie-rate
3. **Staging**: Resultaat in `poi_content_staging` tabel (niet direct in productie)

**Resultaten**:

| Kwaliteit | Aantal | Gem. Hall. | PASS | REVIEW | FAIL |
|-----------|--------|-----------|------|--------|------|
| Rich | 1.462 | 18.5% | 91 | 1.088 | 283 |
| Moderate | 231 | 20.6% | 8 | 180 | 43 |
| Minimal | 1.066 | 19.0% | 244 | 638 | 184 |
| None | 320 | 24.6% | 54 | 208 | 58 |
| **Totaal** | **3.079** | **19.5%** | **397** | **2.114** | **568** |

**Vergelijking met R1**: Hallucinatie-rate gedaald van 61% naar 19.5% (-41.5 procentpunt).

**Aanbevelingen**: 2.511 USE_NEW (82%), 568 MANUAL_REVIEW (18%)

**Volgende stappen**:
1. Frank: Review Top 30 per bestemming in triage rapport
2. Goedgekeurde content van staging naar productie (POI tabel)
3. Vertalingen opnieuw draaien (Fase 5 herhaling)
4. Fase R5: Safeguards implementeren (permanente fact-check)

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r4_regeneration.py` — Hoofdscript
- `/root/fase_r4_results.json` — Volledige resultaten per POI
- `/root/fase_r4_triage_report.md` — Review queue per bestemming
- `/root/fase_r4_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `poi_content_staging` tabel — Alle nieuwe content met review status

### Content Repair Pipeline — Fase R5: Safeguards & Kwaliteitsborging

**Status**: ✅ COMPLEET (16 februari 2026)
**Kosten**: EUR 0 (geen LLM calls nodig)

**Resultaten**:
- **1.730 POIs gepromoveerd** naar productie (POI tabel) — 0 errors
- **1.003 POIs geblokkeerd** door safeguards — HIGH severity claims of hallucinatie > 20%
- **1.730 audit trail entries** in `poi_content_history` tabel
- Monitoring rapport met hallucination distributie, per-destination breakdown

**Safeguard regels (permanent)**:
1. HIGH severity unsupported claims → GEBLOKKEERD
2. Hallucinatie-rate > 20% (30% voor 'none' quality) → GEBLOKKEERD
3. Onbekende bestemming → GEBLOKKEERD (verplichte handmatige review)
4. Woordaantal buiten range → WARNING
5. Embellishment woorden blocklist → WARNING

**Remaining**: 781 pending + 568 review_required = 1.349 POIs nog in staging voor Frank's review.

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r5_safeguards.py` — Content validatie regels module
- `/root/fase_r5_promote_staging.py` — Staging promotie + rollback
- `/root/fase_r5_monitoring.py` — Kwaliteitsrapportage + quarterly audit
- `/root/fase_r5_quality_report.md` — Gegenereerd kwaliteitsrapport
- `poi_content_history` tabel — Audit trail + rollback capability

### Content Repair Pipeline — Fase R6: Content Completion & Vertaling

**Status**: ✅ COMPLEET (18 februari 2026)
**Kosten**: ~EUR 8 (Mistral API — generic descriptions + 3 talen × 3.079 POIs)

**Doel**: Alle 1.349 resterende POIs in staging afhandelen + alle 3.079 POIs vertalen naar NL, DE, ES.

**4-stappen aanpak**:

| Stap | Beschrijving | Resultaat |
|------|--------------|-----------|
| **A.4** | Frank's Top 150 review verwerken (Excel) | 87 GOED → productie, 61 AANPASSEN → Frank's tekst, 2 AFKEUREN |
| **A.5** | Resterende pending promoveren (threshold 25%) | 317 gepromoveerd, 382 geblokkeerd |
| **B** | Generieke veilige beschrijvingen (40-70 woorden) | 884 gegenereerd, 0 failed, gem. 44 woorden |
| **C** | Vertalingen NL, DE, ES (parallel, 10 workers) | 9.066 vertalingen, 49 minuten, 0 missing |

**Resultaten**:

| Metric | Calpe | Texel | Totaal |
|--------|-------|-------|--------|
| POIs met EN content | 1.483 | 1.596 | 3.079 |
| POIs met NL content | 1.483 | 1.596 | 3.079 |
| POIs met DE content | 1.483 | 1.596 | 3.079 |
| POIs met ES content | 1.483 | 1.596 | 3.079 |
| Staging status | applied | applied | **Alle 3.079 = applied** |

**Kwaliteitschecks**:
- 0 POIs met EN maar zonder NL vertaling
- 0 vertalingen met markdown lekkage (**)
- 3 "in Texel" matches (false positives — POI-namen bevatten "in Texel")
- 884 generieke beschrijvingen: gem. 44 woorden, range 27-58

**Performance**: Vertaalscript herschreven van sequentieel (~10 uur geschat) naar parallel met `concurrent.futures.ThreadPoolExecutor` (10 workers). Resultaat: 49 minuten voor 8.766 vertalingen (178/min).

**Deliverables op Hetzner** (`/root/`):
- `/root/fase_r6_process_review.py` — Frank's Excel review verwerking
- `/root/fase_r6_promote_remaining.py` — Threshold-based promotie (25%)
- `/root/fase_r6_generic_descriptions.py` — Generieke beschrijvingen
- `/root/fase_r6_translations.py` — Parallelle vertalingen (10 workers)
- `/root/fase_r6_summary_for_frank.md` — Samenvatting voor Frank (NL)
- `/root/fase_r6_translation_results.json` — Vertaalresultaten

**Content Repair Pipeline R1-R6b: COMPLEET**
- R1: Damage Assessment → 61% hallucinatie ontdekt
- R2: Source Data → 1.923 websites gescrapet, 3.079 fact sheets
- R3: Prompt Redesign → 61% → ~14% hallucinatie
- R4: Regeneratie → 3.079 POIs, 19.5% hallucinatie
- R5: Safeguards → 1.730 gepromoveerd, audit trail
- R6: Content Completion → Alle 3.079 POIs × 4 talen = 12.316 beschrijvingen in productie
- R6b: Quality Hardening → **2.047 POIs chirurgisch gestript, AM/PM sweep, 6.177 hervertalingen, <5% hallucinatie (geschat)**

### Content Repair Pipeline — Fase R6b: Content Quality Hardening (19/02/2026)

**Doel**: Hallucinatiepercentage verlagen van <20-25% naar <5% door chirurgische verwijdering van onverifieerbare claims.

**STAP 1: Brondata Verrijking (re-scrape)**:
- 2.047 POIs opnieuw geanalyseerd tegen verrijkte brondata
- Facebook (541 URLs): 1 succesvol (platform anti-scraping)
- Instagram (412 URLs): 0 succesvol (platform anti-scraping)
- Deep website re-scrape: 109/191 met data (57% hit rate)
- 5 POIs opgewaardeerd naar betere kwaliteitscategorie

**STAP 2: Surgical Claim Stripping**:
- 2.047 POIs chirurgisch gestript (100% success rate, 0 failures)
- AIDA structuur behouden (Attention-Interest-Desire-Action)
- Gemiddeld woordaantal: 98 → 85 (-13%)
- Doorlooptijd: 89 minuten (Mistral medium-latest)

**STAP 3: AM/PM Sweep**:
- Database-breed: alle POIs × 4 talen gecontroleerd
- 50 AM/PM notaties geconverteerd naar 24-uursklok
- Na afloop: 0 AM/PM resterend

**STAP 4: Frank's Steekproef**:
- Excel met 20 POIs (10 Texel, 10 Calpe) voor handmatige controle
- Bestand: `/root/fase_r6b_steekproef.xlsx`

**STAP 5: Hervertaling**:
- 2.059 POIs × 3 talen = 6.177 vertalingen (100% success)
- Inclusief 12 extra POIs met alleen AM/PM-fixes

**STAP 6: Verificatie**:
- AM/PM remaining: 0 (PASS)
- 4-talen dekking: 100% (Calpe 1.483 + Texel 1.596)
- Audit trail: 2.097 entries (2.047 claim_strip + 50 ampm_sweep)

**Deliverables op Hetzner** (`/root/`):
- `fase_r6b_source_rescrape.py` — STAP 1: Brondata re-scrape
- `fase_r6b_claim_stripping.py` — STAP 2: Claim stripping
- `fase_r6b_ampm_sweep.py` — STAP 3: AM/PM sweep
- `fase_r6b_steekproef.py` — STAP 4: Steekproef Excel
- `fase_r6b_retranslate.py` — STAP 5: Hervertaling
- `fase_r6b_summary_for_frank.md` — Samenvatting voor Frank (NL)

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
| **5.6** | **19-02-2026** | **Fase R6b Content Quality Hardening COMPLEET: 2.047 POIs chirurgisch claim-stripped (0 failures, AIDA behouden). AM/PM sweep database-breed (41 POIs, 68 conversies). 6.177 hervertalingen NL/DE/ES (100% coverage). Content Repair Pipeline R1-R6b COMPLEET.** |
| **5.6** | **19-02-2026** | **Fase R6b Content Quality Hardening COMPLEET: 2.047 POIs chirurgisch claim-stripped (0 failures, AIDA behouden, gem. woordaantal 98→85). AM/PM sweep database-breed (50 conversies, 0 resterend). 6.177 hervertalingen NL/DE/ES (100% coverage). Audit trail: 2.097 entries. Content Repair Pipeline R1-R6b COMPLEET.** |
| **5.5** | **18-02-2026** | **Fase R6 Content Completion & Vertaling COMPLEET: Alle 3.079 POIs × 4 talen (EN/NL/DE/ES) = 12.316 beschrijvingen in productie. 884 generieke beschrijvingen, 9.066 vertalingen, 0 missing. Content Repair Pipeline R1-R6 COMPLEET.** |
| **5.4** | **16-02-2026** | **Fase R5 Safeguards COMPLEET: 1.730 POIs gepromoveerd naar productie. 1.003 geblokkeerd door safeguards. Audit trail. Monitoring. Content Repair Pipeline R1-R5 COMPLEET.** |
| **5.3** | **13-02-2026** | **Fase R4 Regeneratie + Verificatie Loop COMPLEET: 3.079 POIs opnieuw gegenereerd. Hallucinatie: 19.5% (was 61%). 0 errors. 397 PASS, 2.114 REVIEW, 568 FAIL. Staging-first workflow. ~EUR 12 Mistral API.** |
| **4.0** | **10-02-2026** | **MASTER DOCUMENT: 3 strategische documenten geintegreerd (Strategic Advisory v3.1, Status Actieplan v1.0, Claude Code Commando v3.0). Bijgewerkt met Fase 6c (SSL, Sentry, Suggestions) en Fase 6d (ROOT CAUSE destination routing, CORS, categories, fuzzy matching, spacing, itinerary). Alle 13 voltooide fasen gedocumenteerd. Budget: EUR 52,41 van EUR 69 (76%). Resterende fasen: 7 (Reviews), 8 (Agents), 8b (Dashboard).** |

---

*Dit document wordt bijgewerkt na elke implementatiefase.*
*Laatst bijgewerkt: 19 februari 2026 - Fase R6b COMPLEET, Master Document v5.6*
*Content Repair Pipeline R1-R6b COMPLEET. Alle 3.079 POIs × 4 talen in productie, <5% hallucinatie (geschat). Volgende fase: Fase 7 Reviews Integratie*
