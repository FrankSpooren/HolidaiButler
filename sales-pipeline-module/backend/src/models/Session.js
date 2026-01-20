/**
 * Session Model
 * OAuth session management
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Session extends Model {
  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  toPublicJSON() {
    return {
      id: this.id,
      userId: this.userId,
      deviceType: this.deviceType,
      deviceName: this.deviceName,
      ipAddress: this.ipAddress,
      lastActivityAt: this.lastActivityAt,
      createdAt: this.createdAt
    };
  }
}

Session.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  // Token info
  accessToken: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'access_token'
  },
  refreshToken: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'refresh_token'
  },
  tokenType: {
    type: DataTypes.STRING(50),
    defaultValue: 'Bearer',
    field: 'token_type'
  },
  // Expiry
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  refreshExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refresh_expires_at'
  },
  // Device info
  deviceType: {
    type: DataTypes.ENUM('web', 'mobile', 'desktop', 'api', 'unknown'),
    defaultValue: 'web',
    field: 'device_type'
  },
  deviceName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'device_name'
  },
  deviceId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'device_id'
  },
  // Browser/App info
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  browser: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  browserVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'browser_version'
  },
  os: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  osVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'os_version'
  },
  // Location
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  geoLocation: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'geo_location'
  },
  // Activity
  lastActivityAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_activity_at'
  },
  lastActivityPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'last_activity_path'
  },
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at'
  },
  revokedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'revoked_by'
  },
  revokeReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'revoke_reason'
  },
  // OAuth
  oauthProvider: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'oauth_provider',
    comment: 'google, microsoft, etc.'
  },
  oauthAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'oauth_access_token'
  },
  oauthRefreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'oauth_refresh_token'
  },
  oauthExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'oauth_expires_at'
  },
  // Remember me
  rememberMe: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'remember_me'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Session',
  tableName: 'sessions',
  timestamps: true,
  paranoid: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['access_token'] },
    { fields: ['refresh_token'] },
    { fields: ['is_active'] },
    { fields: ['expires_at'] },
    { fields: ['created_at'] },
    {
      fields: ['user_id', 'is_active'],
      name: 'session_user_active_idx'
    }
  ]
});

export default Session;
