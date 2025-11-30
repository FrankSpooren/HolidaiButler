/**
 * Onboarding Routes
 * =================
 * POST /step/:stepNumber, /complete
 * GET /status
 */

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');
const { verifyToken } = require('../middleware/auth');

// All onboarding routes require authentication
router.use(verifyToken);

router.get('/status', onboardingController.getStatus);
router.post('/step/:stepNumber', onboardingController.saveStep);
router.post('/complete', onboardingController.complete);

module.exports = router;
