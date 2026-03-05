import type { CardGroupProps } from '@/types/blocks';
import Card, { CardImage, CardContent } from '@/components/ui/Card';

export default function CardGroup({ cards, columns = 3 }: CardGroupProps) {
  if (!cards || cards.length === 0) return null;

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {cards.map((card, i) => (
          <Card key={i} href={card.href}>
            {card.image && <CardImage src={card.image} alt={card.title} />}
            <CardContent>
              <h3 className="text-lg font-heading font-semibold text-foreground">
                {card.title}
              </h3>
              {card.description && (
                <p className="mt-2 text-sm text-muted line-clamp-3">
                  {card.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
