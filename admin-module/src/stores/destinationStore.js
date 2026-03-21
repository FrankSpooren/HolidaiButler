import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDestinationStore = create(
  persist(
    (set, get) => ({
      selectedDestination: 'all',
      destinations: [], // Full destination list from API (with featureFlags, destinationType)

      setDestination: (dest) => set({ selectedDestination: dest }),
      setDestinations: (dests) => set({ destinations: dests }),

      /**
       * Get the currently selected destination object (with featureFlags, destinationType, etc.)
       * Returns null if 'all' is selected or destination not found.
       */
      getSelectedDestinationInfo: () => {
        const { selectedDestination, destinations } = get();
        if (selectedDestination === 'all' || !destinations.length) return null;
        return destinations.find(d => d.code === selectedDestination) || null;
      },

      /**
       * Get featureFlags for the selected destination.
       * Returns empty object if 'all' selected.
       */
      getSelectedFeatureFlags: () => {
        const info = get().getSelectedDestinationInfo();
        return info?.featureFlags || {};
      },

      /**
       * Check if selected destination is content_only type.
       * Returns false if 'all' selected.
       */
      isContentOnly: () => {
        const info = get().getSelectedDestinationInfo();
        return info?.destinationType === 'content_only';
      },
    }),
    { name: 'hb-admin-destination' }
  )
);

export default useDestinationStore;
