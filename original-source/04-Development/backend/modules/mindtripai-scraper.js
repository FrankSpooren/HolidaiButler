/**
 * MindTripAI Content Scraper Module
 * ==================================
 * Searches and scrapes content from MindTrip.ai for POIs
 *
 * Features:
 * - Search for POIs on MindTrip
 * - Extract AI-generated descriptions
 * - Extract recommendations and tips
 */

const fetch = require('node-fetch');

/**
 * Search for POI on MindTrip and get URL
 */
async function searchMindTrip(poi) {
  try {
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'}`);
    const searchUrl = `https://www.mindtrip.ai/search?q=${searchQuery}`;

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

    // Extract first place URL
    const urlMatch = html.match(/href="(\/place\/[^"]+)"/i);
    if (urlMatch && urlMatch[1]) {
      return `https://www.mindtrip.ai${urlMatch[1]}`;
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  MindTrip search failed: ${error.message}`);
    return null;
  }
}

/**
 * Scrape content from MindTrip place page
 */
async function scrapeMindTripPage(url) {
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

    // Extract AI-generated summary
    let aiSummary = null;
    const summaryMatch = html.match(/<div[^>]*class="[^"]*ai-summary[^"]*"[^>]*>(.*?)<\/div>/is);
    if (summaryMatch) {
      aiSummary = summaryMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
    }

    // Extract tips/recommendations
    const tips = [];
    const tipMatches = html.matchAll(/<div[^>]*class="[^"]*tip[^"]*"[^>]*>(.*?)<\/div>/gi);
    for (const match of tipMatches) {
      const tip = match[1]
        .replace(/<[^>]+>/g, '')
        .trim();
      if (tip && tips.length < 5) {
        tips.push(tip);
      }
    }

    // Extract categories/tags
    const categories = [];
    const categoryMatches = html.matchAll(/<span[^>]*class="[^"]*category[^"]*"[^>]*>(.*?)<\/span>/gi);
    for (const match of categoryMatches) {
      const category = match[1]
        .replace(/<[^>]+>/g, '')
        .trim();
      if (category && categories.length < 5) {
        categories.push(category);
      }
    }

    return {
      url,
      description: description || aiSummary,
      aiSummary,
      tips,
      categories,
      source: 'MindTrip'
    };

  } catch (error) {
    console.log(`  ⚠️  MindTrip page scraping failed: ${error.message}`);
    return null;
  }
}

/**
 * Get MindTrip content for a POI
 */
async function getMindTripContent(poi) {
  console.log(`  🔍 Searching MindTrip...`);

  try {
    // Step 1: Search for POI
    const url = await searchMindTrip(poi);
    if (!url) {
      console.log(`     ⚠️  No MindTrip listing found`);
      return null;
    }

    console.log(`     ✅ Found: ${url}`);

    // Step 2: Scrape content
    const content = await scrapeMindTripPage(url);
    if (!content) {
      console.log(`     ⚠️  Could not scrape content`);
      return null;
    }

    if (content.description) {
      console.log(`     ✅ Scraped ${content.description.length} chars`);
    }

    return content;

  } catch (error) {
    console.log(`  ❌ MindTrip scraping failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  searchMindTrip,
  scrapeMindTripPage,
  getMindTripContent
};
