import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import useAuthStore from './stores/authStore.js';
import { isStudioMode } from './utils/studioMode.js';

// Route-level lazy loading — each page is a separate chunk
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AgentsSystemPage = lazy(() => import('./pages/AgentsSystemPage.jsx'));
const POIsPage = lazy(() => import('./pages/POIsPage.jsx'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const CommercePage = lazy(() => import('./pages/CommercePage.jsx'));
const PartnersPage = lazy(() => import('./pages/PartnersPage.jsx'));
const FinancialPage = lazy(() => import('./pages/FinancialPage.jsx'));
const IntermediaryPage = lazy(() => import('./pages/IntermediaryPage.jsx'));
const BrandingPage = lazy(() => import('./pages/BrandingPage.jsx'));
const PagesNavigationPage = lazy(() => import('./pages/PagesNavigationPage.jsx'));
const MediaPage = lazy(() => import('./pages/MediaPage.jsx'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'));
const ContentStudioPage = lazy(() => import('./pages/ContentStudioPage.jsx'));
const AIQualityPage = lazy(() => import('./pages/AIQualityPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  );
}

function DefaultRedirect() {
  const user = useAuthStore(s => s.user);
  const studio = isStudioMode();
  const target = (studio || user?.destinationType === 'content_only') ? '/content-studio' : '/dashboard';
  return <Navigate to={target} replace />;
}

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={isAuthenticated ? <DefaultRedirect /> : <LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agents" element={<AgentsSystemPage />} />
              <Route path="/pois" element={<POIsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/issues" element={<Navigate to="/agents" replace />} />
              <Route path="/commerce" element={<CommercePage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/intermediary" element={<IntermediaryPage />} />
              <Route path="/branding" element={<BrandingPage />} />
              <Route path="/pages" element={<PagesNavigationPage />} />
              <Route path="/navigation" element={<Navigate to="/pages" replace />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/content-studio" element={<ContentStudioPage />} />
              <Route path="/ai-quality" element={<AIQualityPage />} />
            </Route>
          </Route>

          {/* Redirects & 404 */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
