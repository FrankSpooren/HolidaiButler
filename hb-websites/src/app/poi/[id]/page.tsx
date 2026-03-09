import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPoi, fetchPoiReviews } from '@/lib/api';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';
import MapWrapper from '@/blocks/MapWrapper';
import OpeningHours from '@/components/poi/OpeningHours';
import FeatureList from '@/components/poi/FeatureList';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  try {
    const poi = await fetchPoi(tenantSlug, Number(id), locale);
    if (!poi) return { title: 'POI Not Found' };
    const desc = poi.enriched_tile_description || poi.description;
    return {
      title: `${poi.name} | HolidaiButler`,
      description: desc?.slice(0, 160),
      openGraph: {
        title: poi.name,
        description: desc?.slice(0, 160),
        images: poi.images?.[0] ? [poi.images[0]] : undefined,
      },
    };
  } catch {
    return { title: 'POI Not Found' };
  }
}

export default async function PoiDetailPage({ params }: PageProps) {
  const { id } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const [poi, reviews] = await Promise.all([
    fetchPoi(tenantSlug, Number(id), locale),
    fetchPoiReviews(tenantSlug, Number(id)),
  ]);

  if (!poi) notFound();

  const images = poi.images ?? [];
  const tileDescription = poi.enriched_tile_description || '';
  const detailDescription = poi.enriched_detail_description || poi.description;
  const highlights = poi.enriched_highlights ?? [];

  return (
    <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Image Gallery */}
      {images.length === 1 ? (
        <div className="mb-8 rounded-tenant overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt={poi.name}
            className="w-full h-64 md:h-96 object-cover"
            loading="eager"
          />
        </div>
      ) : images.length >= 2 && images.length <= 3 ? (
        <div className="mb-8 space-y-2">
          <div className="rounded-tenant overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt={poi.name}
              className="w-full h-64 md:h-80 object-cover"
              loading="eager"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {images.slice(1, 3).map((img, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={img}
                alt={`${poi.name} ${i + 2}`}
                className="w-full h-32 object-cover rounded-tenant"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      ) : images.length >= 4 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 rounded-tenant overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt={poi.name}
            className="w-full h-64 md:h-80 object-cover md:col-span-2"
            loading="eager"
          />
          <div className="hidden md:grid grid-rows-2 gap-2">
            {images.slice(1, 3).map((img, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={img}
                alt={`${poi.name} ${i + 2}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-tenant overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 h-48 flex items-center justify-center">
          <div className="text-center px-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40 mx-auto mb-2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="text-sm text-muted">{poi.category}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header: category, name, rating */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="primary">{poi.category}</Badge>
                {poi.subcategory && <Badge>{poi.subcategory}</Badge>}
                {poi.price_level && (
                  <Badge className="bg-amber-100 text-amber-800">{poi.price_level}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                {poi.name}
              </h1>
            </div>
            {poi.rating && (
              <div className="flex-shrink-0">
                <Rating value={poi.rating} count={poi.reviewCount ?? poi.review_count} />
              </div>
            )}
          </div>

          {/* Address */}
          {poi.address && (
            <p className="text-muted text-sm mb-6 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {poi.address}{poi.city ? `, ${poi.city}` : ''}
            </p>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="mb-6 bg-primary/5 rounded-tenant p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Highlights</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {highlights.map((h, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-primary mt-0.5">&#10003;</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Short Summary */}
          {tileDescription && tileDescription !== detailDescription && (
            <p className="text-lg text-foreground/70 mb-6 italic">
              {tileDescription}
            </p>
          )}

          {/* Description */}
          {detailDescription && (
            <div className="prose prose-lg max-w-none mb-8 text-foreground/80">
              {detailDescription.split('\n').map((p, i) => (
                p.trim() ? <p key={i}>{p}</p> : null
              ))}
            </div>
          )}

          {/* Amenities */}
          {poi.amenities && poi.amenities.length > 0 && (
            <div className="mb-6">
              <FeatureList title="Amenities" items={poi.amenities} />
            </div>
          )}

          {/* Accessibility */}
          {poi.accessibility_features && poi.accessibility_features.length > 0 && (
            <div className="mb-6">
              <FeatureList title="Accessibility" items={poi.accessibility_features} />
            </div>
          )}

          {/* Service Options */}
          {poi.service_options && Object.keys(poi.service_options).length > 0 && (
            <div className="mb-6">
              <FeatureList
                title="Service Options"
                items={Object.entries(poi.service_options)
                  .filter(([, v]) => v)
                  .map(([k]) => k.replace(/_/g, ' '))}
              />
            </div>
          )}

          {/* Parking */}
          {poi.parking && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Parking</h3>
              <p className="text-sm text-foreground/70">
                {typeof poi.parking === 'string' ? poi.parking : JSON.stringify(poi.parking)}
              </p>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-heading font-bold text-foreground mb-4">
                Reviews ({reviews.length})
              </h2>
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-tenant p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {review.user_name || 'Anonymous'}
                        </span>
                        {review.visit_date && (
                          <span className="text-xs text-muted">
                            {new Date(review.visit_date).toLocaleDateString(locale, {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <Rating value={review.rating} size="sm" />
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-foreground/70">{review.review_text}</p>
                    )}
                  </div>
                ))}
              </div>
              {reviews.length > 5 && (
                <p className="mt-4 text-sm text-muted text-center">
                  Showing 5 of {reviews.length} reviews
                </p>
              )}
            </section>
          )}

          {/* More images */}
          {images.length > 3 && (
            <div className="mt-8">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-3">More Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.slice(3, 9).map((img, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={img}
                    alt={`${poi.name} ${i + 4}`}
                    className="w-full h-32 object-cover rounded-tenant"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Map */}
          {poi.latitude && poi.longitude && (
            <div className="rounded-tenant overflow-hidden h-64">
              <MapWrapper
                center={[poi.latitude, poi.longitude]}
                zoom={15}
                markers={[{ lat: poi.latitude, lng: poi.longitude, name: poi.name, category: poi.category, rating: poi.rating, id: poi.id }]}
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-tenant p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            {poi.phone && (
              <a href={`tel:${poi.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {poi.phone}
              </a>
            )}
            {poi.email && (
              <a href={`mailto:${poi.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {poi.email}
              </a>
            )}
            {poi.website && (
              <a href={poi.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Website
              </a>
            )}
            {poi.latitude && poi.longitude && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Google Maps
              </a>
            )}
          </div>

          {/* Opening Hours */}
          {poi.opening_hours && (
            <div className="bg-gray-50 rounded-tenant p-4">
              <OpeningHours data={poi.opening_hours} />
            </div>
          )}

          {/* Reviews Distribution */}
          {poi.reviews_distribution && Object.keys(poi.reviews_distribution).length > 0 && (
            <div className="bg-gray-50 rounded-tenant p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Rating Distribution</h3>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = (poi.reviews_distribution as Record<string, number>)?.[String(star)] ?? 0;
                  const total = Object.values(poi.reviews_distribution as Record<string, number>).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-right">{star}</span>
                      <span className="text-amber-500">&#9733;</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
