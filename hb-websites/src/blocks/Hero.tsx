import type { HeroProps } from '@/types/blocks';
import Button from '@/components/ui/Button';

export default function Hero({ headline, description, image, tagline, buttons }: HeroProps) {
  return (
    <section className="relative bg-primary text-on-primary overflow-hidden">
      {image && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover opacity-30"
            loading="eager"
          />
          <div className="absolute inset-0 bg-primary/60" />
        </div>
      )}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        {tagline && (
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-4">
            {tagline}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold max-w-3xl">
          {headline}
        </h1>
        {description && (
          <p className="mt-6 text-lg sm:text-xl max-w-2xl opacity-90">
            {description}
          </p>
        )}
        {buttons && buttons.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4">
            {buttons.map((btn, i) => (
              <Button
                key={i}
                href={btn.href}
                variant={btn.variant ?? (i === 0 ? 'primary' : 'outline')}
                size="lg"
                className={i === 0 ? 'bg-on-primary text-primary hover:bg-on-primary/90' : 'border-on-primary text-on-primary hover:bg-on-primary/10'}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
