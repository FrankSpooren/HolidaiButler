/**
 * HolidAIButler - Authentication Routes
 * User registration, login, and authentication management
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

// Models
const { User, Analytics } = require('../models');

// Services
const EmailService = require('../services/EmailService');

// Utils
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 900, // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    retryAfter: 3600,
  },
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register',
  registrationLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name required (1-50 characters)'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name required (1-50 characters)'),
    body('language')
      .optional()
      .isIn(['en', 'es', 'de', 'nl', 'fr'])
      .withMessage('Supported languages: en, es, de, nl, fr'),
    body('preferences')
      .optional()
      .isObject(),
    body('privacy')
      .isObject()
      .withMessage('Privacy consent required'),
    body('privacy.allowTracking')
      .isBoolean(),
    body('privacy.allowMarketing')
      .isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      language = 'en',
      preferences = {},
      privacy 
    } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already registered',
          message: 'An account with this email already exists',
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        profile: {
          firstName,
          lastName,
          language,
        },
        preferences: {
          ...preferences,
          interests: preferences.interests || ['beaches', 'restaurants', 'cultural'],
          budget: preferences.budget || 'moderate',
          groupSize: preferences.groupSize || 2,
        },
        privacy: {
          ...privacy,
          consentDate: new Date(),
        },
        subscription: {
          type: 'free',
          startDate: new Date(),
        },
      });

      await user.save();

      // Generate JWT tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Log registration analytics
      await Analytics.create({
        type: 'user_interaction',
        userId: user._id,
        data: {
          event: 'user_registered',
          category: 'authentication',
          metadata: {
            registrationMethod: 'email',
            language,
            consentTracking: privacy.allowTracking,
            consentMarketing: privacy.allowMarketing,
          },
        },
        device: {
          platform: req.headers['user-agent'],
        },
      });

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.warn('Failed to send welcome email:', emailError);
      }

      // Return user data without password
      const userData = user.toJSON();
      delete userData.password;

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userData,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '24h',
          },
        },
      });

    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Email already registered',
        });
      }

      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create account. Please try again.',
      });
    }
  })
);

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .notEmpty()
      .withMessage('Password required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {
      // Find user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password incorrect',
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password incorrect',
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Update last active
      await User.findByIdAndUpdate(user._id, {
        'stats.lastActive': new Date(),
      });

      // Log login analytics
      await Analytics.create({
        type: 'user_interaction',
        userId: user._id,
        data: {
          event: 'user_login',
          category: 'authentication',
          metadata: {
            loginMethod: 'email',
          },
        },
        device: {
          platform: req.headers['user-agent'],
        },
      });

      // Return user data
      const userData = user.toJSON();

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '24h',
          },
        },
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Unable to log in. Please try again.',
      });
    }
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token required'),
  ],
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid refresh token',
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user._id);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          expiresIn: '24h',
        },
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please log in again',
      });
    }
  })
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
  ],
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ email });
      
      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent',
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token (you'd add these fields to user schema)
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetTokenExpiry,
      });

      // Send reset email
      await EmailService.sendPasswordResetEmail(user, resetToken);

      // Log analytics
      await Analytics.create({
        type: 'user_interaction',
        userId: user._id,
        data: {
          event: 'password_reset_requested',
          category: 'authentication',
        },
      });

      res.json({
        success: true,
        message: 'Password reset link sent to your email',
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        error: 'Unable to process password reset',
      });
    }
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must meet security requirements'),
  ],
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    try {
      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
        });
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      
      await user.save();

      // Log analytics
      await Analytics.create({
        type: 'user_interaction',
        userId: user._id,
        data: {
          event: 'password_reset_completed',
          category: 'authentication',
        },
      });

      res.json({
        success: true,
        message: 'Password reset successful',
      });

    } catch (error) {
      logger.error('Password reset completion error:', error);
      res.status(500).json({
        error: 'Unable to reset password',
      });
    }
  })
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate tokens)
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    // In a production system, you'd maintain a blacklist of tokens
    // For now, we'll just return success and let the client handle it
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Log logout analytics
        await Analytics.create({
          type: 'user_interaction',
          userId: decoded.userId,
          data: {
            event: 'user_logout',
            category: 'authentication',
          },
        });
      } catch (error) {
        // Token invalid, but that's ok for logout
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * Generate JWT access token
 */
function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = router;