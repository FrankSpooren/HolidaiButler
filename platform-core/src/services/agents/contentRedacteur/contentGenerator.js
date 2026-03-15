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

const SEO_MINIMUM_SCORE = 65;

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

  const toneInstruction = buildToneInstruction(destinationId);
  const formatInstruction = buildFormatInstruction(contentType, platform);
  const spec = getContentSpec(contentType);
  const keywords = suggestion.keyword_cluster || [];
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  // Build the generation prompt
  const systemPrompt = `You are a professional content writer for a premium tourism platform.
You write engaging, SEO-optimized content that inspires travelers.

${toneInstruction}

${formatInstruction}

RULES:
- Write original, high-quality content — NO plagiarism
- Use target keywords naturally (do NOT keyword-stuff)
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

  const toneInstruction = buildToneInstruction(destinationId);

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
 * Build the user prompt based on content type
 */
function buildUserPrompt(suggestion, contentType, keywords) {
  const keywordsStr = keywords.length > 0 ? `Target keywords: ${keywords.join(', ')}` : '';

  switch (contentType) {
    case 'blog':
      return `Write a blog post about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

Write the full blog post with:
1. An engaging title (prefix with "TITLE: ")
2. A meta description (prefix with "META: ", 150-160 chars)
3. The full body with H2/H3 headings`;

    case 'social_post':
      return `Write a social media post about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

Write an engaging social post with:
1. A scroll-stopping hook in the first line (prefix with "TITLE: ")
2. The main post body (engaging, personal tone, 80-300 chars ideal)
3. Include 1-3 relevant emojis naturally in the text
4. End with a clear call-to-action (e.g., "Discover more...", "Book now", "Tag someone who...")
5. Add 3-8 relevant hashtags at the end (e.g., #Calpe #CostaBlanca #TravelSpain)`;

    case 'video_script':
      return `Write a video script about: "${suggestion.title}"
${suggestion.summary ? `Context: ${suggestion.summary}` : ''}
${keywordsStr}

Write a storyboard-style script with:
1. A title (prefix with "TITLE: ")
2. 3-5 scenes, each with: [Scene N] description, narration text, visual notes, and estimated duration`;

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
  const MAX_ROUNDS = 2;
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
      .filter(c => c.status !== 'pass')
      .map(c => `- ${c.name} (${c.score}/${c.maxScore}): ${c.details}`)
      .join('\n');

    const toneInstruction = buildToneInstruction(destinationId);

    const systemPrompt = `You are a professional content optimizer for a premium tourism platform.
You receive content that scored below the quality threshold on specific metrics.
Your job: rewrite the content to FIX every failing metric while preserving the original message and style.

${toneInstruction}

CRITICAL RULES:
- Return the COMPLETE improved content (not just the changes)
- Prefix title with "TITLE: " on its own line
- Prefix meta description with "META: " on its own line (for blog only)
- Keep the same topic and message — only improve quality
- Do NOT add disclaimers or explanations — return ONLY the improved content`;

    const userPrompt = `The following ${contentType} content scored ${currentSeo.overallScore}/100 (minimum required: ${SEO_MINIMUM_SCORE}/100).

CURRENT TITLE: ${currentTitle}

CURRENT CONTENT:
${currentBody}

FAILING QUALITY CHECKS:
${failingChecks}

TARGET KEYWORDS: ${keywords.join(', ') || 'none specified'}

Rewrite this content to fix ALL failing checks. Return the complete improved version.`;

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
