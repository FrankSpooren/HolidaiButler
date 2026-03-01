const BaseScraper = require('./baseScraper');

/**
 * Calpe Official Website Scraper
 * Scrapes events from https://www.calpe.es/es/eventos
 */

class CalpeOfficialScraper extends BaseScraper {
  constructor() {
    super({
      name: 'CalpeOfficialScraper',
      platform: 'calpe-official',
      baseUrl: 'https://www.calpe.es',
      rateLimit: 2000, // Be respectful to official site
    });

    this.eventsUrl = `${this.baseUrl}/es/eventos`;
  }

  /**
   * Scrape events from Calpe official website
   * @returns {Promise<Array>} Array of event data
   */
  async scrape() {
    try {
      console.log(`[${this.name}] Starting scrape...`);

      const events = [];

      // Fetch main events page
      const html = await this.fetch(this.eventsUrl);
      const $ = this.parseHTML(html);

      // Parse event listings
      // Note: The actual selectors would need to be adjusted based on
      // the real structure of the website
      $('.event-item, .evento, article.event').each((index, element) => {
        try {
          const eventData = this.parseEventElement($, $(element));
          if (eventData) {
            events.push(eventData);
          }
        } catch (error) {
          console.error(`[${this.name}] Error parsing event:`, error.message);
        }
      });

      console.log(`[${this.name}] Scraped ${events.length} events`);

      // Transform to Event model format
      return events.map(event => this.transformToEventModel(event));
    } catch (error) {
      console.error(`[${this.name}] Scraping failed:`, error.message);
      throw error;
    }
  }

  /**
   * Parse individual event element
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Event element
   * @returns {Object} Parsed event data
   */
  parseEventElement($, element) {
    // Extract basic information
    const title = this.cleanText(element.find('.event-title, h2, h3').first().text());
    if (!title) return null;

    const description = this.cleanText(
      element.find('.event-description, .description, .summary').text()
    );

    // Extract date/time
    const dateText = element.find('.event-date, .date, time').first().text();
    const startDate = this.parseDate(dateText);

    // Extract location
    const locationText = this.cleanText(
      element.find('.event-location, .location, .venue').text()
    );

    // Extract image
    const imageUrl = element.find('img').first().attr('src');

    // Extract link to detail page
    const detailUrl = element.find('a').first().attr('href');

    return {
      title,
      description,
      startDate,
      location: locationText,
      imageUrl,
      detailUrl,
    };
  }

  /**
   * Fetch and parse event detail page
   * @param {String} detailUrl - URL of detail page
   * @returns {Promise<Object>} Detailed event data
   */
  async fetchEventDetails(detailUrl) {
    try {
      const fullUrl = this.normalizeUrl(detailUrl);
      const html = await this.fetch(fullUrl);
      const $ = this.parseHTML(html);

      // Extract additional details
      const longDescription = this.cleanText($('.event-content, .content, main').text());

      const organizer = this.cleanText($('.organizer, .organizador').text());

      const priceText = this.cleanText($('.price, .precio').text());
      const isFree = /gratis|free|libre/i.test(priceText);

      // Extract time
      const timeText = $('.time, .hora').text();
      const time = this.parseTime(timeText);

      return {
        longDescription,
        organizer,
        isFree,
        time,
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching details:`, error.message);
      return {};
    }
  }

  /**
   * Transform scraped data to Event model format
   * @param {Object} scrapedData - Raw scraped data
   * @returns {Object} Event model compatible object
   */
  transformToEventModel(scrapedData) {
    const { primaryCategory } = this.categorizeEvent(
      scrapedData.title,
      scrapedData.description
    );

    const targetAudience = this.determineAudience(
      scrapedData.title,
      scrapedData.description
    );

    // Create multilingual title (only Spanish from this source)
    const title = new Map([
      ['es', scrapedData.title],
    ]);

    const description = new Map([
      ['es', scrapedData.description || scrapedData.longDescription || ''],
    ]);

    // Determine end date (assume same day if not specified)
    const endDate = scrapedData.endDate || new Date(scrapedData.startDate);
    if (!scrapedData.endDate) {
      endDate.setHours(23, 59, 59);
    }

    const event = {
      title,
      description,
      startDate: scrapedData.startDate,
      endDate,
      location: {
        name: scrapedData.location || 'Calpe',
        city: 'Calpe',
        region: 'Costa Blanca',
      },
      primaryCategory,
      targetAudience,
      pricing: {
        isFree: scrapedData.isFree !== undefined ? scrapedData.isFree : true,
      },
      images: scrapedData.imageUrl ? [{
        url: this.normalizeImageUrl(scrapedData.imageUrl),
        isPrimary: true,
        source: this.platform,
      }] : [],
      organizer: scrapedData.organizer ? {
        name: scrapedData.organizer,
      } : undefined,
      sources: [{
        platform: this.platform,
        url: scrapedData.detailUrl ?
          this.normalizeUrl(scrapedData.detailUrl) :
          this.eventsUrl,
        lastChecked: new Date(),
        isVerified: true,
      }],
      status: 'published',
      visibility: 'public',
    };

    return event;
  }

  /**
   * Normalize URL to absolute
   * @param {String} url - URL to normalize
   * @returns {String} Absolute URL
   */
  normalizeUrl(url) {
    if (!url) return this.baseUrl;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }
}

module.exports = new CalpeOfficialScraper();
