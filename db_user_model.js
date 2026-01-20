/**
 * HolidAIButler - User Model
 * MongoDB schema for user accounts with GDPR compliance
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  // Core Identity
  _id: {
    type: String,
    default: uuidv4,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Don't include in queries by default
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
    language: {
      type: String,
      enum: ['en', 'es', 'de', 'nl', 'fr'],
      default: 'en',
    },
    avatar: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
  },

  // Travel Preferences
  preferences: {
    interests: [{
      type: String,
      enum: [
        'beaches', 'restaurants', 'cultural', 'nightlife', 
        'museums', 'activities', 'nature', 'shopping', 
        'sports', 'family', 'romantic', 'adventure'
      ],
    }],
    budget: {
      type: String,
      enum: ['budget', 'moderate', 'luxury', 'premium'],
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
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'lactose-free'],
    }],
  },

  // GDPR Privacy Settings
  privacy: {
    allowTracking: {
      type: Boolean,
      required: true,
    },
    allowMarketing: {
      type: Boolean,
      required: true,
    },
    allowDataSharing: {
      type: Boolean,
      default: false,
    },
    consentDate: {
      type: Date,
      required: true,
    },
    consentVersion: {
      type: String,
      default: '1.0',
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
    features: {
      maxConversationsPerMonth: { type: Number, default: 50 },
      advancedPersonalization: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      offlineMode: { type: Boolean, default: false },
    },
  },

  // Usage Statistics
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalRecommendations: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    avgSessionDuration: { type: Number, default: 0 },
    favoriteDestinations: [String],
  },

  // Authentication & Security
  auth: {
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    devices: [{
      deviceId: String,
      platform: String,
      lastUsed: Date,
      pushToken: String,
    }],
  },

  // DMO Integration
  dmoData: {
    preferredRegions: [String],
    visitedDestinations: [{
      name: String,
      visitDate: Date,
      rating: Number,
      review: String,
    }],
    loyaltyPrograms: [{
      provider: String,
      memberId: String,
      tier: String,
    }],
  },

  // AI Personalization Data
  aiProfile: {
    personalityType: String,
    interactionStyle: {
      type: String,
      enum: ['detailed', 'concise', 'conversational', 'formal'],
      default: 'conversational',
    },
    learningPreferences: {
      rememberPastConversations: { type: Boolean, default: true },
      adaptToFeedback: { type: Boolean, default: true },
      shareAnonymousInsights: { type: Boolean, default: false },
    },
    confidenceThreshold: { type: Number, default: 0.7 },
  },

}, {
  timestamps: true,
  collection: 'users',
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ 'profile.location.coordinates': '2dsphere' });
userSchema.index({ 'preferences.interests': 1 });
userSchema.index({ 'subscription.type': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Account lock virtual
userSchema.virtual('isLocked').get(function() {
  return !!(this.auth.lockUntil && this.auth.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.auth.lockUntil && this.auth.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'auth.lockUntil': 1 },
      $set: { 'auth.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'auth.loginAttempts': 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.auth.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'auth.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to get account status
userSchema.methods.getAccountStatus = function() {
  if (this.isLocked) return 'locked';
  if (!this.auth.isVerified) return 'unverified';
  if (this.subscription.type === 'free') return 'free';
  return 'active';
};

// Method to update usage statistics
userSchema.methods.updateStats = function(updates) {
  const statsUpdates = {};
  
  Object.keys(updates).forEach(key => {
    if (key === 'totalConversations' || key === 'totalRecommendations' || key === 'totalBookings') {
      statsUpdates[`stats.${key}`] = this.stats[key] + (updates[key] || 1);
    } else {
      statsUpdates[`stats.${key}`] = updates[key];
    }
  });
  
  statsUpdates['stats.lastActive'] = new Date();
  
  return this.updateOne({ $set: statsUpdates });
};

// Method to check feature access
userSchema.methods.hasFeature = function(featureName) {
  const features = this.subscription.features;
  
  switch (featureName) {
    case 'advancedPersonalization':
      return features.advancedPersonalization || this.subscription.type !== 'free';
    case 'prioritySupport':
      return features.prioritySupport || ['premium', 'enterprise'].includes(this.subscription.type);
    case 'offlineMode':
      return features.offlineMode || this.subscription.type === 'enterprise';
    default:
      return false;
  }
};

// GDPR Compliance Methods
userSchema.methods.exportData = function() {
  const userData = this.toObject();
  delete userData.password;
  delete userData.auth.resetPasswordToken;
  delete userData.auth.verificationToken;
  
  return {
    exportDate: new Date(),
    dataSubject: userData.email,
    personalData: userData,
    processingPurposes: [
      'Service delivery',
      'Personalization',
      'Analytics (if consented)',
      'Marketing (if consented)'
    ],
    legalBasis: 'Consent and contract performance',
    retentionPeriod: '2 years from last activity',
    rights: [
      'Right to access',
      'Right to rectification', 
      'Right to erasure',
      'Right to data portability',
      'Right to object'
    ]
  };
};

userSchema.methods.anonymize = function() {
  return this.updateOne({
    $set: {
      email: `anonymized_${this._id}@holidaibutler.com`,
      'profile.firstName': 'Anonymized',
      'profile.lastName': 'User',
      'profile.avatar': null,
      'profile.dateOfBirth': null,
      'profile.location': null,
      'privacy.allowTracking': false,
      'privacy.allowMarketing': false,
      'auth.devices': [],
    },
    $unset: {
      'auth.resetPasswordToken': 1,
      'auth.verificationToken': 1,
      'dmoData': 1,
      'aiProfile': 1,
    }
  });
};

// Transform function to remove sensitive data in JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.auth.resetPasswordToken;
  delete user.auth.verificationToken;
  delete user.auth.loginAttempts;
  delete user.auth.lockUntil;
  return user;
};

module.exports = mongoose.model('User', userSchema);