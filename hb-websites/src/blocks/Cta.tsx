import type { CtaProps } from '@/types/blocks';
import Button from '@/components/ui/Button';

const bgStyles = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent text-on-primary',
  gradient: 'bg-gradient-to-r from-primary to-accent text-on-primary',
};

export default function Cta({ headline, description, backgroundStyle = 'primary', buttons }: CtaProps) {
  return (
    <section className={`${bgStyles[backgroundStyle]} py-16 sm:py-20`}>
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
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
