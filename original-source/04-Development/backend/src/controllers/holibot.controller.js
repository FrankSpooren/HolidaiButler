/**
 * HoliBot Controller
 * ==================
 * Handles HoliBot AI Assistant API endpoints
 * - Chat with AI (placeholder - Mistral to be integrated)
 * - Category browsing
 * - POI search for widget
 * - Personality-aware recommendations
 * - Trust signals & reviews
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const mistralService = require('../services/mistral.service');

// ============================================
// HOLIBOT CHAT ENDPOINT
// ============================================

/**
 * POST /holibot/chat
 * Chat with HoliBot AI Assistant
 *
 * Integrated with Mistral AI API
 */
exports.chat = async (req, res) => {
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

// ============================================
// CATEGORY ENDPOINTS
// ============================================

/**
 * GET /holibot/categories
 * Get all categories with POI counts
 */
exports.getCategories = async (req, res) => {
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

// ============================================
// POI SEARCH ENDPOINT
// ============================================

/**
 * GET /holibot/pois
 * Search POIs for HoliBot widget
 */
exports.searchPOIs = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      q: searchQuery,
      limit = 10
    } = req.query;

    let sql = 'SELECT id, name, category, subcategory, rating, price_level, address, latitude, longitude FROM POI WHERE 1=1';
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

// ============================================
// RECOMMENDATIONS ENDPOINT
// ============================================

/**
 * POST /holibot/recommendations
 * Get personality-aware POI recommendations
 */
exports.getRecommendations = async (req, res) => {
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
      SELECT id, name, category, subcategory, rating, price_level, address, latitude, longitude
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

// ============================================
// REVIEWS & TRUST SIGNALS ENDPOINT
// ============================================

/**
 * GET /holibot/pois/:id/reviews
 * Get POI reviews and trust signals
 */
exports.getPOIReviews = async (req, res) => {
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
      ] // Placeholder highlights
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

// ============================================
// DAILY TIP ENDPOINT
// ============================================

/**
 * GET /holibot/daily-tip
 * Get personalized daily POI tip
 *
 * Features:
 * - User preference matching (logged in users)
 * - Daily category rotation (non-logged in users)
 * - Mistral AI generated enthusiastic descriptions
 * - Day-based deterministic selection
 */
exports.getDailyTip = async (req, res) => {
  try {
    const userId = req.user?.id; // Optional - may be undefined for non-logged users
    let selectedCategory = null;
    let userPreferences = null;

    // Step 1: Determine category to use
    if (userId) {
      // LOGGED IN USER: Use preference matching
      try {
        const prefsQuery = `
          SELECT interests, travel_companion
          FROM User_Preferences
          WHERE user_id = ?
        `;
        const prefs = await query(prefsQuery, [userId]);

        if (prefs.length > 0 && prefs[0].interests) {
          userPreferences = prefs[0];
          const interests = typeof prefs[0].interests === 'string'
            ? JSON.parse(prefs[0].interests)
            : prefs[0].interests;

          // Map user interests to POI categories
          selectedCategory = mapInterestsToCategory(interests);
          logger.info('Daily tip - user preferences matched', { userId, interests, selectedCategory });
        }
      } catch (error) {
        logger.warn('Failed to fetch user preferences, falling back to rotation', { userId, error: error.message });
      }
    }

    // Step 2: Fallback to daily rotation if no user preferences or not logged in
    if (!selectedCategory) {
      selectedCategory = getDailyRotationCategory();
      logger.info('Daily tip - using daily rotation', { selectedCategory });
    }

    // Step 3: Get random POI from selected category
    const poiQuery = `
      SELECT id, name, category, subcategory, description, address,
             latitude, longitude, rating, review_count, thumbnail_url
      FROM POI
      WHERE is_active = TRUE
        AND category = ?
        AND description IS NOT NULL
        AND LENGTH(description) > 100
      ORDER BY RAND()
      LIMIT 1
    `;
    const pois = await query(poiQuery, [selectedCategory]);

    if (pois.length === 0) {
      logger.warn('No POIs found for category, trying fallback', { selectedCategory });

      // Fallback: try any active POI with description
      const fallbackQuery = `
        SELECT id, name, category, subcategory, description, address,
               latitude, longitude, rating, review_count, thumbnail_url
        FROM POI
        WHERE is_active = TRUE
          AND description IS NOT NULL
          AND LENGTH(description) > 100
        ORDER BY RAND()
        LIMIT 1
      `;
      const fallbackPois = await query(fallbackQuery);

      if (fallbackPois.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_POIS_AVAILABLE',
            message: 'No POIs available for daily tip'
          }
        });
      }

      pois.push(fallbackPois[0]);
    }

    const poi = pois[0];

    // Get images from imageurls table
    let images = [];
    try {
      const imageQuery = 'SELECT url, attribution FROM imageurls WHERE poi_id = ? ORDER BY id LIMIT 5';
      images = await query(imageQuery, [poi.id]);
    } catch (error) {
      logger.warn('Failed to fetch images for POI', { poiId: poi.id, error: error.message });
    }

    // Step 4: Generate enthusiastic tip description using Mistral AI
    let tipDescription = generateFallbackTipDescription(poi);

    if (mistralService.isConfigured()) {
      try {
        const aiPrompt = `Je bent HoliBot, een enthousiaste lokale gids in Calpe, Spanje.
Genereer een korte, enthousiaste "Tip van de Dag" beschrijving (max 100 woorden) voor deze locatie.
Gebruik een vriendelijke, persoonlijke toon. Begin ALTIJD met "🌟" emoji.
${userPreferences ? `De gebruiker is geïnteresseerd in: ${userPreferences.interests}. Pas je beschrijving hierop aan.` : ''}

Locatie: ${poi.name}
Category: ${poi.category}
Beschrijving: ${poi.description}

Schrijf de tip in het Nederlands.`;

        const aiResponse = await mistralService.chat([
          { role: 'user', content: aiPrompt }
        ]);

        if (aiResponse && aiResponse.length > 0) {
          tipDescription = aiResponse.trim();
          logger.info('Daily tip - AI description generated', { poiId: poi.id });
        }
      } catch (error) {
        logger.warn('Failed to generate AI description, using fallback', { poiId: poi.id, error: error.message });
      }
    }

    // Step 5: Return formatted response
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
          thumbnailUrl: poi.thumbnail_url,
          images: images.map(img => ({
            url: img.url,
            attribution: img.attribution
          }))
        },
        tipDescription,
        matchType: userId && userPreferences ? 'preference-matched' : 'daily-rotation',
        category: selectedCategory
      }
    };

    logger.info('Daily tip generated successfully', {
      poiId: poi.id,
      poiName: poi.name,
      category: selectedCategory,
      matchType: response.data.matchType,
      hasUserId: !!userId
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate trust score based on rating, review count, and verification
 */
function calculateTrustScore(rating, reviewCount, verified) {
  let score = 0;

  // Rating component (40%)
  score += (rating / 5) * 40;

  // Review count component (30%)
  score += Math.min(reviewCount / 100, 1) * 30;

  // Verification component (30%)
  score += verified ? 30 : 0;

  return Math.round(score);
}

/**
 * Get trust badge based on score
 */
function getTrustBadge(score) {
  if (score >= 80) return 'elite';
  if (score >= 60) return 'verified';
  if (score >= 40) return 'community';
  return null;
}

/**
 * Map user interests to POI categories
 * @param {Array} interests - User interests from preferences
 * @returns {String} POI category
 */
function mapInterestsToCategory(interests) {
  if (!Array.isArray(interests) || interests.length === 0) {
    return getDailyRotationCategory();
  }

  // Interest to category mapping
  const interestMap = {
    'culture': 'Culture & History',
    'history': 'Culture & History',
    'museums': 'Culture & History',
    'heritage': 'Culture & History',
    'beach': 'Beaches & Nature',
    'nature': 'Beaches & Nature',
    'hiking': 'Beaches & Nature',
    'outdoor': 'Beaches & Nature',
    'sports': 'Active',
    'adventure': 'Active',
    'activities': 'Active',
    'fitness': 'Active',
    'family': 'Recreation',
    'kids': 'Recreation',
    'entertainment': 'Recreation',
    'relaxation': 'Recreation'
  };

  // Find first matching category
  for (const interest of interests) {
    const normalizedInterest = interest.toLowerCase().trim();
    if (interestMap[normalizedInterest]) {
      return interestMap[normalizedInterest];
    }
  }

  // No match - use daily rotation
  return getDailyRotationCategory();
}

/**
 * Get category based on daily rotation
 * Rotates through categories each day
 * @returns {String} POI category
 */
function getDailyRotationCategory() {
  const categories = [
    'Beaches & Nature',
    'Culture & History',
    'Active',
    'Recreation'
  ];

  // Use day of year for consistent daily rotation
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const categoryIndex = dayOfYear % categories.length;
  return categories[categoryIndex];
}

/**
 * Generate fallback tip description if AI fails
 * @param {Object} poi - POI object
 * @returns {String} Fallback tip description
 */
function generateFallbackTipDescription(poi) {
  const categoryTemplates = {
    'Beaches & Nature': [
      `🌟 Ontdek de natuurlijke schoonheid van ${poi.name}! Een prachtige plek om te genieten van de natuur en tot rust te komen. Perfect voor een ontspannen dag in Calpe!`,
      `🌟 Beleef de mooiste natuurervaringen bij ${poi.name}! Deze locatie biedt een geweldige kans om de omgeving te verkennen. Een must-visit tijdens je verblijf!`
    ],
    'Culture & History': [
      `🌟 Duik in de rijke geschiedenis van ${poi.name}! Een fascinerende culturele ervaring die je niet mag missen tijdens je bezoek aan Calpe!`,
      `🌟 Ontdek het culturele erfgoed bij ${poi.name}! Een inspirerende plek vol geschiedenis en verhalen uit het verleden.`
    ],
    'Active': [
      `🌟 Beleef een actief avontuur bij ${poi.name}! De perfecte plek voor sportieve activiteiten en energie. Ideaal voor een dynamische dag uit!`,
      `🌟 Kom in beweging bij ${poi.name}! Deze locatie biedt geweldige mogelijkheden voor actieve bezoekers. Een echte aanrader!`
    ],
    'Recreation': [
      `🌟 Geniet van ontspanning en vermaak bij ${poi.name}! Een fantastische plek om je vrije tijd door te brengen en nieuwe ervaringen op te doen!`,
      `🌟 Heb een geweldige tijd bij ${poi.name}! Perfect voor een gezellige dag uit met leuke activiteiten en entertainment.`
    ],
    'Food & Dining': [
      `🌟 Proef de heerlijke smaken bij ${poi.name}! Een culinaire ervaring die je smaakpapillen zal verrassen. Eet smakelijk!`,
      `🌟 Geniet van een heerlijke maaltijd bij ${poi.name}! Deze plek staat bekend om de goede keuken en gezellige sfeer.`
    ],
    'Shops & Markets': [
      `🌟 Verken de unieke aanbiedingen van ${poi.name}! Een geweldige plek om te winkelen en lokale producten te ontdekken!`,
      `🌟 Ontdek bijzondere vondsten bij ${poi.name}! Perfect voor een gezellige shopping-ervaring in Calpe.`
    ]
  };

  // Get templates for category or use default
  const templates = categoryTemplates[poi.category] || [
    `🌟 Ontdek ${poi.name}! Een bijzondere locatie die je niet mag missen tijdens je bezoek aan Calpe!`
  ];

  // Select random template for variety
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}
