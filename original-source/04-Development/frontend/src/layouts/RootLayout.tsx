import { Outlet, useLocation } from 'react-router';
import { Header } from '../shared/components/Header';
import { HoliBotWidget } from '../shared/components/HoliBot';

/**
 * RootLayout - Main layout for most pages
 *
 * Structure:
 * - Header (Navigation, Logo, Hamburger menu)
 * - <Outlet /> (child route content)
 * - HoliBotWidget (native React AI assistant)
 *
 * Used by: Homepage, POI pages, Account (protected)
 * NOT used by: Auth pages (login/signup), Onboarding
 *
 * Enterprise Upgrade: Native React widget (replacing standalone IIFE widget)
 * - Context API + Zendesk pattern
 * - Lazy initialization for performance
 * - No React StrictMode issues
 * - Green header, golden line, logo top-left
 * - 6 platforms researched (MindTrip, Zendesk, Drift, etc.)
 */
export function RootLayout() {
  const location = useLocation();
  const isAccountPage = location.pathname === '/account';

  return (
    <div className="min-h-screen bg-bg-gray flex flex-col">
      {/* Header - Enterprise Navigation Component */}
      <Header />

      {/* Main Content - Child routes render here (includes page-specific footers) */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* HoliBotWidget - Native React AI Travel Assistant (hidden on Account page) */}
      {!isAccountPage && <HoliBotWidget />}
    </div>
  );
}
