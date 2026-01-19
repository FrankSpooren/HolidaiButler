/**
 * GDPR Data Eraser
 * Handles Art. 17 - Right to Erasure (Right to be Forgotten)
 *
 * KRITIEK: Enterprise-level data deletion with full audit trail
 * Deadline: 72 hours from request
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';

// Deletion status tracking
const DELETION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  AWAITING_APPROVAL: 'awaiting_approval',
  COMPLETED: 'completed',
  PARTIALLY_COMPLETED: 'partially_completed',
  FAILED: 'failed',
  REJECTED: 'rejected'
};

class DataEraser {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
    this.chromaClient = null;
  }

  setConnections(sequelize, mongoose, chromaClient = null) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
    this.chromaClient = chromaClient;
  }

  /**
   * Process a deletion request (Art. 17)
   */
  async processErasureRequest(userId, requestId, options = {}) {
    if (!this.sequelize) {
      throw new Error('Database connections not initialized');
    }

    const { userType = 'user', reason = 'user_request', skipApproval = false } = options;

    console.log(`[DataEraser] Processing erasure request ${requestId} for ${userType} ${userId}`);

    try {
      // Create deletion request record
      await this.sequelize.query(`
        INSERT INTO gdpr_deletion_requests (
          request_id, user_id, user_type, reason, status,
          requested_at, deadline, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 72 HOUR), NOW())
      `, {
        replacements: [requestId, userId, userType, reason, DELETION_STATUS.PENDING]
      });

      // Check if approval is required (partners need owner approval)
      if (userType === 'partner' && !skipApproval) {
        await this.requestOwnerApproval(requestId, userId, userType);
        return {
          success: true,
          requestId,
          status: DELETION_STATUS.AWAITING_APPROVAL,
          message: 'Partner deletion requires owner approval'
        };
      }

      // Execute deletion
      const result = await this.executeErasure(userId, userType, requestId);

      return result;
    } catch (error) {
      await logError('gdpr', error, { action: 'process_erasure_request', userId, requestId });

      // Update request status to failed
      try {
        await this.sequelize.query(`
          UPDATE gdpr_deletion_requests
          SET status = ?, error_message = ?, updated_at = NOW()
          WHERE request_id = ?
        `, { replacements: [DELETION_STATUS.FAILED, error.message, requestId] });
      } catch (e) {
        console.error('[DataEraser] Failed to update request status:', e.message);
      }

      throw error;
    }
  }

  /**
   * Execute the actual data erasure
   */
  async executeErasure(userId, userType, requestId) {
    console.log(`[DataEraser] Executing erasure for ${userType} ${userId}`);

    const deletionLog = {
      requestId,
      userId,
      userType,
      startedAt: new Date().toISOString(),
      deletedFrom: [],
      anonymizedIn: [],
      errors: []
    };

    try {
      // Update status to in_progress
      await this.sequelize.query(`
        UPDATE gdpr_deletion_requests
        SET status = ?, started_at = NOW()
        WHERE request_id = ?
      `, { replacements: [DELETION_STATUS.IN_PROGRESS, requestId] });

      const table = userType === 'partner' ? 'AdminUsers' : 'Users';

      // 1. Delete from related tables first (referential integrity)
      await this.deleteRelatedData(userId, userType, deletionLog);

      // 2. Delete chat logs from MongoDB
      await this.deleteChatLogs(userId, deletionLog);

      // 3. Anonymize fiscal data (cannot delete due to retention)
      await this.anonymizeFiscalData(userId, deletionLog);

      // 4. Delete main user record
      const [result] = await this.sequelize.query(`DELETE FROM ${table} WHERE id = ?`, {
        replacements: [userId]
      });
      deletionLog.deletedFrom.push(table);

      // 5. Update request status
      const status = deletionLog.errors.length > 0
        ? DELETION_STATUS.PARTIALLY_COMPLETED
        : DELETION_STATUS.COMPLETED;

      await this.sequelize.query(`
        UPDATE gdpr_deletion_requests
        SET status = ?, completed_at = NOW(), deletion_log = ?
        WHERE request_id = ?
      `, { replacements: [status, JSON.stringify(deletionLog), requestId] });

      // Log the erasure
      await logAgent('gdpr', 'data_erased', {
        description: `Erased personal data for ${userType} ${userId}`,
        metadata: {
          requestId,
          deletedFrom: deletionLog.deletedFrom,
          anonymizedIn: deletionLog.anonymizedIn,
          errorsCount: deletionLog.errors.length
        }
      });

      return {
        success: true,
        requestId,
        status,
        deletionLog
      };
    } catch (error) {
      deletionLog.errors.push({ step: 'execution', error: error.message });
      throw error;
    }
  }

  /**
   * Delete related data (cascading delete)
   */
  async deleteRelatedData(userId, userType, deletionLog) {
    const relatedTables = userType === 'partner'
      ? []
      : [
          { table: 'User_Preferences', column: 'user_id' },
          { table: 'user_consent', column: 'user_id' },
          { table: 'user_journeys', column: 'user_id' },
          { table: 'holibot_sessions', column: 'user_id' },
          { table: 'holibot_user_preferences', column: 'user_id' },
          { table: 'holibot_learned_preferences', column: 'user_id' }
        ];

    for (const { table, column } of relatedTables) {
      try {
        await this.sequelize.query(`DELETE FROM ${table} WHERE ${column} = ?`, {
          replacements: [userId]
        });
        deletionLog.deletedFrom.push(table);
      } catch (error) {
        // Table might not exist or have different structure
        console.log(`[DataEraser] Could not delete from ${table}: ${error.message}`);
        deletionLog.errors.push({ table, error: error.message });
      }
    }
  }

  /**
   * Delete chat logs from MongoDB
   */
  async deleteChatLogs(userId, deletionLog) {
    if (!this.mongoose) {
      console.log('[DataEraser] MongoDB not connected, skipping chat logs');
      deletionLog.deletedFrom.push('MongoDB: skipped (not connected)');
      return;
    }

    try {
      const ChatLog = this.mongoose.model('ChatLog');
      const result = await ChatLog.deleteMany({ user_id: userId });
      deletionLog.deletedFrom.push(`MongoDB:chat_logs (${result.deletedCount} documents)`);
    } catch (error) {
      console.log(`[DataEraser] Could not delete chat logs: ${error.message}`);
      deletionLog.errors.push({ collection: 'chat_logs', error: error.message });
    }
  }

  /**
   * Anonymize fiscal data (cannot delete due to 7-year retention)
   */
  async anonymizeFiscalData(userId, deletionLog) {
    try {
      // Anonymize transactions (keep for fiscal, remove personal identifiers)
      const [result] = await this.sequelize.query(`
        UPDATE transactions
        SET
          customer_user_id = NULL,
          customer_name = '[GDPR ANONYMIZED]',
          customer_email = '[GDPR ANONYMIZED]',
          customer_phone = NULL,
          billing_address = NULL
        WHERE customer_user_id = ?
      `, { replacements: [userId] });

      deletionLog.anonymizedIn.push('transactions');

      // Anonymize tickets
      await this.sequelize.query(`
        UPDATE tickets
        SET
          holder_name = '[GDPR ANONYMIZED]',
          holder_email = '[GDPR ANONYMIZED]',
          holder_phone = NULL
        WHERE user_id = ?
      `, { replacements: [userId] });

      deletionLog.anonymizedIn.push('tickets');

      await logAgent('gdpr', 'data_anonymized', {
        description: `Anonymized fiscal data for user ${userId}`,
        metadata: { userId, tables: ['transactions', 'tickets'], reason: 'fiscal_retention' }
      });
    } catch (error) {
      console.log(`[DataEraser] Could not anonymize fiscal data: ${error.message}`);
      deletionLog.errors.push({ action: 'anonymize', error: error.message });
    }
  }

  /**
   * Request owner approval for partner deletion
   */
  async requestOwnerApproval(requestId, userId, userType) {
    await sendAlert({
      urgency: 4,
      title: `GDPR Deletion Request - ${userType} #${userId}`,
      message: `A deletion request (${requestId}) requires your approval.
                Partner data deletion must be approved within 72 hours.
                Please respond via the admin portal.`
    });

    await this.sequelize.query(`
      UPDATE gdpr_deletion_requests
      SET status = ?, approval_requested_at = NOW()
      WHERE request_id = ?
    `, { replacements: [DELETION_STATUS.AWAITING_APPROVAL, requestId] });

    await logAgent('gdpr', 'approval_requested', {
      description: `Owner approval requested for deletion of ${userType} ${userId}`,
      metadata: { requestId, userId, userType }
    });
  }

  /**
   * Approve a pending deletion request (by owner)
   */
  async approveDeletion(requestId, approverId) {
    console.log(`[DataEraser] Approving deletion request ${requestId}`);

    const [requests] = await this.sequelize.query(`
      SELECT user_id, user_type FROM gdpr_deletion_requests
      WHERE request_id = ? AND status = ?
    `, { replacements: [requestId, DELETION_STATUS.AWAITING_APPROVAL] });

    if (requests.length === 0) {
      throw new Error(`No pending deletion request found: ${requestId}`);
    }

    const { user_id, user_type } = requests[0];

    // Log approval
    await this.sequelize.query(`
      UPDATE gdpr_deletion_requests
      SET approved_by = ?, approved_at = NOW()
      WHERE request_id = ?
    `, { replacements: [approverId, requestId] });

    // Execute the deletion
    return this.executeErasure(user_id, user_type, requestId);
  }

  /**
   * Reject a deletion request
   */
  async rejectDeletion(requestId, rejecterId, reason) {
    console.log(`[DataEraser] Rejecting deletion request ${requestId}`);

    await this.sequelize.query(`
      UPDATE gdpr_deletion_requests
      SET status = ?, rejected_by = ?, rejection_reason = ?, rejected_at = NOW()
      WHERE request_id = ?
    `, { replacements: [DELETION_STATUS.REJECTED, rejecterId, reason, requestId] });

    await logAgent('gdpr', 'deletion_rejected', {
      description: `Deletion request ${requestId} rejected`,
      metadata: { requestId, rejecterId, reason }
    });

    return { success: true, requestId, status: DELETION_STATUS.REJECTED };
  }

  /**
   * Get deletion request status
   */
  async getRequestStatus(requestId) {
    const [rows] = await this.sequelize.query(`
      SELECT * FROM gdpr_deletion_requests WHERE request_id = ?
    `, { replacements: [requestId] });

    return rows[0] || null;
  }

  /**
   * Check for overdue deletion requests (past 72-hour deadline)
   */
  async checkOverdueRequests() {
    console.log('[DataEraser] Checking for overdue deletion requests...');

    const [overdueRequests] = await this.sequelize.query(`
      SELECT request_id, user_id, user_type, requested_at, deadline
      FROM gdpr_deletion_requests
      WHERE status IN (?, ?) AND deadline < NOW()
    `, { replacements: [DELETION_STATUS.PENDING, DELETION_STATUS.AWAITING_APPROVAL] });

    if (overdueRequests.length > 0) {
      // CRITICAL: Alert owner about GDPR compliance risk
      await sendAlert({
        urgency: 5,
        title: `GDPR ALERT: ${overdueRequests.length} Overdue Deletion Requests!`,
        message: `The following deletion requests have exceeded the 72-hour deadline:
                  ${overdueRequests.map(r => `Request ${r.request_id} (User ${r.user_id})`).join(', ')}

                  IMMEDIATE ACTION REQUIRED for GDPR compliance!`
      });

      await logAgent('gdpr', 'overdue_requests_alert', {
        description: `ALERT: ${overdueRequests.length} deletion requests past 72h deadline`,
        metadata: { overdueCount: overdueRequests.length }
      });
    }

    return { overdueCount: overdueRequests.length, requests: overdueRequests };
  }
}

export default new DataEraser();
