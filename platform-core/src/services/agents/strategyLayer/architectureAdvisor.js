import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import patternAnalyzer from './analyzers/patternAnalyzer.js';

/**
 * Architecture Advisor Agent
 * Provides strategic system design recommendations
 *
 * Analyzes:
 * - System health trends
 * - Scalability needs
 * - Technical debt indicators
 * - Optimization opportunities
 */

// Architecture principles (aligned with HolidaiButler standards)
const ARCHITECTURE_PRINCIPLES = {
  EU_COMPLIANCE: {
    name: 'EU-First Infrastructure',
    description: 'All services must be EU-hosted and GDPR compliant',
    check: 'Verify no US-based services in critical path'
  },
  RESILIENCE: {
    name: 'Fault Tolerance',
    description: 'System should gracefully handle failures',
    check: 'Implement circuit breakers, retries, and fallbacks'
  },
  SCALABILITY: {
    name: 'Horizontal Scalability',
    description: 'System should scale with demand',
    check: 'Stateless services, queue-based processing'
  },
  OBSERVABILITY: {
    name: 'Full Observability',
    description: 'Complete visibility into system behavior',
    check: 'Logging, metrics, tracing, alerting'
  },
  SECURITY: {
    name: 'Defense in Depth',
    description: 'Multiple security layers',
    check: 'OWASP compliance, secrets management, input validation'
  }
};

// Scalability thresholds
const SCALABILITY_THRESHOLDS = {
  CPU_WARNING: 70,
  CPU_CRITICAL: 85,
  MEMORY_WARNING: 75,
  MEMORY_CRITICAL: 90,
  DISK_WARNING: 80,
  DISK_CRITICAL: 90,
  QUEUE_BACKLOG_WARNING: 100,
  QUEUE_BACKLOG_CRITICAL: 500
};

class ArchitectureAdvisor {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
  }

  setConnections(sequelize, mongoose) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
    patternAnalyzer.setConnections(sequelize, mongoose);
  }

  /**
   * Generate comprehensive architecture assessment
   */
  async generateAssessment() {
    console.log('[ArchitectureAdvisor] Generating architecture assessment...');

    try {
      const assessment = {
        timestamp: new Date().toISOString(),
        overallScore: 0,
        categories: {},
        recommendations: [],
        insights: []
      };

      // 1. Analyze patterns
      const errorPatterns = await patternAnalyzer.analyzeErrorPatterns(168); // 7 days
      const perfPatterns = await patternAnalyzer.analyzePerformancePatterns(7);
      const costPatterns = await patternAnalyzer.analyzeCostPatterns(30);

      // 2. Assess each category
      assessment.categories.stability = this.assessStability(errorPatterns);
      assessment.categories.performance = this.assessPerformance(perfPatterns);
      assessment.categories.costEfficiency = this.assessCostEfficiency(costPatterns);
      assessment.categories.scalability = await this.assessScalability();
      assessment.categories.compliance = await this.assessCompliance();

      // 3. Calculate overall score
      const scores = Object.values(assessment.categories).map(c => c.score);
      assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // 4. Generate recommendations
      assessment.recommendations = this.generateRecommendations(assessment.categories);

      // 5. Generate strategic insights
      assessment.insights = this.generateInsights(assessment);

      // 6. Determine status
      assessment.status =
        assessment.overallScore >= 80 ? 'HEALTHY' :
        assessment.overallScore >= 60 ? 'NEEDS_ATTENTION' : 'CRITICAL';

      await logAgent('strategy-layer', 'assessment_generated', {
        description: `Architecture assessment: ${assessment.status} (Score: ${assessment.overallScore}%)`,
        metadata: {
          score: assessment.overallScore,
          status: assessment.status,
          recommendationCount: assessment.recommendations.length
        }
      });

      return assessment;
    } catch (error) {
      await logError('strategy-layer', error, { action: 'generate_assessment' });
      throw error;
    }
  }

  /**
   * Assess system stability
   */
  assessStability(errorPatterns) {
    let score = 100;
    const issues = [];

    // Deduct for error patterns
    for (const pattern of errorPatterns.patterns) {
      if (pattern.severity === 'critical') {
        score -= 20;
        issues.push(`Critical: ${pattern.name} - ${pattern.key}`);
      } else if (pattern.severity === 'high') {
        score -= 10;
        issues.push(`High: ${pattern.name}`);
      } else {
        score -= 5;
      }
    }

    // Deduct for high error count
    if (errorPatterns.totalErrors > 100) score -= 15;
    else if (errorPatterns.totalErrors > 50) score -= 10;
    else if (errorPatterns.totalErrors > 20) score -= 5;

    return {
      name: 'System Stability',
      score: Math.max(0, score),
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
      issues,
      errorCount: errorPatterns.totalErrors,
      patternCount: errorPatterns.patterns.length
    };
  }

  /**
   * Assess performance
   */
  assessPerformance(perfPatterns) {
    let score = 100;
    const issues = [];

    for (const pattern of perfPatterns.patterns) {
      if (pattern.type === 'PERFORMANCE_DEGRADATION') {
        score -= 15;
        issues.push(`${pattern.metric}: ${pattern.degradation} degradation`);
      } else if (pattern.type === 'PEAK_USAGE') {
        score -= 5; // Not necessarily bad, just needs attention
        issues.push(`Peak at ${pattern.hour}: ${pattern.multiplier}x average`);
      }
    }

    return {
      name: 'Performance',
      score: Math.max(0, score),
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
      issues,
      patternCount: perfPatterns.patterns.length
    };
  }

  /**
   * Assess cost efficiency
   */
  assessCostEfficiency(costPatterns) {
    let score = 100;
    const issues = [];

    for (const pattern of costPatterns.patterns) {
      if (pattern.type === 'COST_ANOMALY') {
        score -= 10;
        issues.push(`${pattern.date}: ${pattern.overBudget} over budget`);
      }
    }

    return {
      name: 'Cost Efficiency',
      score: Math.max(0, score),
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
      issues,
      topServices: costPatterns.topServices,
      anomalyCount: costPatterns.patterns.length
    };
  }

  /**
   * Assess scalability readiness
   */
  async assessScalability() {
    let score = 100;
    const issues = [];
    const metrics = {};

    try {
      // Check queue backlog
      const { scheduledQueue } = await import('../../orchestrator/queues.js');
      const waiting = await scheduledQueue.getWaitingCount();
      const active = await scheduledQueue.getActiveCount();

      metrics.queueBacklog = waiting;
      metrics.activeJobs = active;

      if (waiting > SCALABILITY_THRESHOLDS.QUEUE_BACKLOG_CRITICAL) {
        score -= 25;
        issues.push(`Queue backlog critical: ${waiting} jobs waiting`);
      } else if (waiting > SCALABILITY_THRESHOLDS.QUEUE_BACKLOG_WARNING) {
        score -= 10;
        issues.push(`Queue backlog warning: ${waiting} jobs waiting`);
      }

      // Check for database connection usage (if available)
      const [connStats] = await this.sequelize.query(`
        SHOW STATUS LIKE 'Threads_connected'
      `);
      if (connStats.length > 0) {
        metrics.dbConnections = parseInt(connStats[0].Value);
        if (metrics.dbConnections > 50) {
          score -= 10;
          issues.push(`High database connections: ${metrics.dbConnections}`);
        }
      }
    } catch (e) {
      issues.push(`Could not assess some metrics: ${e.message}`);
    }

    return {
      name: 'Scalability Readiness',
      score: Math.max(0, score),
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
      issues,
      metrics
    };
  }

  /**
   * Assess EU compliance
   */
  async assessCompliance() {
    let score = 100;
    const issues = [];
    const checks = [];

    // Check EU-first services
    const euServices = [
      { name: 'Hetzner (Server)', location: 'DE', compliant: true },
      { name: 'Bugsink (Monitoring)', location: 'NL', compliant: true },
      { name: 'MailerLite (Email)', location: 'LT', compliant: true },
      { name: 'Threema (Alerts)', location: 'CH', compliant: true },
      { name: 'MistralAI (LLM)', location: 'FR', compliant: true }
    ];

    checks.push(...euServices.map(s => ({
      service: s.name,
      location: s.location,
      status: s.compliant ? 'Compliant' : 'Non-compliant'
    })));

    // Check GDPR agent status
    try {
      const gdprModule = await import('../gdpr/index.js');
      const gdprAgent = gdprModule.default;
      const gdprStatus = await gdprAgent.getStatus();
      if (gdprStatus.status === 'active') {
        checks.push({ service: 'GDPR Agent', status: 'Active' });
      } else {
        score -= 20;
        issues.push('GDPR Agent not active');
      }
    } catch (e) {
      score -= 10;
      issues.push('Could not verify GDPR Agent status');
    }

    return {
      name: 'EU Compliance',
      score: Math.max(0, score),
      status: score >= 90 ? 'compliant' : score >= 70 ? 'needs_review' : 'non_compliant',
      issues,
      checks
    };
  }

  /**
   * Generate prioritized recommendations
   */
  generateRecommendations(categories) {
    const recommendations = [];

    // Stability recommendations
    if (categories.stability.score < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Stability',
        title: 'Address Recurring Errors',
        description: `${categories.stability.errorCount} errors in last 7 days. Focus on root cause analysis.`,
        actions: [
          'Review error logs in Bugsink',
          'Implement circuit breakers for external APIs',
          'Add retry logic with exponential backoff'
        ]
      });
    }

    // Performance recommendations
    if (categories.performance.score < 80) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        title: 'Optimize Performance',
        description: 'Performance degradation detected.',
        actions: [
          'Profile slow endpoints',
          'Implement caching for frequent queries',
          'Consider database query optimization'
        ]
      });
    }

    // Cost recommendations
    if (categories.costEfficiency.score < 80) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Cost',
        title: 'Optimize API Costs',
        description: `${categories.costEfficiency.anomalyCount} cost anomalies detected.`,
        actions: [
          'Review top cost services',
          'Implement request caching',
          'Consider batch processing'
        ]
      });
    }

    // Scalability recommendations
    if (categories.scalability.score < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Scalability',
        title: 'Address Scalability Concerns',
        description: 'System approaching capacity limits.',
        actions: [
          'Review queue worker concurrency',
          'Consider horizontal scaling',
          'Implement load balancing'
        ]
      });
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Generate strategic insights
   */
  generateInsights(assessment) {
    const insights = [];

    if (assessment.overallScore >= 80) {
      insights.push({
        type: 'positive',
        message: 'System architecture is healthy. Continue monitoring for early issue detection.'
      });
    }

    if (assessment.categories.stability.errorCount === 0) {
      insights.push({
        type: 'positive',
        message: 'Zero errors in monitoring period - excellent stability!'
      });
    }

    if (assessment.categories.compliance.score >= 90) {
      insights.push({
        type: 'positive',
        message: 'Full EU compliance maintained - GDPR and EU AI Act ready.'
      });
    }

    if (assessment.recommendations.filter(r => r.priority === 'HIGH').length > 2) {
      insights.push({
        type: 'warning',
        message: 'Multiple high-priority issues require immediate attention.'
      });
    }

    return insights;
  }

  /**
   * Get architecture principles reference
   */
  getArchitecturePrinciples() {
    return ARCHITECTURE_PRINCIPLES;
  }
}

export { ARCHITECTURE_PRINCIPLES, SCALABILITY_THRESHOLDS };
export default new ArchitectureAdvisor();
