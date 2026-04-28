import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import mongoose from 'mongoose';

// Sliding window anomaly detection with statistical baselines
const AnomalySchema = new mongoose.Schema({
  metric: String,
  value: Number,
  baseline_mean: Number,
  baseline_stddev: Number,
  deviation_sigma: Number,
  severity: String,
  detected_at: { type: Date, default: Date.now, expires: 30 * 24 * 3600 }
}, { collection: 'anomalies', timestamps: true });
const Anomaly = mongoose.models.Anomaly || mongoose.model('Anomaly', AnomalySchema);

class AnomaliedetectiveAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Anomaliedetective', version: '2.0.0', category: 'operations', destinationAware: false });
  }

  async execute() {
    const db = mongoose.connection.db;
    const now = new Date();
    const window5m = new Date(now - 5 * 60 * 1000);
    const window1h = new Date(now - 60 * 60 * 1000);
    const window24h = new Date(now - 24 * 3600 * 1000);

    const metrics = {};
    const anomalies = [];

    // Metric 1: Error rate (5min window vs 24h baseline)
    const errors5m = await db.collection('audit_logs').countDocuments({ status: 'failed', timestamp: { $gte: window5m } });
    const errors24h = await db.collection('audit_logs').countDocuments({ status: 'failed', timestamp: { $gte: window24h } });
    const errRate5m = errors5m / 5;
    const errBaseline = errors24h / (24 * 60);
    metrics.error_rate = { current: errRate5m, baseline: errBaseline };

    // Metric 2: Traffic volume
    const traffic5m = await db.collection('audit_logs').countDocuments({ timestamp: { $gte: window5m } });
    const traffic1h = await db.collection('audit_logs').countDocuments({ timestamp: { $gte: window1h } });
    metrics.traffic = { current_5m: traffic5m, current_1h: traffic1h };

    // Metric 3: Job failure rate per agent (1h window)
    const agentFailures = await db.collection('audit_logs').aggregate([
      { $match: { status: 'failed', 'actor.type': 'agent', timestamp: { $gte: window1h } } },
      { $group: { _id: '$actor.agentId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    metrics.agent_failures = agentFailures;

    // Metric 4: 5xx proxy errors (if tracked via audit_logs)
    const serverErrors = await db.collection('audit_logs').countDocuments({
      category: 'error', timestamp: { $gte: window5m }
    });
    metrics.server_errors_5m = serverErrors;

    // Statistical anomaly detection
    // Error spike: >3x baseline AND >3 absolute errors
    if (errBaseline > 0 && errRate5m > errBaseline * 3 && errors5m > 3) {
      const deviation = errBaseline > 0 ? (errRate5m - errBaseline) / Math.max(errBaseline, 0.1) : errRate5m;
      anomalies.push({
        metric: 'error_rate', value: errRate5m, baseline_mean: errBaseline,
        deviation_sigma: Math.round(deviation * 10) / 10,
        severity: deviation > 5 ? 'critical' : 'high',
        description: `Error spike: ${errors5m} errors in 5min (${deviation.toFixed(1)}x baseline)`
      });
    }

    // Agent failure clustering: any agent with >3 failures in 1h
    for (const af of agentFailures) {
      if (af.count >= 3) {
        anomalies.push({
          metric: 'agent_failure_cluster', value: af.count, baseline_mean: 0,
          deviation_sigma: af.count,
          severity: af.count >= 5 ? 'high' : 'medium',
          description: `Agent ${af._id || 'unknown'}: ${af.count} failures in 1h`
        });
      }
    }

    // Server error spike
    if (serverErrors > 10) {
      anomalies.push({
        metric: 'server_errors', value: serverErrors, baseline_mean: 0,
        deviation_sigma: serverErrors,
        severity: serverErrors > 50 ? 'critical' : 'high',
        description: `${serverErrors} server errors in 5min`
      });
    }

    // Persist anomalies
    for (const a of anomalies) {
      await Anomaly.create(a);
    }

    const result = {
      timestamp: now.toISOString(),
      metrics,
      anomalies_detected: anomalies.length,
      anomalies: anomalies.map(a => ({ metric: a.metric, severity: a.severity, description: a.description }))
    };

    await logAgent('anomaliedetective', 'anomaly_scan', {
      agentId: 'anomaliedetective',
      description: `Anomaly scan: ${anomalies.length} detected, errors=${errors5m}/5m, traffic=${traffic5m}/5m`,
      status: anomalies.length > 0 ? 'completed' : 'completed',
      metadata: result
    });

    for (const a of anomalies) {
      await raiseIssue({
        agentName: 'anomaliedetective', agentLabel: 'De Anomaliedetective',
        severity: a.severity, category: 'performance',
        title: a.description,
        details: { metric: a.metric, value: a.value, baseline: a.baseline_mean, deviation: a.deviation_sigma },
        fingerprint: `anomalie-${a.metric}-${Math.round(a.value)}`
      });
    }
    return result;
  }
}
export default new AnomaliedetectiveAgent();
