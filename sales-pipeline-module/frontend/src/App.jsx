/**
 * App Component - Main Application with Routing
 */

import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import useAuthStore from './store/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Pipeline = lazy(() => import('./pages/deals/Pipeline'));
const DealList = lazy(() => import('./pages/deals/DealList'));
const DealDetail = lazy(() => import('./pages/deals/DealDetail'));
const Accounts = lazy(() => import('./pages/accounts/Accounts'));
const AccountDetail = lazy(() => import('./pages/accounts/AccountDetail'));
const Contacts = lazy(() => import('./pages/contacts/Contacts'));
const ContactDetail = lazy(() => import('./pages/contacts/ContactDetail'));
const Leads = lazy(() => import('./pages/leads/Leads'));
const LeadDetail = lazy(() => import('./pages/leads/LeadDetail'));
const Campaigns = lazy(() => import('./pages/campaigns/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/campaigns/CampaignDetail'));
const Tasks = lazy(() => import('./pages/tasks/Tasks'));
const Activities = lazy(() => import('./pages/activities/Activities'));
const SharedInbox = lazy(() => import('./pages/inbox/SharedInbox'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const TeamManagement = lazy(() => import('./pages/admin/TeamManagement'));
const ImportExport = lazy(() => import('./pages/data/ImportExport'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}
  >
    <CircularProgress size={48} />
  </Box>
);

// Protected Route wrapper
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route wrapper (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Pipeline & Deals */}
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/pipeline/:pipelineId" element={<Pipeline />} />
          <Route path="/deals" element={<DealList />} />
          <Route path="/deals/:id" element={<DealDetail />} />

          {/* Accounts */}
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />

          {/* Contacts */}
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />

          {/* Leads */}
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />

          {/* Campaigns */}
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />

          {/* Tasks & Activities */}
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/activities" element={<Activities />} />

          {/* Shared Inbox */}
          <Route path="/inbox" element={<SharedInbox />} />
          <Route path="/inbox/:inboxId" element={<SharedInbox />} />

          {/* Reports */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportType" element={<Reports />} />

          {/* Data Management */}
          <Route path="/import-export" element={<ImportExport />} />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute requiredRole="admin">
                <TeamManagement />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:tab" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
