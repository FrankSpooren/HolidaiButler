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

    // Remove duplicates by id
    const seenIds = new Set();
    const searchResults = {
      results: allSearchResults.filter(poi => {
        if (!poi.id || seenIds.has(poi.id)) return false;
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
    const systemPrompt = embeddingService.buildSystemPrompt(language);

    // Multi-language itinerary intro prompts - emphasize grammar quality
    const itineraryPrompts = {
      nl: `Schrijf een enthousiaste, grammaticaal correcte introductie (max 60 woorden, in het Nederlands) voor een ${duration === 'full-day' ? 'vol' : duration === 'morning' ? 'ochtend' : duration === 'afternoon' ? 'middag' : 'avond'} dagprogramma in Calpe. ${interests.length ? 'Interesses: ' + interests.join(', ') + '. ' : ''}${events.length ? 'Er zijn ' + events.length + ' evenementen vandaag. ' : ''}Eindig met een uitnodigende zin. BELANGRIJK: Gebruik correcte Nederlandse spelling en grammatica. Gebruik GEEN sterretjes of emoji's.`,
      en: `Write an enthusiastic, grammatically correct introduction (max 60 words, in English) for a ${duration} day program in Calpe. ${interests.length ? 'Interests: ' + interests.join(', ') + '. ' : ''}${events.length ? 'There are ' + events.length + ' events today. ' : ''}End with an inviting sentence. IMPORTANT: Use correct English spelling and grammar. Do NOT use asterisks or emojis.`,
      de: `Schreibe eine begeisterte, grammatikalisch korrekte Einleitung (max 60 Wörter, auf Deutsch) für ein ${duration === 'full-day' ? 'Ganztags' : duration === 'morning' ? 'Vormittags' : duration === 'afternoon' ? 'Nachmittags' : 'Abend'}-Programm in Calpe. ${interests.length ? 'Interessen: ' + interests.join(', ') + '. ' : ''}${events.length ? 'Es gibt ' + events.length + ' Veranstaltungen heute. ' : ''}Ende mit einem einladenden Satz. WICHTIG: Verwende korrekte deutsche Rechtschreibung und Grammatik. Verwende KEINE Sternchen oder Emojis.`,
      es: `Escribe una introducción entusiasta y gramaticalmente correcta (máx 60 palabras, en español) para un programa de ${duration === 'full-day' ? 'día completo' : duration === 'morning' ? 'mañana' : duration === 'afternoon' ? 'tarde' : 'noche'} en Calpe. ${interests.length ? 'Intereses: ' + interests.join(', ') + '. ' : ''}${events.length ? 'Hay ' + events.length + ' eventos hoy. ' : ''}Termina con una frase acogedora. IMPORTANTE: Usa ortografía y gramática española correctas. NO uses asteriscos ni emojis.`,
      sv: `Skriv en entusiastisk, grammatiskt korrekt introduktion (max 60 ord, på svenska) för ett ${duration === 'full-day' ? 'heldags' : duration === 'morning' ? 'förmiddags' : duration === 'afternoon' ? 'eftermiddags' : 'kvälls'}program i Calpe. ${interests.length ? 'Intressen: ' + interests.join(', ') + '. ' : ''}${events.length ? 'Det finns ' + events.length + ' evenemang idag. ' : ''}Avsluta med en inbjudande mening. VIKTIGT: Använd korrekt svensk stavning och grammatik. Använd INTE asterisker eller emojis.`,
      pl: `Napisz entuzjastyczne, gramatycznie poprawne wprowadzenie (maks 60 słów, po polsku) do programu ${duration === 'full-day' ? 'całodniowego' : duration === 'morning' ? 'porannego' : duration === 'afternoon' ? 'popołudniowego' : 'wieczornego'} w Calpe. ${interests.length ? 'Zainteresowania: ' + interests.join(', ') + '. ' : ''}${events.length ? 'Dziś jest ' + events.length + ' wydarzeń. ' : ''}Zakończ zachęcającym zdaniem. WAŻNE: Użyj poprawnej polskiej pisowni i gramatyki. NIE używaj gwiazdek ani emoji.`
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
    let qualityPois = [];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      // Query POIs within 5km radius using Haversine formula
      // Exclude Health, Accommodations, Practical, Services categories
      const poiResults = await mysqlSequelize.query(`
        SELECT id, name, description, category, subcategory, poi_type,
               address, latitude, longitude, rating, review_count,
               thumbnail_url, price_level, opening_hours,
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

      // Filter by exclusions (IDs already shown) and add images array for POICard
      qualityPois = poiResults.filter(poi => {
        const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
        return notExcluded;
      }).map(poi => ({
        ...poi,
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
        return hasGoodRating && isAllowedCategory && !isExcludedCategory && notExcluded;
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
 */
router.get('/categories/:category/pois', async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory, type, limit = 20, offset = 0 } = req.query;
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

    const pois = await mysqlSequelize.query(`
      SELECT id, name, description, category, subcategory, poi_type,
             address, latitude, longitude, rating, review_count,
             thumbnail_url, price_level, opening_hours
      FROM POI ${whereClause}
      ORDER BY rating DESC, review_count DESC
      LIMIT ? OFFSET ?
    `, { replacements: [...params, parseInt(limit), parseInt(offset)], type: QueryTypes.SELECT });

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
