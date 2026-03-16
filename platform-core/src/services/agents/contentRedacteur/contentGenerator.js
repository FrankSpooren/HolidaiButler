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
import logger from '../../../utils/logger.js';

const SEO_MINIMUM_SCORE = 80;

/**
 * Platform-specific prompt rules for social content generation
 */
const PROMPT_PLATFORM_RULES = {
  facebook: {
    maxChars: 500,
    rules: 'Optimal length 100-250 characters. Can be longer. Conversational, engaging.',
    emojiCount: '2-4',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  instagram: {
    maxChars: 2200,
    rules: 'First sentence is the hook (visible before "more"). Storytelling style. Separate hashtags with blank line at end.',
    emojiCount: '3-6',
    hashtagPosition: 'end_separated',
    maxHashtags: 15,
  },
  linkedin: {
    maxChars: 3000,
    rules: 'Professional tone. Insightful, value-driven. No emoji overload. Hashtags at end, max 5.',
    emojiCount: '0-2',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  x: {
    maxChars: 280,
    rules: 'Ultra-concise. Punchy. Weave 1-2 hashtags into text, not at end.',
    emojiCount: '0-1',
    hashtagPosition: 'inline',
    maxHashtags: 2,
  },
  tiktok: {
    maxChars: 150,
    rules: 'Youth-oriented, trendy. Super short caption. Hashtags at end.',
    emojiCount: '1-3',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  youtube: {
    maxChars: 5000,
    rules: 'Description with timestamps if relevant. Include links. SEO-rich.',
    emojiCount: '1-3',
    hashtagPosition: 'end',
    maxHashtags: 15,
  },
  pinterest: {
    maxChars: 500,
    rules: 'Descriptive, aspirational. Include relevant keywords naturally for Pinterest search.',
    emojiCount: '0-2',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  snapchat: {
    maxChars: 80,
    rules: 'Ultra-short. No hashtags. Casual.',
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
  const keywords = suggestion.keyword_cluster || [];
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  // Build the generation prompt — clean output, no markdown
  const systemPrompt = buildSystemPrompt(contentType, platform, toneInstruction, keywords);
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

    // Extract title and body from generated content
    const { title, body, metaDescription } = parseGeneratedContent(content, suggestion.title);

    // Sanitize — safety net strips any remaining markdown artifacts
    const sanitizedBody = sanitizeContent(body, contentType, platform);

    // Format for target platform
    const formattedBody = formatForPlatform(sanitizedBody, platform);

    // Generate hashtags for social platforms
    const hashtags = platform !== 'website' ? generateHashtags(keywords, platform) : [];

    // Build result object
    let result = {
      title,
      body_en: formattedBody,
      meta_description: metaDescription,
      hashtags,
      ai_model: modelName,
      ai_generated: true,
      content_type: contentType,
      target_platform: platform,
      keyword_cluster: keywords,
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
      const improved = await improveContent(result, seoResult, { destinationId, contentType, keywords });
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
    const targetLangs = (languages.length > 0 ? languages : getLanguages(destinationId))
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

  const toneInstruction = await buildToneInstruction(destinationId);

  const systemPrompt = `You are a content strategist for a premium tourism platform.
Analyze trending keywords and suggest content ideas.

${toneInstruction}

Return a JSON array of content suggestions. Each suggestion must have:
- "title": engaging content title (in English)
- "summary": 2-3 sentence description of the proposed content
- "content_type": "blog" | "social_post" | "video_script"
- "suggested_channels": array of platforms (e.g. ["website", "instagram", "facebook"])
- "keyword_cluster": array of related keywords from the input
- "engagement_score": estimated score 1-10 based on trend strength

Generate 3-6 suggestions, mixing content types. Focus on the strongest trends.`;

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
function buildSystemPrompt(contentType, platform, toneInstruction, keywords) {
  const keywordsStr = keywords.length > 0
    ? `Target keywords (MUST appear in text): ${keywords.map(k => `"${k}"`).join(', ')}`
    : '';

  const base = `You are an enterprise-grade content writer for a premium tourism platform.

${toneInstruction}

ABSOLUTE RULES:
- Write original, high-quality content — NO plagiarism
- Facts must be accurate — do NOT hallucinate attractions, events, or statistics
- Preserve proper nouns (POI names, street names, local terms)
- EU AI Act compliance: this is AI-generated content for a tourism platform
- Language: write in English first (translations handled separately)`;

  if (contentType === 'social_post') {
    const platformRules = PROMPT_PLATFORM_RULES[platform] || PROMPT_PLATFORM_RULES.facebook;
    return `${base}

CRITICAL FORMATTING RULES:
- Write as PLAIN TEXT ready to paste directly into ${platform}
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER include labels like CAPTION:, POST:, HOOK:, CTA:, TITLE:
- ${platformRules.rules}
- Include ${platformRules.emojiCount} relevant emoji naturally in the text
- End with a call-to-action
${keywordsStr}

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

  // Blog
  return `${base}

CRITICAL FORMATTING RULES:
- Write in clean, flowing prose paragraphs ONLY
- NEVER use markdown: no **, no ##, no ---, no \`, no [](), no >
- NEVER include labels like TITLE:, META:, INTRODUCTION:, CONCLUSION:, HOOK:
- Start directly with the first paragraph. No headers.
- Use natural paragraph breaks (blank line) between sections
- Do NOT use bullet points or numbered lists with special characters
- Target: 800-1500 words
- Include factual details: opening hours, prices, locations where relevant
- End with a natural call-to-action paragraph
${keywordsStr}

Return ONLY the article text. Nothing before it. Nothing after it.`;
}

/**
 * Build the user prompt — clean output, no labels, no markdown
 */
function buildUserPrompt(suggestion, contentType, platform, keywords) {
  const keywordsStr = keywords.length > 0 ? `\nKeywords to incorporate naturally: ${keywords.join(', ')}` : '';
  const context = suggestion.summary ? `\nContext: ${suggestion.summary}` : '';

  switch (contentType) {
    case 'blog':
      return `Write a tourism blog article about "${suggestion.title}".${context}${keywordsStr}

Start directly with the first paragraph. Write 800-1500 words of flowing prose.
End with a natural call-to-action paragraph.
Do NOT include a title, meta description, or any labels. Just the article body.`;

    case 'social_post':
      return `Write a ${platform} post about "${suggestion.title}".${context}${keywordsStr}

Start with a scroll-stopping opening line. Keep it conversational.
Do NOT prefix with any label. Just the post text, ready to copy-paste.`;

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

  // Extract TITLE: if Mistral still includes it (backward compat)
  const titleMatch = content.match(/^TITLE:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    body = content.replace(titleMatch[0], '').trim();
  }

  // Extract META: if present
  const metaMatch = body.match(/^META:\s*(.+)$/m);
  if (metaMatch) {
    metaDescription = metaMatch[1].trim();
    body = body.replace(metaMatch[0], '').trim();
  }

  // Strip any remaining label prefixes the sanitizer will also catch
  body = body.replace(/^(INTRODUCTION|CONCLUSION|BODY|OPENING|CLOSING|SUMMARY)\s*[:：]\s*/gim, '');

  return { title, body, metaDescription };
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
  const { destinationId, contentType, keywords = [] } = options;
  const MAX_ROUNDS = 1; // Single surgical round — first generation should already score high
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

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

    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken — preserve everything that scores 10/10.

${toneInstruction}

CRITICAL FORMATTING RULES:
- NEVER use markdown: no **, no ##, no ---, no \`, no []()
- NEVER include labels like TITLE:, META:, INTRODUCTION: — just the clean text
- Write clean, flowing prose only
- Return the COMPLETE improved content (not just the changes)
- DO NOT change aspects that already score 10/10 — only fix failing metrics
- Do NOT add disclaimers or explanations — return ONLY the improved content`;

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
      currentBody = sanitizeContent(parsed.body, contentType, 'website');
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

  const improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords });

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

YOUR MISSION: Create a COMPLETELY NEW ${platform} post inspired by the source content.
The output must feel native to ${platform} — as if a ${platform} specialist wrote it from scratch.

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

export default { generateContent, generateSuggestions, improveExistingContent, generateFromPOI, repurposeContent };
