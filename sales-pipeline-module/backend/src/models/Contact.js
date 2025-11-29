/**
 * Contact Model
 * Individual contacts within B2B accounts
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Contact extends Model {
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  toPublicJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      email: this.email,
      phone: this.phone,
      jobTitle: this.jobTitle,
      department: this.department,
      accountId: this.accountId,
      isPrimary: this.isPrimary,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

Contact.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'account_id'
  },
  // Name
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  salutation: {
    type: DataTypes.ENUM('Mr', 'Mrs', 'Ms', 'Dr', 'Prof'),
    allowNull: true
  },
  // Contact Info
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  secondaryEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'secondary_email'
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mobilePhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'mobile_phone'
  },
  whatsappNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'whatsapp_number'
  },
  whatsappOptIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'whatsapp_opt_in'
  },
  // Professional Info
  jobTitle: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'job_title'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM(
      'decision_maker',
      'influencer',
      'champion',
      'end_user',
      'gatekeeper',
      'evaluator',
      'other'
    ),
    allowNull: true,
    comment: 'Buying role'
  },
  seniorityLevel: {
    type: DataTypes.ENUM(
      'c_level',
      'vp',
      'director',
      'manager',
      'individual_contributor',
      'intern'
    ),
    allowNull: true,
    field: 'seniority_level'
  },
  reportsTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reports_to',
    comment: 'Manager contact ID'
  },
  // Address
  address: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{ street, city, state, postalCode, country }'
  },
  // Social
  linkedinUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'linkedin_url'
  },
  twitterHandle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'twitter_handle'
  },
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'bounced', 'unsubscribed'),
    defaultValue: 'active'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_primary',
    comment: 'Primary contact for account'
  },
  // Marketing
  emailOptIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_opt_in'
  },
  emailOptInAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_opt_in_at'
  },
  emailOptOutAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_opt_out_at'
  },
  marketingStatus: {
    type: DataTypes.ENUM('subscribed', 'unsubscribed', 'cleaned', 'pending'),
    defaultValue: 'subscribed',
    field: 'marketing_status'
  },
  // Lead info
  leadSource: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'lead_source'
  },
  leadSourceDetail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'lead_source_detail'
  },
  // Ownership
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'owner_id'
  },
  // Metrics
  leadScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lead_score'
  },
  engagementScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'engagement_score'
  },
  // Activity tracking
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_activity_at'
  },
  lastContactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_contacted_at'
  },
  lastEmailOpenedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_email_opened_at'
  },
  lastEmailClickedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_email_clicked_at'
  },
  lastRepliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_replied_at'
  },
  emailsOpened: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_opened'
  },
  emailsClicked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_clicked'
  },
  emailsSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_sent'
  },
  emailsBounced: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_bounced'
  },
  // Personal
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth'
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  preferredLanguage: {
    type: DataTypes.STRING(10),
    defaultValue: 'nl',
    field: 'preferred_language'
  },
  preferredContactMethod: {
    type: DataTypes.ENUM('email', 'phone', 'whatsapp', 'any'),
    defaultValue: 'email',
    field: 'preferred_contact_method'
  },
  bestTimeToContact: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'best_time_to_contact'
  },
  // Content
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  modelName: 'Contact',
  tableName: 'contacts',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['account_id'] },
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['is_primary'] },
    { fields: ['lead_score'] },
    { fields: ['first_name', 'last_name'] },
    { fields: ['last_activity_at'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ]
});

export default Contact;
