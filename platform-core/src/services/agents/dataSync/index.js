/**
 * Data Sync Agent
 * Enterprise-level POI lifecycle management and data synchronization
 *
 * Features:
 * - POI tier classification with balanced categories
 * - POI lifecycle management (creation, deactivation, duplicate detection)
 * - Reviews management (sync, sentiment analysis, spam detection, 2-year retention)
 * - Q&A generation (AI-powered, multi-language, approval workflow)
 * - Data validation (schema check, integrity, rollback, anomaly detection)
 * - Health reporting (daily/weekly reports, quality scores, alerts)
 * - Apify integration with budget management (€100/month)
 * - Scheduled sync jobs (daily, weekly, monthly, quarterly)
 *
 * @module agents/dataSync
 * @version 2.0.0
 */

import poiTierManager from "./poiTierManager.js";
import poiSyncService from "./poiSyncService.js";
import apifyIntegration from "./apifyIntegration.js";
import syncScheduler from "./syncScheduler.js";
import poiLifecycleManager from "./poiLifecycleManager.js";
import reviewsManager from "./reviewsManager.js";
import qaGenerator from "./qaGenerator.js";
import dataValidator from "./dataValidator.js";
import syncReporter from "./syncReporter.js";
import { logAgent } from "../../orchestrator/auditTrail/index.js";

class DataSyncAgent {
  constructor() {
    this.name = "Data Sync Agent";
    this.version = "2.0.0";
    this.initialized = false;
  }

  /**
   * Initialize the Data Sync Agent
   * @param {Object} sequelize - Sequelize instance
   * @param {Object} options - Optional configuration
   */
  async initialize(sequelize, options = {}) {
    console.log("[DataSyncAgent] Initializing enterprise-level agent...");

    try {
      // Set sequelize for all services that need it
      poiSyncService.setSequelize(sequelize);
      poiLifecycleManager.setSequelize(sequelize);
      reviewsManager.setSequelize(sequelize);
      qaGenerator.setSequelize(sequelize);
      dataValidator.setSequelize(sequelize);
      syncReporter.setSequelize(sequelize);

      // Set Mistral client for Q&A generation if provided
      if (options.mistralClient) {
        qaGenerator.setMistralClient(options.mistralClient);
      }

      // Initialize scheduled jobs
      await syncScheduler.initializeScheduledJobs();

      this.initialized = true;

      await logAgent("data-sync", "agent_initialized", {
        description: "Data Sync Agent v2.0 initialized successfully",
        metadata: {
          version: this.version,
          modules: [
            "poiTierManager", "poiSyncService", "poiLifecycleManager",
            "reviewsManager", "qaGenerator", "dataValidator", "syncReporter"
          ]
        }
      });

      console.log("[DataSyncAgent] Enterprise agent ready");
      console.log("[DataSyncAgent] - POI Tier Manager: active");
      console.log("[DataSyncAgent] - POI Lifecycle Manager: active");
      console.log("[DataSyncAgent] - Reviews Manager: active");
      console.log("[DataSyncAgent] - Q&A Generator: active");
      console.log("[DataSyncAgent] - Data Validator: active");
      console.log("[DataSyncAgent] - Sync Reporter: active");

      return { success: true, version: this.version };
    } catch (error) {
      console.error("[DataSyncAgent] Initialization failed:", error.message);
      throw error;
    }
  }

  // === POI TIER MANAGEMENT ===

  async recalculateTiers(sequelize) {
    console.log("[DataSyncAgent] Recalculating POI tiers...");
    return poiTierManager.classifyAllPOIs(sequelize);
  }

  async syncTier(tier, destination = "Calpe, Spain") {
    console.log(`[DataSyncAgent] Syncing tier ${tier} for ${destination}`);
    return poiSyncService.syncPOIsByTier(tier, destination);
  }

  async discoverPOIs(destination, categories) {
    console.log(`[DataSyncAgent] Discovering POIs in ${destination}`);
    return poiSyncService.discoverNewPOIs(destination, categories);
  }

  // === POI LIFECYCLE MANAGEMENT ===

  async createPOI(poiData, destination) {
    return poiLifecycleManager.createPOI(poiData, destination);
  }

  async checkClosureStatus(poiId, apifyData) {
    return poiLifecycleManager.checkClosureStatus(poiId, apifyData);
  }

  async processPendingDeactivations() {
    return poiLifecycleManager.processPendingDeactivations();
  }

  async getPendingDeactivations() {
    return poiLifecycleManager.getPendingDeactivations();
  }

  async cancelDeactivation(poiId, reason) {
    return poiLifecycleManager.cancelDeactivation(poiId, reason);
  }

  // === REVIEWS MANAGEMENT ===

  async syncReviewsForPOI(poiId, googlePlaceId) {
    return reviewsManager.syncReviewsForPOI(poiId, googlePlaceId);
  }

  async batchSyncReviews(pois) {
    return reviewsManager.batchSyncReviews(pois);
  }

  async enforceRetentionPolicy() {
    return reviewsManager.enforceRetentionPolicy();
  }

  async generateReviewSummary(poiId) {
    return reviewsManager.generateSummary(poiId);
  }

  // === Q&A MANAGEMENT ===

  async syncQAForPOI(poiId, options) {
    return qaGenerator.syncQAForPOI(poiId, options);
  }

  async batchSyncQA(poiIds, options) {
    return qaGenerator.batchSyncQA(poiIds, options);
  }

  async getPendingQAApprovals() {
    return qaGenerator.getPendingApprovals();
  }

  async approveQA(qaId, editedAnswer) {
    return qaGenerator.approveQA(qaId, editedAnswer);
  }

  async rejectQA(qaId, reason) {
    return qaGenerator.rejectQA(qaId, reason);
  }

  // === HEALTH REPORTING ===

  async generateHealthReport(options) {
    return syncReporter.generateHealthReport(options);
  }

  async getDailyReport() {
    return syncReporter.generateHealthReport({ period: "daily" });
  }

  async getWeeklyReport() {
    return syncReporter.generateHealthReport({ period: "weekly", sendAlert: true });
  }

  // === TRIGGER METHODS ===

  async triggerSync(tier) {
    return syncScheduler.triggerManualSync(tier);
  }

  async triggerDiscovery(destination, categories) {
    return syncScheduler.triggerDiscovery(destination, categories);
  }

  async triggerTierRecalc() {
    return syncScheduler.triggerTierRecalculation();
  }

  async triggerReviewSync(tiers) {
    return syncScheduler.triggerReviewSync(tiers);
  }

  async triggerQASync(tiers, languages) {
    return syncScheduler.triggerQASync(tiers, languages);
  }

  async triggerRetentionEnforcement() {
    return syncScheduler.triggerRetentionEnforcement();
  }

  async triggerDeactivationCheck() {
    return syncScheduler.triggerDeactivationCheck();
  }

  async triggerHealthReport(period, sendAlert) {
    return syncScheduler.triggerHealthReport(period, sendAlert);
  }

  // === STATUS & INFO ===

  async checkBudget() {
    return apifyIntegration.checkBudget();
  }

  async getApifyInfo() {
    return apifyIntegration.getAccountInfo();
  }

  getTierConfig() {
    return poiTierManager.getTierConfig();
  }

  getTier1CategoryTargets() {
    return poiTierManager.getTier1CategoryTargets();
  }

  getScheduledJobs() {
    return syncScheduler.getJobs();
  }

  getJobSchedule() {
    return syncScheduler.getJobSchedule();
  }

  async getStatus() {
    const syncStatus = await poiSyncService.getStatus();
    const jobs = syncScheduler.getJobs();
    const budgetStatus = await apifyIntegration.checkBudget();
    const lifecycleStats = await poiLifecycleManager.getStats();
    const reviewStats = await reviewsManager.getStats();
    const qaStats = await qaGenerator.getStats();
    const validatorStats = dataValidator.getStats();
    const reporterStats = syncReporter.getStats();

    return {
      agent: this.name,
      version: this.version,
      initialized: this.initialized,
      scheduledJobs: Object.keys(jobs).length,
      jobs: Object.keys(jobs),
      poiStatus: syncStatus,
      lifecycleStats,
      reviewStats,
      qaStats,
      validatorStats,
      reporterStats,
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

  // === JOB HANDLER ===

  /**
   * BullMQ job handler - routes jobs to appropriate modules
   * @param {Object} job - BullMQ job
   */
  async handleJob(job) {
    const { type, tier, tiers, destination, categories, languages, period, sendAlert, manual } = job.data;

    console.log(`[DataSyncAgent] Processing job: ${job.name} (type: ${type})`);

    try {
      let result;

      switch (type) {
        // === POI SYNC ===
        case "data-sync":
          if (tier) {
            result = await this.syncTier(tier, destination || "Calpe, Spain");
          } else {
            result = { status: "error", message: "No tier specified" };
          }
          break;

        case "data-sync-discovery":
          result = await this.discoverPOIs(destination, categories);
          break;

        case "data-sync-recalc":
          if (poiSyncService.sequelize) {
            result = await this.recalculateTiers(poiSyncService.sequelize);
          } else {
            result = { status: "skipped", message: "Sequelize not initialized" };
          }
          break;

        // === REVIEW SYNC ===
        case "review-sync":
          if (tiers && tiers.length > 0) {
            // Get POIs for specified tiers
            const poisForReview = await this.getPOIsForTiers(tiers);
            result = await this.batchSyncReviews(poisForReview);
          } else {
            result = { status: "error", message: "No tiers specified" };
          }
          break;

        case "review-retention":
          result = await this.enforceRetentionPolicy();
          break;

        // === Q&A SYNC ===
        case "qa-sync":
          if (tiers && tiers.length > 0) {
            const poisForQA = await this.getPOIIdsForTiers(tiers);
            result = await this.batchSyncQA(poisForQA, {
              languages: languages || ["nl", "en", "es"],
              useAI: true,
              autoApprove: false
            });
          } else {
            result = { status: "error", message: "No tiers specified" };
          }
          break;

        // === LIFECYCLE ===
        case "lifecycle-deactivation":
          result = await this.processPendingDeactivations();
          break;

        // === HEALTH REPORTS ===
        case "health-report":
          result = await this.generateHealthReport({
            period: period || "daily",
            sendAlert: sendAlert || false
          });
          break;

        default:
          // Handle legacy job names
          if (job.name === "poi-tier-recalc" || job.name === "poi-tier-recalc-manual") {
            if (poiSyncService.sequelize) {
              result = await this.recalculateTiers(poiSyncService.sequelize);
            } else {
              result = { status: "skipped", message: "Sequelize not initialized" };
            }
          } else {
            result = { status: "unknown", jobName: job.name, type };
          }
      }

      return {
        success: true,
        jobName: job.name,
        type,
        manual: manual || false,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[DataSyncAgent] Job ${job.name} failed:`, error.message);
      throw error;
    }
  }

  // === HELPER METHODS ===

  /**
   * Get POIs for specified tiers (with google_placeid)
   * @param {Array} tiers - Tier numbers
   * @returns {Array} POIs
   */
  async getPOIsForTiers(tiers) {
    if (!poiSyncService.sequelize) {
      return [];
    }

    const tierConfig = this.getTierConfig();
    const conditions = tiers.map(tier => {
      const config = tierConfig[tier];
      if (tier === 1) {
        return `tier_score >= ${config.minScore}`;
      } else if (tier === 4) {
        return `tier_score < ${tierConfig[3].minScore}`;
      } else {
        const nextTierConfig = tierConfig[tier - 1];
        return `tier_score >= ${config.minScore} AND tier_score < ${nextTierConfig.minScore}`;
      }
    });

    const [pois] = await poiSyncService.sequelize.query(`
      SELECT id, google_placeid
      FROM POI
      WHERE (is_active = 1 OR is_active IS NULL)
        AND google_placeid IS NOT NULL
        AND (${conditions.join(" OR ")})
      LIMIT 100
    `);

    return pois;
  }

  /**
   * Get POI IDs for specified tiers
   * @param {Array} tiers - Tier numbers
   * @returns {Array} POI IDs
   */
  async getPOIIdsForTiers(tiers) {
    const pois = await this.getPOIsForTiers(tiers);
    return pois.map(p => p.id);
  }
}

// Export singleton instance
const dataSyncAgent = new DataSyncAgent();
export default dataSyncAgent;

// Export individual components for direct access
export {
  poiTierManager,
  poiSyncService,
  apifyIntegration,
  syncScheduler,
  poiLifecycleManager,
  reviewsManager,
  qaGenerator,
  dataValidator,
  syncReporter
};
