import { createBrowserRouter } from 'react-router';
import { lazy, Suspense } from 'react';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { protectedLoader } from './loaders/protectedLoader';

// Critical pages - loaded immediately
import { Homepage } from '../pages/Homepage';
import { POILandingPage } from '../pages/POILandingPage';
import { POIDetailPage } from '../pages/POIDetailPage';
import { AgendaPage } from '../pages/AgendaPage';

// Lazy-loaded pages - loaded on demand for better initial load performance
const FavoritesPage = lazy(() => import('../pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AccountDashboard = lazy(() => import('../pages/AccountDashboard'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const ResendVerificationPage = lazy(() => import('../pages/auth/ResendVerificationPage').then(m => ({ default: m.ResendVerificationPage })));
const OnboardingFlow = lazy(() => import('../pages/onboarding/OnboardingFlow'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const TicketsPage = lazy(() => import('../pages/TicketsPage').then(m => ({ default: m.TicketsPage })));
const ReservationsPage = lazy(() => import('../pages/ReservationsPage').then(m => ({ default: m.ReservationsPage })));
const BookingFlow = lazy(() => import('../pages/BookingFlow'));

// Static Pages - lazy loaded
const AboutPage = lazy(() => import('../pages/static/AboutPage').then(m => ({ default: m.AboutPage })));
const HowItWorksPage = lazy(() => import('../pages/static/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const PartnersPage = lazy(() => import('../pages/static/PartnersPage').then(m => ({ default: m.PartnersPage })));
const FAQPage = lazy(() => import('../pages/static/FAQPage').then(m => ({ default: m.FAQPage })));
const ContactPage = lazy(() => import('../pages/static/ContactPage').then(m => ({ default: m.ContactPage })));
const HelpCenterPage = lazy(() => import('../pages/static/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const PrivacyPage = lazy(() => import('../pages/static/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('../pages/static/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import('../pages/static/CookiesPage').then(m => ({ default: m.CookiesPage })));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: 'var(--color-primary, #7FA594)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
      <div style={{ fontSize: '14px', opacity: 0.7 }}>Loading...</div>
    </div>
  </div>
);

// Wrapper for lazy components
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

/**
 * Main Application Router
 *
 * Using React Router v7 Data Router (createBrowserRouter)
 * - Type safe routing
 * - Data loaders
 * - Error boundaries (custom ErrorBoundary component)
 * - Nested layouts
 *
 * Total Routes: 21
 * - Public: 19 (/, /pois, /pois/:id, /favorites, /agenda, /reservations, /tickets, /booking, /onboarding, /login, /signup, /about, /how-it-works, /partners, /faq, /contact, /help, /privacy, /terms, /cookies, *)
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
        element: <LazyWrapper><FavoritesPage /></LazyWrapper>,
      },
      {
        // Tickets Page - NEW Enterprise Ticketing with Adyen Integration
        path: '/tickets',
        element: <LazyWrapper><TicketsPage /></LazyWrapper>,
      },
      {
        // Agenda Page - Events & Activities Calendar
        path: '/agenda',
        element: <AgendaPage />,
      },
      {
        // Reservations Page - Restaurant Bookings
        path: '/reservations',
        element: <LazyWrapper><ReservationsPage /></LazyWrapper>,
      },
      {
        // Booking Flow - Complete booking process
        path: '/booking',
        element: <LazyWrapper><BookingFlow /></LazyWrapper>,
      },
      {
        // Account Dashboard (Protected Route)
        path: '/account',
        element: <LazyWrapper><AccountDashboard /></LazyWrapper>,
        loader: protectedLoader,
      },
      // Static Pages - Platform
      {
        path: '/about',
        element: <LazyWrapper><AboutPage /></LazyWrapper>,
      },
      {
        path: '/how-it-works',
        element: <LazyWrapper><HowItWorksPage /></LazyWrapper>,
      },
      {
        path: '/partners',
        element: <LazyWrapper><PartnersPage /></LazyWrapper>,
      },
      // Static Pages - Support
      {
        path: '/faq',
        element: <LazyWrapper><FAQPage /></LazyWrapper>,
      },
      {
        path: '/contact',
        element: <LazyWrapper><ContactPage /></LazyWrapper>,
      },
      {
        path: '/help',
        element: <LazyWrapper><HelpCenterPage /></LazyWrapper>,
      },
      // Static Pages - Legal
      {
        path: '/privacy',
        element: <LazyWrapper><PrivacyPage /></LazyWrapper>,
      },
      {
        path: '/terms',
        element: <LazyWrapper><TermsPage /></LazyWrapper>,
      },
      {
        path: '/cookies',
        element: <LazyWrapper><CookiesPage /></LazyWrapper>,
      },
      {
        // Onboarding Flow (now with Header/Footer)
        path: '/onboarding',
        element: <LazyWrapper><OnboardingFlow /></LazyWrapper>,
      },
      {
        // 404 Not Found (catch-all)
        path: '*',
        element: <LazyWrapper><NotFoundPage /></LazyWrapper>,
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
        element: <LazyWrapper><LoginPage /></LazyWrapper>,
      },
      {
        // Signup
        path: '/signup',
        element: <LazyWrapper><SignupPage /></LazyWrapper>,
      },
      {
        // Email Verification
        path: '/verify-email',
        element: <LazyWrapper><VerifyEmailPage /></LazyWrapper>,
      },
      {
        // Resend Verification Email
        path: '/resend-verification',
        element: <LazyWrapper><ResendVerificationPage /></LazyWrapper>,
      },
    ],
  },
]);
