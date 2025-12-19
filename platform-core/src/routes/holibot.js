/**
 * HoliBot Routes v2.0
 * API endpoints for HoliBot AI Assistant Widget
 *
 * Features:
 * - RAG-based semantic search with ChromaDB Cloud
 * - Mistral AI for embeddings and chat
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - 4 Quick Actions: Itinerary, Location Info, Directions, Daily Tip
 *
 * Endpoints:
 * - POST /holibot/chat - RAG-powered chat
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

// Try to get POI model
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
 * RAG-powered chat with HoliBot
 */
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      language = 'nl',
      userPreferences = {}
    } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 1000 characters)'
      });
    }

    logger.info('HoliBot chat request', {
      message: message.substring(0, 100),
      language,
      hasHistory: conversationHistory.length > 0
    });

    // Use RAG service for chat
    const response = await ragService.chat(message, language, {
      userPreferences,
      conversationHistory
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('HoliBot chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat service temporarily unavailable'
    });
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
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const results = await ragService.search(query, { limit, filter });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('HoliBot search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search service temporarily unavailable'
    });
  }
});

/**
 * POST /api/v1/holibot/itinerary
 * Quick Action 1: Build personalized day program
 */
router.post('/itinerary', async (req, res) => {
  try {
    const {
      date,
      interests = [],
      duration = 'full-day', // morning, afternoon, evening, full-day
      travelCompanion,
      language = 'nl'
    } = req.body;

    logger.info('HoliBot itinerary request', { date, interests, duration });

    // Search for relevant POIs based on interests
    const queries = interests.length > 0
      ? interests.map(i => `${i} in Calpe`).join(' ')
      : 'best things to do in Calpe';

    const searchResults = await ragService.search(queries, { limit: 15 });

    // Group by category for balanced itinerary
    const categories = {};
    for (const poi of searchResults.results) {
      const cat = poi.category || 'Other';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(poi);
    }

    // Build itinerary based on duration
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
        itinerary.push({
          time: slot,
          poi: searchResults.results[poiIndex]
        });
        poiIndex++;
      }
    }

    // Generate description
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
    res.status(500).json({
      success: false,
      error: 'Could not generate itinerary'
    });
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
      return res.status(500).json({
        success: false,
        error: 'POI service not available'
      });
    }

    const poi = await model.findByPk(id);

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    // Search for related Q&A in ChromaDB
    const contextResults = await ragService.search(poi.name, { limit: 3 });

    // Generate enhanced description
    const systemPrompt = embeddingService.buildSystemPrompt(language);
    const enhancedDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Geef een aantrekkelijke beschrijving (max 100 woorden) van ${poi.name} in Calpe. Categorie: ${poi.category}. Originele beschrijving: ${poi.description || 'Geen beschrijving'}` }
    ]);

    res.json({
      success: true,
      data: {
        poi: {
          id: poi.id,
          name: poi.name,
          category: poi.category,
          subcategory: poi.subcategory,
          description: poi.description,
          enhancedDescription,
          address: poi.address,
          latitude: poi.latitude,
          longitude: poi.longitude,
          rating: poi.rating,
          reviewCount: poi.review_count,
          priceLevel: poi.price_level,
          phone: poi.phone,
          website: poi.website,
          openingHours: poi.opening_hours,
          thumbnailUrl: poi.thumbnail_url
        },
        relatedContext: contextResults.results.slice(0, 3)
      }
    });

  } catch (error) {
    logger.error('HoliBot location error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch location details'
    });
  }
});

/**
 * POST /api/v1/holibot/directions
 * Quick Action 3: Get directions to POI
 */
router.post('/directions', async (req, res) => {
  try {
    const {
      from, // { lat, lng } or 'current'
      toPoiId,
      mode = 'walking', // walking, driving
      language = 'nl'
    } = req.body;

    const model = await getPOIModel();

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'POI service not available'
      });
    }

    const poi = await model.findByPk(toPoiId);

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'Destination not found'
      });
    }

    // Build directions response
    // Note: For full directions, integrate with Google Maps or OpenRouteService
    const destination = {
      name: poi.name,
      address: poi.address,
      latitude: poi.latitude,
      longitude: poi.longitude
    };

    // Generate walking/driving tips
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
    res.status(500).json({
      success: false,
      error: 'Could not generate directions'
    });
  }
});

/**
 * GET /api/v1/holibot/daily-tip
 * Quick Action 4: Personalized daily tip based on user profile
 */
router.get('/daily-tip', async (req, res) => {
  try {
    const {
      language = 'nl',
      interests,
      userId
    } = req.query;

    const model = await getPOIModel();

    // Get category based on daily rotation + user interests
    const categories = [
      'Beaches & Nature',
      'Culture & History',
      'Active',
      'Food & Drinks'
    ];

    // Use date-based rotation for variety
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    let selectedCategory = categories[dayOfYear % categories.length];

    // Override with user interests if provided
    if (interests) {
      const userInterests = interests.split(',');
      const categoryMatch = categories.find(c =>
        userInterests.some(i => c.toLowerCase().includes(i.toLowerCase()))
      );
      if (categoryMatch) {
        selectedCategory = categoryMatch;
      }
    }

    // Search for POIs in selected category
    const searchResults = await ragService.search(selectedCategory + ' Calpe', { limit: 5 });

    if (searchResults.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tips available'
      });
    }

    // Pick a random POI from results
    const randomIndex = Math.floor(Math.random() * searchResults.results.length);
    const selectedPoi = searchResults.results[randomIndex];

    // Generate personalized tip description
    const tipLabels = {
      nl: 'Tip van de Dag',
      en: 'Tip of the Day',
      de: 'Tipp des Tages',
      es: 'Consejo del Día',
      sv: 'Dagens Tips',
      pl: 'Porada Dnia'
    };

    const tipDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language) },
      { role: 'user', content: `Genereer een enthousiaste "Tip van de Dag" (max 80 woorden) voor ${selectedPoi.name}. Begin met een ster emoji. Categorie: ${selectedPoi.category}. Beschrijving: ${selectedPoi.description || 'Een geweldige plek in Calpe'}` }
    ]);

    res.json({
      success: true,
      data: {
        title: tipLabels[language] || tipLabels.nl,
        poi: selectedPoi,
        tipDescription,
        category: selectedCategory,
        date: now.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    logger.error('HoliBot daily-tip error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not generate daily tip'
    });
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
      // Return sample categories
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
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        category: { [Sequelize.Op.ne]: null },
        is_active: true
      },
      group: ['category'],
      order: [[Sequelize.literal('count'), 'DESC']]
    });

    const categories = results.map(r => ({
      category: r.get('category'),
      count: parseInt(r.get('count'))
    }));

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch categories'
    });
  }
});

/**
 * POST /api/v1/holibot/admin/sync
 * Admin: Trigger sync from MySQL to ChromaDB
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

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Admin sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

/**
 * GET /api/v1/holibot/admin/stats
 * Admin: Get service statistics
 */
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await ragService.getStats();
    const syncStatus = syncService.getStatus();

    res.json({
      success: true,
      data: {
        ...stats,
        sync: syncStatus
      }
    });

  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch stats'
    });
  }
});

/**
 * GET /api/v1/holibot/health
 * Health check endpoint
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
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
