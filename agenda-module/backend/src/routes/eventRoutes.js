const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

/**
 * Event Routes
 * Base path: /api/agenda
 */

// Public routes
router.get('/events', eventController.getEvents);
router.get('/events/featured', eventController.getFeaturedEvents);
router.get('/events/slug/:slug', eventController.getEventBySlug);
router.get('/events/:id', eventController.getEventById);
router.get('/stats', eventController.getStatistics);

// Admin routes (require authentication)
// TODO: Add authentication middleware
router.post('/events', eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

module.exports = router;
