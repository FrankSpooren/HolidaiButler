/**
 * Destination Configuration Model (MySQL)
 * Stores reusable POI discovery configurations for destinations
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const DestinationConfig = mysqlSequelize.define('DestinationConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Configuration Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Friendly name for this config (e.g., "Standard Beach Destination")',
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description of this configuration',
  },

  // Target Categories
  categories: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of categories to discover (e.g., ["food_drinks", "museum"])',
  },

  // Search Criteria
  criteria: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Search criteria: {minReviews, minRating, priceLevel, radius, etc.}',
  },

  // Data Sources
  sources: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['google_places'],
    comment: 'Array of data sources (e.g., ["google_places", "tripadvisor", "osm"])',
  },

  // Limits
  max_pois_per_category: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Maximum POIs to discover per category',
  },

  // Auto-processing
  auto_classify: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Automatically classify POIs after discovery',
  },
  auto_enrich: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Automatically enrich POIs with additional data',
  },

  // Status
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  // Usage tracking
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this config has been used',
  },
  last_used_at: {
    type: DataTypes.DATE,
    comment: 'Last time this config was used',
  },

  // Metadata
  created_by: {
    type: DataTypes.STRING(255),
    comment: 'User or system that created this config',
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Tags for categorization (e.g., ["beach", "coastal", "summer"])',
  },
}, {
  tableName: 'destination_configs',
  timestamps: true,
  indexes: [
    { fields: ['active'] },
    { fields: ['name'] },
    { fields: ['created_by'] },
  ],
});

// Instance methods
DestinationConfig.prototype.incrementUsage = async function() {
  this.usage_count += 1;
  this.last_used_at = new Date();
  await this.save();
};

DestinationConfig.prototype.getCriteria = function() {
  return {
    minReviews: this.criteria.minReviews || 0,
    minRating: this.criteria.minRating || 0,
    maxRating: this.criteria.maxRating || 5,
    priceLevel: this.criteria.priceLevel || [1, 2, 3, 4],
    radius: this.criteria.radius || 5000, // meters
    ...this.criteria,
  };
};

// Static methods
DestinationConfig.getPopularConfigs = async function(limit = 10) {
  return await this.findAll({
    where: { active: true },
    order: [['usage_count', 'DESC']],
    limit,
  });
};

export default DestinationConfig;
