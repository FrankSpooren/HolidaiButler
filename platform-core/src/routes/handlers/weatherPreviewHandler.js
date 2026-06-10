/**
 * Weather Preview Handler v4 — Enterprise Validated RAG (anti-hallucination)
 *
 * GET /api/v1/admin-portal/weather-preview?destinationId=X&withTip=true
 * GET /api/v1/weather/public?destinationId=X&locale=Y&withTip=true
 *
 * v4 changes (2026-06-10 — Frank enterprise-quality feedback):
 *   - Validated RAG integratie (Optie D Layer 3 NER grounding via outputValidator)
 *   - Auto-retry loop max 2 met hallucinationRate guard (consistent met v4.91.0)
 *   - Strikte systemPrompt met entity-whitelist + per-locale taalzuiverheid + few-shot
 *   - Temperature 0.6 -> 0.3, maxTokens 120 -> 80 (feitelijke output, geen creatie)
 *   - Pre-flight guard: skip Mistral als geen ALLOWED_ENTITIES (geen hallucinatie aan bron)
 *   - Hard escape clause __NO_GROUNDING__ -> return null (geen hallucinated tip)
 *   - ai_generation_log audit entry per locale (operation='generate', sub in JSON)
 *   - Provenance SHA-256 signature (EU AI Act Article 50)
 *   - Cache-key uitgebreid met entities-hash (KB-mutatie invalidates cache)
 *   - CostLog fix: service='openweather' (toegevoegd aan enum) + field 'cost' i.p.v. 'cost_eur'
 *
 * Response shape:
 *   brand_tip: { en, nl, de, es, fr } | null (alleen keys voor supported_languages)
 *   brand_tip_provenance: { [locale]: { signature, model, sources, hallucinationRate, retries } } | null
 *   brand_tip_validation: { [locale]: { passed, ungroundedEntities, reasons } } | null
 *
 * @version v4 (2026-06-10)
 */

import crypto from 'crypto';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';
import { validateContent } from '../../services/outputValidator.js';

const TIP_CACHE = new Map();
const TIP_CACHE_TTL_MS = 5 * 60 * 1000;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const COST_PER_CALL_EUR = 0.00006;
const SUPPORTED_TIP_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];
const TIP_MODEL = 'mistral-medium-latest';
const TIP_TEMPERATURE = 0.3;
const TIP_MAX_TOKENS = 80;
const HALLUCINATION_THRESHOLD = 0.05;  // Frank 2026-06-10: oudere doelgroep — strenger dan default 0.10
const OTHER_DESTINATIONS_CACHE = { rows: null, at: 0 };
const OTHER_DESTINATIONS_TTL_MS = 5 * 60 * 1000;
const MAX_RETRY_ITERATIONS = 2;
const NO_GROUNDING_SENTINEL = '__NO_USABLE_ENTITY_MATCH__';
const NO_GROUNDING_DETECT_REGEX = /^[_*\s]*no[_\s*-]*(usable|grounding|ground|usable[_\s-]?entity|entity[_\s-]?match|match)[_\s*-]*(entity|match)?[_*\s]*$/i;

// -----------------------------------------------------------------------------
// Weather-activity classification — feeds bucket + guidance to Mistral prompt
// OWM weather codes: https://openweathermap.org/weather-conditions
// -----------------------------------------------------------------------------
function classifyWeatherActivity(current) {
  const code = current.weather?.[0]?.id || 800;
  const temp = current.main?.temp ?? 20;
  const windKmh = (current.wind?.speed ?? 0) * 3.6;

  if (code >= 200 && code < 300) return { bucket: 'thunderstorm', guidance: 'INDOOR REFUGE ONLY. Suggest a covered/indoor activity (museum, café, indoor market, restaurant, theatre). Never recommend any outdoor activity, walk, hike, beach or open-air location.' };
  if (code >= 500 && code < 600) return { bucket: 'rainy', guidance: 'PREFER INDOOR or covered activities (museum, restaurant, café, indoor market, shopping street with shelter). Avoid open outdoor walks/hikes/beach.' };
  if (code >= 300 && code < 500) return { bucket: 'drizzle', guidance: 'Light rain — covered terrace or short indoor visit preferred; brief outdoor moments acceptable but not extended hikes.' };
  if (code >= 600 && code < 700) return { bucket: 'snowy', guidance: 'COLD WINTER conditions — winter-sport activity if the entity supports it, otherwise indoor warm refuge (café, restaurant, museum).' };
  if (code >= 700 && code < 800) return { bucket: 'foggy', guidance: 'LOW-VISIBILITY — indoor activity preferred; short-distance outdoor only at familiar landmarks. No long hikes/drives.' };
  if (temp >= 30) return { bucket: 'hot', guidance: 'EXTREME HEAT — shade, indoor air-conditioned spaces, or water-based activity (beach swim, pool). Avoid strenuous outdoor activity.' };
  if (temp <= 5 && windKmh >= 30) return { bucket: 'cold_windy', guidance: 'COLD + WINDY — indoor refuge or wind-sheltered outdoor activity (forest walk, sheltered village). No exposed coast/clifftop.' };
  if (code === 800 || (code >= 801 && code <= 802)) return { bucket: 'pleasant', guidance: 'PLEASANT outdoor weather — outdoor activities, nature walks, sightseeing, beach, terrace dining all suitable.' };
  if (code === 803 || code === 804) return { bucket: 'overcast', guidance: 'OVERCAST but workable — moderate outdoor activities OK (walk, museum exterior, sightseeing); slight preference for resilient choice with indoor backup nearby.' };
  return { bucket: 'mild', guidance: 'MILD conditions — most outdoor and indoor activities suitable; match entity to user interest.' };
}

// -----------------------------------------------------------------------------
// CostLog — fix: service='openweather' (enum extended) + field 'cost' (not 'cost_eur')
// -----------------------------------------------------------------------------
async function logCost(destId, cost) {
  try {
    const mod = await import('../../services/orchestrator/costController/models/CostLog.js').catch(() => null);
    if (!mod?.default) return;
    const CostLog = mod.default;
    await CostLog.create({
      service: 'openweather',
      operation: 'weather-current+forecast',
      cost: Number(cost),
      currency: 'EUR',
      metadata: { destination_id: destId },
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn('[weather-preview] cost-log failed (non-blocking):', err.message);
  }
}

// -----------------------------------------------------------------------------
// OpenWeatherMap API calls (unchanged from v3)
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Entities extraction from brandContext sources — wordt geinjecteerd in prompt
// als ALLOWED_ENTITIES whitelist + gebruikt door outputValidator.
//
// Source shapes ondersteund:
//   - POI/KB: { title, name, display_name, ... }
//   - brand_sources (PDF/web): { source_name, content_text, source_url }
//   - Generic chunk: { headline, entity_name }
// Plus: proper-noun extraction uit content_text via regex (multi-word patterns)
// -----------------------------------------------------------------------------
const PROPER_NOUN_REGEX = /\b[A-ZÀ-Ý][a-zà-ÿ\-']+(?:[ ]+(?:[a-zà-ÿ]{1,4}[ ]+)?[A-ZÀ-Ý][a-zà-ÿ\-']+){0,5}\b/g;
const STOPWORDS_PROPER = new Set(['The', 'This', 'That', 'These', 'Those', 'These', 'Een', 'Het', 'Een', 'Der', 'Die', 'Das', 'Le', 'La', 'Les', 'El', 'Los', 'Las']);

function extractProperNounsFromText(text, maxPerSource = 40) {
  if (!text || typeof text !== 'string') return [];
  // Normalize whitespace (collapse \n + multiple spaces) so PDF line-breaks
  // mid-entity-name don't truncate matches (e.g. "Nationaal Park Duinen\nvan Texel")
  const normalized = text.slice(0, 12000).replace(/\s+/g, ' ');
  const matches = normalized.match(PROPER_NOUN_REGEX) || [];
  const set = new Set();
  for (const m of matches) {
    const trimmed = m.trim();
    if (trimmed.length < 4 || trimmed.length > 80) continue;
    // Skip pure stopword starts
    const firstWord = trimmed.split(/\s+/)[0];
    if (STOPWORDS_PROPER.has(firstWord)) continue;
    set.add(trimmed);
    if (set.size >= maxPerSource) break;
  }
  return Array.from(set);
}

// -----------------------------------------------------------------------------
// Tenant-agnostic OTHER-destinations lookup — used by extractAllowedEntities
// to defensively strip entities mentioning ANY other tenant's destination name.
// Protects against future data-corruption (cross-tenant brand_knowledge mix-ups).
// -----------------------------------------------------------------------------
async function getOtherDestinationNames(currentDestId) {
  const now = Date.now();
  if (OTHER_DESTINATIONS_CACHE.rows && (now - OTHER_DESTINATIONS_CACHE.at) < OTHER_DESTINATIONS_TTL_MS) {
    return OTHER_DESTINATIONS_CACHE.rows.filter(r => r.id !== currentDestId);
  }
  try {
    const [rows] = await mysqlSequelize.query(
      `SELECT id, name, display_name FROM destinations`
    );
    OTHER_DESTINATIONS_CACHE.rows = rows;
    OTHER_DESTINATIONS_CACHE.at = now;
    return rows.filter(r => r.id !== currentDestId);
  } catch (err) {
    logger.warn('[weather-preview] getOtherDestinationNames failed:', err.message);
    return [];
  }
}

// Build a Set of tokens that, when found in an entity, indicate the entity
// belongs to a DIFFERENT tenant (multi-word destination names split into parts).
function buildExcludeTokenSet(otherDestinations) {
  const tokens = new Set();
  for (const d of otherDestinations) {
    for (const field of [d.name, d.display_name]) {
      if (!field || typeof field !== 'string') continue;
      // Add full name (e.g., "Calpe Costa Blanca")
      tokens.add(field.trim().toLowerCase());
      // Add individual parts (e.g., "Calpe", "Costa", "Blanca") — but only those
      // of significant length to avoid filtering common words
      for (const part of field.split(/\s+/)) {
        const p = part.trim().toLowerCase();
        if (p.length >= 4) tokens.add(p);
      }
    }
  }
  return tokens;
}

function extractAllowedEntities(bcStruct, otherDestinations = []) {
  const sources = bcStruct?.sources || [];
  if (!Array.isArray(sources) || sources.length === 0) return [];

  const excludeTokens = buildExcludeTokenSet(otherDestinations);
  const set = new Set();

  // Layer 1: name-like fields direct
  for (const s of sources) {
    const candidates = [s.title, s.name, s.source_name, s.headline, s.display_name, s.displayName, s.entity_name];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length >= 3 && c.trim().length <= 80) {
        // Strip file extension if source_name
        const cleaned = c.replace(/\.(pdf|docx?|txt|md|html?)$/i, '').trim();
        if (cleaned.length >= 3) set.add(cleaned);
      }
    }
  }

  // Layer 2: proper-noun extraction from content_text (multi-word names)
  for (const s of sources) {
    if (typeof s.content_text === 'string' && s.content_text.length > 50) {
      const nouns = extractProperNounsFromText(s.content_text);
      for (const n of nouns) set.add(n);
    }
  }

  // Layer 3 (tenant-agnostic multi-tenant defense): strip entities that
  // explicitly mention ANY other tenant's destination-name. This is a
  // defense-in-depth measure against cross-tenant data-corruption in
  // brand_knowledge (e.g., a document mistakenly linked to the wrong tenant
  // still cannot leak its proper-nouns into another tenant's tips).
  const filtered = Array.from(set).filter(entity => {
    const tokens = entity.toLowerCase().split(/[\s\-_,;:.\/]+/).filter(Boolean);
    for (const tok of tokens) {
      if (excludeTokens.has(tok)) return false;
    }
    // Also check the full lowercased phrase against multi-word destination names
    const lower = entity.toLowerCase();
    for (const ex of excludeTokens) {
      if (ex.includes(' ') && lower.includes(ex)) return false;
    }
    return true;
  });

  // Cap total — Mistral context window + signal-to-noise balance
  return filtered.slice(0, 60);
}

function hashEntities(entities) {
  if (!entities || entities.length === 0) return 'none';
  const sorted = [...entities].sort().join('|');
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 12);
}

// -----------------------------------------------------------------------------
// Provenance signature (EU AI Act Article 50) — over model + sources + content
// -----------------------------------------------------------------------------
function generateProvenanceSignature(model, sourceIds, contentText) {
  const payload = JSON.stringify({
    model,
    source_ids: (sourceIds || []).slice().sort(),
    content_sha256: crypto.createHash('sha256').update(contentText || '').digest('hex'),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// -----------------------------------------------------------------------------
// Enterprise prompt builder — strict entity-whitelist + per-locale language purity
// -----------------------------------------------------------------------------
function buildSystemPrompt(targetLangName, destinationDisplayName) {
  return `You are a hyperlocal tourism advisor for HolidaiButler. Generate ONE concise sentence (max 25 words) in ${targetLangName} advising travellers what to do given the current weather and the destination ${destinationDisplayName}.

HARD RULES (non-negotiable):
1. ENTITY FIDELITY — Use ONLY entities present in the ALLOWED_ENTITIES list provided by the user. Never invent restaurants, dishes, neighbourhoods, parks, monuments, or business names. If you reference an entity, you must copy its name VERBATIM (exact spelling, exact word order, including official prefixes like "Nationaal Park").
2. LANGUAGE PURITY — Write in natural ${targetLangName}. Never mix languages or use loanwords from another language (e.g., do NOT write English adjectives like "windswept", "cosy", "stunning" in a Dutch/German/Spanish/French sentence; do NOT write Dutch nouns in an English sentence). If the CONTEXTUAL REFERENCE contains a "Preferred adjectives" or "tone of voice" list written in a DIFFERENT language than ${targetLangName}, IGNORE those adjectives — they apply only to content in that other language. If a proper-noun entity (place name, business name) exists only in one language, quote it untranslated but embed it inside grammatically correct ${targetLangName} structure.
3. PREFER GENERATING — When ALLOWED_ENTITIES contains landmarks, parks, neighbourhoods, restaurants, or local businesses that could plausibly fit the weather condition (e.g., a park for sunny weather, a museum or café for rainy weather), GENERATE the tip — do NOT default to refusal. Pick the entity from the list that best matches the weather and write the sentence.
4. HARD REFUSAL FALLBACK — ONLY output the EXACT literal string "${NO_GROUNDING_SENTINEL}" (with two leading and two trailing underscores, all uppercase, no other characters) when ALL of these are true: (a) ALLOWED_ENTITIES is empty OR contains only abstract/generic terms (no concrete places, businesses, or landmarks), AND (b) no listed entity can plausibly relate to outdoor activity, indoor refuge, food, or local life given the weather.
5. NO PROMOTIONAL FILLER — Avoid generic adjectives ("amazing", "stunning", "wonderful"), avoid generic placeholder words ("local specialty", "traditional dish") unless the specific item is in ALLOWED_ENTITIES.
6. WEATHER-FIT (CRITICAL) — The advice MUST be appropriate for the WEATHER_BUCKET classification provided. Follow the BUCKET_GUIDANCE strictly. NEVER suggest outdoor walks/hikes/beach for thunderstorm, rainy, snowy, foggy, hot, or cold_windy buckets. ALWAYS suggest indoor or weather-appropriate entities when bucket is INDOOR-required. If no allowed entity matches the bucket-appropriate activity type, prefer ${NO_GROUNDING_SENTINEL} over a weather-inappropriate suggestion.
7. GEOGRAPHIC RELEVANCE (MULTI-TENANT CRITICAL) — The chosen entity MUST be physically located in or immediately adjacent to ${destinationDisplayName}. REJECT any entity whose name explicitly references a DIFFERENT geographic location, island, city, region, or country (e.g., if the destination is one island, do NOT mention parks/landmarks/businesses from another island). The user is in ${destinationDisplayName} and expects local advice — mentioning entities from elsewhere is a severe trust violation. If ALLOWED_ENTITIES contains items that appear geographically irrelevant to ${destinationDisplayName}, ignore them. If NO geographically-relevant entity fits the weather condition, output ${NO_GROUNDING_SENTINEL}.
8. OUTPUT FORMAT — Plain text only, no markdown, no quotes, no leading/trailing whitespace. One complete sentence (20–25 words).

EXAMPLES (illustrative):
- Correct (NL, sunny + park in list): "Geniet van het zonnige weer met een wandeling door Nationaal Park Duinen van Texel." (uses verbatim entity from list)
- Wrong (NL): "Bezoek de prachtige duinen van Nationaal Park Texel." (entity name truncated — must match list verbatim)
- Wrong (mixed): "Verken de windswept duinen." ("windswept" is English in Dutch sentence — language-purity violation)
- Correct fallback ONLY when truly nothing fits: ${NO_GROUNDING_SENTINEL}`;
}

function buildUserPrompt(current, locale, allowedEntities, bcStruct, weatherClass, destinationDisplayName, otherDestinationNames) {
  const temp = Math.round(current.main?.temp ?? 0);
  const condition = current.weather?.[0]?.main || 'Clear';
  const humidity = current.main?.humidity ?? '?';
  const wind = Math.round((current.wind?.speed ?? 0) * 3.6);

  const otherNamesList = (otherDestinationNames || [])
    .map(d => d.display_name || d.name)
    .filter(Boolean);

  const lines = [
    `DESTINATION_NAME: ${destinationDisplayName}`,
    `WEATHER FACTS: ${temp}°C, ${condition.toLowerCase()}, humidity ${humidity}%, wind ${wind} km/h`,
    `WEATHER_BUCKET: ${weatherClass.bucket}`,
    `BUCKET_GUIDANCE: ${weatherClass.guidance}`,
    `LOCALE: ${locale}`,
    '',
    'GEOGRAPHIC_EXCLUSIONS — these are OTHER tenants on the HolidaiButler platform; the user is NOT visiting these, NEVER reference any landmark/business/area from these locations:',
    otherNamesList.length > 0
      ? otherNamesList.map(n => `  - ${n}`).join('\n')
      : '  (none)',
    '',
    `ALLOWED_ENTITIES (use ONLY these by exact verbatim name — no others, no truncation; all should be located in or near ${destinationDisplayName}):`,
    allowedEntities.length > 0
      ? allowedEntities.slice(0, 30).map(e => `  - "${e}"`).join('\n')
      : '  (empty — no entities available; you MUST output __NO_USABLE_ENTITY_MATCH__)',
    '',
    'CONTEXTUAL REFERENCE (background, do NOT extract new entities from this — only use ALLOWED_ENTITIES above):',
    (bcStruct?.contextString || '(none)').slice(0, 1500),
    '',
    `Pick the ALLOWED_ENTITY that (a) best matches BUCKET_GUIDANCE (${weatherClass.bucket}) AND (b) is geographically located in or near ${destinationDisplayName}. Generate the one-sentence advice now. Output ${NO_GROUNDING_SENTINEL} if no allowed entity matches BOTH the bucket-appropriate activity type AND the geographic location.`,
  ];
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Per-locale tip generation with auto-retry + validation
// Returns: { tip, validation, provenance, retries } or null when no grounding
// -----------------------------------------------------------------------------
async function generateValidatedTipForLocale(destId, bcStruct, current, locale, allowedEntities, destinationDisplayName, otherDestinations) {
  // Pre-flight: skip Mistral entirely when no entities available — voorkomt hallucinatie aan de bron
  if (allowedEntities.length === 0) {
    logger.info(`[weather-preview] tip skipped for ${locale}: no allowed entities`);
    return null;
  }

  const tempBucket = Math.round((current.main?.temp || 0) / 5) * 5;
  const weatherMain = current.weather?.[0]?.main || 'Clear';
  const weatherClass = classifyWeatherActivity(current);
  const entitiesHash = hashEntities(allowedEntities);
  const cacheKey = `${destId}:${tempBucket}:${weatherMain}:${weatherClass.bucket}:${locale}:${entitiesHash}`;
  const cached = TIP_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.at) < TIP_CACHE_TTL_MS) return cached.value;

  const localeNames = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
  const targetLangName = localeNames[locale] || 'English';
  const systemPrompt = buildSystemPrompt(targetLangName, destinationDisplayName);
  const sources = (bcStruct?.sources || []);
  const sourceIds = sources.map(s => s.id ?? s.source_id ?? null).filter(Boolean);

  let extraInstructions = '';
  let bestResult = null;
  let bestHallucinationRate = 1.0;

  for (let attempt = 0; attempt <= MAX_RETRY_ITERATIONS; attempt++) {
    try {
      const userPrompt = buildUserPrompt(current, locale, allowedEntities, bcStruct, weatherClass, destinationDisplayName, otherDestinations) + (extraInstructions ? `\n\nSTRICT RETRY INSTRUCTION:\n${extraInstructions}` : '');

      const raw = await embeddingService.generateChatCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { temperature: TIP_TEMPERATURE, maxTokens: TIP_MAX_TOKENS, model: TIP_MODEL }
      );

      let tip = typeof raw === 'string' ? raw.trim().replace(/^["']|["']$/g, '') : null;

      // Hard escape — model explicitly declined grounding (robust detection: exact sentinel
      // or any common no-grounding phrasing Mistral may output instead of literal sentinel)
      if (!tip || tip.includes(NO_GROUNDING_SENTINEL) || NO_GROUNDING_DETECT_REGEX.test(tip) || tip.length < 20) {
        logger.info(`[weather-preview] ${locale} attempt ${attempt + 1}: NO_GROUNDING declined (raw="${tip?.slice(0, 60)}")`);
        bestResult = null;
        break;
      }

      // Layer 3 validation: NER grounding against sources
      const validation = await validateContent(tip, sources, {
        locale,
        hallucinationThreshold: HALLUCINATION_THRESHOLD,
        skipPerSentence: true, // single-sentence, sentence-level redundant
      });

      const provenance = {
        signature: generateProvenanceSignature(TIP_MODEL, sourceIds, tip),
        model: TIP_MODEL,
        source_ids: sourceIds,
        sub_operation: 'weather_brand_tip',
        hallucinationRate: validation.hallucinationRate,
        retries: attempt,
        passed: validation.passed,
      };

      const result = { tip, validation, provenance, retries: attempt };

      if (validation.passed) {
        // Accept first passing result
        bestResult = result;
        break;
      }

      // Track best-so-far (lowest hallucinationRate)
      if (validation.hallucinationRate < bestHallucinationRate) {
        bestHallucinationRate = validation.hallucinationRate;
        bestResult = result;
      }

      // Prepare retry instruction for next iteration
      if (attempt < MAX_RETRY_ITERATIONS) {
        const ungrounded = (validation.ungroundedEntities || []).map(e => e.entity || e).slice(0, 5);
        extraInstructions = `Your previous output mentioned entities NOT in the ALLOWED_ENTITIES list: [${ungrounded.join(', ')}]. Rewrite the sentence using ONLY allowed entities. If no allowed entity fits the weather condition, output ${NO_GROUNDING_SENTINEL}.`;
        logger.info(`[weather-preview] ${locale} attempt ${attempt + 1}: validation_failed (rate=${validation.hallucinationRate.toFixed(2)}), retrying`);
      }
    } catch (err) {
      logger.warn(`[weather-preview] tip generation failed for ${locale} attempt ${attempt + 1}:`, err.message);
    }
  }

  // Hard fail-closed: if final best result still failed validation, return null (no hallucinated tip in UI)
  if (bestResult && !bestResult.validation.passed) {
    logger.warn(`[weather-preview] ${locale} all retries failed (best rate=${bestResult.validation.hallucinationRate.toFixed(2)}), returning null`);
    // Still log audit entry with failure status (caller does this)
    bestResult.tip = null; // strip hallucinated text — keep validation/provenance for audit
  }

  if (bestResult?.tip) TIP_CACHE.set(cacheKey, { value: bestResult, at: Date.now() });
  return bestResult;
}

// -----------------------------------------------------------------------------
// Multi-locale orchestration — single bcStruct fetch, parallel locale tips
// -----------------------------------------------------------------------------
async function generateMultiLocaleTips(destId, current, supportedLanguages, destinationDisplayName) {
  const localesForTip = supportedLanguages.filter(l => SUPPORTED_TIP_LOCALES.includes(l));
  if (localesForTip.length === 0) return { tips: null, validation: null, provenance: null, allowedEntitiesCount: 0 };

  const bcStruct = await buildBrandContextStructured(destId, { includeReferenceInString: true, maxKbChunks: 4 });
  // Tenant-agnostic multi-tenant defense: fetch ALL other destinations from DB
  // and filter their proper-nouns out of ALLOWED_ENTITIES + inject as
  // GEOGRAPHIC_EXCLUSIONS in the prompt. Defense-in-depth against future
  // brand_knowledge data-corruption (cross-tenant document mis-association).
  const otherDestinations = await getOtherDestinationNames(destId);
  const allowedEntities = extractAllowedEntities(bcStruct, otherDestinations);
  logger.info(`[weather-preview] dest=${destId} (${destinationDisplayName}) allowed_entities=${allowedEntities.length} exclude_tenants=${otherDestinations.length} sample=[${allowedEntities.slice(0, 8).join(', ')}]`);

  const promises = localesForTip.map(locale =>
    generateValidatedTipForLocale(destId, bcStruct, current, locale, allowedEntities, destinationDisplayName, otherDestinations)
      .then(result => ({ locale, result }))
  );
  const results = await Promise.all(promises);

  const tips = {};
  const validationMap = {};
  const provenanceMap = {};
  let anyTip = false;

  for (const { locale, result } of results) {
    if (!result) continue;
    if (result.tip) {
      tips[locale] = result.tip;
      anyTip = true;
    }
    if (result.validation) {
      validationMap[locale] = {
        passed: result.validation.passed,
        ungroundedEntities: (result.validation.ungroundedEntities || []).map(e => e.entity || e),
        hallucinationRate: result.validation.hallucinationRate,
        reasons: result.validation.reasons,
        retries: result.retries,
      };
    }
    if (result.provenance) provenanceMap[locale] = result.provenance;
  }

  return {
    tips: anyTip ? tips : null,
    validation: Object.keys(validationMap).length > 0 ? validationMap : null,
    provenance: Object.keys(provenanceMap).length > 0 ? provenanceMap : null,
    allowedEntitiesCount: allowedEntities.length,
    sources: bcStruct?.sources || [],
  };
}

// -----------------------------------------------------------------------------
// ai_generation_log INSERT per locale — full audit trail (EU AI Act + Optie D)
// -----------------------------------------------------------------------------
async function logAiGeneration(destId, locale, bcStruct, tipBundle, validationEntry, provenanceEntry, status, failureType) {
  try {
    await mysqlSequelize.query(
      `INSERT INTO ai_generation_log
        (destination_id, content_type, platform, locale, operation, model,
         internal_sources_count, has_internal_sources, soft_warning_shown,
         validation_passed, validation_reasons, status, created_at)
       VALUES (:destId, 'weather_brand_tip', 'website', :locale, 'generate', :model,
               :srcCount, :hasIS, 0, :validPassed, :validReasons, :status, NOW())`,
      { replacements: {
        destId,
        locale,
        model: TIP_MODEL,
        srcCount: (bcStruct?.sources || []).length,
        hasIS: bcStruct?.hasInternalSources ? 1 : 0,
        validPassed: validationEntry?.passed === true ? 1 : (validationEntry?.passed === false ? 0 : null),
        validReasons: JSON.stringify({
          sub_operation: 'weather_brand_tip',
          failure_type: failureType || null,
          reasons: validationEntry?.reasons || null,
          ungrounded_entities: validationEntry?.ungroundedEntities || null,
          hallucination_rate: validationEntry?.hallucinationRate ?? null,
          retries: validationEntry?.retries ?? null,
          provenance_signature: provenanceEntry?.signature || null,
        }),
        status,
      }}
    );
  } catch (err) {
    logger.warn(`[weather-preview] ai_generation_log INSERT failed for ${locale}:`, err.message);
  }
}

// -----------------------------------------------------------------------------
// Main handler
// -----------------------------------------------------------------------------
export async function handleWeatherPreview(req, res) {
  // Accept either destinationId (numeric, admin/internal use) or slug (string, multi-tenant
  // public clients like hb-websites ProgramCard). Tenant lookup resolves to canonical id.
  const destIdQuery = Number(req.query.destinationId || 0);
  const slugQuery = String(req.query.slug || '').trim().toLowerCase().slice(0, 50);
  const previewLocale = String(req.query.locale || 'en').toLowerCase().slice(0, 2);
  const withTip = req.query.withTip === 'true' || req.query.withTip === '1';

  if (!destIdQuery && !slugQuery) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId or slug required' } });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'OPENWEATHER_API_KEY not configured' } });

  try {
    let dest;
    if (destIdQuery) {
      const [[r]] = await mysqlSequelize.query(
        `SELECT id, name, display_name, latitude, longitude, branding, default_language, supported_languages
         FROM destinations WHERE id = :id`,
        { replacements: { id: destIdQuery } }
      );
      dest = r;
    } else {
      // Match by canonical slug — destinations table has 'slug' or 'name' column;
      // for safety check both code/slug/name lowercased
      const [[r]] = await mysqlSequelize.query(
        `SELECT id, name, display_name, latitude, longitude, branding, default_language, supported_languages
         FROM destinations
         WHERE LOWER(name) = :slug OR LOWER(display_name) = :slug OR LOWER(name) LIKE CONCAT(:slug, '%')
         ORDER BY CASE WHEN LOWER(name) = :slug THEN 0 WHEN LOWER(display_name) = :slug THEN 1 ELSE 2 END
         LIMIT 1`,
        { replacements: { slug: slugQuery } }
      );
      dest = r;
    }
    if (!dest) return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    const destId = dest.id;

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }
    const lat = dest.latitude || branding.lat || null;
    const lng = dest.longitude || branding.lng || null;
    if (!lat || !lng) return res.status(422).json({ success: false, error: { code: 'MISSING_COORDINATES', message: 'No latitude/longitude available for destination.' } });

    let supportedLanguages = [];
    try { supportedLanguages = typeof dest.supported_languages === 'string' ? JSON.parse(dest.supported_languages) : (dest.supported_languages || []); } catch { /* empty */ }
    if (supportedLanguages.length === 0) supportedLanguages = [dest.default_language || 'en'];

    const owmLang = SUPPORTED_TIP_LOCALES.includes(previewLocale) ? previewLocale : (dest.default_language || 'en');

    const [current, forecast] = await Promise.all([
      fetchOpenWeatherCurrent(Number(lat), Number(lng), apiKey, owmLang),
      fetchOpenWeatherForecast(Number(lat), Number(lng), apiKey, owmLang).catch(err => { logger.warn('[weather-preview] forecast failed:', err.message); return null; }),
    ]);

    let tipBundle = { tips: null, validation: null, provenance: null, allowedEntitiesCount: 0, sources: [] };
    if (withTip) {
      const destinationDisplayName = dest.display_name || dest.name || `Destination ${destId}`;
      tipBundle = await generateMultiLocaleTips(destId, current, supportedLanguages, destinationDisplayName);

      // Audit log per attempted locale (success + failure)
      const bcStructForAudit = { sources: tipBundle.sources, hasInternalSources: tipBundle.sources.length > 0 };
      const auditPromises = supportedLanguages
        .filter(l => SUPPORTED_TIP_LOCALES.includes(l))
        .map(locale => {
          const validationEntry = tipBundle.validation?.[locale];
          const provenanceEntry = tipBundle.provenance?.[locale];
          const hasFinalTip = !!tipBundle.tips?.[locale];
          // status enum: success|validation_failed|error. Alle failure-paths -> validation_failed
          // (failure_type wordt in validation_reasons JSON gezet voor analytics).
          const status = hasFinalTip ? 'success' : 'validation_failed';
          let failureType = null;
          if (!hasFinalTip) {
            if (tipBundle.allowedEntitiesCount === 0) failureType = 'no_grounding_no_entities';
            else if (!validationEntry) failureType = 'no_grounding_sentinel';
            else if (!validationEntry.passed) failureType = 'hallucination_threshold_exceeded';
            else failureType = 'unknown';
          }
          return logAiGeneration(destId, locale, bcStructForAudit, tipBundle, validationEntry, provenanceEntry, status, failureType);
        });
      Promise.all(auditPromises).catch(() => {});
    }

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
        brand_tip: tipBundle.tips,
        brand_tip_locales: tipBundle.tips ? Object.keys(tipBundle.tips) : [],
        brand_tip_validation: tipBundle.validation,
        brand_tip_provenance: tipBundle.provenance,
        brand_tip_allowed_entities_count: tipBundle.allowedEntitiesCount,
        source: 'openweathermap.org',
      }
    });
  } catch (error) {
    logger.error('[weather-preview] error:', error);
    return res.status(500).json({ success: false, error: { code: 'WEATHER_PREVIEW_ERROR', message: error.message } });
  }
}
