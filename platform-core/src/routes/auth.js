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
import twoFactorAuth from '../services/twoFactorAuth.js';

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

    // Check if 2FA is enabled
    if (user.totpEnabled) {
      // Generate temporary pending token for 2FA flow
      const tokenUserId = user.uuid || user.id;
      const pendingToken = jwt.sign(
        { userId: tokenUserId, type: '2fa_pending' },
        JWT_SECRET,
        { expiresIn: '5m' } // Short expiry for security
      );

      logger.info(`2FA required for user: ${email}`);

      return res.json({
        success: true,
        message: '2FA verificatie vereist',
        requires2FA: true,
        data: {
          requires2FA: true,
          pendingToken,
          message: 'Voer je 2FA code in om door te gaan'
        }
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

// ==========================================
// TWO-FACTOR AUTHENTICATION ENDPOINTS
// ==========================================

/**
 * @route   GET /api/auth/2fa/status
 * @desc    Get 2FA status for current user
 * @access  Private
 */
router.get('/2fa/status', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { uuid: req.user.userId },
      attributes: ['id', 'totpEnabled', 'totpVerifiedAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    res.json({
      success: true,
      data: {
        enabled: Boolean(user.totpEnabled),
        enabledAt: user.totpVerifiedAt
      }
    });
  } catch (error) {
    logger.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij ophalen 2FA status'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Generate 2FA secret and QR code URI
 * @access  Private
 */
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { uuid: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    // Check if 2FA is already enabled
    if (user.totpEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is al ingeschakeld. Schakel eerst uit om opnieuw in te stellen.'
      });
    }

    // Generate new secret
    const secret = twoFactorAuth.generateSecret();
    const otpauthUri = twoFactorAuth.generateOtpauthUri(secret, user.email);

    // Store secret temporarily (not enabled yet until verified)
    await user.update({ totpSecret: secret });

    logger.info(`2FA setup initiated for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        secret,
        otpauthUri,
        message: 'Scan de QR-code met je authenticator app en voer de code in om te bevestigen'
      }
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij instellen 2FA'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify TOTP code and enable 2FA
 * @access  Private
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Ongeldige verificatiecode. Voer een 6-cijferige code in.'
      });
    }

    const user = await User.findOne({
      where: { uuid: req.user.userId },
      attributes: ['id', 'email', 'totpSecret', 'totpEnabled']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    if (!user.totpSecret) {
      return res.status(400).json({
        success: false,
        message: 'Start eerst de 2FA setup voordat je kunt verifiëren'
      });
    }

    // Verify the TOTP code
    const isValid = twoFactorAuth.verifyTOTP(user.totpSecret, code);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige verificatiecode. Probeer opnieuw.'
      });
    }

    // Generate backup codes
    const { codes: backupCodes, hashedCodes } = twoFactorAuth.generateBackupCodes();

    // Enable 2FA
    await user.update({
      totpEnabled: true,
      totpVerifiedAt: new Date(),
      backupCodes: JSON.stringify(hashedCodes)
    });

    logger.info(`2FA enabled for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        enabled: true,
        backupCodes,
        message: '2FA is succesvol ingeschakeld. Bewaar je backup codes veilig!'
      }
    });
  } catch (error) {
    logger.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij verifiëren 2FA'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable 2FA (requires current password or TOTP code)
 * @access  Private
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { code, password } = req.body;

    const user = await User.scope('withPassword').findOne({
      where: { uuid: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Gebruiker niet gevonden'
      });
    }

    if (!user.totpEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is niet ingeschakeld'
      });
    }

    // Verify either TOTP code or password
    let verified = false;

    if (code) {
      verified = twoFactorAuth.verifyTOTP(user.totpSecret, code);
    } else if (password) {
      verified = await user.comparePassword(password);
    }

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige verificatie. Voer een geldige code of wachtwoord in.'
      });
    }

    // Disable 2FA
    await user.update({
      totpEnabled: false,
      totpSecret: null,
      totpVerifiedAt: null,
      backupCodes: null
    });

    logger.info(`2FA disabled for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        enabled: false,
        message: '2FA is uitgeschakeld'
      }
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij uitschakelen 2FA'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/validate
 * @desc    Validate TOTP code during login (called after password verification)
 * @access  Public (but requires pending 2FA session token)
 */
router.post('/2fa/validate', async (req, res) => {
  try {
    const { code, pendingToken } = req.body;

    if (!code || !pendingToken) {
      return res.status(400).json({
        success: false,
        message: 'Code en pendingToken zijn verplicht'
      });
    }

    // Verify pending token
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, JWT_SECRET);
      if (decoded.type !== '2fa_pending') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige of verlopen sessie. Log opnieuw in.'
      });
    }

    // Get user
    const user = await User.findOne({
      where: { uuid: decoded.userId },
      attributes: ['id', 'uuid', 'email', 'name', 'totpSecret', 'totpEnabled', 'backupCodes', 'onboardingCompleted']
    });

    if (!user || !user.totpEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Ongeldige 2FA configuratie'
      });
    }

    // Try TOTP verification first
    let isValid = twoFactorAuth.verifyTOTP(user.totpSecret, code);

    // If TOTP fails, try backup code
    if (!isValid && user.backupCodes) {
      const hashedCodes = JSON.parse(user.backupCodes);
      const backupIndex = twoFactorAuth.verifyBackupCode(code, hashedCodes);

      if (backupIndex !== -1) {
        isValid = true;
        // Remove used backup code
        hashedCodes.splice(backupIndex, 1);
        await user.update({ backupCodes: JSON.stringify(hashedCodes) });
        logger.info(`Backup code used for user: ${user.email}`);
      }
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Ongeldige verificatiecode'
      });
    }

    // Generate full access tokens
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

    // Update last login
    await user.update({ lastLogin: new Date() });

    const userData = user.toSafeJSON ? user.toSafeJSON() : {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      totpEnabled: true
    };

    logger.info(`2FA login completed for user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA verificatie succesvol',
      data: {
        user: userData,
        accessToken,
        refreshToken
      },
      // Legacy fields
      user: userData,
      token: accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });
  } catch (error) {
    logger.error('2FA validate error:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij 2FA verificatie'
    });
  }
});

export default router;
