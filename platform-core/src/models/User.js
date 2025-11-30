/**
 * User Model (MySQL)
 * Customer/user accounts for the platform
 * Aligned with ORIGINAL backend User model
 */

import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { mysqlSequelize } from '../config/database.js';

const SALT_ROUNDS = 12;

const User = mysqlSequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
  },

  // Authentication
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  // Profile
  name: {
    type: DataTypes.STRING(200),
  },
  avatar_url: {
    type: DataTypes.STRING(500),
  },
  phone: {
    type: DataTypes.STRING(50),
  },

  // RBAC
  role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'roles',
      key: 'id',
    },
  },

  // Onboarding
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  onboarding_step: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Deprecated: use roles instead',
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Email Verification
  email_verification_token: {
    type: DataTypes.STRING(255),
  },
  email_verification_expires: {
    type: DataTypes.DATE,
  },

  // Password Reset
  password_reset_token: {
    type: DataTypes.STRING(255),
  },
  password_reset_expires: {
    type: DataTypes.DATE,
  },

  // Preferences
  preferred_language: {
    type: DataTypes.STRING(5),
    defaultValue: 'nl',
  },
  notification_preferences: {
    type: DataTypes.JSON,
    defaultValue: { email: true, push: true, sms: false },
  },

  // Timestamps
  last_login: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['uuid'], unique: true },
    { fields: ['role_id'] },
    { fields: ['is_active'] },
    { fields: ['created_at'] },
  ],
});

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Verify password
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>}
 */
User.prototype.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

/**
 * Get safe user object (without password)
 * @returns {Object}
 */
User.prototype.toSafeObject = function() {
  const { password_hash, email_verification_token, password_reset_token, ...safe } = this.toJSON();
  return safe;
};

// ============================================================================
// Static Methods
// ============================================================================

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {Promise<string>}
 */
User.hashPassword = async function(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Create new user
 * @param {Object} userData - { email, password, name }
 * @returns {Promise<User>}
 */
User.createUser = async function({ email, password, name }) {
  const password_hash = await this.hashPassword(password);

  const user = await this.create({
    email,
    password_hash,
    name,
  });

  return user.toSafeObject();
};

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
User.findByEmail = async function(email) {
  return this.findOne({
    where: { email },
  });
};

/**
 * Find active user by ID
 * @param {number} id
 * @returns {Promise<User|null>}
 */
User.findActiveById = async function(id) {
  return this.findOne({
    where: {
      id,
      is_active: true,
    },
  });
};

/**
 * Find user by UUID
 * @param {string} uuid
 * @returns {Promise<User|null>}
 */
User.findByUUID = async function(uuid) {
  return this.findOne({
    where: {
      uuid,
      is_active: true,
    },
  });
};

/**
 * Update last login
 * @param {number} userId
 */
User.updateLastLogin = async function(userId) {
  await this.update(
    { last_login: new Date() },
    { where: { id: userId } }
  );
};

/**
 * Update onboarding status
 * @param {number} userId
 * @param {number} step
 * @param {boolean} completed
 */
User.updateOnboarding = async function(userId, step, completed = false) {
  await this.update(
    {
      onboarding_step: step,
      onboarding_completed: completed,
    },
    { where: { id: userId } }
  );
};

/**
 * Soft delete user (GDPR compliance)
 * @param {number} userId
 */
User.softDelete = async function(userId) {
  await this.update(
    { is_active: false },
    { where: { id: userId } }
  );
};

// ============================================================================
// Hooks
// ============================================================================

// Hash password before creating user if provided as plain text
User.beforeCreate(async (user) => {
  if (user.password && !user.password_hash) {
    user.password_hash = await User.hashPassword(user.password);
    delete user.password;
  }
});

// Hash password before updating if changed
User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password_hash = await User.hashPassword(user.password);
    delete user.password;
  }
});

export default User;
