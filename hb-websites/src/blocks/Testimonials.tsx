import { headers } from 'next/headers';
import { fetchReviews } from '@/lib/api';
import Rating from '@/components/ui/Rating';

interface TestimonialsProps {
  limit?: number;
  minRating?: number;
}

export default async function Testimonials({ limit = 6, minRating = 4 }: TestimonialsProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';

  const reviews = await fetchReviews(tenantSlug);

  if (!reviews || reviews.length === 0) return null;

  const filtered = reviews
    .filter(r => r.rating >= minRating && r.review_text)
    .slice(0, limit);

  if (filtered.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6">
        Reviews
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((review) => (
          <div
            key={review.id}
            className="bg-surface rounded-tenant p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <Rating value={review.rating} size="sm" />
              {review.visit_date && (
                <span className="text-xs text-muted">
                  {new Date(review.visit_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/80 line-clamp-4 mb-3">
              &ldquo;{review.review_text}&rdquo;
            </p>
            <p className="text-sm font-medium text-foreground">
              {review.user_name || 'Anonymous'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
