export interface ConversationContext {
    query: string;
    previousQueries: string[];
    previousResults: any[];
    conversationHistory: ConversationTurn[];
    userProfile?: UserProfile;
    sessionMetadata: SessionMetadata;
}
export interface ConversationTurn {
    query: string;
    results: any[];
    timestamp: Date;
    intent?: string;
    entities?: string[];
}
export interface UserProfile {
    location?: string;
    preferences?: string[];
    language?: string;
    culturalContext?: string;
}
export interface SessionMetadata {
    sessionId: string;
    startTime: Date;
    totalTurns: number;
    averageResponseTime: number;
}
export interface SemanticAnalysis {
    isFollowUp: boolean;
    confidence: number;
    intent: Intent;
    targetEntities: EntityReference[];
    conversationFlow: ConversationFlow;
    implicitReferences: ImplicitReference[];
    suggestedActions: SuggestedAction[];
}
export interface EntityReference {
    type: 'POI' | 'Category' | 'Location' | 'Time' | 'Attribute';
    entity: string;
    confidence: number;
    source: 'explicit' | 'implicit' | 'inferred';
}
export interface ConversationFlow {
    type: 'new_topic' | 'continuation' | 'clarification' | 'refinement';
    confidence: number;
    reasoning: string;
}
export interface ImplicitReference {
    type: 'time' | 'location' | 'preference' | 'context';
    value: string;
    confidence: number;
}
export interface SuggestedAction {
    action: string;
    priority: number;
    reasoning: string;
}
export type Intent = 'time' | 'location' | 'contact' | 'details' | 'booking' | 'comparison' | 'new_search' | 'clarification';
export declare class AdvancedSemanticDetector {
    private mistralService;
    constructor();
    analyzeConversation(context: ConversationContext): Promise<SemanticAnalysis>;
    private generateQueryEmbedding;
    private generateContextEmbedding;
    private buildContextString;
    private calculateSemanticSimilarity;
    private analyzeConversationFlow;
    private isNewTopic;
    private isContinuation;
    private isClarification;
    private resolveEntityReferences;
    private detectImplicitReferences;
    private determineIntent;
    private generateSuggestedActions;
    private determineFollowUpStatus;
    private calculateOverallConfidence;
    private getFallbackAnalysis;
}
//# sourceMappingURL=advancedSemanticDetector.d.ts.map