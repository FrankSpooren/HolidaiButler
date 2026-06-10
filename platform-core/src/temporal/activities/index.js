// Temporal activities index — all activities for workflows
import {
  runHealthCheck, triggerDataSync, verifyRecovery,
  sendAlert, pushDashboardEvent,
  checkBudget, triggerReconciliation,
  suggestContent, updatePersonalizationProfiles
} from './operationalActivities.js';

import {
  generateDraft, validateSEO, translateContent,
  generateImages, schedulePublish, trackPublication,
  deleteDraft, cancelSchedule
} from './contentActivities.js';

import {
  runTrendspotterForDestination, runReisleiderForDestination,
  getActiveDestinationIdsForSA
} from './agentActivities.js';

import * as sagaActivities from './sagaActivities.js';

export default {
  // Operational (17.B)
  runHealthCheck, triggerDataSync, verifyRecovery,
  sendAlert, pushDashboardEvent,
  checkBudget, triggerReconciliation,
  suggestContent, updatePersonalizationProfiles,
  // Content (17.D)
  generateDraft, validateSEO, translateContent,
  generateImages, schedulePublish, trackPublication,
  deleteDraft, cancelSchedule,
  // Agents (Trendspotter+Reisleider activation — 2026-06-10)
  runTrendspotterForDestination, runReisleiderForDestination,
  getActiveDestinationIdsForSA,
  // Saga activities (19.E)
  ...sagaActivities
};
