/**
 * Authentication Service
 * OAuth integration, JWT management, and session handling
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User, Session, AuditLog } from '../models/index.js';
import { cacheService, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData, createdBy = null) {
    try {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const user = await User.create({
        ...userData,
        status: 'pending',
        emailVerified: false
      });

      // Log audit
      await this.logAudit('create', 'User', user.id, createdBy, {
        email: user.email,
        role: user.role
      });

      return user.toPublicJSON();
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with email/password
   */
  async login(email, password, deviceInfo = {}) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        await this.logFailedLogin(email, deviceInfo, 'User not found');
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        throw new Error('Account is locked. Try again later.');
      }

      // Check if account is active
      if (user.status !== 'active') {
        await this.logFailedLogin(email, deviceInfo, 'Account not active');
        throw new Error('Account is not active');
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        await this.handleFailedLogin(user, deviceInfo);
        throw new Error('Invalid credentials');
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        return {
          requires2FA: true,
          tempToken: this.generateTempToken(user.id)
        };
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const session = await this.createSession(user, tokens, deviceInfo);

      // Update last login
      await user.update({
        lastLoginAt: new Date(),
        lastLoginIp: deviceInfo.ipAddress,
        loginAttempts: 0
      });

      // Log audit
      await this.logAudit('login', 'User', user.id, user.id, {
        ipAddress: deviceInfo.ipAddress,
        deviceType: deviceInfo.deviceType
      });

      // Cache user profile
      await cacheService.set(cacheKeys.user(user.id), user.toPublicJSON(), 3600);

      return {
        user: user.toPublicJSON(),
        ...tokens,
        sessionId: session.id
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA and complete login
   */
  async verify2FA(tempToken, code, deviceInfo = {}) {
    try {
      const decoded = jwt.verify(tempToken, JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.twoFactorSecret) {
        throw new Error('Invalid request');
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid 2FA code');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const session = await this.createSession(user, tokens, deviceInfo);

      // Update last login
      await user.update({
        lastLoginAt: new Date(),
        lastLoginIp: deviceInfo.ipAddress,
        loginAttempts: 0
      });

      return {
        user: user.toPublicJSON(),
        ...tokens,
        sessionId: session.id
      };
    } catch (error) {
      logger.error('2FA verification error:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new Error('User not found');

      const secret = speakeasy.generateSecret({
        name: `HolidaiButler CRM (${user.email})`,
        issuer: 'HolidaiButler'
      });

      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret temporarily (user must verify before enabling)
      await cacheService.set(`2fa_setup:${userId}`, secret.base32, 600);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl
      };
    } catch (error) {
      logger.error('Enable 2FA error:', error);
      throw error;
    }
  }

  /**
   * Confirm 2FA setup
   */
  async confirm2FA(userId, code) {
    try {
      const secret = await cacheService.get(`2fa_setup:${userId}`);
      if (!secret) {
        throw new Error('2FA setup expired. Please try again.');
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid code');
      }

      await User.update(
        { twoFactorEnabled: true, twoFactorSecret: secret },
        { where: { id: userId } }
      );

      await cacheService.del(`2fa_setup:${userId}`);

      return { enabled: true };
    } catch (error) {
      logger.error('Confirm 2FA error:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId, password) {
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new Error('User not found');

      const isValid = await user.validatePassword(password);
      if (!isValid) throw new Error('Invalid password');

      await user.update({
        twoFactorEnabled: false,
        twoFactorSecret: null
      });

      await this.logAudit('update', 'User', userId, userId, {
        action: '2FA disabled'
      });

      return { disabled: true };
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      const session = await Session.findOne({
        where: {
          userId: decoded.userId,
          refreshToken,
          isActive: true
        }
      });

      if (!session || session.isExpired()) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      // Update session
      await session.update({
        accessToken,
        lastActivityAt: new Date()
      });

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId, sessionId) {
    try {
      await Session.update(
        {
          isActive: false,
          revokedAt: new Date()
        },
        {
          where: { id: sessionId, userId }
        }
      );

      // Clear cache
      await cacheService.del(cacheKeys.user(userId));

      await this.logAudit('logout', 'User', userId, userId);

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    try {
      await Session.update(
        {
          isActive: false,
          revokedAt: new Date(),
          revokeReason: 'User logged out from all devices'
        },
        {
          where: { userId, isActive: true }
        }
      );

      await cacheService.del(cacheKeys.user(userId));

      await this.logAudit('logout', 'User', userId, userId, {
        allDevices: true
      });

      return { success: true };
    } catch (error) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if email exists
        return { success: true };
      }

      const token = this.generateResetToken();
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await user.update({
        passwordResetToken: token,
        passwordResetExpires: expires
      });

      // TODO: Send email with reset link
      logger.info(`Password reset token generated for ${email}`);

      return { success: true };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        where: {
          passwordResetToken: token
        }
      });

      if (!user || new Date() > new Date(user.passwordResetExpires)) {
        throw new Error('Invalid or expired reset token');
      }

      await user.update({
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: new Date()
      });

      // Invalidate all sessions
      await Session.update(
        {
          isActive: false,
          revokedAt: new Date(),
          revokeReason: 'Password reset'
        },
        {
          where: { userId: user.id, isActive: true }
        }
      );

      await this.logAudit('password_reset', 'User', user.id, user.id);

      return { success: true };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new Error('User not found');

      const isValid = await user.validatePassword(currentPassword);
      if (!isValid) throw new Error('Current password is incorrect');

      await user.update({
        password: newPassword,
        passwordChangedAt: new Date()
      });

      await this.logAudit('password_change', 'User', userId, userId);

      return { success: true };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Get active sessions for user
   */
  async getSessions(userId) {
    try {
      const sessions = await Session.findAll({
        where: { userId, isActive: true },
        order: [['lastActivityAt', 'DESC']]
      });

      return sessions.map(s => s.toPublicJSON());
    } catch (error) {
      logger.error('Get sessions error:', error);
      throw error;
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId, sessionId) {
    try {
      const session = await Session.findOne({
        where: { id: sessionId, userId }
      });

      if (!session) throw new Error('Session not found');

      await session.update({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: userId,
        revokeReason: 'Manually revoked'
      });

      return { success: true };
    } catch (error) {
      logger.error('Revoke session error:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
  }

  generateTempToken(userId) {
    return jwt.sign(
      { userId, temp: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
  }

  generateResetToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  async generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(JWT_EXPIRES_IN)
    };
  }

  parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // default 24h

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400;
    }
  }

  async createSession(user, tokens, deviceInfo) {
    const expiresAt = new Date(Date.now() + this.parseExpiresIn(JWT_EXPIRES_IN) * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.parseExpiresIn(JWT_REFRESH_EXPIRES_IN) * 1000);

    return Session.create({
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      refreshExpiresAt,
      deviceType: deviceInfo.deviceType || 'web',
      deviceName: deviceInfo.deviceName,
      deviceId: deviceInfo.deviceId,
      userAgent: deviceInfo.userAgent,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      ipAddress: deviceInfo.ipAddress,
      geoLocation: deviceInfo.geoLocation,
      rememberMe: deviceInfo.rememberMe || false
    });
  }

  async handleFailedLogin(user, deviceInfo) {
    const loginAttempts = (user.loginAttempts || 0) + 1;
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

    const updates = { loginAttempts };

    if (loginAttempts >= maxAttempts) {
      const lockMinutes = parseInt(process.env.LOCK_DURATION_MINUTES) || 30;
      updates.lockedUntil = new Date(Date.now() + lockMinutes * 60000);
    }

    await user.update(updates);
    await this.logFailedLogin(user.email, deviceInfo, 'Invalid password');
  }

  async logFailedLogin(email, deviceInfo, reason) {
    await AuditLog.create({
      action: 'login_failed',
      entityType: 'User',
      userEmail: email,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      status: 'failure',
      errorMessage: reason,
      geoLocation: deviceInfo.geoLocation,
      riskLevel: 'medium'
    });
  }

  async logAudit(action, entityType, entityId, userId, details = {}) {
    try {
      await AuditLog.create({
        action,
        entityType,
        entityId,
        userId,
        status: 'success',
        metadata: details
      });
    } catch (error) {
      logger.error('Audit log error:', error);
    }
  }
}

export default new AuthService();
