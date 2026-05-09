'use client';

import { useState, useEffect } from 'react';

/**
 * AddToCalendar Block — VII-E2 Batch B, Block B1
 *
 * Generates calendar links for Google, Apple/iCal, Outlook, Yahoo.
 * Can source event data from URL (event detail page) or manual input.
 */

export interface AddToCalendarProps {
  source?: 'event_id_from_url' | 'specific_event' | 'manual';
  eventId?: number;
  manualEvent?: {
    title: string;
    description?: string;
    startDate: string; // ISO 8601
    endDate?: string;
    location?: string;
  };
  providers?: ('google' | 'apple' | 'outlook' | 'yahoo')[];
  buttonStyle?: 'inline' | 'dropdown';
  variant?: 'compact' | 'full';
}

interface CalendarEvent {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
}

function formatDateForGoogle(date: string): string {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateForOutlook(date: string): string {
  return new Date(date).toISOString();
}

function generateGoogleUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForGoogle(event.startDate)}/${formatDateForGoogle(event.endDate)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateOutlookUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: formatDateForOutlook(event.startDate),
    enddt: formatDateForOutlook(event.endDate),
    body: event.description,
    location: event.location,
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function generateYahooUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatDateForGoogle(event.startDate),
    et: formatDateForGoogle(event.endDate),
    desc: event.description,
    in_loc: event.location,
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function generateIcsContent(event: CalendarEvent): string {
  const uid = `${Date.now()}@holidaibutler.com`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HolidaiButler//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatDateForGoogle(event.startDate)}`,
    `DTEND:${formatDateForGoogle(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcs(event: CalendarEvent) {
  const content = generateIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const PROVIDER_CONFIG = {
  google: { label: 'Google Calendar', icon: '📅', color: '#4285F4' },
  apple: { label: 'Apple / iCal', icon: '🍎', color: '#333' },
  outlook: { label: 'Outlook', icon: '📧', color: '#0078D4' },
  yahoo: { label: 'Yahoo Calendar', icon: '📆', color: '#6001D2' },
};

export default function AddToCalendar(props: AddToCalendarProps) {
  const {
    source = 'event_id_from_url',
    eventId,
    manualEvent,
    providers = ['google', 'apple', 'outlook', 'yahoo'],
    buttonStyle = 'dropdown',
    variant = 'compact',
  } = props;

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    if (source === 'manual' && manualEvent) {
      setEvent({
        title: manualEvent.title,
        description: manualEvent.description || '',
        startDate: manualEvent.startDate,
        endDate: manualEvent.endDate || manualEvent.startDate,
        location: manualEvent.location || '',
      });
      setLoading(false);
      return;
    }

    // Resolve event ID
    let id = eventId;
    if (source === 'event_id_from_url' && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/event\/(\d+)/);
      if (match) id = parseInt(match[1]);
    }
    if (!id) { setLoading(false); return; }

    fetch(`/api/v1/agenda/events/${id}`)
      .then(r => r.json())
      .then(data => {
        const e = data?.data || data;
        if (e) {
          const titleField = `title_${locale}`;
          const descField = `short_description_${locale}`;
          setEvent({
            title: e[titleField] || e.title_en || e.title || '',
            description: e[descField] || e.short_description_en || e.short_description || '',
            startDate: e.date || e.startDate || new Date().toISOString(),
            endDate: e.endDate || e.date || new Date().toISOString(),
            location: e.location_name || e.location?.name || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [source, eventId, manualEvent, locale]);

  if (loading || !event) return null;

  const handleProviderClick = (provider: string) => {
    if (!event) return;
    switch (provider) {
      case 'google':
        window.open(generateGoogleUrl(event), '_blank', 'noopener');
        break;
      case 'outlook':
        window.open(generateOutlookUrl(event), '_blank', 'noopener');
        break;
      case 'yahoo':
        window.open(generateYahooUrl(event), '_blank', 'noopener');
        break;
      case 'apple':
        downloadIcs(event);
        break;
    }
    setDropdownOpen(false);
    if (typeof window !== 'undefined' && (window as any).sa_event) {
      (window as any).sa_event('add_to_calendar', { provider, event_title: event.title });
    }
  };

  const btnLabel = locale === 'nl' ? 'Toevoegen aan agenda' : locale === 'de' ? 'Zum Kalender hinzufugen' : locale === 'es' ? 'Anadir al calendario' : 'Add to calendar';

  if (buttonStyle === 'inline') {
    return (
      <section className="add-to-calendar-block" role="region" aria-label={btnLabel}>
        <div className={`flex ${variant === 'compact' ? 'gap-2' : 'flex-col gap-3'}`}>
          {providers.map(p => {
            const cfg = PROVIDER_CONFIG[p];
            return (
              <button
                key={p}
                onClick={() => handleProviderClick(p)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <span aria-hidden="true">{cfg.icon}</span>
                {variant === 'full' && cfg.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // Dropdown variant
  return (
    <section className="add-to-calendar-block relative" role="region" aria-label={btnLabel}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {btnLabel}
        <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute z-40 mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-200 py-1">
          {providers.map(p => {
            const cfg = PROVIDER_CONFIG[p];
            return (
              <button
                key={p}
                onClick={() => handleProviderClick(p)}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <span aria-hidden="true" className="text-base">{cfg.icon}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
