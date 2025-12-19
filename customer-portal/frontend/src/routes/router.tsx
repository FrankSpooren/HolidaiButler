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
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { ResendVerificationPage } from '../pages/auth/ResendVerificationPage';
import OnboardingFlow from '../pages/onboarding/OnboardingFlow';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TicketsPage } from '../pages/TicketsPage';
import { AgendaPage } from '../pages/AgendaPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import BookingFlow from '../pages/BookingFlow';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { protectedLoader } from './loaders/protectedLoader';
// Static Pages
import {
  AboutPage,
  HowItWorksPage,
  PartnersPage,
  FAQPage,
  ContactPage,
  HelpCenterPage,
  PrivacyPage,
  TermsPage,
  CookiesPage
} from '../pages/static';

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
        element: <FavoritesPage />,
      },
      {
        // Tickets Page - NEW Enterprise Ticketing with Adyen Integration
        path: '/tickets',
        element: <TicketsPage />,
      },
      {
        // Agenda Page - Events & Activities Calendar
        path: '/agenda',
        element: <AgendaPage />,
      },
      {
        // Reservations Page - Restaurant Bookings
        path: '/reservations',
        element: <ReservationsPage />,
      },
      {
        // Booking Flow - Complete booking process
        path: '/booking',
        element: <BookingFlow />,
      },
      {
        // Account Dashboard (Protected Route)
        path: '/account',
        element: <AccountDashboard />,
        loader: protectedLoader,
      },
      // Static Pages - Platform
      {
        path: '/about',
        element: <AboutPage />,
      },
      {
        path: '/how-it-works',
        element: <HowItWorksPage />,
      },
      {
        path: '/partners',
        element: <PartnersPage />,
      },
      // Static Pages - Support
      {
        path: '/faq',
        element: <FAQPage />,
      },
      {
        path: '/contact',
        element: <ContactPage />,
      },
      {
        path: '/help',
        element: <HelpCenterPage />,
      },
      // Static Pages - Legal
      {
        path: '/privacy',
        element: <PrivacyPage />,
      },
      {
        path: '/terms',
        element: <TermsPage />,
      },
      {
        path: '/cookies',
        element: <CookiesPage />,
      },
      {
        // Onboarding Flow (now with Header/Footer)
        path: '/onboarding',
        element: <OnboardingFlow />,
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
      {
        // Email Verification
        path: '/verify-email',
        element: <VerifyEmailPage />,
      },
      {
        // Resend Verification Email
        path: '/resend-verification',
        element: <ResendVerificationPage />,
      },
    ],
  },
]);
