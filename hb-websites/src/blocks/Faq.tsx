'use client';

import { useState } from 'react';
import type { FaqProps } from '@/types/blocks';
import { sanitizeHtml } from '@/lib/sanitize';
import { analytics } from '@/lib/analytics';

export default function Faq({ items, title }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    if (openIndex !== idx) analytics.faq_toggled(items[idx].question);
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  // Schema.org FAQPage — rendered client-side since this is a client component
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/<[^>]*>/g, ''), // strip HTML for schema
      },
    })),
  };

  return (
    <section
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      style={{ containerType: 'inline-size' }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {title && (
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-8 text-center">
          {title}
        </h2>
      )}
      <div className="divide-y divide-border faq-list" role="list">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          const panelId = `faq-panel-${idx}`;
          const headingId = `faq-heading-${idx}`;
          return (
            <div key={idx} role="listitem">
              <h3>
                <button
                  id={headingId}
                  className="w-full flex items-center justify-between py-4 text-left text-foreground hover:text-primary transition-colors min-h-[48px]"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="text-base sm:text-lg font-medium pr-4">
                    {item.question}
                  </span>
                  <svg
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={headingId}
                className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] pb-4' : 'max-h-0'}`}
                hidden={!isOpen}
              >
                <div
                  className="prose prose-sm max-w-none text-muted"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @container (max-width: 500px) {
          .faq-list button { font-size: 0.95rem; padding-top: 0.75rem; padding-bottom: 0.75rem; }
        }
      `}} />
    </section>
  );
}
