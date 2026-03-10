/** Reusable skeleton loading components for streaming SSR fallbacks */

export function SkeletonText({ width = '100%', className = '' }: { width?: string; className?: string }) {
  return (
    <div
      className={`h-4 bg-gray-200 rounded animate-pulse ${className}`}
      style={{ width }}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface rounded-tenant overflow-hidden shadow-sm ${className}`}>
      <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <SkeletonText width="40%" />
        <SkeletonText width="80%" />
        <SkeletonText width="60%" />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  columns = 3,
  className = '',
}: {
  count?: number;
  columns?: number;
  className?: string;
}) {
  const gridCols =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${className}`}>
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

/** Skeleton layout for POI detail drawer: image + text placeholders */
export function SkeletonDrawer() {
  return (
    <div className="animate-pulse">
      <div className="w-full h-56 sm:h-72 bg-gray-200" />
      <div className="p-5 space-y-4">
        <SkeletonText width="30%" />
        <SkeletonText width="70%" className="h-6" />
        <SkeletonText width="50%" />
        <div className="space-y-2 pt-2">
          <SkeletonText width="100%" />
          <SkeletonText width="90%" />
          <SkeletonText width="75%" />
        </div>
      </div>
    </div>
  );
}
