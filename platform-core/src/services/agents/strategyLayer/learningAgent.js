import mongoose from 'mongoose';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import patternAnalyzer from './analyzers/patternAnalyzer.js';

/**
 * De Leermeester — Learning Agent
 * Learns from system patterns and suggests optimizations
 * Persistent storage via MongoDB (survives PM2 restart)
 *
 * Capabilities:
 * - Pattern recognition over time
 * - Trend analysis
 * - Anomaly detection
 * - Optimization suggestions
 */

// MongoDB schema for persistent pattern storage
const LearningPatternSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  errorLearnings: { type: Array, default: [] },
  performanceLearnings: { type: Array, default: [] },
  usageLearnings: { type: Array, default: [] },
  optimizations: { type: Array, default: [] }
}, {
  collection: 'agent_learning_patterns',
  timestamps: true
});

let LearningPattern;
try {
  LearningPattern = mongoose.model('LearningPattern');
} catch {
  LearningPattern = mongoose.model('LearningPattern', LearningPatternSchema);
}

class LearningAgent {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
    this.learningCache = new Map(); // In-memory cache, backed by MongoDB
    this.initialized = false;
  }

  async setConnections(sequelize, mongoose) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
    patternAnalyzer.setConnections(sequelize, mongoose);
    await this.loadFromDB();
  }

  /**
   * Load recent patterns from MongoDB into in-memory cache
   */
  async loadFromDB() {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const patterns = await LearningPattern.find({
        timestamp: { $gte: cutoff }
      }).lean();

      for (const pattern of patterns) {
        this.learningCache.set(pattern.date, {
          timestamp: pattern.timestamp,
          errorLearnings: pattern.errorLearnings,
          performanceLearnings: pattern.performanceLearnings,
          usageLearnings: pattern.usageLearnings,
          optimizations: pattern.optimizations
        });
      }

      this.initialized = true;
      console.log(`[De Leermeester] Loaded ${patterns.length} learning patterns from MongoDB`);
    } catch (error) {
      console.error('[De Leermeester] Failed to load patterns from MongoDB:', error.message);
      this.initialized = true; // Continue without historical data
    }
  }

  /**
   * Learn from recent patterns and update knowledge
   */
  async learn() {
    console.log('[De Leermeester] Learning from recent patterns...');

    try {
      const learnings = {
        timestamp: new Date().toISOString(),
        errorLearnings: await this.learnFromErrors(),
        performanceLearnings: await this.learnFromPerformance(),
        usageLearnings: await this.learnFromUsage(),
        optimizations: []
      };

      // Generate optimizations based on learnings
      learnings.optimizations = this.generateOptimizations(learnings);

      // Store in cache
      const dateKey = new Date().toISOString().substring(0, 10);
      this.learningCache.set(dateKey, learnings);

      // Persist to MongoDB
      try {
        await LearningPattern.findOneAndUpdate(
          { date: dateKey },
          {
            date: dateKey,
            timestamp: new Date(),
            errorLearnings: learnings.errorLearnings,
            performanceLearnings: learnings.performanceLearnings,
            usageLearnings: learnings.usageLearnings,
            optimizations: learnings.optimizations
          },
          { upsert: true, new: true }
        );
        console.log(`[De Leermeester] Persisted learnings to MongoDB (${dateKey})`);
      } catch (dbError) {
        console.error('[De Leermeester] Failed to persist learnings:', dbError.message);
      }

      // Prune cache (keep last 30 days)
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
      for (const [key] of this.learningCache) {
        if (key < cutoff) this.learningCache.delete(key);
      }

      await logAgent('strategy-layer', 'learning_completed', {
        description: `[De Leermeester] Learning cycle completed. ${learnings.optimizations.length} optimizations suggested. Persisted to MongoDB.`,
        metadata: { optimizationCount: learnings.optimizations.length, persistent: true }
      });

      return learnings;
    } catch (error) {
      await logError('strategy-layer', error, { action: 'learn' });
      throw error;
    }
  }

  /**
   * Learn from error patterns
   */
  async learnFromErrors() {
    const errorPatterns = await patternAnalyzer.analyzeErrorPatterns(168); // 7 days

    const learnings = [];

    // Identify most common error types
    const errorTypes = new Map();
    for (const pattern of errorPatterns.patterns) {
      const type = pattern.key.split(':')[0]; // Agent name
      errorTypes.set(type, (errorTypes.get(type) || 0) + pattern.count);
    }

    for (const [type, count] of errorTypes) {
      if (count > 5) {
        learnings.push({
          type: 'error_hotspot',
          agent: type,
          errorCount: count,
          insight: `${type} agent has recurring issues - consider refactoring`,
          confidence: Math.min(0.9, count / 50)
        });
      }
    }

    // Detect time-based error patterns
    const hourlyErrors = new Map();
    for (const pattern of errorPatterns.patterns) {
      if (pattern.hour) {
        hourlyErrors.set(pattern.hour, (hourlyErrors.get(pattern.hour) || 0) + pattern.count);
      }
    }

    return learnings;
  }

  /**
   * Learn from performance patterns
   */
  async learnFromPerformance() {
    const perfPatterns = await patternAnalyzer.analyzePerformancePatterns(14); // 2 weeks

    const learnings = [];

    // Identify performance bottlenecks
    for (const pattern of perfPatterns.patterns) {
      if (pattern.type === 'PERFORMANCE_DEGRADATION') {
        learnings.push({
          type: 'performance_bottleneck',
          metric: pattern.metric,
          degradation: pattern.degradation,
          insight: `${pattern.metric} showing ${pattern.degradation} degradation trend`,
          confidence: 0.8
        });
      }
    }

    // Learn peak hours
    const peakHours = perfPatterns.patterns
      .filter(p => p.type === 'PEAK_USAGE')
      .map(p => ({ hour: p.hour, multiplier: p.multiplier }));

    if (peakHours.length > 0) {
      learnings.push({
        type: 'usage_pattern',
        peakHours,
        insight: 'Identified peak usage hours for potential pre-scaling',
        confidence: 0.85
      });
    }

    return learnings;
  }

  /**
   * Learn from usage patterns
   */
  async learnFromUsage() {
    const journeyPatterns = await patternAnalyzer.analyzeUserJourneyPatterns();

    const learnings = [];

    // Learn from journey completion rates
    for (const [type, stats] of Object.entries(journeyPatterns.journeyStats)) {
      const completionRate = stats.completed / stats.total;

      if (completionRate < 0.5) {
        learnings.push({
          type: 'journey_optimization',
          journeyType: type,
          completionRate: `${Math.round(completionRate * 100)}%`,
          insight: `${type} journey has low completion - review content/timing`,
          confidence: 0.75
        });
      } else if (completionRate > 0.8) {
        learnings.push({
          type: 'journey_success',
          journeyType: type,
          completionRate: `${Math.round(completionRate * 100)}%`,
          insight: `${type} journey performing well - consider as template`,
          confidence: 0.9
        });
      }
    }

    return learnings;
  }

  /**
   * Generate optimization suggestions based on learnings
   */
  generateOptimizations(learnings) {
    const optimizations = [];

    // Error-based optimizations
    for (const learning of learnings.errorLearnings) {
      if (learning.type === 'error_hotspot' && learning.confidence > 0.7) {
        optimizations.push({
          type: 'CODE_IMPROVEMENT',
          target: learning.agent,
          action: `Refactor ${learning.agent} to reduce error rate`,
          impact: 'HIGH',
          confidence: learning.confidence,
          automated: false
        });
      }
    }

    // Performance-based optimizations
    for (const learning of learnings.performanceLearnings) {
      if (learning.type === 'performance_bottleneck') {
        optimizations.push({
          type: 'PERFORMANCE_TUNING',
          target: learning.metric,
          action: `Optimize ${learning.metric} - ${learning.degradation} degradation detected`,
          impact: 'MEDIUM',
          confidence: learning.confidence,
          automated: false
        });
      }

      if (learning.type === 'usage_pattern') {
        optimizations.push({
          type: 'SCALING_STRATEGY',
          target: 'infrastructure',
          action: `Consider pre-scaling during peak hours: ${learning.peakHours.map(p => p.hour).join(', ')}`,
          impact: 'MEDIUM',
          confidence: learning.confidence,
          automated: true
        });
      }
    }

    // Usage-based optimizations
    for (const learning of learnings.usageLearnings) {
      if (learning.type === 'journey_optimization') {
        optimizations.push({
          type: 'UX_IMPROVEMENT',
          target: learning.journeyType,
          action: `Optimize ${learning.journeyType} journey (${learning.completionRate} completion)`,
          impact: 'MEDIUM',
          confidence: learning.confidence,
          automated: false
        });
      }
    }

    // Sort by impact and confidence
    const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    optimizations.sort((a, b) => {
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.confidence - a.confidence;
    });

    return optimizations;
  }

  /**
   * Get historical learnings
   */
  getLearningHistory(days = 7) {
    const history = [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    for (const [date, learnings] of this.learningCache) {
      if (date >= cutoff) {
        history.push({ date, ...learnings });
      }
    }

    return history.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions() {
    const learnings = await this.learn();
    return {
      timestamp: new Date().toISOString(),
      suggestions: learnings.optimizations,
      totalLearnings: [
        ...learnings.errorLearnings,
        ...learnings.performanceLearnings,
        ...learnings.usageLearnings
      ].length
    };
  }
}

export default new LearningAgent();
