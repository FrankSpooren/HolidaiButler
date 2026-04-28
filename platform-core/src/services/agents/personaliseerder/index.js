import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import mongoose from 'mongoose';
import crypto from 'crypto';

// GDPR-compliant recommendation log (90d TTL)
const RecLogSchema = new mongoose.Schema({
  destination_id: { type: Number, index: true },
  session_hash: String,
  context: { time_of_day: String, weekend: Boolean, season: String },
  recommendations: [{ poi_id: Number, rank: Number, score: Number }],
  latency_ms: Number,
  created_at: { type: Date, default: Date.now, expires: 90 * 24 * 3600 }
}, { collection: 'recommendation_logs' });
const RecLog = mongoose.models.RecommendationLog || mongoose.model('RecommendationLog', RecLogSchema);

const TIME_BOOST = {
  morning: { 'Food & Drinks': 1.5, 'Supermarkt': 1.3, 'Market': 1.5 },
  afternoon: { 'Attractions': 1.5, 'Culture': 1.5, 'Beach': 1.8, 'Nature': 1.3 },
  evening: { 'Food & Drinks': 2.0, 'Nightlife': 1.8 },
  night: { 'Nightlife': 2.0, 'Food & Drinks': 1.2 }
};

class PersonaliseerderAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Personaliseerder', version: '2.0.0', category: 'intelligence', destinationAware: true });
  }

  /** On-demand: called by chatbot or API */
  async recommend({ destinationId, sessionId, context = {}, limit = 5 }) {
    const startTime = Date.now();
    const sessionHash = crypto.createHash('sha256')
      .update((sessionId || 'anon') + (process.env.SESSION_SALT || 'hb-salt'))
      .digest('hex').substring(0, 32);

    const enriched = this._enrichContext(context);

    // Top 50 candidates
    const candidates = await mysqlSequelize.query(`
      SELECT id, name, category, google_rating, google_review_count, tier
      FROM POI WHERE destination_id = :destId AND is_active = 1
        AND google_rating >= 3.5 AND google_review_count >= 5
        AND enriched_tile_description_en IS NOT NULL
      ORDER BY tier ASC, google_rating DESC LIMIT 50
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // Score
    const scored = candidates.map(poi => {
      const timeBoost = TIME_BOOST[enriched.time_of_day]?.[poi.category] || 1.0;
      const tierWeight = { 1: 1.5, 2: 1.2, 3: 1.0, 4: 0.8 }[poi.tier] || 1.0;
      const ratingScore = (poi.google_rating - 3.5) / 1.5;
      const diversityPenalty = (context.discussed_categories || []).includes(poi.category) ? 0.5 : 1.0;
      const score = ratingScore * timeBoost * tierWeight * diversityPenalty;
      return { poi_id: poi.id, name: poi.name, category: poi.category, score: Math.round(score * 1000) / 1000 };
    }).sort((a, b) => b.score - a.score).slice(0, limit);

    const latencyMs = Date.now() - startTime;

    // GDPR-compliant log
    await RecLog.create({
      destination_id: destinationId, session_hash: sessionHash,
      context: enriched,
      recommendations: scored.map((r, i) => ({ poi_id: r.poi_id, rank: i + 1, score: r.score })),
      latency_ms: latencyMs
    });

    return scored;
  }

  /** Daily aggregate for monitoring */
  async runForDestination(destinationId) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const stats = await RecLog.aggregate([
      { $match: { destination_id: destinationId, created_at: { $gte: since } } },
      { $group: { _id: null, count: { $sum: 1 }, avgLatency: { $avg: '$latency_ms' } } }
    ]);

    const s = stats[0] || { count: 0, avgLatency: 0 };
    const chatSessions = await mysqlSequelize.query(`
      SELECT COUNT(*) as total, AVG(message_count) as avg_msgs,
        SUM(CASE WHEN message_count >= 3 THEN 1 ELSE 0 END) as engaged
      FROM holibot_sessions WHERE destination_id = :destId AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => [{}]);

    const result = {
      destination_id: destinationId, recommendations_24h: s.count, avg_latency_ms: Math.round(s.avgLatency || 0),
      chatbot: { sessions: chatSessions[0]?.total || 0, avg_msgs: Math.round((chatSessions[0]?.avg_msgs || 0) * 10) / 10, engaged: chatSessions[0]?.engaged || 0 }
    };

    await logAgent('personaliseerder', 'recommendation_stats', {
      agentId: 'personaliseerder',
      description: `Personalization: ${s.count} recs (avg ${Math.round(s.avgLatency || 0)}ms), ${result.chatbot.sessions} sessions`,
      status: 'completed', metadata: result
    });
    return result;
  }

  _enrichContext(ctx) {
    const now = new Date();
    const h = now.getHours();
    return {
      time_of_day: ctx.time_of_day || (h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night'),
      weekend: ctx.weekend ?? (now.getDay() === 0 || now.getDay() === 6),
      season: ctx.season || (['winter','winter','spring','spring','spring','summer','summer','summer','fall','fall','fall','winter'][now.getMonth()])
    };
  }
}
export default new PersonaliseerderAgent();
