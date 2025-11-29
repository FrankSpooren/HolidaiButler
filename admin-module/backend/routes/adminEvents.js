import express from 'express';
import { Op } from 'sequelize';
import { Event } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/events
 * @desc    Get all events with filtering and pagination
 * @access  Private (Admin, Editor, Reviewer)
 */
router.get('/', verifyAdminToken, requirePermission('events', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.primaryCategory = category;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy === 'startDate' ? 'start_date' : sortBy, sortOrder.toUpperCase()]];

    const { rows: events, count: total } = await Event.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/events/stats
 * @desc    Get event statistics
 * @access  Private (Admin, Editor)
 */
router.get('/stats', verifyAdminToken, requirePermission('events', 'view'), async (req, res) => {
  try {
    const total = await Event.count();
    const published = await Event.count({ where: { status: 'published' } });
    const draft = await Event.count({ where: { status: 'draft' } });

    res.json({
      success: true,
      data: {
        overview: { total, published, draft },
        byCategory: [],
        byStatus: []
      }
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/events/:id
 * @desc    Get single event by ID
 * @access  Private (Admin, Editor, Reviewer)
 */
router.get('/:id', verifyAdminToken, requirePermission('events', 'view'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/events
 * @desc    Create new event
 * @access  Private (Admin, Editor)
 */
router.post('/', verifyAdminToken, requirePermission('events', 'create'), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdById: req.adminUser.id,
      updatedById: req.adminUser.id
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update event
 * @access  Private (Admin, Editor)
 */
router.put('/:id', verifyAdminToken, requirePermission('events', 'edit'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.update({
      ...req.body,
      updatedById: req.adminUser.id
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Soft delete event
 * @access  Private (Admin)
 */
router.delete('/:id', verifyAdminToken, requirePermission('events', 'delete'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.softDelete(req.adminUser.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

export default router;
