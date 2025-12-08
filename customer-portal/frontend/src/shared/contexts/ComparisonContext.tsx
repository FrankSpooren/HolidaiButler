import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ComparisonContextType {
  comparisonPOIs: Set<number>;
  isInComparison: (poiId: number) => boolean;
  toggleComparison: (poiId: number) => void;
  addToComparison: (poiId: number) => void;
  removeFromComparison: (poiId: number) => void;
  clearComparison: () => void;
  canAddMore: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_comparison';
const MAX_COMPARISON_ITEMS = 3;

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonPOIs, setComparisonPOIs] = useState<Set<number>>(() => {
    // Initialize from sessionStorage (temporary, not persisted across sessions)
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        return new Set(ids);
      }
    } catch (error) {
      console.error('Error loading comparison from sessionStorage:', error);
    }
    return new Set();
  });

  // Sync to sessionStorage whenever comparison changes
  useEffect(() => {
    try {
      const ids = Array.from(comparisonPOIs);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving comparison to sessionStorage:', error);
    }
  }, [comparisonPOIs]);

  const isInComparison = (poiId: number): boolean => {
    return comparisonPOIs.has(poiId);
  };

  const canAddMore = comparisonPOIs.size < MAX_COMPARISON_ITEMS;

  const addToComparison = (poiId: number) => {
    if (comparisonPOIs.size >= MAX_COMPARISON_ITEMS) {
      console.warn(`Cannot add more than ${MAX_COMPARISON_ITEMS} POIs to comparison`);
      return;
    }
    setComparisonPOIs(prev => {
      const newSet = new Set(prev);
      newSet.add(poiId);
      return newSet;
    });
  };

  const removeFromComparison = (poiId: number) => {
    setComparisonPOIs(prev => {
      const newSet = new Set(prev);
      newSet.delete(poiId);
      return newSet;
    });
  };

  const toggleComparison = (poiId: number) => {
    if (isInComparison(poiId)) {
      removeFromComparison(poiId);
    } else {
      addToComparison(poiId);
    }
  };

  const clearComparison = () => {
    setComparisonPOIs(new Set());
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparisonPOIs,
        isInComparison,
        toggleComparison,
        addToComparison,
        removeFromComparison,
        clearComparison,
        canAddMore,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
