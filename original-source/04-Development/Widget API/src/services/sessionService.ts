import { SessionContext } from '../models';
import { logger } from '../config/logger';

export class SessionService {
  private sessions: Map<string, SessionContext> = new Map();
  private useRedis: boolean = false;
  private redis: any = null;

  constructor() {
    // Check if Redis is available (optional)
    this.useRedis = process.env.USE_REDIS === 'true';
    
    if (this.useRedis) {
      try {
        const Redis = require('ioredis');
        this.redis = new Redis(process.env.REDIS_URL);
        logger.info('Redis session storage enabled');
      } catch (error) {
        logger.warn('Redis not available, using in-memory storage');
        this.useRedis = false;
      }
    } else {
      logger.info('Using in-memory session storage');
    }
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: SessionContext = {
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
        logger.info(`Session ${sessionId} created in Redis`);
      } catch (error) {
        logger.error('Failed to store session in Redis, falling back to in-memory:', error);
        this.sessions.set(sessionId, session);
      }
    } else {
      this.sessions.set(sessionId, session);
      logger.info(`Session ${sessionId} created in memory`);
    }
    
    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    logger.info(`🔍 SESSION RETRIEVAL DEBUG: Looking for session ${sessionId}`);
    let session: SessionContext | null = null;

    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(`session:${sessionId}`);
        if (!data) {
          logger.info(`❌ SESSION NOT FOUND in Redis: ${sessionId}`);
          return null;
        }
        session = JSON.parse(data);
        logger.info(`✅ SESSION FOUND in Redis: ${sessionId}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
      } catch (error) {
        logger.error('Failed to get session from Redis, falling back to in-memory:', error);
        session = this.sessions.get(sessionId) || null;
        logger.info(`🔍 SESSION RETRIEVAL from memory: ${sessionId}, found: ${!!session}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
      }
    } else {
      session = this.sessions.get(sessionId) || null;
      logger.info(`🔍 SESSION RETRIEVAL from memory: ${sessionId}, found: ${!!session}, previous results: ${session?.currentContext?.lastResults?.length || 0}`);
    }

    if (!session) {
      logger.info(`❌ SESSION NOT FOUND: ${sessionId}`);
      return null;
    }

    // Backward compatibility: Initialize new fields if missing
    if (!session.displayedPOIs) {
      session.displayedPOIs = [];
    }
    if (!session.lastDisplayedPOIs) {
      session.lastDisplayedPOIs = [];
    }
    if (session.conversationTurn === undefined) {
      session.conversationTurn = session.conversationHistory?.length || 0;
    }

    // Update last accessed time
    session.lastAccessed = new Date().toISOString();
    
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
      } catch (error) {
        logger.error('Failed to update session in Redis:', error);
        this.sessions.set(sessionId, session);
      }
    } else {
      this.sessions.set(sessionId, session);
    }
    
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SessionContext>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const updatedSession = { ...session, ...updates, lastAccessed: new Date().toISOString() };
    
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(updatedSession));
      } catch (error) {
        logger.error('Failed to update session in Redis, falling back to in-memory:', error);
        this.sessions.set(sessionId, updatedSession);
      }
    } else {
      this.sessions.set(sessionId, updatedSession);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`session:${sessionId}`);
        logger.info(`Session ${sessionId} deleted from Redis`);
      } catch (error) {
        logger.error('Failed to delete session from Redis:', error);
        this.sessions.delete(sessionId);
      }
    } else {
      this.sessions.delete(sessionId);
      logger.info(`Session ${sessionId} deleted from memory`);
    }
  }

  async getActiveSessionCount(): Promise<number> {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('session:*');
        return keys.length;
      } catch (error) {
        logger.error('Failed to get session count from Redis:', error);
        return this.sessions.size;
      }
    } else {
      return this.sessions.size;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('session:*');
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const session = JSON.parse(data);
            const lastAccessed = new Date(session.lastAccessed || session.createdAt || now);
            const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceAccess > 24) { // 24 hours timeout
              expiredSessions.push(key);
            }
          }
        }
        
        if (expiredSessions.length > 0) {
          await this.redis.del(...expiredSessions);
          logger.info(`Cleaned up ${expiredSessions.length} expired sessions from Redis`);
        }
      } catch (error) {
        logger.error('Failed to cleanup expired sessions from Redis:', error);
      }
    } else {
        for (const [sessionId, session] of this.sessions.entries()) {
          const lastAccessed = new Date(session.lastAccessed || session.createdAt || now);
          const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceAccess > 24) { // 24 hours timeout
            expiredSessions.push(sessionId);
          }
        }
      
      expiredSessions.forEach(sessionId => this.sessions.delete(sessionId));
      if (expiredSessions.length > 0) {
        logger.info(`Cleaned up ${expiredSessions.length} expired sessions from memory`);
      }
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isRedisEnabled(): boolean {
    return this.useRedis && this.redis !== null;
  }
}
