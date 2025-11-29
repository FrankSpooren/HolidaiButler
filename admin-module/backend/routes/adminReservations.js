import express from 'express';
import Reservation from '../models/Reservation.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/reservations
 * @desc    Get all reservations with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      poiId,
      date,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isDeleted: false };

    // Search in guest name or email
    if (search) {
      filter.$or = [
        { 'guest.firstName': { $regex: search, $options: 'i' } },
        { 'guest.lastName': { $regex: search, $options: 'i' } },
        { 'guest.email': { $regex: search, $options: 'i' } },
        { 'guest.phone': { $regex: search, $options: 'i' } },
        { reservationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (poiId) {
      filter.poi = poiId;
    }

    // Specific date
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: searchDate, $lt: nextDay };
    }

    // Date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // POI owner can only see their POIs
    if (req.admin.role === 'poi_owner') {
      filter.poi = { $in: req.admin.ownedPOIs };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate('poi', 'name location contact')
        .populate('guest.userId', 'profile.firstName profile.lastName email')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Reservation.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/reservations/stats
 * @desc    Get reservation statistics
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/stats', requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const { poiId, startDate, endDate } = req.query;

    const filter = { isDeleted: false };
    if (poiId) filter.poi = poiId;
    if (req.admin.role === 'poi_owner') {
      filter.poi = { $in: req.admin.ownedPOIs };
    }

    const dateFilter = { ...filter };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const [
      overview,
      byStatus,
      byPOI,
      todayReservations,
      upcomingReservations
    ] = await Promise.all([
      // Overview stats
      Reservation.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            confirmed: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            seated: {
              $sum: { $cond: [{ $eq: ['$status', 'seated'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            noShow: {
              $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] }
            },
            totalGuests: { $sum: '$partySize' },
            avgPartySize: { $avg: '$partySize' },
            totalRevenue: { $sum: '$revenue.total' }
          }
        }
      ]),

      // By status
      Reservation.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // By POI
      Reservation.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$poi', count: { $sum: 1 }, totalGuests: { $sum: '$partySize' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'pois',
            localField: '_id',
            foreignField: '_id',
            as: 'poiData'
          }
        }
      ]),

      // Today's reservations
      Reservation.getTodayReservations(poiId),

      // Upcoming reservations
      Reservation.getUpcoming(poiId, 7)
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          total: 0,
          pending: 0,
          confirmed: 0,
          seated: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          totalGuests: 0,
          avgPartySize: 0,
          totalRevenue: 0
        },
        byStatus,
        byPOI,
        todayCount: todayReservations.length,
        upcomingCount: upcomingReservations.length
      }
    });
  } catch (error) {
    console.error('Error fetching reservation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/reservations/today
 * @desc    Get today's reservations
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/today', requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const { poiId } = req.query;

    const filter = {};
    if (poiId) {
      filter.poi = poiId;
    } else if (req.admin.role === 'poi_owner') {
      filter.poi = { $in: req.admin.ownedPOIs };
    }

    const reservations = await Reservation.getTodayReservations(filter.poi)
      .populate('poi', 'name location')
      .populate('guest.userId', 'profile.firstName profile.lastName');

    res.json({
      success: true,
      data: { reservations }
    });
  } catch (error) {
    console.error('Error fetching today\'s reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s reservations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/reservations/:id
 * @desc    Get single reservation by ID
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/:id', requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('poi', 'name location contact')
      .populate('guest.userId', 'profile email')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .populate('updatedBy', 'profile.firstName profile.lastName');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // POI owner can only view their own POIs
    if (req.admin.role === 'poi_owner' && !req.admin.ownedPOIs.includes(reservation.poi._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this reservation'
      });
    }

    res.json({
      success: true,
      data: { reservation }
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations
 * @desc    Create new reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/', requirePermission('reservations', 'create'), async (req, res) => {
  try {
    const reservationData = {
      ...req.body,
      source: {
        ...req.body.source,
        channel: 'admin'
      },
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    };

    // POI owner can only create for their POIs
    if (req.admin.role === 'poi_owner' && !req.admin.ownedPOIs.includes(req.body.poi)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create reservation for this POI'
      });
    }

    const reservation = new Reservation(reservationData);
    await reservation.save();

    await reservation.populate('poi', 'name location');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create reservation',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/reservations/:id
 * @desc    Update reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.put('/:id', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // POI owner can only edit their own POIs
    if (req.admin.role === 'poi_owner' && !req.admin.ownedPOIs.includes(reservation.poi.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this reservation'
      });
    }

    // Update fields
    const allowedUpdates = [
      'guest', 'date', 'time', 'partySize', 'duration',
      'table', 'specialRequests', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        reservation[field] = req.body[field];
      }
    });

    reservation.updatedBy = req.admin._id;
    await reservation.save();

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/confirm
 * @desc    Confirm reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/confirm', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.confirm(req.admin._id);

    res.json({
      success: true,
      message: 'Reservation confirmed successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to confirm reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/seat
 * @desc    Mark reservation as seated
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/seat', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const { tableInfo } = req.body;

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.seat(tableInfo, req.admin._id);

    res.json({
      success: true,
      message: 'Reservation marked as seated',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error seating reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to seat reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/complete
 * @desc    Mark reservation as completed
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/complete', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const { revenueData } = req.body;

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.complete(revenueData, req.admin._id);

    res.json({
      success: true,
      message: 'Reservation completed successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error completing reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to complete reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/cancel
 * @desc    Cancel reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/cancel', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy } = req.body;

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.cancel(reason, cancelledBy || 'admin', req.admin._id);

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to cancel reservation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/no-show
 * @desc    Mark reservation as no-show
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/no-show', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    reservation.status = 'no_show';
    reservation.noShow = {
      markedAt: new Date(),
      markedBy: req.admin._id,
      notes: req.body.notes
    };
    reservation.updatedBy = req.admin._id;

    await reservation.save();

    res.json({
      success: true,
      message: 'Reservation marked as no-show',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error marking no-show:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to mark as no-show',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/reservations/:id/notes
 * @desc    Add note to reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/notes', requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const { note } = req.body;

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    if (!reservation.adminNotes) {
      reservation.adminNotes = [];
    }

    reservation.adminNotes.push({
      note,
      createdBy: req.admin._id,
      createdAt: new Date()
    });

    reservation.updatedBy = req.admin._id;
    await reservation.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/reservations/:id
 * @desc    Soft delete reservation
 * @access  Private (Admin)
 */
router.delete('/:id', requirePermission('reservations', 'delete'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.softDelete(req.admin._id);

    res.json({
      success: true,
      message: 'Reservation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete reservation',
      error: error.message
    });
  }
});

export default router;
