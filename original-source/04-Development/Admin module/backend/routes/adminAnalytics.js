/**
 * Admin Analytics Routes
 * HolidaiButler Admin Module
 *
 * Advanced analytics and statistics endpoints for dashboard
 */

import express from 'express';
import db from '../config/database.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/analytics/overview
 * @desc    Get comprehensive dashboard overview statistics
 * @access  Private (Admin with read permission)
 */
router.get('/overview', verifyAdminToken, async (req, res) => {
  try {
    // Get comprehensive stats for dashboard
    const [overviewStats] = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as needsReview,
        ROUND(AVG(rating), 2) as avgRating,
        SUM(popularity_score) as totalViews,
        0 as totalBookings
      FROM POI
    `);

    // Get POI count by category
    const [categoryStats] = await db.execute(`
      SELECT category, COUNT(*) as count
      FROM POI
      WHERE verified = 1
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get POI count by city (top 10)
    const [cityStats] = await db.execute(`
      SELECT city, COUNT(*) as count
      FROM POI
      WHERE verified = 1 AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get POI count by country
    const [countryStats] = await db.execute(`
      SELECT country, COUNT(*) as count
      FROM POI
      WHERE verified = 1 AND country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        overview: overviewStats[0],
        byCategory: categoryStats,
        byCity: cityStats,
        byCountry: countryStats
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics overview.'
    });
  }
});

/**
 * @route   GET /api/admin/analytics/trends
 * @desc    Get time-based trends (POIs created per period)
 * @access  Private (Admin)
 */
router.get('/trends', verifyAdminToken, async (req, res) => {
  try {
    const { period = 'week', limit = 12 } = req.query;

    let dateFormat;
    let dateGroup;

    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        dateGroup = 'day';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        dateGroup = 'month';
        break;
      case 'week':
      default:
        dateFormat = '%Y-%u'; // Week number
        dateGroup = 'week';
        break;
    }

    // POIs created over time
    const [creationTrends] = await db.execute(`
      SELECT
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as count
      FROM POI
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? ${dateGroup})
      GROUP BY period
      ORDER BY period ASC
    `, [dateFormat, parseInt(limit)]);

    // POIs verified over time
    const [verificationTrends] = await db.execute(`
      SELECT
        DATE_FORMAT(last_updated, ?) as period,
        COUNT(*) as count
      FROM POI
      WHERE verified = 1
        AND last_updated >= DATE_SUB(NOW(), INTERVAL ? ${dateGroup})
      GROUP BY period
      ORDER BY period ASC
    `, [dateFormat, parseInt(limit)]);

    res.json({
      success: true,
      data: {
        creation: creationTrends,
        verification: verificationTrends,
        period: period
      }
    });

  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trends.'
    });
  }
});

/**
 * @route   GET /api/admin/analytics/top-pois
 * @desc    Get top performing POIs (by rating, popularity, etc.)
 * @access  Private (Admin)
 */
router.get('/top-pois', verifyAdminToken, async (req, res) => {
  try {
    const { metric = 'rating', limit = 10 } = req.query;

    let orderBy;
    switch (metric) {
      case 'popularity':
        orderBy = 'popularity_score DESC';
        break;
      case 'reviews':
        orderBy = 'review_count DESC';
        break;
      case 'rating':
      default:
        orderBy = 'rating DESC, review_count DESC';
        break;
    }

    const [topPOIs] = await db.execute(`
      SELECT
        id,
        name,
        category,
        city,
        country,
        rating,
        review_count,
        popularity_score,
        verified,
        featured
      FROM POI
      WHERE verified = 1
      ORDER BY ${orderBy}
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: {
        pois: topPOIs,
        metric: metric
      }
    });

  } catch (error) {
    console.error('Top POIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top POIs.'
    });
  }
});

/**
 * @route   GET /api/admin/analytics/recent-activity
 * @desc    Get recent POI activity (created, updated, status changes)
 * @access  Private (Admin)
 */
router.get('/recent-activity', verifyAdminToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Recent POI creations
    const [recentCreated] = await db.execute(`
      SELECT
        id,
        name,
        category,
        city,
        verified,
        created_at as timestamp,
        'created' as activity_type
      FROM POI
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Recent POI updates
    const [recentUpdated] = await db.execute(`
      SELECT
        id,
        name,
        category,
        city,
        verified,
        last_updated as timestamp,
        'updated' as activity_type
      FROM POI
      WHERE last_updated != created_at
      ORDER BY last_updated DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Combine and sort by timestamp
    const allActivity = [...recentCreated, ...recentUpdated]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activity: allActivity
      }
    });

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recent activity.'
    });
  }
});

/**
 * @route   GET /api/admin/analytics/user-stats
 * @desc    Get admin user statistics
 * @access  Private (Platform Admin only)
 */
router.get('/user-stats', verifyAdminToken, async (req, res) => {
  try {
    // Only platform admins can view user stats
    if (req.adminUser.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform administrators can view user statistics.'
      });
    }

    // User counts by role
    const [usersByRole] = await db.execute(`
      SELECT role, COUNT(*) as count
      FROM AdminUsers
      WHERE status = 'active'
      GROUP BY role
    `);

    // User counts by status
    const [usersByStatus] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM AdminUsers
      GROUP BY status
    `);

    // Recent user registrations (last 30 days)
    const [recentUsers] = await db.execute(`
      SELECT COUNT(*) as count
      FROM AdminUsers
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Total users
    const [totalUsers] = await db.execute(`
      SELECT COUNT(*) as count FROM AdminUsers
    `);

    res.json({
      success: true,
      data: {
        total: totalUsers[0].count,
        byRole: usersByRole,
        byStatus: usersByStatus,
        recentRegistrations: recentUsers[0].count
      }
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics.'
    });
  }
});

/**
 * @route   GET /api/admin/analytics/geographic
 * @desc    Get geographic distribution of POIs
 * @access  Private (Admin)
 */
router.get('/geographic', verifyAdminToken, async (req, res) => {
  try {
    // POIs by country
    const [byCountry] = await db.execute(`
      SELECT
        country,
        COUNT(*) as total,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as active
      FROM POI
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY total DESC
    `);

    // POIs by city (top 20)
    const [byCity] = await db.execute(`
      SELECT
        city,
        country,
        COUNT(*) as total,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as active
      FROM POI
      WHERE city IS NOT NULL
      GROUP BY city, country
      ORDER BY total DESC
      LIMIT 20
    `);

    // Coordinates for map visualization (sample of active POIs)
    const [coordinates] = await db.execute(`
      SELECT
        id,
        name,
        latitude,
        longitude,
        category,
        city,
        country
      FROM POI
      WHERE verified = 1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      LIMIT 500
    `);

    res.json({
      success: true,
      data: {
        byCountry,
        byCity,
        coordinates
      }
    });

  } catch (error) {
    console.error('Geographic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching geographic data.'
    });
  }
});

export default router;
