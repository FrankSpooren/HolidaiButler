import { SessionContext } from '../models';
export declare class SessionService {
    private sessions;
    private useRedis;
    private redis;
    constructor();
    createSession(userId: string): Promise<string>;
    getSession(sessionId: string): Promise<SessionContext | null>;
    updateSession(sessionId: string, updates: Partial<SessionContext>): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    getActiveSessionCount(): Promise<number>;
    cleanupExpiredSessions(): Promise<void>;
    private generateSessionId;
    isRedisEnabled(): boolean;
}
//# sourceMappingURL=sessionService.d.ts.map