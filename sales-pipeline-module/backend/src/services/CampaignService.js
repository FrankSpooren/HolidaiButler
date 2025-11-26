/**
 * Campaign Service - Enterprise Marketing Campaign Management
 * Handles campaign creation, tracking, ROI analysis, and lead attribution
 */

import { Op, fn, col, literal } from 'sequelize';
import { Campaign, Lead, Deal, Activity, User, Team, sequelize } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import logger from '../utils/logger.js';
import NotificationService from './NotificationService.js';

class CampaignService {
  /**
   * Create a new campaign
   */
  async create(campaignData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const campaign = await Campaign.create({
        ...campaignData,
        ownerId: campaignData.ownerId || userId,
        createdById: userId,
        status: 'draft'
      }, { transaction });

      await Activity.create({
        type: 'campaign_created',
        subject: `Campaign created: ${campaign.name}`,
        campaignId: campaign.id,
        userId,
        metadata: { campaignId: campaign.id }
      }, { transaction });

      await transaction.commit();

      logger.audit('campaign_created', userId, { campaignId: campaign.id });

      return this.getById(campaign.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID with metrics
   */
  async getById(campaignId, userId, options = {}) {
    const cacheKey = `campaign:${campaignId}`;

    if (!options.skipCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] }
      ]
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(campaignId);

    const result = {
      ...campaign.toJSON(),
      metrics
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get all campaigns with filtering
   */
  async getAll(filters = {}, userId, userRole) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      status,
      type,
      channel,
      ownerId,
      teamId,
      startAfter,
      endBefore
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (channel) where.channel = channel;
    if (ownerId) where.ownerId = ownerId;
    if (teamId) where.teamId = teamId;

    if (startAfter) where.startDate = { [Op.gte]: new Date(startAfter) };
    if (endBefore) where.endDate = { [Op.lte]: new Date(endBefore) };

    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    const { count, rows } = await Campaign.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: Math.min(limit, 100),
      offset,
      distinct: true
    });

    return {
      campaigns: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Update campaign
   */
  async update(campaignId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const campaign = await Campaign.findByPk(campaignId, { transaction });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent updating completed campaigns
      if (campaign.status === 'completed' && updateData.status !== 'completed') {
        throw new Error('Cannot modify a completed campaign');
      }

      const changes = {};
      Object.keys(updateData).forEach(key => {
        if (campaign[key] !== updateData[key]) {
          changes[key] = { from: campaign[key], to: updateData[key] };
        }
      });

      await campaign.update(updateData, { transaction });

      if (Object.keys(changes).length > 0) {
        await Activity.create({
          type: 'campaign_updated',
          subject: `Campaign updated: ${campaign.name}`,
          campaignId: campaign.id,
          userId,
          metadata: { changes }
        }, { transaction });
      }

      await transaction.commit();
      await cacheService.del(`campaign:${campaignId}`);

      logger.audit('campaign_updated', userId, { campaignId, changes });

      return this.getById(campaignId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async delete(campaignId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const campaign = await Campaign.findByPk(campaignId, { transaction });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check for associated leads
      const leadCount = await Lead.count({ where: { campaignId }, transaction });

      if (leadCount > 0 && campaign.status !== 'draft') {
        throw new Error(`Cannot delete campaign with ${leadCount} associated leads`);
      }

      await campaign.destroy({ transaction });

      await Activity.create({
        type: 'campaign_deleted',
        subject: `Campaign deleted: ${campaign.name}`,
        userId,
        metadata: { campaignId, name: campaign.name }
      }, { transaction });

      await transaction.commit();
      await cacheService.del(`campaign:${campaignId}`);

      logger.audit('campaign_deleted', userId, { campaignId });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Launch campaign
   */
  async launch(campaignId, userId) {
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign can only be launched from draft or scheduled status');
    }

    await campaign.update({
      status: 'active',
      startDate: campaign.startDate || new Date(),
      launchedAt: new Date(),
      launchedById: userId
    });

    await Activity.create({
      type: 'campaign_launched',
      subject: `Campaign launched: ${campaign.name}`,
      campaignId: campaign.id,
      userId
    });

    // Notify team
    if (campaign.teamId) {
      await NotificationService.notifyTeam(campaign.teamId, {
        type: 'campaign_launched',
        title: 'Campaign Launched',
        message: `Campaign "${campaign.name}" is now active`,
        link: `/campaigns/${campaignId}`
      });
    }

    await cacheService.del(`campaign:${campaignId}`);

    logger.audit('campaign_launched', userId, { campaignId });

    return this.getById(campaignId, userId, { skipCache: true });
  }

  /**
   * Pause campaign
   */
  async pause(campaignId, userId) {
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'active') {
      throw new Error('Only active campaigns can be paused');
    }

    await campaign.update({ status: 'paused' });

    await Activity.create({
      type: 'campaign_paused',
      subject: `Campaign paused: ${campaign.name}`,
      campaignId: campaign.id,
      userId
    });

    await cacheService.del(`campaign:${campaignId}`);

    logger.audit('campaign_paused', userId, { campaignId });

    return this.getById(campaignId, userId, { skipCache: true });
  }

  /**
   * Complete campaign
   */
  async complete(campaignId, userId) {
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate final metrics
    const metrics = await this.calculateMetrics(campaignId);

    await campaign.update({
      status: 'completed',
      endDate: campaign.endDate || new Date(),
      completedAt: new Date(),
      completedById: userId,
      actualCost: campaign.actualCost || campaign.budget,
      ...metrics
    });

    await Activity.create({
      type: 'campaign_completed',
      subject: `Campaign completed: ${campaign.name}`,
      campaignId: campaign.id,
      userId,
      metadata: { metrics }
    });

    await cacheService.del(`campaign:${campaignId}`);

    logger.audit('campaign_completed', userId, { campaignId, metrics });

    return this.getById(campaignId, userId, { skipCache: true });
  }

  /**
   * Calculate campaign metrics
   */
  async calculateMetrics(campaignId) {
    const [leadStats, dealStats] = await Promise.all([
      Lead.findAll({
        where: { campaignId },
        attributes: [
          [fn('COUNT', col('id')), 'totalLeads'],
          [fn('COUNT', literal('CASE WHEN status = \'converted\' THEN 1 END')), 'convertedLeads'],
          [fn('COUNT', literal('CASE WHEN qualification_status = \'qualified\' THEN 1 END')), 'qualifiedLeads'],
          [fn('AVG', col('score')), 'avgLeadScore']
        ],
        raw: true
      }),
      Deal.findAll({
        where: {
          source: 'campaign',
          metadata: { campaignId }
        },
        attributes: [
          [fn('COUNT', col('id')), 'totalDeals'],
          [fn('SUM', literal('CASE WHEN status = \'won\' THEN value ELSE 0 END')), 'revenue'],
          [fn('COUNT', literal('CASE WHEN status = \'won\' THEN 1 END')), 'wonDeals']
        ],
        raw: true
      })
    ]);

    const leads = leadStats[0] || {};
    const deals = dealStats[0] || {};

    const campaign = await Campaign.findByPk(campaignId);
    const budget = campaign?.budget || 0;
    const actualCost = campaign?.actualCost || budget;

    const totalLeads = parseInt(leads.totalLeads) || 0;
    const convertedLeads = parseInt(leads.convertedLeads) || 0;
    const revenue = parseFloat(deals.revenue) || 0;

    return {
      leads: totalLeads,
      conversions: convertedLeads,
      qualifiedLeads: parseInt(leads.qualifiedLeads) || 0,
      avgLeadScore: Math.round(parseFloat(leads.avgLeadScore) || 0),
      deals: parseInt(deals.totalDeals) || 0,
      wonDeals: parseInt(deals.wonDeals) || 0,
      revenue,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
      costPerLead: totalLeads > 0 ? (actualCost / totalLeads).toFixed(2) : 0,
      costPerConversion: convertedLeads > 0 ? (actualCost / convertedLeads).toFixed(2) : 0,
      roi: actualCost > 0 ? (((revenue - actualCost) / actualCost) * 100).toFixed(1) : 0
    };
  }

  /**
   * Get campaign leads
   */
  async getLeads(campaignId, filters = {}) {
    const { page = 1, limit = 20, status, qualificationStatus } = filters;

    const where = { campaignId };
    if (status) where.status = status;
    if (qualificationStatus) where.qualificationStatus = qualificationStatus;

    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    return {
      leads: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    };
  }

  /**
   * Get campaign performance over time
   */
  async getPerformanceTimeline(campaignId, interval = 'day') {
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const dateFormat = interval === 'day' ? 'YYYY-MM-DD' :
                       interval === 'week' ? 'IYYY-IW' : 'YYYY-MM';

    const timeline = await Lead.findAll({
      where: { campaignId },
      attributes: [
        [fn('TO_CHAR', col('created_at'), dateFormat), 'period'],
        [fn('COUNT', col('id')), 'leads'],
        [fn('COUNT', literal('CASE WHEN status = \'converted\' THEN 1 END')), 'conversions']
      ],
      group: [fn('TO_CHAR', col('created_at'), dateFormat)],
      order: [[fn('TO_CHAR', col('created_at'), dateFormat), 'ASC']],
      raw: true
    });

    return timeline;
  }

  /**
   * Clone campaign
   */
  async clone(campaignId, newName, userId) {
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const clonedCampaign = await Campaign.create({
      name: newName || `${campaign.name} (Copy)`,
      description: campaign.description,
      type: campaign.type,
      channel: campaign.channel,
      budget: campaign.budget,
      targetAudience: campaign.targetAudience,
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: `${campaign.utmCampaign}_copy`,
      ownerId: userId,
      teamId: campaign.teamId,
      status: 'draft',
      metadata: { clonedFrom: campaignId }
    });

    logger.audit('campaign_cloned', userId, { sourceId: campaignId, newId: clonedCampaign.id });

    return this.getById(clonedCampaign.id, userId);
  }

  /**
   * Get campaign statistics summary
   */
  async getStatsSummary(filters = {}, userId, userRole) {
    const where = {};

    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    if (filters.period) {
      const now = new Date();
      let startDate;

      switch (filters.period) {
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        where.createdAt = { [Op.gte]: startDate };
      }
    }

    const [byStatus, byType, totals] = await Promise.all([
      Campaign.findAll({
        where,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Campaign.findAll({
        where,
        attributes: ['type', [fn('COUNT', col('id')), 'count']],
        group: ['type'],
        raw: true
      }),
      Campaign.findOne({
        where,
        attributes: [
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', col('budget')), 'totalBudget'],
          [fn('SUM', col('revenue')), 'totalRevenue'],
          [fn('SUM', col('leads')), 'totalLeads'],
          [fn('SUM', col('conversions')), 'totalConversions']
        ],
        raw: true
      })
    ]);

    return {
      total: parseInt(totals?.total) || 0,
      totalBudget: parseFloat(totals?.totalBudget) || 0,
      totalRevenue: parseFloat(totals?.totalRevenue) || 0,
      totalLeads: parseInt(totals?.totalLeads) || 0,
      totalConversions: parseInt(totals?.totalConversions) || 0,
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {}),
      byType: byType.reduce((acc, row) => ({ ...acc, [row.type]: parseInt(row.count) }), {})
    };
  }
}

export default new CampaignService();
