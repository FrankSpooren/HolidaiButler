/**
 * ContentPerformance Model
 * Performance metrics per content item per platform — Content Module Fase A
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const ContentPerformance = mysqlSequelize.define('ContentPerformance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  content_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  engagement: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  reach: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  conversions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  measured_at: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  raw_metrics: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'content_performance',
  timestamps: false,
});

export default ContentPerformance;
