/**
 * Team Model
 * Sales team management
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Team extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      managerId: this.managerId,
      parentTeamId: this.parentTeamId,
      memberCount: this.memberCount,
      quotaTarget: this.quotaTarget,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

Team.init({
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
    type: DataTypes.ENUM('sales', 'marketing', 'support', 'operations', 'custom'),
    defaultValue: 'sales'
  },
  // Hierarchy
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'manager_id'
  },
  parentTeamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_team_id'
  },
  // Members
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'member_count'
  },
  // Targets
  quotaTarget: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'quota_target',
    comment: 'Monthly team quota'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  // Settings
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      leadDistribution: 'round_robin', // round_robin, weighted, manual
      autoAssignment: true,
      notifyOnNewLead: true
    }
  },
  // Lead distribution weights
  distributionWeights: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'distribution_weights',
    comment: '{ userId: weight }'
  },
  // Territories
  territories: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Assigned geographic or industry territories'
  },
  // Working hours
  workingHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      timezone: 'Europe/Amsterdam',
      schedule: {
        monday: { start: '09:00', end: '17:30' },
        tuesday: { start: '09:00', end: '17:30' },
        wednesday: { start: '09:00', end: '17:30' },
        thursday: { start: '09:00', end: '17:30' },
        friday: { start: '09:00', end: '17:30' }
      }
    },
    field: 'working_hours'
  },
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
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
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Team',
  tableName: 'teams',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['manager_id'] },
    { fields: ['parent_team_id'] },
    { fields: ['is_active'] }
  ]
});

export default Team;
