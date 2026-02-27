import mongoose from 'mongoose';

/**
 * Agent Issues v1.0 — Actionable bevindingen met levenscyclus
 *
 * Levenscyclus: open → acknowledged → in_progress → resolved → auto_closed
 *
 * Issues worden AUTOMATISCH aangemaakt door agents wanneer ze
 * bevindingen doen die actie vereisen. Issues worden beheerd
 * via de Admin Portal.
 */

const AgentIssueSchema = new mongoose.Schema({
  issueId: { type: String, required: true, unique: true },
  agentName: { type: String, required: true, index: true },
  agentLabel: { type: String },

  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    required: true, index: true
  },
  category: {
    type: String,
    enum: ['security', 'code_quality', 'performance', 'configuration', 'other'],
    required: true
  },

  title: { type: String, required: true },
  description: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },

  status: {
    type: String,
    enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'auto_closed', 'wont_fix'],
    default: 'open', index: true
  },
  resolvedAt: { type: Date },
  resolvedBy: { type: String },
  resolution: { type: String },

  detectedAt: { type: Date, required: true, default: Date.now },
  acknowledgedAt: { type: Date },
  slaTarget: { type: Date },

  fingerprint: { type: String, index: true },
  occurrenceCount: { type: Number, default: 1 },
  lastSeenAt: { type: Date, default: Date.now },

  relatedAuditLogId: { type: mongoose.Schema.Types.ObjectId },
  destination_id: { type: Number }
}, {
  timestamps: true,
  collection: 'agent_issues'
});

AgentIssueSchema.index({ status: 1, severity: 1 });
AgentIssueSchema.index({ fingerprint: 1, status: 1 });
AgentIssueSchema.index({ detectedAt: -1 });

const AgentIssue = mongoose.model('AgentIssue', AgentIssueSchema);

const SLA_WINDOWS = {
  critical: 24 * 60 * 60 * 1000,
  high: 72 * 60 * 60 * 1000,
  medium: 7 * 24 * 60 * 60 * 1000,
  low: 30 * 24 * 60 * 60 * 1000,
  info: null
};

async function raiseIssue({ agentName, agentLabel, severity, category, title, description, details, fingerprint, destination_id, auditLogId }) {
  try {
    if (fingerprint) {
      const existing = await AgentIssue.findOne({
        fingerprint,
        status: { $in: ['open', 'acknowledged', 'in_progress'] }
      });
      if (existing) {
        existing.occurrenceCount += 1;
        existing.lastSeenAt = new Date();
        existing.details = details;
        await existing.save();
        return { action: 'updated', issueId: existing.issueId };
      }
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await AgentIssue.countDocuments({
      issueId: { $regex: `^ISSUE-${today}` }
    });
    const issueId = `ISSUE-${today}-${String(count + 1).padStart(3, '0')}`;

    const now = new Date();
    const slaWindow = SLA_WINDOWS[severity];

    const issue = new AgentIssue({
      issueId,
      agentName,
      agentLabel: agentLabel || agentName,
      severity,
      category,
      title,
      description,
      details,
      status: 'open',
      detectedAt: now,
      slaTarget: slaWindow ? new Date(now.getTime() + slaWindow) : null,
      fingerprint: fingerprint || null,
      relatedAuditLogId: auditLogId || null,
      destination_id: destination_id || null
    });

    await issue.save();
    return { action: 'created', issueId };
  } catch (e) {
    console.error('[AgentIssues] Failed to raise issue:', e.message);
    return { action: 'error', error: e.message };
  }
}

async function autoCloseIssues(agentName, category, activeFingerprints) {
  try {
    const result = await AgentIssue.updateMany(
      {
        agentName,
        category,
        status: { $in: ['open', 'acknowledged'] },
        fingerprint: { $nin: activeFingerprints }
      },
      {
        $set: {
          status: 'auto_closed',
          resolvedAt: new Date(),
          resolvedBy: 'auto',
          resolution: 'Automatisch gesloten — niet meer gedetecteerd door agent'
        }
      }
    );
    return result.modifiedCount;
  } catch (e) {
    console.error('[AgentIssues] Auto-close failed:', e.message);
    return 0;
  }
}

async function getOpenIssues(filters = {}) {
  const query = { status: { $in: ['open', 'acknowledged', 'in_progress'] } };
  if (filters.severity) query.severity = filters.severity;
  if (filters.agentName) query.agentName = filters.agentName;
  if (filters.category) query.category = filters.category;

  return AgentIssue.find(query).sort({ severity: 1, detectedAt: -1 }).lean();
}

async function getSLABreaches() {
  const now = new Date();
  return AgentIssue.find({
    status: { $in: ['open', 'acknowledged', 'in_progress'] },
    slaTarget: { $lt: now, $ne: null }
  }).sort({ slaTarget: 1 }).lean();
}

export { AgentIssue, raiseIssue, autoCloseIssues, getOpenIssues, getSLABreaches };
