import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { WCAGModal } from './WCAGModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../contexts/DestinationContext';
import './Header.css';

/* ── Brand name mapping (destination-specific) ── */
const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

/* ── Mobile homepage URL per destination ── */
const MOBILE_HOME: Record<string, string> = {
  calpe: 'https://calpetrip.com',
  texel: 'https://texelmaps.nl',
};

export function Header() {
  const location = useLocation();
  const destination = useDestination();
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [wcagModalOpen, setWcagModalOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  // Use icon-only logo for POI pages, full logo for homepage
  const isHomePage = location.pathname === '/';

  const brandName = BRAND_NAMES[destination.id] || destination.name;
  const mobileHomeUrl = MOBILE_HOME[destination.id] || '/';

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleLangMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLangMenuOpen(!langMenuOpen);
  };

  const selectLang = (lang: string) => {
    setLanguage(lang as 'nl' | 'en' | 'de' | 'es' | 'sv' | 'pl');
    setLangMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        hamburgerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // All available languages
  const allLanguages = [
    { code: 'nl', name: 'Nederlands', flag: '/assets/flags/nl.png' },
    { code: 'en', name: 'English', flag: '/assets/flags/en.png' },
    { code: 'de', name: 'Deutsch', flag: '/assets/flags/de.png' },
    { code: 'es', name: 'Español', flag: '/assets/flags/es.png' },
    { code: 'sv', name: 'Svenska', flag: '/assets/flags/sv.png' },
    { code: 'pl', name: 'Polski', flag: '/assets/flags/pl.png' },
  ];

  // Filter languages based on destination config
  const languages = allLanguages.filter(lang =>
    destination.languages.includes(lang.code)
  );

  const currentLangData = languages.find(l => l.code === language) || languages[0];

  return (
    <header className="header">
      <div className={`header-content ${isHomePage ? 'homepage-header' : ''}`}>
        <a href="/" className="logo-container" style={{ textDecoration: 'none' }}>
          <span
            className="header-brand-name"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#5E8B7E',
              backgroundColor: 'white',
              padding: '6px 16px',
              borderRadius: '8px',
              display: 'inline-block',
            }}
          >
            {brandName}
          </span>
        </a>

        <div className="header-icons">
          <div className="lang-dropdown">
            <button
              className={`lang-selector ${langMenuOpen ? 'active' : ''}`}
              onClick={toggleLangMenu}
            >
              <img src={currentLangData.flag} alt="Language" className="lang-flag" />
              <span className="lang-chevron">▼</span>
            </button>
            {langMenuOpen && (
              <div className="lang-menu">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`lang-option ${language === lang.code ? 'active' : ''}`}
                    onClick={() => selectLang(lang.code)}
                  >
                    <img src={lang.flag} alt={lang.code.toUpperCase()} />
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="wcag-icon"
            onClick={() => setWcagModalOpen(true)}
            title="Accessibility Options"
            aria-label="Open accessibility settings"
          >
            <div
              style={{
                width: 26, height: 26,
                background: '#3B5EAB',
                borderRadius: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="4.5" r="2.2" />
                <path d="M12 8.5c-3.8 0-6.5.7-6.5.7l.8 2.8s1.8-.5 3.7-.6v2.1l-2.5 6.8 2.7 1 2-5.4 2 5.4 2.7-1-2.5-6.8v-2.1c1.9.1 3.7.6 3.7.6l.8-2.8S15.8 8.5 12 8.5z" />
              </svg>
            </div>
          </button>

          <div ref={hamburgerRef} className={`hamburger ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <nav ref={menuRef} className={`nav-menu ${menuOpen ? 'active' : ''}`}>
        <a href={mobileHomeUrl} className="nav-link" onClick={() => setMenuOpen(false)}>🏠 {t.nav.home}</a>
        <Link to="/pois" className="nav-link" onClick={() => setMenuOpen(false)}>🗺️ {t.nav.explore}</Link>
        <a
          href="#"
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            if ((window as unknown as { openHoliBot?: () => void }).openHoliBot) {
              (window as unknown as { openHoliBot: () => void }).openHoliBot();
              setMenuOpen(false);
            }
          }}
        >
          💬 {t.nav.holibot}
        </a>
        <Link to="/agenda" className="nav-link" onClick={() => setMenuOpen(false)}>📅 {t.nav.agenda}</Link>
        {/* TEMPORARILY DISABLED - modules not ready for production
        <Link to="/reservations" className="nav-link" onClick={() => setMenuOpen(false)}>🍽️ {t.nav.reservations || 'Reserveren'}</Link>
        <Link to="/tickets" className="nav-link" onClick={() => setMenuOpen(false)}>🎫 {t.nav.tickets || 'Tickets'}</Link>
        */}
        <Link to="/favorites" className="nav-link" onClick={() => setMenuOpen(false)}>❤️ {t.nav.favorites}</Link>
        <div className="nav-separator"></div>
        <Link to="/account" className="nav-link" onClick={() => setMenuOpen(false)}>👤 {t.nav.account}</Link>
        <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>ℹ️ {t.nav.about}</Link>
        <Link to="/faq" className="nav-link" onClick={() => setMenuOpen(false)}>❓ {t.nav.faq}</Link>
      </nav>

      <WCAGModal isOpen={wcagModalOpen} onClose={() => setWcagModalOpen(false)} />
    </header>
  );
}
