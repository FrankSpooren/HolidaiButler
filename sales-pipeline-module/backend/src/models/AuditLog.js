/**
 * AuditLog Model
 * Complete audit trail for compliance and security
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class AuditLog extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      changes: this.changes,
      createdAt: this.createdAt
    };
  }
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Action performed
  action: {
    type: DataTypes.ENUM(
      'create',
      'read',
      'update',
      'delete',
      'restore',
      'login',
      'logout',
      'login_failed',
      'password_change',
      'password_reset',
      'export',
      'import',
      'bulk_update',
      'bulk_delete',
      'assign',
      'unassign',
      'share',
      'unshare',
      'approve',
      'reject',
      'send',
      'convert',
      'merge',
      'api_call'
    ),
    allowNull: false
  },
  // Entity affected
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'entity_id'
  },
  entityName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'entity_name',
    comment: 'Human-readable entity name for display'
  },
  // User who performed action
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id'
  },
  userName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_name'
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_email'
  },
  // Request details
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  requestMethod: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'request_method'
  },
  requestPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'request_path'
  },
  requestId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'request_id'
  },
  // Changes made
  changes: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{ field: { old, new } }'
  },
  oldValues: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'new_values'
  },
  // Additional context
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Risk level
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    field: 'risk_level'
  },
  // Success/Failure
  status: {
    type: DataTypes.ENUM('success', 'failure', 'error'),
    defaultValue: 'success'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  // Related entities
  relatedEntityType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'related_entity_type'
  },
  relatedEntityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'related_entity_id'
  },
  // Session info
  sessionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'session_id'
  },
  // Geolocation
  geoLocation: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'geo_location',
    comment: '{ country, city, region, latitude, longitude }'
  },
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  paranoid: false, // Never soft delete audit logs
  underscored: true,
  indexes: [
    { fields: ['action'] },
    { fields: ['entity_type'] },
    { fields: ['entity_id'] },
    { fields: ['user_id'] },
    { fields: ['ip_address'] },
    { fields: ['risk_level'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    {
      fields: ['entity_type', 'entity_id'],
      name: 'audit_entity_idx'
    },
    {
      fields: ['user_id', 'created_at'],
      name: 'audit_user_time_idx'
    }
  ]
});

export default AuditLog;
