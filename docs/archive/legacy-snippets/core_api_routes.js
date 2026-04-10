/**
 * HolidAIButler - Core API Routes
 * Chat, POI, and User management endpoints
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Models
const { User, POI, Chat, Analytics, Booking } = require('../models');

// Services
const ClaudeService = require('../services/ClaudeService');
const POIService = require('../services/POIService');
const WeatherService = require('../services/WeatherService');

// Middleware
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// Chat Routes
const chatRouter = express.Router();

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: { error: 'Too many messages. Please wait a moment.' },
});

/**
 * POST /api/chat/message
 * Send message to AI and get response
 */
chatRouter.post('/message',
  authenticateToken,
  chatRateLimit,
  [
    body('message')
      .notEmpty()
      .isLength({ max: 1000 })
      .withMessage('Message required (max 1000 characters)'),
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID required'),
    body('location')
      .optional()
      .isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { message, sessionId, location } = req.body;
    const userId = req.user.userId;

    try {
      // Get or create chat session
      let chat = await Chat.findOne({ userId, sessionId });
      if (!chat) {
        chat = new Chat({
          userId,
          sessionId,
          messages: [],
          context: {
            location,
            preferences: req.user.preferences,
          },
        });
      }

      // Get user preferences
      const user = await User.findById(userId);
      
      // Prepare context for Claude
      const conversationHistory = chat.messages
        .slice(-10) // Last 10 messages
        .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Call Claude service
      const aiResponse = await ClaudeService.processMessage({
        message,
        context: chat.context,
        conversation: conversationHistory,
        userPreferences: user.preferences,
        location,
      });

      // Add user message to chat
      const userMessage = {
        id: `${Date.now()}_user`,
        type: 'user',
        content: message,
        timestamp: new Date(),
        metadata: {
          location,
        },
      };

      // Add AI response to chat
      const aiMessage = {
        id: `${Date.now()}_ai`,
        type: 'ai',
        content: aiResponse.text,
        timestamp: new Date(),
        metadata: {
          aiModel: aiResponse.model,
          tokenUsage: aiResponse.tokenUsage,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.processingTime,
          cached: aiResponse.cached,
          fallback: aiResponse.fallback,
          recommendations: aiResponse.recommendations || [],
          suggestions: [
            "Tell me more about restaurants nearby",
            "What activities are good for families?",
            "Show me beautiful beaches",
            "Any cultural sites to visit?",
          ],
        },
      };

      chat.messages.push(userMessage, aiMessage);
      chat.summary.totalMessages = chat.messages.length;
      chat.summary.recommendations += aiResponse.recommendations?.length || 0;

      await chat.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalChats': 1, 'stats.totalRecommendations': aiResponse.recommendations?.length || 0 },
        'stats.lastActive': new Date(),
      });

      // Log analytics
      await Analytics.create({
        type: 'user_interaction',
        userId,
        sessionId,
        data: {
          event: 'chat_message',
          category: 'engagement',
          metadata: {
            messageLength: message.length,
            aiModel: aiResponse.model,
            processingTime: aiResponse.processingTime,
            recommendationsCount: aiResponse.recommendations?.length || 0,
            cached: aiResponse.cached,
          },
        },
        location,
      });

      res.json({
        success: true,
        data: {
          message: aiMessage,
          sessionId,
          recommendations: aiResponse.recommendations,
        },
      });

    } catch (error) {
      logger.error('Chat message error:', error);
      
      // Return fallback response
      const fallbackMessage = {
        id: `${Date.now()}_ai`,
        type: 'ai',
        content: "I'm experiencing some technical difficulties right now. Let me help you with some popular Costa Blanca recommendations while I get back online!",
        timestamp: new Date(),
        metadata: {
          isError: true,
          fallbackMode: true,
          suggestions: [
            "Show me popular restaurants",
            "Best beaches nearby",
            "What to do in Alicante",
          ],
        },
      };

      res.json({
        success: true,
        data: {
          message: fallbackMessage,
          sessionId,
          recommendations: [],
        },
      });
    }
  })
);

/**
 * GET /api/chat/history
 * Get chat history for user
 */
chatRouter.get('/history',
  authenticateToken,
  [
    query('sessionId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    const { sessionId, limit = 20 } = req.query;
    const userId = req.user.userId;

    const query = { userId };
    if (sessionId) query.sessionId = sessionId;

    const chats = await Chat.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('sessionId messages summary createdAt updatedAt');

    res.json({
      success: true,
      data: chats,
    });
  })
);

// POI Routes
const poiRouter = express.Router();

/**
 * GET /api/poi/search
 * Search POIs with filters
 */
poiRouter.get('/search',
  [
    query('q').optional().isString(),
    query('category').optional().isIn(['attractions', 'beaches', 'restaurants', 'museums', 'activities', 'nightlife', 'shopping', 'hotels', 'transportation', 'nature', 'cultural', 'sports']),
    query('location').optional().isString(),
    query('lat').optional().isFloat(),
    query('lng').optional().isFloat(),
    query('radius').optional().isInt({ min: 100, max: 50000 }),
    query('rating').optional().isFloat({ min: 0, max: 5 }),
    query('priceCategory').optional().isIn(['Free', '€', '€€', '€€€', '€€€€', '€€€€€']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    const {
      q,
      category,
      location,
      lat,
      lng,
      radius = 10000,
      rating,
      priceCategory,
      limit = 20,
    } = req.query;

    let query = { isActive: true };

    // Text search
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { features: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    // Category filter
    if (category) query.category = category;

    // Location filter
    if (location) query.location = location;

    // Rating filter
    if (rating) query.rating = { $gte: parseFloat(rating) };

    // Price category filter
    if (priceCategory) query.priceCategory = priceCategory;

    // Geospatial search
    if (lat && lng) {
      query['coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const pois = await POI.find(query)
      .limit(parseInt(limit))
      .sort({ rating: -1, reviews: -1 })
      .lean();

    // Calculate distances if lat/lng provided
    if (lat && lng && pois.length > 0) {
      pois.forEach(poi => {
        poi.distance = POIService.calculateDistance(
          { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          { lat: poi.coordinates.latitude, lng: poi.coordinates.longitude }
        );
      });
    }

    res.json({
      success: true,
      data: {
        pois,
        total: pois.length,
        filters: { category, location, rating, priceCategory },
      },
    });
  })
);

/**
 * GET /api/poi/:id
 * Get POI details
 */
poiRouter.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const poi = await POI.findById(id);
    if (!poi || !poi.isActive) {
      return res.status(404).json({
        error: 'POI not found',
      });
    }

    // Increment view count (analytics)
    if (req.user) {
      await Analytics.create({
        type: 'poi_engagement',
        userId: req.user.userId,
        data: {
          event: 'poi_view',
          category: 'engagement',
          metadata: {
            poiId: poi._id,
            poiName: poi.name,
            category: poi.category,
          },
        },
      });
    }

    res.json({
      success: true,
      data: poi,
    });
  })
);

/**
 * GET /api/poi/nearby
 * Get nearby POIs
 */
poiRouter.get('/nearby/:lat/:lng',
  [
    query('radius').optional().isInt({ min: 100, max: 50000 }),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.params;
    const { radius = 5000, category, limit = 10 } = req.query;

    let query = {
      isActive: true,
      'coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      },
    };

    if (category) query.category = category;

    const pois = await POI.find(query)
      .limit(parseInt(limit))
      .sort({ rating: -1 })
      .lean();

    // Add distance calculation
    pois.forEach(poi => {
      poi.distance = POIService.calculateDistance(
        { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        { lat: poi.coordinates.latitude, lng: poi.coordinates.longitude }
      );
    });

    res.json({
      success: true,
      data: pois,
    });
  })
);

// User Routes
const userRouter = express.Router();

/**
 * GET /api/user/profile
 * Get user profile
 */
userRouter.get('/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId)
      .select('-password -resetPasswordToken -resetPasswordExpiry');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * PUT /api/user/profile
 * Update user profile
 */
userRouter.put('/profile',
  authenticateToken,
  [
    body('profile.firstName').optional().isLength({ min: 1, max: 50 }),
    body('profile.lastName').optional().isLength({ min: 1, max: 50 }),
    body('profile.language').optional().isIn(['en', 'es', 'de', 'nl', 'fr']),
    body('preferences.interests').optional().isArray(),
    body('preferences.budget').optional().isIn(['budget', 'moderate', 'luxury', 'premium']),
    body('preferences.groupSize').optional().isInt({ min: 1, max: 20 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const updateData = {};
    if (req.body.profile) updateData.profile = req.body.profile;
    if (req.body.preferences) updateData.preferences = req.body.preferences;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * PUT /api/user/location
 * Update user location
 */
userRouter.put('/location',
  authenticateToken,
  [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('name').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const { latitude, longitude, name } = req.body;

    await User.findByIdAndUpdate(req.user.userId, {
      'location.current': {
        latitude,
        longitude,
        name,
        lastUpdated: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Location updated',
    });
  })
);

/**
 * GET /api/user/stats
 * Get user statistics
 */
userRouter.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const [user, totalBookings, recentChats] = await Promise.all([
      User.findById(userId).select('stats'),
      Booking.countDocuments({ userId }),
      Chat.find({ userId }).sort({ createdAt: -1 }).limit(5).select('summary createdAt'),
    ]);

    res.json({
      success: true,
      data: {
        stats: user.stats,
        totalBookings,
        recentActivity: recentChats,
      },
    });
  })
);

module.exports = {
  chatRouter,
  poiRouter,
  userRouter,
};