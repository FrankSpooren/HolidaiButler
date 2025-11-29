/**
 * Analytics Workflows
 * Data aggregation and analytics
 */

import workflowManager from '../workflowManager.js';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

/**
 * Analytics Aggregation Workflow
 * Aggregates analytics data hourly
 */
workflowManager.register('analytics-aggregation', {
  name: 'Analytics Aggregation',
  description: 'Aggregates analytics data',
  handler: async (data) => {
    logger.workflow('analytics-aggregation', 'processing', {});

    try {
      const now = new Date();
      const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // 1. Aggregate booking metrics
      const [bookingMetrics] = await mysqlSequelize.query(`
        INSERT INTO analytics_hourly (
          hour,
          metric_type,
          metric_value,
          createdAt,
          updatedAt
        )
        SELECT
          :hour as hour,
          'bookings_count' as metric_type,
          COUNT(*) as metric_value,
          NOW() as createdAt,
          NOW() as updatedAt
        FROM bookings
        WHERE createdAt >= :hour
        AND createdAt < DATE_ADD(:hour, INTERVAL 1 HOUR)
        ON DUPLICATE KEY UPDATE
          metric_value = VALUES(metric_value),
          updatedAt = NOW()
      `, {
        replacements: { hour },
      });

      // 2. Aggregate revenue metrics
      const [revenueMetrics] = await mysqlSequelize.query(`
        INSERT INTO analytics_hourly (
          hour,
          metric_type,
          metric_value,
          createdAt,
          updatedAt
        )
        SELECT
          :hour as hour,
          'revenue' as metric_type,
          COALESCE(SUM(amount), 0) as metric_value,
          NOW() as createdAt,
          NOW() as updatedAt
        FROM transactions
        WHERE status = 'completed'
        AND createdAt >= :hour
        AND createdAt < DATE_ADD(:hour, INTERVAL 1 HOUR)
        ON DUPLICATE KEY UPDATE
          metric_value = VALUES(metric_value),
          updatedAt = NOW()
      `, {
        replacements: { hour },
      });

      // 3. Calculate conversion rate
      const [conversionRate] = await mysqlSequelize.query(`
        INSERT INTO analytics_hourly (
          hour,
          metric_type,
          metric_value,
          createdAt,
          updatedAt
        )
        SELECT
          :hour as hour,
          'conversion_rate' as metric_type,
          CASE
            WHEN COUNT(DISTINCT b.id) > 0
            THEN (COUNT(DISTINCT CASE WHEN b.paymentStatus = 'completed' THEN b.id END) * 100.0 / COUNT(DISTINCT b.id))
            ELSE 0
          END as metric_value,
          NOW() as createdAt,
          NOW() as updatedAt
        FROM bookings b
        WHERE b.createdAt >= :hour
        AND b.createdAt < DATE_ADD(:hour, INTERVAL 1 HOUR)
        ON DUPLICATE KEY UPDATE
          metric_value = VALUES(metric_value),
          updatedAt = NOW()
      `, {
        replacements: { hour },
      });

      logger.workflow('analytics-aggregation', 'completed', {
        hour: hour.toISOString(),
      });

      return {
        success: true,
        hour: hour.toISOString(),
        metricsAggregated: 3,
      };
    } catch (error) {
      logger.error('Analytics aggregation failed:', error);
      throw error;
    }
  },
});

/**
 * Daily Report Workflow
 * Generates daily performance report
 */
workflowManager.register('daily-report', {
  name: 'Daily Report',
  description: 'Generates daily performance report',
  handler: async (data) => {
    logger.workflow('daily-report', 'processing', {});

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Get daily metrics
      const [metrics] = await mysqlSequelize.query(`
        SELECT
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.paymentStatus = 'completed' THEN b.id END) as completed_bookings,
          COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_revenue,
          COUNT(DISTINCT b.userId) as unique_customers
        FROM bookings b
        LEFT JOIN transactions t ON b.id = t.bookingReference
        WHERE DATE(b.createdAt) = DATE(:yesterday)
      `, {
        replacements: { yesterday },
      });

      const report = metrics[0];

      // Store report in database
      await mysqlSequelize.query(`
        INSERT INTO daily_reports (
          report_date,
          total_bookings,
          completed_bookings,
          total_revenue,
          unique_customers,
          createdAt
        )
        VALUES (
          DATE(:yesterday),
          :total_bookings,
          :completed_bookings,
          :total_revenue,
          :unique_customers,
          NOW()
        )
      `, {
        replacements: {
          yesterday,
          total_bookings: report.total_bookings,
          completed_bookings: report.completed_bookings,
          total_revenue: report.total_revenue,
          unique_customers: report.unique_customers,
        },
      });

      logger.workflow('daily-report', 'completed', { report });

      return {
        success: true,
        date: yesterday.toISOString().split('T')[0],
        report,
      };
    } catch (error) {
      logger.error('Daily report generation failed:', error);
      throw error;
    }
  },
});

logger.info('Analytics workflows registered');
