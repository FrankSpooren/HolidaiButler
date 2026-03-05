'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FeatureFlags } from '@/types/tenant';

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

export default function Nav({ items, featureFlags }: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = (items.length > 0 ? items : DEFAULT_NAV).filter(
    (item) => !item.featureFlag || featureFlags[item.featureFlag]
  );

  return (
    <nav>
      {/* Desktop nav */}
      <ul className="hidden md:flex items-center gap-6">
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

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 text-foreground"
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

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface shadow-lg border-t z-50">
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
