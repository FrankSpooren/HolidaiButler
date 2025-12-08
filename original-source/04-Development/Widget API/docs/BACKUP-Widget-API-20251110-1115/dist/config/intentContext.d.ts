export interface IntentContextConfig {
    [key: string]: {
        description: string;
        keywords: string[];
        relatedIntents: string[];
    };
}
export declare const INTENT_CONTEXT_CONFIG: IntentContextConfig;
export declare function generateIntentContextInterface(): string;
export declare function detectContextFlags(query: string): Record<string, boolean>;
//# sourceMappingURL=intentContext.d.ts.map