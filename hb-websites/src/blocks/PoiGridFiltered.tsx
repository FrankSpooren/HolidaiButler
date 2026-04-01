import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { PoiGridProps } from '@/types/blocks';
import PoiFilterBar from '@/components/filters/PoiFilterBar';

/** Tourist-relevant categories (EN + NL) */
const TOURIST_CATEGORIES = [
  'Food & Drinks', 'Eten & Drinken',
  'Beaches & Nature', 'Natuur',
  'Culture & History', 'Cultuur & Historie', 'Cultuur',
  'Active', 'Actief',
  'Recreation', 'Recreatief',
  'Nightlife',
];

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

export default async function PoiGridFiltered({ categoryFilter, limit = 24, columns = 3, layout = 'grid' }: PoiGridProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const hasCategoryFilter = categoryFilter && categoryFilter.length > 0;

  const pois = await fetchPois(tenantSlug, {
    ...(hasCategoryFilter ? { categories: categoryFilter.join(','), min_rating: 3.5, min_reviews: 1 } : {}),
    limit,
    locale,
    sort: 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  // Round-robin mix for category variety when no explicit filter
  const displayPois = hasCategoryFilter ? pois : roundRobinMix(pois);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PoiFilterBar pois={displayPois} columns={columns} locale={locale} layout={layout} />
    </section>
  );
}
