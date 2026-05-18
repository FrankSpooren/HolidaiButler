import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin: redirect @mui/icons-material/<Icon> -> @mui/icons-material/esm/<Icon>
// Reason: Rolldown/Oxc does not auto-interop CJS default exports for sub-path
// imports of @mui/icons-material (root files are CJS, /esm/ files are ESM).
// Under Vite 4 + esbuild this worked transparently; under Vite 8 it fails with
// React error #130 because the imported value is the CJS namespace { default: Fn }
// instead of the Fn itself.
function muiIconsEsmRedirect() {
  return {
    name: 'mui-icons-esm-redirect',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (
        source.startsWith('@mui/icons-material/') &&
        !source.startsWith('@mui/icons-material/esm/') &&
        source !== '@mui/icons-material'
      ) {
        const rewritten = source.replace(
          '@mui/icons-material/',
          '@mui/icons-material/esm/'
        );
        const resolved = await this.resolve(rewritten, importer, { skipSelf: true });
        if (resolved) return resolved;
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [muiIconsEsmRedirect(), react()],
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
    dedupe: ['react', 'react-dom'],
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
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /[\/]node_modules[\/](react|react-dom|react-router-dom|scheduler)[\/]/, priority: 30 },
            { name: 'vendor-mui', test: /[\/]node_modules[\/]@mui[\/]/, priority: 20 },
            { name: 'vendor-sentry', test: /[\/]node_modules[\/]@sentry[\/]react[\/]/, priority: 18 },
            { name: 'vendor-data', test: /[\/]node_modules[\/](@tanstack[\/]react-query|axios|zustand|i18next|react-i18next)[\/]/, priority: 15 },
            { name: 'vendor-interactive', test: /[\/]node_modules[\/]@dnd-kit[\/]/, priority: 12 }
          ]
        }
      }
    }
  }
});
