const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

/**
 * Event Routes with Swagger Documentation
 * Base path: /api/agenda
 */

/**
 * @swagger
 * /api/agenda/events:
 *   get:
 *     summary: Get events with filtering and pagination
 *     description: Retrieve a list of events with comprehensive filtering options including date range, category, audience, location, and more. Supports pagination and sorting.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [upcoming, today, thisWeek, thisMonth]
 *         description: Quick date range filter
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events starting from this date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events ending before this date (ISO 8601)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [culture, beach, active-sports, relaxation, food-drink, nature, entertainment, folklore, festivals, tours, workshops, markets, sports-events, exhibitions, music, family]
 *         description: Filter by primary category
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories to filter by
 *       - in: query
 *         name: audience
 *         schema:
 *           type: string
 *           enum: [families-with-kids, couples, friends, solo-travelers, seniors, young-adults, all-ages]
 *         description: Filter by target audience
 *       - in: query
 *         name: timeOfDay
 *         schema:
 *           type: string
 *           enum: [morning, afternoon, evening, night, all-day]
 *         description: Filter by time of day
 *       - in: query
 *         name: isFree
 *         schema:
 *           type: boolean
 *         description: Filter free events only
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search in title, description, and location
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: startDate
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [nl, en, es, de, fr]
 *           default: nl
 *         description: Preferred language for content
 *     responses:
 *       200:
 *         description: Successful response with events list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventList'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/events', eventController.getEvents);

/**
 * @swagger
 * /api/agenda/events/featured:
 *   get:
 *     summary: Get featured events
 *     description: Retrieve a list of featured/highlighted events curated for homepage display
 *     tags: [Featured]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 20
 *         description: Maximum number of featured events to return
 *     responses:
 *       200:
 *         description: Successful response with featured events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/events/featured', eventController.getFeaturedEvents);

/**
 * @swagger
 * /api/agenda/events/slug/{slug}:
 *   get:
 *     summary: Get event by SEO-friendly slug
 *     description: Retrieve a single event using its URL-friendly slug
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Event slug (e.g., "summer-festival-by-the-sea")
 *     responses:
 *       200:
 *         description: Successful response with event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/events/slug/:slug', eventController.getEventBySlug);

/**
 * @swagger
 * /api/agenda/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     description: Retrieve detailed information about a specific event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the event
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [nl, en, es, de, fr]
 *         description: Preferred language
 *     responses:
 *       200:
 *         description: Successful response with event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/events/:id', eventController.getEventById);

/**
 * @swagger
 * /api/agenda/stats:
 *   get:
 *     summary: Get event statistics
 *     description: Retrieve aggregated statistics about events including counts by category, date ranges, and verification status
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Successful response with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Statistics'
 */
router.get('/stats', eventController.getStatistics);

/**
 * @swagger
 * /api/agenda/events:
 *   post:
 *     summary: Create new event (Admin only)
 *     description: Create a new event in the system. Requires admin authentication.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/events', eventController.createEvent);

/**
 * @swagger
 * /api/agenda/events/{id}:
 *   put:
 *     summary: Update event (Admin only)
 *     description: Update an existing event. Requires admin authentication.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/events/:id', eventController.updateEvent);

/**
 * @swagger
 * /api/agenda/events/{id}:
 *   delete:
 *     summary: Delete event (Admin only)
 *     description: Soft delete an event (archives it). Requires admin authentication.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/events/:id', eventController.deleteEvent);

module.exports = router;
