/**
 * Deal Model
 * Sales opportunities with pipeline management
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Deal extends Model {
  // Calculate weighted value
  getWeightedValue() {
    return parseFloat(this.value) * (this.probability / 100);
  }

  // Calculate days in current stage
  getDaysInStage() {
    if (!this.stageEnteredAt) return 0;
    return Math.floor(
      (Date.now() - new Date(this.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Calculate total deal age
  getDealAge() {
    return Math.floor(
      (Date.now() - new Date(this.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Check if deal is stale
  isStale(staleDays = 14) {
    return this.getDaysInStage() > staleDays;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      value: this.value,
      currency: this.currency,
      stage: this.stage,
      probability: this.probability,
      expectedCloseDate: this.expectedCloseDate,
      status: this.status,
      accountId: this.accountId,
      contactId: this.contactId,
      ownerId: this.ownerId,
      weightedValue: this.getWeightedValue(),
      daysInStage: this.getDaysInStage(),
      dealAge: this.getDealAge(),
      createdAt: this.createdAt
    };
  }
}

Deal.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Pipeline & Stage
  pipelineId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'pipeline_id'
  },
  stageId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'stage_id'
  },
  stage: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Denormalized stage name for quick access'
  },
  stageOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stage_order'
  },
  stageEnteredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'stage_entered_at'
  },
  // Value
  value: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  monthlyRecurringValue: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'monthly_recurring_value'
  },
  annualRecurringValue: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'annual_recurring_value'
  },
  // Probability & Forecast
  probability: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  forecastCategory: {
    type: DataTypes.ENUM('omit', 'pipeline', 'best_case', 'commit', 'closed'),
    defaultValue: 'pipeline',
    field: 'forecast_category'
  },
  // Dates
  expectedCloseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expected_close_date'
  },
  actualCloseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_close_date'
  },
  lastStageChangeAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_stage_change_at'
  },
  nextStepDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_step_date'
  },
  // Status
  status: {
    type: DataTypes.ENUM('open', 'won', 'lost', 'on_hold', 'abandoned'),
    defaultValue: 'open'
  },
  lossReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'loss_reason'
  },
  lossReasonDetail: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'loss_reason_detail'
  },
  competitorName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'competitor_name'
  },
  // Type
  dealType: {
    type: DataTypes.ENUM('new_business', 'expansion', 'renewal', 'upsell', 'cross_sell'),
    defaultValue: 'new_business',
    field: 'deal_type'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
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
    field: 'contact_id',
    comment: 'Primary contact for the deal'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'owner_id'
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'campaign_id'
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'lead_id'
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
  // Next Steps
  nextStep: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'next_step'
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
  // Products
  products: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of product line items'
  },
  // Activity Metrics
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
  activityCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'activity_count'
  },
  emailCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'email_count'
  },
  callCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'call_count'
  },
  meetingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'meeting_count'
  },
  // Sales Cycle
  salesCycleDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sales_cycle_days',
    comment: 'Calculated on close'
  },
  // Scoring
  dealScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deal_score'
  },
  engagementScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'engagement_score'
  },
  // Stage History
  stageHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'stage_history',
    comment: 'Array of { stageId, stage, enteredAt, exitedAt, daysInStage }'
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
  modelName: 'Deal',
  tableName: 'deals',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['pipeline_id'] },
    { fields: ['stage_id'] },
    { fields: ['stage'] },
    { fields: ['status'] },
    { fields: ['owner_id'] },
    { fields: ['team_id'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['campaign_id'] },
    { fields: ['expected_close_date'] },
    { fields: ['actual_close_date'] },
    { fields: ['value'] },
    { fields: ['probability'] },
    { fields: ['forecast_category'] },
    { fields: ['deal_type'] },
    { fields: ['last_activity_at'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ],
  hooks: {
    beforeUpdate: async (deal) => {
      if (deal.changed('stageId')) {
        const previousStageId = deal.previous('stageId');
        const now = new Date();

        // Calculate days in previous stage
        const daysInStage = deal.stageEnteredAt
          ? Math.floor((now.getTime() - new Date(deal.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Add to stage history
        const history = deal.stageHistory || [];
        if (previousStageId) {
          history.push({
            stageId: previousStageId,
            stage: deal.previous('stage'),
            enteredAt: deal.stageEnteredAt,
            exitedAt: now,
            daysInStage
          });
        }

        deal.stageHistory = history;
        deal.stageEnteredAt = now;
        deal.lastStageChangeAt = now;
      }

      // Calculate sales cycle on close
      if (deal.changed('status') && ['won', 'lost'].includes(deal.status)) {
        deal.actualCloseDate = new Date();
        deal.salesCycleDays = Math.floor(
          (deal.actualCloseDate.getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }
  }
});

export default Deal;
