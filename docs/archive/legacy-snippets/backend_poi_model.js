/**
 * HolidAIButler - POI (Point of Interest) Model
 * Mediterranean AI Travel Platform POI Schema
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxlength: 1000,
    trim: true,
  },
  photos: [String], // URLs to uploaded photos
  helpful: { type: Number, default: 0 },
  language: {
    type: String,
    enum: ['en', 'es', 'de', 'nl', 'fr'],
    default: 'en',
  },
  verified: { type: Boolean, default: false },
  source: {
    type: String,
    enum: ['app', 'web', 'import'],
    default: 'app',
  },
}, {
  timestamps: true,
});

const openingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  open: String, // "09:00"
  close: String, // "22:00"
  closed: { type: Boolean, default: false },
  notes: String, // "Seasonal hours may vary"
});

const poiSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'attractions', 'beaches', 'restaurants', 'museums', 'activities',
      'nightlife', 'shopping', 'hotels', 'transportation', 'nature',
      'cultural', 'sports', 'medical', 'services'
    ],
    index: true,
  },
  
  subcategory: {
    type: String,
    maxlength: 50,
    index: true,
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
  },
  
  shortDescription: {
    type: String,
    maxlength: 200,
    trim: true,
  },
  
  // Location Information
  location: {
    city: {
      type: String,
      required: true,
      index: true,
    },
    region: {
      type: String,
      default: 'Costa Blanca',
      index: true,
    },
    country: {
      type: String,
      default: 'Spain',
    },
    address: {
      type: String,
      required: true,
      maxlength: 200,
    },
    postalCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },
  },
  
  // Contact Information
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
  
  // Operating Information
  hours: {
    regular: [openingHoursSchema],
    special: [{
      date: Date,
      open: String,
      close: String,
      closed: Boolean,
      notes: String,
    }],
    timezone: {
      type: String,
      default: 'Europe/Madrid',
    },
  },
  
  // Pricing Information
  pricing: {
    category: {
      type: String,
      enum: ['Free', '€', '€€', '€€€', '€€€€'],
      required: true,
      index: true,
    },
    range: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    details: String, // "€15-30 per person, children under 12 free"
  },
  
  // Rating and Reviews
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
  },
  
  reviews: [reviewSchema],
  
  // Features and Amenities
  features: [{
    type: String,
    enum: [
      'wheelchair_accessible', 'family_friendly', 'pet_friendly',
      'parking_available', 'wifi', 'outdoor_seating', 'air_conditioning',
      'accepts_cards', 'reservations_required', 'english_speaking',
      'vegetarian_options', 'gluten_free', 'halal', 'kosher',
      'live_music', 'beach_access', 'scenic_views', 'historic',
      'romantic', 'groups_welcome', 'children_playground'
    ],
  }],
  
  // Mediterranean/Costa Blanca specific tags
  aiTags: [{
    type: String,
    enum: [
      'must_visit', 'hidden_gem', 'local_favorite', 'tourist_trap',
      'authentic_spanish', 'mediterranean_cuisine', 'sea_views',
      'cultural_heritage', 'family_activity', 'romantic_spot',
      'photography', 'sunset_viewing', 'water_sports', 'hiking',
      'traditional_market', 'festival_venue', 'off_season',
      'crowded_summer', 'locals_only', 'instagram_worthy'
    ],
  }],
  
  // Media
  images: [{
    url: String,
    caption: String,
    type: {
      type: String,
      enum: ['exterior', 'interior', 'food', 'view', 'amenity'],
    },
    source: String,
    verified: { type: Boolean, default: false },
  }],
  
  // Seasonal Information
  seasonality: {
    bestMonths: [String], // ["June", "July", "August"]
    peak: String, // "Summer"
    offSeason: String, // "Winter"
    weatherDependent: { type: Boolean, default: false },
    notes: String,
  },
  
  // DMO and Official Data
  official: {
    dmoVerified: { type: Boolean, default: false },
    touristBoard: String,
    certification: String,
    qualityMark: String,
    lastVerified: Date,
  },
  
  // Booking Integration
  booking: {
    partnerId: String,
    bookingUrl: String,
    requiresReservation: { type: Boolean, default: false },
    advanceBookingDays: Number,
    cancellationPolicy: String,
    instantConfirmation: { type: Boolean, default: false },
  },
  
  // Analytics and Performance
  stats: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastViewed: Date,
    popularityScore: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  },
  
  // Content Management
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'closed_temporarily', 'closed_permanently'],
    default: 'active',
    index: true,
  },
  
  // Data Source and Quality
  dataSource: {
    type: String,
    enum: ['manual', 'dmo_import', 'partner_api', 'user_generated', 'scraped'],
    default: 'manual',
  },
  
  quality: {
    completeness: { type: Number, min: 0, max: 100, default: 0 },
    accuracy: { type: Number, min: 0, max: 100, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    needsReview: { type: Boolean, default: false },
  },
  
  // Multi-language Support
  translations: {
    es: {
      name: String,
      description: String,
      shortDescription: String,
    },
    de: {
      name: String,
      description: String,
      shortDescription: String,
    },
    nl: {
      name: String,
      description: String,
      shortDescription: String,
    },
    fr: {
      name: String,
      description: String,
      shortDescription: String,
    },
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

// Indexes for performance and search
poiSchema.index({ 'location.coordinates': '2dsphere' });
poiSchema.index({ category: 1, status: 1 });
poiSchema.index({ 'location.city': 1, category: 1 });
poiSchema.index({ 'rating.average': -1 });
poiSchema.index({ 'stats.popularityScore': -1 });
poiSchema.index({ name: 'text', description: 'text' });

// Compound indexes
poiSchema.index({ 
  'location.city': 1, 
  category: 1, 
  'rating.average': -1,
  status: 1 
});

// Virtual for formatted location
poiSchema.virtual('location.formatted').get(function() {
  return `${this.location.address}, ${this.location.city}`;
});

// Virtual for current status
poiSchema.virtual('isOpen').get(function() {
  if (!this.hours.regular || this.hours.regular.length === 0) return null;
  
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  
  const todayHours = this.hours.regular.find(h => h.day === currentDay);
  if (!todayHours || todayHours.closed) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
});

// Virtual for distance (set dynamically during queries)
poiSchema.virtual('distance').get(function() {
  return this._distance || null;
});

// Pre-save middleware to update quality score
poiSchema.pre('save', function(next) {
  this.updateQualityScore();
  next();
});

// Instance method to calculate quality score
poiSchema.methods.updateQualityScore = function() {
  let score = 0;
  
  // Basic information completeness
  if (this.name) score += 10;
  if (this.description && this.description.length > 50) score += 15;
  if (this.location.address) score += 10;
  if (this.location.coordinates) score += 10;
  if (this.contact.phone || this.contact.website) score += 10;
  
  // Rich content
  if (this.images && this.images.length > 0) score += 15;
  if (this.hours.regular && this.hours.regular.length > 0) score += 10;
  if (this.pricing.category) score += 5;
  
  // Reviews and ratings
  if (this.rating.count > 0) score += 10;
  if (this.rating.count > 5) score += 5;
  
  this.quality.completeness = Math.min(score, 100);
  this.quality.lastUpdated = new Date();
};

// Instance method to add review
poiSchema.methods.addReview = function(userId, rating, comment, photos = []) {
  const review = {
    userId,
    rating,
    comment,
    photos,
    timestamp: new Date(),
  };
  
  this.reviews.push(review);
  this.updateRating();
  
  return this.save();
};

// Instance method to update rating statistics
poiSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    this.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return;
  }
  
  const ratings = this.reviews.map(r => r.rating);
  this.rating.average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  this.rating.count = ratings.length;
  
  // Update distribution
  this.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(rating => {
    this.rating.distribution[rating]++;
  });
};

// Instance method to increment view count
poiSchema.methods.incrementViews = function() {
  this.stats.views++;
  this.stats.lastViewed = new Date();
  this.updatePopularityScore();
  return this.save();
};

// Instance method to increment clicks
poiSchema.methods.incrementClicks = function() {
  this.stats.clicks++;
  this.updatePopularityScore();
  return this.save();
};

// Instance method to increment bookings
poiSchema.methods.incrementBookings = function() {
  this.stats.bookings++;
  this.updatePopularityScore();
  return this.save();
};

// Instance method to update popularity score
poiSchema.methods.updatePopularityScore = function() {
  const views = this.stats.views || 0;
  const clicks = this.stats.clicks || 0;
  const bookings = this.stats.bookings || 0;
  const rating = this.rating.average || 0;
  const reviewCount = this.rating.count || 0;
  
  // Calculate weighted popularity score
  this.stats.popularityScore = 
    (views * 1) + 
    (clicks * 5) + 
    (bookings * 20) + 
    (rating * reviewCount * 10) +
    (this.official.dmoVerified ? 50 : 0);
    
  // Calculate conversion rate
  if (views > 0) {
    this.stats.conversionRate = (bookings / views) * 100;
  }
};

// Static method to find nearby POIs
poiSchema.statics.findNearby = function(latitude, longitude, maxDistance = 5000, category = null) {
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    status: 'active',
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query);
};

// Static method to search POIs
poiSchema.statics.search = function(searchTerm, filters = {}) {
  const query = {
    $and: [
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { 'location.city': { $regex: searchTerm, $options: 'i' } },
        ],
      },
      { status: 'active' },
      ...Object.entries(filters).map(([key, value]) => ({ [key]: value })),
    ],
  };
  
  return this.find(query).sort({ 'stats.popularityScore': -1 });
};

// Static method to get top-rated POIs
poiSchema.statics.getTopRated = function(category = null, limit = 10) {
  const query = { 
    status: 'active',
    'rating.count': { $gte: 5 }, // At least 5 reviews
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ 'rating.average': -1, 'rating.count': -1 })
    .limit(limit);
};

// Static method to get trending POIs
poiSchema.statics.getTrending = function(days = 7, limit = 10) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    'stats.lastViewed': { $gte: cutoffDate },
  })
  .sort({ 'stats.popularityScore': -1 })
  .limit(limit);
};

// Export model
const POI = mongoose.model('POI', poiSchema);
module.exports = POI;