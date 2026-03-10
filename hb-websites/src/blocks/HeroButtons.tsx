'use client';

import type { HeroButton } from '@/types/blocks';
import ButtonRenderer from '@/components/ui/ButtonRenderer';

interface HeroButtonsProps {
  buttons: HeroButton[];
}

export default function HeroButtons({ buttons }: HeroButtonsProps) {
  return (
    <div className="mt-8">
      <ButtonRenderer buttons={buttons} size="lg" onPrimary />
    </div>
  );
}
