const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Base Scraper Class
 * Provides common functionality for all event scrapers
 */

class BaseScraper {
  constructor(config = {}) {
    this.name = config.name || 'BaseScraper';
    this.platform = config.platform || 'unknown';
    this.baseUrl = config.baseUrl || '';
    this.rateLimit = config.rateLimit || 1000; // ms between requests
    this.timeout = config.timeout || 10000; // 10 seconds
    this.retryAttempts = config.retryAttempts || 3;
    this.lastRequestTime = 0;

    // Configure axios instance
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': 'HolidaiButler Event Aggregator/1.0 (https://holidaibutler.com)',
        'Accept': 'text/html,application/json',
        'Accept-Language': 'nl,en;q=0.9,es;q=0.8',
      },
    });
  }

  /**
   * Fetch URL with rate limiting and retries
   * @param {String} url - URL to fetch
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async fetch(url, options = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimit) {
      await this.sleep(this.rateLimit - timeSinceLastRequest);
    }

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[${this.name}] Fetching: ${url} (attempt ${attempt}/${this.retryAttempts})`);

        const response = await this.client.get(url, options);
        this.lastRequestTime = Date.now();

        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`[${this.name}] Fetch error (attempt ${attempt}):`, error.message);

        // Don't retry on 404 or 403
        if (error.response && [404, 403, 401].includes(error.response.status)) {
          throw error;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.retryAttempts) {
          await this.sleep(attempt * 2000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse HTML content
   * @param {String} html - HTML content
   * @returns {Object} Cheerio instance
   */
  parseHTML(html) {
    return cheerio.load(html);
  }

  /**
   * Extract date from various formats
   * @param {String} dateString - Date string
   * @returns {Date} Parsed date
   */
  parseDate(dateString) {
    if (!dateString) return null;

    // Try standard Date parsing first
    const standardDate = new Date(dateString);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }

    // Common Spanish date formats
    const spanishMonths = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    };

    // Try to parse Spanish date format: "15 de octubre de 2025"
    const spanishPattern = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i;
    const spanishMatch = dateString.match(spanishPattern);
    if (spanishMatch) {
      const [, day, month, year] = spanishMatch;
      const monthNum = spanishMonths[month.toLowerCase()];
      if (monthNum) {
        return new Date(`${year}-${monthNum}-${day.padStart(2, '0')}`);
      }
    }

    // Try DD/MM/YYYY format
    const slashPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const slashMatch = dateString.match(slashPattern);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }

    return null;
  }

  /**
   * Extract time from string
   * @param {String} timeString - Time string
   * @returns {Object} {hours, minutes}
   */
  parseTime(timeString) {
    if (!timeString) return null;

    // Try HH:MM format
    const timePattern = /(\d{1,2}):(\d{2})/;
    const match = timeString.match(timePattern);
    if (match) {
      return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10),
      };
    }

    return null;
  }

  /**
   * Clean and normalize text
   * @param {String} text - Text to clean
   * @returns {String} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  /**
   * Extract image URLs and ensure they're absolute
   * @param {String} imageUrl - Image URL
   * @param {String} baseUrl - Base URL for relative paths
   * @returns {String} Absolute image URL
   */
  normalizeImageUrl(imageUrl, baseUrl = this.baseUrl) {
    if (!imageUrl) return null;

    // Already absolute
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Protocol-relative
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    }

    // Relative path
    const base = baseUrl || this.baseUrl;
    if (imageUrl.startsWith('/')) {
      const urlObj = new URL(base);
      return `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    }

    return new URL(imageUrl, base).href;
  }

  /**
   * Categorize event based on keywords
   * @param {String} title - Event title
   * @param {String} description - Event description
   * @returns {Object} {primaryCategory, activityType}
   */
  categorizeEvent(title = '', description = '') {
    const text = `${title} ${description}`.toLowerCase();

    const categoryKeywords = {
      'beach': ['playa', 'beach', 'strand', 'zee', 'mar', 'sea'],
      'sports-events': ['fútbol', 'football', 'soccer', 'padel', 'golf', 'torneo', 'tournament', 'competición'],
      'music': ['música', 'music', 'concierto', 'concert', 'orquesta', 'orchestra'],
      'food-drink': ['gastronómico', 'gastronomic', 'culinario', 'food', 'wine', 'vino', 'tapas', 'restaurant'],
      'culture': ['museo', 'museum', 'arte', 'art', 'exposición', 'exhibition', 'cultura', 'culture'],
      'festivals': ['festival', 'fiesta', 'feria', 'carnival', 'carnaval'],
      'folklore': ['tradicional', 'traditional', 'folklore', 'moros y cristianos', 'moors and christians'],
      'nature': ['naturaleza', 'nature', 'senderismo', 'hiking', 'montaña', 'mountain', 'parque natural'],
      'tours': ['visita guiada', 'guided tour', 'excursión', 'excursion', 'tour'],
      'markets': ['mercado', 'market', 'mercadillo', 'flea market', 'rastro'],
      'workshops': ['taller', 'workshop', 'clase', 'class', 'curso', 'course'],
    };

    let primaryCategory = 'entertainment';
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        primaryCategory = category;
      }
    }

    return { primaryCategory };
  }

  /**
   * Determine target audience based on content
   * @param {String} title - Event title
   * @param {String} description - Event description
   * @returns {Array} Target audiences
   */
  determineAudience(title = '', description = '') {
    const text = `${title} ${description}`.toLowerCase();
    const audiences = [];

    const audienceKeywords = {
      'families-with-kids': ['niños', 'children', 'kids', 'familia', 'family', 'infantil'],
      'couples': ['romántico', 'romantic', 'pareja', 'couples'],
      'seniors': ['mayores', 'seniors', 'tercera edad'],
      'young-adults': ['jóvenes', 'young', 'juventud'],
    };

    for (const [audience, keywords] of Object.entries(audienceKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        audiences.push(audience);
      }
    }

    // Default to all-ages if no specific audience detected
    if (audiences.length === 0) {
      audiences.push('all-ages');
    }

    return audiences;
  }

  /**
   * Sleep utility
   * @param {Number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape events - to be implemented by subclasses
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    throw new Error('scrape() method must be implemented by subclass');
  }

  /**
   * Transform scraped data to Event model format
   * @param {Object} scrapedData - Raw scraped data
   * @returns {Object} Event model compatible object
   */
  transformToEventModel(scrapedData) {
    throw new Error('transformToEventModel() method must be implemented by subclass');
  }
}

module.exports = BaseScraper;
