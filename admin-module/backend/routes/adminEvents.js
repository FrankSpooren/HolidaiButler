import express from 'express';
import { Op } from 'sequelize';
import { Event } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Development mode check
const isDevelopmentMode = () => {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === undefined || env === '';
};

// Development fallback events
const DEV_FALLBACK_EVENTS = [
  {
    id: 1,
    title: { en: 'Costa Blanca Music Festival', es: 'Festival de Música Costa Blanca', nl: 'Costa Blanca Muziekfestival' },
    description: { en: 'Annual summer music festival featuring local and international artists', es: 'Festival de música de verano anual', nl: 'Jaarlijks zomer muziekfestival' },
    category: 'music',
    status: 'published',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    location: { city: 'Benidorm', venue: 'Plaza Mayor', address: 'Plaza Mayor 1' },
    stats: { views: 1250, bookings: 89 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: { en: 'Tapas & Wine Tasting', es: 'Tapas y Cata de Vinos', nl: 'Tapas & Wijnproeverij' },
    description: { en: 'Experience the finest Spanish cuisine and wines', es: 'Experimenta la mejor cocina y vinos españoles', nl: 'Ervaar de beste Spaanse keuken en wijnen' },
    category: 'food_drink',
    status: 'published',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: { city: 'Altea', venue: 'Bodega del Sol', address: 'Calle Mayor 15' },
    stats: { views: 456, bookings: 32 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    title: { en: 'Flamenco Night', es: 'Noche de Flamenco', nl: 'Flamenco Avond' },
    description: { en: 'Authentic flamenco performance with dinner', es: 'Espectáculo flamenco auténtico con cena', nl: 'Authentieke flamenco voorstelling met diner' },
    category: 'arts_culture',
    status: 'draft',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: { city: 'Alicante', venue: 'Teatro Principal', address: 'Plaza Ruperto Chapí' },
    stats: { views: 234, bookings: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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

    let events = [];
    let total = 0;

    try {
      const where = {};
      if (status) where.status = status;
      if (category) where.primaryCategory = category;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const order = [[sortBy === 'startDate' ? 'start_date' : sortBy, sortOrder.toUpperCase()]];

      const result = await Event.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset
      });

      events = result.rows;
      total = result.count;
    } catch (dbError) {
      console.warn('Events query failed, using fallback:', dbError.message);
      if (isDevelopmentMode()) {
        // Filter fallback events based on query params
        events = DEV_FALLBACK_EVENTS.filter(e => {
          if (status && e.status !== status) return false;
          if (category && e.category !== category) return false;
          return true;
        });
        total = events.length;
      }
    }

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
    let total = 0, published = 0, draft = 0;
    let byCategory = [];
    let byStatus = [];

    try {
      total = await Event.count();
      published = await Event.count({ where: { status: 'published' } });
      draft = await Event.count({ where: { status: 'draft' } });
    } catch (dbError) {
      console.warn('Event stats query failed:', dbError.message);
      if (isDevelopmentMode()) {
        // Use fallback data for stats
        total = DEV_FALLBACK_EVENTS.length;
        published = DEV_FALLBACK_EVENTS.filter(e => e.status === 'published').length;
        draft = DEV_FALLBACK_EVENTS.filter(e => e.status === 'draft').length;
        byCategory = [
          { _id: 'music', count: 1 },
          { _id: 'food_drink', count: 1 },
          { _id: 'arts_culture', count: 1 }
        ];
        byStatus = [
          { _id: 'published', count: published },
          { _id: 'draft', count: draft }
        ];
      }
    }

    res.json({
      success: true,
      data: {
        overview: { total, published, draft },
        byCategory,
        byStatus
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
    const { id } = req.params;

    // Check for dev fallback event first
    if (isDevelopmentMode()) {
      const fallbackEvent = DEV_FALLBACK_EVENTS.find(e => e.id === parseInt(id));
      if (fallbackEvent) {
        return res.json({
          success: true,
          data: { event: fallbackEvent }
        });
      }
    }

    let event = null;
    try {
      event = await Event.findByPk(id);
    } catch (dbError) {
      console.warn('Event lookup failed:', dbError.message);
    }

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
