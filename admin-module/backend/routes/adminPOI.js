import express from 'express';
import mongoose from 'mongoose';
import { verifyAdminToken, requirePermission, requirePOIAccess, logActivity } from '../middleware/adminAuth.js';

const router = express.Router();

// Import POI model from existing codebase (adjust path as needed)
// For now, we'll create a reference - you'll need to import the actual model
const POI = mongoose.model('POI'); // Assumes POI model is already registered

/**
 * @route   GET /api/admin/pois
 * @desc    Get all POIs (with filters and pagination)
 * @access  Private (Admin with read permission)
 */
router.get(
  '/',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  logActivity('view', 'pois'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        city,
        country,
        search,
        sort = '-createdAt',
        needsReview
      } = req.query;

      // Build filter
      const filter = {};

      // If user is POI owner, only show their POIs
      if (req.adminUser.role === 'poi_owner') {
        filter._id = { $in: req.adminUser.ownedPOIs };
      }

      if (status) {
        filter.status = status;
      }

      if (category) {
        filter.category = category;
      }

      if (city) {
        filter['location.city'] = new RegExp(city, 'i');
      }

      if (country) {
        filter['location.country'] = country;
      }

      if (needsReview === 'true') {
        filter['quality.needsReview'] = true;
      }

      if (search) {
        filter.$or = [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { 'location.city': new RegExp(search, 'i') }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [pois, total] = await Promise.all([
        POI.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-__v')
          .lean(),
        POI.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          pois,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get POIs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POIs.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/stats
 * @desc    Get POI statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const filter = {};

      // If user is POI owner, only show stats for their POIs
      if (req.adminUser.role === 'poi_owner') {
        filter._id = { $in: req.adminUser.ownedPOIs };
      }

      const stats = await POI.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            needsReview: {
              $sum: { $cond: ['$quality.needsReview', 1, 0] }
            },
            avgRating: { $avg: '$rating.average' },
            totalViews: { $sum: '$stats.views' },
            totalBookings: { $sum: '$stats.bookings' }
          }
        }
      ]);

      // Get category breakdown
      const categoryStats = await POI.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {
            total: 0,
            active: 0,
            inactive: 0,
            pending: 0,
            needsReview: 0,
            avgRating: 0,
            totalViews: 0,
            totalBookings: 0
          },
          byCategory: categoryStats
        }
      });

    } catch (error) {
      console.error('Get POI stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI statistics.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/:id
 * @desc    Get single POI
 * @access  Private (Admin with read permission)
 */
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const poi = await POI.findById(req.params.id);

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      // Check if user can access this POI
      if (req.adminUser.role === 'poi_owner') {
        const canAccess = req.adminUser.ownedPOIs.some(
          id => id.toString() === poi._id.toString()
        );

        if (!canAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this POI.'
          });
        }
      }

      res.json({
        success: true,
        data: {
          poi
        }
      });

    } catch (error) {
      console.error('Get POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois
 * @desc    Create new POI
 * @access  Private (Admin with create permission)
 */
router.post(
  '/',
  verifyAdminToken,
  requirePermission('pois', 'create'),
  logActivity('create', 'poi'),
  async (req, res) => {
    try {
      const poiData = req.body;

      // Set data source
      poiData.dataSource = 'manual';

      // If POI owner, set status to pending
      if (req.adminUser.role === 'poi_owner') {
        poiData.status = 'pending';
        poiData.quality = {
          ...poiData.quality,
          needsReview: true
        };
      }

      // Create POI
      const poi = await POI.create(poiData);

      // If POI owner, add to their owned POIs
      if (req.adminUser.role === 'poi_owner') {
        req.adminUser.ownedPOIs.push(poi._id);
        await req.adminUser.save();
      }

      res.status(201).json({
        success: true,
        message: 'POI created successfully.',
        data: {
          poi
        }
      });

    } catch (error) {
      console.error('Create POI error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error.',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error creating POI.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/pois/:id
 * @desc    Update POI
 * @access  Private (Admin with update permission or POI owner)
 */
router.put(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'update'),
  requirePOIAccess,
  logActivity('update', 'poi'),
  async (req, res) => {
    try {
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;
      delete updates.stats; // Stats should be updated separately

      // If POI owner is updating, mark as needs review
      if (req.adminUser.role === 'poi_owner') {
        updates.quality = {
          ...updates.quality,
          needsReview: true,
          lastUpdated: new Date()
        };
      }

      const poi = await POI.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      res.json({
        success: true,
        message: 'POI updated successfully.',
        data: {
          poi
        }
      });

    } catch (error) {
      console.error('Update POI error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error.',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error updating POI.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/status
 * @desc    Update POI status
 * @access  Private (Admin or Reviewer)
 */
router.patch(
  '/:id/status',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('update_status', 'poi'),
  async (req, res) => {
    try {
      const { status } = req.body;

      const validStatuses = ['active', 'inactive', 'pending', 'closed_temporarily', 'closed_permanently'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const poi = await POI.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status,
            'quality.needsReview': false,
            'quality.lastUpdated': new Date()
          }
        },
        { new: true }
      );

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      res.json({
        success: true,
        message: `POI status updated to ${status}.`,
        data: {
          poi
        }
      });

    } catch (error) {
      console.error('Update POI status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating POI status.'
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/pois/:id
 * @desc    Delete POI
 * @access  Private (Admin with delete permission only)
 */
router.delete(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'delete'),
  logActivity('delete', 'poi'),
  async (req, res) => {
    try {
      const poi = await POI.findByIdAndDelete(req.params.id);

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      res.json({
        success: true,
        message: 'POI deleted successfully.',
        data: {
          deletedId: req.params.id
        }
      });

    } catch (error) {
      console.error('Delete POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting POI.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/verify
 * @desc    Verify POI (DMO verification)
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/verify',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('verify', 'poi'),
  async (req, res) => {
    try {
      const { verified, touristBoard, certification } = req.body;

      const poi = await POI.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            'official.dmoVerified': verified === true,
            'official.touristBoard': touristBoard || '',
            'official.certification': certification || '',
            'quality.needsReview': false
          }
        },
        { new: true }
      );

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      res.json({
        success: true,
        message: verified ? 'POI verified successfully.' : 'POI verification removed.',
        data: {
          poi
        }
      });

    } catch (error) {
      console.error('Verify POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying POI.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois/bulk
 * @desc    Bulk operations on POIs
 * @access  Private (Admin only)
 */
router.post(
  '/bulk/action',
  verifyAdminToken,
  requirePermission('pois', 'update'),
  logActivity('bulk_action', 'pois'),
  async (req, res) => {
    try {
      const { poiIds, action, value } = req.body;

      if (!poiIds || !Array.isArray(poiIds) || poiIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'POI IDs array is required.'
        });
      }

      let updateQuery = {};

      switch (action) {
        case 'activate':
          updateQuery = { status: 'active' };
          break;
        case 'deactivate':
          updateQuery = { status: 'inactive' };
          break;
        case 'delete':
          if (!req.adminUser.hasPermission('pois', 'delete')) {
            return res.status(403).json({
              success: false,
              message: 'Permission denied for bulk delete.'
            });
          }
          await POI.deleteMany({ _id: { $in: poiIds } });
          return res.json({
            success: true,
            message: `${poiIds.length} POIs deleted successfully.`,
            data: {
              count: poiIds.length
            }
          });
        case 'mark_reviewed':
          updateQuery = { 'quality.needsReview': false };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action.'
          });
      }

      const result = await POI.updateMany(
        { _id: { $in: poiIds } },
        { $set: updateQuery }
      );

      res.json({
        success: true,
        message: `Bulk action completed. ${result.modifiedCount} POIs updated.`,
        data: {
          modifiedCount: result.modifiedCount
        }
      });

    } catch (error) {
      console.error('Bulk action error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error performing bulk action.'
      });
    }
  }
);

export default router;
