/**
 * Chat API Client
 * Widget API Integration - Updated for HoliBot 2.0
 *
 * API client for HoliBot chat endpoint
 * Endpoint: POST /api/v1/holibot/chat
 *
 * Uses hybrid URL detection:
 * - Central config from apiConfig.ts
 * - Service-level fallback for production environments
 */

import type { ChatRequest, ChatResponse } from '../types/chat.types';
import { API_CONFIG, isProduction } from '../config/apiConfig';

// Get base URL with production fallback (hybrid approach)
const getBaseUrl = (): string => {
  const configUrl = API_CONFIG.widgetApi.baseUrl;
  // If configUrl is a localhost URL but we're in production, use relative URL
  if (isProduction() && configUrl.includes('localhost')) {
    return '/api/v1';
  }
  return configUrl;
};

class ChatAPI {
  private sessionId: string | null = null;
  private language: string = 'nl';

  private get baseUrl(): string {
    return getBaseUrl();
  }

  /**
   * Set the language for chat messages
   */
  setLanguage(lang: string): void {
    this.language = lang;
  }

  /**
   * Send a chat message to HoliBot AI
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Build request body for HoliBot 2.0 API
      const requestBody = {
        message: request.query,
        language: this.language,
        conversationHistory: [],
        userPreferences: {}
      };

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

      // Transform HoliBot 2.0 response to ChatResponse format
      if (data.success && data.data) {
        return {
          success: true,
          data: {
            textResponse: data.data.message,
            sources: data.data.sources || [],
            sessionId: this.sessionId
          }
        };
      }

      return data;

    } catch (error) {
      console.error('Chat API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chat service unavailable'
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

  /**
   * Get daily POI tip (personalized)
   * - Uses user preferences if logged in
   * - Falls back to daily rotation for non-logged users
   */
  async getDailyTip(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/holibot/daily-tip?language=${this.language}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Daily tip API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Daily tip service unavailable'
      };
    }
  }
}

export const chatApi = new ChatAPI();
