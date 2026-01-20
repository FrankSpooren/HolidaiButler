/**
 * POI Routes
 * ==========
 * GET /pois, /pois/:id, /pois/google/:placeid, /pois/geojson
 * GET /pois/search, /pois/autocomplete (NEW - Enterprise search)
 */

const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poi.controller');
const searchController = require('../controllers/poi.search.controller');
const reviewController = require('../controllers/review.controller');
const { optionalAuth } = require('../middleware/auth');

// Search routes (MUST be before /:id to avoid route conflicts)
router.get('/search', optionalAuth, searchController.searchPOIs);
router.get('/autocomplete', optionalAuth, searchController.autocompletePOIs);
router.get('/search/suggestions', optionalAuth, searchController.searchSuggestions);

// Public routes (with optional auth for personalization)
router.get('/', optionalAuth, poiController.getPOIs);
router.get('/geojson', optionalAuth, poiController.getPOIsGeoJSON);
router.get('/google/:placeid', optionalAuth, poiController.getPOIByGooglePlaceId);

// Review sub-routes (Sprint 7.6) - MUST be before /:id to avoid route conflicts
router.get('/:id/reviews/summary', optionalAuth, reviewController.getReviewSummary);
router.get('/:id/reviews/insights', optionalAuth, reviewController.getReviewInsights);
router.get('/:id/reviews', optionalAuth, reviewController.getReviews);
router.post('/:id/reviews/:reviewId/helpful', optionalAuth, reviewController.markReviewHelpful);

// Q&A sub-routes
router.get('/:id/qna', poiController.getPOIQnA);

// General POI route (MUST be last to avoid conflicts)
router.get('/:id', optionalAuth, poiController.getPOIById);

module.exports = router;
