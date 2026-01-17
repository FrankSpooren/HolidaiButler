/**
 * Owner Interface Agent
 * Handles communication with the project owner
 * Uses the existing orchestrator's alertHandler for email/Threema
 *
 * @module agents/ownerInterfaceAgent
 * @version 1.1.0
 */

class OwnerInterfaceAgent {
  constructor() {
    this.name = 'Owner Interface Agent';
    this.version = '1.1.0';
    this.alertHandler = null;
  }

  /**
   * Lazy load the alert handler from orchestrator
   * @returns {Promise<Object>} Alert handler instance
   */
  async getAlertHandler() {
    if (!this.alertHandler) {
      try {
        const orchestratorOwnerInterface = await import('../../orchestrator/ownerInterface/index.js');
        this.alertHandler = orchestratorOwnerInterface.alertHandler || orchestratorOwnerInterface.default?.alertHandler;
      } catch (error) {
        console.warn('[OwnerInterfaceAgent] Could not load orchestrator alertHandler:', error.message);
        return null;
      }
    }
    return this.alertHandler;
  }

  /**
   * Send notification to owner based on urgency level
   * @param {Object} notification - Notification details
   * @param {string} notification.subject - Email subject/title
   * @param {string} notification.message - Notification message
   * @param {number} notification.urgency - Urgency level (1-5)
   * @param {string} notification.category - Category of notification
   * @param {Object} notification.metadata - Additional metadata
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(notification) {
    const { subject, message, urgency, category, metadata } = notification;
    const channels = [];

    console.log(`[OwnerInterfaceAgent] Sending notification: ${subject} (urgency: ${urgency})`);

    try {
      const alertHandler = await this.getAlertHandler();

      if (alertHandler) {
        // Use the existing orchestrator's alert system
        const result = await alertHandler.sendAlert({
          urgency,
          title: subject,
          message,
          metadata: { category, ...metadata }
        });

        // Determine channels based on urgency
        if (urgency === 1) channels.push('digest');
        if (urgency >= 2) channels.push('email');
        if (urgency >= 5) channels.push('threema');

        return {
          success: result.success !== false,
          channels,
          urgency,
          result,
          timestamp: new Date().toISOString()
        };
      } else {
        // Fallback: just log the notification
        console.log(`[OwnerInterfaceAgent] Alert (urgency ${urgency}): ${subject}`);
        console.log(`[OwnerInterfaceAgent] Message: ${message.substring(0, 200)}...`);

        return {
          success: true,
          channels: ['console'],
          urgency,
          note: 'AlertHandler not available, logged to console',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('[OwnerInterfaceAgent] Notification failed:', error.message);
      return {
        success: false,
        error: error.message,
        channels,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send critical alert (urgency 5)
   * @param {string} type - Alert type
   * @param {string} details - Alert details
   * @returns {Promise<Object>} Alert result
   */
  async sendCriticalAlert(type, details) {
    const alertHandler = await this.getAlertHandler();

    if (alertHandler && alertHandler.criticalAlert) {
      return alertHandler.criticalAlert(type, details);
    }

    // Fallback
    return this.sendNotification({
      subject: `CRITICAL: ${type}`,
      message: details,
      urgency: 5,
      category: 'critical'
    });
  }
}

export default new OwnerInterfaceAgent();
