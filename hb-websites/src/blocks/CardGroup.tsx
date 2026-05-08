'use client';

import type { CardGroupProps } from '@/types/blocks';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import ButtonRenderer from '@/components/ui/ButtonRenderer';

export default function CardGroup({ cards, columns = 3, variant = 'curated', headline }: CardGroupProps) {
  if (!cards || cards.length === 0) return null;

  const colOverride = columns === 2 ? 'cardgroup-cols-2' : columns === 4 ? 'cardgroup-cols-4' : '';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="region" aria-label={headline || 'Content cards'} style={{ containerType: 'inline-size' }}>
      {headline && <h2 className="text-2xl font-heading font-semibold mb-6">{headline}</h2>}
      <div className={`cardgroup-grid ${colOverride} gap-6`}>
        {cards.map((card, i) => (
          <Card key={i} href={card.buttons && card.buttons.length > 0 ? undefined : card.href}>
            {card.image && <CardImage src={card.image} alt={card.title} />}
            <CardContent>
              {card.badge && (
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent mb-2">
                  {card.badge}
                </span>
              )}
              <h3 className="text-lg font-heading font-semibold text-foreground">
                {card.title}
              </h3>
              {card.description && (
                <p className="mt-2 text-sm text-muted line-clamp-3">
                  {card.description}
                </p>
              )}
              {variant === 'offer' && card.price && (
                <p className="mt-2 text-lg font-semibold text-primary">
                  {card.priceCurrency || '\u20ac'}{card.price}
                </p>
              )}
              {card.buttons && card.buttons.length > 0 && (
                <div className="mt-4">
                  <ButtonRenderer buttons={card.buttons} size="sm" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .cardgroup-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        @container (min-width: 600px) {
          .cardgroup-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .cardgroup-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @container (min-width: 600px) {
          .cardgroup-cols-2 { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .cardgroup-cols-4 { grid-template-columns: repeat(4, 1fr); }
        }
      `}} />
    </section>
  );
}
