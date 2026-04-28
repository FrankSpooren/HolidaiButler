import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class OptimaliseerderAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Optimaliseerder', version: '2.0.0', category: 'intelligence', destinationAware: false });
  }

  async execute() {
    // 1. Content performance per platform (7d)
    const platformPerf = await mysqlSequelize.query(`
      SELECT cp.platform, COUNT(*) as posts,
        ROUND(AVG(cp.impressions)) as avg_impressions,
        ROUND(AVG(cp.engagement_rate) * 100, 2) as avg_engagement_pct,
        ROUND(AVG(cp.clicks)) as avg_clicks,
        ROUND(AVG(cp.shares)) as avg_shares
      FROM content_performance cp
      WHERE cp.collected_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY cp.platform ORDER BY avg_engagement_pct DESC
    `, { type: QueryTypes.SELECT }).catch(() => []);

    // 2. Best performing content items
    const topContent = await mysqlSequelize.query(`
      SELECT ci.id, ci.title, ci.target_platform, cp.impressions, cp.engagement_rate, cp.clicks
      FROM content_items ci JOIN content_performance cp ON ci.id = cp.content_item_id
      WHERE cp.collected_at > DATE_SUB(NOW(), INTERVAL 7 DAY) AND cp.engagement_rate > 0
      ORDER BY cp.engagement_rate DESC LIMIT 5
    `, { type: QueryTypes.SELECT }).catch(() => []);

    // 3. Worst performing (optimization candidates)
    const worstContent = await mysqlSequelize.query(`
      SELECT ci.id, ci.title, ci.target_platform, cp.impressions, cp.engagement_rate
      FROM content_items ci JOIN content_performance cp ON ci.id = cp.content_item_id
      WHERE cp.collected_at > DATE_SUB(NOW(), INTERVAL 7 DAY) AND cp.impressions > 100 AND cp.engagement_rate < 0.01
      ORDER BY cp.engagement_rate ASC LIMIT 5
    `, { type: QueryTypes.SELECT }).catch(() => []);

    // 4. Publish time analysis
    const timeAnalysis = await mysqlSequelize.query(`
      SELECT HOUR(ci.published_at) as hour, COUNT(*) as posts,
        ROUND(AVG(cp.engagement_rate) * 100, 2) as avg_engagement_pct
      FROM content_items ci JOIN content_performance cp ON ci.id = cp.content_item_id
      WHERE ci.published_at > DATE_SUB(NOW(), INTERVAL 30 DAY) AND cp.engagement_rate > 0
      GROUP BY HOUR(ci.published_at) HAVING posts >= 3
      ORDER BY avg_engagement_pct DESC
    `, { type: QueryTypes.SELECT }).catch(() => []);

    const insights = [];
    if (platformPerf.length > 0) {
      insights.push(`Best platform: ${platformPerf[0].platform} (${platformPerf[0].avg_engagement_pct}% engagement)`);
    }
    if (timeAnalysis.length > 0) {
      insights.push(`Best publish hour: ${timeAnalysis[0].hour}:00 (${timeAnalysis[0].avg_engagement_pct}% engagement)`);
    }
    if (worstContent.length > 0) {
      insights.push(`${worstContent.length} posts with <1% engagement — optimization candidates`);
    }

    const result = {
      period: '7d',
      platforms: platformPerf,
      top_content: topContent.map(c => ({ id: c.id, title: c.title?.substring(0, 50), platform: c.target_platform, engagement: c.engagement_rate })),
      optimization_candidates: worstContent.length,
      best_publish_hours: timeAnalysis.slice(0, 3),
      insights
    };

    const issues = [];
    if (worstContent.length >= 5) {
      issues.push({ severity: 'low', category: 'performance',
        title: `${worstContent.length}+ posts met <1% engagement — content heroptimalisatie nodig` });
    }

    await logAgent('optimaliseerder', 'content_optimization', { agentId: 'optimaliseerder',
      description: `Optimization: ${platformPerf.length} platforms, ${topContent.length} top, ${worstContent.length} to optimize, ${insights.length} insights`,
      status: 'completed', metadata: result });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'optimaliseerder', agentLabel: 'De Optimaliseerder',
        severity: issue.severity, category: issue.category, title: issue.title, details: result,
        fingerprint: `optimaliseerder-${issue.title.substring(0, 25)}` });
    }
    return result;
  }
}
export default new OptimaliseerderAgent();
