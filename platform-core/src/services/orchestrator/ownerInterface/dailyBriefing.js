import emailService from "./emailService.js";

/**
 * De Bode — Daily Briefing Generator
 *
 * Generates daily briefing data with per-destination stats,
 * prediction alerts, optimization suggestions, content quality,
 * backup health, and smoke test results.
 * Sends via MailerLite automation using custom fields.
 *
 * Section ordering (Fase 8A+):
 * 1. ALERTS (critical items — always on top)
 * 2. SMOKE TESTS (daily 07:45)
 * 3. BACKUPS (daily 07:30)
 * 4. POI & Reviews per destination
 * 5. CONTENT QUALITY (weekly Monday audit)
 * 6. Predictions
 * 7. Agent Status
 * 8. Budget
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

  // === Fase 8A+ / 8B — Smoke Test Results + Threema Status ===
  let smokeTestSummary = "Geen recente test";
  let threemaStatus = "UNKNOWN";
  try {
    const smokeRunner = await import("../../agents/healthMonitor/smokeTestRunner.js");
    const latestSmoke = await smokeRunner.default.getLatestResult();
    if (latestSmoke && (Date.now() - new Date(latestSmoke.timestamp).getTime()) < 25 * 60 * 60 * 1000) {
      const calpeSmoke = latestSmoke.destinations?.calpe;
      const texelSmoke = latestSmoke.destinations?.texel;
      const infraSmoke = latestSmoke.infrastructure;
      const parts = [];
      if (calpeSmoke) parts.push(`Calpe: ${calpeSmoke.tests_passed}/${calpeSmoke.tests_total} PASS`);
      if (texelSmoke) parts.push(`Texel: ${texelSmoke.tests_passed}/${texelSmoke.tests_total} PASS`);
      if (infraSmoke) parts.push(`Infra: ${infraSmoke.tests_passed}/${infraSmoke.tests_total} PASS`);
      smokeTestSummary = parts.join(" | ");
      if (latestSmoke.total_failed > 0) {
        const failNames = [];
        for (const dest of Object.values(latestSmoke.destinations || {})) {
          for (const f of (dest.failures || [])) failNames.push(f.name);
        }
        for (const f of (latestSmoke.infrastructure?.failures || [])) failNames.push(f.name);
        smokeTestSummary += ` | FAILURES: ${failNames.join(', ')}`;
      }
      // Threema status from smoke test (Fase 8B)
      if (latestSmoke.threema) {
        threemaStatus = latestSmoke.threema.status || 'UNKNOWN';
        smokeTestSummary += ` | Threema: ${threemaStatus}`;
      }
    }
  } catch (error) {
    console.log("[De Bode] Smoke test data unavailable:", error.message);
  }

  // === Fase 8A+ — Backup Health ===
  let backupSummary = "Geen recente check";
  try {
    const backupChecker = await import("../../agents/healthMonitor/backupHealthChecker.js");
    const latestBackup = await backupChecker.default.getLatestCheck();
    if (latestBackup && (Date.now() - new Date(latestBackup.timestamp).getTime()) < 25 * 60 * 60 * 1000) {
      const mysql = latestBackup.mysql || {};
      const mongodb = latestBackup.mongodb || {};
      const disk = latestBackup.disk || {};
      const mysqlInfo = mysql.lastBackup
        ? `${new Date(mysql.lastBackup).toLocaleDateString('nl-NL')} (${mysql.size_mb}MB)`
        : (mysql.error || 'onbekend');
      const mongoInfo = mongodb.lastBackup
        ? `${new Date(mongodb.lastBackup).toLocaleDateString('nl-NL')} (${mongodb.size_mb}MB)`
        : (mongodb.error || 'onbekend');
      backupSummary = `MySQL: ${mysqlInfo} — ${mysql.status} | MongoDB: ${mongoInfo} — ${mongodb.status} | Disk: ${disk.root_pct}%`;
      if (latestBackup.overall === 'CRITICAL') {
        backupSummary = `CRITICAL: ${backupSummary}`;
      }
    }
  } catch (error) {
    console.log("[De Bode] Backup data unavailable:", error.message);
  }

  // === Fase 8A+ — Content Quality ===
  let contentQualitySummary = "Geen recente audit";
  try {
    const contentChecker = await import("../../agents/dataSync/contentQualityChecker.js");
    const calpeAudit = await contentChecker.default.getLatestAudit(1);
    const texelAudit = await contentChecker.default.getLatestAudit(2);
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;

    if (calpeAudit && new Date(calpeAudit.timestamp).getTime() > eightDaysAgo) {
      const calpeInfo = `Calpe: ${calpeAudit.completeness?.completeness_pct || '?'}% compleet | ${calpeAudit.consistency?.flagged || 0} flags | Score: ${calpeAudit.overall_score}/10`;
      const texelInfo = texelAudit && new Date(texelAudit.timestamp).getTime() > eightDaysAgo
        ? `Texel: ${texelAudit.completeness?.completeness_pct || '?'}% compleet | ${texelAudit.consistency?.flagged || 0} flags | Score: ${texelAudit.overall_score}/10`
        : 'Texel: geen audit';
      const auditDate = new Date(calpeAudit.timestamp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      contentQualitySummary = `(${auditDate}) ${calpeInfo} | ${texelInfo}`;
    }
  } catch (error) {
    console.log("[De Bode] Content quality data unavailable:", error.message);
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

  // Determine status (considers smoke test + backup failures too)
  let statusSummary = "Systeem OK";
  const alertItems = [];
  if (errorCount > 0) {
    statusSummary = `${errorCount} error(s) gedetecteerd`;
    alertItems.push(`${errorCount} error(s) gedetecteerd`);
  }
  if (costReport.alerts.length > 0) {
    statusSummary = `${costReport.alerts.length} budget alert(s)`;
    alertItems.push(`${costReport.alerts.length} budget alert(s)`);
  }
  if (pendingApprovals.length > 0) {
    statusSummary = `${pendingApprovals.length} item(s) wachten op goedkeuring`;
  }
  if (predictionAlerts.length > 0) {
    statusSummary = `${predictionAlerts.length} voorspellingswaarschuwing(en)`;
    alertItems.push(`${predictionAlerts.length} voorspellingswaarschuwing(en)`);
  }
  // Fase 8B: Threema alert if not configured
  if (threemaStatus === 'NOT_CONFIGURED') {
    alertItems.push('Threema NIET GECONFIGUREERD — urgentie 5 alerts alleen via email');
  }
  if (errorCount > 5 || costReport.summary.percentageUsed > 90) {
    statusSummary = "Actie vereist - check dashboard";
  }

  // Build fields for MailerLite template
  // Section ordering (Fase 8B): alerts → smoke → backups → destinations → content → predictions → agents → budget
  const fields = {
    briefing_date: today,
    // Status (top)
    status_summary: statusSummary,
    // Alerts (Fase 8B: includes Threema warning)
    alert_items: alertItems.length > 0 ? alertItems.join(" | ") : "Geen waarschuwingen",
    // Smoke Tests (8A+ + 8B Threema)
    smoke_test_summary: smokeTestSummary,
    // Backups (8A+)
    backup_summary: backupSummary,
    // Destinations (8B: per-destination aggregated)
    calpe_pois: String(destinationStats.calpe.activePois || "?"),
    texel_pois: String(destinationStats.texel.activePois || "?"),
    calpe_reviews: String(destinationStats.calpe.reviewCount || "?"),
    texel_reviews: String(destinationStats.texel.reviewCount || "?"),
    // Content Quality (8A+)
    content_quality_summary: contentQualitySummary,
    // Predictions
    prediction_alerts: String(predictionAlerts.length),
    prediction_summary: predictionAlerts.length > 0
      ? predictionAlerts.slice(0, 3).map(a => `${a.name || a.metric}: ${a.risk || a.trend}`).join("; ")
      : "Geen waarschuwingen",
    // Operations
    jobs_count: String(jobCount),
    alerts_count: String(alertCount),
    errors_count: String(errorCount),
    pending_count: String(pendingApprovals.length),
    // Optimizations
    optimization_count: String(optimizationCount),
    // Threema (Fase 8B)
    threema_status: threemaStatus,
    // Budget
    budget_spent: `${costReport.summary.totalSpent.toFixed(2)}`,
    budget_percentage: `${costReport.summary.percentageUsed.toFixed(1)}%`,
    budget_total: `${costReport.summary.totalBudget}`,
    budget_remaining: `${costReport.summary.remaining.toFixed(2)}`
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
      optimizations: optimizationCount,
      smokeTests: smokeTestSummary,
      backups: backupSummary,
      contentQuality: contentQualitySummary,
      threemaStatus
    }
  };
}

async function sendDailyBriefing() {
  const briefing = await generateDailyBriefing();

  const subject = `Daily Briefing - ${new Date().toLocaleDateString("nl-NL")}`;
  const hasCritical = briefing.summary.alerts > 0 || briefing.summary.errors > 0 || briefing.summary.predictionAlerts > 0;
  const priority = hasCritical ? "high" : "normal";

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
