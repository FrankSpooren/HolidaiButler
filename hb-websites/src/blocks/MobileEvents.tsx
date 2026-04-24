'use client';

import TodayEvents from '@/components/mobile/TodayEvents';

interface MobileEventsBlockProps {
  destinationName?: string;
  destinationSlug?: string;
  locale?: string;
}

export default function MobileEvents({ destinationName, destinationSlug, locale = 'nl' }: MobileEventsBlockProps) {
  return (
    <div className="md:hidden pt-4" style={{ backgroundColor: '#F5F2EC' }}>
      <TodayEvents locale={locale} destinationName={destinationName} destinationSlug={destinationSlug} />
    </div>
  );
}
