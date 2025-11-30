export interface IntentRecognitionResult {
    primaryIntent: string;
    secondaryIntents: string[];
    confidence: number;
    extractedEntities: string[];
    intentContext: {
        timeRelated: boolean;
        locationRelated: boolean;
        proximityRelated: boolean;
        openingHoursRelated: boolean;
        contactRelated: boolean;
        comparisonRelated: boolean;
    };
    suggestedActions: string[];
}
export interface IntentContext {
    timeRelated: boolean;
    locationRelated: boolean;
    proximityRelated: boolean;
    openingHoursRelated: boolean;
    contactRelated: boolean;
    comparisonRelated: boolean;
    accessibilityRelated: boolean;
    priceRelated: boolean;
    amenityRelated: boolean;
    foodRelated: boolean;
    familyRelated: boolean;
    petRelated: boolean;
    reviewRelated: boolean;
    availabilityRelated: boolean;
    qualityRelated: boolean;
    specificPOIQuestions: boolean;
}
export declare class IntentRecognitionService {
    private mistralService;
    constructor();
    recognizeIntent(query: string, conversationContext?: any): Promise<IntentRecognitionResult>;
    private createIntentPrompt;
    private analyzeWithMistral;
    private parseIntentResult;
    private fallbackIntentRecognition;
    private extractBasicEntities;
    private analyzeBasicContext;
    private generateBasicActions;
}
//# sourceMappingURL=intentRecognitionService.d.ts.map