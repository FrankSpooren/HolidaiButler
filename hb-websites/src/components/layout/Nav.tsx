'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FeatureFlags } from '@/types/tenant';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';

interface NavItemStyle {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  borderRadius?: string;
  backgroundColor?: string;
}

interface NavItem {
  label: string;
  href: string;
  featureFlag?: string;
  style?: NavItemStyle;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: '0.75rem',
  medium: '0.875rem',
  large: '1rem',
  xlarge: '1.125rem',
};

const FONT_WEIGHT_MAP: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

const BORDER_RADIUS_MAP: Record<string, string> = {
  sm: '4px',
  md: '8px',
  full: '9999px',
};

function navItemStyle(s?: NavItemStyle): React.CSSProperties {
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.color) style.color = s.color;
  if (s.fontSize && FONT_SIZE_MAP[s.fontSize]) style.fontSize = FONT_SIZE_MAP[s.fontSize];
  if (s.fontWeight && FONT_WEIGHT_MAP[s.fontWeight]) style.fontWeight = FONT_WEIGHT_MAP[s.fontWeight];
  if (s.backgroundColor) { style.backgroundColor = s.backgroundColor; style.padding = '4px 12px'; }
  if (s.borderRadius && BORDER_RADIUS_MAP[s.borderRadius]) style.borderRadius = BORDER_RADIUS_MAP[s.borderRadius];
  return style;
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
                style={navItemStyle(item.style)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <SearchBar />
        <LanguageSwitcher locale={locale} />
      </div>

      {/* Mobile: language switcher + hamburger */}
      <div className="flex md:hidden items-center gap-1">
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
                  style={navItemStyle(item.style)}
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
