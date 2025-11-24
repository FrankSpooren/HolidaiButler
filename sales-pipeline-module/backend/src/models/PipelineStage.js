/**
 * PipelineStage Model
 * Individual stages within a pipeline
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class PipelineStage extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      pipelineId: this.pipelineId,
      name: this.name,
      type: this.type,
      probability: this.probability,
      order: this.order,
      color: this.color,
      rottingDays: this.rottingDays,
      isActive: this.isActive
    };
  }
}

PipelineStage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pipelineId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'pipeline_id'
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
    type: DataTypes.ENUM('open', 'won', 'lost'),
    defaultValue: 'open'
  },
  // Stage order
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Win probability for this stage
  probability: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  // Deal rotting
  rottingDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'rotting_days',
    comment: 'Days before deal is considered stale'
  },
  // Requirements
  requiredFields: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'required_fields',
    comment: 'Fields required to enter this stage'
  },
  entryActions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'entry_actions',
    comment: 'Actions to perform when entering stage'
  },
  exitActions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'exit_actions',
    comment: 'Actions to perform when leaving stage'
  },
  // Display
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#667eea'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  // Forecast category
  forecastCategory: {
    type: DataTypes.ENUM('omit', 'pipeline', 'best_case', 'commit', 'closed'),
    defaultValue: 'pipeline',
    field: 'forecast_category'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'PipelineStage',
  tableName: 'pipeline_stages',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['pipeline_id'] },
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['order'] },
    { fields: ['is_active'] },
    {
      fields: ['pipeline_id', 'order'],
      unique: true,
      name: 'unique_pipeline_stage_order'
    }
  ]
});

export default PipelineStage;
