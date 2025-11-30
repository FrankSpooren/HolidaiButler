/**
 * Authentication Controller
 * =========================
 * Handles user signup, login, logout, token refresh
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const mailerlite = require('../services/mailerlite');

/**
 * Generate JWT tokens
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      uuid: user.uuid,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      uuid: user.uuid,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /auth/signup
 * Create new user account
 */
exports.signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email and password are required'
        }
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM Users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists'
        }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate UUID
    const uuid = uuidv4();

    // Generate email verification token (crypto-secure random)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with email_verified = false
    const result = await query(
      `INSERT INTO Users (
         uuid, email, password_hash, name,
         email_verified, verification_token, verification_token_expires,
         verification_sent_count, verification_sent_at,
         created_at
       ) VALUES (?, ?, ?, ?, false, ?, ?, 1, NOW(), NOW())`,
      [uuid, email, passwordHash, name || null, verificationToken, tokenExpiry]
    );

    const userId = result.insertId;

    // Create user preferences with defaults
    await query(
      `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
       VALUES (?, ?, NOW())`,
      [userId, 'nl'] // Default to Dutch
    );

    // Generate tokens
    const user = { id: userId, uuid, email, name };
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in Sessions table
    await query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [userId, refreshToken]
    );

    // Send verification email (async - don't block signup)
    mailerlite.sendVerificationEmail(email, verificationToken, userId)
      .then(result => {
        if (result.success) {
          logger.info(`Verification email sent to ${email}`);
        } else {
          logger.error(`Failed to send verification email to ${email}: ${result.error}`);
        }
      })
      .catch(error => {
        logger.error(`Error sending verification email to ${email}:`, error);
      });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          uuid,
          email,
          name,
          email_verified: false,
          onboarding_completed: false
        },
        accessToken,
        refreshToken,
        message: 'Account created successfully. Please check your email to verify your account.'
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    next(error);
  }
};

/**
 * POST /auth/login
 * Login with email and password
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email and password are required'
        }
      });
    }

    // Find user
    const users = await query(
      `SELECT id, uuid, email, name, password_hash, onboarding_completed, email_verified
       FROM Users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before logging in. Check your inbox for the verification email.'
        }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [user.id, refreshToken]
    );

    // Update last login
    await query(
      'UPDATE Users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          onboarding_completed: Boolean(user.onboarding_completed)
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 */
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete all sessions for this user (or specific refresh token if provided)
    await query(
      'DELETE FROM Sessions WHERE user_id = ?',
      [userId]
    );

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

/**
 * POST /auth/refresh-token
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type'
        }
      });
    }

    // Check if refresh token exists and is not expired
    const sessions = await query(
      `SELECT s.*, u.email, u.name
       FROM Sessions s
       JOIN Users u ON s.user_id = u.id
       WHERE s.refresh_token = ? AND s.expires_at > NOW()`,
      [refreshToken]
    );

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }

    const session = sessions[0];

    // Generate new access token
    const user = {
      id: session.user_id,
      uuid: decoded.uuid,
      email: session.email
    };

    const accessToken = jwt.sign(
      {
        userId: user.id,
        uuid: user.uuid,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired'
        }
      });
    }

    logger.error('Refresh token error:', error);
    next(error);
  }
};

/**
 * POST /auth/verify-email
 * Verify user email with token
 *
 * Body: { token: string }
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Verification token is required'
        }
      });
    }

    // Find user with this verification token
    const users = await query(
      `SELECT id, uuid, email, name, email_verified, verification_token_expires
       FROM Users
       WHERE verification_token = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired verification token'
        }
      });
    }

    const user = users[0];

    // Check if already verified
    if (user.email_verified) {
      return res.json({
        success: true,
        data: {
          message: 'Email already verified',
          user: {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            email_verified: true
          }
        }
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(user.verification_token_expires);

    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Verification token has expired. Please request a new verification email.'
        }
      });
    }

    // Mark email as verified and clear token
    await query(
      `UPDATE Users
       SET email_verified = true,
           verified_at = NOW(),
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE id = ?`,
      [user.id]
    );

    // Log verification for GDPR audit
    await query(
      `INSERT INTO Email_Verification_Logs
       (user_id, email, action, metadata, created_at)
       VALUES (?, ?, 'email_verified', '{}', NOW())`,
      [user.id, user.email]
    );

    logger.info(`Email verified successfully for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Email verified successfully! You can now log in.',
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          email_verified: true
        }
      }
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    next(error);
  }
};

/**
 * POST /auth/resend-verification
 * Resend verification email
 *
 * Body: { email: string }
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email address is required'
        }
      });
    }

    // Find user
    const users = await query(
      `SELECT id, uuid, email, name, email_verified
       FROM Users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        data: {
          message: 'If an account exists with this email, a verification email has been sent.'
        }
      });
    }

    const user = users[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified'
        }
      });
    }

    // Check rate limiting
    const rateLimitResult = await mailerlite.checkVerificationRateLimit(user.id);

    if (!rateLimitResult.allowed) {
      const resetAt = rateLimitResult.resetAt;
      const minutesRemaining = Math.ceil((resetAt - new Date()) / 60000);

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many verification emails sent. Please try again in ${minutesRemaining} minute(s).`,
          retryAfter: resetAt
        }
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await query(
      `UPDATE Users
       SET verification_token = ?,
           verification_token_expires = ?,
           verification_sent_count = verification_sent_count + 1,
           verification_sent_at = NOW()
       WHERE id = ?`,
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    const emailResult = await mailerlite.sendVerificationEmail(email, verificationToken, user.id);

    if (!emailResult.success) {
      logger.error(`Failed to resend verification email to ${email}: ${emailResult.error}`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send verification email. Please try again later.'
        }
      });
    }

    logger.info(`Verification email resent to ${email}`);

    res.json({
      success: true,
      data: {
        message: 'Verification email sent. Please check your inbox.',
        remaining: rateLimitResult.remaining - 1
      }
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    next(error);
  }
};

/**
 * POST /auth/forgot-password
 * Request password reset email
 *
 * Body: { email: string }
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email address is required'
        }
      });
    }

    // Find user
    const users = await query(
      'SELECT id, uuid, email, name FROM Users WHERE email = ?',
      [email]
    );

    // Don't reveal if email exists (security best practice)
    if (users.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.'
        }
      });
    }

    const user = users[0];

    // Check rate limiting
    const rateLimitResult = await mailerlite.checkVerificationRateLimit(user.id);

    if (!rateLimitResult.allowed) {
      const resetAt = rateLimitResult.resetAt;
      const minutesRemaining = Math.ceil((resetAt - new Date()) / 60000);

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many reset requests. Please try again in ${minutesRemaining} minute(s).`,
          retryAfter: resetAt
        }
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (more secure than 24h)

    // Update user with reset token
    await query(
      `UPDATE Users
       SET reset_token = ?,
           reset_token_expires = ?,
           reset_sent_count = reset_sent_count + 1,
           reset_sent_at = NOW()
       WHERE id = ?`,
      [resetToken, tokenExpiry, user.id]
    );

    // Send password reset email
    const emailResult = await mailerlite.sendPasswordResetEmail(email, resetToken, user.id);

    if (!emailResult.success) {
      logger.error(`Failed to send password reset email to ${email}: ${emailResult.error}`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send password reset email. Please try again later.'
        }
      });
    }

    logger.info(`Password reset email sent to ${email}`);

    res.json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent. Check your inbox.'
      }
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

/**
 * POST /auth/reset-password
 * Reset password with token
 *
 * Body: { token: string, newPassword: string }
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Reset token and new password are required'
        }
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long'
        }
      });
    }

    // Find user with this reset token
    const users = await query(
      `SELECT id, uuid, email, name, reset_token_expires
       FROM Users
       WHERE reset_token = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        }
      });
    }

    const user = users[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(user.reset_token_expires);

    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Reset token has expired. Please request a new password reset link.'
        }
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await query(
      `UPDATE Users
       SET password_hash = ?,
           reset_token = NULL,
           reset_token_expires = NULL,
           password_reset_at = NOW()
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    // Log password reset for GDPR audit
    await query(
      `INSERT INTO Email_Verification_Logs
       (user_id, email, action, metadata, created_at)
       VALUES (?, ?, 'password_reset_completed', '{}', NOW())`,
      [user.id, user.email]
    );

    // Invalidate all existing sessions for security (force re-login)
    await query(
      'DELETE FROM Sessions WHERE user_id = ?',
      [user.id]
    );

    logger.info(`Password reset successfully for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Password reset successfully. Please log in with your new password.'
      }
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};
