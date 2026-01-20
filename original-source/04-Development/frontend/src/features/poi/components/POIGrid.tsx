import React, { useState } from 'react';
import { usePOIs } from '../hooks/usePOIs';
import { POICard } from './POICard';
import { POIDetailModal } from './POIDetailModal';
import type { POISearchParams } from '../types/poi.types';
import { Loader2 } from 'lucide-react';

interface POIGridProps {
  filters?: POISearchParams;
}

export const POIGrid: React.FC<POIGridProps> = ({ filters }) => {
  const { data: pois, isLoading, error } = usePOIs(filters);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-holibot-accent animate-spin" />
        <span className="ml-3 text-text-secondary">Loading POIs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-card p-6 text-center">
        <p className="text-red-800 font-medium">Error loading POIs</p>
        <p className="text-red-600 text-sm mt-2">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
      </div>
    );
  }

  if (!pois || !pois.data || pois.data.length === 0) {
    return (
      <div className="bg-bg-gray border border-border-light rounded-card p-12 text-center">
        <p className="text-text-secondary text-lg">No POIs found</p>
        <p className="text-text-tertiary text-sm mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Count */}
      <div className="text-text-secondary text-sm">
        Showing {pois.data.length} {pois.data.length === 1 ? 'result' : 'results'}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pois.data.map((poi) => (
          <POICard
            key={poi.id}
            poi={poi}
            onClick={() => setSelectedPOIId(poi.id)}
          />
        ))}
      </div>

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={selectedPOIId !== null}
          onClose={() => setSelectedPOIId(null)}
        />
      )}
    </div>
  );
};

export default POIGrid;
