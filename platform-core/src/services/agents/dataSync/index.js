/**
 * Data Sync Agent
 * Main entry point for POI data synchronization
 *
 * Features:
 * - POI tier classification with balanced categories
 * - Apify integration with budget management (€100/month)
 * - Scheduled sync jobs (daily, weekly, monthly, quarterly)
 * - Critical practical POI prioritization
 * - Accommodation exclusion
 *
 * @module agents/dataSync
 * @version 1.0.0
 */

import poiTierManager from "./poiTierManager.js";
import poiSyncService from "./poiSyncService.js";
import apifyIntegration from "./apifyIntegration.js";
import syncScheduler from "./syncScheduler.js";
import { logAgent } from "../../orchestrator/auditTrail/index.js";

class DataSyncAgent {
  constructor() {
    this.name = "Data Sync Agent";
    this.version = "1.0.0";
    this.initialized = false;
  }

  /**
   * Initialize the Data Sync Agent
   * @param {Object} sequelize - Sequelize instance
   */
  async initialize(sequelize) {
    console.log("[DataSyncAgent] Initializing...");

    try {
      // Set sequelize for POI sync service
      poiSyncService.setSequelize(sequelize);

      // Initialize scheduled jobs
      await syncScheduler.initializeScheduledJobs();

      this.initialized = true;

      await logAgent("data-sync", "agent_initialized", {
        description: "Data Sync Agent initialized successfully",
        metadata: { version: this.version }
      });

      console.log("[DataSyncAgent] Ready");
      return { success: true, version: this.version };
    } catch (error) {
      console.error("[DataSyncAgent] Initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Recalculate tier scores for all POIs
   * @param {Object} sequelize - Sequelize instance
   */
  async recalculateTiers(sequelize) {
    console.log("[DataSyncAgent] Recalculating POI tiers...");
    return poiTierManager.classifyAllPOIs(sequelize);
  }

  /**
   * Sync POIs for a specific tier
   * @param {number} tier - Tier number (1-4)
   * @param {string} destination - Destination name
   */
  async syncTier(tier, destination = "Calpe, Spain") {
    console.log(`[DataSyncAgent] Syncing tier ${tier} for ${destination}`);
    return poiSyncService.syncPOIsByTier(tier, destination);
  }

  /**
   * Discover new POIs in a destination
   * @param {string} destination - Destination name
   * @param {Array} categories - Search categories
   */
  async discoverPOIs(destination, categories) {
    console.log(`[DataSyncAgent] Discovering POIs in ${destination}`);
    return poiSyncService.discoverNewPOIs(destination, categories);
  }

  /**
   * Trigger manual sync for a tier
   * @param {number} tier - Tier number (1-4)
   */
  async triggerSync(tier) {
    return syncScheduler.triggerManualSync(tier);
  }

  /**
   * Trigger POI discovery
   * @param {string} destination - Destination name
   * @param {Array} categories - Search categories
   */
  async triggerDiscovery(destination, categories) {
    return syncScheduler.triggerDiscovery(destination, categories);
  }

  /**
   * Trigger tier recalculation
   */
  async triggerTierRecalc() {
    return syncScheduler.triggerTierRecalculation();
  }

  /**
   * Check Apify budget status
   */
  async checkBudget() {
    return apifyIntegration.checkBudget();
  }

  /**
   * Get Apify account info
   */
  async getApifyInfo() {
    return apifyIntegration.getAccountInfo();
  }

  /**
   * Get tier configuration
   */
  getTierConfig() {
    return poiTierManager.getTierConfig();
  }

  /**
   * Get Tier 1 category targets
   */
  getTier1CategoryTargets() {
    return poiTierManager.getTier1CategoryTargets();
  }

  /**
   * Get scheduled jobs
   */
  getScheduledJobs() {
    return syncScheduler.getJobs();
  }

  /**
   * Get job schedule details
   */
  getJobSchedule() {
    return syncScheduler.getJobSchedule();
  }

  /**
   * Get agent status
   */
  async getStatus() {
    const syncStatus = await poiSyncService.getStatus();
    const jobs = syncScheduler.getJobs();
    const budgetStatus = await apifyIntegration.checkBudget();

    return {
      agent: this.name,
      version: this.version,
      initialized: this.initialized,
      scheduledJobs: Object.keys(jobs).length,
      jobs: Object.keys(jobs),
      poiStatus: syncStatus,
      budgetStatus: {
        allowed: budgetStatus.allowed,
        percentageUsed: budgetStatus.percentageUsed,
        remaining: budgetStatus.remaining
      },
      tierConfig: this.getTierConfig(),
      tier1CategoryTargets: this.getTier1CategoryTargets(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * BullMQ job handler
   * @param {Object} job - BullMQ job
   */
  async handleJob(job) {
    const { type, tier, destination, categories, manual } = job.data;

    console.log(`[DataSyncAgent] Processing job: ${job.name} (type: ${type})`);

    try {
      let result;

      if (type === "data-sync" && tier) {
        result = await this.syncTier(tier, destination || "Calpe, Spain");
      } else if (type === "data-sync-discovery") {
        result = await this.discoverPOIs(destination, categories);
      } else if (type === "data-sync-recalc" || job.name === "poi-tier-recalc") {
        // Tier recalculation needs sequelize from poiSyncService
        if (poiSyncService.sequelize) {
          result = await this.recalculateTiers(poiSyncService.sequelize);
        } else {
          result = { status: "skipped", message: "Sequelize not initialized" };
        }
      } else if (job.name === "review-sync") {
        result = { status: "pending", message: "Review sync not yet implemented" };
      } else {
        result = { status: "unknown", jobName: job.name };
      }

      return {
        success: true,
        jobName: job.name,
        manual: manual || false,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[DataSyncAgent] Job ${job.name} failed:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
const dataSyncAgent = new DataSyncAgent();
export default dataSyncAgent;

// Also export individual components
export {
  poiTierManager,
  poiSyncService,
  apifyIntegration,
  syncScheduler
};
