'use client';

import { usePathname } from 'next/navigation';
import ProgramCard from './ProgramCard';
import TipOfTheDay from './TipOfTheDay';
import TodayEvents from './TodayEvents';
import MapPreview from './MapPreview';

interface MobileConfig {
  mapPoiLimit?: number;
  mapEventLimit?: number;
  programSize?: number;
  mapLabel?: Record<string, string>;
  showOnboarding?: boolean;
}

interface MobileHomepageProps {
  locale: string;
  destinationName?: string;
  poiCount?: number;
  mobileConfig?: MobileConfig;
}

export default function MobileHomepage({ locale, destinationName = 'Calpe', poiCount, mobileConfig }: MobileHomepageProps) {
  const pathname = usePathname();

  // Only show on homepage
  if (pathname !== '/' && pathname !== '') return null;

  return (
    <div className="md:hidden flex flex-col gap-5 py-5" style={{ backgroundColor: '#F5F2EC' }}>
      <ProgramCard locale={locale} programSize={mobileConfig?.programSize} />
      <TipOfTheDay locale={locale} />
      <TodayEvents locale={locale} destinationName={destinationName} />
      <MapPreview
        locale={locale}
        poiCount={poiCount}
        poiLimit={mobileConfig?.mapPoiLimit}
        mapLabel={mobileConfig?.mapLabel}
      />
    </div>
  );
}
