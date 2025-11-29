/**
 * API Usage Log Model
 * Tracks API calls and costs for budget monitoring
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const APIUsageLog = mysqlSequelize.define('APIUsageLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // API details
  service_name: {
    type: DataTypes.ENUM('apify', 'google_places', 'tripadvisor', 'thefork', 'other'),
    allowNull: false,
  },
  endpoint: {
    type: DataTypes.STRING(255),
  },
  actor_id: {
    type: DataTypes.STRING(100),
    comment: 'Apify actor ID',
  },

  // Usage
  operation_type: {
    type: DataTypes.ENUM('scrape', 'search', 'details', 'batch'),
    allowNull: false,
  },
  items_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  // Cost tracking
  credits_used: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0,
  },
  estimated_cost_eur: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0,
  },

  // Performance
  duration_seconds: {
    type: DataTypes.INTEGER,
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'partial', 'rate_limited'),
    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT,
  },

  // Context
  poi_id: {
    type: DataTypes.UUID,
  },
  triggered_by: {
    type: DataTypes.STRING(100),
    comment: 'workflow name or user',
  },
}, {
  tableName: 'api_usage_log',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['service_name', 'createdAt'] },
    { fields: ['createdAt', 'estimated_cost_eur'] },
    { fields: ['poi_id'] },
  ],
});

// Class method to get monthly cost
APIUsageLog.getMonthlySpend = async function(year, month) {
  const { Op } = await import('sequelize');
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await this.findOne({
    attributes: [
      [mysqlSequelize.fn('SUM', mysqlSequelize.col('estimated_cost_eur')), 'total_cost'],
      [mysqlSequelize.fn('COUNT', mysqlSequelize.col('id')), 'total_calls'],
    ],
    where: {
      createdAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
    },
    raw: true,
  });

  return {
    total_cost: parseFloat(result.total_cost || 0),
    total_calls: parseInt(result.total_calls || 0),
  };
};

export default APIUsageLog;
