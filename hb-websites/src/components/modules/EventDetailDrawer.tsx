'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgendaEvent, I18nString } from '@/types/poi';
import { SkeletonDrawer } from '@/components/ui/Skeleton';
import { analytics } from '@/lib/analytics';

interface EventDetailDrawerProps {
  locale: string;
}

function getLocalizedString(value: I18nString | string | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
}

function getLocationName(location: AgendaEvent['location']): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.name ?? '';
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(
      locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    );
  } catch {
    return dateStr;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'music': '#7B2D8E', 'muziek': '#7B2D8E',
  'festival': '#E53935', 'sport': '#016193',
  'culture': '#253444', 'cultuur': '#253444',
  'market': '#b4892e', 'markt': '#b4892e',
  'food': '#4f766b', 'eten': '#4f766b',
  'kids': '#FF6B00', 'kinderen': '#FF6B00',
  'nature': '#7CB342', 'natuur': '#7CB342',
};

function getCatColor(cat: string): string {
  const lower = cat.toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#30c59b';
}

export default function EventDetailDrawer({ locale }: EventDetailDrawerProps) {
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<AgendaEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Listen for custom event
  useEffect(() => {
    const handler = (e: CustomEvent<{ eventId: number }>) => {
      const eventId = e.detail.eventId;
      setOpen(true);
      setLoading(true);
      setEvent(null);
      document.body.style.overflow = 'hidden';

      fetch(`/api/events/${eventId}`, {
        headers: { 'Accept-Language': locale },
      })
        .then(r => r.json())
        .then(data => {
          setEvent(data.event ?? null);
          if (data.event?.title) {
            const t = data.event.title;
            const title = typeof t === 'string' ? t : (t[locale] || t.en || Object.values(t)[0] || '');
            analytics.event_detail_opened(title);
          }
        })
        .catch(() => setEvent(null))
        .finally(() => setLoading(false));
    };

    window.addEventListener('hb:event:open', handler as EventListener);
    return () => window.removeEventListener('hb:event:open', handler as EventListener);
  }, [locale]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const title = event ? getLocalizedString(event.title, locale) : '';
  const description = event ? getLocalizedString(event.description, locale) : '';
  const locationName = event ? getLocationName(event.location) : '';
  const imageUrl = event?.images?.[0]?.url;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={close}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-full sm:w-[600px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-xl transition-colors"
          aria-label="Close"
        >
          &times;
        </button>

        {loading ? (
          <SkeletonDrawer />
        ) : !event ? (
          <div className="flex items-center justify-center h-64 text-muted">
            {locale === 'nl' ? 'Evenement niet gevonden' : 'Event not found'}
          </div>
        ) : (
          <>
            {/* Image or Date block */}
            {imageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-56 sm:h-72 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                {event.startDate && (() => {
                  const date = new Date(event.startDate);
                  if (isNaN(date.getTime())) return null;
                  return (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{date.getDate()}</div>
                      <div className="text-sm font-semibold text-primary/70 uppercase tracking-wider">
                        {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Category badge */}
              {event.primaryCategory && (
                <span
                  className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: getCatColor(event.primaryCategory) }}
                >
                  {event.primaryCategory}
                </span>
              )}

              {/* Title */}
              <h2 className="text-2xl font-heading font-bold text-foreground">{title}</h2>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>&#128197;</span>
                <span>{formatDate(event.startDate, locale)}</span>
                {event.endDate && event.endDate !== event.startDate && (
                  <span> &mdash; {formatDate(event.endDate, locale)}</span>
                )}
              </div>

              {/* Location */}
              {locationName && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>&#128205;</span>
                  <span>{locationName}</span>
                </div>
              )}

              {/* Pricing */}
              {event.pricing?.isFree && (
                <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {locale === 'nl' ? 'Gratis' : locale === 'de' ? 'Kostenlos' : locale === 'es' ? 'Gratis' : 'Free'}
                </span>
              )}

              {/* Description */}
              {description && (
                <div className="text-sm text-foreground/80 leading-relaxed">
                  {description.split('\n').map((p, i) => (
                    p.trim() ? <p key={i} className="mb-2">{p}</p> : null
                  ))}
                </div>
              )}

              {/* External link */}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <span>&#127760;</span>
                  {locale === 'nl' ? 'Meer informatie' : locale === 'de' ? 'Mehr Informationen' : locale === 'es' ? 'Mas informacion' : 'More information'}
                </a>
              )}

              {/* Map link for location with coordinates */}
              {event.location && typeof event.location === 'object' && event.location.coordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${event.location.coordinates.lat},${event.location.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <span>&#128205;</span> Google Maps
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
