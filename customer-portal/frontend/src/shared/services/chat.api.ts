/**
 * Chat API Client
 * Widget API Integration - Updated for new chat endpoints
 *
 * API client for HoliBot chat endpoint
 * Endpoint: POST /api/v1/chat/message
 */

import type { ChatRequest, ChatResponse, ChatMessage } from '../types/chat.types';

// HoliBot/Chat API - Platform Core includes chat routes on :3001
// Use VITE_WIDGET_API_URL if Widget API runs separately on :3002
const API_BASE_URL = import.meta.env.VITE_WIDGET_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ChatAPI {
  private sessionId: string | null = null;

  /**
   * Send a chat message to HoliBot AI
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Use existing sessionId or let backend create new one
      const requestBody: { query: string; sessionId?: string } = {
        query: request.query
      };

      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      }

      const response = await fetch(`${API_BASE_URL}/chat/message`, {
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

      // Store sessionId for subsequent requests
      if (data.success && data.data?.sessionId) {
        this.sessionId = data.data.sessionId;
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
  async clearSession(): Promise<boolean> {
    if (!this.sessionId) return true;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/session/${this.sessionId}`, {
        method: 'DELETE'
      });

      this.sessionId = null;
      return response.ok;

    } catch (error) {
      console.error('Clear session error:', error);
      this.sessionId = null;
      return false;
    }
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
      const response = await fetch(`${API_BASE_URL}/holibot/daily-tip`, {
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
