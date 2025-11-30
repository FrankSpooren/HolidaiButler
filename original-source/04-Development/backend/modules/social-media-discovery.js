/**
 * Social Media & Website Discovery Module
 * ========================================
 * Finds official website, Facebook, and Instagram URLs for POIs
 *
 * Methods:
 * 1. Google Search scraping for website URL
 * 2. Facebook page search
 * 3. Instagram profile search
 */

const fetch = require('node-fetch');

/**
 * Discover official website URL via Google Search
 */
async function findWebsiteURL(poi) {
  try {
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'} official website`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract first result URL (basic implementation)
    // In production, use a proper HTML parser like cheerio
    const urlMatch = html.match(/<a href="\/url\?q=(https?:\/\/[^&]+)&amp;/);
    if (urlMatch && urlMatch[1]) {
      const url = decodeURIComponent(urlMatch[1]);

      // Filter out non-relevant domains
      const excludeDomains = ['facebook.com', 'instagram.com', 'tripadvisor', 'booking.com', 'google.com'];
      if (!excludeDomains.some(domain => url.includes(domain))) {
        return url;
      }
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  Website URL search failed: ${error.message}`);
    return null;
  }
}

/**
 * Discover Facebook page URL
 */
async function findFacebookURL(poi) {
  try {
    // Method 1: Direct Facebook search URL
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'}`);
    const facebookSearchUrl = `https://www.facebook.com/search/top/?q=${searchQuery}`;

    const response = await fetch(facebookSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract Facebook page URL from search results
    // This is a basic implementation - in production, use proper scraping with puppeteer
    const fbPageMatch = html.match(/facebook\.com\/([^\/\?"]+)/);
    if (fbPageMatch && fbPageMatch[1]) {
      const pageSlug = fbPageMatch[1];
      // Filter out generic Facebook pages
      if (!['search', 'pages', 'public', 'login'].includes(pageSlug)) {
        return `https://www.facebook.com/${pageSlug}`;
      }
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  Facebook URL search failed: ${error.message}`);
    return null;
  }
}

/**
 * Discover Instagram profile URL
 */
async function findInstagramURL(poi) {
  try {
    // Method 1: Google search for Instagram profile
    const searchQuery = encodeURIComponent(`${poi.name} ${poi.city || 'Calpe'} instagram`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract Instagram URL from search results
    const igMatch = html.match(/instagram\.com\/([^\/\?"]+)/);
    if (igMatch && igMatch[1]) {
      const username = igMatch[1];
      // Filter out generic Instagram pages
      if (!['explore', 'p', 'tv', 'reels'].includes(username)) {
        return `https://www.instagram.com/${username}`;
      }
    }

    return null;

  } catch (error) {
    console.log(`  ⚠️  Instagram URL search failed: ${error.message}`);
    return null;
  }
}

/**
 * Discover all social media and website URLs for a POI
 */
async function discoverAllURLs(poi) {
  console.log(`  🔍 Discovering URLs for: ${poi.name}`);

  const results = {
    website: null,
    facebook: null,
    instagram: null,
    foundAny: false
  };

  try {
    // Run all searches in parallel for speed
    const [website, facebook, instagram] = await Promise.allSettled([
      findWebsiteURL(poi),
      findFacebookURL(poi),
      findInstagramURL(poi)
    ]);

    if (website.status === 'fulfilled' && website.value) {
      results.website = website.value;
      results.foundAny = true;
      console.log(`     ✅ Website: ${website.value}`);
    }

    if (facebook.status === 'fulfilled' && facebook.value) {
      results.facebook = facebook.value;
      results.foundAny = true;
      console.log(`     ✅ Facebook: ${facebook.value}`);
    }

    if (instagram.status === 'fulfilled' && instagram.value) {
      results.instagram = instagram.value;
      results.foundAny = true;
      console.log(`     ✅ Instagram: ${instagram.value}`);
    }

    if (!results.foundAny) {
      console.log(`     ⚠️  No URLs found`);
    }

  } catch (error) {
    console.log(`  ❌ URL discovery failed: ${error.message}`);
  }

  return results;
}

module.exports = {
  findWebsiteURL,
  findFacebookURL,
  findInstagramURL,
  discoverAllURLs
};
