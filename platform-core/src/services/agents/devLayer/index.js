import uxReviewer, { BRAND_COLORS, UX_PRINCIPLES, WCAG_CHECKS } from './reviewers/uxReviewer.js';
import codeReviewer from './reviewers/codeReviewer.js';
import securityReviewer, { OWASP_CHECKS } from './reviewers/securityReviewer.js';
import qualityChecker from './qualityChecker.js';
import syncScheduler, { DEV_LAYER_JOBS } from './syncScheduler.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

/**
 * Development Layer Agent Suite v1.0
 * Enterprise-level code quality automation
 *
 * Components:
 * - UX/UI Reviewer: Interface quality analysis
 * - Code Reviewer: Code standards and best practices
 * - Security Reviewer: OWASP Top 10 and security audit
 * - Quality Checker: Orchestration and CI/CD integration
 */
class DevLayerAgent {
  constructor() {
    this.initialized = false;
  }

  async initialize(sequelize = null) {
    console.log('[DevLayerAgent] Initializing...');

    try {
      if (sequelize) {
        qualityChecker.setSequelize(sequelize);
      }

      // Note: Scheduled jobs are registered in orchestrator/scheduler.js
      // to avoid duplicate job registration
      console.log('[DevLayerAgent] Jobs scheduled via main scheduler (3 jobs)');

      this.initialized = true;
      console.log('[DevLayerAgent] Ready');

      await logAgent('dev-layer', 'agent_initialized', {
        description: 'Development Layer Agent v1.0 initialized',
        metadata: {
          components: ['uxReviewer', 'codeReviewer', 'securityReviewer', 'qualityChecker'],
          scheduledJobs: Object.keys(DEV_LAYER_JOBS).length
        }
      });

      return { success: true, message: 'Development Layer Agent initialized' };
    } catch (error) {
      console.error('[DevLayerAgent] Initialization failed:', error.message);
      await logError('dev-layer', error, { action: 'initialize' });
      throw error;
    }
  }

  // UX Reviews
  async reviewUX(filePath, content) {
    return uxReviewer.reviewFile(filePath, content);
  }

  // Code Reviews
  async reviewCode(filePath, content, fileType) {
    return codeReviewer.reviewFile(filePath, content, fileType);
  }

  // Security Reviews
  async reviewSecurity(filePath, content) {
    return securityReviewer.reviewFile(filePath, content);
  }

  // Comprehensive file check
  async checkFile(filePath, options = {}) {
    return qualityChecker.checkFile(filePath, options);
  }

  // Batch file check
  async checkFiles(filePaths, options = {}) {
    return qualityChecker.checkFiles(filePaths, options);
  }

  // Project-wide check
  async checkProject(projectName) {
    return qualityChecker.checkProject(projectName);
  }

  // Get references
  getBrandColors() {
    return BRAND_COLORS;
  }

  getUXPrinciples() {
    return UX_PRINCIPLES;
  }

  getWCAGChecks() {
    return WCAG_CHECKS;
  }

  getOWASPChecks() {
    return Object.keys(OWASP_CHECKS).map(key => ({
      id: key,
      name: OWASP_CHECKS[key].name
    }));
  }

  // Status
  async getStatus() {
    const jobs = syncScheduler.getJobs();

    return {
      agent: 'dev-layer',
      version: '1.0',
      status: this.initialized ? 'active' : 'inactive',
      components: {
        uxReviewer: 'active',
        codeReviewer: 'active',
        securityReviewer: 'active',
        qualityChecker: 'active'
      },
      scheduledJobs: Object.keys(jobs).length,
      jobs: Object.keys(jobs),
      timestamp: new Date().toISOString()
    };
  }
}

export default new DevLayerAgent();
