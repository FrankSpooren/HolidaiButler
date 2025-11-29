/**
 * SharedInbox Model
 * Shared email inbox for team collaboration
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class SharedInbox extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      type: this.type,
      status: this.status,
      teamId: this.teamId,
      unreadCount: this.unreadCount,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

SharedInbox.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  type: {
    type: DataTypes.ENUM('sales', 'support', 'general', 'marketing'),
    defaultValue: 'sales'
  },
  // Status
  status: {
    type: DataTypes.ENUM('active', 'paused', 'disconnected'),
    defaultValue: 'active'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  // Team
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  // Members with access
  members: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { userId, role: admin|member, canSend, canAssign }'
  },
  // Email configuration
  emailConfig: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'email_config',
    comment: 'IMAP/SMTP configuration'
  },
  // Signature
  defaultSignature: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'default_signature'
  },
  // Auto-assignment
  autoAssignment: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: true,
      method: 'round_robin', // round_robin, load_balanced, manual
      assignToTeam: true
    },
    field: 'auto_assignment'
  },
  // Auto-reply
  autoReply: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      subject: '',
      body: '',
      outOfOffice: false
    },
    field: 'auto_reply'
  },
  // Metrics
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unread_count'
  },
  totalEmails: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_emails'
  },
  avgResponseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'avg_response_time',
    comment: 'Average response time in minutes'
  },
  // Sync
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_at'
  },
  syncStatus: {
    type: DataTypes.ENUM('syncing', 'synced', 'error', 'pending'),
    defaultValue: 'pending',
    field: 'sync_status'
  },
  syncError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'sync_error'
  },
  // Filtering
  filterRules: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'filter_rules',
    comment: 'Email filtering and routing rules'
  },
  // Ownership
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'SharedInbox',
  tableName: 'shared_inboxes',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['team_id'] },
    { fields: ['is_active'] }
  ]
});

export default SharedInbox;
