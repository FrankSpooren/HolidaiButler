/**
 * Content Generator — Mistral AI content creation engine
 * Generates blog posts, social posts, and video scripts using Mistral AI.
 * Reuses embeddingService.generateChatCompletion() for LLM calls.
 *
 * @version 1.0.0
 */

import embeddingService from '../../holibot/embeddingService.js';
import { buildToneInstruction, getLanguages } from './toneOfVoice.js';
import { buildFormatInstruction, formatForPlatform, generateHashtags, getContentSpec } from './contentFormatter.js';
import { translateTexts } from '../../translationService.js';
import logger from '../../../utils/logger.js';

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
    const result = {
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

    // Translate to requested languages
    const targetLangs = (languages.length > 0 ? languages : getLanguages(destinationId))
      .filter(l => l !== 'en');

    if (targetLangs.length > 0) {
      const translations = await translateContent(title, formattedBody, targetLangs);
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
1. A hook in the first line (prefix with "TITLE: ")
2. The main post body (engaging, personal tone)
Include a call-to-action at the end.`;

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

export default { generateContent, generateSuggestions };
