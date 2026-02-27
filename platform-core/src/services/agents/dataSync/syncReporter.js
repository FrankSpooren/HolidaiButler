/**
 * Sync Reporter
 * Enterprise-level reporting, health monitoring, and alerting for data sync
 *
 * Features:
 * - Daily/weekly data health reports
 * - Data quality score calculation
 * - Sync job success/failure tracking
 * - Apify budget consumption alerts
 * - Anomaly reporting
 * - Email digest generation
 *
 * @module agents/dataSync/syncReporter
 * @version 1.0.0
 */

import { logAgent, logAlert, getStats as getAuditStats } from "../../orchestrator/auditTrail/index.js";
import apifyIntegration from "./apifyIntegration.js";
import dataValidator from "./dataValidator.js";

// Report configuration
const QUALITY_THRESHOLDS = {
  excellent: 0.9,
  good: 0.75,
  acceptable: 0.6,
  poor: 0.4
};

const ALERT_THRESHOLDS = {
  budgetWarning: 0.75, // 75% budget used
  budgetCritical: 0.90, // 90% budget used
  syncFailureRate: 0.15, // >15% sync failures
  dataQualityDrop: 0.10 // >10% quality drop
};

class SyncReporter {
  constructor() {
    this.sequelize = null;
    this.lastReportData = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Generate comprehensive data health report
   * @param {Object} options - Report options
   * @returns {Object} Health report
   */
  async generateHealthReport(options = {}) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const { period = "daily", sendAlert = false } = options;
    const reportDate = new Date().toISOString();

    console.log(`[SyncReporter] Generating ${period} health report...`);

    // Gather all statistics
    const [poiStats, reviewStats, qaStats, syncStats, budgetStatus, qualityScore] = await Promise.all([
      this.getPOIStats(),
      this.getReviewStats(),
      this.getQAStats(),
      this.getSyncStats(period === "daily" ? 24 : 168), // 24h or 7 days
      this.getBudgetStatus(),
      this.calculateOverallQuality()
    ]);

    const report = {
      reportType: period,
      generatedAt: reportDate,
      summary: {
        overallHealth: this.calculateHealthStatus(qualityScore.score, syncStats, budgetStatus),
        qualityScore: qualityScore.score,
        qualityLabel: qualityScore.label
      },
      poi: poiStats,
      reviews: reviewStats,
      qa: qaStats,
      sync: syncStats,
      budget: budgetStatus,
      quality: qualityScore,
      alerts: [],
      recommendations: []
    };

    // Generate alerts
    report.alerts = await this.generateAlerts(report);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    // Store for comparison
    this.lastReportData = report;

    // Log report generation
    await logAgent("data-sync", "health_report_generated", {
      description: `${period} health report generated`,
      metadata: {
        period,
        overallHealth: report.summary.overallHealth,
        qualityScore: report.summary.qualityScore,
        alertCount: report.alerts.length
      }
    });

    // Send alert if requested and there are issues
    if (sendAlert && report.alerts.length > 0) {
      await this.sendReportAlert(report);
    }

    console.log(`[SyncReporter] Report complete: ${report.summary.overallHealth} health, ${report.alerts.length} alerts`);

    return report;
  }

  /**
   * Get POI statistics
   * @returns {Object} POI stats
   */
  async getPOIStats() {
    const [totalResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM POI"
    );

    const [activeResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM POI WHERE is_active = 1 OR is_active IS NULL"
    );

    const [byStatus] = await this.sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM POI
      GROUP BY status
    `);

    const [byCategory] = await this.sequelize.query(`
      SELECT category, COUNT(*) as count
      FROM POI
      WHERE is_active = 1 OR is_active IS NULL
      GROUP BY category
      ORDER BY count DESC
    `);

    const [recentlyUpdated] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [staleData] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE last_updated < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND (is_active = 1 OR is_active IS NULL)
    `);

    const [pendingDeactivation] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE status = 'pending_deactivation'
    `);

    return {
      total: totalResult[0]?.count || 0,
      active: activeResult[0]?.count || 0,
      byStatus: byStatus,
      byCategory: byCategory,
      recentlyUpdated: recentlyUpdated[0]?.count || 0,
      staleData: staleData[0]?.count || 0,
      pendingDeactivation: pendingDeactivation[0]?.count || 0
    };
  }

  /**
   * Get review statistics
   * @returns {Object} Review stats
   */
  async getReviewStats() {
    const [totalResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM reviews"
    );

    const [bySentiment] = await this.sequelize.query(`
      SELECT sentiment_label, COUNT(*) as count
      FROM reviews
      WHERE spam_score < 0.5
      GROUP BY sentiment_label
    `);

    const [byLanguage] = await this.sequelize.query(`
      SELECT language, COUNT(*) as count
      FROM reviews
      GROUP BY language
      ORDER BY count DESC
    `);

    const [recentReviews] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [avgRating] = await this.sequelize.query(`
      SELECT AVG(rating) as avg_rating
      FROM reviews
      WHERE spam_score < 0.5
    `);

    const [spamCount] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE spam_score >= 0.5
    `);

    return {
      total: totalResult[0]?.count || 0,
      bySentiment: bySentiment,
      byLanguage: byLanguage,
      addedLast7Days: recentReviews[0]?.count || 0,
      averageRating: Math.round((avgRating[0]?.avg_rating || 0) * 10) / 10,
      spamDetected: spamCount[0]?.count || 0
    };
  }

  /**
   * Get Q&A statistics
   * @returns {Object} Q&A stats
   */
  async getQAStats() {
    const [totalResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM QnA"
    );

    const [byLanguage] = await this.sequelize.query(`
      SELECT language, COUNT(*) as count
      FROM QnA
      GROUP BY language
    `);

    const [bySource] = await this.sequelize.query(`
      SELECT source, COUNT(*) as count
      FROM QnA
      GROUP BY source
    `);

    const [byDestination] = await this.sequelize.query(`
      SELECT destination_id, COUNT(*) as count
      FROM QnA
      GROUP BY destination_id
    `);

    return {
      total: totalResult[0]?.count || 0,
      byStatus: [],
      byLanguage: byLanguage,
      bySource: bySource,
      byDestination: byDestination,
      pendingApproval: 0
    };
  }

  /**
   * Get sync job statistics
   * @param {number} hours - Hours to look back
   * @returns {Object} Sync stats
   */
  async getSyncStats(hours = 24) {
    const auditStats = await getAuditStats(hours);

    // Parse audit stats
    let jobsCompleted = 0;
    let jobsFailed = 0;

    for (const stat of auditStats) {
      if (stat._id.category === "job") {
        if (stat._id.status === "completed") {
          jobsCompleted += stat.count;
        } else if (stat._id.status === "failed") {
          jobsFailed += stat.count;
        }
      }
    }

    const totalJobs = jobsCompleted + jobsFailed;
    const successRate = totalJobs > 0 ? (jobsCompleted / totalJobs) * 100 : 100;

    return {
      period: `${hours}h`,
      jobsCompleted,
      jobsFailed,
      totalJobs,
      successRate: Math.round(successRate * 10) / 10,
      validatorStats: dataValidator.getStats()
    };
  }

  /**
   * Get Apify budget status
   * @returns {Object} Budget status
   */
  async getBudgetStatus() {
    try {
      const budget = await apifyIntegration.checkBudget();
      return {
        allowed: budget.allowed,
        used: budget.used,
        remaining: budget.remaining,
        percentageUsed: budget.percentageUsed,
        monthlyBudget: budget.monthlyBudget,
        projectedOverage: this.calculateProjectedOverage(budget)
      };
    } catch (error) {
      return {
        allowed: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate projected budget overage
   * @param {Object} budget - Current budget status
   * @returns {Object} Projection
   */
  calculateProjectedOverage(budget) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const dailyRate = budget.used / dayOfMonth;
    const projectedTotal = dailyRate * daysInMonth;
    const projectedOverage = projectedTotal - budget.monthlyBudget;

    return {
      dailyRate: Math.round(dailyRate * 100) / 100,
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      willExceed: projectedOverage > 0,
      projectedOverage: Math.max(0, Math.round(projectedOverage * 100) / 100)
    };
  }

  /**
   * Calculate overall data quality score
   * @returns {Object} Quality score
   */
  async calculateOverallQuality() {
    const [poiQuality] = await this.sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN address IS NOT NULL AND address != '' THEN 1 ELSE 0 END) as has_address,
        SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) as has_phone,
        SUM(CASE WHEN website IS NOT NULL AND website != '' THEN 1 ELSE 0 END) as has_website,
        SUM(CASE WHEN opening_hours IS NOT NULL AND opening_hours != '' THEN 1 ELSE 0 END) as has_hours,
        SUM(CASE WHEN rating IS NOT NULL AND rating > 0 THEN 1 ELSE 0 END) as has_rating,
        SUM(CASE WHEN review_count IS NOT NULL AND review_count > 0 THEN 1 ELSE 0 END) as has_reviews,
        SUM(CASE WHEN last_updated >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as is_fresh
      FROM POI
      WHERE is_active = 1 OR is_active IS NULL
    `);

    const q = poiQuality[0];
    const total = q.total || 1;

    // Calculate component scores
    const completeness = (
      (q.has_address / total) * 0.2 +
      (q.has_phone / total) * 0.1 +
      (q.has_website / total) * 0.1 +
      (q.has_hours / total) * 0.2 +
      (q.has_rating / total) * 0.2 +
      (q.has_reviews / total) * 0.1 +
      (q.is_fresh / total) * 0.1
    );

    const score = Math.round(completeness * 100) / 100;

    let label = "poor";
    if (score >= QUALITY_THRESHOLDS.excellent) label = "excellent";
    else if (score >= QUALITY_THRESHOLDS.good) label = "good";
    else if (score >= QUALITY_THRESHOLDS.acceptable) label = "acceptable";

    return {
      score,
      label,
      components: {
        addressCoverage: Math.round((q.has_address / total) * 100),
        phoneCoverage: Math.round((q.has_phone / total) * 100),
        websiteCoverage: Math.round((q.has_website / total) * 100),
        hoursCoverage: Math.round((q.has_hours / total) * 100),
        ratingCoverage: Math.round((q.has_rating / total) * 100),
        reviewCoverage: Math.round((q.has_reviews / total) * 100),
        freshnessCoverage: Math.round((q.is_fresh / total) * 100)
      },
      thresholds: QUALITY_THRESHOLDS
    };
  }

  /**
   * Calculate overall health status
   * @param {number} qualityScore - Quality score
   * @param {Object} syncStats - Sync statistics
   * @param {Object} budgetStatus - Budget status
   * @returns {string} Health status
   */
  calculateHealthStatus(qualityScore, syncStats, budgetStatus) {
    let healthScore = 0;

    // Quality component (40%)
    healthScore += qualityScore * 0.4;

    // Sync success rate component (30%)
    const syncScore = (syncStats.successRate || 100) / 100;
    healthScore += syncScore * 0.3;

    // Budget health component (30%)
    const budgetScore = budgetStatus.allowed
      ? (100 - (budgetStatus.percentageUsed || 0)) / 100
      : 0;
    healthScore += Math.max(0, budgetScore) * 0.3;

    if (healthScore >= 0.85) return "healthy";
    if (healthScore >= 0.70) return "good";
    if (healthScore >= 0.50) return "warning";
    return "critical";
  }

  /**
   * Generate alerts based on report data
   * @param {Object} report - Report data
   * @returns {Array} Alerts
   */
  async generateAlerts(report) {
    const alerts = [];

    // Budget alerts
    if (report.budget.percentageUsed >= ALERT_THRESHOLDS.budgetCritical * 100) {
      alerts.push({
        type: "budget_critical",
        severity: "high",
        message: `Apify budget at ${report.budget.percentageUsed.toFixed(1)}% - only ${report.budget.remaining.toFixed(2)} remaining`,
        data: report.budget
      });
    } else if (report.budget.percentageUsed >= ALERT_THRESHOLDS.budgetWarning * 100) {
      alerts.push({
        type: "budget_warning",
        severity: "medium",
        message: `Apify budget at ${report.budget.percentageUsed.toFixed(1)}%`,
        data: report.budget
      });
    }

    // Projected overage alert
    if (report.budget.projectedOverage?.willExceed) {
      alerts.push({
        type: "budget_projection",
        severity: "medium",
        message: `Projected to exceed budget by ${report.budget.projectedOverage.projectedOverage.toFixed(2)}`,
        data: report.budget.projectedOverage
      });
    }

    // Sync failure rate alert
    if (report.sync.totalJobs > 0) {
      const failureRate = report.sync.jobsFailed / report.sync.totalJobs;
      if (failureRate > ALERT_THRESHOLDS.syncFailureRate) {
        alerts.push({
          type: "sync_failures",
          severity: "high",
          message: `High sync failure rate: ${(failureRate * 100).toFixed(1)}% (${report.sync.jobsFailed}/${report.sync.totalJobs})`,
          data: report.sync
        });
      }
    }

    // Stale data alert
    if (report.poi.staleData > 0) {
      const stalePercent = (report.poi.staleData / report.poi.active) * 100;
      if (stalePercent > 20) {
        alerts.push({
          type: "stale_data",
          severity: "medium",
          message: `${stalePercent.toFixed(1)}% of POIs have stale data (>${30} days old)`,
          data: { staleCount: report.poi.staleData, percentage: stalePercent }
        });
      }
    }

    // Pending deactivation alert
    if (report.poi.pendingDeactivation > 5) {
      alerts.push({
        type: "pending_deactivations",
        severity: "low",
        message: `${report.poi.pendingDeactivation} POIs pending deactivation - review recommended`,
        data: { count: report.poi.pendingDeactivation }
      });
    }

    // Quality drop alert
    if (this.lastReportData) {
      const qualityDrop = this.lastReportData.quality.score - report.quality.score;
      if (qualityDrop > ALERT_THRESHOLDS.dataQualityDrop) {
        alerts.push({
          type: "quality_drop",
          severity: "medium",
          message: `Data quality dropped by ${(qualityDrop * 100).toFixed(1)}%`,
          data: { previous: this.lastReportData.quality.score, current: report.quality.score }
        });
      }
    }

    // Pending Q&A approvals
    if (report.qa.pendingApproval > 50) {
      alerts.push({
        type: "pending_qa",
        severity: "low",
        message: `${report.qa.pendingApproval} Q&A items pending approval`,
        data: { count: report.qa.pendingApproval }
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations based on report
   * @param {Object} report - Report data
   * @returns {Array} Recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Quality recommendations
    if (report.quality.components.hoursCoverage < 50) {
      recommendations.push({
        priority: "high",
        area: "data_completeness",
        message: "Focus on adding opening hours - only " + report.quality.components.hoursCoverage + "% coverage"
      });
    }

    if (report.quality.components.freshnessCoverage < 70) {
      recommendations.push({
        priority: "medium",
        area: "data_freshness",
        message: "Consider increasing sync frequency - " + (100 - report.quality.components.freshnessCoverage) + "% of data is over 30 days old"
      });
    }

    // Budget recommendations
    if (report.budget.projectedOverage?.willExceed) {
      recommendations.push({
        priority: "high",
        area: "budget",
        message: "Reduce sync frequency for lower-tier POIs to stay within budget"
      });
    }

    // Review recommendations
    if (report.reviews.spamDetected > 100) {
      recommendations.push({
        priority: "low",
        area: "reviews",
        message: "High spam detection count - consider reviewing spam detection thresholds"
      });
    }

    // Q&A recommendations
    if (report.qa.pendingApproval > 100) {
      recommendations.push({
        priority: "medium",
        area: "qa",
        message: "Large Q&A approval backlog - consider batch approval or auto-approve for high-quality items"
      });
    }

    return recommendations;
  }

  /**
   * Send report alert
   * @param {Object} report - Report data
   */
  async sendReportAlert(report) {
    const highPriorityAlerts = report.alerts.filter(a => a.severity === "high");

    if (highPriorityAlerts.length > 0) {
      await logAlert("high", "Data Sync Health Report: Issues Detected", {
        reportType: report.reportType,
        overallHealth: report.summary.overallHealth,
        alerts: highPriorityAlerts,
        qualityScore: report.summary.qualityScore
      });
    }
  }

  /**
   * Generate email digest HTML
   * @param {Object} report - Report data
   * @returns {string} HTML content
   */
  generateEmailDigest(report) {
    const healthColor = {
      healthy: "#28a745",
      good: "#17a2b8",
      warning: "#ffc107",
      critical: "#dc3545"
    };

    const alertsHtml = report.alerts.length > 0
      ? report.alerts.map(a => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="color: ${a.severity === 'high' ? '#dc3545' : a.severity === 'medium' ? '#ffc107' : '#17a2b8'}">
                [${a.severity.toUpperCase()}]
              </span>
              ${a.message}
            </td>
          </tr>
        `).join("")
      : '<tr><td style="padding: 8px; color: #28a745;">No alerts - all systems healthy</td></tr>';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2C3E50;">Data Sync Health Report</h2>
        <p style="color: #687684;">${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report - ${new Date(report.generatedAt).toLocaleDateString()}</p>

        <div style="background: ${healthColor[report.summary.overallHealth]}; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0;">Overall Health: ${report.summary.overallHealth.toUpperCase()}</h3>
          <p style="margin: 10px 0 0 0;">Quality Score: ${(report.summary.qualityScore * 100).toFixed(0)}%</p>
        </div>

        <h3 style="color: #2C3E50;">Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Active POIs</td><td style="text-align: right;">${report.poi.active}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total Reviews</td><td style="text-align: right;">${report.reviews.total}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total Q&A</td><td style="text-align: right;">${report.qa.total}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Sync Jobs (${report.sync.period})</td><td style="text-align: right;">${report.sync.jobsCompleted}/${report.sync.totalJobs}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Budget Used</td><td style="text-align: right;">${report.budget.percentageUsed?.toFixed(1) || 0}%</td></tr>
        </table>

        <h3 style="color: #2C3E50;">Alerts</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${alertsHtml}
        </table>

        ${report.recommendations.length > 0 ? `
          <h3 style="color: #2C3E50;">Recommendations</h3>
          <ul>
            ${report.recommendations.map(r => `<li>${r.message}</li>`).join("")}
          </ul>
        ` : ""}

        <p style="color: #687684; font-size: 12px; margin-top: 30px;">
          Generated by HolidaiButler Data Sync Agent
        </p>
      </div>
    `;
  }

  /**
   * Get reporter statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      hasLastReport: !!this.lastReportData,
      lastReportTime: this.lastReportData?.generatedAt || null,
      qualityThresholds: QUALITY_THRESHOLDS,
      alertThresholds: ALERT_THRESHOLDS
    };
  }
}

export default new SyncReporter();
export { QUALITY_THRESHOLDS, ALERT_THRESHOLDS };
