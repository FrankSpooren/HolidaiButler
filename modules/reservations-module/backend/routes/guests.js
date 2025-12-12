/**
 * Guest Routes
 * Guest CRM and profile management endpoints
 */

const express = require('express');
const router = express.Router();
const GuestCRMService = require('../services/GuestCRMService');
const { Guest } = require('../models');
const {
  authenticate,
  requireRestaurantStaff,
  requireRestaurantManager,
  requireRestaurantAccess,
} = require('../middleware/auth');
const {
  validate,
  createGuestSchema,
  updateGuestSchema,
  guestNoteSchema,
  paginationSchema,
} = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * GET /api/v1/guests/search
 * Search guests
 */
router.get(
  '/search',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { q, isVip, isBlacklisted, page, limit } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
      }

      const result = await GuestCRMService.searchGuests(q, {
        isVip: isVip === 'true' ? true : isVip === 'false' ? false : undefined,
        isBlacklisted: isBlacklisted === 'true' ? true : isBlacklisted === 'false' ? false : undefined,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      });

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
 * GET /api/v1/guests/vip
 * Get VIP guests
 */
router.get(
  '/vip',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const result = await GuestCRMService.getVipGuests({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });

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
 * GET /api/v1/guests/:id
 * Get guest profile
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const guest = await GuestCRMService.getGuestById(id);

    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found',
      });
    }

    // Check access: self or staff
    if (req.user.id !== id && !['staff', 'manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: guest,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/guests/:id/stats
 * Get guest statistics
 */
router.get(
  '/:id/stats',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const stats = await GuestCRMService.getGuestStats(id);

      res.json({
        success: true,
        data: stats,
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
 * GET /api/v1/guests/:id/history
 * Get guest reservation history
 */
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, restaurantId, page, limit } = req.query;

    // Check access
    if (req.user.id !== id && !['staff', 'manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await GuestCRMService.getGuestHistory(id, {
      status,
      restaurantId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/guests
 * Create guest profile
 */
router.post(
  '/',
  authenticate,
  validate(createGuestSchema),
  async (req, res, next) => {
    try {
      const guestData = req.body;

      const guest = await GuestCRMService.createOrUpdateGuest({
        email: guestData.email,
        firstName: guestData.first_name,
        lastName: guestData.last_name,
        phone: guestData.phone,
        dateOfBirth: guestData.date_of_birth,
        preferredLanguage: guestData.preferred_language,
        dietaryRestrictions: guestData.dietary_restrictions,
        seatingPreferences: guestData.seating_preferences,
      });

      res.status(201).json({
        success: true,
        data: guest,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/guests/:id
 * Update guest profile
 */
router.put(
  '/:id',
  authenticate,
  validate(updateGuestSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check access: self or manager
      if (req.user.id !== id && !['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const guest = await GuestCRMService.updateGuest(id, updates);

      res.json({
        success: true,
        data: guest,
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
 * GET /api/v1/guests/:id/notes
 * Get guest notes
 */
router.get(
  '/:id/notes',
  authenticate,
  requireRestaurantStaff,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { restaurantId, noteType } = req.query;

      const result = await GuestCRMService.getGuestNotes(id, restaurantId, {
        noteType,
        includeAlerts: true,
      });

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
 * POST /api/v1/guests/:id/notes
 * Add guest note
 */
router.post(
  '/:id/notes',
  authenticate,
  requireRestaurantStaff,
  validate(guestNoteSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { restaurantId, ...noteData } = req.body;

      const note = await GuestCRMService.addGuestNote(
        id,
        restaurantId || req.user.restaurantId,
        noteData,
        req.user.id
      );

      logger.info(`Guest note added: ${note.id} by ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: note,
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
 * POST /api/v1/guests/:id/vip
 * Toggle VIP status
 */
router.post(
  '/:id/vip',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isVip, reason } = req.body;

      const guest = await GuestCRMService.toggleVipStatus(id, isVip, reason);

      logger.info(`Guest ${id} VIP status changed to ${isVip} by ${req.user.id}`);

      res.json({
        success: true,
        data: guest,
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
 * POST /api/v1/guests/:id/blacklist
 * Blacklist guest
 */
router.post(
  '/:id/blacklist',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required for blacklisting',
        });
      }

      const guest = await GuestCRMService.blacklistGuest(id, reason, req.user.id);

      logger.warn(`Guest ${id} blacklisted by ${req.user.id}: ${reason}`);

      res.json({
        success: true,
        data: guest,
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
 * DELETE /api/v1/guests/:id/blacklist
 * Remove from blacklist
 */
router.delete(
  '/:id/blacklist',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const guest = await GuestCRMService.removeFromBlacklist(id, req.user.id);

      logger.info(`Guest ${id} removed from blacklist by ${req.user.id}`);

      res.json({
        success: true,
        data: guest,
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
 * POST /api/v1/guests/merge
 * Merge duplicate guest profiles
 */
router.post(
  '/merge',
  authenticate,
  requireRestaurantManager,
  async (req, res, next) => {
    try {
      const { primaryGuestId, secondaryGuestId } = req.body;

      if (!primaryGuestId || !secondaryGuestId) {
        return res.status(400).json({
          success: false,
          error: 'Both primaryGuestId and secondaryGuestId are required',
        });
      }

      const mergedGuest = await GuestCRMService.mergeGuestProfiles(
        primaryGuestId,
        secondaryGuestId
      );

      logger.info(`Guest profiles merged: ${secondaryGuestId} -> ${primaryGuestId} by ${req.user.id}`);

      res.json({
        success: true,
        data: mergedGuest,
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

module.exports = router;
