import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import mongoose from 'mongoose';

/**
 * De Boekhouder — Cost Optimization Agent (Fase 6 P2)
 * Budget tracking per provider, projectie tot einde maand, alerts.
 * Schedule: Daily 06:00 | Type: B (shared/platform-breed)
 */
class BoekhouderAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Boekhouder', version: '1.0.0', category: 'operations', destinationAware: false });
  }

  async execute() {
    const startTime = Date.now();
    const db = mongoose.connection.db;

    // Haal kosten op uit cost_logs (MongoDB)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    const costs = await db.collection('cost_logs').aggregate([
      { $match: { timestamp: { $gte: monthStart } } },
      { $group: {
        _id: '$provider',
        totalSpent: { $sum: '$amount' },
        totalTokens: { $sum: '$tokens' },
        callCount: { $sum: 1 }
      }},
      { $sort: { totalSpent: -1 } }
    ]).toArray();

    // Budgetten per provider (maandelijks)
    const BUDGETS = {
      mistral: 50, deepl: 10, apify: 30, chromadb: 5, mailerlite: 15
    };

    const report = {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      dayOfMonth,
      daysInMonth,
      providers: [],
      totalSpent: 0,
      totalBudget: 0,
      projectedTotal: 0,
      issues: []
    };

    for (const cost of costs) {
      const provider = cost._id || 'unknown';
      const budget = BUDGETS[provider] || 100;
      const dailyRate = cost.totalSpent / Math.max(dayOfMonth, 1);
      const projected = dailyRate * daysInMonth;
      const percentUsed = (cost.totalSpent / budget) * 100;

      report.providers.push({
        provider,
        spent: Math.round(cost.totalSpent * 100) / 100,
        budget,
        projected: Math.round(projected * 100) / 100,
        percentUsed: Math.round(percentUsed * 10) / 10,
        calls: cost.callCount,
        tokens: cost.totalTokens
      });

      report.totalSpent += cost.totalSpent;
      report.totalBudget += budget;
      report.projectedTotal += projected;

      // Alerts
      if (projected > budget * 1.1) {
        report.issues.push({
          severity: projected > budget * 1.5 ? 'high' : 'medium',
          category: 'other',
          title: `${provider}: projected €${projected.toFixed(2)} exceeds budget €${budget} (${percentUsed.toFixed(0)}% used day ${dayOfMonth}/${daysInMonth})`
        });
      }
    }

    // Log
    await logAgent('boekhouder', 'cost_report', {
      agentId: 'boekhouder',
      description: `Cost report: €${report.totalSpent.toFixed(2)} spent, €${report.projectedTotal.toFixed(2)} projected, ${report.providers.length} providers`,
      status: 'completed',
      metadata: report
    });

    // Issues
    for (const issue of report.issues) {
      await raiseIssue({
        agentName: 'boekhouder', agentLabel: 'De Boekhouder',
        severity: issue.severity, category: issue.category,
        title: issue.title, details: report,
        fingerprint: `boekhouder-${report.month}-${issue.title.substring(0, 30)}`
      });
    }

    return report;
  }
}

export default new BoekhouderAgent();
