'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import type { EventInput, DatesSetArg } from '@fullcalendar/core';

/**
 * CalendarView Block — VII-E2 Batch B, Block B6
 *
 * Enterprise calendar powered by FullCalendar (MIT).
 * Month, week, and agenda list views with i18n and WCAG support.
 */

export interface CalendarViewProps {
  source?: 'events_feed';
  categories?: string[];
  view?: 'dayGridMonth' | 'dayGridWeek' | 'listMonth';
  startDay?: 0 | 1; // 0=Sunday, 1=Monday
  showWeekNumbers?: boolean;
  enableQuickFilter?: boolean;
  title?: string;
  height?: string;
}

// FullCalendar locale imports
const LOCALE_MAP: Record<string, string> = {
  nl: 'nl', en: 'en', de: 'de', es: 'es', fr: 'fr',
};

const CATEGORY_COLORS: Record<string, string> = {
  music: '#7C3AED', festivals: '#EC4899', markets: '#F59E0B',
  active: '#FF6B00', nature: '#7CB342', food: '#E53935',
  culture: '#004B87', creative: '#8B5CF6',
};

export default function CalendarView(props: CalendarViewProps) {
  const {
    categories,
    view = 'dayGridMonth',
    startDay = 1,
    showWeekNumbers = false,
    title,
    height = 'auto',
  } = props;

  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (categories?.length) params.set('categories', categories.join(','));

    fetch(`/api/v1/agenda/events?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        const raw = data?.data ?? data ?? [];
        const mapped: EventInput[] = (Array.isArray(raw) ? raw : []).map((evt: any) => {
          const titleField = `title_${locale}`;
          const evtTitle = evt[titleField] || evt.title_en || evt.title || '';
          const cat = evt.primaryCategory || evt.category || '';
          const color = CATEGORY_COLORS[cat.toLowerCase()] || '#3b82f6';

          return {
            id: String(evt.id),
            title: evtTitle,
            start: evt.date || evt.startDate,
            end: evt.endDate || evt.date,
            url: `/event/${evt.id}`,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { category: cat, location: evt.location_name },
          };
        });
        setEvents(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categories, locale]);

  // Filter by category
  const displayEvents = activeCategory
    ? events.filter(e => (e.extendedProps as any)?.category?.toLowerCase() === activeCategory.toLowerCase())
    : events;

  // Extract unique categories
  const uniqueCategories = [...new Set(events.map(e => (e.extendedProps as any)?.category).filter(Boolean))];

  const viewLabels: Record<string, Record<string, string>> = {
    dayGridMonth: { en: 'Month', nl: 'Maand', de: 'Monat', es: 'Mes' },
    dayGridWeek: { en: 'Week', nl: 'Week', de: 'Woche', es: 'Semana' },
    listMonth: { en: 'Agenda', nl: 'Agenda', de: 'Agenda', es: 'Agenda' },
  };

  if (loading) {
    return (
      <section className="calendar-view-block">
        {title && <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>}
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-view-block" role="region" aria-label={title || (locale === 'nl' ? 'Evenementenkalender' : 'Event Calendar')}>
      {title && <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>}

      {/* Quick category filter */}
      {uniqueCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Category filter">
          <button
            onClick={() => setActiveCategory(null)}
            aria-pressed={!activeCategory}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {locale === 'nl' ? 'Alles' : 'All'} ({events.length})
          </button>
          {uniqueCategories.map(cat => {
            const isActive = activeCategory === cat;
            const color = CATEGORY_COLORS[cat.toLowerCase()] || '#3b82f6';
            const count = events.filter(e => (e.extendedProps as any)?.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                aria-pressed={isActive}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]"
                style={{
                  backgroundColor: isActive ? color : `${color}15`,
                  color: isActive ? '#fff' : color,
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* View switcher */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit" role="tablist">
        {(['dayGridMonth', 'dayGridWeek', 'listMonth'] as const).map(v => {
          const api = calendarRef.current?.getApi();
          const currentView = api?.view?.type || view;
          const isActive = currentView === v;
          return (
            <button
              key={v}
              role="tab"
              aria-selected={isActive}
              onClick={() => calendarRef.current?.getApi()?.changeView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px] ${
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {viewLabels[v]?.[locale] || viewLabels[v]?.en}
            </button>
          );
        })}
      </div>

      {/* FullCalendar */}
      <div className="fc-wrapper rounded-xl border border-gray-200 overflow-hidden bg-white">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin]}
          initialView={view}
          events={displayEvents}
          locale={LOCALE_MAP[locale] || 'en'}
          firstDay={startDay}
          weekNumbers={showWeekNumbers}
          height={height}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          buttonText={{
            today: locale === 'nl' ? 'Vandaag' : locale === 'de' ? 'Heute' : locale === 'es' ? 'Hoy' : 'Today',
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            if (info.event.url) window.location.href = info.event.url;
          }}
          eventDidMount={(info) => {
            // Add tooltip with location
            const location = info.event.extendedProps?.location;
            if (location) {
              info.el.title = `${info.event.title} — ${location}`;
            }
          }}
          dayMaxEvents={3}
          moreLinkText={(n) => locale === 'nl' ? `+${n} meer` : `+${n} more`}
          noEventsText={locale === 'nl' ? 'Geen evenementen' : 'No events'}
        />
      </div>
    </section>
  );
}
