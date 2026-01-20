import { POIReference } from './POIReference';

export interface ClientSessionContext {
  // Current conversation context
  lastQuery?: string;
  lastResults?: POIReference[];
  
  // Full conversation history for deeper context
  conversationHistory?: {
    query: string;
    results: POIReference[];
    timestamp: string;
  }[];
  
  // All POIs mentioned in the conversation (for broader context)
  mentionedPOIs?: POIReference[];
  
  // Session metadata
  sessionStartTime?: string;
  totalQueries?: number;
}

export interface SearchRequest {
  query: string;
  sessionId: string;
  userId: string;
  
  // Client-side session context
  clientContext?: ClientSessionContext;
  
  // Legacy server-side context (for backward compatibility)
  context?: {
    previousQuery?: string;
    previousResults?: POIReference[];
  };
  
  options?: {
    maxResults?: number;
    includeMetadata?: boolean;
    searchType?: 'auto' | 'general' | 'specific' | 'contextual';
  };
}
