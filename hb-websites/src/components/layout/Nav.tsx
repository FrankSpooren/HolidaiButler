'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { FeatureFlags } from '@/types/tenant';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';

const AccessibilityModal = dynamic(() => import('./AccessibilityModal'), { ssr: false });

interface NavItem {
  label: string;
  href: string;
  featureFlag?: string;
}

interface NavProps {
  items: NavItem[];
  featureFlags: FeatureFlags;
  locale: string;
}

const DEFAULT_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Events', href: '/events', featureFlag: 'agenda' },
  { label: 'Tickets', href: '/tickets', featureFlag: 'ticketing' },
];

export default function Nav({ items, featureFlags, locale }: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wcagOpen, setWcagOpen] = useState(false);
  const navItems = (items.length > 0 ? items : DEFAULT_NAV).filter(
    (item) => !item.featureFlag || featureFlags[item.featureFlag]
  );

  return (
    <nav>
      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        <ul className="flex items-center gap-6">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-foreground/80 hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <SearchBar />
        <button
          onClick={() => setWcagOpen(true)}
          className="p-2 text-foreground/60 hover:text-primary transition-colors rounded"
          aria-label="Accessibility settings"
          title={locale === 'nl' ? 'Toegankelijkheid' : 'Accessibility'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 11.5v5" />
            <path d="M8 13l4-1.5 4 1.5" />
            <path d="M10 21l2-4.5 2 4.5" />
          </svg>
        </button>
        <LanguageSwitcher locale={locale} />
        <AccessibilityModal isOpen={wcagOpen} onClose={() => setWcagOpen(false)} locale={locale} />
      </div>

      {/* Mobile: language switcher + hamburger */}
      <div className="flex md:hidden items-center gap-1">
        <button
          onClick={() => setWcagOpen(true)}
          className="p-1.5 text-foreground/60 hover:text-primary transition-colors rounded"
          aria-label="Accessibility settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 11.5v5" />
            <path d="M8 13l4-1.5 4 1.5" />
            <path d="M10 21l2-4.5 2 4.5" />
          </svg>
        </button>
        <LanguageSwitcher locale={locale} />
        <button
          className="p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface shadow-lg border-t z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <SearchBar />
          </div>
          <ul className="flex flex-col py-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-6 py-3 text-foreground hover:bg-primary-light transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
