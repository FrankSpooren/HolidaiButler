import architectureAdvisor from './architectureAdvisor.js';
import learningAgent from './learningAgent.js';
import adaptiveConfigAgent from './adaptiveConfigAgent.js';
import predictionAgent from './predictionAgent.js';
import syncScheduler, { STRATEGY_JOBS } from './syncScheduler.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

/**
 * Strategy Layer Agent Suite v1.0
 * Intelligent architecture and adaptive optimization
 *
 * Components:
 * - Architecture Advisor: System design recommendations
 * - Learning Agent: Pattern analysis and optimization
 * - Adaptive Config Agent: Dynamic configuration tuning
 * - Prediction Agent: Proactive issue detection
 */
class StrategyLayerAgent {
  constructor() {
    this.initialized = false;
  }

  async initialize(sequelize, mongoose) {
    console.log('[StrategyLayerAgent] Initializing...');

    try {
      // Set database connections for all components
      architectureAdvisor.setConnections(sequelize, mongoose);
      learningAgent.setConnections(sequelize, mongoose);
      predictionAgent.setConnections(sequelize, mongoose);

      // Initialize scheduled jobs
      await syncScheduler.initializeScheduledJobs();

      this.initialized = true;
      console.log('[StrategyLayerAgent] Ready');

      await logAgent('strategy-layer', 'initialized', {
        description: 'Strategy Layer Agent v1.0 initialized successfully',
        metadata: { jobs: Object.keys(STRATEGY_JOBS) }
      });
    } catch (error) {
      await logError('strategy-layer', error, { action: 'initialize' });
      throw error;
    }
  }

  // Architecture Advisor
  async generateAssessment() {
    return architectureAdvisor.generateAssessment();
  }

  getArchitecturePrinciples() {
    return architectureAdvisor.getArchitecturePrinciples();
  }

  // Learning Agent
  async learn() {
    return learningAgent.learn();
  }

  async getOptimizationSuggestions() {
    return learningAgent.getOptimizationSuggestions();
  }

  getLearningHistory(days = 7) {
    return learningAgent.getLearningHistory(days);
  }

  // Adaptive Config
  async evaluateConfig(metrics) {
    return adaptiveConfigAgent.evaluate(metrics);
  }

  async resetConfig(ruleName = null) {
    return adaptiveConfigAgent.reset(ruleName);
  }

  getCurrentConfig() {
    return adaptiveConfigAgent.getCurrentConfig();
  }

  getActiveAdaptations() {
    return adaptiveConfigAgent.getActiveAdaptations();
  }

  getConfigRecommendations() {
    return adaptiveConfigAgent.getRecommendations();
  }

  // Prediction Agent
  async predict() {
    return predictionAgent.predict();
  }

  getPredictionHistory(limit = 10) {
    return predictionAgent.getPredictionHistory(limit);
  }

  getPredictionModels() {
    return predictionAgent.getPredictionModels();
  }

  // Combined status
  async getStatus() {
    const jobs = syncScheduler.getJobs();

    return {
      agent: 'strategy-layer',
      version: '1.0',
      status: this.initialized ? 'active' : 'inactive',
      components: {
        architectureAdvisor: 'active',
        learningAgent: 'active',
        adaptiveConfigAgent: 'active',
        predictionAgent: 'active'
      },
      scheduledJobs: Object.keys(jobs).length,
      jobs: Object.keys(jobs),
      activeAdaptations: adaptiveConfigAgent.getActiveAdaptations(),
      timestamp: new Date().toISOString()
    };
  }
}

export default new StrategyLayerAgent();
