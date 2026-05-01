/**
 * Temporal Workflow: Seasonal Content Saga
 * 4 steps: detect season -> adjust profiles -> suggest content -> publish
 * Compensation: unpublish + revert profile
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  sendAlert, pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '5 minutes' });

const {
  detectSeasonChange, adjustSeasonalProfiles, suggestSeasonalContent,
  publishSeasonalContent, unpublishContent, revertProfiles
} = proxyActivities({ startToCloseTimeout: '15 minutes' });

export async function seasonalContentSaga(input) {
  const { destination_id, current_date } = input;
  const compensations = [];
  const steps = [];

  try {
    const season = await detectSeasonChange({ destination_id, date: current_date });
    steps.push('detect');
    if (!season.changed) {
      return { success: true, season_changed: false, destination_id };
    }

    const profiles = await adjustSeasonalProfiles({ destination_id, season: season.new_season });
    compensations.push(() => revertProfiles({ destination_id, previous: profiles.previous }));
    steps.push('adjust_profiles');

    const content = await suggestSeasonalContent({ destination_id, season: season.new_season });
    steps.push('suggest');

    if (content.items.length > 0) {
      const published = await publishSeasonalContent({ items: content.items, destination_id });
      compensations.push(() => unpublishContent({ item_ids: published.item_ids }));
      steps.push('publish');
    }

    await pushDashboardEvent('maestro', 'seasonal_saga_completed', 'info', {
      destination_id, season: season.new_season, items: content.items.length
    });

    return { success: true, season: season.new_season, items_published: content.items.length, steps };
  } catch (error) {
    for (const compensate of compensations.reverse()) {
      try { await compensate(); } catch (e) { /* continue */ }
    }
    await sendAlert('warning', `Seasonal content saga failed: ${error.message}`, { steps });
    throw error;
  }
}
