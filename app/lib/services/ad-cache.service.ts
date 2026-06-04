import { logger } from '../logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface AdCacheKey {
  industry: string;
  location: string;
  target?: string;
}

export class AdCacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private ttl: number;
  private maxSize: number;

  constructor(options?: { ttlMinutes?: number; maxSize?: number }) {
    this.ttl = (options?.ttlMinutes || 30) * 60 * 1000;
    this.maxSize = options?.maxSize || 100;
  }

  private generateKey(params: AdCacheKey): string {
    const key = `${params.industry}:${params.location}:${params.target || 'default'}`;
    return key.toLowerCase();
  }

  get<T>(params: AdCacheKey): T | null {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug({ key }, '캐시 미스');
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug({ key }, '캐시 만료');
      return null;
    }

    logger.debug({ key, age: Date.now() - entry.timestamp }, '캐시 히트');
    return entry.data as T;
  }

  set<T>(params: AdCacheKey, data: T): void {
    const key = this.generateKey(params);

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        logger.debug({ evictedKey: firstKey }, '캐시 부족으로 기존 항목 제거');
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    logger.info({ key }, '캐시 저장');
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      logger.info('모든 캐시 초기화');
      return;
    }

    const regex = new RegExp(pattern.toLowerCase());
    let count = 0;

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    logger.info({ count, pattern }, '캐시 패턴 제거');
  }

  getStats(): { size: number; hitRate: number; keys: string[] } {
    return {
      size: this.cache.size,
      hitRate: 0,
      keys: Array.from(this.cache.keys()),
    };
  }

  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info({ removed }, '캐시 정리 완료');
    }
  }
}

export const adCacheService = new AdCacheService();

setInterval(() => {
  adCacheService.cleanup();
}, 5 * 60 * 1000);