import mongoose from 'mongoose';
import CostLog from './models/CostLog.js';
import { MONTHLY_BUDGET, ALERT_THRESHOLDS } from './budgetConfig.js';
import { alertQueue } from '../queues.js';

class CostTracker {

  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  async logCost(service, operation, cost, metadata = {}) {
    // Check MongoDB connection first
    if (!this.isMongoConnected()) {
      console.warn('[CostTracker] MongoDB not connected, skipping cost log');
      return null;
    }

    try {
      const log = new CostLog({
        service,
        operation,
        cost,
        metadata,
        environment: process.env.NODE_ENV || 'production'
      });
      await log.save();
      console.log('[CostTracker] Logged cost: ' + service + ' - ' + operation + ' - EUR' + cost.toFixed(4));
      await this.checkBudgetStatus(service);
      return log;
    } catch (error) {
      console.error('[CostTracker] Error logging cost:', error.message);
      return null;
    }
  }

  async getMonthlyCosts(service = null) {
    // Check MongoDB connection first
    if (!this.isMongoConnected()) {
      console.warn('[CostTracker] MongoDB not connected, returning empty costs');
      return {};
    }

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const match = { timestamp: { $gte: startOfMonth } };
      if (service) match.service = service;
      const result = await CostLog.aggregate([
        { $match: match },
        { $group: { _id: '$service', totalCost: { $sum: '$cost' }, count: { $sum: 1 } } }
      ]).option({ maxTimeMS: 10000 });  // 10s max query time
      return result.reduce((acc, item) => {
        acc[item._id] = {
          spent: item.totalCost,
          budget: MONTHLY_BUDGET.services[item._id] || 0,
          percentage: MONTHLY_BUDGET.services[item._id] ? (item.totalCost / MONTHLY_BUDGET.services[item._id]) * 100 : 0,
          operations: item.count
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('[CostTracker] Error getting monthly costs:', error.message);
      return {};
    }
  }

  async checkBudgetStatus(service = null) {
    const costs = await this.getMonthlyCosts(service);
    const alerts = [];
    for (const [svc, data] of Object.entries(costs)) {
      const pct = data.percentage;
      if (pct >= ALERT_THRESHOLDS.critical) {
        alerts.push({ service: svc, level: 'critical', urgency: 5, percentage: pct, message: 'KRITIEK: ' + svc + ' budget 100% bereikt (EUR' + data.spent.toFixed(2) + '/EUR' + data.budget + ')' });
      } else if (pct >= ALERT_THRESHOLDS.high) {
        alerts.push({ service: svc, level: 'high', urgency: 4, percentage: pct, message: 'HOOG: ' + svc + ' op ' + pct.toFixed(1) + '% van budget' });
      } else if (pct >= ALERT_THRESHOLDS.warning) {
        alerts.push({ service: svc, level: 'warning', urgency: 3, percentage: pct, message: 'Waarschuwing: ' + svc + ' op ' + pct.toFixed(1) + '% van budget' });
      }
    }
    for (const alert of alerts) {
      try {
        await alertQueue.add('budget-alert', alert, { priority: alert.urgency === 5 ? 1 : 2 });
        console.log('[CostTracker] Alert queued: ' + alert.message);
      } catch (error) {
        console.error('[CostTracker] Error queuing alert:', error.message);
      }
    }
    return { costs, alerts };
  }

  async generateCostReport() {
    const costs = await this.getMonthlyCosts();
    const totalSpent = Object.values(costs).reduce((sum, s) => sum + s.spent, 0);
    const { alerts } = await this.checkBudgetStatus();
    return {
      period: { month: new Date().toLocaleString('nl-NL', { month: 'long', year: 'numeric' }), generatedAt: new Date().toISOString() },
      summary: { totalBudget: MONTHLY_BUDGET.total, totalSpent, remaining: MONTHLY_BUDGET.total - totalSpent, percentageUsed: (totalSpent / MONTHLY_BUDGET.total) * 100 },
      byService: costs,
      alerts
    };
  }
}

const costTracker = new CostTracker();
export default costTracker;
