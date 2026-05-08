/**
 * Unified Search Route — VII-E2 Batch A, Block A1
 *
 * GET /api/v1/search?q=strand&types=pois,events,articles&limit=10&lang=en
 *
 * Searches across POIs, Events, and Articles in a single request.
 * Returns merged results sorted by relevance, plus chatbot fallback prompt
 * when no results are found (option c — Frank-approved).
 *
 * @module routes/search
 * @version 1.0.0
 */

import express from 'express';
import { searchPois, searchEvents, searchArticles, logSearchEvent } from '../services/search/searchService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Destination ID mapping (same as other public routes)
const DESTINATION_CODES = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };

function getDestinationId(req) {
  const headerValue = req.headers['x-destination-id'];
  if (!headerValue) return 1;
  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;
  return DESTINATION_CODES[headerValue.toLowerCase()] || 1;
}

function getLanguage(req) {
  const lang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
  return ['en', 'nl', 'de', 'es'].includes(lang) ? lang : 'en';
}

// Chatbot names per destination (from CLAUDE.md)
const CHATBOT_NAMES = { 1: 'HoliBot', 2: 'Tessa', 3: 'HoliBot', 4: 'Wijze Warre' };

/**
 * GET /api/v1/search
 * Unified search across POIs, Events, and Articles.
 */
router.get('/', async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const lang = getLanguage(req);
    const { q, types = 'pois,events,articles', limit = 10 } = req.query;

    // Validate query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Search query must be at least 2 characters.',
      });
    }

    const sanitizedQuery = q.trim().substring(0, 200); // Cap at 200 chars
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50); // 1-50
    const requestedTypes = types.split(',').map(t => t.trim().toLowerCase());

    // Execute searches in parallel
    const [pois, events, articles] = await Promise.all([
      requestedTypes.includes('pois') ? searchPois(destinationId, sanitizedQuery, parsedLimit, lang) : [],
      requestedTypes.includes('events') ? searchEvents(destinationId, sanitizedQuery, parsedLimit, lang) : [],
      requestedTypes.includes('articles') ? searchArticles(destinationId, sanitizedQuery, parsedLimit, lang) : [],
    ]);

    // Merge and sort by relevance
    const merged = [...pois, ...events, ...articles]
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, parsedLimit);

    const totalResults = pois.length + events.length + articles.length;

    // Chatbot fallback prompt (option c)
    const chatbotName = CHATBOT_NAMES[destinationId] || 'HoliBot';
    let suggestedChatbotPrompt = null;
    if (totalResults === 0) {
      const prompts = {
        en: `Looking for "${sanitizedQuery}"? Ask ${chatbotName} for personal recommendations.`,
        nl: `Zoek je "${sanitizedQuery}"? Vraag het aan ${chatbotName} voor persoonlijke tips.`,
        de: `Suchst du "${sanitizedQuery}"? Frag ${chatbotName} nach persoenlichen Empfehlungen.`,
        es: `Buscas "${sanitizedQuery}"? Pregunta a ${chatbotName} para recomendaciones personales.`,
      };
      suggestedChatbotPrompt = prompts[lang] || prompts.en;
    }

    // Log for analytics (fire-and-forget)
    logSearchEvent(destinationId, sanitizedQuery, totalResults).catch(() => {});

    res.json({
      query: sanitizedQuery,
      total: totalResults,
      pois,
      events,
      articles,
      merged,
      suggested_chatbot_prompt: suggestedChatbotPrompt,
    });
  } catch (error) {
    logger.error('[Search] Unified search error:', error.message);
    res.status(500).json({ error: 'Search failed', message: 'An error occurred while searching.' });
  }
});

export default router;
