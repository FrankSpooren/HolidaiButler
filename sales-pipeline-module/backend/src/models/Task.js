/**
 * Task Model
 * Task management with reminders and automation
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Task extends Model {
  // Check if task is overdue
  isOverdue() {
    if (this.status === 'completed') return false;
    if (!this.dueDate) return false;
    return new Date() > new Date(this.dueDate);
  }

  // Get days until due
  getDaysUntilDue() {
    if (!this.dueDate) return null;
    const diff = new Date(this.dueDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate,
      assignedTo: this.assignedTo,
      accountId: this.accountId,
      contactId: this.contactId,
      dealId: this.dealId,
      isOverdue: this.isOverdue(),
      daysUntilDue: this.getDaysUntilDue(),
      createdAt: this.createdAt
    };
  }
}

Task.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM(
      'call',
      'email',
      'meeting',
      'follow_up',
      'demo',
      'proposal',
      'contract',
      'review',
      'research',
      'administrative',
      'other'
    ),
    defaultValue: 'follow_up'
  },
  status: {
    type: DataTypes.ENUM(
      'not_started',
      'in_progress',
      'waiting',
      'deferred',
      'completed',
      'cancelled'
    ),
    defaultValue: 'not_started'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  // Dates
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date'
  },
  dueTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'due_time'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  completedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'completed_by'
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
  activityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'activity_id',
    comment: 'Related activity'
  },
  // Ownership
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to'
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'assigned_at'
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  // Reminders
  reminders: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { type: email|whatsapp|inapp, offset: minutes, sent: boolean }'
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reminder_sent_at'
  },
  // Recurrence
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_recurring'
  },
  recurrencePattern: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'recurrence_pattern',
    comment: '{ frequency: daily|weekly|monthly, interval: number, endDate, daysOfWeek }'
  },
  parentTaskId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_task_id',
    comment: 'Parent task for recurring'
  },
  // Automation
  isAutomated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_automated'
  },
  automationRuleId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'automation_rule_id'
  },
  // Dependencies
  blockedBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'blocked_by',
    comment: 'Task IDs that block this task'
  },
  // Effort
  estimatedMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'estimated_minutes'
  },
  actualMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'actual_minutes'
  },
  // Checklist
  checklist: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { id, text, completed, completedAt }'
  },
  // Outcome
  outcome: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes on task completion'
  },
  // Notifications
  notifyOnComplete: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'notify_on_complete',
    comment: 'User IDs to notify when completed'
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
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Task',
  tableName: 'tasks',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['type'] },
    { fields: ['assigned_to'] },
    { fields: ['created_by'] },
    { fields: ['team_id'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['deal_id'] },
    { fields: ['lead_id'] },
    { fields: ['due_date'] },
    { fields: ['completed_at'] },
    { fields: ['is_recurring'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ],
  hooks: {
    beforeUpdate: async (task) => {
      if (task.changed('status') && task.status === 'completed') {
        task.completedAt = new Date();
      }
    }
  }
});

export default Task;
