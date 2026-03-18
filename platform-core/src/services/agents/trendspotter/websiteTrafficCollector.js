/**
 * Website Traffic Collector
 * Parses Apache access logs to find top-visited pages per destination.
 * Converts popular page paths into trending keywords (source = 'website_analytics').
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Per-destination log files (Apache vhost logs on Hetzner)
const DESTINATION_LOGS = {
  1: [ // Calpe — holidaibutler.com
    '/var/log/apache2/dev_nextjs_access.log',
    '/var/log/apache2/dev_nextjs_access.log.1',
    '/var/log/apache2/holidaibutler_access.log',
    '/var/log/apache2/holidaibutler_access.log.1',
  ],
  2: [ // Texel — texelmaps.nl
    '/var/log/apache2/dev.texelmaps.nl-access.log',
    '/var/log/apache2/dev.texelmaps.nl-access.log.1',
    '/var/log/apache2/texelmaps_access.log',
    '/var/log/apache2/texelmaps_access.log.1',
  ],
};

// Apache combined log format regex
const LOG_LINE_REGEX = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \S+ "[^"]*" "([^"]*)"/;

// Paths to exclude (assets, API calls, health checks, scanners)
const EXCLUDED_PATTERNS = [
  /^\/(api|_next|static|assets|favicon|robots|sitemap|sw\.js)/,
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map|webp|avif|php|xml|txt|json)$/i,
  /^\/$/,  // Root (too generic)
  /wp-|\.git|\.env|\.well-known|cgi-bin|phpmyadmin|xmlrpc/i,  // Scanner/attack paths
  /\?.*rsc=/,  // Next.js RSC prefetch params
  /manifest\.json/,
];

// User-agents to exclude (bots, health checks, crawlers)
const BOT_PATTERNS = [
  /axios/i, /curl/i, /python/i, /bot/i, /spider/i, /crawl/i,
  /Googlebot/i, /bingbot/i, /Slurp/i, /DuckDuckBot/i, /Baiduspider/i,
  /uptimerobot/i, /monitoring/i, /^-$/,
];

// Extract meaningful keyword from a URL path
function pathToKeyword(path) {
  if (/^\/poi\/\d+/.test(path)) return 'poi detail';
  if (/^\/event\//.test(path)) return 'event detail';

  const clean = path
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\d+/g, '')
    .trim();

  if (!clean || clean.length < 3) return null;
  return clean.substring(0, 100);
}

class WebsiteTrafficCollector {
  /**
   * Collect top pages from Apache access logs for a destination.
   * @param {number} destinationId
   * @returns {Array} Trend items
   */
  async collect(destinationId) {
    const logPaths = DESTINATION_LOGS[destinationId];
    if (!logPaths) {
      console.log(`[WebsiteTraffic] No log paths configured for destination ${destinationId}`);
      return [];
    }

    const pageCounts = {};
    let totalLines = 0;
    let validLines = 0;

    for (const logPath of logPaths) {
      if (!existsSync(logPath)) continue;

      try {
        const content = await readFile(logPath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (!line) continue;
          totalLines++;

          const match = line.match(LOG_LINE_REGEX);
          if (!match) continue;

          const [, , , method, reqPath, statusCode, userAgent] = match;

          // Only successful GET requests
          if (method !== 'GET' || Number(statusCode) >= 400) continue;

          // Skip bots and health checks
          if (BOT_PATTERNS.some(p => p.test(userAgent || ''))) continue;

          // Strip query params for path matching
          const cleanPath = reqPath.split('?')[0];

          // Skip excluded paths
          if (EXCLUDED_PATTERNS.some(p => p.test(reqPath))) continue;

          const keyword = pathToKeyword(cleanPath);
          if (!keyword) continue;

          validLines++;
          pageCounts[keyword] = (pageCounts[keyword] || 0) + 1;
        }
      } catch (err) {
        console.warn(`[WebsiteTraffic] Failed to read ${logPath}:`, err.message);
      }
    }

    if (totalLines === 0) {
      console.log(`[WebsiteTraffic] No access log data found for destination ${destinationId}`);
      return [];
    }

    // Sort by count, take top 15
    const sorted = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    if (sorted.length === 0) {
      console.log(`[WebsiteTraffic] ${totalLines} lines parsed, ${validLines} valid, but no page keywords extracted for destination ${destinationId}`);
      return [];
    }

    const maxCount = sorted[0][1];
    const trends = sorted.map(([keyword, count]) => ({
      keyword: `website: ${keyword}`,
      language: 'en',
      source: 'website_analytics',
      search_volume: count,
      trend_direction: count > maxCount * 0.7 ? 'rising' : count > maxCount * 0.3 ? 'stable' : 'declining',
    }));

    console.log(`[WebsiteTraffic] Parsed ${totalLines} lines (${validLines} valid), ${trends.length} top pages for destination ${destinationId}`);
    return trends;
  }
}

const websiteTrafficCollector = new WebsiteTrafficCollector();
export default websiteTrafficCollector;
