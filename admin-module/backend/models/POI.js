/**
 * POI Model - Points of Interest
 * Admin module Sequelize model for POI management
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
}

POI.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    google_placeid: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },
    google_place_data: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    poi_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(500),
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
    rating: {
      type: DataTypes.DECIMAL(2, 1),
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
    opening_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
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
    amenities: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessibility_features: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    popularity_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    last_updated: {
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
      { fields: ['category'] },
      { fields: ['city'] },
      { fields: ['verified'] },
      { fields: ['featured'] },
      { fields: ['name'] },
    ],
  }
);

export default POI;
