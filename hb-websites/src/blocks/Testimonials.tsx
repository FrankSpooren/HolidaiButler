import { headers } from 'next/headers';
import { fetchReviews } from '@/lib/api';
import Rating from '@/components/ui/Rating';

interface TestimonialsProps {
  limit?: number;
  minRating?: number;
  title?: string;
}

export default async function Testimonials({ limit = 6, minRating = 4, title }: TestimonialsProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const reviews = await fetchReviews(tenantSlug);

  if (!reviews || reviews.length === 0) return null;

  const filtered = reviews
    .filter(r => r.rating >= minRating && r.review_text)
    .slice(0, limit);

  if (filtered.length === 0) return null;

  // Schema.org AggregateRating + individual Reviews
  const avgRating = filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length;
  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenantSlug === 'texel' ? 'TexelMaps' : 'HolidaiButler',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Math.round(avgRating * 10) / 10,
      bestRating: 5,
      reviewCount: filtered.length,
    },
    review: filtered.slice(0, 5).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user_name || 'Anonymous' },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.review_text,
      ...(r.visit_date && { datePublished: new Date(r.visit_date).toISOString().split('T')[0] }),
    })),
  };

  const defaultTitle = locale === 'nl' ? 'Wat bezoekers zeggen' : locale === 'de' ? 'Was Besucher sagen' : locale === 'es' ? 'Lo que dicen los visitantes' : 'What visitors say';
  const sectionTitle = title || defaultTitle;

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      role="region" aria-label={sectionTitle}
      style={{ containerType: 'inline-size' }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6">{sectionTitle}</h2>
      <div className="testimonials-grid animate-stagger">
        {filtered.map((review) => (
          <div
            key={review.id}
            className="bg-surface rounded-tenant p-5 shadow-sm border border-gray-100 testimonial-card"
          >
            <div className="flex items-center justify-between mb-3">
              <Rating value={review.rating} size="sm" />
              {review.visit_date && (
                <span className="text-xs text-muted">
                  {new Date(review.visit_date).toLocaleDateString(locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : 'en-US')}
                </span>
              )}
            </div>
            <blockquote className="text-sm text-foreground/80 line-clamp-4 mb-3">
              &ldquo;{review.review_text}&rdquo;
            </blockquote>
            <cite className="text-sm font-medium text-foreground not-italic">
              {review.user_name || 'Anonymous'}
            </cite>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .testimonials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @container (min-width: 600px) {
          .testimonials-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .testimonials-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .testimonial-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media (hover: hover) {
          .testimonial-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.08);
          }
        }
      `}} />
    </section>
  );
}
