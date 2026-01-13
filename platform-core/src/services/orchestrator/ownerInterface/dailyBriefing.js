import emailService from "./emailService.js";

async function generateDailyBriefing() {
  console.log("[DailyBriefing] Generating...");

  // Dynamic imports voor circular dependency prevention
  let costReport = { summary: { totalSpent: 0, totalBudget: 500, remaining: 500, percentageUsed: 0 }, alerts: [] };
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

  // Format date
  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Calculate stats
  const jobCount = auditStats.filter(s => s._id.category === "job").reduce((sum, s) => sum + s.count, 0);
  const alertCount = auditStats.filter(s => s._id.category === "alert").reduce((sum, s) => sum + s.count, 0);
  const errorCount = auditStats.filter(s => s._id.category === "error").reduce((sum, s) => sum + s.count, 0);

  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #7FA594, #4A7066); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; }
        .content { background: white; padding: 20px; }
        .section { padding: 15px 0; border-bottom: 1px solid #eee; }
        .section:last-child { border-bottom: none; }
        .section h2 { color: #4A7066; margin-top: 0; font-size: 16px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #4A7066; }
        .metric-label { font-size: 12px; color: #666; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert-critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .status-ok { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 15px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏖️ HolidaiButler Daily Briefing</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${today}</p>
      </div>

      <div class="content">
        <div class="section">
          <h2>💰 Budget Status</h2>
          <div class="metric">
            <div class="metric-value">€${costReport.summary.totalSpent.toFixed(2)}</div>
            <div class="metric-label">Uitgegeven deze maand</div>
          </div>
          <div class="metric">
            <div class="metric-value">${costReport.summary.percentageUsed.toFixed(1)}%</div>
            <div class="metric-label">Van €${costReport.summary.totalBudget} budget</div>
          </div>
          <div class="metric">
            <div class="metric-value ${costReport.summary.remaining > 100 ? 'status-ok' : 'status-warning'}">
              €${costReport.summary.remaining.toFixed(2)}
            </div>
            <div class="metric-label">Resterend</div>
          </div>
        </div>

        <div class="section">
          <h2>📊 Systeem Activiteit (24u)</h2>
          <div class="metric">
            <div class="metric-value">${jobCount}</div>
            <div class="metric-label">Jobs uitgevoerd</div>
          </div>
          <div class="metric">
            <div class="metric-value">${alertCount}</div>
            <div class="metric-label">Alerts verzonden</div>
          </div>
          <div class="metric">
            <div class="metric-value ${errorCount > 0 ? 'status-warning' : 'status-ok'}">${errorCount}</div>
            <div class="metric-label">Errors</div>
          </div>
        </div>

        ${pendingApprovals.length > 0 ? `
        <div class="section">
          <h2>⏳ Wachtend op Goedkeuring (${pendingApprovals.length})</h2>
          ${pendingApprovals.map(a => `
            <div class="alert alert-warning">
              <strong>${a.action}</strong><br>
              ${a.description || "Geen beschrijving"}
            </div>
          `).join("")}
        </div>
        ` : ""}

        ${costReport.alerts.length > 0 ? `
        <div class="section">
          <h2>⚠️ Actieve Alerts</h2>
          ${costReport.alerts.map(a => `
            <div class="alert ${a.level === "critical" ? "alert-critical" : "alert-warning"}">
              ${a.message}
            </div>
          `).join("")}
        </div>
        ` : ""}
      </div>

      <div class="footer">
        <p>HolidaiButler Orchestrator Agent v1.0</p>
        <p>Automatisch gegenereerd om 08:00 Amsterdam tijd</p>
      </div>
    </body>
    </html>
  `;

  return {
    html,
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

  const result = await emailService.sendTransactional({
    subject: "Daily Briefing - " + new Date().toLocaleDateString("nl-NL"),
    html: briefing.html,
    priority: briefing.summary.alerts > 0 ? "high" : "normal"
  });

  console.log("[DailyBriefing] Sent:", result.success);
  return { ...result, summary: briefing.summary };
}

export { generateDailyBriefing, sendDailyBriefing };
