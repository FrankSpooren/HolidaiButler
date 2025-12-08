export interface FollowUpAnalysis {
    isFollowUp: boolean;
    confidence: number;
    reasoning: string;
    targetPOI?: string | undefined;
    intent: 'time' | 'details' | 'location' | 'contact' | 'general' | 'new_search';
}
export declare class SemanticFollowUpDetector {
    private mistralService;
    constructor();
    analyzeQuery(query: string, previousResults: any[]): Promise<FollowUpAnalysis>;
    private createContextSummary;
    private analyzeWithMistral;
    private fallbackAnalysis;
    resolvePositionalReference(query: string, previousResults: any[]): Promise<string | null>;
}
//# sourceMappingURL=semanticFollowUpDetector.d.ts.map