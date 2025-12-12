import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AgendaComparisonContextType {
  comparisonEvents: Set<string>;
  isInComparison: (eventId: string) => boolean;
  toggleComparison: (eventId: string) => void;
  addToComparison: (eventId: string) => void;
  removeFromComparison: (eventId: string) => void;
  clearComparison: () => void;
  canAddMore: boolean;
}

const AgendaComparisonContext = createContext<AgendaComparisonContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_agenda_comparison';
const MAX_COMPARISON_ITEMS = 3;

export function AgendaComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonEvents, setComparisonEvents] = useState<Set<string>>(() => {
    // Initialize from sessionStorage (temporary, not persisted across sessions)
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        return new Set(ids);
      }
    } catch (error) {
      console.error('Error loading agenda comparison from sessionStorage:', error);
    }
    return new Set();
  });

  // Sync to sessionStorage whenever comparison changes
  useEffect(() => {
    try {
      const ids = Array.from(comparisonEvents);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving agenda comparison to sessionStorage:', error);
    }
  }, [comparisonEvents]);

  const isInComparison = (eventId: string): boolean => {
    return comparisonEvents.has(eventId);
  };

  const canAddMore = comparisonEvents.size < MAX_COMPARISON_ITEMS;

  const addToComparison = (eventId: string) => {
    if (comparisonEvents.size >= MAX_COMPARISON_ITEMS) {
      console.warn(`Cannot add more than ${MAX_COMPARISON_ITEMS} events to comparison`);
      return;
    }
    setComparisonEvents(prev => {
      const newSet = new Set(prev);
      newSet.add(eventId);
      return newSet;
    });
  };

  const removeFromComparison = (eventId: string) => {
    setComparisonEvents(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
  };

  const toggleComparison = (eventId: string) => {
    if (isInComparison(eventId)) {
      removeFromComparison(eventId);
    } else {
      addToComparison(eventId);
    }
  };

  const clearComparison = () => {
    setComparisonEvents(new Set());
  };

  return (
    <AgendaComparisonContext.Provider
      value={{
        comparisonEvents,
        isInComparison,
        toggleComparison,
        addToComparison,
        removeFromComparison,
        clearComparison,
        canAddMore,
      }}
    >
      {children}
    </AgendaComparisonContext.Provider>
  );
}

export function useAgendaComparison() {
  const context = useContext(AgendaComparisonContext);
  if (context === undefined) {
    throw new Error('useAgendaComparison must be used within an AgendaComparisonProvider');
  }
  return context;
}
