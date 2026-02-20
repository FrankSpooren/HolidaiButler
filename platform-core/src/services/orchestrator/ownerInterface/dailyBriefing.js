import emailService from "./emailService.js";

/**
 * De Bode — Daily Briefing Generator
 *
 * Generates daily briefing data with per-destination stats,
 * prediction alerts, and optimization suggestions.
 * Sends via MailerLite automation using custom fields.
 *
 * @module ownerInterface/dailyBriefing
 */

async function generateDailyBriefing() {
  console.log("[De Bode] Generating daily briefing...");

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
    console.log("[De Bode] Cost report unavailable:", error.message);
  }

  try {
    const { getStats, getPendingApprovals } = await import("../auditTrail/index.js");
    auditStats = await getStats(24);
    pendingApprovals = await getPendingApprovals();
  } catch (error) {
    console.log("[De Bode] Audit stats unavailable:", error.message);
  }

  // Fetch per-destination stats from MySQL
  let destinationStats = { calpe: {}, texel: {} };
  try {
    const { mysqlSequelize } = await import("../../../config/database.js");

    const [poiCounts] = await mysqlSequelize.query(`
      SELECT destination_id,
        COUNT(*) as total_pois,
        SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active_pois
      FROM POI GROUP BY destination_id
    `);

    const [reviewCounts] = await mysqlSequelize.query(`
      SELECT destination_id, COUNT(*) as review_count,
        ROUND(AVG(rating), 1) as avg_rating
      FROM reviews GROUP BY destination_id
    `);

    for (const row of poiCounts) {
      const key = row.destination_id === 2 ? 'texel' : 'calpe';
      destinationStats[key].activePois = row.active_pois || 0;
      destinationStats[key].totalPois = row.total_pois || 0;
    }
    for (const row of reviewCounts) {
      const key = row.destination_id === 2 ? 'texel' : 'calpe';
      destinationStats[key].reviewCount = row.review_count || 0;
      destinationStats[key].avgRating = row.avg_rating || 0;
    }
  } catch (error) {
    console.log("[De Bode] Destination stats unavailable:", error.message);
  }

  // Fetch prediction alerts from De Weermeester
  let predictionAlerts = [];
  try {
    const strategyLayer = await import("../../agents/strategyLayer/index.js");
    const predictions = await strategyLayer.default.predict();
    predictionAlerts = predictions.alerts || [];
  } catch (error) {
    console.log("[De Bode] Prediction data unavailable:", error.message);
  }

  // Fetch optimization suggestions from De Leermeester
  let optimizationCount = 0;
  try {
    const strategyLayer = await import("../../agents/strategyLayer/index.js");
    const history = strategyLayer.default.getLearningHistory(1);
    if (history.length > 0 && history[0].optimizations) {
      optimizationCount = history[0].optimizations.length;
    }
  } catch (error) {
    console.log("[De Bode] Learning data unavailable:", error.message);
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
  if (predictionAlerts.length > 0) {
    statusSummary = `🔮 ${predictionAlerts.length} voorspellingswaarschuwing(en)`;
  }
  if (errorCount > 5 || costReport.summary.percentageUsed > 90) {
    statusSummary = "🚨 Actie vereist - check dashboard";
  }

  // Build fields for MailerLite template
  const fields = {
    briefing_date: today,
    // Budget
    budget_spent: `€${costReport.summary.totalSpent.toFixed(2)}`,
    budget_percentage: `${costReport.summary.percentageUsed.toFixed(1)}%`,
    budget_total: `€${costReport.summary.totalBudget}`,
    budget_remaining: `€${costReport.summary.remaining.toFixed(2)}`,
    // Operations
    jobs_count: String(jobCount),
    alerts_count: String(alertCount),
    errors_count: String(errorCount),
    pending_count: String(pendingApprovals.length),
    // Status
    status_summary: statusSummary,
    // Destinations (NEW in 8A)
    calpe_pois: String(destinationStats.calpe.activePois || "?"),
    texel_pois: String(destinationStats.texel.activePois || "?"),
    calpe_reviews: String(destinationStats.calpe.reviewCount || "?"),
    texel_reviews: String(destinationStats.texel.reviewCount || "?"),
    // Predictions (NEW in 8A)
    prediction_alerts: String(predictionAlerts.length),
    prediction_summary: predictionAlerts.length > 0
      ? predictionAlerts.slice(0, 3).map(a => `${a.name || a.metric}: ${a.risk || a.trend}`).join("; ")
      : "Geen waarschuwingen",
    // Optimizations (NEW in 8A)
    optimization_count: String(optimizationCount)
  };

  return {
    fields,
    summary: {
      budget: costReport.summary,
      pendingApprovals: pendingApprovals.length,
      alerts: costReport.alerts.length,
      jobs: jobCount,
      errors: errorCount,
      destinations: destinationStats,
      predictionAlerts: predictionAlerts.length,
      optimizations: optimizationCount
    }
  };
}

async function sendDailyBriefing() {
  const briefing = await generateDailyBriefing();

  const subject = `Daily Briefing - ${new Date().toLocaleDateString("nl-NL")}`;
  const priority = briefing.summary.alerts > 0 || briefing.summary.errors > 0 || briefing.summary.predictionAlerts > 0
    ? "high"
    : "normal";

  console.log(`[De Bode] Subject: ${subject}`);
  console.log(`[De Bode] Fields:`, JSON.stringify(briefing.fields, null, 2));

  const result = await emailService.sendTransactional({
    subject,
    fields: briefing.fields,
    priority
  });

  console.log("[De Bode] Briefing sent:", result.status);
  return { ...result, summary: briefing.summary };
}

export { generateDailyBriefing, sendDailyBriefing };
