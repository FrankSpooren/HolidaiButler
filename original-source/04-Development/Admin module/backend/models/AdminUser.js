// AdminUser Model - MySQL Version
// Converted from MongoDB/Mongoose to MySQL2

import bcrypt from 'bcryptjs';
import db from '../config/database.js';

class AdminUser {
  // Create new admin user
  static async create(userData) {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'editor',
      avatar = null,
      phoneNumber = null,
      language = 'en',
      createdBy = null
    } = userData;

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set default permissions based on role
    const permissions = this.getDefaultPermissions(role);

    // Set default preferences
    const preferences = {
      emailNotifications: true,
      dashboardLayout: 'default'
    };

    const [result] = await db.execute(
      `INSERT INTO AdminUsers (
        email, password, first_name, last_name, role, avatar, phone_number, language,
        permissions_pois, permissions_platform, permissions_users, permissions_media,
        preferences, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        firstName,
        lastName,
        role,
        avatar,
        phoneNumber,
        language,
        JSON.stringify(permissions.pois),
        JSON.stringify(permissions.platform),
        JSON.stringify(permissions.users),
        JSON.stringify(permissions.media),
        JSON.stringify(preferences),
        createdBy
      ]
    );

    return this.findById(result.insertId);
  }

  // Find user by ID
  static async findById(id, includePassword = false) {
    const fields = includePassword
      ? '*'
      : 'id, email, first_name, last_name, avatar, phone_number, language, role, status, ' +
        'permissions_pois, permissions_platform, permissions_users, permissions_media, ' +
        'email_verified, login_attempts, lock_until, last_login, two_factor_enabled, ' +
        'preferences, created_by, created_at, updated_at';

    const [rows] = await db.execute(
      `SELECT ${fields} FROM AdminUsers WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Find user by email
  static async findByEmail(email, includePassword = false) {
    const fields = includePassword
      ? '*'
      : 'id, email, first_name, last_name, avatar, phone_number, language, role, status, ' +
        'permissions_pois, permissions_platform, permissions_users, permissions_media, ' +
        'email_verified, login_attempts, lock_until, last_login, two_factor_enabled, ' +
        'preferences, created_by, created_at, updated_at';

    const [rows] = await db.execute(
      `SELECT ${fields} FROM AdminUsers WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Find user by reset token
  static async findByResetToken(hashedToken) {
    const [rows] = await db.execute(
      `SELECT * FROM AdminUsers
       WHERE reset_password_token = ?
       AND reset_password_expires > NOW()`,
      [hashedToken]
    );

    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Get all users with filters
  static async findAll(filters = {}) {
    let query = `SELECT id, email, first_name, last_name, avatar, phone_number, language, role, status,
                 email_verified, last_login, created_at, updated_at
                 FROM AdminUsers WHERE 1=1`;
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const [rows] = await db.execute(query, params);
    return rows.map(row => this.formatUser(row));
  }

  // Update user
  static async update(id, updates) {
    const allowedUpdates = [
      'first_name', 'last_name', 'avatar', 'phone_number', 'language',
      'role', 'status', 'email_verified', 'preferences',
      'reset_password_token', 'reset_password_expires'
    ];

    const updateFields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // If role is being updated, update permissions too
    if (updates.role) {
      const permissions = this.getDefaultPermissions(updates.role);
      updateFields.push('permissions_pois = ?', 'permissions_platform = ?',
                       'permissions_users = ?', 'permissions_media = ?');
      params.push(
        JSON.stringify(permissions.pois),
        JSON.stringify(permissions.platform),
        JSON.stringify(permissions.users),
        JSON.stringify(permissions.media)
      );
    }

    params.push(id);

    await db.execute(
      `UPDATE AdminUsers SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  // Update password
  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.execute(
      'UPDATE AdminUsers SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );

    return true;
  }

  // Compare password
  static async comparePassword(candidatePassword, hashedPassword) {
    try {
      return await bcrypt.compare(candidatePassword, hashedPassword);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  // Increment login attempts
  static async incLoginAttempts(id) {
    const user = await this.findById(id);
    if (!user) return false;

    // If lock has expired, reset attempts
    if (user.lock_until && new Date(user.lock_until) < new Date()) {
      await db.execute(
        'UPDATE AdminUsers SET login_attempts = 1, lock_until = NULL WHERE id = ?',
        [id]
      );
      return true;
    }

    // Increment attempts
    const newAttempts = user.login_attempts + 1;
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours

    if (newAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockTime);
      await db.execute(
        'UPDATE AdminUsers SET login_attempts = ?, lock_until = ? WHERE id = ?',
        [newAttempts, lockUntil, id]
      );
    } else {
      await db.execute(
        'UPDATE AdminUsers SET login_attempts = ? WHERE id = ?',
        [newAttempts, id]
      );
    }

    return true;
  }

  // Reset login attempts
  static async resetLoginAttempts(id) {
    await db.execute(
      'UPDATE AdminUsers SET login_attempts = 0, lock_until = NULL, last_login = NOW() WHERE id = ?',
      [id]
    );
    return true;
  }

  // Check if account is locked
  static isLocked(user) {
    return !!(user.lock_until && new Date(user.lock_until) > new Date());
  }

  // Log activity
  static async logActivity(userId, action, resource, resourceId, req) {
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    await db.execute(
      `INSERT INTO AdminUser_ActivityLog (admin_user_id, action, resource, resource_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, resource, resourceId, ipAddress, userAgent]
    );

    // Keep only last 100 activities per user
    await db.execute(
      `DELETE FROM AdminUser_ActivityLog
       WHERE admin_user_id = ? AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM AdminUser_ActivityLog
           WHERE admin_user_id = ?
           ORDER BY timestamp DESC
           LIMIT 100
         ) AS temp
       )`,
      [userId, userId]
    );

    return true;
  }

  // Get activity log
  static async getActivityLog(userId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT * FROM AdminUser_ActivityLog
       WHERE admin_user_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  }

  // Check if user has permission
  static hasPermission(user, resource, action) {
    if (user.role === 'platform_admin') return true;

    const parts = resource.split('.');
    let perm = user.permissions;

    for (const part of parts) {
      perm = perm?.[part];
      if (perm === undefined) return false;
    }

    if (typeof perm === 'object' && action) {
      return perm[action] === true;
    }

    return perm === true;
  }

  // Check if user can manage specific POI
  static async canManagePOI(userId, poiId, userRole) {
    if (userRole === 'platform_admin' || userRole === 'editor') return true;

    if (userRole === 'poi_owner') {
      const [rows] = await db.execute(
        'SELECT id FROM AdminUser_OwnedPOIs WHERE admin_user_id = ? AND poi_id = ?',
        [userId, poiId]
      );
      return rows.length > 0;
    }

    return false;
  }

  // Add owned POI
  static async addOwnedPOI(userId, poiId) {
    await db.execute(
      'INSERT IGNORE INTO AdminUser_OwnedPOIs (admin_user_id, poi_id) VALUES (?, ?)',
      [userId, poiId]
    );
    return true;
  }

  // Get owned POIs
  static async getOwnedPOIs(userId) {
    const [rows] = await db.execute(
      'SELECT poi_id FROM AdminUser_OwnedPOIs WHERE admin_user_id = ?',
      [userId]
    );
    return rows.map(row => row.poi_id);
  }

  // Delete user
  static async delete(id) {
    await db.execute('DELETE FROM AdminUsers WHERE id = ?', [id]);
    return true;
  }

  // Helper: Get default permissions based on role
  static getDefaultPermissions(role) {
    const permissionsMap = {
      platform_admin: {
        pois: { create: true, read: true, update: true, delete: true, approve: true },
        platform: { branding: true, content: true, settings: true },
        users: { view: true, manage: true },
        media: { upload: true, delete: true }
      },
      poi_owner: {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false }
      },
      editor: {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: true, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false }
      },
      reviewer: {
        pois: { create: false, read: true, update: false, delete: false, approve: true },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: false, delete: false }
      }
    };

    return permissionsMap[role] || permissionsMap.editor;
  }

  // Helper: Format user object
  static formatUser(row) {
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      password: row.password, // Only if includePassword was true
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
        phoneNumber: row.phone_number,
        language: row.language
      },
      role: row.role,
      status: row.status,
      permissions: {
        pois: row.permissions_pois ? JSON.parse(row.permissions_pois) : null,
        platform: row.permissions_platform ? JSON.parse(row.permissions_platform) : null,
        users: row.permissions_users ? JSON.parse(row.permissions_users) : null,
        media: row.permissions_media ? JSON.parse(row.permissions_media) : null
      },
      security: {
        emailVerified: row.email_verified,
        loginAttempts: row.login_attempts,
        lockUntil: row.lock_until,
        lastLogin: row.last_login,
        twoFactorEnabled: row.two_factor_enabled
      },
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default AdminUser;
