'use client';

import { useState, useEffect } from 'react';

interface ProgramItem {
  id: number;
  type: 'poi' | 'event';
  name: string;
  image?: string;
  timeStart: string;
  timeEnd: string;
}

interface ProgramCardProps {
  locale: string;
  programSize?: number;
}

const LABELS: Record<string, Record<string, string>> = {
  title:   { nl: 'JOUW PROGRAMMA', en: 'YOUR PROGRAM', de: 'DEIN PROGRAMM', es: 'TU PROGRAMA' },
  details: { nl: 'Details', en: 'Details', de: 'Details', es: 'Detalles' },
  cta:     { nl: 'Zelf programma samenstellen', en: 'Build your own program', de: 'Eigenes Programm erstellen', es: 'Crea tu propio programa' },
};

function generateTimeSlots(count: number): { start: string; end: string }[] {
  const slots = [];
  let hour = 9;
  for (let i = 0; i < count; i++) {
    const duration = i === count - 1 ? 2 : 2.5;
    const startH = Math.floor(hour);
    const startM = (hour % 1) * 60;
    const endHour = hour + duration;
    const endH = Math.floor(endHour);
    const endM = (endHour % 1) * 60;
    slots.push({
      start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
      end: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    });
    hour = endHour;
  }
  return slots;
}

function getLocalizedString(val: unknown, locale: string): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
  }
  return '';
}

export default function ProgramCard({ locale, programSize = 4 }: ProgramCardProps) {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  useEffect(() => {
    async function load() {
      try {
        // Fetch top POIs + 1 event
        const poiLimit = Math.max(1, programSize - 1);
        const [poisRes, eventsRes] = await Promise.all([
          fetch(`/api/pois?limit=${poiLimit}&sort=rating:desc&min_rating=4&min_reviews=3`),
          fetch('/api/events?limit=1'),
        ]);

        const poisData = await poisRes.json();
        const eventsData = await eventsRes.json();

        const pois = (poisData?.data || []).slice(0, poiLimit);
        const events = (eventsData?.data || []).slice(0, 1);

        const combined: ProgramItem[] = [];
        const slots = generateTimeSlots(pois.length + events.length);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pois.forEach((p: any, i: number) => {
          const img = Array.isArray(p.images) && p.images.length > 0
            ? `/api/pois/${p.id}`.replace(/\/api\/pois\/\d+/, '') || p.images[0]
            : undefined;
          combined.push({
            id: p.id,
            type: 'poi',
            name: typeof p.name === 'string' ? p.name : getLocalizedString(p.name, locale),
            image: Array.isArray(p.images) ? p.images[0] : img,
            timeStart: slots[i]?.start || '09:00',
            timeEnd: slots[i]?.end || '11:00',
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events.forEach((e: any, i: number) => {
          const slotIdx = pois.length + i;
          combined.push({
            id: e.id,
            type: 'event',
            name: getLocalizedString(e.title, locale),
            image: e.image || undefined,
            timeStart: slots[slotIdx]?.start || '14:00',
            timeEnd: slots[slotIdx]?.end || '16:00',
          });
        });

        setItems(combined);
      } catch (err) {
        console.error('ProgramCard load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  const openChatbot = () => {
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: 'programma_samenstellen' } }));
  };

  const openDetail = (e: React.MouseEvent, item: ProgramItem) => {
    e.stopPropagation();
    if (item.type === 'poi') {
      window.dispatchEvent(new CustomEvent('hb:poi:open', { detail: { id: item.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { id: item.id } }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 mx-4 shadow-sm md:hidden">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="md:hidden">
      <button
        onClick={openChatbot}
        className="bg-white rounded-2xl p-5 mx-4 shadow-sm w-[calc(100%-2rem)] text-left"
      >
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-4">
          📋 {t('title')}
        </h3>

        <div className="relative">
          {items.map((item, idx) => (
            <div key={`${item.type}-${item.id}`} className="relative flex gap-3 mb-1">
              {/* Connector line */}
              {idx < items.length - 1 && (
                <div
                  className="absolute left-8 top-16 w-0.5 h-4"
                  style={{ backgroundColor: '#d5e8df' }}
                />
              )}

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                {item.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {item.type === 'event' ? '📅' : '📍'}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.timeStart} – {item.timeEnd}</p>
                <button
                  onClick={(e) => openDetail(e, item)}
                  className="text-xs font-medium mt-1 transition-colors"
                  style={{ color: 'var(--hb-primary)' }}
                >
                  {t('details')} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </button>

      {/* CTA */}
      <button
        onClick={openChatbot}
        className="mx-4 mt-3 w-[calc(100%-2rem)] py-3 rounded-xl text-sm font-semibold text-white text-center transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--hb-primary)' }}
      >
        📅 {t('cta')}
      </button>
    </div>
  );
}
