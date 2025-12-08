import { SearchResponse } from '../models';
import { UserContext } from '../models/ScoringModels';
export interface SearchOptions {
    maxResults?: number;
    includeMetadata?: boolean;
    searchType?: 'auto' | 'general' | 'specific' | 'contextual';
    userContext?: UserContext;
    clientContext?: any;
}
export declare class SearchService {
    private dbService;
    private mistralService;
    private queryDetectionService;
    private sessionService;
    private scoringService;
    private dietaryIntentService;
    private generalIntentService;
    private textResponseService;
    constructor();
    search(query: string, sessionId: string, userId?: string, options?: SearchOptions): Promise<SearchResponse>;
    private getCollectionName;
    private processSearchResults;
    private parseAmenities;
    private parseQAContent;
    private updateSessionContext;
    initialize(): Promise<void>;
    getServiceStatus(): Promise<any>;
    private handleFollowUpQuestion;
    private getDefaultUserContext;
    private filterByOpeningStatus;
}
//# sourceMappingURL=searchService.d.ts.map