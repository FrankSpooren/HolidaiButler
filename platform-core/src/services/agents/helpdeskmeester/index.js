import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class HelpdeskmeesterAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Helpdeskmeester', version: '1.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    // Monitor human escalation requests from chatbot
    const escalations = await mysqlSequelize.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved,
        AVG(TIMESTAMPDIFF(HOUR, created_at, COALESCE(resolved_at, NOW()))) as avg_resolution_hours
      FROM holibot_sessions
      WHERE destination_id = :destId
        AND intent = 'human_escalation'
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => [{}]);

    const stats = escalations[0] || {};
    const total = stats.total || 0;
    const resolved = stats.resolved || 0;
    const pending = total - resolved;
    const resolutionRate = total > 0 ? Math.round(resolved / total * 100) : 100;

    const result = {
      destination_id: destinationId,
      period: '7d',
      total_escalations: total,
      resolved,
      pending,
      resolution_rate: resolutionRate,
      avg_resolution_hours: Math.round((stats.avg_resolution_hours || 0) * 10) / 10
    };

    const issues = [];
    if (pending > 5) {
      issues.push({ severity: 'medium', category: 'other',
        title: `${pending} onbehandelde escalaties (SLA risico)` });
    }
    if (resolutionRate < 80 && total > 10) {
      issues.push({ severity: 'high', category: 'other',
        title: `Escalatie resolution rate ${resolutionRate}% (<80%)` });
    }

    await logAgent('helpdeskmeester', 'escalation_monitor', {
      agentId: 'helpdeskmeester',
      description: `Helpdesk: ${total} escalaties, ${resolved} resolved (${resolutionRate}%), ${pending} pending`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'helpdeskmeester', agentLabel: 'De Helpdeskmeester',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `helpdesk-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }
}
export default new HelpdeskmeesterAgent();
