import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Destination-specific configurations
const destinationConfigs = {
  calpe: {
    name: 'HolidaiButler',
    tagline: 'Costa Blanca Experiences',
    description: 'Jouw Persoonlijke Butler aan de Costa Blanca. Ontdek ervaringen, restaurants en activiteiten.',
    themeColor: '#7FA594',
    domain: 'holidaibutler.com',
    icon: '/assets/images/HolidaiButler_Icon_Web.png',
    coordinates: { lat: 38.6447, lng: 0.0410 },
  },
  texel: {
    name: 'TexelMaps',
    tagline: 'Ontdek Texel',
    description: 'Jouw persoonlijke eilandgids voor Texel. Ontdek stranden, fietsroutes, restaurants en natuur.',
    themeColor: '#FF6B00',
    domain: 'texelmaps.nl',
    icon: '/assets/images/TexelMaps_Icon_Web.png',
    coordinates: { lat: 53.0833, lng: 4.8000 },
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
            .replace(/%VITE_THEME_COLOR%/g, config.themeColor)
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
