import { createBrowserRouter } from 'react-router';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { Homepage } from '../pages/Homepage';
import { POILandingPage } from '../pages/POILandingPage';
import { POIDetailPage } from '../pages/POIDetailPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import AccountDashboard from '../pages/AccountDashboard';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import OnboardingFlow from '../pages/onboarding/OnboardingFlow';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TicketingDemo } from '../pages/TicketingDemo';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { protectedLoader } from './loaders/protectedLoader';

/**
 * Main Application Router
 *
 * Using React Router v7 Data Router (createBrowserRouter)
 * - Type safe routing
 * - Data loaders
 * - Error boundaries (custom ErrorBoundary component)
 * - Nested layouts
 *
 * Total Routes: 8
 * - Public: 6 (/, /pois, /pois/:id, /onboarding, /login, /signup, *)
 * - Protected: 1 (/account)
 */
export const router = createBrowserRouter([
  {
    // Root Layout (Header + Footer + Outlet)
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        // Homepage
        path: '/',
        element: <Homepage />,
      },
      {
        // POI Landing (Grid/List/Map views)
        path: '/pois',
        element: <POILandingPage />,
      },
      {
        // POI Detail
        path: '/pois/:id',
        element: <POIDetailPage />,
      },
      {
        // Favorites Page
        path: '/favorites',
        element: <FavoritesPage />,
      },
      {
        // Ticketing Demo Page (Phase 6 - Frontend Integration)
        path: '/ticketing-demo',
        element: <TicketingDemo />,
      },
      {
        // Account Dashboard (Protected Route)
        path: '/account',
        element: <AccountDashboard />,
        loader: protectedLoader,
      },
      {
        // 404 Not Found (catch-all)
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    // Auth Layout (centered card, no header/footer)
    element: <AuthLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        // Login
        path: '/login',
        element: <LoginPage />,
      },
      {
        // Signup
        path: '/signup',
        element: <SignupPage />,
      },
    ],
  },
  {
    // Onboarding Flow (no layout, standalone)
    path: '/onboarding',
    element: <OnboardingFlow />,
    errorElement: <ErrorBoundary />,
  },
]);
