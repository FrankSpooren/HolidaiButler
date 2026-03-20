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
          fetch(`/api/pois?limit=${poiLimit}&sort=rating:desc&min_rating=4&min_reviews=10&categories=${encodeURIComponent('Food & Drinks,Active,Nature,Culture,Beach')}`),
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

  const langParam = locale !== 'en' ? `?lang=${locale}` : '';

  // POI block click → generic production POIs page
  const openPoisPage = () => {
    window.location.href = `https://holidaibutler.com/pois${langParam}`;
  };

  // CTA "Programma samenstellen" → open chatbot as popup
  const openChatbot = () => {
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: 'program' } }));
  };

  // Details button → production POI/Event detail page
  const openDetail = (e: React.MouseEvent, item: ProgramItem) => {
    e.stopPropagation();
    if (item.type === 'poi') {
      window.location.href = `https://holidaibutler.com/pois/${item.id}${langParam}`;
    } else {
      window.location.href = `https://holidaibutler.com/agenda${langParam}`;
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
      <div
        className="bg-white rounded-2xl p-5 mx-4 shadow-sm w-[calc(100%-2rem)] text-left"
      >
        <h3
          className="text-sm font-bold tracking-wider mb-4"
          style={{ fontFamily: "var(--hb-font-body), sans-serif", color: '#5E8B7E', fontStyle: 'normal', textTransform: 'uppercase' }}
        >
          📋 {t('title')}
        </h3>

        <div className="relative flex flex-col items-stretch">
          {items.map((item, idx) => (
            <div key={`${item.type}-${item.id}`}>
              {/* Card sub-block — bordered, conform template */}
              <div
                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors active:bg-gray-50"
                style={{ border: '1px solid #E5E7EB', backgroundColor: '#fff' }}
                onClick={openPoisPage}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                  {item.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {item.type === 'event' ? '📅' : '📍'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-900 truncate">{item.name}</p>
                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#5E8B7E' }}>🕓 {item.timeStart} – {item.timeEnd}</p>
                </div>

                {/* Details button */}
                <button
                  onClick={(e) => openDetail(e, item)}
                  className="flex-shrink-0 text-[13px] font-semibold rounded-lg whitespace-nowrap transition-colors active:bg-[#d5e8df]"
                  style={{
                    color: '#5E8B7E',
                    backgroundColor: '#f0f7f4',
                    border: '1px solid #d5e8df',
                    padding: '6px 14px',
                  }}
                >
                  {t('details')}
                </button>
              </div>
              {/* Connector line between cards */}
              {idx < items.length - 1 && (
                <div className="flex justify-start" style={{ paddingLeft: 28 }}>
                  <div style={{ width: 2, height: 20, backgroundColor: '#d5e8df' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
