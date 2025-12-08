import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface FavoritesContextType {
  favorites: Set<number>;
  isFavorite: (poiId: number) => boolean;
  toggleFavorite: (poiId: number) => void;
  addFavorite: (poiId: number) => void;
  removeFavorite: (poiId: number) => void;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        return new Set(ids);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
    return new Set();
  });

  // Sync to localStorage whenever favorites change
  useEffect(() => {
    try {
      const ids = Array.from(favorites);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [favorites]);

  const isFavorite = (poiId: number): boolean => {
    return favorites.has(poiId);
  };

  const addFavorite = (poiId: number) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      newSet.add(poiId);
      return newSet;
    });
  };

  const removeFavorite = (poiId: number) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      newSet.delete(poiId);
      return newSet;
    });
  };

  const toggleFavorite = (poiId: number) => {
    if (isFavorite(poiId)) {
      removeFavorite(poiId);
    } else {
      addFavorite(poiId);
    }
  };

  const clearFavorites = () => {
    setFavorites(new Set());
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
