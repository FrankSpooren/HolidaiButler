/**
 * HoliBot Routes v2.1
 * API endpoints for HoliBot AI Assistant Widget
 *
 * Features:
 * - RAG-based semantic search with ChromaDB Cloud
 * - Mistral AI for embeddings and chat
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - 4 Quick Actions: Itinerary, Location Info, Directions, Daily Tip
 * - SSE Streaming for real-time chat responses
 *
 * Endpoints:
 * - POST /holibot/chat - RAG-powered chat
 * - POST /holibot/chat/stream - SSE streaming chat (NEW)
 * - POST /holibot/search - Semantic search
 * - POST /holibot/itinerary - Build day program
 * - GET /holibot/location/:id - Location details with Q&A
 * - POST /holibot/directions - Get directions to POI
 * - GET /holibot/daily-tip - Personalized daily tip
 * - GET /holibot/categories - POI categories
 * - POST /holibot/admin/sync - Sync MySQL to ChromaDB
 * - GET /holibot/admin/stats - Service statistics
 */

import express from 'express';
import { ragService, syncService, chromaService, embeddingService } from '../services/holibot/index.js';
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
 * Quick Action 1: Build personalized day program
 */
router.post('/itinerary', async (req, res) => {
  try {
    const { date, interests = [], duration = 'full-day', travelCompanion, language = 'nl' } = req.body;

    logger.info('HoliBot itinerary request', { date, interests, duration });

    const queries = interests.length > 0 ? interests.map(i => `${i} in Calpe`).join(' ') : 'best things to do in Calpe';
    const searchResults = await ragService.search(queries, { limit: 15 });

    const categories = {};
    for (const poi of searchResults.results) {
      const cat = poi.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(poi);
    }

    const timeSlots = {
      'morning': ['09:00', '10:30', '12:00'],
      'afternoon': ['13:00', '15:00', '17:00'],
      'evening': ['18:00', '20:00', '22:00'],
      'full-day': ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']
    };

    const slots = timeSlots[duration] || timeSlots['full-day'];
    const itinerary = [];
    let poiIndex = 0;

    for (const slot of slots) {
      if (poiIndex < searchResults.results.length) {
        itinerary.push({ time: slot, poi: searchResults.results[poiIndex] });
        poiIndex++;
      }
    }

    const systemPrompt = embeddingService.buildSystemPrompt(language);
    const description = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Maak een korte introductie (max 50 woorden) voor een ${duration} dagprogramma in Calpe gericht op: ${interests.join(', ') || 'algemene verkenning'}` }
    ]);

    res.json({
      success: true,
      data: {
        date: date || new Date().toISOString().split('T')[0],
        duration,
        description,
        itinerary,
        totalStops: itinerary.length
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
 * - Rotate daily between user interests
 * - Accept excludeIds to avoid repeating tips within session
 */
router.get('/daily-tip', async (req, res) => {
  try {
    const { language = 'nl', interests, excludeIds = '', userId } = req.query;

    // Parse excluded IDs (tips already shown this session)
    const excludedIdList = excludeIds ? excludeIds.split(',').filter(Boolean) : [];

    // User interests or default categories
    const defaultCategories = ['Beaches & Nature', 'Culture & History', 'Active', 'Food & Drinks'];
    const userInterests = interests ? interests.split(',') : defaultCategories;

    // Rotate interest based on day of year
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const todayInterestIndex = dayOfYear % userInterests.length;
    const selectedInterest = userInterests[todayInterestIndex];

    logger.info('Daily tip request', { language, selectedInterest, excludeCount: excludedIdList.length });

    // Step 1: Search POIs with quality filter (rating >= 4.4)
    const poiSearchResults = await ragService.search(selectedInterest + ' Calpe', { limit: 15 });

    // Filter: rating >= 4.4 (or no rating) and not excluded
    const qualityPois = poiSearchResults.results.filter(poi => {
      const rating = parseFloat(poi.rating);
      const hasGoodRating = !rating || isNaN(rating) || rating >= 4.4;
      const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
      return hasGoodRating && notExcluded;
    });

    // Step 2: Get upcoming events (next 7 days)
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
        "AND (a.calpe_distance IS NULL OR a.calpe_distance <= 25) " +
        "GROUP BY a.id ORDER BY d.event_date ASC LIMIT 10",
        { type: QueryTypes.SELECT }
      );

      events = eventResults.filter(event =>
        !excludedIdList.includes('event-' + event.id)
      ).map(event => ({
        ...event,
        id: 'event-' + event.id,
        name: event.title,
        type: 'event',
        category: selectedInterest,
        rating: null
      }));
    } catch (eventError) {
      logger.warn('Could not fetch events for daily tip:', eventError.message);
    }

    // Combine quality POIs and Events
    const allCandidates = [
      ...qualityPois.map(poi => ({ ...poi, type: 'poi' })),
      ...events
    ];

    if (allCandidates.length === 0) {
      return res.status(404).json({ success: false, error: 'No tips available' });
    }

    // Select from top candidates
    const topCandidates = allCandidates.slice(0, Math.min(5, allCandidates.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    const selectedItem = topCandidates[randomIndex];

    // Generate tip description
    const tipLabels = { nl: 'Tip van de Dag', en: 'Tip of the Day', de: 'Tipp des Tages', es: 'Consejo del Dia', sv: 'Dagens Tips', pl: 'Porada Dnia' };

    const itemName = selectedItem.name || selectedItem.title || 'Unknown';
    const itemDesc = selectedItem.description || 'Een geweldige plek in Calpe';
    const ratingText = selectedItem.rating ? 'Beoordeling: ' + selectedItem.rating + ' sterren. ' : '';

    const tipPrompt = selectedItem.type === 'event'
      ? 'Genereer een enthousiaste "Tip van de Dag" (max 80 woorden) voor het evenement "' + itemName + '". Het vindt plaats op ' + selectedItem.event_date + '. Begin met een ster emoji. Beschrijving: ' + itemDesc
      : 'Genereer een enthousiaste "Tip van de Dag" (max 80 woorden) voor ' + itemName + '. Begin met een ster emoji. ' + ratingText + 'Categorie: ' + selectedItem.category + '. Beschrijving: ' + itemDesc;

    const tipDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language) },
      { role: 'user', content: tipPrompt }
    ]);

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

export default router;
