const cron = require('node-cron');
const eventService = require('../services/eventService');
const multiSourceVerification = require('../services/multiSourceVerification');
const calpeOfficialScraper = require('../scrapers/calpeOfficialScraper');

/**
 * Daily Event Update Automation
 *
 * This module handles automated daily updates for event data:
 * 1. Scrape new events from all sources
 * 2. Update existing events with fresh data
 * 3. Archive past events
 * 4. Verify event data from multiple sources
 * 5. Clean up outdated information
 */

class DailyEventUpdateAutomation {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.scrapers = [
      calpeOfficialScraper,
      // Add more scrapers here:
      // culturaCalpeS craper,
      // getYourGuideScraper,
      // tripAdvisorScraper,
    ];

    // Statistics
    this.stats = {
      lastRun: null,
      duration: 0,
      newEvents: 0,
      updatedEvents: 0,
      archivedEvents: 0,
      errors: 0,
    };
  }

  /**
   * Initialize automation with cron schedule
   */
  initialize() {
    // Daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('[DailyEventUpdate] Running scheduled update...');
      await this.runDailyUpdate();
    });

    // Hourly check for high-priority sources (for real-time events)
    cron.schedule('0 * * * *', async () => {
      console.log('[DailyEventUpdate] Running hourly check...');
      await this.runHourlyCheck();
    });

    console.log('[DailyEventUpdate] Automation initialized');
  }

  /**
   * Run full daily update
   */
  async runDailyUpdate() {
    if (this.isRunning) {
      console.log('[DailyEventUpdate] Update already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    this.stats = {
      lastRun: new Date(),
      duration: 0,
      newEvents: 0,
      updatedEvents: 0,
      archivedEvents: 0,
      errors: 0,
    };

    try {
      console.log('[DailyEventUpdate] Starting daily update...');

      // Step 1: Archive old events
      console.log('[DailyEventUpdate] Step 1: Archiving old events...');
      this.stats.archivedEvents = await this.archiveOldEvents();

      // Step 2: Scrape all sources
      console.log('[DailyEventUpdate] Step 2: Scraping event sources...');
      const scrapedEvents = await this.scrapeAllSources();

      // Step 3: Process scraped events
      console.log('[DailyEventUpdate] Step 3: Processing scraped events...');
      await this.processScrapedEvents(scrapedEvents);

      // Step 4: Verify and update existing events
      console.log('[DailyEventUpdate] Step 4: Verifying existing events...');
      await this.verifyExistingEvents();

      // Step 5: Clean up and optimize
      console.log('[DailyEventUpdate] Step 5: Cleanup and optimization...');
      await this.cleanup();

      this.stats.duration = Date.now() - startTime;

      console.log('[DailyEventUpdate] Daily update completed:', this.stats);

    } catch (error) {
      console.error('[DailyEventUpdate] Daily update failed:', error);
      this.stats.errors++;
    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }

    return this.stats;
  }

  /**
   * Run hourly check for time-sensitive updates
   */
  async runHourlyCheck() {
    try {
      // Only check official and high-priority sources
      const priorityScrapers = this.scrapers.filter(s =>
        ['calpe-official', 'cultura-calpe'].includes(s.platform)
      );

      for (const scraper of priorityScrapers) {
        try {
          const events = await scraper.scrape();
          // Only process events happening today or tomorrow
          const urgentEvents = events.filter(e => {
            const eventDate = new Date(e.startDate);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate <= tomorrow;
          });

          if (urgentEvents.length > 0) {
            await this.processScrapedEvents(urgentEvents);
          }
        } catch (error) {
          console.error(`[DailyEventUpdate] Hourly check failed for ${scraper.platform}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[DailyEventUpdate] Hourly check failed:', error);
    }
  }

  /**
   * Archive events that ended more than 30 days ago
   */
  async archiveOldEvents() {
    try {
      const archivedCount = await eventService.archiveOldEvents(30);
      console.log(`[DailyEventUpdate] Archived ${archivedCount} old events`);
      return archivedCount;
    } catch (error) {
      console.error('[DailyEventUpdate] Archive failed:', error);
      return 0;
    }
  }

  /**
   * Scrape events from all configured sources
   */
  async scrapeAllSources() {
    const allEvents = [];

    for (const scraper of this.scrapers) {
      try {
        console.log(`[DailyEventUpdate] Scraping ${scraper.platform}...`);
        const events = await scraper.scrape();

        console.log(`[DailyEventUpdate] Scraped ${events.length} events from ${scraper.platform}`);
        allEvents.push(...events);

        // Wait between scrapers to avoid rate limiting
        await this.sleep(3000);
      } catch (error) {
        console.error(`[DailyEventUpdate] Scraper ${scraper.platform} failed:`, error.message);
        this.stats.errors++;
      }
    }

    return allEvents;
  }

  /**
   * Process and save scraped events
   */
  async processScrapedEvents(scrapedEvents) {
    for (const scrapedEvent of scrapedEvents) {
      try {
        // Check if event already exists
        const existing = await this.findMatchingEvent(scrapedEvent);

        if (existing) {
          // Update existing event with new source data
          await this.updateExistingEvent(existing, scrapedEvent);
          this.stats.updatedEvents++;
        } else {
          // Create new event
          await eventService.createEvent(scrapedEvent);
          this.stats.newEvents++;
        }
      } catch (error) {
        console.error('[DailyEventUpdate] Error processing event:', error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Find matching event in database
   */
  async findMatchingEvent(scrapedEvent) {
    const Event = require('../models/Event');

    // Try to find by exact title match and similar date
    const titleKey = scrapedEvent.title.get('es') ||
                     scrapedEvent.title.get('nl') ||
                     scrapedEvent.title.get('en');

    if (!titleKey) return null;

    // Search window: ±3 days from scraped event date
    const dateWindow = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
    const minDate = new Date(scrapedEvent.startDate.getTime() - dateWindow);
    const maxDate = new Date(scrapedEvent.startDate.getTime() + dateWindow);

    const candidates = await Event.find({
      startDate: { $gte: minDate, $lte: maxDate },
      'location.city': 'Calpe',
      status: { $in: ['published', 'draft'] },
    });

    // Find best match by title similarity
    for (const candidate of candidates) {
      const candidateTitle = candidate.title.get('es') ||
                            candidate.title.get('nl') ||
                            candidate.title.get('en');

      if (this.calculateSimilarity(titleKey, candidateTitle) > 0.8) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Update existing event with new source data
   */
  async updateExistingEvent(existingEvent, scrapedEvent) {
    try {
      // Get source platform from scraped event
      const sourcePlatform = scrapedEvent.sources[0].platform;

      // Check if this source already exists
      const existingSource = existingEvent.sources.find(s => s.platform === sourcePlatform);

      if (existingSource) {
        // Check if data has changed
        const oldHash = existingSource.dataHash;
        const hasChanged = multiSourceVerification.hasDataChanged(oldHash, scrapedEvent);

        if (hasChanged) {
          // Update source data
          await eventService.addEventSource(existingEvent._id, {
            ...scrapedEvent.sources[0],
            sourceId: scrapedEvent.sources[0].sourceId,
          });

          console.log(`[DailyEventUpdate] Updated event ${existingEvent._id} from ${sourcePlatform}`);
        }
      } else {
        // Add new source
        await eventService.addEventSource(existingEvent._id, scrapedEvent.sources[0]);

        console.log(`[DailyEventUpdate] Added new source to event ${existingEvent._id}`);
      }
    } catch (error) {
      console.error('[DailyEventUpdate] Error updating event:', error.message);
      throw error;
    }
  }

  /**
   * Verify existing events with multi-source data
   */
  async verifyExistingEvents() {
    try {
      // Get events that need verification
      const staleEvents = await eventService.getStaleEvents(24); // Events not checked in 24 hours

      console.log(`[DailyEventUpdate] Verifying ${staleEvents.length} events...`);

      for (const event of staleEvents) {
        try {
          // Run verification
          const verification = multiSourceVerification.verifyEvent(event);

          // Update event verification status
          event.verification = {
            ...event.verification,
            ...verification,
            lastVerified: new Date(),
          };

          // If there are conflicts, resolve them
          if (verification.conflicts && verification.conflicts.length > 0) {
            const resolutions = multiSourceVerification.resolveConflicts(verification.conflicts);

            // Store conflicts for manual review
            event.verification.conflictingData = verification.conflicts;

            console.log(`[DailyEventUpdate] Event ${event._id} has ${verification.conflicts.length} conflicts`);
          }

          await event.save();
        } catch (error) {
          console.error(`[DailyEventUpdate] Error verifying event ${event._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[DailyEventUpdate] Verification failed:', error);
    }
  }

  /**
   * Cleanup and optimization
   */
  async cleanup() {
    try {
      // Remove very old archived events (older than 1 year)
      const Event = require('../models/Event');

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const result = await Event.deleteMany({
        status: 'archived',
        endDate: { $lt: oneYearAgo },
      });

      console.log(`[DailyEventUpdate] Deleted ${result.deletedCount} very old events`);
    } catch (error) {
      console.error('[DailyEventUpdate] Cleanup failed:', error);
    }
  }

  /**
   * Calculate string similarity (0-1)
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get automation statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
    };
  }

  /**
   * Manual trigger for daily update
   */
  async trigger() {
    return await this.runDailyUpdate();
  }
}

module.exports = new DailyEventUpdateAutomation();
