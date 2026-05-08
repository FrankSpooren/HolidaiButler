'use client';

import { useState, useEffect } from 'react';

interface DesktopEventsProps {
  locale?: string;
  destinationName?: string;
  destinationSlug?: string;
  limit?: number;
}

function getLocalizedString(val: unknown, locale: string): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
  }
  return '';
}

const CATEGORY_EMOJI: Record<string, string> = {
  muziek: '🎵', music: '🎵', concert: '🎵',
  sport: '🚴', actief: '🚴', active: '🚴',
  festival: '🎉', feest: '🎉', party: '🎉',
  theater: '🎭', comedy: '🎭', cabaret: '🎭',
  markt: '🛍️', market: '🛍️', beurs: '🛍️',
  kids: '👨‍👩‍👧‍👦', kinderen: '👨‍👩‍👧‍👦', family: '👨‍👩‍👧‍👦',
  natuur: '🌿', nature: '🌿', wandelen: '🥾',
  eten: '🍽️', food: '🍽️', culinair: '🍽️',
  kunst: '🎨', art: '🎨', expositie: '🎨',
};

function getCategoryEmoji(category?: string): string {
  if (!category) return '📅';
  const lower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '📅';
}

const SECTION_LABELS: Record<string, Record<string, string>> = {
  title: { nl: 'Vandaag op', en: 'Today on', de: 'Heute auf', es: 'Hoy en' },
  more: { nl: 'Meer evenementen', en: 'More events', de: 'Mehr Events', es: 'Más eventos' },
  noEvents: { nl: 'Geen evenementen vandaag', en: 'No events today', de: 'Keine Events heute', es: 'Sin eventos hoy' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(event: any): string {
  const date = event.startDate || event.start_date;
  if (!date) return '';
  const d = new Date(date);
  const h = d.getHours();
  if (h === 0) return '';
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocationName(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') return loc.name || loc.venue || '';
  return '';
}



const todayEventsStyles = `
  .today-events-grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
  }
  .today-events-grid > * {
    scroll-snap-align: start;
    flex: 0 0 280px;
  }
  @container (min-width: 600px) {
    .today-events-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      overflow-x: visible;
      scroll-snap-type: none;
    }
    .today-events-grid > * {
      flex: none;
    }
  }
  @container (min-width: 900px) {
    .today-events-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;
export default function DesktopEvents({ locale = 'nl', destinationName = 'Texel', limit = 6 }: DesktopEventsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/events?limit=${limit}&date=${today}&distance=5`);
        const data = await res.json();
        setEvents(data?.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [limit]);

  const openEvent = (id: number) => {
    window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { eventId: id } }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Events" style={{ containerType: 'inline-size' }}>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="today-events-grid gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Events" style={{ containerType: 'inline-size' }}>
        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
          {SECTION_LABELS.title[locale] || SECTION_LABELS.title.en} {destinationName}
        </h2>
        <p className="text-gray-500">{SECTION_LABELS.noEvents[locale] || SECTION_LABELS.noEvents.en}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Events" style={{ containerType: 'inline-size' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">
          {SECTION_LABELS.title[locale] || SECTION_LABELS.title.en} {destinationName}
        </h2>
        <a href="/events" className="text-sm font-medium hover:underline" style={{ color: 'var(--hb-primary)' }}>
          {SECTION_LABELS.more[locale] || SECTION_LABELS.more.en} →
        </a>
      </div>
      <div className="today-events-grid gap-4">
        {events.slice(0, limit).map((event) => {
          const title = getLocalizedString(event.title, locale);
          const time = formatTime(event);
          const location = getLocationName(event.location);
          const category = event.category || '';
          const emoji = getCategoryEmoji(category);
          const image = event.image;

          return (
            <button
              key={event.id}
              onClick={() => openEvent(event.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-md transition-shadow"
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={title} className="w-full h-36 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-36 flex items-center justify-center text-4xl" style={{ backgroundColor: 'var(--hb-primary-light, #e8f5e9)' }}>
                  {emoji}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {category && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--hb-primary)' }}>
                      {emoji} {category}
                    </span>
                  )}
                  {time && <span className="text-xs text-gray-500">🕓 {time}</span>}
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-2">{title}</h3>
                {location && <p className="text-sm text-gray-500 mt-1 truncate">📍 {location}</p>}
              </div>
            </button>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: todayEventsStyles }} />
    </div>
  );
}
