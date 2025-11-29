import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Event extends Model {
  // Virtuals
  get isActive() {
    const now = new Date();
    return new Date(this.startDate) <= now && new Date(this.endDate) >= now && this.status === 'published';
  }

  get isUpcoming() {
    return new Date(this.startDate) > new Date() && this.status === 'published';
  }

  get isPast() {
    return new Date(this.endDate) < new Date();
  }

  // Increment stats
  async incrementViews() {
    this.statsViews += 1;
    return this.save();
  }

  async incrementClicks() {
    this.statsClicks += 1;
    return this.save();
  }

  async incrementBookings() {
    this.statsBookings += 1;
    return this.save();
  }

  // Soft delete
  async softDelete(adminUserId) {
    this.deletedAt = new Date();
    this.deletedById = adminUserId;
    this.status = 'archived';
    return this.save();
  }

  // Calculate quality score
  calculateQualityScore() {
    let score = 0;
    const title = this.title || {};
    const description = this.description || {};

    // Completeness (40 points)
    if (title.en) score += 10;
    if (description.en) score += 10;
    if (this.images && this.images.length > 0) score += 10;
    if (this.organizerName) score += 5;
    if (this.organizerEmail || this.organizerPhone) score += 5;

    // Multi-language (20 points)
    const languages = ['es', 'de', 'fr', 'nl'];
    const translatedCount = languages.filter(lang => title[lang]).length;
    score += (translatedCount / languages.length) * 20;

    // Media quality (15 points)
    if (this.images?.length >= 3) score += 15;
    else if (this.images?.length >= 1) score += 10;

    // Verification (15 points)
    if (this.qualityIsVerified) score += 15;

    // Data richness (10 points)
    if (this.priceMin || this.priceMax) score += 3;
    if (this.locationLat && this.locationLng) score += 3;
    if (this.targetAudience?.length > 0) score += 2;
    if (this.secondaryCategories?.length > 0) score += 2;

    this.qualityScore = Math.min(100, score);
    this.qualityCompleteness = score;

    return this.qualityScore;
  }
}

Event.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Title (multi-language as JSON)
  title: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { en: '' }
  },

  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },

  // Description (multi-language as JSON)
  description: {
    type: DataTypes.JSON,
    defaultValue: {}
  },

  // Dates
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date'
  },

  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date'
  },

  timeOfDay: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening', 'night', 'all_day'),
    defaultValue: 'all_day',
    field: 'time_of_day'
  },

  // Location
  locationName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'location_name'
  },

  locationAddress: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'location_address'
  },

  locationCity: {
    type: DataTypes.STRING(100),
    defaultValue: 'Calpe',
    field: 'location_city'
  },

  locationLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    field: 'location_lat'
  },

  locationLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    field: 'location_lng'
  },

  locationVenue: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'location_venue'
  },

  // Classification
  primaryCategory: {
    type: DataTypes.ENUM(
      'music', 'arts_culture', 'sports', 'food_drink', 'workshops',
      'markets', 'festivals', 'family', 'nightlife', 'outdoor',
      'wellness', 'education', 'business', 'charity', 'tours', 'other'
    ),
    allowNull: false,
    field: 'primary_category'
  },

  secondaryCategories: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'secondary_categories'
  },

  targetAudience: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'target_audience'
  },

  // Pricing
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_free'
  },

  priceMin: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'price_min'
  },

  priceMax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'price_max'
  },

  priceCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    field: 'price_currency'
  },

  priceDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'price_details'
  },

  // Ticketing
  hasTicketing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_ticketing'
  },

  ticketingAvailable: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'ticketing_available'
  },

  ticketingUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'ticketing_url'
  },

  ticketingCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'ticketing_capacity'
  },

  ticketingSoldOut: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'ticketing_sold_out'
  },

  // Images (stored as JSON array)
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  // Organizer
  organizerName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'organizer_name'
  },

  organizerEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'organizer_email'
  },

  organizerPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'organizer_phone'
  },

  organizerWebsite: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'organizer_website'
  },

  organizerSocial: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'organizer_social'
  },

  // Data Source
  dataSourcePlatform: {
    type: DataTypes.ENUM(
      'manual', 'calpe_official', 'cultura_calpe', 'calpe_online_24',
      'costa_blanca_online_24', 'tripadvisor', 'facebook', 'eventbrite', 'other'
    ),
    defaultValue: 'manual',
    field: 'data_source_platform'
  },

  dataSourceUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'data_source_url'
  },

  dataSourceLastScraped: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_source_last_scraped'
  },

  // Quality
  qualityScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: { min: 0, max: 100 },
    field: 'quality_score'
  },

  qualityIsVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'quality_is_verified'
  },

  qualityVerifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'quality_verified_by_id'
  },

  qualityVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'quality_verified_at'
  },

  qualityCompleteness: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'quality_completeness'
  },

  qualityReliability: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium',
    field: 'quality_reliability'
  },

  // Status
  status: {
    type: DataTypes.ENUM('draft', 'published', 'cancelled', 'completed', 'archived'),
    defaultValue: 'draft'
  },

  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public'
  },

  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },

  // SEO
  seoMetaTitle: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'seo_meta_title'
  },

  seoMetaDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'seo_meta_description'
  },

  seoKeywords: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'seo_keywords'
  },

  // Stats
  statsViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stats_views'
  },

  statsClicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stats_clicks'
  },

  statsShares: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stats_shares'
  },

  statsBookings: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stats_bookings'
  },

  // Admin
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id'
  },

  updatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by_id'
  },

  // Soft delete
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },

  deletedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'deleted_by_id'
  }
}, {
  sequelize,
  modelName: 'Event',
  tableName: 'events',
  timestamps: true,
  underscored: true,
  paranoid: false, // We handle soft delete manually
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['status'] },
    { fields: ['visibility'] },
    { fields: ['primary_category'] },
    { fields: ['start_date', 'end_date'] },
    { fields: ['location_city'] },
    { fields: ['is_featured'] }
  ],
  hooks: {
    beforeCreate: (event) => {
      // Generate slug if not exists
      if (!event.slug && event.title?.en) {
        event.slug = event.title.en
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    },
    beforeSave: (event) => {
      // Calculate quality score
      if (event.changed('title') || event.changed('description') || event.changed('images')) {
        event.calculateQualityScore();
      }
    }
  }
});

export default Event;
