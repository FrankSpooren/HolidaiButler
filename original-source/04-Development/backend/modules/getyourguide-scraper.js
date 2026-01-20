/**
 * GetYourGuide Content Scraper Module
 * ====================================
 * Searches and scrapes content from GetYourGuide for POIs
 *
 * Features:
 * - Search for activities/attractions on GetYourGuide
 * - Extract description, rating, highlights
 * - Best for: Activities, Tours, Attractions
 */

const fetch = require('node-fetch');

/**
 * Search for POI on GetYourGuide and get URL
 */
async function searchGetYourGuide(poi) {
  try {
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'}`);
    const searchUrl = `https://www.getyourguide.com/s/?q=${searchQuery}`;

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

    // Extract first activity URL
    const urlMatch = html.match(/href="(\/[^"]*\/a-\d+(?:-[^"]*)?)"/i);
    if (urlMatch && urlMatch[1]) {
      return `https://www.getyourguide.com${urlMatch[1]}`;
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  GetYourGuide search failed: ${error.message}`);
    return null;
  }
}

/**
 * Scrape content from GetYourGuide activity page
 */
async function scrapeGetYourGuidePage(url) {
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
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
      description = descMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim()
        .substring(0, 500);
    }

    // Extract rating
    let rating = null;
    const ratingMatch = html.match(/ratingValue["']\s*:\s*["']?(\d+\.?\d*)/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
    }

    // Extract review count
    let reviewCount = null;
    const reviewMatch = html.match(/reviewCount["']\s*:\s*["']?(\d+)/i);
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1]);
    }

    // Extract highlights from structured data
    const highlights = [];
    const highlightMatches = html.matchAll(/<li[^>]*class="[^"]*highlight[^"]*"[^>]*>(.*?)<\/li>/gi);
    for (const match of highlightMatches) {
      const highlight = match[1]
        .replace(/<[^>]+>/g, '')
        .trim();
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
      source: 'GetYourGuide'
    };

  } catch (error) {
    console.log(`  ⚠️  GetYourGuide page scraping failed: ${error.message}`);
    return null;
  }
}

/**
 * Get GetYourGuide content for a POI
 */
async function getGetYourGuideContent(poi) {
  console.log(`  🔍 Searching GetYourGuide...`);

  try {
    // Step 1: Search for POI
    const url = await searchGetYourGuide(poi);
    if (!url) {
      console.log(`     ⚠️  No GetYourGuide listing found`);
      return null;
    }

    console.log(`     ✅ Found: ${url}`);

    // Step 2: Scrape content
    const content = await scrapeGetYourGuidePage(url);
    if (!content) {
      console.log(`     ⚠️  Could not scrape content`);
      return null;
    }

    if (content.description) {
      console.log(`     ✅ Scraped ${content.description.length} chars`);
    }

    return content;

  } catch (error) {
    console.log(`  ❌ GetYourGuide scraping failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  searchGetYourGuide,
  scrapeGetYourGuidePage,
  getGetYourGuideContent
};
