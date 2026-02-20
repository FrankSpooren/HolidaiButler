import Redis from 'ioredis';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';

/**
 * De Thermostaat — Adaptive Config Agent
 * Monitors system conditions and RECOMMENDS configuration adjustments.
 *
 * MODE: Alerting-only — recommendations are stored in Redis and
 * reported to the owner. Changes are NOT auto-applied to runtime.
 * The owner decides manually whether to act on recommendations.
 *
 * Monitors:
 * - Rate limiting thresholds
 * - Queue concurrency
 * - Cache TTLs
 * - Alert thresholds
 */

// Default configuration domains (reference values, NOT modified at runtime)
const CONFIG_DOMAINS = {
  RATE_LIMITING: {
    name: 'Rate Limiting',
    params: {
      defaultLimit: 100,
      burstLimit: 200,
      windowMs: 60000
    }
  },
  QUEUE: {
    name: 'Queue Processing',
    params: {
      concurrency: 5,
      maxRetries: 3,
      backoffMultiplier: 2
    }
  },
  CACHE: {
    name: 'Caching',
    params: {
      poiTTL: 3600,       // 1 hour
      searchTTL: 300,     // 5 minutes
      userTTL: 1800       // 30 minutes
    }
  },
  ALERTS: {
    name: 'Alert Thresholds',
    params: {
      errorRateThreshold: 0.05,
      latencyThreshold: 2000,
      cpuThreshold: 80,
      memoryThreshold: 85
    }
  }
};

// Adaptation rules
const ADAPTATION_RULES = {
  HIGH_TRAFFIC: {
    trigger: 'traffic > 2x baseline',
    actions: [
      { domain: 'RATE_LIMITING', param: 'burstLimit', factor: 0.8 },
      { domain: 'CACHE', param: 'searchTTL', factor: 2 }
    ]
  },
  HIGH_ERROR_RATE: {
    trigger: 'error rate > 5%',
    actions: [
      { domain: 'QUEUE', param: 'concurrency', factor: 0.5 },
      { domain: 'ALERTS', param: 'errorRateThreshold', factor: 0.8 }
    ]
  },
  LOW_RESOURCES: {
    trigger: 'CPU > 80% or Memory > 85%',
    actions: [
      { domain: 'QUEUE', param: 'concurrency', factor: 0.5 },
      { domain: 'RATE_LIMITING', param: 'defaultLimit', factor: 0.7 }
    ]
  },
  PEAK_HOURS: {
    trigger: 'detected peak usage period',
    actions: [
      { domain: 'CACHE', param: 'poiTTL', factor: 2 },
      { domain: 'CACHE', param: 'searchTTL', factor: 3 }
    ]
  }
};

class AdaptiveConfigAgent {
  constructor() {
    this.mode = 'alerting-only';
  }

  /**
   * Get a Redis connection
   */
  getRedis() {
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: 3
    });
  }

  /**
   * Evaluate conditions and generate recommendations (NOT auto-applied)
   */
  async evaluate(metrics) {
    console.log('[De Thermostaat] Evaluating system metrics (alerting-only mode)...');

    const recommendations = [];

    try {
      // Check HIGH_TRAFFIC condition
      if (metrics.trafficMultiplier && metrics.trafficMultiplier > 2) {
        const rec = this.recommendRule('HIGH_TRAFFIC', metrics);
        if (rec) recommendations.push(rec);
      }

      // Check HIGH_ERROR_RATE condition
      if (metrics.errorRate && metrics.errorRate > 0.05) {
        const rec = this.recommendRule('HIGH_ERROR_RATE', metrics);
        if (rec) recommendations.push(rec);
      }

      // Check LOW_RESOURCES condition
      if ((metrics.cpu && metrics.cpu > 80) || (metrics.memory && metrics.memory > 85)) {
        const rec = this.recommendRule('LOW_RESOURCES', metrics);
        if (rec) recommendations.push(rec);
      }

      // Check PEAK_HOURS condition
      const hour = new Date().getHours();
      if (metrics.peakHours && metrics.peakHours.includes(hour)) {
        const rec = this.recommendRule('PEAK_HOURS', metrics);
        if (rec) recommendations.push(rec);
      }

      const result = {
        timestamp: new Date().toISOString(),
        mode: this.mode,
        metrics,
        recommendations,
        note: recommendations.length > 0
          ? 'Recommendations generated. NOT auto-applied. Manual action required.'
          : 'No adjustments needed. System within normal parameters.'
      };

      // Persist to Redis
      await this.persistToRedis(result);

      if (recommendations.length > 0) {
        await logAgent('strategy-layer', 'config_recommendations', {
          description: `[De Thermostaat] Generated ${recommendations.length} recommendations (alerting-only, NOT auto-applied)`,
          metadata: { rules: recommendations.map(r => r.rule), mode: this.mode }
        });

        // Alert owner about critical recommendations
        await this.notifyRecommendations(recommendations);
      }

      return result;
    } catch (error) {
      await logError('strategy-layer', error, { action: 'evaluate_config' });
      throw error;
    }
  }

  /**
   * Generate a recommendation for a rule (does NOT modify config)
   */
  recommendRule(ruleName, metrics) {
    const rule = ADAPTATION_RULES[ruleName];
    if (!rule) return null;

    console.log(`[De Thermostaat] Generating recommendation: ${ruleName}`);

    const actions = [];

    for (const action of rule.actions) {
      const domain = CONFIG_DOMAINS[action.domain];
      if (domain && domain.params[action.param] !== undefined) {
        const currentValue = domain.params[action.param];
        const suggestedValue = Math.round(currentValue * action.factor);

        actions.push({
          domain: action.domain,
          param: action.param,
          currentValue,
          suggestedValue,
          factor: action.factor,
          actionRequired: `Adjust ${domain.name} → ${action.param}: ${currentValue} → ${suggestedValue}`
        });
      }
    }

    if (actions.length === 0) return null;

    return {
      rule: ruleName,
      trigger: rule.trigger,
      actions,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Persist evaluation result to Redis
   */
  async persistToRedis(result) {
    let redis;
    try {
      redis = this.getRedis();

      // Store latest evaluation (24h TTL)
      await redis.set(
        'thermostaat:last_evaluation',
        JSON.stringify(result),
        'EX', 86400
      );

      // Store in history (capped list, keep last 100)
      await redis.lpush(
        'thermostaat:history',
        JSON.stringify({ timestamp: result.timestamp, recommendations: result.recommendations })
      );
      await redis.ltrim('thermostaat:history', 0, 99);

      console.log('[De Thermostaat] Evaluation persisted to Redis');
    } catch (error) {
      console.error('[De Thermostaat] Failed to persist to Redis:', error.message);
    } finally {
      if (redis) await redis.quit();
    }
  }

  /**
   * Get current configuration (returns defaults + mode info)
   */
  getCurrentConfig() {
    const config = {};
    for (const [domain, data] of Object.entries(CONFIG_DOMAINS)) {
      config[domain] = {
        name: data.name,
        ...data.params
      };
    }
    return {
      mode: this.mode,
      defaults: config,
      note: 'De Thermostaat is in alerting-only mode. Values shown are defaults, not runtime config.'
    };
  }

  /**
   * Get latest recommendations from Redis
   */
  async getRecommendations() {
    let redis;
    try {
      redis = this.getRedis();
      const data = await redis.get('thermostaat:last_evaluation');
      if (data) {
        return JSON.parse(data);
      }
      return { mode: this.mode, recommendations: [], note: 'No recent evaluation data' };
    } catch (error) {
      console.error('[De Thermostaat] Failed to read from Redis:', error.message);
      return { mode: this.mode, recommendations: [], error: error.message };
    } finally {
      if (redis) await redis.quit();
    }
  }

  /**
   * Get evaluation history from Redis
   */
  async getConfigHistory(limit = 20) {
    let redis;
    try {
      redis = this.getRedis();
      const items = await redis.lrange('thermostaat:history', 0, limit - 1);
      return items.map(item => JSON.parse(item));
    } catch (error) {
      console.error('[De Thermostaat] Failed to read history:', error.message);
      return [];
    } finally {
      if (redis) await redis.quit();
    }
  }

  /**
   * Get active adaptations (always empty in alerting-only mode)
   */
  getActiveAdaptations() {
    return [];
  }

  /**
   * Notify owner about recommendations
   */
  async notifyRecommendations(recommendations) {
    const criticalRules = ['HIGH_ERROR_RATE', 'LOW_RESOURCES'];
    const hasCritical = recommendations.some(r => criticalRules.includes(r.rule));

    if (hasCritical) {
      const actionItems = recommendations.map(r =>
        `• ${r.rule}: ${r.trigger}\n  ${r.actions.map(a => a.actionRequired).join('\n  ')}`
      ).join('\n');

      await sendAlert({
        urgency: 4,
        title: 'De Thermostaat: Aanbevelingen voor handmatige aanpassing',
        message: `Systeem configuratie aanbevelingen:\n\n${actionItems}\n\nDeze wijzigingen zijn NIET automatisch toegepast.\nControleer en pas handmatig aan indien nodig.`,
        metadata: { recommendations, mode: this.mode }
      });
    }
  }
}

export { CONFIG_DOMAINS, ADAPTATION_RULES };
export default new AdaptiveConfigAgent();
