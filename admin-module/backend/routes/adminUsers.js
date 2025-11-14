import express from 'express';
import AdminUser from '../models/AdminUser.js';
import { verifyAdminToken, requirePermission, logActivity } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/users
 * @desc    Get all admin users (with filters and pagination)
 * @access  Private (Admin with users.view permission)
 */
router.get(
  '/',
  verifyAdminToken,
  requirePermission('users', 'view'),
  logActivity('view', 'users'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        search,
        sort = '-createdAt'
      } = req.query;

      // Build filter
      const filter = {};

      if (role) {
        filter.role = role;
      }

      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { email: new RegExp(search, 'i') },
          { 'profile.firstName': new RegExp(search, 'i') },
          { 'profile.lastName': new RegExp(search, 'i') }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [users, total] = await Promise.all([
        AdminUser.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-password')
          .populate('ownedPOIs', 'name location.city status')
          .populate('createdBy', 'profile.firstName profile.lastName')
          .lean(),
        AdminUser.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching users.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  verifyAdminToken,
  requirePermission('users', 'view'),
  async (req, res) => {
    try {
      const stats = await AdminUser.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            suspended: {
              $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get role breakdown
      const roleStats = await AdminUser.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get recent logins
      const recentLogins = await AdminUser.find({ 'security.lastLogin': { $exists: true } })
        .sort({ 'security.lastLogin': -1 })
        .limit(10)
        .select('email profile.firstName profile.lastName security.lastLogin')
        .lean();

      res.json({
        success: true,
        data: {
          overview: stats[0] || {
            total: 0,
            active: 0,
            suspended: 0,
            pending: 0
          },
          byRole: roleStats,
          recentLogins
        }
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching user statistics.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user
 * @access  Private (Admin with users.view permission)
 */
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('users', 'view'),
  async (req, res) => {
    try {
      const user = await AdminUser.findById(req.params.id)
        .select('-password')
        .populate('ownedPOIs', 'name location.city status rating.average')
        .populate('createdBy', 'profile.firstName profile.lastName');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      res.json({
        success: true,
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching user.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/users
 * @desc    Create new admin user
 * @access  Private (Admin with users.manage permission)
 */
router.post(
  '/',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('create', 'user'),
  async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        phoneNumber,
        language
      } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, first name, last name, and role are required.'
        });
      }

      // Check if user already exists
      const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists.'
        });
      }

      // Create user
      const user = await AdminUser.create({
        email: email.toLowerCase(),
        password,
        profile: {
          firstName,
          lastName,
          phoneNumber,
          language: language || 'en'
        },
        role,
        status: 'pending',
        createdBy: req.adminUser._id,
        security: {
          emailVerified: false
        }
      });

      // Remove password from response
      const userObject = user.toObject();
      delete userObject.password;

      res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: {
          user: userObject
        }
      });

    } catch (error) {
      console.error('Create user error:', error);

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
        message: 'Server error creating user.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin with users.manage permission)
 */
router.put(
  '/:id',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('update', 'user'),
  async (req, res) => {
    try {
      const { firstName, lastName, phoneNumber, language, role } = req.body;

      // Prevent users from editing themselves
      if (req.params.id === req.adminUser._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot edit your own user account via this endpoint. Use /auth/profile instead.'
        });
      }

      const updates = {};

      if (firstName) updates['profile.firstName'] = firstName;
      if (lastName) updates['profile.lastName'] = lastName;
      if (phoneNumber !== undefined) updates['profile.phoneNumber'] = phoneNumber;
      if (language) updates['profile.language'] = language;
      if (role) updates.role = role;

      const user = await AdminUser.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully.',
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status (activate, suspend, etc.)
 * @access  Private (Admin with users.manage permission)
 */
router.patch(
  '/:id/status',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('update_status', 'user'),
  async (req, res) => {
    try {
      const { status } = req.body;

      const validStatuses = ['active', 'suspended', 'pending'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Prevent users from suspending themselves
      if (req.params.id === req.adminUser._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own account status.'
        });
      }

      const user = await AdminUser.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      res.json({
        success: true,
        message: `User status updated to ${status}.`,
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user status.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/users/:id/password
 * @desc    Reset user password (admin action)
 * @access  Private (Admin with users.manage permission)
 */
router.patch(
  '/:id/password',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('reset_password', 'user'),
  async (req, res) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.'
        });
      }

      const user = await AdminUser.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'User password has been reset successfully.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error resetting password.'
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin with users.manage permission)
 */
router.delete(
  '/:id',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('delete', 'user'),
  async (req, res) => {
    try {
      // Prevent users from deleting themselves
      if (req.params.id === req.adminUser._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account.'
        });
      }

      const user = await AdminUser.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully.',
        data: {
          deletedId: req.params.id
        }
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting user.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users/:id/activity
 * @desc    Get user activity log
 * @access  Private (Admin with users.view permission)
 */
router.get(
  '/:id/activity',
  verifyAdminToken,
  requirePermission('users', 'view'),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const user = await AdminUser.findById(req.params.id)
        .select('activityLog profile.firstName profile.lastName email');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      // Get paginated activity log
      const activities = user.activityLog
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.profile.firstName} ${user.profile.lastName}`,
            email: user.email
          },
          activities,
          total: user.activityLog.length
        }
      });

    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching user activity.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/users/:id/assign-pois
 * @desc    Assign POIs to user (for POI owners)
 * @access  Private (Admin with users.manage permission)
 */
router.post(
  '/:id/assign-pois',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('assign_pois', 'user'),
  async (req, res) => {
    try {
      const { poiIds } = req.body;

      if (!Array.isArray(poiIds) || poiIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'POI IDs array is required.'
        });
      }

      const user = await AdminUser.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      if (user.role !== 'poi_owner') {
        return res.status(400).json({
          success: false,
          message: 'POIs can only be assigned to users with role "poi_owner".'
        });
      }

      // Add POIs to user's owned POIs (avoid duplicates)
      const newPOIs = poiIds.filter(id => !user.ownedPOIs.includes(id));
      user.ownedPOIs.push(...newPOIs);

      await user.save();

      res.json({
        success: true,
        message: `${newPOIs.length} POI(s) assigned to user.`,
        data: {
          ownedPOIs: user.ownedPOIs
        }
      });

    } catch (error) {
      console.error('Assign POIs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error assigning POIs.'
      });
    }
  }
);

export default router;
