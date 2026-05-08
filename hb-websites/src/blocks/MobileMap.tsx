'use client';

import MapPreview from '@/components/mobile/MapPreview';

interface MobileMapBlockProps {
  poiLimit?: number;
  mapLabel?: Record<string, string>;
  locale?: string;
}

export default function MobileMap({ poiLimit, mapLabel, locale = 'nl' }: MobileMapBlockProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Kaart preview" style={{ containerType: 'inline-size' }}>
      <MapPreview locale={locale} poiLimit={poiLimit} mapLabel={mapLabel} />
    </div>
  );
}
