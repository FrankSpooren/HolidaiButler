/**
 * TheFork Content Scraper Module
 * ===============================
 * Searches and scrapes content from TheFork for restaurants
 *
 * Features:
 * - Search for restaurants on TheFork
 * - Extract description, rating, cuisine type
 * - Best for: Food & Drinks category
 */

const fetch = require('node-fetch');

/**
 * Search for restaurant on TheFork and get URL
 */
async function searchTheFork(poi) {
  try {
    // Only search if it's a restaurant/food POI
    if (poi.category !== 'Food & Drinks') {
      return null;
    }

    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'}`);
    const searchUrl = `https://www.thefork.com/search?q=${searchQuery}`;

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

    // Extract first restaurant URL
    const urlMatch = html.match(/href="(\/restaurant\/[^"]+)"/i);
    if (urlMatch && urlMatch[1]) {
      return `https://www.thefork.com${urlMatch[1]}`;
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  TheFork search failed: ${error.message}`);
    return null;
  }
}

/**
 * Scrape content from TheFork restaurant page
 */
async function scrapeTheForkPage(url) {
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
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
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

    // Extract cuisine type
    let cuisineType = null;
    const cuisineMatch = html.match(/servesCuisine["']\s*:\s*["']([^"']+)/i);
    if (cuisineMatch) {
      cuisineType = cuisineMatch[1];
    }

    // Extract price range
    let priceRange = null;
    const priceMatch = html.match(/priceRange["']\s*:\s*["']([^"']+)/i);
    if (priceMatch) {
      priceRange = priceMatch[1];
    }

    return {
      url,
      description,
      rating,
      reviewCount,
      cuisineType,
      priceRange,
      source: 'TheFork'
    };

  } catch (error) {
    console.log(`  ⚠️  TheFork page scraping failed: ${error.message}`);
    return null;
  }
}

/**
 * Get TheFork content for a restaurant POI
 */
async function getTheForkContent(poi) {
  // Only proceed if it's a food/restaurant POI
  if (poi.category !== 'Food & Drinks') {
    return null;
  }

  console.log(`  🔍 Searching TheFork...`);

  try {
    // Step 1: Search for restaurant
    const url = await searchTheFork(poi);
    if (!url) {
      console.log(`     ⚠️  No TheFork listing found`);
      return null;
    }

    console.log(`     ✅ Found: ${url}`);

    // Step 2: Scrape content
    const content = await scrapeTheForkPage(url);
    if (!content) {
      console.log(`     ⚠️  Could not scrape content`);
      return null;
    }

    if (content.description) {
      console.log(`     ✅ Scraped ${content.description.length} chars`);
    }

    return content;

  } catch (error) {
    console.log(`  ❌ TheFork scraping failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  searchTheFork,
  scrapeTheForkPage,
  getTheForkContent
};
