/**
 * HolidaiButler - Calpe (Costa Blanca, Spain) Configuration
 * 
 * @destination Calpe
 * @country ES
 * @version 1.0.0
 * @lastUpdated 2026-01-28
 */

export default {
  destination: {
    id: 1,
    code: 'calpe',
    name: 'Calpe',
    displayName: 'Calpe - Costa Blanca',
    country: 'ES',
    countryName: 'Spain',
    region: 'Costa Blanca',
    province: 'Alicante',
    timezone: 'Europe/Madrid',
    coordinates: {
      lat: 38.6447,
      lng: 0.0443
    },
    languages: ['es', 'en', 'de', 'nl', 'fr', 'sv', 'pl'],
    defaultLanguage: 'en',
    currency: 'EUR',
    emergencyNumber: '112'
  },
  
  domains: {
    production: {
      customer: 'holidaibutler.com',
      admin: 'admin.holidaibutler.com',
      api: 'api.holidaibutler.com'
    },
    test: {
      customer: 'test.holidaibutler.com',
      admin: 'admin.test.holidaibutler.com',
      api: 'api.test.holidaibutler.com'
    },
    dev: {
      customer: 'dev.holidaibutler.com',
      admin: 'admin.dev.holidaibutler.com',
      api: 'api.dev.holidaibutler.com'
    }
  },
  
  features: {
    holibot: true,
    ticketing: true,
    reservations: true,
    restaurants: true,
    beaches: true,
    hiking: true,
    cycling: true,
    golf: true,
    waterSports: true,
    nightlife: true,
    shopping: true,
    healthcare: true,
    realEstate: false,
    carRental: true,
    qna: true,
    reviews: true,
    agenda: true,
    premium: true
  },
  
  branding: {
    primaryColor: '#7FA594',
    secondaryColor: '#5E8B7E',
    accentColor: '#D4AF37',
    headerGradient: ['#7FA594', '#5E8B7E', '#4A7066'],
    buttonPrimary: '#8BA99D',
    textPrimary: '#2C3E50',
    textSecondary: '#687684',
    logo: '/assets/destinations/calpe/logo.svg',
    logoWhite: '/assets/destinations/calpe/logo-white.svg',
    favicon: '/assets/destinations/calpe/favicon.ico',
    heroImage: '/assets/destinations/calpe/hero.jpg',
    ogImage: '/assets/destinations/calpe/og-image.jpg'
  },
  
  legal: {
    companyName: 'HolidaiButler',
    companyAddress: 'Calpe, Alicante, Spain',
    privacyPolicyUrl: '/legal/privacy',
    termsUrl: '/legal/terms',
    cookiePolicyUrl: '/legal/cookies',
    gdprContactEmail: 'privacy@holidaibutler.com',
    dpoEmail: 'info@holidaibutler.com'
  },
  
  poi: {
    tierStrategy: 'default',
    categories: [
      'beaches',
      'restaurants',
      'cafes_bars',
      'hiking',
      'cycling',
      'golf',
      'water_sports',
      'historical',
      'museums',
      'shopping',
      'nightlife',
      'healthcare',
      'services'
    ],
    maxTier1: 25,
    maxTier2: 250,
    maxTier3: 1000,
    defaultSearchRadius: 15,
    maxSearchRadius: 50,
    surroundingCities: ['Altea', 'Benidorm', 'Benissa', 'Moraira', 'Teulada']
  },
  
  holibot: {
    enabled: true,
    welcomeMessage: {
      es: '¡Hola! Soy tu asistente de viaje personal para Calpe. ¿En qué puedo ayudarte?',
      en: 'Hello! I am your personal travel assistant for Calpe. How can I help you?',
      de: 'Hallo! Ich bin Ihr persönlicher Reiseassistent für Calpe. Wie kann ich Ihnen helfen?',
      nl: 'Hallo! Ik ben je persoonlijke reisassistent voor Calpe. Hoe kan ik je helpen?',
      fr: 'Bonjour! Je suis votre assistant de voyage personnel pour Calpe. Comment puis-je vous aider?'
    },
    personality: 'friendly_local_expert',
    maxContextMessages: 10,
    chromaCollection: 'holidaibutler_pois'
  },
  
  mailerlite: {
    groupPrefix: 'calpe',
    groups: {
      allSubscribers: 'calpe-all-subscribers',
      newsletter: 'calpe-newsletter',
      partners: 'calpe-partners',
      premium: 'calpe-premium'
    },
    automations: {
      welcome: 'calpe-welcome-sequence',
      bookingConfirmation: 'calpe-booking-confirmation',
      reviewRequest: 'calpe-review-request'
    }
  },
  
  social: {
    facebook: 'https://facebook.com/holidaibutler',
    instagram: 'https://instagram.com/holidaibutler'
  },
  
  meta: {
    title: {
      es: 'HolidaiButler Calpe - Tu Asistente de Viaje Personal',
      en: 'HolidaiButler Calpe - Your Personal Travel Assistant'
    },
    description: {
      es: 'Descubre Calpe con tu asistente de viaje personal impulsado por IA.',
      en: 'Discover Calpe with your AI-powered personal travel assistant.'
    }
  }
};
