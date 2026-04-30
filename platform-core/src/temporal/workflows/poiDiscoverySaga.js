/**
 * Temporal Workflow: POI Discovery Saga
 * 5 steps: Apify scrape -> ChromaDB embed -> Mistral enrich -> tier classify -> notify trendspotter
 * Compensation: rollback per step on failure
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  sendAlert, pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '5 minutes' });

const {
  scrapeApifyPOIs, embedToChromaDB, enrichViaMistral,
  classifyTier, notifyDiscoveryComplete,
  rollbackChromaEmbeddings, rollbackEnrichment, rollbackTierClassifications
} = proxyActivities({ startToCloseTimeout: '20 minutes' });

export async function poiDiscoverySaga(input) {
  const { destination_id, lat, lon, radius_km, trend_keyword } = input;
  const compensations = [];
  const steps = [];

  try {
    // Step 1: Apify scrape
    const scraped = await scrapeApifyPOIs({ lat, lon, radius_km, keyword: trend_keyword });
    steps.push('scrape');
    if (!scraped || scraped.count < 1) {
      await sendAlert('info', `POI discovery: 0 POIs found for destination ${destination_id}`, {});
      return { success: true, pois_persisted: 0, destination_id };
    }

    // Step 2: ChromaDB embed
    const embedded = await embedToChromaDB({ pois: scraped.pois, destination_id });
    compensations.push(() => rollbackChromaEmbeddings({ vector_ids: embedded.vector_ids, destination_id }));
    steps.push('embed');

    // Step 3: Mistral enrich
    const enriched = await enrichViaMistral({ pois: scraped.pois, destination_id });
    compensations.push(() => rollbackEnrichment({ poi_ids: enriched.poi_ids }));
    steps.push('enrich');

    // Step 4: Tier classify
    const classified = await classifyTier({ pois: enriched.pois, destination_id });
    compensations.push(() => rollbackTierClassifications({ poi_ids: classified.poi_ids }));
    steps.push('classify');

    // Step 5: Notify trendspotter (ACK1 closed loop)
    await notifyDiscoveryComplete({
      status: 'success',
      pois_discovered: scraped.count,
      pois_persisted: classified.poi_ids.length,
      destination_id
    });
    steps.push('notify');

    await pushDashboardEvent('maestro', 'poi_discovery_saga_completed', 'info', {
      destination_id, pois: classified.poi_ids.length, steps
    });

    return { success: true, pois_persisted: classified.poi_ids.length, destination_id, steps };
  } catch (error) {
    // Compensation: reverse order
    for (const compensate of compensations.reverse()) {
      try { await compensate(); } catch (e) { /* log and continue */ }
    }
    await sendAlert('warning', `POI discovery saga failed: ${error.message}`, { steps, destination_id });
    throw error;
  }
}
