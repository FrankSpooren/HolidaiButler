/**
 * API Routes Index
 * ================
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const oauthRoutes = require('./oauth.routes');
const userRoutes = require('./user.routes');
const poiRoutes = require('./poi.routes');
const qnaRoutes = require('./qna.routes');
const onboardingRoutes = require('./onboarding.routes');
const categoryRoutes = require('./category.routes');
const permissionsRoutes = require('./permissions.routes');
const holibotRoutes = require('./holibot.routes');
const chatRoutes = require('./chat');

// ==============================================================================
// TICKETING MODULE INTEGRATION (Enterprise DI Pattern)
// ==============================================================================
// Initialize ticketing models with shared Sequelize instance and models
const { sequelize, User, POI } = require('../models/sequelize');
const ticketingModels = require('../../../ticketing-module/backend/models-sequelize');

// Initialize ticketing with dependency injection
ticketingModels.initialize(sequelize, { User, POI });

// Import ticketing routes (models are now initialized)
const ticketingRoutes = require('../../../ticketing-module/backend/routes');

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'HolidAIbutler API v1',
      version: '1.0.0',
      documentation: '/api/v1/docs',
      endpoints: {
        auth: '/api/v1/auth',
        oauth: '/api/v1/auth/oauth',
        users: '/api/v1/users',
        pois: '/api/v1/pois',
        qna: '/api/v1/qna',
        onboarding: '/api/v1/onboarding',
        categories: '/api/v1/categories',
        permissions: '/api/v1/permissions',
        holibot: '/api/v1/holibot',
        chat: '/api/v1/chat',
        ticketing: '/api/v1/ticketing'
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/users', userRoutes);
router.use('/pois', poiRoutes);
router.use('/qna', qnaRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/categories', categoryRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/holibot', holibotRoutes);
router.use('/chat', chatRoutes);
router.use('/ticketing', ticketingRoutes);

module.exports = router;
