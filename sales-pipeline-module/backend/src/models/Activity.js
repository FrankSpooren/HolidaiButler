/**
 * Activity Model
 * Track all interactions and activities in the CRM
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Activity extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      type: this.type,
      subType: this.subType,
      subject: this.subject,
      description: this.description,
      status: this.status,
      outcome: this.outcome,
      dueDate: this.dueDate,
      completedAt: this.completedAt,
      duration: this.duration,
      accountId: this.accountId,
      contactId: this.contactId,
      dealId: this.dealId,
      leadId: this.leadId,
      userId: this.userId,
      createdAt: this.createdAt
    };
  }
}

Activity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Type
  type: {
    type: DataTypes.ENUM(
      'call',
      'email',
      'meeting',
      'task',
      'note',
      'whatsapp',
      'sms',
      'linkedin',
      'demo',
      'proposal',
      'contract',
      'follow_up',
      'other'
    ),
    allowNull: false
  },
  subType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'sub_type',
    comment: 'Sub-type like: inbound_call, outbound_call, etc.'
  },
  // Content
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'scheduled',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled'
    ),
    defaultValue: 'scheduled'
  },
  // Outcome (for completed activities)
  outcome: {
    type: DataTypes.ENUM(
      'successful',
      'unsuccessful',
      'no_answer',
      'voicemail',
      'busy',
      'wrong_number',
      'not_interested',
      'follow_up_needed',
      'meeting_booked',
      'proposal_sent',
      'deal_advanced',
      'deal_lost',
      'other'
    ),
    allowNull: true
  },
  outcomeNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'outcome_notes'
  },
  // Timing
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_time'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes'
  },
  // Priority
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  // Relationships
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
    allowNull: false,
    field: 'user_id',
    comment: 'Activity owner'
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  // Call specific
  callDirection: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: true,
    field: 'call_direction'
  },
  callRecordingUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'call_recording_url'
  },
  callFrom: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'call_from'
  },
  callTo: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'call_to'
  },
  // Email specific
  emailMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'email_message_id'
  },
  emailDirection: {
    type: DataTypes.ENUM('sent', 'received'),
    allowNull: true,
    field: 'email_direction'
  },
  // Meeting specific
  meetingLocation: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'meeting_location'
  },
  meetingLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'meeting_link'
  },
  meetingType: {
    type: DataTypes.ENUM('in_person', 'phone', 'video', 'other'),
    allowNull: true,
    field: 'meeting_type'
  },
  attendees: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { userId, contactId, email, name, status }'
  },
  // WhatsApp specific
  whatsappMessageId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'whatsapp_message_id'
  },
  // Reminders
  reminderAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reminder_at'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reminder_sent'
  },
  // Visibility
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_private'
  },
  // Billable
  isBillable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_billable'
  },
  billedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'billed_amount'
  },
  // Attachments
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { name, url, type, size }'
  },
  // Tags
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'custom_fields'
  },
  // Integration
  externalIds: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'external_ids'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Activity',
  tableName: 'activities',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['outcome'] },
    { fields: ['user_id'] },
    { fields: ['assigned_to'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['deal_id'] },
    { fields: ['lead_id'] },
    { fields: ['campaign_id'] },
    { fields: ['due_date'] },
    { fields: ['completed_at'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ]
});

export default Activity;
