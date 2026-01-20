/**
 * HolidAIButler - POI (Point of Interest) Model
 * MongoDB schema for Mediterranean travel destinations
 */

const mongoose = require('mongoose');

const poiSchema = new mongoose.Schema({
  // Core POI Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'attractions', 'beaches', 'restaurants', 'museums', 'activities',
      'nightlife', 'shopping', 'hotels', 'transportation', 'nature',
      'cultural', 'sports', 'wellness', 'events'
    ],
  },
  subcategory: {
    type: String,
    trim: true,
  },

  // Location Data
  location: {
    name: {
      type: String,
      required: true, // Alicante, Benidorm, etc.
    },
    region: {
      type: String,
      default: 'Costa Blanca',
    },
    country: {
      type: String,
      default: 'Spain',
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    address: {
      street: String,
      postalCode: String,
      neighborhood: String,
    },
  },

  // Content & Description
  description: {
    short: {
      type: String,
      required: true,
      maxlength: 500,
    },
    long: {
      type: String,
      maxlength: 2000,
    },
    highlights: [String],
    localTips: [String],
  },

  // Multilingual Support
  translations: {
    en: {
      name: String,
      description: String,
      highlights: [String],
    },
    es: {
      name: String,
      description: String,
      highlights: [String],
    },
    de: {
      name: String,
      description: String,
      highlights: [String],
    },
    nl: {
      name: String,
      description: String,
      highlights: [String],
    },
    fr: {
      name: String,
      description: String,
      highlights: [String],
    },
  },

  // Rating & Reviews
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
    },
    count: {
      type: Number,
      default: 0,
    },
    breakdown: {
      location: { type: Number, min: 0, max: 5, default: 0 },
      value: { type: Number, min: 0, max: 5, default: 0 },
      service: { type: Number, min: 0, max: 5, default: 0 },
      cleanliness: { type: Number, min: 0, max: 5, default: 0 },
      authenticity: { type: Number, min: 0, max: 5, default: 0 },
    },
    sources: [{
      platform: {
        type: String,
        enum: ['google', 'tripadvisor', 'yelp', 'holidaibutler', 'dmo'],
      },
      rating: Number,
      reviewCount: Number,
      url: String,
    }],
  },

  // Pricing Information
  pricing: {
    category: {
      type: String,
      enum: ['Free', '€', '€€', '€€€', '€€€€', '€€€€€'],
      required: true,
    },
    range: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'EUR' },
    },
    details: {
      adult: Number,
      child: Number,
      senior: Number,
      student: Number,
      group: Number,
    },
    seasonalPricing: [{
      season: String,
      multiplier: Number, // Price multiplier for season
      validFrom: Date,
      validTo: Date,
    }],
  },

  // Operating Information
  hours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean },
    specialHours: [{
      date: Date,
      open: String,
      close: String,
      closed: Boolean,
      note: String,
    }],
  },

  // Features & Amenities
  features: [{
    type: String,
    enum: [
      'wheelchair_accessible', 'parking', 'wifi', 'outdoor_seating',
      'air_conditioning', 'family_friendly', 'pet_friendly',
      'credit_cards', 'reservations', 'takeaway', 'delivery',
      'live_music', 'terrace', 'sea_view', 'historic',
      'romantic', 'business_friendly', 'groups', 'photography',
      'swimming', 'snorkeling', 'watersports', 'hiking',
      'cycling', 'guided_tours', 'audio_guide', 'gift_shop'
    ],
  }],

  // AI Enhancement Tags
  aiTags: [{
    type: String,
    enum: [
      'must_visit', 'hidden_gem', 'instagram_worthy', 'authentic_local',
      'tourist_trap', 'overrated', 'seasonal', 'weather_dependent',
      'best_sunset', 'best_sunrise', 'romantic_spot', 'family_fun',
      'adventure', 'relaxation', 'cultural_immersion', 'foodie_paradise',
      'nightlife_hotspot', 'quiet_escape', 'luxury_experience',
      'budget_friendly', 'unique_experience', 'off_beaten_path'
    ],
  }],

  // Recommendations & Context
  bestTimeToVisit: {
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'sunset', 'sunrise', 'all_day'],
    },
    season: {
      type: String,
      enum: ['spring', 'summer', 'autumn', 'winter', 'year_round'],
    },
    weekday: {
      type: String,
      enum: ['weekday', 'weekend', 'any'],
    },
    duration: {
      type: String,
      enum: ['30min', '1hour', '2hours', '3hours', 'half_day', 'full_day', 'multi_day'],
    },
  },

  // Difficulty & Accessibility
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'difficult', 'expert'],
    default: 'easy',
  },
  accessibility: {
    wheelchairAccessible: { type: Boolean, default: false },
    visuallyImpaired: { type: Boolean, default: false },
    hearingImpaired: { type: Boolean, default: false },
    cognitivelyAccessible: { type: Boolean, default: false },
    notes: String,
  },

  // Media
  media: {
    primaryImage: {
      url: String,
      alt: String,
      credit: String,
    },
    gallery: [{
      url: String,
      alt: String,
      type: { type: String, enum: ['photo', 'video'] },
      credit: String,
    }],
    virtualTour: String,
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

  // Booking Integration
  booking: {
    available: { type: Boolean, default: false },
    partners: [{
      provider: String,
      url: String,
      commission: Number,
    }],
    requirements: {
      reservation: { type: Boolean, default: false },
      advance: String, // "2 hours", "1 day", etc.
      cancellation: String,
    },
  },

  // DMO Partnership Data
  dmoData: {
    verified: { type: Boolean, default: false },
    certifications: [String],
    qualityRating: String,
    lastInspection: Date,
    partnerships: [String],
    officialStatus: {
      type: String,
      enum: ['recommended', 'certified', 'partner', 'standard'],
    },
  },

  // Analytics & Performance
  analytics: {
    views: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    recommendations: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    seasonalPopularity: [{
      month: Number,
      popularity: Number,
    }],
  },

  // Content Management
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft',
  },
  lastVerified: {
    type: Date,
    default: Date.now,
  },
  dataSource: {
    type: String,
    enum: ['manual', 'dmo_api', 'google_places', 'tripadvisor', 'user_generated'],
    required: true,
  },

  // Related POIs
  nearbyPOIs: [{
    poi: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
    distance: Number, // in meters
    walkingTime: Number, // in minutes
  }],

  // Seasonal Information
  seasonal: {
    summer: {
      crowdLevel: { type: String, enum: ['low', 'medium', 'high', 'very_high'] },
      priceLevel: { type: String, enum: ['low', 'medium', 'high', 'very_high'] },
      notes: String,
    },
    winter: {
      crowdLevel: { type: String, enum: ['low', 'medium', 'high', 'very_high'] },
      priceLevel: { type: String, enum: ['low', 'medium', 'high', 'very_high'] },
      notes: String,
    },
  },

}, {
  timestamps: true,
  collection: 'pois',
});

// Indexes for performance
poiSchema.index({ 'location.coordinates': '2dsphere' });
poiSchema.index({ category: 1, 'rating.overall': -1 });
poiSchema.index({ 'location.name': 1, category: 1 });
poiSchema.index({ slug: 1 }, { unique: true });
poiSchema.index({ aiTags: 1 });
poiSchema.index({ 'pricing.category': 1 });
poiSchema.index({ status: 1, 'dmoData.verified': 1 });
poiSchema.index({ name: 'text', 'description.short': 'text' });

// Pre-save middleware to generate slug
poiSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Virtual for formatted price range
poiSchema.virtual('formattedPrice').get(function() {
  if (this.pricing.category === 'Free') return 'Free';
  if (this.pricing.range.min && this.pricing.range.max) {
    return `€${this.pricing.range.min}-${this.pricing.range.max}`;
  }
  return this.pricing.category;
});

// Virtual for average rating display
poiSchema.virtual('displayRating').get(function() {
  return Math.round(this.rating.overall * 10) / 10;
});

// Method to get localized content
poiSchema.methods.getLocalizedContent = function(language = 'en') {
  const translation = this.translations[language];
  if (translation && translation.name) {
    return {
      name: translation.name,
      description: translation.description || this.description.short,
      highlights: translation.highlights || this.description.highlights,
    };
  }
  return {
    name: this.name,
    description: this.description.short,
    highlights: this.description.highlights,
  };
};

// Method to check if POI is open
poiSchema.methods.isOpen = function(date = new Date()) {
  const day = date.toLocaleLowerCase();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  
  const todayHours = this.hours[dayName];
  if (!todayHours || todayHours.closed) return false;
  
  const currentTime = date.getHours() * 100 + date.getMinutes();
  const openTime = parseInt(todayHours.open.replace(':', ''));
  const closeTime = parseInt(todayHours.close.replace(':', ''));
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// Method to calculate distance from coordinates
poiSchema.methods.distanceFrom = function(latitude, longitude) {
  const R = 6371; // Earth's radius in km
  const dLat = (latitude - this.location.coordinates.latitude) * Math.PI / 180;
  const dLon = (longitude - this.location.coordinates.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.location.coordinates.latitude * Math.PI / 180) *
            Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Method to get crowd level for current season
poiSchema.methods.getCurrentCrowdLevel = function() {
  const month = new Date().getMonth();
  const isSummer = month >= 5 && month <= 8; // June to September
  
  if (isSummer && this.seasonal.summer) {
    return this.seasonal.summer.crowdLevel;
  } else if (!isSummer && this.seasonal.winter) {
    return this.seasonal.winter.crowdLevel;
  }
  
  return 'medium'; // default
};

// Method to get recommendations based on user preferences
poiSchema.methods.getRecommendationScore = function(userPreferences) {
  let score = this.rating.overall; // Base score
  
  // Interest matching
  if (userPreferences.interests && userPreferences.interests.includes(this.category)) {
    score += 1.0;
  }
  
  // Budget matching
  const budgetPriority = {
    budget: ['Free', '€'],
    moderate: ['€', '€€', '€€€'],
    luxury: ['€€€', '€€€€'],
    premium: ['€€€€', '€€€€€']
  };
  
  if (userPreferences.budget && budgetPriority[userPreferences.budget].includes(this.pricing.category)) {
    score += 0.5;
  }
  
  // Accessibility needs
  if (userPreferences.accessibility && userPreferences.accessibility.wheelchairAccess) {
    if (this.accessibility.wheelchairAccessible) {
      score += 0.5;
    } else {
      score -= 1.0;
    }
  }
  
  // DMO verification bonus
  if (this.dmoData.verified) {
    score += 0.3;
  }
  
  // AI tags bonus
  if (this.aiTags.includes('must_visit')) score += 0.5;
  if (this.aiTags.includes('authentic_local')) score += 0.3;
  if (this.aiTags.includes('hidden_gem')) score += 0.2;
  
  return Math.min(score, 6.0); // Cap at 6.0
};

// Method to update analytics
poiSchema.methods.updateAnalytics = function(action) {
  const updates = {};
  
  switch (action) {
    case 'view':
      updates['analytics.views'] = this.analytics.views + 1;
      break;
    case 'booking':
      updates['analytics.bookings'] = this.analytics.bookings + 1;
      break;
    case 'recommendation':
      updates['analytics.recommendations'] = this.analytics.recommendations + 1;
      break;
    case 'favorite':
      updates['analytics.favorites'] = this.analytics.favorites + 1;
      break;
    case 'share':
      updates['analytics.shares'] = this.analytics.shares + 1;
      break;
  }
  
  return this.updateOne({ $set: updates });
};

// Static method to find nearby POIs
poiSchema.statics.findNearby = function(latitude, longitude, maxDistance = 5000, category = null) {
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'published'
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ 'rating.overall': -1 })
    .limit(20);
};

// Static method to get trending POIs
poiSchema.statics.getTrending = function(location = null, days = 7) {
  const query = { status: 'published' };
  
  if (location) {
    query['location.name'] = location;
  }
  
  return this.find(query)
    .sort({ 
      'analytics.views': -1,
      'analytics.recommendations': -1,
      'rating.overall': -1 
    })
    .limit(10);
};

// Static method for search
poiSchema.statics.search = function(searchTerm, location = null) {
  const query = {
    $text: { $search: searchTerm },
    status: 'published'
  };
  
  if (location) {
    query['location.name'] = location;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
};

module.exports = mongoose.model('POI', poiSchema);