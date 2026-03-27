'use client';

import ProgramCard from '@/components/mobile/ProgramCard';

interface MobileProgramBlockProps {
  programSize?: number;
  locale?: string;
}

export default function MobileProgram({ programSize, locale = 'nl' }: MobileProgramBlockProps) {
  return (
    <div className="md:hidden" style={{ backgroundColor: '#F5F2EC' }}>
      <ProgramCard locale={locale} programSize={programSize} />
    </div>
  );
}
