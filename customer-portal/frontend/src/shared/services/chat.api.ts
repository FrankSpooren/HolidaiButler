/**
 * Chat API Client
 * Widget API Integration - HoliBot 2.0 Enterprise
 *
 * API client for HoliBot chat endpoint
 * Endpoint: POST /api/v1/holibot/chat
 *
 * Features:
 * - Multi-language support (6 languages)
 * - User preferences integration
 * - All 4 Quick Actions support
 */

import type { ChatRequest, ChatResponse } from '../types/chat.types';
import { API_CONFIG, isProduction } from '../config/apiConfig';
import type { Language } from '../../i18n/translations';

// Get base URL with production fallback (hybrid approach)
const getBaseUrl = (): string => {
  const configUrl = API_CONFIG.widgetApi.baseUrl;
  if (isProduction() && configUrl.includes('localhost')) {
    return '/api/v1';
  }
  return configUrl;
};

export interface UserPreferences {
  travelCompanion?: 'couple' | 'family' | 'solo' | 'group';
  interests?: string[];
  dietary?: string[];
  accessibility?: string[];
}

class ChatAPI {
  private sessionId: string | null = null;
  private language: Language = 'nl';
  private userPreferences: UserPreferences = {};

  private get baseUrl(): string {
    return getBaseUrl();
  }

  /**
   * Set the language for chat messages
   */
  setLanguage(lang: Language): void {
    this.language = lang;
    console.log('[ChatAPI] Language set to:', lang);
  }

  /**
   * Set user preferences for personalization
   */
  setUserPreferences(prefs: UserPreferences): void {
    this.userPreferences = prefs;
    console.log('[ChatAPI] User preferences set:', prefs);
  }

  /**
   * Send a chat message to HoliBot AI
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const requestBody = {
        message: request.query,
        language: this.language,
        conversationHistory: [],
        userPreferences: this.userPreferences
      };

      console.log('[ChatAPI] Sending message:', requestBody);

      const response = await fetch(`${this.baseUrl}/holibot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ChatAPI] Response received:', data);

      // Transform HoliBot 2.0 response to ChatResponse format
      if (data.success && data.data) {
        return {
          success: true,
          data: {
            textResponse: data.data.message,
            pois: data.data.pois || [],
            sources: data.data.sources || [],
            sessionId: this.sessionId,
            intent: data.data.intent || { primaryIntent: 'chat' }
          }
        };
      }

      return data;

    } catch (error) {
      console.error('[ChatAPI] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chat service unavailable'
      };
    }
  }

  /**
   * Build personalized itinerary
   * Quick Action 1: Programma samenstellen
   */
  async buildItinerary(options: {
    date?: string;
    duration?: 'morning' | 'afternoon' | 'evening' | 'full-day';
    interests?: string[];
  } = {}): Promise<any> {
    try {
      const requestBody = {
        date: options.date || new Date().toISOString().split('T')[0],
        duration: options.duration || 'full-day',
        interests: options.interests || this.userPreferences.interests || [],
        travelCompanion: this.userPreferences.travelCompanion,
        language: this.language
      };

      console.log('[ChatAPI] Building itinerary:', requestBody);

      const response = await fetch(`${this.baseUrl}/holibot/itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Itinerary error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Itinerary service unavailable'
      };
    }
  }

  /**
   * Get location details
   * Quick Action 2: Specifieke locatie-informatie
   */
  async getLocationInfo(poiId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/holibot/location/${poiId}?language=${this.language}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Location info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Location service unavailable'
      };
    }
  }

  /**
   * Get directions to POI
   * Quick Action 3: Routebeschrijving
   */
  async getDirections(options: {
    toPoiId: string;
    from?: { lat: number; lng: number } | 'current';
    mode?: 'walking' | 'driving';
  }): Promise<any> {
    try {
      const requestBody = {
        toPoiId: options.toPoiId,
        from: options.from || 'current',
        mode: options.mode || 'walking',
        language: this.language
      };

      const response = await fetch(`${this.baseUrl}/holibot/directions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Directions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Directions service unavailable'
      };
    }
  }

  /**
   * Get daily POI tip (personalized)
   * Quick Action 4: Mijn Tip van de Dag
   */
  async getDailyTip(): Promise<any> {
    try {
      const params = new URLSearchParams({
        language: this.language
      });

      // Add interests if available
      if (this.userPreferences.interests?.length) {
        params.append('interests', this.userPreferences.interests.join(','));
      }

      const response = await fetch(`${this.baseUrl}/holibot/daily-tip?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Daily tip error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Daily tip service unavailable'
      };
    }
  }

  /**
   * Search for POIs
   */
  async searchPOIs(query: string, options: { limit?: number; category?: string } = {}): Promise<any> {
    try {
      const requestBody = {
        query,
        limit: options.limit || 10,
        filter: options.category ? { category: options.category } : undefined
      };

      const response = await fetch(`${this.baseUrl}/holibot/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search service unavailable'
      };
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.sessionId = null;
  }

  /**
   * Generate unique message ID
   */
  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const chatApi = new ChatAPI();
