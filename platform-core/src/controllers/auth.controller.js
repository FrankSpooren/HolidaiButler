/**
 * Authentication Controller (ES Module)
 * Handles user signup, login, logout, token refresh
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

/**
 * Execute raw SQL query
 */
async function query(sql, params = []) {
  return mysqlSequelize.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

/**
 * Execute raw SQL for INSERT/UPDATE/DELETE
 */
async function execute(sql, params = []) {
  const [results, metadata] = await mysqlSequelize.query(sql, {
    replacements: params
  });
  return { insertId: metadata, affectedRows: metadata };
}

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
export const signup = async (req, res, next) => {
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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const [result] = await mysqlSequelize.query(
      `INSERT INTO Users (
         uuid, email, password_hash, name,
         email_verified, verification_token, verification_token_expires,
         created_at
       ) VALUES (?, ?, ?, ?, false, ?, ?, NOW())`,
      { replacements: [uuid, email, passwordHash, name || null, verificationToken, tokenExpiry] }
    );

    const userId = result;

    // Create user preferences with defaults
    await mysqlSequelize.query(
      `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
       VALUES (?, ?, NOW())`,
      { replacements: [userId, 'nl'] }
    );

    // Generate tokens
    const user = { id: userId, uuid, email, name };
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in Sessions table
    await mysqlSequelize.query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      { replacements: [userId, refreshToken] }
    );

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
export const login = async (req, res, next) => {
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

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await mysqlSequelize.query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      { replacements: [user.id, refreshToken] }
    );

    // Update last login
    await mysqlSequelize.query(
      'UPDATE Users SET last_login = NOW() WHERE id = ?',
      { replacements: [user.id] }
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
export const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Delete all sessions for this user
      await mysqlSequelize.query(
        'DELETE FROM Sessions WHERE user_id = ?',
        { replacements: [userId] }
      );

      logger.info(`User logged out: ${req.user.email}`);
    }

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
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
      [token]
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
 * GET /auth/me
 * Get current user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const users = await query(
      `SELECT id, uuid, email, name, onboarding_completed, email_verified, created_at
       FROM Users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

export default {
  signup,
  login,
  logout,
  refreshToken,
  getMe
};
