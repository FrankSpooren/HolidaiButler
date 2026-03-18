/**
 * Score Calibration — Zelflerende Social Score (Opdracht 4)
 *
 * Wekelijks (zondag 05:00): vergelijk voorspelde Social Score met werkelijke engagement.
 * Na 50+ gepubliceerde items: pas gewichten aan per destination.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

/**
 * Run score calibration for a destination.
 * 1. Haal gepubliceerde items met Social Score + werkelijke engagement
 * 2. Bereken delta (predicted vs actual)
 * 3. Sla calibratie-data op in score_calibrations
 * 4. Bij 50+ items: bereken gewichten-aanpassing → destinations.content_config
 */
export async function calibrateScoring(destinationId) {
  const result = { calibrated: 0, avgDelta: 0, weightsAdjusted: false };

  try {
    // 1. Haal gepubliceerde social posts met performance data
    const [published] = await mysqlSequelize.query(
      `SELECT ci.id, ci.destination_id, ci.target_platform, ci.seo_data,
              SUM(cp.engagement) as total_engagement,
              SUM(cp.reach) as total_reach,
              SUM(cp.views) as total_views,
              SUM(cp.clicks) as total_clicks
       FROM content_items ci
       JOIN content_performance cp ON cp.content_item_id = ci.id
       WHERE ci.destination_id = :destId
         AND ci.approval_status = 'published'
         AND ci.content_type = 'social_post'
         AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
       GROUP BY ci.id, ci.destination_id, ci.target_platform, ci.seo_data
       HAVING total_reach > 0`,
      { replacements: { destId: destinationId } }
    );

    if (!published.length) {
      logger.info(`[ScoreCalibration] No published social posts with performance for destination ${destinationId}`);
      return result;
    }

    let totalDelta = 0;
    const platformDeltas = {};

    for (const item of published) {
      // Extract predicted score from seo_data
      let seoData = item.seo_data;
      if (typeof seoData === 'string') {
        try { seoData = JSON.parse(seoData); } catch { seoData = {}; }
      }
      const predictedScore = seoData?.overallScore || seoData?.score || 0;
      if (!predictedScore) continue;

      // Calculate actual engagement rate (normalized to 0-100)
      const reach = Number(item.total_reach) || 1;
      const engagement = Number(item.total_engagement) || 0;
      const engagementRate = (engagement / reach) * 100;
      // Normalize to 0-100 scale (cap at 10% engagement = 100 score)
      const actualScore = Math.min(100, engagementRate * 10);
      const delta = predictedScore - actualScore;

      // Save calibration record
      await mysqlSequelize.query(
        `INSERT INTO score_calibrations (destination_id, content_item_id, platform, predicted_score, actual_engagement_rate, delta)
         VALUES (:destId, :itemId, :platform, :predicted, :actual, :delta)
         ON DUPLICATE KEY UPDATE predicted_score = :predicted, actual_engagement_rate = :actual, delta = :delta, calibrated_at = NOW()`,
        {
          replacements: {
            destId: destinationId,
            itemId: item.id,
            platform: item.target_platform || 'unknown',
            predicted: predictedScore,
            actual: engagementRate,
            delta: delta,
          },
        }
      );

      totalDelta += delta;
      result.calibrated++;

      // Track per-platform deltas
      const platform = item.target_platform || 'unknown';
      if (!platformDeltas[platform]) platformDeltas[platform] = { totalDelta: 0, count: 0 };
      platformDeltas[platform].totalDelta += delta;
      platformDeltas[platform].count++;
    }

    result.avgDelta = result.calibrated > 0 ? Math.round((totalDelta / result.calibrated) * 100) / 100 : 0;

    // 3. Bij 50+ items: bereken gewichten-aanpassing
    if (result.calibrated >= 50) {
      const weightAdjustments = {};

      for (const [platform, data] of Object.entries(platformDeltas)) {
        if (data.count < 10) continue; // Minimaal 10 items per platform
        const avgPlatformDelta = data.totalDelta / data.count;

        // Als predicted systematisch > actual: score-model is te optimistisch
        // Als predicted systematisch < actual: score-model is te pessimistisch
        if (Math.abs(avgPlatformDelta) > 5) {
          weightAdjustments[platform] = {
            direction: avgPlatformDelta > 0 ? 'overestimating' : 'underestimating',
            avg_delta: Math.round(avgPlatformDelta * 100) / 100,
            sample_size: data.count,
          };
        }
      }

      if (Object.keys(weightAdjustments).length > 0) {
        // Save to destinations.content_config
        const [[dest]] = await mysqlSequelize.query(
          `SELECT content_config FROM destinations WHERE id = :destId`,
          { replacements: { destId: destinationId } }
        );

        let config = {};
        if (dest?.content_config) {
          config = typeof dest.content_config === 'string' ? JSON.parse(dest.content_config) : dest.content_config;
        }

        config.score_calibration = {
          last_run: new Date().toISOString(),
          sample_size: result.calibrated,
          avg_delta: result.avgDelta,
          platform_adjustments: weightAdjustments,
        };

        await mysqlSequelize.query(
          `UPDATE destinations SET content_config = :config WHERE id = :destId`,
          { replacements: { config: JSON.stringify(config), destId: destinationId } }
        );

        result.weightsAdjusted = true;
      }
    }

    logger.info(`[ScoreCalibration] Destination ${destinationId}: ${result.calibrated} items calibrated, avgDelta=${result.avgDelta}, weightsAdjusted=${result.weightsAdjusted}`);
  } catch (error) {
    logger.error(`[ScoreCalibration] Error for destination ${destinationId}:`, error);
    throw error;
  }

  return result;
}

export default { calibrateScoring };
