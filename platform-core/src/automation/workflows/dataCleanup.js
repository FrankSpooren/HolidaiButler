/**
 * Data Cleanup Workflows
 * Automated data maintenance and cleanup tasks
 */

import workflowManager from '../workflowManager.js';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Data Cleanup Workflow
 * Daily cleanup of old/expired data
 */
workflowManager.register('data-cleanup', {
  name: 'Data Cleanup',
  description: 'Cleans up old and expired data',
  handler: async (data) => {
    logger.workflow('data-cleanup', 'processing', {});

    let cleanedRecords = 0;

    try {
      // 1. Clean up expired bookings (older than 30 days, status = pending)
      const [expiredBookings] = await mysqlSequelize.query(`
        DELETE FROM bookings
        WHERE status = 'pending'
        AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      cleanedRecords += expiredBookings.affectedRows || 0;

      // 2. Clean up old sessions (older than 7 days)
      const [oldSessions] = await mysqlSequelize.query(`
        DELETE FROM sessions
        WHERE createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      cleanedRecords += oldSessions.affectedRows || 0;

      // 3. Archive old transactions (older than 1 year)
      const [oldTransactions] = await mysqlSequelize.query(`
        INSERT INTO transactions_archive
        SELECT * FROM transactions
        WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
      `);

      if (oldTransactions.affectedRows > 0) {
        await mysqlSequelize.query(`
          DELETE FROM transactions
          WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        `);
        cleanedRecords += oldTransactions.affectedRows || 0;
      }

      logger.workflow('data-cleanup', 'completed', { cleanedRecords });

      return {
        success: true,
        recordsCleaned: cleanedRecords,
      };
    } catch (error) {
      logger.error('Data cleanup failed:', error);
      throw error;
    }
  },
});

/**
 * Database Optimization Workflow
 * Optimizes database tables
 */
workflowManager.register('database-optimization', {
  name: 'Database Optimization',
  description: 'Optimizes database tables and indexes',
  handler: async (data) => {
    logger.workflow('database-optimization', 'processing', {});

    try {
      const tables = ['bookings', 'tickets', 'transactions', 'availability'];

      for (const table of tables) {
        await mysqlSequelize.query(`OPTIMIZE TABLE ${table}`);
      }

      logger.workflow('database-optimization', 'completed', {
        tablesOptimized: tables.length,
      });

      return {
        success: true,
        tablesOptimized: tables.length,
      };
    } catch (error) {
      logger.error('Database optimization failed:', error);
      throw error;
    }
  },
});

logger.info('Data cleanup workflows registered');
