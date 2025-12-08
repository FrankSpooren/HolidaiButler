import { ConversationEntry } from './ConversationEntry';
import { POIResult } from './POIResult';

export interface SessionContext {
  sessionId: string;
  userId: string;
  conversationHistory: ConversationEntry[];
  currentContext: {
    lastQuery: string;
    lastResults: POIResult[];
    searchType: string;
  };
  // Track displayed POIs to prevent repetition
  displayedPOIs: string[];  // POI IDs that have been displayed as cards
  lastDisplayedPOIs: string[];  // POIs from the last response
  conversationTurn: number;  // Track conversation depth
  createdAt?: string;
  lastAccessed?: string;
}
