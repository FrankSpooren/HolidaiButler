/**
 * HoliBot Routes v2.2
 * API endpoints for HoliBot AI Assistant Widget
 *
 * Features:
 * - RAG-based semantic search with ChromaDB Cloud
 * - Mistral AI for embeddings and chat
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - 4 Quick Actions: Itinerary, Location Info, Directions, Daily Tip
 * - SSE Streaming for real-time chat responses
 * - Category hierarchy browser (3 levels)
 *
 * Endpoints:
 * - POST /holibot/chat - RAG-powered chat
 * - POST /holibot/chat/stream - SSE streaming chat
 * - POST /holibot/search - Semantic search
 * - POST /holibot/itinerary - Build day program
 * - GET /holibot/location/:id - Location details with Q&A
 * - POST /holibot/directions - Get directions to POI
 * - GET /holibot/daily-tip - Personalized daily tip
 * - GET /holibot/categories - POI categories
 * - GET /holibot/categories/hierarchy - 3-level category tree
 * - GET /holibot/categories/:category/pois - POIs by category filter
 * - POST /holibot/admin/sync - Sync MySQL to ChromaDB
 * - GET /holibot/admin/stats - Service statistics
 */

import express from 'express';
import { ragService, syncService, chromaService, embeddingService, ttsService } from '../services/holibot/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

let POI = null;
const getPOIModel = async () => {
  if (!POI) {
    try {
      const module = await import('../models/POI.js');
      POI = module.default;
    } catch (error) {
      logger.warn('POI model not available');
      return null;
    }
  }
  return POI;
};

/**
 * ============================================
 * SHARED HELPER FUNCTIONS (used by all Quick Actions)
 * ============================================
 */

/**
 * Check if POI is permanently closed (all 7 days marked "Closed")
 * CRITICAL: Never show POIs that are closed 7 days/week in any Quick Action
 * @param {any} openingHours - Opening hours data (string JSON or parsed object)
 * @returns {boolean} - true if permanently closed
 */
const isPermanentlyClosed = (openingHours) => {
  if (!openingHours) return false; // No opening hours = assume open

  try {
    let hours = openingHours;
    if (typeof hours === 'string') {
      hours = JSON.parse(hours);
    }

    // Check if it's an object with day keys
    if (typeof hours === 'object' && hours !== null) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                   'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
                   'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      let closedCount = 0;
      let totalDays = 0;

      for (const day of days) {
        if (hours[day] !== undefined) {
          totalDays++;
          const value = hours[day];
          // Check various "closed" formats
          if (value === 'Closed' || value === 'closed' || value === 'CLOSED' ||
              value === 'Gesloten' || value === 'gesloten' ||
              value === 'Cerrado' || value === 'cerrado' ||
              value === false || value === null || value === '') {
            closedCount++;
          }
        }
      }

      // If we found day entries and ALL are closed, it's permanently closed
      if (totalDays >= 7 && closedCount >= 7) {
        return true;
      }

      // Also check for array format like [{day: "Monday", hours: "Closed"}, ...]
      if (Array.isArray(hours)) {
        const closedDays = hours.filter(h =>
          h.hours === 'Closed' || h.hours === 'closed' || h.hours === 'CLOSED' ||
          h.hours === 'Gesloten' || h.open === false
        ).length;
        if (hours.length >= 7 && closedDays >= 7) {
          return true;
        }
      }
    }

    return false;
  } catch (e) {
    return false; // If parsing fails, assume not permanently closed
  }
};

/**
 * Get translated description based on language
 * Uses enriched_tile_description_* fields, falls back to English then original
 * @param {object} poi - POI object with translation fields
 * @param {string} lang - Language code (nl, en, de, es, sv, pl)
 * @returns {string} - Translated description
 */
const getTranslatedDescription = (poi, lang) => {
  if (!poi) return '';

  // Language-specific field mapping
  const langFieldMap = {
    nl: poi.enriched_tile_description_nl,
    de: poi.enriched_tile_description_de,
    es: poi.enriched_tile_description_es,
    sv: poi.enriched_tile_description_sv,
    pl: poi.enriched_tile_description_pl,
    en: poi.enriched_tile_description // English is default
  };

  // Return translated version, fallback to English, then original description
  return langFieldMap[lang] || poi.enriched_tile_description || poi.description || '';
};

/**
 * POST /api/v1/holibot/chat
 * RAG-powered chat with HoliBot (non-streaming)
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'nl', userPreferences = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }

    logger.info('HoliBot chat request', { message: message.substring(0, 100), language, hasHistory: conversationHistory.length > 0 });

    const response = await ragService.chat(message, language, { userPreferences, conversationHistory });
    res.json({ success: true, data: response });

  } catch (error) {
    logger.error('HoliBot chat error:', error);
    res.status(500).json({ success: false, error: 'Chat service temporarily unavailable' });
  }
});

/**
 * POST /api/v1/holibot/chat/stream
 * SSE Streaming RAG-powered chat with HoliBot
 * Returns Server-Sent Events for real-time response streaming
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'nl', userPreferences = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }

    logger.info('HoliBot streaming chat request', { message: message.substring(0, 100), language });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Get streaming response from RAG service
    const streamResult = await ragService.chatStream(message, language, { userPreferences, conversationHistory });

    if (!streamResult.success) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: streamResult.error })}\n\n`);
      res.end();
      return;
    }

    // Send initial metadata (search results, POIs)
    res.write(`event: metadata\ndata: ${JSON.stringify({
      pois: streamResult.pois,
      searchTimeMs: streamResult.searchTimeMs,
      source: streamResult.source
    })}\n\n`);

    // Stream the response chunks
    let fullMessage = '';
    try {
      for await (const chunk of streamResult.stream) {
        fullMessage += chunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (streamError) {
      logger.error('Streaming error:', streamError);
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Streaming interrupted' })}\n\n`);
    }

    // Send completion event
    res.write(`event: done\ndata: ${JSON.stringify({ fullMessage, totalLength: fullMessage.length })}\n\n`);
    res.end();

  } catch (error) {
    logger.error('HoliBot streaming chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Streaming chat service temporarily unavailable' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/v1/holibot/search
 * Semantic search for POIs
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10, filter } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const results = await ragService.search(query, { limit, filter });
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('HoliBot search error:', error);
    res.status(500).json({ success: false, error: 'Search service temporarily unavailable' });
  }
});

/**
 * POST /api/v1/holibot/itinerary
 * Quick Action 1: Build personalized day program with Events
 *
 * Features:
 * - Duration choice: morning, afternoon, evening, full-day
 * - Interest-based POI selection
 * - Events integration from agenda
 * - Meal suggestions for appropriate time slots
 * - Time-of-day awareness (morning=cafes/bakeries, evening=restaurants/bars)
 * - Excludes permanently closed POIs (7 days/week "Closed")
 */
router.post('/itinerary', async (req, res) => {
  try {
    const { date, interests = [], duration = 'full-day', travelCompanion, language = 'nl', includeMeals = true } = req.body;

    logger.info('HoliBot itinerary request', { date, interests, duration, includeMeals });

    // Time-of-day appropriate POI types
    const timeOfDayTypes = {
      morning: ['bakery', 'cafe', 'coffee', 'breakfast', 'beach', 'nature', 'park', 'hiking', 'cycling'],
      afternoon: ['museum', 'shopping', 'market', 'viewpoint', 'culture', 'active', 'sport', 'beach'],
      evening: ['restaurant', 'tapas', 'bar', 'fine dining', 'seafood', 'pizzeria', 'nightlife', 'lounge']
    };

    // Note: isPermanentlyClosed() is now a shared helper at the top of this file

    // Step 1: Search POIs - do SEPARATE searches per interest for better variety
    let allSearchResults = [];
    if (interests.length > 0) {
      // Search each interest separately to ensure balanced results
      for (const interest of interests) {
        const interestResults = await ragService.search(interest + ' attractions Calpe', { limit: 10 });
        allSearchResults = [...allSearchResults, ...interestResults.results];
      }
    }
    // Always add a general search for backup POIs
    const generalResults = await ragService.search('best things to do in Calpe', { limit: 10 });
    allSearchResults = [...allSearchResults, ...generalResults.results];

    // Remove duplicates by id AND filter out permanently closed POIs
    const seenIds = new Set();
    const searchResults = {
      results: allSearchResults.filter(poi => {
        if (!poi.id || seenIds.has(poi.id)) return false;

        // CRITICAL: Exclude permanently closed POIs
        if (isPermanentlyClosed(poi.opening_hours || poi.openingHours)) {
          logger.info('Excluding permanently closed POI from itinerary:', { id: poi.id, name: poi.name });
          return false;
        }

        seenIds.add(poi.id);
        return true;
      })
    };

    logger.info('Itinerary search results:', {
      totalPois: searchResults.results.length,
      interests,
      duration
    });

    // Step 2: Get Events for the selected date
    let events = [];
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      const eventResults = await mysqlSequelize.query(
        "SELECT a.id, a.title, a.short_description as description, " +
        "a.image as thumbnailUrl, a.location_name as address, " +
        "d.event_date, d.start_time " +
        "FROM agenda a " +
        "INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash " +
        "WHERE d.event_date = ? " +
        "AND (a.calpe_distance IS NULL OR a.calpe_distance <= 25) " +
        "ORDER BY d.start_time ASC LIMIT 5",
        { replacements: [targetDate], type: QueryTypes.SELECT }
      );

      events = eventResults.map(e => ({
        ...e,
        type: 'event',
        name: e.title,
        category: 'Event'
      }));
    } catch (eventError) {
      logger.warn('Could not fetch events for itinerary:', eventError.message);
    }

    // Step 3: Get restaurant suggestions if meals included
    let restaurants = [];
    if (includeMeals) {
      const restaurantResults = await ragService.search('restaurant Calpe ' + (interests.includes('Food & Drinks') ? 'best rated' : ''), { limit: 5 });
      restaurants = restaurantResults.results.filter(p =>
        p.category?.toLowerCase().includes('food') ||
        p.category?.toLowerCase().includes('restaurant') ||
        p.subcategory?.toLowerCase().includes('restaurant')
      );
    }

    // Step 4: Build time slots with mixed content and time-of-day context
    const timeSlots = {
      'morning': [
        { time: '09:00', type: 'activity', timeContext: 'morning' },
        { time: '10:30', type: 'activity', timeContext: 'morning' },
        { time: '12:00', type: 'lunch', timeContext: 'morning' }
      ],
      'afternoon': [
        { time: '13:00', type: 'lunch', timeContext: 'afternoon' },
        { time: '14:30', type: 'activity', timeContext: 'afternoon' },
        { time: '16:30', type: 'activity', timeContext: 'afternoon' }
      ],
      'evening': [
        { time: '18:00', type: 'activity', timeContext: 'evening' },
        { time: '19:30', type: 'dinner', timeContext: 'evening' },
        { time: '21:00', type: 'activity', timeContext: 'evening' }
      ],
      'full-day': [
        { time: '09:30', type: 'activity', timeContext: 'morning' },
        { time: '11:00', type: 'activity', timeContext: 'morning' },
        { time: '13:00', type: 'lunch', timeContext: 'afternoon' },
        { time: '15:00', type: 'activity', timeContext: 'afternoon' },
        { time: '17:00', type: 'activity', timeContext: 'afternoon' },
        { time: '19:30', type: 'dinner', timeContext: 'evening' }
      ]
    };

    const slots = timeSlots[duration] || timeSlots['full-day'];
    const itinerary = [];
    let eventIndex = 0;

    // Shuffle POIs and restaurants for variety (Fisher-Yates shuffle)
    const shuffleArray = (arr) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Categorize POIs by type for time-of-day selection
    const morningPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.morning.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('beach') || cat.includes('nature') || cat.includes('active');
    });

    const afternoonPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.afternoon.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('culture') || cat.includes('shopping') || cat.includes('recreation');
    });

    const eveningPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.evening.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('food') || cat.includes('nightlife');
    });

    // Combine restaurants from search + explicit restaurant search
    const allRestaurants = [...restaurants, ...searchResults.results.filter(p =>
      p.category?.toLowerCase().includes('food') ||
      p.subcategory?.toLowerCase().includes('restaurant')
    )];

    // Shuffle all lists for variety
    const shuffledMorning = shuffleArray(morningPois.length > 0 ? morningPois : searchResults.results);
    const shuffledAfternoon = shuffleArray(afternoonPois.length > 0 ? afternoonPois : searchResults.results);
    const shuffledEvening = shuffleArray(eveningPois.length > 0 ? eveningPois : searchResults.results);
    const shuffledRestaurants = shuffleArray(allRestaurants);
    const shuffledAllPois = shuffleArray(searchResults.results); // Fallback

    // Track used POIs to avoid duplicates in same program
    const usedPoiIds = new Set();
    let morningIndex = 0, afternoonIndex = 0, eveningIndex = 0, restaurantIndex = 0, allPoiIndex = 0;

    // Helper: Get POI based on time context with fallback
    const getNextPoiForTime = (timeContext) => {
      const lists = {
        morning: { arr: shuffledMorning, idx: () => morningIndex, inc: () => morningIndex++ },
        afternoon: { arr: shuffledAfternoon, idx: () => afternoonIndex, inc: () => afternoonIndex++ },
        evening: { arr: shuffledEvening, idx: () => eveningIndex, inc: () => eveningIndex++ }
      };

      // Try time-appropriate POIs first
      const list = lists[timeContext];
      if (list) {
        while (list.idx() < list.arr.length) {
          const poi = list.arr[list.idx()];
          list.inc();
          if (!usedPoiIds.has(poi.id)) {
            usedPoiIds.add(poi.id);
            return poi;
          }
        }
      }

      // Fallback to any unused POI
      while (allPoiIndex < shuffledAllPois.length) {
        const poi = shuffledAllPois[allPoiIndex];
        allPoiIndex++;
        if (!usedPoiIds.has(poi.id)) {
          usedPoiIds.add(poi.id);
          return poi;
        }
      }
      return null;
    };

    // Helper: Find next restaurant that hasn't been used
    const getNextUniqueRestaurant = () => {
      while (restaurantIndex < shuffledRestaurants.length) {
        const restaurant = shuffledRestaurants[restaurantIndex];
        restaurantIndex++;
        if (!usedPoiIds.has(restaurant.id)) {
          usedPoiIds.add(restaurant.id);
          return restaurant;
        }
      }
      return null;
    };

    logger.info('Itinerary building:', {
      totalPois: searchResults.results.length,
      morningPois: morningPois.length,
      afternoonPois: afternoonPois.length,
      eveningPois: eveningPois.length,
      restaurants: shuffledRestaurants.length,
      slots: slots.length
    });

    for (const slot of slots) {
      let item = null;

      if (slot.type === 'lunch' || slot.type === 'dinner') {
        // Add meal suggestion (unique restaurant type)
        const restaurant = includeMeals ? getNextUniqueRestaurant() : null;
        if (restaurant) {
          item = {
            time: slot.time,
            type: slot.type,
            poi: restaurant,
            label: slot.type === 'lunch' ? 'Lunch' : 'Diner'
          };
        }
      } else {
        // Try to add event first (if time matches), otherwise POI
        if (events[eventIndex] && events[eventIndex].start_time) {
          const eventHour = parseInt(events[eventIndex].start_time.split(':')[0]);
          const slotHour = parseInt(slot.time.split(':')[0]);
          if (Math.abs(eventHour - slotHour) <= 2) {
            item = {
              time: events[eventIndex].start_time || slot.time,
              type: 'event',
              event: events[eventIndex],
              poi: events[eventIndex]
            };
            eventIndex++;
          }
        }

        if (!item) {
          // Get next POI using time-of-day awareness (morning=cafes, evening=restaurants, etc.)
          const poi = getNextPoiForTime(slot.timeContext || 'afternoon');
          if (poi) {
            item = {
              time: slot.time,
              type: 'activity',
              poi
            };
          }
        }
      }

      if (item) {
        itinerary.push(item);
      }
    }

    logger.info('Itinerary built:', { itemCount: itinerary.length });

    // Step 5: Generate AI description with language-specific prompts
    // IMPORTANT: Include ACTUAL POI names from the itinerary for coherent intro
    const systemPrompt = embeddingService.buildSystemPrompt(language);

    // Extract actual POI names from the built itinerary (max 3 for intro)
    const selectedPoiNames = itinerary
      .filter(item => item.poi && item.poi.name)
      .map(item => item.poi.name)
      .slice(0, 3);

    const poiListText = selectedPoiNames.length > 0
      ? selectedPoiNames.join(', ')
      : '';

    // Build intro prompt that MUST reference the actual selected POIs
    // This ensures the intro matches the program output
    const durationLabels = {
      nl: { 'full-day': 'vol dagprogramma', 'morning': 'ochtendprogramma', 'afternoon': 'middagprogramma', 'evening': 'avondprogramma' },
      en: { 'full-day': 'full-day program', 'morning': 'morning program', 'afternoon': 'afternoon program', 'evening': 'evening program' },
      de: { 'full-day': 'Ganztagsprogramm', 'morning': 'Vormittagsprogramm', 'afternoon': 'Nachmittagsprogramm', 'evening': 'Abendprogramm' },
      es: { 'full-day': 'programa de día completo', 'morning': 'programa de mañana', 'afternoon': 'programa de tarde', 'evening': 'programa de noche' },
      sv: { 'full-day': 'heldagsprogram', 'morning': 'förmiddagsprogram', 'afternoon': 'eftermiddagsprogram', 'evening': 'kvällsprogram' },
      pl: { 'full-day': 'program całodniowy', 'morning': 'program poranny', 'afternoon': 'program popołudniowy', 'evening': 'program wieczorny' }
    };

    const durationLabel = (durationLabels[language] || durationLabels.nl)[duration] || duration;

    // Multi-language itinerary intro prompts - MUST reference actual POI names
    // CRITICAL: Require proper spacing around POI names for clickable links
    const itineraryPrompts = {
      nl: `Schrijf een enthousiaste, bondige introductie (max 50 woorden, in het Nederlands) voor dit ${durationLabel} in Calpe.

GESELECTEERDE LOCATIES: ${poiListText || 'diverse toplocaties'}.

REGELS:
- Noem 1-2 van de geselecteerde locaties bij naam
- Wees kort en bondig, geen lange zinnen
- Eindig met een uitnodigende zin
- GEEN sterretjes, emoji's of markdown
- ALLEEN de locaties noemen die hierboven staan vermeld
- BELANGRIJK: Zorg voor een SPATIE voor EN na elke locatienaam (bijv. "Bezoek Playa Calpe voor" niet "BezoekPlaya Calpevoor")`,
      en: `Write an enthusiastic, concise introduction (max 50 words, in English) for this ${durationLabel} in Calpe.

SELECTED LOCATIONS: ${poiListText || 'various top attractions'}.

RULES:
- Mention 1-2 of the selected locations by name
- Be brief and concise, no long sentences
- End with an inviting sentence
- NO asterisks, emojis or markdown
- ONLY mention locations listed above
- IMPORTANT: Ensure a SPACE before AND after each location name (e.g., "Visit Playa Calpe for" not "VisitPlaya Calpefor")`,
      de: `Schreibe eine begeisterte, kurze Einleitung (max 50 Wörter, auf Deutsch) für dieses ${durationLabel} in Calpe.

AUSGEWÄHLTE ORTE: ${poiListText || 'verschiedene Top-Attraktionen'}.

REGELN:
- Nenne 1-2 der ausgewählten Orte beim Namen
- Sei kurz und prägnant, keine langen Sätze
- Ende mit einem einladenden Satz
- KEINE Sternchen, Emojis oder Markdown
- NUR die oben genannten Orte erwähnen
- WICHTIG: Stelle sicher, dass ein LEERZEICHEN vor UND nach jedem Ortsnamen steht`,
      es: `Escribe una introducción entusiasta y concisa (máx 50 palabras, en español) para este ${durationLabel} en Calpe.

LUGARES SELECCIONADOS: ${poiListText || 'varias atracciones principales'}.

REGLAS:
- Menciona 1-2 de los lugares seleccionados por nombre
- Sé breve y conciso, sin oraciones largas
- Termina con una frase acogedora
- SIN asteriscos, emojis ni markdown
- SOLO mencionar los lugares listados arriba
- IMPORTANTE: Asegúrate de un ESPACIO antes Y después de cada nombre de lugar`,
      sv: `Skriv en entusiastisk, koncis introduktion (max 50 ord, på svenska) för detta ${durationLabel} i Calpe.

VALDA PLATSER: ${poiListText || 'olika toppatraktioner'}.

REGLER:
- Nämn 1-2 av de valda platserna vid namn
- Var kort och koncis, inga långa meningar
- Avsluta med en inbjudande mening
- INGA asterisker, emojis eller markdown
- ENDAST nämna platser listade ovan
- VIKTIGT: Se till att det finns ett MELLANSLAG före OCH efter varje platsnamn`,
      pl: `Napisz entuzjastyczne, zwięzłe wprowadzenie (maks 50 słów, po polsku) do tego ${durationLabel} w Calpe.

WYBRANE LOKALIZACJE: ${poiListText || 'różne topowe atrakcje'}.

ZASADY:
- Wymień 1-2 wybranych lokalizacji po nazwie
- Bądź krótki i zwięzły, bez długich zdań
- Zakończ zachęcającym zdaniem
- BEZ gwiazdek, emoji ani markdown
- TYLKO wymieniać lokalizacje podane powyżej
- WAŻNE: Upewnij się, że jest SPACJA przed I po każdej nazwie miejsca`
    };

    let description = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: itineraryPrompts[language] || itineraryPrompts.nl }
    ]);

    // Post-process: remove any asterisks, markdown formatting, and stray symbols
    description = description
      .replace(/\*+/g, '')           // Remove asterisks
      .replace(/#+\s*/g, '')         // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to plain text
      .replace(/`+/g, '')            // Remove code backticks
      .replace(/_{2,}/g, '')         // Remove double underscores
      .replace(/~{2,}/g, '')         // Remove strikethrough
      .replace(/\s{2,}/g, ' ')       // Normalize whitespace
      .trim();

    // CRITICAL: Fix spacing around common Dutch/English/German/Spanish words
    // AI often generates "BezoekCala" or "Manzaneravoor" without spaces

    // Words that need a space AFTER them (verbs, prepositions at start)
    const wordsNeedSpaceAfter = [
      // Dutch verbs
      'Bezoek', 'Ontdek', 'Geniet', 'Probeer', 'Bekijk', 'Wandel', 'Verken', 'Eet', 'Drink', 'Ga', 'Zie', 'Ervaar', 'Bewonder', 'Proef',
      // Dutch prepositions (when starting a phrase)
      'Bij', 'Naar', 'Voor', 'Met', 'In', 'Van', 'Door', 'Over', 'Om', 'Tot',
      // English
      'Visit', 'Discover', 'Enjoy', 'Try', 'See', 'Explore', 'Experience', 'Taste', 'Walk', 'Go', 'At', 'To', 'For', 'With',
      // German
      'Besuche', 'Entdecke', 'Genieße', 'Probiere', 'Erlebe', 'Bewundere', 'Koste',
      // Spanish
      'Visita', 'Descubre', 'Disfruta', 'Prueba', 'Explora', 'Experimenta', 'Pasea'
    ];

    // Words that need a space BEFORE them (prepositions, conjunctions)
    const wordsNeedSpaceBefore = [
      // Dutch
      'voor', 'bij', 'naar', 'met', 'op', 'in', 'van', 'door', 'over', 'om', 'te', 'tot', 'aan', 'uit', 'tussen', 'zonder', 'tegen',
      'en', 'of', 'maar', 'want', 'dus', 'als', 'dan', 'waar', 'die', 'dat', 'het',
      // English
      'for', 'at', 'to', 'with', 'on', 'in', 'of', 'by', 'from', 'and', 'or', 'but', 'the', 'a', 'an',
      // German
      'für', 'bei', 'nach', 'mit', 'auf', 'von', 'durch', 'über', 'um', 'und', 'oder', 'aber',
      // Spanish
      'para', 'por', 'con', 'en', 'de', 'desde', 'hacia', 'y', 'o', 'pero', 'el', 'la', 'los', 'las', 'un', 'una'
    ];

    // Add space after words that need it (case-sensitive for capitalized words)
    for (const word of wordsNeedSpaceAfter) {
      // Match word followed by uppercase letter (start of POI name) without space
      description = description.replace(new RegExp(`(${word})([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ])`, 'g'), '$1 $2');
    }

    // Add space before words that need it (case-insensitive for lowercase prepositions)
    for (const word of wordsNeedSpaceBefore) {
      // Match lowercase letter followed by the word without space
      description = description.replace(new RegExp(`([a-záéíóúàèìòùäëïöüâêîôûñç])(${word})\\b`, 'gi'), '$1 $2');
    }

    // Final cleanup: normalize multiple spaces again
    description = description.replace(/\s{2,}/g, ' ').trim();

    res.json({
      success: true,
      data: {
        date: targetDate,
        duration,
        description,
        itinerary,
        totalStops: itinerary.length,
        eventsIncluded: events.length,
        hasEvents: events.length > 0
      }
    });

  } catch (error) {
    logger.error('HoliBot itinerary error:', error);
    res.status(500).json({ success: false, error: 'Could not generate itinerary' });
  }
});

/**
 * GET /api/v1/holibot/location/:id
 * Quick Action 2: Detailed location info with Q&A context
 */
router.get('/location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'nl' } = req.query;

    const model = await getPOIModel();
    if (!model) {
      return res.status(500).json({ success: false, error: 'POI service not available' });
    }

    const poi = await model.findByPk(id);
    if (!poi) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const contextResults = await ragService.search(poi.name, { limit: 3 });
    const systemPrompt = embeddingService.buildSystemPrompt(language);
    const enhancedDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Geef een aantrekkelijke beschrijving (max 100 woorden) van ${poi.name} in Calpe. Categorie: ${poi.category}. Originele beschrijving: ${poi.description || 'Geen beschrijving'}` }
    ]);

    res.json({
      success: true,
      data: {
        poi: {
          id: poi.id, name: poi.name, category: poi.category, subcategory: poi.subcategory,
          description: poi.description, enhancedDescription, address: poi.address,
          latitude: poi.latitude, longitude: poi.longitude, rating: poi.rating,
          reviewCount: poi.review_count, priceLevel: poi.price_level, phone: poi.phone,
          website: poi.website, openingHours: poi.opening_hours, thumbnailUrl: poi.thumbnail_url
        },
        relatedContext: contextResults.results.slice(0, 3)
      }
    });

  } catch (error) {
    logger.error('HoliBot location error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch location details' });
  }
});

/**
 * POST /api/v1/holibot/directions
 * Quick Action 3: Get directions to POI
 */
router.post('/directions', async (req, res) => {
  try {
    const { from, toPoiId, mode = 'walking', language = 'nl' } = req.body;

    const model = await getPOIModel();
    if (!model) {
      return res.status(500).json({ success: false, error: 'POI service not available' });
    }

    const poi = await model.findByPk(toPoiId);
    if (!poi) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    const destination = { name: poi.name, address: poi.address, latitude: poi.latitude, longitude: poi.longitude };

    const tips = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language) },
      { role: 'user', content: `Geef 2-3 korte tips voor ${mode === 'walking' ? 'wandelen' : 'rijden'} naar ${poi.name} in Calpe. Adres: ${poi.address || 'niet beschikbaar'}` }
    ]);

    res.json({
      success: true,
      data: {
        destination,
        mode,
        tips,
        mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}&travelmode=${mode}`
      }
    });

  } catch (error) {
    logger.error('HoliBot directions error:', error);
    res.status(500).json({ success: false, error: 'Could not generate directions' });
  }
});

/**
 * GET /api/v1/holibot/daily-tip
 * Quick Action 4: Enhanced personalized daily tip
 *
 * Quality Requirements:
 * - POI rating minimum 4.4 stars (or no rating for new POIs)
 * - Include Events from agenda (upcoming 7 days)
 * - Filter POIs and Events within 5km radius of Calpe center
 * - Rotate daily between user interests
 * - Accept excludeIds to avoid repeating tips within session
 */
router.get('/daily-tip', async (req, res) => {
  try {
    const { language = 'nl', interests, excludeIds = '', userId } = req.query;

    // Parse excluded IDs (tips already shown this session)
    const excludedIdList = excludeIds ? excludeIds.split(',').filter(Boolean) : [];

    // ONLY tourist-friendly categories for daily tips
    const allowedCategories = [
      'Beaches & Nature', 'Food & Drinks', 'Shopping',
      'Culture & History', 'Recreation', 'Active', 'Nightlife'
    ];

    // Categories to EXCLUDE from daily tips (not vacation-appropriate)
    const excludedCategories = [
      'Health & Wellbeing', 'Health & Wellness', 'Health',
      'Accommodations', 'Accommodation', 'Accommodation (do not communicate)',
      'Practical', 'Services'
    ];

    // Calpe center coordinates (for 5km radius filter)
    const CALPE_CENTER_LAT = 38.6447;
    const CALPE_CENTER_LNG = 0.0445;
    const MAX_DISTANCE_KM = 5;

    // User interests or rotate through allowed categories
    const userInterests = interests ? interests.split(',').filter(c => allowedCategories.includes(c)) : allowedCategories;

    // Rotate interest based on day of year
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const todayInterestIndex = dayOfYear % userInterests.length;
    const selectedInterest = userInterests[todayInterestIndex];

    logger.info('Daily tip request', { language, selectedInterest, excludeCount: excludedIdList.length });

    // Step 1: Get POIs from database with distance filter (5km radius)
    // IMPORTANT: Include language-specific translated content fields
    let qualityPois = [];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      // Query POIs within 5km radius using Haversine formula
      // Include ALL translated description fields for proper language support
      const poiResults = await mysqlSequelize.query(`
        SELECT id, name, description, category, subcategory, poi_type,
               address, latitude, longitude, rating, review_count,
               thumbnail_url, price_level, opening_hours,
               enriched_tile_description,
               enriched_tile_description_nl,
               enriched_tile_description_de,
               enriched_tile_description_es,
               enriched_tile_description_sv,
               enriched_tile_description_pl,
               enriched_detail_description,
               enriched_detail_description_nl,
               enriched_detail_description_de,
               enriched_detail_description_es,
               enriched_detail_description_sv,
               enriched_detail_description_pl,
               (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance_km
        FROM POI
        WHERE is_active = 1
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND (rating IS NULL OR rating >= 4.4)
          AND category IN (?, ?, ?, ?, ?, ?, ?)
        HAVING distance_km <= ?
        ORDER BY rating DESC, review_count DESC
        LIMIT 50
      `, {
        replacements: [
          CALPE_CENTER_LAT, CALPE_CENTER_LNG, CALPE_CENTER_LAT,
          ...allowedCategories,
          MAX_DISTANCE_KM
        ],
        type: QueryTypes.SELECT
      });

      // Note: getTranslatedDescription() is now a shared helper at the top of this file

      // Filter by exclusions (IDs already shown), permanently closed POIs, and add images array for POICard
      // CRITICAL: Use language-specific description and exclude permanently closed POIs
      qualityPois = poiResults.filter(poi => {
        const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
        // CRITICAL: Also filter out permanently closed POIs
        const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours);
        if (isPermanentlyClosed(poi.opening_hours)) {
          logger.info('Excluding permanently closed POI from daily tip:', { id: poi.id, name: poi.name });
        }
        return notExcluded && notPermanentlyClosed;
      }).map(poi => ({
        ...poi,
        // Use translated description for the current language (shared helper)
        description: getTranslatedDescription(poi, language),
        // POICard expects 'images' array, backend returns 'thumbnail_url'
        images: poi.thumbnail_url ? [poi.thumbnail_url] : []
      }));

      logger.info('Daily tip POIs from DB:', { count: qualityPois.length, maxDistance: MAX_DISTANCE_KM });
    } catch (poiError) {
      logger.warn('Could not fetch POIs from database, falling back to search:', poiError.message);
      // Fallback to RAG search if database query fails
      const poiSearchResults = await ragService.search(selectedInterest + ' Calpe', { limit: 20 });
      qualityPois = poiSearchResults.results.filter(poi => {
        const rating = parseFloat(poi.rating);
        const hasGoodRating = !rating || isNaN(rating) || rating >= 4.4;
        // Strict category filtering - must be in allowed categories, not in excluded
        const poiCategory = (poi.category || '').trim();
        const isAllowedCategory = allowedCategories.includes(poiCategory);
        const isExcludedCategory = excludedCategories.some(exc =>
          poiCategory.toLowerCase().includes(exc.toLowerCase()) ||
          exc.toLowerCase().includes(poiCategory.toLowerCase())
        );
        const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
        // CRITICAL: Also filter out permanently closed POIs
        const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours || poi.openingHours);
        return hasGoodRating && isAllowedCategory && !isExcludedCategory && notExcluded && notPermanentlyClosed;
      }).map(poi => ({
        ...poi,
        // POICard expects 'images' array
        images: poi.thumbnail_url ? [poi.thumbnail_url] : (poi.images || [])
      }));
    }

    // Step 2: Get upcoming events (next 7 days) within 5km radius
    let events = [];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      const eventResults = await mysqlSequelize.query(
        "SELECT a.id, a.title, a.short_description as description, " +
        "a.image as thumbnailUrl, a.location_name as address, " +
        "MIN(d.event_date) as event_date " +
        "FROM agenda a " +
        "INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash " +
        "WHERE d.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) " +
        "AND (a.calpe_distance IS NULL OR a.calpe_distance <= ?) " +
        "GROUP BY a.id ORDER BY d.event_date ASC LIMIT 10",
        { replacements: [MAX_DISTANCE_KM], type: QueryTypes.SELECT }
      );

      events = eventResults.filter(event =>
        !excludedIdList.includes('event-' + event.id) && !excludedIdList.includes(String(event.id))
      ).map(event => ({
        ...event,
        id: event.id,
        eventId: event.id,
        name: event.title,
        type: 'event',
        isEvent: true,
        category: selectedInterest,
        rating: null
      }));
    } catch (eventError) {
      logger.warn('Could not fetch events for daily tip:', eventError.message);
    }

    // Combine quality POIs and Events
    const poisWithType = qualityPois
      .filter(poi => poi.id)
      .map(poi => ({ ...poi, type: 'poi' }));

    const validEvents = events.filter(event => event.id);

    logger.info('Daily tip candidates:', {
      qualityPois: poisWithType.length,
      events: validEvents.length,
      selectedInterest,
      maxDistanceKm: MAX_DISTANCE_KM
    });

    // Selection strategy: Always prefer POIs (60%), Events (40%)
    // This ensures POIs are shown more consistently
    let selectedItem = null;
    const random = Math.random();

    if (random < 0.6 && poisWithType.length > 0) {
      // 60% chance: Select random POI
      const randomIndex = Math.floor(Math.random() * poisWithType.length);
      selectedItem = poisWithType[randomIndex];
    } else if (validEvents.length > 0) {
      // 40% chance or fallback: Select random Event
      const randomIndex = Math.floor(Math.random() * validEvents.length);
      selectedItem = validEvents[randomIndex];
    } else if (poisWithType.length > 0) {
      // Final fallback to POI if no events
      const randomIndex = Math.floor(Math.random() * poisWithType.length);
      selectedItem = poisWithType[randomIndex];
    }

    // Generate tip labels
    const tipLabels = { nl: 'Tip van de Dag', en: 'Tip of the Day', de: 'Tipp des Tages', es: 'Consejo del Dia', sv: 'Dagens Tips', pl: 'Porada Dnia' };

    if (!selectedItem) {
      // When all tips are exhausted, return a friendly message instead of 404
      const noTipsMessages = {
        nl: 'Je hebt alle tips van vandaag gezien! Probeer het morgen opnieuw voor nieuwe suggesties.',
        en: 'You have seen all tips for today! Try again tomorrow for new suggestions.',
        de: 'Du hast alle Tipps für heute gesehen! Versuche es morgen wieder für neue Vorschläge.',
        es: '¡Has visto todos los consejos de hoy! Inténtalo mañana para nuevas sugerencias.',
        sv: 'Du har sett alla tips för idag! Försök igen imorgon för nya förslag.',
        pl: 'Widziałeś wszystkie porady na dziś! Spróbuj jutro, aby zobaczyć nowe sugestie.'
      };
      return res.json({
        success: true,
        data: {
          title: tipLabels[language] || tipLabels.nl,
          itemType: 'message',
          poi: null,
          event: null,
          item: null,
          tipDescription: noTipsMessages[language] || noTipsMessages.nl,
          category: selectedInterest,
          date: now.toISOString().split('T')[0],
          tipId: null,
          exhausted: true
        }
      });
    }

    const itemName = selectedItem.name || selectedItem.title || 'Unknown';
    const itemDesc = selectedItem.description || 'Een geweldige plek in Calpe';
    const ratingText = selectedItem.rating ? 'Beoordeling: ' + selectedItem.rating + ' sterren. ' : '';

    // Multi-language tip prompts - NO emojis or asterisks, clean text for TTS
    const tipPrompts = {
      nl: {
        event: `Schrijf een enthousiaste aanbeveling (max 80 woorden, in het Nederlands) voor het evenement "${itemName}". Het vindt plaats op ${selectedItem.event_date}. Beschrijving: ${itemDesc}. BELANGRIJK: Gebruik GEEN sterretjes, asterisken of emoji's. Schrijf vloeiende, correcte zinnen geschikt voor voorlezen.`,
        poi: `Schrijf een enthousiaste aanbeveling (max 80 woorden, in het Nederlands) voor ${itemName}. ${ratingText}Categorie: ${selectedItem.category}. Beschrijving: ${itemDesc}. BELANGRIJK: Gebruik GEEN sterretjes, asterisken of emoji's. Schrijf vloeiende, correcte zinnen geschikt voor voorlezen.`
      },
      en: {
        event: `Write an enthusiastic recommendation (max 80 words, in English) for the event "${itemName}". It takes place on ${selectedItem.event_date}. Description: ${itemDesc}. IMPORTANT: Do NOT use asterisks or emojis. Write fluent, correct sentences suitable for text-to-speech.`,
        poi: `Write an enthusiastic recommendation (max 80 words, in English) for ${itemName}. ${ratingText}Category: ${selectedItem.category}. Description: ${itemDesc}. IMPORTANT: Do NOT use asterisks or emojis. Write fluent, correct sentences suitable for text-to-speech.`
      },
      de: {
        event: `Schreibe eine begeisterte Empfehlung (max 80 Wörter, auf Deutsch) für das Event "${itemName}". Es findet am ${selectedItem.event_date} statt. Beschreibung: ${itemDesc}. WICHTIG: Verwende KEINE Sternchen oder Emojis. Schreibe flüssige, korrekte Sätze für Sprachausgabe.`,
        poi: `Schreibe eine begeisterte Empfehlung (max 80 Wörter, auf Deutsch) für ${itemName}. ${ratingText}Kategorie: ${selectedItem.category}. Beschreibung: ${itemDesc}. WICHTIG: Verwende KEINE Sternchen oder Emojis. Schreibe flüssige, korrekte Sätze für Sprachausgabe.`
      },
      es: {
        event: `Escribe una recomendación entusiasta (máx 80 palabras, en español) para el evento "${itemName}". Se celebra el ${selectedItem.event_date}. Descripción: ${itemDesc}. IMPORTANTE: NO uses asteriscos ni emojis. Escribe oraciones fluidas y correctas adecuadas para lectura por voz.`,
        poi: `Escribe una recomendación entusiasta (máx 80 palabras, en español) para ${itemName}. ${ratingText}Categoría: ${selectedItem.category}. Descripción: ${itemDesc}. IMPORTANTE: NO uses asteriscos ni emojis. Escribe oraciones fluidas y correctas adecuadas para lectura por voz.`
      },
      sv: {
        event: `Skriv en entusiastisk rekommendation (max 80 ord, på svenska) för evenemanget "${itemName}". Det äger rum den ${selectedItem.event_date}. Beskrivning: ${itemDesc}. VIKTIGT: Använd INTE asterisker eller emojis. Skriv flytande, korrekta meningar lämpliga för talsyntes.`,
        poi: `Skriv en entusiastisk rekommendation (max 80 ord, på svenska) för ${itemName}. ${ratingText}Kategori: ${selectedItem.category}. Beskrivning: ${itemDesc}. VIKTIGT: Använd INTE asterisker eller emojis. Skriv flytande, korrekta meningar lämpliga för talsyntes.`
      },
      pl: {
        event: `Napisz entuzjastyczną rekomendację (maks 80 słów, po polsku) dla wydarzenia "${itemName}". Odbywa się ${selectedItem.event_date}. Opis: ${itemDesc}. WAŻNE: NIE używaj gwiazdek ani emoji. Pisz płynne, poprawne zdania odpowiednie do odczytu głosowego.`,
        poi: `Napisz entuzjastyczną rekomendację (maks 80 słów, po polsku) dla ${itemName}. ${ratingText}Kategoria: ${selectedItem.category}. Opis: ${itemDesc}. WAŻNE: NIE używaj gwiazdek ani emoji. Pisz płynne, poprawne zdania odpowiednie do odczytu głosowego.`
      }
    };
    const langPrompts = tipPrompts[language] || tipPrompts.nl;
    const tipPrompt = selectedItem.type === 'event' ? langPrompts.event : langPrompts.poi;

    let tipDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language) },
      { role: 'user', content: tipPrompt }
    ]);

    // Post-process: remove any asterisks, markdown formatting, and stray symbols
    tipDescription = tipDescription
      .replace(/\*+/g, '')           // Remove asterisks
      .replace(/#+\s*/g, '')         // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to plain text
      .replace(/`+/g, '')            // Remove code backticks
      .replace(/_{2,}/g, '')         // Remove double underscores
      .replace(/~{2,}/g, '')         // Remove strikethrough
      .replace(/\s{2,}/g, ' ')       // Normalize whitespace
      .trim();

    res.json({
      success: true,
      data: {
        title: tipLabels[language] || tipLabels.nl,
        itemType: selectedItem.type,
        poi: selectedItem.type === 'poi' ? selectedItem : null,
        event: selectedItem.type === 'event' ? selectedItem : null,
        item: selectedItem,
        tipDescription,
        category: selectedInterest,
        date: now.toISOString().split('T')[0],
        tipId: selectedItem.id
      }
    });

  } catch (error) {
    logger.error('HoliBot daily-tip error:', error);
    res.status(500).json({ success: false, error: 'Could not generate daily tip' });
  }
});

/**
 * GET /api/v1/holibot/categories
 * Get all categories with POI counts
 */
router.get('/categories', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.json({
        success: true,
        data: [
          { category: 'Beaches & Nature', count: 15 },
          { category: 'Food & Drinks', count: 42 },
          { category: 'Culture & History', count: 8 },
          { category: 'Active', count: 12 },
          { category: 'Shopping', count: 18 },
          { category: 'Recreation', count: 10 }
        ],
        count: 6
      });
    }

    const { Sequelize } = await import('sequelize');
    const results = await model.findAll({
      attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      where: { category: { [Sequelize.Op.ne]: null }, is_active: true },
      group: ['category'],
      order: [[Sequelize.literal('count'), 'DESC']]
    });

    const categories = results.map(r => ({ category: r.get('category'), count: parseInt(r.get('count')) }));
    res.json({ success: true, data: categories, count: categories.length });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch categories' });
  }
});

/**
 * GET /api/v1/holibot/categories/hierarchy
 * Returns 3-level category hierarchy from POI table
 * Level 1: category, Level 2: subcategory, Level 3: poi_type
 */
router.get('/categories/hierarchy', async (req, res) => {
  try {
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    const results = await mysqlSequelize.query(`
      SELECT category, subcategory, poi_type, COUNT(*) as count
      FROM POI WHERE is_active = 1
      GROUP BY category, subcategory, poi_type
      ORDER BY category, subcategory, poi_type
    `, { type: QueryTypes.SELECT });

    const hierarchy = {};
    for (const row of results) {
      const cat = row.category || 'Overig';
      const subcat = row.subcategory || null;
      const poiType = row.poi_type || null;
      const count = parseInt(row.count);

      if (!hierarchy[cat]) {
        hierarchy[cat] = { name: cat, count: 0, subcategories: {} };
      }
      hierarchy[cat].count += count;

      if (subcat) {
        if (!hierarchy[cat].subcategories[subcat]) {
          hierarchy[cat].subcategories[subcat] = { name: subcat, count: 0, types: {} };
        }
        hierarchy[cat].subcategories[subcat].count += count;

        if (poiType) {
          if (!hierarchy[cat].subcategories[subcat].types[poiType]) {
            hierarchy[cat].subcategories[subcat].types[poiType] = { name: poiType, count: 0 };
          }
          hierarchy[cat].subcategories[subcat].types[poiType].count += count;
        }
      }
    }

    const hierarchyArray = Object.values(hierarchy).map(cat => ({
      name: cat.name,
      count: cat.count,
      subcategories: Object.values(cat.subcategories).map(sub => ({
        name: sub.name,
        count: sub.count,
        types: Object.values(sub.types)
      }))
    })).sort((a, b) => b.count - a.count);

    res.json({ success: true, data: hierarchyArray, totalCategories: hierarchyArray.length });

  } catch (error) {
    logger.error('Categories hierarchy error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch category hierarchy' });
  }
});

/**
 * GET /api/v1/holibot/categories/:category/pois
 * Get POIs for a specific category with optional filters
 * Supports pagination via limit and offset
 * Features:
 * - Multi-language support via enriched_tile_description_* fields
 * - Excludes permanently closed POIs (7 days/week "Closed")
 */
router.get('/categories/:category/pois', async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory, type, limit = 20, offset = 0, language = 'nl' } = req.query;
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    let whereClause = 'WHERE is_active = 1 AND category = ?';
    const params = [decodeURIComponent(category)];

    if (subcategory) {
      whereClause += ' AND subcategory = ?';
      params.push(decodeURIComponent(subcategory));
    }
    if (type) {
      whereClause += ' AND poi_type = ?';
      params.push(decodeURIComponent(type));
    }

    // Include translated description fields for multi-language support
    const poiResults = await mysqlSequelize.query(`
      SELECT id, name, description, category, subcategory, poi_type,
             address, latitude, longitude, rating, review_count,
             thumbnail_url, price_level, opening_hours,
             enriched_tile_description,
             enriched_tile_description_nl,
             enriched_tile_description_de,
             enriched_tile_description_es,
             enriched_tile_description_sv,
             enriched_tile_description_pl
      FROM POI ${whereClause}
      ORDER BY rating DESC, review_count DESC
      LIMIT ? OFFSET ?
    `, { replacements: [...params, parseInt(limit), parseInt(offset)], type: QueryTypes.SELECT });

    // Filter out permanently closed POIs and apply translations
    const pois = poiResults.filter(poi => {
      const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours);
      if (isPermanentlyClosed(poi.opening_hours)) {
        logger.info('Excluding permanently closed POI from category browser:', { id: poi.id, name: poi.name });
      }
      return notPermanentlyClosed;
    }).map(poi => ({
      ...poi,
      // Use translated description for the current language (shared helper)
      description: getTranslatedDescription(poi, language),
      // POICard expects 'images' array
      images: poi.thumbnail_url ? [poi.thumbnail_url] : []
    }));

    res.json({ success: true, data: pois, count: pois.length, filter: { category, subcategory, type }, offset: parseInt(offset) });

  } catch (error) {
    logger.error('Category POIs error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch POIs for category' });
  }
});

/**
 * POST /api/v1/holibot/admin/sync
 */
router.post('/admin/sync', async (req, res) => {
  try {
    const { type = 'incremental' } = req.body;
    logger.info(`Admin sync requested: ${type}`);
    let result;
    if (type === 'full') {
      result = await syncService.fullSync();
    } else {
      result = await syncService.incrementalSync();
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Admin sync error:', error);
    res.status(500).json({ success: false, error: error.message || 'Sync failed' });
  }
});

/**
 * GET /api/v1/holibot/admin/stats
 */
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await ragService.getStats();
    const syncStatus = syncService.getStatus();
    res.json({ success: true, data: { ...stats, sync: syncStatus } });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch stats' });
  }
});

/**
 * GET /api/v1/holibot/health
 */
router.get('/health', async (req, res) => {
  try {
    const chromaReady = chromaService.isReady();
    const embeddingReady = embeddingService.isReady();
    const ragReady = ragService.isReady();

    res.json({
      success: true,
      status: chromaReady && embeddingReady ? 'healthy' : 'degraded',
      services: {
        chromaDb: chromaReady ? 'connected' : 'disconnected',
        mistral: embeddingReady ? 'configured' : 'not configured',
        rag: ragReady ? 'ready' : 'not ready'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, status: 'unhealthy', error: error.message });
  }
});

/**
 * POST /api/v1/holibot/tts
 * Google Cloud Text-to-Speech
 * Converts text to speech audio (MP3)
 *
 * Request body:
 * - text: string (required, max 5000 chars)
 * - language: string (optional, default 'nl')
 *
 * Response:
 * - audio: base64 encoded MP3
 * - contentType: 'audio/mp3'
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'nl' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long (max 5000 characters)'
      });
    }

    logger.info('TTS request', { language, textLength: text.length });

    const result = await ttsService.synthesize(text, language);

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: result.error || 'TTS service unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        audio: result.audio,
        contentType: result.contentType,
        cached: result.cached || false
      }
    });

  } catch (error) {
    logger.error('TTS error:', error);
    res.status(500).json({
      success: false,
      error: 'Text-to-speech conversion failed'
    });
  }
});

/**
 * GET /api/v1/holibot/tts/status
 * Check TTS service availability
 */
router.get('/tts/status', async (req, res) => {
  try {
    const status = ttsService.checkAvailability();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


export default router;
