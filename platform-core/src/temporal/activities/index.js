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

export default {
  // Operational (17.B)
  runHealthCheck, triggerDataSync, verifyRecovery,
  sendAlert, pushDashboardEvent,
  checkBudget, triggerReconciliation,
  suggestContent, updatePersonalizationProfiles,
  // Content (17.D)
  generateDraft, validateSEO, translateContent,
  generateImages, schedulePublish, trackPublication,
  deleteDraft, cancelSchedule
};
