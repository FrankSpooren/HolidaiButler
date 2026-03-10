import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { PoiGridProps } from '@/types/blocks';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import Rating from '@/components/ui/Rating';

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

/** Tourist-relevant categories to show on homepage/explore (EN + NL) */
const TOURIST_CATEGORIES = [
  'Food & Drinks', 'Eten & Drinken',
  'Beaches & Nature', 'Natuur',
  'Culture & History', 'Cultuur & Historie', 'Cultuur',
  'Active', 'Actief',
  'Recreation', 'Recreatief',
  'Nightlife',
];

/** Category color mapping — exact Customer Portal categoryConfig.ts gradient primary colors as bg, white text */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  // Calpe (EN) — exact hex from Customer Portal linear-gradient first stop
  'food & drinks': { bg: '#4f766b', text: '#FFFFFF' },
  'restaurants': { bg: '#4f766b', text: '#FFFFFF' },
  'beaches & nature': { bg: '#b4942e', text: '#FFFFFF' },
  'culture & history': { bg: '#253444', text: '#FFFFFF' },
  'recreation': { bg: '#354f48', text: '#FFFFFF' },
  'active': { bg: '#016193', text: '#FFFFFF' },
  'shopping': { bg: '#b4892e', text: '#FFFFFF' },
  'health & wellbeing': { bg: '#004568', text: '#FFFFFF' },
  'practical': { bg: '#016193', text: '#FFFFFF' },
  'nightlife': { bg: '#7B2D8E', text: '#FFFFFF' },
  // Texel (NL) — exact hex from Customer Portal linear-gradient first stop
  'eten & drinken': { bg: '#E53935', text: '#FFFFFF' },
  'natuur': { bg: '#7CB342', text: '#FFFFFF' },
  'nature': { bg: '#7CB342', text: '#FFFFFF' },
  'cultuur & historie': { bg: '#004B87', text: '#FFFFFF' },
  'cultuur': { bg: '#004B87', text: '#FFFFFF' },
  'actief': { bg: '#FF6B00', text: '#FFFFFF' },
  'winkelen': { bg: '#AB47BC', text: '#FFFFFF' },
  'recreatief': { bg: '#354f48', text: '#FFFFFF' },
  'gezondheid & verzorging': { bg: '#43A047', text: '#FFFFFF' },
  'praktisch': { bg: '#607D8B', text: '#FFFFFF' },
  'strand': { bg: '#7CB342', text: '#FFFFFF' },
};

function getCategoryStyle(category: string): { bg: string; text: string } {
  return CATEGORY_COLORS[category.toLowerCase()] ?? { bg: '#30c59b', text: '#FFFFFF' };
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
    categories: hasCategoryFilter ? categoryFilter.join(',') : TOURIST_CATEGORIES.join(','),
    limit: hasCategoryFilter ? limit : limit * 3,
    locale,
    ...(hasCategoryFilter ? { min_rating: 3.5, min_reviews: 1 } : {}),
    sort: 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  let displayPois: POI[];

  if (hasCategoryFilter) {
    displayPois = pois;
  } else {
    // Round-robin mix for category variety (already filtered to tourist categories by API)
    displayPois = roundRobinMix(pois).slice(0, limit);
  }

  if (displayPois.length === 0) return null;

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {displayPois.map((poi) => {
          const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
          const catStyle = getCategoryStyle(poi.category ?? '');
          return (
            <Card key={poi.id} href={`/poi/${poi.id}`}>
              {imageUrl && (
                <CardImage src={imageUrl} alt={poi.name} />
              )}
              <CardContent>
                <span
                  className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                >
                  {poi.category}
                </span>
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
