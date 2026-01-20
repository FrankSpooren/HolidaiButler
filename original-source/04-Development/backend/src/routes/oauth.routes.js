/**
 * OAuth Routes
 * =============
 * POST /auth/oauth/facebook, /auth/oauth/apple
 */

const express = require('express');
const router = express.Router();
const oauthController = require('../controllers/oauth.controller');
const { authRateLimiter } = require('../middleware/auth');

// OAuth routes with rate limiting
router.post('/facebook', authRateLimiter, oauthController.facebookAuth);
router.post('/apple', authRateLimiter, oauthController.appleAuth);

module.exports = router;
