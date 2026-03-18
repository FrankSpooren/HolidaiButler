/**
 * TrendingData Model
 * Trending search keywords per destination — Content Module Fase A
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const TrendingData = mysqlSequelize.define('TrendingData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  keyword: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  language: {
    type: DataTypes.ENUM('en', 'nl', 'de', 'es', 'fr'),
    allowNull: false,
    defaultValue: 'en',
  },
  source: {
    type: DataTypes.ENUM('google_trends', 'website_analytics', 'manual', 'social_listening', 'external_url'),
    allowNull: false,
  },
  search_volume: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  trend_direction: {
    type: DataTypes.ENUM('rising', 'stable', 'declining', 'breakout'),
    defaultValue: 'stable',
  },
  relevance_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
  },
  week_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  market: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  source_url: {
    type: DataTypes.STRING(2048),
    allowNull: true,
  },
  raw_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'trending_data',
  timestamps: false,
});

export default TrendingData;
