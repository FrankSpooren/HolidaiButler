/**
 * Ticketing Module - API Routes Index
 * Aggregates all route modules for the ticketing system
 *
 * Mount at: /api/v1/ticketing
 */

const express = require('express');
const router = express.Router();
const ticketsRouter = require('./tickets');

/**
 * Mount all route modules
 * Base path: /api/v1/ticketing
 *
 * Examples:
 * - POST /api/v1/ticketing/availability/check
 * - POST /api/v1/ticketing/bookings
 * - GET  /api/v1/ticketing/tickets/user/:userId
 */
router.use('/', ticketsRouter);

module.exports = router;
