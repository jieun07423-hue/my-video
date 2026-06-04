import { logger } from '../logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ad:ratelimit:',
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimitService {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug({ removed }, 'Rate limit 스토어 정리');
    }
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
      };
      this.store.set(key, newEntry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      logger.warn({ identifier, count: entry.count }, 'Rate limit 초과');
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}${identifier}`;
    this.store.delete(key);
    logger.info({ identifier }, 'Rate limit 리셋');
  }

  getStatus(identifier: string): { count: number; resetAt: number; limit: number } {
    const key = `${this.config.keyPrefix}${identifier}`;
    const entry = this.store.get(key);

    if (!entry) {
      return { count: 0, resetAt: Date.now() + this.config.windowMs, limit: this.config.maxRequests };
    }

    return {
      count: entry.count,
      resetAt: entry.resetAt,
      limit: this.config.maxRequests,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const rateLimitService = new RateLimitService();