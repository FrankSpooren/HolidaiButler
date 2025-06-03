/**
 * HolidAIButler - AI Service
 * Claude API integration for Mediterranean travel recommendations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, MessageType, AIResponse, UserContext } from '../../types/chat';
import { POIData } from '../../types/poi';
import { API_ENDPOINTS } from '../../config/api';
import NetworkManager from '../NetworkManager';
import OfflineAIService from './OfflineAIService';

class AIService {
  private static instance: AIService;
  private rateLimitCount = 0;
  private lastResetTime = Date.now();
  private readonly RATE_LIMIT = 50; // requests per minute
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate AI response for user message
   */
  async generateResponse(
    message: string,
    conversationHistory: ChatMessage[],
    userContext: UserContext
  ): Promise<AIResponse> {
    try {
      // Check if online
      const isOnline = await NetworkManager.isConnected();
      
      if (!isOnline) {
        return await OfflineAIService.generateResponse(message, userContext);
      }

      // Check rate limit
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }

      // Prepare conversation context
      const contextPrompt = this.buildContextPrompt(userContext);
      const conversationPrompt = this.buildConversationPrompt(conversationHistory);
      
      // Call backend API
      const response = await fetch(`${API_ENDPOINTS.AI}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          message,
          context: contextPrompt,
          conversation: conversationPrompt,
          userPreferences: userContext.preferences,
          location: userContext.location,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const aiResponse = await response.json();
      
      // Cache successful response
      await this.cacheResponse(message, aiResponse);
      
      // Update rate limit
      this.updateRateLimit();

      return {
        text: aiResponse.text,
        recommendations: this.parseRecommendations(aiResponse.recommendations),
        confidence: aiResponse.confidence || 0.8,
        model: 'claude-3-5-sonnet',
        cached: false,
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Try cached response first
      const cachedResponse = await this.getCachedResponse(message);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fallback to offline AI
      return await OfflineAIService.generateResponse(message, userContext);
    }
  }

  /**
   * Build context prompt for Claude
   */
  private buildContextPrompt(userContext: UserContext): string {
    const { location, preferences, timestamp } = userContext;
    
    return `You are HolidAI Butler 🧭, the most knowledgeable and enthusiastic holiday assistant for Costa Blanca, Spain.

PERSONALITY:
- Warm, friendly, and genuinely excited about helping create magical holidays
- Expert knowledge of Costa Blanca: Alicante, Benidorm, Denia, Javea, Calpe, Guadalest
- Always consider weather, budget, group size, and personal preferences
- Provide specific, actionable recommendations with exact names and locations

CURRENT CONTEXT:
- Location: ${location?.name || 'Costa Blanca, Spain'}
- Coordinates: ${location?.latitude}, ${location?.longitude}
- User Interests: ${preferences?.interests?.join(', ') || 'General holiday activities'}
- Budget: ${preferences?.budget ? `€${preferences.budget} per person` : 'Budget flexible'}
- Group Size: ${preferences?.groupSize || 2} people
- Time: ${new Date(timestamp).toLocaleString()}

EXPERTISE:
- Restaurants: From local tapas bars to fine dining with sea views
- Activities: Theme parks, boat trips, cultural sites, adventure sports  
- Beaches: Hidden coves, family beaches, water sports locations
- Nightlife: Beach clubs, traditional bars, live music venues
- Cultural sites: Museums, castles, festivals, local traditions

ALWAYS INCLUDE:
1. Specific place names and addresses
2. Price ranges (€/€€/€€€/€€€€)
3. Opening hours and booking requirements
4. Weather-appropriate suggestions
5. Transportation tips
6. Local insider knowledge

Remember: You're creating HOLIDAY MAGIC, not just giving information!`;
  }

  /**
   * Build conversation prompt from message history
   */
  private buildConversationPrompt(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-10); // Last 10 messages for context
    
    return recentMessages.map(msg => {
      const role = msg.type === MessageType.USER ? 'Human' : 'Assistant';
      return `${role}: ${msg.text}`;
    }).join('\n');
  }

  /**
   * Parse AI recommendations from response
   */
  private parseRecommendations(recommendations: any[]): POIData[] {
    if (!recommendations || !Array.isArray(recommendations)) {
      return [];
    }

    return recommendations.map(rec => ({
      id: rec.id || Math.random().toString(),
      name: rec.name,
      category: rec.category,
      rating: rec.rating || 4.0,
      priceCategory: rec.priceCategory || '€€',
      description: rec.description,
      distance: rec.distance || 'Nearby',
      coordinates: rec.coordinates,
      address: rec.address,
      openingHours: rec.openingHours,
      features: rec.features || [],
    }));
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastResetTime > this.RATE_LIMIT_WINDOW) {
      this.rateLimitCount = 0;
      this.lastResetTime = now;
    }

    return this.rateLimitCount < this.RATE_LIMIT;
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(): void {
    this.rateLimitCount++;
  }

  /**
   * Cache AI response for offline use
   */
  private async cacheResponse(message: string, response: any): Promise<void> {
    try {
      const cacheKey = `ai_response_${this.hashMessage(message)}`;
      const cacheData = {
        message,
        response,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache AI response:', error);
    }
  }

  /**
   * Get cached AI response
   */
  private async getCachedResponse(message: string): Promise<AIResponse | null> {
    try {
      const cacheKey = `ai_response_${this.hashMessage(message)}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - cacheData.timestamp > cacheData.ttl) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return {
        text: cacheData.response.text,
        recommendations: this.parseRecommendations(cacheData.response.recommendations),
        confidence: cacheData.response.confidence || 0.7,
        model: 'claude-3-5-sonnet',
        cached: true,
      };
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Simple hash function for message caching
   */
  private hashMessage(message: string): string {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }

  /**
   * Clear AI cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const aiCacheKeys = keys.filter(key => key.startsWith('ai_response_'));
      await AsyncStorage.multiRemove(aiCacheKeys);
    } catch (error) {
      console.warn('Failed to clear AI cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalCached: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const aiCacheKeys = keys.filter(key => key.startsWith('ai_response_'));
      
      let totalSize = 0;
      for (const key of aiCacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        totalCached: aiCacheKeys.length,
        totalSize,
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalCached: 0, totalSize: 0 };
    }
  }
}

export default AIService.getInstance();