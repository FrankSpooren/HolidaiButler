/**
 * Platform Health Reporter
 * Runs all health checks and calculates overall system status
 *
 * @module healthMonitor/reporter
 */

import serverHealth from './checks/serverHealth.js';
import databaseHealth from './checks/databaseHealth.js';
import apiHealth from './checks/apiHealth.js';
import frontendHealth from './checks/frontendHealth.js';
import queueHealth from './checks/queueHealth.js';

class HealthReporter {
  constructor() {
    this.statusPriority = {
      'critical': 1,
      'unhealthy': 2,
      'error': 3,
      'warning': 4,
      'degraded': 5,
      'healthy': 6
    };
  }

  /**
   * Determines overall status based on individual check statuses
   * @param {Array} results - Array of check results
   * @returns {string} Overall status
   */
  calculateOverallStatus(results) {
    let worstStatus = 'healthy';
    let worstPriority = this.statusPriority['healthy'];

    for (const result of results) {
      const status = result.status || 'unknown';
      const priority = this.statusPriority[status] || 0;

      if (priority < worstPriority) {
        worstPriority = priority;
        worstStatus = status;
      }
    }

    return worstStatus;
  }

  /**
   * Runs all server health checks
   * @returns {Promise<Object>} Server health results
   */
  async runServerChecks() {
    const [ping, resources, disk] = await Promise.all([
      serverHealth.checkServerPing('91.98.71.87'),
      serverHealth.checkSystemResources(),
      serverHealth.checkDiskSpace()
    ]);

    return {
      category: 'server',
      checks: [ping, resources, disk],
      status: this.calculateOverallStatus([ping, resources, disk])
    };
  }

  /**
   * Runs all database health checks
   * @returns {Promise<Object>} Database health results
   */
  async runDatabaseChecks() {
    const [mysql, mongodb, redis] = await Promise.all([
      databaseHealth.checkMySQL(),
      databaseHealth.checkMongoDB(),
      databaseHealth.checkRedis()
    ]);

    return {
      category: 'database',
      checks: [mysql, mongodb, redis],
      status: this.calculateOverallStatus([mysql, mongodb, redis])
    };
  }

  /**
   * Runs all API health checks
   * @returns {Promise<Object>} API health results
   */
  async runAPIChecks() {
    const [holidaibutler, mistral, apify, chromadb, bugsink] = await Promise.all([
      apiHealth.checkHolidaiButlerAPI(),
      apiHealth.checkMistralAI(),
      apiHealth.checkApify(),
      apiHealth.checkChromaDB(),
      apiHealth.checkBugsink()
    ]);

    return {
      category: 'api',
      checks: [holidaibutler, mistral, apify, chromadb, bugsink],
      status: this.calculateOverallStatus([holidaibutler, mistral, apify, chromadb, bugsink])
    };
  }

  /**
   * Runs all frontend health checks
   * @returns {Promise<Object>} Frontend health results
   */
  async runFrontendChecks() {
    const [production, test, dev, admin] = await Promise.all([
      frontendHealth.checkPortal('production'),
      frontendHealth.checkPortal('test'),
      frontendHealth.checkPortal('dev'),
      frontendHealth.checkPortal('admin')
    ]);

    return {
      category: 'frontend',
      checks: [production, test, dev, admin],
      status: this.calculateOverallStatus([production, test, dev, admin])
    };
  }

  /**
   * Runs all queue health checks
   * @returns {Promise<Object>} Queue health results
   */
  async runQueueChecks() {
    const [queues, workers] = await Promise.all([
      queueHealth.checkAllQueues(),
      queueHealth.checkWorkers()
    ]);

    return {
      category: 'queue',
      checks: [queues, workers],
      status: this.calculateOverallStatus([queues, workers])
    };
  }

  /**
   * Runs a complete health check across all categories
   * @returns {Promise<Object>} Complete health report
   */
  async runFullHealthCheck() {
    const startTime = Date.now();

    const [server, database, api, frontend, queue] = await Promise.all([
      this.runServerChecks(),
      this.runDatabaseChecks(),
      this.runAPIChecks(),
      this.runFrontendChecks(),
      this.runQueueChecks()
    ]);

    const categories = [server, database, api, frontend, queue];
    const overallStatus = this.calculateOverallStatus(categories);
    const executionTime = Date.now() - startTime;

    // Count issues by severity
    const issues = {
      critical: 0,
      unhealthy: 0,
      warning: 0
    };

    categories.forEach(category => {
      category.checks.forEach(check => {
        if (check.status === 'critical') issues.critical++;
        if (check.status === 'unhealthy' || check.status === 'error') issues.unhealthy++;
        if (check.status === 'warning' || check.status === 'degraded') issues.warning++;
      });
    });

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      executionTimeMs: executionTime,
      summary: {
        totalChecks: categories.reduce((sum, cat) => sum + cat.checks.length, 0),
        issues
      },
      categories: {
        server,
        database,
        api,
        frontend,
        queue
      }
    };
  }

  /**
   * Runs a quick health check (critical systems only)
   * @returns {Promise<Object>} Quick health report
   */
  async runQuickHealthCheck() {
    const startTime = Date.now();

    const [serverPing, mysql, redis, api] = await Promise.all([
      serverHealth.checkServerPing('91.98.71.87'),
      databaseHealth.checkMySQL(),
      databaseHealth.checkRedis(),
      apiHealth.checkHolidaiButlerAPI()
    ]);

    const checks = [serverPing, mysql, redis, api];
    const overallStatus = this.calculateOverallStatus(checks);

    return {
      timestamp: new Date().toISOString(),
      type: 'quick',
      overallStatus,
      executionTimeMs: Date.now() - startTime,
      checks
    };
  }

  /**
   * Generates a human-readable summary of the health report
   * @param {Object} report - Health report object
   * @returns {string} Human-readable summary
   */
  generateSummary(report) {
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      degraded: '⚠️',
      unhealthy: '❌',
      critical: '🚨',
      error: '❌'
    };

    let summary = `🏥 Platform Health Report\n`;
    summary += `📅 ${report.timestamp}\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    summary += `Overall Status: ${statusEmoji[report.overallStatus] || '❓'} ${report.overallStatus.toUpperCase()}\n\n`;

    if (report.categories) {
      Object.entries(report.categories).forEach(([name, category]) => {
        summary += `${statusEmoji[category.status] || '❓'} ${name.charAt(0).toUpperCase() + name.slice(1)}: ${category.status}\n`;

        category.checks.forEach(check => {
          const checkName = check.check || check.type || 'unknown';
          summary += `   └─ ${checkName}: ${check.status}`;
          if (check.latency) summary += ` (${check.latency}ms)`;
          if (check.error) summary += ` - ${check.error}`;
          summary += '\n';
        });
        summary += '\n';
      });
    }

    if (report.summary && report.summary.issues) {
      const { critical, unhealthy, warning } = report.summary.issues;
      if (critical > 0 || unhealthy > 0 || warning > 0) {
        summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        summary += `Issues: 🚨 ${critical} critical | ❌ ${unhealthy} unhealthy | ⚠️ ${warning} warnings\n`;
      }
    }

    summary += `\n⏱️ Check completed in ${report.executionTimeMs}ms`;

    return summary;
  }
}

export default new HealthReporter();
