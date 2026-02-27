import { Worker } from "bullmq";
import { connection } from "./queues.js";
import { logAgent, logError, logSystem, logAlert } from "./auditTrail/index.js";

let scheduledWorker = null;
let alertWorker = null;
let orchestratorWorker = null;

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
    await logAgent("orchestrator", "job_started_" + job.name, {
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
              todos: qualityReport.todos
            }));
            result = qualityReport;
          } catch (error) {
            console.error("[Orchestrator] Quality report failed:", error.message);
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

        default:
          console.log("[Orchestrator] Unknown job type: " + job.name);
          result = { type: job.name, status: "unknown" };
      }

      // Map job names to their owning agent for accurate status tracking
      const JOB_ACTOR_MAP = {
        'health-check': 'health-monitor',
        'smoke-test': 'health-monitor',
        'backup-recency-check': 'health-monitor',
        'content-quality-audit': 'data-sync',
        'chromadb-state-snapshot': 'holibot-sync',
        'agent-success-rate': 'strategy-layer',
        'gdpr-consent-audit': 'gdpr',
        'gdpr-retention-check': 'gdpr',
        'session-cleanup': 'communication-flow'
      };
      const actorName = JOB_ACTOR_MAP[job.name] || 'orchestrator';
      await logAgent(actorName, "job_completed_" + job.name, {
        description: "Completed job: " + job.name,
        duration: Date.now() - startTime,
        result: { success: true, data: result }
      });

      return { success: true, processedAt: new Date().toISOString(), result };

    } catch (error) {
      await logError("orchestrator", error, {
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
}

export async function stopWorkers() {
  console.log("[Orchestrator] Stopping workers...");

  await logSystem("workers_stopping", {
    description: "Orchestrator workers shutting down"
  }).catch(err => console.error("[Audit] Failed to log shutdown:", err.message));

  if (scheduledWorker) await scheduledWorker.close();
  if (alertWorker) await alertWorker.close();
  if (orchestratorWorker) await orchestratorWorker.close();
  console.log("[Orchestrator] Workers stopped");
}

export { scheduledWorker, alertWorker, orchestratorWorker };
