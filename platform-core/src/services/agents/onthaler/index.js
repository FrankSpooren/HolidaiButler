import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class OnthalerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Onthaler', version: '1.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    // Tenant health check: verify all required infrastructure exists
    const checks = [];

    // 1. POI count
    const [poi] = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM POI WHERE destination_id = :id AND is_active = 1',
      { replacements: { id: destinationId }, type: QueryTypes.SELECT }
    );
    checks.push({ check: 'active_pois', value: poi?.count || 0, ok: (poi?.count || 0) > 0 });

    // 2. Content items
    const [ci] = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM content_items WHERE destination_id = :id',
      { replacements: { id: destinationId }, type: QueryTypes.SELECT }
    ).catch(() => [{ count: 0 }]);
    checks.push({ check: 'content_items', value: ci?.count || 0, ok: true });

    // 3. Pages
    const [pages] = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM pages WHERE destination_id = :id',
      { replacements: { id: destinationId }, type: QueryTypes.SELECT }
    ).catch(() => [{ count: 0 }]);
    checks.push({ check: 'pages', value: pages?.count || 0, ok: (pages?.count || 0) > 0 });

    const allOk = checks.every(c => c.ok);
    const result = { destination_id: destinationId, checks, all_ok: allOk };

    const issues = [];
    if (!allOk) {
      const failing = checks.filter(c => !c.ok).map(c => c.check).join(', ');
      issues.push({ severity: 'high', category: 'configuration',
        title: `Tenant ${destinationId} incomplete: ${failing}` });
    }

    await logAgent('onthaler', 'tenant_health', {
      agentId: 'onthaler',
      description: `Tenant ${destinationId}: ${checks.length} checks, all OK: ${allOk}`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'onthaler', agentLabel: 'De Onthaler',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `onthaler-${destinationId}-incomplete` });
    }
    return result;
  }
}
export default new OnthalerAgent();
