import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { PoiGridProps } from '@/types/blocks';
import { CardImage, CardContent } from '@/components/ui/Card';
import PoiCard from '@/components/ui/PoiCard';
import Rating from '@/components/ui/Rating';
import { generatePoiGridSchema, schemaToJsonLd } from '@/lib/schema';
import { generateSrcSet, DEFAULT_SIZES } from '@/lib/image';

interface POI {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  images?: string[];
  thumbnail_url?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  tier?: number;
  latitude?: number;
  longitude?: number;
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
  // Calpe (EN)
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
  // Texel (NL)
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

/** Tier badge styling — Tier 1 gold, Tier 2 silver, Tier 3 bronze, Tier 4 grey */
const TIER_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#D4AF37', text: '#FFFFFF', label: 'T1' },
  2: { bg: '#C0C0C0', text: '#333333', label: 'T2' },
  3: { bg: '#CD7F32', text: '#FFFFFF', label: 'T3' },
  4: { bg: '#9E9E9E', text: '#FFFFFF', label: 'T4' },
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

/** Sort options for POI ordering */
const SORT_MAP: Record<string, string> = {
  rating: 'rating:desc',
  alphabetical: 'name:asc',
  newest: 'created_at:desc',
  random: 'random',
  relevance: 'rating:desc',
};

export default async function PoiGrid({
  categoryFilter,
  limit = 6,
  columns = 3,
  layout = 'grid',
  title,
  tierFilter,
  sortOrder = 'rating',
  showTierBadge = false,
}: PoiGridProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const hasCategoryFilter = categoryFilter && categoryFilter.length > 0;

  const pois = await fetchPois(tenantSlug, {
    categories: hasCategoryFilter ? categoryFilter.join(',') : TOURIST_CATEGORIES.join(','),
    limit: hasCategoryFilter ? limit : limit * 3,
    locale,
    ...(hasCategoryFilter ? { min_rating: 3.5, min_reviews: 1 } : {}),
    sort: SORT_MAP[sortOrder] || 'rating:desc',
  });

  if (!pois || pois.length === 0) return null;

  let displayPois: POI[];

  if (hasCategoryFilter) {
    displayPois = pois;
  } else {
    displayPois = roundRobinMix(pois).slice(0, limit);
  }

  // Apply tier filter if set
  if (tierFilter && tierFilter > 0) {
    displayPois = displayPois.filter(p => (p.tier ?? 4) <= tierFilter);
  }

  if (displayPois.length === 0) return null;

  // Generate schema.org JSON-LD for this block
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (tenantSlug === 'texel' ? 'https://www.texelmaps.nl' : 'https://www.holidaibutler.com');
  const schemaData = generatePoiGridSchema(displayPois, baseUrl);

  // List layout
  if (layout === 'list') {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaToJsonLd(schemaData) }} />
        {title && <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">{title}</h2>}
        <div className="space-y-3 animate-stagger">
          {displayPois.map((poi) => {
            const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
            const catStyle = getCategoryStyle(poi.category ?? '');
            const tier = poi.tier ?? 4;
            const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES[4];
            return (
              <PoiCard key={poi.id} poiId={poi.id} href={`/poi/${poi.id}`} poiName={poi.name}>
                <div className="flex gap-4 items-center p-3">
                  {imageUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt={poi.name} className="w-full h-full object-cover" loading="lazy" srcSet={generateSrcSet(imageUrl) || undefined} sizes="80px" />
                      {showTierBadge && tier <= 3 && (
                        <span
                          className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
                          style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
                          aria-label={`Tier ${tier}`}
                        >
                          {tierStyle.label}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-1"
                      style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                    >
                      {poi.category}
                    </span>
                    <h3 className="text-base font-heading font-semibold text-foreground truncate">{poi.name}</h3>
                    {poi.description && <p className="text-sm text-muted line-clamp-1">{poi.description}</p>}
                  </div>
                  {poi.rating && (
                    <div className="flex-shrink-0">
                      <Rating value={poi.rating} count={poi.reviewCount ?? poi.review_count} size="sm" />
                    </div>
                  )}
                </div>
              </PoiCard>
            );
          })}
        </div>
      </section>
    );
  }

  // Grid layout — uses CSS @container queries for responsive columns
  const colOverrideClass = columns === 2 ? 'poi-grid-cols-2' : columns === 4 ? 'poi-grid-cols-4' : '';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" role="region" aria-label={title || 'Points of interest'} style={{ containerType: 'inline-size' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaToJsonLd(schemaData) }} />
      {title && <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">{title}</h2>}
      <div className={`poi-grid ${colOverrideClass} animate-stagger`}>
        {displayPois.map((poi) => {
          const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
          const catStyle = getCategoryStyle(poi.category ?? '');
          const tier = poi.tier ?? 4;
          const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES[4];
          return (
            <PoiCard
              key={poi.id}
              poiId={poi.id}
              href={`/poi/${poi.id}`}
              poiName={poi.name}
              className="poi-card"
            >
              {imageUrl && (
                <div className="relative aspect-[3/2] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={poi.name}
                    loading="lazy"
                    srcSet={generateSrcSet(imageUrl) || undefined}
                    sizes={generateSrcSet(imageUrl) ? DEFAULT_SIZES : undefined}
                    className="w-full h-full object-cover animate-image-load"
                  />
                  {/* Tier badge */}
                  {showTierBadge && tier <= 3 && (
                    <span
                      className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold leading-none shadow-sm"
                      style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
                      aria-label={`Tier ${tier}`}
                    >
                      {tierStyle.label}
                    </span>
                  )}
                  {/* Desktop hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 hidden md:flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                    <span className="px-4 py-2 bg-white/90 rounded-lg text-sm font-semibold text-gray-900 backdrop-blur-sm">
                      {locale === 'nl' ? 'Ontdek meer' : locale === 'de' ? 'Mehr entdecken' : locale === 'es' ? 'Descubrir más' : 'Discover more'}
                    </span>
                  </div>
                </div>
              )}
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full shrink-0"
                    style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                  >
                    {poi.category}
                  </span>
                  {poi.rating && (
                    <span className="text-sm font-medium text-foreground whitespace-nowrap" aria-label={`Rating ${poi.rating}`}>
                      ★ {poi.rating.toFixed(1)}
                      {(poi.reviewCount ?? poi.review_count) ? (
                        <span className="text-muted font-normal"> · {poi.reviewCount ?? poi.review_count}</span>
                      ) : null}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-heading font-semibold text-foreground line-clamp-1">
                  {poi.name}
                </h3>
                {poi.description && (
                  <p className="mt-1 text-sm text-muted line-clamp-2">
                    {poi.description}
                  </p>
                )}
              </CardContent>
            </PoiCard>
          );
        })}
      </div>
      {/* Container query CSS — inline for co-location with component */}
      <style dangerouslySetInnerHTML={{ __html: `
        .poi-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        /* Container queries: responsive to block width, not viewport */
        @container (min-width: 600px) {
          .poi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .poi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        /* Column override classes */
        @container (min-width: 600px) {
          .poi-grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .poi-grid-cols-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .poi-grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        }
        /* Hover state: lift + shadow */
        .poi-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media (hover: hover) {
          .poi-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.12);
          }
        }
      `}} />
    </section>
  );
}
