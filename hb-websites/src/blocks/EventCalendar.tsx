import { headers } from 'next/headers';
import { fetchEvents } from '@/lib/api';
import type { EventCalendarProps } from '@/types/blocks';
import { CardImage, CardContent } from '@/components/ui/Card';
import EventCard from '@/components/ui/EventCard';
import Badge from '@/components/ui/Badge';
import { generateEventListSchema, schemaToJsonLd } from '@/lib/schema';
import { generateSrcSet, DEFAULT_SIZES } from '@/lib/image';
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

function getLocationForSchema(location: AgendaEvent['location']): { name?: string; address?: string; latitude?: number; longitude?: number } | undefined {
  if (!location) return undefined;
  if (typeof location === 'string') return { name: location };
  return {
    name: location.name ?? undefined,
    address: location.address ?? undefined,
    latitude: location.coordinates?.lat ?? undefined,
    longitude: location.coordinates?.lng ?? undefined,
  };
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

function formatTime(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Skip midnight (likely all-day event)
    if (hours === 0 && minutes === 0) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return null;
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

/** Category color mapping for event badges */
const EVENT_CATEGORY_COLORS: Record<string, string> = {
  'music': '#E53935',
  'muziek': '#E53935',
  'sport': '#FF6B00',
  'culture': '#004B87',
  'cultuur': '#004B87',
  'food': '#4f766b',
  'eten': '#4f766b',
  'market': '#AB47BC',
  'markt': '#AB47BC',
  'nature': '#7CB342',
  'natuur': '#7CB342',
  'kids': '#FF6B00',
  'kinderen': '#FF6B00',
  'festival': '#7B2D8E',
};

function getCategoryColor(category?: string): string {
  if (!category) return '';
  const lower = category.toLowerCase();
  for (const [key, color] of Object.entries(EVENT_CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '';
}

const DEFAULT_TITLES: Record<string, string> = {
  nl: 'Evenementen',
  en: 'Events',
  de: 'Veranstaltungen',
  es: 'Eventos',
};

function DateBlock({ dateStr }: { dateStr: string }) {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;
  return (
    <div className="w-full aspect-[3/2] bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold text-primary">{parts.day}</div>
        <div className="text-sm font-semibold text-primary/70 uppercase tracking-wider">{parts.month}</div>
      </div>
    </div>
  );
}

export default async function EventCalendar({ limit = 6, layout = 'grid', title, categoryFilter }: EventCalendarProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const events = await fetchEvents(tenantSlug, locale, limit, 5);

  if (!events || events.length === 0) return null;

  // Generate schema.org JSON-LD
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (tenantSlug === 'texel' ? 'https://www.texelmaps.nl' : 'https://www.holidaibutler.com');
  const schemaEvents = events.map(event => ({
    id: event.id,
    name: getLocalizedString(event.title, locale),
    description: getLocalizedString(event.description, locale) || undefined,
    startDate: event.startDate,
    endDate: event.endDate || undefined,
    image: event.images?.[0]?.url || undefined,
    location: getLocationForSchema(event.location),
    category: event.primaryCategory || undefined,
  }));
  const schemaData = generateEventListSchema(schemaEvents, baseUrl);

  const sectionTitle = title || DEFAULT_TITLES[locale] || DEFAULT_TITLES.en;

  // List layout
  if (layout === 'list') {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="region" aria-label={sectionTitle}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaToJsonLd(schemaData) }} />
        <h2 className="text-2xl font-heading font-bold text-foreground mb-6">{sectionTitle}</h2>
        <div className="space-y-3 animate-stagger">
          {events.map((event) => {
            const eventTitle = getLocalizedString(event.title, locale);
            const time = formatTime(event.startDate);
            const catColor = getCategoryColor(event.primaryCategory);
            return (
              <EventCard key={event.id} eventId={event.id} eventTitle={eventTitle} className="flex gap-4 items-center p-4 !rounded-tenant !shadow-sm">
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-2xl font-bold text-primary">{parseDateParts(event.startDate)?.day}</div>
                  <div className="text-xs font-semibold text-primary/70 uppercase">{parseDateParts(event.startDate)?.month}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{eventTitle}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {time && <span className="text-sm text-muted">🕓 {time}</span>}
                    {event.location && (
                      <span className="text-sm text-muted truncate">📍 {getLocationName(event.location)}</span>
                    )}
                  </div>
                </div>
                {event.primaryCategory && (
                  <Badge className={catColor ? '' : undefined} variant={catColor ? undefined : 'default'}>
                    {catColor ? (
                      <span style={{ color: catColor }}>{event.primaryCategory}</span>
                    ) : event.primaryCategory}
                  </Badge>
                )}
              </EventCard>
            );
          })}
        </div>
      </section>
    );
  }

  // Grid layout — uses CSS @container queries
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ containerType: 'inline-size' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaToJsonLd(schemaData) }} />
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6">{sectionTitle}</h2>
      <div className={`event-grid ${layout === 'compact' ? 'event-grid-compact' : ''} animate-stagger`}>
        {events.map((event) => {
          const imageUrl = event.images?.[0]?.url;
          const eventTitle = getLocalizedString(event.title, locale);
          const time = formatTime(event.startDate);
          const catColor = getCategoryColor(event.primaryCategory);
          return (
            <EventCard key={event.id} eventId={event.id} eventTitle={eventTitle} className="event-card">
              {imageUrl ? (
                <div className="relative aspect-[3/2] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={eventTitle} loading="lazy" srcSet={generateSrcSet(imageUrl) || undefined} sizes={generateSrcSet(imageUrl) ? DEFAULT_SIZES : undefined} className="w-full h-full object-cover animate-image-load" />
                  {/* Desktop hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 hidden md:flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                    <span className="px-4 py-2 bg-white/90 rounded-lg text-sm font-semibold text-gray-900 backdrop-blur-sm">
                      {locale === 'nl' ? 'Bekijk details' : locale === 'de' ? 'Details ansehen' : locale === 'es' ? 'Ver detalles' : 'View details'}
                    </span>
                  </div>
                </div>
              ) : (
                <DateBlock dateStr={event.startDate} />
              )}
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-primary">{formatDate(event.startDate, locale)}</p>
                  {time && <span className="text-xs text-muted whitespace-nowrap">🕓 {time}</span>}
                </div>
                <h3 className="mt-1 font-heading font-semibold text-foreground line-clamp-2">{eventTitle}</h3>
                {event.location && (
                  <p className="text-sm text-muted mt-1 line-clamp-1">📍 {getLocationName(event.location)}</p>
                )}
                {event.primaryCategory && (
                  <div className="mt-2">
                    {catColor ? (
                      <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: catColor + '18', color: catColor }}>
                        {event.primaryCategory}
                      </span>
                    ) : (
                      <Badge>{event.primaryCategory}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </EventCard>
          );
        })}
      </div>
      {/* Container query CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .event-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @container (min-width: 600px) {
          .event-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .event-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @container (min-width: 600px) {
          .event-grid-compact { grid-template-columns: repeat(3, 1fr); }
        }
        @container (min-width: 900px) {
          .event-grid-compact { grid-template-columns: repeat(4, 1fr); }
        }
        .event-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media (hover: hover) {
          .event-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.12);
          }
        }
      `}} />
    </section>
  );
}
