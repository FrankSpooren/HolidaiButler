import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPoi, fetchPoiReviews } from '@/lib/api';
import Rating from '@/components/ui/Rating';
import Badge from '@/components/ui/Badge';
import MapWrapper from '@/blocks/MapWrapper';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';

  try {
    const poi = await fetchPoi(tenantSlug, Number(id));
    if (!poi) return { title: 'POI Not Found' };
    return {
      title: `${poi.name} | HolidaiButler`,
      description: poi.description?.slice(0, 160),
      openGraph: {
        title: poi.name,
        description: poi.description?.slice(0, 160),
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

  const [poi, reviews] = await Promise.all([
    fetchPoi(tenantSlug, Number(id)),
    fetchPoiReviews(tenantSlug, Number(id)),
  ]);

  if (!poi) notFound();

  const images = poi.images ?? [];

  return (
    <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Image */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 rounded-tenant overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt={poi.name}
            className="w-full h-64 md:h-80 object-cover md:col-span-2"
            loading="eager"
          />
          {images.length > 1 && (
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
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Badge variant="primary">{poi.category}</Badge>
              {poi.subcategory && (
                <Badge className="ml-2">{poi.subcategory}</Badge>
              )}
              <h1 className="text-3xl font-heading font-bold text-foreground mt-2">
                {poi.name}
              </h1>
            </div>
            {poi.rating && (
              <div className="flex-shrink-0">
                <Rating value={poi.rating} count={poi.reviewCount ?? poi.review_count} />
              </div>
            )}
          </div>

          {poi.address && (
            <p className="text-muted text-sm mb-6">{poi.address}</p>
          )}

          {poi.description && (
            <div className="prose prose-lg max-w-none mb-8 text-foreground/80">
              <p>{poi.description}</p>
            </div>
          )}

          {/* Contact */}
          {(poi.phone || poi.website) && (
            <div className="flex flex-wrap gap-4 mb-8 text-sm">
              {poi.phone && (
                <a href={`tel:${poi.phone}`} className="text-primary hover:underline">
                  {poi.phone}
                </a>
              )}
              {poi.website && (
                <a href={poi.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Website
                </a>
              )}
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-heading font-bold text-foreground mb-4">
                Reviews ({reviews.length})
              </h2>
              <div className="space-y-4">
                {reviews.slice(0, 10).map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-tenant p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{review.author_name}</span>
                      <Rating value={review.rating} size="sm" />
                    </div>
                    {review.text && (
                      <p className="text-sm text-foreground/70">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          {poi.latitude && poi.longitude && (
            <div className="rounded-tenant overflow-hidden mb-6 h-64">
              <MapWrapper center={[poi.latitude, poi.longitude]} zoom={15} />
            </div>
          )}

          {/* More images */}
          {images.length > 3 && (
            <div className="grid grid-cols-2 gap-2">
              {images.slice(3, 7).map((img, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={img}
                  alt={`${poi.name} ${i + 4}`}
                  className="w-full h-24 object-cover rounded"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
