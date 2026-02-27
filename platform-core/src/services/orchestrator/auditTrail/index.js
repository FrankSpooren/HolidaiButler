import auditLogger from "./auditLogger.js";

// Convenience exports
const log = (params) => auditLogger.log(params);
const logAgent = (name, action, details) => auditLogger.logAgentAction(name, action, details);
const logSystem = (action, details) => auditLogger.logSystemEvent(action, details);
const logAlert = (level, message, details) => auditLogger.logAlert(level, message, details);
const logError = (source, error, context) => auditLogger.logError(source, error, context);

// Queries
const getRecent = (limit) => auditLogger.getRecent(limit);
const getPendingApprovals = () => auditLogger.getPendingApprovals();
const getStats = (hours) => auditLogger.getStats(hours);

/**
 * Shared system health summary — used by both GET /dashboard and De Bode daily email.
 * Single source of truth for alert/error/job counts from audit_logs (24h window).
 * @param {number} hours - Time window in hours (default 24)
 * @returns {{ jobs: number, alerts: number, errors: number }}
 */
async function getSystemHealthSummary(hours = 24) {
  const stats = await auditLogger.getStats(hours);

  const jobCount = stats
    .filter(s => s._id?.category === 'job')
    .reduce((sum, s) => sum + s.count, 0);
  const alertCount = stats
    .filter(s => s._id?.category === 'alert')
    .reduce((sum, s) => sum + s.count, 0);
  const errorCount = stats
    .filter(s => s._id?.category === 'error')
    .reduce((sum, s) => sum + s.count, 0);

  return { jobs: jobCount, alerts: alertCount, errors: errorCount };
}

/**
 * Agent runtime metrics — P50/P90/avg duration per agent over the last N hours.
 * Used by admin dashboard and De Bode briefing.
 * @param {number} hours - Time window (default 168 = 7 days)
 * @returns {Array<{ agent, jobCount, avgDuration, p50, p90 }>}
 */
async function getAgentRuntimeMetrics(hours = 168) {
  try {
    if (!auditLogger.isMongoConnected()) return [];
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const entries = await db.collection('audit_logs')
      .find({
        category: 'job',
        status: 'completed',
        timestamp: { $gte: since },
        duration: { $gt: 0 }
      })
      .project({ 'actor.name': 1, duration: 1 })
      .toArray();

    // Group by agent
    const byAgent = {};
    for (const e of entries) {
      const name = e.actor?.name || 'unknown';
      if (!byAgent[name]) byAgent[name] = [];
      byAgent[name].push(e.duration);
    }

    // Calculate metrics per agent
    return Object.entries(byAgent).map(([agent, durations]) => {
      durations.sort((a, b) => a - b);
      const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      const p90 = durations[Math.floor(durations.length * 0.9)] || 0;
      return { agent, jobCount: durations.length, avgDuration: avg, p50, p90 };
    }).sort((a, b) => b.jobCount - a.jobCount);
  } catch (e) {
    console.error('[AuditTrail] Runtime metrics error:', e.message);
    return [];
  }
}

export {
  auditLogger,
  log,
  logAgent,
  logSystem,
  logAlert,
  logError,
  getRecent,
  getPendingApprovals,
  getStats,
  getSystemHealthSummary,
  getAgentRuntimeMetrics
};

export default auditLogger;
