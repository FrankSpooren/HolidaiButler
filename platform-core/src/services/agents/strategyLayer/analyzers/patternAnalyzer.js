import { logAgent, logError } from '../../../orchestrator/auditTrail/index.js';

/**
 * Pattern Analyzer
 * Detects patterns in system behavior for optimization
 *
 * Analyzes:
 * - Error patterns (recurring issues)
 * - Performance patterns (peak times, bottlenecks)
 * - Usage patterns (popular features, user journeys)
 * - Cost patterns (API usage trends)
 */

// Pattern types
const PATTERN_TYPES = {
  ERROR_RECURRING: {
    name: 'Recurring Error',
    threshold: 3, // Same error 3+ times
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    severity: 'high'
  },
  ERROR_SPIKE: {
    name: 'Error Spike',
    threshold: 10, // 10+ errors in short period
    timeWindow: 60 * 60 * 1000, // 1 hour
    severity: 'critical'
  },
  PERFORMANCE_DEGRADATION: {
    name: 'Performance Degradation',
    threshold: 1.5, // 50% slower than baseline
    severity: 'medium'
  },
  PEAK_USAGE: {
    name: 'Peak Usage Period',
    threshold: 2, // 2x average traffic
    severity: 'info'
  },
  COST_ANOMALY: {
    name: 'Cost Anomaly',
    threshold: 1.3, // 30% over budget rate
    severity: 'high'
  },
  USER_JOURNEY_DROP: {
    name: 'User Journey Drop-off',
    threshold: 0.4, // 40%+ drop-off rate
    severity: 'medium'
  }
};

class PatternAnalyzer {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
    this.patternCache = new Map();
  }

  setConnections(sequelize, mongoose) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
  }

  /**
   * Analyze error patterns from audit logs
   */
  async analyzeErrorPatterns(hours = 24) {
    console.log(`[PatternAnalyzer] Analyzing error patterns (last ${hours}h)...`);

    try {
      const AuditLog = this.mongoose.model('AuditLog');
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Get error logs
      const errorLogs = await AuditLog.find({
        level: 'error',
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 }).lean();

      // Group by error type/message
      const errorGroups = new Map();
      for (const log of errorLogs) {
        const key = `${log.agent}:${log.action}:${log.error?.substring(0, 100) || 'unknown'}`;
        if (!errorGroups.has(key)) {
          errorGroups.set(key, { count: 0, first: log.timestamp, last: log.timestamp, samples: [] });
        }
        const group = errorGroups.get(key);
        group.count++;
        group.last = log.timestamp;
        if (group.samples.length < 3) {
          group.samples.push(log);
        }
      }

      // Detect patterns
      const patterns = [];

      for (const [key, data] of errorGroups) {
        // Recurring error pattern
        if (data.count >= PATTERN_TYPES.ERROR_RECURRING.threshold) {
          patterns.push({
            type: 'ERROR_RECURRING',
            name: PATTERN_TYPES.ERROR_RECURRING.name,
            severity: PATTERN_TYPES.ERROR_RECURRING.severity,
            key,
            count: data.count,
            firstSeen: data.first,
            lastSeen: data.last,
            samples: data.samples,
            recommendation: this.getErrorRecommendation(key, data)
          });
        }
      }

      // Detect error spike
      const hourlyBuckets = new Map();
      for (const log of errorLogs) {
        const hour = new Date(log.timestamp).toISOString().substring(0, 13);
        hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
      }

      for (const [hour, count] of hourlyBuckets) {
        if (count >= PATTERN_TYPES.ERROR_SPIKE.threshold) {
          patterns.push({
            type: 'ERROR_SPIKE',
            name: PATTERN_TYPES.ERROR_SPIKE.name,
            severity: PATTERN_TYPES.ERROR_SPIKE.severity,
            hour,
            count,
            recommendation: 'Investigate system stability during this period'
          });
        }
      }

      await logAgent('strategy-layer', 'error_patterns_analyzed', {
        description: `Analyzed ${errorLogs.length} error logs, found ${patterns.length} patterns`,
        metadata: { errorCount: errorLogs.length, patternCount: patterns.length }
      });

      return { patterns, totalErrors: errorLogs.length, analyzedPeriod: `${hours}h` };
    } catch (error) {
      await logError('strategy-layer', error, { action: 'analyze_error_patterns' });
      throw error;
    }
  }

  /**
   * Analyze performance patterns
   */
  async analyzePerformancePatterns(days = 7) {
    console.log(`[PatternAnalyzer] Analyzing performance patterns (last ${days} days)...`);

    try {
      const AuditLog = this.mongoose.model('AuditLog');
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get health check logs
      const healthLogs = await AuditLog.find({
        agent: 'health-monitor',
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 }).lean();

      const patterns = [];
      const performanceData = {
        apiLatency: [],
        databaseLatency: [],
        memoryUsage: [],
        cpuUsage: []
      };

      // Extract performance metrics
      for (const log of healthLogs) {
        if (log.metadata?.latency) {
          performanceData.apiLatency.push({
            timestamp: log.timestamp,
            value: log.metadata.latency
          });
        }
        if (log.metadata?.memory) {
          performanceData.memoryUsage.push({
            timestamp: log.timestamp,
            value: log.metadata.memory
          });
        }
      }

      // Calculate baselines and detect degradation
      for (const [metric, data] of Object.entries(performanceData)) {
        if (data.length < 10) continue;

        const values = data.map(d => d.value);
        const baseline = this.calculateBaseline(values.slice(0, Math.floor(values.length / 2)));
        const recent = this.calculateBaseline(values.slice(-Math.floor(values.length / 4)));

        if (recent / baseline > PATTERN_TYPES.PERFORMANCE_DEGRADATION.threshold) {
          patterns.push({
            type: 'PERFORMANCE_DEGRADATION',
            name: PATTERN_TYPES.PERFORMANCE_DEGRADATION.name,
            severity: PATTERN_TYPES.PERFORMANCE_DEGRADATION.severity,
            metric,
            baseline: Math.round(baseline),
            recent: Math.round(recent),
            degradation: `${Math.round((recent / baseline - 1) * 100)}%`,
            recommendation: `Investigate ${metric} degradation. Consider optimization or scaling.`
          });
        }
      }

      // Detect peak usage periods
      const hourlyTraffic = new Map();
      for (const log of healthLogs) {
        const hour = new Date(log.timestamp).getHours();
        hourlyTraffic.set(hour, (hourlyTraffic.get(hour) || 0) + 1);
      }

      const avgTraffic = Array.from(hourlyTraffic.values()).reduce((a, b) => a + b, 0) / hourlyTraffic.size;
      for (const [hour, count] of hourlyTraffic) {
        if (count / avgTraffic >= PATTERN_TYPES.PEAK_USAGE.threshold) {
          patterns.push({
            type: 'PEAK_USAGE',
            name: PATTERN_TYPES.PEAK_USAGE.name,
            severity: PATTERN_TYPES.PEAK_USAGE.severity,
            hour: `${hour}:00`,
            traffic: count,
            multiplier: (count / avgTraffic).toFixed(1),
            recommendation: `Consider pre-scaling or caching optimization for peak at ${hour}:00`
          });
        }
      }

      await logAgent('strategy-layer', 'performance_patterns_analyzed', {
        description: `Analyzed ${healthLogs.length} health logs, found ${patterns.length} patterns`,
        metadata: { logCount: healthLogs.length, patternCount: patterns.length }
      });

      return { patterns, analyzedPeriod: `${days} days` };
    } catch (error) {
      await logError('strategy-layer', error, { action: 'analyze_performance_patterns' });
      throw error;
    }
  }

  /**
   * Analyze cost patterns
   */
  async analyzeCostPatterns(days = 30) {
    console.log(`[PatternAnalyzer] Analyzing cost patterns (last ${days} days)...`);

    try {
      const CostLog = this.mongoose.model('CostLog');
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const costLogs = await CostLog.find({
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 }).lean();

      const patterns = [];
      const dailyCosts = new Map();
      const serviceCosts = new Map();

      // Aggregate costs
      for (const log of costLogs) {
        const day = new Date(log.timestamp).toISOString().substring(0, 10);
        dailyCosts.set(day, (dailyCosts.get(day) || 0) + log.cost);

        const service = log.service || 'unknown';
        serviceCosts.set(service, (serviceCosts.get(service) || 0) + log.cost);
      }

      // Calculate daily budget rate
      const dailyBudget = 515 / 30;
      const dailyCostValues = Array.from(dailyCosts.values());

      // Detect cost anomalies
      for (const [day, cost] of dailyCosts) {
        if (cost / dailyBudget > PATTERN_TYPES.COST_ANOMALY.threshold) {
          patterns.push({
            type: 'COST_ANOMALY',
            name: PATTERN_TYPES.COST_ANOMALY.name,
            severity: PATTERN_TYPES.COST_ANOMALY.severity,
            date: day,
            cost: `\u20AC${cost.toFixed(2)}`,
            budget: `\u20AC${dailyBudget.toFixed(2)}`,
            overBudget: `${Math.round((cost / dailyBudget - 1) * 100)}%`,
            recommendation: 'Review API usage and consider optimization'
          });
        }
      }

      // Top cost services
      const topServices = Array.from(serviceCosts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      await logAgent('strategy-layer', 'cost_patterns_analyzed', {
        description: `Analyzed ${costLogs.length} cost logs, found ${patterns.length} anomalies`,
        metadata: {
          logCount: costLogs.length,
          anomalyCount: patterns.length,
          totalCost: dailyCostValues.reduce((a, b) => a + b, 0).toFixed(2)
        }
      });

      return {
        patterns,
        topServices: topServices.map(([service, cost]) => ({ service, cost: `\u20AC${cost.toFixed(2)}` })),
        analyzedPeriod: `${days} days`
      };
    } catch (error) {
      await logError('strategy-layer', error, { action: 'analyze_cost_patterns' });
      throw error;
    }
  }

  /**
   * Analyze user journey patterns
   */
  async analyzeUserJourneyPatterns() {
    console.log('[PatternAnalyzer] Analyzing user journey patterns...');

    try {
      const [journeyStats] = await this.sequelize.query(`
        SELECT
          journey_type,
          status,
          COUNT(*) as count,
          AVG(current_step) as avg_step
        FROM user_journeys
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY journey_type, status
      `);

      const patterns = [];
      const journeyTypes = new Map();

      for (const stat of journeyStats) {
        if (!journeyTypes.has(stat.journey_type)) {
          journeyTypes.set(stat.journey_type, { total: 0, completed: 0, cancelled: 0 });
        }
        const jt = journeyTypes.get(stat.journey_type);
        jt.total += stat.count;
        if (stat.status === 'completed') jt.completed = stat.count;
        if (stat.status === 'cancelled') jt.cancelled = stat.count;
      }

      // Detect high drop-off journeys
      for (const [type, data] of journeyTypes) {
        const completionRate = data.completed / data.total;
        if (completionRate < (1 - PATTERN_TYPES.USER_JOURNEY_DROP.threshold)) {
          patterns.push({
            type: 'USER_JOURNEY_DROP',
            name: PATTERN_TYPES.USER_JOURNEY_DROP.name,
            severity: PATTERN_TYPES.USER_JOURNEY_DROP.severity,
            journeyType: type,
            completionRate: `${Math.round(completionRate * 100)}%`,
            dropOffRate: `${Math.round((1 - completionRate) * 100)}%`,
            recommendation: `Review ${type} journey content and timing. Consider A/B testing.`
          });
        }
      }

      await logAgent('strategy-layer', 'journey_patterns_analyzed', {
        description: `Analyzed ${journeyStats.length} journey stats, found ${patterns.length} issues`,
        metadata: { journeyTypes: journeyTypes.size, patternCount: patterns.length }
      });

      return { patterns, journeyStats: Object.fromEntries(journeyTypes) };
    } catch (error) {
      await logError('strategy-layer', error, { action: 'analyze_journey_patterns' });
      throw error;
    }
  }

  /**
   * Generate recommendation for error pattern
   */
  getErrorRecommendation(key, data) {
    const [agent, action] = key.split(':');

    if (key.includes('database') || key.includes('mysql') || key.includes('connection')) {
      return 'Check database connection pool settings and consider connection retry logic';
    }
    if (key.includes('timeout') || key.includes('ETIMEDOUT')) {
      return 'Increase timeout limits or optimize slow operations';
    }
    if (key.includes('memory') || key.includes('heap')) {
      return 'Investigate memory leaks. Consider increasing Node.js heap size.';
    }
    if (key.includes('api') || key.includes('fetch')) {
      return 'Check external API health and implement circuit breaker pattern';
    }

    return `Review ${agent} agent's ${action} implementation for recurring issues`;
  }

  /**
   * Calculate baseline from values
   */
  calculateBaseline(values) {
    if (values.length === 0) return 0;
    // Use median for more robust baseline
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get all pattern types reference
   */
  getPatternTypes() {
    return PATTERN_TYPES;
  }
}

export { PATTERN_TYPES };
export default new PatternAnalyzer();
