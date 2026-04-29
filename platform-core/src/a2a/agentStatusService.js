/**
 * Agent Status Service — Materialized View Pattern
 *
 * Maintains a `agent_status` collection with 1 document per agent.
 * Updated on each job completion by workers.js.
 * Dashboard reads from here (O(39)) instead of scanning audit_logs (O(154K+)).
 *
 * Document schema:
 * {
 *   _id: "dokter",           // agent registry key
 *   agentId: "dokter",
 *   lastRun: {
 *     timestamp: ISODate,
 *     action: "job_completed_health-check",
 *     status: "completed",
 *     duration: 1234,
 *     description: "...",
 *     jobName: "health-check"
 *   },
 *   lastRunByDestination: {
 *     "1": { timestamp, status },   // Calpe
 *     "2": { timestamp, status }    // Texel
 *   },
 *   runCount7d: 42,
 *   recentRuns: [ { timestamp, action, status, destination } ],  // last 5
 *   updatedAt: ISODate
 * }
 */
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const COLLECTION = 'agent_status';

/**
 * Update agent status after a job completes.
 * Called from workers.js after each BullMQ job.
 */
export async function updateAgentStatus(agentId, jobData) {
  if (!agentId || mongoose.connection.readyState !== 1) return;

  try {
    const db = mongoose.connection.db;
    const col = db.collection(COLLECTION);
    const now = new Date();

    const runEntry = {
      timestamp: now,
      action: jobData.action || `job_completed_${jobData.jobName || 'unknown'}`,
      status: jobData.status || 'completed',
      duration: jobData.duration || null,
      destination: jobData.destinationId || null
    };

    const update = {
      $set: {
        agentId,
        'lastRun.timestamp': now,
        'lastRun.action': runEntry.action,
        'lastRun.status': runEntry.status,
        'lastRun.duration': runEntry.duration,
        'lastRun.jobName': jobData.jobName || null,
        updatedAt: now
      },
      $push: {
        recentRuns: {
          $each: [runEntry],
          $slice: -5,
          $sort: { timestamp: -1 }
        }
      },
      $inc: { runCount7d: 1 }
    };

    // Per-destination update
    if (jobData.destinationId) {
      update.$set[`lastRunByDestination.${jobData.destinationId}`] = {
        timestamp: now,
        status: runEntry.status
      };
    }

    await col.updateOne(
      { _id: agentId },
      update,
      { upsert: true }
    );
  } catch (error) {
    logger.error(`[agent-status] Failed to update ${agentId}:`, error.message);
  }
}

/**
 * Get all agent statuses for dashboard.
 * Returns Map<agentId, statusDoc>.
 */
export async function getAllAgentStatuses() {
  if (mongoose.connection.readyState !== 1) return new Map();

  try {
    const db = mongoose.connection.db;
    const docs = await db.collection(COLLECTION).find({}).toArray();
    const map = new Map();
    for (const doc of docs) {
      map.set(doc._id, doc);
    }
    return map;
  } catch (error) {
    logger.error('[agent-status] Failed to read statuses:', error.message);
    return new Map();
  }
}

/**
 * Backfill agent_status from audit_logs (one-time migration).
 * Safe to run multiple times (upsert).
 */
export async function backfillFromAuditLogs() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const db = mongoose.connection.db;
    const auditLogs = db.collection('audit_logs');
    const statusCol = db.collection(COLLECTION);
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // Get last run per agentId
    const results = await auditLogs.aggregate([
      { $match: { 'actor.type': 'agent', 'actor.agentId': { $ne: null }, timestamp: { $gte: since30d } } },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: '$actor.agentId',
        lastTimestamp: { $first: '$timestamp' },
        lastAction: { $first: '$action' },
        lastStatus: { $first: '$status' },
        lastDuration: { $first: '$duration' },
        count: { $sum: 1 },
        recentRuns: { $push: { timestamp: '$timestamp', action: '$action', status: '$status', destination: '$metadata.destinationId' } }
      }}
    ]).toArray();

    let upserted = 0;
    for (const r of results) {
      await statusCol.updateOne(
        { _id: r._id },
        {
          $set: {
            agentId: r._id,
            lastRun: {
              timestamp: r.lastTimestamp,
              action: r.lastAction,
              status: r.lastStatus,
              duration: r.lastDuration
            },
            recentRuns: (r.recentRuns || []).slice(0, 5),
            runCount7d: r.count,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      upserted++;
    }

    // Also backfill by actor.name for agents without agentId
    const byName = await auditLogs.aggregate([
      { $match: { 'actor.type': 'agent', 'actor.agentId': null, timestamp: { $gte: since30d } } },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: '$actor.name',
        lastTimestamp: { $first: '$timestamp' },
        lastAction: { $first: '$action' },
        lastStatus: { $first: '$status' },
        lastDuration: { $first: '$duration' },
        count: { $sum: 1 }
      }}
    ]).toArray();

    logger.info(`[agent-status] Backfill complete: ${upserted} agents from agentId, ${byName.length} legacy name-only entries`);
    return { upserted, legacyNameOnly: byName.length };
  } catch (error) {
    logger.error('[agent-status] Backfill failed:', error.message);
    throw error;
  }
}

export default { updateAgentStatus, getAllAgentStatuses, backfillFromAuditLogs };
