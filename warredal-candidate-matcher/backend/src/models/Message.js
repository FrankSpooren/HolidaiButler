import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
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
  vacancyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vacancies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // Bericht content
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Voor email berichten'
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Bericht inhoud (plain text of HTML)'
  },
  bodyHtml: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'HTML versie van bericht'
  },
  // Message type
  messageType: {
    type: DataTypes.ENUM('linkedin', 'email', 'other'),
    defaultValue: 'linkedin'
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Specifiek kanaal (bijv. "LinkedIn InMail", "Email")'
  },
  // Template & personalization
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID van gebruikte template'
  },
  personalizationData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Data gebruikt voor personalisatie'
  },
  // AI generation metadata
  isAiGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  aiProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'bijv. "MailerLite AI"'
  },
  aiPrompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Prompt gebruikt voor AI generatie'
  },
  generationMetadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Extra metadata over generatie'
  },
  // Versioning
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Versie nummer bij meerdere drafts'
  },
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'approved', 'sent', 'failed'),
    defaultValue: 'draft'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Tracking
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID in externe systeem (MailerLite campaign ID)'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'messages',
  indexes: [
    {
      fields: ['candidate_id']
    },
    {
      fields: ['vacancy_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['message_type']
    }
  ]
});

export default Message;
