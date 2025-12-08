/**
 * POI Model (MySQL)
 * Central POI data with AI-driven tier classification
 * ALIGNED with admin-module POI model and actual database schema
 * Matches existing pxoziy_db1.POI table structure
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const POI = mysqlSequelize.define('POI', {
  // Primary key - INTEGER for backwards compatibility with existing database
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // UUID for cross-module compatibility
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: true,
  },

  // External IDs - mapped to database column names
  google_place_id: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
    field: 'google_placeid', // Database column name for backwards compatibility
  },
  tripadvisor_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  thefork_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  booking_com_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  getyourguide_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  // Google Place data cache
  google_place_data: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },

  // Basic Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Category - use STRING for flexibility (not ENUM)
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Uncategorized',
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  poi_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  // Location
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Calpe',
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Costa Blanca',
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Spain',
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  // Ratings & Reviews - mapped to database column names
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.0,
    field: 'rating', // Database column for backwards compatibility
  },
  review_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  price_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Scoring fields for AI-driven tier classification
  poi_score: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.0,
    comment: 'Weighted score 0-10',
  },
  tourist_relevance: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    comment: '0-10 scale',
  },
  booking_frequency: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Monthly average',
  },

  // Contact
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  // Opening Hours & Features
  opening_hours: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON format',
  },
  amenities: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array',
  },
  accessibility_features: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON object',
  },

  // Images
  images: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'JSON array of image objects',
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  // Status - mapped to database column names
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active', // Database column for backwards compatibility
  },
  featured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  // Admin-specific fields
  popularity_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  tier: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 4,
    comment: 'AI-driven tier: 1=hourly, 2=daily, 3=weekly, 4=monthly updates',
  },

  // Timestamps - mapped to database column names
  last_scraped_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_updated',
  },
  last_classified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  next_update_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'POI',  // Match the actual database table name (uppercase)
  modelName: 'POI',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['uuid'], unique: true },
    { fields: ['category'] },
    { fields: ['city'] },
    { fields: ['verified'] },
    { fields: ['featured'] },
    { fields: ['name'] },
    { fields: ['tier'] },
    { fields: ['poi_score'] },
    { fields: ['next_update_at'] },
    { fields: ['latitude', 'longitude'] },
  ],
});

// Instance methods
POI.prototype.calculateScore = function() {
  // Normalize review_count (0-10 scale, assuming max 1000 reviews)
  const normalizedReviews = Math.min(this.review_count / 100, 10);

  // Normalize rating (0-10 scale from 0-5)
  const normalizedRating = (this.average_rating / 5) * 10;

  // Calculate weighted score
  const score = (
    (normalizedReviews * 0.3) +
    (normalizedRating * 0.2) +
    ((this.tourist_relevance || 0) * 0.3) +
    ((this.booking_frequency || 0) * 0.2)
  );

  return Math.round(score * 100) / 100; // Round to 2 decimals
};

POI.prototype.calculateTier = function(score = null) {
  const poiScore = score !== null ? score : this.poi_score;

  if (poiScore >= 8.5) return 1;
  if (poiScore >= 7.0) return 2;
  if (poiScore >= 5.0) return 3;
  return 4;
};

POI.prototype.getUpdateFrequency = function() {
  switch (this.tier) {
    case 1: return 'hourly'; // realtime
    case 2: return 'daily';
    case 3: return 'weekly';
    case 4: return 'monthly';
    default: return 'monthly';
  }
};

POI.prototype.getNextUpdateDate = function() {
  const now = new Date();

  switch (this.tier) {
    case 1: // Hourly
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 2: // Daily
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 3: // Weekly
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 4: // Monthly
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
};

// Instance method to format POI for API response
POI.prototype.toPublicJSON = function() {
  const values = this.get();

  // Safe JSON parse helper
  const parseJSON = (data, defaultValue = null) => {
    if (!data) return defaultValue;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  };

  return {
    id: values.id,
    uuid: values.uuid,
    name: values.name,
    slug: values.slug || values.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: values.description,
    category: values.category,
    subcategory: values.subcategory,
    city: values.city,
    region: values.region,
    country: values.country,
    address: values.address,
    postal_code: values.postal_code,
    latitude: values.latitude ? parseFloat(values.latitude) : null,
    longitude: values.longitude ? parseFloat(values.longitude) : null,
    status: values.verified && values.active ? 'active' : 'pending',
    tier: values.tier || 4,
    rating: values.average_rating,
    reviewCount: values.review_count,
    priceLevel: values.price_level,
    images: parseJSON(values.images, []),
    amenities: parseJSON(values.amenities, []),
    opening_hours: parseJSON(values.opening_hours, null),
    phone: values.phone,
    website: values.website,
    email: values.email,
  };
};

export default POI;
