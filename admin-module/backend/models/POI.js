/**
 * POI Model - Points of Interest
 * Admin module Sequelize model for POI management
 * ALIGNED with platform-core POI model schema
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class POI extends Model {
  // Instance method to format POI for API response
  toJSON() {
    const values = { ...this.get() };

    // Parse JSON fields safely
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
      ...values,
      opening_hours: parseJSON(values.opening_hours, null),
      amenities: parseJSON(values.amenities, []),
      accessibility_features: parseJSON(values.accessibility_features, null),
      images: parseJSON(values.images, []),
      google_place_data: parseJSON(values.google_place_data, null),
      status: values.verified ? 'active' : 'pending',
      location: {
        city: values.city,
        country: values.country,
        region: values.region,
        address: values.address,
        postal_code: values.postal_code,
        latitude: values.latitude ? parseFloat(values.latitude) : null,
        longitude: values.longitude ? parseFloat(values.longitude) : null,
      },
      quality: {
        needsReview: !values.verified,
      },
    };
  }

  // Calculate POI score (aligned with platform-core)
  calculateScore() {
    const normalizedReviews = Math.min(this.review_count / 100, 10);
    const normalizedRating = (this.average_rating / 5) * 10;
    const score = (
      (normalizedReviews * 0.3) +
      (normalizedRating * 0.2) +
      ((this.tourist_relevance || 0) * 0.3) +
      ((this.booking_frequency || 0) * 0.2)
    );
    return Math.round(score * 100) / 100;
  }

  // Calculate tier based on score (aligned with platform-core)
  calculateTier(score = null) {
    const poiScore = score !== null ? score : this.poi_score;
    if (poiScore >= 8.5) return 1;
    if (poiScore >= 7.0) return 2;
    if (poiScore >= 5.0) return 3;
    return 4;
  }
}

POI.init(
  {
    // Primary key - INTEGER for backwards compatibility
    // Use uuid field for cross-module references
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // UUID for cross-module compatibility with platform-core
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
    },

    // External IDs - ALIGNED naming with platform-core
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

    // Category - ALIGNED with platform-core ENUM values
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: {
          args: [[
            'food_drinks', 'museum', 'beach', 'historical', 'routes',
            'healthcare', 'shopping', 'activities', 'accommodation', 'nightlife',
            // Extended categories for admin flexibility
            'Culture & History', 'Beaches & Nature', 'Active', 'Recreation',
            'Food & Drinks', 'Shopping', 'Practical'
          ]],
          msg: 'Invalid category value'
        }
      }
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    poi_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // Location - ALIGNED with platform-core
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
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

    // Ratings & Reviews - ALIGNED with platform-core
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: '0-5 scale, aligned with platform-core',
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
      comment: '1-4 scale',
    },

    // Classification - ALIGNED with platform-core
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

    // Status - ALIGNED with platform-core
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

    // Timestamps - ALIGNED with platform-core
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
  },
  {
    sequelize,
    tableName: 'POI',
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
  }
);

export default POI;
