/**
 * Account Model
 * B2B Company/Organization management with full CRM capabilities
 */

import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../config/database.js';

class Account extends Model {
  // Calculate account health score
  calculateHealthScore() {
    let score = 50; // Base score

    // Activity in last 30 days
    if (this.lastActivityAt) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(this.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity <= 7) score += 20;
      else if (daysSinceActivity <= 14) score += 10;
      else if (daysSinceActivity <= 30) score += 5;
      else score -= 10;
    }

    // Deal value
    if (this.totalDealValue > 100000) score += 15;
    else if (this.totalDealValue > 50000) score += 10;
    else if (this.totalDealValue > 10000) score += 5;

    // Response rate
    if (this.responseRate) {
      score += Math.floor(this.responseRate * 15);
    }

    // Lifetime value
    if (this.lifetimeValue > 500000) score += 10;
    else if (this.lifetimeValue > 100000) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  // Get primary contact
  async getPrimaryContact() {
    const Contact = sequelize.models.Contact;
    return Contact.findOne({
      where: {
        accountId: this.id,
        isPrimary: true
      }
    });
  }

  // Get open deals
  async getOpenDeals() {
    const Deal = sequelize.models.Deal;
    return Deal.findAll({
      where: {
        accountId: this.id,
        status: { [Op.notIn]: ['won', 'lost'] }
      }
    });
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      industry: this.industry,
      employeeCount: this.employeeCount,
      annualRevenue: this.annualRevenue,
      type: this.type,
      status: this.status,
      tier: this.tier,
      healthScore: this.healthScore,
      owner: this.owner,
      createdAt: this.createdAt
    };
  }
}

Account.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  legalName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'legal_name'
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  subIndustry: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'sub_industry'
  },
  type: {
    type: DataTypes.ENUM(
      'prospect',
      'customer',
      'partner',
      'competitor',
      'vendor',
      'other'
    ),
    defaultValue: 'prospect'
  },
  status: {
    type: DataTypes.ENUM(
      'active',
      'inactive',
      'churned',
      'at_risk',
      'on_hold'
    ),
    defaultValue: 'active'
  },
  tier: {
    type: DataTypes.ENUM('enterprise', 'mid_market', 'smb', 'startup'),
    allowNull: true,
    comment: 'Account tier/segment'
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Lead source'
  },
  sourceDetail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'source_detail'
  },
  // Company Details
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employee_count'
  },
  employeeRange: {
    type: DataTypes.ENUM(
      '1-10',
      '11-50',
      '51-200',
      '201-500',
      '501-1000',
      '1001-5000',
      '5000+'
    ),
    allowNull: true,
    field: 'employee_range'
  },
  annualRevenue: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'annual_revenue'
  },
  revenueRange: {
    type: DataTypes.ENUM(
      '<1M',
      '1M-10M',
      '10M-50M',
      '50M-100M',
      '100M-500M',
      '500M-1B',
      '1B+'
    ),
    allowNull: true,
    field: 'revenue_range'
  },
  fiscalYearEnd: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'fiscal_year_end'
  },
  foundedYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'founded_year'
  },
  // Address
  billingAddress: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'billing_address',
    comment: '{ street, city, state, postalCode, country }'
  },
  shippingAddress: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'shipping_address'
  },
  // Contact Info
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  fax: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Social Media
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
  facebookUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'facebook_url'
  },
  // Registration
  vatNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'vat_number'
  },
  kvkNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'kvk_number',
    comment: 'Dutch Chamber of Commerce number'
  },
  taxId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_id'
  },
  // Ownership
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'owner_id',
    comment: 'Primary sales owner'
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  // Parent/Child relationships
  parentAccountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_account_id'
  },
  // Metrics
  healthScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'health_score',
    validate: {
      min: 0,
      max: 100
    }
  },
  lifetimeValue: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'lifetime_value'
  },
  totalDealValue: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'total_deal_value'
  },
  openDealCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'open_deal_count'
  },
  wonDealCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'won_deal_count'
  },
  lostDealCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lost_deal_count'
  },
  responseRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0,
    field: 'response_rate',
    comment: 'Email/call response rate (0-1)'
  },
  // Activity tracking
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_activity_at'
  },
  lastActivityType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'last_activity_type'
  },
  lastContactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_contacted_at'
  },
  nextFollowUpAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_follow_up_at'
  },
  // Dates
  becameCustomerAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'became_customer_at'
  },
  churnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'churned_at'
  },
  renewalDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'renewal_date'
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
  // Tags and categorization
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'custom_fields'
  },
  // Integration IDs
  externalIds: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'external_ids',
    comment: 'IDs from external systems (hubspot_id, salesforce_id, etc.)'
  },
  // Scoring
  leadScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lead_score',
    validate: {
      min: 0,
      max: 100
    }
  },
  fitScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'fit_score',
    comment: 'Ideal customer fit score'
  },
  engagementScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'engagement_score'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Account',
  tableName: 'accounts',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['domain'], unique: true, where: { domain: { [Op.ne]: null } } },
    { fields: ['owner_id'] },
    { fields: ['team_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['tier'] },
    { fields: ['industry'] },
    { fields: ['health_score'] },
    { fields: ['lead_score'] },
    { fields: ['parent_account_id'] },
    { fields: ['last_activity_at'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' },
    { fields: ['custom_fields'], using: 'gin' }
  ],
  hooks: {
    beforeSave: async (account) => {
      // Calculate health score before saving
      if (account.changed('lastActivityAt') ||
          account.changed('totalDealValue') ||
          account.changed('responseRate')) {
        account.healthScore = account.calculateHealthScore();
      }
    }
  }
});

export default Account;
