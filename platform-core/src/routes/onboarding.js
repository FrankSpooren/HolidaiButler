/**
 * Onboarding Routes
 * User onboarding flow endpoints
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as onboardingController from '../controllers/onboarding.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/onboarding/status
 * @desc    Get user's onboarding progress
 * @access  Private
 */
router.get('/status', authenticate, onboardingController.getStatus);

/**
 * @route   POST /api/v1/onboarding/step/:stepNumber
 * @desc    Save onboarding step data
 * @access  Private
 */
router.post('/step/:stepNumber', authenticate, onboardingController.saveStep);

/**
 * @route   POST /api/v1/onboarding/complete
 * @desc    Mark onboarding as complete
 * @access  Private
 */
router.post('/complete', authenticate, onboardingController.complete);

export default router;
