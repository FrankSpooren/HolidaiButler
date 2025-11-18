const mongoose = require('mongoose');

/**
 * Event Schema for Calpe Tourism Events
 * Supports multi-source aggregation, verification, and comprehensive filtering
 */
const eventSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: Map,
    of: String,
    required: true,
    // Multilingual support: { nl: 'Dutch title', en: 'English title', es: 'Spanish title', de: 'German title', fr: 'French title' }
  },
  description: {
    type: Map,
    of: String,
    required: true,
  },
  shortDescription: {
    type: Map,
    of: String,
  },

  // Date & Time
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  allDay: {
    type: Boolean,
    default: false,
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    endRecurrence: Date,
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
  },

  // Time of Day (for filtering)
  timeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'all-day'],
    required: true,
  },

  // Location
  location: {
    name: {
      type: String,
      required: true,
    },
    address: String,
    city: {
      type: String,
      default: 'Calpe',
    },
    region: {
      type: String,
      default: 'Costa Blanca',
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    venue: String, // Specific venue name
    area: {
      type: String,
      enum: ['old-town', 'beach-area', 'port', 'penon-ifach', 'city-center', 'outskirts', 'natural-park'],
    },
  },

  // Categorization & Themes
  primaryCategory: {
    type: String,
    required: true,
    enum: [
      'culture',
      'beach',
      'active-sports',
      'relaxation',
      'food-drink',
      'nature',
      'entertainment',
      'folklore',
      'festivals',
      'tours',
      'workshops',
      'markets',
      'sports-events',
      'exhibitions',
      'music',
      'family',
    ],
    index: true,
  },
  secondaryCategories: [{
    type: String,
    enum: [
      'culture',
      'beach',
      'active-sports',
      'relaxation',
      'food-drink',
      'nature',
      'entertainment',
      'folklore',
      'festivals',
      'tours',
      'workshops',
      'markets',
      'sports-events',
      'exhibitions',
      'music',
      'family',
    ],
  }],

  // Activity Types (detailed)
  activityType: {
    type: String,
    enum: [
      'excursion',
      'exhibition',
      'festival',
      'folklore',
      'guided-tour',
      'guided-walk',
      'guided-bike-tour',
      'live-music',
      'street-theater',
      'workshop',
      'seminar',
      'historic-walk',
      'local-market',
      'flea-market',
      'fair',
      'golf',
      'padel',
      'football',
      'mountain-bike',
      'cycling',
      'beach-volleyball',
      'surfing',
      'sup',
      'diving',
      'catamaran-sailing',
      'sailing',
      'swimming',
      'kitesurfing',
      'foiling',
      'water-sports',
      'cultural-program',
      'fiesta',
      'parade',
      'fireworks',
      'gastronomy',
      'wine-tasting',
      'cooking-class',
      'art-class',
      'yoga',
      'meditation',
      'hiking',
      'wildlife-watching',
      'dolphin-watching',
      'boat-trip',
      'kayaking',
      'climbing',
      'running',
      'triathlon',
      'other',
    ],
  },

  // Target Audience
  targetAudience: [{
    type: String,
    enum: [
      'families-with-kids',
      'couples',
      'friends',
      'solo-travelers',
      'seniors',
      'young-adults',
      'children',
      'teens',
      'all-ages',
      'groups',
      'business',
    ],
  }],

  // Difficulty & Requirements
  difficultyLevel: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'expert', 'all-levels'],
  },
  ageRestriction: {
    min: Number,
    max: Number,
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    hearingAccessible: Boolean,
    visuallyAccessible: Boolean,
    familyFriendly: Boolean,
    petsAllowed: Boolean,
  },

  // Pricing
  pricing: {
    isFree: {
      type: Boolean,
      default: false,
    },
    price: {
      amount: Number,
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    priceRange: {
      min: Number,
      max: Number,
    },
    priceDescription: {
      type: Map,
      of: String,
    },
  },

  // Registration & Booking
  registration: {
    required: {
      type: Boolean,
      default: false,
    },
    url: String,
    phone: String,
    email: String,
    deadline: Date,
    maxParticipants: Number,
    currentParticipants: {
      type: Number,
      default: 0,
    },
    waitingList: Boolean,
  },

  // Media
  images: [{
    url: String,
    alt: {
      type: Map,
      of: String,
    },
    isPrimary: Boolean,
    source: String,
  }],
  videos: [{
    url: String,
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'other'],
    },
  }],

  // Contact & Organization
  organizer: {
    name: String,
    website: String,
    email: String,
    phone: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
    },
  },

  // External Links
  externalLinks: [{
    platform: {
      type: String,
      enum: ['official', 'tripadvisor', 'getyourguide', 'facebook', 'eventbrite', 'other'],
    },
    url: String,
    rating: Number,
    reviewCount: Number,
  }],

  // Multi-Source Data Management
  sources: [{
    platform: {
      type: String,
      enum: [
        'calpe-official',
        'cultura-calpe',
        'calpe-online24',
        'costa-blanca-online24',
        'calpe-magazin',
        'tripadvisor',
        'getyourguide',
        'facebook',
        'instagram',
        'google-events',
        'eventbrite',
        'manual-entry',
        'other',
      ],
      required: true,
    },
    sourceId: String, // ID from the source platform
    url: String,
    lastChecked: Date,
    dataHash: String, // Hash of the data to detect changes
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  }],

  // Verification & Quality
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'partially-verified', 'verified', 'disputed'],
      default: 'unverified',
    },
    verificationCount: {
      type: Number,
      default: 0,
    }, // How many sources confirm this event
    lastVerified: Date,
    verifiedBy: String, // Admin user ID if manually verified
    conflictingData: [{
      field: String,
      values: [mongoose.Schema.Types.Mixed],
      sources: [String],
    }],
  },

  // AI-Enhanced Data
  aiEnhancements: {
    translatedBy: {
      type: String,
      enum: ['human', 'ai', 'mixed'],
    },
    translationModel: String,
    translatedAt: Date,
    sentiment: {
      score: Number,
      positive: Boolean,
    },
    keywords: {
      type: Map,
      of: [String],
    },
    suggestedCategories: [{
      category: String,
      confidence: Number,
    }],
  },

  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'postponed', 'completed', 'archived'],
    default: 'draft',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Engagement Metrics
  metrics: {
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    bookmarks: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    averageRating: Number,
    ratingCount: Number,
  },

  // Weather Dependencies (for outdoor events)
  weatherDependent: {
    type: Boolean,
    default: false,
  },
  weatherConditions: {
    minTemp: Number,
    maxTemp: Number,
    noRain: Boolean,
    noStrongWind: Boolean,
  },

  // SEO & Metadata
  seo: {
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    metaTitle: {
      type: Map,
      of: String,
    },
    metaDescription: {
      type: Map,
      of: String,
    },
    keywords: [String],
  },

  // Admin & System
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deletedAt: Date, // Soft delete

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ 'location.city': 1, startDate: 1 });
eventSchema.index({ primaryCategory: 1, status: 1 });
eventSchema.index({ status: 1, visibility: 1, startDate: 1 });
eventSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
eventSchema.index({ 'seo.slug': 1 });
eventSchema.index({ featured: 1, priority: -1 });

// Compound indexes for common queries
eventSchema.index({
  status: 1,
  visibility: 1,
  startDate: 1,
  primaryCategory: 1
});

// Virtual fields
eventSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date() && this.status === 'published';
});

eventSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'published';
});

eventSchema.virtual('isPast').get(function() {
  return this.endDate < new Date();
});

eventSchema.virtual('durationInDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Instance methods
eventSchema.methods.incrementView = function() {
  this.metrics.views += 1;
  return this.save();
};

eventSchema.methods.addSource = function(sourceData) {
  const existingSource = this.sources.find(s =>
    s.platform === sourceData.platform && s.sourceId === sourceData.sourceId
  );

  if (existingSource) {
    Object.assign(existingSource, sourceData);
  } else {
    this.sources.push(sourceData);
  }

  // Update verification count
  this.verification.verificationCount = this.sources.filter(s => s.isVerified).length;

  return this.save();
};

eventSchema.methods.getLocalizedField = function(field, language = 'nl') {
  const fieldValue = this[field];
  if (fieldValue instanceof Map) {
    return fieldValue.get(language) || fieldValue.get('nl') || fieldValue.get('en');
  }
  return fieldValue;
};

// Static methods
eventSchema.statics.findUpcoming = function(filters = {}, limit = 50) {
  const now = new Date();
  return this.find({
    startDate: { $gte: now },
    status: 'published',
    visibility: 'public',
    ...filters,
  })
    .sort({ startDate: 1, priority: -1 })
    .limit(limit);
};

eventSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  return this.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ],
    status: 'published',
    visibility: 'public',
    ...filters,
  }).sort({ startDate: 1 });
};

eventSchema.statics.findByCategory = function(category, filters = {}) {
  return this.find({
    $or: [
      { primaryCategory: category },
      { secondaryCategories: category },
    ],
    status: 'published',
    visibility: 'public',
    ...filters,
  }).sort({ startDate: 1, priority: -1 });
};

eventSchema.statics.findNearLocation = function(coordinates, maxDistance = 5000, filters = {}) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat],
        },
        $maxDistance: maxDistance,
      },
    },
    status: 'published',
    visibility: 'public',
    ...filters,
  });
};

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Auto-generate slug if not exists
  if (!this.seo.slug && this.title.get('nl')) {
    const titleNl = this.title.get('nl');
    this.seo.slug = titleNl
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set time of day based on start time if not set
  if (!this.timeOfDay && this.startDate) {
    const hour = this.startDate.getHours();
    if (this.allDay) {
      this.timeOfDay = 'all-day';
    } else if (hour < 12) {
      this.timeOfDay = 'morning';
    } else if (hour < 17) {
      this.timeOfDay = 'afternoon';
    } else if (hour < 21) {
      this.timeOfDay = 'evening';
    } else {
      this.timeOfDay = 'night';
    }
  }

  // Update verification status based on verification count
  if (this.verification.verificationCount >= 3) {
    this.verification.status = 'verified';
  } else if (this.verification.verificationCount >= 1) {
    this.verification.status = 'partially-verified';
  }

  next();
});

// Post-save middleware for logging
eventSchema.post('save', function(doc) {
  console.log(`Event saved: ${doc._id} - ${doc.title.get('nl') || doc.title.get('en')}`);
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
