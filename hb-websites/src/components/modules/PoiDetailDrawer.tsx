'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POI, Review } from '@/types/poi';
import OpeningHours from '@/components/poi/OpeningHours';
import FeatureList from '@/components/poi/FeatureList';

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
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
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
                  <a href={poi.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
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
                      href={`/poi/${poi.id}`}
                      className="block mt-2 text-sm text-primary hover:underline text-center"
                    >
                      {locale === 'nl' ? `Alle ${reviews.length} reviews bekijken` : `View all ${reviews.length} reviews`}
                    </a>
                  )}
                </div>
              )}

              {/* Full page link */}
              <a
                href={`/poi/${poi.id}`}
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
