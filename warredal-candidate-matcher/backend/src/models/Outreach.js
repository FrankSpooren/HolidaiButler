import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Outreach = sequelize.define('Outreach', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'candidates',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'messages',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // Outreach details
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  sentBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sentVia: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Platform/service gebruikt voor verzending'
  },
  // Delivery tracking
  deliveryStatus: {
    type: DataTypes.ENUM('pending', 'delivered', 'failed', 'bounced', 'unknown'),
    defaultValue: 'pending'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveryError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Response tracking
  hasResponse: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  firstResponseAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastResponseAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responseCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  responseData: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array van response objecten'
  },
  // Sentiment analysis (optioneel)
  responseSentiment: {
    type: DataTypes.ENUM('positive', 'neutral', 'negative', 'unknown'),
    defaultValue: 'unknown'
  },
  // Follow-up tracking
  followUpCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastFollowUpAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextFollowUpAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Geplande volgende follow-up'
  },
  // Engagement metrics
  opened: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Bericht geopend (indien trackbaar)'
  },
  openedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clicked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Link geklikt (indien trackbaar)'
  },
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // External tracking
  externalTrackingId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID in extern systeem (MailerLite, etc.)'
  },
  trackingData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Extra tracking data van externe platforms'
  },
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'outreach',
  indexes: [
    {
      fields: ['candidate_id']
    },
    {
      fields: ['message_id']
    },
    {
      fields: ['sent_at']
    },
    {
      fields: ['has_response']
    },
    {
      fields: ['delivery_status']
    }
  ]
});

// Computed property
Outreach.prototype.getResponseRate = function() {
  return this.responseCount > 0 ? 1 : 0;
};

export default Outreach;
