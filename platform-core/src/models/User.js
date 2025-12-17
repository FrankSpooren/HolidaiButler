/**
 * User Model - Aligned with actual database schema (Users table)
 * Database: pxoziy_db1 @ jotx.your-database.de
 * Last verified: 2025-12-09
 */

import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { mysqlSequelize as sequelize } from '../config/database.js';

class User extends Model {
  // Instance method to compare password
  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.passwordHash);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  // Check if account is locked (not in current schema, but keep for future)
  get isLocked() {
    return false; // No lock fields in current schema
  }

  // Increment login attempts (placeholder - not in current schema)
  async incLoginAttempts() {
    // No login_attempts field in current schema
    return this;
  }

  // Reset login attempts (placeholder)
  async resetLoginAttempts() {
    return this;
  }

  // Safe JSON output (exclude sensitive fields)
  toSafeJSON() {
    const values = this.toJSON();
    delete values.passwordHash;
    delete values.password_hash;
    delete values.passwordResetToken;
    delete values.password_reset_token;
    delete values.verificationToken;
    delete values.verification_token;
    delete values.resetToken;
    delete values.reset_token;
    delete values.emailVerificationToken;
    delete values.email_verification_token;
    // Exclude 2FA secrets
    delete values.totpSecret;
    delete values.totp_secret;
    delete values.backupCodes;
    delete values.backup_codes;

    // Add computed fields for frontend compatibility
    const nameParts = (values.name || '').split(' ');
    values.firstName = nameParts[0] || '';
    values.lastName = nameParts.slice(1).join(' ') || '';
    values.status = values.isActive ? 'active' : 'inactive';
    // Add 2FA status (without exposing secret)
    values.totpEnabled = values.totpEnabled || false;
    // Ensure createdAt is included (map from created_at if needed)
    values.createdAt = values.createdAt || values.created_at;
    // Include avatar URL
    values.avatarUrl = values.avatarUrl || values.avatar_url || null;

    return values;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  uuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    defaultValue: () => uuidv4()
  },

  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    set(value) {
      this.setDataValue('email', value?.toLowerCase()?.trim());
    }
  },

  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },

  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },

  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email_verification_token'
  },

  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  avatarUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'avatar_url'
  },

  onboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'onboarding_completed'
  },

  onboardingStep: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'onboarding_step'
  },

  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_reset_token'
  },

  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires'
  },

  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },

  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_admin'
  },

  // New verification fields
  verificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'verification_token'
  },

  verificationTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verification_token_expires'
  },

  verificationSentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'verification_sent_count'
  },

  verificationSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verification_sent_at'
  },

  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },

  // Password reset fields
  resetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'reset_token'
  },

  resetTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_token_expires'
  },

  resetSentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'reset_sent_count'
  },

  resetSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_sent_at'
  },

  passwordResetAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_at'
  },

  roleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'role_id'
  },

  // Two-Factor Authentication fields
  totpSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'totp_secret'
  },

  totpEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'totp_enabled'
  },

  totpVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'totp_verified_at'
  },

  backupCodes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'backup_codes'
  }

}, {
  sequelize,
  modelName: 'User',
  tableName: 'Users', // Actual table name in database (capital U)
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      // Generate UUID if not set
      if (!user.uuid) {
        user.uuid = uuidv4();
      }
      // Hash password if provided as plain text
      if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(12);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && !user.passwordHash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(12);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    }
  },
  defaultScope: {
    attributes: {
      exclude: ['passwordHash', 'password_hash', 'verificationToken', 'verification_token',
                'resetToken', 'reset_token', 'emailVerificationToken', 'email_verification_token',
                'passwordResetToken', 'password_reset_token']
    }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['passwordHash'] }
    }
  }
});

export default User;
