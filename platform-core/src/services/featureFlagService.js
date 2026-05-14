/**
 * Feature Flag Service — Dedicated flag system with polymorphic scope + audit
 *
 * Provides type-safe feature flag resolution with scope hierarchy:
 *   specific scope (brand/destination/user/role) → global → fallback
 *
 * Backed by feature_flags + feature_flag_audit tables (migration 006).
 *
 * Architecture decisions:
 *   - In-memory cache (5min TTL) — avoids DB hit per AI call
 *   - Scope convention: scope_id=0 = global/unscoped (NULL not allowed)
 *   - Audit log written on every set/delete (compliance trail)
 *   - Value type-safe: boolean/integer/string/json with proper extraction
 *
 * Future migration path: if multi-instance deployment needs distributed cache,
 * swap Map → Redis without API change.
 *
 * @module featureFlagService
 * @version 1.0.0
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SUPPORTED_SCOPES = ['global', 'brand', 'destination', 'user', 'role'];
const SUPPORTED_VALUE_TYPES = ['boolean', 'integer', 'string', 'json'];

class FeatureFlagService {
  constructor() {
    this.cache = new Map();
    this.cacheStats = { hits: 0, misses: 0 };
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Check if a flag is enabled. Boolean flags only.
   *
   * @param {string} flagKey
   * @param {Object} [opts]
   * @param {string} [opts.scopeType='global']
   * @param {number} [opts.scopeId=0]
   * @param {boolean} [opts.fallback=false]
   * @returns {Promise<boolean>}
   */
  async isEnabled(flagKey, opts = {}) {
    const value = await this.getValue(flagKey, { ...opts, fallback: opts.fallback ?? false });
    return value === true;
  }

  /**
   * Get typed value with scope-hierarchy resolution:
   *   1. Try specific scope (e.g. destination=10)
   *   2. Fall back to global (scope_id=0)
   *   3. Use provided fallback if no flag found
   *
   * @param {string} flagKey
   * @param {Object} [opts]
   * @param {string} [opts.scopeType='global']
   * @param {number} [opts.scopeId=0]
   * @param {*} [opts.fallback=null]
   * @returns {Promise<*>}
   */
  async getValue(flagKey, opts = {}) {
    const { scopeType = 'global', scopeId = 0, fallback = null } = opts;

    if (!flagKey || typeof flagKey !== 'string') {
      logger.warn('[FeatureFlag] Invalid flagKey:', flagKey);
      return fallback;
    }

    if (!SUPPORTED_SCOPES.includes(scopeType)) {
      logger.warn(`[FeatureFlag] Invalid scopeType: ${scopeType}`);
      return fallback;
    }

    // 1. Try specific scope (skip if already global)
    if (scopeType !== 'global') {
      const specific = await this._lookup(flagKey, scopeType, Number(scopeId) || 0);
      if (specific !== null) return specific;
    }

    // 2. Fall back to global
    const global = await this._lookup(flagKey, 'global', 0);
    if (global !== null) return global;

    // 3. Provided fallback
    return fallback;
  }

  /**
   * Set or update a flag value. Writes audit log.
   *
   * @param {string} flagKey
   * @param {Object} opts
   * @param {string} opts.scopeType
   * @param {number} opts.scopeId
   * @param {string} opts.valueType - 'boolean'|'integer'|'string'|'json'
   * @param {*} opts.value
   * @param {boolean} [opts.enabled=true]
   * @param {string} [opts.description]
   * @param {Date|null} [opts.expiresAt]
   * @param {number|null} [opts.userId]
   * @param {string|null} [opts.ipAddress]
   * @param {string|null} [opts.userAgent]
   * @returns {Promise<{id: number, action: string}>}
   */
  async setValue(flagKey, opts) {
    const {
      scopeType,
      scopeId = 0,
      valueType,
      value,
      enabled = true,
      description = null,
      expiresAt = null,
      userId = null,
      ipAddress = null,
      userAgent = null,
    } = opts;

    if (!flagKey || !SUPPORTED_SCOPES.includes(scopeType) || !SUPPORTED_VALUE_TYPES.includes(valueType)) {
      throw new Error(`Invalid feature flag parameters: ${flagKey}/${scopeType}/${valueType}`);
    }

    // Determine value column
    const valueCols = {
      value_boolean: null,
      value_integer: null,
      value_string: null,
      value_json: null,
    };
    if (valueType === 'boolean') valueCols.value_boolean = value ? 1 : 0;
    else if (valueType === 'integer') valueCols.value_integer = Number(value);
    else if (valueType === 'string') valueCols.value_string = String(value);
    else if (valueType === 'json') valueCols.value_json = JSON.stringify(value);

    // Fetch existing for audit
    const [[existing]] = await mysqlSequelize.query(
      'SELECT * FROM feature_flags WHERE flag_key = :flagKey AND scope_type = :scopeType AND scope_id = :scopeId LIMIT 1',
      { replacements: { flagKey, scopeType, scopeId: Number(scopeId) || 0 } }
    );

    const action = existing ? 'update' : 'create';
    const oldValue = existing ? this._serializeForAudit(existing) : null;

    // Upsert
    await mysqlSequelize.query(
      `INSERT INTO feature_flags
        (flag_key, scope_type, scope_id, value_type, value_boolean, value_integer, value_string, value_json,
         enabled, expires_at, description, created_by_user_id)
       VALUES
        (:flagKey, :scopeType, :scopeId, :valueType, :valueBoolean, :valueInteger, :valueString, :valueJson,
         :enabled, :expiresAt, :description, :userId)
       ON DUPLICATE KEY UPDATE
        value_type = VALUES(value_type),
        value_boolean = VALUES(value_boolean),
        value_integer = VALUES(value_integer),
        value_string = VALUES(value_string),
        value_json = VALUES(value_json),
        enabled = VALUES(enabled),
        expires_at = VALUES(expires_at),
        description = COALESCE(VALUES(description), description)`,
      {
        replacements: {
          flagKey,
          scopeType,
          scopeId: Number(scopeId) || 0,
          valueType,
          valueBoolean: valueCols.value_boolean,
          valueInteger: valueCols.value_integer,
          valueString: valueCols.value_string,
          valueJson: valueCols.value_json,
          enabled: enabled ? 1 : 0,
          expiresAt: expiresAt,
          description,
          userId,
        },
      }
    );

    // Fetch the resulting flag for audit + cache invalidation
    const [[updated]] = await mysqlSequelize.query(
      'SELECT * FROM feature_flags WHERE flag_key = :flagKey AND scope_type = :scopeType AND scope_id = :scopeId LIMIT 1',
      { replacements: { flagKey, scopeType, scopeId: Number(scopeId) || 0 } }
    );

    // Write audit log
    await this._writeAudit({
      featureFlagId: updated.id,
      flagKey,
      scopeType,
      scopeId: Number(scopeId) || 0,
      action,
      oldValue,
      newValue: this._serializeForAudit(updated),
      userId,
      ipAddress,
      userAgent,
    });

    // Invalidate cache
    this._invalidate(flagKey, scopeType, Number(scopeId) || 0);

    return { id: updated.id, action };
  }

  /**
   * List all flags (admin overview).
   * @param {Object} [filter]
   * @returns {Promise<Array>}
   */
  async listFlags(filter = {}) {
    const { scopeType = null, flagKeyPrefix = null } = filter;
    const wheres = [];
    const replacements = {};
    if (scopeType) {
      wheres.push('scope_type = :scopeType');
      replacements.scopeType = scopeType;
    }
    if (flagKeyPrefix) {
      wheres.push('flag_key LIKE :prefix');
      replacements.prefix = `${flagKeyPrefix}%`;
    }
    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
    const [rows] = await mysqlSequelize.query(
      `SELECT * FROM feature_flags ${whereClause} ORDER BY flag_key, scope_type, scope_id`,
      { replacements }
    );
    return rows.map(r => ({
      ...r,
      resolvedValue: this._extractValue(r),
    }));
  }

  /**
   * Bulk-clear cache (e.g. after seed updates).
   */
  clearCache() {
    this.cache.clear();
    logger.info('[FeatureFlag] Cache cleared');
  }

  /**
   * Get cache statistics for monitoring.
   */
  getCacheStats() {
    return { ...this.cacheStats, size: this.cache.size };
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  async _lookup(flagKey, scopeType, scopeId) {
    const cacheKey = `${flagKey}|${scopeType}|${scopeId}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.cacheStats.hits++;
      return cached.value;
    }

    this.cacheStats.misses++;

    try {
      const [rows] = await mysqlSequelize.query(
        `SELECT value_type, value_boolean, value_integer, value_string, value_json
         FROM feature_flags
         WHERE flag_key = :flagKey
           AND scope_type = :scopeType
           AND scope_id = :scopeId
           AND enabled = 1
           AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        { replacements: { flagKey, scopeType, scopeId } }
      );

      const value = rows.length ? this._extractValue(rows[0]) : null;
      this.cache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS });
      return value;
    } catch (err) {
      logger.warn(`[FeatureFlag] Lookup error for ${flagKey}/${scopeType}/${scopeId}:`, err.message);
      return null;
    }
  }

  _extractValue(flag) {
    if (!flag || !flag.value_type) return null;
    switch (flag.value_type) {
      case 'boolean':
        return Boolean(flag.value_boolean);
      case 'integer':
        return flag.value_integer !== null ? Number(flag.value_integer) : null;
      case 'string':
        return flag.value_string;
      case 'json':
        if (flag.value_json === null) return null;
        try {
          return typeof flag.value_json === 'string'
            ? JSON.parse(flag.value_json)
            : flag.value_json;
        } catch (e) {
          logger.warn('[FeatureFlag] JSON parse error:', e.message);
          return null;
        }
      default:
        return null;
    }
  }

  _serializeForAudit(flag) {
    return {
      flag_key: flag.flag_key,
      scope_type: flag.scope_type,
      scope_id: flag.scope_id,
      value_type: flag.value_type,
      value: this._extractValue(flag),
      enabled: Boolean(flag.enabled),
      expires_at: flag.expires_at,
    };
  }

  _invalidate(flagKey, scopeType, scopeId) {
    const cacheKey = `${flagKey}|${scopeType}|${scopeId}`;
    this.cache.delete(cacheKey);
    // Also invalidate global if specific was changed (resolution chain)
    if (scopeType !== 'global') {
      this.cache.delete(`${flagKey}|global|0`);
    }
  }

  async _writeAudit(entry) {
    try {
      await mysqlSequelize.query(
        `INSERT INTO feature_flag_audit
          (feature_flag_id, flag_key, scope_type, scope_id, action, old_value, new_value,
           changed_by_user_id, ip_address, user_agent)
         VALUES
          (:featureFlagId, :flagKey, :scopeType, :scopeId, :action, :oldValue, :newValue,
           :userId, :ipAddress, :userAgent)`,
        {
          replacements: {
            featureFlagId: entry.featureFlagId,
            flagKey: entry.flagKey,
            scopeType: entry.scopeType,
            scopeId: entry.scopeId,
            action: entry.action,
            oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
            newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
            userId: entry.userId,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
          },
        }
      );
    } catch (err) {
      // Audit failure should NOT block flag operations
      logger.error('[FeatureFlag] Audit write failed:', err.message);
    }
  }
}

// Singleton export
const featureFlagService = new FeatureFlagService();
export default featureFlagService;
export { FeatureFlagService };
