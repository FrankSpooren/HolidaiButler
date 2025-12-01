import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// WCAG Accessibility Styles
import './styles/wcag.css';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { HoliBotWidget } from './components/HoliBot';
import { HoliBotProvider } from './contexts/HoliBotContext';

// Accessibility & Privacy Components (GDPR/WCAG Compliance)
import SkipToContent from './components/accessibility/SkipToContent';
import WCAGModal from './components/accessibility/WCAGModal';
import CookieConsent from './components/privacy/CookieConsent';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const POIListPage = lazy(() => import('./pages/poi/POIListPage'));
const POIDetailPage = lazy(() => import('./pages/poi/POIDetailPage'));
const TicketsPage = lazy(() => import('./pages/tickets/TicketsPage'));
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));
const RestaurantsPage = lazy(() => import('./pages/restaurants/RestaurantsPage'));
const RestaurantDetailPage = lazy(() => import('./pages/restaurants/RestaurantDetailPage'));
const AgendaPage = lazy(() => import('./pages/agenda/AgendaPage'));
const EventDetailPage = lazy(() => import('./pages/agenda/EventDetailPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const BookingsPage = lazy(() => import('./pages/user/BookingsPage'));
const FavoritesPage = lazy(() => import('./pages/user/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const ConfirmationPage = lazy(() => import('./pages/checkout/ConfirmationPage'));
const SearchResultsPage = lazy(() => import('./pages/search/SearchResultsPage'));

// Legal pages (GDPR Compliance)
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy'));

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#8b9ff7',
      dark: '#4c5fd7',
    },
    secondary: {
      main: '#764ba2',
      light: '#9d71c9',
      dark: '#52337b',
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: 'background.default',
    }}
  >
    <CircularProgress color="primary" size={48} />
  </Box>
);

function App() {
  // WCAG Modal state
  const [wcagModalOpen, setWcagModalOpen] = useState(false);

  // Apply saved WCAG preferences on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('wcag-preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        const root = document.documentElement;
        root.style.fontSize = `${prefs.fontSize || 100}%`;
        root.style.letterSpacing = `${prefs.letterSpacing || 0}px`;
        root.style.lineHeight = `${prefs.lineHeight || 1.5}`;
        if (prefs.contrast === 'high') root.classList.add('wcag-high-contrast');
        if (prefs.grayscale) root.classList.add('wcag-grayscale');
      } catch (error) {
        console.error('Error loading WCAG preferences:', error);
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {/* WCAG: Skip to main content link (keyboard navigation) */}
        <SkipToContent targetId="main-content" />

        <HoliBotProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
              {/* Public routes with layout */}
              <Route element={<Layout onAccessibilityClick={() => setWcagModalOpen(true)} />}>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchResultsPage />} />

                {/* POI / Experiences */}
                <Route path="experiences" element={<POIListPage />} />
                <Route path="experiences/:id" element={<POIDetailPage />} />
                <Route path="pois" element={<Navigate to="/experiences" replace />} />
                <Route path="pois/:id" element={<Navigate to="/experiences/:id" replace />} />

                {/* Tickets */}
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />

                {/* Restaurants */}
                <Route path="restaurants" element={<RestaurantsPage />} />
                <Route path="restaurants/:id" element={<RestaurantDetailPage />} />

                {/* Agenda / Events */}
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="agenda/:id" element={<EventDetailPage />} />
                <Route path="events" element={<Navigate to="/agenda" replace />} />
                <Route path="events/:id" element={<Navigate to="/agenda/:id" replace />} />

                {/* Checkout flow */}
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="checkout/confirmation" element={<ConfirmationPage />} />

                {/* Legal pages (GDPR Compliance) */}
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="cookies" element={<CookiePolicy />} />

                {/* User routes (protected) */}
                <Route path="account" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                <Route path="account/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
                <Route path="account/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="account/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              </Route>

              {/* Auth routes (no layout) */}
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* HoliBot Chat Widget */}
            <HoliBotWidget />
          </BrowserRouter>
        </HoliBotProvider>

        {/* Toast Notifications */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* GDPR: Cookie Consent Banner */}
        <CookieConsent
          onAccept={(preferences) => {
            console.log('Cookie preferences accepted:', preferences);
            // Initialize analytics/marketing based on preferences
            if (preferences.analytics) {
              // Initialize Google Analytics, etc.
            }
            if (preferences.marketing) {
              // Initialize marketing pixels, etc.
            }
          }}
          onReject={(preferences) => {
            console.log('Non-essential cookies rejected:', preferences);
          }}
          privacyPolicyUrl="/privacy"
          cookiePolicyUrl="/cookies"
        />

        {/* WCAG: Accessibility Settings Modal */}
        <WCAGModal
          isOpen={wcagModalOpen}
          onClose={() => setWcagModalOpen(false)}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
