'use client';

import MapPreview from '@/components/mobile/MapPreview';

interface MobileMapBlockProps {
  poiLimit?: number;
  mapLabel?: Record<string, string>;
  locale?: string;
}

export default function MobileMap({ poiLimit, mapLabel, locale = 'nl' }: MobileMapBlockProps) {
  return (
    <div className="md:hidden" style={{ backgroundColor: '#F5F2EC' }}>
      <MapPreview locale={locale} poiLimit={poiLimit} mapLabel={mapLabel} />
    </div>
  );
}
