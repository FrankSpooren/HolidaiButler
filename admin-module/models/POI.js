/**
 * POI Model - Points of Interest
 * Admin module Sequelize model for POI management
 * ALIGNED with actual pxoziy_db1.POI table structure
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
      enhanced_images: parseJSON(values.enhanced_images, []),
      enriched_highlights: parseJSON(values.enriched_highlights, []),
      enriched_sources: parseJSON(values.enriched_sources, []),
      content_quality_data: parseJSON(values.content_quality_data, null),
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
        score: values.content_quality_score ? parseFloat(values.content_quality_score) : null,
      },
    };
  }
}

POI.init(
  {
    // Primary key
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Google Place ID
    google_placeid: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },

    // Basic Info
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Category
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

    // Contact
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    facebook_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    instagram_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    // Ratings & Reviews
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
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

    // Status flags
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Scores
    popularity_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Opening Hours & Features
    opening_hours: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    amenities: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    accessibility_features: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },

    // Images
    images: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enhanced_images: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    enhanced_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Content Quality
    content_quality_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },
    content_quality_data: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    content_quality_assessed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Enriched content
    enriched_tile_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enriched_detail_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enriched_highlights: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    enriched_target_audience: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    enriched_best_time: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    enriched_sources: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    enrichment_completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Timestamps
    last_updated: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'POI',
    modelName: 'POI',
    timestamps: false, // Table uses last_updated and created_at directly
    indexes: [
      { fields: ['google_placeid'], unique: true },
      { fields: ['name'] },
      { fields: ['category'] },
      { fields: ['subcategory'] },
      { fields: ['city'] },
      { fields: ['latitude'] },
      { fields: ['rating'] },
      { fields: ['price_level'] },
      { fields: ['verified'] },
      { fields: ['is_active'] },
      { fields: ['popularity_score'] },
      { fields: ['enhanced_at'] },
    ],
  }
);

export default POI;
