/**
 * Pipeline Model
 * Sales pipeline configuration
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Pipeline extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      isDefault: this.isDefault,
      isActive: this.isActive,
      dealRotting: this.dealRotting,
      createdAt: this.createdAt
    };
  }
}

Pipeline.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('sales', 'renewal', 'upsell', 'partner', 'custom'),
    defaultValue: 'sales'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  // Deal rotting settings
  dealRotting: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: true,
      warningDays: 7,
      criticalDays: 14
    },
    field: 'deal_rotting'
  },
  // Win probability settings by stage
  probabilityByStage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'probability_by_stage',
    comment: 'Auto-set probability when stage changes'
  },
  // Currency
  defaultCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    field: 'default_currency'
  },
  // Ownership
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  },
  // Display
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#667eea'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Pipeline',
  tableName: 'pipelines',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['is_default'] },
    { fields: ['is_active'] },
    { fields: ['team_id'] },
    { fields: ['display_order'] }
  ]
});

export default Pipeline;
