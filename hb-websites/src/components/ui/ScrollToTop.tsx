'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide on homepage (conflicts with bottom nav + chatbot)
  if (pathname === '/' || pathname === '') return null;
  if (!visible) return null;

  return (
    <button
      onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); analytics.scrollToTop(); }}
      className="fixed bottom-24 md:bottom-6 right-6 md:right-20 z-40 w-10 h-10 rounded-full bg-primary/80 text-on-primary shadow-lg hover:bg-primary transition-all duration-200 flex items-center justify-center animate-fade-in-up"
      aria-label="Scroll to top"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
