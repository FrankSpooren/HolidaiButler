/**
 * HoliBot Controller (ES Module)
 * Handles HoliBot AI Assistant API endpoints
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import mistralService from '../services/mistral.service.js';

const { QueryTypes } = (await import('sequelize')).default;

/**
 * Execute raw SQL query
 */
async function query(sql, params = []) {
  return mysqlSequelize.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

/**
 * POST /holibot/chat
 * Chat with HoliBot AI Assistant
 */
export const chat = async (req, res) => {
  try {
    const { message, conversationHistory = [], userPreferences = {} } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Validate message length (max 1000 characters)
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
};

/**
 * GET /holibot/categories
 * Get all categories with POI counts
 */
export const getCategories = async (req, res) => {
  try {
    const sql = `
      SELECT
        category,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT subcategory) as subcategories
      FROM POI
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
    `;

    const results = await query(sql);

    // Format subcategories from string to array
    const categories = results.map(cat => ({
      category: cat.category,
      count: cat.count,
      subcategories: cat.subcategories
        ? cat.subcategories.split(',').map(s => s.trim()).filter(s => s)
        : []
    }));

    logger.info('HoliBot categories fetched', { count: categories.length });

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
};

/**
 * GET /holibot/pois
 * Search POIs for HoliBot widget
 */
export const searchPOIs = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      q: searchQuery,
      limit = 10
    } = req.query;

    let sql = 'SELECT id, name, category, subcategory, rating, price_level, address, latitude, longitude, thumbnail_url FROM POI WHERE 1=1';
    const params = [];

    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Subcategory filter
    if (subcategory) {
      sql += ' AND subcategory = ?';
      params.push(subcategory);
    }

    // Search query filter (name or description)
    if (searchQuery) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern);
    }

    // Order by rating (best first)
    sql += ' ORDER BY rating DESC';

    // Limit results
    sql += ' LIMIT ?';
    params.push(parseInt(limit));

    const pois = await query(sql, params);

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
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
};

/**
 * POST /holibot/recommendations
 * Get personality-aware POI recommendations
 */
export const getRecommendations = async (req, res) => {
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

    // Build SQL with personality weighting
    const placeholders = categories.map(() => '?').join(',');
    const sql = `
      SELECT id, name, category, subcategory, rating, price_level, address, latitude, longitude, thumbnail_url
      FROM POI
      WHERE category IN (${placeholders})
        AND rating >= 4.0
      ORDER BY rating DESC, name ASC
      LIMIT ?
    `;

    const params = [...categories, limit];
    const recommendations = await query(sql, params);

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
};

/**
 * GET /holibot/pois/:id/reviews
 * Get POI reviews and trust signals
 */
export const getPOIReviews = async (req, res) => {
  try {
    const { id } = req.params;

    // Get POI with basic info
    const sql = 'SELECT id, name, rating, review_count, verified FROM POI WHERE id = ?';
    const results = await query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'POI not found'
      });
    }

    const poi = results[0];

    // Calculate trust score
    const trustScore = calculateTrustScore(
      poi.rating || 0,
      poi.review_count || 0,
      poi.verified || 0
    );

    // Determine trust badge
    const trustBadge = getTrustBadge(trustScore);

    // Trust signals
    const trustSignals = {
      trustScore,
      badge: trustBadge,
      verifiedSources: poi.verified ? ['Google', 'TripAdvisor'] : ['Community'],
      highlights: [
        'Great location',
        'Friendly staff',
        'Excellent service'
      ]
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
};

/**
 * GET /holibot/daily-tip
 * Get personalized daily POI tip
 */
export const getDailyTip = async (req, res) => {
  try {
    const userId = req.user?.id;
    let selectedCategory = null;

    // Get daily rotation category
    selectedCategory = getDailyRotationCategory();
    logger.info('Daily tip - using daily rotation', { selectedCategory });

    // Get random POI from selected category
    const poiQuery = `
      SELECT id, name, category, subcategory, description, address,
             latitude, longitude, rating, review_count, thumbnail_url
      FROM POI
      WHERE category = ?
        AND description IS NOT NULL
        AND LENGTH(description) > 50
      ORDER BY RAND()
      LIMIT 1
    `;
    let pois = await query(poiQuery, [selectedCategory]);

    if (pois.length === 0) {
      // Fallback: try any POI with description
      const fallbackQuery = `
        SELECT id, name, category, subcategory, description, address,
               latitude, longitude, rating, review_count, thumbnail_url
        FROM POI
        WHERE description IS NOT NULL
          AND LENGTH(description) > 50
        ORDER BY RAND()
        LIMIT 1
      `;
      pois = await query(fallbackQuery);

      if (pois.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_POIS_AVAILABLE',
            message: 'No POIs available for daily tip'
          }
        });
      }
    }

    const poi = pois[0];

    // Generate tip description
    const tipDescription = generateFallbackTipDescription(poi);

    const response = {
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
    };

    logger.info('Daily tip generated successfully', {
      poiId: poi.id,
      poiName: poi.name,
      category: selectedCategory
    });

    res.json(response);

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
};

// Helper Functions

function calculateTrustScore(rating, reviewCount, verified) {
  let score = 0;
  score += (rating / 5) * 40;
  score += Math.min(reviewCount / 100, 1) * 30;
  score += verified ? 30 : 0;
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

  const categoryIndex = dayOfYear % categories.length;
  return categories[categoryIndex];
}

function generateFallbackTipDescription(poi) {
  const categoryTemplates = {
    'Beaches & Nature': [
      `🌟 Ontdek de natuurlijke schoonheid van ${poi.name}! Een prachtige plek om te genieten van de natuur. Perfect voor een ontspannen dag in Calpe!`
    ],
    'Culture & History': [
      `🌟 Duik in de rijke geschiedenis van ${poi.name}! Een fascinerende culturele ervaring die je niet mag missen tijdens je bezoek aan Calpe!`
    ],
    'Active': [
      `🌟 Beleef een actief avontuur bij ${poi.name}! De perfecte plek voor sportieve activiteiten. Ideaal voor een dynamische dag uit!`
    ],
    'Food & Drinks': [
      `🌟 Proef de heerlijke smaken bij ${poi.name}! Een culinaire ervaring die je smaakpapillen zal verrassen. Eet smakelijk!`
    ]
  };

  const templates = categoryTemplates[poi.category] || [
    `🌟 Ontdek ${poi.name}! Een bijzondere locatie die je niet mag missen tijdens je bezoek aan Calpe!`
  ];

  return templates[0];
}

export default {
  chat,
  getCategories,
  searchPOIs,
  getRecommendations,
  getPOIReviews,
  getDailyTip
};
