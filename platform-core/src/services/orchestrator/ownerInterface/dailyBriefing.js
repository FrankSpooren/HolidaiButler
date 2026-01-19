import emailService from "./emailService.js";

/**
 * Daily Briefing Generator
 *
 * Generates daily briefing data and sends via MailerLite automation.
 * Uses custom fields for template population.
 *
 * @module ownerInterface/dailyBriefing
 */

async function generateDailyBriefing() {
  console.log("[DailyBriefing] Generating...");

  // Dynamic imports voor circular dependency prevention
  let costReport = {
    summary: { totalSpent: 0, totalBudget: 515, remaining: 515, percentageUsed: 0 },
    alerts: []
  };
  let auditStats = [];
  let pendingApprovals = [];

  try {
    const { getReport } = await import("../costController/index.js");
    costReport = await getReport();
  } catch (error) {
    console.log("[DailyBriefing] Cost report unavailable:", error.message);
  }

  try {
    const { getStats, getPendingApprovals } = await import("../auditTrail/index.js");
    auditStats = await getStats(24);
    pendingApprovals = await getPendingApprovals();
  } catch (error) {
    console.log("[DailyBriefing] Audit stats unavailable:", error.message);
  }

  // Format date in Dutch
  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Calculate stats
  const jobCount = auditStats
    .filter(s => s._id?.category === "job")
    .reduce((sum, s) => sum + s.count, 0);
  const alertCount = auditStats
    .filter(s => s._id?.category === "alert")
    .reduce((sum, s) => sum + s.count, 0);
  const errorCount = auditStats
    .filter(s => s._id?.category === "error")
    .reduce((sum, s) => sum + s.count, 0);

  // Determine status
  let statusSummary = "✅ Systeem OK";
  if (errorCount > 0) {
    statusSummary = `⚠️ ${errorCount} error(s) gedetecteerd`;
  }
  if (costReport.alerts.length > 0) {
    statusSummary = `⚠️ ${costReport.alerts.length} budget alert(s)`;
  }
  if (pendingApprovals.length > 0) {
    statusSummary = `📋 ${pendingApprovals.length} item(s) wachten op goedkeuring`;
  }
  if (errorCount > 5 || costReport.summary.percentageUsed > 90) {
    statusSummary = "🚨 Actie vereist - check dashboard";
  }

  // Build fields for MailerLite template
  const fields = {
    briefing_date: today,
    budget_spent: `€${costReport.summary.totalSpent.toFixed(2)}`,
    budget_percentage: `${costReport.summary.percentageUsed.toFixed(1)}%`,
    budget_total: `€${costReport.summary.totalBudget}`,
    budget_remaining: `€${costReport.summary.remaining.toFixed(2)}`,
    jobs_count: String(jobCount),
    alerts_count: String(alertCount),
    errors_count: String(errorCount),
    pending_count: String(pendingApprovals.length),
    status_summary: statusSummary
  };

  return {
    fields,
    summary: {
      budget: costReport.summary,
      pendingApprovals: pendingApprovals.length,
      alerts: costReport.alerts.length,
      jobs: jobCount,
      errors: errorCount
    }
  };
}

async function sendDailyBriefing() {
  const briefing = await generateDailyBriefing();

  const subject = `Daily Briefing - ${new Date().toLocaleDateString("nl-NL")}`;
  const priority = briefing.summary.alerts > 0 || briefing.summary.errors > 0
    ? "high"
    : "normal";

  console.log(`  Subject: ${subject}`);
  console.log(`  Fields:`, JSON.stringify(briefing.fields, null, 2));

  const result = await emailService.sendTransactional({
    subject,
    fields: briefing.fields,
    priority
  });

  console.log("[DailyBriefing] Result:", result.status);
  return { ...result, summary: briefing.summary };
}

export { generateDailyBriefing, sendDailyBriefing };
