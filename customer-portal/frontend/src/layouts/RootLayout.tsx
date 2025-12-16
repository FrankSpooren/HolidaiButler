import { Outlet, useLocation } from 'react-router';
import { Header } from '../shared/components/Header';
import { Footer } from '../shared/components/Footer';
import { HoliBotWidget } from '../shared/components/HoliBot';
import { ScrollToTop } from '../shared/components/ScrollToTop';

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
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Header - Enterprise Navigation Component */}
      <Header />

      {/* Main Content - Child routes render here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Enterprise Footer Component (hidden on Homepage which has its own) */}
      {location.pathname !== '/' && <Footer />}

      {/* HoliBotWidget - Native React AI Travel Assistant (hidden on Account page) */}
      {!isAccountPage && <HoliBotWidget />}
    </div>
  );
}
