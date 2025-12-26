# HoliBot Enterprise-Level Analyse & Verbeterplan

**Datum**: 26 december 2025
**Versie**: 3.1 (Fase 0 Geimplementeerd)
**Project**: HolidaiButler - Costa Blanca Tourism Platform

---

## IMPLEMENTATIE STATUS

### Fase 0: Data Integratie - VOLTOOID

| # | Taak | Status | Bestanden |
|---|------|--------|-----------|
| 0.1 | Multi-language POI sync naar ChromaDB | ✅ KLAAR | `syncService.js` |
| 0.2 | Admin resync endpoint | ✅ KLAAR | `holibot.js` |
| 0.3 | QnA tabel sync (32.000+ records) | ✅ KLAAR | `syncService.js` |
| 0.4 | Review sentiment integratie | ✅ KLAAR | `syncService.js` |
| 0.5 | Full re-sync POIs (11.152 docs) | ✅ KLAAR | Via `/admin/resync` |
| 0.6 | Full re-sync QnA (32.000 docs) | ⏳ NA DEPLOY | Via `/admin/resync` |

### Data Bronnen in ChromaDB

| Bron | Tabel | Records | Status |
|------|-------|---------|--------|
| POIs (6 talen) | `POI` | 11.152 docs | ✅ Gesynct |
| Q&A Pairs | `QnA` | 32.000 docs | ⏳ Na deploy sync |
| Agenda Events | `agenda` | ~100 docs | ✅ Gesynct |

### Nieuwe Endpoints

```
POST /api/v1/holibot/admin/resync
  Body: { languages: [...], includeQA: true, includeReviews: true, includeAgenda: true }
  Beschrijving: Enhanced multi-language sync met alle data

POST /api/v1/holibot/admin/sync-single/:poiId
  Body: { languages: [...] }
  Beschrijving: Sync enkele POI (alle talen)
```

### Actie na Deploy

Trigger full resync inclusief QnA:
```bash
curl -X POST https://test.holidaibutler.com/api/v1/holibot/admin/resync \
  -H "Content-Type: application/json" \
  -d '{"languages": ["nl","en","de","es","sv","pl"], "includeQA": true}'
```

**Verwacht resultaat:** ~43.000 documenten in ChromaDB (11.152 POIs + 32.000 QnA)

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Bestaande Infrastructuur Overzicht](#2-bestaande-infrastructuur-overzicht)
3. [Huidige HoliBot-Configuratie Analyse](#3-huidige-holibot-configuratie-analyse)
4. [Enterprise Benchmark](#4-enterprise-benchmark)
5. [Gap Analyse & Verbeterpunten](#5-gap-analyse--verbeterpunten)
6. [Geintegreerd Plan van Aanpak](#6-geintegreerd-plan-van-aanpak)
7. [Database Schema Uitbreiding](#7-database-schema-uitbreiding)
8. [Admin Dashboard Integratie](#8-admin-dashboard-integratie)

---

## 1. Executive Summary

### Huidige Status
HoliBot is een **goed functionerende AI-reisassistent** met solide fundamenten:
- RAG (Retrieval-Augmented Generation) met Mistral AI + ChromaDB
- 6-talige ondersteuning (nl, en, de, es, sv, pl)
- 4 Quick Actions (Itinerary, Location Info, Directions, Daily Tip)
- Streaming responses (SSE) + Text-to-Speech (Google Chirp3-HD)

### Kritieke Bevinding: Onvolledige Data Integratie

**ChromaDB Sync Analyse - Gaps Gevonden:**

| Data | In ChromaDB? | Impact |
|------|--------------|--------|
| POIs (basis) | ✅ Ja | Alleen `description` veld |
| POIs (enriched) | ❌ **NEE** | 12 meertalige beschrijvingen NIET gesynct |
| Agenda/Events | ✅ Ja | Basis info aanwezig |
| **poi_qa** | ❌ **NEE** | Q&A pairs NIET in vector DB |
| **reviews** | ❌ **NEE** | Sentiment data onbenut |
| **user_favorites** | ❌ **NEE** | Personalisatie context mist |

**Dit betekent:** HoliBot gebruikt slechts ~20% van de beschikbare data!

### Belangrijke Ontdekking: Bestaande Infrastructuur
De HolidaiButler-infrastructuur biedt **uitstekende mogelijkheden voor integratie**:

| Component | Status | Locatie | Gebruik voor HoliBot |
|-----------|--------|---------|---------------------|
| **Hetzner Server** | Actief | 91.98.71.87 | Database hosting, CRM data |
| **MySQL Database** | Vol operationeel | pma.your-server.de | Conversation logging, analytics |
| **Admin Dashboard** | 7-tab Analytics | admin.test.holidaibutler.com | HoliBot monitoring tab |
| **Metrics Service** | Prometheus-ready | admin-module/services/metrics.js | Real-time metrics |
| **Enriched POI Data** | ✅ Aanwezig | 12 taal-velden per POI | **Moet naar ChromaDB** |

### Kernprobleem & Oplossing
**"Ik begrijp je vraag niet"** - Minimaliseren door:
1. **Fase 0**: Verrijk ChromaDB met alle beschikbare data
2. **Fase 1**: Spell correction met POI-naam dictionary
3. **Fase 2**: Slimmere fallback responses met suggesties
4. **Fase 3+**: Analytics, monitoring, personalisatie

### Overall Beoordeling

| Aspect | Huidig | Target | Bestaande Basis |
|--------|--------|--------|-----------------|
| **Data Integratie** | 3/10 | 9/10 | **Enriched POIs, Q&A, Reviews beschikbaar** |
| Intent Detection | 6/10 | 9/10 | RAG aanwezig |
| Fallback Handling | 5/10 | 9/10 | Basis aanwezig |
| Personalisatie | 7/10 | 9/10 | User + Consent tabellen |
| Monitoring | 4/10 | 8/10 | Admin Analytics + Metrics Service |
| Security | 7/10 | 9/10 | RBAC + Rate limiting |

---

## 2. Bestaande Infrastructuur Overzicht

### 2.1 Hetzner Cloud Server

```
IP: 91.98.71.87
Project: 11589744
Console: https://console.hetzner.com/projects/11589744/dashboard/
```

**Beschikbare Resources:**
- Linux server met Node.js runtime
- MySQL database (pxoziy_db1)
- Firewall geconfigureerd
- File storage beschikbaar

### 2.2 MySQL Database (Hetzner)

**Toegang:** https://pma.your-server.de/index.php?route=/database/structure&db=pxoziy_db1

**Bestaande Tabellen Relevant voor HoliBot:**

| Tabel | Records | Huidige Sync | Actie Nodig |
|-------|---------|--------------|-------------|
| `POI` | ~2000+ | ⚠️ Alleen basis | **Enriched descriptions toevoegen** |
| `poi_qa` | ? | ❌ Niet gesynct | **Toevoegen aan ChromaDB** |
| `agenda` | ~100+ | ✅ Basis | OK |
| `reviews` | ? | ❌ Niet gesynct | **Sentiment toevoegen** |
| `users` | - | N/A | Personalisatie |
| `user_favorites` | - | ❌ Niet gebruikt | **Context toevoegen** |
| `user_consent` | - | N/A | GDPR tracking |

**Ontbrekende Tabellen (Toe te voegen):**
- `holibot_conversations` - Conversatie sessies
- `holibot_messages` - Individuele berichten
- `holibot_feedback` - Gebruikersfeedback
- `holibot_fallbacks` - Fallback analyse

### 2.3 POI Data Structuur - Onbenutte Velden

**Huidige Sync (syncService.js):**
```javascript
// HUIDIGE implementatie - ONVOLLEDIG
buildPOIEmbeddingText(poi) {
  const parts = [
    poi.name,
    poi.category,
    poi.subcategory,
    poi.description,        // ⚠️ Alleen BASIC description!
    poi.address
  ];
  return parts.join(' | ');
}
```

**Beschikbare maar ONBENUTTE velden in POI model:**
```
enriched_tile_description      (EN - default)
enriched_tile_description_nl   (NL)
enriched_tile_description_de   (DE)
enriched_tile_description_es   (ES)
enriched_tile_description_sv   (SV)
enriched_tile_description_pl   (PL)

enriched_detail_description    (EN - default)
enriched_detail_description_nl (NL)
enriched_detail_description_de (DE)
enriched_detail_description_es (ES)
enriched_detail_description_sv (SV)
enriched_detail_description_pl (PL)

enriched_highlights            (JSON array)
enriched_target_audience       (Text)
```

### 2.4 Admin Dashboard

**URL:** https://admin.test.holidaibutler.com/dashboard

**Bestaande Analytics (7 Tabs):**
1. **POIs** - Count by category, status distribution
2. **Users** - Role distribution, status
3. **Events** - Revenue, tickets, trends
4. **Tickets** - Sales trends, revenue
5. **Reservations** - Daily stats, peak hours
6. **Transactions** - Revenue, types, refunds
7. **Performance** - Uptime, response times, error rate

**Toe te voegen:**
8. **HoliBot** - Conversations, fallbacks, satisfaction

### 2.5 GitHub Repository

**URL:** https://github.com/FrankSpooren/HolidaiButler
**Branch:** feature/holibot-2.0

---

## 3. Huidige HoliBot-Configuratie Analyse

### 3a. Data Sources - Kritieke Gap

| Databron | In MySQL | In ChromaDB | Gebruikt door RAG |
|----------|----------|-------------|-------------------|
| POI naam/categorie | ✅ | ✅ | ✅ |
| POI basic description | ✅ | ✅ | ✅ |
| **POI enriched descriptions** | ✅ | ❌ | ❌ |
| **POI highlights** | ✅ | ❌ | ❌ |
| **POI target audience** | ✅ | ❌ | ❌ |
| Agenda events | ✅ | ✅ | ✅ |
| **poi_qa Q&A pairs** | ✅ | ❌ | ❌ |
| **reviews** | ✅ | ❌ | ❌ |
| **user_favorites** | ✅ | N/A | ❌ |

### 3b. Huidige Sync Service Analyse

**Locatie:** `platform-core/src/services/holibot/syncService.js`

**Wat WEL gesynct wordt:**
- POIs: id, name, category, subcategory, description, address, coordinates, rating, etc.
- Agenda: id, title, description, category, location, dates

**Wat NIET gesynct wordt:**
- Enriched multi-language descriptions (12 velden)
- poi_qa tabel (Q&A pairs)
- Reviews/sentiment data
- User favorites context

### 3c. Overige Configuratie

| Aspect | Status | Bestaande Integratie |
|--------|--------|---------------------|
| Guest Access | ✅ | Widget zonder auth |
| User Preferences | ✅ | Interests, companion, personality |
| Language Detection | ✅ | 6 talen |
| Streaming | ✅ | SSE implementatie |
| TTS | ✅ | Google Chirp3-HD |

---

## 4. Enterprise Benchmark

### Vergelijking met Industrie Standaarden

| Feature | HoliBot Nu | Na Fase 0 | Enterprise Target |
|---------|------------|-----------|-------------------|
| **Data Utilization** | 20% | 90%+ | 95%+ |
| Intent Detection | RAG-only | RAG + Q&A | Hybrid NLU + LLM |
| Fallback Rate | Unknown | <15% | <10% |
| Response Quality | Basic | Enriched | Contextual |
| Personalization | Session | + Favorites | Cross-session |

---

## 5. Gap Analyse & Verbeterpunten

### Prioriteit 0: KRITIEK - Data Integratie Gap

#### 5.0 Onvolledige ChromaDB Sync
**Impact:** ZEER HOOG - HoliBot mist 80% van beschikbare kennis

**Huidige situatie:**
```javascript
// syncService.js - Alleen basis velden
poi.description  // Generic, vaak kort, alleen Engels
```

**Gewenste situatie:**
```javascript
// Alle enriched content per taal
poi.enriched_tile_description_nl  // Rijke NL beschrijving
poi.enriched_detail_description_nl // Gedetailleerde NL info
poi.enriched_highlights // Hoogtepunten
poi.enriched_target_audience // Doelgroep info
```

#### 5.1 poi_qa Niet Gesynct
**Impact:** HOOG - Veelgestelde vragen en antwoorden onbenut

De `poi_qa` tabel bevat kant-en-klare Q&A pairs:
```sql
CREATE TABLE poi_qa (
  question TEXT NOT NULL,      -- "Wat zijn de openingstijden?"
  answer TEXT NOT NULL,        -- "Dagelijks van 10:00 tot 22:00"
  language VARCHAR(5),         -- 'nl', 'en', etc.
  category VARCHAR(50),        -- 'opening_hours', 'pricing'
  keywords JSON
);
```

#### 5.2 Reviews Sentiment Onbenut
**Impact:** MEDIUM - Mist sociale bewijskracht in antwoorden

Reviews bevatten waardevolle context:
- Sentiment (positive/negative/neutral)
- Travel party type (couples, families, solo)
- Specifieke ervaringen

### Prioriteit 1: Spell Correction & Fallbacks

(Zie originele sectie 5.1-5.3)

### Prioriteit 2: Analytics & Monitoring

(Zie originele sectie 5.4-5.6)

---

## 6. Geintegreerd Plan van Aanpak

### Overzicht Fasen

| Fase | Focus | Impact | Effort |
|------|-------|--------|--------|
| **0. Data Integratie** | Verrijk ChromaDB | ZEER HOOG | 12u |
| **1. Foundation** | Spell correction + fallbacks | HOOG | 13u |
| **2. Database** | Conversation logging | MEDIUM | 8u |
| **3. Dashboard** | Admin Analytics tab | MEDIUM | 11u |
| **4. Intelligence** | Query rewriting | HOOG | 13u |
| **5. Personalisatie** | User context | MEDIUM | 13u |

---

### Fase 0: Data Integratie (PRIORITEIT - EERST UITVOEREN)

**Doel:** Maximaliseer kennisbank door alle beschikbare data naar ChromaDB te syncen

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 0.1 | Update `syncService.js` - enriched descriptions per taal | `platform-core/src/services/holibot/syncService.js` | 3u |
| 0.2 | Voeg Q&A sync toe aan ChromaDB | Zelfde file | 2u |
| 0.3 | Genereer poi_qa data met Mistral AI (indien leeg) | Nieuw script | 4u |
| 0.4 | Voeg review sentiment toe aan POI context | `syncService.js` | 2u |
| 0.5 | Full re-sync naar ChromaDB | Admin endpoint | 1u |

**Totaal Fase 0:** 12 uur

#### 0.1 Verbeterde POI Embedding (Multi-language)

**Nieuwe implementatie:**
```javascript
// syncService.js - VERBETERD
buildPOIEmbeddingText(poi, language = 'en') {
  // Selecteer taal-specifieke beschrijving
  const tileDesc = language === 'en'
    ? poi.enriched_tile_description
    : poi[`enriched_tile_description_${language}`] || poi.enriched_tile_description;

  const detailDesc = language === 'en'
    ? poi.enriched_detail_description
    : poi[`enriched_detail_description_${language}`] || poi.enriched_detail_description;

  const parts = [
    poi.name,
    poi.category,
    poi.subcategory,
    tileDesc || poi.description,
    detailDesc,
    poi.enriched_highlights ? JSON.parse(poi.enriched_highlights).join(', ') : null,
    poi.enriched_target_audience,
    poi.address
  ].filter(Boolean);

  return parts.join(' | ');
}

// Sync POIs voor alle talen
async syncPOIsMultiLanguage() {
  const languages = ['en', 'nl', 'de', 'es', 'sv', 'pl'];
  const pois = await this.getPOIsForSync();

  for (const poi of pois) {
    for (const lang of languages) {
      const text = this.buildPOIEmbeddingText(poi, lang);
      const embedding = await embeddingService.generateEmbedding(text);

      await chromaService.upsert([{
        id: `poi_${poi.id}_${lang}`,
        embedding,
        metadata: {
          type: 'poi',
          id: poi.id,
          name: poi.name,
          category: poi.category,
          language: lang,
          // ... rest of metadata
        },
        document: text
      }]);
    }
  }
}
```

#### 0.2 Q&A Sync naar ChromaDB

**Nieuwe functie:**
```javascript
// syncService.js - NIEUW
async syncQA() {
  logger.info('Starting Q&A sync to ChromaDB...');

  const qaItems = await this.query(`
    SELECT id, poi_id, question, answer, language, category, keywords
    FROM poi_qa
    WHERE is_active = 1
  `);

  logger.info(`Found ${qaItems.length} Q&A items to sync`);

  const documents = [];

  for (const qa of qaItems) {
    const text = `Vraag: ${qa.question}\nAntwoord: ${qa.answer}`;
    const embedding = await embeddingService.generateEmbedding(text);

    documents.push({
      id: `qa_${qa.id}`,
      embedding,
      metadata: {
        type: 'qa',
        poi_id: qa.poi_id,
        question: qa.question,
        language: qa.language,
        category: qa.category,
        keywords: qa.keywords
      },
      document: qa.answer
    });
  }

  if (documents.length > 0) {
    await chromaService.upsert(documents);
  }

  logger.info(`Q&A sync complete: ${documents.length} items synced`);
  return { synced: documents.length };
}
```

#### 0.3 Q&A Generatie Script (indien tabel leeg)

**Nieuw script:** `platform-core/scripts/generateQA.js`
```javascript
/**
 * Genereer Q&A pairs voor top POIs met Mistral AI
 */
import { embeddingService } from '../src/services/holibot/embeddingService.js';
import { mysqlSequelize } from '../src/config/database.js';

const LANGUAGES = ['nl', 'en', 'de', 'es', 'sv', 'pl'];
const QA_CATEGORIES = ['opening_hours', 'pricing', 'accessibility', 'parking', 'reservations', 'general'];

async function generateQAForPOI(poi, language) {
  const langPrompts = {
    nl: 'Genereer 5 veelgestelde vragen en antwoorden in het Nederlands',
    en: 'Generate 5 frequently asked questions and answers in English',
    de: 'Generiere 5 häufig gestellte Fragen und Antworten auf Deutsch',
    es: 'Genera 5 preguntas frecuentes y respuestas en español',
    sv: 'Generera 5 vanliga frågor och svar på svenska',
    pl: 'Wygeneruj 5 często zadawanych pytań i odpowiedzi po polsku'
  };

  const prompt = `${langPrompts[language]} voor deze locatie:

Naam: ${poi.name}
Categorie: ${poi.category}
Beschrijving: ${poi.description || poi.enriched_tile_description}
Adres: ${poi.address}
Openingstijden: ${poi.opening_hours || 'Niet beschikbaar'}
Rating: ${poi.rating}/5

Categorieën: ${QA_CATEGORIES.join(', ')}

Geef output als JSON array:
[{"question": "...", "answer": "...", "category": "..."}]`;

  const response = await embeddingService.generateChatCompletion([
    { role: 'user', content: prompt }
  ], { temperature: 0.7 });

  try {
    return JSON.parse(response);
  } catch {
    logger.error('Failed to parse Q&A response');
    return [];
  }
}

async function main() {
  // Get top 100 POIs by rating/popularity
  const pois = await mysqlSequelize.query(`
    SELECT * FROM POI
    WHERE is_active = 1 AND rating >= 4.0
    ORDER BY rating DESC, review_count DESC
    LIMIT 100
  `);

  for (const poi of pois) {
    for (const lang of LANGUAGES) {
      const qaItems = await generateQAForPOI(poi, lang);

      for (const qa of qaItems) {
        await mysqlSequelize.query(`
          INSERT INTO poi_qa (poi_id, question, answer, language, category, source)
          VALUES (?, ?, ?, ?, ?, 'ai_generated')
        `, [poi.id, qa.question, qa.answer, lang, qa.category]);
      }

      console.log(`Generated ${qaItems.length} Q&A for ${poi.name} (${lang})`);
    }
  }
}

main();
```

#### 0.4 Review Sentiment in POI Context

**Uitbreiding syncService:**
```javascript
// Voeg gemiddeld sentiment toe aan POI metadata
async enrichPOIWithReviews(poi) {
  const reviews = await this.query(`
    SELECT
      COUNT(*) as review_count,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
      GROUP_CONCAT(
        CASE WHEN rating >= 4 THEN SUBSTRING(review_text, 1, 100) END
        SEPARATOR ' | '
      ) as top_reviews
    FROM reviews
    WHERE poi_id = ? AND status = 'approved'
  `, [poi.id]);

  return {
    ...poi,
    review_summary: reviews[0]?.top_reviews || null,
    sentiment_score: reviews[0]?.positive_count / (reviews[0]?.review_count || 1)
  };
}
```

#### 0.5 Full Re-sync Endpoint

**Admin API:**
```javascript
// platform-core/src/routes/holibot.js
router.post('/admin/resync', authenticateAdmin, async (req, res) => {
  const { includeQA = true, includeReviews = true, languages = ['nl', 'en', 'de', 'es', 'sv', 'pl'] } = req.body;

  try {
    const results = {
      pois: await syncService.syncPOIsMultiLanguage(languages),
      agenda: await syncService.syncAgenda()
    };

    if (includeQA) {
      results.qa = await syncService.syncQA();
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Deliverables Fase 0:**
- Verbeterde `syncService.js` met multi-language support
- Q&A sync functionaliteit
- Q&A generatie script
- Review sentiment integratie
- Admin resync endpoint
- **ChromaDB gevuld met 100% beschikbare data**

---

### Fase 1: Foundation (Elimineer "Ik begrijp je niet")

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 1.1 | Spell correction service | `platform-core/src/services/holibot/spellService.js` | 4u |
| 1.2 | POI-naam dictionary laden | Bestaande `POI` tabel | 2u |
| 1.3 | Multi-fallback systeem | `platform-core/src/routes/holibot.js` | 3u |
| 1.4 | "Bedoelde je...?" suggesties | Gebruik `poi_qa` + POI names | 3u |
| 1.5 | Fallback logging tabel | MySQL migration | 1u |

**Totaal Fase 1:** 13 uur

**Deliverables:**
- `spellService.js` met fuzzy matching
- Enhanced fallback handler met 4 strategieen
- `holibot_fallbacks` tabel voor analyse

---

### Fase 2: Database & Logging

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 2.1 | Create `holibot_conversations` tabel | MySQL migration | 1u |
| 2.2 | Create `holibot_messages` tabel | MySQL migration | 1u |
| 2.3 | Create `holibot_feedback` tabel | MySQL migration | 1u |
| 2.4 | Conversation logging in holibot.js | `platform-core/src/routes/holibot.js` | 3u |
| 2.5 | Feedback endpoint | Nieuw endpoint | 2u |

**Totaal Fase 2:** 8 uur

**Deliverables:**
- 4 nieuwe tabellen in MySQL (Hetzner)
- Automatische conversation logging
- Feedback verzameling

---

### Fase 3: Admin Dashboard Integratie

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 3.1 | HoliBot tab in Analytics | `admin-module/frontend/src/pages/analytics/` | 4u |
| 3.2 | HoliBot metrics in MetricsService | `admin-module/backend/services/metrics.js` | 2u |
| 3.3 | HoliBot stats API endpoint | `admin-module/backend/routes/` | 2u |
| 3.4 | Real-time dashboard widgets | Charts voor conversations, fallbacks | 3u |

**Totaal Fase 3:** 11 uur

**Deliverables:**
- Nieuwe "HoliBot" tab in Analytics dashboard
- Real-time metrics visualisatie
- Fallback rate monitoring

---

### Fase 4: Query Intelligence

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 4.1 | Query rewriting met Mistral | `platform-core/src/services/holibot/queryProcessor.js` | 4u |
| 4.2 | Entity extraction (dates, locations) | Zelfde service | 3u |
| 4.3 | Intent confidence scoring | Zelfde service | 2u |
| 4.4 | Hybrid search (keyword + vector) | `ragService.js` uitbreiden | 4u |

**Totaal Fase 4:** 13 uur

**Deliverables:**
- `queryProcessor.js` met preprocessing pipeline
- Verbeterde RAG accuracy
- Confidence-based fallback triggers

---

### Fase 5: Personalisatie & Polish

| # | Taak | Locatie | Effort |
|---|------|---------|--------|
| 5.1 | User favorites context in RAG | Link `user_favorites` in queries | 2u |
| 5.2 | Review sentiment context | Link `reviews` sentiment | 2u |
| 5.3 | Cross-session memory model | Nieuwe tabel of JSON field | 3u |
| 5.4 | CSAT survey na conversatie | Frontend widget | 2u |
| 5.5 | Final QA & testing | Alle flows testen | 4u |

**Totaal Fase 5:** 13 uur

**Deliverables:**
- Verbeterde personalisatie met favorites
- CSAT tracking
- Production-ready code

---

## 7. Database Schema Uitbreiding

### Nieuwe Tabellen voor MySQL (Hetzner)

```sql
-- Migration: 008_holibot_analytics.sql

-- 1. Conversation Sessions
CREATE TABLE holibot_conversations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id VARCHAR(255) NOT NULL,
  user_id INT NULL,
  language VARCHAR(5) DEFAULT 'nl',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  message_count INT DEFAULT 0,
  fallback_count INT DEFAULT 0,
  quick_actions_used JSON DEFAULT '[]',
  user_satisfaction TINYINT NULL COMMENT '1-5 stars',
  feedback_text TEXT NULL,
  device_type VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_started (started_at),
  INDEX idx_language (language),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Individual Messages
CREATE TABLE holibot_messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,

  -- Intent Analysis
  detected_intent VARCHAR(100) NULL,
  intent_confidence FLOAT NULL,
  entities JSON NULL COMMENT '{"location": "Calpe", "date": "tomorrow"}',

  -- Quality Metrics
  was_fallback BOOLEAN DEFAULT FALSE,
  fallback_type VARCHAR(50) NULL,
  response_time_ms INT NULL,

  -- RAG Context
  rag_results_count INT NULL,
  top_poi_ids JSON NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_conversation (conversation_id),
  INDEX idx_role (role),
  INDEX idx_fallback (was_fallback),
  INDEX idx_intent (detected_intent),
  FOREIGN KEY (conversation_id) REFERENCES holibot_conversations(id) ON DELETE CASCADE
);

-- 3. User Feedback
CREATE TABLE holibot_feedback (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  message_id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  user_id INT NULL,

  feedback_type ENUM('thumbs_up', 'thumbs_down', 'report') NOT NULL,
  feedback_reason VARCHAR(255) NULL,
  feedback_text TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_message (message_id),
  INDEX idx_conversation (conversation_id),
  INDEX idx_type (feedback_type),
  FOREIGN KEY (message_id) REFERENCES holibot_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES holibot_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Fallback Analysis
CREATE TABLE holibot_fallbacks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  message_id CHAR(36) NOT NULL,
  original_query TEXT NOT NULL,
  corrected_query TEXT NULL,

  fallback_strategy VARCHAR(50) NOT NULL,
  suggestions_shown JSON NULL,
  user_selected_suggestion VARCHAR(255) NULL,

  -- For improvement
  should_have_matched_poi_id INT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_message (message_id),
  INDEX idx_strategy (fallback_strategy),
  INDEX idx_resolved (resolved),
  FOREIGN KEY (message_id) REFERENCES holibot_messages(id) ON DELETE CASCADE
);

-- 5. Daily Aggregates (for fast dashboard queries)
CREATE TABLE holibot_daily_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,

  -- Volume
  conversations_total INT DEFAULT 0,
  messages_total INT DEFAULT 0,
  unique_users INT DEFAULT 0,

  -- Quality
  fallback_count INT DEFAULT 0,
  fallback_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,

  -- Satisfaction
  thumbs_up INT DEFAULT 0,
  thumbs_down INT DEFAULT 0,
  avg_satisfaction DECIMAL(3,2) NULL,

  -- Breakdown
  by_language JSON DEFAULT '{}',
  by_quick_action JSON DEFAULT '{}',
  top_intents JSON DEFAULT '[]',
  top_fallback_queries JSON DEFAULT '[]',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY idx_date (date)
);
```

### Uitbreiding poi_qa (indien nog niet aanwezig)

```sql
-- Voeg FULLTEXT index toe voor betere zoekresultaten
ALTER TABLE poi_qa ADD FULLTEXT INDEX ft_qa (question, answer);
```

---

## 8. Admin Dashboard Integratie

### Nieuwe HoliBot Tab in Analytics

**Locatie:** `admin-module/frontend/src/pages/analytics/Analytics.jsx`

**Tab 8: HoliBot Analytics**

Widgets:
1. **Conversations Today** - Counter met trend
2. **Fallback Rate** - Percentage met kleur-indicator
3. **Avg Response Time** - Milliseconden
4. **User Satisfaction** - Gemiddelde score

Charts:
- Conversations Over Time (line chart)
- Language Distribution (pie chart)
- Top Fallback Queries (list)
- Quick Action Usage (bar chart)

---

## 9. Success Metrics

| Metric | Huidige | Na Fase 0 | Na Fase 5 | Meting |
|--------|---------|-----------|-----------|--------|
| **Data Utilization** | 20% | 90%+ | 95%+ | ChromaDB docs |
| Fallback Rate | Unknown | <20% | <10% | `holibot_daily_stats` |
| Response Quality | Basic | Enriched | Contextual | Manual review |
| Response Time | ~2s | <1.8s | <1.5s | `holibot_messages` |
| User Satisfaction | Unknown | - | >4.0/5 | Feedback |

---

## 10. Volgende Stappen

**Na goedkeuring van dit plan:**

### Fase 0 - Direct starten:
1. 🔄 Update `syncService.js` met enriched descriptions
2. 🔄 Voeg Q&A sync functie toe
3. 🔄 Check/vul `poi_qa` tabel
4. 🔄 Run full re-sync naar ChromaDB
5. 🔄 Test HoliBot met verrijkte data

### Fase 1-5 - Daarna:
6. 🔄 Implementeer spell correction
7. 🔄 Enhanced fallbacks
8. 🔄 Database logging
9. 🔄 Admin Dashboard tab
10. 🔄 Push naar GitHub, CI/CD deployment

---

## Appendix: File Paths Reference

### Fase 0 - Te wijzigen files
```
platform-core/
  src/services/holibot/syncService.js     # UPDATE: Multi-language + Q&A
  src/routes/holibot.js                   # ADD: /admin/resync endpoint
  scripts/generateQA.js                   # NEW: Q&A generatie script
```

### Platform Core (Backend)
```
platform-core/
  src/routes/holibot.js                    # Main HoliBot API
  src/services/holibot/ragService.js       # RAG implementation
  src/services/holibot/chromaService.js    # Vector DB
  src/services/holibot/embeddingService.js # Mistral AI
  src/services/holibot/syncService.js      # Data sync
  src/services/holibot/spellService.js     # NEW: Spell correction
  src/services/holibot/queryProcessor.js   # NEW: Query enhancement
  database/migrations/008_holibot_analytics.sql  # NEW: Schema
```

### Admin Module
```
admin-module/
  frontend/src/pages/analytics/Analytics.jsx  # Add HoliBot tab
  backend/routes/holibot.js                   # NEW: Stats API
  backend/services/metrics.js                 # Extend with HoliBot
```

### Customer Portal
```
customer-portal/
  frontend/src/shared/components/HoliBot/     # Widget components
  frontend/src/shared/contexts/HoliBotContext.tsx  # State management
```

---

*Dit document is versie 3.0 met Fase 0: Data Integratie als eerste prioriteit.*

**Wacht op jouw goedkeuring om te starten met implementatie.**

**Samenvatting kernpunten:**
1. ✅ Fase 0 toegevoegd: Verrijk ChromaDB met alle beschikbare data
2. ✅ Multi-language POI sync (6 talen x enriched descriptions)
3. ✅ Q&A sync naar ChromaDB
4. ✅ Q&A generatie script voor lege tabel
5. ✅ Review sentiment integratie
6. ✅ Admin resync endpoint
