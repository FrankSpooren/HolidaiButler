/**
 * HolidAIButler - Database Models
 * MongoDB Schemas for Mediterranean AI Travel Platform
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  profile: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatar: { type: String },
    language: { 
      type: String, 
      enum: ['en', 'es', 'de', 'nl', 'fr'], 
      default: 'en' 
    },
    location: {
      country: { type: String },
      city: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    }
  },
  preferences: {
    interests: [{
      type: String,
      enum: ['beaches', 'restaurants', 'cultural', 'nightlife', 'activities', 'nature', 'shopping', 'sports']
    }],
    budget: {
      type: String,
      enum: ['budget', 'moderate', 'premium', 'luxury'],
      default: 'moderate'
    },
    groupSize: { type: Number, default: 2 },
    mobility: {
      type: String,
      enum: ['full', 'limited', 'wheelchair'],
      default: 'full'
    },
    dietaryRestrictions: [String],
    travelStyle: {
      type: String,
      enum: ['relaxed', 'active', 'cultural', 'adventure'],
      default: 'relaxed'
    }
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    features: [String]
  },
  privacy: {
    allowTracking: { type: Boolean, default: false },
    allowMarketing: { type: Boolean, default: false },
    allowDataSharing: { type: Boolean, default: false },
    consentDate: { type: Date, required: true }
  },
  stats: {
    totalChats: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    favoriteLocations: [String],
    lastActive: { type: Date, default: Date.now },
    joinDate: { type: Date, default: Date.now }
  },
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpiry;
      return ret;
    }
  }
});

// Hash password before saving
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

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// POI (Point of Interest) Schema
const poiSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['attractions', 'beaches', 'restaurants', 'museums', 'activities', 'nightlife', 'shopping', 'hotels', 'transportation', 'nature', 'cultural', 'sports']
  },
  location: {
    city: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    region: { type: String, default: 'Costa Blanca' }
  },
  description: { type: String, required: true },
  details: {
    hours: { type: String },
    website: { type: String },
    phone: { type: String },
    email: { type: String }
  },
  pricing: {
    range: { type: String }, // "€15-20 per person"
    category: {
      type: String,
      enum: ['Free', '€', '€€', '€€€', '€€€€'],
      required: true
    }
  },
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 },
    source: { type: String } // "Google", "TripAdvisor", etc.
  },
  features: [String], // ["wheelchair_accessible", "family_friendly", etc.]
  images: [{
    url: { type: String },
    alt: { type: String },
    source: { type: String }
  }],
  aiTags: [String], // For Claude AI context
  bestTimeToVisit: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'sunset', 'all_day', 'full_day']
  },
  duration: { type: String }, // "1-2 hours"
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'difficult', 'varies']
  },
  verified: { type: Boolean, default: false },
  dmoEndorsed: { type: Boolean, default: false }, // Official DMO approval
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add geospatial index for location queries
poiSchema.index({ "location.coordinates": "2dsphere" });
poiSchema.index({ category: 1, "rating.average": -1 });
poiSchema.index({ "location.city": 1, verified: 1 });

// Chat Conversation Schema
const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [{
    type: {
      type: String,
      enum: ['user', 'ai', 'system'],
      required: true
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      model: { type: String }, // "claude-3-5-sonnet"
      confidence: { type: Number },
      processingTime: { type: Number },
      fallback: { type: Boolean, default: false },
      recommendations: [{
        poiId: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
        name: String,
        category: String,
        rating: Number
      }]
    }
  }],
  context: {
    location: {
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    preferences: mongoose.Schema.Types.Mixed,
    weather: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  totalMessages: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
}, {
  timestamps: true
});

conversationSchema.index({ userId: 1, lastActivity: -1 });

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_interaction', 'ai_response', 'poi_engagement', 'booking_attempt', 'system_event'],
    required: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String },
  data: {
    event: { type: String, required: true },
    category: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed
  },
  device: {
    platform: { type: String },
    version: { type: String },
    userAgent: { type: String }
  },
  location: {
    country: { type: String },
    city: { type: String },
    ip: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false // Using custom timestamp field
});

analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, "data.event": 1 });

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  poiId: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
  type: {
    type: String,
    enum: ['restaurant', 'activity', 'hotel', 'tour', 'transport'],
    required: true
  },
  details: {
    name: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    time: { type: String },
    guests: { type: Number, default: 1 },
    duration: { type: String }
  },
  pricing: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    breakdown: mongoose.Schema.Types.Mixed
  },
  contact: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  confirmationCode: { type: String, unique: true },
  notes: { type: String },
  cancelledAt: { type: Date },
  cancelReason: { type: String }
}, {
  timestamps: true
});

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ confirmationCode: 1 });

// Create models
const User = mongoose.model('User', userSchema);
const POI = mongoose.model('POI', poiSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = {
  User,
  POI,
  Conversation,
  Analytics,
  Booking
};