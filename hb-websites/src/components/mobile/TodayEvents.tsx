'use client';

import { useState, useEffect } from 'react';

interface TodayEventsProps {
  locale: string;
  destinationName?: string;
}

const LABELS: Record<string, Record<string, string>> = {
  title: { nl: 'Vandaag in', en: 'Today in', de: 'Heute in', es: 'Hoy en' },
  more:  { nl: 'Meer', en: 'More', de: 'Mehr', es: 'Más' },
  none:  { nl: 'Geen evenementen vandaag', en: 'No events today', de: 'Keine Veranstaltungen heute', es: 'Sin eventos hoy' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  music: '🎵',
  muziek: '🎵',
  sport: '⚽',
  festival: '🎉',
  fiesta: '🎉',
  market: '🛍️',
  markt: '🛍️',
  mercado: '🛍️',
  culture: '🎭',
  cultuur: '🎭',
  cultura: '🎭',
  food: '🍽️',
  eten: '🍽️',
  nature: '🌿',
  natuur: '🌿',
};

function getLocalizedString(val: unknown, locale: string): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
  }
  return '';
}

function getCategoryEmoji(category?: string): string {
  if (!category) return '📅';
  const lower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '📅';
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function TodayEvents({ locale, destinationName = 'Calpe' }: TodayEventsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/events?limit=8&date=${today}`);
        const data = await res.json();
        setEvents(data?.data || []);
      } catch (err) {
        console.error('TodayEvents load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="md:hidden px-4">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-36 h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-base font-bold text-gray-800">
          {t('title')} {destinationName}
        </h3>
        <a
          href="/events"
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--hb-primary)' }}
        >
          {t('more')} →
        </a>
      </div>

      {events.length === 0 ? (
        <p className="px-4 text-sm text-gray-500">{t('none')}</p>
      ) : (
        /* Horizontal scroll */
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
          {events.map((event) => {
            const name = getLocalizedString(event.title, locale);
            const time = formatTime(event.startDate || event.start_date);
            const emoji = getCategoryEmoji(event.category);

            return (
              <button
                key={event.id}
                onClick={() => window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { id: event.id } }))}
                className="flex-shrink-0 w-40 bg-white rounded-xl p-3 shadow-sm text-left transition-transform active:scale-[0.97]"
                style={{ scrollSnapAlign: 'start' }}
              >
                <span className="text-2xl">{emoji}</span>
                <p className="text-sm font-semibold text-gray-800 mt-1.5 line-clamp-2 leading-snug">{name}</p>
                {time && <p className="text-xs text-gray-500 mt-1">{time}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
