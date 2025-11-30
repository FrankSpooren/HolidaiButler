/**
 * Admin Reports Routes
 * HolidaiButler Admin Module
 *
 * Endpoints for generating and sending reports/digests
 */

import express from 'express';
import db from '../config/database.js';
import AdminUser from '../models/AdminUser.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';
import emailService from '../services/EmailService.js';

const router = express.Router();

/**
 * @route   POST /api/admin/reports/weekly-digest
 * @desc    Generate and send weekly digest to platform admins
 * @access  Private (Platform Admin only) or Cron Job
 */
router.post('/weekly-digest', verifyAdminToken, async (req, res) => {
  try {
    // Only platform admins can trigger weekly digest
    if (req.adminUser.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform administrators can trigger weekly digest.'
      });
    }

    console.log('📊 Generating weekly digest...');

    // Calculate date range (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Gather statistics for the week
    const stats = await gatherWeeklyStats(oneWeekAgo);

    // Get all platform admins
    const platformAdmins = await AdminUser.getAll({
      role: 'platform_admin',
      status: 'active'
    });

    console.log(`📧 Sending weekly digest to ${platformAdmins.length} platform admin(s)...`);

    const emailResults = [];

    // Send digest to each platform admin
    for (const admin of platformAdmins) {
      try {
        const result = await emailService.sendWeeklyDigest({
          adminEmail: admin.email,
          adminName: `${admin.first_name} ${admin.last_name}`.trim(),
          stats: stats
        });

        emailResults.push({
          email: admin.email,
          success: result.success
        });

        if (result.success) {
          console.log(`✅ Weekly digest sent to ${admin.email}`);
        } else {
          console.error(`❌ Failed to send digest to ${admin.email}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending digest to ${admin.email}:`, error.message);
        emailResults.push({
          email: admin.email,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Weekly digest sent to ${successCount} admin(s). ${failCount} failed.`,
      data: {
        stats,
        emailResults,
        successCount,
        failCount
      }
    });

  } catch (error) {
    console.error('Weekly digest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating weekly digest.'
    });
  }
});

/**
 * @route   GET /api/admin/reports/weekly-stats
 * @desc    Get weekly statistics (without sending email)
 * @access  Private (Platform Admin)
 */
router.get('/weekly-stats', verifyAdminToken, async (req, res) => {
  try {
    // Only platform admins can view stats
    if (req.adminUser.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform administrators can view weekly stats.'
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats = await gatherWeeklyStats(oneWeekAgo);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching weekly stats.'
    });
  }
});

/**
 * Helper: Gather weekly statistics
 */
async function gatherWeeklyStats(startDate) {
  try {
    // New POIs this week
    const [newPOIsResult] = await db.execute(
      'SELECT COUNT(*) as count FROM POI WHERE created_at >= ?',
      [startDate]
    );
    const newPOIs = newPOIsResult[0].count;

    // Pending approvals (total, not just this week)
    const [pendingResult] = await db.execute(
      'SELECT COUNT(*) as count FROM POI WHERE verified = 0'
    );
    const pendingApprovals = pendingResult[0].count;

    // New admin users this week
    const [newUsersResult] = await db.execute(
      'SELECT COUNT(*) as count FROM AdminUsers WHERE created_at >= ?',
      [startDate]
    );
    const newUsers = newUsersResult[0].count;

    // Total and active POIs
    const [totalPOIsResult] = await db.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as active FROM POI'
    );
    const totalPOIs = totalPOIsResult[0].total;
    const activePOIs = totalPOIsResult[0].active;

    // Top 3 categories by POI count
    const [topCategoriesResult] = await db.execute(`
      SELECT category, COUNT(*) as count
      FROM POI
      WHERE verified = 1
      GROUP BY category
      ORDER BY count DESC
      LIMIT 3
    `);

    const topCategories = topCategoriesResult.map(row => ({
      name: row.category,
      count: row.count
    }));

    // Recent activity (last 10 POIs created this week)
    const [recentActivityResult] = await db.execute(`
      SELECT id, name, category, city, created_at
      FROM POI
      WHERE created_at >= ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [startDate]);

    const recentActivity = recentActivityResult.map(poi => ({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      city: poi.city,
      createdAt: poi.created_at
    }));

    return {
      newPOIs,
      pendingApprovals,
      newUsers,
      totalPOIs,
      activePOIs,
      topCategories,
      recentActivity,
      periodStart: startDate,
      periodEnd: new Date()
    };

  } catch (error) {
    console.error('Error gathering weekly stats:', error);
    throw error;
  }
}

export default router;
