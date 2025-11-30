import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { WCAGModal } from './WCAGModal';
import { useLanguage } from '../../i18n/LanguageContext';
import './Header.css';

export function Header() {
  const location = useLocation();
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

  const languages = [
    { code: 'nl', name: 'Nederlands', flag: '/assets/flags/nl.png' },
    { code: 'en', name: 'English', flag: '/assets/flags/en.png' },
    { code: 'de', name: 'Deutsch', flag: '/assets/flags/de.png' },
    { code: 'es', name: 'Español', flag: '/assets/flags/es.png' },
    { code: 'sv', name: 'Svenska', flag: '/assets/flags/sv.png' },
    { code: 'pl', name: 'Polski', flag: '/assets/flags/pl.png' },
  ];

  const currentLangData = languages.find(l => l.code === language) || languages[1];

  return (
    <header className="header">
      <div className={`header-content ${isHomePage ? 'homepage-header' : ''}`}>
        {!isHomePage && (
          <Link to="/" className="logo-container">
            {/* Icon-Only Logo for non-homepage pages */}
            <svg className="logo-svg logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(50, 50)">
                <path d="M -30,15 Q -15,5 0,15 Q 15,25 30,15" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M -30,20 Q -15,10 0,20 Q 15,30 30,20" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6"/>
                <circle cx="0" cy="0" r="20" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="2,1"/>
                <g fill="#D4AF37">
                  <polygon points="0,-28 -3.5,-8 -12,-8 -6,-3 -8.5,6 0,0 8.5,6 6,-3 12,-8 3.5,-8" />
                </g>
                <g fill="#D4AF37" opacity="0.7">
                  <circle cx="0" cy="-20" r="1.5"/>
                  <circle cx="20" cy="0" r="1.5"/>
                  <circle cx="0" cy="20" r="1.5"/>
                  <circle cx="-20" cy="0" r="1.5"/>
                </g>
                <circle cx="0" cy="0" r="2" fill="white"/>
                <circle cx="0" cy="0" r="1" fill="#D4AF37"/>
              </g>
            </svg>
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
        <Link to="/" className="nav-link">🏠 {t.nav.home}</Link>
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
        <a href="#" className="nav-link">📅 {t.nav.agenda}</a>
        <Link to="/favorites" className="nav-link" onClick={() => setMenuOpen(false)}>❤️ {t.nav.favorites}</Link>
        <div className="nav-separator"></div>
        <Link to="/account" className="nav-link">👤 {t.nav.account}</Link>
        <a href="#" className="nav-link">ℹ️ {t.nav.about}</a>
        <a href="#" className="nav-link">❓ {t.nav.faq}</a>
      </nav>

      <WCAGModal isOpen={wcagModalOpen} onClose={() => setWcagModalOpen(false)} />
    </header>
  );
}
