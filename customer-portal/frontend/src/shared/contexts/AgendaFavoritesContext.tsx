/**
 * AgendaFavoritesContext - Context for managing agenda event favorites
 *
 * Similar to FavoritesContext but uses string IDs (MongoDB _id format)
 * Stores favorites in localStorage for persistence
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AgendaFavoritesContextType {
  agendaFavorites: Set<string>;
  isAgendaFavorite: (eventId: string) => boolean;
  toggleAgendaFavorite: (eventId: string) => void;
  addAgendaFavorite: (eventId: string) => void;
  removeAgendaFavorite: (eventId: string) => void;
  clearAgendaFavorites: () => void;
}

const AgendaFavoritesContext = createContext<AgendaFavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_agenda_favorites';

export function AgendaFavoritesProvider({ children }: { children: ReactNode }) {
  const [agendaFavorites, setAgendaFavorites] = useState<Set<string>>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        return new Set(ids);
      }
    } catch (error) {
      console.error('Error loading agenda favorites from localStorage:', error);
    }
    return new Set();
  });

  // Sync to localStorage whenever favorites change
  useEffect(() => {
    try {
      const ids = Array.from(agendaFavorites);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving agenda favorites to localStorage:', error);
    }
  }, [agendaFavorites]);

  const isAgendaFavorite = (eventId: string): boolean => {
    return agendaFavorites.has(eventId);
  };

  const addAgendaFavorite = (eventId: string) => {
    setAgendaFavorites(prev => {
      const newSet = new Set(prev);
      newSet.add(eventId);
      return newSet;
    });
  };

  const removeAgendaFavorite = (eventId: string) => {
    setAgendaFavorites(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
  };

  const toggleAgendaFavorite = (eventId: string) => {
    if (isAgendaFavorite(eventId)) {
      removeAgendaFavorite(eventId);
    } else {
      addAgendaFavorite(eventId);
    }
  };

  const clearAgendaFavorites = () => {
    setAgendaFavorites(new Set());
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
