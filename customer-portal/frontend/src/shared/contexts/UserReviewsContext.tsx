/**
 * UserReviewsContext - Context for managing user's own reviews
 *
 * Features:
 * - Store user's reviews with POI/Event info
 * - Add, edit, delete reviews
 * - Persist to localStorage
 * - Mock data for development
 *
 * Sprint 4: Reviews & Polish
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface UserReview {
  id: string;
  type: 'poi' | 'event';
  targetId: number | string; // POI ID (number) or Event ID (string)
  targetName: string;
  targetCategory: string;
  targetImage?: string;
  rating: number; // 1-5
  reviewText: string;
  visitDate: string;
  createdAt: string;
  updatedAt: string;
}

interface UserReviewsContextType {
  reviews: UserReview[];
  isLoading: boolean;
  addReview: (review: Omit<UserReview, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReview: (id: string, updates: Partial<Pick<UserReview, 'rating' | 'reviewText'>>) => void;
  deleteReview: (id: string) => void;
  getReviewByTarget: (type: 'poi' | 'event', targetId: number | string) => UserReview | undefined;
  hasReviewedTarget: (type: 'poi' | 'event', targetId: number | string) => boolean;
  totalReviewsCount: number;
}

const UserReviewsContext = createContext<UserReviewsContextType | undefined>(undefined);

const STORAGE_KEY = 'holidaibutler_user_reviews';

// Mock reviews for development
const MOCK_REVIEWS: UserReview[] = [
  {
    id: 'review-1',
    type: 'poi',
    targetId: 1,
    targetName: 'Restaurant La Bohème',
    targetCategory: 'Restaurants',
    targetImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    rating: 5,
    reviewText: 'Fantastisch eten en geweldige service! De paella was de beste die we ooit gehad hebben. Zeker een aanrader voor iedereen die van authentiek Spaans eten houdt.',
    visitDate: '2025-11-15',
    createdAt: '2025-11-16T10:30:00Z',
    updatedAt: '2025-11-16T10:30:00Z',
  },
  {
    id: 'review-2',
    type: 'poi',
    targetId: 2,
    targetName: 'Peñón de Ifach',
    targetCategory: 'Natuur',
    targetImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    rating: 4,
    reviewText: 'Prachtige wandeling met adembenemend uitzicht! Wel pittig, dus goede schoenen zijn een must. De zonsondergang vanaf de top is magisch.',
    visitDate: '2025-10-20',
    createdAt: '2025-10-21T14:00:00Z',
    updatedAt: '2025-10-21T14:00:00Z',
  },
  {
    id: 'review-3',
    type: 'event',
    targetId: 'event-1',
    targetName: 'Fiesta de la Virgen de las Nieves',
    targetCategory: 'Festivals',
    targetImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    rating: 5,
    reviewText: 'Wat een feest! De sfeer was geweldig, de muziek fantastisch en de lokale bevolking zo gastvrij. Een echte Spaanse ervaring.',
    visitDate: '2025-08-05',
    createdAt: '2025-08-06T09:00:00Z',
    updatedAt: '2025-08-06T09:00:00Z',
  },
];

export function UserReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load reviews from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setReviews(parsed);
      } else {
        // Start with empty reviews in production; use mock data only in dev
        if (import.meta.env.DEV) {
          setReviews(MOCK_REVIEWS);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_REVIEWS));
        } else {
          setReviews([]);
        }
      }
    } catch (error) {
      console.error('Error loading reviews from localStorage:', error);
      setReviews(MOCK_REVIEWS);
    }
    setIsLoading(false);
  }, []);

  // Save reviews to localStorage when changed
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
      } catch (error) {
        console.error('Error saving reviews to localStorage:', error);
      }
    }
  }, [reviews, isLoading]);

  const addReview = useCallback((review: Omit<UserReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newReview: UserReview = {
      ...review,
      id: `review-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setReviews(prev => [newReview, ...prev]);
  }, []);

  const updateReview = useCallback((id: string, updates: Partial<Pick<UserReview, 'rating' | 'reviewText'>>) => {
    setReviews(prev => prev.map(review => {
      if (review.id === id) {
        return {
          ...review,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return review;
    }));
  }, []);

  const deleteReview = useCallback((id: string) => {
    setReviews(prev => prev.filter(review => review.id !== id));
  }, []);

  const getReviewByTarget = useCallback((type: 'poi' | 'event', targetId: number | string): UserReview | undefined => {
    return reviews.find(r => r.type === type && r.targetId === targetId);
  }, [reviews]);

  const hasReviewedTarget = useCallback((type: 'poi' | 'event', targetId: number | string): boolean => {
    return reviews.some(r => r.type === type && r.targetId === targetId);
  }, [reviews]);

  const totalReviewsCount = reviews.length;

  return (
    <UserReviewsContext.Provider
      value={{
        reviews,
        isLoading,
        addReview,
        updateReview,
        deleteReview,
        getReviewByTarget,
        hasReviewedTarget,
        totalReviewsCount,
      }}
    >
      {children}
    </UserReviewsContext.Provider>
  );
}

export function useUserReviews() {
  const context = useContext(UserReviewsContext);
  if (context === undefined) {
    throw new Error('useUserReviews must be used within a UserReviewsProvider');
  }
  return context;
}
