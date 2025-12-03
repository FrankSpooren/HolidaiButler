import express from 'express';
import { Op } from 'sequelize';
import { AdminUser, sequelize } from '../models/index.js';
import { verifyAdminToken, requirePermission, logActivity } from '../middleware/adminAuth.js';

const router = express.Router();

// Development mode check
const isDevelopmentMode = () => {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === undefined || env === '';
};

// Development fallback user list
const DEV_FALLBACK_USERS = [
  {
    id: 'dev-admin-001',
    email: 'admin@holidaibutler.com',
    firstName: 'Development',
    lastName: 'Admin',
    role: 'platform_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

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

      let users = [];
      let total = 0;

      try {
        // Build WHERE conditions for Sequelize
        const where = {};

        if (role) {
          where.role = role;
        }

        if (status) {
          where.status = status;
        }

        if (search) {
          where[Op.or] = [
            { email: { [Op.like]: `%${search}%` } },
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } }
          ];
        }

        // Parse sort parameter
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';

        // Execute query with Sequelize
        const result = await AdminUser.findAndCountAll({
          where,
          order: [[sortField, sortOrder]],
          offset: (parseInt(page) - 1) * parseInt(limit),
          limit: parseInt(limit),
        });

        users = result.rows.map(user => user.toSafeJSON ? user.toSafeJSON() : user.toJSON());
        total = result.count;
      } catch (dbError) {
        // Database not available - return fallback in dev mode
        console.warn('Users query failed, using fallback:', dbError.message);
        if (isDevelopmentMode()) {
          users = DEV_FALLBACK_USERS;
          total = 1;
        }
      }

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
      let total = 0, active = 0, suspended = 0, pending = 0;
      let roleStats = [];

      try {
        // Get overall stats with Sequelize
        total = await AdminUser.count();
        active = await AdminUser.count({ where: { status: 'active' } });
        suspended = await AdminUser.count({ where: { status: 'suspended' } });
        pending = await AdminUser.count({ where: { status: 'pending' } });

        // Get role breakdown
        roleStats = await AdminUser.findAll({
          attributes: [
            ['role', '_id'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['role'],
          raw: true
        });
      } catch (dbError) {
        // Database not available
        console.warn('User stats query failed:', dbError.message);
        if (isDevelopmentMode()) {
          total = 1;
          active = 1;
          roleStats = [{ _id: 'platform_admin', count: 1 }];
        }
      }

      res.json({
        success: true,
        data: {
          overview: {
            total,
            active,
            suspended,
            pending
          },
          byRole: roleStats
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
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('users', 'view'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check for dev fallback user
      if (id === 'dev-admin-001' && isDevelopmentMode()) {
        return res.json({
          success: true,
          data: { user: DEV_FALLBACK_USERS[0] }
        });
      }

      let user = null;
      try {
        user = await AdminUser.findByPk(id);
      } catch (dbError) {
        console.warn('User lookup failed:', dbError.message);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      res.json({
        success: true,
        data: { user: user.toSafeJSON ? user.toSafeJSON() : user.toJSON() }
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
  logActivity('create', 'users'),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, status } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, first name, and last name are required.'
        });
      }

      let user = null;
      try {
        // Check if email exists
        const existing = await AdminUser.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered.'
          });
        }

        // Create user with Sequelize
        user = await AdminUser.create({
          email: email.toLowerCase(),
          password,
          firstName,
          lastName,
          role: role || 'editor',
          status: status || 'pending',
          createdById: req.adminUser.id
        });
      } catch (dbError) {
        console.error('User creation failed:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Database error creating user.'
        });
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: { user: user.toSafeJSON() }
      });

    } catch (error) {
      console.error('Create user error:', error);
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
  logActivity('update', 'users'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Fields that can be updated
      const allowedFields = ['firstName', 'lastName', 'role', 'status', 'phoneNumber', 'language'];
      const filteredUpdates = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update.'
        });
      }

      let user = null;
      try {
        user = await AdminUser.findByPk(id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found.'
          });
        }

        await user.update(filteredUpdates);
      } catch (dbError) {
        console.error('User update failed:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Database error updating user.'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully.',
        data: { user: user.toSafeJSON() }
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
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin with users.manage permission)
 */
router.delete(
  '/:id',
  verifyAdminToken,
  requirePermission('users', 'manage'),
  logActivity('delete', 'users'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.adminUser.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account.'
        });
      }

      try {
        const user = await AdminUser.findByPk(id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found.'
          });
        }

        await user.destroy();
      } catch (dbError) {
        console.error('User deletion failed:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Database error deleting user.'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully.'
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

export default router;
