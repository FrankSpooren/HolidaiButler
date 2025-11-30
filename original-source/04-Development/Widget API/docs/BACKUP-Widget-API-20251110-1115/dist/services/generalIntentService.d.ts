export interface IntentBoost {
    type: string;
    confidence: number;
    boostFactor: number;
    keywords: string[];
    description: string;
}
export interface IntentRecognitionResult {
    primaryIntent: string;
    secondaryIntents: string[];
    confidence: number;
    boosts: IntentBoost[];
    extractedEntities: string[];
    suggestedActions: string[];
}
export declare class GeneralIntentService {
    private intentPatterns;
    detectIntent(query: string): IntentRecognitionResult;
    private generateSuggestedActions;
    calculateIntentBoost(poi: any, intentResult: IntentRecognitionResult): number;
    private getPOIText;
}
//# sourceMappingURL=generalIntentService.d.ts.map