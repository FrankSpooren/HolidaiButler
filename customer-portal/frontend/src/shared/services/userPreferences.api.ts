/**
 * User Preferences API Service
 *
 * Manages user preferences for HoliBot personalization.
 * Reads from localStorage (onboarding data) and optionally from backend API.
 */

export interface UserPreferences {
  travelCompanion?: 'couple' | 'family' | 'solo' | 'group';
  interests?: string[];
  stayType?: 'pleasure' | 'business';
  duration?: string;
  dietary?: string[];
  accessibility?: string[];
}

const STORAGE_KEY = 'userPreferences';

class UserPreferencesAPI {
  private cache: UserPreferences | null = null;

  /**
   * Get user preferences from localStorage
   */
  getFromLocalStorage(): UserPreferences | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        this.cache = prefs;
        return prefs;
      }

      // Also check onboarding data
      const onboarding = localStorage.getItem('onboardingData');
      if (onboarding) {
        const data = JSON.parse(onboarding);
        const prefs: UserPreferences = {
          travelCompanion: data.travelCompanion,
          interests: data.interests || [],
          stayType: data.stayType,
          duration: data.duration,
          dietary: data.dietary || [],
          accessibility: data.accessibility || []
        };
        this.cache = prefs;
        return prefs;
      }

      return null;
    } catch (error) {
      console.error('[UserPreferences] Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Get user preferences (from cache, localStorage, or API)
   */
  async getPreferences(): Promise<UserPreferences | null> {
    // Return cached if available
    if (this.cache) {
      return this.cache;
    }

    // Try localStorage first
    const localPrefs = this.getFromLocalStorage();
    if (localPrefs) {
      return localPrefs;
    }

    // TODO: Fetch from backend API if user is authenticated
    // const response = await api.get('/users/me/preferences');
    // if (response.data) {
    //   this.cache = response.data;
    //   return response.data;
    // }

    return null;
  }

  /**
   * Save preferences to localStorage
   */
  saveToLocalStorage(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      this.cache = prefs;
      console.log('[UserPreferences] Saved to localStorage:', prefs);
    } catch (error) {
      console.error('[UserPreferences] Error saving to localStorage:', error);
    }
  }

  /**
   * Clear cached preferences
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    const completed = localStorage.getItem('onboardingCompleted');
    return completed === 'true';
  }

  /**
   * Map interests to HoliBot-friendly format
   */
  mapInterestsToCategories(interests: string[]): string[] {
    const mapping: Record<string, string[]> = {
      'Relax': ['Beaches & Nature', 'Recreation', 'Wellness'],
      'Active': ['Active', 'Recreation'],
      'Culture': ['Culture & History'],
      'Food': ['Food & Drinks'],
      'Nature': ['Beaches & Nature'],
      'Nightlife': ['Food & Drinks'],
      'History': ['Culture & History'],
      'Shopping': ['Shopping']
    };

    const categories: string[] = [];
    for (const interest of interests) {
      const mapped = mapping[interest];
      if (mapped) {
        categories.push(...mapped);
      }
    }

    // Remove duplicates
    return [...new Set(categories)];
  }
}

export const userPreferencesApi = new UserPreferencesAPI();
