/**
 * AgendaFavoritesContext - Context for managing agenda event favorites
 *
 * Stores favorites with selectedDate to preserve the specific date the user selected
 * Uses localStorage for persistence
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AgendaFavorite {
  eventId: string;
  selectedDate: string; // ISO date string of the selected occurrence
}

interface AgendaFavoritesContextType {
  agendaFavorites: AgendaFavorite[];
  isAgendaFavorite: (eventId: string, selectedDate?: string) => boolean;
  toggleAgendaFavorite: (eventId: string, selectedDate?: string) => void;
  addAgendaFavorite: (eventId: string, selectedDate: string) => void;
  removeAgendaFavorite: (eventId: string, selectedDate?: string) => void;
  clearAgendaFavorites: () => void;
  getSelectedDate: (eventId: string) => string | undefined;
}

const AgendaFavoritesContext = createContext<AgendaFavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_agenda_favorites';

export function AgendaFavoritesProvider({ children }: { children: ReactNode }) {
  const [agendaFavorites, setAgendaFavorites] = useState<AgendaFavorite[]>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle migration from old format (array of strings) to new format (array of objects)
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          // Check if it's old format (strings) or new format (objects)
          if (typeof parsed[0] === 'string') {
            // Migrate old format: convert string IDs to objects with current date as fallback
            return parsed.map((id: string) => ({
              eventId: id,
              selectedDate: new Date().toISOString(),
            }));
          }
          // Already new format
          return parsed as AgendaFavorite[];
        }
      }
    } catch (error) {
      console.error('Error loading agenda favorites from localStorage:', error);
    }
    return [];
  });

  // Sync to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agendaFavorites));
    } catch (error) {
      console.error('Error saving agenda favorites to localStorage:', error);
    }
  }, [agendaFavorites]);

  // Check if an event is a favorite (optionally check specific date)
  const isAgendaFavorite = (eventId: string, selectedDate?: string): boolean => {
    if (selectedDate) {
      // Check for exact match (same event AND same date)
      return agendaFavorites.some(
        fav => fav.eventId === eventId && fav.selectedDate === selectedDate
      );
    }
    // Check if event is favorited on ANY date
    return agendaFavorites.some(fav => fav.eventId === eventId);
  };

  // Get the stored selectedDate for an event
  const getSelectedDate = (eventId: string): string | undefined => {
    const favorite = agendaFavorites.find(fav => fav.eventId === eventId);
    return favorite?.selectedDate;
  };

  const addAgendaFavorite = (eventId: string, selectedDate: string) => {
    setAgendaFavorites(prev => {
      // Don't add duplicate (same event + same date)
      if (prev.some(fav => fav.eventId === eventId && fav.selectedDate === selectedDate)) {
        return prev;
      }
      return [...prev, { eventId, selectedDate }];
    });
  };

  const removeAgendaFavorite = (eventId: string, selectedDate?: string) => {
    setAgendaFavorites(prev => {
      if (selectedDate) {
        // Remove specific occurrence
        return prev.filter(
          fav => !(fav.eventId === eventId && fav.selectedDate === selectedDate)
        );
      }
      // Remove all occurrences of this event
      return prev.filter(fav => fav.eventId !== eventId);
    });
  };

  const toggleAgendaFavorite = (eventId: string, selectedDate?: string) => {
    const date = selectedDate || new Date().toISOString();
    // Check if event is already a favorite (on ANY date)
    const existingFavorite = agendaFavorites.find(fav => fav.eventId === eventId);
    if (existingFavorite) {
      // Remove all favorites for this event (regardless of date)
      removeAgendaFavorite(eventId);
    } else {
      // Add new favorite with the specified date
      addAgendaFavorite(eventId, date);
    }
  };

  const clearAgendaFavorites = () => {
    setAgendaFavorites([]);
  };

  return (
    <AgendaFavoritesContext.Provider
      value={{
        agendaFavorites,
        isAgendaFavorite,
        toggleAgendaFavorite,
        addAgendaFavorite,
        removeAgendaFavorite,
        clearAgendaFavorites,
        getSelectedDate,
      }}
    >
      {children}
    </AgendaFavoritesContext.Provider>
  );
}

export function useAgendaFavorites() {
  const context = useContext(AgendaFavoritesContext);
  if (context === undefined) {
    throw new Error('useAgendaFavorites must be used within an AgendaFavoritesProvider');
  }
  return context;
}
