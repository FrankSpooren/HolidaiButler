import { POIResult } from './POIResult';
import { QueryInterpretation } from './QueryInterpretation';
import { SessionContext } from './SessionContext';
import { ClientSessionContext } from './SearchRequest';

export interface SearchResponse {
  success: boolean;
  data: {
    results: POIResult[];
    searchType: string;
    queryInterpretation: QueryInterpretation;
    context: SessionContext | {
      sessionId: string;
      userId: string;
      clientContext?: ClientSessionContext;
      conversationHistory?: any[];
      currentContext?: any;
      createdAt?: string;
      lastAccessed?: string;
    };
  };
  metadata: {
    totalResults: number;
    searchTime: number;
    embeddingType: string;
  };
}
