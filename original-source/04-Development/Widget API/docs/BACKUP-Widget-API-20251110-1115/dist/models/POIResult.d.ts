import { QAContent } from './QAContent';
export interface POIResult {
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    relevanceScore: number;
    searchType: string;
    smartScore?: number;
    scoringBreakdown?: {
        semantic: number;
        rating: number;
        distance: number;
        freshness: number;
        popularity: number;
    };
    metadata: {
        amenities: string[];
        location: string;
        rating?: number;
        description?: string;
        qaContent?: QAContent[];
        coordinates?: {
            lat: number;
            lng: number;
        };
        openingHours?: any;
        openingHoursMonday?: string;
        openingHoursTuesday?: string;
        openingHoursWednesday?: string;
        openingHoursThursday?: string;
        openingHoursFriday?: string;
        openingHoursSaturday?: string;
        openingHoursSunday?: string;
        lastReviewDate?: Date;
        visitCount?: number;
        phone?: string;
        website?: string;
        isCurrentlyOpen?: boolean;
        nextOpeningTime?: string;
        allOpeningHours?: any;
        rawMetadata?: any;
    };
    textResponse?: string;
    displayAsCard: boolean;
    displayReason?: 'requested' | 'alternative' | 'search_result' | 'relevant';
    previouslyDisplayed?: boolean;
}
//# sourceMappingURL=POIResult.d.ts.map