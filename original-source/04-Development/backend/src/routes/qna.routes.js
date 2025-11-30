/**
 * Q&A Routes
 * ==========
 * GET/POST /qna (questions & answers for POIs)
 */

const express = require('express');
const router = express.Router();
const qnaController = require('../controllers/qna.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, qnaController.getQnAs);

// Protected routes
router.post('/', verifyToken, qnaController.addQnA);

module.exports = router;
