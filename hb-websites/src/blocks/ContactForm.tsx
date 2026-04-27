'use client';

import { useState } from 'react';
import type { ContactFormProps } from '@/types/blocks';
import { analytics } from '@/lib/analytics';

export default function ContactForm({
  headline,
  description,
  fields = [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'subject', type: 'text', label: 'Subject', required: false },
    { name: 'message', type: 'textarea', label: 'Message', required: true },
  ],
  layout = 'default',
}: ContactFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setErrorMsg('Please accept the privacy policy'); return; }
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, consent: true, _hp: '' }),
      });
      const data = await res.json();
      if (data.success) {
        analytics.contact_form_submitted();
        setStatus('success');
        setFormData({});
        setConsent(false);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Failed to send message. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <section className="py-12 sm:py-16" role="region" aria-label="Contact">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-green-50 rounded-tenant p-8">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-xl font-heading font-bold text-green-800 mb-2">{typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Bericht verzonden!' : 'Message sent!'}</h3>
            <p className="text-green-700">{typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Bedankt voor je bericht. We nemen zo snel mogelijk contact op.' : 'Thank you for your message. We\'ll get back to you soon.'}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm text-primary underline hover:no-underline"
            >
              Send another message
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16" style={{ containerType: 'inline-size' }} role="region" aria-label={headline || 'Contact'}>
      <div className={`max-w-${layout === 'side-by-side' ? '7xl' : '2xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        {(headline || description) && (
          <div className="mb-8 text-center">
            {headline && <h2 className="text-2xl sm:text-3xl font-heading font-bold">{headline}</h2>}
            {description && <p className="mt-2 text-muted">{description}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field — hidden from humans */}
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            aria-hidden="true"
          />

          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={5}
                  className="w-full rounded-tenant border border-border bg-background px-3 py-3 text-foreground min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  name={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full rounded-tenant border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full rounded-tenant border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          ))}

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="contact-consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="contact-consent" className="text-sm text-muted">
              I agree to the processing of my data. See our{' '}
              <a href="/privacy" className="underline hover:no-underline">privacy policy</a>.
            </label>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full sm:w-auto px-8 py-3 bg-primary text-on-primary rounded-tenant font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === 'sending' ? (typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Bezig...' : 'Sending...') : (typeof window !== 'undefined' && document.documentElement.lang === 'nl' ? 'Verstuur bericht' : 'Send Message')}
          </button>
        </form>
      </div>
    </section>
  );
}
