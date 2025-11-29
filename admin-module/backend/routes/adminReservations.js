import express from 'express';
import { Op } from 'sequelize';
import { Reservation } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/reservations
 * @desc    Get all reservations with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', verifyAdminToken, requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where = { isDeleted: false };
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy === 'createdAt' ? 'created_at' : sortBy, sortOrder.toUpperCase()]];

    const { rows: reservations, count: total } = await Reservation.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

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
router.get('/stats', verifyAdminToken, requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const total = await Reservation.count({ where: { isDeleted: false } });
    const pending = await Reservation.count({ where: { status: 'pending', isDeleted: false } });
    const confirmed = await Reservation.count({ where: { status: 'confirmed', isDeleted: false } });
    const completed = await Reservation.count({ where: { status: 'completed', isDeleted: false } });
    const cancelled = await Reservation.count({ where: { status: 'cancelled', isDeleted: false } });

    res.json({
      success: true,
      data: {
        overview: { total, pending, confirmed, completed, cancelled, noShow: 0, totalGuests: 0, avgPartySize: 0, totalRevenue: 0 },
        byStatus: [],
        byPOI: [],
        todayCount: 0,
        upcomingCount: 0
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
router.get('/today', verifyAdminToken, requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await Reservation.findAll({
      where: {
        date: { [Op.gte]: today, [Op.lt]: tomorrow },
        isDeleted: false
      },
      order: [['time', 'ASC']]
    });

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
router.get('/:id', verifyAdminToken, requirePermission('reservations', 'view'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
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
router.post('/', verifyAdminToken, requirePermission('reservations', 'create'), async (req, res) => {
  try {
    const reservationData = {
      ...req.body,
      createdById: req.adminUser.id,
      updatedById: req.adminUser.id
    };

    const reservation = await Reservation.create(reservationData);

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
router.put('/:id', verifyAdminToken, requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.update({
      ...req.body,
      updatedById: req.adminUser.id
    });

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
router.post('/:id/confirm', verifyAdminToken, requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.confirm(req.adminUser.id);

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
 * @route   POST /api/admin/reservations/:id/cancel
 * @desc    Cancel reservation
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/cancel', verifyAdminToken, requirePermission('reservations', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy } = req.body;
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.cancel(reason, cancelledBy || 'admin', req.adminUser.id);

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
 * @route   DELETE /api/admin/reservations/:id
 * @desc    Soft delete reservation
 * @access  Private (Admin)
 */
router.delete('/:id', verifyAdminToken, requirePermission('reservations', 'delete'), async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, isDeleted: false }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await reservation.softDelete(req.adminUser.id);

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
