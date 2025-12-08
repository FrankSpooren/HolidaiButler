/**
 * POI Model (MySQL)
 * Matches existing pxoziy_db1.POI table structure
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const POI = mysqlSequelize.define('POI', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // Basic Info
  google_placeid: {
    type: DataTypes.STRING(255),
    unique: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Uncategorized',
  },
  subcategory: {
    type: DataTypes.STRING(100),
  },
  poi_type: {
    type: DataTypes.STRING(100),
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
  },
  city: {
    type: DataTypes.STRING(100),
    defaultValue: 'Calpe',
  },
  region: {
    type: DataTypes.STRING(100),
  },
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'Spain',
  },
  postal_code: {
    type: DataTypes.STRING(20),
  },

  // Contact
  phone: {
    type: DataTypes.STRING(50),
  },
  website: {
    type: DataTypes.STRING(255),
  },
  email: {
    type: DataTypes.STRING(255),
  },

  // Ratings
  rating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  price_level: {
    type: DataTypes.INTEGER,
  },

  // Status
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  popularity_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // JSON fields
  amenities: {
    type: DataTypes.JSON,
  },
  accessibility_features: {
    type: DataTypes.JSON,
  },
  images: {
    type: DataTypes.JSON,
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
  },

  // Timestamps
  last_updated: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'POI',
  timestamps: false, // Use last_updated instead
  indexes: [
    { fields: ['name'] },
    { fields: ['category'] },
    { fields: ['city'] },
    { fields: ['rating'] },
    { fields: ['latitude'] },
  ],
});

export default POI;
