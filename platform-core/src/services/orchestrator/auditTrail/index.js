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
  getSystemHealthSummary
};

export default auditLogger;
