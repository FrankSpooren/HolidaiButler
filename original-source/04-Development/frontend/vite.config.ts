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
  server: {
    allowedHosts: [
      'masako-uncombable-unobdurately.ngrok-free.dev',
      '.ngrok-free.dev', // Allow all ngrok-free.dev subdomains
    ],
  },
})
