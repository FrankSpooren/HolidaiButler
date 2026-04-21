// Lazy-load Sentry after initial render (performance optimization)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  // Defer Sentry init to after page load to avoid blocking FCP/LCP
  const initSentry = () => {
    import("@sentry/react").then((Sentry) => {
      try {
        Sentry.init({
          dsn: sentryDsn,
          environment: import.meta.env.MODE,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
          ],
          tracesSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });
        (window as typeof window & { Sentry: typeof Sentry }).Sentry = Sentry;
      } catch (error) {
        console.warn('Sentry/Bugsink initialization failed:', error);
      }
    }).catch(() => {});
  };
  if (document.readyState === 'complete') {
    setTimeout(initSentry, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(initSentry, 2000));
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA (Fase II-D.5)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
