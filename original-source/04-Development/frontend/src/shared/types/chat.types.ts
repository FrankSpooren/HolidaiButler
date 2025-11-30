/**
 * Chat Message Types
 * Phase 6: Mistral AI Integration ✅
 *
 * Types for chat messages between user and HoliBot
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  personality?: string;
  isStreaming?: boolean;
  pois?: POI[]; // Associated POIs for clickable links
}

export interface ChatRequest {
  query: string;
  sessionId?: string;
}

export interface POI {
  id: number;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  openingHours?: string;
  tileDescription?: string;
  detailDescription?: string;
  rating?: string;
  reviewCount?: number;
  priceLevel?: number;
  relevanceScore?: number;
}

export interface Intent {
  primaryIntent: string;
  category?: string;
  searchTerms?: string[];
  dietaryRestrictions?: string[];
  requiresOpenNow?: boolean;
  proximityType?: string;
  confidence?: number;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    sessionId: string;
    textResponse: string;
    pois: POI[];
    intent: Intent;
    totalResults: number;
  };
  error?: string;
}

// Streaming response chunk
export interface StreamChunk {
  type: 'token' | 'complete' | 'error';
  content?: string;
  error?: string;
}
