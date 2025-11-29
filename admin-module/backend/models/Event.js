import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  // Basic Information
  title: {
    en: { type: String, required: true },
    es: String,
    de: String,
    fr: String,
    nl: String
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  description: {
    en: String,
    es: String,
    de: String,
    fr: String,
    nl: String
  },

  // Temporal Information
  startDate: {
    type: Date,
    required: true,
    index: true
  },

  endDate: {
    type: Date,
    required: true
  },

  timeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'all_day'],
    default: 'all_day'
  },

  // Location
  location: {
    name: String,
    address: String,
    city: {
      type: String,
      default: 'Calpe'
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    venue: String
  },

  // Classification
  primaryCategory: {
    type: String,
    required: true,
    enum: [
      'music',
      'arts_culture',
      'sports',
      'food_drink',
      'workshops',
      'markets',
      'festivals',
      'family',
      'nightlife',
      'outdoor',
      'wellness',
      'education',
      'business',
      'charity',
      'tours',
      'other'
    ]
  },

  secondaryCategories: [{
    type: String,
    enum: [
      'music', 'arts_culture', 'sports', 'food_drink',
      'workshops', 'markets', 'festivals', 'family',
      'nightlife', 'outdoor', 'wellness', 'education',
      'business', 'charity', 'tours', 'other'
    ]
  }],

  targetAudience: [{
    type: String,
    enum: ['adults', 'families', 'children', 'seniors', 'teens', 'all']
  }],

  // Pricing
  isFree: {
    type: Boolean,
    default: false
  },

  price: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'EUR'
    },
    details: String
  },

  // Ticketing
  hasTicketing: {
    type: Boolean,
    default: false
  },

  ticketingInfo: {
    available: Boolean,
    url: String,
    capacity: Number,
    soldOut: {
      type: Boolean,
      default: false
    }
  },

  // Media
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Organizer Information
  organizer: {
    name: String,
    contact: {
      email: String,
      phone: String,
      website: String
    },
    social: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },

  // Data Source & Quality
  dataSource: {
    platform: {
      type: String,
      enum: [
        'manual',
        'calpe_official',
        'cultura_calpe',
        'calpe_online_24',
        'costa_blanca_online_24',
        'tripadvisor',
        'facebook',
        'eventbrite',
        'other'
      ],
      default: 'manual'
    },
    url: String,
    lastScrapedAt: Date,
    scraperId: String
  },

  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    verifiedAt: Date,
    completeness: Number, // 0-100
    reliability: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },

  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
    default: 'draft',
    index: true
  },

  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  // SEO & Metadata
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },

  // Analytics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    }
  },

  // Admin Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },

  // Soft Delete
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  }

}, {
  timestamps: true
});

// Indexes
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ primaryCategory: 1 });
eventSchema.index({ status: 1, visibility: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ createdAt: -1 });

// Text search index
eventSchema.index({
  'title.en': 'text',
  'title.es': 'text',
  'description.en': 'text',
  'description.es': 'text'
});

// Virtual for checking if event is active
eventSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'published';
});

// Virtual for checking if event is upcoming
eventSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date() && this.status === 'published';
});

// Virtual for checking if event is past
eventSchema.virtual('isPast').get(function() {
  return this.endDate < new Date();
});

// Methods
eventSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

eventSchema.methods.incrementClicks = function() {
  this.stats.clicks += 1;
  return this.save();
};

eventSchema.methods.incrementBookings = function() {
  this.stats.bookings += 1;
  return this.save();
};

// Soft delete
eventSchema.methods.softDelete = function(adminUserId) {
  this.deletedAt = new Date();
  this.deletedBy = adminUserId;
  this.status = 'archived';
  return this.save();
};

// Calculate quality score
eventSchema.methods.calculateQualityScore = function() {
  let score = 0;

  // Completeness (40 points)
  if (this.title?.en) score += 10;
  if (this.description?.en) score += 10;
  if (this.images?.length > 0) score += 10;
  if (this.organizer?.name) score += 5;
  if (this.organizer?.contact?.email || this.organizer?.contact?.phone) score += 5;

  // Multi-language (20 points)
  const languages = ['es', 'de', 'fr', 'nl'];
  const translatedCount = languages.filter(lang => this.title?.[lang]).length;
  score += (translatedCount / languages.length) * 20;

  // Media quality (15 points)
  if (this.images?.length >= 3) score += 15;
  else if (this.images?.length >= 1) score += 10;

  // Verification (15 points)
  if (this.quality?.isVerified) score += 15;

  // Data richness (10 points)
  if (this.price) score += 3;
  if (this.location?.coordinates) score += 3;
  if (this.targetAudience?.length > 0) score += 2;
  if (this.secondaryCategories?.length > 0) score += 2;

  this.quality.score = Math.min(100, score);
  this.quality.completeness = score;

  return this.quality.score;
};

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Generate slug if not exists
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Calculate quality score
  if (this.isModified('title') || this.isModified('description') || this.isModified('images')) {
    this.calculateQualityScore();
  }

  next();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
