/**
 * Comment Model
 * Comments and mentions on CRM records
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Comment extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      content: this.content,
      entityType: this.entityType,
      entityId: this.entityId,
      authorId: this.authorId,
      mentions: this.mentions,
      isPinned: this.isPinned,
      parentId: this.parentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

Comment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Content
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contentHtml: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'content_html',
    comment: 'Rendered HTML with mentions'
  },
  // Entity relation
  entityType: {
    type: DataTypes.ENUM(
      'account',
      'contact',
      'deal',
      'lead',
      'task',
      'activity',
      'quote',
      'document'
    ),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id'
  },
  // Author
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'author_id'
  },
  // Mentions
  mentions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { userId, userName, notified }'
  },
  // Threading
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_id',
    comment: 'Parent comment ID for replies'
  },
  replyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'reply_count'
  },
  // Pinning
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_pinned'
  },
  pinnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pinned_at'
  },
  pinnedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'pinned_by'
  },
  // Editing
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_edited'
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'edited_at'
  },
  editHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'edit_history',
    comment: 'Array of { content, editedAt }'
  },
  // Visibility
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_private'
  },
  visibleTo: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'visible_to',
    comment: 'User IDs who can see private comment'
  },
  // Attachments
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { name, url, type, size }'
  },
  // Reactions
  reactions: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{ emoji: [userIds] }'
  },
  // Resolution (for questions/issues)
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_resolved'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'resolved_by'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Comment',
  tableName: 'comments',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['author_id'] },
    { fields: ['parent_id'] },
    { fields: ['is_pinned'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeUpdate: async (comment) => {
      if (comment.changed('content')) {
        // Track edit history
        const history = comment.editHistory || [];
        history.push({
          content: comment.previous('content'),
          editedAt: new Date()
        });
        comment.editHistory = history;
        comment.isEdited = true;
        comment.editedAt = new Date();
      }
    }
  }
});

export default Comment;
