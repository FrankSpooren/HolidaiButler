/**
 * User Model
 * Database operations for Users table
 */

const db = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

class User {
  /**
   * Create new user
   * @param {Object} userData - {email, password, name}
   * @returns {Object} Created user (without password)
   */
  static async create({ email, password, name }) {
    try {
      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const uuid = uuidv4();

      // Insert user
      const [result] = await db.execute(
        `INSERT INTO Users (uuid, email, password_hash, name, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [uuid, email, password_hash, name]
      );

      logger.info(`User created: ${email} (ID: ${result.insertId})`);

      // Return user without password
      return {
        id: result.insertId,
        uuid,
        email,
        name,
        onboarding_completed: false,
        onboarding_step: 0,
        is_active: true,
        email_verified: false
      };
    } catch (error) {
      // Duplicate email
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {String} email
   * @returns {Object|null} User object
   */
  static async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT id, uuid, email, password_hash, name, onboarding_completed,
              onboarding_step, is_active, is_admin, email_verified, last_login, created_at
       FROM Users
       WHERE email = ?`,
      [email]
    );

    return rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {Number} id
   * @returns {Object|null} User object (without password)
   */
  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, uuid, email, name, onboarding_completed, onboarding_step,
              is_active, is_admin, email_verified, avatar_url, last_login, created_at
       FROM Users
       WHERE id = ? AND is_active = TRUE`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Find user by UUID
   * @param {String} uuid
   * @returns {Object|null} User object (without password)
   */
  static async findByUUID(uuid) {
    const [rows] = await db.execute(
      `SELECT id, uuid, email, name, onboarding_completed, onboarding_step,
              is_active, is_admin, email_verified, avatar_url, last_login, created_at
       FROM Users
       WHERE uuid = ? AND is_active = TRUE`,
      [uuid]
    );

    return rows[0] || null;
  }

  /**
   * Verify password
   * @param {String} plainPassword
   * @param {String} hashedPassword
   * @returns {Boolean}
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update last login timestamp
   * @param {Number} userId
   */
  static async updateLastLogin(userId) {
    await db.execute(
      'UPDATE Users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
    logger.info(`Last login updated for user ID: ${userId}`);
  }

  /**
   * Update user profile
   * @param {Number} userId
   * @param {Object} updates - {name, avatar_url}
   * @returns {Object} Updated user
   */
  static async update(userId, updates) {
    const allowedFields = ['name', 'avatar_url'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    await db.execute(
      `UPDATE Users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    logger.info(`User updated: ID ${userId}`);
    return await this.findById(userId);
  }

  /**
   * Update onboarding status
   * @param {Number} userId
   * @param {Number} step
   * @param {Boolean} completed
   */
  static async updateOnboarding(userId, step, completed = false) {
    await db.execute(
      `UPDATE Users
       SET onboarding_step = ?,
           onboarding_completed = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [step, completed, userId]
    );

    logger.info(`Onboarding updated for user ID: ${userId} (Step: ${step}, Completed: ${completed})`);
  }

  /**
   * Soft delete user (GDPR compliance)
   * @param {Number} userId
   */
  static async softDelete(userId) {
    await db.execute(
      'UPDATE Users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    logger.info(`User soft deleted: ID ${userId}`);
  }

  /**
   * Hard delete user and all related data (GDPR - Right to Erasure)
   * @param {Number} userId
   */
  static async hardDelete(userId) {
    // Foreign keys with CASCADE will auto-delete related records
    await db.execute('DELETE FROM Users WHERE id = ?', [userId]);
    logger.warn(`User hard deleted: ID ${userId}`);
  }

  /**
   * Set email verification token
   * @param {Number} userId
   * @param {String} token
   */
  static async setEmailVerificationToken(userId, token) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.execute(
      `UPDATE Users
       SET email_verification_token = ?,
           email_verification_expires = ?
       WHERE id = ?`,
      [token, expiresAt, userId]
    );
  }

  /**
   * Verify email with token
   * @param {String} token
   * @returns {Boolean}
   */
  static async verifyEmail(token) {
    const [result] = await db.execute(
      `UPDATE Users
       SET email_verified = TRUE,
           email_verification_token = NULL,
           email_verification_expires = NULL
       WHERE email_verification_token = ?
         AND email_verification_expires > NOW()`,
      [token]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get all users (admin only)
   * @param {Object} options - {limit, offset, search}
   * @returns {Array} Users list
   */
  static async getAll({ limit = 20, offset = 0, search = '' }) {
    let query = `
      SELECT id, uuid, email, name, onboarding_completed,
             is_active, is_admin, email_verified, created_at, last_login
      FROM Users
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = User;
