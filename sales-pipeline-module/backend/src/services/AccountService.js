/**
 * Account Service - Enterprise B2B Account Management
 * Handles company/organization records with health scoring and hierarchy
 */

import { Op, fn, col, literal } from 'sequelize';
import { Account, Contact, Deal, Activity, User, Team, Document, Quote, sequelize } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import logger from '../utils/logger.js';
import NotificationService from './NotificationService.js';

class AccountService {
  /**
   * Create a new account
   */
  async create(accountData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const account = await Account.create({
        ...accountData,
        ownerId: accountData.ownerId || userId,
        createdById: userId
      }, { transaction });

      // Log activity
      await Activity.create({
        type: 'account_created',
        subject: `Account created: ${account.name}`,
        accountId: account.id,
        userId,
        metadata: { accountId: account.id }
      }, { transaction });

      // Notify team members if assigned
      if (account.teamId) {
        await NotificationService.notifyTeam(account.teamId, {
          type: 'new_account',
          title: 'New Account Assigned',
          message: `Account "${account.name}" has been assigned to your team`,
          link: `/accounts/${account.id}`
        });
      }

      await transaction.commit();

      logger.audit('account_created', userId, { accountId: account.id, name: account.name });

      return this.getById(account.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Get account by ID with full details
   */
  async getById(accountId, userId, options = {}) {
    const cacheKey = `account:${accountId}`;

    if (!options.skipCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const account = await Account.findByPk(accountId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { model: Account, as: 'parentAccount', attributes: ['id', 'name'] },
        { model: Account, as: 'childAccounts', attributes: ['id', 'name', 'industry', 'status'] },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'title', 'isPrimary'],
          limit: 10,
          order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']]
        },
        {
          model: Deal,
          as: 'deals',
          attributes: ['id', 'title', 'value', 'probability', 'status', 'stageId'],
          limit: 10,
          order: [['updatedAt', 'DESC']]
        }
      ]
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(accountId);
    const result = {
      ...account.toJSON(),
      metrics
    };

    await cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  /**
   * Get all accounts with filtering, sorting, and pagination
   */
  async getAll(filters = {}, userId, userRole) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      search,
      status,
      industry,
      type,
      ownerId,
      teamId,
      healthScoreMin,
      healthScoreMax,
      lifetimeValueMin,
      lifetimeValueMax,
      tags
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    // Search across multiple fields
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { domain: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Apply filters
    if (status) where.status = status;
    if (industry) where.industry = industry;
    if (type) where.type = type;
    if (ownerId) where.ownerId = ownerId;
    if (teamId) where.teamId = teamId;

    if (healthScoreMin !== undefined || healthScoreMax !== undefined) {
      where.healthScore = {};
      if (healthScoreMin !== undefined) where.healthScore[Op.gte] = healthScoreMin;
      if (healthScoreMax !== undefined) where.healthScore[Op.lte] = healthScoreMax;
    }

    if (lifetimeValueMin !== undefined || lifetimeValueMax !== undefined) {
      where.lifetimeValue = {};
      if (lifetimeValueMin !== undefined) where.lifetimeValue[Op.gte] = lifetimeValueMin;
      if (lifetimeValueMax !== undefined) where.lifetimeValue[Op.lte] = lifetimeValueMax;
    }

    if (tags && tags.length > 0) {
      where.tags = { [Op.overlap]: tags };
    }

    // Role-based filtering
    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    const { count, rows } = await Account.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: Math.min(limit, 100),
      offset,
      distinct: true
    });

    return {
      accounts: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Update account
   */
  async update(accountId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const account = await Account.findByPk(accountId, { transaction });

      if (!account) {
        throw new Error('Account not found');
      }

      // Track changes for audit
      const changes = {};
      Object.keys(updateData).forEach(key => {
        if (account[key] !== updateData[key]) {
          changes[key] = { from: account[key], to: updateData[key] };
        }
      });

      await account.update(updateData, { transaction });

      // Log activity if significant changes
      if (Object.keys(changes).length > 0) {
        await Activity.create({
          type: 'account_updated',
          subject: `Account updated: ${account.name}`,
          accountId: account.id,
          userId,
          metadata: { changes }
        }, { transaction });
      }

      await transaction.commit();

      // Invalidate cache
      await cacheService.del(`account:${accountId}`);

      logger.audit('account_updated', userId, { accountId, changes });

      return this.getById(accountId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete account (soft delete)
   */
  async delete(accountId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const account = await Account.findByPk(accountId, { transaction });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check for active deals
      const activeDeals = await Deal.count({
        where: {
          accountId,
          status: { [Op.in]: ['open', 'pending'] }
        },
        transaction
      });

      if (activeDeals > 0) {
        throw new Error(`Cannot delete account with ${activeDeals} active deals. Close or reassign deals first.`);
      }

      await account.destroy({ transaction });

      await Activity.create({
        type: 'account_deleted',
        subject: `Account deleted: ${account.name}`,
        userId,
        metadata: { accountId, name: account.name }
      }, { transaction });

      await transaction.commit();

      // Invalidate cache
      await cacheService.del(`account:${accountId}`);

      logger.audit('account_deleted', userId, { accountId, name: account.name });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Merge two accounts
   */
  async merge(sourceId, targetId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const [source, target] = await Promise.all([
        Account.findByPk(sourceId, { transaction }),
        Account.findByPk(targetId, { transaction })
      ]);

      if (!source || !target) {
        throw new Error('One or both accounts not found');
      }

      // Move all related records to target
      await Promise.all([
        Contact.update({ accountId: targetId }, { where: { accountId: sourceId }, transaction }),
        Deal.update({ accountId: targetId }, { where: { accountId: sourceId }, transaction }),
        Activity.update({ accountId: targetId }, { where: { accountId: sourceId }, transaction }),
        Document.update({ accountId: targetId }, { where: { accountId: sourceId }, transaction }),
        Quote.update({ accountId: targetId }, { where: { accountId: sourceId }, transaction }),
        Account.update({ parentAccountId: targetId }, { where: { parentAccountId: sourceId }, transaction })
      ]);

      // Merge metadata
      const mergedTags = [...new Set([...(target.tags || []), ...(source.tags || [])])];
      const mergedMetadata = { ...source.metadata, ...target.metadata, mergedFrom: sourceId };

      await target.update({
        tags: mergedTags,
        metadata: mergedMetadata,
        lifetimeValue: (target.lifetimeValue || 0) + (source.lifetimeValue || 0),
        totalDeals: (target.totalDeals || 0) + (source.totalDeals || 0)
      }, { transaction });

      // Delete source
      await source.destroy({ transaction });

      await Activity.create({
        type: 'account_merged',
        subject: `Accounts merged: ${source.name} into ${target.name}`,
        accountId: targetId,
        userId,
        metadata: { sourceId, sourceName: source.name, targetId, targetName: target.name }
      }, { transaction });

      await transaction.commit();

      // Invalidate caches
      await Promise.all([
        cacheService.del(`account:${sourceId}`),
        cacheService.del(`account:${targetId}`)
      ]);

      logger.audit('account_merged', userId, { sourceId, targetId });

      return this.getById(targetId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error merging accounts:', error);
      throw error;
    }
  }

  /**
   * Calculate account metrics
   */
  async calculateMetrics(accountId) {
    const [dealStats, activityStats, contactCount] = await Promise.all([
      Deal.findAll({
        where: { accountId },
        attributes: [
          [fn('COUNT', col('id')), 'totalDeals'],
          [fn('SUM', literal('CASE WHEN status = \'won\' THEN value ELSE 0 END')), 'wonValue'],
          [fn('SUM', literal('CASE WHEN status = \'open\' THEN value ELSE 0 END')), 'pipelineValue'],
          [fn('AVG', literal('CASE WHEN status = \'won\' THEN value END')), 'avgDealSize'],
          [fn('COUNT', literal('CASE WHEN status = \'won\' THEN 1 END')), 'wonDeals'],
          [fn('COUNT', literal('CASE WHEN status = \'lost\' THEN 1 END')), 'lostDeals']
        ],
        raw: true
      }),
      Activity.findAll({
        where: { accountId },
        attributes: [
          [fn('COUNT', col('id')), 'totalActivities'],
          [fn('MAX', col('created_at')), 'lastActivityAt'],
          [fn('COUNT', literal('CASE WHEN type = \'email\' THEN 1 END')), 'emailCount'],
          [fn('COUNT', literal('CASE WHEN type = \'call\' THEN 1 END')), 'callCount'],
          [fn('COUNT', literal('CASE WHEN type = \'meeting\' THEN 1 END')), 'meetingCount']
        ],
        raw: true
      }),
      Contact.count({ where: { accountId } })
    ]);

    const stats = dealStats[0] || {};
    const activities = activityStats[0] || {};

    const wonDeals = parseInt(stats.wonDeals) || 0;
    const lostDeals = parseInt(stats.lostDeals) || 0;
    const totalClosedDeals = wonDeals + lostDeals;

    return {
      deals: {
        total: parseInt(stats.totalDeals) || 0,
        won: wonDeals,
        lost: lostDeals,
        wonValue: parseFloat(stats.wonValue) || 0,
        pipelineValue: parseFloat(stats.pipelineValue) || 0,
        avgDealSize: parseFloat(stats.avgDealSize) || 0,
        winRate: totalClosedDeals > 0 ? (wonDeals / totalClosedDeals * 100).toFixed(1) : 0
      },
      activities: {
        total: parseInt(activities.totalActivities) || 0,
        lastActivityAt: activities.lastActivityAt,
        emails: parseInt(activities.emailCount) || 0,
        calls: parseInt(activities.callCount) || 0,
        meetings: parseInt(activities.meetingCount) || 0
      },
      contacts: contactCount
    };
  }

  /**
   * Update account health score
   */
  async updateHealthScore(accountId) {
    const account = await Account.findByPk(accountId);
    if (!account) return;

    const healthScore = await account.calculateHealthScore();
    await account.update({ healthScore });

    await cacheService.del(`account:${accountId}`);

    return healthScore;
  }

  /**
   * Get account hierarchy (parent and children)
   */
  async getHierarchy(accountId) {
    const account = await Account.findByPk(accountId, {
      include: [
        {
          model: Account,
          as: 'parentAccount',
          include: [{ model: Account, as: 'parentAccount' }]
        },
        {
          model: Account,
          as: 'childAccounts',
          include: [{ model: Account, as: 'childAccounts' }]
        }
      ]
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Bulk update accounts
   */
  async bulkUpdate(accountIds, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      await Account.update(updateData, {
        where: { id: { [Op.in]: accountIds } },
        transaction
      });

      await Activity.create({
        type: 'accounts_bulk_updated',
        subject: `${accountIds.length} accounts updated`,
        userId,
        metadata: { accountIds, changes: updateData }
      }, { transaction });

      await transaction.commit();

      // Invalidate caches
      await Promise.all(
        accountIds.map(id => cacheService.del(`account:${id}`))
      );

      logger.audit('accounts_bulk_updated', userId, { count: accountIds.length, changes: updateData });

      return { success: true, count: accountIds.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Assign account to user/team
   */
  async assign(accountId, { ownerId, teamId }, userId) {
    const account = await Account.findByPk(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    const previousOwner = account.ownerId;
    const updateData = {};

    if (ownerId) updateData.ownerId = ownerId;
    if (teamId) updateData.teamId = teamId;

    await account.update(updateData);

    // Notify new owner
    if (ownerId && ownerId !== previousOwner) {
      await NotificationService.create({
        userId: ownerId,
        type: 'account_assigned',
        title: 'Account Assigned',
        message: `Account "${account.name}" has been assigned to you`,
        link: `/accounts/${accountId}`
      });
    }

    await cacheService.del(`account:${accountId}`);

    return this.getById(accountId, userId, { skipCache: true });
  }

  /**
   * Get accounts at risk (low health score or inactive)
   */
  async getAtRiskAccounts(userId, userRole) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where = {
      [Op.or]: [
        { healthScore: { [Op.lt]: 50 } },
        { lastActivityAt: { [Op.lt]: thirtyDaysAgo } },
        { lastActivityAt: null }
      ],
      status: 'active'
    };

    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    return Account.findAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['healthScore', 'ASC']],
      limit: 20
    });
  }

  /**
   * Search accounts (optimized full-text search)
   */
  async search(query, userId, limit = 10) {
    return Account.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { domain: { [Op.iLike]: `%${query}%` } }
        ]
      },
      attributes: ['id', 'name', 'domain', 'industry', 'status'],
      limit,
      order: [['name', 'ASC']]
    });
  }
}

export default new AccountService();
