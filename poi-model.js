import mongoose from 'mongoose';

const poiSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: 'text'
  },
  description: { 
    type: String, 
    required: true,
    index: 'text'
  },
  category: {
    type: String,
    required: true,
    enum: ['restaurant', 'accommodation', 'activity', 'cultural', 'beach', 'nightlife', 'shopping', 'nature', 'transport']
  },
  location: {
    coordinates: { 
      type: [Number], 
      required: true, 
      index: '2dsphere' // [longitude, latitude]
    },
    address: { 
      type: String, 
      required: true 
    },
    city: { 
      type: String, 
      required: true 
    },
    region: { 
      type: String, 
      required: true, 
      default: 'Costa Blanca' 
    }
  },
  details: {
    priceRange: { 
      type: String, 
      enum: ['Free', '€', '€€', '€€€', '€€€€'], 
      default: '€€' 
    },
    rating: { 
      type: Number, 
      min: 0, 
      max: 5, 
      default: 0 
    },
    reviewCount: { 
      type: Number, 
      default: 0 
    },
    openHours: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    contact: {
      phone: String,
      website: String,
      email: String
    },
    features: [{
      type: String,
      enum: ['wifi', 'parking', 'accessible', 'pet-friendly', 'family-friendly', 'romantic', 'outdoor-seating', 'air-conditioning', 'live-music', 'beach-access']
    }]
  },
  bookingInfo: {
    isBookable: { 
      type: Boolean, 
      default: false 
    },
    partnerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Partner' 
    },
    availabilityAPI: { 
      type: String, 
      enum: ['internal', 'partner', 'external', null],
      default: null
    },
    commission: { 
      type: Number, 
      min: 0, 
      max: 50, 
      default: 10 
    }
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  languages: [{
    type: String,
    enum: ['es', 'en', 'de', 'fr', 'nl', 'ca'],
    default: ['es', 'en']
  }],
  images: [{
    url: String,
    caption: String,
    isPrimary: Boolean
  }],
  stats: {
    views: { type: Number, default: 0 },
    recommendations: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 }
  },
  verification: {
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    lastUpdated: { type: Date, default: Date.now }
  },
  seasonal: {
    isSeasonalBusiness: { type: Boolean, default: false },
    openMonths: [{
      type: Number,
      min: 1,
      max: 12
    }],
    peakSeason: {
      start: Number, // Month number
      end: Number    // Month number
    }
  }
}, { 
  timestamps: true 
});

// Indexes for performance
poiSchema.index({ category: 1, 'location.region': 1 });
poiSchema.index({ 'details.rating': -1, 'stats.recommendations': -1 });
poiSchema.index({ 'location.coordinates': '2dsphere' });
poiSchema.index({ tags: 1 });
poiSchema.index({ 'bookingInfo.isBookable': 1 });
poiSchema.index({ name: 'text', description: 'text' });

// Virtual for average rating display
poiSchema.virtual('averageRating').get(function() {
  return Math.round(this.details.rating * 10) / 10;
});

// Virtual for price display
poiSchema.virtual('priceDisplay').get(function() {
  return this.details.priceRange;
});

// Method to check if POI is currently open (based on season)
poiSchema.methods.isCurrentlyOpen = function() {
  if (!this.seasonal.isSeasonalBusiness) return true;
  
  const currentMonth = new Date().getMonth() + 1;
  return this.seasonal.openMonths.includes(currentMonth);
};

// Method to increment view count
poiSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

// Method to increment recommendation count
poiSchema.methods.incrementRecommendations = function() {
  this.stats.recommendations += 1;
  return this.save();
};

// Method to increment booking count
poiSchema.methods.incrementBookings = function() {
  this.stats.bookings += 1;
  return this.save();
};

// Static method to find nearby POIs
poiSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // meters
      }
    }
  });
};

// Static method to find by category and region
poiSchema.statics.findByCategory = function(category, region = 'Costa Blanca') {
  return this.find({ 
    category: category, 
    'location.region': region 
  }).sort({ 'details.rating': -1, 'stats.recommendations': -1 });
};

// Static method to find bookable POIs
poiSchema.statics.findBookable = function(region = 'Costa Blanca') {
  return this.find({ 
    'bookingInfo.isBookable': true,
    'location.region': region 
  }).sort({ 'details.rating': -1 });
};

// Static method to search POIs
poiSchema.statics.search = function(query, options = {}) {
  const {
    category,
    priceRange,
    minRating = 0,
    region = 'Costa Blanca',
    limit = 20,
    sortBy = 'rating'
  } = options;

  let searchQuery = {
    'location.region': region,
    'details.rating': { $gte: minRating }
  };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Category filter
  if (category) {
    searchQuery.category = category;
  }

  // Price range filter
  if (priceRange) {
    searchQuery['details.priceRange'] = { $in: priceRange };
  }

  // Sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'rating':
      sortOptions = { 'details.rating': -1, 'stats.recommendations': -1 };
      break;
    case 'popular':
      sortOptions = { 'stats.recommendations': -1, 'details.rating': -1 };
      break;
    case 'recent':
      sortOptions = { createdAt: -1 };
      break;
    default:
      sortOptions = { 'details.rating': -1 };
  }

  return this.find(searchQuery)
    .sort(sortOptions)
    .limit(limit);
};

// Pre-save middleware to update verification timestamp
poiSchema.pre('save', function(next) {
  if (this.isModified('verification.verified') && this.verification.verified) {
    this.verification.verifiedAt = new Date();
  }
  this.verification.lastUpdated = new Date();
  next();
});

export default mongoose.model('POI', poiSchema);