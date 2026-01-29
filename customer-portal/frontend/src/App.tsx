import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from './lib/react-query';
import { router } from './routes/router';
import { DestinationProvider } from './shared/contexts/DestinationContext';
import { HoliBotProvider } from './shared/contexts/HoliBotContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { FavoritesProvider } from './shared/contexts/FavoritesContext';
import { AgendaFavoritesProvider } from './shared/contexts/AgendaFavoritesContext';
import { VisitedProvider } from './shared/contexts/VisitedContext';
import { UserReviewsProvider } from './shared/contexts/UserReviewsContext';
import { ComparisonProvider } from './shared/contexts/ComparisonContext';
import { AgendaComparisonProvider } from './shared/contexts/AgendaComparisonContext';

/**
 * App Component - Main Application Entry Point
 *
 * Provides:
 * - Destination Context (multi-destination branding & config)
 * - Language Context (i18n for destination-specific languages)
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
 * Multi-destination: Config injected at build time via VITE_DESTINATION_ID
 */
function App() {
  return (
    <DestinationProvider>
      <LanguageProvider>
        <FavoritesProvider>
          <AgendaFavoritesProvider>
            <VisitedProvider>
              <UserReviewsProvider>
                <ComparisonProvider>
                <AgendaComparisonProvider>
                  <HoliBotProvider>
                    <QueryClientProvider client={queryClient}>
                      {/* React Router v7 - Data Router */}
                      <RouterProvider router={router} />
                    </QueryClientProvider>
                  </HoliBotProvider>
                </AgendaComparisonProvider>
              </ComparisonProvider>
              </UserReviewsProvider>
            </VisitedProvider>
          </AgendaFavoritesProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </DestinationProvider>
  );
}

export default App;
