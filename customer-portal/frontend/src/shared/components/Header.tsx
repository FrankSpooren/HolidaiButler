import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { WCAGModal } from './WCAGModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../contexts/DestinationContext';
import './Header.css';

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
        {!isHomePage && (
          <Link to="/" className="logo-container">
            {/* Brand Icon for non-homepage pages - destination aware */}
            <img
              src={destination.icon}
              alt={destination.name}
              className="header-logo-img"
            />
          </Link>
        )}

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </button>

          <div ref={hamburgerRef} className={`hamburger ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <nav ref={menuRef} className={`nav-menu ${menuOpen ? 'active' : ''}`}>
        <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>🏠 {t.nav.home}</Link>
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
