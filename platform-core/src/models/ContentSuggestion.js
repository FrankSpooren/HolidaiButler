/**
 * ContentSuggestion Model
 * AI-generated content suggestions — Content Module Fase A
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const ContentSuggestion = mysqlSequelize.define('ContentSuggestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content_type: {
    type: DataTypes.ENUM('blog', 'social_post', 'video_script'),
    allowNull: false,
    defaultValue: 'blog',
  },
  suggested_channels: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  keyword_cluster: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  engagement_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
  },
  trending_source_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'generated'),
    allowNull: false,
    defaultValue: 'pending',
  },
  approved_by: {
    type: DataTypes.STRING(36),
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
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
  tableName: 'content_suggestions',
  timestamps: false,
});

export default ContentSuggestion;
