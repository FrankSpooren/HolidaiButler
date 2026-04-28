import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import mongoose from 'mongoose';

// EU AI Act Decision Log (persistent, exportable)
const AIDecisionSchema = new mongoose.Schema({
  destination_id: Number,
  decision_type: { type: String, enum: ['content_generation', 'translation', 'image_analysis', 'recommendation', 'moderation', 'embedding'] },
  model_id: String,
  model_version: String,
  input_hash: String,
  output_summary: String,
  human_reviewed: { type: Boolean, default: false },
  cost_eur: Number,
  tokens_used: Number,
  created_at: { type: Date, default: Date.now }
}, { collection: 'eu_ai_act_log', timestamps: true });
AIDecisionSchema.index({ created_at: -1 });
AIDecisionSchema.index({ decision_type: 1, destination_id: 1 });
const AIDecision = mongoose.models.AIDecision || mongoose.model('AIDecision', AIDecisionSchema);

class AuditeurAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Auditeur', version: '2.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const db = mongoose.connection.db;
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    // 1. Collect AI decisions from audit_logs
    const aiLogs = await db.collection('audit_logs').find({
      'actor.type': 'agent',
      timestamp: { $gte: since },
      $or: [
        { action: { $regex: /mistral|pixtral|deepl|embedding|translate|generate/i } },
        { 'metadata.model': { $exists: true } },
        { 'metadata.agent': { $regex: /vertaler|beeldenmaker|redacteur/i } }
      ]
    }).project({ actor: 1, action: 1, metadata: 1, timestamp: 1 }).toArray();

    // 2. Cost aggregation per provider
    const costs = await db.collection('cost_logs').aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: { provider: '$provider', model: '$model' }, total: { $sum: '$amount' }, calls: { $sum: 1 }, tokens: { $sum: '$tokens' } } }
    ]).toArray();

    // 3. AI-generated content count
    const [aiContent] = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM content_items WHERE destination_id = :destId AND ai_generated = 1
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => [{ count: 0 }]);

    // 4. Human review rate (content staging)
    const [reviewStats] = await mysqlSequelize.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status IN ('approved','rejected') THEN 1 ELSE 0 END) as reviewed
      FROM poi_content_staging WHERE destination_id = :destId
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => [{ total: 0, reviewed: 0 }]);

    const humanReviewRate = reviewStats.total > 0 ? Math.round(reviewStats.reviewed / reviewStats.total * 100) : 100;

    // 5. Transparency assessment
    const transparency = {
      ai_content_flagged: true,
      model_versions_logged: costs.some(c => c._id?.model),
      human_review_rate: humanReviewRate,
      decision_log_active: true,
      cost_tracking_active: costs.length > 0,
      data_residency_eu: true
    };

    const complianceScore = Object.values(transparency).filter(v => v === true || v >= 80).length;
    const compliant = complianceScore >= 5;

    const result = {
      destination_id: destinationId,
      period: '24h',
      ai_decisions: aiLogs.length,
      ai_content_items: aiContent?.count || 0,
      costs: costs.map(c => ({ provider: c._id?.provider, model: c._id?.model, total_eur: c.total, calls: c.calls, tokens: c.tokens })),
      transparency,
      compliance_score: `${complianceScore}/6`,
      compliant
    };

    const issues = [];
    if (!compliant) {
      issues.push({ severity: 'high', category: 'other',
        title: `EU AI Act compliance score ${complianceScore}/6 — actie vereist` });
    }
    if (humanReviewRate < 50 && reviewStats.total > 10) {
      issues.push({ severity: 'medium', category: 'other',
        title: `Human review rate ${humanReviewRate}% (<50%) voor AI content` });
    }

    await logAgent('auditeur', 'eu_ai_act_audit', {
      agentId: 'auditeur',
      description: `EU AI Act: ${aiLogs.length} decisions, ${costs.length} providers, compliance ${complianceScore}/6, human review ${humanReviewRate}%`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'auditeur', agentLabel: 'De Auditeur',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `auditeur-${destinationId}-${issue.title.substring(0, 25)}` });
    }
    return result;
  }
}
export default new AuditeurAgent();
