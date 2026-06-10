'use client';

import { useState, useEffect } from 'react';

/**
 * OpeningHours Block — v2 BLOK E5 (22-05-2026)
 *
 * v2 verbeteringen:
 *   - FR locale toegevoegd (5 talen totaal)
 *   - Timezone-aware "NU OPEN" berekening (default Europe/Amsterdam)
 *   - "Sluit over X min" / "Opent over X min" realtime indicator
 *   - Reactive elke 60s update
 */

export interface OpeningHoursProps {
  source?: 'poi' | 'manual';
  poiId?: number;
  manualHours?: Array<{ day: string; from?: string; to?: string; closed?: boolean }>;
  showOpenNow?: boolean;
  variant?: 'compact' | 'detailed';
  timezone?: string;
}

type Locale = 'en' | 'nl' | 'de' | 'es' | 'fr';

const DAY_LABELS: Record<string, Record<Locale, string>> = {
  mon: { en: 'Monday',    nl: 'Maandag',   de: 'Montag',     es: 'Lunes',     fr: 'Lundi' },
  tue: { en: 'Tuesday',   nl: 'Dinsdag',   de: 'Dienstag',   es: 'Martes',    fr: 'Mardi' },
  wed: { en: 'Wednesday', nl: 'Woensdag',  de: 'Mittwoch',   es: 'Miercoles', fr: 'Mercredi' },
  thu: { en: 'Thursday',  nl: 'Donderdag', de: 'Donnerstag', es: 'Jueves',    fr: 'Jeudi' },
  fri: { en: 'Friday',    nl: 'Vrijdag',   de: 'Freitag',    es: 'Viernes',   fr: 'Vendredi' },
  sat: { en: 'Saturday',  nl: 'Zaterdag',  de: 'Samstag',    es: 'Sabado',    fr: 'Samedi' },
  sun: { en: 'Sunday',    nl: 'Zondag',    de: 'Sonntag',    es: 'Domingo',   fr: 'Dimanche' },
};

const LABELS: Record<string, Record<Locale, string>> = {
  closed:     { en: 'Closed',          nl: 'Gesloten',     de: 'Geschlossen',   es: 'Cerrado',      fr: 'Ferme' },
  openNow:    { en: 'Open now',        nl: 'Nu geopend',   de: 'Jetzt geoffnet', es: 'Abierto ahora', fr: 'Ouvert maintenant' },
  closedNow:  { en: 'Closed now',      nl: 'Nu gesloten',  de: 'Jetzt geschlossen', es: 'Cerrado ahora', fr: 'Ferme actuellement' },
  closesIn:   { en: 'Closes in',       nl: 'Sluit over',   de: 'Schliesst in',  es: 'Cierra en',    fr: 'Ferme dans' },
  opensIn:    { en: 'Opens in',        nl: 'Opent over',   de: 'Offnet in',     es: 'Abre en',      fr: 'Ouvre dans' },
  minutes:    { en: 'min',             nl: 'min',          de: 'Min',           es: 'min',          fr: 'min' },
  hours:      { en: 'h',               nl: 'u',            de: 'Std',           es: 'h',            fr: 'h' },
  regionLabel:{ en: 'Opening hours',   nl: 'Openingstijden', de: 'Offnungszeiten', es: 'Horario',  fr: "Heures d'ouverture" },
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface ParsedHours {
  day: string;
  from?: string;
  to?: string;
  closed?: boolean;
}

interface ZonedTime {
  dayIndex: number;
  minutes: number;
}

/**
 * Bepaalt huidige tijd in target timezone via Intl.DateTimeFormat. Returnt
 * day-index (mon=0..sun=6) + minuten sinds middernacht in die timezone.
 */
function getZonedTime(timezone: string): ZonedTime {
  const now = new Date();
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const weekday = (parts.find(p => p.type === 'weekday')?.value || 'Mon').toLowerCase().slice(0, 3);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const map: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
    return { dayIndex: map[weekday] ?? 0, minutes: hour * 60 + minute };
  } catch {
    const dayIndex = (now.getDay() + 6) % 7;
    return { dayIndex, minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

function parseHM(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Bepaalt open/closed status + minuten tot volgende state-transition.
 *   - status: 'open' | 'closed'
 *   - minutesUntilChange: positieve waarde, of null indien geen transitie vandaag
 */
function getStatus(hours: ParsedHours[], timezone: string): { status: 'open' | 'closed'; minutesUntilChange: number | null } {
  const { dayIndex, minutes } = getZonedTime(timezone);
  const todayKey = DAY_ORDER[dayIndex];
  const today = hours.find(h => h.day === todayKey);

  if (!today || today.closed) {
    // Zoek volgende open dag voor "opent over X" (alleen vandaag binnen scope)
    return { status: 'closed', minutesUntilChange: null };
  }
  const fromMin = parseHM(today.from);
  const toMin = parseHM(today.to);
  if (fromMin === null || toMin === null) return { status: 'closed', minutesUntilChange: null };

  if (minutes >= fromMin && minutes < toMin) {
    return { status: 'open', minutesUntilChange: toMin - minutes };
  }
  if (minutes < fromMin) {
    return { status: 'closed', minutesUntilChange: fromMin - minutes };
  }
  return { status: 'closed', minutesUntilChange: null };
}

function formatDuration(minutes: number, locale: Locale): string {
  if (minutes < 60) return `${minutes} ${LABELS.minutes[locale]}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ${LABELS.hours[locale]}` : `${h} ${LABELS.hours[locale]} ${m} ${LABELS.minutes[locale]}`;
}

export default function OpeningHours(props: OpeningHoursProps) {
  const {
    source = 'manual',
    poiId,
    manualHours,
    showOpenNow = true,
    variant = 'detailed',
    timezone = 'Europe/Amsterdam',
  } = props;

  const [hours, setHours] = useState<ParsedHours[]>(manualHours || []);
  const [statusInfo, setStatusInfo] = useState<{ status: 'open' | 'closed'; minutesUntilChange: number | null }>({ status: 'closed', minutesUntilChange: null });

  const locale = (typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en') as Locale;
  const safeLocale: Locale = ['en', 'nl', 'de', 'es', 'fr'].includes(locale) ? locale : 'en';

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
                const mapped = parsed.periods.map((p: { open?: { day?: number; time?: string }; close?: { time?: string } }) => ({
                  day: DAY_ORDER[p.open?.day ?? 0] || 'mon',
                  from: p.open?.time ? `${p.open.time.slice(0, 2)}:${p.open.time.slice(2)}` : undefined,
                  to: p.close?.time ? `${p.close.time.slice(0, 2)}:${p.close.time.slice(2)}` : undefined,
                }));
                setHours(mapped);
              }
            } catch { /* ignore parse errors */ }
          }
        })
        .catch(() => { /* graceful: keep manual hours */ });
    } else if (manualHours) {
      setHours(manualHours);
    }
  }, [source, poiId, manualHours]);

  useEffect(() => {
    if (!showOpenNow || hours.length === 0) return;
    const tick = () => setStatusInfo(getStatus(hours, timezone));
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [hours, showOpenNow, timezone]);

  if (hours.length === 0) return null;

  const { dayIndex: todayIndex } = getZonedTime(timezone);
  const { status, minutesUntilChange } = statusInfo;
  const isOpen = status === 'open';

  const transitionLabel = minutesUntilChange !== null
    ? (isOpen
        ? `${LABELS.closesIn[safeLocale]} ${formatDuration(minutesUntilChange, safeLocale)}`
        : `${LABELS.opensIn[safeLocale]} ${formatDuration(minutesUntilChange, safeLocale)}`)
    : null;

  return (
    <section className="opening-hours-block" role="region" aria-label={LABELS.regionLabel[safeLocale]}>
      {showOpenNow && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 ${isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
          {isOpen ? LABELS.openNow[safeLocale] : LABELS.closedNow[safeLocale]}
          {transitionLabel && (
            <span className="ml-1 text-xs opacity-80">— {transitionLabel}</span>
          )}
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
                {DAY_LABELS[dayKey][safeLocale] || DAY_LABELS[dayKey].en}
              </span>
              <span className={entry?.closed ? 'text-red-500' : 'text-gray-900'}>
                {entry?.closed
                  ? LABELS.closed[safeLocale]
                  : entry?.from && entry?.to
                    ? `${entry.from} - ${entry.to}`
                    : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
