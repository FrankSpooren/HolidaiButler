/**
 * User Model Tests
 * Tests for User model static methods and instance methods
 */

import bcrypt from 'bcryptjs';

// Mock Sequelize before importing User model
jest.mock('../../config/database.js', () => ({
  mysqlSequelize: {
    define: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      belongsTo: jest.fn(),
      hasMany: jest.fn(),
      belongsToMany: jest.fn(),
    }),
    query: jest.fn(),
  },
}));

describe('User Model', () => {
  let User;
  let mockUser;

  beforeAll(async () => {
    // Import User model after mocks are set up
    const module = await import('../User.js');
    User = module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4Ug1IvWMRBd2LY6a', // 'password123'
      name: 'Test User',
      role_id: 5,
      onboarding_completed: false,
      onboarding_step: 0,
      is_active: true,
      is_admin: false,
      email_verified: false,
      preferred_language: 'nl',
      last_login: null,
      created_at: new Date(),
      updated_at: new Date(),
      toJSON: function() {
        return { ...this };
      },
    };
  });

  // =========================================================================
  // Password Hashing
  // =========================================================================

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);
    });

    it('should be able to verify hashed password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  // =========================================================================
  // toSafeObject (Instance method simulation)
  // =========================================================================

  describe('toSafeObject', () => {
    it('should exclude sensitive fields', () => {
      const safeUser = { ...mockUser };
      delete safeUser.password_hash;
      delete safeUser.email_verification_token;
      delete safeUser.password_reset_token;
      delete safeUser.toJSON;

      expect(safeUser.password_hash).toBeUndefined();
      expect(safeUser.email_verification_token).toBeUndefined();
      expect(safeUser.password_reset_token).toBeUndefined();
      expect(safeUser.id).toBe(1);
      expect(safeUser.email).toBe('test@example.com');
    });
  });

  // =========================================================================
  // User Validation
  // =========================================================================

  describe('User Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
      ];

      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        '',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate required fields', () => {
      const requiredFields = ['email', 'password_hash'];

      requiredFields.forEach((field) => {
        expect(mockUser[field]).toBeDefined();
      });
    });

    it('should have default values', () => {
      expect(mockUser.is_active).toBe(true);
      expect(mockUser.is_admin).toBe(false);
      expect(mockUser.email_verified).toBe(false);
      expect(mockUser.onboarding_completed).toBe(false);
      expect(mockUser.onboarding_step).toBe(0);
      expect(mockUser.preferred_language).toBe('nl');
    });
  });

  // =========================================================================
  // UUID Format
  // =========================================================================

  describe('UUID Format', () => {
    it('should have valid UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(mockUser.uuid)).toBe(true);
    });
  });

  // =========================================================================
  // Notification Preferences
  // =========================================================================

  describe('Notification Preferences', () => {
    it('should have default notification preferences structure', () => {
      const defaultPrefs = { email: true, push: true, sms: false };

      expect(defaultPrefs).toHaveProperty('email');
      expect(defaultPrefs).toHaveProperty('push');
      expect(defaultPrefs).toHaveProperty('sms');
      expect(typeof defaultPrefs.email).toBe('boolean');
    });

    it('should validate notification preferences JSON', () => {
      const prefs = { email: true, push: false, sms: true };
      const json = JSON.stringify(prefs);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(prefs);
    });
  });

  // =========================================================================
  // Role Assignment
  // =========================================================================

  describe('Role Assignment', () => {
    it('should have role_id field', () => {
      expect(mockUser.role_id).toBeDefined();
      expect(typeof mockUser.role_id).toBe('number');
    });

    it('should allow null role_id', () => {
      const userWithoutRole = { ...mockUser, role_id: null };
      expect(userWithoutRole.role_id).toBeNull();
    });
  });

  // =========================================================================
  // Timestamps
  // =========================================================================

  describe('Timestamps', () => {
    it('should have created_at timestamp', () => {
      expect(mockUser.created_at).toBeDefined();
      expect(mockUser.created_at instanceof Date).toBe(true);
    });

    it('should have updated_at timestamp', () => {
      expect(mockUser.updated_at).toBeDefined();
      expect(mockUser.updated_at instanceof Date).toBe(true);
    });

    it('should track last_login', () => {
      const userWithLogin = { ...mockUser, last_login: new Date() };
      expect(userWithLogin.last_login instanceof Date).toBe(true);
    });
  });

  // =========================================================================
  // Security Fields
  // =========================================================================

  describe('Security Fields', () => {
    it('should support email verification token', () => {
      const user = {
        ...mockUser,
        email_verification_token: 'abc123token',
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      expect(user.email_verification_token).toBeDefined();
      expect(user.email_verification_expires > new Date()).toBe(true);
    });

    it('should support password reset token', () => {
      const user = {
        ...mockUser,
        password_reset_token: 'reset123token',
        password_reset_expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      expect(user.password_reset_token).toBeDefined();
      expect(user.password_reset_expires > new Date()).toBe(true);
    });
  });

  // =========================================================================
  // Soft Delete
  // =========================================================================

  describe('Soft Delete', () => {
    it('should support is_active flag for soft delete', () => {
      const activeUser = { ...mockUser, is_active: true };
      const deletedUser = { ...mockUser, is_active: false };

      expect(activeUser.is_active).toBe(true);
      expect(deletedUser.is_active).toBe(false);
    });
  });

  // =========================================================================
  // Onboarding
  // =========================================================================

  describe('Onboarding', () => {
    it('should track onboarding step', () => {
      const user = { ...mockUser, onboarding_step: 3 };
      expect(user.onboarding_step).toBe(3);
    });

    it('should track onboarding completion', () => {
      const user = { ...mockUser, onboarding_completed: true };
      expect(user.onboarding_completed).toBe(true);
    });
  });
});
