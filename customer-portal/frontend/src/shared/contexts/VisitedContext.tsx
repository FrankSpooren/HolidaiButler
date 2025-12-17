/**
 * VisitedContext - Context for tracking visited POIs and Events
 *
 * Features:
 * - Track visited POIs (by numeric ID)
 * - Track visited Events (by string ID)
 * - Store visit timestamps
 * - Persist to localStorage
 * - Auto-track when viewing POI/Event detail pages
 *
 * Sprint 3: Favorieten & Bezochte
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface VisitRecord {
  id: number | string;
  visitedAt: string; // ISO date string
  type: 'poi' | 'event';
}

interface VisitedContextType {
  // POI visits
  visitedPOIs: Map<number, string>; // POI ID -> visit date
  isVisitedPOI: (poiId: number) => boolean;
  markPOIVisited: (poiId: number) => void;
  getVisitedPOIIds: () => number[];

  // Event visits
  visitedEvents: Map<string, string>; // Event ID -> visit date
  isVisitedEvent: (eventId: string) => boolean;
  markEventVisited: (eventId: string) => void;
  getVisitedEventIds: () => string[];

  // Combined
  getAllVisits: () => VisitRecord[];
  clearAllVisits: () => void;
  totalVisitedCount: number;
}

const VisitedContext = createContext<VisitedContextType | undefined>(undefined);

const STORAGE_KEY_POIS = 'holidaibutler_visited_pois';
const STORAGE_KEY_EVENTS = 'holidaibutler_visited_events';

export function VisitedProvider({ children }: { children: ReactNode }) {
  // Initialize POI visits from localStorage
  const [visitedPOIs, setVisitedPOIs] = useState<Map<number, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POIS);
      if (stored) {
        const entries = JSON.parse(stored) as [number, string][];
        return new Map(entries);
      }
    } catch (error) {
      console.error('Error loading visited POIs from localStorage:', error);
    }
    return new Map();
  });

  // Initialize Event visits from localStorage
  const [visitedEvents, setVisitedEvents] = useState<Map<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (stored) {
        const entries = JSON.parse(stored) as [string, string][];
        return new Map(entries);
      }
    } catch (error) {
      console.error('Error loading visited Events from localStorage:', error);
    }
    return new Map();
  });

  // Sync POIs to localStorage
  useEffect(() => {
    try {
      const entries = Array.from(visitedPOIs.entries());
      localStorage.setItem(STORAGE_KEY_POIS, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving visited POIs to localStorage:', error);
    }
  }, [visitedPOIs]);

  // Sync Events to localStorage
  useEffect(() => {
    try {
      const entries = Array.from(visitedEvents.entries());
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving visited Events to localStorage:', error);
    }
  }, [visitedEvents]);

  // POI methods
  const isVisitedPOI = useCallback((poiId: number): boolean => {
    return visitedPOIs.has(poiId);
  }, [visitedPOIs]);

  const markPOIVisited = useCallback((poiId: number) => {
    setVisitedPOIs(prev => {
      // Only update if not already visited (keep first visit date)
      if (prev.has(poiId)) return prev;
      const newMap = new Map(prev);
      newMap.set(poiId, new Date().toISOString());
      return newMap;
    });
  }, []);

  const getVisitedPOIIds = useCallback((): number[] => {
    return Array.from(visitedPOIs.keys());
  }, [visitedPOIs]);

  // Event methods
  const isVisitedEvent = useCallback((eventId: string): boolean => {
    return visitedEvents.has(eventId);
  }, [visitedEvents]);

  const markEventVisited = useCallback((eventId: string) => {
    setVisitedEvents(prev => {
      // Only update if not already visited (keep first visit date)
      if (prev.has(eventId)) return prev;
      const newMap = new Map(prev);
      newMap.set(eventId, new Date().toISOString());
      return newMap;
    });
  }, []);

  const getVisitedEventIds = useCallback((): string[] => {
    return Array.from(visitedEvents.keys());
  }, [visitedEvents]);

  // Combined methods
  const getAllVisits = useCallback((): VisitRecord[] => {
    const poiVisits: VisitRecord[] = Array.from(visitedPOIs.entries()).map(([id, date]) => ({
      id,
      visitedAt: date,
      type: 'poi' as const,
    }));

    const eventVisits: VisitRecord[] = Array.from(visitedEvents.entries()).map(([id, date]) => ({
      id,
      visitedAt: date,
      type: 'event' as const,
    }));

    // Sort by visit date (most recent first)
    return [...poiVisits, ...eventVisits].sort(
      (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );
  }, [visitedPOIs, visitedEvents]);

  const clearAllVisits = useCallback(() => {
    setVisitedPOIs(new Map());
    setVisitedEvents(new Map());
  }, []);

  const totalVisitedCount = visitedPOIs.size + visitedEvents.size;

  return (
    <VisitedContext.Provider
      value={{
        visitedPOIs,
        isVisitedPOI,
        markPOIVisited,
        getVisitedPOIIds,
        visitedEvents,
        isVisitedEvent,
        markEventVisited,
        getVisitedEventIds,
        getAllVisits,
        clearAllVisits,
        totalVisitedCount,
      }}
    >
      {children}
    </VisitedContext.Provider>
  );
}

export function useVisited() {
  const context = useContext(VisitedContext);
  if (context === undefined) {
    throw new Error('useVisited must be used within a VisitedProvider');
  }
  return context;
}
