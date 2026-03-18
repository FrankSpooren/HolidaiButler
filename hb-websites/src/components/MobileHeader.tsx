'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const AccessibilityModal = dynamic(
  () => import('./layout/AccessibilityModal'),
  { ssr: false }
);

interface MobileHeaderProps {
  brandName: string;
  locale: string;
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  navItems: { label: string; href: string }[];
  subtitle?: Record<string, string>;
}

/* ── i18n ── */
const SUBTITLES: Record<string, string> = {
  nl: 'Wat wil je ontdekken in Calpe?',
  en: 'What would you like to explore in Calpe?',
  de: 'Was möchtest du in Calpe entdecken?',
  es: '¿Qué quieres descubrir en Calpe?',
};

/* ── Language flag SVGs (no emoji) ── */
const FLAGS: Record<string, { label: string; svg: React.ReactNode }> = {
  nl: {
    label: 'Nederlands',
    svg: (
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="4.67" fill="#AE1C28" />
        <rect y="4.67" width="20" height="4.67" fill="#FFF" />
        <rect y="9.33" width="20" height="4.67" fill="#21468B" />
      </svg>
    ),
  },
  en: {
    label: 'English',
    svg: (
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="14" fill="#012169" />
        <path d="M0 0L20 14M20 0L0 14" stroke="#FFF" strokeWidth="2.4" />
        <path d="M0 0L20 14M20 0L0 14" stroke="#C8102E" strokeWidth="1.2" />
        <path d="M10 0V14M0 7H20" stroke="#FFF" strokeWidth="4" />
        <path d="M10 0V14M0 7H20" stroke="#C8102E" strokeWidth="2.4" />
      </svg>
    ),
  },
  de: {
    label: 'Deutsch',
    svg: (
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="4.67" fill="#000" />
        <rect y="4.67" width="20" height="4.67" fill="#DD0000" />
        <rect y="9.33" width="20" height="4.67" fill="#FFCC00" />
      </svg>
    ),
  },
  es: {
    label: 'Español',
    svg: (
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="3.5" fill="#AA151B" />
        <rect y="3.5" width="20" height="7" fill="#F1BF00" />
        <rect y="10.5" width="20" height="3.5" fill="#AA151B" />
      </svg>
    ),
  },
};

const LANGUAGES = Object.entries(FLAGS).map(([code, v]) => ({
  code,
  label: v.label,
  svg: v.svg,
}));

export default function MobileHeader({
  brandName,
  locale,
  greeting,
  primaryColor,
  secondaryColor,
  navItems,
  subtitle: subtitleProp,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [wcagOpen, setWcagOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const gradFrom = primaryColor || '#7FA594';
  const gradTo = secondaryColor || '#5E8B7E';
  const subtitle = subtitleProp?.[locale] || subtitleProp?.en || SUBTITLES[locale] || SUBTITLES.en;
  const greetingText = greeting || '¡Bienvenido! 👋';

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const handleLangSelect = (code: string) => {
    document.cookie = `hb_locale=${code};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    setLangOpen(false);
    window.location.reload();
  };

  const currentFlag = FLAGS[locale] || FLAGS.nl;

  return (
    <>
      <div className="md:hidden" style={{ background: `linear-gradient(160deg, ${gradFrom}, ${gradTo})` }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {/* Brand */}
          <span
            className="text-white font-bold text-lg"
            style={{ letterSpacing: '1.8px', textTransform: 'uppercase' }}
          >
            {brandName}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* WCAG icon */}
            <button
              onClick={() => setWcagOpen(true)}
              className="p-2 rounded transition-colors"
              aria-label="Accessibility settings"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#90CAF9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="8" r="1.5" fill="#90CAF9" stroke="none" />
                <path d="M12 11.5v5" />
                <path d="M8 13l4-1.5 4 1.5" />
                <path d="M10 21l2-4.5 2 4.5" />
              </svg>
            </button>

            {/* Language flag SVG */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="p-2 rounded flex items-center gap-1 transition-colors"
                aria-label="Switch language"
                style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {currentFlag.svg}
                <svg className={`w-3 h-3 text-white/80 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLangSelect(lang.code)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        lang.code === locale
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {lang.svg}
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-white rounded transition-colors"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div className="px-[18px] pb-[22px] pt-1">
          <p className="text-white text-xl font-semibold">{greetingText}</p>
          <p className="text-white/80 text-sm mt-1">{subtitle}</p>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="bg-white/95 backdrop-blur-sm shadow-lg">
            <ul className="flex flex-col py-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block px-6 py-3 text-gray-800 hover:bg-gray-50 transition-colors text-base"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AccessibilityModal isOpen={wcagOpen} onClose={() => setWcagOpen(false)} locale={locale} />
    </>
  );
}
