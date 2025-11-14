import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AdminUser from '../models/AdminUser.js';
import { verifyAdminToken, adminRateLimit } from '../middleware/adminAuth.js';

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
    const user = await AdminUser.findOne({ email: email.toLowerCase() })
      .select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.security.lockUntil - Date.now()) / 1000 / 60);
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
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Reset login attempts on successful login
    if (user.security.loginAttempts > 0 || user.security.lockUntil) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.security.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        type: 'access'
      },
      JWT_ADMIN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Remove password from user object
    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userObject,
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
        userId: user._id,
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
    const user = await AdminUser.findById(req.adminUser._id)
      .populate('ownedPOIs', 'name location.city status')
      .populate('createdBy', 'profile.firstName profile.lastName');

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
        updates[`profile.${field}`] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update.'
      });
    }

    const user = await AdminUser.findByIdAndUpdate(
      req.adminUser._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

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
    const user = await AdminUser.findById(req.adminUser._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

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

    const user = await AdminUser.findOne({ email: email.toLowerCase() });

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

    user.security.resetPasswordToken = hashedToken;
    user.security.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.ADMIN_URL}/reset-password/${resetToken}`;
    // await sendEmail({ to: user.email, subject: 'Password Reset', resetUrl });

    console.log('Password reset token:', resetToken); // For testing

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // Remove in production:
      resetToken
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
    const user = await AdminUser.findOne({
      'security.resetPasswordToken': hashedToken,
      'security.resetPasswordExpires': { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Update password
    user.password = newPassword;
    user.security.resetPasswordToken = undefined;
    user.security.resetPasswordExpires = undefined;
    await user.save();

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

export default router;
