/**
 * Weather Preview Handler
 *
 * GET /api/v1/admin-portal/weather-preview?destinationId=X&locale=Y&withTip=true
 *
 * Combineert Open-Meteo huidige weersdata (gratis, EU-hosted, GDPR-compliant)
 * met optionele Mistral-gegenereerde brand-context seizoens-tip
 * (USP-onderscheidend t.o.v. generieke weather-widgets).
 *
 * Inputs:
 *   - destinationId (required): leest lat/lng uit destinations.latitude/longitude
 *     of branding.lat/lng fallback
 *   - locale: 'nl' | 'en' | 'de' | 'es' | 'fr' (default 'en')
 *   - withTip: boolean (default false) — als true genereert Mistral seizoenstip
 *
 * Cache: 30min via Express ETag + Cache-Control header. Mistral-tip apart
 * gecached via in-memory map (5min) zodat tip niet bij elke call wordt
 * geregenereerd voor zelfde destinatie+temperatuur-range.
 *
 * @version BLOK E2 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';

const TIP_CACHE = new Map();
const TIP_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchOpenMeteo(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function generateBrandTip(destId, tempCelsius, weatherCode, locale) {
  const tempBucket = Math.round(tempCelsius / 5) * 5;
  const cacheKey = `${destId}:${tempBucket}:${weatherCode}:${locale}`;
  const cached = TIP_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.at) < TIP_CACHE_TTL_MS) {
    return cached.tip;
  }

  try {
    const bcStruct = await buildBrandContextStructured(destId, {
      includeReferenceInString: true,
      maxKbChunks: 4,
    });

    const conditionText = weatherCode === 0 || weatherCode === 1 ? 'sunny clear'
      : weatherCode <= 3 ? 'cloudy'
      : weatherCode >= 51 && weatherCode <= 67 ? 'rainy'
      : weatherCode >= 71 && weatherCode <= 77 ? 'snowy'
      : weatherCode >= 95 ? 'thunderstorm'
      : 'variable';

    const localeNames = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
    const targetLangName = localeNames[locale] || 'English';

    const systemPrompt = `You are a hyperlocal tourism advisor for HolidaiButler.
Generate ONE concise sentence (max 25 words) in ${targetLangName} advising travellers
on what to do given the current weather. Ground in REFERENCE MATERIAL: use
destination-specific local features (landmarks, dishes, neighbourhoods). Avoid
generic phrases. Output plain text only, no markdown.`;

    const userPrompt = [
      `WEATHER: ${tempCelsius}°C, ${conditionText}`,
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
    if (tip) {
      TIP_CACHE.set(cacheKey, { tip, at: Date.now() });
    }
    return tip;
  } catch (err) {
    logger.warn('[weather-preview] tip generation failed (non-blocking):', err.message);
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

    const weather = await fetchOpenMeteo(Number(lat), Number(lng));
    const temp = Math.round(weather.current?.temperature_2m ?? 0);
    const weatherCode = weather.current?.weather_code ?? 0;
    const windSpeed = Math.round(weather.current?.wind_speed_10m ?? 0);

    let brandTip = null;
    if (withTip) {
      brandTip = await generateBrandTip(destId, temp, weatherCode, locale);
    }

    res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=60');

    return res.json({
      success: true,
      data: {
        destination_id: destId,
        destination_name: dest.display_name || dest.name,
        coordinates: { lat: Number(lat), lng: Number(lng) },
        current: { temperature: temp, weather_code: weatherCode, wind_speed: windSpeed },
        forecast_5d: (weather.daily?.time || []).map((date, i) => ({
          date,
          temp_max: Math.round(weather.daily.temperature_2m_max[i] ?? 0),
          temp_min: Math.round(weather.daily.temperature_2m_min[i] ?? 0),
          weather_code: weather.daily.weather_code[i] ?? 0,
        })),
        brand_tip: brandTip,
        locale,
        source: 'open-meteo.com',
      }
    });
  } catch (error) {
    logger.error('[weather-preview] error:', error);
    return res.status(500).json({ success: false, error: { code: 'WEATHER_PREVIEW_ERROR', message: error.message } });
  }
}
