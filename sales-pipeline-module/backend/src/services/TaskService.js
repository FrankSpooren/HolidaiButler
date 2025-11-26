/**
 * Task Service - Enterprise Task Management
 * Handles task creation, assignment, reminders, and workflow automation
 */

import { Op, fn, col, literal } from 'sequelize';
import { Task, User, Team, Account, Contact, Deal, Lead, Activity, sequelize } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import logger from '../utils/logger.js';
import NotificationService from './NotificationService.js';

class TaskService {
  /**
   * Create a new task
   */
  async create(taskData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.create({
        ...taskData,
        createdById: userId,
        assigneeId: taskData.assigneeId || userId,
        status: 'pending'
      }, { transaction });

      // Log activity for related entity
      const activityData = {
        type: 'task_created',
        subject: `Task created: ${task.title}`,
        userId,
        metadata: { taskId: task.id }
      };

      if (task.dealId) activityData.dealId = task.dealId;
      if (task.accountId) activityData.accountId = task.accountId;
      if (task.contactId) activityData.contactId = task.contactId;
      if (task.leadId) activityData.leadId = task.leadId;

      await Activity.create(activityData, { transaction });

      // Notify assignee if different from creator
      if (task.assigneeId && task.assigneeId !== userId) {
        await NotificationService.create({
          userId: task.assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `Task: "${task.title}" has been assigned to you`,
          link: `/tasks`,
          priority: task.priority === 'urgent' ? 'high' : 'normal'
        });
      }

      // Create reminder if due date set
      if (task.dueDate && task.reminderAt) {
        await this.scheduleReminder(task);
      }

      await transaction.commit();

      logger.audit('task_created', userId, { taskId: task.id });

      return this.getById(task.id, userId);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getById(taskId, userId, options = {}) {
    const task = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'completedBy', attributes: ['id', 'firstName', 'lastName'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: Contact, as: 'contact', attributes: ['id', 'firstName', 'lastName'] },
        { model: Deal, as: 'deal', attributes: ['id', 'title', 'value'] },
        { model: Lead, as: 'lead', attributes: ['id', 'firstName', 'lastName'] },
        { model: Task, as: 'subtasks', attributes: ['id', 'title', 'status', 'priority', 'dueDate'] },
        { model: Task, as: 'parentTask', attributes: ['id', 'title'] },
        { model: Activity, as: 'relatedActivity', attributes: ['id', 'type', 'subject'] }
      ]
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Get all tasks with filtering
   */
  async getAll(filters = {}, userId, userRole) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'dueDate',
      sortOrder = 'ASC',
      search,
      status,
      priority,
      type,
      assigneeId,
      createdById,
      teamId,
      accountId,
      contactId,
      dealId,
      leadId,
      dueBefore,
      dueAfter,
      isOverdue
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status) where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assigneeId) where.assigneeId = assigneeId;
    if (createdById) where.createdById = createdById;
    if (teamId) where.teamId = teamId;
    if (accountId) where.accountId = accountId;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (leadId) where.leadId = leadId;

    if (dueBefore) where.dueDate = { [Op.lte]: new Date(dueBefore) };
    if (dueAfter) where.dueDate = { ...where.dueDate, [Op.gte]: new Date(dueAfter) };

    if (isOverdue) {
      where.dueDate = { [Op.lt]: new Date() };
      where.status = { [Op.notIn]: ['completed', 'cancelled'] };
    }

    // Role-based filtering
    if (userRole === 'sales_rep') {
      where[Op.or] = [
        { assigneeId: userId },
        { createdById: userId }
      ];
    }

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: Deal, as: 'deal', attributes: ['id', 'title'] }
      ],
      order: [
        [literal('CASE WHEN status = \'pending\' THEN 0 WHEN status = \'in_progress\' THEN 1 ELSE 2 END'), 'ASC'],
        [sortBy, sortOrder === 'ASC' ? 'ASC NULLS LAST' : 'DESC NULLS LAST']
      ],
      limit: Math.min(limit, 100),
      offset,
      distinct: true
    });

    return {
      tasks: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get my tasks (current user)
   */
  async getMyTasks(userId, filters = {}) {
    return this.getAll({ ...filters, assigneeId: userId }, userId, 'sales_rep');
  }

  /**
   * Update task
   */
  async update(taskId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(taskId, { transaction });

      if (!task) {
        throw new Error('Task not found');
      }

      const changes = {};
      Object.keys(updateData).forEach(key => {
        if (task[key] !== updateData[key]) {
          changes[key] = { from: task[key], to: updateData[key] };
        }
      });

      await task.update(updateData, { transaction });

      // Notify if assignee changed
      if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId) {
        await NotificationService.create({
          userId: updateData.assigneeId,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `Task: "${task.title}" has been assigned to you`,
          link: `/tasks`
        });
      }

      if (Object.keys(changes).length > 0) {
        await Activity.create({
          type: 'task_updated',
          subject: `Task updated: ${task.title}`,
          userId,
          dealId: task.dealId,
          accountId: task.accountId,
          contactId: task.contactId,
          metadata: { taskId, changes }
        }, { transaction });
      }

      await transaction.commit();

      logger.audit('task_updated', userId, { taskId, changes });

      return this.getById(taskId, userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Complete task
   */
  async complete(taskId, userId, outcome = null) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(taskId, { transaction });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status === 'completed') {
        throw new Error('Task is already completed');
      }

      await task.update({
        status: 'completed',
        completedAt: new Date(),
        completedById: userId,
        outcome
      }, { transaction });

      await Activity.create({
        type: 'task_completed',
        subject: `Task completed: ${task.title}`,
        userId,
        dealId: task.dealId,
        accountId: task.accountId,
        contactId: task.contactId,
        metadata: { taskId, outcome }
      }, { transaction });

      // Notify creator if different from completer
      if (task.createdById !== userId) {
        await NotificationService.create({
          userId: task.createdById,
          type: 'task_completed',
          title: 'Task Completed',
          message: `Task: "${task.title}" has been completed`
        });
      }

      // Check if all subtasks are completed
      if (task.parentTaskId) {
        const parentTask = await Task.findByPk(task.parentTaskId, {
          include: [{ model: Task, as: 'subtasks' }],
          transaction
        });

        const allCompleted = parentTask.subtasks.every(st => st.status === 'completed');
        if (allCompleted) {
          await NotificationService.create({
            userId: parentTask.assigneeId,
            type: 'subtasks_completed',
            title: 'All Subtasks Completed',
            message: `All subtasks for "${parentTask.title}" are completed`
          });
        }
      }

      await transaction.commit();

      logger.audit('task_completed', userId, { taskId });

      return this.getById(taskId, userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reopen task
   */
  async reopen(taskId, userId) {
    const task = await Task.findByPk(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'completed') {
      throw new Error('Only completed tasks can be reopened');
    }

    await task.update({
      status: 'pending',
      completedAt: null,
      completedById: null
    });

    await Activity.create({
      type: 'task_reopened',
      subject: `Task reopened: ${task.title}`,
      userId,
      dealId: task.dealId,
      metadata: { taskId }
    });

    logger.audit('task_reopened', userId, { taskId });

    return this.getById(taskId, userId);
  }

  /**
   * Delete task
   */
  async delete(taskId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(taskId, {
        include: [{ model: Task, as: 'subtasks' }],
        transaction
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Delete subtasks first
      if (task.subtasks?.length > 0) {
        await Task.destroy({
          where: { parentTaskId: taskId },
          transaction
        });
      }

      await task.destroy({ transaction });

      await Activity.create({
        type: 'task_deleted',
        subject: `Task deleted: ${task.title}`,
        userId,
        metadata: { taskId, title: task.title }
      }, { transaction });

      await transaction.commit();

      logger.audit('task_deleted', userId, { taskId });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk assign tasks
   */
  async bulkAssign(taskIds, assigneeId, userId) {
    const transaction = await sequelize.transaction();

    try {
      await Task.update(
        { assigneeId },
        { where: { id: { [Op.in]: taskIds } }, transaction }
      );

      await Activity.create({
        type: 'tasks_bulk_assigned',
        subject: `${taskIds.length} tasks assigned`,
        userId,
        metadata: { taskIds, assigneeId }
      }, { transaction });

      // Notify assignee
      await NotificationService.create({
        userId: assigneeId,
        type: 'tasks_assigned',
        title: 'Tasks Assigned',
        message: `${taskIds.length} tasks have been assigned to you`
      });

      await transaction.commit();

      logger.audit('tasks_bulk_assigned', userId, { count: taskIds.length, assigneeId });

      return { success: true, count: taskIds.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk complete tasks
   */
  async bulkComplete(taskIds, userId) {
    const transaction = await sequelize.transaction();

    try {
      await Task.update(
        {
          status: 'completed',
          completedAt: new Date(),
          completedById: userId
        },
        { where: { id: { [Op.in]: taskIds } }, transaction }
      );

      await Activity.create({
        type: 'tasks_bulk_completed',
        subject: `${taskIds.length} tasks completed`,
        userId,
        metadata: { taskIds }
      }, { transaction });

      await transaction.commit();

      logger.audit('tasks_bulk_completed', userId, { count: taskIds.length });

      return { success: true, count: taskIds.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId, userRole) {
    const where = {
      dueDate: { [Op.lt]: new Date() },
      status: { [Op.notIn]: ['completed', 'cancelled'] }
    };

    if (userRole === 'sales_rep') {
      where.assigneeId = userId;
    }

    return Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: Deal, as: 'deal', attributes: ['id', 'title'] }
      ],
      order: [['dueDate', 'ASC']],
      limit: 50
    });
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(userId, userRole) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      dueDate: { [Op.between]: [startOfDay, endOfDay] },
      status: { [Op.notIn]: ['completed', 'cancelled'] }
    };

    if (userRole === 'sales_rep') {
      where.assigneeId = userId;
    }

    return Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: Account, as: 'account', attributes: ['id', 'name'] }
      ],
      order: [['priority', 'DESC'], ['dueDate', 'ASC']]
    });
  }

  /**
   * Schedule task reminder
   */
  async scheduleReminder(task) {
    // This would integrate with a job scheduler like Bull or Agenda
    // For now, we store the reminder time and ReminderService handles it
    logger.info('Task reminder scheduled', { taskId: task.id, reminderAt: task.reminderAt });
  }

  /**
   * Get task statistics
   */
  async getStats(userId, userRole, period = 'week') {
    const where = {};

    if (userRole === 'sales_rep') {
      where.assigneeId = userId;
    }

    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    if (startDate) {
      where.createdAt = { [Op.gte]: startDate };
    }

    const [total, byStatus, byPriority, overdue, completedOnTime] = await Promise.all([
      Task.count({ where }),
      Task.findAll({
        where,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Task.findAll({
        where,
        attributes: ['priority', [fn('COUNT', col('id')), 'count']],
        group: ['priority'],
        raw: true
      }),
      Task.count({
        where: {
          ...where,
          dueDate: { [Op.lt]: new Date() },
          status: { [Op.notIn]: ['completed', 'cancelled'] }
        }
      }),
      Task.count({
        where: {
          ...where,
          status: 'completed',
          completedAt: { [Op.lte]: col('dueDate') }
        }
      })
    ]);

    const completed = byStatus.find(s => s.status === 'completed')?.count || 0;

    return {
      total,
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {}),
      byPriority: byPriority.reduce((acc, row) => ({ ...acc, [row.priority]: parseInt(row.count) }), {}),
      overdue,
      completed: parseInt(completed),
      completedOnTime,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      onTimeRate: completed > 0 ? ((completedOnTime / completed) * 100).toFixed(1) : 0
    };
  }
}

export default new TaskService();
