/**
 * Campaign Model
 * Marketing and sales campaign management
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Campaign extends Model {
  // Calculate ROI
  calculateROI() {
    if (!this.actualCost || this.actualCost === 0) return 0;
    return ((this.revenue - this.actualCost) / this.actualCost) * 100;
  }

  // Calculate conversion rate
  getConversionRate() {
    if (!this.leadsGenerated || this.leadsGenerated === 0) return 0;
    return (this.dealsWon / this.leadsGenerated) * 100;
  }

  // Calculate cost per lead
  getCostPerLead() {
    if (!this.leadsGenerated || this.leadsGenerated === 0) return 0;
    return this.actualCost / this.leadsGenerated;
  }

  // Calculate cost per deal
  getCostPerDeal() {
    if (!this.dealsWon || this.dealsWon === 0) return 0;
    return this.actualCost / this.dealsWon;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      budget: this.budget,
      actualCost: this.actualCost,
      revenue: this.revenue,
      roi: this.calculateROI(),
      leadsGenerated: this.leadsGenerated,
      dealsWon: this.dealsWon,
      conversionRate: this.getConversionRate(),
      startDate: this.startDate,
      endDate: this.endDate,
      ownerId: this.ownerId,
      createdAt: this.createdAt
    };
  }
}

Campaign.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Unique campaign code for tracking'
  },
  type: {
    type: DataTypes.ENUM(
      'email',
      'social_media',
      'paid_ads',
      'content_marketing',
      'webinar',
      'event',
      'referral',
      'direct_mail',
      'cold_outreach',
      'partner',
      'seo',
      'other'
    ),
    defaultValue: 'email'
  },
  channel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Specific channel (e.g., LinkedIn, Google Ads)'
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'scheduled',
      'active',
      'paused',
      'completed',
      'cancelled'
    ),
    defaultValue: 'draft'
  },
  // Dates
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  actualStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_start_date'
  },
  actualEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_end_date'
  },
  // Budget
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  actualCost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'actual_cost'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  // Targets
  targetLeads: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'target_leads'
  },
  targetDeals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'target_deals'
  },
  targetRevenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'target_revenue'
  },
  // Metrics - Leads
  leadsGenerated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'leads_generated'
  },
  leadsQualified: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'leads_qualified'
  },
  leadsConverted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'leads_converted'
  },
  // Metrics - Deals
  dealsCreated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deals_created'
  },
  dealsWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deals_won'
  },
  dealsLost: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deals_lost'
  },
  // Metrics - Revenue
  revenue: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0
  },
  pipelineValue: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'pipeline_value'
  },
  // Metrics - Email
  emailsSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_sent'
  },
  emailsDelivered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_delivered'
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
  emailsBounced: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_bounced'
  },
  emailsUnsubscribed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'emails_unsubscribed'
  },
  // Metrics - Engagement
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  responses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  meetings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  // Parent campaign (for sub-campaigns)
  parentCampaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_campaign_id'
  },
  // Targeting
  targetAudience: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'target_audience',
    comment: 'Audience criteria and segments'
  },
  targetIndustries: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'target_industries'
  },
  targetCompanySizes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'target_company_sizes'
  },
  targetRegions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'target_regions'
  },
  // Content
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  keyMessages: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
    field: 'key_messages'
  },
  callToAction: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'call_to_action'
  },
  landingPageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'landing_page_url'
  },
  // UTM Parameters
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
  modelName: 'Campaign',
  tableName: 'campaigns',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['code'], unique: true },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['owner_id'] },
    { fields: ['team_id'] },
    { fields: ['parent_campaign_id'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ]
});

export default Campaign;
