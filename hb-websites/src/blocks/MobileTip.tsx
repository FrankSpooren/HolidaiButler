'use client';

import TipOfTheDay from '@/components/mobile/TipOfTheDay';

interface MobileTipBlockProps {
  locale?: string;
}

export default function MobileTip({ locale = 'nl' }: MobileTipBlockProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8" role="region" aria-label="Tip van de dag" style={{ containerType: 'inline-size' }}>
      <TipOfTheDay locale={locale} forceShow />
    </div>
  );
}
