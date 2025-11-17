/**
 * POI Score History Model
 * Tracks score changes over time
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';
import POI from './POI.js';

const POIScoreHistory = mysqlSequelize.define('POIScoreHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  poi_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pois',
      key: 'id',
    },
  },

  // Score data
  poi_score: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
  },
  review_count: {
    type: DataTypes.INTEGER,
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  tourist_relevance: {
    type: DataTypes.DECIMAL(3, 2),
  },
  booking_frequency: {
    type: DataTypes.INTEGER,
  },

  // Tier changes
  old_tier: {
    type: DataTypes.TINYINT,
  },
  new_tier: {
    type: DataTypes.TINYINT,
  },

  // Metadata
  calculation_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'weighted_average',
  },
}, {
  tableName: 'poi_score_history',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['poi_id', 'createdAt'] },
  ],
});

// Associations
POI.hasMany(POIScoreHistory, { foreignKey: 'poi_id', as: 'scoreHistory' });
POIScoreHistory.belongsTo(POI, { foreignKey: 'poi_id', as: 'poi' });

export default POIScoreHistory;
