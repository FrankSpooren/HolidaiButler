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

/** Category color mapping — derived from Customer Portal categoryConfig.ts gradient primary colors */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  // Calpe (EN) — from Customer Portal CATEGORY_CONFIG
  'food & drinks': { bg: '#e0ecea', text: '#4f766b' },
  'restaurants': { bg: '#e0ecea', text: '#4f766b' },
  'beaches & nature': { bg: '#f0e8d4', text: '#b4942e' },
  'culture & history': { bg: '#d8dce0', text: '#253444' },
  'recreation': { bg: '#dae2e0', text: '#354f48' },
  'active': { bg: '#cce0ec', text: '#016193' },
  'shopping': { bg: '#f0e7d4', text: '#b4892e' },
  'health & wellbeing': { bg: '#ccdde8', text: '#004568' },
  'practical': { bg: '#cce0ec', text: '#016193' },
  'nightlife': { bg: '#e8d9ed', text: '#7B2D8E' },
  // Texel (NL) — from Customer Portal CATEGORY_CONFIG
  'eten & drinken': { bg: '#fcdcdb', text: '#E53935' },
  'natuur': { bg: '#e8f0da', text: '#7CB342' },
  'nature': { bg: '#e8f0da', text: '#7CB342' },
  'cultuur & historie': { bg: '#ccdce8', text: '#004B87' },
  'cultuur': { bg: '#ccdce8', text: '#004B87' },
  'actief': { bg: '#ffe3cc', text: '#FF6B00' },
  'winkelen': { bg: '#f0ddf3', text: '#AB47BC' },
  'recreatief': { bg: '#dcf0e8', text: '#354f48' },
  'gezondheid & verzorging': { bg: '#dceede', text: '#43A047' },
  'praktisch': { bg: '#dfe4e7', text: '#607D8B' },
  'strand': { bg: '#e8f0da', text: '#7CB342' },
};

function getCategoryStyle(category: string): { bg: string; text: string } {
  return CATEGORY_COLORS[category.toLowerCase()] ?? { bg: '#F3F4F6', text: '#374151' };
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
