import express from 'express';
import { Op } from 'sequelize';
import { Booking } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

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

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy === 'createdAt' ? 'created_at' : sortBy, sortOrder.toUpperCase()]];

    const { rows: bookings, count: total } = await Booking.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

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
    const total = await Booking.count();
    const pending = await Booking.count({ where: { status: 'pending' } });
    const confirmed = await Booking.count({ where: { status: 'confirmed' } });
    const completed = await Booking.count({ where: { status: 'completed' } });
    const cancelled = await Booking.count({ where: { status: 'cancelled' } });

    res.json({
      success: true,
      data: {
        overview: { total, pending, confirmed, completed, cancelled, totalRevenue: 0, avgBookingValue: 0, totalItems: 0 },
        byType: [],
        byStatus: [],
        byPaymentStatus: [],
        bySource: [],
        recentBookings: [],
        upcomingVisits: []
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
