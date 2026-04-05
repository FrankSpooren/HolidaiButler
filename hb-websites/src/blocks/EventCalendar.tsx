import { headers } from 'next/headers';
import { fetchEvents } from '@/lib/api';
import type { EventCalendarProps } from '@/types/blocks';
import { CardImage, CardContent } from '@/components/ui/Card';
import EventCard from '@/components/ui/EventCard';
import Badge from '@/components/ui/Badge';
import type { AgendaEvent, I18nString } from '@/types/poi';

function getLocalizedString(value: I18nString | string | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
}

function getLocationName(location: AgendaEvent['location']): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.name ?? '';
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateStr;
  }
}

function parseDateParts(dateStr: string): { day: number; month: string } | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function DateBlock({ dateStr }: { dateStr: string }) {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;
  return (
    <div className="w-full h-36 sm:h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold text-primary">{parts.day}</div>
        <div className="text-sm font-semibold text-primary/70 uppercase tracking-wider">{parts.month}</div>
      </div>
    </div>
  );
}

export default async function EventCalendar({ limit = 6, layout = 'grid' }: EventCalendarProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const events = await fetchEvents(tenantSlug, locale, limit, 5);

  if (!events || events.length === 0) return null;

  if (layout === 'list') {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-heading font-bold text-foreground mb-6">
          {locale === 'nl' ? 'Evenementen' : 'Events'}
        </h2>
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} eventId={event.id} eventTitle={getLocalizedString(event.title, locale)} className="flex gap-4 items-start p-4 !rounded-tenant !shadow-sm">
              <div className="flex-shrink-0 w-16 text-center">
                <div className="text-sm font-medium text-primary">
                  {formatDate(event.startDate, locale)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {getLocalizedString(event.title, locale)}
                </h3>
                {event.location && (
                  <p className="text-sm text-muted">{getLocationName(event.location)}</p>
                )}
              </div>
              {event.primaryCategory && <Badge>{event.primaryCategory}</Badge>}
            </EventCard>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6">
        {locale === 'nl' ? 'Evenementen' : 'Events'}
      </h2>
      <div className={`grid grid-cols-1 ${layout === 'compact' ? 'sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6 animate-stagger`}>
        {events.map((event) => {
          const imageUrl = event.images?.[0]?.url;
          const title = getLocalizedString(event.title, locale);
          return (
            <EventCard key={event.id} eventId={event.id} eventTitle={title}>
              {imageUrl ? <CardImage src={imageUrl} alt={title} /> : <DateBlock dateStr={event.startDate} />}
              <CardContent>
                <p className="text-sm font-medium text-primary mb-1">
                  {formatDate(event.startDate, locale)}
                </p>
                <h3 className="font-heading font-semibold text-foreground line-clamp-2">
                  {title}
                </h3>
                {event.location && (
                  <p className="text-sm text-muted mt-1 line-clamp-1">
                    {getLocationName(event.location)}
                  </p>
                )}
                {event.primaryCategory && (
                  <div className="mt-2"><Badge>{event.primaryCategory}</Badge></div>
                )}
              </CardContent>
            </EventCard>
          );
        })}
      </div>
    </section>
  );
}
