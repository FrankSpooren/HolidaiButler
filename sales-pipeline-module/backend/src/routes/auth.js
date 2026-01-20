/**
 * Authentication Routes
 * Login, registration, password management, 2FA
 */

import { Router } from 'express';
import AuthService from '../services/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import { validate, authSchemas } from '../middleware/validators.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user
 */
router.post('/register',
  validate(authSchemas.register),
  async (req, res) => {
    try {
      const user = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        data: user,
        message: 'Registration successful. Please check your email to verify your account.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user
 */
router.post('/login',
  validate(authSchemas.login),
  async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;

      const deviceInfo = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType: req.headers['x-device-type'] || 'web',
        deviceName: req.headers['x-device-name'],
        rememberMe
      };

      const result = await AuthService.login(email, password, deviceInfo);

      if (result.requires2FA) {
        return res.json({
          success: true,
          requires2FA: true,
          tempToken: result.tempToken
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/verify-2fa
 * @desc Verify 2FA code and complete login
 */
router.post('/verify-2fa',
  validate(authSchemas.verify2FA),
  async (req, res) => {
    try {
      const { tempToken, code } = req.body;

      const deviceInfo = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType: req.headers['x-device-type'] || 'web'
      };

      const result = await AuthService.verify2FA(tempToken, code, deviceInfo);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    await AuthService.logout(req.userId, sessionId);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/auth/logout-all
 * @desc Logout from all devices
 */
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await AuthService.logoutAll(req.userId);

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    await AuthService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  }
});

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 */
router.post('/reset-password',
  validate(authSchemas.resetPassword),
  async (req, res) => {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change password for authenticated user
 */
router.post('/change-password',
  authenticate,
  validate(authSchemas.changePassword),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/2fa/enable
 * @desc Start 2FA setup
 */
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const result = await AuthService.enable2FA(req.userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Enable 2FA error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/auth/2fa/confirm
 * @desc Confirm 2FA setup with code
 */
router.post('/2fa/confirm', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }

    await AuthService.confirm2FA(req.userId, code);

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    logger.error('Confirm 2FA error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/auth/2fa/disable
 * @desc Disable 2FA
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    await AuthService.disable2FA(req.userId, password);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    logger.error('Disable 2FA error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/auth/sessions
 * @desc Get active sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await AuthService.getSessions(req.userId);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/auth/sessions/:sessionId
 * @desc Revoke specific session
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    await AuthService.revokeSession(req.userId, req.params.sessionId);

    res.json({
      success: true,
      message: 'Session revoked'
    });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
