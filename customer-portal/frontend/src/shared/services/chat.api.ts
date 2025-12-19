/**
 * Chat API Client
 * HoliBot 2.0 RAG-powered AI Integration
 *
 * API client for HoliBot chat endpoint
 * Endpoint: POST /api/v1/holibot/chat (RAG-powered)
 *
 * Features:
 * - ChromaDB semantic search
 * - Mistral AI for embeddings and chat
 * - Multi-language support (nl, en, de, es, sv, pl)
 */

import type { ChatRequest, ChatResponse } from '../types/chat.types';
import { API_CONFIG, isProduction } from '../config/apiConfig';

const getBaseUrl = (): string => {
  const configUrl = API_CONFIG.widgetApi.baseUrl;
  if (isProduction() && configUrl.includes('localhost')) {
    return '/api/v1';
  }
  return configUrl;
};

const getCurrentLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('language') || 'nl';
  }
  return 'nl';
};

class ChatAPI {
  private sessionId: string | null = null;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  private get baseUrl(): string {
    return getBaseUrl();
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const language = getCurrentLanguage();
      const requestBody = {
        message: request.query,
        language,
        conversationHistory: this.conversationHistory,
        userPreferences: {}
      };

      const response = await fetch(\`\${this.baseUrl}/holibot/chat\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const apiResponse = await response.json();

      if (apiResponse.success && apiResponse.data) {
        const { message, pois, source } = apiResponse.data;

        this.conversationHistory.push(
          { role: 'user', content: request.query },
          { role: 'assistant', content: message }
        );

        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }

        if (!this.sessionId) {
          this.sessionId = \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        }

        return {
          success: true,
          data: {
            sessionId: this.sessionId,
            textResponse: message,
            pois: pois || [],
            intent: {
              primaryIntent: source === 'rag' ? 'poi_search' : 'general',
              confidence: source === 'rag' ? 0.9 : 0.5
            },
            totalResults: pois?.length || 0
          }
        };
      }

      return { success: false, error: apiResponse.error || 'Unknown error' };
    } catch (error) {
      console.error('Chat API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chat service unavailable'
      };
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async clearSession(): Promise<boolean> {
    this.sessionId = null;
    this.conversationHistory = [];
    return true;
  }

  generateMessageId(): string {
    return \`msg_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

  async getDailyTip(language?: string): Promise<any> {
    try {
      const lang = language || getCurrentLanguage();
      const response = await fetch(\`\${this.baseUrl}/holibot/daily-tip?language=\${lang}\`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Daily tip API error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Daily tip service unavailable' };
    }
  }

  async buildItinerary(options: {
    date?: string;
    interests?: string[];
    duration?: 'morning' | 'afternoon' | 'evening' | 'full-day';
    language?: string;
  }): Promise<any> {
    try {
      const response = await fetch(\`\${this.baseUrl}/holibot/itinerary\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: options.date,
          interests: options.interests || [],
          duration: options.duration || 'full-day',
          language: options.language || getCurrentLanguage()
        })
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Itinerary API error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Itinerary service unavailable' };
    }
  }

  async searchPOIs(query: string, limit = 10): Promise<any> {
    try {
      const response = await fetch(\`\${this.baseUrl}/holibot/search\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit })
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Search API error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Search service unavailable' };
    }
  }

  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(\`\${this.baseUrl}/holibot/health\`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { success: false, status: 'unhealthy', error: error instanceof Error ? error.message : 'Health check failed' };
    }
  }
}

export const chatApi = new ChatAPI();
