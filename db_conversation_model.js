/**
 * HolidAIButler - Conversation Model
 * MongoDB schema for AI chat conversations with GDPR compliance
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  
  // AI Response Metadata
  metadata: {
    // AI Model Info
    model: {
      type: String,
      default: 'claude-3-5-sonnet',
    },
    processingTime: Number, // milliseconds
    tokenUsage: {
      input: Number,
      output: Number,
      total: Number,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    
    // Fallback & Error Handling
    fallbackUsed: { type: Boolean, default: false },
    cached: { type: Boolean, default: false },
    error: String,
    retryCount: { type: Number, default: 0 },
    
    // Recommendations
    recommendations: [{
      poiId: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
      name: String,
      category: String,
      rating: Number,
      priceCategory: String,
      distance: String,
      confidence: Number,
      reason: String, // Why this was recommended
    }],
    
    // Context Used
    contextUsed: {
      location: {
        name: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
      weather: {
        temperature: Number,
        condition: String,
        timestamp: Date,
      },
      timeOfDay: String,
      userPreferences: [String],
    },
    
    // User Feedback
    feedback: {
      helpful: Boolean,
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      timestamp: Date,
    },
  },
  
  // Content Analysis
  analysis: {
    intent: {
      type: String,
      enum: [
        'greeting', 'restaurant_search', 'activity_search', 'beach_recommendation',
        'hotel_search', 'transportation', 'cultural_info', 'weather_query',
        'booking_request', 'general_info', 'complaint', 'compliment', 'other'
      ],
    },
    entities: [{
      type: String, // location, cuisine, activity, etc.
      value: String,
      confidence: Number,
    }],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
    },
    language: {
      type: String,
      enum: ['en', 'es', 'de', 'nl', 'fr'],
      default: 'en',
    },
  },
}, {
  _id: false,
});

const conversationSchema = new mongoose.Schema({
  // Core Identification
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  
  // Conversation Metadata
  title: {
    type: String,
    maxlength: 200,
    default: 'Travel Conversation',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'archived'],
    default: 'active',
  },
  
  // Messages Array
  messages: [messageSchema],
  
  // Conversation Context
  context: {
    // Trip Planning Context
    trip: {
      destination: String,
      startDate: Date,
      endDate: Date,
      travelers: Number,
      budget: String,
      tripType: String, // family, romantic, business, adventure
    },
    
    // User Location Context
    userLocation: {
      current: {
        latitude: Number,
        longitude: Number,
        name: String,
        timestamp: Date,
      },
      destination: {
        latitude: Number,
        longitude: Number,
        name: String,
      },
    },
    
    // Preferences for this conversation
    preferences: {
      interests: [String],
      budget: String,
      groupSize: Number,
      accessibility: {
        wheelchairAccess: Boolean,
        dietaryRestrictions: [String],
      },
    },
    
    // Environmental Context
    environment: {
      weather: {
        temperature: Number,
        condition: String,
        timestamp: Date,
      },
      timeOfDay: String,
      season: String,
    },
  },
  
  // Conversation Analytics
  analytics: {
    // Performance Metrics
    totalMessages: { type: Number, default: 0 },
    userMessages: { type: Number, default: 0 },
    aiMessages: { type: Number, default: 0 },
    
    // Quality Metrics
    averageResponseTime: Number, // milliseconds
    averageConfidence: Number,
    fallbackCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    
    // Engagement Metrics
    duration: Number, // total conversation time in seconds
    lastActivity: Date,
    messageFrequency: Number, // messages per minute
    
    // Outcome Metrics
    recommendationsGiven: { type: Number, default: 0 },
    recommendationsClicked: { type: Number, default: 0 },
    bookingsMade: { type: Number, default: 0 },
    userSatisfaction: Number, // 1-5 rating
    
    // User Feedback
    feedback: {
      overall: { type: Number, min: 1, max: 5 },
      helpfulness: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      speed: { type: Number, min: 1, max: 5 },
      comment: String,
      timestamp: Date,
    },
  },
  
  // Technical Metadata
  technical: {
    // Device & Platform
    platform: String, // ios, android, web
    deviceInfo: {
      userAgent: String,
      screen: {
        width: Number,
        height: Number,
      },
      os: String,
      browser: String,
    },
    
    // Network & Performance
    connectionType: String, // wifi, cellular, offline
    averageLatency: Number,
    dataUsage: Number, // bytes
    
    // AI Model Performance
    aiStats: {
      totalTokens: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 }, // in EUR
      cacheHitRate: Number,
      averageProcessingTime: Number,
    },
  },
  
  // GDPR & Privacy
  privacy: {
    dataRetention: {
      deleteAfter: {
        type: Date,
        default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
      },
      anonymizeAfter: {
        type: Date,
        default: () => new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    },
    consentGiven: {
      dataProcessing: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      aiTraining: { type: Boolean, default: false },
    },
    anonymized: { type: Boolean, default: false },
  },
  
  // Business Intelligence
  business: {
    // Lead Generation
    leadScore: { type: Number, min: 0, max: 100, default: 0 },
    conversionPotential: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    
    // Partner References
    partnersRecommended: [{
      partnerId: String,
      partnerName: String,
      category: String,
      timestamp: Date,
    }],
    
    // Revenue Attribution
    bookingValue: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 },
    partnerRevenue: { type: Number, default: 0 },
  },

}, {
  timestamps: true,
  collection: 'conversations',
});

// Indexes for performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ status: 1, updatedAt: -1 });
conversationSchema.index({ 'analytics.lastActivity': -1 });
conversationSchema.index({ 'privacy.dataRetention.deleteAfter': 1 });
conversationSchema.index({ 'messages.timestamp': -1 });

// Virtual for conversation summary
conversationSchema.virtual('summary').get(function() {
  const firstMessage = this.messages.find(m => m.type === 'user');
  const lastMessage = this.messages[this.messages.length - 1];
  
  return {
    started: this.createdAt,
    lastActivity: lastMessage?.timestamp || this.updatedAt,
    messageCount: this.messages.length,
    userQuery: firstMessage?.content?.substring(0, 100) + '...' || 'No messages',
    duration: this.analytics.duration,
    satisfaction: this.analytics.feedback?.overall,
  };
});

// Pre-save middleware to update analytics
conversationSchema.pre('save', function(next) {
  // Update message counts
  this.analytics.totalMessages = this.messages.length;
  this.analytics.userMessages = this.messages.filter(m => m.type === 'user').length;
  this.analytics.aiMessages = this.messages.filter(m => m.type === 'ai').length;
  
  // Update last activity
  if (this.messages.length > 0) {
    this.analytics.lastActivity = this.messages[this.messages.length - 1].timestamp;
  }
  
  // Calculate conversation duration
  if (this.messages.length > 1) {
    const start = this.messages[0].timestamp;
    const end = this.messages[this.messages.length - 1].timestamp;
    this.analytics.duration = Math.floor((end - start) / 1000);
  }
  
  // Update recommendations count
  this.analytics.recommendationsGiven = this.messages.reduce((count, msg) => {
    return count + (msg.metadata?.recommendations?.length || 0);
  }, 0);
  
  // Calculate average response time and confidence
  const aiMessages = this.messages.filter(m => m.type === 'ai' && m.metadata);
  if (aiMessages.length > 0) {
    this.analytics.averageResponseTime = aiMessages.reduce((sum, msg) => {
      return sum + (msg.metadata.processingTime || 0);
    }, 0) / aiMessages.length;
    
    this.analytics.averageConfidence = aiMessages.reduce((sum, msg) => {
      return sum + (msg.metadata.confidence || 0);
    }, 0) / aiMessages.length;
  }
  
  next();
});

// Method to add message
conversationSchema.methods.addMessage = function(messageData) {
  const message = {
    id: messageData.id || Date.now().toString(),
    type: messageData.type,
    content: messageData.content,
    timestamp: messageData.timestamp || new Date(),
    metadata: messageData.metadata || {},
    analysis: messageData.analysis || {},
  };
  
  this.messages.push(message);
  return this.save();
};

// Method to get conversation for AI context
conversationSchema.methods.getAIContext = function(maxMessages = 10) {
  const recentMessages = this.messages
    .slice(-maxMessages)
    .map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  
  return {
    messages: recentMessages,
    context: this.context,
    analytics: {
      totalMessages: this.analytics.totalMessages,
      averageConfidence: this.analytics.averageConfidence,
    },
  };
};

// Method to update user feedback
conversationSchema.methods.addFeedback = function(feedback) {
  this.analytics.feedback = {
    ...feedback,
    timestamp: new Date(),
  };
  
  // Calculate overall satisfaction
  const scores = [feedback.helpfulness, feedback.accuracy, feedback.speed].filter(Boolean);
  if (scores.length > 0) {
    this.analytics.userSatisfaction = scores.reduce((a, b) => a + b) / scores.length;
  }
  
  return this.save();
};

// Method to anonymize conversation (GDPR)
conversationSchema.methods.anonymize = function() {
  // Remove personal information but keep analytics
  this.messages.forEach(msg => {
    if (msg.type === 'user') {
      // Keep general intent but remove specific personal details
      msg.content = '[User message - anonymized]';
    }
    
    // Remove location data
    if (msg.metadata?.contextUsed?.location) {
      delete msg.metadata.contextUsed.location;
    }
  });
  
  // Clear personal context
  this.context.userLocation = {};
  this.privacy.anonymized = true;
  
  return this.save();
};

// Method to export data (GDPR)
conversationSchema.methods.exportData = function() {
  return {
    conversationId: this._id,
    userId: this.userId,
    exportDate: new Date(),
    messages: this.messages.map(msg => ({
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp,
      feedback: msg.metadata?.feedback,
    })),
    analytics: this.analytics,
    context: this.context,
    feedback: this.analytics.feedback,
  };
};

// Static method to find user conversations
conversationSchema.statics.findByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('title status analytics.lastActivity analytics.totalMessages createdAt');
};

// Static method to get conversation analytics
conversationSchema.statics.getAnalytics = function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.start) {
    matchStage.createdAt = { $gte: dateRange.start };
  }
  if (dateRange.end) {
    matchStage.createdAt = { ...matchStage.createdAt, $lte: dateRange.end };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        averageDuration: { $avg: '$analytics.duration' },
        averageSatisfaction: { $avg: '$analytics.userSatisfaction' },
        totalRecommendations: { $sum: '$analytics.recommendationsGiven' },
        totalBookings: { $sum: '$analytics.bookingsMade' },
        conversionRate: {
          $avg: {
            $cond: [
              { $gt: ['$analytics.recommendationsGiven', 0] },
              { $divide: ['$analytics.bookingsMade', '$analytics.recommendationsGiven'] },
              0
            ]
          }
        },
      }
    }
  ]);
};

// Static method to clean up old conversations (GDPR compliance)
conversationSchema.statics.cleanupExpired = function() {
  const now = new Date();
  
  return Promise.all([
    // Delete conversations past retention period
    this.deleteMany({
      'privacy.dataRetention.deleteAfter': { $lt: now }
    }),
    
    // Anonymize conversations past anonymization period
    this.updateMany(
      {
        'privacy.dataRetention.anonymizeAfter': { $lt: now },
        'privacy.anonymized': false
      },
      {
        $set: { 'privacy.anonymized': true }
      }
    )
  ]);
};

module.exports = mongoose.model('Conversation', conversationSchema);