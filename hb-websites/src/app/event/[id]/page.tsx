import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchEvent } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import type { I18nString } from '@/types/poi';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getLocalizedString(value: I18nString | string | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) return ''; // all-day
    return date.toLocaleTimeString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  try {
    const event = await fetchEvent(tenantSlug, Number(id), locale);
    if (!event) return { title: 'Event Not Found' };
    const title = getLocalizedString(event.title, locale);
    const desc = getLocalizedString(event.description, locale);
    return {
      title: `${title} | HolidaiButler`,
      description: desc?.slice(0, 160),
      openGraph: {
        title,
        description: desc?.slice(0, 160),
        images: event.images?.[0]?.url ? [event.images[0].url] : undefined,
      },
    };
  } catch {
    return { title: 'Event Not Found' };
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const event = await fetchEvent(tenantSlug, Number(id), locale);
  if (!event) notFound();

  const title = getLocalizedString(event.title, locale);
  const description = getLocalizedString(event.description, locale);
  const longDescription = getLocalizedString(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event as any).longDescription,
    locale
  );
  const imageUrl = event.images?.[0]?.url;
  const locationName = event.location
    ? typeof event.location === 'string'
      ? event.location
      : event.location.name ?? ''
    : '';
  const locationAddress = event.location && typeof event.location !== 'string'
    ? event.location.address ?? ''
    : '';
  const time = formatTime(event.startDate, locale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDates = (event as any).allDates as Array<{ date: string; time?: string }> | undefined;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Image */}
      {imageUrl ? (
        <div className="mb-8 rounded-tenant overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-64 md:h-96 object-cover"
            loading="eager"
          />
        </div>
      ) : (
        <div className="mb-8 rounded-tenant overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 h-48 flex items-center justify-center">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40 mx-auto mb-2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p className="text-sm text-muted">{event.primaryCategory || (locale === 'nl' ? 'Evenement' : 'Event')}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {event.primaryCategory && <Badge variant="primary">{event.primaryCategory}</Badge>}
          {event.pricing?.isFree && (
            <Badge className="bg-green-100 text-green-800">
              {locale === 'nl' ? 'Gratis' : 'Free'}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">{title}</h1>
      </div>

      {/* Key Info */}
      <div className="bg-primary/5 rounded-tenant p-4 mb-8 space-y-3">
        {/* Date */}
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div>
            <p className="text-sm font-medium text-foreground">{formatDate(event.startDate, locale)}</p>
            {time && <p className="text-xs text-muted">{time}</p>}
          </div>
        </div>

        {/* Location */}
        {locationName && (
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div>
              <p className="text-sm font-medium text-foreground">{locationName}</p>
              {locationAddress && <p className="text-xs text-muted">{locationAddress}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {(longDescription || description) && (
        <div className="prose prose-lg max-w-none mb-8 text-foreground/80">
          {(longDescription || description).split('\n').map((p, i) => (
            p.trim() ? <p key={i}>{p}</p> : null
          ))}
        </div>
      )}

      {/* All Dates (if recurring event) */}
      {allDates && allDates.length > 1 && (
        <div className="mb-8">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-3">
            {locale === 'nl' ? 'Alle datums' : 'All dates'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allDates.slice(0, 20).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-tenant px-3 py-2">
                <span className="font-medium text-foreground">{formatDate(d.date, locale)}</span>
                {d.time && <span className="text-muted">{d.time}</span>}
              </div>
            ))}
            {allDates.length > 20 && (
              <p className="text-sm text-muted col-span-full">
                +{allDates.length - 20} {locale === 'nl' ? 'meer datums' : 'more dates'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link href="/events" className="text-sm text-primary hover:underline flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {locale === 'nl' ? 'Terug naar evenementen' : 'Back to events'}
        </Link>
      </div>
    </article>
  );
}
