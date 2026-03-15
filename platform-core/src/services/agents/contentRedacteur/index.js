/**
 * De Redacteur Agent (#23) — Content Generation Agent
 * Orchestrates AI content creation: suggestion → generation → translation → formatting.
 * On-demand only (no cron schedule) — triggered via Admin Portal API.
 *
 * @version 1.0.0
 */

import BaseAgent from '../base/BaseAgent.js';
import { generateContent, generateSuggestions, improveExistingContent } from './contentGenerator.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import logger from '../../../utils/logger.js';

class ContentRedacteurAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Redacteur',
      version: '1.0.0',
      category: 'content',
      destinationAware: true,
    });
  }

  /**
   * Generate content suggestions from trending data
   * @param {number} destinationId
   * @param {Array} trendingKeywords - Top trending keywords
   * @returns {Array} Generated suggestions
   */
  async generateSuggestionsForDestination(destinationId, trendingKeywords) {
    try {
      const suggestions = await generateSuggestions(trendingKeywords, destinationId);

      await logAgent('redacteur', destinationId, 'suggestions-generated', {
        count: suggestions.length,
        types: suggestions.map(s => s.content_type),
      });

      return suggestions;
    } catch (error) {
      await logError('redacteur', destinationId, 'suggestions-generation', error);
      throw error;
    }
  }

  /**
   * Generate a content item from an approved suggestion
   * @param {Object} suggestion - Approved content suggestion
   * @param {Object} options - { destinationId, contentType, platform, languages }
   * @returns {Object} Generated content with translations
   */
  async generateContentItem(suggestion, options = {}) {
    const { destinationId } = options;

    try {
      const content = await generateContent(suggestion, options);

      await logAgent('redacteur', destinationId, 'content-generated', {
        title: content.title,
        contentType: content.content_type,
        platform: content.target_platform,
        ai_model: content.ai_model,
        hasTranslations: Object.keys(content).filter(k => k.startsWith('body_') && k !== 'body_en').length,
      });

      return content;
    } catch (error) {
      await logError('redacteur', destinationId, 'content-generation', error);
      throw error;
    }
  }

  /**
   * Improve an existing content item — SEO check → AI rewrite → re-check until ≥65/100
   * @param {Object} contentItem - DB content item row
   * @returns {Object} { improved, original_score, final_score, title, body_en, ... }
   */
  async improveContentItem(contentItem) {
    const destinationId = contentItem.destination_id;
    try {
      const result = await improveExistingContent(contentItem);

      await logAgent('redacteur', destinationId, 'content-improved', {
        itemId: contentItem.id,
        improved: result.improved,
        originalScore: result.original_score,
        finalScore: result.final_score || result.seo_score,
      });

      return result;
    } catch (error) {
      await logError('redacteur', destinationId, 'content-improvement', error);
      throw error;
    }
  }

  /**
   * BaseAgent runForDestination — not used directly (agent is on-demand)
   * but needed for registry compatibility
   */
  async runForDestination(destinationId) {
    logger.info(`[De Redacteur] On-demand agent — no scheduled run for destination ${destinationId}`);
    return {
      status: 'on-demand',
      message: 'De Redacteur runs on-demand via Admin Portal, not on schedule',
      destinationId,
    };
  }
}

const contentRedacteurAgent = new ContentRedacteurAgent();
export default contentRedacteurAgent;
