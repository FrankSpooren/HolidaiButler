'use client';

import { useState, useMemo } from 'react';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { I18nString } from '@/types/poi';

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

interface EventFilterBarProps {
  events: EventItem[];
  locale: string;
  layout?: 'grid' | 'list' | 'compact';
}

export default function EventFilterBar({ events, locale, layout = 'grid' }: EventFilterBarProps) {
  const [filter, setFilter] = useState<DateFilter>('all');
  const labels = LABELS[locale] || LABELS.en;

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return events.filter(e => {
      const d = new Date(e.startDate);
      if (isNaN(d.getTime())) return false;
      if (filter === 'today') {
        return d >= startOfDay && d < new Date(startOfDay.getTime() + 86400000);
      }
      if (filter === 'week') {
        const endOfWeek = new Date(startOfDay.getTime() + 7 * 86400000);
        return d >= startOfDay && d < endOfWeek;
      }
      if (filter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d >= startOfDay;
      }
      return true;
    });
  }, [events, filter]);

  const filters: DateFilter[] = ['all', 'today', 'week', 'month'];

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
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
              <Card key={event.id} href={`/event/${event.id}`}>
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
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
