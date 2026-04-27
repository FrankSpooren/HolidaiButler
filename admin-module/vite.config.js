import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI core — split icons from components to reduce initial load
          'vendor-mui-core': ['@mui/material'],
          'vendor-mui-icons': ['@mui/icons-material'],
          // Charts
          'vendor-charts': ['recharts'],
          // Data management
          'vendor-data': ['@tanstack/react-query', 'axios', 'zustand', 'i18next', 'react-i18next'],
          // DnD + Rich text
          'vendor-interactive': ['@dnd-kit/core'],
        },
      },
    },
  }
});
