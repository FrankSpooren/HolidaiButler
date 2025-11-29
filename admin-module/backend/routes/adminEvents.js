import express from 'express';
import Event from '../models/Event.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/events
 * @desc    Get all events with filtering and pagination
 * @access  Private (Admin, Editor, Reviewer)
 */
router.get('/', requirePermission('events', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      city,
      startDate,
      endDate,
      isFree,
      poiId,
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search in title and description
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.es': { $regex: search, $options: 'i' } },
        { 'title.de': { $regex: search, $options: 'i' } },
        { 'title.fr': { $regex: search, $options: 'i' } },
        { 'title.nl': { $regex: search, $options: 'i' } },
        { 'description.en': { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (poiId) {
      filter.poi = poiId;
    }

    if (isFree !== undefined) {
      filter.isFree = isFree === 'true';
    }

    // Date range filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    // Soft delete filter
    filter.isDeleted = false;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('poi', 'name location')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Event.countDocuments(filter)
    ]);

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
router.get('/stats', requirePermission('events', 'view'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = { isDeleted: false };
    if (startDate || endDate) {
      dateFilter.startDate = {};
      if (startDate) dateFilter.startDate.$gte = new Date(startDate);
      if (endDate) dateFilter.startDate.$lte = new Date(endDate);
    }

    const [
      overview,
      byCategory,
      byStatus,
      byCity,
      upcoming,
      trending
    ] = await Promise.all([
      // Overview stats
      Event.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            draft: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            free: {
              $sum: { $cond: ['$isFree', 1, 0] }
            },
            paid: {
              $sum: { $cond: [{ $not: '$isFree' }, 1, 0] }
            },
            totalViews: { $sum: '$stats.views' },
            totalBookings: { $sum: '$stats.bookings' },
            totalRevenue: { $sum: '$stats.revenue' },
            avgQualityScore: { $avg: '$qualityScore' }
          }
        }
      ]),

      // By category
      Event.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // By status
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // By city
      Event.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Upcoming events
      Event.find({
        isDeleted: false,
        status: 'published',
        startDate: { $gte: new Date() }
      })
        .sort({ startDate: 1 })
        .limit(10)
        .select('title startDate location category'),

      // Trending events
      Event.find({
        isDeleted: false,
        status: 'published',
        startDate: { $gte: new Date() }
      })
        .sort({ 'stats.views': -1 })
        .limit(10)
        .select('title startDate stats category')
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          total: 0,
          published: 0,
          draft: 0,
          completed: 0,
          free: 0,
          paid: 0,
          totalViews: 0,
          totalBookings: 0,
          totalRevenue: 0,
          avgQualityScore: 0
        },
        byCategory,
        byStatus,
        byCity,
        upcoming,
        trending
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
router.get('/:id', requirePermission('events', 'view'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('poi', 'name location contact')
      .populate('createdBy', 'profile.firstName profile.lastName email')
      .populate('updatedBy', 'profile.firstName profile.lastName');

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
router.post('/', requirePermission('events', 'create'), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    };

    const event = new Event(eventData);
    await event.save();

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
router.put('/:id', requirePermission('events', 'edit'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Update fields
    const allowedUpdates = [
      'title', 'description', 'category', 'poi', 'location',
      'startDate', 'endDate', 'timeOfDay', 'schedule',
      'images', 'organizer', 'contact', 'website', 'socialMedia',
      'isFree', 'priceRange', 'ticketing', 'capacity',
      'tags', 'seo', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    event.updatedBy = req.admin._id;
    await event.save();

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
 * @route   PATCH /api/admin/events/:id/status
 * @desc    Update event status
 * @access  Private (Admin, Editor)
 */
router.patch('/:id/status', requirePermission('events', 'edit'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const event = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = status;
    event.updatedBy = req.admin._id;
    await event.save();

    res.json({
      success: true,
      message: `Event ${status} successfully`,
      data: { event }
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event status',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Soft delete event
 * @access  Private (Admin)
 */
router.delete('/:id', requirePermission('events', 'delete'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.softDelete(req.admin._id);

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

/**
 * @route   POST /api/admin/events/:id/publish
 * @desc    Publish event
 * @access  Private (Admin, Editor)
 */
router.post('/:id/publish', requirePermission('events', 'edit'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is already published'
      });
    }

    event.status = 'published';
    event.updatedBy = req.admin._id;
    await event.save();

    res.json({
      success: true,
      message: 'Event published successfully',
      data: { event }
    });
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to publish event',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/events/:id/duplicate
 * @desc    Duplicate event
 * @access  Private (Admin, Editor)
 */
router.post('/:id/duplicate', requirePermission('events', 'create'), async (req, res) => {
  try {
    const originalEvent = await Event.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!originalEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Create duplicate
    const duplicateData = originalEvent.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.stats;

    // Modify title
    duplicateData.title.en = `${duplicateData.title.en} (Copy)`;
    duplicateData.status = 'draft';
    duplicateData.createdBy = req.admin._id;
    duplicateData.updatedBy = req.admin._id;

    const duplicateEvent = new Event(duplicateData);
    await duplicateEvent.save();

    res.status(201).json({
      success: true,
      message: 'Event duplicated successfully',
      data: { event: duplicateEvent }
    });
  } catch (error) {
    console.error('Error duplicating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to duplicate event',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/events/bulk-delete
 * @desc    Bulk delete events
 * @access  Private (Admin)
 */
router.post('/bulk-delete', requirePermission('events', 'delete'), async (req, res) => {
  try {
    const { eventIds } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Event IDs array is required'
      });
    }

    const result = await Event.updateMany(
      { _id: { $in: eventIds }, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.admin._id
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} events deleted successfully`,
      data: { deletedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error bulk deleting events:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete events',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/events/bulk-update-status
 * @desc    Bulk update event status
 * @access  Private (Admin, Editor)
 */
router.post('/bulk-update-status', requirePermission('events', 'edit'), async (req, res) => {
  try {
    const { eventIds, status } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Event IDs array is required'
      });
    }

    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await Event.updateMany(
      { _id: { $in: eventIds }, isDeleted: false },
      {
        $set: {
          status,
          updatedBy: req.admin._id,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} events updated successfully`,
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error bulk updating events:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update events',
      error: error.message
    });
  }
});

export default router;
