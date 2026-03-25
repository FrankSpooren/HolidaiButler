'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { analytics } from '@/lib/analytics';

const AccessibilityModal = dynamic(
  () => import('@/components/layout/AccessibilityModal'),
  { ssr: false }
);

interface WcagButtonProps {
  locale: string;
}

export default function WcagButton({ locale }: WcagButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => { setOpen(true); analytics.wcag_modal_opened(); }}
        className="rounded transition-colors"
        aria-label="Accessibility settings"
        style={{
          minWidth: 40, minHeight: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 26, height: 26,
            background: '#3B5EAB',
            borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="4.5" r="2.2" />
            <path d="M12 8.5c-3.8 0-6.5.7-6.5.7l.8 2.8s1.8-.5 3.7-.6v2.1l-2.5 6.8 2.7 1 2-5.4 2 5.4 2.7-1-2.5-6.8v-2.1c1.9.1 3.7.6 3.7.6l.8-2.8S15.8 8.5 12 8.5z" />
          </svg>
        </div>
      </button>
      <AccessibilityModal isOpen={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  );
}
