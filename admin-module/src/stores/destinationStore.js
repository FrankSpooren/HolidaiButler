import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDestinationStore = create(
  persist(
    (set) => ({
      selectedDestination: 'all',
      setDestination: (dest) => set({ selectedDestination: dest }),
    }),
    { name: 'hb-admin-destination' }
  )
);

export default useDestinationStore;
