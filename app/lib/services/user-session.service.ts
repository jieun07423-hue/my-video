import { logger } from '../logger';

export interface UserSession {
  userId: string;
  chatId: string;
  state: SessionState;
  context: SessionContext;
  createdAt: number;
  updatedAt: number;
}

export interface SessionState {
  mode: 'idle' | 'ad_create' | 'ad_industry' | 'ad_location' | 'ad_target' | 'chat';
  step: number;
  data: Record<string, unknown>;
}

export interface SessionContext {
  industry?: string;
  location?: string;
  target?: string;
  goal?: string;
  strengths?: string;
  keywords?: string[];
}

const SESSION_TTL = 30 * 60 * 1000;

class UserSessionService {
  private sessions: Map<string, UserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, session] of this.sessions) {
      if (now - session.updatedAt > SESSION_TTL) {
        this.sessions.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug({ removed }, '만료 세션 정리');
    }
  }

  private getKey(chatId: string): string {
    return `telegram:${chatId}`;
  }

  getOrCreate(chatId: string, userId?: string): UserSession {
    const key = this.getKey(chatId);
    const existing = this.sessions.get(key);

    if (existing) {
      existing.updatedAt = Date.now();
      return existing;
    }

    const newSession: UserSession = {
      userId: userId || String(chatId),
      chatId: String(chatId),
      state: { mode: 'idle', step: 0, data: {} },
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(key, newSession);
    logger.info({ chatId }, '새 세션 생성');
    return newSession;
  }

  updateState(chatId: string, state: Partial<SessionState>): void {
    const session = this.getOrCreate(chatId);
    session.state = { ...session.state, ...state };
    session.updatedAt = Date.now();
  }

  updateContext(chatId: string, context: Partial<SessionContext>): void {
    const session = this.getOrCreate(chatId);
    session.context = { ...session.context, ...context };
    session.updatedAt = Date.now();
  }

  getSession(chatId: string): UserSession | undefined {
    return this.sessions.get(this.getKey(chatId));
  }

  clearSession(chatId: string): void {
    const key = this.getKey(chatId);
    this.sessions.delete(key);
    logger.info({ chatId }, '세션 삭제');
  }

  resetToIdle(chatId: string): void {
    const session = this.getOrCreate(chatId);
    session.state = { mode: 'idle', step: 0, data: {} };
    session.context = {};
    session.updatedAt = Date.now();
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  getStats(): { total: number; byMode: Record<string, number> } {
    const byMode: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      byMode[session.state.mode] = (byMode[session.state.mode] || 0) + 1;
    }

    return { total: this.sessions.size, byMode };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const userSessionService = new UserSessionService();