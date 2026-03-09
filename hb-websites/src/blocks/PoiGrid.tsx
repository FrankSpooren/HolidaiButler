import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { PoiGridProps } from '@/types/blocks';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';

interface POI {
  id: number;
  name: string;
  category?: string;
  description?: string;
  images?: string[];
  thumbnail_url?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
}

/** Round-robin mix: interleave POIs from different categories for visual variety */
function roundRobinMix(pois: POI[]): POI[] {
  const buckets = new Map<string, POI[]>();
  for (const poi of pois) {
    const cat = poi.category ?? 'other';
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(poi);
  }
  const iterators = [...buckets.values()].map(arr => ({ arr, idx: 0 }));
  const result: POI[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const it of iterators) {
      if (it.idx < it.arr.length) {
        result.push(it.arr[it.idx++]);
        added = true;
      }
    }
  }
  return result;
}

export default async function PoiGrid({ categoryFilter, limit = 6, columns = 3 }: PoiGridProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const hasCategoryFilter = categoryFilter && categoryFilter.length > 0;

  const pois = await fetchPois(tenantSlug, {
    categories: hasCategoryFilter ? categoryFilter.join(',') : undefined,
    limit: hasCategoryFilter ? limit : limit * 2,
    locale,
    ...(hasCategoryFilter ? { min_rating: 3.5, min_reviews: 1 } : {}),
    sort: 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  // Without category filter (explore/homepage): round-robin mix for variety, then trim to limit
  const displayPois = hasCategoryFilter ? pois : roundRobinMix(pois).slice(0, limit);

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {displayPois.map((poi) => {
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
