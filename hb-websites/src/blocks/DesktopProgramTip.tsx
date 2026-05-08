'use client';

import ProgramCard from '@/components/mobile/ProgramCard';
import TipOfTheDay from '@/components/mobile/TipOfTheDay';

interface DesktopProgramTipProps {
  programSize?: number;
  locale?: string;
  destinationName?: string;
  destinationSlug?: string;
}

const programmeStyles = `
  .programme-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  @container (min-width: 768px) {
    .programme-layout {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 1.5rem;
    }
  }
`;

export default function DesktopProgramTip({ programSize, locale = 'nl' }: DesktopProgramTipProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Dagprogramma" style={{ containerType: 'inline-size' }}>
      <div className="programme-layout">
        <div>
          <ProgramCard locale={locale} programSize={programSize} forceShow />
        </div>
        <div>
          <TipOfTheDay locale={locale} forceShow />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: programmeStyles }} />
    </div>
  );
}
