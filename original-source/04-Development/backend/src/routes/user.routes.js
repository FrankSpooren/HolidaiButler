/**
 * User Routes
 * ===========
 * GET/PATCH/DELETE /me, /me/preferences, /me/saved-pois
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');

// All user routes require authentication
router.use(verifyToken);

// Profile routes
router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.delete('/me', userController.deleteAccount);

// Preferences routes
router.get('/me/preferences', userController.getPreferences);
router.patch('/me/preferences', userController.updatePreferences);

// Saved POIs routes
router.get('/me/saved-pois', userController.getSavedPOIs);
router.post('/me/saved-pois', userController.savePOI);
router.delete('/me/saved-pois/:id', userController.unsavePOI);

// Interaction history
router.get('/me/history', userController.getInteractionHistory);

module.exports = router;
