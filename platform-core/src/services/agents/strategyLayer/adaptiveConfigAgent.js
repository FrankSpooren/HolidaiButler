import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';

/**
 * Adaptive Config Agent
 * Dynamically adjusts system configuration based on conditions
 *
 * Manages:
 * - Rate limiting thresholds
 * - Queue concurrency
 * - Cache TTLs
 * - Alert thresholds
 */

// Configuration domains
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
    this.currentConfig = JSON.parse(JSON.stringify(CONFIG_DOMAINS));
    this.configHistory = [];
    this.activeAdaptations = new Set();
  }

  /**
   * Evaluate conditions and adapt configuration
   */
  async evaluate(metrics) {
    console.log('[AdaptiveConfigAgent] Evaluating system metrics...');

    const adaptations = [];

    try {
      // Check HIGH_TRAFFIC condition
      if (metrics.trafficMultiplier && metrics.trafficMultiplier > 2) {
        adaptations.push(await this.applyRule('HIGH_TRAFFIC', metrics));
      }

      // Check HIGH_ERROR_RATE condition
      if (metrics.errorRate && metrics.errorRate > 0.05) {
        adaptations.push(await this.applyRule('HIGH_ERROR_RATE', metrics));
      }

      // Check LOW_RESOURCES condition
      if ((metrics.cpu && metrics.cpu > 80) || (metrics.memory && metrics.memory > 85)) {
        adaptations.push(await this.applyRule('LOW_RESOURCES', metrics));
      }

      // Check PEAK_HOURS condition
      const hour = new Date().getHours();
      if (metrics.peakHours && metrics.peakHours.includes(hour)) {
        adaptations.push(await this.applyRule('PEAK_HOURS', metrics));
      }

      // Filter out null adaptations
      const validAdaptations = adaptations.filter(a => a !== null);

      if (validAdaptations.length > 0) {
        await logAgent('strategy-layer', 'config_adapted', {
          description: `Applied ${validAdaptations.length} configuration adaptations`,
          metadata: { adaptations: validAdaptations.map(a => a.rule) }
        });

        // Alert owner about significant adaptations
        await this.notifyAdaptations(validAdaptations);
      }

      return {
        timestamp: new Date().toISOString(),
        metrics,
        adaptationsApplied: validAdaptations,
        currentConfig: this.getCurrentConfig()
      };
    } catch (error) {
      await logError('strategy-layer', error, { action: 'evaluate_config' });
      throw error;
    }
  }

  /**
   * Apply an adaptation rule
   */
  async applyRule(ruleName, metrics) {
    const rule = ADAPTATION_RULES[ruleName];
    if (!rule) return null;

    // Check if rule is already active (prevent stacking)
    if (this.activeAdaptations.has(ruleName)) {
      return null;
    }

    console.log(`[AdaptiveConfigAgent] Applying rule: ${ruleName}`);

    const changes = [];

    for (const action of rule.actions) {
      const domain = this.currentConfig[action.domain];
      if (domain && domain.params[action.param] !== undefined) {
        const oldValue = domain.params[action.param];
        const newValue = Math.round(oldValue * action.factor);

        domain.params[action.param] = newValue;

        changes.push({
          domain: action.domain,
          param: action.param,
          oldValue,
          newValue,
          factor: action.factor
        });
      }
    }

    if (changes.length > 0) {
      this.activeAdaptations.add(ruleName);

      // Store in history
      this.configHistory.push({
        timestamp: new Date().toISOString(),
        rule: ruleName,
        trigger: rule.trigger,
        changes,
        metrics
      });

      // Keep history limited
      if (this.configHistory.length > 100) {
        this.configHistory = this.configHistory.slice(-100);
      }

      return {
        rule: ruleName,
        trigger: rule.trigger,
        changes
      };
    }

    return null;
  }

  /**
   * Reset configuration to defaults
   */
  async reset(ruleName = null) {
    console.log(`[AdaptiveConfigAgent] Resetting configuration${ruleName ? ` for ${ruleName}` : ''}...`);

    if (ruleName) {
      this.activeAdaptations.delete(ruleName);
    } else {
      this.activeAdaptations.clear();
    }

    // Reset to defaults
    this.currentConfig = JSON.parse(JSON.stringify(CONFIG_DOMAINS));

    await logAgent('strategy-layer', 'config_reset', {
      description: `Configuration reset${ruleName ? ` for ${ruleName}` : ' to defaults'}`,
      metadata: { ruleName }
    });

    return this.getCurrentConfig();
  }

  /**
   * Get current configuration
   */
  getCurrentConfig() {
    const config = {};
    for (const [domain, data] of Object.entries(this.currentConfig)) {
      config[domain] = {
        name: data.name,
        ...data.params
      };
    }
    return config;
  }

  /**
   * Get configuration history
   */
  getConfigHistory(limit = 20) {
    return this.configHistory.slice(-limit);
  }

  /**
   * Get active adaptations
   */
  getActiveAdaptations() {
    return Array.from(this.activeAdaptations);
  }

  /**
   * Notify owner about adaptations
   */
  async notifyAdaptations(adaptations) {
    const criticalRules = ['HIGH_ERROR_RATE', 'LOW_RESOURCES'];
    const hasCritical = adaptations.some(a => criticalRules.includes(a.rule));

    if (hasCritical) {
      await sendAlert({
        urgency: 4,
        title: 'Adaptive Config: Critical Adjustment',
        message: `System configuration automatically adjusted:\n${adaptations.map(a => `- ${a.rule}: ${a.trigger}`).join('\n')}\n\nReview system health and consider manual intervention if needed.`,
        metadata: { adaptations }
      });
    }
  }

  /**
   * Get configuration recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const activeRules = this.getActiveAdaptations();

    if (activeRules.includes('HIGH_ERROR_RATE')) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Error rate triggered adaptation - investigate root cause',
        action: 'Review error logs and fix underlying issues'
      });
    }

    if (activeRules.includes('LOW_RESOURCES')) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Resource constraints triggered adaptation',
        action: 'Consider scaling infrastructure or optimizing resource usage'
      });
    }

    if (activeRules.length > 2) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Multiple adaptations active - system under stress',
        action: 'Review overall system health and consider architectural improvements'
      });
    }

    return recommendations;
  }
}

export { CONFIG_DOMAINS, ADAPTATION_RULES };
export default new AdaptiveConfigAgent();
