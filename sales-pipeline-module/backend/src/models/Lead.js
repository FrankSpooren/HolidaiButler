/**
 * Lead Model
 * Lead management before conversion to contact/account/deal
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Lead extends Model {
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  // Check if lead is marketing qualified
  isMarketingQualified() {
    return this.score >= (parseInt(process.env.MQL_THRESHOLD) || 50);
  }

  // Check if lead is sales qualified
  isSalesQualified() {
    return this.score >= (parseInt(process.env.SQL_THRESHOLD) || 75);
  }

  toPublicJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      email: this.email,
      company: this.company,
      status: this.status,
      score: this.score,
      source: this.source,
      ownerId: this.ownerId,
      createdAt: this.createdAt
    };
  }
}

Lead.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Personal Info
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
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
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
  // Company Info
  company: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  jobTitle: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'job_title'
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employee_count'
  },
  annualRevenue: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'annual_revenue'
  },
  // Address
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'new',
      'contacted',
      'engaged',
      'qualified',
      'unqualified',
      'converted',
      'nurturing',
      'recycled',
      'dead'
    ),
    defaultValue: 'new'
  },
  // Source
  source: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sourceDetail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'source_detail'
  },
  utmSource: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'utm_source'
  },
  utmMedium: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'utm_medium'
  },
  utmCampaign: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'utm_campaign'
  },
  utmContent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'utm_content'
  },
  utmTerm: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'utm_term'
  },
  referrer: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  landingPage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'landing_page'
  },
  // Campaign
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'campaign_id'
  },
  // Scoring
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  behaviorScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'behavior_score'
  },
  demographicScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'demographic_score'
  },
  fitScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'fit_score'
  },
  // Qualification
  qualificationStatus: {
    type: DataTypes.ENUM('unqualified', 'mql', 'sal', 'sql', 'opportunity'),
    defaultValue: 'unqualified',
    field: 'qualification_status'
  },
  mqlDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'mql_date'
  },
  sqlDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sql_date'
  },
  disqualificationReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'disqualification_reason'
  },
  // Interest
  interest: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Product/service interest'
  },
  budget: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true
  },
  timeline: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Purchase timeline'
  },
  pain: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Pain points'
  },
  // Ownership
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'owner_id'
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  // Assignment
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'assigned_at'
  },
  assignmentRules: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'assignment_rules',
    comment: 'Rules that matched for auto-assignment'
  },
  // Activity
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
  firstContactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'first_contacted_at'
  },
  responseTimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_time_minutes',
    comment: 'Time to first contact'
  },
  // Engagement
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
  pageViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'page_views'
  },
  formSubmissions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'form_submissions'
  },
  // Conversion
  convertedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'converted_at'
  },
  convertedAccountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'converted_account_id'
  },
  convertedContactId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'converted_contact_id'
  },
  convertedDealId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'converted_deal_id'
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
  modelName: 'Lead',
  tableName: 'leads',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['company'] },
    { fields: ['status'] },
    { fields: ['qualification_status'] },
    { fields: ['owner_id'] },
    { fields: ['team_id'] },
    { fields: ['campaign_id'] },
    { fields: ['source'] },
    { fields: ['score'] },
    { fields: ['last_activity_at'] },
    { fields: ['converted_at'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ],
  hooks: {
    beforeUpdate: async (lead) => {
      // Auto-update qualification status based on score
      if (lead.changed('score')) {
        const sqlThreshold = parseInt(process.env.SQL_THRESHOLD) || 75;
        const mqlThreshold = parseInt(process.env.MQL_THRESHOLD) || 50;

        if (lead.score >= sqlThreshold && lead.qualificationStatus !== 'sql') {
          lead.qualificationStatus = 'sql';
          lead.sqlDate = new Date();
        } else if (lead.score >= mqlThreshold && lead.qualificationStatus === 'unqualified') {
          lead.qualificationStatus = 'mql';
          lead.mqlDate = new Date();
        }
      }
    }
  }
});

export default Lead;
