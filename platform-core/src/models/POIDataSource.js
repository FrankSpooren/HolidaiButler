/**
 * POI Data Source Model
 * Tracks data from multiple external sources
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';
import POI from './POI.js';

const POIDataSource = mysqlSequelize.define('POIDataSource', {
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

  // Source info
  source_name: {
    type: DataTypes.ENUM(
      'google_places',
      'tripadvisor',
      'thefork',
      'trustpilot',
      'booking_com',
      'getyourguide',
      'airbnb',
      'viator',
      'mindtrip'
    ),
    allowNull: false,
  },
  source_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'External ID at source',
  },
  source_url: {
    type: DataTypes.TEXT,
  },

  // Source data
  rating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  review_count: {
    type: DataTypes.INTEGER,
  },
  price_level: {
    type: DataTypes.TINYINT,
    comment: '1-4 scale',
  },
  ranking: {
    type: DataTypes.INTEGER,
    comment: 'Position in category/city',
  },

  // Raw data
  raw_data: {
    type: DataTypes.JSON,
  },

  // Status
  last_scraped_at: {
    type: DataTypes.DATE,
  },
  scrape_status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'rate_limited'),
    defaultValue: 'pending',
  },
  scrape_error: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'poi_data_sources',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['poi_id', 'source_name'],
    },
    { fields: ['poi_id', 'source_name'] },
    { fields: ['last_scraped_at'] },
  ],
});

// Associations
POI.hasMany(POIDataSource, { foreignKey: 'poi_id', as: 'dataSources' });
POIDataSource.belongsTo(POI, { foreignKey: 'poi_id', as: 'poi' });

export default POIDataSource;
