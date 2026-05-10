'use client';

import { useState, useEffect } from 'react';

/**
 * OpeningHours Block — VII-E2 Batch B, Block B4
 *
 * Shows opening hours from POI data or manual config.
 * Highlights "Open now" status with reactive updates.
 */

export interface OpeningHoursProps {
  source?: 'poi' | 'manual';
  poiId?: number;
  manualHours?: Array<{ day: string; from?: string; to?: string; closed?: boolean }>;
  showOpenNow?: boolean;
  variant?: 'compact' | 'detailed';
}

const DAY_LABELS: Record<string, Record<string, string>> = {
  mon: { en: 'Monday', nl: 'Maandag', de: 'Montag', es: 'Lunes' },
  tue: { en: 'Tuesday', nl: 'Dinsdag', de: 'Dienstag', es: 'Martes' },
  wed: { en: 'Wednesday', nl: 'Woensdag', de: 'Mittwoch', es: 'Miercoles' },
  thu: { en: 'Thursday', nl: 'Donderdag', de: 'Donnerstag', es: 'Jueves' },
  fri: { en: 'Friday', nl: 'Vrijdag', de: 'Freitag', es: 'Viernes' },
  sat: { en: 'Saturday', nl: 'Zaterdag', de: 'Samstag', es: 'Sabado' },
  sun: { en: 'Sunday', nl: 'Zondag', de: 'Sonntag', es: 'Domingo' },
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface ParsedHours {
  day: string;
  from?: string;
  to?: string;
  closed?: boolean;
}

function isOpenNow(hours: ParsedHours[]): boolean {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7; // Monday=0
  const dayKey = DAY_ORDER[dayIndex];
  const todayHours = hours.find(h => h.day === dayKey);
  if (!todayHours || todayHours.closed) return false;
  if (!todayHours.from || !todayHours.to) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [fromH, fromM] = todayHours.from.split(':').map(Number);
  const [toH, toM] = todayHours.to.split(':').map(Number);
  const fromMin = fromH * 60 + fromM;
  const toMin = toH * 60 + toM;
  return currentMinutes >= fromMin && currentMinutes <= toMin;
}

export default function OpeningHours(props: OpeningHoursProps) {
  const {
    source = 'manual',
    poiId,
    manualHours,
    showOpenNow = true,
    variant = 'detailed',
  } = props;

  const [hours, setHours] = useState<ParsedHours[]>(manualHours || []);
  const [openNow, setOpenNow] = useState<boolean | null>(null);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    if (source === 'poi' && poiId) {
      fetch(`/api/v1/pois/${poiId}`)
        .then(r => r.json())
        .then(data => {
          const poi = data?.data || data;
          if (poi?.opening_hours_json) {
            try {
              const parsed = typeof poi.opening_hours_json === 'string' ? JSON.parse(poi.opening_hours_json) : poi.opening_hours_json;
              if (parsed?.periods) {
                const mapped = parsed.periods.map((p: any) => ({
                  day: DAY_ORDER[p.open?.day ?? 0] || 'mon',
                  from: p.open?.time ? `${p.open.time.slice(0,2)}:${p.open.time.slice(2)}` : undefined,
                  to: p.close?.time ? `${p.close.time.slice(0,2)}:${p.close.time.slice(2)}` : undefined,
                }));
                setHours(mapped);
              }
            } catch { /* ignore parse errors */ }
          }
        })
        .catch(() => {});
    } else if (manualHours) {
      setHours(manualHours);
    }
  }, [source, poiId, manualHours]);

  // Reactive open-now check
  useEffect(() => {
    if (!showOpenNow || hours.length === 0) return;
    const check = () => setOpenNow(isOpenNow(hours));
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [hours, showOpenNow]);

  if (hours.length === 0) return null;

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const closedLabel = locale === 'nl' ? 'Gesloten' : locale === 'de' ? 'Geschlossen' : locale === 'es' ? 'Cerrado' : 'Closed';
  const openLabel = locale === 'nl' ? 'Nu geopend' : locale === 'de' ? 'Jetzt geoffnet' : locale === 'es' ? 'Abierto ahora' : 'Open now';
  const closedNowLabel = locale === 'nl' ? 'Nu gesloten' : locale === 'de' ? 'Jetzt geschlossen' : locale === 'es' ? 'Cerrado ahora' : 'Closed now';

  return (
    <section className="opening-hours-block" role="region" aria-label={locale === 'nl' ? 'Openingstijden' : 'Opening hours'}>
      {showOpenNow && openNow !== null && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 ${openNow ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className={`w-2 h-2 rounded-full ${openNow ? 'bg-green-500' : 'bg-red-500'}`} />
          {openNow ? openLabel : closedNowLabel}
        </div>
      )}

      <div className={variant === 'compact' ? 'space-y-1' : 'space-y-2'}>
        {DAY_ORDER.map((dayKey, i) => {
          const entry = hours.find(h => h.day === dayKey);
          const isToday = i === todayIndex;
          return (
            <div
              key={dayKey}
              className={`flex justify-between items-center ${variant === 'compact' ? 'text-sm' : 'text-sm py-1.5 px-3 rounded-lg'} ${isToday ? 'font-semibold bg-blue-50' : ''}`}
            >
              <span className="text-gray-700">
                {(DAY_LABELS[dayKey] as Record<string, string>)[locale] || DAY_LABELS[dayKey].en}
              </span>
              <span className={entry?.closed ? 'text-red-500' : 'text-gray-900'}>
                {entry?.closed ? closedLabel : entry?.from && entry?.to ? `${entry.from} - ${entry.to}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
