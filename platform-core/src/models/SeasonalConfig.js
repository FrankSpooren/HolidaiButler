/**
 * SeasonalConfig Model
 * Season configuration per destination — Content Module Fase A
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const SeasonalConfig = mysqlSequelize.define('SeasonalConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  season_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  start_month: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  start_day: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
  end_month: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  end_day: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 28,
  },
  hero_image_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  featured_poi_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  cta_config: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  homepage_blocks: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  strategic_themes: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_active: {
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
  tableName: 'seasonal_config',
  timestamps: false,
});

export default SeasonalConfig;
