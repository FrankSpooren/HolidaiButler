'use client';

import type { CtaProps } from '@/types/blocks';
import ButtonRenderer from '@/components/ui/ButtonRenderer';

const bgStyles: Record<string, string> = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent text-on-primary',
  gradient: 'bg-gradient-to-r from-primary to-accent text-on-primary',
  dark: 'bg-gray-900 text-white',
  light: 'bg-gray-50 text-gray-900',
};

export default function Cta({ headline, description, backgroundStyle = 'primary', buttons, backgroundImage }: CtaProps) {
  const hasImage = !!backgroundImage;
  const bgClass = hasImage ? 'text-white' : (bgStyles[backgroundStyle] ?? bgStyles.primary);

  const sectionStyle: React.CSSProperties = {
    containerType: 'inline-size' as const,
    ...(hasImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
  };

  return (
    <section
      className={`${bgClass} relative overflow-hidden`}
      style={sectionStyle}
      role="region"
      aria-label={headline}
    >
      {hasImage && <div className="absolute inset-0 bg-black/50" aria-hidden="true" />}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center cta-content">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold">
          {headline}
        </h2>
        {description && (
          <p className="mt-4 text-base sm:text-lg lg:text-xl opacity-90 max-w-2xl mx-auto">
            {description}
          </p>
        )}
        {buttons && buttons.length > 0 && (
          <div className="mt-8">
            <ButtonRenderer buttons={buttons} align="center" size="lg" onPrimary={!hasImage && backgroundStyle !== 'light'} />
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .cta-content { padding-top: 3rem; padding-bottom: 3rem; }
        @container (min-width: 600px) {
          .cta-content { padding-top: 4rem; padding-bottom: 4rem; }
        }
        @container (min-width: 900px) {
          .cta-content { padding-top: 5rem; padding-bottom: 5rem; }
        }
      `}} />
    </section>
  );
}
