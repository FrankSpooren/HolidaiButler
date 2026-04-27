'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SocialFeedProps } from '@/types/blocks';
import { hasConsent } from '@/components/modules/CookieBanner';

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const platformColors: Record<string, string> = {
  instagram: 'from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  tiktok: 'bg-black',
  youtube: 'bg-red-600',
};

export default function SocialFeed({
  platform,
  headline,
  showFollowButton = true,
}: SocialFeedProps) {
  const [consented, setConsented] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check global GDPR consent (marketing level) or legacy per-component consent
    return hasConsent('marketing') || localStorage.getItem('hb-social-consent') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for global consent updates from CookieBanner
  const handleConsentUpdate = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.marketing) {
      setConsented(true);
      setLoading(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('hb-consent-update', handleConsentUpdate);
    return () => window.removeEventListener('hb-consent-update', handleConsentUpdate);
  }, [handleConsentUpdate]);

  const handleConsent = () => {
    localStorage.setItem('hb-social-consent', 'true');
    setConsented(true);
    setLoading(true);
  };

  useEffect(() => {
    if (!consented || !loading) return;
    // Simulate loading embed (in production, load platform-specific embed scripts)
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [consented, loading]);

  const label = platformLabels[platform] ?? platform;

  return (
    <section role="region" aria-label="Social media" className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {headline && (
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-8">
            {headline}
          </h2>
        )}

        {!consented ? (
          <div className="bg-surface rounded-tenant p-8 text-center border border-border">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {label} Content
            </h3>
            <p className="text-sm text-muted mb-4">
              Loading {label} content requires third-party cookies. Click below to load the content.
            </p>
            <button
              onClick={handleConsent}
              className={`px-6 py-2.5 rounded-tenant text-white font-medium transition-opacity hover:opacity-90 ${
                platform === 'instagram' ? `bg-gradient-to-r ${platformColors.instagram}` : platformColors[platform] ?? 'bg-primary'
              }`}
            >
              Load {label} content
            </button>
          </div>
        ) : loading ? (
          <div className="bg-surface rounded-tenant p-12 text-center">
            <div className="animate-pulse">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/30" />
              <p className="text-sm text-muted">Loading {label}...</p>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="bg-surface rounded-tenant p-6 text-center border border-border">
            <p className="text-muted mb-4">
              {label} feed placeholder — embed integration configured per tenant.
            </p>
            {showFollowButton && (
              <a
                href="#"
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-tenant text-white font-medium transition-opacity hover:opacity-90 ${
                  platform === 'instagram' ? `bg-gradient-to-r ${platformColors.instagram}` : platformColors[platform] ?? 'bg-primary'
                }`}
              >
                Follow us on {label}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
