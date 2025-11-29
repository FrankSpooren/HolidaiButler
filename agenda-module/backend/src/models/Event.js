const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Model for Calpe Tourism Events (MySQL/Sequelize)
 * Migrated from MongoDB for platform consistency
 * Supports multi-source aggregation, verification, and comprehensive filtering
 */

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },

  // Multilingual title: { nl: 'Dutch', en: 'English', es: 'Spanish', de: 'German', fr: 'French' }
  title: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Multilingual titles as JSON object',
  },

  description: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Multilingual descriptions as JSON object',
  },

  shortDescription: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'short_description',
  },

  // Date & Time
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
  },

  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date',
  },

  allDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'all_day',
  },

  // Recurring event settings as JSON
  recurring: {
    type: DataTypes.JSON,
    defaultValue: { enabled: false },
    comment: '{ enabled, frequency, endRecurrence, daysOfWeek }',
  },

  timeOfDay: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening', 'night', 'all-day'),
    allowNull: false,
    field: 'time_of_day',
  },

  // Location as JSON object
  location: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '{ name, address, city, region, coordinates: {lat, lng}, venue, area }',
  },

  // Categories
  primaryCategory: {
    type: DataTypes.ENUM(
      'culture', 'beach', 'active-sports', 'relaxation', 'food-drink',
      'nature', 'entertainment', 'folklore', 'festivals', 'tours',
      'workshops', 'markets', 'sports-events', 'exhibitions', 'music', 'family'
    ),
    allowNull: false,
    field: 'primary_category',
  },

  secondaryCategories: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'secondary_categories',
    comment: 'Array of category strings',
  },

  activityType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'activity_type',
  },

  // Target Audience as JSON array
  targetAudience: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'target_audience',
  },

  // Difficulty & Requirements
  difficultyLevel: {
    type: DataTypes.ENUM('easy', 'moderate', 'challenging', 'expert', 'all-levels'),
    field: 'difficulty_level',
  },

  ageRestriction: {
    type: DataTypes.JSON,
    field: 'age_restriction',
    comment: '{ min, max }',
  },

  accessibility: {
    type: DataTypes.JSON,
    comment: '{ wheelchairAccessible, hearingAccessible, visuallyAccessible, familyFriendly, petsAllowed }',
  },

  // Pricing as JSON
  pricing: {
    type: DataTypes.JSON,
    defaultValue: { isFree: false },
    comment: '{ isFree, price: {amount, currency}, priceRange, priceDescription }',
  },

  // Registration as JSON
  registration: {
    type: DataTypes.JSON,
    defaultValue: { required: false },
    comment: '{ required, url, phone, email, deadline, maxParticipants, currentParticipants, waitingList }',
  },

  // Media as JSON arrays
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of { url, alt, isPrimary, source }',
  },

  videos: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of { url, platform }',
  },

  // Organizer as JSON
  organizer: {
    type: DataTypes.JSON,
    comment: '{ name, website, email, phone, socialMedia }',
  },

  // External links as JSON array
  externalLinks: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'external_links',
    comment: 'Array of { platform, url, rating, reviewCount }',
  },

  // Multi-source data as JSON array
  sources: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of { platform, sourceId, url, lastChecked, dataHash, confidence, isVerified }',
  },

  // Verification as JSON
  verification: {
    type: DataTypes.JSON,
    defaultValue: { status: 'unverified', verificationCount: 0 },
    comment: '{ status, verificationCount, lastVerified, verifiedBy, conflictingData }',
  },

  // AI Enhancements as JSON
  aiEnhancements: {
    type: DataTypes.JSON,
    field: 'ai_enhancements',
    comment: '{ translatedBy, translationModel, translatedAt, sentiment, keywords, suggestedCategories }',
  },

  // Status & Visibility
  status: {
    type: DataTypes.ENUM('draft', 'published', 'cancelled', 'postponed', 'completed', 'archived'),
    defaultValue: 'draft',
  },

  visibility: {
    type: DataTypes.ENUM('public', 'unlisted', 'private'),
    defaultValue: 'public',
  },

  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // Engagement Metrics as JSON
  metrics: {
    type: DataTypes.JSON,
    defaultValue: { views: 0, clicks: 0, bookmarks: 0, shares: 0 },
    comment: '{ views, clicks, bookmarks, shares, averageRating, ratingCount }',
  },

  // Weather Dependencies
  weatherDependent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'weather_dependent',
  },

  weatherConditions: {
    type: DataTypes.JSON,
    field: 'weather_conditions',
    comment: '{ minTemp, maxTemp, noRain, noStrongWind }',
  },

  // SEO as JSON
  seo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '{ slug, metaTitle, metaDescription, keywords }',
  },

  // Admin & System
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
  },

  updatedBy: {
    type: DataTypes.UUID,
    field: 'updated_by',
  },

  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at',
  },
}, {
  tableName: 'agenda_events',
  timestamps: true,
  underscored: true,
  paranoid: false,
  indexes: [
    { fields: ['start_date', 'end_date'] },
    { fields: ['primary_category', 'status'] },
    { fields: ['status', 'visibility', 'start_date'] },
    { fields: ['featured', 'priority'] },
  ],
  getterMethods: {
    isUpcoming() {
      return this.startDate > new Date() && this.status === 'published';
    },
    isActive() {
      const now = new Date();
      return this.startDate <= now && this.endDate >= now && this.status === 'published';
    },
    isPast() {
      return this.endDate < new Date();
    },
    durationInDays() {
      return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
    },
  },
});

// Instance Methods
Event.prototype.incrementView = async function() {
  const metrics = this.metrics || { views: 0 };
  metrics.views = (metrics.views || 0) + 1;
  this.metrics = metrics;
  return this.save();
};

Event.prototype.addSource = async function(sourceData) {
  const sources = this.sources || [];
  const existingIndex = sources.findIndex(s =>
    s.platform === sourceData.platform && s.sourceId === sourceData.sourceId
  );

  if (existingIndex >= 0) {
    sources[existingIndex] = { ...sources[existingIndex], ...sourceData };
  } else {
    sources.push(sourceData);
  }

  this.sources = sources;

  // Update verification count
  const verification = this.verification || { status: 'unverified', verificationCount: 0 };
  verification.verificationCount = sources.filter(s => s.isVerified).length;
  this.verification = verification;

  return this.save();
};

Event.prototype.getLocalizedField = function(field, language = 'nl') {
  const fieldValue = this[field];
  if (fieldValue && typeof fieldValue === 'object') {
    return fieldValue[language] || fieldValue.nl || fieldValue.en;
  }
  return fieldValue;
};

// Static Methods
Event.findUpcoming = async function(filters = {}, limit = 50) {
  const now = new Date();
  return this.findAll({
    where: {
      startDate: { [Op.gte]: now },
      status: 'published',
      visibility: 'public',
      ...filters,
    },
    order: [['start_date', 'ASC'], ['priority', 'DESC']],
    limit,
  });
};

Event.findByDateRange = async function(startDate, endDate, filters = {}) {
  return this.findAll({
    where: {
      [Op.or]: [
        { startDate: { [Op.gte]: startDate, [Op.lte]: endDate } },
        { endDate: { [Op.gte]: startDate, [Op.lte]: endDate } },
        { startDate: { [Op.lte]: startDate }, endDate: { [Op.gte]: endDate } },
      ],
      status: 'published',
      visibility: 'public',
      ...filters,
    },
    order: [['start_date', 'ASC']],
  });
};

Event.findByCategory = async function(category, filters = {}) {
  return this.findAll({
    where: {
      [Op.or]: [
        { primaryCategory: category },
        sequelize.where(
          sequelize.fn('JSON_CONTAINS', sequelize.col('secondary_categories'), JSON.stringify(category)),
          true
        ),
      ],
      status: 'published',
      visibility: 'public',
      ...filters,
    },
    order: [['start_date', 'ASC'], ['priority', 'DESC']],
  });
};

// Hook: Auto-set timeOfDay based on startDate
Event.beforeCreate(async (event) => {
  // Auto-generate slug if not exists
  if (!event.seo || !event.seo.slug) {
    const title = event.title;
    const titleNl = title && title.nl;
    if (titleNl) {
      const slug = titleNl
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      event.seo = { ...event.seo, slug };
    }
  }

  // Set time of day based on start time
  if (!event.timeOfDay && event.startDate) {
    const hour = event.startDate.getHours();
    if (event.allDay) {
      event.timeOfDay = 'all-day';
    } else if (hour < 12) {
      event.timeOfDay = 'morning';
    } else if (hour < 17) {
      event.timeOfDay = 'afternoon';
    } else if (hour < 21) {
      event.timeOfDay = 'evening';
    } else {
      event.timeOfDay = 'night';
    }
  }

  // Update verification status
  if (event.verification && event.verification.verificationCount >= 3) {
    event.verification.status = 'verified';
  } else if (event.verification && event.verification.verificationCount >= 1) {
    event.verification.status = 'partially-verified';
  }
});

Event.beforeUpdate(async (event) => {
  // Update verification status on update
  if (event.verification && event.verification.verificationCount >= 3) {
    event.verification.status = 'verified';
  } else if (event.verification && event.verification.verificationCount >= 1) {
    event.verification.status = 'partially-verified';
  }
});

module.exports = Event;
