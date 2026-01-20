/**
 * Review Controller
 * =================
 * Sprint 7.6 - Personalized Reviews System
 * Handles review retrieval, filtering, summary, and helpful marking
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/pois/:id/reviews
 * Get reviews for a specific POI with filtering and sorting
 *
 * Query Parameters:
 * - travel_party: 'couples' | 'families' | 'solo' | 'friends' | 'business' | 'all'
 * - sentiment: 'positive' | 'neutral' | 'negative' | 'all'
 * - sort: 'recent' | 'helpful' | 'highRating' | 'lowRating'
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 */
exports.getReviews = async (req, res) => {
  try {
    const { id: poiId } = req.params;
    const {
      travel_party = 'all',
      sentiment = 'all',
      sort = 'helpful',
      limit = 10,
      offset = 0
    } = req.query;

    // Build WHERE clause based on filters (MySQL uses ? placeholders)
    const whereClauses = ['poi_id = ?'];
    const queryParams = [poiId];

    if (travel_party && travel_party !== 'all') {
      whereClauses.push('travel_party_type = ?');
      queryParams.push(travel_party);
    }

    if (sentiment && sentiment !== 'all') {
      whereClauses.push('sentiment = ?');
      queryParams.push(sentiment);
    }

    // Build ORDER BY clause based on sort parameter
    let orderBy;
    switch (sort) {
      case 'recent':
        orderBy = 'created_at DESC';
        break;
      case 'helpful':
        orderBy = 'helpful_count DESC, created_at DESC';
        break;
      case 'highRating':
        orderBy = 'rating DESC, created_at DESC';
        break;
      case 'lowRating':
        orderBy = 'rating ASC, created_at DESC';
        break;
      default:
        orderBy = 'helpful_count DESC, created_at DESC';
    }

    const reviewQuery = `
      SELECT
        id,
        poi_id,
        user_name,
        travel_party_type,
        rating,
        review_text,
        sentiment,
        helpful_count,
        visit_date,
        created_at
      FROM reviews
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    // Add limit and offset to query params
    const reviewQueryParams = [...queryParams, parseInt(limit), parseInt(offset)];

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews
      WHERE ${whereClauses.join(' AND ')}
    `;

    const [reviewsResult, countResult] = await Promise.all([
      query(reviewQuery, reviewQueryParams),
      query(countQuery, queryParams) // Use base params without limit/offset
    ]);

    logger.info(`Retrieved ${reviewsResult.length} reviews for POI ${poiId}`);

    res.json({
      success: true,
      data: reviewsResult,
      total: parseInt(countResult[0].total),
      filters: {
        travel_party,
        sentiment,
        sort,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
      message: error.message
    });
  }
};

/**
 * GET /api/pois/:id/reviews/summary
 * Get review summary statistics for a POI
 *
 * Returns:
 * - average_rating: Average rating (1-5)
 * - total_count: Total number of reviews
 * - sentiment_breakdown: Count of positive/neutral/negative reviews
 * - party_breakdown: Count of reviews by travel party type
 */
exports.getReviewSummary = async (req, res) => {
  try {
    const { id: poiId } = req.params;

    // Get summary statistics (MySQL uses ? placeholders)
    const summaryQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_count,
        COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count,
        COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
        COUNT(CASE WHEN travel_party_type = 'couples' THEN 1 END) as couples_count,
        COUNT(CASE WHEN travel_party_type = 'families' THEN 1 END) as families_count,
        COUNT(CASE WHEN travel_party_type = 'solo' THEN 1 END) as solo_count,
        COUNT(CASE WHEN travel_party_type = 'friends' THEN 1 END) as friends_count,
        COUNT(CASE WHEN travel_party_type = 'business' THEN 1 END) as business_count
      FROM reviews
      WHERE poi_id = ?
    `;

    const result = await query(summaryQuery, [poiId]);
    const row = result[0];

    const summary = {
      average_rating: parseFloat(row.average_rating).toFixed(1),
      total_count: parseInt(row.total_count),
      sentiment_breakdown: {
        positive: parseInt(row.positive_count),
        neutral: parseInt(row.neutral_count),
        negative: parseInt(row.negative_count)
      },
      party_breakdown: {
        couples: parseInt(row.couples_count),
        families: parseInt(row.families_count),
        solo: parseInt(row.solo_count),
        friends: parseInt(row.friends_count),
        business: parseInt(row.business_count)
      }
    };

    logger.info(`Retrieved review summary for POI ${poiId}: ${summary.total_count} reviews, avg ${summary.average_rating}`);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching review summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review summary',
      message: error.message
    });
  }
};

/**
 * POST /api/pois/:id/reviews/:reviewId/helpful
 * Mark a review as helpful
 *
 * Increments the helpful_count for a review
 * TODO: Implement user tracking to prevent duplicate marks (localStorage or user_id)
 */
exports.markReviewHelpful = async (req, res) => {
  try {
    const { id: poiId, reviewId } = req.params;

    // Update helpful count (MySQL uses ? placeholders)
    const updateQuery = `
      UPDATE reviews
      SET helpful_count = helpful_count + 1
      WHERE id = ? AND poi_id = ?
    `;

    const result = await query(updateQuery, [reviewId, poiId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Get updated review to return the new count
    const selectQuery = 'SELECT id, helpful_count FROM reviews WHERE id = ?';
    const selectResult = await query(selectQuery, [reviewId]);

    logger.info(`Review ${reviewId} marked as helpful for POI ${poiId}. New count: ${selectResult[0].helpful_count}`);

    res.json({
      success: true,
      data: {
        id: selectResult[0].id,
        helpful_count: selectResult[0].helpful_count
      }
    });
  } catch (error) {
    logger.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark review as helpful',
      message: error.message
    });
  }
};

/**
 * GET /api/pois/:id/reviews/insights
 * Get category-specific insights from reviews (optional enhancement)
 *
 * Extracts common themes and keywords from reviews
 * Returns top 3 positive themes for the POI
 */
exports.getReviewInsights = async (req, res) => {
  try {
    const { id: poiId } = req.params;

    // Simple keyword extraction from positive reviews (MySQL uses ? placeholders)
    const insightQuery = `
      SELECT review_text
      FROM reviews
      WHERE poi_id = ? AND sentiment = 'positive'
      ORDER BY helpful_count DESC, rating DESC
      LIMIT 20
    `;

    const result = await query(insightQuery, [poiId]);

    // Extract common positive keywords
    const keywords = [
      'excellent', 'amazing', 'great', 'fantastic', 'wonderful',
      'beautiful', 'perfect', 'loved', 'recommend', 'best',
      'delicious', 'friendly', 'professional', 'clean', 'authentic',
      'stunning', 'breathtaking', 'unique', 'fun', 'romantic'
    ];

    const keywordCounts = {};
    result.forEach(row => {
      const text = row.review_text.toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    });

    // Get top 3 keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([keyword, count]) => ({
        keyword,
        count,
        label: keyword.charAt(0).toUpperCase() + keyword.slice(1)
      }));

    res.json({
      success: true,
      data: {
        insights: topKeywords,
        sample_size: result.length
      }
    });
  } catch (error) {
    logger.error('Error fetching review insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review insights',
      message: error.message
    });
  }
};
