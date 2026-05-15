/**
 * Workflow Config Service — Blok 3.2 Fase B
 *
 * Loadt per-tenant TRANSITIONS uit `workflow_configurations` table met 5-min
 * cache. Fallback naar hardcoded DEFAULT_TRANSITIONS als tenant geen workflow
 * config heeft (BUTE 1-step, WarreWijzer 2-step beta).
 *
 * Pattern: cache-aside met TTL. Invalidation via clearCache() bij admin updates.
 *
 * @module workflowConfigService
 * @version 1.0.0
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import { DEFAULT_TRANSITIONS } from './contentWorkflowMachine.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

class WorkflowConfigService {
  constructor() {
    /** @type {Map<string, {value: any, expiresAt: number}>} */
    this.cache = new Map();
  }

  _cacheKey(destinationId, workflowType = 'content_approval') {
    return `${workflowType}:${destinationId}`;
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  _setCached(key, value) {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  /**
   * Loadt TRANSITIONS-dict voor een destination. Cached 5 min. Falls back naar
   * DEFAULT_TRANSITIONS als geen DB-config gevonden of niet-enabled.
   *
   * @param {number} destinationId
   * @param {string} [workflowType='content_approval']
   * @returns {Promise<Object>} TRANSITIONS-dict
   */
  async getTransitions(destinationId, workflowType = 'content_approval') {
    if (!destinationId) return DEFAULT_TRANSITIONS;
    const key = this._cacheKey(destinationId, workflowType);
    const cached = this._getCached(key);
    if (cached) return cached;

    try {
      const [rows] = await mysqlSequelize.query(
        `SELECT transitions FROM workflow_configurations
         WHERE destination_id = :destId AND workflow_type = :wfType AND enabled = 1
         ORDER BY is_default DESC, id DESC LIMIT 1`,
        { replacements: { destId: Number(destinationId), wfType: workflowType } }
      );
      if (!rows || rows.length === 0) {
        this._setCached(key, DEFAULT_TRANSITIONS);
        return DEFAULT_TRANSITIONS;
      }
      let transitions;
      try {
        const raw = rows[0].transitions;
        transitions = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (parseErr) {
        logger.warn(`[WorkflowConfig] JSON parse failed for dest=${destinationId}: ${parseErr.message}. Fallback to DEFAULT.`);
        this._setCached(key, DEFAULT_TRANSITIONS);
        return DEFAULT_TRANSITIONS;
      }
      if (!transitions || typeof transitions !== 'object' || Object.keys(transitions).length === 0) {
        this._setCached(key, DEFAULT_TRANSITIONS);
        return DEFAULT_TRANSITIONS;
      }
      this._setCached(key, transitions);
      return transitions;
    } catch (err) {
      logger.warn(`[WorkflowConfig] DB lookup failed for dest=${destinationId} (defaulting): ${err.message}`);
      return DEFAULT_TRANSITIONS;
    }
  }

  /**
   * Synchroon: alleen geldig als getTransitions reeds gewarm is voor deze key.
   * Returns null als niet in cache. Gebruik voor hot-path waar await ongewenst is.
   */
  getTransitionsCached(destinationId, workflowType = 'content_approval') {
    return this._getCached(this._cacheKey(destinationId, workflowType));
  }

  /**
   * Invalideer cache voor een destination (of helemaal als geen arg).
   */
  clearCache(destinationId = null, workflowType = 'content_approval') {
    if (destinationId === null) {
      this.cache.clear();
      return;
    }
    this.cache.delete(this._cacheKey(destinationId, workflowType));
  }

  /**
   * Update transitions in DB voor een tenant + invalidate cache.
   *
   * @param {Object} params
   * @param {number} params.destinationId
   * @param {Object} params.transitions
   * @param {string} [params.workflowType='content_approval']
   * @param {string} [params.userId]
   * @param {string} [params.description]
   */
  async setTransitions({ destinationId, transitions, workflowType = 'content_approval', userId = null, description = null }) {
    if (!destinationId || !transitions || typeof transitions !== 'object') {
      throw new Error('destinationId + transitions object required');
    }
    const transitionsJson = JSON.stringify(transitions);
    // UPSERT: vind bestaande default-row of insert nieuwe
    const [existing] = await mysqlSequelize.query(
      `SELECT id FROM workflow_configurations
       WHERE destination_id = :destId AND workflow_type = :wfType AND is_default = 1 LIMIT 1`,
      { replacements: { destId: Number(destinationId), wfType: workflowType } }
    );
    if (existing && existing.length > 0) {
      await mysqlSequelize.query(
        `UPDATE workflow_configurations
         SET transitions = :transitions, description = COALESCE(:desc, description),
             enabled = 1, updated_at = NOW()
         WHERE id = :id`,
        { replacements: { transitions: transitionsJson, desc: description, id: existing[0].id } }
      );
    } else {
      await mysqlSequelize.query(
        `INSERT INTO workflow_configurations
           (destination_id, workflow_type, transitions, approval_steps, enabled, is_default, description, created_by_user_id)
         VALUES (:destId, :wfType, :transitions, '[]', 1, 1, :desc, :userId)`,
        { replacements: { destId: Number(destinationId), wfType: workflowType, transitions: transitionsJson, desc: description, userId } }
      );
    }
    this.clearCache(destinationId, workflowType);
    return { destinationId, workflowType, transitionsCount: Object.keys(transitions).length };
  }

  getCacheStats() {
    const keys = Array.from(this.cache.keys());
    return { entries: keys.length, keys };
  }
}

const workflowConfigService = new WorkflowConfigService();
export default workflowConfigService;
