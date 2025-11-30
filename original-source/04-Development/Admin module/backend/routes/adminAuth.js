import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/database.js';
import AdminUser from '../models/AdminUser.js';
import { verifyAdminToken, adminRateLimit } from '../middleware/adminAuth.js';
import emailService from '../services/EmailService.js';

const router = express.Router();

// JWT Secrets
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'your-admin-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', adminRateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user with password field
    const user = await AdminUser.findByEmail(email.toLowerCase(), true);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check if account is locked
    if (AdminUser.isLocked(user)) {
      const lockTimeRemaining = Math.ceil((new Date(user.security.lockUntil) - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Please try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact an administrator.`
      });
    }

    // Verify password
    const isMatch = await AdminUser.comparePassword(password, user.password);

    if (!isMatch) {
      // Increment login attempts
      await AdminUser.incLoginAttempts(user.id);

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Reset login attempts on successful login
    if (user.security.loginAttempts > 0 || user.security.lockUntil) {
      await AdminUser.resetLoginAttempts(user.id);
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        type: 'access'
      },
      JWT_ADMIN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Remove password from user object
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // Get user
    const user = await AdminUser.findById(decoded.userId);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        type: 'access'
      },
      JWT_ADMIN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh.'
    });
  }
});

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin user
 * @access  Private (Admin)
 */
router.get('/me', verifyAdminToken, async (req, res) => {
  try {
    const user = await AdminUser.findById(req.adminUser.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Note: populate for ownedPOIs and createdBy would need separate queries
    // Implementing basic version without populate for now
    // TODO: Add separate queries to fetch related data if needed

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user data.'
    });
  }
});

/**
 * @route   PUT /api/admin/auth/profile
 * @desc    Update admin profile
 * @access  Private (Admin)
 */
router.put('/profile', verifyAdminToken, async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'language', 'avatar'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = field === 'firstName' ? 'first_name' :
                        field === 'lastName' ? 'last_name' :
                        field === 'phoneNumber' ? 'phone_number' :
                        field;
        updates[dbField] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update.'
      });
    }

    const user = await AdminUser.update(req.adminUser.id, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
router.post('/change-password', verifyAdminToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    // Get user with password
    const user = await AdminUser.findById(req.adminUser.id, true);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify current password
    const isMatch = await AdminUser.comparePassword(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Update password
    await AdminUser.updatePassword(user.id, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', adminRateLimit(3, 60 * 60 * 1000), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    const user = await AdminUser.findByEmail(email.toLowerCase());

    // Don't reveal if user exists
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Update user with reset token
    await AdminUser.update(user.id, {
      reset_password_token: hashedToken,
      reset_password_expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });

    // ✉️ Send password reset email
    try {
      console.log(`📧 Sending password reset email to ${user.email}`);

      await emailService.sendPasswordResetEmail({
        email: user.email,
        resetToken: resetToken, // Send unhashed token to user
        firstName: user.first_name
      });

      console.log(`✅ Password reset email sent successfully to ${user.email}`);
    } catch (emailError) {
      // Log email error but don't fail the reset request
      console.error('⚠️ Password reset email failed (non-critical):', emailError.message);
    }

    console.log('Password reset token (dev only):', resetToken); // For testing

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
      // Token removed from response for security
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await AdminUser.findByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Update password and clear reset token
    await AdminUser.updatePassword(user.id, newPassword);
    await AdminUser.update(user.id, {
      reset_password_token: null,
      reset_password_expires: null
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout (client-side token removal, could blacklist tokens here)
 * @access  Private (Admin)
 */
router.post('/logout', verifyAdminToken, async (req, res) => {
  try {
    // Could implement token blacklisting here if needed
    // For now, client will just remove the token

    res.json({
      success: true,
      message: 'Logged out successfully.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout.'
    });
  }
});

// ========================================
// USER MANAGEMENT ROUTES
// ========================================

/**
 * @route   GET /api/admin/auth/users
 * @desc    Get all admin users with filters
 * @access  Private (Admin - users.view permission)
 */
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'view')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view users.'
      });
    }

    const { role, status, search, page = 1, limit = 20 } = req.query;

    const filters = {
      role,
      status,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const users = await AdminUser.findAll(filters);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM AdminUsers WHERE 1=1';
    const countParams = [];

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (search) {
      countQuery += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
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
});

/**
 * @route   GET /api/admin/auth/users/:id
 * @desc    Get single admin user by ID
 * @access  Private (Admin - users.view permission)
 */
router.get('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'view')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view users.'
      });
    }

    const user = await AdminUser.findById(parseInt(req.params.id));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user.'
    });
  }
});

/**
 * @route   POST /api/admin/auth/users
 * @desc    Create new admin user
 * @access  Private (Admin - users.manage permission)
 */
router.post('/users', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users.'
      });
    }

    const { email, password, firstName, lastName, role, phoneNumber, language } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required.'
      });
    }

    // Check if user already exists
    const existingUser = await AdminUser.findByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.'
      });
    }

    // Create user
    const user = await AdminUser.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: role || 'editor',
      phoneNumber,
      language: language || 'en',
      createdBy: req.adminUser.id
    });

    // Log activity
    await AdminUser.logActivity(req.adminUser.id, 'create_user', 'user', user.id, req);

    // ✉️ Send welcome email to new admin user
    try {
      console.log(`📧 Sending welcome email to ${email}`);

      await emailService.sendWelcomeEmail({
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: role || 'editor',
        tempPassword: password // Send the password they set (in production, consider generating temp password)
      });

      console.log(`✅ Welcome email sent successfully to ${email}`);
    } catch (emailError) {
      // Log email error but don't fail user creation
      console.error('⚠️ Welcome email failed (non-critical):', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email sent.',
      data: { user }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user.'
    });
  }
});

/**
 * @route   PUT /api/admin/auth/users/:id
 * @desc    Update admin user
 * @access  Private (Admin - users.manage permission)
 */
router.put('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update users.'
      });
    }

    const userId = parseInt(req.params.id);

    // Prevent users from updating themselves via this endpoint
    if (userId === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        message: 'Use the /profile endpoint to update your own profile.'
      });
    }

    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'language', 'role'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Convert camelCase to snake_case
        const dbField = field === 'firstName' ? 'first_name' :
                        field === 'lastName' ? 'last_name' :
                        field === 'phoneNumber' ? 'phone_number' :
                        field;
        updates[dbField] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update.'
      });
    }

    const user = await AdminUser.update(userId, updates);

    // Log activity
    await AdminUser.logActivity(req.adminUser.id, 'update_user', 'user', userId, req);

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user.'
    });
  }
});

/**
 * @route   PUT /api/admin/auth/users/:id/status
 * @desc    Update admin user status (activate/suspend)
 * @access  Private (Admin - users.manage permission)
 */
router.put('/users/:id/status', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update user status.'
      });
    }

    const userId = parseInt(req.params.id);
    const { status } = req.body;

    // Prevent users from suspending themselves
    if (userId === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status.'
      });
    }

    // Validate status
    const validStatuses = ['active', 'suspended', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, suspended, or inactive.'
      });
    }

    const user = await AdminUser.update(userId, { status });

    // Log activity
    await AdminUser.logActivity(req.adminUser.id, 'update_user_status', 'user', userId, req);

    res.json({
      success: true,
      message: `User status updated to ${status}.`,
      data: { user }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status.'
    });
  }
});

/**
 * @route   DELETE /api/admin/auth/users/:id
 * @desc    Delete admin user
 * @access  Private (Admin - users.manage permission)
 */
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    // Check permission
    if (!AdminUser.hasPermission(req.adminUser, 'users', 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete users.'
      });
    }

    const userId = parseInt(req.params.id);

    // Prevent users from deleting themselves
    if (userId === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    // Check if user exists
    const user = await AdminUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Delete user
    await AdminUser.delete(userId);

    // Log activity
    await AdminUser.logActivity(req.adminUser.id, 'delete_user', 'user', userId, req);

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
});

export default router;
