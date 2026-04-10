/**
 * HolidAIButler - User Model
 * User database schema with GDPR compliance
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Don't include in queries by default
  },

  // Profile Information
  profile: {
    firstName: {
      type: String,
      required: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      enum: ['en', 'es', 'de', 'nl', 'fr'],
      default: 'en',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
  },

  // Travel Preferences
  preferences: {
    interests: [{
      type: String,
      enum: [
        'beaches', 'restaurants', 'cultural', 'nightlife', 'activities',
        'museums', 'nature', 'sports', 'shopping', 'architecture'
      ],
      default: ['beaches', 'restaurants', 'cultural'],
    }],
    budget: {
      type: String,
      enum: ['budget', 'moderate', 'luxury', 'premium'],
      default: 'moderate',
    },
    groupSize: {
      type: Number,
      default: 2,
      min: 1,
      max: 20,
    },
    mobility: {
      type: String,
      enum: ['excellent', 'good', 'limited', 'wheelchair'],
      default: 'excellent',
    },
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'kosher', 'halal', 'none'],
      default: ['none'],
    }],
    preferredActivities: [{
      type: String,
    }],
  },

  // Location & Travel History
  location: {
    current: {
      city: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      lastUpdated: Date,
    },
    home: {
      city: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    visitHistory: [{
      location: String,
      visitDate: Date,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
    }],
  },

  // Privacy & GDPR Compliance
  privacy: {
    allowTracking: {
      type: Boolean,
      default: false,
    },
    allowMarketing: {
      type: Boolean,
      default: false,
    },
    allowLocationTracking: {
      type: Boolean,
      default: false,
    },
    consentDate: {
      type: Date,
      default: Date.now,
    },
    dataRetentionUntil: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
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
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
  },

  // Account Status
  status: {
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: String,
  },

  // Authentication
  auth: {
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    lastLogin: Date,
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: Date,
    }],
  },

  // AI & Chat Preferences
  aiPreferences: {
    chatStyle: {
      type: String,
      enum: ['friendly', 'professional', 'casual', 'detailed'],
      default: 'friendly',
    },
    responseLength: {
      type: String,
      enum: ['concise', 'standard', 'detailed'],
      default: 'standard',
    },
    includeEmojis: {
      type: Boolean,
      default: true,
    },
    personalizedRecommendations: {
      type: Boolean,
      default: true,
    },
  },

  // Statistics & Analytics
  stats: {
    totalChats: {
      type: Number,
      default: 0,
    },
    totalRecommendations: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    averageSessionDuration: {
      type: Number,
      default: 0,
    },
  },

  // System Fields
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.auth.resetPasswordToken;
      delete ret.auth.emailVerificationToken;
      delete ret.auth.refreshTokens;
      return ret;
    },
  },
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.language': 1 });
userSchema.index({ 'subscription.type': 1 });
userSchema.index({ 'stats.lastActive': 1 });
userSchema.index({ 'location.current.coordinates': '2dsphere' });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.auth.lockUntil && this.auth.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = new Date();

  // Hash password if modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.auth.emailVerificationToken = token;
  this.auth.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.auth.resetPasswordToken = token;
  this.auth.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

userSchema.methods.incrementLoginAttempts = function() {
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

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      'auth.loginAttempts': 1,
      'auth.lockUntil': 1
    }
  });
};

// Static Methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({
    'status.isActive': true,
    deletedAt: null,
  });
};

userSchema.statics.findBySubscriptionType = function(type) {
  return this.find({
    'subscription.type': type,
    'subscription.isActive': true,
  });
};

// GDPR Compliance Methods
userSchema.methods.exportData = function() {
  const userData = this.toObject();
  
  // Remove sensitive fields
  delete userData.password;
  delete userData.auth;
  
  return {
    dataExport: userData,
    exportDate: new Date(),
    retentionUntil: this.privacy.dataRetentionUntil,
  };
};

userSchema.methods.anonymizeData = function() {
  this.email = `deleted_${this._id}@holidaibutler.com`;
  this.profile.firstName = 'Deleted';
  this.profile.lastName = 'User';
  this.profile.phone = null;
  this.privacy.allowTracking = false;
  this.privacy.allowMarketing = false;
  this.deletedAt = new Date();
  this.status.isActive = false;
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;