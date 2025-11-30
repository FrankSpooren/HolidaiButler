"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const logger_1 = require("../config/logger");
class SessionService {
    constructor() {
        this.sessions = new Map();
        this.useRedis = false;
        this.redis = null;
        this.useRedis = process.env.USE_REDIS === 'true';
        if (this.useRedis) {
            try {
                const Redis = require('ioredis');
                this.redis = new Redis(process.env.REDIS_URL);
                logger_1.logger.info('Redis session storage enabled');
            }
            catch (error) {
                logger_1.logger.warn('Redis not available, using in-memory storage');
                this.useRedis = false;
            }
        }
        else {
            logger_1.logger.info('Using in-memory session storage');
        }
    }
    async createSession(userId) {
        const sessionId = this.generateSessionId();
        const session = {
            sessionId,
            userId,
            conversationHistory: [],
            currentContext: {
                lastQuery: '',
                lastResults: [],
                searchType: 'general'
            },
            displayedPOIs: [],
            lastDisplayedPOIs: [],
            conversationTurn: 0,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };
        if (this.useRedis && this.redis) {
            try {
                await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
                logger_1.logger.info(`Session ${sessionId} created in Redis`);
            }
            catch (error) {
                logger_1.logger.error('Failed to store session in Redis, falling back to in-memory:', error);
                this.sessions.set(sessionId, session);
            }
        }
        else {
            this.sessions.set(sessionId, session);
            logger_1.logger.info(`Session ${sessionId} created in memory`);
        }
        return sessionId;
    }
    async getSession(sessionId) {
        logger_1.logger.info(`🔍 SESSION RETRIEVAL DEBUG: Looking for session ${sessionId}`);
        let session = null;
        if (this.useRedis && this.redis) {
            try {
                const data = await this.redis.get(`session:${sessionId}`);
                if (!data) {
                    logger_1.logger.info(`❌ SESSION NOT FOUND in Redis: ${sessionId}`);
                    return null;
                }
                session = JSON.parse(data);
                logger_1.logger.info(`✅ SESSION FOUND in Redis: ${sessionId}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
            }
            catch (error) {
                logger_1.logger.error('Failed to get session from Redis, falling back to in-memory:', error);
                session = this.sessions.get(sessionId) || null;
                logger_1.logger.info(`🔍 SESSION RETRIEVAL from memory: ${sessionId}, found: ${!!session}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
            }
        }
        else {
            session = this.sessions.get(sessionId) || null;
            logger_1.logger.info(`🔍 SESSION RETRIEVAL from memory: ${sessionId}, found: ${!!session}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
        }
        if (!session) {
            logger_1.logger.info(`❌ SESSION NOT FOUND: ${sessionId}`);
            return null;
        }
        if (!session.displayedPOIs) {
            session.displayedPOIs = [];
        }
        if (!session.lastDisplayedPOIs) {
            session.lastDisplayedPOIs = [];
        }
        if (session.conversationTurn === undefined) {
            session.conversationTurn = session.conversationHistory?.length || 0;
        }
        session.lastAccessed = new Date().toISOString();
        if (this.useRedis && this.redis) {
            try {
                await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
            }
            catch (error) {
                logger_1.logger.error('Failed to update session in Redis:', error);
                this.sessions.set(sessionId, session);
            }
        }
        else {
            this.sessions.set(sessionId, session);
        }
        return session;
    }
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session)
            throw new Error('Session not found');
        const updatedSession = { ...session, ...updates, lastAccessed: new Date().toISOString() };
        if (this.useRedis && this.redis) {
            try {
                await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(updatedSession));
            }
            catch (error) {
                logger_1.logger.error('Failed to update session in Redis, falling back to in-memory:', error);
                this.sessions.set(sessionId, updatedSession);
            }
        }
        else {
            this.sessions.set(sessionId, updatedSession);
        }
    }
    async deleteSession(sessionId) {
        if (this.useRedis && this.redis) {
            try {
                await this.redis.del(`session:${sessionId}`);
                logger_1.logger.info(`Session ${sessionId} deleted from Redis`);
            }
            catch (error) {
                logger_1.logger.error('Failed to delete session from Redis:', error);
                this.sessions.delete(sessionId);
            }
        }
        else {
            this.sessions.delete(sessionId);
            logger_1.logger.info(`Session ${sessionId} deleted from memory`);
        }
    }
    async getActiveSessionCount() {
        if (this.useRedis && this.redis) {
            try {
                const keys = await this.redis.keys('session:*');
                return keys.length;
            }
            catch (error) {
                logger_1.logger.error('Failed to get session count from Redis:', error);
                return this.sessions.size;
            }
        }
        else {
            return this.sessions.size;
        }
    }
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        if (this.useRedis && this.redis) {
            try {
                const keys = await this.redis.keys('session:*');
                for (const key of keys) {
                    const data = await this.redis.get(key);
                    if (data) {
                        const session = JSON.parse(data);
                        const lastAccessed = new Date(session.lastAccessed || session.createdAt || now);
                        const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceAccess > 24) {
                            expiredSessions.push(key);
                        }
                    }
                }
                if (expiredSessions.length > 0) {
                    await this.redis.del(...expiredSessions);
                    logger_1.logger.info(`Cleaned up ${expiredSessions.length} expired sessions from Redis`);
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to cleanup expired sessions from Redis:', error);
            }
        }
        else {
            for (const [sessionId, session] of this.sessions.entries()) {
                const lastAccessed = new Date(session.lastAccessed || session.createdAt || now);
                const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);
                if (hoursSinceAccess > 24) {
                    expiredSessions.push(sessionId);
                }
            }
            expiredSessions.forEach(sessionId => this.sessions.delete(sessionId));
            if (expiredSessions.length > 0) {
                logger_1.logger.info(`Cleaned up ${expiredSessions.length} expired sessions from memory`);
            }
        }
    }
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    isRedisEnabled() {
        return this.useRedis && this.redis !== null;
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=sessionService.js.map