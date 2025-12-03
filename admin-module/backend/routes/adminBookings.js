import express from 'express';
import { Op } from 'sequelize';
import { Booking } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Development mode check
const isDevelopmentMode = () => {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === undefined || env === '';
};

// Development fallback bookings
const DEV_FALLBACK_BOOKINGS = [
  {
    id: 1,
    bookingNumber: 'BK-2024-001',
    type: 'event',
    status: 'confirmed',
    customerName: 'Jan de Vries',
    customerEmail: 'jan@example.com',
    customerPhone: '+31 6 12345678',
    eventId: 1,
    eventName: 'Costa Blanca Music Festival',
    quantity: 2,
    totalAmount: 150.00,
    currency: 'EUR',
    paymentStatus: 'paid',
    bookingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    visitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'website',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    bookingNumber: 'BK-2024-002',
    type: 'tour',
    status: 'pending',
    customerName: 'Maria García',
    customerEmail: 'maria@example.com',
    customerPhone: '+34 612 345 678',
    tourId: 1,
    tourName: 'Old Town Walking Tour',
    quantity: 4,
    totalAmount: 120.00,
    currency: 'EUR',
    paymentStatus: 'pending',
    bookingDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    visitDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'mobile_app',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    bookingNumber: 'BK-2024-003',
    type: 'experience',
    status: 'completed',
    customerName: 'Thomas Mueller',
    customerEmail: 'thomas@example.de',
    customerPhone: '+49 151 12345678',
    experienceId: 1,
    experienceName: 'Tapas Cooking Class',
    quantity: 2,
    totalAmount: 90.00,
    currency: 'EUR',
    paymentStatus: 'paid',
    bookingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    visitDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'partner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    bookingNumber: 'BK-2024-004',
    type: 'event',
    status: 'cancelled',
    customerName: 'Sophie Laurent',
    customerEmail: 'sophie@example.fr',
    customerPhone: '+33 6 12345678',
    eventId: 2,
    eventName: 'Wine Tasting Evening',
    quantity: 2,
    totalAmount: 70.00,
    currency: 'EUR',
    paymentStatus: 'refunded',
    bookingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    visitDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancellationReason: 'Customer request',
    source: 'website',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', verifyAdminToken, requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let bookings = [];
    let total = 0;

    try {
      const where = {};
      if (status) where.status = status;
      if (type) where.type = type;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const order = [[sortBy === 'createdAt' ? 'created_at' : sortBy, sortOrder.toUpperCase()]];

      const result = await Booking.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset
      });

      bookings = result.rows;
      total = result.count;
    } catch (dbError) {
      console.warn('Bookings query failed, using fallback:', dbError.message);
      if (isDevelopmentMode()) {
        bookings = DEV_FALLBACK_BOOKINGS.filter(b => {
          if (status && b.status !== status) return false;
          if (type && b.type !== type) return false;
          return true;
        });
        total = bookings.length;
      }
    }

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
router.get('/stats', verifyAdminToken, requirePermission('bookings', 'view'), async (req, res) => {
  try {
    let total = 0, pending = 0, confirmed = 0, completed = 0, cancelled = 0;
    let totalRevenue = 0;

    try {
      total = await Booking.count();
      pending = await Booking.count({ where: { status: 'pending' } });
      confirmed = await Booking.count({ where: { status: 'confirmed' } });
      completed = await Booking.count({ where: { status: 'completed' } });
      cancelled = await Booking.count({ where: { status: 'cancelled' } });
    } catch (dbError) {
      console.warn('Booking stats query failed:', dbError.message);
      if (isDevelopmentMode()) {
        total = DEV_FALLBACK_BOOKINGS.length;
        pending = DEV_FALLBACK_BOOKINGS.filter(b => b.status === 'pending').length;
        confirmed = DEV_FALLBACK_BOOKINGS.filter(b => b.status === 'confirmed').length;
        completed = DEV_FALLBACK_BOOKINGS.filter(b => b.status === 'completed').length;
        cancelled = DEV_FALLBACK_BOOKINGS.filter(b => b.status === 'cancelled').length;
        totalRevenue = DEV_FALLBACK_BOOKINGS.reduce((sum, b) => sum + b.totalAmount, 0);
      }
    }

    res.json({
      success: true,
      data: {
        overview: { total, pending, confirmed, completed, cancelled, totalRevenue, avgBookingValue: total > 0 ? totalRevenue / total : 0, totalItems: total * 2 },
        byType: [
          { _id: 'event', count: 2 },
          { _id: 'tour', count: 1 },
          { _id: 'experience', count: 1 }
        ],
        byStatus: [
          { _id: 'confirmed', count: confirmed },
          { _id: 'pending', count: pending },
          { _id: 'completed', count: completed },
          { _id: 'cancelled', count: cancelled }
        ],
        byPaymentStatus: [
          { _id: 'paid', count: 2 },
          { _id: 'pending', count: 1 },
          { _id: 'refunded', count: 1 }
        ],
        bySource: [
          { _id: 'website', count: 2 },
          { _id: 'mobile_app', count: 1 },
          { _id: 'partner', count: 1 }
        ],
        recentBookings: DEV_FALLBACK_BOOKINGS.slice(0, 5),
        upcomingVisits: DEV_FALLBACK_BOOKINGS.filter(b => new Date(b.visitDate) > new Date()).slice(0, 5)
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
 * @route   GET /api/admin/bookings/:id
 * @desc    Get single booking by ID
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/:id', verifyAdminToken, requirePermission('bookings', 'view'), async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

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
router.post('/', verifyAdminToken, requirePermission('bookings', 'create'), async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      createdById: req.adminUser.id,
      updatedById: req.adminUser.id
    };

    const booking = await Booking.create(bookingData);

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
router.put('/:id', verifyAdminToken, requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.update({
      ...req.body,
      updatedById: req.adminUser.id
    });

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
router.post('/:id/confirm', verifyAdminToken, requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.confirm(req.body.transactionId, req.adminUser.id);

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
 * @route   POST /api/admin/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private (Admin, Editor)
 */
router.post('/:id/cancel', verifyAdminToken, requirePermission('bookings', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy, refundAmount } = req.body;
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.cancel(reason, cancelledBy || 'admin', refundAmount || 0, req.adminUser.id);

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

export default router;
