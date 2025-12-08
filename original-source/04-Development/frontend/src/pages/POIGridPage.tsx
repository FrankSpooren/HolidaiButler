import { POIGrid } from '../features/poi/components/POIGrid';

/**
 * POIGridPage - Browse all POIs in grid view
 *
 * Route: /pois
 * Layout: RootLayout
 * Auth: Public
 *
 * Contains: Existing POI Grid component (already built)
 */
export function POIGridPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-text-primary mb-2">
          Points of Interest
        </h2>
        <p className="text-text-secondary">
          Explore 1,593+ POIs from our database
        </p>
      </div>

      {/* Existing POI Grid Component */}
      <POIGrid filters={{ limit: 12 }} />
    </div>
  );
}
