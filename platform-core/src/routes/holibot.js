/**
 * HoliBot Routes
 * API endpoints for HoliBot AI Assistant Widget
 *
 * Endpoints:
 * - POST /holibot/chat - Chat with Mistral AI
 * - GET /holibot/categories - Get POI categories with counts
 * - GET /holibot/pois - Search POIs for widget
 * - POST /holibot/recommendations - Get personality-aware recommendations
 * - GET /holibot/pois/:id/reviews - Get POI reviews & trust signals
 * - GET /holibot/daily-tip - Get personalized daily POI tip
 */

import express from 'express';
import { mistralService } from '../services/chat/mistralService.js';
import { sessionService } from '../services/chat/sessionService.js';
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
 * Chat with HoliBot AI Assistant (Mistral AI integration)
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], userPreferences = {} } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 1000 characters)'
      });
    }

    logger.info('HoliBot chat request', {
      message: message.substring(0, 100),
      hasHistory: !!conversationHistory?.length,
      hasPreferences: !!Object.keys(userPreferences).length,
      mistralConfigured: mistralService.isConfigured()
    });

    // Call Mistral AI service
    const response = await mistralService.chat(
      message,
      conversationHistory,
      userPreferences
    );

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
        data: getSampleCategories(),
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
        is_active: true  // Fixed: use is_active instead of status
      },
      group: ['category'],
      order: [[Sequelize.literal('count'), 'DESC']]
    });

    const categories = results.map(r => ({
      category: r.get('category'),
      count: parseInt(r.get('count'))
    }));

    logger.info('HoliBot categories fetched', { count: categories.length });

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.json({
      success: true,
      data: getSampleCategories(),
      count: 6
    });
  }
});

/**
 * GET /api/v1/holibot/pois
 * Search POIs for HoliBot widget
 */
router.get('/pois', async (req, res) => {
  try {
    const { category, subcategory, q: searchQuery, limit = 10 } = req.query;
    const model = await getPOIModel();

    if (!model) {
      return res.json({
        success: true,
        data: getSamplePOIs(category),
        count: 3
      });
    }

    const { Op } = await import('sequelize');
    const where = { is_active: true };

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;

    if (searchQuery) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } }
      ];
    }

    const pois = await model.findAll({
      where,
      order: [['rating', 'DESC']],
      limit: parseInt(limit)
    });

    logger.info('HoliBot POI search', {
      category,
      subcategory,
      query: searchQuery,
      results: pois.length
    });

    res.json({
      success: true,
      data: pois,
      count: pois.length
    });

  } catch (error) {
    logger.error('Search POIs error:', error);
    res.json({
      success: true,
      data: getSamplePOIs(),
      count: 3
    });
  }
});

/**
 * POST /api/v1/holibot/recommendations
 * Get personality-aware POI recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { personality, preferences } = req.body;
    const limit = 10;

    logger.info('HoliBot recommendations request', { personality, preferences });

    // Personality-aware category mapping
    const personalityCategories = {
      cognitive: ['Culture & History', 'Practical', 'Shopping'],
      physical: ['Active', 'Beaches & Nature', 'Recreation'],
      social: ['Food & Drinks', 'Recreation', 'Active']
    };

    const categories = personalityCategories[personality] ||
                      ['Active', 'Beaches & Nature', 'Food & Drinks'];

    const model = await getPOIModel();

    if (!model) {
      return res.json({
        success: true,
        data: getSamplePOIs(),
        count: 3,
        personality,
        categories
      });
    }

    const { Op } = await import('sequelize');

    const recommendations = await model.findAll({
      where: {
        category: { [Op.in]: categories },
        rating: { [Op.gte]: 4.0 },
        is_active: true
      },
      order: [['rating', 'DESC'], ['name', 'ASC']],
      limit
    });

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      personality,
      categories
    });

  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not generate recommendations'
    });
  }
});

/**
 * GET /api/v1/holibot/pois/:id/reviews
 * Get POI reviews and trust signals
 */
router.get('/pois/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const model = await getPOIModel();

    if (!model) {
      return res.json({
        success: true,
        data: {
          id: parseInt(id),
          name: 'Sample POI',
          rating: 4.5,
          reviewCount: 100,
          verified: true,
          trustSignals: {
            trustScore: 85,
            badge: 'verified',
            verifiedSources: ['Google', 'TripAdvisor'],
            highlights: ['Great location', 'Friendly staff', 'Excellent service']
          }
        }
      });
    }

    const poi = await model.findByPk(id);

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'POI not found'
      });
    }

    // Calculate trust score
    const trustScore = calculateTrustScore(
      poi.rating || 0,
      poi.review_count || 0,
      poi.verified || false
    );

    const trustBadge = getTrustBadge(trustScore);

    const trustSignals = {
      trustScore,
      badge: trustBadge,
      verifiedSources: poi.verified ? ['Google', 'TripAdvisor'] : ['Community'],
      highlights: ['Great location', 'Friendly staff', 'Excellent service']
    };

    logger.info('HoliBot POI reviews fetched', { id, trustScore, badge: trustBadge });

    res.json({
      success: true,
      data: {
        id: poi.id,
        name: poi.name,
        rating: poi.rating,
        reviewCount: poi.review_count,
        verified: poi.verified,
        trustSignals
      }
    });

  } catch (error) {
    logger.error('Get POI reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch reviews'
    });
  }
});

/**
 * GET /api/v1/holibot/daily-tip
 * Get personalized daily POI tip
 */
router.get('/daily-tip', async (req, res) => {
  try {
    const model = await getPOIModel();

    // Get category based on daily rotation
    const selectedCategory = getDailyRotationCategory();

    if (!model) {
      const samplePOI = getSamplePOIs(selectedCategory)[0] || getSamplePOIs()[0];
      const tipDescription = generateFallbackTipDescription(samplePOI);

      return res.json({
        success: true,
        data: {
          poi: samplePOI,
          tipDescription,
          matchType: 'daily-rotation',
          category: selectedCategory
        }
      });
    }

    const { Op, Sequelize } = await import('sequelize');

    // Get random POI from selected category
    let poi = await model.findOne({
      where: {
        is_active: true,
        category: selectedCategory,
        description: { [Op.ne]: null }
      },
      order: Sequelize.literal('RAND()')
    });

    // Fallback to any active POI
    if (!poi) {
      poi = await model.findOne({
        where: {
          is_active: true,
          description: { [Op.ne]: null }
        },
        order: Sequelize.literal('RAND()')
      });
    }

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_POIS_AVAILABLE',
          message: 'No POIs available for daily tip'
        }
      });
    }

    // Generate tip description using AI or fallback
    let tipDescription;

    if (mistralService.isConfigured()) {
      try {
        const aiPrompt = `Je bent HoliBot, een enthousiaste lokale gids in Calpe, Spanje.
Genereer een korte, enthousiaste "Tip van de Dag" beschrijving (max 100 woorden) voor deze locatie.
Gebruik een vriendelijke, persoonlijke toon. Begin ALTIJD met een ster emoji.

Locatie: ${poi.name}
Categorie: ${poi.category}
Beschrijving: ${poi.description || 'Een geweldige plek in Calpe'}

Schrijf de tip in het Nederlands.`;

        const aiResponse = await mistralService.chat(aiPrompt, []);
        if (aiResponse?.message) {
          tipDescription = aiResponse.message;
        }
      } catch (error) {
        logger.warn('Failed to generate AI tip description', { error: error.message });
      }
    }

    if (!tipDescription) {
      tipDescription = generateFallbackTipDescription(poi);
    }

    logger.info('Daily tip generated', {
      poiId: poi.id,
      poiName: poi.name,
      category: selectedCategory
    });

    res.json({
      success: true,
      data: {
        poi: {
          id: poi.id,
          name: poi.name,
          category: poi.category,
          subcategory: poi.subcategory,
          description: poi.description,
          address: poi.address,
          latitude: poi.latitude,
          longitude: poi.longitude,
          rating: poi.rating,
          reviewCount: poi.review_count,
          thumbnailUrl: poi.thumbnail_url
        },
        tipDescription,
        matchType: 'daily-rotation',
        category: selectedCategory
      }
    });

  } catch (error) {
    logger.error('Get daily tip error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DAILY_TIP_ERROR',
        message: 'Could not generate daily tip'
      }
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateTrustScore(rating, reviewCount, verified) {
  let score = 0;
  score += (rating / 5) * 40; // Rating: 40%
  score += Math.min(reviewCount / 100, 1) * 30; // Reviews: 30%
  score += verified ? 30 : 0; // Verified: 30%
  return Math.round(score);
}

function getTrustBadge(score) {
  if (score >= 80) return 'elite';
  if (score >= 60) return 'verified';
  if (score >= 40) return 'community';
  return null;
}

function getDailyRotationCategory() {
  const categories = [
    'Beaches & Nature',
    'Culture & History',
    'Active',
    'Food & Drinks'
  ];
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return categories[dayOfYear % categories.length];
}

function generateFallbackTipDescription(poi) {
  const templates = {
    'Beaches & Nature': `Ontdek de natuurlijke schoonheid van ${poi?.name || 'deze locatie'}! Een prachtige plek om te genieten van de natuur en tot rust te komen.`,
    'Culture & History': `Duik in de rijke geschiedenis van ${poi?.name || 'deze locatie'}! Een fascinerende culturele ervaring die je niet mag missen.`,
    'Active': `Beleef een actief avontuur bij ${poi?.name || 'deze locatie'}! Perfect voor sportieve activiteiten en energie.`,
    'Food & Drinks': `Proef de heerlijke smaken bij ${poi?.name || 'deze locatie'}! Een culinaire ervaring die je smaakpapillen zal verrassen.`
  };
  const category = poi?.category || 'general';
  return templates[category] || `Ontdek ${poi?.name || 'deze geweldige locatie'}! Een bijzondere plek in Calpe die je niet mag missen.`;
}

function getSampleCategories() {
  return [
    { category: 'Beaches & Nature', count: 15 },
    { category: 'Food & Drinks', count: 42 },
    { category: 'Culture & History', count: 8 },
    { category: 'Active', count: 12 },
    { category: 'Shopping', count: 18 },
    { category: 'Recreation', count: 10 }
  ];
}

function getSamplePOIs(category = null) {
  const pois = [
    {
      id: 1,
      name: 'Penyal d\'Ifac',
      category: 'Beaches & Nature',
      description: 'Iconische rots en natuurreservaat',
      address: 'Parque Natural del Penyal d\'Ifac',
      latitude: 38.6327,
      longitude: 0.0778,
      rating: 4.8,
      review_count: 245
    },
    {
      id: 2,
      name: 'Restaurante El Puerto',
      category: 'Food & Drinks',
      description: 'Verse vis en zeevruchten met havenuitzicht',
      address: 'Puerto de Calpe',
      latitude: 38.6445,
      longitude: 0.0441,
      rating: 4.7,
      review_count: 312
    },
    {
      id: 3,
      name: 'Museo del Coleccionismo',
      category: 'Culture & History',
      description: 'Uniek museum met verzamelobjecten',
      address: 'Casco Antiguo, Calpe',
      latitude: 38.6452,
      longitude: 0.0445,
      rating: 4.3,
      review_count: 87
    }
  ];

  if (category) {
    return pois.filter(p => p.category === category);
  }
  return pois;
}

export default router;
