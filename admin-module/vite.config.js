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
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) return 'vendor-react';
          if (id.includes('node_modules/@mui/icons-material/')) return 'vendor-mui-icons';
          if (id.includes('node_modules/@mui/material/')) return 'vendor-mui-core';
          if (id.includes('node_modules/@tanstack/react-query/') || id.includes('node_modules/axios/') || id.includes('node_modules/zustand/') || id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) return 'vendor-data';
          if (id.includes('node_modules/@dnd-kit/')) return 'vendor-interactive';
          if (id.includes('node_modules/@sentry/react/')) return 'vendor-sentry';
        },
      },
    },
  }
});
