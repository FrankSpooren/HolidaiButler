import { Outlet, useLocation } from 'react-router';
import { Header } from '../shared/components/Header';
import { Footer } from '../shared/components/Footer';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';
import { HoliBotWidget } from '../shared/components/HoliBot';
import { ScrollToTop } from '../shared/components/ScrollToTop';
import { usePageTracking } from '../shared/hooks/usePageTracking';
import '../shared/components/Breadcrumbs.css';

/**
 * RootLayout - Main layout for most pages (Fase II-D)
 *
 * Structure:
 * - Skip-to-content link (a11y)
 * - Header (Navigation, Logo, Hamburger menu)
 * - Breadcrumbs (context navigation)
 * - <Outlet /> (child route content)
 * - Footer
 * - HoliBotWidget (native React AI assistant)
 */
export function RootLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isAccountPage = location.pathname === '/account';
  usePageTracking();

  return (
    <div className="min-h-screen bg-bg-gray flex flex-col">
      {/* Skip to content link (a11y - Fase II-D.4) */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Header - Enterprise Navigation Component */}
      <Header />

      {/* Breadcrumbs - Context navigation (hidden on homepage) */}
      {!isHomePage && <Breadcrumbs />}

      {/* Main Content - Child routes render here */}
      <main id="main-content" className="flex-1" role="main">
        <Outlet />
      </main>

      {/* Footer (hidden on Homepage which has its own) */}
      {!isHomePage && <Footer />}

      {/* HoliBotWidget - Native React AI Travel Assistant (hidden on Account page) */}
      {!isAccountPage && <HoliBotWidget />}
    </div>
  );
}
