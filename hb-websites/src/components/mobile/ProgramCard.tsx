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

type DayPart = 'morning' | 'afternoon' | 'evening';

function getDayPart(): DayPart {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Only tourism-relevant categories: Actief, Stranden & Natuur, Cultuur & Geschiedenis, Recreatie, Eten & Drinken
const TOURISM_CATEGORIES = 'Active,Beaches & Nature,Culture & History,Recreation,Food & Drinks,Actief,Stranden & Natuur,Cultuur & Geschiedenis,Recreatie,Eten & Drinken';

// Map onboarding interest keys to API category names
const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  beach:    ['Beaches & Nature', 'Stranden & Natuur'],
  culture:  ['Culture & History', 'Cultuur & Geschiedenis'],
  nature:   ['Beaches & Nature', 'Stranden & Natuur', 'Recreation', 'Recreatie'],
  gastro:   ['Food & Drinks', 'Eten & Drinken'],
  active:   ['Active', 'Actief', 'Recreation', 'Recreatie'],
  nightlife:['Food & Drinks', 'Eten & Drinken'],
};

/** Read onboarding interests from localStorage and build a personalized category string */
function getPersonalizedCategories(): string {
  try {
    const raw = localStorage.getItem('hb_onboarding_data');
    if (!raw) return TOURISM_CATEGORIES;
    const data = JSON.parse(raw);
    const interests: string[] = data.interests;
    if (!Array.isArray(interests) || interests.length === 0) return TOURISM_CATEGORIES;
    // Build unique category set from user interests
    const cats = new Set<string>();
    for (const interest of interests) {
      const mapped = INTEREST_TO_CATEGORIES[interest];
      if (mapped) mapped.forEach(c => cats.add(c));
    }
    return cats.size > 0 ? Array.from(cats).join(',') : TOURISM_CATEGORIES;
  } catch {
    return TOURISM_CATEGORIES;
  }
}

const DAY_PART_CONFIG: Record<DayPart, { startHour: number }> = {
  morning:   { startHour: 9 },
  afternoon: { startHour: 13 },
  evening:   { startHour: 18 },
};

const DAY_PART_LABELS: Record<DayPart, Record<string, string>> = {
  morning:   { nl: 'OCHTENDPROGRAMMA', en: 'MORNING PROGRAM', de: 'MORGENPROGRAMM', es: 'PROGRAMA DE MAÑANA' },
  afternoon: { nl: 'MIDDAGPROGRAMMA', en: 'AFTERNOON PROGRAM', de: 'NACHMITTAGSPROGRAMM', es: 'PROGRAMA DE TARDE' },
  evening:   { nl: 'AVONDPROGRAMMA', en: 'EVENING PROGRAM', de: 'ABENDPROGRAMM', es: 'PROGRAMA DE ABEND' },
};

function generateTimeSlots(count: number, dayPart: DayPart): { start: string; end: string }[] {
  const slots = [];
  const startHour = DAY_PART_CONFIG[dayPart].startHour;
  // Calculate slot duration to fit within the day part window
  // Morning: 09-13 (4h), Afternoon: 13-18 (5h), Evening: 18-23 (5h)
  const maxHour = dayPart === 'morning' ? 13 : dayPart === 'afternoon' ? 18 : 23;
  const totalHours = maxHour - startHour;
  const slotDuration = Math.max(1, totalHours / count);

  let hour = startHour;
  for (let i = 0; i < count; i++) {
    const endHour = Math.min(hour + slotDuration, 23.5); // Never exceed 23:30
    const fmt = (h: number) => {
      const hh = Math.floor(h);
      const mm = Math.round((h % 1) * 60);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    slots.push({ start: fmt(hour), end: fmt(endHour) });
    hour = endHour;
  }
  return slots;
}

/**
 * Seeded pseudo-random shuffle so that the program stays stable per dayPart + date.
 * Uses a simple hash → LCG to produce deterministic order.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  // Simple hash from string
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  // LCG pseudo-random
  let s = Math.abs(h) || 1;
  const next = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

  const dayPart = getDayPart();

  useEffect(() => {
    async function load() {
      try {
        // Fetch POIs using personalized categories from onboarding + 1 event
        const poiLimit = Math.max(1, programSize - 1);
        const categories = getPersonalizedCategories();
        const [poisRes, eventsRes] = await Promise.all([
          fetch(`/api/pois?limit=${poiLimit * 2}&sort=rating:desc&min_rating=4&min_reviews=3&categories=${encodeURIComponent(categories)}`),
          fetch('/api/events?limit=3'),
        ]);

        const poisData = await poisRes.json();
        const eventsData = await eventsRes.json();

        // Deterministic shuffle: same result within a dayPart on a given date
        const allPois = poisData?.data || [];
        const today = new Date().toISOString().split('T')[0]; // e.g. "2026-03-23"
        const shuffled = seededShuffle(allPois, `${today}-${dayPart}`);
        const pois = shuffled.slice(0, poiLimit);
        // Pick first upcoming event (or random from available)
        const events = (eventsData?.data || []).slice(0, 1);

        const combined: ProgramItem[] = [];
        const slots = generateTimeSlots(pois.length + events.length, dayPart);

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
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
  };

  // Details button → open specific POI drawer or Event drawer
  const openDetail = (e: React.MouseEvent, item: ProgramItem) => {
    e.stopPropagation();
    if (item.type === 'poi') {
      window.dispatchEvent(new CustomEvent('hb:poi:open', { detail: { poiId: item.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { eventId: item.id } }));
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
          {dayPart === 'morning' ? '🌅' : dayPart === 'afternoon' ? '☀️' : '🌙'} {DAY_PART_LABELS[dayPart][locale] || DAY_PART_LABELS[dayPart].en}
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
