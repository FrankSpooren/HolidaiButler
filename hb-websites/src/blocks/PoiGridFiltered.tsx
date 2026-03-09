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

export default async function PoiGridFiltered({ categoryFilter, limit = 24, columns = 3 }: PoiGridProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const hasCategoryFilter = categoryFilter && categoryFilter.length > 0;

  const pois = await fetchPois(tenantSlug, {
    categories: hasCategoryFilter ? categoryFilter.join(',') : TOURIST_CATEGORIES.join(','),
    limit,
    locale,
    ...(hasCategoryFilter ? { min_rating: 3.5, min_reviews: 1 } : {}),
    sort: 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PoiFilterBar pois={pois} columns={columns} locale={locale} />
    </section>
  );
}
