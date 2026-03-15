/**
 * Content Generator — Mistral AI content creation engine
 * Generates blog posts, social posts, and video scripts using Mistral AI.
 * Reuses embeddingService.generateChatCompletion() for LLM calls.
 *
 * @version 2.0.0 — Auto-improve: SEO check → AI rewrite → re-check until ≥65/100
 */

import embeddingService from '../../holibot/embeddingService.js';
import { buildToneInstruction, getLanguages } from './toneOfVoice.js';
import { buildFormatInstruction, formatForPlatform, generateHashtags, getContentSpec } from './contentFormatter.js';
import { translateTexts } from '../../translationService.js';
import { analyzeContent } from '../seoMeester/seoAnalyzer.js';
import logger from '../../../utils/logger.js';

const SEO_MINIMUM_SCORE = 80;

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

  // Build the generation prompt with SEO scoring criteria embedded
  const seoGuidance = buildSeoGuidance(contentType, keywords);

  const systemPrompt = `You are an enterprise-grade content writer for a premium tourism platform.
You write high-performing, SEO-optimized content that scores ≥80/100 on quality audits.

${toneInstruction}

${formatInstruction}

${seoGuidance}

RULES:
- Write original, high-quality content — NO plagiarism
- MUST include ALL target keywords at least once, naturally woven into the text
- Facts must be accurate — do NOT hallucinate attractions, events, or statistics
- Preserve proper nouns (POI names, street names, local terms)
- EU AI Act compliance: this is AI-generated content for a tourism platform
- Language: write in English first (translations handled separately)`;

  const userPrompt = buildUserPrompt(suggestion, contentType, keywords);

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

    // Format for target platform
    const formattedBody = formatForPlatform(body, platform);

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
 * Build SEO guidance section — tells Mistral exactly what the quality audit scores
 * This is the key innovation: the generation prompt mirrors the scoring criteria
 */
function buildSeoGuidance(contentType, keywords) {
  const keywordsStr = keywords.length > 0
    ? `Target keywords (MUST appear in text): ${keywords.map(k => `"${k}"`).join(', ')}`
    : '';

  if (contentType === 'social_post') {
    return `QUALITY SCORING CRITERIA (your content will be scored on these 7 metrics — aim for 10/10 on each):

1. CAPTION LENGTH (10pts): Total post must be 80-300 characters. Sweet spot: ~150-250 chars.
2. HASHTAGS (10pts): Include exactly 3-8 hashtags at the end. Use targeted, specific tags.
3. CALL-TO-ACTION (10pts): Include 2+ CTA elements (verbs like "discover", "explore", "book", "visit", "tag", "share" + directional emojis like 👉 ⬇️ ➡️).
4. EMOJI USAGE (10pts): Include 1-5 emojis naturally in the text. Not more than 1 per 10 words.
5. KEYWORD PRESENCE (10pts): At least 50% of target keywords MUST appear in the text.
   ${keywordsStr}
6. READABILITY (10pts): Use short sentences (avg <15 words). Easy to scan. Conversational tone.
7. OPENING HOOK (10pts): First line must be a question, number, bold claim, or attention-grabber. Start with "Did you know", "Ever wondered", "Top 3", a surprising fact, or an emoji.`;
  }

  if (contentType === 'video_script') {
    return `QUALITY SCORING CRITERIA (your content will be scored on these 7 metrics — aim for 10/10 on each):

1. VIDEO HOOK (10pts): First line must be attention-grabbing (question, "Imagine...", bold statement). You have 3 seconds.
2. SCRIPT STRUCTURE (10pts): Include 3+ scene markers ("[Scene 1]", "Intro:", "B-roll:") AND timing cues ("0:00-0:05", "10s", "15 seconds").
3. CALL-TO-ACTION (10pts): Include 2+ CTA elements ("subscribe", "visit", "book", "check out", "link in description").
4. SCRIPT LENGTH (10pts): 200-800 words total.
5. KEYWORD PRESENCE (10pts): At least 50% of target keywords MUST appear in the text.
   ${keywordsStr}
6. READABILITY (10pts): Conversational, spoken-word tone. Short sentences. Easy to narrate.
7. VISUAL CUES (10pts): Include 4+ visual directions ("Show:", "Cut to:", "Close-up:", "Wide shot:", "B-roll:", "Zoom:", "Overlay:", "Text on screen:").`;
  }

  // Blog
  return `QUALITY SCORING CRITERIA (your content will be scored on these 7 metrics — aim for 10/10 on each):

1. TITLE LENGTH (10pts): 50-60 characters (optimal for search engines).
2. META DESCRIPTION (10pts): 150-160 characters, compelling, includes primary keyword.
3. HEADING STRUCTURE (10pts): Use H2 headings (min 2), H3 headings (min 1). Only 1 H1 (the title). Proper hierarchy.
4. KEYWORD DENSITY (10pts): Average keyword density 0.5-3%. Use each keyword 2-4 times naturally.
   ${keywordsStr}
5. READABILITY (10pts): Flesch-Kincaid score ≥50. Use varied sentence lengths, avg <20 words. Break paragraphs every 3-4 sentences.
6. CONTENT LENGTH (10pts): 800-1500 words.
7. INTERNAL LINKS (10pts): Include 2+ markdown links to related content (e.g., [Peñón de Ifach](/poi/123), [local restaurants](/explore/restaurants)).`;
}

/**
 * Build the user prompt based on content type — SEO-aware
 */
function buildUserPrompt(suggestion, contentType, keywords) {
  const keywordsStr = keywords.length > 0 ? `Target keywords that MUST appear: ${keywords.join(', ')}` : '';

  switch (contentType) {
    case 'blog':
      return `Write a blog post about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

Write the full blog post with:
1. An engaging title of 50-60 characters (prefix with "TITLE: ")
2. A meta description of exactly 150-160 characters (prefix with "META: ")
3. The full body (800-1500 words) with H2/H3 headings, each keyword used 2-4 times
4. Include 2+ internal links as markdown [text](/path)`;

    case 'social_post':
      return `Write a social media post about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

STRICT REQUIREMENTS — your post will be scored on each:
1. First line: a scroll-stopping hook (question/number/bold claim + emoji). Prefix with "TITLE: "
2. Post body: 80-300 characters total (this is CRITICAL — count carefully)
3. Include 2-4 emojis naturally woven into the text
4. Include 2+ call-to-action words (discover, explore, book, visit, tag, share) + use 👉 or ➡️
5. End with exactly 5 relevant hashtags (e.g., #Calpe #CostaBlanca #Mediterranean #Travel #Spain)
6. Each target keyword must appear at least once in the text
7. Use short, punchy sentences (max 12 words each)`;

    case 'video_script':
      return `Write a video script about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

STRICT REQUIREMENTS — your script will be scored on each:
1. Opening hook (first line): attention-grabbing question or bold statement. Prefix with "TITLE: "
2. Structure with 3-5 scenes using markers: [Scene 1: Description] (0:00-0:10)
3. Each scene: narration text + "Visual:" direction (show/cut to/close-up/B-roll/zoom)
4. Include timing for each scene (e.g., "0:00-0:05", "10 seconds")
5. End with CTA scene: "subscribe", "visit", "book now", "link in description"
6. Total: 200-800 words
7. Each target keyword must appear at least once`;

    default:
      return `Write content about: "${suggestion.title}"\n${keywordsStr}`;
  }
}

/**
 * Parse generated content to extract title, body, and meta description
 */
function parseGeneratedContent(content, fallbackTitle) {
  let title = fallbackTitle;
  let body = content;
  let metaDescription = '';

  // Extract TITLE:
  const titleMatch = content.match(/^TITLE:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    body = content.replace(titleMatch[0], '').trim();
  }

  // Extract META:
  const metaMatch = body.match(/^META:\s*(.+)$/m);
  if (metaMatch) {
    metaDescription = metaMatch[1].trim();
    body = body.replace(metaMatch[0], '').trim();
  }

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
    const seoGuidance = buildSeoGuidance(contentType, keywords);

    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken — preserve everything that scores 10/10.

${toneInstruction}

${seoGuidance}

CRITICAL RULES:
- Return the COMPLETE improved content (not just the changes)
- Prefix title with "TITLE: " on its own line
- Prefix meta description with "META: " on its own line (for blog only)
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
      currentBody = parsed.body;
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

export default { generateContent, generateSuggestions, improveExistingContent };
