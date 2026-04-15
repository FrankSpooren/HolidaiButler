/**
 * Visual Discovery Configuration — per-destination settings
 * Used by visualTrendDiscovery.js to discover trending visuals per destination
 */

const visualDiscoveryConfig = {
  // Per-destination discovery settings
  destinations: {
    1: { // Calpe
      name: 'Calpe Costa Blanca',
      keywords: ['calpe', 'calpe spain', 'costa blanca', 'penon de ifach', 'calpe beach', 'calpe old town'],
      hashtags: ['#calpe', '#costablanca', '#visitcalpe', '#penondeifach', '#calpebeach'],
      youtubeChannels: [],
      languages: ['en', 'es', 'nl', 'de'],
      pexelsKeywords: ['calpe spain', 'costa blanca beach', 'spanish coast', 'mediterranean village'],
      redditSubreddits: ['spain', 'travel', 'solotravel', 'EuropeanTravel'],
      enabled: true
    },
    2: { // Texel
      name: 'Texel Netherlands',
      keywords: ['texel', 'texel island', 'wadden sea', 'texel beach', 'texel lighthouse'],
      hashtags: ['#texel', '#texelisland', '#waddensea', '#visittexel', '#texelstrand'],
      youtubeChannels: [],
      languages: ['nl', 'en', 'de'],
      pexelsKeywords: ['texel island', 'dutch island beach', 'wadden sea', 'north sea coast'],
      redditSubreddits: ['thenetherlands', 'travel', 'solotravel', 'EuropeanTravel'],
      enabled: true
    },
    10: { // BUTE
      name: 'Isle of Bute',
      keywords: ['isle of bute', 'bute scotland', 'rothesay', 'mount stuart'],
      hashtags: ['#isleofbute', '#bute', '#rothesay', '#visitbute', '#mountstuart'],
      youtubeChannels: [],
      languages: ['en'],
      pexelsKeywords: ['scottish island', 'bute scotland', 'rothesay castle'],
      redditSubreddits: ['Scotland', 'travel', 'UKtravel'],
      enabled: true
    }
  },

  // Platform-level settings
  platforms: {
    youtube: {
      maxResults: 10,
      order: 'viewCount',
      videoDuration: 'short', // short = <4min, medium = 4-20min
      relevanceLanguage: 'en',
      publishedAfterDays: 30
    },
    pexels: {
      perPage: 15,
      orientation: 'landscape',
      minWidth: 1280,
      minHeight: 720
    },
    reddit: {
      sort: 'hot',
      timeFilter: 'week',
      limit: 25
    },
    googleImages: {
      maxResults: 20,
      safeSearch: 'active',
      imageSize: 'large',
      imageType: 'photo'
    }
  },

  // AI analysis settings
  analysis: {
    model: 'mistral-medium-latest',
    maxTokens: 1024,
    batchSize: 5, // analyze N visuals per run
    minTrendScore: 2.0 // minimum score to keep
  },

  // Cleanup settings
  cleanup: {
    dismissedRetentionDays: 30,
    discoveredMaxAgeDays: 90,
    maxPerDestination: 500
  }
};

export default visualDiscoveryConfig;
