/**
 * Alert Integration for Health Monitor
 * Connects health monitoring to Owner Interface Agent for notifications
 *
 * @module healthMonitor/alertIntegration
 */

import ownerInterfaceAgent from '../ownerInterfaceAgent/index.js';
import reporter from './reporter.js';

class AlertIntegration {
  constructor() {
    // Status to urgency mapping
    this.urgencyMap = {
      'critical': 5,    // Direct - all channels
      'unhealthy': 4,   // High - Email + SMS
      'error': 4,       // High
      'warning': 3,     // Medium - Email + Dashboard
      'degraded': 2,    // Low - Email
      'healthy': 1      // Info - Dashboard only
    };

    // Cooldown tracking to prevent alert spam
    this.alertCooldowns = new Map();
    this.cooldownMinutes = {
      5: 5,     // Critical: 5 minute cooldown
      4: 15,    // High: 15 minute cooldown
      3: 60,    // Medium: 1 hour cooldown
      2: 240,   // Low: 4 hour cooldown
      1: 1440   // Info: 24 hour cooldown
    };
  }

  /**
   * Check if an alert is in cooldown period
   * @param {string} alertKey - Unique key for the alert
   * @param {number} urgency - Alert urgency level
   * @returns {boolean} Whether alert is in cooldown
   */
  isInCooldown(alertKey, urgency) {
    const lastAlert = this.alertCooldowns.get(alertKey);
    if (!lastAlert) return false;

    const cooldownMs = (this.cooldownMinutes[urgency] || 60) * 60 * 1000;
    const elapsed = Date.now() - lastAlert;

    return elapsed < cooldownMs;
  }

  /**
   * Record that an alert was sent
   * @param {string} alertKey - Unique key for the alert
   */
  recordAlert(alertKey) {
    this.alertCooldowns.set(alertKey, Date.now());
  }

  /**
   * Process health report and send alerts if necessary
   * @param {Object} report - Health report from reporter
   * @returns {Promise<Object>} Alert results
   */
  async processHealthReport(report) {
    const alerts = [];
    const urgency = this.urgencyMap[report.overallStatus] || 1;

    // Only alert on issues (urgency >= 3)
    if (urgency >= 3) {
      const alertKey = `overall_${report.overallStatus}`;

      if (!this.isInCooldown(alertKey, urgency)) {
        const summary = reporter.generateSummary(report);
        const alertResult = await this.sendAlert({
          type: 'health_report',
          urgency,
          title: `Platform Health: ${report.overallStatus.toUpperCase()}`,
          message: summary,
          report
        });

        this.recordAlert(alertKey);
        alerts.push(alertResult);
      }
    }

    // Check for specific critical issues
    if (report.categories) {
      for (const [categoryName, category] of Object.entries(report.categories)) {
        for (const check of category.checks) {
          if (check.status === 'critical' || check.status === 'unhealthy') {
            const alertKey = `${categoryName}_${check.check || check.type}_${check.status}`;
            const checkUrgency = this.urgencyMap[check.status];

            if (!this.isInCooldown(alertKey, checkUrgency)) {
              const alertResult = await this.sendSpecificAlert(categoryName, check);
              this.recordAlert(alertKey);
              alerts.push(alertResult);
            }
          }
        }
      }
    }

    return {
      alertsSent: alerts.length,
      alerts
    };
  }

  /**
   * Send a specific check failure alert
   * @param {string} category - Category name
   * @param {Object} check - Check result
   * @returns {Promise<Object>} Alert result
   */
  async sendSpecificAlert(category, check) {
    const urgency = this.urgencyMap[check.status] || 3;
    const checkName = check.check || check.type || 'unknown';

    let message = `🚨 ${category.toUpperCase()} Alert\n\n`;
    message += `Check: ${checkName}\n`;
    message += `Status: ${check.status}\n`;

    if (check.error) {
      message += `Error: ${check.error}\n`;
    }

    if (check.latency) {
      message += `Latency: ${check.latency}ms\n`;
    }

    message += `\nTimestamp: ${check.timestamp || new Date().toISOString()}`;

    return this.sendAlert({
      type: 'specific_check',
      urgency,
      title: `[${check.status.toUpperCase()}] ${category}: ${checkName}`,
      message,
      check
    });
  }

  /**
   * Send alert via Owner Interface Agent
   * @param {Object} alertData - Alert data
   * @returns {Promise<Object>} Alert result
   */
  async sendAlert(alertData) {
    try {
      const { urgency, title, message } = alertData;

      // Use Owner Interface Agent for communication
      const result = await ownerInterfaceAgent.sendNotification({
        subject: title,
        message,
        urgency,
        category: 'system_health',
        metadata: {
          alertType: alertData.type,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        alertType: alertData.type,
        urgency,
        title,
        channels: result.channels || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AlertIntegration] Failed to send alert:', error.message);
      return {
        success: false,
        error: error.message,
        alertType: alertData.type,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send immediate critical alert (bypasses cooldown)
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @returns {Promise<Object>} Alert result
   */
  async sendCriticalAlert(title, message) {
    return this.sendAlert({
      type: 'critical',
      urgency: 5,
      title: `🚨 CRITICAL: ${title}`,
      message
    });
  }

  /**
   * Send recovery notification when system returns to healthy
   * @param {string} category - Category that recovered
   * @param {string} previousStatus - Previous unhealthy status
   * @returns {Promise<Object>} Alert result
   */
  async sendRecoveryNotification(category, previousStatus) {
    const message = `✅ ${category} has recovered from ${previousStatus} status and is now healthy.`;

    return this.sendAlert({
      type: 'recovery',
      urgency: 2,
      title: `[RECOVERED] ${category}`,
      message
    });
  }

  /**
   * Clear all cooldowns (for testing purposes)
   */
  clearCooldowns() {
    this.alertCooldowns.clear();
  }

  /**
   * Get current cooldown status
   * @returns {Object} Cooldown status for all tracked alerts
   */
  getCooldownStatus() {
    const status = {};
    const now = Date.now();

    for (const [key, timestamp] of this.alertCooldowns.entries()) {
      const elapsed = Math.round((now - timestamp) / 60000); // minutes
      status[key] = {
        lastAlert: new Date(timestamp).toISOString(),
        minutesAgo: elapsed
      };
    }

    return status;
  }
}

export default new AlertIntegration();
