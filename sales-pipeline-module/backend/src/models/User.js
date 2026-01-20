/**
 * User Model
 * Core user management with roles, permissions, and security features
 */

import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

class User extends Model {
  // Instance method to check password
  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  // Instance method to get public profile
  toPublicJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: `${this.firstName} ${this.lastName}`,
      avatar: this.avatar,
      role: this.role,
      department: this.department,
      jobTitle: this.jobTitle,
      phone: this.phone,
      timezone: this.timezone,
      language: this.language,
      status: this.status,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt
    };
  }

  // Check if user has specific permission
  hasPermission(resource, action) {
    if (this.role === 'admin' || this.role === 'super_admin') {
      return true;
    }

    const permissions = this.permissions || {};
    return permissions[resource]?.[action] === true;
  }

  // Check if user can access specific account
  canAccessAccount(accountId) {
    if (this.role === 'admin' || this.role === 'super_admin') {
      return true;
    }

    // Check if user is assigned to the account
    const assignedAccounts = this.assignedAccounts || [];
    return assignedAccounts.includes(accountId);
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  whatsappNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'whatsapp_number'
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'job_title'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM(
      'super_admin',
      'admin',
      'sales_manager',
      'sales_rep',
      'marketing',
      'support',
      'viewer'
    ),
    defaultValue: 'sales_rep',
    allowNull: false
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Granular permissions object'
  },
  assignedAccounts: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'assigned_accounts'
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'team_id'
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'manager_id'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    defaultValue: 'pending',
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Europe/Amsterdam'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'nl'
  },
  dateFormat: {
    type: DataTypes.STRING(20),
    defaultValue: 'DD-MM-YYYY',
    field: 'date_format'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verified_at'
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_factor_enabled'
  },
  twoFactorSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'two_factor_secret'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  },
  lastLoginIp: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'last_login_ip'
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_until'
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_changed_at'
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
  notificationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: {
        dealUpdates: true,
        taskReminders: true,
        mentions: true,
        weeklyReport: true
      },
      whatsapp: {
        dealUpdates: false,
        taskReminders: true,
        urgentAlerts: true
      },
      inApp: {
        all: true
      }
    },
    field: 'notification_preferences'
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Email signature'
  },
  quotaTarget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'quota_target',
    comment: 'Monthly sales quota target'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['status'] },
    { fields: ['team_id'] },
    { fields: ['manager_id'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
        user.passwordChangedAt = new Date();
      }
    }
  }
});

export default User;
