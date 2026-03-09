import { headers } from 'next/headers';
import { fetchEvents } from '@/lib/api';
import type { EventCalendarProps } from '@/types/blocks';
import EventFilterBar from '@/components/filters/EventFilterBar';

export default async function EventCalendarFiltered({ limit = 24, layout = 'grid' }: EventCalendarProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const events = await fetchEvents(tenantSlug, locale, limit);

  if (!events || events.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6">
        {locale === 'nl' ? 'Evenementen' : 'Events'}
      </h2>
      <EventFilterBar events={events} locale={locale} layout={layout} />
    </section>
  );
}
