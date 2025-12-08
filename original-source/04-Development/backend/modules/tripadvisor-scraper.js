/**
 * TripAdvisor Content Scraper Module
 * ===================================
 * Searches and scrapes content from TripAdvisor for POIs
 *
 * Features:
 * - Search for POI on TripAdvisor
 * - Extract description, rating, reviews
 * - Extract key highlights
 */

const fetch = require('node-fetch');

/**
 * Search for POI on TripAdvisor and get URL
 */
async function searchTripAdvisor(poi) {
  try {
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'}`);
    const searchUrl = `https://www.tripadvisor.com/Search?q=${searchQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract first listing URL
    const urlMatch = html.match(/href="(\/[^"]*(?:Restaurant|Attraction|Hotel)[^"]*\.html)"/i);
    if (urlMatch && urlMatch[1]) {
      return `https://www.tripadvisor.com${urlMatch[1]}`;
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  TripAdvisor search failed: ${error.message}`);
    return null;
  }
}

/**
 * Scrape content from TripAdvisor listing page
 */
async function scrapeTripAdvisorPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract description
    let description = null;
    const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is);
    if (descMatch) {
      description = descMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
    }

    // Extract rating
    let rating = null;
    const ratingMatch = html.match(/rating['"]\s*:\s*["']?(\d+\.?\d*)/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
    }

    // Extract review count
    let reviewCount = null;
    const reviewMatch = html.match(/(\d+)\s+reviews/i);
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1]);
    }

    // Extract highlights/features
    const highlights = [];
    const highlightMatches = html.matchAll(/<span[^>]*class="[^"]*feature[^"]*"[^>]*>(.*?)<\/span>/gi);
    for (const match of highlightMatches) {
      const highlight = match[1].replace(/<[^>]+>/g, '').trim();
      if (highlight && highlights.length < 5) {
        highlights.push(highlight);
      }
    }

    return {
      url,
      description,
      rating,
      reviewCount,
      highlights,
      source: 'TripAdvisor'
    };

  } catch (error) {
    console.log(`  ⚠️  TripAdvisor page scraping failed: ${error.message}`);
    return null;
  }
}

/**
 * Get TripAdvisor content for a POI
 */
async function getTripAdvisorContent(poi) {
  console.log(`  🔍 Searching TripAdvisor...`);

  try {
    // Step 1: Search for POI
    const url = await searchTripAdvisor(poi);
    if (!url) {
      console.log(`     ⚠️  No TripAdvisor listing found`);
      return null;
    }

    console.log(`     ✅ Found: ${url}`);

    // Step 2: Scrape content
    const content = await scrapeTripAdvisorPage(url);
    if (!content) {
      console.log(`     ⚠️  Could not scrape content`);
      return null;
    }

    if (content.description) {
      console.log(`     ✅ Scraped ${content.description.length} chars`);
    }

    return content;

  } catch (error) {
    console.log(`  ❌ TripAdvisor scraping failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  searchTripAdvisor,
  scrapeTripAdvisorPage,
  getTripAdvisorContent
};
