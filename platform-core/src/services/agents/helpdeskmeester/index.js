import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import mongoose from 'mongoose';

// Support ticket tracking
const SupportTicketSchema = new mongoose.Schema({
  destination_id: Number,
  session_id: String,
  category: { type: String, enum: ['booking', 'info', 'complaint', 'technical', 'other'] },
  summary: String,
  user_message: String,
  status: { type: String, enum: ['open', 'routed', 'resolved'], default: 'open' },
  routed_to: String,
  created_at: { type: Date, default: Date.now },
  resolved_at: Date
}, { collection: 'support_tickets', timestamps: true });
SupportTicketSchema.index({ status: 1, destination_id: 1 });
const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

const DESTINATION_CONTACTS = { 1: 'info@holidaibutler.com', 2: 'info@texelmaps.nl' };
const CATEGORY_KEYWORDS = {
  booking: ['boek', 'reserv', 'ticket', 'betaal', 'pay', 'book', 'cancel'],
  complaint: ['klacht', 'complaint', 'slecht', 'bad', 'terrible', 'ontevreden'],
  technical: ['error', 'bug', 'crash', 'werkt niet', 'broken', 'fout'],
  info: ['info', 'vraag', 'question', 'waar', 'where', 'wanneer', 'when', 'how']
};

class HelpdeskmeesterAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Helpdeskmeester', version: '2.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const startTime = Date.now();

    // 1. Find unprocessed escalation sessions
    const escalations = await mysqlSequelize.query(`
      SELECT id, session_id, destination_id, last_message, created_at
      FROM holibot_sessions
      WHERE destination_id = :destId AND intent = 'human_escalation'
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC LIMIT 50
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT }).catch(() => []);

    // 2. Categorize + create tickets for new ones
    let newTickets = 0, existingTickets = 0;
    for (const esc of escalations) {
      const exists = await SupportTicket.findOne({ session_id: String(esc.session_id || esc.id) });
      if (exists) { existingTickets++; continue; }

      const category = this._categorize(esc.last_message || '');
      await SupportTicket.create({
        destination_id: destinationId,
        session_id: String(esc.session_id || esc.id),
        category,
        summary: (esc.last_message || '').substring(0, 200),
        user_message: (esc.last_message || '').substring(0, 500),
        status: 'open',
        routed_to: DESTINATION_CONTACTS[destinationId] || 'info@holidaibutler.com'
      });
      newTickets++;
    }

    // 3. SLA tracking
    const openTickets = await SupportTicket.countDocuments({ destination_id: destinationId, status: 'open' });
    const resolvedCount = await SupportTicket.countDocuments({
      destination_id: destinationId, status: 'resolved',
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
    });
    const totalRecent = await SupportTicket.countDocuments({
      destination_id: destinationId,
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
    });
    const resolutionRate = totalRecent > 0 ? Math.round(resolvedCount / totalRecent * 100) : 100;

    // 4. Category distribution
    const categories = await SupportTicket.aggregate([
      { $match: { destination_id: destinationId, created_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const result = {
      destination_id: destinationId, period: '7d',
      total_escalations: escalations.length, new_tickets: newTickets, existing_tickets: existingTickets,
      open_tickets: openTickets, resolution_rate: resolutionRate,
      categories: categories.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {})
    };

    const issues = [];
    if (openTickets > 5) issues.push({ severity: 'medium', category: 'other', title: `${openTickets} open support tickets (SLA risico)` });
    if (resolutionRate < 70 && totalRecent > 5) issues.push({ severity: 'high', category: 'other', title: `Resolution rate ${resolutionRate}% (<70%)` });

    await logAgent('helpdeskmeester', 'escalation_monitor', { agentId: 'helpdeskmeester',
      description: `Helpdesk: ${escalations.length} escalations, ${newTickets} new tickets, ${openTickets} open, resolution ${resolutionRate}%`,
      status: 'completed', metadata: { ...result, durationMs: Date.now() - startTime } });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'helpdeskmeester', agentLabel: 'De Helpdeskmeester',
        severity: issue.severity, category: issue.category, title: issue.title, details: result,
        fingerprint: `helpdesk-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }

  _categorize(message) {
    const lower = message.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) return cat;
    }
    return 'other';
  }
}
export default new HelpdeskmeesterAgent();
