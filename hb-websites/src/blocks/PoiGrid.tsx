import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { PoiGridProps } from '@/types/blocks';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';

export default async function PoiGrid({ categoryFilter, limit = 6, columns = 3 }: PoiGridProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const pois = await fetchPois(tenantSlug, {
    categories: categoryFilter?.join(','),
    limit,
    locale,
    min_rating: 3.5,
    min_reviews: 1,
    sort: 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {pois.map((poi) => {
          const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
          return (
            <Card key={poi.id} href={`/poi/${poi.id}`}>
              {imageUrl && (
                <CardImage src={imageUrl} alt={poi.name} />
              )}
              <CardContent>
                <Badge variant="primary">{poi.category}</Badge>
                <h3 className="mt-2 text-lg font-heading font-semibold text-foreground line-clamp-1">
                  {poi.name}
                </h3>
                {poi.description && (
                  <p className="mt-1 text-sm text-muted line-clamp-2">
                    {poi.description}
                  </p>
                )}
                {poi.rating && (
                  <div className="mt-2">
                    <Rating value={poi.rating} count={poi.reviewCount ?? poi.review_count} size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
