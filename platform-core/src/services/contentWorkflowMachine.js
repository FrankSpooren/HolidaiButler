/**
 * Content Workflow Machine — Blok 3.1 Fase B
 *
 * XState v5 implementatie van de content approval FSM. Bouwt een formele state
 * machine uit een TRANSITIONS-dict zodat:
 *   - per-tenant transitions uit workflow_configurations DB-table geladen kunnen worden;
 *   - state charts visualizable zijn via @xstate/inspect of statelyai.com;
 *   - guards/actions/effects formeel gedeclareerd zijn ipv ad-hoc if-statements.
 *
 * Pattern: composable XState machine factory. Geen globale singleton — per
 * destination kan een eigen machine geinstantieerd worden met eigen transitions.
 *
 * @module contentWorkflowMachine
 * @version 1.0.0
 */

import { createMachine, setup } from 'xstate';

/**
 * Defaultset TRANSITIONS uit Blok 1.2 / approvalStateMachine.TRANSITIONS.
 * Hier herhaald als hardcoded fallback zodat machine ook werkt zonder DB.
 */
export const DEFAULT_TRANSITIONS = {
  draft:              ['pending_review', 'approved', 'rejected', 'deleted'],
  pending_review:     ['in_review', 'reviewed', 'changes_requested', 'rejected', 'approved', 'deleted'],
  in_review:          ['reviewed', 'changes_requested', 'rejected', 'approved'],
  reviewed:           ['approved', 'changes_requested', 'rejected'],
  changes_requested:  ['draft', 'pending_review', 'rejected'],
  rejected:           ['draft', 'pending_review', 'deleted'],
  approved:           ['scheduled', 'publishing', 'rejected', 'archived', 'deleted'],
  scheduled:          ['publishing', 'published', 'failed', 'approved', 'deleted'],
  publishing:         ['published', 'failed'],
  published:          ['archived'],
  failed:             ['draft', 'approved', 'scheduled', 'rejected'],
  archived:           ['deleted'],
  deleted:            [],
  // Legacy
  generating:         ['draft', 'rejected', 'deleted'],
  partially_published:['published', 'failed'],
};

/**
 * Pre-defined alternative workflows voor per-tenant beta-test (Blok 3.2).
 */
export const WORKFLOW_PRESETS = {
  // Standaard volledige workflow (5 destinations seed default)
  default: DEFAULT_TRANSITIONS,

  // BUTE Lite — 1-step approve (publiek-toerisme tenant zonder review-team)
  'bute-1-step': {
    draft:    ['approved', 'rejected', 'deleted'],
    approved: ['scheduled', 'publishing', 'rejected', 'archived', 'deleted'],
    scheduled:  ['publishing', 'published', 'failed', 'approved', 'deleted'],
    publishing: ['published', 'failed'],
    published:  ['archived'],
    failed:     ['draft', 'approved', 'scheduled', 'rejected'],
    rejected:   ['draft', 'deleted'],
    archived:   ['deleted'],
    deleted:    [],
    generating: ['draft', 'rejected', 'deleted'],
  },

  // WarreWijzer 2-step — corporate review workflow (marketing -> editor -> approved)
  'warrewijzer-2-step': {
    draft:               ['pending_review', 'rejected', 'deleted'],
    pending_review:      ['reviewed', 'changes_requested', 'rejected'],
    reviewed:            ['approved', 'changes_requested', 'rejected'],
    changes_requested:   ['draft', 'pending_review', 'rejected'],
    approved:            ['scheduled', 'publishing', 'archived', 'deleted'],
    scheduled:           ['publishing', 'published', 'failed', 'approved', 'deleted'],
    publishing:          ['published', 'failed'],
    published:           ['archived'],
    failed:              ['draft', 'approved', 'scheduled', 'rejected'],
    rejected:            ['draft', 'pending_review', 'deleted'],
    archived:            ['deleted'],
    deleted:             [],
  },

  // Corporate 3-step — legal -> marketing -> CEO (Fase_B doc reference)
  'corporate-3-step': {
    draft:                  ['legal_review', 'rejected', 'deleted'],
    legal_review:           ['marketing_review', 'changes_requested', 'rejected'],
    marketing_review:       ['ceo_review', 'changes_requested', 'rejected'],
    ceo_review:             ['approved', 'changes_requested', 'rejected'],
    changes_requested:      ['draft', 'legal_review', 'rejected'],
    approved:               ['scheduled', 'publishing', 'archived', 'deleted'],
    scheduled:              ['publishing', 'published', 'failed', 'approved', 'deleted'],
    publishing:             ['published', 'failed'],
    published:              ['archived'],
    failed:                 ['draft', 'approved', 'scheduled', 'rejected'],
    rejected:               ['draft', 'legal_review', 'deleted'],
    archived:               ['deleted'],
    deleted:                [],
  },
};

/**
 * Bouw een XState machine uit een TRANSITIONS dict. Elke status wordt een state
 * met events richting de toegestane targets (event-naam = TARGET status zelf, dus
 * `send({ type: 'approved' })` triggert transitie naar approved-state).
 *
 * @param {Object} [opts]
 * @param {Object} [opts.transitions=DEFAULT_TRANSITIONS]
 * @param {string} [opts.id='contentWorkflow']
 * @param {string} [opts.initial='draft']
 * @returns {ReturnType<typeof createMachine>}
 */
export function buildContentWorkflowMachine(opts = {}) {
  const {
    transitions = DEFAULT_TRANSITIONS,
    id = 'contentWorkflow',
    initial = 'draft',
  } = opts;

  if (!transitions || typeof transitions !== 'object') {
    throw new Error('buildContentWorkflowMachine: transitions object is required');
  }
  const states = {};
  for (const [stateName, targets] of Object.entries(transitions)) {
    const on = {};
    for (const target of targets) {
      // Event-naam = doelstatus. Bij meerdere overgangen naar zelfde target met
      // verschillende guards zou je eventueel `[target.toUpperCase()]` met cond gebruiken.
      on[target] = { target };
    }
    states[stateName] = Array.isArray(targets) && targets.length === 0
      ? { type: 'final' }
      : { on };
  }

  // Zorg ervoor dat initial state in states-dict zit; anders XState gooit error
  const safeInitial = states[initial] ? initial : Object.keys(states)[0] || 'draft';

  return setup({
    types: {
      events: {},
      context: {},
    },
  }).createMachine({
    id,
    initial: safeInitial,
    states,
  });
}

/**
 * Check of een transitie van `fromStatus` naar `toStatus` geldig is volgens
 * de gegeven transitions-dict. Pure check, gebruikt geen XState actor.
 *
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {Object} [transitionsDict]
 * @returns {boolean}
 */
export function canTransitionXState(fromStatus, toStatus, transitionsDict = DEFAULT_TRANSITIONS) {
  if (!fromStatus || !toStatus) return false;
  const allowed = transitionsDict[fromStatus];
  if (!allowed || !Array.isArray(allowed)) return false;
  return allowed.includes(toStatus);
}

/**
 * Geef een serialisable snapshot van de machine-definitie voor visualisatie
 * (@xstate/inspect, statelyai.com). Output is een platte JSON-structuur.
 *
 * @param {Object} [transitionsDict]
 * @returns {Object}
 */
export function getMachineGraph(transitionsDict = DEFAULT_TRANSITIONS) {
  const nodes = [];
  const edges = [];
  for (const [state, targets] of Object.entries(transitionsDict)) {
    nodes.push({ id: state, type: targets.length === 0 ? 'final' : 'state' });
    for (const target of targets) {
      edges.push({ from: state, to: target, event: target });
    }
  }
  return { nodes, edges };
}

export default {
  DEFAULT_TRANSITIONS,
  WORKFLOW_PRESETS,
  buildContentWorkflowMachine,
  canTransitionXState,
  getMachineGraph,
};
