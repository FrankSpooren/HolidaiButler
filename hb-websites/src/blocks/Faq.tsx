'use client';

import { useState } from 'react';
import type { FaqProps } from '@/types/blocks';
import { sanitizeHtml } from '@/lib/sanitize';

export default function Faq({ items, title }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {title && (
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-8 text-center">
          {title}
        </h2>
      )}
      <div className="divide-y divide-border">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx}>
              <button
                className="w-full flex items-center justify-between py-4 text-left text-foreground hover:text-primary transition-colors"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
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
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                role="region"
                className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] pb-4' : 'max-h-0'}`}
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
    </section>
  );
}
