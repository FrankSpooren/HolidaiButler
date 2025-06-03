/**
 * HolidAIButler - Chat Model
 * Mediterranean AI Travel Platform Chat Schema
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    // AI Model Information
    model: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    processingTime: {
      type: Number, // milliseconds
      default: null,
    },
    tokenUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    
    // Recommendations
    recommendations: [{
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
      name: String,
      category: String,
      rating: Number,
      priceCategory: String,
      distance: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      clicked: { type: Boolean, default: false },
      booked: { type: Boolean, default: false },
    }],
    
    // User Context
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      city: String,
    },
    weather: {
      temperature: Number,
      condition: String,
      humidity: Number,
      windSpeed: Number,
    },
    
    // Suggestions for next questions
    suggestions: [String],
    
    // Error handling
    isError: { type: Boolean, default: false },
    errorType: String,
    fallbackMode: { type: Boolean, default: false },
    
    // User feedback
    feedback: {
      helpful: { type: Boolean, default: null },
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, maxlength: 500, default: null },
      submittedAt: { type: Date, default: null },
    },
  },
}, {
  timestamps: true,
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Chat Session Information
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  
  title: {
    type: String,
    maxlength: 100,
    default: 'New Conversation',
  },
  
  // Messages in the conversation
  messages: [messageSchema],
  
  // Chat Context
  context: {
    // Current location context
    region: {
      type: String,
      default: 'Costa Blanca',
    },
    primaryLanguage: {
      type: String,
      enum: ['en', 'es', 'de', 'nl', 'fr'],
      default: 'en',
    },
    userPreferences: {
      interests: [String],
      budget: String,
      groupSize: Number,
    },
    
    // Conversation topic tracking
    topics: [{
      category: String,
      confidence: Number,
      mentions: Number,
    }],
    
    // Intent tracking
    currentIntent: {
      type: String,
      enum: ['discovery', 'planning', 'booking', 'information', 'navigation'],
      default: 'discovery',
    },
    
    // Trip planning context
    tripContext: {
      dates: {
        arrival: Date,
        departure: Date,
      },
      travelers: Number,
      accommodationType: String,
      budget: Number,
      specialRequests: [String],
    },
  },
  
  // Chat Statistics
  stats: {
    messageCount: { type: Number, default: 0 },
    userMessages: { type: Number, default: 0 },
    assistantMessages: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    totalRecommendations: { type: Number, default: 0 },
    clickedRecommendations: { type: Number, default: 0 },
    bookingConversions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  
  // Chat Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
  },
  
  // Privacy and Retention
  privacy: {
    dataRetentionUntil: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
    },
    anonymized: { type: Boolean, default: false },
    canBeUsedForTraining: { type: Boolean, default: false },
  },
  
  // Metadata
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  
  // Device and platform information
  deviceInfo: {
    platform: String,
    version: String,
    userAgent: String,
  },
  
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for performance
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ sessionId: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ 'context.region': 1 });
chatSchema.index({ 'privacy.dataRetentionUntil': 1 });

// Compound indexes
chatSchema.index({ userId: 1, status: 1, lastActivity: -1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for last message
chatSchema.virtual('lastMessage').get(function() {
  return this.messages[this.messages.length - 1];
});

// Virtual for conversation duration
chatSchema.virtual('duration').get(function() {
  if (this.messages.length < 2) return 0;
  const first = this.messages[0].timestamp;
  const last = this.messages[this.messages.length - 1].timestamp;
  return last - first;
});

// Pre-save middleware to update stats
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.updateStats();
    this.lastActivity = new Date();
    
    // Auto-generate title from first user message
    if (!this.title || this.title === 'New Conversation') {
      const firstUserMessage = this.messages.find(m => m.type === 'user');
      if (firstUserMessage) {
        this.title = firstUserMessage.content.substring(0, 50) + 
          (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }
  }
  next();
});

// Instance method to add a message
chatSchema.methods.addMessage = function(type, content, metadata = {}) {
  const message = {
    type,
    content,
    timestamp: new Date(),
    metadata,
  };
  
  this.messages.push(message);
  this.updateStats();
  this.lastActivity = new Date();
  
  return this.save();
};

// Instance method to update statistics
chatSchema.methods.updateStats = function() {
  const messages = this.messages;
  
  this.stats.messageCount = messages.length;
  this.stats.userMessages = messages.filter(m => m.type === 'user').length;
  this.stats.assistantMessages = messages.filter(m => m.type === 'assistant').length;
  
  // Calculate total tokens
  this.stats.totalTokens = messages.reduce((total, msg) => {
    return total + (msg.metadata?.tokenUsage?.totalTokens || 0);
  }, 0);
  
  // Calculate average response time
  const responseTimes = messages
    .filter(m => m.metadata?.processingTime)
    .map(m => m.metadata.processingTime);
  
  if (responseTimes.length > 0) {
    this.stats.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }
  
  // Count recommendations
  const allRecommendations = messages.reduce((total, msg) => {
    return total + (msg.metadata?.recommendations?.length || 0);
  }, 0);
  this.stats.totalRecommendations = allRecommendations;
  
  // Count clicked recommendations
  const clickedRecommendations = messages.reduce((total, msg) => {
    if (!msg.metadata?.recommendations) return total;
    return total + msg.metadata.recommendations.filter(r => r.clicked).length;
  }, 0);
  this.stats.clickedRecommendations = clickedRecommendations;
  
  // Count booking conversions
  const bookingConversions = messages.reduce((total, msg) => {
    if (!msg.metadata?.recommendations) return total;
    return total + msg.metadata.recommendations.filter(r => r.booked).length;
  }, 0);
  this.stats.bookingConversions = bookingConversions;
  
  // Calculate average rating
  const ratings = messages
    .filter(m => m.metadata?.feedback?.rating)
    .map(m => m.metadata.feedback.rating);
  
  if (ratings.length > 0) {
    this.stats.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }
};

// Instance method to mark recommendation as clicked
chatSchema.methods.markRecommendationClicked = function(messageIndex, recommendationIndex) {
  if (this.messages[messageIndex]?.metadata?.recommendations?.[recommendationIndex]) {
    this.messages[messageIndex].metadata.recommendations[recommendationIndex].clicked = true;
    this.updateStats();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to mark recommendation as booked
chatSchema.methods.markRecommendationBooked = function(messageIndex, recommendationIndex) {
  if (this.messages[messageIndex]?.metadata?.recommendations?.[recommendationIndex]) {
    this.messages[messageIndex].metadata.recommendations[recommendationIndex].booked = true;
    this.updateStats();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to add feedback to a message
chatSchema.methods.addMessageFeedback = function(messageIndex, feedback) {
  if (this.messages[messageIndex]) {
    this.messages[messageIndex].metadata.feedback = {
      ...feedback,
      submittedAt: new Date(),
    };
    this.updateStats();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to get conversation summary
chatSchema.methods.getSummary = function() {
  const userMessages = this.messages.filter(m => m.type === 'user');
  const topics = [...new Set(
    this.context.topics.map(t => t.category)
  )];
  
  return {
    title: this.title,
    messageCount: this.messages.length,
    userQuestions: userMessages.length,
    duration: this.duration,
    topics,
    lastActivity: this.lastActivity,
    stats: this.stats,
  };
};

// Static method to find user's recent chats
chatSchema.statics.findUserRecent = function(userId, limit = 10) {
  return this.find({ 
    userId, 
    status: 'active' 
  })
  .sort({ lastActivity: -1 })
  .limit(limit)
  .populate('userId', 'profile.firstName profile.lastName');
};

// Static method to find chats needing cleanup (GDPR)
chatSchema.statics.findExpiredChats = function() {
  return this.find({
    'privacy.dataRetentionUntil': { $lt: new Date() },
    status: { $ne: 'deleted' },
  });
};

// Static method to get chat analytics
chatSchema.statics.getChatAnalytics = async function(dateRange = {}) {
  const match = {
    status: 'active',
    ...dateRange,
  };
  
  const analytics = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalChats: { $sum: 1 },
        totalMessages: { $sum: '$stats.messageCount' },
        totalUserMessages: { $sum: '$stats.userMessages' },
        totalTokens: { $sum: '$stats.totalTokens' },
        averageMessagesPerChat: { $avg: '$stats.messageCount' },
        averageResponseTime: { $avg: '$stats.averageResponseTime' },
        totalRecommendations: { $sum: '$stats.totalRecommendations' },
        totalClicked: { $sum: '$stats.clickedRecommendations' },
        totalBooked: { $sum: '$stats.bookingConversions' },
        averageRating: { $avg: '$stats.averageRating' },
      },
    },
  ]);
  
  return analytics[0] || {};
};

// Export model
const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;