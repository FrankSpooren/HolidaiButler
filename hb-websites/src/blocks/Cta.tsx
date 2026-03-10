'use client';

import type { CtaProps } from '@/types/blocks';
import ButtonRenderer from '@/components/ui/ButtonRenderer';

const bgStyles: Record<string, string> = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent text-on-primary',
  gradient: 'bg-gradient-to-r from-primary to-accent text-on-primary',
};

export default function Cta({ headline, description, backgroundStyle = 'primary', buttons }: CtaProps) {
  return (
    <section className={`${bgStyles[backgroundStyle] ?? bgStyles.primary} py-16 sm:py-20`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold">
          {headline}
        </h2>
        {description && (
          <p className="mt-4 text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
            {description}
          </p>
        )}
        {buttons && buttons.length > 0 && (
          <div className="mt-8">
            <ButtonRenderer buttons={buttons} align="center" size="lg" onPrimary />
          </div>
        )}
      </div>
    </section>
  );
}
