import { POIReference } from './POIReference';
export interface ClientSessionContext {
    lastQuery?: string;
    lastResults?: POIReference[];
    conversationHistory?: {
        query: string;
        results: POIReference[];
        timestamp: string;
    }[];
    mentionedPOIs?: POIReference[];
    sessionStartTime?: string;
    totalQueries?: number;
}
export interface SearchRequest {
    query: string;
    sessionId: string;
    userId: string;
    clientContext?: ClientSessionContext;
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
//# sourceMappingURL=SearchRequest.d.ts.map