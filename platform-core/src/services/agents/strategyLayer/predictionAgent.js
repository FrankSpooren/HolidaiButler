import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';
import patternAnalyzer from './analyzers/patternAnalyzer.js';

/**
 * Prediction Agent
 * Proactive issue detection and forecasting
 *
 * Predicts:
 * - Potential system failures
 * - Resource exhaustion
 * - Cost overruns
 * - Performance degradation
 */

// Prediction models (simplified heuristics)
const PREDICTION_MODELS = {
  RESOURCE_EXHAUSTION: {
    name: 'Resource Exhaustion',
    description: 'Predicts when resources will be exhausted',
    horizonHours: 24
  },
  ERROR_ESCALATION: {
    name: 'Error Escalation',
    description: 'Predicts if errors will increase',
    horizonHours: 6
  },
  COST_OVERRUN: {
    name: 'Cost Overrun',
    description: 'Predicts monthly budget overrun',
    horizonDays: 7
  },
  PERFORMANCE_DECLINE: {
    name: 'Performance Decline',
    description: 'Predicts performance degradation',
    horizonHours: 12
  }
};

class PredictionAgent {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
    this.predictionHistory = [];
  }

  setConnections(sequelize, mongoose) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
    patternAnalyzer.setConnections(sequelize, mongoose);
  }

  /**
   * Run all predictions
   */
  async predict() {
    console.log('[PredictionAgent] Running predictions...');

    const predictions = {
      timestamp: new Date().toISOString(),
      predictions: [],
      alerts: []
    };

    try {
      // Resource exhaustion prediction
      const resourcePrediction = await this.predictResourceExhaustion();
      if (resourcePrediction) {
        predictions.predictions.push(resourcePrediction);
        if (resourcePrediction.risk === 'high') {
          predictions.alerts.push(resourcePrediction);
        }
      }

      // Error escalation prediction
      const errorPrediction = await this.predictErrorEscalation();
      if (errorPrediction) {
        predictions.predictions.push(errorPrediction);
        if (errorPrediction.risk === 'high') {
          predictions.alerts.push(errorPrediction);
        }
      }

      // Cost overrun prediction
      const costPrediction = await this.predictCostOverrun();
      if (costPrediction) {
        predictions.predictions.push(costPrediction);
        if (costPrediction.risk === 'high') {
          predictions.alerts.push(costPrediction);
        }
      }

      // Performance decline prediction
      const perfPrediction = await this.predictPerformanceDecline();
      if (perfPrediction) {
        predictions.predictions.push(perfPrediction);
        if (perfPrediction.risk === 'high') {
          predictions.alerts.push(perfPrediction);
        }
      }

      // Store predictions
      this.predictionHistory.push(predictions);
      if (this.predictionHistory.length > 50) {
        this.predictionHistory = this.predictionHistory.slice(-50);
      }

      // Send alerts for high-risk predictions
      if (predictions.alerts.length > 0) {
        await this.sendPredictionAlerts(predictions.alerts);
      }

      await logAgent('strategy-layer', 'predictions_completed', {
        description: `Generated ${predictions.predictions.length} predictions, ${predictions.alerts.length} alerts`,
        metadata: {
          predictionCount: predictions.predictions.length,
          alertCount: predictions.alerts.length
        }
      });

      return predictions;
    } catch (error) {
      await logError('strategy-layer', error, { action: 'predict' });
      throw error;
    }
  }

  /**
   * Predict resource exhaustion
   */
  async predictResourceExhaustion() {
    try {
      // Get recent health metrics
      const AuditLog = this.mongoose.model('AuditLog');
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const healthLogs = await AuditLog.find({
        agent: 'health-monitor',
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 }).lean();

      if (healthLogs.length < 10) {
        return null;
      }

      // Extract metrics and calculate trend
      const diskUsage = [];
      const memoryUsage = [];

      for (const log of healthLogs) {
        if (log.metadata?.disk) diskUsage.push(log.metadata.disk);
        if (log.metadata?.memory) memoryUsage.push(log.metadata.memory);
      }

      // Simple linear regression for trend
      const diskTrend = this.calculateTrend(diskUsage);
      const memoryTrend = this.calculateTrend(memoryUsage);

      // Predict exhaustion
      let risk = 'low';
      let prediction = null;

      if (diskTrend > 0.5) { // Growing more than 0.5% per sample
        const currentDisk = diskUsage[diskUsage.length - 1] || 0;
        const hoursToExhaustion = (100 - currentDisk) / diskTrend / (healthLogs.length / 24);

        if (hoursToExhaustion < 24) {
          risk = 'high';
          prediction = {
            type: 'disk_exhaustion',
            hoursUntil: Math.round(hoursToExhaustion),
            currentUsage: `${currentDisk.toFixed(1)}%`,
            trend: `+${diskTrend.toFixed(2)}%/hour`
          };
        } else if (hoursToExhaustion < 72) {
          risk = 'medium';
          prediction = {
            type: 'disk_warning',
            hoursUntil: Math.round(hoursToExhaustion),
            currentUsage: `${currentDisk.toFixed(1)}%`
          };
        }
      }

      if (!prediction) return null;

      return {
        model: 'RESOURCE_EXHAUSTION',
        name: PREDICTION_MODELS.RESOURCE_EXHAUSTION.name,
        risk,
        prediction,
        recommendation: risk === 'high'
          ? 'URGENT: Clean up disk space or increase storage'
          : 'Monitor disk usage and plan cleanup',
        confidence: 0.7
      };
    } catch (error) {
      console.error('[PredictionAgent] Resource prediction error:', error.message);
      return null;
    }
  }

  /**
   * Predict error escalation
   */
  async predictErrorEscalation() {
    try {
      const errorPatterns = await patternAnalyzer.analyzeErrorPatterns(24);

      // Calculate error rate trend
      const hourlyErrors = [];
      const AuditLog = this.mongoose.model('AuditLog');

      for (let i = 0; i < 24; i++) {
        const hourStart = new Date(Date.now() - (24 - i) * 60 * 60 * 1000);
        const hourEnd = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);

        const count = await AuditLog.countDocuments({
          level: 'error',
          timestamp: { $gte: hourStart, $lt: hourEnd }
        });

        hourlyErrors.push(count);
      }

      const trend = this.calculateTrend(hourlyErrors);
      const recentAvg = hourlyErrors.slice(-6).reduce((a, b) => a + b, 0) / 6;
      const previousAvg = hourlyErrors.slice(0, 6).reduce((a, b) => a + b, 0) / 6;

      let risk = 'low';
      if (trend > 2 || (recentAvg > previousAvg * 2 && recentAvg > 5)) {
        risk = 'high';
      } else if (trend > 1 || recentAvg > previousAvg * 1.5) {
        risk = 'medium';
      }

      if (risk === 'low') return null;

      return {
        model: 'ERROR_ESCALATION',
        name: PREDICTION_MODELS.ERROR_ESCALATION.name,
        risk,
        prediction: {
          trend: trend > 0 ? `+${trend.toFixed(1)} errors/hour` : `${trend.toFixed(1)} errors/hour`,
          recentRate: `${recentAvg.toFixed(1)} errors/hour`,
          previousRate: `${previousAvg.toFixed(1)} errors/hour`
        },
        recommendation: risk === 'high'
          ? 'URGENT: Investigate error spike immediately'
          : 'Monitor error rate and review recent changes',
        confidence: 0.65
      };
    } catch (error) {
      console.error('[PredictionAgent] Error escalation prediction error:', error.message);
      return null;
    }
  }

  /**
   * Predict cost overrun
   */
  async predictCostOverrun() {
    try {
      const costPatterns = await patternAnalyzer.analyzeCostPatterns(30);

      // Get daily costs
      const CostLog = this.mongoose.model('CostLog');
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const costLogs = await CostLog.find({
        timestamp: { $gte: since }
      }).lean();

      const dailyCosts = new Map();
      for (const log of costLogs) {
        const day = new Date(log.timestamp).toISOString().substring(0, 10);
        dailyCosts.set(day, (dailyCosts.get(day) || 0) + log.cost);
      }

      const costs = Array.from(dailyCosts.values());
      if (costs.length < 7) return null;

      const avgDailyCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const projectedMonthly = avgDailyCost * 30;
      const monthlyBudget = 515; // \u20AC515/month

      let risk = 'low';
      if (projectedMonthly > monthlyBudget * 1.2) {
        risk = 'high';
      } else if (projectedMonthly > monthlyBudget * 1.1) {
        risk = 'medium';
      }

      if (risk === 'low') return null;

      return {
        model: 'COST_OVERRUN',
        name: PREDICTION_MODELS.COST_OVERRUN.name,
        risk,
        prediction: {
          avgDailyCost: `\u20AC${avgDailyCost.toFixed(2)}`,
          projectedMonthly: `\u20AC${projectedMonthly.toFixed(2)}`,
          budget: `\u20AC${monthlyBudget}`,
          overrunPercent: `${Math.round((projectedMonthly / monthlyBudget - 1) * 100)}%`
        },
        recommendation: risk === 'high'
          ? 'URGENT: Review API usage and implement cost optimization'
          : 'Monitor costs and consider optimization',
        confidence: 0.75
      };
    } catch (error) {
      console.error('[PredictionAgent] Cost prediction error:', error.message);
      return null;
    }
  }

  /**
   * Predict performance decline
   */
  async predictPerformanceDecline() {
    try {
      const perfPatterns = await patternAnalyzer.analyzePerformancePatterns(7);

      const degradations = perfPatterns.patterns.filter(p => p.type === 'PERFORMANCE_DEGRADATION');

      if (degradations.length === 0) return null;

      const risk = degradations.length >= 2 ? 'high' : 'medium';

      return {
        model: 'PERFORMANCE_DECLINE',
        name: PREDICTION_MODELS.PERFORMANCE_DECLINE.name,
        risk,
        prediction: {
          affectedMetrics: degradations.map(d => d.metric),
          degradations: degradations.map(d => ({ metric: d.metric, amount: d.degradation }))
        },
        recommendation: risk === 'high'
          ? 'Multiple performance metrics degrading - investigate immediately'
          : 'Monitor performance trends and consider optimization',
        confidence: 0.7
      };
    } catch (error) {
      console.error('[PredictionAgent] Performance prediction error:', error.message);
      return null;
    }
  }

  /**
   * Calculate simple linear trend
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Send alerts for high-risk predictions
   */
  async sendPredictionAlerts(alerts) {
    const alertMessage = alerts.map(a =>
      `${a.name}: ${a.risk.toUpperCase()} risk\n   ${a.recommendation}`
    ).join('\n\n');

    await sendAlert({
      urgency: 4,
      title: `Prediction Agent: ${alerts.length} High-Risk Predictions`,
      message: `Proactive issue detection found potential problems:\n\n${alertMessage}`,
      metadata: { alerts }
    });
  }

  /**
   * Get prediction history
   */
  getPredictionHistory(limit = 10) {
    return this.predictionHistory.slice(-limit);
  }

  /**
   * Get prediction models reference
   */
  getPredictionModels() {
    return PREDICTION_MODELS;
  }
}

export { PREDICTION_MODELS };
export default new PredictionAgent();
