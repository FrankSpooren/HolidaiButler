'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POI, Review } from '@/types/poi';
import OpeningHours from '@/components/poi/OpeningHours';
import { getPortalUrl } from '@/lib/portal-url';
import FeatureList from '@/components/poi/FeatureList';
import { SkeletonDrawer } from '@/components/ui/Skeleton';
import { analytics } from '@/lib/analytics';

interface PoiDetailDrawerProps {
  locale: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'food & drinks': '#4f766b', 'restaurants': '#4f766b',
  'beaches & nature': '#b4942e', 'culture & history': '#253444',
  'recreation': '#354f48', 'active': '#016193',
  'shopping': '#b4892e', 'nightlife': '#7B2D8E',
  'eten & drinken': '#E53935', 'natuur': '#7CB342',
  'cultuur & historie': '#004B87', 'cultuur': '#004B87',
  'actief': '#FF6B00', 'winkelen': '#AB47BC',
  'recreatief': '#354f48', 'strand': '#7CB342',
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? '#30c59b';
}

export default function PoiDetailDrawer({ locale }: PoiDetailDrawerProps) {
  const [open, setOpen] = useState(false);
  const [poi, setPoi] = useState<POI | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Listen for custom event
  useEffect(() => {
    const handler = (e: CustomEvent<{ poiId: number }>) => {
      const poiId = e.detail.poiId;
      setOpen(true);
      setLoading(true);
      setPoi(null);
      setReviews([]);
      document.body.style.overflow = 'hidden';

      fetch(`/api/pois/${poiId}`, {
        headers: { 'Accept-Language': locale },
      })
        .then(r => r.json())
        .then(data => {
          setPoi(data.poi ?? null);
          setReviews(data.reviews ?? []);
          if (data.poi?.name) analytics.poi_detail_opened(data.poi.name);
        })
        .catch(() => setPoi(null))
        .finally(() => setLoading(false));
    };

    window.addEventListener('hb:poi:open', handler as EventListener);
    return () => window.removeEventListener('hb:poi:open', handler as EventListener);
  }, [locale]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const images = poi?.images ?? [];
  const stars = (v: number) => '★'.repeat(Math.round(v)) + '☆'.repeat(5 - Math.round(v));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={close}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-full sm:w-[600px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-xl transition-colors"
          aria-label="Close"
        >
          &times;
        </button>

        {loading ? (
          <SkeletonDrawer />
        ) : !poi ? (
          <div className="flex items-center justify-center h-64 text-muted">
            POI not found
          </div>
        ) : (
          <>
            {/* Image */}
            {images.length > 0 ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0]}
                  alt={poi.name}
                  className="w-full h-56 sm:h-72 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {images.length > 1 && (
                  <div className="flex gap-1 p-2 overflow-x-auto">
                    {images.slice(1, 5).map((img, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={i}
                        src={img}
                        alt={`${poi.name} ${i + 2}`}
                        className="w-20 h-14 object-cover rounded flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/40"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Header */}
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {poi.category && (
                    <span
                      className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: getCatColor(poi.category) }}
                    >
                      {poi.category}
                    </span>
                  )}
                  {poi.subcategory && (
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {poi.subcategory}
                    </span>
                  )}
                  {poi.google_category && poi.google_category !== poi.category && (
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                      {poi.google_category}
                    </span>
                  )}
                  {/* Price Level Badge */}
                  {poi.price_level && (
                    <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {'€'.repeat(Math.min(4, Math.max(1, Number(poi.price_level))))}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-heading font-bold text-foreground">{poi.name}</h2>
                {poi.address && (
                  <p className="text-sm text-muted mt-1">{poi.address}{poi.city ? `, ${poi.city}` : ''}</p>
                )}
              </div>

              {/* Rating */}
              {poi.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-accent text-lg">{stars(poi.rating)}</span>
                  <span className="font-medium">{poi.rating.toFixed(1)}</span>
                  {(poi.reviewCount ?? poi.review_count) && (
                    <span className="text-muted text-sm">({poi.reviewCount ?? poi.review_count} reviews)</span>
                  )}
                </div>
              )}

              {/* Description */}
              {(poi.enriched_detail_description || poi.description) && (
                <div className="text-sm text-foreground/80 leading-relaxed">
                  {(poi.enriched_detail_description || poi.description || '').split('\n').map((p, i) => (
                    p.trim() ? <p key={i} className="mb-2">{p}</p> : null
                  ))}
                </div>
              )}

              {/* Action Buttons: Menu / Reserve / Book */}
              {(poi.menu_url || poi.reservation_url || poi.booking_url) && (
                <div className="flex flex-wrap gap-2">
                  {poi.menu_url && (
                    <a
                      href={poi.menu_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => analytics.poi_menu_clicked(poi.name)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      <span>&#128203;</span>
                      {locale === 'nl' ? 'Bekijk menu' : locale === 'de' ? 'Speisekarte' : locale === 'es' ? 'Ver menú' : 'View menu'}
                    </a>
                  )}
                  {poi.reservation_url && (
                    <a
                      href={poi.reservation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => analytics.poi_reservation_clicked(poi.name)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      <span>&#128197;</span>
                      {locale === 'nl' ? 'Reserveren' : locale === 'de' ? 'Reservieren' : locale === 'es' ? 'Reservar' : 'Reserve'}
                    </a>
                  )}
                  {poi.booking_url && (
                    <a
                      href={poi.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => analytics.poi_booking_clicked(poi.name)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      <span>&#10003;</span>
                      {locale === 'nl' ? 'Boeken' : locale === 'de' ? 'Buchen' : locale === 'es' ? 'Reservar ahora' : 'Book now'}
                    </a>
                  )}
                </div>
              )}

              {/* Highlights */}
              {poi.enriched_highlights && poi.enriched_highlights.length > 0 && (
                <div className="bg-primary/5 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2">Highlights</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {poi.enriched_highlights.map((h, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-primary">&#10003;</span>{h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                {poi.phone && (
                  <a href={`tel:${poi.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <span>&#128222;</span> {poi.phone}
                  </a>
                )}
                {poi.website && (
                  <a href={poi.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"
                    onClick={() => analytics.poi_website_clicked(poi.name, poi.website || '')}>
                    <span>&#127760;</span> Website
                  </a>
                )}
                {poi.email && (
                  <a href={`mailto:${poi.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <span>&#9993;</span> {poi.email}
                  </a>
                )}
                {poi.latitude && poi.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>&#128205;</span> Google Maps
                  </a>
                )}
              </div>

              {/* Live Busyness Indicator */}
              {poi.live_busyness_text && (
                <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span
                    className="text-base leading-none"
                    style={{
                      color: poi.live_busyness_percent == null
                        ? '#6b7280'
                        : poi.live_busyness_percent < 30
                        ? '#16a34a'
                        : poi.live_busyness_percent <= 70
                        ? '#d97706'
                        : '#dc2626',
                    }}
                  >
                    &#9679;
                  </span>
                  <span className="text-foreground/80">
                    <span className="font-medium">
                      {locale === 'nl' ? 'Nu: ' : locale === 'de' ? 'Jetzt: ' : locale === 'es' ? 'Ahora: ' : 'Now: '}
                    </span>
                    {poi.live_busyness_text}
                    {poi.live_busyness_percent != null && (
                      <span className="text-muted ml-1">({poi.live_busyness_percent}%)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Opening Hours */}
              {poi.opening_hours && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <OpeningHours data={poi.opening_hours} />
                </div>
              )}

              {/* Amenities */}
              {poi.amenities && poi.amenities.length > 0 && (
                <FeatureList title="Amenities" items={poi.amenities} />
              )}

              {/* Accessibility */}
              {poi.accessibility_features && poi.accessibility_features.length > 0 && (
                <FeatureList title="Accessibility" items={poi.accessibility_features} />
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Reviews ({reviews.length})
                  </h3>
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map(review => (
                      <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{review.user_name || 'Anonymous'}</span>
                          <span className="text-accent text-sm">{stars(review.rating)}</span>
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-foreground/70 line-clamp-3">{review.review_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {reviews.length > 3 && (
                    <a
                      href={`${getPortalUrl()}/pois/${poi.id}`}
                      className="block mt-2 text-sm text-primary hover:underline text-center"
                    >
                      {locale === 'nl' ? `Alle ${reviews.length} reviews bekijken` : `View all ${reviews.length} reviews`}
                    </a>
                  )}
                </div>
              )}

              {/* Review Tags */}
              {poi.review_tags && poi.review_tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    {locale === 'nl' ? 'Vaak genoemd' : locale === 'de' ? 'Oft erwähnt' : locale === 'es' ? 'Más mencionado' : 'Frequently mentioned'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {poi.review_tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag.title}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {tag.title}
                        <span className="text-primary/60 font-normal">({tag.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Places / People Also Search */}
              {poi.people_also_search && poi.people_also_search.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    {locale === 'nl' ? 'Vergelijkbare plekken' : locale === 'de' ? 'Ähnliche Orte' : locale === 'es' ? 'Lugares similares' : 'Similar places'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {poi.people_also_search.slice(0, 6).map((place) => (
                      <button
                        key={place.title}
                        onClick={() => analytics.poi_similar_clicked(poi.name, place.title)}
                        className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground line-clamp-1">{place.title}</span>
                        <span className="text-xs text-muted">
                          {place.score.toFixed(1)}&#9733; ({place.reviews})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Full page link */}
              <a
                href={`${getPortalUrl()}/pois/${poi.id}`}
                className="block w-full text-center py-3 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors"
              >
                {locale === 'nl' ? 'Volledig profiel bekijken' : locale === 'de' ? 'Vollst\u00e4ndiges Profil ansehen' : locale === 'es' ? 'Ver perfil completo' : 'View full profile'}
              </a>
            </div>
          </>
        )}
      </div>

    </>
  );
}
