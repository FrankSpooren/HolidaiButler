/**
 * Favorites Context - Persistent Favorites Management
 * Based on ORIGINAL source implementation
 *
 * Features:
 * - localStorage persistence
 * - Toggle, add, remove favorites
 * - Check if POI is favorite
 * - Cross-session persistence
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext(undefined);

const STORAGE_KEY = 'holidaibutler_favorites';

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
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

  const isFavorite = (poiId) => {
    return favorites.has(poiId);
  };

  const addFavorite = (poiId) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      newSet.add(poiId);
      return newSet;
    });
  };

  const removeFavorite = (poiId) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      newSet.delete(poiId);
      return newSet;
    });
  };

  const toggleFavorite = (poiId) => {
    if (isFavorite(poiId)) {
      removeFavorite(poiId);
    } else {
      addFavorite(poiId);
    }
  };

  const clearFavorites = () => {
    setFavorites(new Set());
  };

  const getFavoriteIds = () => {
    return Array.from(favorites);
  };

  const favoriteCount = favorites.size;

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteCount,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
        getFavoriteIds,
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

export default FavoritesContext;
