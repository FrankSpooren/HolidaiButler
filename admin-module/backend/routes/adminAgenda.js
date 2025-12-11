/**
 * Admin Agenda Routes
 * READ-ONLY operations for agenda management
 * Data source: pxoziy_db1.agenda and agenda_dates tables
 */

import express from 'express';
import { Op } from 'sequelize';
import { verifyAdminToken, requirePermission, logActivity } from '../middleware/adminAuth.js';
import { Agenda, AgendaDates, sequelize } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/admin/agenda
 * @desc    Get all agenda items with filters and pagination
 * @access  Private (Admin with read permission)
 */
router.get(
  '/',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  logActivity('view', 'agenda'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        inCalpeArea,
        fromDate,
        toDate,
        sort = '-date',
      } = req.query;

      // Build WHERE conditions
      const where = {};

      if (inCalpeArea === 'true') {
        where.is_in_calpe_area = true;
      }

      if (fromDate) {
        where.date = { ...where.date, [Op.gte]: fromDate };
      }
      if (toDate) {
        where.date = { ...where.date, [Op.lte]: toDate };
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { title_en: { [Op.like]: `%${search}%` } },
          { short_description: { [Op.like]: `%${search}%` } },
          { location_name: { [Op.like]: `%${search}%` } },
        ];
      }

      // Parse sort parameter
      let order = [['date', 'DESC']];
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
        const fieldMap = {
          date: 'date',
          title: 'title',
          created_at: 'created_at',
          calpe_distance: 'calpe_distance',
        };
        const mappedField = fieldMap[sortField] || 'date';
        order = [[mappedField, sortDir]];
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const { count, rows } = await Agenda.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset,
      });

      const agendaItems = rows.map(item => item.toJSON());

      res.json({
        success: true,
        data: {
          agendaItems,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get Agenda error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching agenda items.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/admin/agenda/stats
 * @desc    Get agenda statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get overview stats
      const total = await Agenda.count();
      const inCalpeArea = await Agenda.count({ where: { is_in_calpe_area: true } });
      const upcoming = await Agenda.count({ where: { date: { [Op.gte]: today } } });
      const past = await Agenda.count({ where: { date: { [Op.lt]: today } } });

      // Get total dates count
      const totalDates = await AgendaDates.count();
      const upcomingDates = await AgendaDates.count({
        where: { event_date: { [Op.gte]: today } },
      });

      res.json({
        success: true,
        data: {
          overview: {
            total,
            inCalpeArea,
            upcoming,
            past,
            totalDates,
            upcomingDates,
          },
        },
      });
    } catch (error) {
      console.error('Get Agenda stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching agenda statistics.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/agenda/upcoming
 * @desc    Get upcoming agenda items
 * @access  Private (Admin)
 */
router.get(
  '/upcoming',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const { limit = 10, inCalpeArea } = req.query;
      const today = new Date().toISOString().split('T')[0];

      const where = {
        date: { [Op.gte]: today },
      };

      if (inCalpeArea === 'true') {
        where.is_in_calpe_area = true;
      }

      const upcomingItems = await Agenda.findAll({
        where,
        order: [['date', 'ASC']],
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: {
          agendaItems: upcomingItems.map(item => item.toJSON()),
        },
      });
    } catch (error) {
      console.error('Get upcoming agenda error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching upcoming agenda items.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/agenda/range
 * @desc    Get agenda items within a date range
 * @access  Private (Admin)
 */
router.get(
  '/range',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const { startDate, endDate, inCalpeArea } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const where = {
        date: {
          [Op.between]: [startDate, endDate],
        },
      };

      if (inCalpeArea === 'true') {
        where.is_in_calpe_area = true;
      }

      const agendaItems = await Agenda.findAll({
        where,
        order: [['date', 'ASC']],
      });

      // Also get dates from agenda_dates table
      const agendaDates = await AgendaDates.findAll({
        where: {
          event_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['event_date', 'ASC']],
      });

      res.json({
        success: true,
        data: {
          agendaItems: agendaItems.map(item => item.toJSON()),
          dates: agendaDates,
        },
      });
    } catch (error) {
      console.error('Get agenda range error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching agenda range.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/agenda/:id
 * @desc    Get single agenda item with related dates
 * @access  Private (Admin with read permission)
 */
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const agenda = await Agenda.findByPk(req.params.id);

      if (!agenda) {
        return res.status(404).json({
          success: false,
          message: 'Agenda item not found.',
        });
      }

      // Get related dates
      const relatedDates = await AgendaDates.findAll({
        where: { provider_event_hash: agenda.provider_event_hash },
        order: [['event_date', 'ASC']],
      });

      res.json({
        success: true,
        data: {
          agendaItem: agenda.toJSON(),
          dates: relatedDates,
        },
      });
    } catch (error) {
      console.error('Get Agenda item error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching agenda item.',
      });
    }
  }
);

export default router;
