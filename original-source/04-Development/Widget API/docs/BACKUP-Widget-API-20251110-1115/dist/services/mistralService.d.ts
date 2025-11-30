export declare class MistralService {
    private client;
    constructor();
    generateEmbedding(text: string): Promise<number[]>;
    generateEmbeddings(texts: string[]): Promise<number[][]>;
    generateChatCompletion(messages: Array<{
        role: string;
        content: string;
    }>): Promise<string>;
    private intelligentIntentDetection;
    private generateSuggestedActions;
    private simpleIntentDetection;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=mistralService.d.ts.map