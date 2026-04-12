/**
 * Content Generator — Mistral AI content creation engine
 * Generates blog posts, social posts, and video scripts using Mistral AI.
 * Reuses embeddingService.generateChatCompletion() for LLM calls.
 *
 * @version 3.0.0 — Clean output prompts + content sanitizer safety net
 */

import embeddingService from '../../holibot/embeddingService.js';
import { buildToneInstruction, getLanguages } from './toneOfVoice.js';
import { buildFormatInstruction, formatForPlatform, generateHashtags, getContentSpec } from './contentFormatter.js';
import { sanitizeContent } from './contentSanitizer.js';
import { translateTexts } from '../../translationService.js';
import { analyzeContent } from '../seoMeester/seoAnalyzer.js';
import { mysqlSequelize } from '../../../config/database.js';
import { buildBrandContext } from './brandContext.js';
import logger from '../../../utils/logger.js';

const SEO_MINIMUM_SCORE = 50; // Lowered from 80 — auto-improve adds 25-90s per round but rarely improves score. Blogs score 55-75 naturally.

// Domain mapping for deep links per destination
const DESTINATION_DOMAINS = {
  1: 'calpetrip.com',
  2: 'texelmaps.nl',
};

/**
 * Find relevant POIs/Events from our database matching the content topic.
 * Returns grounding data to constrain AI to only mention real, verified places.
 */
/**
 * Theme detection — maps blog/topic keywords to POI categories so we can ground
 * the AI in semantically relevant POIs instead of random fallbacks.
 */
const THEME_MAP = [
  { match: /\b(old town|historic|history|culture|heritage|landmark|church|monument|plaza|museum|architectur)/i,
    categories: ['Culture & History'],
    googleLikes: ['landmark', 'church', 'museum', 'historical', 'tourist attraction', 'plaza', 'monument', 'art gallery', 'sculpture'] },
  { match: /\b(food|restaurant|tapas|paella|dining|cuisine|gastronom|cafe|bar|wine|drink)/i,
    categories: ['Food & Drinks'],
    googleLikes: ['restaurant', 'cafe', 'bar', 'tapas', 'food'] },
  { match: /\b(beach|sea|swim|snorkel|dive|water|coast|cala|playa)/i,
    categories: ['Beaches & Nature'],
    googleLikes: ['beach', 'cove', 'natural feature'] },
  { match: /\b(hike|hiking|trail|mountain|nature|outdoor|walk|peñón|penon|ifach)/i,
    categories: ['Beaches & Nature', 'Activities & Sports'],
    googleLikes: ['hiking', 'park', 'natural feature', 'mountain'] },
  { match: /\b(family|kids|children|playground|fun|activit)/i,
    categories: ['Activities & Sports', 'Family & Kids'],
    googleLikes: ['amusement', 'park', 'playground'] },
  { match: /\b(shop|shopping|market|boutique|souvenir)/i,
    categories: ['Shopping'],
    googleLikes: ['shop', 'market', 'boutique', 'store'] },
  { match: /\b(spa|wellness|relax|massage|yoga)/i,
    categories: ['Wellness'],
    googleLikes: ['spa', 'wellness'] },
];

function detectThemes(text) {
  const themes = THEME_MAP.filter(t => t.match.test(text));
  // Always include culture as a soft default if nothing matches (better than random)
  if (themes.length === 0) themes.push(THEME_MAP[0]);
  return themes;
}

/**
 * Multi-strategy POI grounding:
 *  (a) name substring match on keywords
 *  (b) theme-driven category + google_category match
 *  (c) top-rated fallback within those themes
 * Deduped, ranked by rating × review_count, capped at `limit`.
 */
async function findRelevantPOIs(destinationId, keywords = [], limit = 15, contextText = '') {
  try {
    const searchTerms = (keywords || []).filter(k => k && k.length > 2);
    const haystack = (contextText + ' ' + searchTerms.join(' ')).toLowerCase();
    const themes = detectThemes(haystack);
    const themeCategories = [...new Set(themes.flatMap(t => t.categories))];
    const themeGoogleLikes = [...new Set(themes.flatMap(t => t.googleLikes))];

    const results = new Map(); // id → row (dedup)

    // (a) Name substring match — high priority for explicit place names in keywords
    if (searchTerms.length > 0) {
      const nameLikes = searchTerms.map(() => 'name LIKE ?').join(' OR ');
      const nameParams = searchTerms.map(t => `%${t}%`);
      const [byName] = await mysqlSequelize.query(
        `SELECT id, name, category, google_category, rating, review_count, city
         FROM POI WHERE destination_id = ? AND is_active = 1 AND rating >= 4.0
         AND (${nameLikes})
         ORDER BY rating DESC, review_count DESC LIMIT 10`,
        { replacements: [destinationId, ...nameParams] }
      );
      byName.forEach(p => results.set(p.id, p));
    }

    // (b) Theme-driven category match — strong semantic relevance
    if (themeCategories.length > 0 || themeGoogleLikes.length > 0) {
      const catPlaceholders = themeCategories.map(() => '?').join(',');
      const googleLikeClauses = themeGoogleLikes.map(() => 'google_category LIKE ?').join(' OR ');
      const conditions = [];
      const params = [destinationId];
      if (themeCategories.length > 0) {
        conditions.push(`category IN (${catPlaceholders})`);
        params.push(...themeCategories);
      }
      if (themeGoogleLikes.length > 0) {
        conditions.push(`(${googleLikeClauses})`);
        params.push(...themeGoogleLikes.map(t => `%${t}%`));
      }
      const [byTheme] = await mysqlSequelize.query(
        `SELECT id, name, category, google_category, rating, review_count, city
         FROM POI WHERE destination_id = ? AND is_active = 1 AND rating >= 4.0 AND review_count >= 3
         AND (${conditions.join(' OR ')})
         ORDER BY rating DESC, review_count DESC LIMIT 25`,
        { replacements: params }
      );
      byTheme.forEach(p => { if (!results.has(p.id)) results.set(p.id, p); });
    }

    // (c) Last-resort fallback: top-rated overall (only if we still have nothing)
    if (results.size === 0) {
      const [fallback] = await mysqlSequelize.query(
        `SELECT id, name, category, google_category, rating, review_count, city
         FROM POI WHERE destination_id = ? AND is_active = 1 AND rating >= 4.3 AND review_count >= 10
         ORDER BY review_count DESC LIMIT ?`,
        { replacements: [destinationId, limit] }
      );
      fallback.forEach(p => results.set(p.id, p));
    }

    // Rank: rating × log(review_count+1), then take top `limit`
    const ranked = [...results.values()].sort((a, b) => {
      const sa = (a.rating || 0) * Math.log((a.review_count || 0) + 2);
      const sb = (b.rating || 0) * Math.log((b.review_count || 0) + 2);
      return sb - sa;
    }).slice(0, limit);

    logger.info(`[ContentGenerator] findRelevantPOIs: themes=[${themeCategories.join(',')}] returned ${ranked.length}/${results.size} POIs for keywords=[${searchTerms.join(', ')}]`);
    return ranked;
  } catch (err) {
    logger.error('[ContentGenerator] findRelevantPOIs error:', err.message);
    return [];
  }
}

/**
 * Find upcoming events from our database for content grounding.
 */
async function findRelevantEvents(destinationId, keywords = [], limit = 3) {
  try {
    const [events] = await mysqlSequelize.query(
      `SELECT a.id, a.title, a.location_name, a.calpe_distance, d.event_date
       FROM agenda a
       INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
       WHERE a.destination_id = ? AND d.event_date >= CURDATE()
       AND (a.calpe_distance IS NULL OR a.calpe_distance <= 15)
       ORDER BY d.event_date ASC LIMIT ?`,
      { replacements: [destinationId, limit] }
    );
    return events;
  } catch (err) {
    logger.error('[ContentGenerator] findRelevantEvents error:', err.message);
    return [];
  }
}

/**
 * Build grounding context with real POIs/Events and their deep links.
 */
function buildGroundingContext(pois, events, destinationId) {
  const domain = DESTINATION_DOMAINS[destinationId] || 'calpetrip.com';
  const lines = [];

  if (pois.length > 0) {
    lines.push('VERIFIED PLACES FROM OUR DATABASE (you MUST reference at least one of these):');
    pois.forEach(p => {
      const link = `https://${domain}/pois?poi=${p.id}`;
      const ratingLabel = p.rating >= 4.7 ? 'exceptional' : p.rating >= 4.4 ? 'highly rated' : p.rating >= 4.0 ? 'well-reviewed' : 'popular';
      lines.push(`- ${p.name} (${p.google_category || p.category}, ${p.rating}/5, ${ratingLabel}) — Link: ${link}`);
    });
  }

  if (events.length > 0) {
    lines.push('\nUPCOMING EVENTS (mention if relevant):');
    events.forEach(e => {
      const date = e.event_date ? new Date(e.event_date).toLocaleDateString('en-GB') : '';
      const link = `https://${domain}/agenda`;
      lines.push(`- ${e.title} at ${e.location_name || 'Calpe'} (${date}) — Link: ${link}`);
    });
  }

  if (lines.length > 0) {
    lines.push('\nCRITICAL RULES (strict — content will be rejected if violated):');
    lines.push('- ONLY mention named places that appear in the VERIFIED PLACES list above. Do NOT invent locations, do NOT use places you "know about" from training data, do NOT make up street names, churches, plazas, monuments, restaurants, beaches, or shops.');
    lines.push('- For BLOG content: you MUST link AT LEAST 5 of the verified places using exact <a href="..."> markup as listed. Spread links naturally throughout the body — do not cluster them.');
    lines.push('- Use the EXACT name from the list (case-sensitive) when linking. Example: <a href="https://calpetrip.com/pois?poi=569">Bar Casa de Cultura</a>');
    lines.push('- If you need a generic reference (e.g. "the old quarter", "a hidden street", "a local cafe"), use generic descriptive language WITHOUT a specific name. Never invent a name.');
    lines.push('- Include the link URL for at least 1 mentioned place in your post');
    lines.push('- For Facebook/LinkedIn: include the link directly in the text');
    lines.push('- For Instagram: mention "Link in bio" and reference the place by name');
    lines.push('- For X: include shortened link if character count allows');
    lines.push('- NEVER exaggerate ratings or review counts — use the exact rating provided (e.g. "rated 4.2/5"), do NOT say "rave reviews" or "hundreds of glowing reviews" unless rating is ≥4.7');
    lines.push('- NEVER use bullet characters (•), smart quotes (""), or other special Unicode in the output');
    lines.push('- Rating context: 4.0-4.3 = "well-reviewed", 4.4-4.6 = "highly rated", 4.7+ = "exceptional"');
  }

  return lines.join('\n');
}

/**
 * Platform-specific prompt rules for social content generation
 * Updated April 2026 — based on Meta/LinkedIn/X best practices 2025-2026
 * Sources: Meta Business Suite, Hootsuite Benchmarks 2026, Buffer State of Social 2025
 */
const PROMPT_PLATFORM_RULES = {
  facebook: {
    maxChars: 500,
    optimalChars: '100-250',
    rules: `FACEBOOK POST RULES (MANDATORY — every rule must be followed):
1. HOOK: Start with an attention-grabbing first sentence (question, bold statement, or sensory detail)
2. TONE: Conversational, warm, ask a question to invite engagement ("Have you tried...?", "What's your favorite...?")
3. LENGTH: AIM for 100-250 characters. Maximum 500. Shorter posts get 2x more engagement
4. EMOJI: Use exactly 2-3 emoji, placed naturally within the text (not clustered)
5. CTA: End with a clear call-to-action ("Discover more", "Tag someone who needs this", "Share your experience")
6. HASHTAGS: Add 3-5 relevant hashtags at the very end, on a new line
7. NO markdown, NO bullet points, NO numbered lists — flowing conversational text only`,
    emojiCount: '2-3',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  instagram: {
    maxChars: 2200,
    optimalChars: '500-1200',
    rules: `INSTAGRAM POST RULES (MANDATORY — every rule must be followed):
1. HOOK: First sentence is THE hook — this is what shows before "...meer". Make it irresistible
2. TONE: Storytelling, immersive, sensory-rich. Paint a picture with words
3. LENGTH: 500-1200 characters optimal. Use the space for a mini-story
4. EMOJI: Use 3-5 emoji naturally woven into the narrative
5. CTA: Include a call-to-action ("Save this for your trip", "Double tap if you agree", "Link in bio")
6. HASHTAGS: 10-15 relevant hashtags on a SEPARATE line at the end (blank line before hashtags)
7. Line breaks between paragraphs for readability`,
    emojiCount: '3-5',
    hashtagPosition: 'end_separated',
    maxHashtags: 15,
  },
  linkedin: {
    maxChars: 3000,
    optimalChars: '800-1300',
    rules: `LINKEDIN POST RULES (MANDATORY — every rule must be followed):
1. HOOK: First 2 lines are visible before "see more" — make them count with an insight or provocative question
2. TONE: Professional, thought leadership, data-driven. Share insights, not just promotion
3. LENGTH: 800-1300 characters optimal for engagement
4. EMOJI: Use 0-1 emoji maximum. Professional context
5. CTA: End with a discussion question ("What's been your experience?", "Do you agree?")
6. HASHTAGS: 3-5 relevant hashtags at the end
7. Use short paragraphs (2-3 lines) with line breaks for scannability`,
    emojiCount: '0-1',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  x: {
    maxChars: 280,
    optimalChars: '200-270',
    rules: `X (TWITTER) POST RULES (MANDATORY):
1. HOOK: Ultra-concise, punchy opening
2. TONE: Provocative, witty, or surprising
3. LENGTH: 200-270 characters (leave room for engagement)
4. EMOJI: 0-1 emoji maximum
5. HASHTAGS: Weave 1-2 hashtags INTO the text naturally, not at end
6. NO line breaks — single flowing statement`,
    emojiCount: '0-1',
    hashtagPosition: 'inline',
    maxHashtags: 2,
  },
  tiktok: {
    maxChars: 150,
    optimalChars: '80-140',
    rules: `TIKTOK CAPTION RULES (MANDATORY):
1. HOOK: POV or "Wait for it" style opening
2. TONE: Gen-Z friendly, trendy, casual
3. LENGTH: 80-140 characters. Super short
4. EMOJI: 2-4 emoji, expressive
5. HASHTAGS: 3-5 trending hashtags at end`,
    emojiCount: '2-4',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  youtube: {
    maxChars: 5000,
    optimalChars: '1000-3000',
    rules: `YOUTUBE DESCRIPTION RULES (MANDATORY):
1. HOOK: First 2 lines appear in search — include keywords
2. TONE: SEO-rich, informative, timestamps if relevant
3. LENGTH: 1000-3000 characters
4. EMOJI: 1-2 emoji for visual breaks
5. Include links and relevant resources
6. HASHTAGS: 10-15 at end`,
    emojiCount: '1-2',
    hashtagPosition: 'end',
    maxHashtags: 15,
  },
  pinterest: {
    maxChars: 500,
    optimalChars: '200-400',
    rules: `PINTEREST PIN RULES (MANDATORY):
1. TONE: Aspirational, dreamy, keyword-rich for Pinterest search
2. LENGTH: 200-400 characters
3. EMOJI: 0-1 emoji maximum
4. Include searchable keywords naturally
5. HASHTAGS: 3-5 at end`,
    emojiCount: '0-1',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  snapchat: {
    maxChars: 80,
    optimalChars: '30-70',
    rules: 'Ultra-short. No hashtags. Casual and fun.',
    emojiCount: '1-2',
    hashtagPosition: 'none',
    maxHashtags: 0,
  },
};

/**
 * Generate content from a suggestion using Mistral AI
 * @param {Object} suggestion - Content suggestion (title, summary, keyword_cluster, content_type)
 * @param {Object} options - { destinationId, contentType, platform, languages }
 * @returns {Object} Generated content with translations
 */
export async function generateContent(suggestion, options = {}) {
  const {
    destinationId,
    contentType = suggestion.content_type || 'blog',
    platform = 'website',
    languages = [],
    personaId = null,
  } = options;

  // Ensure Mistral client is initialized
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }
  if (!embeddingService.isConfigured) {
    throw new Error('Mistral AI client not configured — check MISTRAL_API_KEY');
  }

  const toneInstruction = await buildToneInstruction(destinationId);
  const formatInstruction = buildFormatInstruction(contentType, platform);
  const spec = getContentSpec(contentType);
  const rawKeywords = suggestion.keyword_cluster || [];
  const keywords = typeof rawKeywords === 'string' ? JSON.parse(rawKeywords) : (Array.isArray(rawKeywords) ? rawKeywords : []);
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  // Build brand context (includes profile, persona, knowledge base)
  const brandContext = await buildBrandContext(destinationId, personaId, keywords);

  // POI/Event grounding: find real places from our DB to constrain AI output
  const [relevantPOIs, relevantEvents] = await Promise.all([
    findRelevantPOIs(destinationId, keywords, contentType === 'blog' ? 15 : 5, suggestion.title || ''),
    findRelevantEvents(destinationId, keywords),
  ]);
  const groundingContext = buildGroundingContext(relevantPOIs, relevantEvents, destinationId);

  // Build the generation prompt — clean output, no markdown
  const systemPrompt = buildSystemPrompt(contentType, platform, toneInstruction, keywords, brandContext, groundingContext);
  const userPrompt = buildUserPrompt(suggestion, contentType, platform, keywords);

  try {
    // Generate primary content (English)
    const content = await embeddingService.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: contentType === 'blog' ? 3000 : 1500,
      }
    );

    // Extract title and body from generated content (+ blog SEO metadata)
    const { title, body, metaDescription, metaTitle, slug } = parseGeneratedContent(content, suggestion.title);

    // Sanitize — safety net strips any remaining markdown artifacts
    const sanitizedBody = sanitizeContent(body, contentType, platform);

    // Format for target platform
    const formattedBody = formatForPlatform(sanitizedBody, platform);

    // Apply UTM tracking to all URLs in the content (so preview validates correctly)
    let trackedBody = formattedBody;
    if (platform !== 'website') {
      try {
        const { applyUtmToContent } = await import('../publisher/utmBuilder.js');
        trackedBody = applyUtmToContent(formattedBody, { id: 0, content_type: contentType, title: suggestion.title }, platform);
      } catch { /* UTM builder not available, continue without */ }
    }

    // Generate hashtags for social platforms
    const hashtags = platform !== 'website' ? generateHashtags(keywords, platform) : [];

    // Ensure hashtags are present in the body (AI sometimes forgets for Facebook)
    if (hashtags.length > 0 && platform !== 'website') {
      const existingHashtags = (trackedBody.match(/#[a-zA-Z0-9\u00C0-\u024F]+/g) || []);
      if (existingHashtags.length === 0) {
        const hashtagLine = hashtags.join(' ');
        const separator = (platform === 'instagram') ? '\n\n' : '\n';
        trackedBody = trackedBody.trimEnd() + separator + hashtagLine;
      }
    }

    // Build social_metadata with UTM-tracked link
    let socialMetadata = {};
    if (platform !== 'website') {
      const domain = DESTINATION_DOMAINS[destinationId] || 'calpetrip.com';
      // Use POI link if available, otherwise homepage (ensures UTM tracking always exists)
      const baseLink = relevantPOIs.length > 0
        ? `https://${domain}/pois?poi=${relevantPOIs[0].id}`
        : `https://${domain}/`;
      try {
        const { buildUtmUrl } = await import('../publisher/utmBuilder.js');
        socialMetadata.link = buildUtmUrl(baseLink, { id: 0, content_type: contentType, title: suggestion.title }, platform);
      } catch {
        socialMetadata.link = baseLink;
      }
    }

    // Build result object — auto-generate SEO metadata if AI didn't provide them
    const autoMetaTitle = metaTitle || title.substring(0, 60);
    const autoSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
    const autoMetaDesc = metaDescription || (() => {
      const plainBody = (trackedBody || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plainBody.length <= 160) return plainBody;
      // Truncate at sentence boundary (. ! ?) within 155 chars, or at last word boundary
      const maxLen = 155;
      const truncated = plainBody.substring(0, maxLen);
      const lastSentence = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('! '), truncated.lastIndexOf('? '));
      if (lastSentence > maxLen * 0.5) return truncated.substring(0, lastSentence + 1).trim();
      const lastSpace = truncated.lastIndexOf(' ');
      return (lastSpace > maxLen * 0.6 ? truncated.substring(0, lastSpace) : truncated).trim() + '...';
    })();

    const seoData = { meta_description: autoMetaDesc, meta_title: autoMetaTitle, slug: autoSlug };

    // Auto-select best matching image(s) for this content
    let mediaIds = null;
    try {
      const { selectImages } = await import('./imageSelector.js');
      const imageCandidates = await selectImages(
        { title: metaTitle || title, body_en: trackedBody, poi_id: relevantPOIs[0]?.id || null, content_type: contentType },
        destinationId
      );
      if (imageCandidates.length > 0) {
        // selectImages now returns canonical, prefixed ids ("poi:N", "media:N", or http URL).
        // Just pass through — no double-prefixing.
        mediaIds = imageCandidates.map(img => img.id);
      }
    } catch (imgErr) {
      logger.warn('[ContentGenerator] Auto-image selection failed:', imgErr.message);
    }

    let result = {
      title: metaTitle || title, // prefer SEO-optimized title for blogs
      body_en: trackedBody,
      meta_description: metaDescription,
      seo_data: seoData,
      hashtags,
      social_metadata: socialMetadata,
      ai_model: modelName,
      ai_generated: true,
      content_type: contentType,
      target_platform: platform,
      keyword_cluster: keywords,
      media_ids: mediaIds,
    };

    // === AUTO-IMPROVE LOOP: SEO check → AI rewrite until ≥65/100 ===
    const seoResult = await analyzeContent(
      { title: result.title, body_en: result.body_en, seo_data: { meta_description: metaDescription }, content_type: contentType, keyword_cluster: keywords },
      destinationId
    );
    result.seo_score = seoResult.overallScore;
    result.seo_grade = seoResult.grade;

    if (seoResult.overallScore < SEO_MINIMUM_SCORE) {
      logger.info(`[ContentGenerator] SEO score ${seoResult.overallScore}/100 < ${SEO_MINIMUM_SCORE} — auto-improving...`);
      const improved = await improveContent(result, seoResult, { destinationId, contentType, keywords, targetPlatform: platform });
      if (improved) {
        result.title = improved.title || result.title;
        result.body_en = improved.body_en || result.body_en;
        result.meta_description = improved.meta_description || result.meta_description;
        result.seo_score = improved.seo_score;
        result.seo_grade = improved.seo_grade;
        result.auto_improved = true;
        result.improvement_details = improved.improvement_details;
      }
    }

    // Translate to requested languages
    const destLangs = await getLanguages(destinationId);
    const targetLangs = (languages.length > 0 ? languages : destLangs)
      .filter(l => l !== 'en');

    if (targetLangs.length > 0) {
      const translations = await translateContent(result.title, result.body_en, targetLangs);
      for (const lang of targetLangs) {
        if (translations.title?.[lang]) result[`title_${lang}`] = translations.title[lang];
        if (translations.body?.[lang]) result[`body_${lang}`] = translations.body[lang];
      }
    }

    return result;
  } catch (error) {
    logger.error('[ContentGenerator] Generation failed:', error);
    throw error;
  }
}

/**
 * Generate content suggestions from trending data using Mistral AI
 * @param {Array} trendingKeywords - Top trending keywords with scores
 * @param {number} destinationId
 * @returns {Array} Generated suggestions
 */
export async function generateSuggestions(trendingKeywords, destinationId) {
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }
  if (!embeddingService.isConfigured) {
    throw new Error('Mistral AI client not configured');
  }

  // Build full brand context (profile, tone, knowledge base)
  const brandContext = await buildBrandContext(destinationId, null, trendingKeywords.map(t => t.keyword));

  // Get destination's default language for suggestion output
  let destLang = 'en';
  try {
    const [[destRow]] = await mysqlSequelize.query(
      'SELECT default_language FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );
    if (destRow?.default_language) destLang = destRow.default_language;
  } catch { /* fallback to en */ }

  const LANG_NAMES = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
  const langName = LANG_NAMES[destLang] || 'English';

  const systemPrompt = `You are a content strategist for a premium content platform.
Analyze trending keywords and suggest content ideas that align with the brand profile below.

${brandContext}

IMPORTANT: Write ALL titles and summaries in ${langName} (language code: ${destLang}).
IMPORTANT: Suggestions MUST be relevant to the brand's industry, USPs, mission, and target audience described above.
IMPORTANT: Use facts from the REFERENCE MATERIAL if available — do not invent claims.

Return a JSON array of content suggestions. Each suggestion must have:
- "title": engaging content title (in ${langName}) — directly relevant to the brand
- "summary": 2-3 sentence description of the proposed content (in ${langName}) — explain WHY this content fits the brand
- "content_type": "blog" | "social_post" | "video_script"
- "suggested_channels": array of platforms (e.g. ["website", "instagram", "facebook"])
- "keyword_cluster": array of related keywords from the input
- "engagement_score": estimated score 1-10 based on trend strength

CRITICAL: Respect the CONTENT GOALS from the brand profile above.
- If blogs_per_month = 0: do NOT generate any "blog" suggestions. Only generate "social_post" suggestions.
- Match the number of suggestions to the content goals (e.g. 3 posts/week = suggest ~3 social post ideas).
- Focus on the strongest trends and the brand's USPs/themes.`;

  const keywordsBlock = trendingKeywords
    .map(t => `- "${t.keyword}" (score: ${t.relevance_score}, direction: ${t.trend_direction}, volume: ${t.search_volume || 'N/A'})`)
    .join('\n');

  try {
    const response = await embeddingService.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Trending keywords for destination ${destinationId}:\n${keywordsBlock}\n\nGenerate content suggestions as a JSON array.` },
      ],
      {
        temperature: 0.8,
        maxTokens: 2000,
      }
    );

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('[ContentGenerator] Could not parse suggestions JSON from AI response');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return suggestions.map(s => ({
      title: s.title || 'Untitled',
      summary: s.summary || '',
      content_type: ['blog', 'social_post', 'video_script'].includes(s.content_type) ? s.content_type : 'blog',
      suggested_channels: Array.isArray(s.suggested_channels) ? s.suggested_channels : ['website'],
      keyword_cluster: Array.isArray(s.keyword_cluster) ? s.keyword_cluster : [],
      engagement_score: Math.min(10, Math.max(0, Number(s.engagement_score) || 5)),
      destination_id: destinationId,
      status: 'pending',
    }));
  } catch (error) {
    logger.error('[ContentGenerator] Suggestion generation failed:', error);
    throw error;
  }
}

/**
 * Build system prompt — clean output, platform-aware, no markdown
 */
function buildSystemPrompt(contentType, platform, toneInstruction, keywords, brandContext = '', groundingContext = '') {
  const keywordsStr = keywords.length > 0
    ? `Target keywords (MUST appear in text): ${keywords.map(k => `"${k}"`).join(', ')}`
    : '';

  const brandBlock = brandContext ? `\n${brandContext}\n` : '';
  const groundingBlock = groundingContext ? `\n${groundingContext}\n` : '';

  const base = `You are an enterprise-grade content writer for a premium content platform.
${brandBlock}
${toneInstruction}
${groundingBlock}
ABSOLUTE RULES:
- Write original, high-quality content — NO plagiarism
- Facts must be accurate — do NOT hallucinate. If reference material is provided, use those facts.
- Preserve proper nouns (names, street names, local terms)
- EU AI Act compliance: this is AI-generated content
- If a target audience is specified, tailor language, tone, and content to their interests and pain points
- ONLY mention real places, restaurants, or businesses that are listed in the VERIFIED PLACES section above`;

  if (contentType === 'social_post') {
    const platformRules = PROMPT_PLATFORM_RULES[platform] || PROMPT_PLATFORM_RULES.facebook;
    return `${base}

${platformRules.rules}

CRITICAL FORMATTING RULES:
- Write as PLAIN TEXT ready to paste directly into ${platform}
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER include labels like CAPTION:, POST:, HOOK:, CTA:, TITLE:, BODY:
- NEVER use em-dashes (—), en-dashes (–), bullet characters (•), or smart quotes ("")
- NEVER leave sentences incomplete or truncated
- Maximum ${platformRules.maxChars} characters (ABSOLUTE LIMIT — count carefully)
- Optimal length: ${platformRules.optimalChars || platformRules.maxChars} characters
- Include exactly ${platformRules.emojiCount} relevant emoji naturally in the text
- Include ${platformRules.maxHashtags} relevant hashtags (${platformRules.hashtagPosition === 'end_separated' ? 'on a separate line at the end' : platformRules.hashtagPosition === 'inline' ? 'woven into the text' : 'at the end'})
${keywordsStr}

QUALITY CHECKLIST (your output MUST satisfy ALL):
✓ Hook: compelling first sentence that stops scrolling
✓ CTA: clear call-to-action at the end
✓ Emoji: exactly ${platformRules.emojiCount} emoji in the text
✓ Hashtags: ${platformRules.maxHashtags} hashtags included
✓ Length: within ${platformRules.optimalChars || platformRules.maxChars} characters
✓ Tone: matches platform style (${platform})
✓ Grounding: references real verified places from the database

Return ONLY the post text. Nothing else. No quotes around it.`;
  }

  if (contentType === 'video_script') {
    return `${base}

CRITICAL FORMATTING RULES:
- Write as natural spoken narration
- Use [SCENE: description] markers for visual cues (these are the ONLY allowed brackets)
- NEVER use markdown: no **, no ##, no ---
- NEVER include labels like TITLE:, INTRO:
- Target: 150-225 words (60-90 seconds spoken)
${keywordsStr}

Return ONLY the script. Scene markers and narration text. Nothing else.`;
  }

  // Blog — output as structured HTML for TipTap WYSIWYG editor
  return `${base}

CRITICAL FORMATTING RULES — BLOG (HTML output):
- Output as CLEAN HTML: use <h2>, <h3>, <p>, <a href="...">, <strong>, <em> tags
- Structure: 4-6 sections, each with an <h2> heading + 2-3 paragraphs
- Use <h3> for subsections where appropriate
- Wrap every paragraph in <p>...</p> tags
- Link mentioned places to their detail page: <a href="https://{domain}/pois?poi={id}">{POI name}</a>
- For events, link to: <a href="https://{domain}/agenda">{event name}</a>
- NEVER use markdown syntax (no **, ##, ---, \`, []())
- NEVER include labels like TITLE:, META:, INTRODUCTION:
- Target: 800-1500 words
- Include factual details: opening hours, ratings, locations where relevant
- End with a call-to-action section
- NEVER use em-dashes (—) or bullet characters (•)
${keywordsStr}

ALSO GENERATE SEO METADATA — add these 3 lines at the VERY END of your output, after the article:
META_TITLE: [60-char max SEO title for this blog]
META_DESCRIPTION: [155-char max meta description]
SLUG: [url-friendly-slug-for-this-blog]

Return the HTML article first, then the 3 META lines.`;
}

/**
 * Build the user prompt — clean output, no labels, no markdown
 */
function buildUserPrompt(suggestion, contentType, platform, keywords) {
  const keywordsStr = keywords.length > 0 ? `\nKeywords to incorporate naturally: ${keywords.join(', ')}` : '';
  const context = suggestion.summary ? `\nContext: ${suggestion.summary}` : '';

  // Detect website_analytics trending keywords (e.g., "website: Homepage")
  const isWebsiteAnalytics = (suggestion.title || '').toLowerCase().startsWith('website:');
  const websitePageName = isWebsiteAnalytics ? suggestion.title.replace(/^website:\s*/i, '').trim() : '';

  // CalpeTrip.com is a STANDALONE platform (not connected to Page Builder).
  // Pages: Home, Explore (POIs), CalpeChat, Agenda, Favorites, Account, About, FAQ.
  const CALPETRIP_PAGES = {
    'homepage': 'CalpeTrip.com homepage: AI-powered personal day program (morning/afternoon/evening), daily Tip of the Day, real-time "Vandaag in Calpe" event carousel, interactive map with 1500+ POIs, and CalpeChat AI travel assistant',
    'home': 'CalpeTrip.com homepage: AI-powered personal day program, daily Tip of the Day, live event carousel, interactive map, CalpeChat AI assistant',
    'explore': 'Explore page: 1500+ verified points of interest with ratings, reviews, photos, interactive map with category filters (beaches, restaurants, culture, active, shopping)',
    'calpechat': 'CalpeChat: AI travel assistant that speaks 4 languages, gives personalized recommendations, plans your day, and knows every hidden gem in Calpe',
    'agenda': 'Agenda: complete real-time Calpe event calendar with category filters, all local festivals, markets, concerts and activities',
    'favorites': 'Favorites: save your favorite places and build your personal Calpe collection',
    'about': 'About: the story behind CalpeTrip, AI-powered tourism platform for the Costa Blanca',
    'faq': 'FAQ: answers about using CalpeTrip, planning your visit, and local tips',
  };

  const pageKey = websitePageName.toLowerCase().replace(/[^a-z]/g, '');
  const pageFeatures = CALPETRIP_PAGES[pageKey] || CALPETRIP_PAGES['homepage'];

  const websiteInstruction = isWebsiteAnalytics ? `

MANDATORY — THIS POST IS ABOUT A PLATFORM, NOT ABOUT TOURISM.
You are writing about CalpeTrip.com — a digital travel platform.
Specific page: "${websitePageName}"
Page features: ${pageFeatures}

RULES (OVERRIDE ALL OTHER INSTRUCTIONS):
1. Write about WHAT THE PLATFORM DOES — its features, tools, and benefits
2. Do NOT write generic tourism prose about beaches, sunsets, or paella
3. Mention specific platform features: CalpeChat AI, day program, event calendar, 1500+ POIs, ratings
4. CTA must drive to calpetrip.com
5. Tone: "Your holiday planning made effortless with smart technology"
6. NEVER include the raw title "website: Homepage" or "website: ..." literally in the post text — use "CalpeTrip.com" instead` : '';

  switch (contentType) {
    case 'blog':
      return `Write a tourism blog article about "${suggestion.title}".${context}${keywordsStr}${websiteInstruction}

Write 800-1500 words as structured HTML:
1. Start with an engaging <h2> section heading, then <p> paragraphs
2. Use 4-6 <h2> sections with descriptive headings
3. Link real places/restaurants mentioned to their detail pages using <a href> tags
4. Include ratings (e.g. "rated 4.8/5") where available
5. End with a call-to-action section

After the HTML article, add exactly 3 metadata lines:
META_TITLE: [SEO title, max 60 chars]
META_DESCRIPTION: [meta description, max 155 chars]
SLUG: [url-slug]`;

    case 'social_post': {
      const pr = PROMPT_PLATFORM_RULES[platform] || PROMPT_PLATFORM_RULES.facebook;
      return `Write a ${platform} post about "${suggestion.title}".${context}${keywordsStr}${websiteInstruction}

REQUIREMENTS (all mandatory):
1. Start with a scroll-stopping hook (first sentence)
2. ${pr.optimalChars || pr.maxChars} characters optimal, maximum ${pr.maxChars} characters
3. Include exactly ${pr.emojiCount} emoji naturally placed
4. End with a clear call-to-action
5. MUST include ${pr.maxHashtags} relevant hashtags (${pr.hashtagPosition === 'end_separated' ? 'blank line then hashtags' : pr.hashtagPosition === 'inline' ? 'woven into text' : 'at the end'}) — this is REQUIRED, do NOT omit hashtags
6. Plain text only — no labels, no markdown, no quotes around it
7. Ready to copy-paste directly into ${platform}

Write the post now.`;
    }

    case 'video_script':
      return `Write a 60-90 second video script about "${suggestion.title}".${context}${keywordsStr}

Use [SCENE: description] markers for visual cues. Write natural spoken narration between them.
Do NOT include a title or any labels. Just scene markers and narration.`;

    default:
      return `Write content about: "${suggestion.title}"${keywordsStr}`;
  }
}

/**
 * Parse generated content to extract title, body, and meta description.
 * Handles both old-style (TITLE:/META: labels) and new clean output.
 */
function parseGeneratedContent(content, fallbackTitle) {
  let title = fallbackTitle;
  let body = content;
  let metaDescription = '';
  let metaTitle = '';
  let slug = '';

  // Extract TITLE: if Mistral still includes it (backward compat)
  const titleMatch = content.match(/^TITLE:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    body = content.replace(titleMatch[0], '').trim();
  }

  // Extract META: if present (legacy format)
  const metaMatch = body.match(/^META:\s*(.+)$/m);
  if (metaMatch) {
    metaDescription = metaMatch[1].trim();
    body = body.replace(metaMatch[0], '').trim();
  }

  // Extract blog SEO metadata (new format: META_TITLE, META_DESCRIPTION, SLUG)
  const metaTitleMatch = body.match(/^META_TITLE:\s*(.+)$/m);
  if (metaTitleMatch) {
    metaTitle = metaTitleMatch[1].trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '');
    body = body.replace(metaTitleMatch[0], '').trim();
  }
  const metaDescMatch = body.match(/^META_DESCRIPTION:\s*(.+)$/m);
  if (metaDescMatch) {
    metaDescription = metaDescMatch[1].trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '');
    body = body.replace(metaDescMatch[0], '').trim();
  }
  const slugMatch = body.match(/^SLUG:\s*(.+)$/m);
  if (slugMatch) {
    slug = slugMatch[1].trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    body = body.replace(slugMatch[0], '').trim();
  }

  // Strip any remaining label prefixes the sanitizer will also catch
  body = body.replace(/^(INTRODUCTION|CONCLUSION|BODY|OPENING|CLOSING|SUMMARY)\s*[:：]\s*/gim, '');

  return { title, body, metaDescription, metaTitle, slug };
}

/**
 * Translate content to multiple languages using existing translationService
 */
async function translateContent(title, body, targetLangs) {
  try {
    const texts = [
      { key: 'title', value: title },
      { key: 'body', value: body },
    ];
    return await translateTexts(texts, 'en', targetLangs);
  } catch (error) {
    logger.error('[ContentGenerator] Translation failed:', error);
    return {};
  }
}

/**
 * Auto-improve content based on SEO analysis feedback
 * Sends failing checks to Mistral AI with specific instructions to fix each issue.
 * Runs up to 2 improvement rounds to reach the 65/100 minimum.
 *
 * @param {Object} content - { title, body_en, meta_description, content_type, keyword_cluster }
 * @param {Object} seoResult - analyzeContent() result with checks and scores
 * @param {Object} options - { destinationId, contentType, keywords }
 * @returns {Object|null} Improved content or null if no improvement possible
 */
async function improveContent(content, seoResult, options = {}) {
  const { destinationId, contentType, keywords = [], targetPlatform } = options;
  const MAX_ROUNDS = 1; // Single improvement round — stop early if score doesn't improve (was 3, caused HTTP timeouts on blogs)
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  // Platform character limits — enforce during improvement
  const PLATFORM_CHAR_LIMITS = {
    facebook: 500, instagram: 2200, linkedin: 3000, x: 280,
    tiktok: 150, youtube: 5000, pinterest: 500,
  };
  const platformMaxChars = targetPlatform ? PLATFORM_CHAR_LIMITS[targetPlatform] : null;

  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }

  let currentTitle = content.title;
  let currentBody = content.body_en;
  let currentMeta = content.meta_description || '';
  let currentSeo = seoResult;
  let round = 0;

  while (currentSeo.overallScore < SEO_MINIMUM_SCORE && round < MAX_ROUNDS) {
    round++;

    const failingChecks = currentSeo.checks
      .filter(c => c.score < c.maxScore)
      .map(c => {
        const deficit = c.maxScore - c.score;
        return `- ${c.name}: ${c.score}/${c.maxScore} (need +${deficit}pts) → ${c.details}`;
      })
      .join('\n');

    const passingChecks = currentSeo.checks
      .filter(c => c.score === c.maxScore)
      .map(c => `- ${c.name}: PERFECT ✓ — do NOT change this aspect`)
      .join('\n');

    const toneInstruction = await buildToneInstruction(destinationId);

    const platformLimitRule = platformMaxChars
      ? `\n- ABSOLUTE CHARACTER LIMIT: ${platformMaxChars} characters maximum. The improved content MUST be shorter than ${platformMaxChars} characters. Count carefully. If the current content exceeds this limit, SHORTEN it while fixing quality.`
      : '';

    const blogHtmlRule = contentType === 'blog'
      ? `\n- BLOG OUTPUT FORMAT: Return as HTML using <h2>, <h3>, <p>, <a href>, <strong>, <em> tags. Preserve existing HTML structure. Do NOT strip HTML tags.`
      : '';

    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken — preserve everything that scores 10/10.

${toneInstruction}

CRITICAL FORMATTING RULES:
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER include labels like TITLE:, META:, INTRODUCTION: — just the clean text
- NEVER use em-dashes (—) or en-dashes (–) — use commas or regular hyphens instead
- NEVER leave incomplete sentences or truncated words (no trailing "...")
- NEVER include AI instruction brackets like [Link in Bio] or [Image: ...]
- Write clean, flowing prose only
- Return the COMPLETE improved content (not just the changes)
- DO NOT change aspects that already score 10/10 — only fix failing metrics
- Do NOT add disclaimers or explanations — return ONLY the improved content${platformLimitRule}${blogHtmlRule}`;

    const userPrompt = `Content scored ${currentSeo.overallScore}/100 (need ≥${SEO_MINIMUM_SCORE}/100). Fix the failing metrics.

TITLE: ${currentTitle}

CONTENT:
${currentBody}

ALREADY PERFECT (do NOT change):
${passingChecks || '(none)'}

NEEDS FIXING:
${failingChecks}

TARGET KEYWORDS: ${keywords.map(k => `"${k}"`).join(', ') || 'none specified'}

Rewrite to fix ALL failing metrics while keeping perfect scores intact.`;

    try {
      const improved = await embeddingService.generateChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.6, maxTokens: contentType === 'blog' ? 3000 : 1500 }
      );

      const parsed = parseGeneratedContent(improved, currentTitle);
      currentTitle = parsed.title;
      currentBody = sanitizeContent(parsed.body, contentType, targetPlatform || 'website');
      if (parsed.metaDescription) currentMeta = parsed.metaDescription;

      // Re-score
      currentSeo = await analyzeContent(
        { title: currentTitle, body_en: currentBody, seo_data: { meta_description: currentMeta }, content_type: contentType, keyword_cluster: keywords },
        destinationId
      );

      logger.info(`[ContentGenerator] Auto-improve round ${round}: ${seoResult.overallScore} → ${currentSeo.overallScore}/100 (${currentSeo.grade})`);
    } catch (err) {
      logger.error(`[ContentGenerator] Auto-improve round ${round} failed:`, err.message);
      break;
    }
  }

  // Only return if we actually improved
  if (currentSeo.overallScore > seoResult.overallScore) {
    return {
      title: currentTitle,
      body_en: currentBody,
      meta_description: currentMeta,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      seo_checks: currentSeo.checks,
      ai_model: modelName,
      improvement_details: {
        original_score: seoResult.overallScore,
        final_score: currentSeo.overallScore,
        rounds: round,
        improved_checks: currentSeo.checks
          .filter((c, i) => c.score > seoResult.checks[i]?.score)
          .map(c => c.name),
      },
    };
  }

  return null;
}

/**
 * Improve an existing content item — standalone function for the API endpoint.
 * Runs SEO analysis → auto-improve loop → returns improved content.
 *
 * @param {Object} contentItem - DB content item row { id, title, body_en, seo_data, content_type, keyword_cluster, destination_id }
 * @returns {Object} { improved: boolean, original_score, final_score, title, body_en, ... }
 */
export async function improveExistingContent(contentItem) {
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }

  const keywords = typeof contentItem.keyword_cluster === 'string'
    ? JSON.parse(contentItem.keyword_cluster)
    : (contentItem.keyword_cluster || []);
  const seoData = typeof contentItem.seo_data === 'string'
    ? JSON.parse(contentItem.seo_data)
    : (contentItem.seo_data || {});
  const contentType = contentItem.content_type || 'blog';
  const destinationId = contentItem.destination_id;

  // Run current SEO analysis
  const currentSeo = await analyzeContent(
    { title: contentItem.title, body_en: contentItem.body_en, seo_data: seoData, content_type: contentType, keyword_cluster: keywords },
    destinationId
  );

  if (currentSeo.overallScore >= SEO_MINIMUM_SCORE) {
    return {
      improved: false,
      reason: `Score already at ${currentSeo.overallScore}/100 (≥${SEO_MINIMUM_SCORE})`,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      checks: currentSeo.checks,
    };
  }

  const content = {
    title: contentItem.title,
    body_en: contentItem.body_en,
    meta_description: seoData.meta_description || '',
    content_type: contentType,
    keyword_cluster: keywords,
  };

  const improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  if (improved) {
    return {
      improved: true,
      original_score: currentSeo.overallScore,
      final_score: improved.seo_score,
      title: improved.title,
      body_en: improved.body_en,
      meta_description: improved.meta_description,
      seo_score: improved.seo_score,
      seo_grade: improved.seo_grade,
      seo_checks: improved.seo_checks,
      improvement_details: improved.improvement_details,
    };
  }

  return {
    improved: false,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
  };
}

/**
 * Generate an ALTERNATIVE version of an existing content item ("A/B variant" / Jasper Remix style).
 * Reuses the same topic/keywords but instructs the LLM to write from a completely different angle,
 * with a higher temperature for more creative divergence.
 *
 * Does NOT write to the DB — returns both original and alternative for split-view UI.
 *
 * @param {Object} contentItem - DB content item row
 * @returns {Object} { original: { title, body_en }, alternative: { title, body_en, meta_description }, ai_model }
 */
export async function generateAlternative(contentItem) {
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }

  const keywords = typeof contentItem.keyword_cluster === 'string'
    ? JSON.parse(contentItem.keyword_cluster)
    : (contentItem.keyword_cluster || []);
  const seoData = typeof contentItem.seo_data === 'string'
    ? JSON.parse(contentItem.seo_data)
    : (contentItem.seo_data || {});
  const contentType = contentItem.content_type || 'blog';
  const destinationId = contentItem.destination_id;
  const targetPlatform = contentItem.target_platform || 'website';

  const PLATFORM_CHAR_LIMITS = {
    facebook: 500, instagram: 2200, linkedin: 3000, x: 280,
    tiktok: 150, youtube: 5000, pinterest: 500,
  };
  const platformMaxChars = PLATFORM_CHAR_LIMITS[targetPlatform] || null;

  const toneInstruction = await buildToneInstruction(destinationId);

  const platformLimitRule = platformMaxChars
    ? `\n- ABSOLUTE CHARACTER LIMIT: ${platformMaxChars} characters maximum.`
    : '';

  const blogHtmlRule = contentType === 'blog'
    ? `\n- BLOG OUTPUT FORMAT: Return as HTML using <h2>, <h3>, <p>, <a href>, <strong>, <em> tags.`
    : '';

  const systemPrompt = `You are a creative content remixer. Your job is to write a COMPLETELY DIFFERENT version of an existing piece of content — same topic, same target keywords, but a fundamentally different angle, narrative structure, opening hook and tone within the brand voice.

${toneInstruction}

CRITICAL RULES:
- The result must NOT paraphrase the original. Pick a new angle: contrarian, story-led, list-format, problem/solution, sensory-immersive, behind-the-scenes — anything but the original structure.
- Stay on the same topic and use the same target keywords naturally.
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER use em-dashes (—) or en-dashes (–) — use commas or regular hyphens
- NEVER include labels like TITLE:, META:, INTRODUCTION:
- Write a NEW title that is distinct from the original.
- Return clean, flowing prose (or HTML for blogs) only — no disclaimers.${platformLimitRule}${blogHtmlRule}`;

  const userPrompt = `ORIGINAL TITLE: ${contentItem.title}

ORIGINAL CONTENT:
${contentItem.body_en}

TARGET KEYWORDS: ${keywords.map(k => `"${k}"`).join(', ') || '(none specified)'}

CONTENT TYPE: ${contentType}
PLATFORM: ${targetPlatform}

Write a complete alternative version with a fundamentally different angle. Same topic, same keywords, new narrative.`;

  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  try {
    const generated = await embeddingService.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.9, maxTokens: contentType === 'blog' ? 3000 : 1500 }
    );

    const parsed = parseGeneratedContent(generated, contentItem.title);
    const altBody = sanitizeContent(parsed.body, contentType, targetPlatform);

    return {
      original: {
        title: contentItem.title,
        body_en: contentItem.body_en,
        meta_description: seoData.meta_description || '',
      },
      alternative: {
        title: parsed.title,
        body_en: altBody,
        meta_description: parsed.metaDescription || seoData.meta_description || '',
      },
      ai_model: modelName,
    };
  } catch (err) {
    logger.error('[ContentGenerator] generateAlternative failed:', err.message);
    throw err;
  }
}

/**
 * Generate content directly from a POI — KILLER FEATURE
 * Uses actual POI data (name, rating, category, opening hours, highlights) as context.
 *
 * @param {number} poiId - POI database ID
 * @param {number} destinationId
 * @param {string[]} platforms - Target platforms (default: blog + instagram + facebook)
 * @returns {Array} Generated content items per platform
 */
export async function generateFromPOI(poiId, destinationId, platforms = ['instagram', 'facebook', 'linkedin']) {
  const { mysqlSequelize } = await import('../../../config/database.js');

  // Fetch POI data
  const [[poi]] = await mysqlSequelize.query(
    `SELECT id, name, category, google_rating, google_review_count,
            enriched_detail_description, enriched_highlights,
            opening_hours_json, address, amenities, destination_id
     FROM POI WHERE id = :id`,
    { replacements: { id: poiId } }
  );
  if (!poi) throw new Error(`POI ${poiId} not found`);

  // Build POI context for the prompt
  const poiContext = buildPOIContext(poi);

  const results = [];

  // Blog
  const blogSuggestion = {
    title: `${poi.name} — ${poi.category || 'Local Gem'}`,
    summary: poiContext,
    keyword_cluster: [poi.name, poi.category, 'travel', 'tourism'].filter(Boolean),
    content_type: 'blog',
    poi_id: poiId,
  };
  const blog = await generateContent(blogSuggestion, {
    destinationId: destinationId || poi.destination_id,
    contentType: 'blog',
    platform: 'website',
  });
  blog.poi_id = poiId;
  results.push(blog);

  // Social posts per platform
  for (const platform of platforms) {
    const socialSuggestion = {
      title: poi.name,
      summary: poiContext,
      keyword_cluster: [poi.name, poi.category].filter(Boolean),
      content_type: 'social_post',
      poi_id: poiId,
    };
    const post = await generateContent(socialSuggestion, {
      destinationId: destinationId || poi.destination_id,
      contentType: 'social_post',
      platform,
    });
    post.poi_id = poiId;
    results.push(post);
  }

  return results;
}

/**
 * Build a POI context string with factual data for the prompt
 */
function buildPOIContext(poi) {
  const parts = [`Name: ${poi.name}`];
  if (poi.category) parts.push(`Category: ${poi.category}`);
  if (poi.google_rating) parts.push(`Rating: ${poi.google_rating}/5 (${poi.google_review_count || 0} reviews)`);
  if (poi.address) parts.push(`Address: ${poi.address}`);
  if (poi.enriched_highlights) parts.push(`Highlights: ${poi.enriched_highlights}`);
  if (poi.amenities) parts.push(`Amenities: ${poi.amenities}`);
  if (poi.opening_hours_json) {
    try {
      const hours = typeof poi.opening_hours_json === 'string' ? JSON.parse(poi.opening_hours_json) : poi.opening_hours_json;
      if (Array.isArray(hours)) {
        parts.push(`Opening hours: ${hours.map(h => `${h.day || h.dayOfWeek}: ${h.hours || h.open + '-' + h.close}`).join(', ')}`);
      }
    } catch { /* skip unparseable hours */ }
  }
  if (poi.enriched_detail_description) {
    const desc = poi.enriched_detail_description.substring(0, 500);
    parts.push(`Description: ${desc}`);
  }
  return parts.join('. ');
}

/**
 * Platform-specific example outputs — show Mistral AI what GREAT content looks like per platform.
 * These examples are critical for differentiation quality.
 */
const PLATFORM_EXAMPLES = {
  instagram: `EXAMPLE Instagram post (travel/tourism):
Stepping into the golden light of the Mediterranean, where every corner tells a story worth sharing.

We wandered through narrow cobblestone streets, found a hidden courtyard cafe, and tasted the best local wine of the season. The kind of moment you want to bottle up forever.

Have you ever discovered a place that instantly felt like home? Tell us your favorite hidden gem below.

Save this for your next trip planning session.

#MediterraneanTravel #HiddenGems #TravelInspiration #LocalFlavors #CoastalVibes`,

  facebook: `EXAMPLE Facebook post (travel/tourism):
Ever walked into a restaurant and instantly known you found THE spot? That happened to us last week in the old town.

Family-run since 1987, incredible seafood, and a terrace view that made us forget time exists. Link in bio for the full guide.

Who else loves finding these local treasures? Tag your travel buddy!`,

  linkedin: `EXAMPLE LinkedIn post (travel/tourism):
The tourism industry is shifting. Travelers no longer want cookie-cutter experiences.

After analyzing visitor data from 50+ destinations, one pattern stands out: authentic local experiences drive 3x more engagement than generic tourist attractions.

Our approach: partner directly with local businesses to curate genuine recommendations that match each traveler's interests.

The result? Higher satisfaction scores, longer stays, and visitors who actually return.

What trends are you seeing in the travel space?`,

  x: `EXAMPLE X post:
Just discovered the most incredible hidden beach on the Costa Blanca. Crystal water, zero crowds, local chiringuito with fresh paella. This is why we explore. #CostaBlanca #HiddenBeach`,

  tiktok: `EXAMPLE TikTok caption:
POV: you found the secret local spot everyone keeps gatekeeping #TravelTok #HiddenGem #FoodieTravel`,

  youtube: `EXAMPLE YouTube description:
Discover the hidden gems of the Costa Blanca that most tourists completely miss. In this guide, we explore 5 incredible spots recommended by locals.

Timestamps:
0:00 - Introduction
1:30 - Hidden Beach Cala del Moraig
3:45 - Best Local Market
6:00 - Mountain Village Walk

Subscribe for weekly travel guides and local tips!`,

  pinterest: `EXAMPLE Pinterest description:
Dreaming of Mediterranean sunsets and charming coastal villages? This complete travel guide covers the best beaches, authentic restaurants, and hidden viewpoints along the Costa Blanca. Save this pin for your next European getaway.`,
};

/**
 * Repurpose content — GENUINELY REWRITE existing content for different platforms.
 * Each platform gets a completely different version optimized for its audience,
 * format, and engagement patterns. NOT a copy-paste with slight modifications.
 *
 * @param {Object} sourceItem - Source content item from DB
 * @param {string[]} targetPlatforms - Target platforms
 * @param {number} destinationId
 * @returns {Array} Repurposed content items
 */
export async function repurposeContent(sourceItem, targetPlatforms, destinationId) {
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }
  if (!embeddingService.isConfigured) {
    throw new Error('Mistral AI client not configured — check MISTRAL_API_KEY');
  }

  const destId = destinationId || sourceItem.destination_id;
  const toneInstruction = await buildToneInstruction(destId);
  const modelName = embeddingService.chatModel || 'mistral-small-latest';
  const keywords = (() => {
    try {
      return typeof sourceItem.keyword_cluster === 'string'
        ? JSON.parse(sourceItem.keyword_cluster)
        : (sourceItem.keyword_cluster || []);
    } catch { return []; }
  })();

  // POI/Event grounding for repurposed content
  const [relevantPOIs, relevantEvents] = await Promise.all([
    findRelevantPOIs(destId, keywords, sourceItem.content_type === 'blog' ? 15 : 5, sourceItem.title || ''),
    findRelevantEvents(destId, keywords),
  ]);
  const groundingContext = buildGroundingContext(relevantPOIs, relevantEvents, destId);

  // Get the full original content text
  const originalBody = sourceItem.body_en || sourceItem.body_nl || sourceItem.body_de || sourceItem.body_es || '';
  if (!originalBody) {
    throw new Error('Source content item has no body text to repurpose');
  }

  // Extract key facts from the original for fact-checking
  const keyFacts = originalBody.substring(0, 800);

  const results = [];

  for (const platform of targetPlatforms) {
    const platformRules = PROMPT_PLATFORM_RULES[platform] || PROMPT_PLATFORM_RULES.facebook;
    const example = PLATFORM_EXAMPLES[platform] || '';

    const systemPrompt = `You are a top-tier ${platform} content specialist for a premium tourism platform.
You REWRITE content from scratch for ${platform} — you do NOT summarize, truncate, or slightly edit the original.

${toneInstruction}

${groundingContext}

YOUR MISSION: Create a COMPLETELY NEW ${platform} post inspired by the source content.
The output must feel native to ${platform} — as if a ${platform} specialist wrote it from scratch.
ONLY mention real places, restaurants, or businesses from the VERIFIED PLACES section above.

WHAT MAKES ${platform} CONTENT UNIQUE:
${platform === 'instagram' ? `- Opens with a powerful HOOK line (visible before "more" button) — emotional, evocative, or surprising
- Storytelling narrative — take the reader on a journey, use sensory language
- Personal tone ("we discovered", "you'll love")
- Emoji woven naturally into the narrative (not clustered)
- Hashtags on a SEPARATE line at the end with blank line before them
- Optimal length: 800-1500 characters for maximum engagement` :
platform === 'facebook' ? `- Conversational, like talking to a friend over coffee
- Opens with a question or relatable statement to drive comments
- Short paragraphs (2-3 sentences max)
- Includes a clear call-to-action (tag someone, share your experience)
- Moderate emoji use, natural placement
- Optimal length: 100-250 characters for posts, up to 500 with engagement` :
platform === 'linkedin' ? `- Professional, insightful, value-driven thought leadership
- Opens with a bold statement or industry insight
- Data-driven when possible — mention numbers, percentages, trends
- Short paragraphs with line breaks for readability
- Minimal emoji (0-2 max), professional tone
- Ends with a question to encourage professional discussion
- Hashtags at the very end (3-5 relevant industry hashtags)` :
platform === 'x' ? `- Ultra-concise, every word counts — 280 char HARD limit
- Punchy, witty, or provocative opening
- One core message only — no fluff
- Hashtags woven INTO the text (1-2 max), not appended
- No emoji overload — 0-1 max
- Think headline + hook, not article` :
platform === 'tiktok' ? `- Gen-Z friendly, trendy slang OK
- "POV:" or "When you..." format works well
- Ultra-short: 100-150 chars max
- Trending hashtags are essential
- Casual, fun, spontaneous vibe` :
platform === 'youtube' ? `- SEO-rich description with keywords in first 2 lines
- Timestamp format if applicable
- Include relevant links and subscribe CTA
- Longer, detailed, informative
- Hashtags at the end (up to 15)` :
platform === 'pinterest' ? `- Aspirational, dreamy, inspirational language
- Keyword-rich for Pinterest search discovery
- Descriptive: paint a picture the reader wants to save
- Actionable: "Save for later", "Add to your travel board"
- No excessive emoji — clean, elegant` :
`- Write naturally for ${platform}'s audience`}

${example ? `\nHERE IS AN EXAMPLE of excellent ${platform} content (DO NOT copy this — use it as style reference only):\n---\n${example}\n---\n` : ''}

STRICT PLATFORM RULES:
- Maximum ${platformRules.maxChars} characters (ABSOLUTE LIMIT — count carefully)
- Emoji: ${platformRules.emojiCount} (natural placement, not forced)
- Hashtags: ${platformRules.maxHashtags > 0 ? `max ${platformRules.maxHashtags}, position: ${platformRules.hashtagPosition}` : 'none'}

ABSOLUTE RULES:
- Write as PLAIN TEXT ready to paste directly into ${platform}
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER include labels like CAPTION:, POST:, HOOK:, CTA:, TITLE:
- ALL facts must come from the original content — do NOT invent new information
- EU AI Act: this is AI-generated content for a tourism platform
${keywords.length > 0 ? `- Weave these keywords naturally: ${keywords.join(', ')}` : ''}

Return ONLY the post text. Nothing else. No quotes around it.`;

    const userPrompt = `REWRITE this content as a native ${platform} post.
Do NOT summarize or truncate. Create something NEW that a ${platform} expert would write.

SOURCE TITLE: ${sourceItem.title || 'Untitled'}

KEY FACTS FROM SOURCE (must remain accurate):
${keyFacts}

FULL SOURCE:
${originalBody.substring(0, 3000)}

Write your ${platform} post now. Maximum ${platformRules.maxChars} characters. Start directly.`;

    try {
      let content = await embeddingService.generateChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.8, // Higher temp for more creative differentiation
          maxTokens: 1500,
        }
      );

      // Sanitize output
      content = sanitizeContent(content, 'social_post', platform);
      content = formatForPlatform(content, platform);

      // Strict character limit enforcement — retry up to 2 times
      let retryCount = 0;
      while (platformRules.maxChars && content.length > platformRules.maxChars && retryCount < 2) {
        retryCount++;
        logger.info(`[Repurpose] ${platform} output ${content.length}/${platformRules.maxChars} chars — retry ${retryCount}`);
        const retryContent = await embeddingService.generateChatCompletion(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `REWRITE for ${platform}. CRITICAL: You MUST stay under ${platformRules.maxChars} characters. Your previous attempt was ${content.length} characters — TOO LONG.

Key message from source: ${sourceItem.title}
Key facts: ${keyFacts.substring(0, 500)}

Write a SHORTER, punchier ${platform} post. ${platformRules.maxChars} chars MAX. Start directly.` },
          ],
          { temperature: 0.5, maxTokens: 800 }
        );
        content = sanitizeContent(retryContent, 'social_post', platform);
        content = formatForPlatform(content, platform);
      }

      // Final hard truncation safety net (should rarely trigger after retries)
      if (platformRules.maxChars && content.length > platformRules.maxChars) {
        logger.warn(`[Repurpose] ${platform} still over limit after retries (${content.length}/${platformRules.maxChars}) — hard truncating`);
        const truncAt = content.lastIndexOf(' ', platformRules.maxChars - 4);
        content = content.substring(0, truncAt > platformRules.maxChars * 0.7 ? truncAt : platformRules.maxChars - 4) + '...';
      }

      // Generate platform-appropriate hashtags if not already included
      let hashtags = [];
      if (platformRules.maxHashtags > 0) {
        const existingHashtags = (content.match(/#[a-zA-Z0-9\u00C0-\u024F]+/g) || []).length;
        if (existingHashtags === 0) {
          hashtags = generateHashtags(keywords, platform);
        }
      }

      // SEO analysis for the repurposed content
      let seoScore = null;
      try {
        const seoResult = await analyzeContent(
          { title: sourceItem.title, body_en: content, seo_data: {}, content_type: 'social_post', keyword_cluster: keywords },
          destId
        );
        seoScore = seoResult.overallScore;
      } catch { /* SEO analysis is optional for repurposed content */ }

      const result = {
        title: sourceItem.title,
        body_en: content,
        content_type: 'social_post',
        target_platform: platform,
        ai_model: modelName,
        ai_generated: true,
        keyword_cluster: keywords,
        hashtags,
        source_content_id: sourceItem.id,
        poi_id: sourceItem.poi_id,
        seo_score: seoScore,
        char_count: content.length,
        char_limit: platformRules.maxChars,
      };

      results.push(result);
      logger.info(`[Repurpose] ${platform}: ${content.length}/${platformRules.maxChars} chars, SEO: ${seoScore || 'N/A'}`);
    } catch (error) {
      logger.error(`[Repurpose] Failed for ${platform}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Generate fresh content from title only — used when repurposing an item that has no body text.
 * Creates platform-optimized content based on title + brand context.
 *
 * @param {Object} sourceItem - Source content item (title required, body may be empty)
 * @param {string[]} targetPlatforms - Target platforms
 * @param {number} destinationId
 * @returns {Array} Generated content items
 */
export async function generateFromTitle(sourceItem, targetPlatforms, destinationId) {
  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }
  if (!embeddingService.isConfigured) {
    throw new Error('Mistral AI client not configured — check MISTRAL_API_KEY');
  }

  const destId = destinationId || sourceItem.destination_id;
  const toneInstruction = await buildToneInstruction(destId);
  const modelName = embeddingService.chatModel || 'mistral-small-latest';
  const title = sourceItem.title || 'Untitled';

  const results = [];

  for (const platform of targetPlatforms) {
    const platformRules = PROMPT_PLATFORM_RULES[platform] || PROMPT_PLATFORM_RULES.facebook;
    const example = PLATFORM_EXAMPLES[platform] || '';

    try {
      const prompt = `You are a professional social media content creator.

TASK: Write a ${platform} post for the topic: "${title}"

PLATFORM RULES:
${platformRules.prompt || ''}
Maximum characters: ${platformRules.maxChars || 2200}

${example ? `EXAMPLE of good ${platform} content:
${example}
` : ''}

${toneInstruction}

STRICT FORMATTING RULES:
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER use bold markers (**text**) or italic markers (*text*)
- NEVER use bullet points (- or *) or numbered lists (1. 2. 3.)
- NEVER use em-dashes (—) or en-dashes (–)
- Write in plain flowing text with natural paragraphs
- Include relevant hashtags (3-8 depending on platform) at the end
- Use appropriate emojis for the platform
- Keep within character limits
- Write in the same language as the title
- Do NOT invent dates, locations, or details not in the title

OUTPUT: Write ONLY the post content. No labels, no explanations, no metadata.`;

      const response = await embeddingService.client.chat.complete({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: platformRules.maxChars ? Math.min(platformRules.maxChars, 2000) : 1000,
      });

      let content = (response.choices?.[0]?.message?.content || '').trim();
      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Sanitize + format — same pipeline as all other generation functions
      content = sanitizeContent(content, 'social_post', platform);
      content = formatForPlatform(content, platform);

      results.push({
        title,
        body_en: content,
        content_type: 'social_post',
        target_platform: platform,
        ai_model: modelName,
        hashtags: [],
        source_content_id: sourceItem.id,
        seo_score: null,
        char_count: content.length,
        char_limit: platformRules.maxChars,
      });
      logger.info(`[GenerateFromTitle] ${platform}: ${content.length}/${platformRules.maxChars || '?'} chars for "${title}"`);
    } catch (error) {
      logger.error(`[GenerateFromTitle] Failed for ${platform}:`, error);
      throw error;
    }
  }

  return results;
}

export default { generateContent, generateSuggestions, improveExistingContent, generateAlternative, generateFromPOI, repurposeContent, generateFromTitle };
