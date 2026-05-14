import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { buildTheme } from './theme.js';
import App from './App.jsx';
import useAuthStore from './stores/authStore.js';
import useThemeStore from './stores/themeStore.js';
import './i18n/index.js';

// Sentry / Bugsink — lazy init (not in critical path)
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1
    });
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,  // 30s before refetch on remount (events refresh sooner via socket invalidate)
    },
    mutations: {
      // Default mutations: invalidate broad content cache on success.
      // Specifieke mutations (approve, schedule, ...) overschrijven met onMutate/onError voor optimistic patterns.
    },
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
    <QueryClientProvider client={queryClient}>
      <Root />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
    </QueryClientProvider>
  </React.StrictMode>
);
