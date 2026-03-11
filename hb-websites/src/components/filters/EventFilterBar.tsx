'use client';

import { useState, useMemo } from 'react';
import { CardImage, CardContent } from '@/components/ui/Card';
import EventCard from '@/components/ui/EventCard';
import Badge from '@/components/ui/Badge';
import type { I18nString } from '@/types/poi';
import EventFilterModal, { type EventFilters } from './EventFilterModal';

interface EventItem {
  id: number;
  title: I18nString | string;
  startDate: string;
  location?: { name?: string } | string;
  primaryCategory?: string;
  images?: { url: string }[];
  isFree?: boolean;
}

function getLocalizedString(value: I18nString | string | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
}

function getLocationName(location: EventItem['location']): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.name ?? '';
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'long',
    });
  } catch { return dateStr; }
}

function parseDateParts(dateStr: string): { day: number; month: string } | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return { day: date.getDate(), month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() };
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

const LABELS: Record<string, Record<DateFilter, string>> = {
  nl: { all: 'Alles', today: 'Vandaag', week: 'Deze week', month: 'Deze maand' },
  en: { all: 'All', today: 'Today', week: 'This week', month: 'This month' },
  de: { all: 'Alle', today: 'Heute', week: 'Diese Woche', month: 'Diesen Monat' },
  es: { all: 'Todos', today: 'Hoy', week: 'Esta semana', month: 'Este mes' },
};

const FILTER_LABELS: Record<string, string> = {
  nl: 'Filters', en: 'Filters', de: 'Filter', es: 'Filtros',
};

interface EventFilterBarProps {
  events: EventItem[];
  locale: string;
  layout?: 'grid' | 'list' | 'compact';
}

function filterByDate(events: EventItem[], filter: DateFilter): EventItem[] {
  if (filter === 'all') return events;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return events.filter(e => {
    const d = new Date(e.startDate);
    if (isNaN(d.getTime())) return false;
    if (filter === 'today') return d >= startOfDay && d < new Date(startOfDay.getTime() + 86400000);
    if (filter === 'week') return d >= startOfDay && d < new Date(startOfDay.getTime() + 7 * 86400000);
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d >= startOfDay;
    return true;
  });
}

function filterByDateRange(events: EventItem[], range: EventFilters['dateRange']): EventItem[] {
  if (range === 'all') return events;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return events.filter(e => {
    const d = new Date(e.startDate);
    if (isNaN(d.getTime())) return false;
    switch (range) {
      case 'today': return d >= startOfDay && d < new Date(startOfDay.getTime() + 86400000);
      case 'tomorrow': {
        const tomorrow = new Date(startOfDay.getTime() + 86400000);
        return d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000);
      }
      case 'weekend': {
        const dayOfWeek = startOfDay.getDay();
        const daysUntilSat = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        const saturday = new Date(startOfDay.getTime() + daysUntilSat * 86400000);
        const monday = new Date(saturday.getTime() + 2 * 86400000);
        return d >= saturday && d < monday;
      }
      case 'week': return d >= startOfDay && d < new Date(startOfDay.getTime() + 7 * 86400000);
      case 'month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d >= startOfDay;
      default: return true;
    }
  });
}

const DEFAULT_EVENT_FILTERS: EventFilters = { categories: [], dateRange: 'all' };

export default function EventFilterBar({ events, locale, layout = 'grid' }: EventFilterBarProps) {
  const [quickFilter, setQuickFilter] = useState<DateFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFilters, setModalFilters] = useState<EventFilters>(DEFAULT_EVENT_FILTERS);
  const labels = LABELS[locale] || LABELS.en;

  // Available categories from events
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const e of events) {
      if (e.primaryCategory) cats.add(e.primaryCategory);
    }
    return [...cats].sort();
  }, [events]);

  // Apply both quick filter and modal filters
  const filtered = useMemo(() => {
    let result = events;

    // Modal category filter
    if (modalFilters.categories.length > 0) {
      result = result.filter(e => e.primaryCategory && modalFilters.categories.includes(e.primaryCategory));
    }

    // Modal date range filter (takes priority over quick filter if set)
    if (modalFilters.dateRange !== 'all') {
      result = filterByDateRange(result, modalFilters.dateRange);
    } else {
      result = filterByDate(result, quickFilter);
    }

    return result;
  }, [events, quickFilter, modalFilters]);

  const activeFilterCount = modalFilters.categories.length + (modalFilters.dateRange !== 'all' ? 1 : 0);

  const handleApplyFilters = (newFilters: EventFilters) => {
    setModalFilters(newFilters);
    // Reset quick filter if modal date is set
    if (newFilters.dateRange !== 'all') setQuickFilter('all');
  };

  const filters: DateFilter[] = ['all', 'today', 'week', 'month'];

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {/* Filter button */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-surface text-foreground border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          {FILTER_LABELS[locale] || 'Filters'}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary text-on-primary">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Quick date chips */}
        {filters.map(f => (
          <button
            key={f}
            onClick={() => { setQuickFilter(f); setModalFilters(prev => ({ ...prev, dateRange: 'all' })); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              quickFilter === f && modalFilters.dateRange === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-muted hover:bg-primary/10'
            }`}
          >
            {labels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted py-8">
          {locale === 'nl' ? 'Geen evenementen gevonden' : locale === 'de' ? 'Keine Veranstaltungen gefunden' : locale === 'es' ? 'No se encontraron eventos' : 'No events found'}
        </p>
      ) : (
        <div className={`grid grid-cols-1 ${layout === 'compact' ? 'sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6`}>
          {filtered.map(event => {
            const imageUrl = event.images?.[0]?.url;
            const title = getLocalizedString(event.title, locale);
            const parts = parseDateParts(event.startDate);
            return (
              <EventCard key={event.id} eventId={event.id}>
                {imageUrl ? (
                  <CardImage src={imageUrl} alt={title} />
                ) : parts ? (
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{parts.day}</div>
                      <div className="text-sm font-semibold text-primary/70 uppercase tracking-wider">{parts.month}</div>
                    </div>
                  </div>
                ) : null}
                <CardContent>
                  <p className="text-sm font-medium text-primary mb-1">{formatDate(event.startDate, locale)}</p>
                  <h3 className="font-heading font-semibold text-foreground line-clamp-2">{title}</h3>
                  {event.location && (
                    <p className="text-sm text-muted mt-1 line-clamp-1">{getLocationName(event.location)}</p>
                  )}
                  {event.primaryCategory && (
                    <div className="mt-2"><Badge>{event.primaryCategory}</Badge></div>
                  )}
                </CardContent>
              </EventCard>
            );
          })}
        </div>
      )}

      <EventFilterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={modalFilters}
        availableCategories={availableCategories}
        locale={locale}
      />
    </>
  );
}
