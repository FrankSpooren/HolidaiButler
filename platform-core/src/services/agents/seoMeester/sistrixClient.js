/**
 * SISTRIX API Client — SEO visibility index, keyword rankings, competitor data
 * Credit-based API — calls are minimized via weekly BullMQ scheduling.
 *
 * API Key: D2bX5yPqbAIG9q3z8dwdbLvH9ZeQgWFq (Bonn, DE — EU-compliant)
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';

const SISTRIX_API_BASE = 'https://api.sistrix.com';
const SISTRIX_API_KEY = process.env.SISTRIX_API_KEY || 'D2bX5yPqbAIG9q3z8dwdbLvH9ZeQgWFq';

const DOMAIN_MAP = {
  1: 'holidaibutler.com',     // Calpe
  2: 'texelmaps.nl',          // Texel
  4: 'warrewijzer.be',        // WarreWijzer
};

/**
 * Make a SISTRIX API call
 */
async function sistrixRequest(endpoint, params = {}) {
  const url = new URL(`${SISTRIX_API_BASE}/${endpoint}`);
  url.searchParams.set('api_key', SISTRIX_API_KEY);
  url.searchParams.set('format', 'json');

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      url.searchParams.set(key, String(val));
    }
  }

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000),
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SISTRIX API ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`[SISTRIX] API call failed: ${endpoint}`, error.message);
    throw error;
  }
}

/**
 * Get Visibility Index for a destination's domain
 */
export async function getVisibilityIndex(destinationId) {
  const domain = DOMAIN_MAP[destinationId];
  if (!domain) return null;

  const data = await sistrixRequest('domain.sichtbarkeitsindex', { domain });
  const points = data?.answer?.[0]?.sichtbarkeitsindex || [];
  return {
    domain,
    current: points.length > 0 ? points[points.length - 1]?.value : null,
    history: points.slice(-12).map(p => ({
      date: p.date,
      value: Number(p.value),
    })),
  };
}

/**
 * Get top keyword rankings for a domain
 */
export async function getKeywordRankings(destinationId, limit = 50) {
  const domain = DOMAIN_MAP[destinationId];
  if (!domain) return [];

  const data = await sistrixRequest('domain.kwcount.seo', { domain, num: limit });
  const keywords = data?.answer?.[0]?.kwcount?.seo || [];
  return keywords.map(kw => ({
    keyword: kw.keyword,
    position: Number(kw.position),
    url: kw.url,
    searchVolume: Number(kw.traffic) || 0,
    competition: kw.competition || 'unknown',
  }));
}

/**
 * Get competitor domains
 */
export async function getCompetitors(destinationId, limit = 10) {
  const domain = DOMAIN_MAP[destinationId];
  if (!domain) return [];

  const data = await sistrixRequest('domain.competitors.seo', { domain, num: limit });
  const competitors = data?.answer?.[0]?.result || [];
  return competitors.map(c => ({
    domain: c.domain,
    commonKeywords: Number(c.match) || 0,
    visibilityIndex: Number(c.sichtbarkeitsindex) || 0,
  }));
}

/**
 * Run full SISTRIX audit for a destination (weekly cron)
 */
export async function runSistrixAudit(destinationId) {
  try {
    const [visibility, rankings, competitors] = await Promise.all([
      getVisibilityIndex(destinationId).catch(e => ({ error: e.message })),
      getKeywordRankings(destinationId, 20).catch(e => []),
      getCompetitors(destinationId, 5).catch(e => []),
    ]);

    return {
      destinationId,
      domain: DOMAIN_MAP[destinationId] || 'unknown',
      visibility,
      topRankings: rankings,
      competitors,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[SISTRIX] Full audit failed:', error);
    return { destinationId, error: error.message };
  }
}

export default { getVisibilityIndex, getKeywordRankings, getCompetitors, runSistrixAudit };
