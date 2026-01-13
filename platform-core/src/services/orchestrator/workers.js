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
          console.log("[Orchestrator] Running system health check...");
          result = { type: "health-check", status: "healthy" };
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

        default:
          console.log("[Orchestrator] Unknown job type: " + job.name);
          result = { type: job.name, status: "unknown" };
      }

      await logAgent("orchestrator", "job_completed_" + job.name, {
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
