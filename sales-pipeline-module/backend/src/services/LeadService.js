/**
 * Lead Service - Enterprise Lead Management
 * Handles lead capture, scoring, qualification, and conversion
 */

import { Op, fn, col, literal } from 'sequelize';
import { Lead, Contact, Account, Deal, Campaign, Activity, User, Team, Pipeline, PipelineStage, sequelize } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import logger from '../utils/logger.js';
import NotificationService from './NotificationService.js';

class LeadService {
  /**
   * Create a new lead
   */
  async create(leadData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Check for duplicate
      if (leadData.email) {
        const existing = await Lead.findOne({
          where: { email: leadData.email, status: { [Op.ne]: 'converted' } },
          transaction
        });

        if (existing) {
          throw new Error('A lead with this email already exists');
        }
      }

      // Calculate initial lead score
      const leadScore = this.calculateScore(leadData);

      const lead = await Lead.create({
        ...leadData,
        score: leadScore,
        ownerId: leadData.ownerId || userId,
        createdById: userId,
        status: leadData.status || 'new'
      }, { transaction });

      // Log activity
      await Activity.create({
        type: 'lead_created',
        subject: `New lead: ${lead.firstName} ${lead.lastName}`,
        leadId: lead.id,
        userId,
        metadata: { leadId: lead.id, source: lead.source }
      }, { transaction });

      // Notify owner if different from creator
      if (lead.ownerId && lead.ownerId !== userId) {
        await NotificationService.create({
          userId: lead.ownerId,
          type: 'lead_assigned',
          title: 'New Lead Assigned',
          message: `Lead "${lead.firstName} ${lead.lastName}" has been assigned to you`,
          link: `/leads/${lead.id}`
        });
      }

      await transaction.commit();

      logger.audit('lead_created', userId, { leadId: lead.id, source: lead.source });

      return this.getById(lead.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating lead:', error);
      throw error;
    }
  }

  /**
   * Get lead by ID
   */
  async getById(leadId, userId, options = {}) {
    const cacheKey = `lead:${leadId}`;

    if (!options.skipCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const lead = await Lead.findByPk(leadId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name', 'type'] },
        { model: Contact, as: 'convertedContact', attributes: ['id', 'firstName', 'lastName'] },
        { model: Account, as: 'convertedAccount', attributes: ['id', 'name'] },
        { model: Deal, as: 'convertedDeal', attributes: ['id', 'title', 'value'] },
        {
          model: Activity,
          as: 'activities',
          attributes: ['id', 'type', 'subject', 'createdAt'],
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const result = lead.toJSON();
    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get all leads with filtering
   */
  async getAll(filters = {}, userId, userRole) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      status,
      source,
      ownerId,
      teamId,
      campaignId,
      scoreMin,
      scoreMax,
      qualificationStatus,
      createdAfter,
      createdBefore
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    // Search
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filters
    if (status) where.status = status;
    if (source) where.source = source;
    if (ownerId) where.ownerId = ownerId;
    if (teamId) where.teamId = teamId;
    if (campaignId) where.campaignId = campaignId;
    if (qualificationStatus) where.qualificationStatus = qualificationStatus;

    if (scoreMin !== undefined || scoreMax !== undefined) {
      where.score = {};
      if (scoreMin !== undefined) where.score[Op.gte] = scoreMin;
      if (scoreMax !== undefined) where.score[Op.lte] = scoreMax;
    }

    if (createdAfter) where.createdAt = { [Op.gte]: new Date(createdAfter) };
    if (createdBefore) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(createdBefore) };

    // Role-based filtering
    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: Math.min(limit, 100),
      offset,
      distinct: true
    });

    return {
      leads: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Update lead
   */
  async update(leadId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const lead = await Lead.findByPk(leadId, { transaction });

      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.status === 'converted') {
        throw new Error('Cannot update a converted lead');
      }

      // Recalculate score if relevant fields changed
      const scoreFields = ['title', 'company', 'employeeCount', 'annualRevenue', 'industry'];
      const shouldRecalculate = scoreFields.some(f => updateData[f] !== undefined);

      if (shouldRecalculate) {
        updateData.score = this.calculateScore({ ...lead.toJSON(), ...updateData });
      }

      const changes = {};
      Object.keys(updateData).forEach(key => {
        if (lead[key] !== updateData[key]) {
          changes[key] = { from: lead[key], to: updateData[key] };
        }
      });

      await lead.update(updateData, { transaction });

      if (Object.keys(changes).length > 0) {
        await Activity.create({
          type: 'lead_updated',
          subject: `Lead updated: ${lead.firstName} ${lead.lastName}`,
          leadId: lead.id,
          userId,
          metadata: { changes }
        }, { transaction });
      }

      await transaction.commit();
      await cacheService.del(`lead:${leadId}`);

      logger.audit('lead_updated', userId, { leadId, changes });

      return this.getById(leadId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete lead
   */
  async delete(leadId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const lead = await Lead.findByPk(leadId, { transaction });

      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.status === 'converted') {
        throw new Error('Cannot delete a converted lead');
      }

      await lead.destroy({ transaction });

      await Activity.create({
        type: 'lead_deleted',
        subject: `Lead deleted: ${lead.firstName} ${lead.lastName}`,
        userId,
        metadata: { leadId, name: `${lead.firstName} ${lead.lastName}` }
      }, { transaction });

      await transaction.commit();
      await cacheService.del(`lead:${leadId}`);

      logger.audit('lead_deleted', userId, { leadId });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Convert lead to contact/account/deal
   */
  async convert(leadId, conversionData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const lead = await Lead.findByPk(leadId, { transaction });

      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.status === 'converted') {
        throw new Error('Lead is already converted');
      }

      let account = null;
      let contact = null;
      let deal = null;

      // Create or find account
      if (conversionData.createAccount !== false) {
        if (conversionData.existingAccountId) {
          account = await Account.findByPk(conversionData.existingAccountId, { transaction });
        } else {
          account = await Account.create({
            name: lead.company || `${lead.firstName} ${lead.lastName}`,
            domain: lead.website,
            industry: lead.industry,
            employeeCount: lead.employeeCount,
            annualRevenue: lead.annualRevenue,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            postalCode: lead.postalCode,
            ownerId: lead.ownerId,
            teamId: lead.teamId,
            source: lead.source,
            metadata: { convertedFromLead: lead.id }
          }, { transaction });
        }
      }

      // Create contact
      if (conversionData.createContact !== false) {
        contact = await Contact.create({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          mobile: lead.mobile,
          title: lead.title,
          accountId: account?.id,
          ownerId: lead.ownerId,
          source: lead.source,
          isPrimary: true,
          metadata: { convertedFromLead: lead.id }
        }, { transaction });

        if (account) {
          await account.update({ primaryContactId: contact.id }, { transaction });
        }
      }

      // Create deal
      if (conversionData.createDeal) {
        const pipeline = await Pipeline.findOne({
          where: { isDefault: true },
          include: [{ model: PipelineStage, as: 'stages', order: [['order', 'ASC']] }],
          transaction
        });

        const firstStage = pipeline?.stages?.[0];

        deal = await Deal.create({
          title: conversionData.dealTitle || `${lead.company || lead.firstName} - Opportunity`,
          accountId: account?.id,
          pipelineId: pipeline?.id,
          stageId: firstStage?.id,
          value: conversionData.dealValue || lead.estimatedValue || 0,
          ownerId: lead.ownerId,
          teamId: lead.teamId,
          source: lead.source,
          probability: firstStage?.probability || 10,
          leadId: lead.id,
          metadata: { convertedFromLead: lead.id }
        }, { transaction });

        // Link contact to deal
        if (contact && deal) {
          await deal.addContacts([contact], { through: { role: 'primary', isPrimary: true }, transaction });
        }
      }

      // Update lead status
      await lead.update({
        status: 'converted',
        convertedAt: new Date(),
        convertedById: userId,
        convertedAccountId: account?.id,
        convertedContactId: contact?.id,
        convertedDealId: deal?.id
      }, { transaction });

      // Log activity
      await Activity.create({
        type: 'lead_converted',
        subject: `Lead converted: ${lead.firstName} ${lead.lastName}`,
        leadId: lead.id,
        accountId: account?.id,
        contactId: contact?.id,
        dealId: deal?.id,
        userId,
        metadata: {
          accountId: account?.id,
          contactId: contact?.id,
          dealId: deal?.id
        }
      }, { transaction });

      // Update campaign metrics if applicable
      if (lead.campaignId) {
        await Campaign.increment('conversions', {
          where: { id: lead.campaignId },
          transaction
        });
      }

      await transaction.commit();
      await cacheService.del(`lead:${leadId}`);

      logger.audit('lead_converted', userId, {
        leadId,
        accountId: account?.id,
        contactId: contact?.id,
        dealId: deal?.id
      });

      return {
        lead: await this.getById(leadId, userId, { skipCache: true }),
        account,
        contact,
        deal
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error converting lead:', error);
      throw error;
    }
  }

  /**
   * Qualify lead (MQL/SQL)
   */
  async qualify(leadId, qualificationData, userId) {
    const lead = await Lead.findByPk(leadId);

    if (!lead) {
      throw new Error('Lead not found');
    }

    const { status, reason, notes } = qualificationData;

    await lead.update({
      qualificationStatus: status,
      qualifiedAt: new Date(),
      qualifiedById: userId,
      qualificationNotes: notes
    });

    await Activity.create({
      type: 'lead_qualified',
      subject: `Lead ${status}: ${lead.firstName} ${lead.lastName}`,
      leadId: lead.id,
      userId,
      metadata: { status, reason, notes }
    });

    // Notify owner
    await NotificationService.create({
      userId: lead.ownerId,
      type: 'lead_qualified',
      title: `Lead ${status === 'qualified' ? 'Qualified' : 'Disqualified'}`,
      message: `${lead.firstName} ${lead.lastName} has been ${status}`,
      link: `/leads/${leadId}`
    });

    await cacheService.del(`lead:${leadId}`);

    logger.audit('lead_qualified', userId, { leadId, status });

    return this.getById(leadId, userId, { skipCache: true });
  }

  /**
   * Calculate lead score
   */
  calculateScore(leadData) {
    let score = 0;

    // Demographic scoring (0-50 points)
    if (leadData.title) {
      const seniorTitles = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'director', 'head'];
      if (seniorTitles.some(t => leadData.title.toLowerCase().includes(t))) {
        score += 20;
      } else if (leadData.title.toLowerCase().includes('manager')) {
        score += 10;
      }
    }

    if (leadData.employeeCount) {
      if (leadData.employeeCount >= 1000) score += 15;
      else if (leadData.employeeCount >= 100) score += 10;
      else if (leadData.employeeCount >= 10) score += 5;
    }

    if (leadData.annualRevenue) {
      if (leadData.annualRevenue >= 10000000) score += 15;
      else if (leadData.annualRevenue >= 1000000) score += 10;
      else if (leadData.annualRevenue >= 100000) score += 5;
    }

    // Behavioral scoring (0-50 points)
    if (leadData.source) {
      const highValueSources = ['referral', 'demo_request', 'contact_sales'];
      const mediumValueSources = ['webinar', 'content_download', 'trade_show'];

      if (highValueSources.includes(leadData.source)) score += 25;
      else if (mediumValueSources.includes(leadData.source)) score += 15;
      else score += 5;
    }

    if (leadData.email) score += 5;
    if (leadData.phone) score += 5;
    if (leadData.company) score += 5;
    if (leadData.website) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Bulk assign leads
   */
  async bulkAssign(leadIds, assignData, userId) {
    const transaction = await sequelize.transaction();

    try {
      await Lead.update(
        { ownerId: assignData.ownerId, teamId: assignData.teamId },
        { where: { id: { [Op.in]: leadIds } }, transaction }
      );

      await Activity.create({
        type: 'leads_bulk_assigned',
        subject: `${leadIds.length} leads assigned`,
        userId,
        metadata: { leadIds, ...assignData }
      }, { transaction });

      // Notify new owner
      if (assignData.ownerId) {
        await NotificationService.create({
          userId: assignData.ownerId,
          type: 'leads_assigned',
          title: 'Leads Assigned',
          message: `${leadIds.length} leads have been assigned to you`
        });
      }

      await transaction.commit();

      await Promise.all(leadIds.map(id => cacheService.del(`lead:${id}`)));

      logger.audit('leads_bulk_assigned', userId, { count: leadIds.length });

      return { success: true, count: leadIds.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get lead statistics
   */
  async getStats(filters = {}, userId, userRole) {
    const where = {};

    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    if (filters.period) {
      const now = new Date();
      let startDate;

      switch (filters.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
      }

      if (startDate) {
        where.createdAt = { [Op.gte]: startDate };
      }
    }

    const [total, byStatus, bySource, avgScore, converted] = await Promise.all([
      Lead.count({ where }),
      Lead.findAll({
        where,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Lead.findAll({
        where,
        attributes: ['source', [fn('COUNT', col('id')), 'count']],
        group: ['source'],
        raw: true
      }),
      Lead.findOne({
        where,
        attributes: [[fn('AVG', col('score')), 'avgScore']],
        raw: true
      }),
      Lead.count({ where: { ...where, status: 'converted' } })
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {}),
      bySource: bySource.reduce((acc, row) => ({ ...acc, [row.source]: parseInt(row.count) }), {}),
      avgScore: Math.round(parseFloat(avgScore?.avgScore) || 0),
      converted,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : 0
    };
  }
}

export default new LeadService();
