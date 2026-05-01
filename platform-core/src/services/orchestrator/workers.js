import { Worker } from "bullmq";
import { connection } from "./queues.js";
import { logAgent, logError, logSystem, logAlert } from "./auditTrail/index.js";
import { updateAgentStatus } from '../../a2a/agentStatusService.js';

import { startMediaWorker, stopMediaWorker, mediaWorker } from "../media/mediaProcessingWorker.js";
let scheduledWorker = null;
let alertWorker = null;
let orchestratorWorker = null;
let contentGenerationWorker = null;

export function startWorkers() {
  console.log("[Orchestrator] Starting workers...");

  // Log system startup
  logSystem("workers_started", {
    description: "Orchestrator workers initialized"
  }).catch(err => console.error("[Audit] Failed to log startup:", err.message));

  // Scheduled Tasks Worker
  scheduledWorker = new Worker("scheduled-tasks", async (job) => {
    const startTime = Date.now();
    console.log("[Orchestrator] Processing scheduled job: " + job.name);

    // Log job start
      const JOB_ACTOR_MAP = {
        // De Corrector (Code)
        'dev-quality-report': 'code-reviewer',
        'dev-project-audit': 'dev-layer',

        // De Gastheer (Communication Flow)
        'comm-cleanup': 'communication-flow',
        'comm-journey-processor': 'communication-flow',
        'comm-user-sync': 'communication-flow',
        'intermediary-reminder': 'communication-flow',
        'intermediary-review-request': 'communication-flow',
        'reservation-reminder-1h': 'communication-flow',
        'reservation-reminder-24h': 'communication-flow',
        'session-cleanup': 'communication-flow',

        // De Koerier (Data Sync)
        'content-freshness-check': 'data-sync',
        'content-quality-audit': 'data-sync',
        'content-recycle-suggestions': 'data-sync',
        'poi-deactivation-check': 'data-sync',
        'poi-sync-tier1': 'data-sync',
        'poi-sync-tier2': 'data-sync',
        'poi-sync-tier3': 'data-sync',
        'poi-sync-tier4': 'data-sync',
        'qa-sync-tier12': 'data-sync',
        'qa-sync-tier34': 'data-sync',
        'review-retention': 'data-sync',
        'review-sync-tier12': 'data-sync',
        'review-sync-tier34': 'data-sync',

        // De Kassier (Financial Monitor)
        'financial-monitor': 'financial-monitor',
        'media-revenue-attribution': 'financial-monitor',

        // De Poortwachter (GDPR)
        'gdpr-consent-audit': 'gdpr',
        'gdpr-export-cleanup': 'gdpr',
        'gdpr-overdue-check': 'gdpr',
        'gdpr-retention-check': 'gdpr',
        'guest-data-retention-cleanup': 'gdpr',
        'intermediary-guest-anonymize': 'gdpr',
        'media-consent-expiry-check': 'gdpr',

        // De Dokter (Health Monitor)
        'backup-recency-check': 'health-monitor',
        'health-check': 'health-monitor',
        'health-report-daily': 'health-monitor',
        'health-report-weekly': 'health-monitor',
        'smoke-test': 'health-monitor',

        // Het Geheugen (HoliBot Sync)
        'chromadb-state-snapshot': 'holibot-sync',
        'content-holibot-insights': 'holibot-sync',
        'holibot-cleanup': 'holibot-sync',
        'holibot-full-reindex': 'holibot-sync',
        'holibot-poi-sync': 'holibot-sync',
        'holibot-qa-sync': 'holibot-sync',

        // De Makelaar (Intermediary Monitor)
        'intermediary-monitor': 'intermediary-monitor',

        // De Magazijnier (Inventory Sync)
        'inventory-sync': 'inventory-sync',

        // De Maestro (Orchestrator)
        'cache-warmup': 'orchestrator',
        'financial-auto-settlement': 'orchestrator',
        'financial-unsettled-alert': 'orchestrator',
        'release-expired-ticket-reservations': 'orchestrator',
        'reservation-expired-cleanup': 'orchestrator',
        'seasonal-check': 'orchestrator',

        // De Bode (Owner Interface)
        'content-weekly-report': 'owner-interface',
        'daily-briefing': 'owner-interface',
        'weekly-cost-report': 'owner-interface',

        'translation-quality-check': 'vertaler',
        'image-keyword-enrichment': 'beeldenmaker',
        'personalization-stats': 'personaliseerder',
        'performance-watch': 'performance-wachter',
        'anomaly-detection': 'anomaliedetective',
        'eu-ai-act-audit': 'auditeur',
        'content-optimization': 'optimaliseerder',
        'tenant-health-check': 'onthaler',
        'escalation-monitor': 'helpdeskmeester',

        // De Verfrisser (Content Freshness)
        'translation-quality-check': 'vertaler',
        'image-keyword-enrichment': 'beeldenmaker',
        'personalization-stats': 'personaliseerder',
        'performance-watch': 'performanceWachter',
        'anomaly-detection': 'anomaliedetective',
        'eu-ai-act-audit': 'auditeur',
        'content-optimization': 'optimaliseerder',
        'tenant-health-check': 'onthaler',
        'escalation-monitor': 'helpdeskmeester',
        'content-freshness-audit': 'verfrisser',

        // De Boekhouder (Cost Optimization)
        'cost-optimization-report': 'boekhouder',

        // De Reisleider (Customer Journey)
        'journey-analysis': 'reisleider',

        // De Verkenner (POI Discovery)
        'poi-discovery-annual': 'poi-discovery',
        'poi-discovery-quarterly': 'poi-discovery',

        // De Uitgever (Publisher)
        'content-analytics-collect': 'publisher',
        'content-publish-retry': 'publisher',
        'content-publish-scheduled': 'publisher',

        // De Redacteur
        'content-readiness-analyzer': 'redacteur',

        // De Bewaker (Security)
        'dev-security-scan': 'security-reviewer',

        // De SEO Meester
        'content-score-calibration': 'seo-meester',
        'content-seo-audit': 'seo-meester',

        // Strategy Layer (shared)
        'agent-success-rate': 'strategy-layer',
        'cost-check': 'strategy-layer',
        'strategy-assessment': 'strategy-layer',
        'strategy-config-eval': 'strategy-layer',
        'strategy-learning': 'strategy-layer',
        'strategy-prediction': 'strategy-layer',

        // De Promotor (Tier Promotion)
        'poi-tier-recalc': 'promotor',
        'tier-promotion': 'promotor',

        // De Trendspotter
        'content-feedback-loop': 'trendspotter',
        'content-gap-detector': 'trendspotter',
        'content-sources-health-check': 'trendspotter',
        'content-top25-refresh': 'trendspotter',
        'content-trending-scan': 'trendspotter',
        'content-website-traffic': 'trendspotter',
        'google-images-discovery': 'trendspotter',
        'gsc-query-sync': 'trendspotter',
        'media-performance-aggregator': 'trendspotter',
        'reddit-trend-discovery': 'trendspotter',
        'trending-visual-analysis': 'trendspotter',
        'trending-visual-cleanup': 'trendspotter',
        'trending-visual-discovery': 'trendspotter',

        // De Stylist (UX/UI)
        'dev-dependency-audit': 'ux-ui-reviewer',
      };

      // Fase B4: JOB_AGENT_MAP — maps job name to unique agent KEY (id)
      // Unlike JOB_ACTOR_MAP (shared actorNames), these are 1:1 unique per agent
      const JOB_AGENT_MAP = {
        // Core
        'seasonal-check': 'maestro', 'cache-warmup': 'maestro',
        'daily-briefing': 'bode', 'weekly-cost-report': 'bode', 'content-weekly-report': 'bode',
        // Operations
        'health-check': 'dokter', 'health-report-daily': 'dokter', 'health-report-weekly': 'dokter',
        'smoke-test': 'smokeTest', 'backup-recency-check': 'backupHealth',
        'content-quality-audit': 'contentQuality', 'content-freshness-check': 'koerier',
        'content-recycle-suggestions': 'koerier',
        'poi-sync-tier1': 'koerier', 'poi-sync-tier2': 'koerier',
        'poi-sync-tier3': 'koerier', 'poi-sync-tier4': 'koerier',
        'qa-sync-tier12': 'koerier', 'qa-sync-tier34': 'koerier',
        'review-sync-tier12': 'koerier', 'review-sync-tier34': 'koerier',
        'review-retention': 'koerier', 'poi-deactivation-check': 'koerier',
        'translation-quality-check': 'vertaler',
        'image-keyword-enrichment': 'beeldenmaker',
        'personalization-stats': 'personaliseerder',
        'performance-watch': 'performanceWachter',
        'anomaly-detection': 'anomaliedetective',
        'eu-ai-act-audit': 'auditeur',
        'content-optimization': 'optimaliseerder',
        'tenant-health-check': 'onthaler',
        'escalation-monitor': 'helpdeskmeester',
        'content-freshness-audit': 'verfrisser',
        'cost-optimization-report': 'boekhouder',
        'journey-analysis': 'reisleider',
        'poi-discovery-annual': 'verkenner', 'poi-discovery-quarterly': 'verkenner',
        'tier-promotion': 'promotor', 'poi-tier-recalc': 'promotor',
        'chromadb-state-snapshot': 'geheugen', 'holibot-poi-sync': 'geheugen',
        'holibot-qa-sync': 'geheugen', 'holibot-full-reindex': 'geheugen',
        'holibot-cleanup': 'geheugen', 'content-holibot-insights': 'geheugen',
        'session-cleanup': 'gastheer', 'comm-cleanup': 'gastheer',
        'comm-journey-processor': 'gastheer', 'comm-user-sync': 'gastheer',
        'reservation-reminder-24h': 'gastheer', 'reservation-reminder-1h': 'gastheer',
        'intermediary-reminder': 'gastheer', 'intermediary-review-request': 'gastheer',
        'media-consent-expiry-check': 'poortwachter', 'gdpr-consent-audit': 'poortwachter',
        'gdpr-retention-check': 'poortwachter', 'guest-data-retention-cleanup': 'poortwachter',
        'intermediary-guest-anonymize': 'poortwachter',
        'gdpr-export-cleanup': 'poortwachter', 'gdpr-overdue-check': 'poortwachter',
        // Development
        'dev-security-scan': 'bewaker',
        'dev-quality-report': 'corrector',
        'dev-project-audit': 'inspecteur',
        'dev-dependency-audit': 'stylist',
        // Strategy
        'agent-success-rate': 'weermeester',
        'strategy-assessment': 'architect', 'strategy-learning': 'leermeester',
        'strategy-prediction': 'weermeester', 'strategy-config-eval': 'thermostaat',
        'cost-check': 'weermeester',
        // Commerce
        'intermediary-monitor': 'makelaar',
        'financial-monitor': 'kassier', 'media-revenue-attribution': 'kassier',
        'inventory-sync': 'magazijnier',
        'release-expired-ticket-reservations': 'maestro',
        'reservation-expired-cleanup': 'maestro',
        'financial-auto-settlement': 'kassier',
        'financial-unsettled-alert': 'kassier',
        // Content
        'content-trending-scan': 'trendspotter', 'content-website-traffic': 'trendspotter',
        'content-feedback-loop': 'trendspotter', 'gsc-query-sync': 'trendspotter',
        'trending-visual-discovery': 'trendspotter', 'trending-visual-analysis': 'trendspotter',
        'trending-visual-cleanup': 'trendspotter', 'reddit-trend-discovery': 'trendspotter',
        'google-images-discovery': 'trendspotter', 'content-top25-refresh': 'trendspotter',
        'content-sources-health-check': 'trendspotter',
        'content-gap-detector': 'trendspotter', 'media-performance-aggregator': 'trendspotter',
        'content-readiness-analyzer': 'redacteur',
        'content-seo-audit': 'seoMeester', 'content-score-calibration': 'seoMeester',
        'content-publish-scheduled': 'uitgever', 'content-analytics-collect': 'uitgever',
        'content-publish-retry': 'uitgever',
      };
      const actorName = JOB_ACTOR_MAP[job.name] || 'orchestrator';
      const agentId = JOB_AGENT_MAP[job.name] || 'maestro';

    await logAgent(actorName, "job_started_" + job.name, {
      agentId,
      description: "Started job: " + job.name,
      metadata: job.data,
      status: "initiated"
    });

    let result = null;

    try {
      switch (job.name) {
        case "daily-briefing":
          try {
            const { sendDailyBriefing } = await import("./ownerInterface/index.js");
            const briefingResult = await sendDailyBriefing();
            console.log("[Orchestrator] Daily briefing sent:", briefingResult.success);
            result = briefingResult;
          } catch (error) {
            console.error("[Orchestrator] Daily briefing failed:", error.message);
            throw error;
          }
          break;

        case "cost-check":
          try {
            const { getReport } = await import("./costController/index.js");
            const report = await getReport();
            console.log("[Orchestrator] Cost check completed:", JSON.stringify({
              totalSpent: report.summary.totalSpent.toFixed(2),
              percentage: report.summary.percentageUsed.toFixed(1) + "%",
              alerts: report.alerts.length
            }));
            result = report;
          } catch (error) {
            console.error("[Orchestrator] Cost check failed:", error.message);
            throw error;
          }
          break;

        case "health-check":
          try {
            console.log("[Orchestrator] Running Platform Health Monitor...");
            const healthMonitor = await import("../agents/healthMonitor/index.js");
            const healthResult = await healthMonitor.default.runFullHealthCheck({ sendAlerts: true });
            console.log("[Orchestrator] Health check complete:", JSON.stringify({
              status: healthResult.report.overallStatus,
              checks: healthResult.report.summary.totalChecks,
              issues: healthResult.report.summary.issues,
              alertsSent: healthResult.alerts?.alertsSent || 0
            }));
            result = healthResult;
          } catch (error) {
            console.error("[Orchestrator] Health check failed:", error.message);
            // Still return a result so we know it ran
            result = { type: "health-check", status: "error", error: error.message };
          }
          break;

        case "weekly-cost-report":
          try {
            const { getReport } = await import("./costController/index.js");
            const { sendAlert } = await import("./ownerInterface/index.js");
            const report = await getReport();

            await sendAlert({
              urgency: 2,
              title: "Wekelijks Kostenoverzicht",
              message: "Budget: " + report.summary.totalSpent.toFixed(2) + " van " + report.summary.totalBudget + " (" + report.summary.percentageUsed.toFixed(1) + "%)"
            });

            console.log("[Orchestrator] Weekly cost report sent");
            result = report;
          } catch (error) {
            console.error("[Orchestrator] Weekly report failed:", error.message);
            throw error;
          }
          break;

        // Data Sync Agent jobs
        case "poi-sync-tier1":
        case "poi-sync-tier2":
        case "poi-sync-tier3":
        case "poi-sync-tier4":
        case "poi-sync-tier1-manual":
        case "poi-sync-tier2-manual":
        case "poi-sync-tier3-manual":
        case "poi-sync-tier4-manual":
          try {
            const dataSyncAgent = await import("../agents/dataSync/index.js");
            const syncResult = await dataSyncAgent.default.handleJob(job);
            console.log(`[Orchestrator] POI sync tier ${job.data.tier}:`, JSON.stringify({
              updated: syncResult.result?.updated,
              total: syncResult.result?.total
            }));
            result = syncResult;
          } catch (error) {
            console.error("[Orchestrator] POI sync failed:", error.message);
            throw error;
          }
          break;

        case "poi-tier-recalc":
        case "poi-tier-recalc-manual":
          try {
            const dataSyncRecalc = await import("../agents/dataSync/index.js");
            const recalcResult = await dataSyncRecalc.default.handleJob(job);
            console.log("[Orchestrator] POI tier recalculation:", JSON.stringify({
              total: recalcResult.result?.total,
              tierCounts: recalcResult.result?.tierCounts
            }));
            result = recalcResult;
          } catch (error) {
            console.error("[Orchestrator] POI tier recalc failed:", error.message);
            throw error;
          }
          break;

        case "tier-promotion": {
          try {
            const { default: tierPromotionAgent } = await import("../agents/dataSync/tierPromotionAgent.js");
            const promoResult = await tierPromotionAgent.run();
            console.log("[Orchestrator] Tier promotion:", JSON.stringify({
              promoted: promoResult.promoted?.length || 0,
              demoted: promoResult.demoted?.length || 0,
              errors: promoResult.errors?.length || 0,
            }));
            result = promoResult;
            break;
          } catch (error) {
            console.error("[Orchestrator] Tier promotion failed:", error.message);
            throw error;
          }
        }

        case "poi-discovery-auto":
        case "poi-discovery-quarterly":
        case "poi-discovery-annual": {
          try {
            const { default: poiDiscoveryService } = await import("../services/poiDiscovery.js");
            const dest = job.data.destination || "Calpe, Spain";
            const cats = job.data.categories || [];
            const maxPOIs = job.data.maxPOIsPerCategory || 50;
            console.log(`[Orchestrator] Auto-discovery: ${dest}, categories: ${cats.length || 'all'}`);
            const result = await poiDiscoveryService.discoverDestination({
              destination: dest,
              categories: cats,
              maxPOIsPerCategory: maxPOIs,
              sources: ["google_places"],
              autoClassify: true,
              autoEnrich: true,
              triggeredBy: "auto-scheduler",
            });
            console.log(`[Orchestrator] Auto-discovery complete:`, JSON.stringify({
              destination: dest,
              poisCreated: result.run?.pois_created || 0,
              poisUpdated: result.run?.pois_updated || 0,
            }));
            return result;
          } catch (error) {
            console.error("[Orchestrator] Auto-discovery failed:", error.message);
            throw error;
          }
        }

        case "poi-discovery-manual":
          try {
            const dataSyncDiscovery = await import("../agents/dataSync/index.js");
            const discoveryResult = await dataSyncDiscovery.default.handleJob(job);
            console.log("[Orchestrator] POI discovery:", JSON.stringify({
              found: discoveryResult.result?.found,
              added: discoveryResult.result?.added
            }));
            result = discoveryResult;
          } catch (error) {
            console.error("[Orchestrator] POI discovery failed:", error.message);
            throw error;
          }
          break;

        // === REVIEW SYNC JOBS ===
        case "review-sync-tier12":
        case "review-sync-tier34":
        case "review-sync-manual":
          try {
            const dataSyncReviews = await import("../agents/dataSync/index.js");
            const reviewResult = await dataSyncReviews.default.handleJob(job);
            console.log("[Orchestrator] Review sync:", JSON.stringify({
              tiers: job.data.tiers,
              synced: reviewResult.result?.synced || 0
            }));
            result = reviewResult;
          } catch (error) {
            console.error("[Orchestrator] Review sync failed:", error.message);
            throw error;
          }
          break;

        case "review-retention":
        case "review-retention-manual":
          try {
            const dataSyncRetention = await import("../agents/dataSync/index.js");
            const retentionResult = await dataSyncRetention.default.handleJob(job);
            console.log("[Orchestrator] Review retention:", JSON.stringify({
              deleted: retentionResult.result?.deleted || 0
            }));
            result = retentionResult;
          } catch (error) {
            console.error("[Orchestrator] Review retention failed:", error.message);
            throw error;
          }
          break;

        // === Q&A SYNC JOBS ===
        case "qa-sync-tier12":
        case "qa-sync-tier34":
        case "qa-sync-manual":
          try {
            const dataSyncQA = await import("../agents/dataSync/index.js");
            const qaResult = await dataSyncQA.default.handleJob(job);
            console.log("[Orchestrator] Q&A sync:", JSON.stringify({
              tiers: job.data.tiers,
              generated: qaResult.result?.totalGenerated || 0
            }));
            result = qaResult;
          } catch (error) {
            console.error("[Orchestrator] Q&A sync failed:", error.message);
            throw error;
          }
          break;

        // === LIFECYCLE JOBS ===
        case "poi-deactivation-check":
        case "poi-deactivation-check-manual":
          try {
            const dataSyncLifecycle = await import("../agents/dataSync/index.js");
            const deactivationResult = await dataSyncLifecycle.default.handleJob(job);
            console.log("[Orchestrator] Deactivation check:", JSON.stringify({
              processed: deactivationResult.result?.processed || 0,
              deactivated: deactivationResult.result?.deactivated || 0
            }));
            result = deactivationResult;
          } catch (error) {
            console.error("[Orchestrator] Deactivation check failed:", error.message);
            throw error;
          }
          break;

        // === HEALTH REPORT JOBS ===
        case "health-report-daily":
        case "health-report-weekly":
        case "health-report-manual":
          try {
            const dataSyncReporter = await import("../agents/dataSync/index.js");
            const reportResult = await dataSyncReporter.default.handleJob(job);
            console.log("[Orchestrator] Health report:", JSON.stringify({
              period: job.data.period,
              health: reportResult.result?.summary?.overallHealth
            }));
            result = reportResult;
          } catch (error) {
            console.error("[Orchestrator] Health report failed:", error.message);
            throw error;
          }
          break;

        // === HOLIBOT SYNC AGENT JOBS ===
        case "holibot-poi-sync":
        case "holibot-manual-pois":
          try {
            const holibotSyncPOI = await import("../agents/holibotSync/index.js");
            const poiSyncResult = await holibotSyncPOI.default.syncPOIs();
            console.log("[Orchestrator] HoliBot POI sync:", JSON.stringify({
              synced: poiSyncResult.synced,
              collection: poiSyncResult.collection
            }));
            result = poiSyncResult;
          } catch (error) {
            console.error("[Orchestrator] HoliBot POI sync failed:", error.message);
            throw error;
          }
          break;

        case "holibot-qa-sync":
        case "holibot-manual-qas":
          try {
            const holibotSyncQA = await import("../agents/holibotSync/index.js");
            const qaSyncResult = await holibotSyncQA.default.syncQAs();
            console.log("[Orchestrator] HoliBot Q&A sync:", JSON.stringify({
              synced: qaSyncResult.synced,
              collection: qaSyncResult.collection
            }));
            result = qaSyncResult;
          } catch (error) {
            console.error("[Orchestrator] HoliBot Q&A sync failed:", error.message);
            throw error;
          }
          break;

        case "holibot-full-reindex":
        case "holibot-manual-full":
          try {
            const holibotSyncFull = await import("../agents/holibotSync/index.js");
            const fullResult = await holibotSyncFull.default.fullSync();
            console.log("[Orchestrator] HoliBot full sync:", JSON.stringify({
              pois: fullResult.pois.synced,
              qas: fullResult.qas.synced
            }));
            result = fullResult;
          } catch (error) {
            console.error("[Orchestrator] HoliBot full sync failed:", error.message);
            throw error;
          }
          break;

        case "holibot-cleanup":
          try {
            const holibotSyncCleanup = await import("../agents/holibotSync/index.js");
            const cleanupResult = await holibotSyncCleanup.default.cleanup();
            console.log("[Orchestrator] HoliBot cleanup:", JSON.stringify({
              deletedPOIs: cleanupResult.deletedPOIs,
              deletedQAs: cleanupResult.deletedQAs
            }));
            result = cleanupResult;
          } catch (error) {
            console.error("[Orchestrator] HoliBot cleanup failed:", error.message);
            throw error;
          }
          break;

        // === COMMUNICATION FLOW AGENT JOBS ===
        case "comm-journey-processor":
          try {
            const commFlowJourney = await import("../agents/communicationFlow/index.js");
            const journeyResult = await commFlowJourney.default.processJourneyEmails();
            console.log("[Orchestrator] Journey emails processed:", JSON.stringify({
              processed: journeyResult.processed,
              sent: journeyResult.sent,
              failed: journeyResult.failed
            }));
            result = journeyResult;
          } catch (error) {
            console.error("[Orchestrator] Journey processor failed:", error.message);
            throw error;
          }
          break;

        case "comm-user-sync":
          try {
            const commFlowSync = await import("../agents/communicationFlow/index.js");
            const syncResult = await commFlowSync.default.syncUsers();
            console.log("[Orchestrator] Users synced to MailerLite:", JSON.stringify({
              total: syncResult.total,
              synced: syncResult.synced,
              failed: syncResult.failed
            }));
            result = syncResult;
          } catch (error) {
            console.error("[Orchestrator] User sync failed:", error.message);
            throw error;
          }
          break;

        case "comm-cleanup":
          try {
            const commFlowCleanup = await import("../agents/communicationFlow/index.js");
            const cleanupResult = await commFlowCleanup.default.cleanupJourneys();
            console.log("[Orchestrator] Journey cleanup:", JSON.stringify({
              journeysDeleted: cleanupResult.journeysDeleted
            }));
            result = cleanupResult;
          } catch (error) {
            console.error("[Orchestrator] Journey cleanup failed:", error.message);
            throw error;
          }
          break;

        // === GDPR AGENT JOBS ===
        case "gdpr-overdue-check":
          try {
            const gdprOverdue = await import("../agents/gdpr/index.js");
            const overdueResult = await gdprOverdue.default.checkOverdueRequests();
            console.log("[Orchestrator] GDPR overdue check:", JSON.stringify({
              overdueCount: overdueResult.overdueCount
            }));
            result = overdueResult;
          } catch (error) {
            console.error("[Orchestrator] GDPR overdue check failed:", error.message);
            throw error;
          }
          break;

        case "gdpr-export-cleanup":
          try {
            const gdprExportCleanup = await import("../agents/gdpr/index.js");
            const exportCleanupResult = await gdprExportCleanup.default.cleanupOldExports();
            console.log("[Orchestrator] GDPR export cleanup:", JSON.stringify({
              deleted: exportCleanupResult.deleted
            }));
            result = exportCleanupResult;
          } catch (error) {
            console.error("[Orchestrator] GDPR export cleanup failed:", error.message);
            throw error;
          }
          break;

        case "gdpr-retention-check":
          try {
            const gdprRetention = await import("../agents/gdpr/index.js");
            const retentionResult = await gdprRetention.default.checkDataRetention();
            console.log("[Orchestrator] GDPR retention check:", JSON.stringify({
              issues: retentionResult.issues?.length || 0
            }));
            result = retentionResult;
          } catch (error) {
            console.error("[Orchestrator] GDPR retention check failed:", error.message);
            throw error;
          }
          break;

        case "gdpr-consent-audit":
          try {
            const gdprConsent = await import("../agents/gdpr/index.js");
            const consentResult = await gdprConsent.default.generateConsentAudit();
            console.log("[Orchestrator] GDPR consent audit:", JSON.stringify({
              totalUsers: consentResult.statistics?.totalUsers || 0
            }));
            result = consentResult;
          } catch (error) {
            console.error("[Orchestrator] GDPR consent audit failed:", error.message);
            throw error;
          }
          break;

        // === DEVELOPMENT LAYER AGENT JOBS ===
        case "dev-security-scan":
          try {
            const securityReviewer = await import("../agents/devLayer/reviewers/securityReviewer.js");
            const securityResults = await securityReviewer.default.execute();
            console.log("[Orchestrator] Security scan completed:", JSON.stringify({
              total: securityResults.total,
              critical: securityResults.vulnerabilities?.critical || 0,
              high: securityResults.vulnerabilities?.high || 0
            }));
            result = securityResults;
          } catch (error) {
            console.error("[Orchestrator] Security scan failed:", error.message);
            throw error;
          }
          break;

        case "dev-dependency-audit":
          try {
            const uxReviewer = await import("../agents/devLayer/reviewers/uxReviewer.js");
            const perfResult = await uxReviewer.default.execute();
            const avgTtfb = Math.round(perfResult.checks.reduce((s, c) => s + (c.ttfb || 0), 0) / perfResult.checks.length);
            console.log("[Orchestrator] Performance check:", JSON.stringify({
              domains: perfResult.checks.length,
              avgTtfb: avgTtfb + "ms",
              allOk: perfResult.checks.every(c => c.status >= 200 && c.status < 400)
            }));
            result = perfResult;
          } catch (error) {
            console.error("[Orchestrator] Performance check failed:", error.message);
            throw error;
          }
          break;

        case "dev-quality-report":
          try {
            const codeReviewer = await import("../agents/devLayer/reviewers/codeReviewer.js");
            const qualityReport = await codeReviewer.default.execute();
            console.log("[Orchestrator] Quality report generated:", JSON.stringify({
              files: qualityReport.fileCount,
              consoleLogs: qualityReport.consoleLogs,
              todos: qualityReport.todos,
              eslintErrors: qualityReport.eslintErrors
            }));
            result = qualityReport;
          } catch (error) {
            console.error("[Orchestrator] Quality report failed:", error.message);
            throw error;
          }
          break;

        case "dev-project-audit":
          try {
            const qualityChecker = await import("../agents/devLayer/qualityChecker.js");
            const auditResult = await qualityChecker.default.checkProject('platform-core');
            console.log("[Orchestrator] Project audit completed:", JSON.stringify({
              project: auditResult.project,
              status: auditResult.overallStatus,
              lint: auditResult.lint?.success,
              deps: auditResult.dependencyAudit?.total
            }));
            result = auditResult;
          } catch (error) {
            console.error("[Orchestrator] Project audit failed:", error.message);
            throw error;
          }
          break;

                // === FASE 6 NEW AGENTS ===
        case "content-freshness-audit":
          try {
            const verfrisser = await import("../agents/verfrisser/index.js");
            result = await verfrisser.default.run(job.data?.destinationId || 'all');
            console.log("[Orchestrator] Freshness audit:", JSON.stringify({
              destinations: result.destinations_total,
              success: result.success
            }));
          } catch (error) {
            console.error("[Orchestrator] Freshness audit failed:", error.message);
            throw error;
          }
          break;

        case "cost-optimization-report":
          try {
            const boekhouder = await import("../agents/boekhouder/index.js");
            result = await boekhouder.default.run();
            console.log("[Orchestrator] Cost report:", JSON.stringify({
              spent: result.totalSpent,
              projected: result.projectedTotal
            }));
          } catch (error) {
            console.error("[Orchestrator] Cost report failed:", error.message);
            throw error;
          }
          break;

        case "journey-analysis":
          try {
            const reisleider = await import("../agents/reisleider/index.js");
            result = await reisleider.default.run(job.data?.destinationId || 'all');
            console.log("[Orchestrator] Journey analysis:", JSON.stringify({
              destinations: result.destinations_total,
              success: result.success
            }));
          } catch (error) {
            console.error("[Orchestrator] Journey analysis failed:", error.message);
            throw error;
          }
          break;

        
        case "translation-quality-check":
          try {
            const mod = await import("../agents/vertaler/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Vertaler:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Vertaler failed:", error.message);
            throw error;
          }
          break;

        case "image-keyword-enrichment":
          try {
            const mod = await import("../agents/beeldenmaker/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Beeldenmaker:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Beeldenmaker failed:", error.message);
            throw error;
          }
          break;

        case "personalization-stats":
          try {
            const mod = await import("../agents/personaliseerder/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Personaliseerder:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Personaliseerder failed:", error.message);
            throw error;
          }
          break;

        case "performance-watch":
          try {
            const mod = await import("../agents/performanceWachter/index.js");
            result = await mod.default.run();
            console.log("[Orchestrator] De Performance Wachter:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Performance Wachter failed:", error.message);
            throw error;
          }
          break;

        case "anomaly-detection":
          try {
            const mod = await import("../agents/anomaliedetective/index.js");
            result = await mod.default.run();
            console.log("[Orchestrator] De Anomaliedetective:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Anomaliedetective failed:", error.message);
            throw error;
          }
          break;

        case "eu-ai-act-audit":
          try {
            const mod = await import("../agents/auditeur/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Auditeur:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Auditeur failed:", error.message);
            throw error;
          }
          break;

        case "content-optimization":
          try {
            const mod = await import("../agents/optimaliseerder/index.js");
            result = await mod.default.run();
            console.log("[Orchestrator] De Optimaliseerder:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Optimaliseerder failed:", error.message);
            throw error;
          }
          break;

        case "tenant-health-check":
          try {
            const mod = await import("../agents/onthaler/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Onthaler:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Onthaler failed:", error.message);
            throw error;
          }
          break;

        case "escalation-monitor":
          try {
            const mod = await import("../agents/helpdeskmeester/index.js");
            result = await mod.default.run(job.data?.destinationId || "all");
            console.log("[Orchestrator] De Helpdeskmeester:", JSON.stringify({ success: result.success }));
          } catch (error) {
            console.error("[Orchestrator] De Helpdeskmeester failed:", error.message);
            throw error;
          }
          break;
        // === STRATEGY LAYER AGENT JOBS ===
        case "strategy-assessment":
          try {
            const strategyAssess = await import("../agents/strategyLayer/index.js");
            const assessmentResult = await strategyAssess.default.generateAssessment();
            console.log("[Orchestrator] Architecture assessment completed:", JSON.stringify({
              status: assessmentResult.status,
              score: assessmentResult.overallScore
            }));
            result = assessmentResult;
          } catch (error) {
            console.error("[Orchestrator] Architecture assessment failed:", error.message);
            throw error;
          }
          break;

        case "strategy-learning":
          try {
            const strategyLearn = await import("../agents/strategyLayer/index.js");
            const learningResult = await strategyLearn.default.learn();
            console.log("[Orchestrator] Learning cycle completed:", JSON.stringify({
              optimizations: learningResult.optimizations?.length || 0
            }));
            result = learningResult;
          } catch (error) {
            console.error("[Orchestrator] Learning cycle failed:", error.message);
            throw error;
          }
          break;

        case "strategy-prediction":
          try {
            const strategyPredict = await import("../agents/strategyLayer/index.js");
            const predictionResult = await strategyPredict.default.predict();
            console.log("[Orchestrator] Predictions completed:", JSON.stringify({
              predictions: predictionResult.predictions?.length || 0,
              alerts: predictionResult.alerts?.length || 0
            }));
            result = predictionResult;
          } catch (error) {
            console.error("[Orchestrator] Predictions failed:", error.message);
            throw error;
          }
          break;

        // === FASE 8A+ MONITORING JOBS ===
        case "content-quality-audit":
          try {
            const contentChecker = await import("../agents/dataSync/contentQualityChecker.js");
            const calpeAudit = await contentChecker.default.runContentAudit(1);
            const texelAudit = await contentChecker.default.runContentAudit(2);
            console.log("[Orchestrator] Content quality audit:", JSON.stringify({
              calpe_score: calpeAudit.overall_score,
              texel_score: texelAudit.overall_score
            }));
            result = { calpe: calpeAudit, texel: texelAudit };
          } catch (error) {
            console.error("[Orchestrator] Content quality audit failed:", error.message);
            throw error;
          }
          break;

        case "content-recycle-suggestions":
          try {
            const recycleService = await import("../agents/dataSync/contentRecycleService.js");
            const recycleResult = await recycleService.runRecycleSuggestionsAllDestinations();
            console.log("[Orchestrator] Content recycle suggestions:", JSON.stringify(recycleResult));
            result = recycleResult;
          } catch (error) {
            console.error("[Orchestrator] Content recycle suggestions failed:", error.message);
            throw error;
          }
          break;

case "media-consent-expiry-check":          try {            const { mysqlSequelize: cdb } = await import("../../config/database.js");            const [expired] = await cdb.query(              "UPDATE media SET consent_status = 'expired' WHERE consent_status = 'approved' AND license_expiry IS NOT NULL AND license_expiry < CURDATE()"            );            console.log("[Orchestrator] Media consent expiry check: updated", expired?.affectedRows || 0, "expired items");            result = { expired: expired?.affectedRows || 0 };          } catch (error) {            console.error("[Orchestrator] Media consent expiry check failed:", error.message);            throw error;          }          break;
        case "content-freshness-check":
          try {
            const freshnessService = await import("../agents/dataSync/freshnessService.js");
            const calpeResult = await freshnessService.runFreshnessCheck(1);
            const texelResult = await freshnessService.runFreshnessCheck(2);
            console.log("[Orchestrator] Content freshness check:", JSON.stringify({
              calpe: `${calpeResult.stats?.fresh || 0} fresh, ${calpeResult.stats?.stale || 0} stale`,
              texel: `${texelResult.stats?.fresh || 0} fresh, ${texelResult.stats?.stale || 0} stale`
            }));
            result = { calpe: calpeResult, texel: texelResult };
          } catch (error) {
            console.error("[Orchestrator] Content freshness check failed:", error.message);
            throw error;
          }
          break;

        case "backup-recency-check":
          try {
            const backupChecker = await import("../agents/healthMonitor/backupHealthChecker.js");
            const backupResult = await backupChecker.default.runBackupHealthCheck();
            console.log("[Orchestrator] Backup health check:", JSON.stringify({
              overall: backupResult.overall,
              mysql: backupResult.mysql?.status,
              mongodb: backupResult.mongodb?.status
            }));
            result = backupResult;
          } catch (error) {
            console.error("[Orchestrator] Backup health check failed:", error.message);
            throw error;
          }
          break;

        case "smoke-test":
          try {
            const smokeRunner = await import("../agents/healthMonitor/smokeTestRunner.js");
            const smokeResult = await smokeRunner.default.runAllSmokeTests();
            console.log("[Orchestrator] Smoke tests:", JSON.stringify({
              passed: smokeResult.total_passed,
              failed: smokeResult.total_failed,
              total: smokeResult.total_tests
            }));
            result = smokeResult;
          } catch (error) {
            console.error("[Orchestrator] Smoke tests failed:", error.message);
            throw error;
          }
          break;

        case "chromadb-state-snapshot":
          try {
            const holibotSnapshot = await import("../agents/holibotSync/index.js");
            const snapshotResult = await holibotSnapshot.default.createChromaDBSnapshot();
            console.log("[Orchestrator] ChromaDB snapshot:", JSON.stringify({
              collections: Object.keys(snapshotResult.collections || {}).length
            }));
            result = snapshotResult;
          } catch (error) {
            console.error("[Orchestrator] ChromaDB snapshot failed:", error.message);
            throw error;
          }
          break;

        case "agent-success-rate":
          try {
            const { getStats } = await import("./auditTrail/index.js");
            const weekStats = await getStats(168); // 7 days in hours
            // Aggregate per agent
            const agentStats = {};
            for (const stat of weekStats) {
              const agent = stat._id?.agent || 'unknown';
              if (!agentStats[agent]) agentStats[agent] = { total: 0, succeeded: 0, failed: 0 };
              if (stat._id?.category === 'error') {
                agentStats[agent].failed += stat.count;
              } else {
                agentStats[agent].succeeded += stat.count;
              }
              agentStats[agent].total += stat.count;
            }
            console.log("[Orchestrator] Agent success rates:", JSON.stringify({
              agents: Object.keys(agentStats).length
            }));
            result = agentStats;
          } catch (error) {
            console.error("[Orchestrator] Agent success rate failed:", error.message);
            throw error;
          }
          break;

        case "strategy-config-eval":
          try {
            const strategyConfig = await import("../agents/strategyLayer/index.js");
            // Get current metrics from health monitor if available
            let configMetrics = {};
            try {
              const healthMon = await import("../agents/healthMonitor/index.js");
              const health = await healthMon.default.runFullHealthCheck({ sendAlerts: false });
              configMetrics = {
                cpu: health.report?.checks?.server?.cpu,
                memory: health.report?.checks?.server?.memory,
                errorRate: health.report?.checks?.api?.errorRate,
                trafficMultiplier: health.report?.checks?.traffic?.multiplier
              };
            } catch (e) {
              console.log("[Orchestrator] Could not get health metrics for config eval");
            }
            const configResult = await strategyConfig.default.evaluateConfig(configMetrics);
            console.log("[Orchestrator] Config evaluation completed:", JSON.stringify({
              adaptations: configResult.adaptationsApplied?.length || 0
            }));
            result = configResult;
          } catch (error) {
            console.error("[Orchestrator] Config evaluation failed:", error.message);
            throw error;
          }
          break;

        // === TICKETING CLEANUP (Fase III-B) ===
        case "release-expired-ticket-reservations":
          try {
            const { releaseExpiredReservations } = await import("../ticketing/inventoryService.js");
            const ticketCleanup = await releaseExpiredReservations();
            if (ticketCleanup.releasedCount > 0) {
              console.log("[Orchestrator] Ticket reservation cleanup:", JSON.stringify({
                released: ticketCleanup.releasedCount,
                errors: ticketCleanup.errors.length
              }));
            }
            result = ticketCleanup;
          } catch (error) {
            console.error("[Orchestrator] Ticket reservation cleanup failed:", error.message);
            result = { type: "ticketing-cleanup", status: "error", error: error.message };
          }
          break;

        // === RESERVATION JOBS (Fase III-C) ===
        case "reservation-expired-cleanup":
          try {
            const { releaseExpiredDeposits } = await import("../reservation/reservationService.js");
            const resCleanup = await releaseExpiredDeposits();
            if (resCleanup.releasedCount > 0) {
              console.log("[Orchestrator] Reservation deposit cleanup:", JSON.stringify({ released: resCleanup.releasedCount }));
            }
            result = resCleanup;
          } catch (error) {
            console.error("[Orchestrator] Reservation deposit cleanup failed:", error.message);
            result = { type: "reservation-cleanup", status: "error", error: error.message };
          }
          break;

        case "reservation-reminder-24h":
          try {
            const { sendReminders24h } = await import("../reservation/reservationService.js");
            const reminder24 = await sendReminders24h();
            if (reminder24.sentCount > 0) {
              console.log("[Orchestrator] Reservation 24h reminders:", JSON.stringify({ sent: reminder24.sentCount }));
            }
            result = reminder24;
          } catch (error) {
            console.error("[Orchestrator] Reservation 24h reminder failed:", error.message);
            result = { type: "reservation-reminder-24h", status: "error", error: error.message };
          }
          break;

        case "reservation-reminder-1h":
          try {
            const { sendReminders1h } = await import("../reservation/reservationService.js");
            const reminder1h = await sendReminders1h();
            if (reminder1h.sentCount > 0) {
              console.log("[Orchestrator] Reservation 1h reminders:", JSON.stringify({ sent: reminder1h.sentCount }));
            }
            result = reminder1h;
          } catch (error) {
            console.error("[Orchestrator] Reservation 1h reminder failed:", error.message);
            result = { type: "reservation-reminder-1h", status: "error", error: error.message };
          }
          break;

        case "guest-data-retention-cleanup":
          try {
            const { cleanupGuestData } = await import("../reservation/reservationService.js");
            const gdprCleanup = await cleanupGuestData();
            if (gdprCleanup.deletedCount > 0) {
              console.log("[Orchestrator] Guest GDPR cleanup:", JSON.stringify({ deleted: gdprCleanup.deletedCount }));
            }
            result = gdprCleanup;
          } catch (error) {
            console.error("[Orchestrator] Guest GDPR cleanup failed:", error.message);
            result = { type: "reservation-gdpr", status: "error", error: error.message };
          }
          break;

        case "intermediary-reminder":
          try {
            const intermediaryRem = (await import("../intermediary/intermediaryService.js")).default;
            const iReminder = await intermediaryRem.sendReminders();
            if (iReminder.sentCount > 0) {
              console.log("[Orchestrator] Intermediary reminders:", JSON.stringify({ sent: iReminder.sentCount }));
            }
            result = iReminder;
          } catch (error) {
            console.error("[Orchestrator] Intermediary reminder failed:", error.message);
            result = { type: "intermediary-reminder", status: "error", error: error.message };
          }
          break;

        case "intermediary-review-request":
          try {
            const intermediaryRev = (await import("../intermediary/intermediaryService.js")).default;
            const iReview = await intermediaryRev.requestReviews();
            if (iReview.sentCount > 0) {
              console.log("[Orchestrator] Intermediary review requests:", JSON.stringify({ sent: iReview.sentCount }));
            }
            result = iReview;
          } catch (error) {
            console.error("[Orchestrator] Intermediary review request failed:", error.message);
            result = { type: "intermediary-review-request", status: "error", error: error.message };
          }
          break;

        case "financial-auto-settlement":
          try {
            const finSvc = (await import("../financial/financialService.js")).default;
            // Auto-create settlement batch for previous month for all active destinations
            const now = new Date();
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const periodStart = prevMonth.toISOString().split('T')[0];
            const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            const destIds = [1, 2]; // calpe, texel
            const results = [];
            for (const destId of destIds) {
              try {
                const batch = await finSvc.createSettlementBatch(destId, periodStart, periodEnd, 'system@cron');
                results.push({ destId, batchNumber: batch.batch_number, partners: batch.total_partner_count });
              } catch (e) {
                results.push({ destId, skipped: true, reason: e.message });
              }
            }
            console.log("[Orchestrator] Financial auto-settlement:", JSON.stringify(results));
            result = { type: "financial-auto-settlement", results };
          } catch (error) {
            console.error("[Orchestrator] Financial auto-settlement failed:", error.message);
            result = { type: "financial-auto-settlement", status: "error", error: error.message };
          }
          break;

        case "financial-unsettled-alert":
          try {
            const finSvc2 = (await import("../financial/financialService.js")).default;
            const { QueryTypes: QT } = (await import("sequelize")).default;
            const { mysqlSequelize: db } = await import("../../config/database.js");
            // Check for transactions unsettled >30 days across all destinations
            const unsettled = await db.query(
              `SELECT destination_id, COUNT(*) as cnt, SUM(partner_amount_cents) as total_cents
               FROM intermediary_transactions
               WHERE status IN ('bevestiging','delen','reminder','review')
                 AND confirmed_at IS NOT NULL
                 AND confirmed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
                 AND settlement_batch_id IS NULL
               GROUP BY destination_id`,
              { type: QT.SELECT }
            );
            if (unsettled.length > 0) {
              await finSvc2.logFinancialEvent(null, 'unsettled_alert', 'system', 0, {
                actorType: 'cron',
                details: { unsettled }
              });
              console.log("[Orchestrator] Financial unsettled alert:", JSON.stringify(unsettled));
            }
            result = { type: "financial-unsettled-alert", destinations: unsettled.length, alerts: unsettled };
          } catch (error) {
            console.error("[Orchestrator] Financial unsettled alert failed:", error.message);
            result = { type: "financial-unsettled-alert", status: "error", error: error.message };
          }
          break;

        // === FASE IV-D: COMMERCE MONITORING AGENTS ===
        case "intermediary-monitor":
          try {
            const intermediaryMon = (await import("../agents/intermediaryMonitor/index.js")).default;
            const destIds = [1, 2]; // calpe, texel
            const imResults = {};
            for (const dId of destIds) {
              try {
                imResults[dId] = await intermediaryMon.runForDestination(dId);
              } catch (e) {
                imResults[dId] = { error: e.message };
              }
            }
            const totalStuck = Object.values(imResults).reduce((s, r) => s + (r.stuck_transactions?.total || 0), 0);
            const totalEscalations = Object.values(imResults).reduce((s, r) => s + (r.escalations?.length || 0), 0);
            if (totalStuck > 0 || totalEscalations > 0) {
              console.log("[Orchestrator] Intermediary monitor:", JSON.stringify({
                stuck: totalStuck, escalations: totalEscalations
              }));
            }
            result = { type: "intermediary-monitor", results: imResults };
          } catch (error) {
            console.error("[Orchestrator] Intermediary monitor failed:", error.message);
            result = { type: "intermediary-monitor", status: "error", error: error.message };
          }
          break;

        case "financial-monitor":
          try {
            const financialMon = (await import("../agents/financialMonitor/index.js")).default;
            const fmResult = await financialMon.execute();
            console.log("[Orchestrator] Financial monitor:", JSON.stringify({
              reconciled: fmResult.reconciliation?.all_reconciled,
              anomalies: fmResult.anomalies?.length || 0,
              fraud_indicators: fmResult.fraud_indicators?.length || 0
            }));
            result = fmResult;
          } catch (error) {
            console.error("[Orchestrator] Financial monitor failed:", error.message);
            result = { type: "financial-monitor", status: "error", error: error.message };
          }
          break;

        case "intermediary-guest-anonymize":
          try {
            const { mysqlSequelize: anonDb } = await import("../../config/database.js");
            const [anonymizeResult] = await anonDb.query(
              `UPDATE intermediary_transactions
               SET guest_name = 'geanonimiseerd', guest_email = NULL, guest_phone = NULL
               WHERE activity_date < DATE_SUB(NOW(), INTERVAL 24 MONTH)
                 AND guest_name IS NOT NULL AND guest_name != 'geanonimiseerd'`
            );
            const anonymized = anonymizeResult?.affectedRows || 0;
            console.log(`[Orchestrator] Intermediary guest anonymize: ${anonymized} records`);
            result = { type: "intermediary-guest-anonymize", anonymized };
          } catch (error) {
            console.error("[Orchestrator] Guest anonymize failed:", error.message);
            result = { type: "intermediary-guest-anonymize", status: "error", error: error.message };
          }
          break;

        case "inventory-sync":
          try {
            const inventorySync = (await import("../agents/inventorySync/index.js")).default;
            const destIds = [1, 2]; // calpe, texel
            const isResults = {};
            for (const dId of destIds) {
              try {
                isResults[dId] = await inventorySync.runForDestination(dId);
              } catch (e) {
                isResults[dId] = { error: e.message };
              }
            }
            const totalMismatches = Object.values(isResults).reduce((s, r) => s + (r.ticket_inventory_sync?.mismatch_count || 0), 0);
            const totalStaleInv = Object.values(isResults).reduce((s, r) => s + (r.stale_reservations?.total || 0), 0);
            if (totalMismatches > 0 || totalStaleInv > 0) {
              console.log("[Orchestrator] Inventory sync:", JSON.stringify({
                mismatches: totalMismatches, stale: totalStaleInv
              }));
            }
            result = { type: "inventory-sync", results: isResults };
          } catch (error) {
            console.error("[Orchestrator] Inventory sync failed:", error.message);
            result = { type: "inventory-sync", status: "error", error: error.message };
          }
          break;

        case "content-trending-scan":
          try {
            const trendspotter = (await import("../agents/trendspotter/index.js")).default;
            const destIds = [1, 2, 4]; // calpe, texel, warrewijzer
            const trendResults = {};
            for (const dId of destIds) {
              try {
                trendResults[dId] = await trendspotter.runForDestination(dId);
              } catch (e) {
                trendResults[dId] = { error: e.message };
              }
            }
            const totalCollected = Object.values(trendResults).reduce((s, r) => s + (r.collected || 0), 0);
            const totalAggregated = Object.values(trendResults).reduce((s, r) => s + (r.aggregated || 0), 0);
            console.log(`[Orchestrator] Content trending scan: collected=${totalCollected}, aggregated=${totalAggregated}`);
            result = { type: "content-trending-scan", results: trendResults };
          } catch (error) {
            console.error("[Orchestrator] Content trending scan failed:", error.message);
            result = { type: "content-trending-scan", status: "error", error: error.message };
          }
          break;

        case "content-website-traffic":
          try {
            const trafficCollector = (await import("../agents/trendspotter/websiteTrafficCollector.js")).default;
            const trendAggregatorTraffic = (await import("../agents/trendspotter/trendAggregator.js")).default;
            const trafficResults = {};
            for (const dId of [1, 2]) {
              try {
                const trends = await trafficCollector.collect(dId);
                if (trends.length > 0) {
                  trafficResults[dId] = await trendAggregatorTraffic.aggregate(dId, trends);
                } else {
                  trafficResults[dId] = { saved: 0, total: 0 };
                }
              } catch (e) {
                trafficResults[dId] = { error: e.message };
              }
            }
            console.log(`[Orchestrator] Website traffic analysis complete`);
            result = { type: "content-website-traffic", results: trafficResults };
          } catch (error) {
            console.error("[Orchestrator] Website traffic analysis failed:", error.message);
            result = { type: "content-website-traffic", status: "error", error: error.message };
          }
          break;

        case "content-seo-audit":
          try {
            const seoMeester = (await import("../agents/seoMeester/index.js")).default;
            const seoResult = await seoMeester.execute();
            console.log(`[Orchestrator] Content SEO audit: audited=${seoResult.audited}, avgScore=${seoResult.avgScore}`);
            result = { type: "content-seo-audit", ...seoResult };
          } catch (error) {
            console.error("[Orchestrator] Content SEO audit failed:", error.message);
            result = { type: "content-seo-audit", status: "error", error: error.message };
          }
          break;

        case "content-publish-scheduled":
          try {
            const publisher = (await import("../agents/publisher/index.js")).default;
            const publishResults = await publisher.processScheduledPublications();
            console.log(`[Orchestrator] Scheduled publications processed: ${publishResults.length}`);
            result = { type: "content-publish-scheduled", published: publishResults.length, results: publishResults };
          } catch (error) {
            console.error("[Orchestrator] Scheduled publish failed:", error.message);
            result = { type: "content-publish-scheduled", status: "error", error: error.message };
          }
          break;

        case "content-analytics-collect":
          try {
            const publisherAnalytics = (await import("../agents/publisher/index.js")).default;
            const analyticsResults = {};
            for (const dId of [1, 2]) {
              try {
                analyticsResults[dId] = await publisherAnalytics.collectAnalytics(dId);
              } catch (e) {
                analyticsResults[dId] = { error: e.message };
              }
            }
            console.log(`[Orchestrator] Content analytics collected for ${Object.keys(analyticsResults).length} destinations`);
            result = { type: "content-analytics-collect", results: analyticsResults };
          } catch (error) {
            console.error("[Orchestrator] Content analytics collection failed:", error.message);
            result = { type: "content-analytics-collect", status: "error", error: error.message };
          }
          break;

        case "content-feedback-loop":
          try {
            const feedbackLoop = (await import("../agents/trendspotter/feedbackLoop.js")).default;
            const feedbackResults = {};
            for (const dId of [1, 2]) {
              try {
                feedbackResults[dId] = await feedbackLoop.run(dId);
              } catch (e) {
                feedbackResults[dId] = { error: e.message };
              }
            }
            const totalUpdated = Object.values(feedbackResults).reduce((s, r) => s + (r.updated || 0), 0);
            console.log(`[Orchestrator] Content feedback loop: ${totalUpdated} keywords updated`);
            result = { type: "content-feedback-loop", results: feedbackResults };
          } catch (error) {
            console.error("[Orchestrator] Content feedback loop failed:", error.message);
            result = { type: "content-feedback-loop", status: "error", error: error.message };
          }
          break;

        case "content-score-calibration":
          try {
            const { calibrateScoring } = await import("../agents/seoMeester/scoreCalibration.js");
            const calibrationResults = {};
            for (const dId of [1, 2]) {
              try {
                calibrationResults[dId] = await calibrateScoring(dId);
              } catch (e) {
                calibrationResults[dId] = { error: e.message };
              }
            }
            const totalCalibrated = Object.values(calibrationResults).reduce((s, r) => s + (r.calibrated || 0), 0);
            console.log(`[Orchestrator] Score calibration: ${totalCalibrated} items calibrated`);
            result = { type: "content-score-calibration", results: calibrationResults };
          } catch (error) {
            console.error("[Orchestrator] Score calibration failed:", error.message);
            result = { type: "content-score-calibration", status: "error", error: error.message };
          }
          break;

        case "seasonal-check":
          try {
            const { checkSeasonTransitions } = await import("../content/seasonalEngine.js");
            const transitions = await checkSeasonTransitions();
            console.log(`[Orchestrator] Seasonal check: ${transitions.length} transitions detected`);
            result = { type: "seasonal-check", transitions };
          } catch (error) {
            console.error("[Orchestrator] Seasonal check failed:", error.message);
            result = { type: "seasonal-check", status: "error", error: error.message };
          }
          break;

        case "content-publish-retry":
          try {
            const { mysqlSequelize: dbRetry } = await import("../../config/database.js");
            // Find failed items that haven't exceeded max retries (3)
            const [failedItems] = await dbRetry.query(
              `SELECT ci.id, ci.title, ci.target_platform, ci.destination_id, ci.publish_error,
                      (SELECT COUNT(*) FROM content_approval_log WHERE content_item_id = ci.id AND comment LIKE '%retry%') as retry_count
               FROM content_items ci
               WHERE ci.approval_status = 'failed'
                 AND ci.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
               HAVING retry_count < 3
               LIMIT 5`
            );
            if (failedItems.length > 0) {
              for (const item of failedItems) {
                await dbRetry.query(
                  `UPDATE content_items SET approval_status = 'scheduled', publish_error = NULL, scheduled_at = NOW(), updated_at = NOW() WHERE id = :id`,
                  { replacements: { id: item.id } }
                );
                await dbRetry.query(
                  `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
                   VALUES (:id, 'failed', 'scheduled', 'system', :comment)`,
                  { replacements: { id: item.id, comment: `Auto-retry #${(item.retry_count || 0) + 1}. Previous: ${item.publish_error || 'unknown'}` } }
                );
              }
              console.log(`[Orchestrator] Content publish retry: ${failedItems.length} items re-scheduled`);
            }
            result = { type: "content-publish-retry", retried: failedItems.length };
          } catch (error) {
            console.error("[Orchestrator] Content publish retry failed:", error.message);
            result = { type: "content-publish-retry", status: "error", error: error.message };
          }
          break;

        case "content-weekly-report":
          try {
            const { mysqlSequelize: db } = await import("../../config/database.js");
            const destIds = [1, 2, 4];
            const reportResults = {};
            for (const destId of destIds) {
              const [published] = await db.query(
                `SELECT COUNT(*) as cnt FROM content_items
                 WHERE destination_id = :destId AND approval_status = 'published'
                   AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
                { replacements: { destId } }
              );
              const [perf] = await db.query(
                `SELECT SUM(views) as total_views, SUM(engagement) as total_engagement,
                        SUM(reach) as total_reach, SUM(clicks) as total_clicks
                 FROM content_performance
                 WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
                { replacements: { destId } }
              );
              const [topItem] = await db.query(
                `SELECT ci.title, SUM(cp.engagement) as eng
                 FROM content_performance cp
                 JOIN content_items ci ON ci.id = cp.content_item_id
                 WHERE cp.destination_id = :destId AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                 GROUP BY ci.id, ci.title ORDER BY eng DESC LIMIT 1`,
                { replacements: { destId } }
              );
              reportResults[destId] = {
                published: published[0]?.cnt || 0,
                totalViews: perf[0]?.total_views || 0,
                totalEngagement: perf[0]?.total_engagement || 0,
                totalReach: perf[0]?.total_reach || 0,
                topPerformer: topItem[0]?.title || 'N/A',
              };
            }
            // Send via De Bode (owner interface)
            try {
              const { sendWeeklyContentReport } = await import("./ownerInterface/index.js");
              if (typeof sendWeeklyContentReport === 'function') {
                await sendWeeklyContentReport(reportResults);
              }
            } catch (bodeErr) {
              console.log("[Orchestrator] Weekly report email skipped:", bodeErr.message);
            }
            console.log("[Orchestrator] Content weekly report generated:", JSON.stringify(reportResults));
            result = { type: "content-weekly-report", reports: reportResults };
          } catch (error) {
            console.error("[Orchestrator] Content weekly report failed:", error.message);
            result = { type: "content-weekly-report", status: "error", error: error.message };
          }
          break;

        case "content-holibot-insights":
          try {
            const holibotInsightsService = (await import("../services/visual/holibotInsightsService.js")).default;
            const insightDestIds = [1, 2]; // calpe, texel (active destinations with chatbot)
            const insightResults = {};
            for (const dId of insightDestIds) {
              try {
                insightResults[dId] = await holibotInsightsService.analyzeWeek(dId);
              } catch (e) {
                insightResults[dId] = { error: e.message };
              }
            }
            const totalInsights = Object.values(insightResults).reduce(function(s, r) { return s + (r.insights || 0); }, 0);
            console.log("[Orchestrator] HoliBot insights analysis: " + totalInsights + " insights extracted");
            result = { type: "content-holibot-insights", results: insightResults };
          } catch (error) {
            console.error("[Orchestrator] HoliBot insights analysis failed:", error.message);
            result = { type: "content-holibot-insights", status: "error", error: error.message };
          }
          break;

        case "gsc-query-sync":
          try {
            const gscSyncService = (await import("../services/visual/gscSyncService.js")).default;
            const gscDestIds = [1, 2]; // calpe, texel
            const gscResults = {};
            for (const dId of gscDestIds) {
              try {
                gscResults[dId] = await gscSyncService.syncQueries(dId);
              } catch (e) {
                gscResults[dId] = { error: e.message };
              }
            }
            const totalSynced = Object.values(gscResults).reduce(function(s, r) { return s + (r.synced || 0); }, 0);
            console.log("[Orchestrator] GSC query sync: " + totalSynced + " queries synced");
            result = { type: "gsc-query-sync", results: gscResults };
          } catch (error) {
            console.error("[Orchestrator] GSC query sync failed:", error.message);
            result = { type: "gsc-query-sync", status: "error", error: error.message };
          }
          break;

        case "trending-visual-discovery":
          try {
            const vtd = (await import("../services/visual/visualTrendDiscovery.js")).default;
            const discResults = {};
            for (const dId of [1, 2, 10]) {
              try { discResults[dId] = await vtd.discoverForDestination(dId); }
              catch (e) { discResults[dId] = { error: e.message }; }
            }
            const totalDisc = Object.values(discResults).reduce(function(s, r) { return s + (r.discovered || 0); }, 0);
            console.log("[Orchestrator] Visual discovery: " + totalDisc + " new visuals");
            result = { type: "trending-visual-discovery", results: discResults };
          } catch (error) {
            console.error("[Orchestrator] Visual discovery failed:", error.message);
            result = { type: "trending-visual-discovery", status: "error", error: error.message };
          }
          break;

        case "trending-visual-analysis":
          try {
            const vta = (await import("../services/visual/visualAnalyzer.js")).default;
            const anaResults = {};
            for (const dId of [1, 2, 10]) {
              try { anaResults[dId] = await vta.batchAnalyze(dId); }
              catch (e) { anaResults[dId] = { error: e.message }; }
            }
            const totalAna = Object.values(anaResults).reduce(function(s, r) { return s + (r.analyzed || 0); }, 0);
            console.log("[Orchestrator] Visual analysis: " + totalAna + " visuals analyzed");
            result = { type: "trending-visual-analysis", results: anaResults };
          } catch (error) {
            console.error("[Orchestrator] Visual analysis failed:", error.message);
            result = { type: "trending-visual-analysis", status: "error", error: error.message };
          }
          break;

        case "trending-visual-cleanup":
          try {
            const { mysqlSequelize: cleanDb } = await import("../../config/database.js");
            const { QueryTypes: CleanQT } = await import("sequelize");
            const cleanCfg = (await import("../../config/visualDiscoveryConfig.js")).default;
            const dismissedDays = cleanCfg.cleanup.dismissedRetentionDays || 30;
            const maxAgeDays = cleanCfg.cleanup.discoveredMaxAgeDays || 90;
            const [r1] = await cleanDb.query("DELETE FROM trending_visuals WHERE status = 'dismissed' AND discovered_at < DATE_SUB(NOW(), INTERVAL " + dismissedDays + " DAY)", { type: CleanQT.DELETE });
            const [r2] = await cleanDb.query("DELETE FROM trending_visuals WHERE status = 'discovered' AND discovered_at < DATE_SUB(NOW(), INTERVAL " + maxAgeDays + " DAY)", { type: CleanQT.DELETE });
            console.log("[Orchestrator] Visual cleanup: dismissed=" + r1 + " old_discovered=" + r2);
            result = { type: "trending-visual-cleanup", dismissed_removed: r1, old_removed: r2 };
          } catch (error) {
            console.error("[Orchestrator] Visual cleanup failed:", error.message);
            result = { type: "trending-visual-cleanup", status: "error", error: error.message };
          }
          break;

        case "reddit-trend-discovery":
          try {
            const vtdReddit = (await import("../services/visual/visualTrendDiscovery.js")).default;
            const redditResults = {};
            for (const dId of [1, 2, 10]) {
              try { redditResults[dId] = await vtdReddit.discoverForDestination(dId, ["reddit"]); }
              catch (e) { redditResults[dId] = { error: e.message }; }
            }
            const totalReddit = Object.values(redditResults).reduce(function(s, r) { return s + (r.discovered || 0); }, 0);
            console.log("[Orchestrator] Reddit discovery: " + totalReddit + " new visuals");
            result = { type: "reddit-trend-discovery", results: redditResults };
          } catch (error) {
            console.error("[Orchestrator] Reddit discovery failed:", error.message);
            result = { type: "reddit-trend-discovery", status: "error", error: error.message };
          }
          break;

        case "google-images-discovery":
          try {
            const vtdGoogle = (await import("../services/visual/visualTrendDiscovery.js")).default;
            const googleResults = {};
            for (const dId of [1, 2, 10]) {
              try { googleResults[dId] = await vtdGoogle.discoverForDestination(dId, ["google_images"]); }
              catch (e) { googleResults[dId] = { error: e.message }; }
            }
            const totalGoogle = Object.values(googleResults).reduce(function(s, r) { return s + (r.discovered || 0); }, 0);
            console.log("[Orchestrator] Google Images discovery: " + totalGoogle + " new visuals");
            result = { type: "google-images-discovery", results: googleResults };
          } catch (error) {
            console.error("[Orchestrator] Google Images discovery failed:", error.message);
            result = { type: "google-images-discovery", status: "error", error: error.message };
          }
          break;

        case "content-top25-refresh":
          try {
            const top25Svc = (await import("../services/visual/contentTop25Service.js")).default;
            const refreshResults = {};
            for (const dId of [1, 2, 10]) {
              try {
                top25Svc.clearCache(dId);
                refreshResults[dId] = await top25Svc.getTop25(dId, { refresh: true });
                console.log("[Orchestrator] Top 25 refreshed for dest " + dId + ": " + refreshResults[dId].total_count + " items");
              } catch (e) { refreshResults[dId] = { error: e.message }; }
            }
            result = { type: "content-top25-refresh", results: refreshResults };
          } catch (error) {
            console.error("[Orchestrator] Top 25 refresh failed:", error.message);
            result = { type: "content-top25-refresh", status: "error", error: error.message };
          }
          break;

        case "content-sources-health-check":
          try {
            const { mysqlSequelize: hcDb } = await import("../../config/database.js");
            const { QueryTypes: HcQT } = await import("sequelize");
            const report = [];
            for (const dId of [1, 2]) {
              const [kwCount] = await hcDb.query("SELECT COUNT(*) as c FROM trending_data WHERE destination_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)", { replacements: [dId], type: HcQT.SELECT });
              const [visCount] = await hcDb.query("SELECT COUNT(*) as c FROM trending_visuals WHERE destination_id = ? AND discovered_at > DATE_SUB(NOW(), INTERVAL 7 DAY)", { replacements: [dId], type: HcQT.SELECT });
              const [insCount] = await hcDb.query("SELECT COUNT(*) as c FROM holibot_insights WHERE destination_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)", { replacements: [dId], type: HcQT.SELECT });
              if ((kwCount.c || 0) < 5) report.push({ destination_id: dId, source: "keywords", status: "low", count: kwCount.c });
              if ((visCount.c || 0) < 3) report.push({ destination_id: dId, source: "visuals", status: "low", count: visCount.c });
              if ((insCount.c || 0) === 0) report.push({ destination_id: dId, source: "holibot", status: "empty", count: 0 });
            }
            console.log("[Orchestrator] Content sources health check: " + report.length + " issues");
            result = { type: "content-sources-health-check", issues: report };
          } catch (error) {
            console.error("[Orchestrator] Health check failed:", error.message);
            result = { type: "content-sources-health-check", status: "error", error: error.message };
          }
          break;

        case 'media-performance-aggregator': {
          const { aggregatePerformance } = await import('../media/mediaPerformanceService.js');
          const { mysqlSequelize } = await import('../../config/database.js');
          const { QueryTypes } = await import('sequelize');
          const mpDests = await mysqlSequelize.query('SELECT id FROM destinations WHERE status = "active"', { type: QueryTypes.SELECT });
          let mpTotal = 0;
          for (const dest of mpDests) { const r = await aggregatePerformance(dest.id, 90); mpTotal += r.count; }
          console.log('[Orchestrator] Media performance aggregated: ' + mpTotal);
          result = { type: 'media-performance-aggregator', aggregated: mpTotal };
          break;
        }

        case 'media-revenue-attribution': {
          const { attributeRevenue } = await import('../media/mediaAttributionService.js');
          const { mysqlSequelize } = await import('../../config/database.js');
          const { QueryTypes } = await import('sequelize');
          const revDests = await mysqlSequelize.query('SELECT id FROM destinations WHERE status = "active"', { type: QueryTypes.SELECT });
          const now = new Date();
          const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          let revTotal = 0;
          for (const dest of revDests) {
            const r = await attributeRevenue(dest.id, prevYear, prevMonth);
            revTotal += r.attributedMedia;
          }
          console.log('[Orchestrator] Revenue attribution: ' + revTotal + ' media attributed for ' + prevYear + '-' + prevMonth);
          result = { type: 'media-revenue-attribution', attributed: revTotal, period: prevYear + '-' + prevMonth };
          break;
        }

        case 'content-readiness-analyzer': {
          const { getReadinessReport, storeReport } = await import('../media/contentReadinessService.js');
          const { mysqlSequelize } = await import('../../config/database.js');
          const { QueryTypes } = await import('sequelize');
          const rdDests = await mysqlSequelize.query('SELECT id FROM destinations WHERE status = "active"', { type: QueryTypes.SELECT });
          for (const dest of rdDests) {
            const report = await getReadinessReport(dest.id, 7);
            await storeReport(dest.id, report);
          }
          console.log('[Orchestrator] Content readiness reports generated for ' + rdDests.length + ' destinations');
          result = { type: 'content-readiness-analyzer', destinations: rdDests.length };
          break;
        }

        case 'content-gap-detector': {
          const { mysqlSequelize } = await import('../../config/database.js');
          const { QueryTypes } = await import('sequelize');
          const gapDests = await mysqlSequelize.query('SELECT id FROM destinations WHERE status = "active"', { type: QueryTypes.SELECT });
          let gapTotal = 0;
          for (const dest of gapDests) {
            const gaps = await mysqlSequelize.query(
              'SELECT poi_id, COUNT(*) as cnt FROM chatbot_visual_queries WHERE destination_id = ? AND had_good_match = 0 AND poi_id IS NOT NULL AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY poi_id HAVING cnt >= 3 ORDER BY cnt DESC LIMIT 10',
              { replacements: [dest.id], type: QueryTypes.SELECT }
            );
            for (const gap of gaps) {
              const [existing] = await mysqlSequelize.query("SELECT id FROM content_suggestions WHERE destination_id = ? AND source = 'chatbot_gap' AND title LIKE ? AND status != 'deleted'", { replacements: [dest.id, '%POI ' + gap.poi_id + '%'], type: QueryTypes.SELECT });
              if (!existing) {
                const [poi] = await mysqlSequelize.query('SELECT name FROM POI WHERE id = ?', { replacements: [gap.poi_id], type: QueryTypes.SELECT });
                const title = 'Content-gap: ' + (poi ? poi.name : 'POI ' + gap.poi_id) + ' — ' + gap.cnt + ' vragen zonder match';
                await mysqlSequelize.query("INSERT INTO content_suggestions (destination_id, title, summary, content_type, source, status, engagement_score) VALUES (?, ?, 'Bezoekers vragen via chatbot maar geen goede media beschikbaar', 'social_post', 'chatbot_gap', 'pending', ?)", { replacements: [dest.id, title, gap.cnt] });
                gapTotal++;
              }
            }
          }
          console.log('[Orchestrator] Content gap detector: ' + gapTotal + ' suggestions');
          result = { type: 'content-gap-detector', newSuggestions: gapTotal };
          break;
        }

        default:
          console.log("[Orchestrator] Unknown job type: " + job.name);
          result = { type: job.name, status: "unknown" };
      }

      // Map job names to their owning agent for accurate status tracking

      await logAgent(actorName, "job_completed_" + job.name, {
        agentId,
        description: "Completed job: " + job.name,
        duration: Date.now() - startTime,
        result: { success: true, data: result }
      });

      // Materialized agent status update (Laag 2 — enterprise dashboard)
      await updateAgentStatus(agentId, {
        jobName: job.name,
        action: "job_completed_" + job.name,
        status: 'completed',
        duration: Date.now() - startTime,
        destinationId: job.data?.destinationId || null
      });

      return { success: true, processedAt: new Date().toISOString(), result };

    } catch (error) {
      await logError(actorName, error, {
        agentId,
        job: job.name,
        data: job.data,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }, { connection });

  // Alert Worker
  alertWorker = new Worker("alerts", async (job) => {
    const startTime = Date.now();
    console.log("[Orchestrator] Processing alert: " + job.name);

    try {
      if (job.name === "budget-alert") {
        const alertData = job.data;
        console.log("[Orchestrator] Budget alert:", JSON.stringify(alertData));

        const { sendAlert } = await import("./ownerInterface/index.js");
        
        const urgencyMap = {
          "warning": 3,
          "high": 4,
          "critical": 5
        };
        
        const result = await sendAlert({
          urgency: urgencyMap[alertData.level] || 3,
          title: "Budget Alert: " + alertData.service,
          message: alertData.message,
          metadata: alertData
        });

        return { success: true, alertSent: result.success };
      }

      if (job.data.urgency) {
        const { sendAlert } = await import("./ownerInterface/index.js");
        return sendAlert(job.data);
      }

      return { success: true };
    } catch (error) {
      await logError("alert-worker", error, { job: job.name, data: job.data });
      throw error;
    }
  }, { connection });

  // Main Orchestrator Worker
  orchestratorWorker = new Worker("orchestrator", async (job) => {
    const startTime = Date.now();
    console.log("[Orchestrator] Processing task: " + job.name);

    await logAgent("orchestrator-main", "task_started_" + job.name, {
      description: "Processing orchestrator task: " + job.name,
      metadata: job.data,
      status: "initiated"
    });

    try {
      if (job.name === "critical-alert") {
        const { criticalAlert } = await import("./ownerInterface/index.js");
        const result = await criticalAlert(job.data.type, job.data.details);
        return result;
      }

      await logAgent("orchestrator-main", "task_completed_" + job.name, {
        description: "Completed orchestrator task: " + job.name,
        duration: Date.now() - startTime,
        result: { success: true }
      });

      return { success: true };
    } catch (error) {
      await logError("orchestrator-main", error, { job: job.name, data: job.data });
      throw error;
    }
  }, { connection });

  // Content Generation Worker — long-running Mistral AI generation jobs.
  // Survives PM2 restarts (jobs persisted in Redis), retries on failure,
  // and on final failure marks the concept as 'draft' so the frontend recovers.
  contentGenerationWorker = new Worker("content-generation", async (job) => {
    if (job.name !== "generate-concept") {
      throw new Error("Unknown content-generation job: " + job.name);
    }

    const { conceptId, suggestionId, destinationId, contentType, platforms, pillarId, personaId } = job.data;
    console.log(`[ContentGen] Processing concept ${conceptId} (${platforms.length} platforms)`);

    const { mysqlSequelize } = await import("../../config/database.js");
    const { generateContent } = await import("../agents/contentRedacteur/contentGenerator.js");

    // Load suggestion fresh (in case it was updated)
    const [[suggestion]] = await mysqlSequelize.query(
      "SELECT * FROM content_suggestions WHERE id = ?",
      { replacements: [Number(suggestionId)] }
    );
    if (!suggestion) throw new Error(`Suggestion ${suggestionId} not found`);
    if (typeof suggestion.keyword_cluster === "string") {
      try { suggestion.keyword_cluster = JSON.parse(suggestion.keyword_cluster); } catch { /* */ }
    }

    // If this suggestion is from an agenda event, fetch the event image
    let eventImageUrl = null;
    if (suggestion.event_source_id) {
      try {
        const [[evtRow]] = await mysqlSequelize.query("SELECT image FROM agenda WHERE id = ?", { replacements: [suggestion.event_source_id] });
        if (evtRow && evtRow.image) eventImageUrl = evtRow.image;
      } catch (e) { /* non-blocking */ }
    }

    // If from a visual trend, use the visual's thumbnail as primary image
    let visualImageUrl = null;
    if (suggestion.visual_source_id) {
      try {
        const [[visRow]] = await mysqlSequelize.query("SELECT thumbnail_url FROM trending_visuals WHERE id = ?", { replacements: [suggestion.visual_source_id] });
        if (visRow && visRow.thumbnail_url) visualImageUrl = visRow.thumbnail_url;
      } catch (e) { /* non-blocking */ }
    }

    // Determine content_source_type from suggestion data
    let itemSourceType = 'manual';
    let itemSourceId = null;
    if (suggestion.event_source_id) {
      itemSourceType = 'event';
      itemSourceId = suggestion.event_source_id;
    } else if (suggestion.poi_source_id || suggestion.poi_id) {
      itemSourceType = 'poi';
      itemSourceId = suggestion.poi_source_id || suggestion.poi_id;
    } else if (suggestion.visual_source_id) {
      itemSourceType = 'visual';
      itemSourceId = suggestion.visual_source_id;
    } else if (suggestion.source === 'holibot' || (suggestion.title && suggestion.summary && suggestion.summary.startsWith('Chatbot thema:'))) {
      itemSourceType = 'holibot';
    } else if (suggestion.source === 'recycle') {
      itemSourceType = 'recycle';
    }

    const generatedItems = [];
    for (const platform of platforms) {
      try {
        const generated = await generateContent(suggestion, {
          destinationId: Number(destinationId),
          contentType,
          platform,
          personaId: personaId || null,
        });

        const [itemResult] = await mysqlSequelize.query(
          `INSERT INTO content_items (concept_id, destination_id, suggestion_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
           seo_data, seo_score, social_metadata, media_ids, target_platform, approval_status, ai_model, ai_generated, poi_id, pillar_id, keyword_cluster,
           content_source_type, content_source_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 1, ?, ?, ?, ?, ?, NOW(), NOW())`,
          { replacements: [
            conceptId, Number(destinationId), suggestion.id, contentType,
            generated.title || suggestion.title,
            generated.body_en || "", generated.body_nl || null,
            generated.body_de || null, generated.body_es || null, generated.body_fr || null,
            generated.seo_data ? JSON.stringify(generated.seo_data) : null,
            generated.seo_score || null,
            generated.social_metadata ? JSON.stringify(generated.social_metadata) : null,
            visualImageUrl ? JSON.stringify([visualImageUrl]) : (eventImageUrl ? JSON.stringify([eventImageUrl]) : (generated.media_ids ? JSON.stringify(generated.media_ids) : null)),
            platform, generated.ai_model || "mistral-medium-latest",
            suggestion.poi_id || null, pillarId || null,
            JSON.stringify(generated.keyword_cluster || suggestion.keyword_cluster || []),
            itemSourceType,
            itemSourceId,
          ]}
        );
        generatedItems.push({ id: itemResult, platform, title: generated.title });
      } catch (platErr) {
        console.warn(`[ContentGen] Platform ${platform} failed: ${platErr.message}`);
      }
    }

    // Update suggestion + concept
    await mysqlSequelize.query(
      "UPDATE content_suggestions SET status = 'generated', updated_at = NOW() WHERE id = ?",
      { replacements: [suggestion.id] }
    );
    const finalTitle = generatedItems[0]?.title || suggestion.title;
    await mysqlSequelize.query(
      "UPDATE content_concepts SET title = ?, approval_status = 'draft', updated_at = NOW() WHERE id = ?",
      { replacements: [finalTitle, conceptId] }
    );

    console.log(`[ContentGen] Concept ${conceptId} done: ${generatedItems.length}/${platforms.length} items`);
    return { conceptId, itemCount: generatedItems.length };
  }, { connection, concurrency: 2, lockDuration: 600000 }); // 10 min lock for long Mistral calls

  // On final failure (after retries) — recover the concept so frontend stops polling
  contentGenerationWorker.on("failed", async (job, err) => {
    console.error(`[ContentGen] Job failed: concept=${job?.data?.conceptId} attempt=${job?.attemptsMade}/${job?.opts?.attempts} err=${err.message}`);
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      try {
        const { mysqlSequelize } = await import("../../config/database.js");
        await mysqlSequelize.query(
          "UPDATE content_concepts SET approval_status = 'draft', updated_at = NOW() WHERE id = ? AND approval_status = 'generating'",
          { replacements: [job.data.conceptId] }
        );
      } catch (e) { console.error("[ContentGen] Recovery update failed:", e.message); }
    }
  });

  // Error handlers
  scheduledWorker.on("failed", (job, err) => {
    console.error("[Orchestrator] Scheduled job failed: " + (job?.name || "unknown"), err.message);
  });

  alertWorker.on("failed", (job, err) => {
    console.error("[Orchestrator] Alert job failed: " + (job?.name || "unknown"), err.message);
  });

  orchestratorWorker.on("failed", (job, err) => {
    console.error("[Orchestrator] Orchestrator job failed: " + (job?.name || "unknown"), err.message);
  });

  console.log("[Orchestrator] Workers started");
  console.log("[Orchestrator] - Scheduled Tasks Worker: active");
  console.log("[Orchestrator] - Alert Worker: active");
  console.log("[Orchestrator] - Orchestrator Worker: active");
  console.log("[Orchestrator] - Audit Trail: active");
  console.log("[Orchestrator] - Owner Interface: active");
  console.log("[Orchestrator] - Data Sync Agent: active");
  console.log("[Orchestrator] - HoliBot Sync Agent: active");
  console.log("[Orchestrator] - Communication Flow Agent: active");
  console.log("[Orchestrator] - GDPR Agent: active");
  console.log("[Orchestrator] - Development Layer Agent: active");
  console.log("[Orchestrator] - Strategy Layer Agent: active");
  console.log("[Orchestrator] - Intermediary Monitor Agent (De Makelaar): active");
  console.log("[Orchestrator] - Financial Monitor Agent (De Kassier): active");
  console.log("[Orchestrator] - Inventory Sync Agent (De Magazijnier): active");
  console.log("[Orchestrator] - Content Generation Worker: active");
  startMediaWorker();
  console.log("[Orchestrator] - Media Processing Worker: active");
}

export async function stopWorkers() {
  console.log("[Orchestrator] Stopping workers...");

  await logSystem("workers_stopping", {
    description: "Orchestrator workers shutting down"
  }).catch(err => console.error("[Audit] Failed to log shutdown:", err.message));

  if (scheduledWorker) await scheduledWorker.close();
  if (alertWorker) await alertWorker.close();
  if (orchestratorWorker) await orchestratorWorker.close();
  if (contentGenerationWorker) await contentGenerationWorker.close();
  await stopMediaWorker();
  console.log("[Orchestrator] Workers stopped");
}

export { scheduledWorker, alertWorker, orchestratorWorker, contentGenerationWorker, mediaWorker };
