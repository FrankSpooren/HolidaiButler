/**
 * Best Time to Post Calculator
 * Analyzes content_performance data to recommend optimal posting times.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

const PLATFORM_DEFAULTS = {
  instagram: [
    { day: 2, hour: 11, label: 'Tuesday 11:00' },
    { day: 4, hour: 14, label: 'Thursday 14:00' },
    { day: 6, hour: 10, label: 'Saturday 10:00' },
  ],
  facebook: [
    { day: 3, hour: 13, label: 'Wednesday 13:00' },
    { day: 5, hour: 9, label: 'Friday 09:00' },
    { day: 1, hour: 10, label: 'Monday 10:00' },
  ],
  linkedin: [
    { day: 2, hour: 8, label: 'Tuesday 08:00' },
    { day: 3, hour: 10, label: 'Wednesday 10:00' },
    { day: 4, hour: 9, label: 'Thursday 09:00' },
  ],
  x: [
    { day: 1, hour: 12, label: 'Monday 12:00' },
    { day: 3, hour: 15, label: 'Wednesday 15:00' },
    { day: 5, hour: 11, label: 'Friday 11:00' },
  ],
  tiktok: [
    { day: 2, hour: 19, label: 'Tuesday 19:00' },
    { day: 4, hour: 12, label: 'Thursday 12:00' },
    { day: 6, hour: 15, label: 'Saturday 15:00' },
  ],
  youtube: [
    { day: 5, hour: 17, label: 'Friday 17:00' },
    { day: 6, hour: 10, label: 'Saturday 10:00' },
    { day: 7, hour: 11, label: 'Sunday 11:00' },
  ],
  pinterest: [
    { day: 6, hour: 20, label: 'Saturday 20:00' },
    { day: 7, hour: 14, label: 'Sunday 14:00' },
    { day: 5, hour: 15, label: 'Friday 15:00' },
  ],
};

const MARKET_ADJUSTMENTS = {
  DE: { offsetHours: 0, peakShift: 1 },
  ES: { offsetHours: 0, peakShift: 1 },
  NL: { offsetHours: 0, peakShift: 0 },
  FR: { offsetHours: 0, peakShift: 0 },
};

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Calculate best posting times based on historical performance data
 * @param {Object} options - { destinationId, platform, market }
 * @returns {{ slots: Array<{day, hour, label, avgEngagement, source}>, platform }}
 */
export async function getBestTimes(options = {}) {
  const { destinationId = 1, platform = 'instagram', market } = options;

  try {
    const [rows] = await mysqlSequelize.query(
      `SELECT DAYOFWEEK(date) as day_of_week, HOUR(date) as hour_of_day,
              AVG(engagement) as avg_engagement, AVG(reach) as avg_reach,
              COUNT(*) as sample_count
       FROM content_performance
       WHERE destination_id = :destId AND platform = :platform
         AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
       GROUP BY DAYOFWEEK(date), HOUR(date)
       HAVING sample_count >= 2
       ORDER BY avg_engagement DESC
       LIMIT 10`,
      { replacements: { destId: destinationId, platform } }
    );

    if (rows.length >= 3) {
      const slots = rows.slice(0, 3).map(r => ({
        day: r.day_of_week,
        hour: r.hour_of_day,
        label: `${DAY_NAMES[r.day_of_week] || 'Unknown'} ${String(r.hour_of_day).padStart(2, '0')}:00`,
        avgEngagement: Math.round(Number(r.avg_engagement)),
        avgReach: Math.round(Number(r.avg_reach)),
        sampleCount: r.sample_count,
        source: 'data',
      }));

      return { slots, platform, source: 'historical_data', dataPoints: rows.length };
    }
  } catch (e) {
    logger.debug('[BestTimeCalculator] Data query failed, using defaults:', e.message);
  }

  // Fallback to platform defaults with optional market adjustment
  let defaults = PLATFORM_DEFAULTS[platform] || PLATFORM_DEFAULTS.instagram;

  if (market && MARKET_ADJUSTMENTS[market]) {
    const adj = MARKET_ADJUSTMENTS[market];
    defaults = defaults.map(slot => {
      const newHour = Math.min(23, Math.max(0, slot.hour + adj.peakShift));
      return {
        ...slot,
        hour: newHour,
        label: `${DAY_NAMES[slot.day] || 'Unknown'} ${String(newHour).padStart(2, '0')}:00`,
      };
    });
  }

  return {
    slots: defaults.map(s => ({ ...s, avgEngagement: null, source: 'default' })),
    platform,
    source: 'platform_defaults',
    dataPoints: 0,
  };
}

export default { getBestTimes };
