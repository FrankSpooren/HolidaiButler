/**
 * HolidaiButler - Chat Routes
 * AI conversation and recommendation endpoints
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Models
const { User, Conversation, Analytics } = require('../models');

// Services
const ClaudeService = require('../services/ClaudeService');
const POIService = require('../services/POIService');
const WeatherService = require('../services/WeatherService');

// Utils
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    error: 'Too many chat messages',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/chat/message
 * Send message to AI assistant
 */
router.post('/message',
  chatLimiter,
  [
    body('message')
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1-1000 characters'),
    body('conversationId')
      .optional()
      .isMongoId()
      .withMessage('Invalid conversation ID'),
    body('location')
      .optional()
      .isObject(),
    body('context')
      .optional()
      .isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { message, conversationId, location, context } = req.body;
    const userId = req.user.id;

    try {
      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await Conversation.findOne({
          _id: conversationId,
          userId,
        });
        
        if (!conversation) {
          return res.status(404).json({
            error: 'Conversation not found',
          });
        }
      } else {
        conversation = new Conversation({
          userId,
          messages: [],
          context: {
            location,
            preferences: req.user.preferences,
          },
        });
      }

      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Get user preferences
      const user = await User.findById(userId);
      
      // Process message with Claude
      const aiResponse = await ClaudeService.processMessage({
        message,
        context: {
          ...context,
          location,
          userPreferences: user.preferences,
        },
        conversation: conversation.messages
          .slice(-10) // Last 10 messages for context
          .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
          .join('\n'),
        userPreferences: user.preferences,
        location,
      });

      // Add AI response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date(),
        metadata: {
          aiModel: aiResponse.model,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.processingTime,
          recommendations: aiResponse.recommendations,
          suggestions: aiResponse.suggestions || [
            "What are the best beaches nearby?",
            "Recommend a restaurant for dinner",
            "What cultural activities are available?",
            "How's the weather today?",
          ],
          isError: !!aiResponse.fallback,
          fallbackMode: !!aiResponse.fallback,
        },
      });

      // Update conversation activity
      conversation.lastActivity = new Date();
      await conversation.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalConversations': conversationId ? 0 : 1 },
        'stats.lastActive': new Date(),
      });

      // Log analytics
      await Analytics.create({
        type: 'ai_request',
        userId,
        data: {
          event: 'message_processed',
          category: 'chat',
          value: message.length,
          metadata: {
            conversationId: conversation._id,
            aiModel: aiResponse.model,
            confidence: aiResponse.confidence,
            processingTime: aiResponse.processingTime,
            hasRecommendations: aiResponse.recommendations?.length > 0,
            fallbackMode: !!aiResponse.fallback,
          },
        },
        location: location,
      });

      res.json({
        success: true,
        data: {
          conversationId: conversation._id,
          message: {
            id: conversation.messages[conversation.messages.length - 1]._id,
            text: aiResponse.text,
            timestamp: new Date(),
            metadata: conversation.messages[conversation.messages.length - 1].metadata,
          },
          recommendations: aiResponse.recommendations || [],
          suggestions: conversation.messages[conversation.messages.length - 1].metadata.suggestions,
        },
      });

    } catch (error) {
      logger.error('Chat message error:', error);
      
      // Log error analytics
      await Analytics.create({
        type: 'error',
        userId,
        data: {
          event: 'chat_error',
          category: 'ai_processing',
          metadata: {
            error: error.message,
            stack: error.stack,
          },
        },
      });

      res.status(500).json({
        error: 'Failed to process message',
        message: 'Our AI assistant is temporarily unavailable. Please try again.',
        fallback: true,
      });
    }
  })
);

/**
 * GET /api/chat/conversations
 * Get user's conversations
 */
router.get('/conversations',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    try {
      const conversations = await Conversation.find({
        userId,
        status: 'active',
      })
        .sort({ lastActivity: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('_id lastActivity messages')
        .lean();

      // Add conversation summaries
      const conversationsWithSummary = conversations.map(conv => {
        const lastMessage = conv.messages[conv.messages.length - 1];
        const firstUserMessage = conv.messages.find(msg => msg.role === 'user');
        
        return {
          id: conv._id,
          lastActivity: conv.lastActivity,
          summary: firstUserMessage?.content?.substring(0, 100) + '...' || 'New conversation',
          messageCount: conv.messages.length,
          lastMessage: lastMessage?.content?.substring(0, 150) + '...' || '',
        };
      });

      res.json({
        success: true,
        data: {
          conversations: conversationsWithSummary,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: conversations.length === parseInt(limit),
          },
        },
      });

    } catch (error) {
      logger.error('Get conversations error:', error);
      res.status(500).json({
        error: 'Failed to fetch conversations',
      });
    }
  })
);

/**
 * GET /api/chat/conversations/:id
 * Get specific conversation
 */
router.get('/conversations/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const conversation = await Conversation.findOne({
        _id: id,
        userId,
        status: 'active',
      }).lean();

      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
        });
      }

      res.json({
        success: true,
        data: {
          conversation,
        },
      });

    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to fetch conversation',
      });
    }
  })
);

/**
 * DELETE /api/chat/conversations/:id
 * Delete conversation
 */
router.delete('/conversations/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const conversation = await Conversation.findOneAndUpdate(
        { _id: id, userId },
        { status: 'deleted' },
        { new: true }
      );

      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted',
      });

    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        error: 'Failed to delete conversation',
      });
    }
  })
);

/**
 * POST /api/chat/feedback
 * Provide feedback on AI response
 */
router.post('/feedback',
  [
    body('messageId')
      .isMongoId()
      .withMessage('Valid message ID required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1-5'),
    body('feedback')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Feedback must be less than 500 characters'),
  ],
  asyncHandler(async (req, res) => {
    const { messageId, rating, feedback } = req.body;
    const userId = req.user.id;

    try {
      // Find conversation with the message
      const conversation = await Conversation.findOne({
        userId,
        'messages._id': messageId,
      });

      if (!conversation) {
        return res.status(404).json({
          error: 'Message not found',
        });
      }

      // Log feedback analytics
      await Analytics.create({
        type: 'user_interaction',
        userId,
        data: {
          event: 'ai_feedback',
          category: 'quality',
          value: rating,
          metadata: {
            messageId,
            feedback,
            conversationId: conversation._id,
          },
        },
      });

      res.json({
        success: true,
        message: 'Feedback recorded',
      });

    } catch (error) {
      logger.error('Feedback error:', error);
      res.status(500).json({
        error: 'Failed to record feedback',
      });
    }
  })
);

module.exports = router;