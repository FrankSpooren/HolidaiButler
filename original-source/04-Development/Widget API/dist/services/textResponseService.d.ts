import { POIResult } from '../models/POIResult';
import { IntentRecognitionResult } from './intentRecognitionService';
export interface TextResponseOptions {
    userQuery: string;
    intentResult: IntentRecognitionResult;
    pois: POIResult[];
    userLocation?: {
        lat: number;
        lng: number;
    } | undefined;
    currentTime?: Date;
}
export declare class TextResponseService {
    generateTextResponse(options: TextResponseOptions): Promise<string>;
    private generateNoResultsResponse;
    private generateOpeningHoursResponse;
    private generateContactInfoResponse;
    private generateTimeSensitiveResponse;
    private generateComparisonResponse;
    private generateSinglePOIInfoResponse;
    private generateSearchResultsResponse;
    private getOpeningStatus;
    private getContactInfo;
    private isCurrentlyOpen;
    private isClosingSoon;
    private getNextOpeningTime;
}
//# sourceMappingURL=textResponseService.d.ts.map