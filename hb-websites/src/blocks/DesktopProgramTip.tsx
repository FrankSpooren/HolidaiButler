'use client';

import ProgramCard from '@/components/mobile/ProgramCard';
import TipOfTheDay from '@/components/mobile/TipOfTheDay';

interface DesktopProgramTipProps {
  programSize?: number;
  locale?: string;
  destinationName?: string;
  destinationSlug?: string;
}

export default function DesktopProgramTip({ programSize, locale = 'nl' }: DesktopProgramTipProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: Program (60%) */}
        <div className="md:col-span-3">
          <ProgramCard locale={locale} programSize={programSize} forceShow />
        </div>
        {/* Right: Tip of the Day (40%) */}
        <div className="md:col-span-2">
          <TipOfTheDay locale={locale} forceShow />
        </div>
      </div>
    </div>
  );
}
