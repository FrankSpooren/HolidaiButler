/**
 * Sync Scheduler
 * Enterprise-level scheduled job management for Data Sync Agent
 *
 * POI Sync frequencies:
 * - Tier 1: Daily at 06:00 (max 25 POIs, balanced categories)
 * - Tier 2: Weekly on Monday at 06:00 (max 250 POIs, incl. critical practical)
 * - Tier 3: Monthly on 1st at 06:00 (max 1000 POIs)
 * - Tier 4: Quarterly (Jan, Apr, Jul, Oct)
 *
 * Enterprise Jobs:
 * - Reviews: Weekly sync for Tier 1-2, Monthly for others
 * - Q&A: Monthly generation and sync
 * - Retention: Weekly enforcement
 * - Deactivation: Daily processing
 * - Health Reports: Daily and weekly
 *
 * @module agents/dataSync/syncScheduler
 * @version 2.0.0
 */

import { scheduledQueue } from "../../orchestrator/queues.js";
import { logAgent } from "../../orchestrator/auditTrail/index.js";

const SYNC_JOBS = {
  // === POI SYNC JOBS ===
  "poi-sync-tier1": {
    cron: "0 6 * * *",           // Daily at 06:00
    type: "data-sync",
    tier: 1,
    maxPOIs: 25,
    description: "Tier 1 POI sync (top attractions, balanced categories) - Daily"
  },
  "poi-sync-tier2": {
    cron: "0 6 * * 1",           // Weekly on Monday at 06:00
    type: "data-sync",
    tier: 2,
    maxPOIs: 250,
    description: "Tier 2 POI sync (popular + critical practical) - Weekly"
  },
  "poi-sync-tier3": {
    cron: "0 6 1 * *",           // Monthly on 1st at 06:00
    type: "data-sync",
    tier: 3,
    maxPOIs: 1000,
    description: "Tier 3 POI sync (standard) - Monthly"
  },
  "poi-sync-tier4": {
    cron: "0 6 1 1,4,7,10 *",    // Quarterly (Jan, Apr, Jul, Oct)
    type: "data-sync",
    tier: 4,
    maxPOIs: null,
    description: "Tier 4 POI sync (remaining) - Quarterly"
  },
  "poi-tier-recalc": {
    cron: "0 3 * * 0",           // Weekly on Sunday at 03:00
    type: "data-sync-recalc",
    tier: null,
    description: "Recalculate all POI tiers and category balance"
  },

  // === REVIEW SYNC JOBS ===
  "review-sync-tier12": {
    cron: "0 5 * * 3",           // Weekly on Wednesday at 05:00
    type: "review-sync",
    tiers: [1, 2],
    description: "Weekly review sync for Tier 1-2 POIs"
  },
  "review-sync-tier34": {
    cron: "0 5 15 * *",          // Monthly on 15th at 05:00
    type: "review-sync",
    tiers: [3, 4],
    description: "Monthly review sync for Tier 3-4 POIs"
  },
  "review-retention": {
    cron: "0 2 * * 0",           // Weekly on Sunday at 02:00
    type: "review-retention",
    description: "Enforce 2-year review retention policy"
  },

  // === Q&A SYNC JOBS ===
  "qa-sync-tier12": {
    cron: "0 4 1 * *",           // Monthly on 1st at 04:00
    type: "qa-sync",
    tiers: [1, 2],
    languages: ["nl", "en", "es"],
    description: "Monthly Q&A sync for Tier 1-2 POIs"
  },
  "qa-sync-tier34": {
    cron: "0 4 1 1,4,7,10 *",    // Quarterly at 04:00
    type: "qa-sync",
    tiers: [3, 4],
    languages: ["nl", "en", "es"],
    description: "Quarterly Q&A sync for Tier 3-4 POIs"
  },

  // === LIFECYCLE JOBS ===
  "poi-deactivation-check": {
    cron: "0 1 * * *",           // Daily at 01:00
    type: "lifecycle-deactivation",
    description: "Process pending POI deactivations after grace period"
  },

  // === REPORTING JOBS ===
  "health-report-daily": {
    cron: "0 7 * * *",           // Daily at 07:00
    type: "health-report",
    period: "daily",
    description: "Daily data health report"
  },
  "health-report-weekly": {
    cron: "0 7 * * 1",           // Weekly on Monday at 07:00
    type: "health-report",
    period: "weekly",
    sendAlert: true,
    description: "Weekly data health report with alerts"
  }
};

class SyncScheduler {

  async initializeScheduledJobs() {
    console.log("[SyncScheduler] Initializing sync jobs...");

    // Job name prefixes to clean up
    const cleanupPrefixes = [
      "poi-sync", "review-sync", "qa-sync", "poi-tier",
      "poi-deactivation", "health-report", "review-retention"
    ];

    try {
      // Remove existing jobs first
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        const shouldRemove = cleanupPrefixes.some(prefix => job.name.startsWith(prefix));
        if (shouldRemove) {
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
            type: config.type || "data-sync",
            tier: config.tier,
            tiers: config.tiers,
            maxPOIs: config.maxPOIs,
            languages: config.languages,
            period: config.period,
            sendAlert: config.sendAlert,
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

    console.log(`[SyncScheduler] Initialized ${Object.keys(SYNC_JOBS).length} jobs:`);
    console.log("[SyncScheduler] - POI Sync: 5 jobs");
    console.log("[SyncScheduler] - Review Sync: 3 jobs");
    console.log("[SyncScheduler] - Q&A Sync: 2 jobs");
    console.log("[SyncScheduler] - Lifecycle: 1 job");
    console.log("[SyncScheduler] - Reporting: 2 jobs");

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
      type: config.type,
      tier: config.tier,
      tiers: config.tiers,
      maxPOIs: config.maxPOIs,
      description: config.description
    }));
  }

  // === ADDITIONAL TRIGGER METHODS ===

  async triggerReviewSync(tiers = [1, 2]) {
    console.log(`[SyncScheduler] Triggering review sync for tiers ${tiers.join(", ")}`);

    await scheduledQueue.add(
      "review-sync-manual",
      {
        type: "review-sync",
        tiers,
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 2 }
    );

    await logAgent("data-sync", "manual_review_sync_triggered", {
      description: `Manual review sync triggered for tiers ${tiers.join(", ")}`,
      metadata: { tiers }
    });

    return { triggered: true, tiers, timestamp: new Date().toISOString() };
  }

  async triggerQASync(tiers = [1, 2], languages = ["nl", "en", "es"]) {
    console.log(`[SyncScheduler] Triggering Q&A sync for tiers ${tiers.join(", ")}`);

    await scheduledQueue.add(
      "qa-sync-manual",
      {
        type: "qa-sync",
        tiers,
        languages,
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 2 }
    );

    await logAgent("data-sync", "manual_qa_sync_triggered", {
      description: `Manual Q&A sync triggered for tiers ${tiers.join(", ")}`,
      metadata: { tiers, languages }
    });

    return { triggered: true, tiers, languages, timestamp: new Date().toISOString() };
  }

  async triggerRetentionEnforcement() {
    console.log("[SyncScheduler] Triggering retention enforcement");

    await scheduledQueue.add(
      "review-retention-manual",
      {
        type: "review-retention",
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 3 }
    );

    return { triggered: true, timestamp: new Date().toISOString() };
  }

  async triggerDeactivationCheck() {
    console.log("[SyncScheduler] Triggering deactivation check");

    await scheduledQueue.add(
      "poi-deactivation-check-manual",
      {
        type: "lifecycle-deactivation",
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 1 }
    );

    return { triggered: true, timestamp: new Date().toISOString() };
  }

  async triggerHealthReport(period = "daily", sendAlert = false) {
    console.log(`[SyncScheduler] Triggering ${period} health report`);

    await scheduledQueue.add(
      "health-report-manual",
      {
        type: "health-report",
        period,
        sendAlert,
        manual: true,
        triggeredAt: new Date().toISOString()
      },
      { priority: 3 }
    );

    return { triggered: true, period, sendAlert, timestamp: new Date().toISOString() };
  }

  getJobsByType(type) {
    return Object.entries(SYNC_JOBS)
      .filter(([, config]) => config.type === type)
      .map(([name, config]) => ({ name, ...config }));
  }
}

export default new SyncScheduler();
export { SYNC_JOBS };
