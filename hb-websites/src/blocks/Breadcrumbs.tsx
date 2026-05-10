'use client';

import { useMemo } from 'react';

/**
 * Breadcrumbs Block — VII-E2 Batch C, Block C1
 *
 * Auto-generates breadcrumbs from URL or accepts manual items.
 * Schema.org BreadcrumbList JSON-LD for SEO.
 * WCAG: nav landmark, aria-label, aria-current="page".
 */

export interface BreadcrumbsProps {
  source?: 'auto_url' | 'manual';
  manualItems?: Array<{ label: string; href?: string }>;
  showHomeIcon?: boolean;
  separator?: '>' | '/' | '\u00B7' | 'chevron';
  variant?: 'compact' | 'full';
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function autoGenerateBreadcrumbs(): BreadcrumbItem[] {
  if (typeof window === 'undefined') return [];
  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment
      .replace(/-/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
    items.push({ label, href: currentPath });
  }
  // Last item has no href (current page)
  if (items.length > 1) {
    items[items.length - 1].href = undefined;
  }
  return items;
}

const SEPARATORS: Record<string, string> = {
  '>': '\u203A',
  '/': '/',
  '\u00B7': '\u00B7',
  chevron: '\u203A',
};

export default function Breadcrumbs(props: BreadcrumbsProps) {
  const {
    source = 'auto_url',
    manualItems,
    showHomeIcon = true,
    separator = 'chevron',
    variant = 'full',
  } = props;

  const items = useMemo(() => {
    if (source === 'manual' && manualItems?.length) return manualItems;
    return autoGenerateBreadcrumbs();
  }, [source, manualItems]);

  if (items.length <= 1) return null;

  const sep = SEPARATORS[separator] || '\u203A';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <>
      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.label,
              ...(item.href ? { item: `${origin}${item.href}` } : {}),
            })),
          }),
        }}
      />

      <nav
        aria-label="Breadcrumb"
        className={`breadcrumbs-block ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}
      >
        <ol className="flex items-center flex-wrap gap-1" role="list">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {i === 0 && showHomeIcon && (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
                {isLast ? (
                  <span aria-current="page" className="text-gray-900 font-medium">{item.label}</span>
                ) : (
                  <>
                    <a href={item.href} className="text-gray-500 hover:text-gray-700 transition-colors">{item.label}</a>
                    <span className="text-gray-300 mx-1" aria-hidden="true">{sep}</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
