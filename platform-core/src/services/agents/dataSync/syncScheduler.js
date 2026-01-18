/**
 * Sync Scheduler
 * Manages scheduled POI synchronization jobs via BullMQ
 *
 * Update frequencies:
 * - Tier 1: Daily at 06:00 (max 25 POIs, balanced categories)
 * - Tier 2: Weekly on Monday at 06:00 (max 250 POIs, incl. critical practical)
 * - Tier 3: Monthly on 1st at 06:00 (max 1000 POIs)
 * - Tier 4: Quarterly (Jan, Apr, Jul, Oct)
 *
 * @module agents/dataSync/syncScheduler
 */

import { scheduledQueue } from "../../orchestrator/queues.js";
import { logAgent } from "../../orchestrator/auditTrail/index.js";

const SYNC_JOBS = {
  "poi-sync-tier1": {
    cron: "0 6 * * *",           // Daily at 06:00
    tier: 1,
    maxPOIs: 25,
    description: "Tier 1 POI sync (top attractions, balanced categories) - Daily"
  },
  "poi-sync-tier2": {
    cron: "0 6 * * 1",           // Weekly on Monday at 06:00
    tier: 2,
    maxPOIs: 250,
    description: "Tier 2 POI sync (popular + critical practical) - Weekly"
  },
  "poi-sync-tier3": {
    cron: "0 6 1 * *",           // Monthly on 1st at 06:00
    tier: 3,
    maxPOIs: 1000,
    description: "Tier 3 POI sync (standard) - Monthly"
  },
  "poi-sync-tier4": {
    cron: "0 6 1 1,4,7,10 *",    // Quarterly (Jan, Apr, Jul, Oct)
    tier: 4,
    maxPOIs: null,
    description: "Tier 4 POI sync (remaining) - Quarterly"
  },
  "poi-tier-recalc": {
    cron: "0 3 * * 0",           // Weekly on Sunday at 03:00
    tier: null,
    description: "Recalculate all POI tiers and category balance"
  },
  "review-sync": {
    cron: "0 4 1 1,7 *",         // 6-monthly (Jan, Jul)
    tier: null,
    description: "6-monthly review sync"
  }
};

class SyncScheduler {

  async initializeScheduledJobs() {
    console.log("[SyncScheduler] Initializing sync jobs...");

    try {
      // Remove existing data-sync jobs first
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name.startsWith("poi-sync") || job.name.startsWith("review-sync") || job.name.startsWith("poi-tier")) {
          await scheduledQueue.removeRepeatableByKey(job.key);
          console.log(`[SyncScheduler] Removed old job: ${job.name}`);
        }
      }
    } catch (error) {
      console.log("[SyncScheduler] No existing jobs to clean:", error.message);
    }

    // Add new scheduled jobs
    for (const [name, config] of Object.entries(SYNC_JOBS)) {
      try {
        await scheduledQueue.add(
          name,
          {
            type: "data-sync",
            tier: config.tier,
            maxPOIs: config.maxPOIs,
            description: config.description
          },
          {
            repeat: { cron: config.cron, tz: "Europe/Amsterdam" },
            jobId: `${name}-recurring`
          }
        );
        console.log(`[SyncScheduler] Scheduled: ${name} (${config.cron})`);
      } catch (error) {
        console.error(`[SyncScheduler] Failed to schedule ${name}:`, error.message);
      }
    }

    await logAgent("data-sync", "scheduler_initialized", {
      description: `Initialized ${Object.keys(SYNC_JOBS).length} sync jobs`,
      metadata: { jobs: Object.keys(SYNC_JOBS) }
    });

    return {
      jobsScheduled: Object.keys(SYNC_JOBS).length,
      jobs: Object.keys(SYNC_JOBS),
      timestamp: new Date().toISOString()
    };
  }

  async triggerManualSync(tier) {
    console.log(`[SyncScheduler] Triggering manual sync for tier ${tier}`);

    await scheduledQueue.add(
      `poi-sync-tier${tier}-manual`,
      {
        type: "data-sync",
        tier,
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 1 }
    );

    await logAgent("data-sync", "manual_sync_triggered", {
      description: `Manual sync triggered for tier ${tier}`,
      metadata: { tier }
    });

    return { triggered: true, tier, timestamp: new Date().toISOString() };
  }

  async triggerDiscovery(destination, categories) {
    console.log(`[SyncScheduler] Triggering POI discovery for ${destination}`);

    await scheduledQueue.add(
      "poi-discovery-manual",
      {
        type: "data-sync-discovery",
        destination,
        categories,
        triggeredAt: new Date().toISOString()
      },
      { priority: 2 }
    );

    return { triggered: true, destination, categories };
  }

  async triggerTierRecalculation() {
    console.log("[SyncScheduler] Triggering tier recalculation");

    await scheduledQueue.add(
      "poi-tier-recalc-manual",
      {
        type: "data-sync-recalc",
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 1 }
    );

    return { triggered: true, timestamp: new Date().toISOString() };
  }

  getJobs() {
    return SYNC_JOBS;
  }

  getJobSchedule() {
    return Object.entries(SYNC_JOBS).map(([name, config]) => ({
      name,
      cron: config.cron,
      tier: config.tier,
      maxPOIs: config.maxPOIs,
      description: config.description
    }));
  }
}

export default new SyncScheduler();
