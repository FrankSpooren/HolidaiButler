/**
 * Authentication Routes
 * ====================
 * POST /signup, /login, /logout, /refresh-token
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, authRateLimiter } = require('../middleware/auth');

// Public routes with rate limiting for security
router.post('/signup', authRateLimiter, authController.signup);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh-token', authRateLimiter, authController.refreshToken);

// Protected routes
router.post('/logout', verifyToken, authController.logout);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authRateLimiter, authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
