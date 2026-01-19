/**
 * GDPR Agent v1.0
 * Enterprise-level GDPR compliance management
 *
 * Handles:
 * - Art. 7: Consent Management
 * - Art. 15: Right of Access (Data Export)
 * - Art. 17: Right to Erasure (72h deadline)
 * - Art. 20: Data Portability
 * - Art. 30: Records of Processing Activities
 *
 * Components:
 * - Data Inventory: Maps all personal data locations
 * - Data Exporter: Handles access and portability requests
 * - Data Eraser: Handles deletion with owner approval for partners
 * - Consent Manager: Tracks user consent
 * - Sync Scheduler: 4 scheduled compliance jobs
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';
import dataInventory from './dataInventory.js';
import dataExporter from './dataExporter.js';
import dataEraser from './dataEraser.js';
import consentManager from './consentManager.js';
import syncScheduler, { GDPR_JOBS } from './syncScheduler.js';
import { v4 as uuidv4 } from 'uuid';

class GDPRAgent {
  constructor() {
    this.initialized = false;
    this.sequelize = null;
    this.mongoose = null;
    this.chromaClient = null;
  }

  /**
   * Initialize the GDPR Agent with database connections
   */
  async initialize(sequelize, mongoose = null, chromaClient = null) {
    if (this.initialized) {
      console.log('[GDPRAgent] Already initialized');
      return;
    }

    console.log('[GDPRAgent] Initializing GDPR Agent v1.0...');

    this.sequelize = sequelize;
    this.mongoose = mongoose;
    this.chromaClient = chromaClient;

    // Initialize components with database connections
    consentManager.setSequelize(sequelize);
    dataExporter.setConnections(sequelize, mongoose);
    dataEraser.setConnections(sequelize, mongoose, chromaClient);

    this.initialized = true;

    await logAgent('gdpr', 'agent_initialized', {
      description: 'GDPR Agent v1.0 initialized',
      metadata: {
        components: ['dataInventory', 'dataExporter', 'dataEraser', 'consentManager', 'syncScheduler'],
        scheduledJobs: Object.keys(GDPR_JOBS).length
      }
    });

    console.log('[GDPRAgent] GDPR Agent v1.0 initialized successfully');
  }

  /**
   * Set scheduler for job registration
   */
  setScheduler(scheduler) {
    syncScheduler.setScheduler(scheduler);
  }

  /**
   * Register all GDPR jobs with the scheduler
   */
  async registerJobs() {
    await syncScheduler.registerJobs();
  }

  // ========================================
  // Data Subject Request Handlers
  // ========================================

  /**
   * Handle Right of Access request (Art. 15)
   */
  async handleAccessRequest(userId, userEmail) {
    const requestId = `access_${uuidv4()}`;

    console.log(`[GDPRAgent] Processing access request ${requestId} for user ${userId}`);

    try {
      const result = await dataExporter.exportUserData(userId, requestId);

      await sendAlert({
        urgency: 2,
        title: 'GDPR Access Request Completed',
        message: `Data export completed for user ${userId} (${userEmail}).
                  Request ID: ${requestId}
                  File: ${result.filename}
                  Categories: ${result.dataCategories.join(', ')}`
      });

      return result;
    } catch (error) {
      await logError('gdpr', error, { action: 'access_request', userId, requestId });
      throw error;
    }
  }

  /**
   * Handle Data Portability request (Art. 20)
   */
  async handlePortabilityRequest(userId, userEmail) {
    const requestId = `portability_${uuidv4()}`;

    console.log(`[GDPRAgent] Processing portability request ${requestId} for user ${userId}`);

    try {
      const result = await dataExporter.exportPortableData(userId, requestId);

      await sendAlert({
        urgency: 2,
        title: 'GDPR Portability Request Completed',
        message: `Portable data export completed for user ${userId} (${userEmail}).
                  Request ID: ${requestId}
                  File: ${result.filename}
                  Format: ${result.format}`
      });

      return result;
    } catch (error) {
      await logError('gdpr', error, { action: 'portability_request', userId, requestId });
      throw error;
    }
  }

  /**
   * Handle Erasure request (Art. 17)
   */
  async handleErasureRequest(userId, userType = 'user', reason = 'user_request') {
    const requestId = `erasure_${uuidv4()}`;

    console.log(`[GDPRAgent] Processing erasure request ${requestId} for ${userType} ${userId}`);

    try {
      const result = await dataEraser.processErasureRequest(userId, requestId, {
        userType,
        reason
      });

      // Alert based on status
      if (result.status === 'awaiting_approval') {
        await sendAlert({
          urgency: 4,
          title: `GDPR Deletion Request - Approval Required`,
          message: `Partner deletion request ${requestId} requires your approval.
                    User ID: ${userId}
                    Reason: ${reason}
                    Deadline: 72 hours from request`
        });
      } else if (result.status === 'completed') {
        await sendAlert({
          urgency: 2,
          title: 'GDPR Deletion Completed',
          message: `User data deleted successfully.
                    Request ID: ${requestId}
                    User ID: ${userId}
                    Tables affected: ${result.deletionLog?.deletedFrom?.join(', ') || 'N/A'}`
        });
      }

      return result;
    } catch (error) {
      await logError('gdpr', error, { action: 'erasure_request', userId, requestId });
      throw error;
    }
  }

  /**
   * Approve a pending deletion request (owner action)
   */
  async approveDeletion(requestId, approverId) {
    return dataEraser.approveDeletion(requestId, approverId);
  }

  /**
   * Reject a deletion request (owner action)
   */
  async rejectDeletion(requestId, rejecterId, reason) {
    return dataEraser.rejectDeletion(requestId, rejecterId, reason);
  }

  // ========================================
  // Consent Management
  // ========================================

  /**
   * Record user consent
   */
  async recordConsent(userId, consentType, granted, metadata = {}) {
    return consentManager.recordConsent(userId, consentType, granted, metadata);
  }

  /**
   * Record all consents at once
   */
  async recordAllConsents(userId, consents, metadata = {}) {
    return consentManager.recordAllConsents(userId, consents, metadata);
  }

  /**
   * Get user consents
   */
  async getUserConsents(userId) {
    return consentManager.getUserConsents(userId);
  }

  /**
   * Check if user has specific consent
   */
  async hasConsent(userId, consentType) {
    return consentManager.hasConsent(userId, consentType);
  }

  /**
   * Withdraw all consents (except essential)
   */
  async withdrawAllConsents(userId) {
    return consentManager.withdrawAllConsents(userId);
  }

  /**
   * Get consent types
   */
  getConsentTypes() {
    return consentManager.getConsentTypes();
  }

  // ========================================
  // Data Inventory
  // ========================================

  /**
   * Get complete data inventory
   */
  getDataInventory() {
    return dataInventory.getInventory();
  }

  /**
   * Get data subject rights
   */
  getDataSubjectRights() {
    return dataInventory.getDataSubjectRights();
  }

  /**
   * Get all personal data locations
   */
  getAllPersonalDataLocations() {
    return dataInventory.getAllPersonalDataLocations();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport() {
    return dataInventory.generateComplianceReport();
  }

  // ========================================
  // Scheduled Job Handlers
  // ========================================

  /**
   * Check for overdue deletion requests (72h deadline)
   */
  async checkOverdueRequests() {
    console.log('[GDPRAgent] Running overdue requests check...');
    return dataEraser.checkOverdueRequests();
  }

  /**
   * Cleanup old export files
   */
  async cleanupOldExports() {
    console.log('[GDPRAgent] Running export cleanup...');
    return dataExporter.cleanupOldExports();
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetention() {
    console.log('[GDPRAgent] Running data retention check...');

    if (!this.sequelize) {
      throw new Error('Database not initialized');
    }

    const retentionReport = {
      checkedAt: new Date().toISOString(),
      categories: [],
      issues: []
    };

    try {
      // Check chat logs retention (90 days)
      if (this.mongoose) {
        try {
          const ChatLog = this.mongoose.model('ChatLog');
          const oldChatLogs = await ChatLog.countDocuments({
            created_at: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          });

          if (oldChatLogs > 0) {
            retentionReport.issues.push({
              category: 'chat_logs',
              issue: `${oldChatLogs} chat logs exceed 90-day retention`,
              action: 'Consider deletion'
            });
          }

          retentionReport.categories.push({
            name: 'Chat Logs',
            retention: '90 days',
            checked: true,
            oldRecords: oldChatLogs
          });
        } catch (e) {
          console.log('[GDPRAgent] ChatLog model not available');
        }
      }

      // Check audit logs retention (30 days)
      if (this.mongoose) {
        try {
          const AuditLog = this.mongoose.model('AuditLog');
          const oldAuditLogs = await AuditLog.countDocuments({
            timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          });

          if (oldAuditLogs > 0) {
            retentionReport.issues.push({
              category: 'audit_logs',
              issue: `${oldAuditLogs} audit logs exceed 30-day retention`,
              action: 'Consider deletion'
            });
          }

          retentionReport.categories.push({
            name: 'Audit Logs',
            retention: '30 days',
            checked: true,
            oldRecords: oldAuditLogs
          });
        } catch (e) {
          console.log('[GDPRAgent] AuditLog model not available');
        }
      }

      // Check inactive users (3 years)
      const [inactiveUsers] = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM Users
        WHERE last_login < DATE_SUB(NOW(), INTERVAL 3 YEAR)
        AND is_active = 1
      `);

      const inactiveCount = inactiveUsers[0]?.count || 0;
      if (inactiveCount > 0) {
        retentionReport.issues.push({
          category: 'users',
          issue: `${inactiveCount} users inactive for 3+ years`,
          action: 'Consider deactivation/anonymization'
        });
      }

      retentionReport.categories.push({
        name: 'Inactive Users',
        retention: '3 years after last activity',
        checked: true,
        oldRecords: inactiveCount
      });

      await logAgent('gdpr', 'retention_check_completed', {
        description: `Data retention check completed with ${retentionReport.issues.length} issues`,
        metadata: { issuesCount: retentionReport.issues.length }
      });

      // Alert if issues found
      if (retentionReport.issues.length > 0) {
        await sendAlert({
          urgency: 3,
          title: 'GDPR Retention Check - Issues Found',
          message: `Data retention check found ${retentionReport.issues.length} issue(s):
                    ${retentionReport.issues.map(i => `- ${i.category}: ${i.issue}`).join('\n')}`
        });
      }

      return retentionReport;
    } catch (error) {
      await logError('gdpr', error, { action: 'check_data_retention' });
      throw error;
    }
  }

  /**
   * Generate consent statistics audit
   */
  async generateConsentAudit() {
    console.log('[GDPRAgent] Generating consent audit...');

    try {
      const report = await consentManager.generateConsentReport();

      await sendAlert({
        urgency: 2,
        title: 'GDPR Weekly Consent Audit',
        message: `Consent Statistics Report Generated:
                  Total Users: ${report.statistics.totalUsers}
                  Analytics Consent: ${report.statistics.analyticsGranted}
                  Personalization Consent: ${report.statistics.personalizationGranted}
                  Marketing Consent: ${report.statistics.marketingGranted}`
      });

      return report;
    } catch (error) {
      await logError('gdpr', error, { action: 'generate_consent_audit' });
      throw error;
    }
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Get deletion request status
   */
  async getDeletionRequestStatus(requestId) {
    return dataEraser.getRequestStatus(requestId);
  }

  /**
   * Get export file
   */
  async getExportFile(filename) {
    return dataExporter.getExportFile(filename);
  }

  /**
   * Get scheduled jobs info
   */
  getScheduledJobs() {
    return GDPR_JOBS;
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      components: {
        dataInventory: true,
        dataExporter: !!this.sequelize,
        dataEraser: !!this.sequelize,
        consentManager: !!this.sequelize,
        syncScheduler: true
      },
      scheduledJobs: Object.keys(GDPR_JOBS).length,
      version: '1.0'
    };
  }
}

export default new GDPRAgent();
