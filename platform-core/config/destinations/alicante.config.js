/**
 * HolidaiButler - Alicante (Costa Blanca, Spain) Configuration
 * 
 * @destination Alicante
 * @country ES
 * @version 1.0.0
 * @lastUpdated 2026-01-28
 * @status PLANNED (not yet active)
 */

export default {
  destination: {
    id: 3,
    code: 'alicante',
    name: 'Alicante',
    displayName: 'Alicante - Costa Blanca',
    country: 'ES',
    countryName: 'Spain',
    region: 'Costa Blanca',
    province: 'Alicante',
    timezone: 'Europe/Madrid',
    coordinates: {
      lat: 38.3452,
      lng: -0.4815
    },
    languages: ['es', 'en', 'de', 'nl', 'fr'],
    defaultLanguage: 'es',
    currency: 'EUR',
    emergencyNumber: '112'
  },
  
  domains: {
    production: {
      customer: 'alicante.holidaibutler.com',
      admin: 'admin.alicante.holidaibutler.com',
      api: 'api.holidaibutler.com'
    },
    test: {
      customer: 'test.alicante.holidaibutler.com',
      admin: 'admin.test.alicante.holidaibutler.com',
      api: 'api.test.holidaibutler.com'
    },
    dev: {
      customer: 'dev.alicante.holidaibutler.com',
      admin: 'admin.dev.alicante.holidaibutler.com',
      api: 'api.dev.holidaibutler.com'
    }
  },
  
  features: {
    holibot: false,
    ticketing: false,
    reservations: false,
    restaurants: true,
    beaches: true,
    hiking: true,
    cycling: true,
    golf: true,
    waterSports: true,
    nightlife: true,
    shopping: true,
    healthcare: true,
    airport: true,
    oldTown: true,
    castle: true,
    qna: false,
    reviews: true,
    agenda: true,
    premium: false
  },
  
  branding: {
    primaryColor: '#C8102E',
    secondaryColor: '#003087',
    accentColor: '#FFD100',
    headerGradient: ['#C8102E', '#A00D25', '#80091D'],
    buttonPrimary: '#C8102E',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    logo: '/assets/destinations/alicante/logo.svg',
    logoWhite: '/assets/destinations/alicante/logo-white.svg',
    favicon: '/assets/destinations/alicante/favicon.ico',
    heroImage: '/assets/destinations/alicante/hero.jpg',
    ogImage: '/assets/destinations/alicante/og-image.jpg'
  },
  
  legal: {
    companyName: 'HolidaiButler',
    companyAddress: 'Alicante, Spain',
    privacyPolicyUrl: '/legal/privacy',
    termsUrl: '/legal/terms',
    cookiePolicyUrl: '/legal/cookies',
    gdprContactEmail: 'privacy@holidaibutler.com',
    dpoEmail: 'info@holidaibutler.com'
  },
  
  poi: {
    tierStrategy: 'urban',
    categories: [
      'beaches',
      'restaurants',
      'cafes_bars',
      'tapas',
      'historical',
      'museums',
      'castle',
      'shopping',
      'nightlife',
      'healthcare',
      'airport_services',
      'transport',
      'old_town'
    ],
    maxTier1: 30,
    maxTier2: 300,
    maxTier3: 1500,
    defaultSearchRadius: 10,
    maxSearchRadius: 30,
    surroundingCities: ['San Juan', 'El Campello', 'Mutxamel', 'San Vicente del Raspeig']
  },
  
  holibot: {
    enabled: false,
    welcomeMessage: {
      es: '¡Hola! Soy tu asistente de viaje personal para Alicante. ¿En qué puedo ayudarte?',
      en: 'Hello! I am your personal travel assistant for Alicante. How can I help you?'
    },
    personality: 'friendly_city_expert',
    maxContextMessages: 10,
    chromaCollection: 'alicante_pois'
  },
  
  mailerlite: {
    groupPrefix: 'alicante',
    groups: {
      allSubscribers: 'alicante-all-subscribers',
      newsletter: 'alicante-newsletter',
      partners: 'alicante-partners'
    },
    automations: {
      welcome: 'alicante-welcome-sequence'
    }
  },
  
  alicanteSpecific: {
    airport: {
      code: 'ALC',
      name: 'Alicante-Elche Miguel Hernández Airport',
      distanceToCenter: 12
    },
    castle: {
      name: 'Castillo de Santa Bárbara',
      openHours: '10:00-22:00',
      freeEntry: true
    },
    tram: {
      operator: 'TRAM Metropolitano de Alicante',
      website: 'https://www.tramalicante.es'
    }
  },
  
  social: {
    facebook: 'https://facebook.com/holidaibutler',
    instagram: 'https://instagram.com/holidaibutler'
  },
  
  meta: {
    title: {
      es: 'HolidaiButler Alicante - Tu Asistente de Viaje Personal',
      en: 'HolidaiButler Alicante - Your Personal Travel Assistant'
    },
    description: {
      es: 'Descubre Alicante con tu asistente de viaje personal impulsado por IA.',
      en: 'Discover Alicante with your AI-powered personal travel assistant.'
    }
  }
};
