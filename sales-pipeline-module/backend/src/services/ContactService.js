/**
 * Contact Service - Enterprise Contact Management
 * Handles individual contacts with activity tracking and relationship management
 */

import { Op, fn, col } from 'sequelize';
import { Contact, Account, Deal, Activity, User, Task, sequelize } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import logger from '../utils/logger.js';
import NotificationService from './NotificationService.js';

class ContactService {
  /**
   * Create a new contact
   */
  async create(contactData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Check for duplicate email within same account
      if (contactData.email && contactData.accountId) {
        const existing = await Contact.findOne({
          where: {
            email: contactData.email,
            accountId: contactData.accountId
          },
          transaction
        });

        if (existing) {
          throw new Error('A contact with this email already exists for this account');
        }
      }

      const contact = await Contact.create({
        ...contactData,
        ownerId: contactData.ownerId || userId,
        createdById: userId
      }, { transaction });

      // If marked as primary, update other contacts
      if (contact.isPrimary && contact.accountId) {
        await Contact.update(
          { isPrimary: false },
          {
            where: {
              accountId: contact.accountId,
              id: { [Op.ne]: contact.id }
            },
            transaction
          }
        );

        // Update account's primary contact
        await Account.update(
          { primaryContactId: contact.id },
          { where: { id: contact.accountId }, transaction }
        );
      }

      // Log activity
      await Activity.create({
        type: 'contact_created',
        subject: `Contact created: ${contact.firstName} ${contact.lastName}`,
        contactId: contact.id,
        accountId: contact.accountId,
        userId,
        metadata: { contactId: contact.id }
      }, { transaction });

      await transaction.commit();

      logger.audit('contact_created', userId, { contactId: contact.id });

      return this.getById(contact.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID with full details
   */
  async getById(contactId, userId, options = {}) {
    const cacheKey = `contact:${contactId}`;

    if (!options.skipCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const contact = await Contact.findByPk(contactId, {
      include: [
        { model: Account, as: 'account', attributes: ['id', 'name', 'industry', 'domain'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: Contact, as: 'reportsTo', attributes: ['id', 'firstName', 'lastName', 'title'] },
        {
          model: Deal,
          as: 'deals',
          attributes: ['id', 'title', 'value', 'status', 'probability'],
          through: { attributes: ['role', 'isPrimary'] },
          limit: 5
        },
        {
          model: Activity,
          as: 'activities',
          attributes: ['id', 'type', 'subject', 'createdAt'],
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'title', 'status', 'priority', 'dueDate'],
          where: { status: { [Op.ne]: 'completed' } },
          required: false,
          limit: 5
        }
      ]
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const result = contact.toJSON();
    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get all contacts with filtering and pagination
   */
  async getAll(filters = {}, userId, userRole) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      search,
      accountId,
      ownerId,
      status,
      leadSource,
      tags,
      hasEmail,
      hasPhone
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    // Full-text search
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Apply filters
    if (accountId) where.accountId = accountId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (leadSource) where.leadSource = leadSource;
    if (tags?.length) where.tags = { [Op.overlap]: tags };
    if (hasEmail === true) where.email = { [Op.ne]: null };
    if (hasPhone === true) where.phone = { [Op.ne]: null };

    // Role-based filtering
    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      include: [
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: Math.min(limit, 100),
      offset,
      distinct: true
    });

    return {
      contacts: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Update contact
   */
  async update(contactId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const contact = await Contact.findByPk(contactId, { transaction });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Track changes
      const changes = {};
      Object.keys(updateData).forEach(key => {
        if (contact[key] !== updateData[key]) {
          changes[key] = { from: contact[key], to: updateData[key] };
        }
      });

      await contact.update(updateData, { transaction });

      // Handle primary contact change
      if (updateData.isPrimary === true && contact.accountId) {
        await Contact.update(
          { isPrimary: false },
          {
            where: {
              accountId: contact.accountId,
              id: { [Op.ne]: contact.id }
            },
            transaction
          }
        );

        await Account.update(
          { primaryContactId: contact.id },
          { where: { id: contact.accountId }, transaction }
        );
      }

      // Log activity if changes made
      if (Object.keys(changes).length > 0) {
        await Activity.create({
          type: 'contact_updated',
          subject: `Contact updated: ${contact.firstName} ${contact.lastName}`,
          contactId: contact.id,
          accountId: contact.accountId,
          userId,
          metadata: { changes }
        }, { transaction });
      }

      await transaction.commit();
      await cacheService.del(`contact:${contactId}`);

      logger.audit('contact_updated', userId, { contactId, changes });

      return this.getById(contactId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact (soft delete)
   */
  async delete(contactId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const contact = await Contact.findByPk(contactId, { transaction });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // If primary contact, clear from account
      if (contact.isPrimary && contact.accountId) {
        await Account.update(
          { primaryContactId: null },
          { where: { id: contact.accountId }, transaction }
        );
      }

      await contact.destroy({ transaction });

      await Activity.create({
        type: 'contact_deleted',
        subject: `Contact deleted: ${contact.firstName} ${contact.lastName}`,
        accountId: contact.accountId,
        userId,
        metadata: { contactId, name: `${contact.firstName} ${contact.lastName}` }
      }, { transaction });

      await transaction.commit();
      await cacheService.del(`contact:${contactId}`);

      logger.audit('contact_deleted', userId, { contactId });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Merge contacts
   */
  async merge(sourceId, targetId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const [source, target] = await Promise.all([
        Contact.findByPk(sourceId, { transaction }),
        Contact.findByPk(targetId, { transaction })
      ]);

      if (!source || !target) {
        throw new Error('One or both contacts not found');
      }

      // Move activities and tasks
      await Promise.all([
        Activity.update({ contactId: targetId }, { where: { contactId: sourceId }, transaction }),
        Task.update({ contactId: targetId }, { where: { contactId: sourceId }, transaction })
      ]);

      // Merge tags and metadata
      const mergedTags = [...new Set([...(target.tags || []), ...(source.tags || [])])];

      await target.update({
        tags: mergedTags,
        metadata: { ...source.metadata, ...target.metadata, mergedFrom: sourceId }
      }, { transaction });

      await source.destroy({ transaction });

      await Activity.create({
        type: 'contact_merged',
        subject: `Contacts merged: ${source.firstName} ${source.lastName} into ${target.firstName} ${target.lastName}`,
        contactId: targetId,
        accountId: target.accountId,
        userId,
        metadata: { sourceId, targetId }
      }, { transaction });

      await transaction.commit();

      await Promise.all([
        cacheService.del(`contact:${sourceId}`),
        cacheService.del(`contact:${targetId}`)
      ]);

      logger.audit('contact_merged', userId, { sourceId, targetId });

      return this.getById(targetId, userId, { skipCache: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk update contacts
   */
  async bulkUpdate(contactIds, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      await Contact.update(updateData, {
        where: { id: { [Op.in]: contactIds } },
        transaction
      });

      await Activity.create({
        type: 'contacts_bulk_updated',
        subject: `${contactIds.length} contacts updated`,
        userId,
        metadata: { contactIds, changes: updateData }
      }, { transaction });

      await transaction.commit();

      await Promise.all(contactIds.map(id => cacheService.del(`contact:${id}`)));

      logger.audit('contacts_bulk_updated', userId, { count: contactIds.length });

      return { success: true, count: contactIds.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Log activity for contact
   */
  async logActivity(contactId, activityData, userId) {
    const contact = await Contact.findByPk(contactId);

    if (!contact) {
      throw new Error('Contact not found');
    }

    const activity = await Activity.create({
      ...activityData,
      contactId,
      accountId: contact.accountId,
      userId
    });

    // Update contact's last activity
    await contact.update({ lastActivityAt: new Date() });

    await cacheService.del(`contact:${contactId}`);

    return activity;
  }

  /**
   * Get contact activity timeline
   */
  async getTimeline(contactId, options = {}) {
    const { page = 1, limit = 20 } = options;

    const activities = await Activity.findAll({
      where: { contactId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    return activities;
  }

  /**
   * Search contacts (quick search)
   */
  async search(query, userId, limit = 10) {
    return Contact.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        { model: Account, as: 'account', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'title', 'accountId'],
      limit,
      order: [['firstName', 'ASC']]
    });
  }

  /**
   * Get contacts without recent activity
   */
  async getInactiveContacts(days = 30, userId, userRole) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const where = {
      [Op.or]: [
        { lastActivityAt: { [Op.lt]: cutoffDate } },
        { lastActivityAt: null }
      ],
      status: 'active'
    };

    if (userRole === 'sales_rep') {
      where.ownerId = userId;
    }

    return Contact.findAll({
      where,
      include: [
        { model: Account, as: 'account', attributes: ['id', 'name'] }
      ],
      order: [['lastActivityAt', 'ASC NULLS FIRST']],
      limit: 20
    });
  }
}

export default new ContactService();
