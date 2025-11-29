/**
 * Table Routes
 * Table management and floor plan endpoints
 */

const express = require('express');
const router = express.Router();
const TableManagementService = require('../services/TableManagementService');
const { Table, FloorPlan, Restaurant } = require('../models');
const {
  authenticate,
  requireRestaurantStaff,
  requireRestaurantManager,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  createTableSchema,
  updateTableSchema,
} = require('../middleware/validators');
const cacheService = require('../services/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/tables/restaurant/:restaurantId
 * Get all tables for restaurant
 */
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { includeInactive } = req.query;

      // Check cache
      const cached = await cacheService.getTables(restaurantId);
      if (cached && !includeInactive) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      const where = { restaurant_id: restaurantId };
      if (!includeInactive) {
        where.is_active = true;
      }

      const tables = await Table.findAll({
        where,
        order: [
          ['location', 'ASC'],
          ['table_number', 'ASC'],
        ],
      });

      // Cache if not including inactive
      if (!includeInactive) {
        await cacheService.cacheTables(restaurantId, tables);
      }

      res.json({
        success: true,
        data: tables,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/tables/:id
 * Get table details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const table = await Table.findByPk(id, {
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    res.json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tables
 * Create new table
 */
router.post(
  '/',
  authenticate,
  requireRestaurantManager,
  validate(createTableSchema),
  async (req, res, next) => {
    try {
      const tableData = req.body;

      const table = await TableManagementService.createTable(tableData);

      // Invalidate cache
      await cacheService.invalidateTables(tableData.restaurantId);

      logger.info(`Table created: ${table.id} for restaurant ${tableData.restaurantId}`);

      res.status(201).json({
        success: true,
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/tables/:id
 * Update table
 */
router.put(
  '/:id',
  authenticate,
  requireRestaurantManager,
  validate(updateTableSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const table = await TableManagementService.updateTable(id, updates);

      // Invalidate cache
      await cacheService.invalidateTables(table.restaurant_id);

      logger.info(`Table updated: ${id}`);

      res.json({
        success: true,
        data: table,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/tables/:id
 * Delete table (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const table = await TableManagementService.deleteTable(id);

      // Invalidate cache
      await cacheService.invalidateTables(table.restaurant_id);

      logger.info(`Table deleted: ${id}`);

      res.json({
        success: true,
        message: 'Table deleted successfully',
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/tables/restaurant/:restaurantId/floor-plan
 * Get floor plan with table status
 */
router.get(
  '/restaurant/:restaurantId/floor-plan',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date, time } = req.query;

      const floorPlan = await TableManagementService.getFloorPlanWithStatus(
        restaurantId,
        date || new Date().toISOString().split('T')[0],
        time
      );

      res.json({
        success: true,
        data: floorPlan,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/tables/restaurant/:restaurantId/available
 * Find available tables for party size
 */
router.get(
  '/restaurant/:restaurantId/available',
  authenticate,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { date, time, partySize } = req.query;

      if (!date || !time || !partySize) {
        return res.status(400).json({
          success: false,
          error: 'date, time, and partySize are required',
        });
      }

      const availableTables = await TableManagementService.findAvailableTables(
        restaurantId,
        date,
        time,
        parseInt(partySize)
      );

      res.json({
        success: true,
        data: availableTables,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/tables/restaurant/:restaurantId/auto-assign
 * Auto-assign tables for a reservation
 */
router.post(
  '/restaurant/:restaurantId/auto-assign',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { reservationId } = req.body;

      if (!reservationId) {
        return res.status(400).json({
          success: false,
          error: 'reservationId is required',
        });
      }

      const result = await TableManagementService.autoAssignTables(reservationId);

      logger.info(`Tables auto-assigned for reservation: ${reservationId}`);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/tables/:id/combine
 * Set table combination rules
 */
router.post(
  '/:id/combine',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { combinableWith } = req.body;

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          error: 'Table not found',
        });
      }

      await table.update({ combinable_with: combinableWith });

      // Invalidate cache
      await cacheService.invalidateTables(table.restaurant_id);

      res.json({
        success: true,
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========== FLOOR PLAN ROUTES ==========

/**
 * GET /api/v1/tables/floor-plans/:restaurantId
 * Get all floor plans for restaurant
 */
router.get(
  '/floor-plans/:restaurantId',
  authenticate,
  requireRestaurantAccess,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;

      const floorPlans = await FloorPlan.findAll({
        where: { restaurant_id: restaurantId },
        order: [['floor', 'ASC']],
      });

      res.json({
        success: true,
        data: floorPlans,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/tables/floor-plans
 * Create floor plan
 */
router.post(
  '/floor-plans',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { restaurantId, name, floor, layoutImage, dimensions } = req.body;

      const floorPlan = await FloorPlan.create({
        restaurant_id: restaurantId,
        name,
        floor: floor || 0,
        layout_image: layoutImage,
        dimensions,
        is_active: true,
      });

      logger.info(`Floor plan created: ${floorPlan.id}`);

      res.status(201).json({
        success: true,
        data: floorPlan,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/tables/floor-plans/:id
 * Update floor plan
 */
router.put(
  '/floor-plans/:id',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const floorPlan = await FloorPlan.findByPk(id);

      if (!floorPlan) {
        return res.status(404).json({
          success: false,
          error: 'Floor plan not found',
        });
      }

      await floorPlan.update(updates);

      res.json({
        success: true,
        data: floorPlan,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/tables/floor-plans/:id
 * Delete floor plan
 */
router.delete(
  '/floor-plans/:id',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const floorPlan = await FloorPlan.findByPk(id);

      if (!floorPlan) {
        return res.status(404).json({
          success: false,
          error: 'Floor plan not found',
        });
      }

      await floorPlan.update({ is_active: false });

      res.json({
        success: true,
        message: 'Floor plan deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
