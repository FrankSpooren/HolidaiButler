/**
 * Spell Correction Service for HoliBot
 * Provides fuzzy matching and spelling correction for POI names and common queries
 *
 * Features:
 * - Levenshtein distance-based fuzzy matching
 * - POI name dictionary from database
 * - Category and subcategory matching
 * - "Did you mean?" suggestions
 * - Common typo corrections
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

class SpellService {
  constructor() {
    this.isInitialized = false;
    this.poiNames = new Map(); // name -> { id, category, subcategory }
    this.categories = new Set();
    this.subcategories = new Set();
    this.commonTerms = new Map(); // Common search terms with corrections
    this.lastRefresh = null;
    this.REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Initialize the spell service by loading POI names
   */
  async initialize() {
    if (this.isInitialized && !this.needsRefresh()) {
      return true;
    }

    try {
      logger.info('Initializing spell correction service...');
      await this.loadPOINames();
      await this.loadCommonTerms();
      this.isInitialized = true;
      this.lastRefresh = Date.now();
      logger.info(`Spell service initialized with ${this.poiNames.size} POI names`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize spell service:', error);
      return false;
    }
  }

  /**
   * Check if dictionary needs refresh
   */
  needsRefresh() {
    if (!this.lastRefresh) return true;
    return Date.now() - this.lastRefresh > this.REFRESH_INTERVAL;
  }

  /**
   * Load POI names from database
   */
  async loadPOINames() {
    const sql = `
      SELECT id, name, category, subcategory
      FROM POI
      WHERE is_active = 1
    `;

    const pois = await mysqlSequelize.query(sql, { type: QueryTypes.SELECT });

    this.poiNames.clear();
    this.categories.clear();
    this.subcategories.clear();

    for (const poi of pois) {
      const normalizedName = this.normalize(poi.name);
      this.poiNames.set(normalizedName, {
        id: poi.id,
        originalName: poi.name,
        category: poi.category,
        subcategory: poi.subcategory
      });

      if (poi.category) {
        this.categories.add(this.normalize(poi.category));
      }
      if (poi.subcategory) {
        this.subcategories.add(this.normalize(poi.subcategory));
      }
    }

    logger.info(`Loaded ${pois.length} POI names for spell correction`);
  }

  /**
   * Load common search terms and corrections
   */
  async loadCommonTerms() {
    // Common misspellings and their corrections for tourism terms
    const corrections = {
      // Dutch common terms
      'restarant': 'restaurant',
      'restraunt': 'restaurant',
      'resturant': 'restaurant',
      'restourant': 'restaurant',
      'cafe': 'cafe',
      'koffie': 'cafe',
      'strand': 'beach',
      'stranden': 'beaches',
      'zwemmen': 'swimming',
      'wandelen': 'hiking',
      'fietsen': 'cycling',
      'winkelen': 'shopping',
      'museum': 'museum',
      'musea': 'museums',

      // English common terms
      'restuarant': 'restaurant',
      'restraurant': 'restaurant',
      'beech': 'beach',
      'beachs': 'beaches',
      'swiming': 'swimming',
      'hikeing': 'hiking',
      'shoping': 'shopping',

      // Spanish common terms
      'playa': 'beach',
      'playas': 'beaches',
      'restaurante': 'restaurant',

      // German common terms
      'strand': 'beach',
      'strande': 'beaches',
      'schwimmen': 'swimming',
      'wandern': 'hiking',

      // Location-specific
      'calpe': 'calpe',
      'kalpe': 'calpe',
      'calpé': 'calpe',
      'penon': 'penon de ifach',
      'ifach': 'penon de ifach',
      'peñon': 'penon de ifach',
      'arenal': 'playa arenal',
      'arenalbol': 'playa arenal-bol'
    };

    this.commonTerms.clear();
    for (const [misspelling, correction] of Object.entries(corrections)) {
      this.commonTerms.set(misspelling, correction);
    }
  }

  /**
   * Normalize text for comparison
   */
  normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score (0-1)
   */
  similarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }

  /**
   * Correct common misspellings in query
   */
  correctCommonTerms(query) {
    const words = query.split(/\s+/);
    const corrected = words.map(word => {
      const normalized = this.normalize(word);
      return this.commonTerms.get(normalized) || word;
    });
    return corrected.join(' ');
  }

  /**
   * Find best matching POI names for a query
   * @param {string} query - User query
   * @param {number} limit - Max number of suggestions
   * @param {number} minSimilarity - Minimum similarity threshold (0-1)
   * @returns {Array} Array of matching POI suggestions
   */
  findSimilarPOIs(query, limit = 5, minSimilarity = 0.5) {
    if (!this.isInitialized) {
      logger.warn('Spell service not initialized');
      return [];
    }

    const normalizedQuery = this.normalize(query);
    const suggestions = [];

    for (const [normalizedName, poiData] of this.poiNames) {
      // Check if query is contained in name or vice versa
      if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
        suggestions.push({
          ...poiData,
          similarity: 0.9,
          matchType: 'contains'
        });
        continue;
      }

      // Calculate similarity
      const sim = this.similarity(normalizedQuery, normalizedName);
      if (sim >= minSimilarity) {
        suggestions.push({
          ...poiData,
          similarity: sim,
          matchType: 'fuzzy'
        });
      }
    }

    // Sort by similarity (descending) and limit results
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find matching categories
   */
  findSimilarCategories(query, limit = 3, minSimilarity = 0.6) {
    const normalizedQuery = this.normalize(query);
    const matches = [];

    for (const category of this.categories) {
      if (category.includes(normalizedQuery) || normalizedQuery.includes(category)) {
        matches.push({ category, similarity: 0.9 });
        continue;
      }

      const sim = this.similarity(normalizedQuery, category);
      if (sim >= minSimilarity) {
        matches.push({ category, similarity: sim });
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Process a user query and return corrections/suggestions
   * @param {string} query - Original user query
   * @returns {Object} Processing result with corrections and suggestions
   */
  async processQuery(query) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = {
      originalQuery: query,
      correctedQuery: query,
      wasModified: false,
      suggestions: [],
      matchedPOIs: [],
      matchedCategories: []
    };

    // Step 1: Correct common terms
    const correctedTerms = this.correctCommonTerms(query);
    if (correctedTerms !== query) {
      result.correctedQuery = correctedTerms;
      result.wasModified = true;
    }

    // Step 2: Find similar POI names
    result.matchedPOIs = this.findSimilarPOIs(query, 5, 0.5);

    // Step 3: Find matching categories
    result.matchedCategories = this.findSimilarCategories(query, 3, 0.6);

    // Step 4: Generate "Did you mean?" suggestions
    if (result.matchedPOIs.length > 0 && result.matchedPOIs[0].similarity >= 0.7) {
      const topMatch = result.matchedPOIs[0];
      if (topMatch.similarity < 1) { // Not exact match
        result.suggestions.push({
          type: 'poi',
          text: `${topMatch.originalName}`,
          similarity: topMatch.similarity
        });
      }
    }

    if (result.matchedCategories.length > 0 && result.matchedCategories[0].similarity >= 0.7) {
      const topCategory = result.matchedCategories[0];
      if (topCategory.similarity < 1) {
        result.suggestions.push({
          type: 'category',
          text: topCategory.category,
          similarity: topCategory.similarity
        });
      }
    }

    return result;
  }

  /**
   * Format "Did you mean?" message in the appropriate language
   */
  formatSuggestionMessage(suggestions, language = 'nl') {
    if (!suggestions || suggestions.length === 0) return null;

    const messages = {
      nl: 'Bedoelde je misschien',
      en: 'Did you mean',
      de: 'Meinten Sie vielleicht',
      es: 'Quizas quisiste decir',
      sv: 'Menade du kanske',
      pl: 'Czy chodzilo Ci o'
    };

    const prefix = messages[language] || messages.nl;
    const suggestionTexts = suggestions.map(s => `"${s.text}"`).join(', ');

    return `${prefix}: ${suggestionTexts}?`;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized && this.poiNames.size > 0;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      poiCount: this.poiNames.size,
      categoryCount: this.categories.size,
      subcategoryCount: this.subcategories.size,
      commonTermsCount: this.commonTerms.size,
      lastRefresh: this.lastRefresh ? new Date(this.lastRefresh).toISOString() : null
    };
  }
}

export const spellService = new SpellService();
export default spellService;
