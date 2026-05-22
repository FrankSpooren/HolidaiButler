/**
 * Weather Preview Handler v2 — OpenWeatherMap (gecorrigeerd 22-05-2026)
 *
 * GET /api/v1/admin-portal/weather-preview?destinationId=X&locale=Y&withTip=true
 *
 * v2 correctie (na Frank's terechte feedback):
 *   - Bron: OpenWeatherMap (api.openweathermap.org/data/2.5) via bestaande
 *     OPENWEATHER_API_KEY in platform-core/.env. Consistent met huidige
 *     integraties in agents/personaliseerder, holibot/contextService,
 *     media/contentReadinessService, hb-websites/api/weather/route.ts +
 *     mobile/ProgramCard.tsx.
 *   - v1 (Open-Meteo) was incorrecte afwijking — slechts 1 file
 *     (hb-websites/src/lib/weather.ts) gebruikte Open-Meteo als uitzondering.
 *
 * Rijkere datapoints t.o.v. v1:
 *   - humidity, pressure, visibility, feels_like, sunrise/sunset
 *   - Officieel OpenWeather description + icon code (consistent met andere modules)
 *   - 5-daagse forecast via /forecast endpoint (3-uur granular, geaggregeerd
 *     naar daily min/max)
 *
 * Cost-tracking: CostLog (MongoDB) per call — non-blocking, service='openweather'.
 * OpenWeather free tier: 1000 calls/dag. 30-min cache via Cache-Control header
 * + in-memory tip-cache.
 *
 * GDPR: OpenWeather Ltd. HQ London UK. EU data-center beschikbaar. UK adequacy
 * decision onder GDPR actief — geen DPA-blocker.
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';

const TIP_CACHE = new Map();
const TIP_CACHE_TTL_MS = 5 * 60 * 1000;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const COST_PER_CALL_EUR = 0.00006; // Free tier — nominaal voor cost-tracking pattern

async function logCost(destId, cost) {
  try {
    const mod = await import('../../services/orchestrator/costController/models/CostLog.js').catch(() => null);
    if (!mod?.default) return;
    const CostLog = mod.default;
    await CostLog.create({
      service: 'openweather',
      operation: 'weather-current+forecast',
      cost_eur: cost,
      destination_id: destId,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn('[weather-preview] cost-log failed (non-blocking):', err.message);
  }
}

async function fetchOpenWeatherCurrent(lat, lng, apiKey, locale) {
  const langMap = { nl: 'nl', en: 'en', de: 'de', es: 'es', fr: 'fr' };
  const lang = langMap[locale] || 'en';
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&lang=${lang}&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`OpenWeather current HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenWeatherForecast(lat, lng, apiKey, locale) {
  const langMap = { nl: 'nl', en: 'en', de: 'de', es: 'es', fr: 'fr' };
  const lang = langMap[locale] || 'en';
  const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lng}&units=metric&lang=${lang}&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`OpenWeather forecast HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

function aggregateDailyForecast(forecastList) {
  const byDay = {};
  (forecastList || []).forEach(item => {
    const date = item.dt_txt?.slice(0, 10);
    if (!date) return;
    if (!byDay[date]) {
      byDay[date] = { date, temps: [], weather_codes: [], icons: [], descriptions: [] };
    }
    byDay[date].temps.push(item.main?.temp);
    byDay[date].weather_codes.push(item.weather?.[0]?.id);
    byDay[date].icons.push(item.weather?.[0]?.icon);
    byDay[date].descriptions.push(item.weather?.[0]?.description);
  });
  return Object.values(byDay).slice(0, 5).map(d => ({
    date: d.date,
    temp_min: Math.round(Math.min(...d.temps.filter(Number.isFinite))),
    temp_max: Math.round(Math.max(...d.temps.filter(Number.isFinite))),
    weather_code: d.weather_codes[Math.floor(d.weather_codes.length / 2)],
    icon: d.icons[Math.floor(d.icons.length / 2)],
    description: d.descriptions[Math.floor(d.descriptions.length / 2)],
  }));
}

async function generateBrandTip(destId, current, locale) {
  const tempBucket = Math.round((current.main?.temp || 0) / 5) * 5;
  const weatherMain = current.weather?.[0]?.main || 'Clear';
  const cacheKey = `${destId}:${tempBucket}:${weatherMain}:${locale}`;
  const cached = TIP_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.at) < TIP_CACHE_TTL_MS) return cached.tip;

  try {
    const bcStruct = await buildBrandContextStructured(destId, {
      includeReferenceInString: true,
      maxKbChunks: 4,
    });

    const localeNames = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
    const targetLangName = localeNames[locale] || 'English';

    const systemPrompt = `You are a hyperlocal tourism advisor for HolidaiButler.
Generate ONE concise sentence (max 25 words) in ${targetLangName} advising travellers
on what to do given the current weather. Ground in REFERENCE MATERIAL: use
destination-specific local features (landmarks, dishes, neighbourhoods). Avoid
generic phrases. Output plain text only, no markdown.`;

    const userPrompt = [
      `WEATHER: ${Math.round(current.main?.temp ?? 0)}°C, ${weatherMain.toLowerCase()}, humidity ${current.main?.humidity || '?'}%, wind ${Math.round(current.wind?.speed || 0)} m/s`,
      `LOCALE: ${locale}`,
      '',
      'BRAND CONTEXT:',
      bcStruct.contextString || '(no internal sources)',
      '',
      'Generate the one-sentence advice now.'
    ].join('\n');

    const raw = await embeddingService.generateChatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.6, maxTokens: 120 }
    );

    const tip = typeof raw === 'string' ? raw.trim().replace(/^["']|["']$/g, '') : null;
    if (tip) TIP_CACHE.set(cacheKey, { tip, at: Date.now() });
    return tip;
  } catch (err) {
    logger.warn('[weather-preview] tip generation failed:', err.message);
    return null;
  }
}

export async function handleWeatherPreview(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const locale = String(req.query.locale || 'en').toLowerCase().slice(0, 2);
  const withTip = req.query.withTip === 'true' || req.query.withTip === '1';

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'OPENWEATHER_API_KEY not configured' } });
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, latitude, longitude, branding, default_language
       FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }
    const lat = dest.latitude || branding.lat || null;
    const lng = dest.longitude || branding.lng || null;
    if (!lat || !lng) {
      return res.status(422).json({
        success: false,
        error: { code: 'MISSING_COORDINATES', message: 'No latitude/longitude available for destination. Set destinations.latitude/longitude or branding.lat/lng.' }
      });
    }

    const [current, forecast] = await Promise.all([
      fetchOpenWeatherCurrent(Number(lat), Number(lng), apiKey, locale),
      fetchOpenWeatherForecast(Number(lat), Number(lng), apiKey, locale).catch(err => { logger.warn('[weather-preview] forecast failed (non-blocking):', err.message); return null; }),
    ]);

    let brandTip = null;
    if (withTip) brandTip = await generateBrandTip(destId, current, locale);

    logCost(destId, COST_PER_CALL_EUR * (forecast ? 2 : 1)).catch(() => {});

    res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=60');

    return res.json({
      success: true,
      data: {
        destination_id: destId,
        destination_name: dest.display_name || dest.name,
        coordinates: { lat: Number(lat), lng: Number(lng) },
        current: {
          temperature: Math.round(current.main?.temp ?? 0),
          feels_like: Math.round(current.main?.feels_like ?? 0),
          humidity: current.main?.humidity ?? null,
          pressure: current.main?.pressure ?? null,
          visibility: current.visibility ?? null,
          weather_code: current.weather?.[0]?.id ?? 0,
          weather_main: current.weather?.[0]?.main ?? null,
          description: current.weather?.[0]?.description ?? null,
          icon: current.weather?.[0]?.icon ?? null,
          wind_speed: Math.round((current.wind?.speed ?? 0) * 3.6), // m/s -> km/u
          wind_deg: current.wind?.deg ?? null,
          clouds: current.clouds?.all ?? null,
          sunrise: current.sys?.sunrise ?? null,
          sunset: current.sys?.sunset ?? null,
        },
        forecast_5d: forecast ? aggregateDailyForecast(forecast.list) : [],
        brand_tip: brandTip,
        locale,
        source: 'openweathermap.org',
        api_consistency: 'matches platform-core agents/personaliseerder + holibot/contextService + media/contentReadinessService',
      }
    });
  } catch (error) {
    logger.error('[weather-preview] error:', error);
    return res.status(500).json({ success: false, error: { code: 'WEATHER_PREVIEW_ERROR', message: error.message } });
  }
}
