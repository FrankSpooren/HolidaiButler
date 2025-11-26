/**
 * API Routes Index
 * Central router configuration
 */

import { Router } from 'express';
import authRoutes from './auth.js';
import dealRoutes from './deals.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, querySchemas, accountSchemas, contactSchemas, leadSchemas, taskSchemas, activitySchemas, userSchemas, importExportSchemas } from '../middleware/validators.js';
import {
  User, Account, Contact, Lead, Campaign, Activity, Task,
  Pipeline, PipelineStage, Team, Notification, Product,
  Quote, Document, SharedInbox, EmailMessage
} from '../models/index.js';
import ReportingService from '../services/ReportingService.js';
import ImportExportService from '../services/ImportExportService.js';
import NotificationService from '../services/NotificationService.js';
import logger from '../utils/logger.js';

const router = Router();

// Auth routes (no prefix needed, handled in server.js)
router.use('/auth', authRoutes);
router.use('/deals', dealRoutes);

// ============================================
// USER ROUTES
// ============================================

router.get('/users', authenticate, requireRole('admin', 'super_admin', 'sales_manager'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'twoFactorSecret', 'passwordResetToken'] },
      include: [{ model: Team, as: 'team', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users', authenticate, requireRole('admin', 'super_admin'), validate(userSchemas.create), async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/users/:id', authenticate, requireRole('admin', 'super_admin'), validate(userSchemas.update), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await user.update(req.body);
    res.json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/users/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// ACCOUNT ROUTES
// ============================================

router.get('/accounts', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    if (req.query.search) where.name = { [require('sequelize').Op.iLike]: `%${req.query.search}%` };

    const accounts = await Account.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 50,
      offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 50)
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accounts/:id', authenticate, async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Contact, as: 'contacts' },
        { model: (await import('../models/index.js')).Deal, as: 'deals' }
      ]
    });
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Get account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accounts', authenticate, validate(accountSchemas.create), async (req, res) => {
  try {
    const account = await Account.create({ ...req.body, ownerId: req.body.ownerId || req.userId });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    logger.error('Create account error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/accounts/:id', authenticate, validate(accountSchemas.update), async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    await account.update(req.body);
    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Update account error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    await Account.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// CONTACT ROUTES
// ============================================

router.get('/contacts', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.accountId) where.accountId = req.query.accountId;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${req.query.search}%` } },
        { lastName: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const contacts = await Contact.findAll({
      where,
      include: [{ model: Account, as: 'account', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: contacts });
  } catch (error) {
    logger.error('Get contacts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/contacts', authenticate, validate(contactSchemas.create), async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, ownerId: req.body.ownerId || req.userId });
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    logger.error('Create contact error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/contacts/:id', authenticate, validate(contactSchemas.update), async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    await contact.update(req.body);
    res.json({ success: true, data: contact });
  } catch (error) {
    logger.error('Update contact error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/contacts/:id', authenticate, async (req, res) => {
  try {
    await Contact.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    logger.error('Delete contact error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// LEAD ROUTES
// ============================================

router.get('/leads', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.source) where.source = req.query.source;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    if (req.query.myLeads === 'true') where.ownerId = req.userId;

    const leads = await Lead.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: leads });
  } catch (error) {
    logger.error('Get leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/leads', authenticate, validate(leadSchemas.create), async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body, ownerId: req.body.ownerId || req.userId });
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    logger.error('Create lead error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/leads/:id', authenticate, validate(leadSchemas.update), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    await lead.update(req.body);
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Update lead error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/leads/:id', authenticate, async (req, res) => {
  try {
    await Lead.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    logger.error('Delete lead error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// TASK ROUTES
// ============================================

router.get('/tasks', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.assignedTo) where.assignedTo = req.query.assignedTo;
    if (req.query.myTasks === 'true') where.assignedTo = req.userId;
    if (req.query.dealId) where.dealId = req.query.dealId;
    if (req.query.accountId) where.accountId = req.query.accountId;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: (await import('../models/index.js')).Deal, as: 'deal', attributes: ['id', 'name'] }
      ],
      order: [['dueDate', 'ASC']],
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks', authenticate, validate(taskSchemas.create), async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.userId,
      assignedTo: req.body.assignedTo || req.userId
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/tasks/:id', authenticate, validate(taskSchemas.update), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    await task.update(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    logger.error('Update task error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/tasks/:id', authenticate, async (req, res) => {
  try {
    await Task.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// ACTIVITY ROUTES
// ============================================

router.get('/activities', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.dealId) where.dealId = req.query.dealId;
    if (req.query.accountId) where.accountId = req.query.accountId;
    if (req.query.contactId) where.contactId = req.query.contactId;
    if (req.query.userId) where.userId = req.query.userId;

    const activities = await Activity.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: Contact, as: 'contact', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    logger.error('Get activities error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/activities', authenticate, validate(activitySchemas.create), async (req, res) => {
  try {
    const activity = await Activity.create({
      ...req.body,
      userId: req.userId,
      createdBy: req.userId
    });
    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    logger.error('Create activity error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// PIPELINE ROUTES
// ============================================

router.get('/pipelines', authenticate, async (req, res) => {
  try {
    const pipelines = await Pipeline.findAll({
      where: { isActive: true },
      include: [{ model: PipelineStage, as: 'stages', order: [['order', 'ASC']] }],
      order: [['displayOrder', 'ASC']]
    });
    res.json({ success: true, data: pipelines });
  } catch (error) {
    logger.error('Get pipelines error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/pipelines/:id', authenticate, async (req, res) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id, {
      include: [{ model: PipelineStage, as: 'stages', order: [['order', 'ASC']] }]
    });
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    res.json({ success: true, data: pipeline });
  } catch (error) {
    logger.error('Get pipeline error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TEAM ROUTES
// ============================================

router.get('/teams', authenticate, async (req, res) => {
  try {
    const teams = await Team.findAll({
      where: { isActive: true },
      include: [{ model: User, as: 'manager', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: teams });
  } catch (error) {
    logger.error('Get teams error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await NotificationService.getNotifications(req.userId, {
      unreadOnly: req.query.unreadOnly === 'true',
      type: req.query.type,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.userId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// REPORTING ROUTES
// ============================================

router.get('/reports/dashboard', authenticate, async (req, res) => {
  try {
    const metrics = await ReportingService.getDashboardMetrics(req.userId, {
      teamId: req.query.teamId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    });
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Dashboard report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/sales-performance', authenticate, async (req, res) => {
  try {
    const report = await ReportingService.getSalesPerformanceReport({
      teamId: req.query.teamId,
      userId: req.query.userId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      groupBy: req.query.groupBy || 'user'
    });
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Sales performance report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/campaign-performance', authenticate, async (req, res) => {
  try {
    const report = await ReportingService.getCampaignPerformanceReport({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      type: req.query.type,
      status: req.query.status
    });
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Campaign report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/forecast', authenticate, async (req, res) => {
  try {
    const report = await ReportingService.getForecastReport({
      ownerId: req.query.ownerId || req.userId,
      teamId: req.query.teamId,
      pipelineId: req.query.pipelineId
    });
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Forecast report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// IMPORT/EXPORT ROUTES
// ============================================

router.get('/imports', authenticate, async (req, res) => {
  try {
    const result = await ImportExportService.getJobs(req.userId, 'import', {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Get imports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/imports', authenticate, validate(importExportSchemas.createImport), async (req, res) => {
  try {
    // File upload handled separately via multer
    const job = await ImportExportService.createImportJob(
      { path: req.body.fileUrl, originalname: req.body.fileName, size: req.body.fileSize },
      req.body,
      req.userId
    );
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    logger.error('Create import error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/exports', authenticate, async (req, res) => {
  try {
    const result = await ImportExportService.getJobs(req.userId, 'export', {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Get exports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/exports', authenticate, validate(importExportSchemas.createExport), async (req, res) => {
  try {
    const job = await ImportExportService.createExportJob(req.body, req.userId);
    // Start async processing
    ImportExportService.processExport(job.id).catch(err => logger.error('Export process error:', err));
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    logger.error('Create export error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// PRODUCT ROUTES
// ============================================

router.get('/products', authenticate, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sales-pipeline-module'
  });
});

export default router;
