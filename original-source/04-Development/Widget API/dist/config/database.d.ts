export declare class DatabaseService {
    private client;
    private collections;
    private isConnected;
    private config;
    private resultCache;
    constructor();
    connect(): Promise<void>;
    private initializeCollections;
    search(collectionName: string, queryEmbedding: number[], nResults?: number): Promise<any>;
    private generateCacheKey;
    getCollectionStats(): Promise<{
        general: number;
        specific: number;
        contextual: number;
        isConnected: true;
    }>;
    private getCollectionCount;
    isReady(): boolean;
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    clearCache(): void;
}
//# sourceMappingURL=database.d.ts.map