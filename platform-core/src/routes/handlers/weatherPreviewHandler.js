/**
 * Weather Preview Handler v3 — OpenWeatherMap + multi-locale brand-tip i18n
 *
 * GET /api/v1/admin-portal/weather-preview?destinationId=X&withTip=true
 *
 * v3 changes (2026-05-24 — Frank UX feedback):
 *   - brand_tip wordt nu i18n-object (alle supported_languages parallel
 *     gegenereerd) i.p.v. single-locale string. Runtime block kan locale-
 *     specifiek renderen zonder per-locale roundtrip.
 *   - Tip-cache per-locale behouden voor performance (5min TTL).
 *   - Geen `locale` query-param meer noodzakelijk — gebruikt destination
 *     supported_languages + default_language autonoom.
 *
 * Response shape:
 *   brand_tip: { en: "...", nl: "...", de: "...", es: "...", fr: "..." } | null
 *   (alleen keys voor supported_languages van destination)
 *
 * @version BLOK F UX-feedback v3 (2026-05-24)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';

const TIP_CACHE = new Map();
const TIP_CACHE_TTL_MS = 5 * 60 * 1000;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const COST_PER_CALL_EUR = 0.00006;
const SUPPORTED_TIP_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];

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

async function fetchOpenWeatherCurrent(lat, lng, apiKey, lang) {
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&lang=${lang}&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`OpenWeather current HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timeout); }
}

async function fetchOpenWeatherForecast(lat, lng, apiKey, lang) {
  const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lng}&units=metric&lang=${lang}&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`OpenWeather forecast HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timeout); }
}

function aggregateDailyForecast(forecastList) {
  const byDay = {};
  (forecastList || []).forEach(item => {
    const date = item.dt_txt?.slice(0, 10);
    if (!date) return;
    if (!byDay[date]) byDay[date] = { date, temps: [], weather_codes: [], icons: [], descriptions: [] };
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

async function generateTipForLocale(destId, bcStruct, current, locale) {
  const tempBucket = Math.round((current.main?.temp || 0) / 5) * 5;
  const weatherMain = current.weather?.[0]?.main || 'Clear';
  const cacheKey = `${destId}:${tempBucket}:${weatherMain}:${locale}`;
  const cached = TIP_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.at) < TIP_CACHE_TTL_MS) return cached.tip;

  try {
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
    logger.warn(`[weather-preview] tip generation failed for ${locale}:`, err.message);
    return null;
  }
}

async function generateMultiLocaleTips(destId, current, supportedLanguages) {
  const localesForTip = supportedLanguages.filter(l => SUPPORTED_TIP_LOCALES.includes(l));
  if (localesForTip.length === 0) return null;

  const bcStruct = await buildBrandContextStructured(destId, { includeReferenceInString: true, maxKbChunks: 4 });
  const tipPromises = localesForTip.map(locale => generateTipForLocale(destId, bcStruct, current, locale).then(tip => ({ locale, tip })));
  const results = await Promise.all(tipPromises);

  const i18nTip = {};
  let anyNonEmpty = false;
  for (const { locale, tip } of results) {
    if (tip) { i18nTip[locale] = tip; anyNonEmpty = true; }
  }
  return anyNonEmpty ? i18nTip : null;
}

export async function handleWeatherPreview(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const previewLocale = String(req.query.locale || 'en').toLowerCase().slice(0, 2);
  const withTip = req.query.withTip === 'true' || req.query.withTip === '1';

  if (!destId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'OPENWEATHER_API_KEY not configured' } });

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, latitude, longitude, branding, default_language, supported_languages
       FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }
    const lat = dest.latitude || branding.lat || null;
    const lng = dest.longitude || branding.lng || null;
    if (!lat || !lng) return res.status(422).json({ success: false, error: { code: 'MISSING_COORDINATES', message: 'No latitude/longitude available for destination.' } });

    let supportedLanguages = [];
    try { supportedLanguages = typeof dest.supported_languages === 'string' ? JSON.parse(dest.supported_languages) : (dest.supported_languages || []); } catch { /* empty */ }
    if (supportedLanguages.length === 0) supportedLanguages = [dest.default_language || 'en'];

    // Weather data in preview-locale (admin) of default_language (runtime fallback)
    const owmLang = SUPPORTED_TIP_LOCALES.includes(previewLocale) ? previewLocale : (dest.default_language || 'en');

    const [current, forecast] = await Promise.all([
      fetchOpenWeatherCurrent(Number(lat), Number(lng), apiKey, owmLang),
      fetchOpenWeatherForecast(Number(lat), Number(lng), apiKey, owmLang).catch(err => { logger.warn('[weather-preview] forecast failed:', err.message); return null; }),
    ]);

    let brandTip = null;
    if (withTip) brandTip = await generateMultiLocaleTips(destId, current, supportedLanguages);

    const callCount = 1 + (forecast ? 1 : 0);
    logCost(destId, COST_PER_CALL_EUR * callCount).catch(() => {});

    res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=60');

    return res.json({
      success: true,
      data: {
        destination_id: destId,
        destination_name: dest.display_name || dest.name,
        coordinates: { lat: Number(lat), lng: Number(lng) },
        supported_languages: supportedLanguages,
        default_language: dest.default_language || 'en',
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
          wind_speed: Math.round((current.wind?.speed ?? 0) * 3.6),
          wind_deg: current.wind?.deg ?? null,
          clouds: current.clouds?.all ?? null,
          sunrise: current.sys?.sunrise ?? null,
          sunset: current.sys?.sunset ?? null,
        },
        forecast_5d: forecast ? aggregateDailyForecast(forecast.list) : [],
        brand_tip: brandTip,
        brand_tip_locales: brandTip ? Object.keys(brandTip) : [],
        source: 'openweathermap.org',
      }
    });
  } catch (error) {
    logger.error('[weather-preview] error:', error);
    return res.status(500).json({ success: false, error: { code: 'WEATHER_PREVIEW_ERROR', message: error.message } });
  }
}
