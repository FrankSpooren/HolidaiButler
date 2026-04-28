import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * De Reisleider — Customer Journey Agent (Fase 6 P2)
 * Analyseert user journeys, detecteert drop-offs, berekent conversie.
 * Schedule: Daily 05:00 | Type: A (destination-aware)
 */
class ReisleiderAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Reisleider', version: '1.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const startTime = Date.now();

    // 1. Journey stats (laatste 7 dagen)
    const journeyStats = await mysqlSequelize.query(`
      SELECT
        journey_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned,
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_duration_sec
      FROM user_journeys
      WHERE destination_id = :destId
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY journey_type
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 2. Chatbot sessie stats
    const chatStats = await mysqlSequelize.query(`
      SELECT
        COUNT(*) as total_sessions,
        AVG(message_count) as avg_messages,
        SUM(CASE WHEN message_count >= 3 THEN 1 ELSE 0 END) as engaged_sessions
      FROM holibot_sessions
      WHERE destination_id = :destId
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 3. Pageview funnel
    const pageviews = await mysqlSequelize.query(`
      SELECT
        page_type,
        COUNT(*) as views
      FROM page_views
      WHERE destination_id = :destId
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY page_type
      ORDER BY views DESC
      LIMIT 10
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 4. Simple Analytics data (website traffic)
    let saData = { pageviews: 0, visitors: 0, top_pages: [] };
    try {
      const SA_API_KEY = process.env.SA_API_KEY || 'sa_api_key_tdOPtEz1nQqzPJIXbmS9PYB12KwcwGi4KQI2';
      const domains = { 1: 'holidaibutler.com', 2: 'texelmaps.nl' };
      const domain = domains[destinationId];
      if (domain) {
        const end = new Date().toISOString().substring(0, 10);
        const start = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);
        const saRes = await fetch(
          `https://simpleanalytics.com/${domain}.json?version=6&fields=pageviews,visitors,pages&start=${start}&end=${end}`,
          { headers: { 'Api-Key': SA_API_KEY }, signal: AbortSignal.timeout(10000) }
        );
        if (saRes.ok) {
          const saJson = await saRes.json();
          saData = {
            pageviews: saJson.pageviews || 0,
            visitors: saJson.visitors || 0,
            top_pages: (saJson.pages || []).slice(0, 5).map(p => ({ path: p.value, views: p.pageviews }))
          };
        }
      }
    } catch (err) {
      console.warn('[reisleider] Simple Analytics failed:', err.message);
    }

    const result = {
      destination_id: destinationId,
      period: '7d',
      journeys: journeyStats.map(j => ({
        type: j.journey_type,
        total: j.total,
        completed: j.completed,
        abandoned: j.abandoned,
        completion_rate: j.total > 0 ? Math.round(j.completed / j.total * 100) : 0,
        avg_duration_sec: Math.round(j.avg_duration_sec || 0)
      })),
      chatbot: {
        total_sessions: chatStats[0]?.total_sessions || 0,
        avg_messages: Math.round((chatStats[0]?.avg_messages || 0) * 10) / 10,
        engaged_sessions: chatStats[0]?.engaged_sessions || 0,
        engagement_rate: chatStats[0]?.total_sessions > 0
          ? Math.round(chatStats[0].engaged_sessions / chatStats[0].total_sessions * 100) : 0
      },
      top_pages: pageviews,
      simple_analytics: saData
    };

    // Issues
    const issues = [];
    for (const j of result.journeys) {
      if (j.completion_rate < 50 && j.total > 20) {
        issues.push({
          severity: 'medium', category: 'performance',
          title: `Journey "${j.type}" drop-off: ${j.completion_rate}% completion (${j.total} starts)`
        });
      }
    }
    if (result.chatbot.engagement_rate < 30 && result.chatbot.total_sessions > 50) {
      issues.push({
        severity: 'low', category: 'performance',
        title: `Chatbot engagement low: ${result.chatbot.engagement_rate}% (${result.chatbot.total_sessions} sessions)`
      });
    }

    // Log
    await logAgent('reisleider', 'journey_analysis', {
      agentId: 'reisleider',
      description: `Journey: ${result.journeys.length} types, chatbot ${result.chatbot.total_sessions} sessions (${result.chatbot.engagement_rate}% engaged), SA ${saData.pageviews} pageviews ${saData.visitors} visitors`,
      status: 'completed',
      metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({
        agentName: 'reisleider', agentLabel: 'De Reisleider',
        severity: issue.severity, category: issue.category,
        title: issue.title, details: result,
        fingerprint: `reisleider-${destinationId}-${issue.title.substring(0, 30)}`
      });
    }

    return result;
  }
}

export default new ReisleiderAgent();
