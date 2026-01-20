/**
 * HoliBot Routes
 * =============
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

const express = require('express');
const router = express.Router();
const holibotController = require('../controllers/holibot.controller');
const { optionalAuth } = require('../middleware/auth');

// ============================================
// HOLIBOT API ENDPOINTS
// ============================================

// Chat endpoint - Mistral AI integration
// POST /api/v1/holibot/chat
router.post('/chat', optionalAuth, holibotController.chat);

// Get categories with POI counts
// GET /api/v1/holibot/categories
router.get('/categories', holibotController.getCategories);

// Search POIs based on chat query/filters
// GET /api/v1/holibot/pois?category=restaurant&query=italian
router.get('/pois', optionalAuth, holibotController.searchPOIs);

// Get personality-aware recommendations
// POST /api/v1/holibot/recommendations
router.post('/recommendations', optionalAuth, holibotController.getRecommendations);

// Get POI reviews & trust signals
// GET /api/v1/holibot/pois/:id/reviews
router.get('/pois/:id/reviews', holibotController.getPOIReviews);

// Get personalized daily tip
// GET /api/v1/holibot/daily-tip
router.get('/daily-tip', optionalAuth, holibotController.getDailyTip);

module.exports = router;
