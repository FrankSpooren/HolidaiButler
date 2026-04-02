'use client';

import { useState, useEffect } from 'react';
import { getPortalUrl } from '@/lib/portal-url';

interface TodayEventsProps {
  locale: string;
  destinationName?: string;
  destinationSlug?: string;
}

// Preposition per destination: Texel = "op" (island), Calpe = "in"
const DESTINATION_PREP: Record<string, Record<string, string>> = {
  texel: { nl: 'op', en: 'on', de: 'auf', es: 'en' },
};
const DEFAULT_PREP: Record<string, string> = { nl: 'in', en: 'in', de: 'in', es: 'en' };

const LABELS: Record<string, Record<string, string>> = {
  today: { nl: 'Vandaag', en: 'Today', de: 'Heute', es: 'Hoy' },
  more:  { nl: 'Meer', en: 'More', de: 'Mehr', es: 'Más' },
  none:  { nl: 'Geen evenementen vandaag', en: 'No events today', de: 'Keine Veranstaltungen heute', es: 'Sin eventos hoy' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  music: '🎵',
  muziek: '🎵',
  concert: '🎵',
  sport: '🚴',
  active: '🚴',
  actief: '🚴',
  festival: '🎉',
  fiesta: '🎉',
  nightlife: '🎉',
  nachtleven: '🎉',
  party: '🎉',
  market: '🛍️',
  markt: '🛍️',
  mercado: '🛍️',
  culture: '🏛️',
  cultuur: '🏛️',
  cultura: '🏛️',
  food: '🍽️',
  eten: '🍽️',
  drinks: '🍽️',
  gastronomy: '🍽️',
  gastronomie: '🍽️',
  nature: '🌿',
  natuur: '🌿',
  outdoor: '🌿',
  wellness: '🧘',
  yoga: '🧘',
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

const DATE_LABELS: Record<string, Record<string, string>> = {
  days: {
    nl: 'zo,ma,di,wo,do,vr,za',
    en: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    de: 'So,Mo,Di,Mi,Do,Fr,Sa',
    es: 'dom,lun,mar,mié,jue,vie,sáb',
  },
  months: {
    nl: 'jan,feb,mrt,apr,mei,jun,jul,aug,sep,okt,nov,dec',
    en: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
    de: 'Jan,Feb,Mär,Apr,Mai,Jun,Jul,Aug,Sep,Okt,Nov,Dez',
    es: 'ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic',
  },
};

function formatEventTime(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    // If time is midnight (00:00), show formatted date instead
    if (hours === 0 && minutes === 0) {
      const dayNames = (DATE_LABELS.days[locale] || DATE_LABELS.days.en).split(',');
      const monthNames = (DATE_LABELS.months[locale] || DATE_LABELS.months.en).split(',');
      return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    }
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function TodayEvents({ locale, destinationName = 'Calpe', destinationSlug }: TodayEventsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;
  const prep = (DESTINATION_PREP[destinationSlug || ''] || DEFAULT_PREP)[locale] || DEFAULT_PREP.en;

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/events?limit=8&date=${today}&distance=5`);
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
          {t('today')} {prep} {destinationName}
        </h3>
        <a
          href={`${getPortalUrl()}/agenda${locale !== 'en' ? `?lang=${locale}` : ''}`}
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
            const time = formatEventTime(event.startDate || event.start_date, locale);
            const emoji = getCategoryEmoji(event.primaryCategory || event.category);

            return (
              <button
                key={event.id}
                onClick={() => window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { eventId: event.id } }))}
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
