/**
 * Temporal Workflow: Publish Content Saga
 * Full content lifecycle with compensations:
 *   generate → SEO validate → translate → images → schedule → track
 *
 * On failure: compensations run in reverse order
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  generateDraft,
  validateSEO,
  translateContent,
  generateImages,
  schedulePublish,
  trackPublication,
  sendAlert,
  pushDashboardEvent,
  deleteDraft,
  cancelSchedule
} = proxyActivities({ startToCloseTimeout: '5 minutes', retry: { maximumAttempts: 2 } });

export async function publishContentSaga(input) {
  const { topic, destinationId, platforms = ['facebook', 'instagram'], keywords = [] } = input;
  const compensations = [];
  const steps = [];

  try {
    await pushDashboardEvent('redacteur', 'content_saga_started', 'info', { topic, destinationId });

    // Step 1: Generate draft
    const draft = await generateDraft(topic, destinationId, keywords);
    steps.push('draft_generated');
    compensations.push(async () => { await deleteDraft(draft.contentId); });

    // Step 2: SEO validation
    const seo = await validateSEO(draft.contentId, draft.title, draft.body, keywords);
    steps.push('seo_validated');

    if (!seo.passed) {
      // Request revision and wait
      await pushDashboardEvent('seoMeester', 'seo_failed', 'warning', { contentId: draft.contentId, score: seo.seoScore });
      throw new Error(`SEO validation failed (score: ${seo.seoScore}): ${seo.issues.join(', ')}`);
    }

    // Step 3: Translate (parallel with images)
    const [translation, images] = await Promise.all([
      translateContent(draft.contentId, 'en', ['nl', 'de', 'es']),
      generateImages(draft.contentId, topic, destinationId, 3)
    ]);
    steps.push('translated', 'images_generated');

    // Step 4: Schedule publication
    const schedule = await schedulePublish(draft.contentId, platforms);
    steps.push('scheduled');
    compensations.push(async () => { await cancelSchedule(draft.contentId); });

    // Step 5: Track performance (fire-and-forget, no compensation needed)
    for (const platform of platforms) {
      await trackPublication(draft.contentId, platform);
    }
    steps.push('tracking_started');

    await pushDashboardEvent('uitgever', 'content_saga_completed', 'info', { contentId: draft.contentId, steps });

    return { success: true, contentId: draft.contentId, steps, platforms };

  } catch (error) {
    // Run compensations in reverse
    for (const compensate of compensations.reverse()) {
      try { await compensate(); } catch (compErr) { /* log but continue */ }
    }

    await sendAlert('warning', `Content saga failed for "${topic}": ${error.message}`, { steps, error: error.message });
    await pushDashboardEvent('redacteur', 'content_saga_failed', 'warning', { topic, error: error.message, steps });

    throw error;
  }
}
