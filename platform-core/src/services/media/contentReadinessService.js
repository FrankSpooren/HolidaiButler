/**
 * Content Readiness Service — USP #4
 * "De enige Media Library die vertelt wat je volgende week nodig hebt."
 *
 * For each upcoming day: planned content, matching media, seasonal events, gap level.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || null;

/**
 * Get weather forecast for a destination (7-day).
 * Returns null if no API key configured.
 */
async function getWeatherForecast(destId) {
  if (!WEATHER_API_KEY) return null;
  try {
    // Get destination coordinates
    const [dest] = await mysqlSequelize.query(
      "SELECT JSON_EXTRACT(branding, '$.lat') as lat, JSON_EXTRACT(branding, '$.lng') as lng FROM destinations WHERE id = ?",
      { replacements: [destId], type: QueryTypes.SELECT }
    );
    if (!dest?.lat || !dest?.lng) return null;
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast/daily?lat=${dest.lat}&lon=${dest.lng}&cnt=7&units=metric&appid=${WEATHER_API_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.list?.map(d => ({
      date: new Date(d.dt * 1000).toISOString().slice(0, 10),
      temp: Math.round(d.temp?.day || 0),
      condition: d.weather?.[0]?.main?.toLowerCase() || 'unknown',
      icon: d.weather?.[0]?.icon || ''
    })) || null;
  } catch { return null; }
}

/**
 * Generate readiness report for N days ahead.
 */
export async function getReadinessReport(destinationId, days = 7) {
  const report = [];
  const today = new Date();

  // Get planned content for the period
  const endDate = new Date(today.getTime() + days * 86400000);
  const planned = await mysqlSequelize.query(
    `SELECT DATE(scheduled_at) as sched_date, COUNT(*) as cnt
     FROM content_items
     WHERE destination_id = ? AND scheduled_at BETWEEN ? AND ?
       AND approval_status IN ('scheduled', 'approved')
     GROUP BY DATE(scheduled_at)`,
    { replacements: [destinationId, today.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)], type: QueryTypes.SELECT }
  );
  const plannedMap = {};
  for (const p of planned) { plannedMap[p.sched_date] = parseInt(p.cnt); }

  // Get seasonal events (schema uses start_month/start_day/end_month/end_day)
  const events = await mysqlSequelize.query(
    `SELECT season_name, start_month, start_day, end_month, end_day FROM seasonal_config
     WHERE destination_id = ? AND is_active = 1`,
    { replacements: [destinationId], type: QueryTypes.SELECT }
  );

  // Get weather forecast (optional)
  const forecast = await getWeatherForecast(destinationId);
  const forecastMap = {};
  if (forecast) {
    for (const f of forecast) { forecastMap[f.date] = f; }
  }

  // Count available media with context per season/weather combo
  const totalMedia = await mysqlSequelize.query(
    "SELECT COUNT(*) as cnt FROM media WHERE destination_id = ? AND ai_processed = 1 AND media_type = 'image'",
    { replacements: [destinationId], type: QueryTypes.SELECT }
  );
  const totalMediaCount = parseInt(totalMedia[0]?.cnt) || 0;

  for (let d = 0; d < days; d++) {
    const date = new Date(today.getTime() + (d + 1) * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay(); // 0=Sun
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWorkday = !isWeekend;

    const plannedCount = plannedMap[dateStr] || 0;
    const weatherData = forecastMap[dateStr] || null;

    // Find relevant events for this date (month/day-based seasons)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const relevantEvents = events.filter(e => {
      const afterStart = month > e.start_month || (month === e.start_month && day >= e.start_day);
      const beforeEnd = month < e.end_month || (month === e.end_month && day <= e.end_day);
      // Handle wrap-around (e.g. Nov-Feb)
      if (e.start_month <= e.end_month) return afterStart && beforeEnd;
      return afterStart || beforeEnd;
    }).map(e => e.season_name);

    // Estimate matching media (simplified: count with weather/season if available)
    let matchingMediaCount = totalMediaCount;
    if (weatherData?.condition) {
      const [weatherMatch] = await mysqlSequelize.query(
        "SELECT COUNT(*) as cnt FROM media WHERE destination_id = ? AND ai_processed = 1 AND media_type = 'image' AND JSON_CONTAINS(weather_conditions, ?)",
        { replacements: [destinationId, JSON.stringify([weatherData.condition])] }
      ).catch(() => [{ cnt: totalMediaCount }]);
      matchingMediaCount = parseInt(weatherMatch?.cnt) || totalMediaCount;
    }

    // Gap level: based on planned content for workdays
    let gapLevel = 'low';
    if (isWorkday && plannedCount === 0) gapLevel = 'high';
    else if (isWorkday && plannedCount === 1) gapLevel = 'medium';
    else if (!isWorkday) gapLevel = 'n/a';

    // Recommendations
    const recommendations = [];
    if (gapLevel === 'high') recommendations.push(`Geen content gepland voor ${dateStr} — plan minimaal 1 post`);
    if (relevantEvents.length > 0) recommendations.push(`Evenement: ${relevantEvents.join(', ')} — overweeg event-gerelateerde content`);
    if (weatherData?.condition === 'sunny' && matchingMediaCount < 5) recommendations.push('Weinig zonnige foto\'s beschikbaar — upload zonnigemedia');

    report.push({
      date: dateStr,
      day_of_week: ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'][dayOfWeek],
      is_workday: isWorkday,
      forecast: weatherData,
      planned_content_count: plannedCount,
      matching_media_count: matchingMediaCount,
      gap_level: gapLevel,
      events_upcoming: relevantEvents,
      recommendations
    });
  }

  return report;
}

/**
 * Store report in DB for historical tracking.
 */
export async function storeReport(destinationId, report) {
  for (const day of report) {
    await mysqlSequelize.query(
      `INSERT INTO content_readiness_reports (destination_id, report_date, report_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE report_data = VALUES(report_data), generated_at = NOW()`,
      { replacements: [destinationId, day.date, JSON.stringify(day)] }
    );
  }
}

export default { getReadinessReport, storeReport };
