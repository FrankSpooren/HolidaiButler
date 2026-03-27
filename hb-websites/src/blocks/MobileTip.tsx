'use client';

import TipOfTheDay from '@/components/mobile/TipOfTheDay';

interface MobileTipBlockProps {
  locale?: string;
}

export default function MobileTip({ locale = 'nl' }: MobileTipBlockProps) {
  return (
    <div className="md:hidden" style={{ backgroundColor: '#F5F2EC' }}>
      <TipOfTheDay locale={locale} />
    </div>
  );
}
