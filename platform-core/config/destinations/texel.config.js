/**
 * HolidaiButler - Texel (Netherlands) Configuration
 * 
 * @destination Texel
 * @country NL
 * @version 1.0.0
 * @lastUpdated 2026-01-28
 * @status PLANNED (not yet active)
 */

export default {
  destination: {
    id: 2,
    code: 'texel',
    name: 'Texel',
    displayName: 'Texel - Waddeneilanden',
    country: 'NL',
    countryName: 'Netherlands',
    region: 'Noord-Holland',
    province: 'Noord-Holland',
    timezone: 'Europe/Amsterdam',
    coordinates: {
      lat: 53.0833,
      lng: 4.8000
    },
    languages: ['nl', 'en', 'de'],
    defaultLanguage: 'nl',
    currency: 'EUR',
    emergencyNumber: '112'
  },
  
  domains: {
    production: {
      customer: 'texelmaps.nl',
      admin: 'admin.texelmaps.nl',
      api: 'api.texelmaps.nl'
    },
    test: {
      customer: 'test.texelmaps.nl',
      admin: 'admin.test.texelmaps.nl',
      api: 'api.test.texelmaps.nl'
    },
    dev: {
      customer: 'dev.texelmaps.nl',
      admin: 'admin.dev.texelmaps.nl',
      api: 'api.dev.texelmaps.nl'
    }
  },
  
  features: {
    holibot: true,
    ticketing: false,
    reservations: false,
    restaurants: true,
    beaches: true,
    hiking: true,
    cycling: true,
    golf: false,
    waterSports: true,
    nightlife: false,
    shopping: true,
    healthcare: true,
    birdwatching: true,
    seals: true,
    ferryInfo: true,
    lighthouses: true,
    qna: true,
    reviews: true,
    agenda: true,
    premium: false
  },
  
  branding: {
    primaryColor: '#FF6B00',
    secondaryColor: '#004B87',
    accentColor: '#7CB342',
    headerGradient: ['#FF6B00', '#E65C00', '#CC5200'],
    buttonPrimary: '#FF6B00',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    logo: '/assets/destinations/texel/logo.svg',
    logoWhite: '/assets/destinations/texel/logo-white.svg',
    favicon: '/assets/destinations/texel/favicon.ico',
    heroImage: '/assets/destinations/texel/hero.jpg',
    ogImage: '/assets/destinations/texel/og-image.jpg'
  },
  
  legal: {
    companyName: 'HolidaiButler B.V.',
    companyAddress: 'Netherlands',
    kvkNumber: 'TBD',
    privacyPolicyUrl: '/legal/privacy',
    termsUrl: '/legal/terms',
    cookiePolicyUrl: '/legal/cookies',
    gdprContactEmail: 'privacy@texelmaps.nl',
    dpoEmail: 'info@holidaibutler.com'
  },
  
  poi: {
    tierStrategy: 'island',
    categories: [
      'beaches',
      'restaurants',
      'cafes',
      'cycling_routes',
      'hiking_trails',
      'nature_reserves',
      'museums',
      'birdwatching',
      'seals',
      'lighthouses',
      'farms',
      'local_products',
      'accommodations'
    ],
    maxTier1: 15,
    maxTier2: 100,
    maxTier3: 500,
    defaultSearchRadius: 10,
    maxSearchRadius: 30,
    surroundingCities: ['Den Burg', 'De Koog', 'Oudeschild', 'Den Hoorn', 'De Cocksdorp']
  },
  
  holibot: {
    enabled: true,
    welcomeMessage: {
      nl: 'Hallo! Ik ben je persoonlijke reisassistent voor Texel. Waar kan ik je mee helpen?',
      en: 'Hello! I am your personal travel assistant for Texel. How can I help you?',
      de: 'Hallo! Ich bin Ihr persönlicher Reiseassistent für Texel. Wie kann ich Ihnen helfen?'
    },
    personality: 'friendly_island_expert',
    maxContextMessages: 10,
    specialKnowledge: [
      'ferry_teso_schedules',
      'tidal_information',
      'bird_migration_seasons',
      'seal_watching_times',
      'cycling_route_recommendations'
    ],
    chromaCollection: 'texel_pois'
  },
  
  mailerlite: {
    groupPrefix: 'texel',
    groups: {
      allSubscribers: 'texel-all-subscribers',
      newsletter: 'texel-newsletter',
      partners: 'texel-partners'
    },
    automations: {
      welcome: 'texel-welcome-sequence',
      ferryReminder: 'texel-ferry-reminder'
    }
  },
  
  texelSpecific: {
    ferry: {
      operator: 'TESO',
      website: 'https://www.teso.nl',
      crossingTime: 20,
      departsFrom: 'Den Helder'
    },
    tidalInfo: {
      enabled: true,
      source: 'rijkswaterstaat'
    },
    ecomare: {
      website: 'https://www.ecomare.nl',
      sealFeedings: ['11:00', '15:00']
    }
  },
  
  social: {
    facebook: 'https://facebook.com/texelmaps',
    instagram: 'https://instagram.com/texelmaps'
  },
  
  meta: {
    title: {
      nl: 'TexelMaps - Jouw Persoonlijke Eilandgids',
      en: 'TexelMaps - Your Personal Island Guide',
      de: 'TexelMaps - Ihr persönlicher Inselführer'
    },
    description: {
      nl: 'Ontdek Texel met je persoonlijke AI-reisassistent.',
      en: 'Discover Texel with your AI-powered personal travel assistant.',
      de: 'Entdecken Sie Texel mit Ihrem KI-gestützten persönlichen Reiseassistenten.'
    }
  }
};
