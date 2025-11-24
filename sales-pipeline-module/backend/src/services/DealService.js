/**
 * Deal Service
 * Sales pipeline and deal management
 */

import { Op } from 'sequelize';
import {
  Deal,
  Account,
  Contact,
  User,
  Pipeline,
  PipelineStage,
  Activity,
  AuditLog,
  Notification
} from '../models/index.js';
import { cacheService, cacheKeys, pubsub } from '../config/redis.js';
import NotificationService from './NotificationService.js';
import logger from '../utils/logger.js';

class DealService {
  /**
   * Create a new deal
   */
  async create(dealData, userId) {
    try {
      // Get pipeline and stage info
      const stage = await PipelineStage.findByPk(dealData.stageId, {
        include: [{ model: Pipeline, as: 'pipeline' }]
      });

      if (!stage) {
        throw new Error('Invalid pipeline stage');
      }

      const deal = await Deal.create({
        ...dealData,
        pipelineId: stage.pipelineId,
        stage: stage.name,
        stageOrder: stage.order,
        stageEnteredAt: new Date(),
        probability: dealData.probability || stage.probability,
        ownerId: dealData.ownerId || userId
      });

      // Update account metrics
      if (deal.accountId) {
        await this.updateAccountMetrics(deal.accountId);
      }

      // Create activity
      await Activity.create({
        type: 'note',
        subType: 'deal_created',
        subject: `Deal "${deal.name}" created`,
        description: `Deal created with value ${deal.currency} ${deal.value}`,
        status: 'completed',
        completedAt: new Date(),
        dealId: deal.id,
        accountId: deal.accountId,
        contactId: deal.contactId,
        userId,
        createdBy: userId
      });

      // Log audit
      await this.logAudit('create', deal.id, userId, deal.toJSON());

      // Notify if assigned to someone else
      if (deal.ownerId && deal.ownerId !== userId) {
        await NotificationService.notify(deal.ownerId, {
          type: 'deal_assigned',
          title: 'New Deal Assigned',
          message: `You have been assigned deal "${deal.name}"`,
          dealId: deal.id,
          accountId: deal.accountId
        });
      }

      // Publish event
      await pubsub.publish('deal:created', {
        dealId: deal.id,
        userId,
        accountId: deal.accountId
      });

      return deal;
    } catch (error) {
      logger.error('Create deal error:', error);
      throw error;
    }
  }

  /**
   * Update deal
   */
  async update(dealId, updates, userId) {
    try {
      const deal = await Deal.findByPk(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      const oldData = deal.toJSON();

      // Handle stage change
      if (updates.stageId && updates.stageId !== deal.stageId) {
        const newStage = await PipelineStage.findByPk(updates.stageId);
        if (!newStage) {
          throw new Error('Invalid stage');
        }

        updates.stage = newStage.name;
        updates.stageOrder = newStage.order;
        updates.probability = updates.probability || newStage.probability;

        // Create stage change activity
        await Activity.create({
          type: 'note',
          subType: 'stage_change',
          subject: `Deal moved to "${newStage.name}"`,
          description: `Deal stage changed from "${deal.stage}" to "${newStage.name}"`,
          status: 'completed',
          completedAt: new Date(),
          dealId: deal.id,
          accountId: deal.accountId,
          userId,
          createdBy: userId
        });

        // Notify owner
        if (deal.ownerId && deal.ownerId !== userId) {
          await NotificationService.notify(deal.ownerId, {
            type: 'deal_stage_change',
            title: 'Deal Stage Updated',
            message: `Deal "${deal.name}" moved to "${newStage.name}"`,
            dealId: deal.id
          });
        }
      }

      // Handle owner change
      if (updates.ownerId && updates.ownerId !== deal.ownerId) {
        await NotificationService.notify(updates.ownerId, {
          type: 'deal_assigned',
          title: 'Deal Assigned',
          message: `You have been assigned deal "${deal.name}"`,
          dealId: deal.id
        });
      }

      await deal.update(updates);

      // Update account metrics if value changed
      if (deal.accountId && updates.value !== undefined) {
        await this.updateAccountMetrics(deal.accountId);
      }

      // Log audit
      await this.logAudit('update', deal.id, userId, {
        before: oldData,
        after: deal.toJSON()
      });

      // Invalidate cache
      await cacheService.del(cacheKeys.deal(dealId));

      return deal;
    } catch (error) {
      logger.error('Update deal error:', error);
      throw error;
    }
  }

  /**
   * Move deal to won
   */
  async markWon(dealId, userId, details = {}) {
    try {
      const deal = await Deal.findByPk(dealId, {
        include: [{ model: Account, as: 'account' }]
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Find won stage
      const wonStage = await PipelineStage.findOne({
        where: {
          pipelineId: deal.pipelineId,
          type: 'won'
        }
      });

      await deal.update({
        status: 'won',
        stageId: wonStage?.id,
        stage: wonStage?.name || 'Won',
        probability: 100,
        forecastCategory: 'closed',
        actualCloseDate: new Date(),
        ...details
      });

      // Update account
      if (deal.account) {
        const updates = {
          wonDealCount: (deal.account.wonDealCount || 0) + 1,
          lifetimeValue: parseFloat(deal.account.lifetimeValue || 0) + parseFloat(deal.value || 0)
        };

        // Mark as customer if prospect
        if (deal.account.type === 'prospect') {
          updates.type = 'customer';
          updates.becameCustomerAt = new Date();
        }

        await deal.account.update(updates);
      }

      // Create activity
      await Activity.create({
        type: 'note',
        subType: 'deal_won',
        subject: `Deal "${deal.name}" won!`,
        description: `Deal closed won with value ${deal.currency} ${deal.value}`,
        status: 'completed',
        completedAt: new Date(),
        dealId: deal.id,
        accountId: deal.accountId,
        userId,
        createdBy: userId
      });

      // Notify team
      await NotificationService.notify(deal.ownerId, {
        type: 'deal_won',
        title: 'Deal Won!',
        message: `Congratulations! Deal "${deal.name}" has been won!`,
        dealId: deal.id
      });

      // Log audit
      await this.logAudit('update', deal.id, userId, { status: 'won' });

      return deal;
    } catch (error) {
      logger.error('Mark deal won error:', error);
      throw error;
    }
  }

  /**
   * Move deal to lost
   */
  async markLost(dealId, userId, lossReason, lossReasonDetail = null, competitorName = null) {
    try {
      const deal = await Deal.findByPk(dealId, {
        include: [{ model: Account, as: 'account' }]
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Find lost stage
      const lostStage = await PipelineStage.findOne({
        where: {
          pipelineId: deal.pipelineId,
          type: 'lost'
        }
      });

      await deal.update({
        status: 'lost',
        stageId: lostStage?.id,
        stage: lostStage?.name || 'Lost',
        probability: 0,
        forecastCategory: 'closed',
        actualCloseDate: new Date(),
        lossReason,
        lossReasonDetail,
        competitorName
      });

      // Update account
      if (deal.account) {
        await deal.account.update({
          lostDealCount: (deal.account.lostDealCount || 0) + 1
        });
      }

      // Create activity
      await Activity.create({
        type: 'note',
        subType: 'deal_lost',
        subject: `Deal "${deal.name}" lost`,
        description: `Deal closed lost. Reason: ${lossReason}`,
        status: 'completed',
        completedAt: new Date(),
        dealId: deal.id,
        accountId: deal.accountId,
        userId,
        createdBy: userId
      });

      // Notify owner
      await NotificationService.notify(deal.ownerId, {
        type: 'deal_lost',
        title: 'Deal Lost',
        message: `Deal "${deal.name}" has been marked as lost`,
        dealId: deal.id
      });

      // Log audit
      await this.logAudit('update', deal.id, userId, { status: 'lost', lossReason });

      return deal;
    } catch (error) {
      logger.error('Mark deal lost error:', error);
      throw error;
    }
  }

  /**
   * Get deal by ID
   */
  async getById(dealId, includeRelations = true) {
    try {
      // Try cache first
      const cached = await cacheService.get(cacheKeys.deal(dealId));
      if (cached && !includeRelations) {
        return cached;
      }

      const include = includeRelations ? [
        { model: Account, as: 'account' },
        { model: Contact, as: 'primaryContact' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: Pipeline, as: 'pipeline' },
        { model: PipelineStage, as: 'currentStage' }
      ] : [];

      const deal = await Deal.findByPk(dealId, { include });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Cache result
      await cacheService.set(cacheKeys.deal(dealId), deal.toPublicJSON(), 300);

      return deal;
    } catch (error) {
      logger.error('Get deal error:', error);
      throw error;
    }
  }

  /**
   * List deals with filters
   */
  async list(filters = {}, pagination = {}) {
    try {
      const {
        pipelineId,
        stageId,
        stage,
        status = 'open',
        ownerId,
        teamId,
        accountId,
        minValue,
        maxValue,
        expectedCloseDateFrom,
        expectedCloseDateTo,
        search,
        tags
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = pagination;

      const where = {};

      if (pipelineId) where.pipelineId = pipelineId;
      if (stageId) where.stageId = stageId;
      if (stage) where.stage = stage;
      if (status) where.status = status;
      if (ownerId) where.ownerId = ownerId;
      if (teamId) where.teamId = teamId;
      if (accountId) where.accountId = accountId;

      if (minValue !== undefined || maxValue !== undefined) {
        where.value = {};
        if (minValue !== undefined) where.value[Op.gte] = minValue;
        if (maxValue !== undefined) where.value[Op.lte] = maxValue;
      }

      if (expectedCloseDateFrom || expectedCloseDateTo) {
        where.expectedCloseDate = {};
        if (expectedCloseDateFrom) where.expectedCloseDate[Op.gte] = expectedCloseDateFrom;
        if (expectedCloseDateTo) where.expectedCloseDate[Op.lte] = expectedCloseDateTo;
      }

      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }

      if (tags && tags.length > 0) {
        where.tags = { [Op.overlap]: tags };
      }

      const { count, rows } = await Deal.findAndCountAll({
        where,
        include: [
          { model: Account, as: 'account', attributes: ['id', 'name'] },
          { model: Contact, as: 'primaryContact', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
        ],
        order: [[sortBy, sortOrder]],
        limit,
        offset: (page - 1) * limit
      });

      return {
        deals: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('List deals error:', error);
      throw error;
    }
  }

  /**
   * Get pipeline view with deals grouped by stage
   */
  async getPipelineView(pipelineId, filters = {}) {
    try {
      const pipeline = await Pipeline.findByPk(pipelineId, {
        include: [{ model: PipelineStage, as: 'stages', order: [['order', 'ASC']] }]
      });

      if (!pipeline) {
        throw new Error('Pipeline not found');
      }

      const where = {
        pipelineId,
        status: { [Op.in]: ['open', 'on_hold'] }
      };

      if (filters.ownerId) where.ownerId = filters.ownerId;
      if (filters.teamId) where.teamId = filters.teamId;

      const deals = await Deal.findAll({
        where,
        include: [
          { model: Account, as: 'account', attributes: ['id', 'name'] },
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
        ],
        order: [['stageOrder', 'ASC'], ['value', 'DESC']]
      });

      // Group deals by stage
      const stageMap = {};
      pipeline.stages.forEach(stage => {
        stageMap[stage.id] = {
          ...stage.toJSON(),
          deals: [],
          totalValue: 0,
          dealCount: 0,
          weightedValue: 0
        };
      });

      deals.forEach(deal => {
        if (stageMap[deal.stageId]) {
          stageMap[deal.stageId].deals.push(deal);
          stageMap[deal.stageId].dealCount++;
          stageMap[deal.stageId].totalValue += parseFloat(deal.value || 0);
          stageMap[deal.stageId].weightedValue += deal.getWeightedValue();
        }
      });

      return {
        pipeline: pipeline.toPublicJSON(),
        stages: Object.values(stageMap),
        summary: {
          totalDeals: deals.length,
          totalValue: deals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0),
          weightedValue: deals.reduce((sum, d) => sum + d.getWeightedValue(), 0)
        }
      };
    } catch (error) {
      logger.error('Get pipeline view error:', error);
      throw error;
    }
  }

  /**
   * Get deal forecast
   */
  async getForecast(filters = {}) {
    try {
      const { ownerId, teamId, pipelineId, period = 'quarter' } = filters;

      const where = {
        status: 'open'
      };

      if (ownerId) where.ownerId = ownerId;
      if (teamId) where.teamId = teamId;
      if (pipelineId) where.pipelineId = pipelineId;

      // Set date range based on period
      const now = new Date();
      const endDate = new Date(now);

      switch (period) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      where.expectedCloseDate = {
        [Op.between]: [now, endDate]
      };

      const deals = await Deal.findAll({ where });

      const forecast = {
        pipeline: 0,
        bestCase: 0,
        commit: 0,
        closed: 0
      };

      deals.forEach(deal => {
        const value = parseFloat(deal.value || 0);
        const weighted = deal.getWeightedValue();

        switch (deal.forecastCategory) {
          case 'pipeline':
            forecast.pipeline += weighted;
            break;
          case 'best_case':
            forecast.bestCase += value;
            break;
          case 'commit':
            forecast.commit += value;
            break;
          case 'closed':
            forecast.closed += value;
            break;
        }
      });

      forecast.total = forecast.pipeline + forecast.bestCase + forecast.commit + forecast.closed;

      return {
        forecast,
        dealCount: deals.length,
        period,
        dateRange: {
          start: now,
          end: endDate
        }
      };
    } catch (error) {
      logger.error('Get forecast error:', error);
      throw error;
    }
  }

  /**
   * Get stale deals (deals in stage too long)
   */
  async getStaleDeals(pipelineId = null, staleDays = 14) {
    try {
      const where = {
        status: 'open',
        stageEnteredAt: {
          [Op.lt]: new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)
        }
      };

      if (pipelineId) where.pipelineId = pipelineId;

      const deals = await Deal.findAll({
        where,
        include: [
          { model: Account, as: 'account', attributes: ['id', 'name'] },
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['stageEnteredAt', 'ASC']]
      });

      return deals.map(deal => ({
        ...deal.toPublicJSON(),
        daysInStage: deal.getDaysInStage()
      }));
    } catch (error) {
      logger.error('Get stale deals error:', error);
      throw error;
    }
  }

  /**
   * Update account metrics after deal changes
   */
  async updateAccountMetrics(accountId) {
    try {
      const deals = await Deal.findAll({
        where: { accountId }
      });

      const metrics = {
        openDealCount: 0,
        wonDealCount: 0,
        lostDealCount: 0,
        totalDealValue: 0,
        lifetimeValue: 0
      };

      deals.forEach(deal => {
        switch (deal.status) {
          case 'open':
          case 'on_hold':
            metrics.openDealCount++;
            metrics.totalDealValue += parseFloat(deal.value || 0);
            break;
          case 'won':
            metrics.wonDealCount++;
            metrics.lifetimeValue += parseFloat(deal.value || 0);
            break;
          case 'lost':
            metrics.lostDealCount++;
            break;
        }
      });

      await Account.update(metrics, { where: { id: accountId } });
    } catch (error) {
      logger.error('Update account metrics error:', error);
    }
  }

  /**
   * Delete deal
   */
  async delete(dealId, userId) {
    try {
      const deal = await Deal.findByPk(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      const accountId = deal.accountId;

      await deal.destroy();

      // Update account metrics
      if (accountId) {
        await this.updateAccountMetrics(accountId);
      }

      // Log audit
      await this.logAudit('delete', dealId, userId, deal.toJSON());

      return { success: true };
    } catch (error) {
      logger.error('Delete deal error:', error);
      throw error;
    }
  }

  /**
   * Log audit trail
   */
  async logAudit(action, entityId, userId, details = {}) {
    try {
      await AuditLog.create({
        action,
        entityType: 'Deal',
        entityId,
        userId,
        status: 'success',
        newValues: details.after || details,
        oldValues: details.before
      });
    } catch (error) {
      logger.error('Audit log error:', error);
    }
  }
}

export default new DealService();
