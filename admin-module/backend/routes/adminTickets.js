import express from 'express';
import { Op } from 'sequelize';
import { Ticket } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/tickets
 * @desc    Get all tickets with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', verifyAdminToken, requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where = { isDeleted: false };
    if (status) where.status = status;
    if (type) where.type = type;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy === 'createdAt' ? 'created_at' : sortBy, sortOrder.toUpperCase()]];

    const { rows: tickets, count: total } = await Ticket.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/tickets/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/stats', verifyAdminToken, requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const total = await Ticket.count({ where: { isDeleted: false } });
    const active = await Ticket.count({ where: { status: 'active', isDeleted: false } });
    const used = await Ticket.count({ where: { status: 'used', isDeleted: false } });
    const expired = await Ticket.count({ where: { status: 'expired', isDeleted: false } });
    const cancelled = await Ticket.count({ where: { status: 'cancelled', isDeleted: false } });

    res.json({
      success: true,
      data: {
        overview: { total, active, used, expired, cancelled, totalRevenue: 0, avgPrice: 0 },
        byStatus: [],
        byType: [],
        byEvent: [],
        recentSales: []
      }
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/tickets/:id
 * @desc    Get single ticket by ID
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/:id', verifyAdminToken, requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets
 * @desc    Create new ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/', verifyAdminToken, requirePermission('tickets', 'create'), async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      createdById: req.adminUser.id,
      updatedById: req.adminUser.id
    };

    const ticket = await Ticket.create(ticketData);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/tickets/:id
 * @desc    Update ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.put('/:id', verifyAdminToken, requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.update({
      ...req.body,
      updatedById: req.adminUser.id
    });

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/use
 * @desc    Mark ticket as used (scan/validate)
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/use', verifyAdminToken, requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Ticket cannot be used. Current status: ${ticket.status}`
      });
    }

    await ticket.use(req.adminUser.id, req.body.scanInfo);

    res.json({
      success: true,
      message: 'Ticket validated successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error using ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to validate ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/cancel
 * @desc    Cancel ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/cancel', verifyAdminToken, requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy, refund } = req.body;
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.cancel(reason, cancelledBy || 'admin', refund, req.adminUser.id);

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to cancel ticket',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/tickets/:id
 * @desc    Soft delete ticket
 * @access  Private (Admin)
 */
router.delete('/:id', verifyAdminToken, requirePermission('tickets', 'delete'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.softDelete(req.adminUser.id);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete ticket',
      error: error.message
    });
  }
});

export default router;
