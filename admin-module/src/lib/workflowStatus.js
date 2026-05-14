/**
 * WorkflowStatus — Single source of truth voor content_items workflow status.
 *
 * Mapping: 13 DB-enum statussen → 5 UI-workflow statussen (Frank's eis).
 *
 * 4 primary workflow stages + 1 terminal-reject + technical states:
 *   1. Concept       (DB: draft, pending_review, in_review, reviewed, changes_requested, generating)
 *   2. Goedgekeurd   (DB: approved)
 *   3. Ingepland     (DB: scheduled, publishing)
 *   4. Gepubliceerd  (DB: published)
 *   X. Afgewezen     (DB: rejected) — terminal until revived
 *   T. (technical)   (DB: failed, archived, deleted) — auxiliary states
 *
 * Used by ALL status-displaying components (single rendering pipeline):
 *  - ConceptDialog header badge
 *  - ConceptDialog Stap 3 per-platform chips
 *  - ContentItemsTab list rows
 *  - ContentCalendarTab calendar items + popup
 *
 * @module lib/workflowStatus
 * @version 1.0.0
 */

// ---------------------------------------------------------------------
// CORE MAPPING — DB enum → UI workflow status
// ---------------------------------------------------------------------

/**
 * 5 primary UI statussen (Frank's workflow definitie).
 * Plus 3 auxiliary states (afgewezen, mislukt, gearchiveerd).
 */
export const WORKFLOW_STATUSES = {
  concept: {
    key: 'concept',
    stage: 1,
    color: '#9e9e9e',         // neutral grey
    muiColor: 'default',
    icon: 'EditNoteIcon',
    isApprovable: true,
    isSchedulable: false,
    isPublishable: false,
    isTerminal: false,
    labels: {
      nl: 'Concept',
      en: 'Draft',
      de: 'Entwurf',
      fr: 'Brouillon',
      es: 'Borrador',
    },
  },
  goedgekeurd: {
    key: 'goedgekeurd',
    stage: 2,
    color: '#2e7d32',         // green
    muiColor: 'success',
    icon: 'CheckCircleIcon',
    isApprovable: false,
    isSchedulable: true,
    isPublishable: true,
    isTerminal: false,
    labels: {
      nl: 'Goedgekeurd',
      en: 'Approved',
      de: 'Genehmigt',
      fr: 'Approuvé',
      es: 'Aprobado',
    },
  },
  ingepland: {
    key: 'ingepland',
    stage: 3,
    color: '#1976d2',         // blue
    muiColor: 'primary',
    icon: 'ScheduleIcon',
    isApprovable: false,
    isSchedulable: true,       // herplannen ok
    isPublishable: true,        // publish-now mogelijk
    isTerminal: false,
    labels: {
      nl: 'Ingepland',
      en: 'Scheduled',
      de: 'Geplant',
      fr: 'Programmé',
      es: 'Programado',
    },
  },
  gepubliceerd: {
    key: 'gepubliceerd',
    stage: 4,
    color: '#1b5e20',         // dark green
    muiColor: 'success',
    icon: 'PublishedWithChangesIcon',
    isApprovable: false,
    isSchedulable: false,
    isPublishable: false,        // dedupe-guard: NEVER re-publish
    isTerminal: true,
    labels: {
      nl: 'Gepubliceerd',
      en: 'Published',
      de: 'Veröffentlicht',
      fr: 'Publié',
      es: 'Publicado',
    },
  },
  afgewezen: {
    key: 'afgewezen',
    stage: 0,
    color: '#d32f2f',         // red
    muiColor: 'error',
    icon: 'CancelIcon',
    isApprovable: true,         // revive via draft → approve
    isSchedulable: false,
    isPublishable: false,
    isTerminal: false,
    labels: {
      nl: 'Afgewezen',
      en: 'Rejected',
      de: 'Abgelehnt',
      fr: 'Rejeté',
      es: 'Rechazado',
    },
  },
  mislukt: {
    key: 'mislukt',
    stage: 3,                  // failed = post-scheduled, recovery state
    color: '#ed6c02',          // orange
    muiColor: 'warning',
    icon: 'ErrorIcon',
    isApprovable: false,
    isSchedulable: true,        // herplannen
    isPublishable: true,        // retry
    isTerminal: false,
    labels: {
      nl: 'Mislukt',
      en: 'Failed',
      de: 'Fehlgeschlagen',
      fr: 'Échoué',
      es: 'Fallido',
    },
  },
  gearchiveerd: {
    key: 'gearchiveerd',
    stage: 4,
    color: '#616161',
    muiColor: 'default',
    icon: 'Inventory2Icon',
    isApprovable: false,
    isSchedulable: false,
    isPublishable: false,
    isTerminal: true,
    labels: {
      nl: 'Gearchiveerd',
      en: 'Archived',
      de: 'Archiviert',
      fr: 'Archivé',
      es: 'Archivado',
    },
  },
};

/**
 * DB-enum → UI workflow status key
 * 13 DB statussen → 7 UI statussen (5 primary + afgewezen + mislukt + gearchiveerd)
 */
const DB_TO_UI = {
  // Concept stage (Frank: "Ter Review = hetzelfde als Concept, dus verwijderen")
  draft: 'concept',
  generating: 'concept',
  pending_review: 'concept',
  in_review: 'concept',
  reviewed: 'concept',
  changes_requested: 'concept',
  // Goedgekeurd stage
  approved: 'goedgekeurd',
  // Ingepland stage (publishing = in-flight scheduled)
  scheduled: 'ingepland',
  publishing: 'ingepland',
  // Gepubliceerd stage (terminal success)
  published: 'gepubliceerd',
  partially_published: 'gepubliceerd',
  // Aux states
  rejected: 'afgewezen',
  failed: 'mislukt',
  archived: 'gearchiveerd',
  // deleted handled separately (not rendered)
};

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Resolve UI workflow status from DB approval_status + optional scheduled_at.
 *
 * Important: items met scheduled_at + approval_status='approved' = INGEPLAND
 * (interne DB inconsistentie, maar UI moet correct tonen).
 *
 * @param {string} dbStatus - approval_status from DB
 * @param {Object} [item] - full item for context (optional scheduled_at check)
 * @returns {Object} workflow status definition
 */
export function getWorkflowStatus(dbStatus, item = null) {
  // Special case: approved + scheduled_at future = effectively scheduled
  if (item && dbStatus === 'approved' && item.scheduled_at) {
    const schedAt = new Date(item.scheduled_at);
    if (!isNaN(schedAt.getTime()) && schedAt > new Date()) {
      return WORKFLOW_STATUSES.ingepland;
    }
  }
  // Special case: approved + scheduled_at past + no published_at = MISSED
  if (item && dbStatus === 'approved' && item.scheduled_at && !item.published_at) {
    const schedAt = new Date(item.scheduled_at);
    if (!isNaN(schedAt.getTime()) && schedAt < new Date()) {
      // orphaned scheduled — show as concept-state (needs reschedule by user)
      return WORKFLOW_STATUSES.concept;
    }
  }
  const uiKey = DB_TO_UI[dbStatus] || 'concept';
  return WORKFLOW_STATUSES[uiKey];
}

/**
 * Get translated label for status in given locale.
 */
export function getStatusLabel(dbStatus, locale = 'nl', item = null) {
  const status = getWorkflowStatus(dbStatus, item);
  return status.labels[locale] || status.labels.en || status.key;
}

/**
 * Derive concept-level workflow status from array of child items.
 * Concept-stage = lowest stage among items (concept wins over goedgekeurd, etc.)
 * UNLESS all items are at higher stage.
 *
 * Frank's E vereiste: Stap 1 (Alle) consistent met Stap 3 (Per platform).
 *
 * Logic:
 *  - All items in same UI status → concept = that status
 *  - Mix: concept = LOWEST stage (work remains)
 *  - Example: 1 concept + 1 goedgekeurd → concept-level = 'concept' (still work to do)
 *  - All goedgekeurd → concept-level = 'goedgekeurd'
 *  - 1 goedgekeurd + 1 ingepland → concept-level = 'goedgekeurd' (still need to schedule the other)
 */
export function deriveConceptWorkflowStatus(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return WORKFLOW_STATUSES.concept;
  }
  const activeItems = items.filter(i => i.approval_status !== 'deleted');
  if (activeItems.length === 0) return WORKFLOW_STATUSES.concept;

  const stages = activeItems.map(i => getWorkflowStatus(i.approval_status, i).stage);

  // If any rejected → afgewezen
  if (activeItems.some(i => getWorkflowStatus(i.approval_status, i).key === 'afgewezen')) {
    return WORKFLOW_STATUSES.afgewezen;
  }
  // If any failed → mislukt
  if (activeItems.some(i => getWorkflowStatus(i.approval_status, i).key === 'mislukt')) {
    return WORKFLOW_STATUSES.mislukt;
  }

  // Lowest non-zero stage wins (least-progressed determines collective state)
  const minStage = Math.min(...stages);
  if (minStage === 1) return WORKFLOW_STATUSES.concept;
  if (minStage === 2) return WORKFLOW_STATUSES.goedgekeurd;
  if (minStage === 3) return WORKFLOW_STATUSES.ingepland;
  if (minStage === 4) return WORKFLOW_STATUSES.gepubliceerd;
  return WORKFLOW_STATUSES.concept;
}

/**
 * Determine which bulk actions are available based on items state.
 * Frank's E: button states synchroniseren met item statussen.
 */
export function getAvailableActions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { canApprove: false, canSchedule: false, canPublish: false, canReject: false };
  }
  const active = items.filter(i => i.approval_status !== 'deleted');
  if (active.length === 0) {
    return { canApprove: false, canSchedule: false, canPublish: false, canReject: false };
  }

  // canApprove: ten minste 1 item in approve-able state
  const canApprove = active.some(i => getWorkflowStatus(i.approval_status, i).isApprovable);

  // canSchedule: ten minste 1 item in schedule-able state (goedgekeurd or ingepland for reschedule)
  const canSchedule = active.every(i => {
    const s = getWorkflowStatus(i.approval_status, i);
    return s.isSchedulable || s.key === 'gepubliceerd';  // published items skip ok
  }) && active.some(i => getWorkflowStatus(i.approval_status, i).isSchedulable);

  // canPublish: ten minste 1 item publish-able (NIET reeds gepubliceerd)
  const canPublish = active.every(i => {
    const s = getWorkflowStatus(i.approval_status, i);
    return s.isPublishable || s.key === 'gepubliceerd';
  }) && active.some(i => getWorkflowStatus(i.approval_status, i).isPublishable);

  // canReject: ten minste 1 item rejectable (alle non-terminal)
  const canReject = active.some(i => !getWorkflowStatus(i.approval_status, i).isTerminal);

  return { canApprove, canSchedule, canPublish, canReject };
}

/**
 * Get all primary stages for ProgressIndicator (Stijl B).
 * Returns ordered list of 4 stages: Concept → Goedgekeurd → Ingepland → Gepubliceerd.
 */
export function getPrimaryStages() {
  return [
    WORKFLOW_STATUSES.concept,
    WORKFLOW_STATUSES.goedgekeurd,
    WORKFLOW_STATUSES.ingepland,
    WORKFLOW_STATUSES.gepubliceerd,
  ];
}

/**
 * Check if status is at-least target stage (>=).
 * E.g. isAtLeast('scheduled', 'goedgekeurd') = true (scheduled stage 3 >= goedgekeurd stage 2)
 */
export function isAtLeast(dbStatus, targetKey, item = null) {
  const current = getWorkflowStatus(dbStatus, item);
  const target = WORKFLOW_STATUSES[targetKey];
  if (!target) return false;
  return current.stage >= target.stage;
}

export default {
  WORKFLOW_STATUSES,
  getWorkflowStatus,
  getStatusLabel,
  deriveConceptWorkflowStatus,
  getAvailableActions,
  getPrimaryStages,
  isAtLeast,
};
