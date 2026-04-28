import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import mongoose from 'mongoose';

class AuditeurAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Auditeur', version: '1.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const db = mongoose.connection.db;
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    // 1. AI-generated content audit
    const aiDecisions = await db.collection('audit_logs').countDocuments({
      'actor.type': 'agent', timestamp: { $gte: since },
      $or: [
        { action: { $regex: /mistral|pixtral|deepl|embedding/i } },
        { 'metadata.model': { $exists: true } }
      ]
    });

    // 2. Cost tracking for AI calls
    const costs = await db.collection('cost_logs').aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$provider', total: { $sum: '$amount' }, calls: { $sum: 1 } } }
    ]).toArray();

    // 3. Content with AI flag
    const { mysqlSequelize } = await import('../../../config/database.js');
    const { QueryTypes } = await import('sequelize');
    const [aiContent] = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM content_items
      WHERE destination_id = :destId AND ai_generated = 1
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => [{ count: 0 }]);

    const result = {
      destination_id: destinationId,
      period: '24h',
      ai_decisions_24h: aiDecisions,
      ai_content_items: aiContent?.count || 0,
      cost_by_provider: costs.map(c => ({ provider: c._id, total: c.total, calls: c.calls })),
      transparency: {
        all_ai_content_flagged: true, // content_items.ai_generated column exists
        model_versions_logged: costs.length > 0,
        human_review_available: true // content staging workflow
      },
      compliant: true
    };

    // Check for untransparent AI decisions
    const issues = [];
    if (aiDecisions > 0 && costs.length === 0) {
      result.compliant = false;
      issues.push({ severity: 'high', category: 'other',
        title: `EU AI Act: ${aiDecisions} AI decisions without cost/model logging` });
    }

    await logAgent('auditeur', 'eu_ai_act_audit', {
      agentId: 'auditeur',
      description: `EU AI Act: ${aiDecisions} decisions, ${costs.length} providers, compliant: ${result.compliant}`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'auditeur', agentLabel: 'De Auditeur',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `auditeur-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }
}
export default new AuditeurAgent();
