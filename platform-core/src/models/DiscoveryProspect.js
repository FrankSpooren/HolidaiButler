/**
 * Discovery Prospect Model (MySQL)
 * Tracks individual POI candidates found via OSM scans, pending human review.
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const DiscoveryProspect = mysqlSequelize.define('DiscoveryProspect', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  scan_id: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    comment: 'FK to discovery_runs.id',
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  osm_node_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  osm_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  osm_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  hb_category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  best_match_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Closest existing POI name (fuzzy match)',
  },
  best_match_score: {
    type: DataTypes.DECIMAL(4, 3),
    defaultValue: 0.000,
    comment: 'Similarity score with closest existing POI (0-1)',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'scraped', 'failed'),
    defaultValue: 'pending',
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reviewed_by: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  apify_place_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Google Place ID from Apify scrape',
  },
  poi_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK to POI.id after import',
  },
}, {
  tableName: 'discovery_prospects',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['scan_id'] },
    { fields: ['destination_id'] },
    { fields: ['status'] },
  ],
});

export default DiscoveryProspect;
