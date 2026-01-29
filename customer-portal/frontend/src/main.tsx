import * as Sentry from "@sentry/react";

// Initialize Sentry/Bugsink before other imports
// Wrapped in try-catch to handle DSN validation errors gracefully
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
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
    // Expose Sentry globally for console testing
    (window as typeof window & { Sentry: typeof Sentry }).Sentry = Sentry;
  } catch (error) {
    console.warn('Sentry/Bugsink initialization failed:', error);
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
// Rebuild trigger: 1769709246
