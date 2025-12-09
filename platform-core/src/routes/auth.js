/**
 * Authentication Routes - Customer Portal
 * Handles user registration, login, and profile management
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-for-local-development-only-change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-jwt-secret-for-local-development-only-change-me';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Development fallback user (only for development mode without database)
const DEV_FALLBACK_USER = {
  id: 'test-user-001',
  email: 'test@holidaibutler.com',
  password: 'Test1234',
  firstName: 'Test',
  lastName: 'Gebruiker',
  status: 'active',
  subscriptionType: 'premium',
  language: 'nl',
  preferences: {
    interests: ['beaches', 'restaurants', 'cultural'],
    budget: 'moderate',
    groupSize: 2,
    notifications: true
  }
};

// Rate limiting helper
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  if (now - attempts.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  loginAttempts.set(ip, attempts);
  return true;
}

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, name: providedName } = req.body;

    // Build name from firstName/lastName or use provided name
    const name = providedName || (firstName && lastName ? `${firstName} ${lastName}` : null);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-mail en wachtwoord zijn verplicht'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Ongeldig e-mailadres'
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Wachtwoord moet minimaal 8 karakters bevatten'
      });
    }

    // Try database operation
    let user = null;
    let isDatabaseAvailable = true;

    try {
      // Check if user exists
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Er bestaat al een account met dit e-mailadres'
        });
      }

      // Create user with schema-aligned fields
      user = await User.create({
        email: email.toLowerCase(),
        passwordHash: password, // Will be hashed by beforeCreate hook
        name: name || email.split('@')[0], // Use email prefix if no name
        emailVerified: false,
        isActive: true,
        onboardingCompleted: false,
        onboardingStep: 0
      });
    } catch (dbError) {
      isDatabaseAvailable = false;
      logger.warn('Database not available for signup:', dbError.message);
      logger.error('DB Error details:', dbError);
    }

    // Development fallback
    if (!isDatabaseAvailable && process.env.NODE_ENV === 'development') {
      logger.info('Using development fallback for signup (database unavailable)');
      user = {
        id: 'new-user-' + Date.now(),
        uuid: crypto.randomUUID(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        isActive: true,
        onboardingCompleted: false
      };
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        message: 'Registratie mislukt, probeer het later opnieuw'
      });
    }

    // Generate tokens using UUID for JWT (more secure than integer ID)
    const tokenUserId = user.uuid || user.id;
    const accessToken = jwt.sign(
      { userId: tokenUserId, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: tokenUserId, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Return user data
    const userData = user.toSafeJSON ? user.toSafeJSON() : user;

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account succesvol aangemaakt',
      data: {
        user: userData,
        accessToken,
        refreshToken
      },
      // Keep legacy fields for backwards compatibility
      user: userData,
      token: accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });

  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error tijdens registratie'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress;

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.'
      });
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-mailadres en wachtwoord zijn verplicht'
      });
    }

    // Try database operation
    let user = null;
    let isDatabaseAvailable = true;

    try {
      user = await User.scope('withPassword').findOne({
        where: { email: email.toLowerCase() }
      });
    } catch (dbError) {
      isDatabaseAvailable = false;
      logger.warn('Database not available for login:', dbError.message);
    }

    // Development fallback
    if (!isDatabaseAvailable && process.env.NODE_ENV === 'development') {
      logger.info('Using development fallback login (database unavailable)');

      if (email.toLowerCase() === DEV_FALLBACK_USER.email && password === DEV_FALLBACK_USER.password) {
        const accessToken = jwt.sign(
          { userId: DEV_FALLBACK_USER.id, type: 'access' },
          JWT_SECRET,
          { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
          { userId: DEV_FALLBACK_USER.id, type: 'refresh' },
          JWT_REFRESH_SECRET,
          { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        return res.json({
          success: true,
          message: 'Inloggen gelukt (development modus)',
          user: {
            id: DEV_FALLBACK_USER.id,
            email: DEV_FALLBACK_USER.email,
            firstName: DEV_FALLBACK_USER.firstName,
            lastName: DEV_FALLBACK_USER.lastName,
            subscriptionType: DEV_FALLBACK_USER.subscriptionType,
            language: DEV_FALLBACK_USER.language,
            preferences: DEV_FALLBACK_USER.preferences
          },
          token: accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY,
          _devMode: true
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Ongeldige inloggegevens. (Development: gebruik test@holidaibutler.com / Test1234)'
        });
      }
    }

    // Database login flow
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
    }

    // Check if account is locked (uses isLocked getter)
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is tijdelijk vergrendeld. Probeer het later opnieuw.'
      });
    }

    // Check if account is active (uses isActive field from schema)
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is niet actief. Neem contact op met support.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens using UUID for JWT (more secure than integer ID)
    const tokenUserId = user.uuid || user.id;
    const accessToken = jwt.sign(
      { userId: tokenUserId, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: tokenUserId, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Return user data
    const userData = user.toSafeJSON();

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Inloggen gelukt',
      data: {
        user: userData,
        accessToken,
        refreshToken
      },
      // Keep legacy fields for backwards compatibility
      user: userData,
      token: accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error tijdens inloggen'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    let user = null;

    try {
      // JWT now contains UUID, so we need to find by UUID
      user = await User.findOne({
        where: { uuid: req.user.userId }
      });

      // Fallback: try finding by integer ID if UUID not found
      if (!user && !isNaN(parseInt(req.user.userId))) {
        user = await User.findByPk(parseInt(req.user.userId));
      }
    } catch (dbError) {
      // Development fallback
      if (process.env.NODE_ENV === 'development' && req.user.userId === DEV_FALLBACK_USER.id) {
        user = {
          id: DEV_FALLBACK_USER.id,
          email: DEV_FALLBACK_USER.email,
          firstName: DEV_FALLBACK_USER.firstName,
          lastName: DEV_FALLBACK_USER.lastName,
          subscriptionType: DEV_FALLBACK_USER.subscriptionType,
          language: DEV_FALLBACK_USER.language,
          preferences: DEV_FALLBACK_USER.preferences
        };
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    const userData = user.toSafeJSON ? user.toSafeJSON() : user;
    res.json({
      success: true,
      data: userData,
      user: userData  // Legacy field
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error bij ophalen gebruiker'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    // Map frontend fields to database fields
    const fieldMapping = {
      'firstName': null, // Combined into 'name'
      'lastName': null,  // Combined into 'name'
      'name': 'name',
      'avatarUrl': 'avatarUrl',
      'avatar': 'avatarUrl'
    };

    const updates = {};

    // Handle name update from firstName/lastName
    if (req.body.firstName || req.body.lastName) {
      const firstName = req.body.firstName || '';
      const lastName = req.body.lastName || '';
      updates.name = `${firstName} ${lastName}`.trim();
    }

    // Handle direct name update
    if (req.body.name) {
      updates.name = req.body.name;
    }

    // Handle avatar
    if (req.body.avatarUrl || req.body.avatar) {
      updates.avatarUrl = req.body.avatarUrl || req.body.avatar;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geen geldige velden om bij te werken'
      });
    }

    let user = null;

    try {
      // Find by UUID first
      user = await User.findOne({
        where: { uuid: req.user.userId }
      });

      // Fallback to ID
      if (!user && !isNaN(parseInt(req.user.userId))) {
        user = await User.findByPk(parseInt(req.user.userId));
      }

      if (user) {
        await user.update(updates);
      }
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        user = { ...DEV_FALLBACK_USER, ...updates };
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    res.json({
      success: true,
      message: 'Profiel bijgewerkt',
      user: user.toSafeJSON ? user.toSafeJSON() : user
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error bij bijwerken profiel'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is verplicht'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Ongeldig token type'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      message: 'Token vernieuwd',
      data: {
        accessToken,
        refreshToken  // Return same refresh token
      },
      // Legacy fields
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige of verlopen refresh token'
      });
    }

    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error bij token vernieuwing'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Uitgelogd'
  });
});

export default router;
