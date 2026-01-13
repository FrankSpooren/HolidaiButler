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

export {
  auditLogger,
  log,
  logAgent,
  logSystem,
  logAlert,
  logError,
  getRecent,
  getPendingApprovals,
  getStats
};

export default auditLogger;
