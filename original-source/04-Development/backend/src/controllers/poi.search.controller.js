/**
 * POI Search Controller
 * =====================
 * Enterprise-grade search with FULLTEXT indexes
 * Implements: Search, Autocomplete, Relevance Scoring
 *
 * Features:
 * - FULLTEXT search with relevance scoring
 * - Autocomplete for typeahead
 * - Multi-field search (name + description)
 * - Category filtering in search results
 * - Minimum relevance threshold
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const { findClosestMatch, levenshteinDistance } = require('../utils/levenshtein');
const { highlightSearchResults } = require('../utils/highlight');

/**
 * GET /pois/search
 * Full-text search with relevance scoring
 *
 * Query params:
 * - q: Search query (required)
 * - category: Filter by category (optional)
 * - min_relevance: Minimum relevance score (default: 0.5)
 * - limit: Results per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
exports.searchPOIs = async (req, res, next) => {
  try {
    const {
      q: searchQuery,
      category,
      min_relevance = 0.5,
      limit = 20,
      offset = 0,
      fuzzy = 'true',  // Enable fuzzy matching by default
      fuzzy_threshold = 2,  // Maximum edit distance for fuzzy matches
      highlight = 'true'  // Enable search result highlighting
    } = req.query;

    const useFuzzy = fuzzy === 'true' || fuzzy === '1' || fuzzy === true;
    const useHighlight = highlight === 'true' || highlight === '1' || highlight === true;

    // Validation
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: 'Search query is required'
        }
      });
    }

    if (searchQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_QUERY_TOO_SHORT',
          message: 'Search query must be at least 2 characters'
        }
      });
    }

    // Sanitize search query (basic protection)
    const sanitizedQuery = searchQuery.trim().substring(0, 100);

    // Build search SQL with custom ranking algorithm
    // Custom ranking combines:
    // - FULLTEXT relevance (base score)
    // - Popularity score (normalized 0-100)
    // - Featured boost (2x multiplier for featured POIs)
    // - Rating boost (0-5 scale)
    // - Verified boost (small boost for verified POIs)
    let sql = `
      SELECT
        *,
        MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance,
        (
          MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE) * 10 +
          COALESCE(popularity_score, 0) * 0.5 +
          (CASE WHEN featured = 1 THEN 50 ELSE 0 END) +
          COALESCE(rating, 0) * 5 +
          (CASE WHEN verified = 1 THEN 10 ELSE 0 END)
        ) as custom_rank
      FROM POI
      WHERE MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)
    `;
    const params = [sanitizedQuery, sanitizedQuery, sanitizedQuery];

    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Relevance threshold
    sql += ' HAVING relevance >= ?';
    params.push(parseFloat(min_relevance));

    // Order by custom ranking (combines relevance, popularity, featured status, rating, verified)
    sql += ' ORDER BY custom_rank DESC';

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(
      Math.min(parseInt(limit), 100), // Max 100 results
      parseInt(offset)
    );

    // Execute search
    const startTime = Date.now();
    let results = await query(sql, params);
    let searchTime = Date.now() - startTime;
    let fuzzyMatch = null;
    let correctedQuery = null;

    // Fuzzy matching: If few/no results and fuzzy enabled, try typo correction
    if (useFuzzy && results.length < 3) {
      logger.info(`Fuzzy match triggered for "${sanitizedQuery}" (${results.length} results)`);

      // Get distinct POI names and common search terms for fuzzy matching
      const candidatesSql = `
        SELECT DISTINCT name, category, subcategory
        FROM POI
        LIMIT 1000
      `;
      const candidates = await query(candidatesSql);

      // Extract unique terms from POI data
      const uniqueTerms = new Set();
      candidates.forEach(poi => {
        if (poi.name) uniqueTerms.add(poi.name.toLowerCase());
        if (poi.category) uniqueTerms.add(poi.category.toLowerCase());
        if (poi.subcategory) uniqueTerms.add(poi.subcategory.toLowerCase());
        // Also add words from names
        if (poi.name) {
          poi.name.split(/\s+/).forEach(word => {
            if (word.length >= 3) uniqueTerms.add(word.toLowerCase());
          });
        }
      });

      // Find closest match for the search query
      const termsArray = Array.from(uniqueTerms);
      const match = findClosestMatch(
        sanitizedQuery,
        termsArray,
        parseInt(fuzzy_threshold)
      );

      // If fuzzy match found, retry search with corrected term
      if (match && match.distance > 0) {
        logger.info(`Fuzzy match found: "${sanitizedQuery}" → "${match.match}" (distance: ${match.distance})`);

        fuzzyMatch = {
          original: sanitizedQuery,
          corrected: match.match,
          distance: match.distance,
          similarity: match.similarity
        };
        correctedQuery = match.match;

        // Retry search with corrected query (with custom ranking)
        let fuzzySql = `
          SELECT
            *,
            MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance,
            (
              MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE) * 10 +
              COALESCE(popularity_score, 0) * 0.5 +
              (CASE WHEN featured = 1 THEN 50 ELSE 0 END) +
              COALESCE(rating, 0) * 5 +
              (CASE WHEN verified = 1 THEN 10 ELSE 0 END)
            ) as custom_rank
          FROM POI
          WHERE MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)
        `;
        const fuzzyParams = [correctedQuery, correctedQuery, correctedQuery];

        if (category) {
          fuzzySql += ' AND category = ?';
          fuzzyParams.push(category);
        }

        fuzzySql += ' HAVING relevance >= ? ORDER BY custom_rank DESC LIMIT ? OFFSET ?';
        fuzzyParams.push(
          parseFloat(min_relevance),
          Math.min(parseInt(limit), 100),
          parseInt(offset)
        );

        const fuzzyStartTime = Date.now();
        const fuzzyResults = await query(fuzzySql, fuzzyParams);
        searchTime += Date.now() - fuzzyStartTime;

        // Use fuzzy results if better than original
        if (fuzzyResults.length > results.length) {
          results = fuzzyResults;
          logger.info(`Fuzzy search improved results: ${fuzzyResults.length} vs ${results.length} original`);
        }
      }
    }

    // Get total count (without pagination)
    let countSql = `
      SELECT COUNT(*) as total
      FROM POI
      WHERE MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)
    `;
    const countParams = [correctedQuery || sanitizedQuery];

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    const [{ total }] = await query(countSql, countParams);

    // Log search for analytics
    const logQuery = correctedQuery || sanitizedQuery;
    logger.info(`Search: "${logQuery}" - ${total} results in ${searchTime}ms${fuzzyMatch ? ' (fuzzy)' : ''}`);

    // Apply highlighting to search results if enabled
    let processedResults = results;
    if (useHighlight) {
      processedResults = highlightSearchResults(
        results,
        correctedQuery || sanitizedQuery,
        ['name', 'description'],  // Fields to highlight
        { escapeHtml: true }  // Escape HTML for security
      );
    }

    const response = {
      success: true,
      data: processedResults.map(poi => ({
        ...poi,
        amenities: typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities,
        images: typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images,
        opening_hours: typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours
      })),
      meta: {
        query: sanitizedQuery,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: results.length,
        search_time_ms: searchTime,
        has_more: offset + results.length < total,
        highlighting_enabled: useHighlight
      }
    };

    // Add fuzzy matching info if used
    if (fuzzyMatch) {
      response.meta.fuzzy_match = {
        used: true,
        original_query: fuzzyMatch.original,
        corrected_query: fuzzyMatch.corrected,
        edit_distance: fuzzyMatch.distance,
        similarity_percent: Math.round(fuzzyMatch.similarity)
      };
    }

    res.json(response);
  } catch (error) {
    logger.error('Search POIs error:', error);
    next(error);
  }
};

/**
 * GET /pois/autocomplete
 * Autocomplete for typeahead search
 *
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - limit: Number of suggestions (default: 10, max: 20)
 */
exports.autocompletePOIs = async (req, res, next) => {
  try {
    const {
      q: searchQuery,
      limit = 10
    } = req.query;

    // Validation
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        meta: {
          query: searchQuery || '',
          count: 0
        }
      });
    }

    // Sanitize
    const sanitizedQuery = searchQuery.trim().substring(0, 50);

    // Autocomplete query - Use BOOLEAN MODE with wildcard for partial matching
    // This enables typeahead functionality: "rest" matches "restaurant"
    const booleanQuery = `${sanitizedQuery}*`; // Add wildcard suffix

    const sql = `
      SELECT
        id,
        name,
        category,
        subcategory,
        thumbnail_url,
        rating,
        MATCH(name) AGAINST(? IN BOOLEAN MODE) as relevance
      FROM POI
      WHERE MATCH(name) AGAINST(? IN BOOLEAN MODE)
      ORDER BY relevance DESC, rating DESC
      LIMIT ?
    `;

    const results = await query(sql, [
      booleanQuery,
      booleanQuery,
      Math.min(parseInt(limit), 20) // Max 20 suggestions
    ]);

    res.json({
      success: true,
      data: results.map(poi => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        subcategory: poi.subcategory,
        thumbnail_url: poi.thumbnail_url,
        rating: poi.rating ? parseFloat(poi.rating) : null
      })),
      meta: {
        query: sanitizedQuery,
        count: results.length
      }
    });
  } catch (error) {
    logger.error('Autocomplete POIs error:', error);
    next(error);
  }
};

/**
 * GET /pois/search/suggestions
 * Search suggestions based on popular queries
 * (Placeholder for future implementation with analytics)
 */
exports.searchSuggestions = async (req, res, next) => {
  try {
    // For now, return popular categories
    const suggestions = [
      { query: 'restaurant', category: 'Food & Drinks', count: 165 },
      { query: 'beach', category: 'Active', count: 154 },
      { query: 'museum', category: 'Culture', count: null },
      { query: 'hotel', category: 'Accommodation', count: null },
      { query: 'bar', category: 'Food & Drinks', count: null }
    ];

    res.json({
      success: true,
      data: suggestions,
      meta: {
        type: 'popular_searches'
      }
    });
  } catch (error) {
    logger.error('Search suggestions error:', error);
    next(error);
  }
};

module.exports = {
  searchPOIs: exports.searchPOIs,
  autocompletePOIs: exports.autocompletePOIs,
  searchSuggestions: exports.searchSuggestions
};
