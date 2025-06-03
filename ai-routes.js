/**
 * HolidAIButler - AI Routes
 * API endpoints for Claude AI integration
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');

// Services
const ClaudeService = require('../services/ClaudeService');
const CacheService = require('../services/CacheService');
const MonitoringService = require('../services/MonitoringService');

// Models
const { ChatMessage, User, Analytics } = require('../models');

// Utils
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Enhanced rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Different limits based on subscription
    const user = req.user;
    if (user?.subscription?.type === 'premium') return 100;
    if (user?.subscription?.type === 'enterprise') return 200;
    return 30; // free users
  },
  message: (req) => ({
    error: 'AI request limit exceeded',
    retryAfter: 60,
    upgradeMessage: 'Upgrade to Premium for higher limits',
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

/**
 * POST /api/ai/generate
 * Generate AI response for user message
 */
router.post('/generate',
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    body('context').optional().isObject(),
    body('conversation').optional().isString(),
    body('userPreferences').optional().isObject(),
    body('location').optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { message, context, conversation, userPreferences, location } = req.body;
    const userId = req.user.id;
    const startTime = Date.now();

    try {
      // Generate conversation ID if not provided
      const conversationId = req.headers['x-conversation-id'] || 
                            `conv_${userId}_${Date.now()}`;

      // Prepare message data for Claude
      const messageData = {
        message,
        context,
        conversation,
        userPreferences: userPreferences || req.user.preferences,
        location: location || req.user.location?.current,
        userId,
        conversationId,
      };

      // Generate AI response
      const aiResponse = await ClaudeService.processMessage(messageData);

      // Save user message to database
      const userMessage = new ChatMessage({
        userId,
        conversationId,
        type: 'user',
        content: {
          text: message,
          metadata: {},
        },
        context: {
          location: location || req.user.location?.current,
          userPreferences: userPreferences || req.user.preferences,
          timeOfDay: getTimeOfDay(),
        },
      });

      // Save AI response to database
      const aiMessage = new ChatMessage({
        userId,
        conversationId,
        type: 'ai',
        content: {
          text: aiResponse.text,
          metadata: {
            recommendations: aiResponse.recommendations,
            confidence: aiResponse.confidence,
            model: aiResponse.model,
            processingTime: aiResponse.processingTime,
            cached: aiResponse.cached,
            fallback: aiResponse.fallback,
          },
        },
        context: {
          location: location || req.user.location?.current,
          userPreferences: userPreferences || req.user.preferences,
          timeOfDay: getTimeOfDay(),
        },
        analytics: {
          responseTime: aiResponse.processingTime,
        },
      });

      // Save messages in parallel
      await Promise.all([
        userMessage.save(),
        aiMessage.save(),
      ]);

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalMessages': 1 },
        $set: { 'stats.lastActive': new Date() },
      });

      // Log analytics
      await Analytics.create({
        type: 'ai_request',
        userId,
        data: {
          event: 'message_generated',
          category: 'ai_interaction',
          value: aiResponse.processingTime,
          metadata: {
            messageLength: message.length,
            responseLength: aiResponse.text.length,
            recommendationCount: aiResponse.recommendations?.length || 0,
            cached: aiResponse.cached,
            fallback: aiResponse.fallback,
            confidence: aiResponse.confidence,
          },
        },
        performance: {
          responseTime: aiResponse.processingTime,
          cacheHit: aiResponse.cached,
        },
      });

      // Respond with AI message
      res.json({
        success: true,
        data: {
          id: aiMessage._id,
          text: aiResponse.text,
          recommendations: aiResponse.recommendations,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.processingTime,
          cached: aiResponse.cached,
          fallback: aiResponse.fallback,
          conversationId,
        },
        meta: {
          totalProcessingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('AI generation error:', error);

      // Log error analytics
      await Analytics.create({
        type: 'error',
        userId,
        data: {
          event: 'ai_generation_failed',
          category: 'ai_error',
          metadata: {
            error: error.message,
            messageLength: message.length,
          },
        },
        performance: {
          responseTime: Date.now() - startTime,
          errorCode: error.code || 'UNKNOWN',
        },
      });

      res.status(500).json({
        error: 'Failed to generate AI response',
        message: 'Our AI assistant is temporarily unavailable. Please try again in a moment.',
        fallback: true,
        retryAfter: 30,
      });
    }
  })
);

/**
 * GET /api/ai/conversation/:conversationId
 * Get conversation history
 */
router.get('/conversation/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    try {
      const messages = await ChatMessage.find({
        userId,
        conversationId,
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-__v')
      .lean();

      // Reverse to get chronological order
      messages.reverse();

      res.json({
        success: true,
        data: {
          conversationId,
          messages,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: messages.length === parseInt(limit),
          },
        },
      });

    } catch (error) {
      logger.error('Error fetching conversation:', error);
      res.status(500).json({
        error: 'Failed to fetch conversation',
        message: 'Unable to retrieve conversation history',
      });
    }
  })
);

/**
 * GET /api/ai/conversations
 * Get user's conversation list
 */
router.get('/conversations',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    try {
      // Get unique conversation IDs with last message
      const conversations = await ChatMessage.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $last: '$content.text' },
            lastMessageType: { $last: '$type' },
            lastActivity: { $last: '$createdAt' },
            messageCount: { $sum: 1 },
          }
        },
        { $sort: { lastActivity: -1 } },
        { $skip: parseInt(offset) },
        { $limit: parseInt(limit) },
      ]);

      res.json({
        success: true,
        data: {
          conversations: conversations.map(conv => ({
            conversationId: conv._id,
            preview: conv.lastMessage.substring(0, 100) + (conv.lastMessage.length > 100 ? '...' : ''),
            lastMessageType: conv.lastMessageType,
            lastActivity: conv.lastActivity,
            messageCount: conv.messageCount,
          })),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: conversations.length === parseInt(limit),
          },
        },
      });

    } catch (error) {
      logger.error('Error fetching conversations:', error);
      res.status(500).json({
        error: 'Failed to fetch conversations',
      });
    }
  })
);

/**
 * POST /api/ai/feedback
 * Submit feedback for AI response
 */
router.post('/feedback',
  [
    body('messageId').isMongoId().withMessage('Valid message ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('helpful').optional().isBoolean(),
    body('feedback').optional().trim().isLength({ max: 500 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { messageId, rating, helpful, feedback } = req.body;
    const userId = req.user.id;

    try {
      // Update message with feedback
      const message = await ChatMessage.findOneAndUpdate(
        { 
          _id: messageId, 
          userId,
          type: 'ai' 
        },
        {
          $set: {
            'analytics.userRating': rating,
            'analytics.wasHelpful': helpful,
            'analytics.feedback': feedback,
          }
        },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({
          error: 'Message not found',
        });
      }

      // Log feedback analytics
      await Analytics.create({
        type: 'user_interaction',
        userId,
        data: {
          event: 'ai_feedback_submitted',
          category: 'feedback',
          value: rating,
          metadata: {
            messageId,
            helpful,
            feedbackLength: feedback?.length || 0,
            confidence: message.content.metadata?.confidence,
            model: message.content.metadata?.model,
          },
        },
      });

      res.json({
        success: true,
        message: 'Feedback submitted successfully',
      });

    } catch (error) {
      logger.error('Error submitting feedback:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
      });
    }
  })
);

/**
 * DELETE /api/ai/conversation/:conversationId
 * Delete conversation (GDPR compliance)
 */
router.delete('/conversation/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const deleteResult = await ChatMessage.deleteMany({
        userId,
        conversationId,
      });

      // Log deletion for GDPR compliance
      await Analytics.create({
        type: 'user_interaction',
        userId,
        data: {
          event: 'conversation_deleted',
          category: 'privacy',
          value: deleteResult.deletedCount,
          metadata: {
            conversationId,
            gdprRequest: true,
          },
        },
      });

      res.json({
        success: true,
        message: `Deleted ${deleteResult.deletedCount} messages`,
        deletedCount: deleteResult.deletedCount,
      });

    } catch (error) {
      logger.error('Error deleting conversation:', error);
      res.status(500).json({
        error: 'Failed to delete conversation',
      });
    }
  })
);

/**
 * GET /api/ai/stats
 * Get AI usage statistics for user
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const stats = await ChatMessage.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgConfidence: { 
              $avg: '$content.metadata.confidence' 
            },
            avgResponseTime: { 
              $avg: '$content.metadata.processingTime' 
            },
          }
        }
      ]);

      const totalMessages = await ChatMessage.countDocuments({ userId });
      const totalConversations = await ChatMessage.distinct('conversationId', { userId });

      res.json({
        success: true,
        data: {
          totalMessages,
          totalConversations: totalConversations.length,
          messageBreakdown: stats,
          subscription: req.user.subscription,
        },
      });

    } catch (error) {
      logger.error('Error fetching AI stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
      });
    }
  })
);

/**
 * Utility function to get time of day
 */
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

module.exports = router;