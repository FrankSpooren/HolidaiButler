/**
 * Approval State Machine — Optie C Enterprise Gateway
 *
 * Single source of truth for content_items.approval_status transitions.
 * Formal Finite State Machine (FSM) pattern — invalid transitions are blocked
 * at the gateway, preventing state corruption (Issues C+D root cause).
 *
 * Pattern: Domain-Driven Design Aggregate with Invariants.
 * References: Camunda, AWS Step Functions, xstate.
 *
 * Usage:
 *   await transitionStatus(itemId, 'scheduled', {
 *     scheduledAt: '2026-05-16 10:00:00',
 *     userId: req.adminUser.id,
 *     comment: 'Bulk scheduled via calendar',
 *   });
 *
 * @module approvalStateMachine
 * @version 1.0.0
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import realtimeService from './realtimeService.js';
import workflowConfigService from './workflowConfigService.js';
import { canTransitionXState, DEFAULT_TRANSITIONS } from './contentWorkflowMachine.js';

// ---------------------------------------------------------------------
// 1. TRANSITION MATRIX — explicit, complete, audited
// ---------------------------------------------------------------------

/**
 * Defines which `to` statuses are reachable from each `from` status.
 * Any transition NOT in this matrix is rejected by the gateway.
 *
 * State semantics:
 *   draft              — initial state, mutable
 *   pending_review     — submitted for review
 *   in_review          — actively being reviewed
 *   reviewed           — review complete, awaiting approval decision
 *   changes_requested  — reviewer requested changes
 *   rejected           — explicitly rejected (terminal until revived)
 *   approved           — ready for scheduling/publishing
 *   scheduled          — has scheduled_at set (committed to publish at time)
 *   publishing         — actively being published (lock state)
 *   published          — terminal success (until archived)
 *   failed             — publish attempted but failed (recoverable)
 *   archived           — soft archived (recoverable to deleted)
 *   deleted            — soft deleted
 */
export const TRANSITIONS = {
  'draft':              ['pending_review', 'approved', 'rejected', 'deleted'],
  'pending_review':     ['in_review', 'reviewed', 'changes_requested', 'rejected', 'approved', 'deleted'],
  'in_review':          ['reviewed', 'changes_requested', 'rejected', 'approved'],
  'reviewed':           ['approved', 'changes_requested', 'rejected'],
  'changes_requested':  ['draft', 'pending_review', 'rejected'],
  'rejected':           ['draft', 'pending_review', 'deleted'],
  'approved':           ['scheduled', 'publishing', 'rejected', 'archived', 'deleted'],
  'scheduled':          ['publishing', 'published', 'failed', 'approved', 'deleted'],  // approved = explicit unschedule
  'publishing':         ['published', 'failed'],
  'published':          ['archived'],
  'failed':             ['draft', 'approved', 'scheduled', 'rejected'],
  'archived':           ['deleted'],
  'deleted':            [],  // terminal
  // Legacy states for backward compat (some content uses these)
  'generating':         ['draft', 'rejected', 'deleted'],
  'partially_published':['published', 'failed'],
};

const VALID_STATUSES = Object.keys(TRANSITIONS);

// Status priority for derived concept-level status (higher = more advanced)
export const CONCEPT_STATUS_PRIORITY = [
  'draft', 'generating', 'pending_review', 'in_review', 'reviewed',
  'changes_requested', 'rejected', 'approved', 'failed',
  'scheduled', 'publishing', 'partially_published', 'published',
];

// ---------------------------------------------------------------------
// 2. Errors
// ---------------------------------------------------------------------

export class InvalidTransitionError extends Error {
  constructor(from, to, itemId = null) {
    super(`Invalid status transition: ${from} -> ${to}${itemId ? ` (item ${itemId})` : ''}`);
    this.name = 'InvalidTransitionError';
    this.code = 'INVALID_TRANSITION';
    this.from = from;
    this.to = to;
    this.itemId = itemId;
    this.statusCode = 409;  // HTTP conflict
  }
}

// ---------------------------------------------------------------------
// 3. Core predicates
// ---------------------------------------------------------------------

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') return false;
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * @param {string} from
 * @returns {string[]} allowed targets
 */
export function allowedTransitions(from) {
  return TRANSITIONS[from] ? [...TRANSITIONS[from]] : [];
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

// ---------------------------------------------------------------------
// 4. State mutation gateway
// ---------------------------------------------------------------------

/**
 * Transition a content_items row to a new approval_status.
 * Throws InvalidTransitionError if not allowed.
 *
 * @param {number} itemId
 * @param {string} newStatus
 * @param {Object} [options]
 * @param {string} [options.scheduledAt] - set scheduled_at when transitioning to 'scheduled'
 * @param {Date|null} [options.publishedAt] - set published_at when transitioning to 'published'
 * @param {string} [options.userId] - admin user id (for audit)
 * @param {string} [options.comment] - optional audit comment
 * @param {boolean} [options.force=false] - bypass FSM (DANGEROUS — only for admin SQL repair)
 * @returns {Promise<{itemId, fromStatus, toStatus, affected}>}
 */
export async function transitionStatus(itemId, newStatus, options = {}) {
  const {
    scheduledAt = undefined,
    publishedAt = undefined,
    userId = 'system',
    comment = null,
    force = false,
  } = options;

  if (!isValidStatus(newStatus)) {
    throw new InvalidTransitionError('unknown', newStatus, itemId);
  }

  // Lock row + read current status
  const [[item]] = await mysqlSequelize.query(
    'SELECT id, approval_status, scheduled_at FROM content_items WHERE id = :id LIMIT 1',
    { replacements: { id: Number(itemId) } }
  );
  if (!item) {
    const err = new Error(`Content item ${itemId} not found`);
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const fromStatus = item.approval_status;

  // FSM check
  if (!force && fromStatus === newStatus) {
    // No-op; allowed
    return { itemId, fromStatus, toStatus: newStatus, affected: 0, skipped: 'same-status' };
  }
  // v4.96 Blok 3.1+3.2: per-tenant FSM check via workflow_configurations.
  // Load destination_id om tenant-specifieke transitions op te halen.
  let tenantTransitions = DEFAULT_TRANSITIONS;
  try {
    const [[itemForTenantCheck]] = await mysqlSequelize.query(
      'SELECT destination_id FROM content_items WHERE id = :id LIMIT 1',
      { replacements: { id: Number(itemId) } }
    );
    if (itemForTenantCheck?.destination_id) {
      tenantTransitions = await workflowConfigService.getTransitions(itemForTenantCheck.destination_id);
    }
  } catch (cfgErr) {
    logger.debug(`[approvalStateMachine] tenant transitions lookup failed, using DEFAULT: ${cfgErr.message}`);
  }
  if (!force && !canTransitionXState(fromStatus, newStatus, tenantTransitions)) {
    throw new InvalidTransitionError(fromStatus, newStatus, itemId);
  }

  // Build UPDATE
  const updates = ['approval_status = :newStatus', 'updated_at = NOW()'];
  const repl = { newStatus, id: Number(itemId) };

  if (newStatus === 'scheduled') {
    if (scheduledAt !== undefined) {
      updates.push('scheduled_at = :scheduledAt');
      repl.scheduledAt = scheduledAt;
    }
    // Else: keep existing scheduled_at
  } else if (newStatus === 'approved' && item.scheduled_at !== null) {
    // Explicit unschedule: when going approved AFTER scheduled, clear scheduled_at
    if (fromStatus === 'scheduled') {
      updates.push('scheduled_at = NULL');
    }
  } else if (newStatus === 'published') {
    if (publishedAt !== undefined) {
      updates.push('published_at = :publishedAt');
      repl.publishedAt = publishedAt;
    } else {
      updates.push('published_at = NOW()');
    }
  } else if (newStatus === 'approved') {
    updates.push('approved_by = :userId');
    repl.userId = userId;
  } else if (newStatus === 'deleted') {
    updates.push('scheduled_at = NULL');
  }

  await mysqlSequelize.query(
    `UPDATE content_items SET ${updates.join(', ')} WHERE id = :id`,
    { replacements: repl }
  );

  // Audit log
  try {
    await mysqlSequelize.query(
      `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
       VALUES (:itemId, :fromStatus, :toStatus, :userId, :comment)`,
      { replacements: { itemId: Number(itemId), fromStatus, toStatus: newStatus, userId, comment } }
    );
  } catch (auditErr) {
    logger.warn(`[approvalStateMachine] audit log failed for item ${itemId}: ${auditErr.message}`);
  }

  // v4.95 Blok 2.B: realtime broadcast via Socket.IO (NATS-style subject naming)
  try {
    const [[itemMeta]] = await mysqlSequelize.query(
      'SELECT destination_id, concept_id FROM content_items WHERE id = :id',
      { replacements: { id: Number(itemId) } }
    );
    if (itemMeta?.destination_id) {
      const action = _statusToAction(newStatus, fromStatus);
      realtimeService.publishContentEvent({
        destinationId: itemMeta.destination_id,
        action,
        itemId: Number(itemId),
        conceptId: itemMeta.concept_id || null,
        fromStatus,
        toStatus: newStatus,
        actorId: userId,
      });
    }
  } catch (rtErr) {
    logger.debug(`[approvalStateMachine] realtime emit non-blocking error: ${rtErr.message}`);
  }

  return { itemId, fromStatus, toStatus: newStatus, affected: 1 };
}

/**
 * Map FSM target-status naar Socket.IO action-name (NATS subject suffix).
 * scheduled→scheduled (force) wordt 'updated' om reschedule te onderscheiden.
 * approved na scheduled wordt 'unscheduled'.
 */
function _statusToAction(newStatus, fromStatus) {
  if (newStatus === 'approved' && fromStatus === 'scheduled') return 'unscheduled';
  if (newStatus === 'scheduled' && fromStatus === 'scheduled') return 'updated';
  return newStatus;
}

/**
 * Bulk transition. Per-item FSM validation; partial success returned.
 * @param {number[]} itemIds
 * @param {string} newStatus
 * @param {Object} [options]
 * @returns {Promise<{success: number, skipped: number, failed: number, results: Array}>}
 */
export async function bulkTransitionStatus(itemIds, newStatus, options = {}) {
  const results = [];
  let success = 0, skipped = 0, failed = 0;

  for (const id of itemIds) {
    try {
      const r = await transitionStatus(id, newStatus, options);
      results.push({ itemId: id, ok: true, ...r });
      if (r.skipped) skipped++;
      else success++;
    } catch (err) {
      results.push({
        itemId: id,
        ok: false,
        error: err.message,
        code: err.code || 'UNKNOWN',
        from: err.from || null,
      });
      failed++;
    }
  }

  return { success, skipped, failed, results };
}

// ---------------------------------------------------------------------
// 5. Concept-level status derivation (Issue C fix)
// ---------------------------------------------------------------------

/**
 * Derive concept-level status from child items.
 * Considers BOTH approval_status AND scheduled_at — items with scheduled_at
 * set but status='approved' are treated as 'scheduled' for derivation purposes.
 *
 * Priority: published > publishing > scheduled > approved > others.
 *
 * @param {Array<{approval_status, scheduled_at}>} items
 * @returns {string} derived status
 */
export function deriveConceptStatus(items) {
  if (!Array.isArray(items) || items.length === 0) return 'draft';

  // Adjust each item's effective status: if scheduled_at set + approved, treat as 'scheduled'
  const effective = items.map(it => {
    if (it.scheduled_at && new Date(it.scheduled_at) > new Date() && it.approval_status === 'approved') {
      return 'scheduled';
    }
    return it.approval_status;
  });

  let highestIdx = 0;
  for (const status of effective) {
    const idx = CONCEPT_STATUS_PRIORITY.indexOf(status);
    if (idx > highestIdx) highestIdx = idx;
  }
  return CONCEPT_STATUS_PRIORITY[highestIdx] || 'draft';
}

/**
 * Sync concept.approval_status from items.
 * @param {number} conceptId
 */
export async function syncConceptStatus(conceptId) {
  try {
    const [items] = await mysqlSequelize.query(
      "SELECT approval_status, scheduled_at FROM content_items WHERE concept_id = :conceptId AND approval_status != 'deleted'",
      { replacements: { conceptId: Number(conceptId) } }
    );
    if (items.length === 0) return;
    const derived = deriveConceptStatus(items);
    await mysqlSequelize.query(
      'UPDATE content_concepts SET approval_status = :status, updated_at = NOW() WHERE id = :conceptId',
      { replacements: { status: derived, conceptId: Number(conceptId) } }
    );
    return derived;
  } catch (err) {
    logger.warn(`[approvalStateMachine] syncConceptStatus failed for concept ${conceptId}: ${err.message}`);
  }
}

export default {
  TRANSITIONS,
  CONCEPT_STATUS_PRIORITY,
  canTransition,
  allowedTransitions,
  isValidStatus,
  transitionStatus,
  bulkTransitionStatus,
  deriveConceptStatus,
  syncConceptStatus,
  InvalidTransitionError,
};
