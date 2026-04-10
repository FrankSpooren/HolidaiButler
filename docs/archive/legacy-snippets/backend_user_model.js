/**
 * HolidAIButler - User Model
 * Mediterranean AI Travel Platform User Schema
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  // Basic Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Don't return password by default
  },

  // User Profile
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    language: {
      type: String,
      enum: ['en', 'es', 'de', 'nl', 'fr'],
      default: 'en',
    },
    country: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
  },

  // Travel Preferences
  preferences: {
    interests: [{
      type: String,
      enum: ['beaches', 'restaurants', 'cultural', 'museums', 'nightlife', 'activities', 'nature', 'shopping', 'sports'],
      default: ['beaches', 'restaurants', 'cultural'],
    }],
    budget: {
      type: String,
      enum: ['budget', 'moderate', 'luxury'],
      default: 'moderate',
    },
    groupSize: {
      type: Number,
      min: 1,
      max: 20,
      default: 2,
    },
    accessibility: {
      wheelchairAccess: { type: Boolean, default: false },
      visualImpairment: { type: Boolean, default: false },
      hearingImpairment: { type: Boolean, default: false },
    },
    dietary: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
      glutenFree: { type: Boolean, default: false },
      halal: { type: Boolean, default: false },
      kosher: { type: Boolean, default: false },
    },
    accommodation: {
      type: String,
      enum: ['hotel', 'apartment', 'hostel', 'villa', 'any'],
      default: 'any',
    },
    transportation: {
      type: String,
      enum: ['walking', 'car', 'public', 'taxi', 'any'],
      default: 'any',
    },
  },

  // Location Data
  location: {
    current: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: null },
      city: { type: String, default: null },
      region: { type: String, default: null },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    trackingEnabled: {
      type: Boolean,
      default: false,
    },
  },

  // Subscription & Billing
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    billingInfo: {
      email: { type: String, default: null },
      name: { type: String, default: null },
      address: {
        line1: { type: String, default: null },
        line2: { type: String, default: null },
        city: { type: String, default: null },
        postal_code: { type: String, default: null },
        country: { type: String, default: null },
      },
    },
  },

  // Privacy & Consent (GDPR Compliance)
  privacy: {
    allowTracking: {
      type: Boolean,
      required: true,
      default: false,
    },
    allowMarketing: {
      type: Boolean,
      required: true,
      default: false,
    },
    allowDataProcessing: {
      type: Boolean,
      required: true,
      default: true,
    },
    consentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dataRetentionUntil: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
    },
  },

  // Usage Statistics
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 0 },
    favoriteLocations: [{ type: String }],
    mostUsedFeatures: [{
      feature: String,
      count: { type: Number, default: 0 },
    }],
  },

  // Account Security
  security: {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastPasswordChange: { type: Date, default: Date.now },
  },

  // Password Reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },

  // Email Verification
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpiry: { type: Date, default: null },

  // Account Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted', 'pending'],
    default: 'pending',
  },

  // AI Personalization Data
  aiProfile: {
    responseStyle: {
      type: String,
      enum: ['casual', 'formal', 'enthusiastic', 'detailed'],
      default: 'enthusiastic',
    },
    learningEnabled: { type: Boolean, default: true },
    conversationHistory: { type: Number, default: 0 },
    recommendationAccuracy: { type: Number, default: 0 },
    feedbackScore: { type: Number, default: 0 },
  },

  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'social', 'referral'],
    default: 'web',
  },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpiry;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpiry;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'location.current': '2dsphere' });
userSchema.index({ status: 1 });
userSchema.index({ 'subscription.type': 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ referralCode: 1 }, { sparse: true });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for subscription status
userSchema.virtual('subscription.isActive').get(function() {
  if (this.subscription.type === 'free') return true;
  if (!this.subscription.endDate) return false;
  return this.subscription.endDate > new Date();
});

// Virtual for account lock status
userSchema.virtual('security.isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = uuidv4().slice(0, 8).toUpperCase();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 },
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.security.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 },
    $set: { 'stats.lastActive': new Date() },
    $inc: { 'stats.loginCount': 1 },
  });
};

// Instance method to update AI profile
userSchema.methods.updateAIProfile = function(accuracy, feedback) {
  const updates = {
    $inc: { 'aiProfile.conversationHistory': 1 },
  };
  
  if (accuracy !== undefined) {
    updates.$set = { 'aiProfile.recommendationAccuracy': accuracy };
  }
  
  if (feedback !== undefined) {
    updates.$set = { ...updates.$set, 'aiProfile.feedbackScore': feedback };
  }
  
  return this.updateOne(updates);
};

// Instance method to check GDPR data retention
userSchema.methods.isDataRetentionExpired = function() {
  return this.privacy.dataRetentionUntil < new Date();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to find users needing data cleanup (GDPR)
userSchema.statics.findExpiredData = function() {
  return this.find({
    'privacy.dataRetentionUntil': { $lt: new Date() },
    status: { $ne: 'deleted' },
  });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
          },
        },
        premiumUsers: {
          $sum: {
            $cond: [{ $ne: ['$subscription.type', 'free'] }, 1, 0],
          },
        },
        avgLoginCount: { $avg: '$stats.loginCount' },
        avgTotalMessages: { $avg: '$stats.totalMessages' },
      },
    },
  ]);
  
  return stats[0] || {};
};

// Export model
const User = mongoose.model('User', userSchema);
module.exports = User;