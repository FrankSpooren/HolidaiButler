/**
 * EmailMessage Model
 * Email tracking and management
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class EmailMessage extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      subject: this.subject,
      from: this.from,
      to: this.to,
      status: this.status,
      direction: this.direction,
      openedAt: this.openedAt,
      clickedAt: this.clickedAt,
      accountId: this.accountId,
      contactId: this.contactId,
      dealId: this.dealId,
      createdAt: this.createdAt
    };
  }
}

EmailMessage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Email identifiers
  messageId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'message_id',
    comment: 'Email Message-ID header'
  },
  threadId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'thread_id'
  },
  inReplyTo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'in_reply_to'
  },
  references: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  // Direction
  direction: {
    type: DataTypes.ENUM('sent', 'received'),
    allowNull: false
  },
  // Addresses
  from: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ email, name }'
  },
  to: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { email, name }'
  },
  cc: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  bcc: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  replyTo: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'reply_to'
  },
  // Content
  subject: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bodyText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'body_text'
  },
  bodyHtml: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'body_html'
  },
  snippet: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Preview text'
  },
  // Attachments
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { name, url, type, size }'
  },
  hasAttachments: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_attachments'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'draft',
      'queued',
      'sending',
      'sent',
      'delivered',
      'failed',
      'bounced',
      'received'
    ),
    defaultValue: 'draft'
  },
  // Error handling
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'retry_count'
  },
  // Tracking
  isTracked: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_tracked'
  },
  trackingPixelId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tracking_pixel_id'
  },
  // Opens
  opened: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  openedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'opened_at'
  },
  openCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'open_count'
  },
  openDetails: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'open_details',
    comment: 'Array of { timestamp, ip, userAgent, location }'
  },
  // Clicks
  clicked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'clicked_at'
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'click_count'
  },
  clickDetails: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'click_details',
    comment: 'Array of { timestamp, url, ip }'
  },
  // Reply
  replied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  repliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'replied_at'
  },
  // Bounce
  bounced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  bouncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'bounced_at'
  },
  bounceType: {
    type: DataTypes.ENUM('hard', 'soft', 'complaint'),
    allowNull: true,
    field: 'bounce_type'
  },
  bounceReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'bounce_reason'
  },
  // Unsubscribe
  unsubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  unsubscribedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'unsubscribed_at'
  },
  // Relationships
  sharedInboxId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'shared_inbox_id'
  },
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
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'campaign_id'
  },
  // Ownership
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id'
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to'
  },
  // Inbox state
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  isStarred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_starred'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_archived'
  },
  isSpam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_spam'
  },
  folder: {
    type: DataTypes.STRING(50),
    defaultValue: 'inbox'
  },
  labels: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  // Template
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'template_id'
  },
  // Scheduling
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_at'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at'
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'received_at'
  },
  // Sequence
  sequenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'sequence_id'
  },
  sequenceStep: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sequence_step'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'EmailMessage',
  tableName: 'email_messages',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['message_id'] },
    { fields: ['thread_id'] },
    { fields: ['direction'] },
    { fields: ['status'] },
    { fields: ['shared_inbox_id'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['deal_id'] },
    { fields: ['lead_id'] },
    { fields: ['campaign_id'] },
    { fields: ['user_id'] },
    { fields: ['assigned_to'] },
    { fields: ['is_read'] },
    { fields: ['folder'] },
    { fields: ['sent_at'] },
    { fields: ['received_at'] },
    { fields: ['created_at'] },
    { fields: ['labels'], using: 'gin' }
  ]
});

export default EmailMessage;
