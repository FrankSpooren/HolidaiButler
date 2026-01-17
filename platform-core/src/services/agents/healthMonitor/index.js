/**
 * Platform Health Monitor Agent
 * Realtime system monitoring for HolidaiButler platform
 *
 * @module agents/healthMonitor
 * @version 1.0.0
 *
 * Features:
 * - Server health (ping, resources, disk)
 * - Database health (MySQL, MongoDB, Redis)
 * - API health (HolidaiButler, MistralAI, Apify, ChromaDB, Bugsink)
 * - Frontend health (all portals)
 * - Queue health (BullMQ)
 * - Alert integration with Owner Interface Agent
 */

import reporter from './reporter.js';
import alertIntegration from './alertIntegration.js';
import serverHealth from './checks/serverHealth.js';
import databaseHealth from './checks/databaseHealth.js';
import apiHealth from './checks/apiHealth.js';
import frontendHealth from './checks/frontendHealth.js';
import queueHealth from './checks/queueHealth.js';

class PlatformHealthMonitor {
  constructor() {
    this.name = 'Platform Health Monitor';
    this.version = '1.0.0';
    this.lastFullCheck = null;
    this.lastQuickCheck = null;
    this.checkHistory = [];
    this.maxHistoryItems = 100;
  }

  /**
   * Run a full health check and optionally send alerts
   * @param {Object} options - Options
   * @param {boolean} options.sendAlerts - Whether to send alerts (default: true)
   * @returns {Promise<Object>} Health report with alert results
   */
  async runFullHealthCheck(options = { sendAlerts: true }) {
    console.log('[HealthMonitor] Running full health check...');

    const report = await reporter.runFullHealthCheck();
    this.lastFullCheck = report;
    this.addToHistory('full', report);

    let alertResults = null;
    if (options.sendAlerts) {
      alertResults = await alertIntegration.processHealthReport(report);
    }

    console.log(`[HealthMonitor] Full check complete: ${report.overallStatus}`);

    return {
      report,
      alerts: alertResults,
      summary: reporter.generateSummary(report)
    };
  }

  /**
   * Run a quick health check (critical systems only)
   * @param {Object} options - Options
   * @param {boolean} options.sendAlerts - Whether to send alerts (default: true)
   * @returns {Promise<Object>} Quick health report
   */
  async runQuickHealthCheck(options = { sendAlerts: true }) {
    console.log('[HealthMonitor] Running quick health check...');

    const report = await reporter.runQuickHealthCheck();
    this.lastQuickCheck = report;
    this.addToHistory('quick', report);

    let alertResults = null;
    if (options.sendAlerts && report.overallStatus !== 'healthy') {
      alertResults = await alertIntegration.processHealthReport({
        ...report,
        categories: {
          critical: {
            checks: report.checks,
            status: report.overallStatus
          }
        }
      });
    }

    console.log(`[HealthMonitor] Quick check complete: ${report.overallStatus}`);

    return {
      report,
      alerts: alertResults
    };
  }

  /**
   * Run a specific category of health checks
   * @param {string} category - Category to check (server, database, api, frontend, queue)
   * @returns {Promise<Object>} Category health report
   */
  async runCategoryCheck(category) {
    console.log(`[HealthMonitor] Running ${category} health check...`);

    let result;
    switch (category.toLowerCase()) {
      case 'server':
        result = await reporter.runServerChecks();
        break;
      case 'database':
        result = await reporter.runDatabaseChecks();
        break;
      case 'api':
        result = await reporter.runAPIChecks();
        break;
      case 'frontend':
        result = await reporter.runFrontendChecks();
        break;
      case 'queue':
        result = await reporter.runQueueChecks();
        break;
      default:
        throw new Error(`Unknown category: ${category}`);
    }

    this.addToHistory(category, result);
    return result;
  }

  /**
   * Add check result to history
   * @param {string} type - Check type
   * @param {Object} result - Check result
   */
  addToHistory(type, result) {
    this.checkHistory.unshift({
      type,
      timestamp: new Date().toISOString(),
      status: result.overallStatus || result.status,
      executionTimeMs: result.executionTimeMs
    });

    // Keep history limited
    if (this.checkHistory.length > this.maxHistoryItems) {
      this.checkHistory = this.checkHistory.slice(0, this.maxHistoryItems);
    }
  }

  /**
   * Get the last full health check report
   * @returns {Object|null} Last report or null
   */
  getLastFullCheck() {
    return this.lastFullCheck;
  }

  /**
   * Get the last quick health check report
   * @returns {Object|null} Last report or null
   */
  getLastQuickCheck() {
    return this.lastQuickCheck;
  }

  /**
   * Get check history
   * @param {number} limit - Maximum items to return
   * @returns {Array} Check history
   */
  getHistory(limit = 10) {
    return this.checkHistory.slice(0, limit);
  }

  /**
   * Get current alert cooldown status
   * @returns {Object} Cooldown status
   */
  getAlertCooldowns() {
    return alertIntegration.getCooldownStatus();
  }

  /**
   * Send immediate critical alert
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @returns {Promise<Object>} Alert result
   */
  async sendCriticalAlert(title, message) {
    return alertIntegration.sendCriticalAlert(title, message);
  }

  /**
   * Get health monitor status
   * @returns {Object} Monitor status
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      lastFullCheck: this.lastFullCheck?.timestamp || null,
      lastQuickCheck: this.lastQuickCheck?.timestamp || null,
      historyCount: this.checkHistory.length,
      lastStatus: this.lastFullCheck?.overallStatus || this.lastQuickCheck?.overallStatus || 'unknown'
    };
  }

  /**
   * BullMQ job handler for scheduled health checks
   * @param {Object} job - BullMQ job
   * @returns {Promise<Object>} Job result
   */
  async handleJob(job) {
    const { checkType = 'full' } = job.data || {};

    console.log(`[HealthMonitor] Processing job: ${job.name} (type: ${checkType})`);

    try {
      let result;

      switch (checkType) {
        case 'quick':
          result = await this.runQuickHealthCheck();
          break;
        case 'full':
        default:
          result = await this.runFullHealthCheck();
          break;
      }

      return {
        success: true,
        checkType,
        status: result.report.overallStatus,
        alertsSent: result.alerts?.alertsSent || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[HealthMonitor] Job failed:', error.message);

      // Attempt to send critical alert about the failure
      try {
        await this.sendCriticalAlert(
          'Health Monitor Failure',
          `Health check job failed: ${error.message}`
        );
      } catch (alertError) {
        console.error('[HealthMonitor] Failed to send failure alert:', alertError.message);
      }

      throw error;
    }
  }
}

// Export singleton instance
const healthMonitor = new PlatformHealthMonitor();
export default healthMonitor;

// Also export individual components for direct access
export {
  reporter,
  alertIntegration,
  serverHealth,
  databaseHealth,
  apiHealth,
  frontendHealth,
  queueHealth
};
