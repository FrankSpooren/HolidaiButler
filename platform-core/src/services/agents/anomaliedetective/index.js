import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import mongoose from 'mongoose';

class AnomaliedetectiveAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Anomaliedetective', version: '1.0.0', category: 'operations', destinationAware: false });
  }

  async execute() {
    const db = mongoose.connection.db;
    const now = new Date();
    const window5m = new Date(now - 5 * 60 * 1000);
    const window1h = new Date(now - 60 * 60 * 1000);

    // 1. Error spike detection (5min vs 1h baseline)
    const errors5m = await db.collection('audit_logs').countDocuments({ status: 'failed', timestamp: { $gte: window5m } });
    const errors1h = await db.collection('audit_logs').countDocuments({ status: 'failed', timestamp: { $gte: window1h } });
    const errorRate5m = errors5m / 5; // per minute
    const errorRate1h = errors1h / 60;
    const errorSpike = errorRate1h > 0 ? errorRate5m / errorRate1h : 0;

    // 2. Traffic volume anomaly
    const traffic5m = await db.collection('audit_logs').countDocuments({ timestamp: { $gte: window5m } });
    const traffic1h = await db.collection('audit_logs').countDocuments({ timestamp: { $gte: window1h } });
    const trafficRate5m = traffic5m / 5;
    const trafficRate1h = traffic1h / 60;
    const trafficSpike = trafficRate1h > 0 ? trafficRate5m / trafficRate1h : 0;

    // 3. Job failure clustering
    const recentFailures = await db.collection('audit_logs').find(
      { status: 'failed', timestamp: { $gte: window1h } }
    ).project({ 'actor.name': 1, action: 1 }).toArray();

    const failureClusters = {};
    for (const f of recentFailures) {
      const key = f.actor?.name || 'unknown';
      failureClusters[key] = (failureClusters[key] || 0) + 1;
    }

    const result = {
      timestamp: now.toISOString(),
      error_spike: Math.round(errorSpike * 100) / 100,
      traffic_spike: Math.round(trafficSpike * 100) / 100,
      errors_5m: errors5m,
      errors_1h: errors1h,
      traffic_5m: traffic5m,
      failure_clusters: failureClusters,
      anomalies_detected: 0
    };

    const issues = [];
    if (errorSpike > 3 && errors5m > 5) {
      result.anomalies_detected++;
      issues.push({ severity: 'high', category: 'performance',
        title: `Error spike: ${errorSpike.toFixed(1)}x normaal (${errors5m} errors in 5min)` });
    }
    if (trafficSpike > 5 && traffic5m > 100) {
      result.anomalies_detected++;
      issues.push({ severity: 'medium', category: 'performance',
        title: `Traffic spike: ${trafficSpike.toFixed(1)}x normaal (${traffic5m} requests in 5min)` });
    }

    await logAgent('anomaliedetective', 'anomaly_scan', {
      agentId: 'anomaliedetective',
      description: `Anomaly: errorSpike=${errorSpike.toFixed(1)}x trafficSpike=${trafficSpike.toFixed(1)}x detected=${result.anomalies_detected}`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'anomaliedetective', agentLabel: 'De Anomaliedetective',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `anomalie-${issue.title.substring(0, 25)}` });
    }
    return result;
  }
}
export default new AnomaliedetectiveAgent();
