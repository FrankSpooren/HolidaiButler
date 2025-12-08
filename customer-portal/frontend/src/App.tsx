import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from './lib/react-query';
import { router } from './routes/router';
import { HoliBotProvider } from './shared/contexts/HoliBotContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { FavoritesProvider } from './shared/contexts/FavoritesContext';
import { ComparisonProvider } from './shared/contexts/ComparisonContext';

/**
 * App Component - Main Application Entry Point
 *
 * Provides:
 * - Language Context (i18n for 5 languages: nl, en, de, es, sv)
 * - HoliBot Context (native React widget state management)
 * - React Query (data fetching, caching)
 * - React Router v7 (routing, navigation)
 *
 * Routing Setup:
 * - createBrowserRouter (Data Router pattern)
 * - 7 routes (/, /pois, /pois/:id, /login, /signup, *)
 * - 2 layouts (RootLayout, AuthLayout)
 *
 * Production-ready: DevTools removed for clean UI
 *
 * Enterprise Pattern: Providers high in component tree
 */
function App() {
  return (
    <LanguageProvider>
      <FavoritesProvider>
        <ComparisonProvider>
          <HoliBotProvider>
            <QueryClientProvider client={queryClient}>
              {/* React Router v7 - Data Router */}
              <RouterProvider router={router} />
            </QueryClientProvider>
          </HoliBotProvider>
        </ComparisonProvider>
      </FavoritesProvider>
    </LanguageProvider>
  );
}

export default App;
