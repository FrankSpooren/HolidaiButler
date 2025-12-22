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
 * - SSE Streaming responses
 */

import type { ChatRequest, ChatResponse } from '../types/chat.types';
import { API_CONFIG, isProduction } from '../config/apiConfig';
import type { Language } from '../../i18n/translations';
import { getExcludeIdsParam, recordShownTip } from './tipHistory';

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

export interface StreamCallbacks {
  onMetadata?: (data: { pois: any[]; searchTimeMs: number; source: string }) => void;
  onChunk?: (text: string, fullText: string) => void;
  onDone?: (data: { fullMessage: string; totalLength: number }) => void;
  onError?: (error: string) => void;
}

class ChatAPI {
  private sessionId: string | null = null;
  private language: Language = 'nl';
  private userPreferences: UserPreferences = {};

  private get baseUrl(): string {
    return getBaseUrl();
  }

  setLanguage(lang: Language): void {
    this.language = lang;
    console.log('[ChatAPI] Language set to:', lang);
  }

  setUserPreferences(prefs: UserPreferences): void {
    this.userPreferences = prefs;
    console.log('[ChatAPI] User preferences set:', prefs);
  }

  /**
   * Send a chat message with streaming response (SSE)
   */
  async sendMessageStream(
    request: ChatRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const requestBody = {
        message: request.query,
        language: this.language,
        conversationHistory: [],
        userPreferences: this.userPreferences
      };

      console.log('[ChatAPI] Sending streaming message:', requestBody);

      const response = await fetch(`${this.baseUrl}/holibot/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);

              // Determine event type from previous line or data structure
              if (data.pois !== undefined && data.searchTimeMs !== undefined) {
                // metadata event
                callbacks.onMetadata?.(data);
              } else if (data.text !== undefined) {
                // chunk event
                fullText += data.text;
                callbacks.onChunk?.(data.text, fullText);
              } else if (data.fullMessage !== undefined) {
                // done event
                callbacks.onDone?.(data);
              } else if (data.error !== undefined) {
                // error event
                callbacks.onError?.(data.error);
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      console.log('[ChatAPI] Streaming complete, total length:', fullText.length);

    } catch (error) {
      console.error('[ChatAPI] Streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Streaming unavailable');
    }
  }

  /**
   * Send a chat message to HoliBot AI (non-streaming)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Itinerary error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Itinerary service unavailable' };
    }
  }

  async getLocationInfo(poiId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/holibot/location/${poiId}?language=${this.language}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Location info error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Location service unavailable' };
    }
  }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Directions error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Directions service unavailable' };
    }
  }

  /**
   * Get personalized daily tip with quality filter
   * - Rating >= 4.4 stars
   * - Includes Events from agenda
   * - Excludes previously shown tips (session-based)
   * @param additionalExcludes - Additional IDs to exclude (for shuffle functionality)
   */
  async getDailyTip(additionalExcludes: string[] = []): Promise<any> {
    try {
      const params = new URLSearchParams({ language: this.language });

      // Add user interests
      if (this.userPreferences.interests?.length) {
        params.append('interests', this.userPreferences.interests.join(','));
      }

      // Add excluded tip IDs (already shown this session + additional excludes)
      const sessionExcludes = getExcludeIdsParam();
      const allExcludes = sessionExcludes
        ? [...sessionExcludes.split(','), ...additionalExcludes].filter(Boolean).join(',')
        : additionalExcludes.filter(Boolean).join(',');

      if (allExcludes) {
        params.append('excludeIds', allExcludes);
      }

      console.log('[ChatAPI] Getting daily tip with excludeIds:', allExcludes);

      const response = await fetch(`${this.baseUrl}/holibot/daily-tip?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Record shown tip to avoid repetition
      if (result.success && result.data?.tipId) {
        const tipType = result.data.itemType || 'poi';
        recordShownTip(result.data.tipId, tipType);
        console.log('[ChatAPI] Recorded tip:', result.data.tipId, tipType);
      }

      return result;

    } catch (error) {
      console.error('[ChatAPI] Daily tip error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Daily tip service unavailable' };
    }
  }

  async searchPOIs(query: string, options: { limit?: number; category?: string } = {}): Promise<any> {
    try {
      const requestBody = {
        query,
        limit: options.limit || 10,
        filter: options.category ? { category: options.category } : undefined
      };

      const response = await fetch(`${this.baseUrl}/holibot/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] Search error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Search service unavailable' };
    }
  }

  /**
   * Convert text to speech using Google Cloud TTS
   * @param text - Text to convert (max 5000 characters)
   * @param language - Language code (nl, en, de, es, sv, pl)
   */
  async textToSpeech(text: string, language?: string): Promise<{
    success: boolean;
    data?: { audio: string; contentType: string; cached: boolean };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/holibot/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: language || this.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[ChatAPI] TTS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TTS service unavailable'
      };
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  clearSession(): void {
    this.sessionId = null;
  }

  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const chatApi = new ChatAPI();
