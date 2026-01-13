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
          console.log("[Orchestrator] Generating daily briefing for owners...");
          // TODO: Implement owner briefing logic
          result = { type: "daily-briefing", status: "generated" };
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
          // TODO: Implement health check logic
          result = { type: "health-check", status: "healthy" };
          break;

        case "weekly-cost-report":
          try {
            const { getReport } = await import("./costController/index.js");
            const report = await getReport();
            console.log("[Orchestrator] Weekly cost report generated");
            // TODO: Send report via email
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

      // Log job completion
      await logAgent("orchestrator", "job_completed_" + job.name, {
        description: "Completed job: " + job.name,
        duration: Date.now() - startTime,
        result: { success: true, data: result }
      });

      return { success: true, processedAt: new Date().toISOString(), result };

    } catch (error) {
      // Log error
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
        console.log("[Orchestrator] Budget alert:", JSON.stringify(job.data));

        // Log the alert
        await logAlert(job.data.level, job.data.message, {
          metadata: job.data
        });

        // TODO: Send alert to Owner Interface Agent
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
      // TODO: Implement main orchestration logic

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
