import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import mongoose from 'mongoose';

class PersonaliseerderAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Personaliseerder', version: '1.0.0', category: 'intelligence', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const db = mongoose.connection.db;
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    // Aggregate chatbot session stats for recommendation insights
    const [sessionStats] = await mysqlSequelize.query(`
      SELECT COUNT(*) as sessions, AVG(message_count) as avg_msgs,
        SUM(CASE WHEN message_count >= 5 THEN 1 ELSE 0 END) as deep_sessions
      FROM holibot_sessions WHERE destination_id = :destId AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // Top requested categories from chatbot
    const topCategories = await mysqlSequelize.query(`
      SELECT category, COUNT(*) as mentions FROM (
        SELECT JSON_UNQUOTE(JSON_EXTRACT(context, '$.category')) as category
        FROM holibot_sessions WHERE destination_id = :destId AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND JSON_EXTRACT(context, '$.category') IS NOT NULL
      ) t WHERE category IS NOT NULL GROUP BY category ORDER BY mentions DESC LIMIT 5
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => []);

    const result = {
      destination_id: destinationId,
      sessions_24h: sessionStats?.sessions || 0,
      avg_messages: Math.round((sessionStats?.avg_msgs || 0) * 10) / 10,
      deep_sessions: sessionStats?.deep_sessions || 0,
      top_categories: topCategories || [],
      recommendation_ready: true
    };

    await logAgent('personaliseerder', 'recommendation_stats', {
      agentId: 'personaliseerder',
      description: `Personalization: ${result.sessions_24h} sessions, ${result.deep_sessions} deep, avg ${result.avg_messages} msgs`,
      status: 'completed', metadata: result
    });
    return result;
  }
}
export default new PersonaliseerderAgent();
