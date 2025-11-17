/**
 * POI Model (MySQL)
 * Central POI data with AI-driven tier classification
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const POI = mysqlSequelize.define('POI', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Basic Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.ENUM(
      'food_drinks',
      'museum',
      'beach',
      'historical',
      'routes',
      'healthcare',
      'shopping',
      'activities',
      'accommodation',
      'nightlife'
    ),
    allowNull: false,
  },

  // Location
  address: {
    type: DataTypes.TEXT,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  region: {
    type: DataTypes.STRING(100),
  },
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'Netherlands',
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
  },

  // Contact
  phone: {
    type: DataTypes.STRING(50),
  },
  email: {
    type: DataTypes.STRING(255),
  },
  website: {
    type: DataTypes.STRING(500),
  },

  // Classification
  tier: {
    type: DataTypes.TINYINT,
    defaultValue: 4,
    comment: '1=realtime, 2=daily, 3=weekly, 4=monthly',
  },
  poi_score: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.0,
    comment: 'Weighted score 0-10',
  },

  // Score Components
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Last 24 months',
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    comment: 'Last 24 months, 0-5 scale',
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

  // External IDs
  google_place_id: {
    type: DataTypes.STRING(255),
    unique: true,
  },
  tripadvisor_id: {
    type: DataTypes.STRING(255),
  },
  thefork_id: {
    type: DataTypes.STRING(255),
  },
  booking_com_id: {
    type: DataTypes.STRING(255),
  },
  getyourguide_id: {
    type: DataTypes.STRING(255),
  },

  // Status
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  // Timestamps
  last_scraped_at: {
    type: DataTypes.DATE,
  },
  last_classified_at: {
    type: DataTypes.DATE,
  },
  next_update_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'pois',
  timestamps: true,
  indexes: [
    { fields: ['tier'] },
    { fields: ['category'] },
    { fields: ['city'] },
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
    (this.tourist_relevance * 0.3) +
    (this.booking_frequency * 0.2)
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

export default POI;
