import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { buildTheme } from './theme.js';
import App from './App.jsx';
import useAuthStore from './stores/authStore.js';
import useThemeStore from './stores/themeStore.js';
import './i18n/index.js';

// Sentry / Bugsink
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

// Initialize auth on app load
useAuthStore.getState().initialize();

function Root() {
  const mode = useThemeStore(s => s.mode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{ padding: 40, textAlign: 'center' }}>Er is een fout opgetreden. Ververs de pagina.</div>}>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
