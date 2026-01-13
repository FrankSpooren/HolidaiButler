import AuditLog from "./models/AuditLog.js";

class AuditLogger {

  // Log een actie
  async log(params) {
    const {
      actor,
      action,
      category,
      description,
      target,
      metadata,
      status = "completed",
      result,
      duration
    } = params;

    try {
      const log = new AuditLog({
        actor,
        action,
        category,
        description,
        target,
        metadata,
        status,
        result,
        duration,
        environment: process.env.NODE_ENV || "production"
      });

      await log.save();

      // Console log voor development
      if (process.env.NODE_ENV !== "production") {
        console.log("[Audit] " + actor.type + ":" + actor.name + " - " + action + " - " + status);
      }

      return log;
    } catch (error) {
      console.error("[AuditLogger] Error:", error.message);
      // Dont throw - audit logging should not break the app
      return null;
    }
  }

  // Convenience methods
  async logAgentAction(agentName, action, details = {}) {
    return this.log({
      actor: { type: "agent", name: agentName },
      action,
      category: "job",
      ...details
    });
  }

  async logSystemEvent(action, details = {}) {
    return this.log({
      actor: { type: "system", name: "orchestrator" },
      action,
      category: "system",
      ...details
    });
  }

  async logAlert(level, message, details = {}) {
    return this.log({
      actor: { type: "system", name: "alert-system" },
      action: "alert_" + level,
      category: "alert",
      description: message,
      ...details
    });
  }

  async logApprovalRequest(action, description, metadata = {}) {
    return this.log({
      actor: { type: "system", name: "approval-system" },
      action,
      category: "approval",
      description,
      status: "pending_approval",
      metadata
    });
  }

  async logError(source, error, context = {}) {
    return this.log({
      actor: { type: "system", name: source },
      action: "error",
      category: "error",
      description: error.message,
      status: "failed",
      result: {
        success: false,
        message: error.message,
        data: { stack: error.stack }
      },
      metadata: context
    });
  }

  // Query methods
  async getRecent(limit = 50, filter = {}) {
    return AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  async getByCategory(category, limit = 50) {
    return this.getRecent(limit, { category });
  }

  async getByActor(actorType, actorName, limit = 50) {
    return this.getRecent(limit, {
      "actor.type": actorType,
      "actor.name": actorName
    });
  }

  async getPendingApprovals() {
    return AuditLog.find({ status: "pending_approval" })
      .sort({ timestamp: -1 })
      .lean();
  }

  async getStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { category: "$category", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ]);

    return stats;
  }
}

const auditLogger = new AuditLogger();
export default auditLogger;
