/**
 * Content Feedback Loop — Blok D.1
 * Correlates trending_data keywords with content_performance to boost relevance_score
 * for keywords that have proven engagement.
 *
 * Option B: Standalone in Trendspotter (Learning Agent #13 remains deactivated).
 * Schedule: Weekly Sunday at 04:00 (after trending scan at 03:30)
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ContentFeedbackLoop {
  /**
   * Run feedback loop for a specific destination.
   * Correlates trending keywords with published content performance.
   * Adjusts relevance_score based on proven engagement.
   *
   * @param {number} destinationId
   * @returns {Object} { updated: number, keywords_boosted: string[], keywords_penalized: string[] }
   */
  async run(destinationId) {
    const result = { updated: 0, keywords_boosted: [], keywords_penalized: [] };

    try {
      // Step 1: Get trending keywords from last 4 weeks
      const [trendingKeywords] = await mysqlSequelize.query(
        `SELECT keyword, relevance_score, language, trend_direction
         FROM trending_data
         WHERE destination_id = :destId
           AND year = YEAR(CURDATE())
           AND week_number >= WEEK(CURDATE()) - 4
         ORDER BY relevance_score DESC`,
        { replacements: { destId: destinationId } }
      );

      if (!trendingKeywords.length) {
        logger.info(`[FeedbackLoop] No trending keywords for destination ${destinationId}`);
        return result;
      }

      // Step 2: Get content performance data from last 30 days
      const [performanceData] = await mysqlSequelize.query(
        `SELECT ci.title, ci.content_type, ci.seo_data,
                SUM(cp.views) as total_views,
                SUM(cp.engagement) as total_engagement,
                SUM(cp.reach) as total_reach,
                SUM(cp.clicks) as total_clicks
         FROM content_items ci
         JOIN content_performance cp ON cp.content_item_id = ci.id
         WHERE ci.destination_id = :destId
           AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND ci.approval_status = 'published'
         GROUP BY ci.id, ci.title, ci.content_type, ci.seo_data`,
        { replacements: { destId: destinationId } }
      );

      if (!performanceData.length) {
        logger.info(`[FeedbackLoop] No published content performance for destination ${destinationId}`);
        return result;
      }

      // Step 3: Build keyword → performance correlation map
      const keywordPerformance = new Map();

      for (const content of performanceData) {
        const titleWords = (content.title || '').toLowerCase().split(/\s+/);
        const seoKeywords = this.extractSeoKeywords(content.seo_data);
        const allWords = [...titleWords, ...seoKeywords];

        const engagementScore = this.calculateEngagementScore(content);

        for (const word of allWords) {
          if (word.length < 3) continue;
          const existing = keywordPerformance.get(word) || { totalScore: 0, count: 0 };
          existing.totalScore += engagementScore;
          existing.count += 1;
          keywordPerformance.set(word, existing);
        }
      }

      // Step 4: Update relevance_score for matching trending keywords
      for (const trend of trendingKeywords) {
        const keyword = trend.keyword.toLowerCase();
        const words = keyword.split(/\s+/);

        // Check if any word in the trending keyword has performance data
        let matchScore = 0;
        let matchCount = 0;

        for (const word of words) {
          const perf = keywordPerformance.get(word);
          if (perf) {
            matchScore += perf.totalScore / perf.count;
            matchCount++;
          }
        }

        if (matchCount === 0) continue;

        const avgMatchScore = matchScore / matchCount;

        // Calculate adjustment: positive for high-engagement, negative for low
        // Scale: 0-1 = penalty (-0.5), 1-3 = neutral, 3+ = boost (+0.5 to +2.0)
        let adjustment = 0;
        if (avgMatchScore >= 5) {
          adjustment = 2.0; // Excellent engagement
        } else if (avgMatchScore >= 3) {
          adjustment = 1.0; // Good engagement
        } else if (avgMatchScore >= 1) {
          adjustment = 0.5; // Moderate engagement
        } else {
          adjustment = -0.5; // Poor engagement — penalize
        }

        const currentScore = Number(trend.relevance_score) || 5;
        const newScore = Math.round(Math.min(10, Math.max(0, currentScore + adjustment)) * 10) / 10;

        if (newScore !== currentScore) {
          await mysqlSequelize.query(
            `UPDATE trending_data
             SET relevance_score = :newScore, updated_at = NOW()
             WHERE destination_id = :destId AND keyword = :keyword
               AND year = YEAR(CURDATE()) AND week_number >= WEEK(CURDATE()) - 4`,
            { replacements: { newScore, destId: destinationId, keyword: trend.keyword } }
          );

          result.updated++;
          if (adjustment > 0) {
            result.keywords_boosted.push(`${trend.keyword} (${currentScore}→${newScore})`);
          } else {
            result.keywords_penalized.push(`${trend.keyword} (${currentScore}→${newScore})`);
          }
        }
      }

      logger.info(`[FeedbackLoop] Destination ${destinationId}: ${result.updated} keywords updated (${result.keywords_boosted.length} boosted, ${result.keywords_penalized.length} penalized)`);
    } catch (error) {
      logger.error(`[FeedbackLoop] Error for destination ${destinationId}:`, error);
      throw error;
    }

    return result;
  }

  /**
   * Extract keywords from SEO data JSON
   */
  extractSeoKeywords(seoData) {
    if (!seoData) return [];
    try {
      const parsed = typeof seoData === 'string' ? JSON.parse(seoData) : seoData;
      const keywords = [];
      if (parsed.keywords) {
        keywords.push(...(Array.isArray(parsed.keywords) ? parsed.keywords : [parsed.keywords]));
      }
      if (parsed.focus_keyword) {
        keywords.push(parsed.focus_keyword);
      }
      return keywords.map(k => k.toLowerCase());
    } catch {
      return [];
    }
  }

  /**
   * Calculate a normalized engagement score (0-10) from raw metrics
   */
  calculateEngagementScore(content) {
    const views = Number(content.total_views) || 0;
    const engagement = Number(content.total_engagement) || 0;
    const clicks = Number(content.total_clicks) || 0;
    const reach = Number(content.total_reach) || 0;

    // Engagement rate (if reach > 0)
    const engRate = reach > 0 ? (engagement / reach) * 100 : 0;
    // CTR
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    // Volume score (log scale)
    const volumeScore = views > 0 ? Math.min(10, Math.log10(views + 1) * 3) : 0;

    // Weighted: engagement rate 40%, CTR 30%, volume 30%
    return (engRate * 0.4) + (ctr * 0.3) + (volumeScore * 0.3);
  }
}

const contentFeedbackLoop = new ContentFeedbackLoop();
export default contentFeedbackLoop;
