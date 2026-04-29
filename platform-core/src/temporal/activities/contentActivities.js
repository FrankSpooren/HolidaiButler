/**
 * Temporal Activities: Content Kwaliteitsketen
 * Bridge between publishContentSaga workflow and A2A skills
 */
import { invokeSkill } from '../../a2a/a2aClient.js';
import logger from '../../utils/logger.js';

const SRC = 'temporal-worker';

export async function generateDraft(topic, destinationId, keywords) {
  const result = await invokeSkill('redacteur', 'suggestContent', {
    topic, keywords, destinationId, sourceAgent: SRC
  }, { sourceAgent: SRC });
  const r = result.result || result;
  return { contentId: `draft-${Date.now()}`, title: topic, body: `Generated content about ${topic}`, ...r };
}

export async function validateSEO(contentId, title, body, keywords) {
  const result = await invokeSkill('seoMeester', 'validateSEO', {
    contentId, title, body, keywords, sourceAgent: SRC
  }, { sourceAgent: SRC });
  return result.result || result;
}

export async function translateContent(contentId, sourceLang, targetLangs) {
  const result = await invokeSkill('vertaler', 'translateContent', {
    contentId, sourceLang, targetLangs, sourceAgent: SRC
  }, { sourceAgent: SRC });
  return result.result || result;
}

export async function generateImages(contentId, topic, destinationId, count) {
  const result = await invokeSkill('beeldenmaker', 'generateImages', {
    contentId, topic, destinationId, count, sourceAgent: SRC
  }, { sourceAgent: SRC });
  return result.result || result;
}

export async function schedulePublish(contentId, platforms) {
  const result = await invokeSkill('uitgever', 'schedulePublish', {
    contentId, platforms, sourceAgent: SRC
  }, { sourceAgent: SRC });
  return result.result || result;
}

export async function trackPublication(contentId, platform) {
  const result = await invokeSkill('performanceWachter', 'trackPublication', {
    contentId, platform, postId: `post-${Date.now()}`, sourceAgent: SRC
  }, { sourceAgent: SRC });
  return result.result || result;
}

export async function deleteDraft(contentId) {
  logger.info(`[content-activities] Compensation: deleting draft ${contentId}`);
  return { deleted: true, contentId };
}

export async function cancelSchedule(contentId) {
  logger.info(`[content-activities] Compensation: cancelling schedule for ${contentId}`);
  return { cancelled: true, contentId };
}

// Re-export operational activities
export {
  sendAlert,
  pushDashboardEvent,
  checkBudget,
  triggerReconciliation,
  suggestContent,
  updatePersonalizationProfiles,
  runHealthCheck,
  triggerDataSync,
  verifyRecovery
} from './operationalActivities.js';
