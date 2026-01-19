/**
 * GDPR Data Exporter
 * Handles Art. 15 (Access) and Art. 20 (Portability) requests
 *
 * Enterprise-level data export with full audit trail
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';

class DataExporter {
  constructor() {
    this.sequelize = null;
    this.mongoose = null;
    this.exportPath = '/var/www/api.holidaibutler.com/platform-core/exports';
  }

  setConnections(sequelize, mongoose) {
    this.sequelize = sequelize;
    this.mongoose = mongoose;
  }

  /**
   * Export all personal data for a user (Art. 15 - Right of Access)
   */
  async exportUserData(userId, requestId) {
    if (!this.sequelize) {
      throw new Error('Database connections not initialized');
    }

    console.log(`[DataExporter] Exporting data for user ${userId}, request ${requestId}`);

    try {
      const exportData = {
        exportId: requestId,
        exportedAt: new Date().toISOString(),
        userId: userId,
        gdprArticle: 'Art. 15 - Right of Access',
        data: {}
      };

      // 1. Export from Users table
      const [userRows] = await this.sequelize.query(`
        SELECT id, uuid, email, name, email_verified, onboarding_completed,
               created_at, updated_at, last_login, is_active
        FROM Users WHERE id = ?
      `, { replacements: [userId] });

      if (userRows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      exportData.data.profile = userRows[0];

      // 2. Export user preferences
      const [prefRows] = await this.sequelize.query(`
        SELECT travel_companion, interests, stay_type, visit_status,
               dietary_preferences, accessibility_needs, preferred_language,
               home_location, personality_type, ai_enabled, marketing_consent,
               analytics_consent, created_at, updated_at
        FROM User_Preferences WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.preferences = prefRows[0] || null;

      // 3. Export user consent
      const [consentRows] = await this.sequelize.query(`
        SELECT consent_essential, consent_analytics, consent_personalization,
               consent_marketing, created_at, updated_at
        FROM user_consent WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.consent = consentRows[0] || null;

      // 4. Export tickets
      const [ticketRows] = await this.sequelize.query(`
        SELECT id, ticket_number, poi_id, type, valid_from, valid_until,
               holder_name, holder_email, status, created_at
        FROM tickets WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.tickets = ticketRows;

      // 5. Export transactions (sanitized - no full card numbers)
      const [transactionRows] = await this.sequelize.query(`
        SELECT id, transaction_number, type, payment_method, total_amount,
               currency, status, card_last4, card_brand, created_at
        FROM transactions WHERE customer_user_id = ?
      `, { replacements: [userId] });
      exportData.data.transactions = transactionRows;

      // 6. Export bookings
      const [bookingRows] = await this.sequelize.query(`
        SELECT id, poi_id, booking_date, status, created_at
        FROM bookings WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.bookings = bookingRows;

      // 7. Export holibot sessions
      const [holibotRows] = await this.sequelize.query(`
        SELECT session_id, started_at, ended_at, message_count
        FROM holibot_sessions WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.chatSessions = holibotRows;

      // 8. Export user journeys (communication history)
      const [journeyRows] = await this.sequelize.query(`
        SELECT journey_type, status, current_step, started_at, completed_at
        FROM user_journeys WHERE user_id = ?
      `, { replacements: [userId] });
      exportData.data.communicationHistory = journeyRows;

      // 9. Export from MongoDB (chat logs) if available
      if (this.mongoose) {
        try {
          const ChatLog = this.mongoose.model('ChatLog');
          const chatLogs = await ChatLog.find({ user_id: userId }).lean();
          exportData.data.chatHistory = chatLogs.map(log => ({
            sessionId: log.session_id,
            messages: log.messages,
            createdAt: log.created_at
          }));
        } catch (e) {
          console.log('[DataExporter] No chat logs found or model not available');
          exportData.data.chatHistory = [];
        }
      }

      // Save to file
      const filename = await this.saveExport(userId, requestId, exportData);

      // Log the export
      await logAgent('gdpr', 'data_exported', {
        description: `Exported all personal data for user ${userId}`,
        metadata: {
          userId,
          requestId,
          filename,
          dataCategories: Object.keys(exportData.data).length
        }
      });

      return {
        success: true,
        requestId,
        filename,
        exportedAt: exportData.exportedAt,
        dataCategories: Object.keys(exportData.data)
      };
    } catch (error) {
      await logError('gdpr', error, { action: 'export_user_data', userId, requestId });
      throw error;
    }
  }

  /**
   * Export data in portable format (Art. 20 - Right to Data Portability)
   */
  async exportPortableData(userId, requestId) {
    console.log(`[DataExporter] Creating portable export for user ${userId}`);

    try {
      // Get standard export first
      const fullExport = await this.exportUserData(userId, requestId);

      // Create machine-readable JSON and CSV versions
      const exportDir = path.join(this.exportPath, `portable_${requestId}`);
      await fs.mkdir(exportDir, { recursive: true });

      // Read the full export
      const exportFilePath = path.join(this.exportPath, fullExport.filename);
      const exportContent = await fs.readFile(exportFilePath, 'utf8');
      const exportData = JSON.parse(exportContent);

      // Create individual CSV files for each data category
      for (const [category, data] of Object.entries(exportData.data)) {
        if (Array.isArray(data) && data.length > 0) {
          const csv = this.convertToCSV(data);
          await fs.writeFile(path.join(exportDir, `${category}.csv`), csv);
        } else if (typeof data === 'object' && data !== null) {
          const csv = this.convertToCSV([data]);
          await fs.writeFile(path.join(exportDir, `${category}.csv`), csv);
        }
      }

      // Create ZIP archive
      const zipFilename = `portable_export_${userId}_${requestId}.zip`;
      const zipPath = path.join(this.exportPath, zipFilename);
      await this.createZipArchive(exportDir, zipPath);

      // Cleanup temp directory
      await fs.rm(exportDir, { recursive: true });

      await logAgent('gdpr', 'portable_data_exported', {
        description: `Created portable data export for user ${userId}`,
        metadata: { userId, requestId, zipFilename }
      });

      return {
        success: true,
        requestId,
        filename: zipFilename,
        format: 'ZIP (CSV files)',
        gdprArticle: 'Art. 20 - Data Portability'
      };
    } catch (error) {
      await logError('gdpr', error, { action: 'export_portable_data', userId, requestId });
      throw error;
    }
  }

  /**
   * Save export to file
   */
  async saveExport(userId, requestId, data) {
    await fs.mkdir(this.exportPath, { recursive: true });

    const filename = `gdpr_export_${userId}_${requestId}.json`;
    const filePath = path.join(this.exportPath, filename);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return filename;
  }

  /**
   * Convert array of objects to CSV
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Create ZIP archive
   */
  async createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Get export file for download
   */
  async getExportFile(filename) {
    const filePath = path.join(this.exportPath, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw new Error(`Export file not found: ${filename}`);
    }
  }

  /**
   * Cleanup old exports (older than 7 days)
   */
  async cleanupOldExports() {
    console.log('[DataExporter] Cleaning up old exports...');

    try {
      await fs.mkdir(this.exportPath, { recursive: true });
      const files = await fs.readdir(this.exportPath);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(this.exportPath, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          deleted++;
        }
      }

      await logAgent('gdpr', 'exports_cleaned', {
        description: `Cleaned up ${deleted} old export files`,
        metadata: { deleted }
      });

      return { deleted };
    } catch (error) {
      await logError('gdpr', error, { action: 'cleanup_exports' });
      return { deleted: 0, error: error.message };
    }
  }
}

export default new DataExporter();
