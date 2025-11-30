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
    displayedPOIs: string[];
    lastDisplayedPOIs: string[];
    conversationTurn: number;
    createdAt?: string;
    lastAccessed?: string;
}
//# sourceMappingURL=SessionContext.d.ts.map