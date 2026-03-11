'use client';

import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Espanol' },
];

interface LanguageSwitcherProps {
  locale: string;
}

export default function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (code: string) => {
    document.cookie = `hb_locale=${code};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    setOpen(false);
    window.location.reload();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-foreground/70 hover:text-primary transition-colors rounded"
        aria-label="Switch language"
      >
        <span>{locale.toUpperCase()}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                lang.code === locale
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-gray-50'
              }`}
            >
              <span className="font-medium mr-2">{lang.code.toUpperCase()}</span>
              <span className="text-muted">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
