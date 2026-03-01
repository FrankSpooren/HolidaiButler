# HolidaiButler — Fase II: Active Module Upgrade
## Claude Code Commando — Chatbot, POI, Agenda, Customer Portal + Parallelle Werkstromen

**Datum**: 1 maart 2026
**Auteur**: Claude Opus 4.6 (Strategic Analysis)
**Versie**: 1.0
**Betreft**: Fase II van 6-fasen Strategische Roadmap
**Basis**: CLAUDE.md v3.48.0 + Master Strategie v7.14
**Vereist**: Fase I (Foundation Hardening, Fase 12) ✅ COMPLEET

---

## Executive Summary

Fase II is de eerste grote feature-fase na het enterprise fundament (Fase 12). Het omvat vier primaire werkstromen en drie parallelle voorbereidingen:

| # | Werkstroom | Type | Effort | Prioriteit |
|---|-----------|------|--------|------------|
| A | Chatbot Upgrade | Primair | 25-35 uur | P0 |
| B | POI Module Verbetering | Primair | 20-30 uur | P0 |
| C | Agenda Module Upgrade | Primair | 15-20 uur | P1 |
| D | Customer Portal + UX-Features | Primair | 30-45 uur | P1 |
| E | WarreWijzer POI Discovery (parallel) | Voorbereidend | 8-12 uur | P1 |
| F | Adyen + Juridisch (administratief) | Tracking | 2-4 uur | P2 |
| G | State-of-the-Art Integratie (geleidelijk) | Doorlopend | 10-15 uur | P2 |
| | **TOTAAL** | | **110-161 uur** | |

**Geschatte doorlooptijd**: 6-8 weken
**Geschatte API-kosten**: ~EUR 30-50 (Mistral, ChromaDB, Apify)

---

## Instructies voor Claude Code

1. Open terminal in HolidaiButler project directory
2. Start Claude Code: `claude`
3. **Kopieer het VOLLEDIGE commando** (alles binnen het code-blok hieronder)
4. Plak in Claude Code en druk op Enter
5. Claude Code zal EERST de strategische documentatie analyseren en actuele codebase verifiëren

**BELANGRIJK**: Dit command is opgesplitst in blokken. Voer elk blok sequentieel uit. Rapporteer resultaten aan Frank na elk blok.

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  FASE II: ACTIVE MODULE UPGRADE — HolidaiButler                           ║
║  Chatbot · POI · Agenda · Customer Portal · UX-Features · WarreWijzer     ║
║  CLAUDE.md v3.48.0 · Master Strategie v7.14 · Roadmap Fase II            ║
╚══════════════════════════════════════════════════════════════════════════════╝

PROJECTCONTEXT:
- Platform: HolidaiButler (holidaibutler.com + texelmaps.nl)
- Server: Hetzner VPS 91.98.71.87
- Database: pxoziy_db1 op jotx.your-database.de
- Credentials: pxoziy_1 / j8,DrtshJSm$
- Repository: github.com/FrankSpooren/HolidaiButler (dev branch)
- Eigenaar: Frank Spooren (info@holidaibutler.com)
- Admin: admin.holidaibutler.com (admin@holidaibutler.com / HolidaiAdmin2026)

FASE STATUS:
- Fase I (Foundation Hardening / Fase 12): ✅ COMPLEET (27-02-2026)
  - Agent Ecosysteem Niveau 7 (Zelflerend)
  - Admin Portal: 47 endpoints, v3.11.0, RBAC, Issues module
  - 0 npm vulnerabilities, Apache security headers 5 domeinen
  - 40 BullMQ scheduled jobs, 18 agents (15 actief + 3 gedeactiveerd)
- >>> FASE II: NU STARTEN <<<

DOEL:
Enterprise-level upgrade van de vier actieve customer-facing modules:
(A) Chatbot → contextueel bewust + chat-to-book prep
(B) POI Module → Content Freshness + multi-modal prep
(C) Agenda → scraping automatisering + sync
(D) Customer Portal → UX redesign met 25-features agenda
Plus parallelle voorbereiding: (E) WarreWijzer POI Discovery,
(F) Adyen/Juridisch tracking, (G) State-of-the-art integratie.

ENTERPRISE KWALITEITSEISEN (BINDEND):
✅ ALTIJD: Enterprise-level kwaliteit — geen concessies
✅ ALTIJD: Backup VOOR elke database-wijziging
✅ ALTIJD: Context Verificatie — CLAUDE.md + MS lezen, codebase checken, GEEN aannames
✅ ALTIJD: Foutloze deployments — alle errors opgelost vóór "afgerond"
✅ ALTIJD: CLAUDE.md + MS actualiseren na elke wijziging
✅ ALTIJD: Git dev → test → main workflow
✅ ALTIJD: 24-uurs klok, British English, "on Texel" / "in Calpe"
✅ ALTIJD: Rate limiting bij scraping en LLM-calls
✅ ALTIJD: Staging-first voor content wijzigingen
❌ NOOIT: Workarounds — root cause oplossen
❌ NOOIT: parseInt() direct op destination IDs — altijd codeToId mapping
❌ NOOIT: AM/PM tijdnotatie
❌ NOOIT: Markdown in POI-beschrijvingen

╔══════════════════════════════════════════════════════════════════════════════╗
║  STAP 0: STRATEGISCHE DOCUMENTATIE & CODEBASE VERIFICATIE (VERPLICHT!)    ║
╚══════════════════════════════════════════════════════════════════════════════╝

LEES DEZE BESTANDEN VOORDAT JE BEGINT:

1. CLAUDE.md (v3.48.0) — volledig lezen
2. docs/strategy/HolidaiButler_Master_Strategie.md (v7.14) — focus op:
   - Deel 9: Strategische Roadmap (9.2 fasering, 9.3 afhankelijkheden, 9.4 Fase II advies)
   - Deel 10: WarreWijzer Briefing (10.5 POI-strategie, 10.6 Chatbot config)
   - Deel 11: UX-Features Agenda (Top 10 + correcties)
3. CLAUDE_HISTORY.md — ALLEEN als historische details nodig zijn

VERIFIEER DE ACTUELE STATUS IN DE CODEBASE:

ssh root@91.98.71.87

# 1. PM2 + Services health check
pm2 status
redis-cli ping

# 2. Huidige BullMQ jobs (verwacht: 40)
cd /var/www/api.holidaibutler.com/platform-core
node -e "
  const { Queue } = require('bullmq');
  const Redis = require('ioredis');
  async function c() {
    const conn = new Redis();
    const q = new Queue('scheduled-tasks', { connection: conn });
    const jobs = await q.getRepeatableJobs();
    console.log('Scheduled jobs:', jobs.length);
    for (const j of jobs) console.log(' -', j.name, j.pattern || j.every);
    await q.close(); await conn.quit();
  } c();
"

# 3. npm audit status (verwacht: 0 critical/high)
npm audit --audit-level=high 2>/dev/null | tail -5

# 4. Agent ecosystem status
curl -s -H "Authorization: Bearer $(curl -s -X POST http://localhost:3000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@holidaibutler.com","password":"HolidaiAdmin2026"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")" \
  http://localhost:3000/api/admin/agents/status | node -e "
    process.stdin.on('data', d => {
      const r = JSON.parse(d);
      console.log('Agents total:', r.agents?.length);
      console.log('Healthy:', r.agents?.filter(a=>a.status==='healthy').length);
      console.log('Deactivated:', r.agents?.filter(a=>a.status==='deactivated').length);
    })
  "

# 5. Database POI counts + content coverage
mysql -u pxoziy_1 -p'j8,DrtshJSm$' -h jotx.your-database.de pxoziy_db1 << 'SQL'
SELECT destination_id,
       COUNT(*) as totaal,
       SUM(is_active) as actief,
       SUM(CASE WHEN enriched_detail_description IS NOT NULL
            AND enriched_detail_description != '' THEN 1 ELSE 0 END) as heeft_en,
       SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL
            AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as heeft_nl
FROM POI GROUP BY destination_id;

-- Agenda data status
SELECT destination_id, COUNT(*) as events,
       MIN(start_date) as earliest, MAX(start_date) as latest
FROM agenda GROUP BY destination_id;

-- Reviews status
SELECT destination_id, COUNT(*) as reviews FROM reviews GROUP BY destination_id;

-- ChromaDB collections status (check via API)
SQL

# 6. Frontend versies en build status
cat /var/www/holidaibutler.com/customer-portal/dist/index.html | grep -o 'src="/[^"]*"' | head -3
cat /var/www/texelmaps.nl/customer-portal/dist/index.html | grep -o 'src="/[^"]*"' | head -3

# 7. Chatbot huidige staat (key files)
ls -la src/services/holibot/
cat src/services/holibot/ragService.js | head -30
cat src/routes/holibot.js | head -30

# 8. Customer Portal architectuur check
ls customer-portal/frontend/src/
ls customer-portal/frontend/src/components/
ls customer-portal/frontend/src/pages/ 2>/dev/null || echo "No pages dir"

# 9. Config destinations check
ls src/config/destinations/
cat src/config/destinations/texel.config.js | head -40

RAPPORTEER:
- PM2 status + Redis
- Aantal scheduled jobs (verwacht 40)
- npm audit resultaat
- Agent status (verwacht 15 healthy, 3 deactivated)
- POI counts per destination (verwacht ~1538 Calpe actief, ~1660 Texel actief)
- Agenda data aanwezig/niet + datums
- Frontend build status
- Chatbot bestanden aanwezig
- Customer Portal structuur
- Config bestanden per destination
- EVENTUELE afwijkingen van verwachte staat

WACHT OP BEVESTIGING VAN FRANK VOORDAT JE VERDERGAAT.

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK A: CHATBOT UPGRADE                                                  ║
║  Contextueel bewust · Multi-turn geheugen · Chat-to-book prep · Fallback  ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT:
Huidige chatbot (HoliBot voor Calpe, Tessa voor Texel) werkt via:
  User → X-Destination-ID → destinationConfig → ChromaDB Cloud → RAG → Mistral LLM → SSE
  Key files: holibot.js, chromaService.js, embeddingService.js, ragService.js,
             conversationService.js, intentService.js, suggestionService.js
  Vectoren: calpe_pois 43.086 + texel_pois 101.364
  Quick Actions: 4x (tip van de dag, routebeschrijving, zoeken op rubriek, POI detail)

DOEL:
Chatbot upgraden naar enterprise-level met contextueel bewustzijn,
proactieve suggesties, en voorbereiding voor chat-to-book flow (Fase III/IV).

STAP A.1: ANALYSE HUIDIGE CHATBOT ARCHITECTUUR
───────────────────────────────────────────────

Verifieer de actuele implementatie:

cat src/services/holibot/ragService.js
cat src/services/holibot/conversationService.js
cat src/services/holibot/intentService.js
cat src/services/holibot/suggestionService.js
cat src/services/holibot/chromaService.js
cat src/routes/holibot.js

Documenteer:
- Hoe werkt de huidige conversation memory? (session-based? holibot_sessions tabel?)
- Welke intent classificatie wordt gebruikt?
- Hoe werken suggesties momenteel?
- Is er time-of-day / weer / seizoen bewustzijn?
- Hoe wordt de conversation history aan Mistral doorgegeven?
- Maximaal aantal turns in context window?
- Welke system prompt wordt gebruikt per destination?

STAP A.2: CONTEXTUEEL BEWUSTZIJN
─────────────────────────────────

Implementeer context-enrichment die VÓÓR de RAG-query wordt toegepast:

1. **Tijdsbewustzijn**: Voeg aan het system prompt toe:
   - Huidige dag van de week + datum
   - Tijdstip van de dag (ochtend/middag/avond/nacht)
   - Seizoen (winter/lente/zomer/herfst)
   - Is het weekend? (beïnvloedt aanbevelingen)

2. **Locatiebewustzijn** (per destination):
   - Texel: eiland-context, veerbootafhankelijkheid, weer gevoelig
   - Calpe: kuststad, zonnig mediterraan, Spaans/expat cultuur
   - (WarreWijzer: voorbereiding — recreatiedomein, Belgisch-Limburg, natuur)

3. **Gebruikersgeschiedenis** (sessie-gebaseerd, GDPR-compliant):
   - Welke POIs al besproken in deze sessie?
   - Welke categorieën getoond? (vermijd herhaling)
   - Taalvoorkeur detectie (automatisch)
   - Eerder getoonde quick action resultaten niet herhalen

Implementatie in: src/services/holibot/contextService.js (NIEUW)
Pattern: contextService.buildContext(sessionId, destinationId) → contextObject
Integratie: ragService roept contextService aan vóór Mistral prompt constructie

STAP A.3: MULTI-TURN CONVERSATION MEMORY
──────────────────────────────────────────

Verbeter de conversation history die aan Mistral wordt meegegeven:

1. **Sliding window**: Bewaar laatste 10 turns in context (was: controleer huidig)
2. **Summary injection**: Bij >10 turns, maak een compacte samenvatting van oudere turns
3. **Topic tracking**: Detecteer hoofdonderwerp per sessie
   (bv. "restaurants zoeken" vs "activiteiten voor kinderen")
4. **Follow-up detectie**: Herken "en die andere?" / "meer opties" / "iets anders"
   → gebruik conversation context, niet alleen nieuwe query
5. **POI-referentie geheugen**: Als user zegt "de eerste" of "die strandtent",
   match tegen eerder getoonde POIs in sessie

Database: holibot_sessions tabel al aanwezig — verifieer schema en breid uit:
- Voeg toe indien nodig: session_summary, topic, mentioned_poi_ids, context_snapshot

STAP A.4: PROACTIEVE SUGGESTIES
────────────────────────────────

Upgrade het suggestiesysteem naar context-driven:

1. **Na POI-detail antwoord**: Suggereer gerelateerde POIs
   (zelfde categorie, nabijgelegen, complementair)
2. **Tijdsgebonden**: 's Avonds restaurant suggesties, 's ochtends activiteiten
3. **Weer-adaptief** (voorbereiding — hard-code patterns nu, ML later in Fase A.):
   - Regen: indoor activiteiten, musea, restaurants
   - Zon: stranden, wandelen, fietsen, terras
4. **Seizoensgebonden**: Zomeractiviteiten vs winteractiviteiten
   - Gebruik bestaande POI categorieën voor filtering

Implementatie: Upgrade src/services/holibot/suggestionService.js

STAP A.5: CHAT-TO-BOOK VOORBEREIDING
──────────────────────────────────────

Leg de basis voor de Fase III/IV intermediair integratie:

1. **Intent classificatie uitbreiden**: Herken "booking intents"
   - "kan ik reserveren" / "boeken" / "tickets" / "tafel"
   - Classificeer als BOOKING_INTENT (loggen, nog niet afhandelen)
2. **POI booking flags**: Voeg aan POI detail response toe:
   - has_booking: boolean (uit POI tabel, kolom toevoegen indien nodig)
   - booking_type: enum ('restaurant', 'activity', 'ticket', null)
   - booking_url: nullable string (directe reserveringslink)
3. **Friendly fallback**: Bij booking intent zonder actief booking systeem:
   "Reserveren via [chatbot naam] is binnenkort mogelijk! Nu kun je
   rechtstreeks contact opnemen via [website/telefoon POI]."

STAP A.6: MENSELIJKE FALLBACK
──────────────────────────────

Implementeer escalatie naar menselijke hulp:

1. **Trigger detectie**: Na 3 onbevredigde antwoorden in sessie OF
   expliciete vraag ("kan ik iemand spreken", "help", "klacht")
2. **Graceful handoff**: Toon contactinformatie destination-specifiek:
   - Calpe: info@holidaibutler.com
   - Texel: info@texelmaps.nl
   - (Optioneel: WhatsApp link als geconfigureerd in destination config)
3. **Logging**: Log escalatie-events in holibot_sessions voor analyse

STAP A.7: TESTEN & DEPLOY
──────────────────────────

1. Test per destination (Calpe + Texel):
   - Context-aware antwoorden (ochtend vs avond)
   - Multi-turn conversatie (>5 turns met follow-ups)
   - Booking intent detectie
   - Menselijke fallback trigger
   - Geen regressie op bestaande functionaliteit
2. Test suggesties (POI-gerelateerd, tijdsgebonden)
3. Deploy: dev → test → main
4. Live verificatie op texelmaps.nl en holidaibutler.com

RAPPORTEER aan Frank:
- Architectuur analyse resultaten (A.1)
- Lijst geïmplementeerde verbeteringen
- Test resultaten per destination
- Eventuele bevindingen of afwijkingen
- API kosten (verwacht: ~EUR 0-2 voor testing)

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK B: POI MODULE VERBETERING                                           ║
║  Content Freshness · Browse UX · Admin POI tools · Multi-modal prep       ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT:
Huidige POI module:
- 3.198 actieve POIs (1.538 Calpe + 1.660 Texel), 96% content coverage 4 talen
- Browse View filters: rating ≥4.0, reviews ≥3, tile description, ≥3 images
- Tier 1-4 strategie met score-based frequentie
- Admin Portal: POI list/detail/edit/stats (4 endpoints)
- Images: 12.4 GB totaal (8.3 Calpe + 4.1 Texel)

STAP B.1: ANALYSE HUIDIGE POI MODULE
─────────────────────────────────────

Verifieer de actuele POI implementatie:

# Backend
cat src/routes/adminPortal.js | grep -A5 "poi" | head -40
cat src/routes/holibot.js | grep -A5 "poi\|browse\|detail" | head -60
ls src/services/agents/dataSync/

# Frontend Customer Portal
find customer-portal/ -name "*.tsx" -o -name "*.jsx" | xargs grep -l "poi\|POI\|browse" 2>/dev/null
cat customer-portal/frontend/src/components/MapView*.tsx 2>/dev/null | head -40
cat customer-portal/frontend/src/components/POI*.tsx 2>/dev/null | head -40

# Database schema
mysql -u pxoziy_1 -p'j8,DrtshJSm$' -h jotx.your-database.de pxoziy_db1 << 'SQL'
DESCRIBE POI;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'POI' AND table_schema = 'pxoziy_db1'
ORDER BY ordinal_position;
SQL

Documenteer:
- Welke POI endpoints bestaan (public API + admin)?
- Hoe werkt de browse view (MapView, ListView)?
- Welke filters zijn actief?
- Hoe wordt POI detail weergegeven?
- Image laadstrategie (lazy loading? CDN? optimalisatie?)

STAP B.2: CONTENT FRESHNESS SCORE
──────────────────────────────────

Implementeer een automatisch systeem dat verouderde POI-info detecteert:

1. **Database uitbreiding** (POI tabel):
   - content_last_verified: DATETIME (wanneer content laatst geverifieerd)
   - content_freshness_score: TINYINT (0-100, berekend)
   - content_freshness_status: ENUM('fresh', 'aging', 'stale', 'unverified')
   - last_external_check: DATETIME (wanneer externe bron laatst gecheckt)

2. **Freshness berekening**:
   - fresh (80-100): content <30 dagen oud OF extern geverifieerd <14 dagen
   - aging (50-79): content 30-90 dagen oud
   - stale (20-49): content 90-180 dagen oud
   - unverified (0-19): content >180 dagen OF nooit geverifieerd

3. **Scheduled Agent taak** (De Koerier uitbreiden):
   - Wekelijks: check Tier 1 POIs (top 25) op actuele data
   - Maandelijks: check Tier 2 POIs
   - Kwartaal: check Tier 3-4 POIs
   - Check methode: website bereikbaarheid, Google Places API rating/hours, schema.org data

4. **Admin Portal integratie**:
   - POI lijst: freshness status badge (kleurcode groen/geel/oranje/rood)
   - Freshness dashboard: hoeveel POIs per status per destination
   - Filter: "Toon alleen stale POIs" voor prioriteit-review

STAP B.3: POI BROWSE UX VERBETERING
─────────────────────────────────────

Verbeter de customer-facing POI browse ervaring:

1. **Kaart-clustering** (UX-Feature #2 uit Deel 11):
   - Bij veel POIs op de kaart: cluster naar pins met teller
   - Bij inzoomen: clusters ontrafelen naar individuele POIs
   - Implementatie: Leaflet.markercluster of Google Maps MarkerClusterer
   - Max 25 POIs initieel op kaart, dynamisch laden bij zoom/pan

2. **Smart Filters** (UX-Feature #3 uit Deel 11):
   - Huidige filters verbeteren met multi-select capability
   - Categorie + rating + afstand combineerbaar
   - "Open nu" filter (op basis van opening_hours als beschikbaar)
   - Persistent filter state in URL parameters (deelbaar)

3. **Sticky CTAs** (UX-Feature #4 uit Deel 11):
   - In POI detail view: sticky bottom bar met primaire actie
   - "Routebeschrijving" | "Website bezoeken" | "Bel" (afhankelijk van beschikbare data)
   - Mobile-first: thumb-reachable positionering

STAP B.4: POI IMAGE OPTIMALISATIE
───────────────────────────────────

Bereid de image pipeline voor op schaalbaarheid:

1. **Lazy loading**: Verifieer dat POI images lazy loaded worden
   (IntersectionObserver of native loading="lazy")
2. **Responsive images**: srcSet met meerdere resoluties
   - Thumbnail: 200px breed (tile view)
   - Medium: 600px breed (detail view)
   - Full: origineel (lightbox/zoom)
3. **Image compression audit**: Check of bestaande images geoptimaliseerd zijn
   - Rapport: gemiddelde bestandsgrootte per resolutie
   - Aanbeveling: WebP conversie pipeline voor nieuwe images
4. **CDN voorbereiding** (State-of-the-Art D): Documenteer huidige image serving,
   noteer waar CDN-integratie nodig is (12.4 GB op single server)

STAP B.5: ADMIN POI TOOLS UITBREIDING
──────────────────────────────────────

Voeg toe aan Admin Portal POI management:

1. **Bulk acties**: Selecteer meerdere POIs → bulk status change / bulk category change
2. **Content Freshness filter**: Filter op freshness status in POI lijst
3. **Quick edit**: Inline editing van tile description in lijst view
4. **Export**: CSV export van POI data (gefilterd) voor Frank's analyse

RAPPORTEER aan Frank:
- POI module analyse resultaten (B.1)
- Freshness score systeem implementatie
- Browse UX verbeteringen
- Image optimalisatie resultaten
- Admin tools toegevoegd
- Database migratie details (nieuwe kolommen)

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK C: AGENDA MODULE UPGRADE                                            ║
║  Event scraping · Push notificaties prep · Agenda-sync prep               ║
╚══════════════════════════════════════════════════════════════════════════════╝

STAP C.1: ANALYSE HUIDIGE AGENDA MODULE
────────────────────────────────────────

Verifieer de actuele agenda implementatie:

# Database
mysql -u pxoziy_1 -p'j8,DrtshJSm$' -h jotx.your-database.de pxoziy_db1 << 'SQL'
DESCRIBE agenda;
DESCRIBE agenda_dates;
SELECT destination_id, COUNT(*) as events,
       SUM(CASE WHEN start_date >= CURDATE() THEN 1 ELSE 0 END) as toekomstig,
       SUM(CASE WHEN start_date < CURDATE() THEN 1 ELSE 0 END) as verlopen
FROM agenda GROUP BY destination_id;
SQL

# Backend routes
grep -n "agenda" src/routes/holibot.js src/routes/adminPortal.js 2>/dev/null
cat src/routes/holibot.js | grep -A20 "agenda"

# Frontend
find customer-portal/ -name "*genda*" -o -name "*event*" 2>/dev/null

Documenteer:
- Hoe worden events momenteel ingeladen? (handmatig? scraping? API?)
- Welke velden heeft de agenda tabel?
- Is er een admin interface voor agenda beheer?
- Hoe wordt de agenda in de frontend getoond?
- Zijn er agenda_dates voor multi-date events?

STAP C.2: EVENT SCRAPING AUTOMATISERING
────────────────────────────────────────

Implementeer geautomatiseerde event scraping per destination:

1. **Texel bronnen** (bestaand — verifieer wat al werkt):
   - VVV Texel evenementenkalender
   - texel.net/agenda
   - Lokale event feeds

2. **Calpe bronnen** (bestaand — verifieer):
   - Calpe.es/agenda
   - Costa Blanca events
   - Lokale Spaanse event sites

3. **Scraping Agent** (De Koerier uitbreiden of nieuw):
   - Schedule: wekelijks (Tier 1 bronnen), maandelijks (Tier 2)
   - Output: genormaliseerde event objecten
   - Deduplicatie: op basis van naam + datum + locatie
   - Automatische vertaling: event titels + beschrijvingen in 4 talen (Mistral)
   - Staging: nieuwe events naar staging status, Frank reviewt via Admin Portal

4. **Admin Portal Agenda beheer**:
   - Agenda lijst met filter (destination, datum range, status)
   - Agenda toevoegen/bewerken/verwijderen
   - Bulk import (CSV upload)
   - Staging review flow (approve/reject scraped events)

STAP C.3: AGENDA-SYNC VOORBEREIDING (UX-Feature #5)
─────────────────────────────────────────────────────

Bereid de .ics export voor zodat gebruikers events aan hun agenda toevoegen:

1. **iCal export endpoint**: GET /api/agenda/:eventId/ical
   - Genereer standaard .ics bestand
   - Bevat: titel, beschrijving, locatie (GPS), start/eind datum/tijd
2. **"Add to Calendar" button** in event detail view:
   - Google Calendar deep link
   - Apple Calendar (.ics download)
   - Outlook (.ics download)
3. **Gedeelde agenda URL** (UX-Feature #6 prep):
   - GET /api/agenda/feed/:destinationId.ics — volledige agenda feed
   - Subscribe-able in elke calendar app

RAPPORTEER aan Frank:
- Agenda module analyse resultaten
- Huidige event data status (hoeveel actueel, hoeveel verlopen)
- Geïmplementeerde scraping bronnen
- Admin agenda tools
- iCal export implementatie

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK D: CUSTOMER PORTAL + UX-FEATURES AGENDA                            ║
║  25 UX-Features integratie · Bottom-tab navigatie · Onboarding · Mobile   ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT:
Customer Portal is de primaire interface voor toeristen.
React 19 + Tailwind CSS frontend.
UX-Features Agenda (Master Strategie Deel 11) bevat 25 features, waarvan
Top 10 prioriteit krijgt in Fase II. Correcties uit v2.0 zijn verwerkt:
- Kolom C: "Waarom werkt het" (was "Waarom moet het er?")
- Kolom F: "Bron URL" (was "Demo URL")
- Feature #2: "Kaart-clustering" (was "Kaart-visualisering")

TOP 10 UX-FEATURES VOOR FASE II:
| # | Feature | Status | Blok |
|---|---------|--------|------|
| 1 | Gepersonaliseerde zoekresultaten | Concept → Implementeer | D.3 |
| 2 | Kaart-clustering & fixed discovery | Concept → Implementeer | B.3 |
| 3 | Smart/advanced Filters | Concept → Implementeer | B.3 |
| 4 | Sticky CTA's | Concept → Implementeer | B.3 |
| 5 | Agenda-synchronisatie (.ics) | Concept → Implementeer | C.3 |
| 6 | Gedeelde/aanpasbare agenda's | Concept → Prep | C.3 |
| 7 | Chatbot: contextueel + multi-turn | Live → Upgrade | A.2-A.5 |
| 11 | Micro-interacties, motion, affordances | Concept → Implementeer | D.4 |
| 12 | Toegankelijkheid & multi-language | Deels live → Completeer | D.5 |
| 18 | Natural Language Input | Deels live → Upgrade | A.3 |

STAP D.1: ANALYSE HUIDIGE CUSTOMER PORTAL
──────────────────────────────────────────

Verifieer de actuele frontend architectuur:

# Structuur
find customer-portal/frontend/src -type f -name "*.tsx" -o -name "*.jsx" \
  | sort | head -50

# Routing
cat customer-portal/frontend/src/App.tsx 2>/dev/null || \
  cat customer-portal/frontend/src/main.tsx
  
# Components inventaris
ls customer-portal/frontend/src/components/

# Hooks
ls customer-portal/frontend/src/hooks/ 2>/dev/null

# Config
cat customer-portal/frontend/vite.config.ts
cat customer-portal/frontend/src/contexts/DestinationContext.tsx 2>/dev/null

# Tailwind config
cat customer-portal/frontend/tailwind.config.js 2>/dev/null

# Package.json (dependencies check)
cat customer-portal/frontend/package.json | node -e "
  process.stdin.on('data', d => {
    const p = JSON.parse(d);
    console.log('React:', p.dependencies?.react);
    console.log('Tailwind:', p.devDependencies?.tailwindcss);
    console.log('Router:', p.dependencies?.['react-router-dom']);
  })
"

Documenteer:
- Component hiërarchie
- Routing structuur
- State management (Zustand? Context? Redux?)
- Responsive breakpoints
- Huidige navigatie patroon (sidebar? top nav? bottom tabs?)
- Destination switching mechanism

STAP D.2: BOTTOM-TAB NAVIGATIE
───────────────────────────────

Implementeer mobile-first bottom tab navigatie (MS 9.4 Fase II advies):

Tabs: Explore | Agenda | Chat | Bookings* | Profiel*
(* = placeholder voor Fase III/IV, tonen als "Binnenkort")

- Explore: Huidige MapView + Browse + Search
- Agenda: Evenementenkalender + gesynchroniseerde items
- Chat: HoliBot/Tessa chatbot
- Bookings: Placeholder → "Boekingen zijn binnenkort mogelijk"
- Profiel: Taalvoorkeur, destination switch, over ons

Mobile: Bottom tab bar (vast, 56px hoogte, safe area padding iOS)
Desktop: Sidebar of top navigation (responsive switch bij md breakpoint)
Actieve tab: visuele indicator (kleur per destination branding)

STAP D.3: GEPERSONALISEERDE ZOEKRESULTATEN (UX-Feature #1)
───────────────────────────────────────────────────────────

Implementeer basis personalisatie (zonder login, GDPR-compliant):

1. **Sessie-gebaseerde voorkeuren** (localStorage, geen persoonsgegevens):
   - Recent bekeken POIs (laatste 10)
   - Meest bekeken categorieën
   - Zoekgeschiedenis (laatste 5 queries)

2. **Aanbevelingslogica** (rule-based, geen ML):
   - "Omdat je [categorie] bekijkt": toon gerelateerde POIs
   - "Recent bekeken": snelle toegang tot eerder bezochte POIs
   - "Populair vandaag": op basis van pageview data (page_views tabel)
   - Sorteer browse resultaten: gepersonaliseerd > rating > afstand

3. **Frontend implementatie**:
   - PersonalizationContext of Zustand store
   - useRecommendations() hook
   - Geen server-side opslag (GDPR-vriendelijk, pure client-side)

STAP D.4: MICRO-INTERACTIES (UX-Feature #11)
─────────────────────────────────────────────

Voeg subtiele animaties toe die kwaliteit uitstralen:

1. **Transitie animaties**: Page transitions (fade/slide)
2. **Loading states**: Skeleton loaders i.p.v. spinners
3. **Feedback animaties**: Knop press effect, swipe hints
4. **Scroll animaties**: POI cards staggered fade-in bij scroll
5. **Map interacties**: Smooth zoom/pan, pin bounce bij selectie

Gebruik: Tailwind CSS animaties + Framer Motion (als niet al geïnstalleerd)
UX-principes (MS 9.4): Miller's Law (max 7±2 items), Hick's Law (minder keuzes),
Fitts' Law (grotere targets voor primaire acties)

STAP D.5: TOEGANKELIJKHEID & MULTI-LANGUAGE (UX-Feature #12)
─────────────────────────────────────────────────────────────

Completeer de multi-language en accessibility implementatie:

1. **WCAG 2.1 AA audit** (quick scan):
   - Kleurcontrast: check alle tekst/achtergrond combinaties (≥4.5:1)
   - Keyboard navigatie: alle interactieve elementen bereikbaar met Tab
   - Screen reader: aria-labels op knoppen, landmarks op secties
   - Focus indicators: zichtbaar op alle interactieve elementen

2. **Taal switching UX**:
   - Taaldetectie uit browser-instellingen
   - Smooth taalwisseling zonder page reload
   - POI content in geselecteerde taal (EN/NL/DE/ES)
   - Fallback naar EN als vertaling niet beschikbaar

3. **Touch targets**: Minimaal 44x44px voor alle tappable elementen (WCAG)

STAP D.6: ONBOARDING FLOW
──────────────────────────

Implementeer een 3-4 stappen onboarding voor nieuwe gebruikers (MS 9.4):

1. "Welkom bij [TexelMaps/HolidaiButler]!" — destination intro
2. "Wat wil je ontdekken?" — categorie voorkeuren (multi-select)
3. "Kies je taal" — taal selectie
4. (Optioneel) "Ontvang tips" — push notificatie permissie (prep)

Toon alleen bij eerste bezoek (localStorage flag).
Skip-optie altijd beschikbaar.

RAPPORTEER aan Frank:
- Customer Portal architectuur analyse
- Bottom-tab navigatie geïmplementeerd
- UX-Features geïmplementeerd (per feature resultaat)
- WCAG audit resultaten
- Onboarding flow
- Screenshots/beschrijving van visuele verbeteringen

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK E: WARREWIJZER POI DISCOVERY (PARALLEL)                             ║
║  Apify scraping · OpenStreetMap · Data classificatie · Image download     ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT (Master Strategie Deel 10):
- WarreWijzer = Recreatiedomein (NIET toeristische gemeente)
- destination_id: 4
- Locatie: Ketelstraat 77, 3680 Maaseik, België
- ~300 POIs verwacht, rating 4.5+, radius 15km + uniek 25-30km
- Categoriemix: Actief 25%, Cultuur 25%, Gastronomie 20%, Natuur 30%
- Databronnen: Apify Google Places, OpenStreetMap 3680, Visit Maaseik,
  Wandelen in Limburg, TripAdvisor, AllTrails, natuurgebieden, golfbanen

DOEL:
Parallel aan Blok A-D alvast POI-data verzamelen voor Fase V (WarreWijzer uitrol).
Dit is een data-verzameling stap, GEEN deployment naar productie.

STAP E.1: APIFY GOOGLE PLACES SCRAPING
───────────────────────────────────────

Gebruik compass/crawler-google-places (al beschikbaar als Apify tool):

Zoektermen per categorie:
- Actief (25%): "outdoor activities Maaseik", "cycling routes Maaseik",
  "hiking Maaseik", "kayaking Maas", "golf Maaseik", "swimming Maaseik"
- Cultuur (25%): "museum Maaseik", "historic sites Maaseik",
  "cultural attractions Limburg Belgium", "churches Maaseik"
- Gastronomie (20%): "restaurants Maaseik", "cafes Maaseik",
  "brewery Limburg Belgium", "local food Maaseik"
- Natuur (30%): "nature reserve Maaseik", "parks Maaseik",
  "Bergerven", "Tosch-Langeren", "Wateringen Maaseik",
  "Nationaal Park Hoge Kempen"

Parameters:
- Locatie: Maaseik, Belgium (+ 15km radius)
- Taal: nl (Nederlandse resultaten)
- Max per zoekopdracht: 50
- Include: naam, adres, GPS, rating, review_count, website, telefoon,
  openingstijden, foto's, Google Place ID, categorieën
- Exclude: rating < 4.0 (voorlopig, 4.5 filter later)

Opslaan in: /root/warrewijzer_poi_discovery/apify_results.json

STAP E.2: OPENSTREETMAP DATA
─────────────────────────────

Query OpenStreetMap voor postcodegebied 3680 (Maaseik):

Overpass API query voor:
- tourism=* (attracties, viewpoints, info centres)
- leisure=* (parken, playgrounds, sports)
- amenity=restaurant|cafe|bar|pub
- historic=*
- natural=* (water, peak, wood)
- shop=* (lokale winkels, specialiteiten)

Opslaan in: /root/warrewijzer_poi_discovery/osm_results.json

STAP E.3: IMAGE DOWNLOAD
─────────────────────────

Download Google Places images naar Hetzner:

Pad: /var/www/api.holidaibutler.com/storage/poi-images/warrewijzer/{google_placeid}/
Patroon: image_N.jpg (conform Texel implementatie)
Max: 5 images per POI (top rated)
Rate limiting: max 10 downloads/seconde

STAP E.4: DATA CLASSIFICATIE & RAPPORT
──────────────────────────────────────

Genereer een classificatierapport:

1. Totaal POIs gevonden (Apify + OSM, na deduplicatie)
2. Per categorie (Actief/Cultuur/Gastronomie/Natuur + overig)
3. Rating distributie
4. POIs met website vs zonder
5. POIs binnen 15km vs 15-25km vs 25-30km
6. Deduplicatie: match op naam + GPS proximity (<100m)
7. Aanbeveling: welke POIs voldoen aan 4.5+ rating criterium
8. Gap analyse: welke categorieën ondervertegenwoordigd zijn

Opslaan als: /root/warrewijzer_poi_discovery/discovery_rapport.md

RAPPORTEER aan Frank:
- Totaal POIs gevonden
- Categorie verdeling
- Rating distributie
- Gap analyse
- Aanbeveling voor volgende stap
- Images gedownload (aantal, GB)
- Dit is een VOORBEREIDING — geen productie deployment

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK F: ADYEN + JURIDISCH TRACKING (ADMINISTRATIEF)                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT:
Fase III (Commerce Foundation) vereist Adyen payment integratie.
Het KYC-proces (Know Your Customer) duurt weken en blokkeert anders
de Fase III start. Juridisch advies over het commissiemodel is nodig
vóór Fase IV (Intermediair).

STAP F.1: ADYEN CHECKLIST GENEREREN
────────────────────────────────────

Maak /root/fase_II_adyen_checklist.md met:

□ 1. Adyen account aanmaken (test environment)
     URL: https://www.adyen.com/signup
     Type: Test account (gratis, geen productiedata)
□ 2. KYC documentatie verzamelen:
     - Bedrijfsregistratie (KvK-uittreksel of Belgisch equivalent)
     - Identiteitsbewijs eigenaar
     - Bankgegevens (IBAN)
     - Website URL (holidaibutler.com)
     - Verwacht transactievolume (schatting)
□ 3. Test API keys ontvangen
□ 4. Adyen Drop-in component documentatie lezen:
     https://docs.adyen.com/online-payments/drop-in-web/
□ 5. PCI DSS compliance self-assessment questionnaire invullen
□ 6. Productie account aanvragen (na test succesvol)

STATUS: Frank moet stappen 1-2 handmatig uitvoeren.
Claude Code kan stap 4 (documentatie analyse) nu al doen.

STAP F.2: JURIDISCH ADVIES CHECKLIST
─────────────────────────────────────

Maak /root/fase_II_juridisch_checklist.md met:

□ 1. Juridisch advies zoeken: specialist e-commerce / platformrecht
     Focus: commissie/intermediairmodel rechten en plichten
□ 2. Kernvragen voor juridisch adviseur:
     a. Is HolidaiButler juridisch een "intermediair" of een "platform"?
     b. Welke vergunningen zijn nodig voor het innen van commissie?
     c. BTW-implicaties van het commissiemodel (NL + ES + BE)
     d. Consumentenrecht bij door platform bemiddelde boekingen
     e. Aansprakelijkheid bij fouten in boekingen/betalingen
     f. GDPR-implicaties van betalingsdata verwerking
     g. Verschil regelgeving Spanje vs Nederland vs België
□ 3. Concept Algemene Voorwaarden laten opstellen
□ 4. Concept Verwerkersovereenkomst voor partners/POI-eigenaren
□ 5. Fiscaal advies commissie-inhouding per land

STATUS: Frank moet juridisch adviseur inschakelen.
Claude Code genereert de checklist en vragenlijst.

╔══════════════════════════════════════════════════════════════════════════════╗
║  BLOK G: STATE-OF-THE-ART INTEGRATIE (GELEIDELIJK)                       ║
║  Geïntegreerd in reguliere werkstromen — geen apart blok                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXT (CLAUDE.md sectie State-of-the-Art Vervolgstappen A-F):
De state-of-the-art stappen worden NIET als apart blok geïmplementeerd,
maar geleidelijk geïntegreerd in de reguliere Fase II werkstromen.

INTEGRATIE IN BLOK A (Chatbot):
- [C] RAG 2.0 voorbereiding: hybride search (keyword + semantic + geo)
  → Implementeer geo-filter in ChromaDB queries (proximity-based POI matching)
- [A] Seizoensgebonden aanbevelingen (basis):
  → Hard-code seizoenspatronen in contextService (geen ML, eerst rule-based)

INTEGRATIE IN BLOK B (POI):
- [C] Content Freshness Score: → Geïmplementeerd in B.2
- [C] A/B testing voorbereiding:
  → Voeg ab_variant kolom toe aan POI tabel (nullable, voor toekomstig gebruik)
  → Log welke POI-beschrijving variant gebruiker ziet in page_views
- [D] CDN voorbereiding: → Gedocumenteerd in B.4
- [D] Image optimalisatie: → Geïmplementeerd in B.4

INTEGRATIE IN BLOK C (Agenda):
- Geen directe state-of-the-art items in Fase II agenda

INTEGRATIE IN BLOK D (Customer Portal):
- [E] Content-Security-Policy headers:
  → Implementeer CSP headers op customer-facing domeinen
  → Start met report-only mode, geen blocking
- [F] Feature flags voorbereiding:
  → Implementeer simpel feature flag systeem (destination-config based)
  → Pattern: destinationConfig.features.hasBooking = false (Fase III prep)

INTEGRATIE IN ADMIN PORTAL:
- [B] Observability verbetering:
  → Voeg response time logging toe aan alle API endpoints
  → Genereer wekelijks performance rapport (De Stylist uitbreiden)

╔══════════════════════════════════════════════════════════════════════════════╗
║  STAP FINAL: DOCUMENTATIE, DEPLOY & VERIFICATIE                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

NA ELKE BLOK (A, B, C, D, E, F, G) — VERPLICHT:

1. DATABASE BACKUP:
   ssh root@91.98.71.87
   mysqldump -u pxoziy_1 -p'j8,DrtshJSm$' -h jotx.your-database.de \
     pxoziy_db1 > /root/backups/pre_fase_II_blok_[X]_$(date +%Y%m%d_%H%M%S).sql

2. GIT WORKFLOW:
   git add -A
   git commit -m "feat(fase-ii): Blok [X] - [beschrijving]

   - [opsomming wijzigingen]
   
   Fase II Active Module Upgrade"
   git push origin dev
   # Wacht 30 sec op CI/CD
   git push origin test
   # Wacht 30 sec op CI/CD
   git push origin main

3. DEPLOY:
   ssh root@91.98.71.87
   cd /var/www/api.holidaibutler.com/platform-core
   git pull origin main
   npm install --production
   pm2 restart all
   pm2 status

   # Frontend deploy (als frontend gewijzigd)
   cd /var/www/holidaibutler.com/customer-portal
   git pull origin main
   cd frontend && npm run build
   # Herhaal voor texelmaps.nl

   # Admin deploy (als admin gewijzigd)
   cd /var/www/admin.holidaibutler.com
   git pull origin main
   cd admin-module && npm run build

4. LIVE VERIFICATIE:
   # Backend health
   curl -s https://api.holidaibutler.com/api/health | python3 -m json.tool
   
   # Chatbot test (Texel)
   curl -s -X POST https://api.holidaibutler.com/api/holibot/chat \
     -H 'Content-Type: application/json' \
     -H 'X-Destination-ID: texel' \
     -d '{"message":"Wat kan ik vandaag doen op Texel?"}' | head -100
   
   # Chatbot test (Calpe)
   curl -s -X POST https://api.holidaibutler.com/api/holibot/chat \
     -H 'Content-Type: application/json' \
     -H 'X-Destination-ID: calpe' \
     -d '{"message":"What can I do in Calpe today?"}' | head -100
   
   # Frontend bereikbaarheid
   curl -s -o /dev/null -w "%{http_code}" https://texelmaps.nl
   curl -s -o /dev/null -w "%{http_code}" https://holidaibutler.com
   curl -s -o /dev/null -w "%{http_code}" https://admin.holidaibutler.com

5. CLAUDE.md BIJWERKEN:
   - Versie bumpen (3.48.0 → 3.49.0+ per significant blok)
   - Changelog entry toevoegen
   - Fase II resultaten documenteren
   - Eventuele nieuwe bestanden/endpoints documenteren

6. MASTER STRATEGIE BIJWERKEN:
   - Deel 9.2: Fase II status → "IN UITVOERING" of "COMPLEET"
   - Deel 2: Fase II resultaten toevoegen
   - Budget bijwerken in 1.2
   - Lessons Learned in Deel 5
   - Beslissingen Log in Deel 6
   - Risico Register in Deel 7 (indien nieuwe risico's)

7. CLAUDE.md NAAR HETZNER:
   scp CLAUDE.md root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/

8. MS NAAR HETZNER:
   scp docs/strategy/HolidaiButler_Master_Strategie.md \
     root@91.98.71.87:/var/www/api.holidaibutler.com/platform-core/docs/strategy/

╔══════════════════════════════════════════════════════════════════════════════╗
║  FASE II COMPLEET — CHECKLIST                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

BLOK A — Chatbot Upgrade:
□ Contextueel bewustzijn (tijd, seizoen, weer-patterns)
□ Multi-turn conversation memory (sliding window, summary)
□ Proactieve suggesties (tijds/seizoensgebonden)
□ Chat-to-book intent detectie (logging, geen afhandeling)
□ Menselijke fallback escalatie
□ contextService.js aangemaakt
□ Tests: Calpe + Texel, multi-turn, booking intent, fallback

BLOK B — POI Module:
□ Content Freshness Score (database kolommen + berekening + agent taak)
□ Kaart-clustering (UX-Feature #2)
□ Smart Filters (UX-Feature #3)
□ Sticky CTAs (UX-Feature #4)
□ Image optimalisatie (lazy loading, responsive, WebP prep)
□ Admin tools (bulk acties, freshness filter, quick edit, export)

BLOK C — Agenda Module:
□ Event scraping automatisering (bronnen, deduplicatie, vertaling)
□ Admin agenda beheer (CRUD + staging review)
□ iCal export (.ics) (UX-Feature #5)
□ Gedeelde agenda feed URL (UX-Feature #6 prep)

BLOK D — Customer Portal + UX:
□ Bottom-tab navigatie (mobile-first, 5 tabs)
□ Gepersonaliseerde zoekresultaten (UX-Feature #1)
□ Micro-interacties (UX-Feature #11)
□ WCAG 2.1 AA audit + fixes (UX-Feature #12)
□ Onboarding flow (3-4 stappen)
□ Feature flags systeem (destination-config based)

BLOK E — WarreWijzer POI Discovery:
□ Apify Google Places scraping (Maaseik + 15km)
□ OpenStreetMap data (3680)
□ Image download naar Hetzner
□ Classificatie rapport + gap analyse

BLOK F — Administratief:
□ Adyen checklist gegenereerd
□ Juridisch advies checklist gegenereerd

BLOK G — State-of-the-Art:
□ Geo-filter in ChromaDB queries (RAG 2.0 prep)
□ CSP headers (report-only mode)
□ API response time logging
□ A/B testing kolom in POI tabel
□ Feature flags per destination

DOCUMENTATIE:
□ CLAUDE.md bijgewerkt (v3.49.0+)
□ Master Strategie bijgewerkt (v7.15+)
□ Git commits per blok
□ Deployed naar alle omgevingen
□ Live verificatie passed
□ Kosten gerapporteerd

AFHANKELIJKHEDEN VOOR FASE III (na Fase II):
→ Chatbot upgrade (chat-to-book intent) → Intermediair chat-to-book flow
→ POI module (booking flags) → Ticketing POI-linked
→ Adyen test account operationeel → Payment Engine development
→ Feature flags systeem → Per-destination feature rollout

VOLGENDE FASE: Fase III — Commerce Foundation (Payment/Adyen, Ticketing, Reservering)

╔══════════════════════════════════════════════════════════════════════════════╗
║  EINDE FASE II COMMANDO                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Planning & Doorlooptijd

| Blok | Doorlooptijd | API Kosten | Volgorde |
|------|-------------|------------|----------|
| 0: Verificatie | ~30 min | EUR 0 | Eerst |
| A: Chatbot Upgrade | 25-35 uur | ~EUR 2-5 | Week 1-2 |
| B: POI Module | 20-30 uur | ~EUR 0-2 | Week 2-3 |
| C: Agenda Module | 15-20 uur | ~EUR 2-5 | Week 3-4 |
| D: Customer Portal + UX | 30-45 uur | EUR 0 | Week 3-6 |
| E: WarreWijzer Discovery | 8-12 uur | ~EUR 5-15 | Parallel (week 1-3) |
| F: Adyen + Juridisch | 2-4 uur | EUR 0 | Parallel (week 1) |
| G: State-of-the-Art | 10-15 uur | EUR 0 | Geïntegreerd in A-D |
| **TOTAAL** | **110-161 uur** | **~EUR 9-27** | **6-8 weken** |

## Aanbevolen Volgorde

1. **Week 1**: Stap 0 (verificatie) → Blok A.1-A.3 (chatbot analyse + context) → Blok E.1 (Apify parallel starten) → Blok F (checklists genereren)
2. **Week 2**: Blok A.4-A.7 (chatbot afmaken + deploy) → Blok B.1-B.2 (POI analyse + freshness)
3. **Week 3**: Blok B.3-B.5 (POI UX + admin) → Blok C.1-C.2 (agenda analyse + scraping) → Blok E.2-E.4 (OSM + images + rapport)
4. **Week 4**: Blok C.3 (iCal export) → Blok D.1-D.2 (portal analyse + navigatie)
5. **Week 5**: Blok D.3-D.5 (personalisatie + micro-interacties + WCAG)
6. **Week 6**: Blok D.6 (onboarding) → Blok G (state-of-the-art afronding) → Final documentatie

---

*Document versie 1.0 — 1 maart 2026*
*Fase II: Active Module Upgrade — Enterprise-level customer-facing modules*
