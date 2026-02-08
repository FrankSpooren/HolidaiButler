import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Destination-specific configurations
const destinationConfigs = {
  calpe: {
    id: 'calpe',
    destinationId: 1,
    name: 'HolidaiButler',
    tagline: 'Costa Blanca Experiences',
    description: 'Jouw Persoonlijke Butler aan de Costa Blanca. Ontdek ervaringen, restaurants en activiteiten.',
    domain: 'holidaibutler.com',
    icon: '/assets/images/HolidaiButler_Icon_Web.png',
    heroImage: '/assets/images/hero-calpe.jpg',
    coordinates: { lat: 38.6447, lng: 0.0410 },
    languages: ['nl', 'en', 'es', 'de'],
    defaultLanguage: 'nl',
    // Category configuration for Calpe
    categories: {
      // Categories to show in menu (by id)
      enabled: ['active', 'beaches', 'culture', 'food', 'recreation', 'shopping'],
      // Categories excluded from menu
      excluded: ['health', 'practical'],
      // Categories for default browse view (presentation quality)
      presentation: ['Active', 'Beaches & Nature', 'Culture & History', 'Food & Drinks', 'Recreation', 'Shopping'],
    },
    // Calpe branding colors
    colors: {
      primary: '#7FA594',
      secondary: '#5E8B7E',
      tertiary: '#4A7066',
      accent: '#D4AF37',
      headerGradient: 'linear-gradient(135deg, #7FA594, #5E8B7E, #4A7066)',
      heroOverlay: 'linear-gradient(135deg, rgba(1, 97, 147, 0.5), rgba(26, 112, 157, 0.4))',
    },
    hero: {
      title: 'Your stay, your style.',
      subtitle: 'Discover Calpe Through local and AI-Powered Insights',
      description: 'Experience this Mediterranean gem with personalized recommendations',
    },
    holibot: {
      name: 'HoliBot',
      welcomeMessages: {
        nl: [
          'Hola! Ik ben HoliBot, je persoonlijke Calpe-Assistent.',
          'Waar kan ik je bij helpen?',
          'Laat me enkele suggesties voor je doen, typ of spreek je vraag hieronder in:'
        ],
        en: [
          'Hola! I\'m HoliBot, your personal Calpe Assistant.',
          'How can I help you?',
          'Let me give you some suggestions, or type or speak your question below:'
        ],
        de: [
          'Hola! Ich bin HoliBot, Ihr persönlicher Calpe-Assistent.',
          'Wie kann ich Ihnen helfen?',
          'Hier sind einige Vorschläge, oder geben Sie Ihre Frage unten ein:'
        ],
        es: [
          'Hola! Soy HoliBot, tu asistente personal de Calpe.',
          '¿En qué puedo ayudarte?',
          'Aquí tienes algunas sugerencias, o escribe tu pregunta abajo:'
        ],
      },
    },
  },
  texel: {
    id: 'texel',
    destinationId: 2,
    name: 'TexelMaps',
    tagline: 'Ontdek Texel',
    description: 'Jouw persoonlijke eilandgids voor Texel. Ontdek stranden, fietsroutes, restaurants en natuur.',
    domain: 'texelmaps.nl',
    icon: '/assets/images/texel/texelmaps-icon.png',
    heroImage: '/assets/images/texel/hero-texel-vuurtoren.jpg',
    coordinates: { lat: 53.0833, lng: 4.8000 },
    languages: ['nl', 'de', 'en'],
    defaultLanguage: 'nl',
    // Category configuration for Texel (7 button categories with specific colors)
    // Database verified 2026-02-02: Actief(57), Cultuur & Historie(96), Eten & Drinken(138),
    // Natuur(98), Winkelen(160), Gezondheid & Verzorging(75), Praktisch(296), Accommodation(401-excluded)
    // Colors: Actief (#FF6B00), Cultuur (#004B87), Eten (#E53935), Gezondheid (#43A047)
    //         Natuur (#7CB342), Praktisch (#607D8B), Winkelen (#AB47BC)
    categories: {
      // Categories to show in menu (by id) - 7 Texel button categories
      enabled: ['actief', 'cultuur', 'eten', 'natuur', 'winkelen', 'gezondheid', 'praktisch'],
      // Categories excluded from menu
      excluded: ['accommodation'],
      // Categories for default browse view - MUST match POI.category column values EXACTLY
      presentation: [
        'Actief',
        'Cultuur & Historie',
        'Eten & Drinken',
        'Natuur',
        'Winkelen',
        'Gezondheid & Verzorging',
        'Praktisch'
      ],
    },
    // TexelMaps Official Brand Colors (updated 2026-02-03)
    // Primary: #30c59b (Texel nature green)
    // Secondary: #3572de (sea blue)
    // Accent: #ecde3c (Texel sun yellow)
    colors: {
      primary: '#30c59b',
      secondary: '#3572de',
      tertiary: '#2a5cb8',
      accent: '#ecde3c',
      headerGradient: 'linear-gradient(135deg, #30c59b, #28a883, #209070)',
      heroOverlay: 'linear-gradient(135deg, rgba(48, 197, 155, 0.4), rgba(53, 114, 222, 0.3))',
    },
    hero: {
      title: 'Jouw eilandavontuur begint hier.',
      subtitle: 'Ervaar dit Waddenjuweel volledig op jou afgestemd',
      description: 'Stranden, natuur, fietsen en lokale parels - alles op één plek',
    },
    holibot: {
      name: 'Tessa',
      welcomeMessages: {
        nl: [
          'Hoi! Ik ben Tessa, je persoonlijke gids voor Texel.',
          'Waar kan ik je bij helpen?',
          'Stel je vraag hieronder, of kies een suggestie:'
        ],
        en: [
          'Hi! I\'m Tessa, your personal guide for Texel.',
          'How can I help you?',
          'Ask your question below, or choose a suggestion:'
        ],
        de: [
          'Hallo! Ich bin Tessa, dein persönlicher Reiseführer für Texel.',
          'Wie kann ich dir helfen?',
          'Stelle deine Frage unten, oder wähle einen Vorschlag:'
        ],
      },
    },
  },
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const destination = env.VITE_DESTINATION_ID || 'calpe'
  const config = destinationConfigs[destination as keyof typeof destinationConfigs] || destinationConfigs.calpe

  return {
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html
            .replace(/%VITE_APP_NAME%/g, config.name)
            .replace(/%VITE_APP_TAGLINE%/g, config.tagline)
            .replace(/%VITE_APP_DESCRIPTION%/g, config.description)
            .replace(/%VITE_THEME_COLOR%/g, config.colors.secondary)
            .replace(/%VITE_APP_DOMAIN%/g, config.domain)
            .replace(/%VITE_APP_ICON%/g, config.icon)
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __DESTINATION_CONFIG__: JSON.stringify(config),
    },
    optimizeDeps: {
      include: ['@adyen/adyen-web'],
      force: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - split large dependencies
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-map': ['leaflet', 'react-leaflet'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-i18n': ['i18next', 'react-i18next'],
            // Sentry loaded conditionally - separate chunk
            'vendor-monitoring': ['@sentry/react'],
          },
        },
      },
      // Enable chunk size warnings
      chunkSizeWarningLimit: 500,
    },
    server: {
      host: true,
      allowedHosts: [
        'masako-uncombable-unobdurately.ngrok-free.dev',
        '.ngrok-free.dev',
        '.app.github.dev',
      ],
      proxy: {
        '/api/v1/ticketing': {
          target: 'http://localhost:3004',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/ticketing/, '/api/v1/tickets'),
        },
        '/api/v1/payments': {
          target: 'http://localhost:3005',
          changeOrigin: true,
        },
        '/api/v1': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/v_quire': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
