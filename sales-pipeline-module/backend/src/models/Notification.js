/**
 * Notification Model
 * In-app notifications and alerts
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Notification extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      message: this.message,
      isRead: this.isRead,
      priority: this.priority,
      actionUrl: this.actionUrl,
      createdAt: this.createdAt
    };
  }
}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Recipient
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  // Type
  type: {
    type: DataTypes.ENUM(
      'deal_assigned',
      'deal_stage_change',
      'deal_won',
      'deal_lost',
      'lead_assigned',
      'lead_qualified',
      'task_assigned',
      'task_due',
      'task_overdue',
      'mention',
      'comment',
      'email_received',
      'email_opened',
      'email_clicked',
      'email_replied',
      'meeting_reminder',
      'quota_alert',
      'system',
      'custom'
    ),
    allowNull: false
  },
  // Content
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Priority
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  // Status
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  // Delivery
  channels: {
    type: DataTypes.JSONB,
    defaultValue: { inApp: true },
    comment: '{ inApp, email, whatsapp, push }'
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_sent'
  },
  emailSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_sent_at'
  },
  whatsappSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'whatsapp_sent'
  },
  whatsappSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'whatsapp_sent_at'
  },
  pushSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'push_sent'
  },
  pushSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'push_sent_at'
  },
  // Action
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'action_url'
  },
  actionLabel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'action_label'
  },
  // Related entities
  accountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'account_id'
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'contact_id'
  },
  dealId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'deal_id'
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'lead_id'
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'task_id'
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'activity_id'
  },
  // Sender
  fromUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'from_user_id'
  },
  // Grouping
  groupKey: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'group_key',
    comment: 'For grouping similar notifications'
  },
  // Expiry
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  // Actions taken
  dismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'dismissed_at'
  },
  clicked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'clicked_at'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  paranoid: false, // Don't soft delete notifications
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['is_read'] },
    { fields: ['priority'] },
    { fields: ['deal_id'] },
    { fields: ['lead_id'] },
    { fields: ['task_id'] },
    { fields: ['from_user_id'] },
    { fields: ['group_key'] },
    { fields: ['created_at'] },
    { fields: ['expires_at'] }
  ]
});

export default Notification;
