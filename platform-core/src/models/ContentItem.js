/**
 * ContentItem Model
 * Generated content items — Content Module Fase A
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const ContentItem = mysqlSequelize.define('ContentItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  suggestion_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  content_type: {
    type: DataTypes.ENUM('blog', 'social_post', 'video_script'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  body_en: { type: DataTypes.TEXT, allowNull: true },
  body_nl: { type: DataTypes.TEXT, allowNull: true },
  body_de: { type: DataTypes.TEXT, allowNull: true },
  body_es: { type: DataTypes.TEXT, allowNull: true },
  body_fr: { type: DataTypes.TEXT, allowNull: true },
  seo_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  social_metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  media_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  target_platform: {
    type: DataTypes.ENUM('website', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'snapchat'),
    defaultValue: 'website',
  },
  approval_status: {
    type: DataTypes.ENUM('draft', 'pending_review', 'approved', 'published', 'rejected'),
    allowNull: false,
    defaultValue: 'draft',
  },
  approved_by: {
    type: DataTypes.STRING(36),
    allowNull: true,
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  publish_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  ai_model: {
    type: DataTypes.STRING(100),
    defaultValue: 'mistral',
  },
  ai_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'content_items',
  timestamps: false,
});

export default ContentItem;
