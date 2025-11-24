import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../../utils/logger.js';

puppeteer.use(StealthPlugin());

class LinkedInScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize browser instance
   */
  async init() {
    if (this.browser) return;

    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      );

      logger.info('✅ LinkedIn scraper initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Login to LinkedIn (manual process - requires cookies)
   */
  async login(cookies) {
    try {
      await this.page.goto('https://www.linkedin.com');

      if (cookies) {
        await this.page.setCookie(...cookies);
        await this.page.reload();
      }

      // Check if logged in
      const isLoggedIn = await this.page.evaluate(() => {
        return !window.location.href.includes('/login');
      });

      this.isAuthenticated = isLoggedIn;

      if (isLoggedIn) {
        logger.info('✅ LinkedIn authentication successful');
      } else {
        logger.warn('⚠️ LinkedIn authentication failed - manual login required');
      }

      return isLoggedIn;
    } catch (error) {
      logger.error('❌ Login error:', error);
      return false;
    }
  }

  /**
   * Scrape public LinkedIn profile
   */
  async scrapeProfile(profileUrl) {
    if (!this.browser) await this.init();

    try {
      logger.info(`🔍 Scraping profile: ${profileUrl}`);

      await this.page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Random delay to appear human-like
      await this.randomDelay(2000, 4000);

      // Check if profile is accessible
      const isBlocked = await this.page.evaluate(() => {
        return document.body.innerText.includes('Join to view') ||
               document.body.innerText.includes('Sign in to view');
      });

      if (isBlocked && !this.isAuthenticated) {
        throw new Error('Profile requires authentication - public data limited');
      }

      // Extract profile data
      const profileData = await this.page.evaluate(() => {
        const getText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.innerText.trim() : null;
        };

        const getAll = (selector) => {
          return Array.from(document.querySelectorAll(selector))
            .map(el => el.innerText.trim())
            .filter(text => text.length > 0);
        };

        return {
          fullName: getText('h1.text-heading-xlarge') || getText('.pv-text-details__left-panel h1'),
          headline: getText('.text-body-medium') || getText('.pv-text-details__left-panel .text-body-medium'),
          location: getText('.text-body-small.inline.t-black--light.break-words') ||
                   getText('.pv-text-details__left-panel .pb2 .t-black--light'),
          about: getText('#about + div .display-flex.ph5.pv3') ||
                getText('.pv-about-section .pv-about__summary-text'),

          // Experience
          experience: Array.from(document.querySelectorAll('#experience ~ div li')).map(item => ({
            title: item.querySelector('.t-bold')?.innerText.trim(),
            company: item.querySelector('.t-normal')?.innerText.trim(),
            duration: item.querySelector('.t-black--light')?.innerText.trim(),
            description: item.querySelector('.pv-entity__description')?.innerText.trim()
          })).filter(exp => exp.title),

          // Education
          education: Array.from(document.querySelectorAll('#education ~ div li')).map(item => ({
            school: item.querySelector('.t-bold')?.innerText.trim(),
            degree: item.querySelector('.t-normal')?.innerText.trim(),
            field: item.querySelector('.t-black--light')?.innerText.trim(),
            duration: Array.from(item.querySelectorAll('.t-14')).map(el => el.innerText.trim()).join(' - ')
          })).filter(edu => edu.school),

          // Skills
          skills: getAll('#skills ~ div .pv-skill-category-entity__name-text'),

          // Languages
          languages: getAll('#languages ~ div .pv-accomplishment-entity__title'),

          // Current position
          currentPosition: getText('#experience ~ div li:first-child .t-bold'),
          currentCompany: getText('#experience ~ div li:first-child .t-normal')
        };
      });

      // Parse name
      const nameParts = profileData.fullName ? profileData.fullName.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = {
        firstName,
        lastName,
        linkedinUrl: profileUrl,
        currentTitle: profileData.currentPosition || profileData.headline,
        currentCompany: profileData.currentCompany,
        location: profileData.location,
        experience: profileData.experience || [],
        education: profileData.education || [],
        skills: profileData.skills || [],
        languages: profileData.languages || [],
        linkedinProfileData: profileData,
        scrapedAt: new Date()
      };

      logger.info(`✅ Successfully scraped profile: ${firstName} ${lastName}`);
      return result;

    } catch (error) {
      logger.error(`❌ Error scraping profile ${profileUrl}:`, error.message);
      throw error;
    }
  }

  /**
   * Search LinkedIn for candidates
   */
  async searchProfiles(searchQuery, filters = {}) {
    if (!this.browser) await this.init();

    try {
      logger.info(`🔍 Searching LinkedIn: ${searchQuery}`);

      const searchUrl = this.buildSearchUrl(searchQuery, filters);
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

      await this.randomDelay(2000, 4000);

      // Extract profile URLs from search results
      const profileUrls = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        const urls = links
          .map(link => link.href)
          .filter(href => href.includes('/in/') && !href.includes('?'))
          .filter((url, index, self) => self.indexOf(url) === index); // Unique

        return urls.slice(0, 10); // Limit results
      });

      logger.info(`✅ Found ${profileUrls.length} profiles`);
      return profileUrls;

    } catch (error) {
      logger.error('❌ Search error:', error);
      throw error;
    }
  }

  /**
   * Build LinkedIn search URL with filters
   */
  buildSearchUrl(query, filters = {}) {
    const baseUrl = 'https://www.linkedin.com/search/results/people/';
    const params = new URLSearchParams({
      keywords: query,
      origin: 'GLOBAL_SEARCH_HEADER'
    });

    if (filters.location) {
      params.append('geoUrn', filters.location);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Random delay to appear human-like
   */
  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get current cookies (for saving authentication)
   */
  async getCookies() {
    if (!this.page) return [];
    return await this.page.cookies();
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('🔒 Browser closed');
    }
  }

  /**
   * Take screenshot (for debugging)
   */
  async screenshot(filename = 'screenshot.png') {
    if (this.page) {
      await this.page.screenshot({ path: filename, fullPage: true });
      logger.info(`📸 Screenshot saved: ${filename}`);
    }
  }
}

export default LinkedInScraper;
