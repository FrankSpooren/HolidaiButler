/**
 * Chat Service
 * API client for HoliBot chat endpoint
 */

import { api } from './api';

const CHAT_ENDPOINT = '/chat';

class ChatService {
  constructor() {
    this.sessionId = null;
  }

  /**
   * Send a chat message to HoliBot AI
   */
  async sendMessage(query) {
    try {
      const requestBody = { query };

      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      }

      const response = await api.post(`${CHAT_ENDPOINT}/message`, requestBody);

      // Store sessionId for subsequent requests
      if (response.data?.success && response.data?.data?.sessionId) {
        this.sessionId = response.data.data.sessionId;
      }

      return response.data;
    } catch (error) {
      console.error('Chat API error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Chat service unavailable',
      };
    }
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Clear current session
   */
  async clearSession() {
    if (!this.sessionId) return true;

    try {
      await api.delete(`${CHAT_ENDPOINT}/session/${this.sessionId}`);
      this.sessionId = null;
      return true;
    } catch (error) {
      console.error('Clear session error:', error);
      this.sessionId = null;
      return false;
    }
  }

  /**
   * Get daily POI tip
   */
  async getDailyTip() {
    try {
      const response = await api.get('/holibot/daily-tip');
      return response.data;
    } catch (error) {
      console.error('Daily tip API error:', error);
      return {
        success: false,
        error: error.message || 'Daily tip service unavailable',
      };
    }
  }

  /**
   * Get quick reply suggestions
   */
  getQuickReplies(language = 'nl') {
    const suggestions = {
      nl: [
        'Beste stranden in de buurt',
        'Restaurants met zeezicht',
        'Activiteiten voor kinderen',
        'Historische bezienswaardigheden',
        'Nachtleven tips',
      ],
      en: [
        'Best beaches nearby',
        'Restaurants with sea view',
        'Activities for children',
        'Historical attractions',
        'Nightlife tips',
      ],
      de: [
        'Beste Strände in der Nähe',
        'Restaurants mit Meerblick',
        'Aktivitäten für Kinder',
        'Historische Sehenswürdigkeiten',
        'Nachtleben Tipps',
      ],
      es: [
        'Mejores playas cercanas',
        'Restaurantes con vista al mar',
        'Actividades para niños',
        'Atracciones históricas',
        'Consejos de vida nocturna',
      ],
    };
    return suggestions[language] || suggestions.nl;
  }
}

export const chatService = new ChatService();
export default chatService;
