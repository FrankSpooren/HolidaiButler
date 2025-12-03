import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@adyen/adyen-web'],
    // Force re-bundling of dependencies
    force: true,
  },
  server: {
    host: true, // Listen on all interfaces for Codespaces
    allowedHosts: [
      'masako-uncombable-unobdurately.ngrok-free.dev',
      '.ngrok-free.dev', // Allow all ngrok-free.dev subdomains
      '.app.github.dev', // Allow GitHub Codespaces
    ],
    proxy: {
      // Ticketing Module API - events, tickets, bookings
      '/api/v1/ticketing': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/ticketing/, '/api/v1/tickets'),
      },
      // Payment Module API - Adyen integration
      '/api/v1/payments': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      // Platform Core Gateway - general API
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // POI images and queries from platform-core
      '/api/v_quire': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
