import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class PerformanceWachterAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Performance Wachter', version: '1.0.0', category: 'operations', destinationAware: false });
  }

  async execute() {
    // Server-side performance check: API response times from page_views
    const [apiPerf] = await mysqlSequelize.query(`
      SELECT
        COUNT(*) as total_views,
        AVG(load_time_ms) as avg_load_ms,
        MAX(load_time_ms) as max_load_ms,
        SUM(CASE WHEN load_time_ms > 3000 THEN 1 ELSE 0 END) as slow_loads
      FROM page_views WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND load_time_ms IS NOT NULL
    `, { type: QueryTypes.SELECT }).catch(() => [{}]);

    // Check API endpoint availability
    const endpoints = [
      { name: 'API Health', url: 'https://api.holidaibutler.com/health' },
      { name: 'Calpe Portal', url: 'https://holidaibutler.com' },
      { name: 'Texel Portal', url: 'https://texelmaps.nl' },
      { name: 'Admin Portal', url: 'https://admin.holidaibutler.com' }
    ];

    const checks = [];
    for (const ep of endpoints) {
      const start = Date.now();
      try {
        const res = await fetch(ep.url, { signal: AbortSignal.timeout(10000) });
        checks.push({ name: ep.name, status: res.status, ttfb: Date.now() - start, ok: res.ok });
      } catch (err) {
        checks.push({ name: ep.name, status: 0, ttfb: Date.now() - start, ok: false, error: err.message });
      }
    }

    const avgTtfb = Math.round(checks.reduce((s, c) => s + c.ttfb, 0) / checks.length);
    const result = {
      page_views: { total: apiPerf?.total_views || 0, avg_ms: Math.round(apiPerf?.avg_load_ms || 0), slow: apiPerf?.slow_loads || 0 },
      endpoints: checks,
      avg_ttfb: avgTtfb,
      all_up: checks.every(c => c.ok)
    };

    const issues = [];
    for (const c of checks) {
      if (!c.ok) issues.push({ severity: 'high', category: 'performance', title: `${c.name} DOWN (status ${c.status})` });
      else if (c.ttfb > 2000) issues.push({ severity: 'medium', category: 'performance', title: `${c.name} slow TTFB: ${c.ttfb}ms` });
    }

    await logAgent('performance-wachter', 'performance_check', {
      agentId: 'performanceWachter',
      description: `Performance: ${checks.length} endpoints, avg TTFB ${avgTtfb}ms, all up: ${result.all_up}`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'performanceWachter', agentLabel: 'De Performance Wachter',
        severity: issue.severity, category: issue.category, title: issue.title,
        fingerprint: `perfwachter-${issue.title.substring(0, 25)}` });
    }
    return result;
  }
}
export default new PerformanceWachterAgent();
