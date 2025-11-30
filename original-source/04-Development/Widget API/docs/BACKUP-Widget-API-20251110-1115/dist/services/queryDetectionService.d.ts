import { QueryInterpretation } from '../models';
import { IntentRecognitionResult } from './intentRecognitionService';
export interface QueryDetection {
    searchType: 'general' | 'specific' | 'contextual';
    targetPOI?: string | undefined;
    isSpecific: boolean;
    confidence: number;
    intentRecognition?: IntentRecognitionResult | undefined;
}
export declare class QueryDetectionService {
    private semanticDetector;
    private intentRecognitionService;
    constructor();
    private positionalPatterns;
    private semanticPatterns;
    private followUpPatterns;
    detectQueryType(query: string, previousResults?: any[]): Promise<QueryDetection>;
    private detectPositionalReference;
    private detectDirectPOIMention;
    private detectSemanticPOIMention;
    createQueryInterpretation(detection: QueryDetection, query: string): QueryInterpretation;
    private detectFollowUpQuestion;
    private fallbackDetection;
    private extractEntities;
}
//# sourceMappingURL=queryDetectionService.d.ts.map