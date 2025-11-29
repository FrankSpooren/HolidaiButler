import express from 'express';
import Booking from '../models/Booking.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search in booking number, confirmation code, or customer name/email
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { confirmationCode: { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter['payment.status'] = paymentStatus;
    }

    // Date range for visit details
    if (startDate || endDate) {
      filter['visitDetails.date'] = {};
      if (startDate) {
        filter['visitDetails.date'].$gte = new Date(startDate);
      }
      if (endDate) {
        filter['visitDetails.date'].$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('customer.userId', 'profile email')
        .populate('items.event', 'title startDate')
        .populate('items.poi', 'name')
        .populate('payment.transactionId')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/bookings/stats
 * @desc    Get booking statistics
 * @access  Private (Admin, Editor)
 */
router.get('/stats', requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter = {};
    if (type) filter.type = type;

    const dateFilter = { ...filter };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      overview,
      byType,
      byStatus,
      byPaymentStatus,
      bySource,
      recentBookings,
      upcomingVisits
    ] = await Promise.all([
      // Overview stats
      Booking.aggregate([
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
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$pricing.total' },
            avgBookingValue: { $avg: '$pricing.total' },
            totalItems: { $sum: { $size: '$items' } }
          }
        }
      ]),

      // By type
      Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            revenue: { $sum: '$pricing.total' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // By status
      Booking.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // By payment status
      Booking.aggregate([
        { $match: filter },
        { $group: { _id: '$payment.status', count: { $sum: 1 } } }
      ]),

      // By source channel
      Booking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$source.channel',
            count: { $sum: 1 },
            revenue: { $sum: '$pricing.total' }
          }
        }
      ]),

      // Recent bookings
      Booking.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer.userId', 'profile')
        .select('bookingNumber customer pricing status createdAt'),

      // Upcoming visits
      Booking.getUpcoming(7)
        .populate('items.event', 'title')
        .select('bookingNumber customer visitDetails items')
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          total: 0,
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
          avgBookingValue: 0,
          totalItems: 0
        },
        byType,
        byStatus,
        byPaymentStatus,
        bySource,
        recentBookings,
        upcomingVisits
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/bookings/today
 * @desc    Get today's bookings
 * @access  Private (Admin, Editor)
 */
router.get('/today', requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const bookings = await Booking.getTodayBookings(filter)
      .populate('items.event', 'title')
      .populate('items.poi', 'name')
      .populate('customer.userId', 'profile');

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    console.error('Error fetching today\'s bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s bookings',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    Get single booking by ID
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/:id', requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer.userId', 'profile email phone')
      .populate('items.event', 'title startDate location')
      .populate('items.poi', 'name location contact')
      .populate('items.ticketIds')
      .populate('payment.transactionId')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .populate('updatedBy', 'profile.firstName profile.lastName')
      .populate('adminNotes.createdBy', 'profile.firstName profile.lastName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings
 * @desc    Create new booking
 * @access  Private (Admin, Editor)
 */
router.post('/', requirePermission('bookings', 'create'), async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      source: {
        ...req.body.source,
        channel: 'admin'
      },
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    };

    const booking = new Booking(bookingData);
    await booking.save();

    await booking.populate(['items.event', 'items.poi', 'customer.userId']);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Update booking
 * @access  Private (Admin, Editor)
 */
router.put('/:id', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update fields
    const allowedUpdates = [
      'customer', 'items', 'pricing', 'visitDetails',
      'specialRequests', 'fulfillment'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        booking[field] = req.body[field];
      }
    });

    booking.updatedBy = req.admin._id;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/confirm
 * @desc    Confirm booking
 * @access  Private (Admin, Editor)
 */
router.post('/:id/confirm', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const { transactionId } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.confirm(transactionId, req.admin._id);

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/complete
 * @desc    Mark booking as completed
 * @access  Private (Admin, Editor)
 */
router.post('/:id/complete', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.complete(req.admin._id);

    res.json({
      success: true,
      message: 'Booking completed successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to complete booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private (Admin, Editor)
 */
router.post('/:id/cancel', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy, refundAmount } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.cancel(
      reason,
      cancelledBy || 'admin',
      refundAmount || 0,
      req.admin._id
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/notes
 * @desc    Add note to booking
 * @access  Private (Admin, Editor)
 */
router.post('/:id/notes', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const { note } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.addNote(note, req.admin._id);

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { booking }
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
 * @route   POST /api/admin/bookings/:id/resend-confirmation
 * @desc    Resend booking confirmation
 * @access  Private (Admin, Editor)
 */
router.post('/:id/resend-confirmation', requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update notification
    booking.notifications.confirmation.sentAt = new Date();
    booking.updatedBy = req.admin._id;
    await booking.save();

    // TODO: Trigger actual email sending

    res.json({
      success: true,
      message: 'Confirmation resent successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error resending confirmation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to resend confirmation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/bookings/customer/:customerId
 * @desc    Get bookings by customer
 * @access  Private (Admin, Editor)
 */
router.get('/customer/:customerId', requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const bookings = await Booking.find({
      'customer.userId': req.params.customerId
    })
      .sort({ createdAt: -1 })
      .populate('items.event', 'title')
      .populate('items.poi', 'name');

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer bookings',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/bookings/bulk-update-status
 * @desc    Bulk update booking status
 * @access  Private (Admin)
 */
router.post('/bulk-update-status', requirePermission('bookings', 'delete'), async (req, res) => {
  try {
    const { bookingIds, status } = req.body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Booking IDs array is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'refunded', 'no_show', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
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
      message: `${result.modifiedCount} bookings updated successfully`,
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error bulk updating bookings:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update bookings',
      error: error.message
    });
  }
});

export default router;
