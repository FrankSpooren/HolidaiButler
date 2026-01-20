/**
 * Search Service - MySQL-based POI Search
 * Converted from TypeScript Widget API (ChromaDB → MySQL)
 */

const db = require('../../config/database');
const mistralService = require('./mistralService');
const logger = require('../../utils/logger');

class SearchService {
  /**
   * Search POIs based on user query
   * @param {string} query - User query
   * @param {string} sessionId - Session ID
   * @param {Object} context - Session context (optional)
   * @returns {Promise<Object>} - Search results
   */
  async searchPOIs(query, sessionId, context = null) {
    try {
      logger.info(`Searching POIs for query: "${query}"`);

      // 1. Analyze intent with Mistral
      const intent = await mistralService.analyzeIntent(query, context);
      logger.info(`Intent: ${intent.primaryIntent}, Category: ${intent.category || 'Any'}`);

      // 2. Build MySQL query
      const { sqlQuery, params } = this.buildSearchQuery(query, intent);

      // 3. Execute search
      const [pois] = await db.pool.query(sqlQuery, params);
      logger.info(`Found ${pois.length} POIs from database`);

      // 4. Rank results with Mistral (if many results)
      const rankedPOIs = pois.length > 20 ?
        await this.rankWithMistral(pois, query, intent) :
        pois.map((poi, i) => ({ ...poi, relevanceScore: 1 - (i / pois.length) }));

      // 5. Generate natural language response
      const textResponse = await mistralService.generateResponse({
        pois: rankedPOIs.slice(0, 10),
        query,
        intent
      });

      return {
        pois: rankedPOIs.slice(0, 20),
        textResponse,
        intent,
        totalResults: pois.length
      };

    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Build MySQL search query based on intent
   */
  buildSearchQuery(query, intent) {
    let sqlQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.subcategory,
        p.address,
        p.latitude,
        p.longitude,
        p.website,
        p.phone,
        p.opening_hours as openingHours,
        p.enriched_tile_description as tileDescription,
        p.enriched_detail_description as detailDescription,
        p.rating,
        p.review_count as reviewCount,
        p.price_level as priceLevel
      FROM POI p
      WHERE p.is_active = TRUE
    `;

    const params = [];

    // Apply category filter
    if (intent.category) {
      sqlQuery += ` AND p.category = ?`;
      params.push(intent.category);
    }

    // Apply text search (name, description, enriched content)
    if (intent.searchTerms && intent.searchTerms.length > 0) {
      const searchTerm = intent.searchTerms.join(' ');
      sqlQuery += ` AND (
        p.name LIKE ? OR
        p.description LIKE ? OR
        p.enriched_tile_description LIKE ? OR
        p.enriched_detail_description LIKE ? OR
        p.subcategory LIKE ?
      )`;
      const pattern = `%${searchTerm}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    // Apply dietary restrictions (check amenities/tags)
    if (intent.dietaryRestrictions && intent.dietaryRestrictions.length > 0) {
      intent.dietaryRestrictions.forEach(restriction => {
        sqlQuery += ` AND (p.amenities LIKE ? OR p.tags LIKE ?)`;
        const pattern = `%${restriction}%`;
        params.push(pattern, pattern);
      });
    }

    // Order results
    sqlQuery += `
      ORDER BY
        p.rating DESC,
        p.review_count DESC
      LIMIT 100`;

    logger.debug(`SQL Query: ${sqlQuery}`);
    logger.debug(`Params: ${JSON.stringify(params)}`);

    return { sqlQuery, params };
  }

  /**
   * Rank POIs with Mistral AI (semantic scoring)
   * @param {Array} pois - Array of POIs
   * @param {string} query - User query
   * @param {Object} intent - Detected intent
   * @returns {Promise<Array>} - Ranked POIs
   */
  async rankWithMistral(pois, query, intent) {
    try {
      logger.info(`Ranking ${pois.length} POIs with Mistral AI...`);

      // Build ranking prompt
      const systemPrompt = `You are a travel expert. Rank these places by relevance to the user query.
Return a JSON array of IDs in order of relevance (most relevant first).`;

      const userPrompt = `User query: "${query}"

Places to rank:
${pois.map((p, i) =>
  `${i + 1}. ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Description: ${(p.description || p.tileDescription || '').substring(0, 100)}...`
).join('\n')}

Respond with JSON array of IDs only: ["id1", "id2", ...]`;

      const response = await mistralService.client.chat.complete({
        model: mistralService.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      const rankedIds = typeof content === 'string' ? JSON.parse(content) : content;

      // Reorder POIs based on Mistral ranking
      const rankedPOIs = [];
      const idsArray = rankedIds.ids || rankedIds;

      for (const id of idsArray) {
        const poi = pois.find(p => p.id.toString() === id.toString());
        if (poi) {
          rankedPOIs.push({ ...poi, relevanceScore: 1 - (rankedPOIs.length / idsArray.length) });
        }
      }

      // Add remaining POIs that weren't ranked
      for (const poi of pois) {
        if (!rankedPOIs.find(p => p.id === poi.id)) {
          rankedPOIs.push({ ...poi, relevanceScore: 0.3 });
        }
      }

      logger.info(`Ranked ${rankedPOIs.length} POIs successfully`);
      return rankedPOIs;

    } catch (error) {
      logger.error('Mistral ranking failed, using original order:', error);
      // Fallback: return original order with decreasing scores
      return pois.map((poi, i) => ({ ...poi, relevanceScore: 1 - (i / pois.length) }));
    }
  }

  /**
   * Handle follow-up questions using previous results
   * @param {string} query - Follow-up query
   * @param {Array} previousResults - Previously displayed POIs
   * @param {Object} intent - Detected intent
   * @returns {Array} - Filtered POIs
   */
  handleFollowUp(query, previousResults, intent) {
    logger.info(`Handling follow-up question: "${query}"`);
    logger.info(`Previous results available: ${previousResults.length}`);

    if (!previousResults || previousResults.length === 0) {
      logger.warn('No previous results available for follow-up');
      return [];
    }

    const queryLower = query.toLowerCase();
    let targetPOI = null;

    // Detect positional references (first, second, etc.)
    if (queryLower.includes('first') || queryLower.includes('1st')) {
      targetPOI = previousResults[0];
    } else if (queryLower.includes('second') || queryLower.includes('2nd')) {
      targetPOI = previousResults[1];
    } else if (queryLower.includes('third') || queryLower.includes('3rd')) {
      targetPOI = previousResults[2];
    } else if (queryLower.includes('last')) {
      targetPOI = previousResults[previousResults.length - 1];
    }

    // If no positional reference, use all previous results
    const results = targetPOI ? [targetPOI] : previousResults;

    logger.info(`Follow-up resolved to ${results.length} POI(s)`);
    return results.map(poi => ({ ...poi, relevanceScore: 1.0 }));
  }
}

module.exports = new SearchService();
