/**
 * Review Model (MySQL)
 * Reviews for POIs from the reviews table in Hetzner database
 * Sprint 7.6 - Personalized Reviews System
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const Review = mysqlSequelize.define('Review', {
  // Primary key
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // Foreign key to POI
  poi_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'POI',
      key: 'id',
    },
  },

  // Reviewer info
  user_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Anonymous',
  },

  // Travel party type
  travel_party_type: {
    type: DataTypes.ENUM('couples', 'families', 'solo', 'friends', 'business'),
    allowNull: true,
    defaultValue: 'solo',
  },

  // Rating (1-5)
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },

  // Review content
  review_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Sentiment analysis result
  sentiment: {
    type: DataTypes.ENUM('positive', 'neutral', 'negative'),
    allowNull: true,
    defaultValue: 'neutral',
  },

  // Helpful count (how many users found this helpful)
  helpful_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  // Visit date
  visit_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'reviews',
  timestamps: false, // We manage timestamps manually
  indexes: [
    {
      fields: ['poi_id'],
    },
    {
      fields: ['rating'],
    },
    {
      fields: ['sentiment'],
    },
    {
      fields: ['travel_party_type'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

export default Review;
