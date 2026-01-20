/**
 * Reporting Service
 * Sales analytics, KPIs, and performance metrics
 */

import { Op, fn, col, literal } from 'sequelize';
import {
  Deal,
  Lead,
  Account,
  Contact,
  Activity,
  Campaign,
  User,
  Team,
  sequelize
} from '../models/index.js';
import { cacheService, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';

class ReportingService {
  /**
   * Get dashboard overview metrics
   */
  async getDashboardMetrics(userId, filters = {}) {
    try {
      const cacheKey = `dashboard:${userId}:${JSON.stringify(filters)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const { teamId, dateFrom, dateTo } = filters;
      const dateFilter = this.getDateFilter(dateFrom, dateTo);

      const ownerFilter = teamId ? { teamId } : { ownerId: userId };

      const [
        pipelineMetrics,
        leadMetrics,
        activityMetrics,
        recentDeals,
        upcomingTasks
      ] = await Promise.all([
        this.getPipelineMetrics(ownerFilter, dateFilter),
        this.getLeadMetrics(ownerFilter, dateFilter),
        this.getActivityMetrics(ownerFilter, dateFilter),
        this.getRecentDeals(ownerFilter, 5),
        this.getUpcomingTasks(userId, 5)
      ]);

      const result = {
        pipeline: pipelineMetrics,
        leads: leadMetrics,
        activities: activityMetrics,
        recentDeals,
        upcomingTasks,
        generatedAt: new Date()
      };

      await cacheService.set(cacheKey, result, 300); // 5 min cache

      return result;
    } catch (error) {
      logger.error('Dashboard metrics error:', error);
      throw error;
    }
  }

  /**
   * Get pipeline performance metrics
   */
  async getPipelineMetrics(ownerFilter, dateFilter) {
    const baseWhere = { ...ownerFilter };
    const periodWhere = { ...baseWhere, createdAt: dateFilter };

    const [
      openDeals,
      wonDeals,
      lostDeals,
      avgDealValue,
      avgSalesCycle
    ] = await Promise.all([
      Deal.count({ where: { ...baseWhere, status: 'open' } }),
      Deal.findAll({
        where: { ...periodWhere, status: 'won' },
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('value')), 'totalValue']
        ],
        raw: true
      }),
      Deal.count({ where: { ...periodWhere, status: 'lost' } }),
      Deal.findOne({
        where: { ...baseWhere, status: 'open' },
        attributes: [[fn('AVG', col('value')), 'avgValue']],
        raw: true
      }),
      Deal.findOne({
        where: { ...periodWhere, status: 'won' },
        attributes: [[fn('AVG', col('sales_cycle_days')), 'avgDays']],
        raw: true
      })
    ]);

    const wonCount = parseInt(wonDeals[0]?.count || 0);
    const lostCount = lostDeals;
    const totalClosed = wonCount + lostCount;

    return {
      openDeals,
      openValue: await this.getTotalOpenValue(ownerFilter),
      wonDeals: wonCount,
      wonValue: parseFloat(wonDeals[0]?.totalValue || 0),
      lostDeals: lostCount,
      winRate: totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) : 0,
      avgDealValue: parseFloat(avgDealValue?.avgValue || 0),
      avgSalesCycleDays: Math.round(avgSalesCycle?.avgDays || 0),
      conversionRate: await this.getConversionRate(ownerFilter, dateFilter)
    };
  }

  /**
   * Get lead generation metrics
   */
  async getLeadMetrics(ownerFilter, dateFilter) {
    const baseWhere = { ...ownerFilter };
    const periodWhere = { ...baseWhere, createdAt: dateFilter };

    const [
      newLeads,
      qualifiedLeads,
      convertedLeads,
      leadsBySource
    ] = await Promise.all([
      Lead.count({ where: periodWhere }),
      Lead.count({ where: { ...periodWhere, qualificationStatus: { [Op.in]: ['mql', 'sql'] } } }),
      Lead.count({ where: { ...periodWhere, status: 'converted' } }),
      Lead.findAll({
        where: periodWhere,
        attributes: ['source', [fn('COUNT', col('id')), 'count']],
        group: ['source'],
        raw: true
      })
    ]);

    return {
      newLeads,
      qualifiedLeads,
      convertedLeads,
      conversionRate: newLeads > 0 ? ((convertedLeads / newLeads) * 100).toFixed(1) : 0,
      qualificationRate: newLeads > 0 ? ((qualifiedLeads / newLeads) * 100).toFixed(1) : 0,
      bySource: leadsBySource.reduce((acc, item) => {
        acc[item.source || 'unknown'] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(ownerFilter, dateFilter) {
    const periodWhere = { ...ownerFilter, createdAt: dateFilter };

    const [
      totalActivities,
      byType,
      avgResponseTime
    ] = await Promise.all([
      Activity.count({ where: periodWhere }),
      Activity.findAll({
        where: periodWhere,
        attributes: ['type', [fn('COUNT', col('id')), 'count']],
        group: ['type'],
        raw: true
      }),
      this.getAvgResponseTime(ownerFilter, dateFilter)
    ]);

    const typeMap = byType.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});

    return {
      total: totalActivities,
      calls: typeMap.call || 0,
      emails: typeMap.email || 0,
      meetings: typeMap.meeting || 0,
      tasks: typeMap.task || 0,
      avgResponseTimeMinutes: avgResponseTime
    };
  }

  /**
   * Get sales performance report
   */
  async getSalesPerformanceReport(filters = {}) {
    try {
      const { teamId, userId, dateFrom, dateTo, groupBy = 'user' } = filters;
      const dateFilter = this.getDateFilter(dateFrom, dateTo);

      let groupField, includeModel;

      if (groupBy === 'user') {
        groupField = 'ownerId';
        includeModel = { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] };
      } else if (groupBy === 'team') {
        groupField = 'teamId';
        includeModel = { model: Team, as: 'team', attributes: ['id', 'name'] };
      }

      const where = {
        status: 'won',
        actualCloseDate: dateFilter
      };

      if (teamId) where.teamId = teamId;
      if (userId) where.ownerId = userId;

      const performance = await Deal.findAll({
        where,
        attributes: [
          groupField,
          [fn('COUNT', col('Deal.id')), 'dealsWon'],
          [fn('SUM', col('value')), 'revenue'],
          [fn('AVG', col('value')), 'avgDealValue'],
          [fn('AVG', col('sales_cycle_days')), 'avgSalesCycle']
        ],
        include: [includeModel],
        group: [groupField, `${includeModel.as}.id`],
        raw: false
      });

      // Calculate quotas and attainment
      const results = await Promise.all(performance.map(async (p) => {
        const data = p.toJSON();
        let quotaTarget = 0;
        let name = '';

        if (groupBy === 'user' && p.owner) {
          quotaTarget = parseFloat(p.owner.quotaTarget || 0);
          name = `${p.owner.firstName} ${p.owner.lastName}`;
        } else if (groupBy === 'team' && p.team) {
          quotaTarget = parseFloat(p.team.quotaTarget || 0);
          name = p.team.name;
        }

        const revenue = parseFloat(data.revenue || 0);
        const attainment = quotaTarget > 0 ? (revenue / quotaTarget) * 100 : 0;

        return {
          id: data[groupField],
          name,
          dealsWon: parseInt(data.dealsWon),
          revenue,
          avgDealValue: parseFloat(data.avgDealValue || 0),
          avgSalesCycleDays: Math.round(data.avgSalesCycle || 0),
          quotaTarget,
          quotaAttainment: attainment.toFixed(1)
        };
      }));

      return {
        data: results.sort((a, b) => b.revenue - a.revenue),
        summary: {
          totalRevenue: results.reduce((sum, r) => sum + r.revenue, 0),
          totalDeals: results.reduce((sum, r) => sum + r.dealsWon, 0),
          avgAttainment: results.length > 0
            ? (results.reduce((sum, r) => sum + parseFloat(r.quotaAttainment), 0) / results.length).toFixed(1)
            : 0
        },
        period: { from: dateFrom, to: dateTo }
      };
    } catch (error) {
      logger.error('Sales performance report error:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance report
   */
  async getCampaignPerformanceReport(filters = {}) {
    try {
      const { dateFrom, dateTo, type, status } = filters;
      const dateFilter = this.getDateFilter(dateFrom, dateTo);

      const where = { createdAt: dateFilter };
      if (type) where.type = type;
      if (status) where.status = status;

      const campaigns = await Campaign.findAll({
        where,
        order: [['revenue', 'DESC']]
      });

      return {
        campaigns: campaigns.map(c => ({
          ...c.toPublicJSON(),
          roi: c.calculateROI(),
          conversionRate: c.getConversionRate(),
          costPerLead: c.getCostPerLead(),
          costPerDeal: c.getCostPerDeal()
        })),
        summary: {
          totalCampaigns: campaigns.length,
          totalBudget: campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0),
          totalSpend: campaigns.reduce((sum, c) => sum + parseFloat(c.actualCost || 0), 0),
          totalRevenue: campaigns.reduce((sum, c) => sum + parseFloat(c.revenue || 0), 0),
          totalLeads: campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0),
          totalDeals: campaigns.reduce((sum, c) => sum + c.dealsWon, 0)
        }
      };
    } catch (error) {
      logger.error('Campaign performance report error:', error);
      throw error;
    }
  }

  /**
   * Get pipeline velocity report
   */
  async getPipelineVelocityReport(pipelineId, filters = {}) {
    try {
      const { dateFrom, dateTo, ownerId, teamId } = filters;
      const dateFilter = this.getDateFilter(dateFrom, dateTo);

      const where = {
        pipelineId,
        status: 'won',
        actualCloseDate: dateFilter
      };

      if (ownerId) where.ownerId = ownerId;
      if (teamId) where.teamId = teamId;

      // Calculate velocity = (Deals * Win Rate * Avg Value) / Sales Cycle
      const deals = await Deal.findAll({ where });

      const totalDeals = deals.length;
      const totalValue = deals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);
      const avgValue = totalDeals > 0 ? totalValue / totalDeals : 0;
      const avgSalesCycle = totalDeals > 0
        ? deals.reduce((sum, d) => sum + (d.salesCycleDays || 0), 0) / totalDeals
        : 0;

      // Get win rate
      const lostDeals = await Deal.count({
        where: { ...where, status: 'lost' }
      });
      const winRate = totalDeals + lostDeals > 0
        ? totalDeals / (totalDeals + lostDeals)
        : 0;

      const velocity = avgSalesCycle > 0
        ? (totalDeals * winRate * avgValue) / avgSalesCycle
        : 0;

      return {
        velocity: velocity.toFixed(2),
        components: {
          dealsInPipeline: await Deal.count({ where: { pipelineId, status: 'open' } }),
          winRate: (winRate * 100).toFixed(1),
          avgDealValue: avgValue.toFixed(2),
          avgSalesCycleDays: Math.round(avgSalesCycle)
        },
        period: { from: dateFrom, to: dateTo }
      };
    } catch (error) {
      logger.error('Pipeline velocity report error:', error);
      throw error;
    }
  }

  /**
   * Get account health report
   */
  async getAccountHealthReport(filters = {}) {
    try {
      const { ownerId, teamId, tier, minHealthScore, maxHealthScore } = filters;

      const where = { type: 'customer' };

      if (ownerId) where.ownerId = ownerId;
      if (teamId) where.teamId = teamId;
      if (tier) where.tier = tier;

      if (minHealthScore !== undefined || maxHealthScore !== undefined) {
        where.healthScore = {};
        if (minHealthScore !== undefined) where.healthScore[Op.gte] = minHealthScore;
        if (maxHealthScore !== undefined) where.healthScore[Op.lte] = maxHealthScore;
      }

      const accounts = await Account.findAll({
        where,
        include: [
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['healthScore', 'ASC']]
      });

      const atRisk = accounts.filter(a => a.healthScore < 40);
      const healthy = accounts.filter(a => a.healthScore >= 70);

      return {
        accounts: accounts.map(a => ({
          id: a.id,
          name: a.name,
          healthScore: a.healthScore,
          lifetimeValue: a.lifetimeValue,
          lastActivityAt: a.lastActivityAt,
          owner: a.owner ? `${a.owner.firstName} ${a.owner.lastName}` : null
        })),
        summary: {
          totalAccounts: accounts.length,
          atRiskCount: atRisk.length,
          healthyCount: healthy.length,
          avgHealthScore: accounts.length > 0
            ? (accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length).toFixed(1)
            : 0,
          totalLifetimeValue: accounts.reduce((sum, a) => sum + parseFloat(a.lifetimeValue || 0), 0)
        }
      };
    } catch (error) {
      logger.error('Account health report error:', error);
      throw error;
    }
  }

  /**
   * Get forecast report
   */
  async getForecastReport(filters = {}) {
    try {
      const { ownerId, teamId, pipelineId } = filters;

      const where = { status: 'open' };

      if (ownerId) where.ownerId = ownerId;
      if (teamId) where.teamId = teamId;
      if (pipelineId) where.pipelineId = pipelineId;

      // This month
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

      // Next month
      const nextMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
      const nextMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 2, 0);

      // This quarter
      const quarterStart = new Date(thisMonth.getFullYear(), Math.floor(thisMonth.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(thisMonth.getFullYear(), Math.floor(thisMonth.getMonth() / 3) * 3 + 3, 0);

      const [thisMonthDeals, nextMonthDeals, thisQuarterDeals] = await Promise.all([
        Deal.findAll({
          where: {
            ...where,
            expectedCloseDate: { [Op.between]: [thisMonthStart, thisMonthEnd] }
          }
        }),
        Deal.findAll({
          where: {
            ...where,
            expectedCloseDate: { [Op.between]: [nextMonthStart, nextMonthEnd] }
          }
        }),
        Deal.findAll({
          where: {
            ...where,
            expectedCloseDate: { [Op.between]: [quarterStart, quarterEnd] }
          }
        })
      ]);

      const calculateForecast = (deals) => {
        const categories = {
          commit: { value: 0, weighted: 0, count: 0 },
          bestCase: { value: 0, weighted: 0, count: 0 },
          pipeline: { value: 0, weighted: 0, count: 0 }
        };

        deals.forEach(deal => {
          const value = parseFloat(deal.value || 0);
          const weighted = deal.getWeightedValue();

          switch (deal.forecastCategory) {
            case 'commit':
              categories.commit.value += value;
              categories.commit.weighted += value;
              categories.commit.count++;
              break;
            case 'best_case':
              categories.bestCase.value += value;
              categories.bestCase.weighted += value;
              categories.bestCase.count++;
              break;
            default:
              categories.pipeline.value += value;
              categories.pipeline.weighted += weighted;
              categories.pipeline.count++;
          }
        });

        return {
          ...categories,
          total: categories.commit.weighted + categories.bestCase.weighted + categories.pipeline.weighted
        };
      };

      return {
        thisMonth: calculateForecast(thisMonthDeals),
        nextMonth: calculateForecast(nextMonthDeals),
        thisQuarter: calculateForecast(thisQuarterDeals)
      };
    } catch (error) {
      logger.error('Forecast report error:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getDateFilter(dateFrom, dateTo) {
    if (!dateFrom && !dateTo) {
      // Default to last 30 days
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { [Op.between]: [start, end] };
    }

    if (dateFrom && dateTo) {
      return { [Op.between]: [new Date(dateFrom), new Date(dateTo)] };
    }

    if (dateFrom) {
      return { [Op.gte]: new Date(dateFrom) };
    }

    return { [Op.lte]: new Date(dateTo) };
  }

  async getTotalOpenValue(ownerFilter) {
    const result = await Deal.findOne({
      where: { ...ownerFilter, status: 'open' },
      attributes: [[fn('SUM', col('value')), 'total']],
      raw: true
    });
    return parseFloat(result?.total || 0);
  }

  async getConversionRate(ownerFilter, dateFilter) {
    const leads = await Lead.count({
      where: { ...ownerFilter, createdAt: dateFilter }
    });

    const deals = await Deal.count({
      where: {
        ...ownerFilter,
        createdAt: dateFilter,
        leadId: { [Op.ne]: null }
      }
    });

    return leads > 0 ? ((deals / leads) * 100).toFixed(1) : 0;
  }

  async getAvgResponseTime(ownerFilter, dateFilter) {
    const result = await Lead.findOne({
      where: {
        ...ownerFilter,
        createdAt: dateFilter,
        responseTimeMinutes: { [Op.ne]: null }
      },
      attributes: [[fn('AVG', col('response_time_minutes')), 'avg']],
      raw: true
    });

    return Math.round(result?.avg || 0);
  }

  async getRecentDeals(ownerFilter, limit) {
    return Deal.findAll({
      where: ownerFilter,
      include: [
        { model: Account, as: 'account', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit
    });
  }

  async getUpcomingTasks(userId, limit) {
    const Task = (await import('../models/index.js')).Task;

    return Task.findAll({
      where: {
        assignedTo: userId,
        status: { [Op.in]: ['not_started', 'in_progress'] },
        dueDate: { [Op.gte]: new Date() }
      },
      order: [['dueDate', 'ASC']],
      limit
    });
  }
}

export default new ReportingService();
