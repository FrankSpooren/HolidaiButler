/**
 * HolidAIButler - Database Models
 * MongoDB schemas for Mediterranean AI Travel Platform
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// User Model
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatar: { type: String },
    language: { 
      type: String, 
      enum: ['en', 'es', 'de', 'nl', 'fr'], 
      default: 'en' 
    },
    dateOfBirth: { type: Date },
    nationality: { type: String },
  },
  preferences: {
    interests: [{
      type: String,
      enum: [
        'beaches', 'restaurants', 'nightlife', 'cultural', 'sports',
        'nature', 'shopping', 'museums', 'activities', 'relaxation'
      ]
    }],
    budget: {
      type: String,
      enum: ['budget', 'moderate', 'luxury', 'no-limit'],
      default: 'moderate'
    },
    groupSize: { type: Number, default: 2 },
    accessibility: {
      mobilityAid: { type: Boolean, default: false },
      visualImpairment: { type: Boolean, default: false },
      hearingImpairment: { type: Boolean, default: false },
    },
    dietary: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'lactose-free']
    }],
  },
  location: {
    current: {
      latitude: { type: Number },
      longitude: { type: Number },
      name: { type: String },
      lastUpdated: { type: Date, default: Date.now },
    },
    home: {
      country: { type: String },
      city: { type: String },
    },
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
  },
  privacy: {
    allowTracking: { type: Boolean, default: false },
    allowMarketing: { type: Boolean, default: false },
    dataRetention: { type: Boolean, default: true },
    consentDate: { type: Date, default: Date.now },
  },
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    registrationDate: { type: Date, default: Date.now },
  },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
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

// POI (Point of Interest) Model
const poiSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
  },
  category: {
    type: String,
    required: true,
    enum: [
      'attractions', 'beaches', 'restaurants', 'museums', 'activities',
      'nightlife', 'shopping', 'hotels', 'transportation', 'nature',
      'cultural', 'sports'
    ],
    index: true,
  },
  location: {
    type: String,
    required: true,
    index: true,
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: { type: String, default: 'Spain' },
    full: String,
  },
  contact: {
    phone: String,
    email: String,
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
    },
  },
  details: {
    description: { type: String, required: true },
    shortDescription: String,
    openingHours: {
      monday: String,
      tuesday: String,
      wednesday: String,
      thursday: String,
      friday: String,
      saturday: String,
      sunday: String,
      notes: String,
    },
    priceRange: String,
    priceCategory: {
      type: String,
      enum: ['Free', '€', '€€', '€€€', '€€€€'],
      default: '€€',
    },
    cuisineType: String, // For restaurants
  },
  ratings: {
    average: { type: Number, default: 4.0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    sources: {
      google: Number,
      tripadvisor: Number,
      booking: Number,
      internal: Number,
    },
  },
  features: [{
    type: String,
    enum: [
      'wheelchair_accessible', 'family_friendly', 'pet_friendly',
      'wifi', 'parking', 'air_conditioning', 'outdoor_seating',
      'takeaway', 'delivery', 'reservation_required', 'credit_cards',
      'cash_only', 'english_spoken', 'vegetarian_options',
      'vegan_options', 'gluten_free_options', 'halal', 'kosher'
    ]
  }],
  tags: [{
    type: String,
    index: true,
  }],
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false },
  }],
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: String,
    verificationDate: Date,
    dmoApproved: { type: Boolean, default: false },
  },
  aiData: {
    recommendationScore: { type: Number, default: 0.5 },
    popularityScore: { type: Number, default: 0.5 },
    localInsiderScore: { type: Number, default: 0.5 },
    seasonalRelevance: {
      spring: { type: Number, default: 0.5 },
      summer: { type: Number, default: 0.5 },
      autumn: { type: Number, default: 0.5 },
      winter: { type: Number, default: 0.5 },
    },
  },
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    lastViewed: Date,
  },
}, {
  timestamps: true,
});

// Geospatial index for location-based queries
poiSchema.index({ coordinates: '2dsphere' });
poiSchema.index({ location: 1, category: 1 });
poiSchema.index({ 'ratings.average': -1 });

// Chat Message Model
const chatMessageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true,
  },
  content: {
    text: { type: String, required: true },
    metadata: {
      suggestions: [String],
      recommendations: [{
        poiId: { type: Schema.Types.ObjectId, ref: 'POI' },
        name: String,
        category: String,
        relevanceScore: Number,
      }],
      confidence: { type: Number, min: 0, max: 1 },
      model: String,
      processingTime: Number,
      cached: { type: Boolean, default: false },
      fallback: { type: Boolean, default: false },
    },
  },
  context: {
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
    },
    weather: {
      temperature: Number,
      condition: String,
      humidity: Number,
    },
    timeOfDay: String,
    userPreferences: Schema.Types.Mixed,
  },
  analytics: {
    responseTime: Number,
    userRating: { type: Number, min: 1, max: 5 },
    wasHelpful: Boolean,
    followUpCount: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Booking Model
const bookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  poiId: {
    type: Schema.Types.ObjectId,
    ref: 'POI',
    required: true,
  },
  bookingReference: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
    index: true,
  },
  details: {
    date: { type: Date, required: true },
    time: String,
    duration: Number, // in minutes
    guests: { type: Number, default: 1 },
    specialRequests: String,
  },
  contact: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
  },
  pricing: {
    basePrice: { type: Number, required: true },
    taxes: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    commission: { type: Number, default: 0 },
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    method: String,
    transactionId: String,
    paidAt: Date,
  },
  partner: {
    name: String,
    email: String,
    confirmationMethod: {
      type: String,
      enum: ['email', 'phone', 'api', 'manual'],
      default: 'email',
    },
  },
  aiContext: {
    generatedFromMessage: {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
    },
    recommendationScore: Number,
    userSatisfactionPrediction: Number,
  },
}, {
  timestamps: true,
});

// Analytics Model
const analyticsSchema = new Schema({
  type: {
    type: String,
    enum: ['user_interaction', 'ai_request', 'poi_view', 'booking', 'error'],
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  sessionId: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  data: {
    event: String,
    category: String,
    value: Number,
    metadata: Schema.Types.Mixed,
  },
  location: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String,
  },
  device: {
    platform: String,
    version: String,
    model: String,
  },
  performance: {
    responseTime: Number,
    cacheHit: Boolean,
    errorCode: String,
  },
}, {
  timestamps: true,
});

// Create Models
const User = mongoose.model('User', userSchema);
const POI = mongoose.model('POI', poiSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = {
  User,
  POI,
  ChatMessage,
  Booking,
  Analytics,
};