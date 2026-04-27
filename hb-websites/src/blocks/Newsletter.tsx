'use client';

import { useState } from 'react';
import type { NewsletterProps } from '@/types/blocks';
import { analytics } from '@/lib/analytics';

const bgStyles: Record<string, string> = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary text-on-primary',
  surface: 'bg-surface text-foreground',
};

export default function Newsletter({
  headline = 'Stay up to date',
  description,
  backgroundColor = 'primary',
  layout = 'stacked',
  mailerliteGroupId,
}: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setErrorMsg('Please accept the privacy policy'); return; }
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          groupId: mailerliteGroupId,
          consent: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        analytics.newsletter_subscribed();
        setStatus('success');
        setEmail('');
        setName('');
        setConsent(false);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Subscription failed');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Failed to subscribe. Please try again.');
    }
  };

  const bg = bgStyles[backgroundColor] ?? bgStyles.primary;
  const isLight = backgroundColor === 'surface';

  if (status === 'success') {
    return (
      <section className={`${bg} py-12 sm:py-16`} role="region" aria-label="Newsletter">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <svg className={`w-10 h-10 mx-auto mb-3 ${isLight ? 'text-green-500' : 'opacity-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-xl font-heading font-bold mb-1">{typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Ingeschreven!' : 'Subscribed!'}</h3>
          <p className="opacity-80">{typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Controleer je e-mail om je inschrijving te bevestigen.' : 'Check your email to confirm your subscription.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${bg} py-12 sm:py-16`} style={{ containerType: 'inline-size' }} role="region" aria-label={headline}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={layout === 'inline' ? 'flex flex-col sm:flex-row items-center gap-6' : 'text-center'}>
          <div className={layout === 'inline' ? 'flex-1' : 'mb-6'}>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold">{headline}</h2>
            {description && <p className="mt-2 opacity-80">{description}</p>}
          </div>

          <form
            onSubmit={handleSubmit}
            className={`${layout === 'inline' ? 'flex-1' : 'max-w-md mx-auto'} space-y-3`}
          >
            <div className={layout === 'inline' ? 'flex gap-2' : 'space-y-3'}>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`flex-1 rounded-tenant px-4 py-3 text-foreground min-h-[44px] bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary ${layout === 'inline' ? 'min-w-0' : 'w-full'}`}
              />
              <input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`flex-1 rounded-tenant px-4 py-2.5 text-foreground bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary ${layout === 'inline' ? 'min-w-0' : 'w-full'}`}
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="newsletter-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="newsletter-consent" className={`text-xs ${isLight ? 'text-muted' : 'opacity-70'}`}>
                I agree to receive newsletters. See our <a href="/privacy" className="underline">privacy policy</a>.
              </label>
            </div>

            {errorMsg && <p className="text-sm text-red-300">{errorMsg}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              className={`w-full rounded-tenant px-6 py-2.5 font-medium transition-opacity disabled:opacity-50 ${
                isLight ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-on-primary text-primary hover:opacity-90'
              }`}
            >
              {status === 'sending' ? (typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Bezig...' : 'Subscribing...') : (typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Inschrijven' : 'Subscribe')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
