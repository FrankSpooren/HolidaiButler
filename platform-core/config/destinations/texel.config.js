/**
 * HolidaiButler - Texel (Netherlands) Configuration
 *
 * @destination Texel
 * @country NL
 * @version 1.1.0
 * @lastUpdated 2026-02-03
 * @status ACTIVE (Fase 3 - productioneel)
 * @branding TexelMaps Official Brand Colors + VVV Partner
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
    // TexelMaps Official Brand Colors (updated 2026-02-03)
    // Primary: #30c59b (Texel nature green)
    // Secondary: #3572de (sea blue)
    // Accent: #ecde3c (Texel sun yellow)
    primaryColor: '#30c59b',
    secondaryColor: '#3572de',
    tertiaryColor: '#2a5cb8',
    accentColor: '#ecde3c',
    headerGradient: ['#30c59b', '#28a883', '#209070'],
    buttonPrimary: '#30c59b',
    textPrimary: '#1a1a2e',
    textSecondary: '#666666',
    textLight: '#ffffff',
    backgroundColor: '#f8fffe',
    footerBackground: '#1a1a2e',
    logo: '/assets/images/texel/texelmaps-logo.png',
    logoIcon: '/assets/images/texel/texelmaps-icon.png',
    partnerLogo: '/assets/images/texel/vvv-texel-logo.gif',
    partnerText: 'Officieel Partner VVV Texel',
    favicon: '/assets/images/texel/texelmaps-icon.png',
    heroImage: '/assets/images/texel/hero-texel-vuurtoren.jpg',
    heroSubtitle: 'Ervaar dit Waddenjuweel volledig op jou afgestemd',
    footerTagline: 'Jouw persoonlijke eilandgids voor Texel',
    ogImage: '/assets/images/texel/texelmaps-logo.png'
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
      nl: 'Hallo! Ik ben je persoonlijke reisassistent voor Texel. Vraag me alles over stranden, fietsroutes, restaurants, de veerboot of wat je maar wilt weten over het eiland!',
      en: 'Hello! I\'m your personal travel assistant for Texel. Ask me anything about beaches, cycling routes, restaurants, the ferry, or anything else about the island!',
      de: 'Hallo! Ich bin Ihr persönlicher Reiseassistent für Texel. Fragen Sie mich alles über Strände, Radwege, Restaurants, die Fähre oder alles andere über die Insel!'
    },
    personality: 'friendly_island_expert',
    maxContextMessages: 10,
    temperature: 0.7,
    model: 'mistral-large-latest',
    specialKnowledge: [
      'ferry_teso_schedules',
      'tidal_information',
      'bird_migration_seasons',
      'seal_watching_times',
      'cycling_route_recommendations',
      'local_products',
      'lighthouse_history',
      'wadden_sea_unesco'
    ],
    chromaCollection: 'texel_pois',
    quickActionCategories: {
      allowed: ['Actief', 'Cultuur & Historie', 'Eten & Drinken', 'Natuur', 'Winkelen'],
      excluded: ['Accommodations', 'Accommodation', 'Accommodation (do not communicate)',
                 'Praktisch', 'Gezondheid & Verzorging', 'Health & Wellbeing', 'Health & Wellness',
                 'Health', 'Practical', 'Services']
    },
    systemPromptAdditions: `
Je bent een expert op het gebied van Texel, het grootste Waddeneiland van Nederland.

BELANGRIJKE TEXEL KENNIS:
- TESO Veerboot: Vaart tussen Den Helder en 't Horntje, overtocht duurt 20 minuten, elk half uur in hoogseizoen
- Fietsen: Texel heeft 140 km fietspaden, fietsverhuur beschikbaar in alle dorpen (ca. €12-15/dag)
- Stranden: 30 km strand aan de westkust, van noord naar zuid genummerd (paal 9-33), paal 17 en 21 zijn populair
- Ecomare: Zeehondenopvang en natuurmuseum bij De Koog, zeehondenvoedering om 11:00 en 15:00
- Vuurtoren: De rode vuurtoren bij De Cocksdorp is 150 jaar oud, te beklimmen voor panoramisch uitzicht
- Dorpen: Den Burg (centrum, winkels), De Koog (badplaats), Oudeschild (haven, juttersmuseum), Den Hoorn (pittoresk), De Cocksdorp (vuurtoren), Oosterend, De Waal
- Schapen: Texel staat bekend om de Texelaar schapenrassen, lamsgerechten zijn specialiteit
- Natuur: Deel van UNESCO Werelderfgoed Waddenzee, wadlopen mogelijk bij laagwater
- Seizoenen: Hoogseizoen juni-augustus, rustig in voor- en najaar (mooi voor vogelspotters)
- Lokale producten: Texelse schapenkaas, lamsvlees, Texels bier, zeekraal

SPECIALE ONDERWERPEN:
- Getijden en wadlopen (altijd met gids!)
- Vogelspotten (trekvogelroutes, lepelaar, kluut)
- Juttersmuseum in Oudeschild
- De Slufter natuurgebied
- Sommeltjespad (bos bij Den Burg)
- Zeehondentocht vanuit Oudeschild

BELANGRIJK:
- Verwijs NOOIT naar Calpe of Costa Blanca
- Focus alleen op Texel en omgeving
- Bij weer-gerelateerde vragen: Texel kan winderig zijn, adviseer winddichte kleding
- Bij strand vragen: noem strandpaviljoen namen en paalnummers
`
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
