/**
 * 캐싱 레이어
 * Redis와 메모리 캐시를 통합한 추상화된 캐시 인터페이스
 */
import { webLogger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Cache adapter interface (메모리/Redis 공통)
// ---------------------------------------------------------------------------
interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<number>;
  ping(): Promise<string>;
  info(): Promise<CacheInfo>;
  quit(): Promise<string>;
}

interface CacheEntry {
  value: string;
  expireAt: number | null;
}

interface CacheInfo {
  type: string;
  keys: number;
}

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
}

// 메모리 캐시 구현 (ioredis 없는 Fallback)
class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expireAt && Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttl: number): Promise<boolean> {
    const expireAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    this.cache.set(key, { value, expireAt });
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter((k) => regex.test(k));
  }

  async exists(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return 0;

    if (item.expireAt && Date.now() > item.expireAt) {
      this.cache.delete(key);
      return 0;
    }

    return 1;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async info(): Promise<CacheInfo> {
    return { type: 'memory', keys: this.cache.size };
  }

  async quit(): Promise<string> {
    this.cache.clear();
    return 'OK';
  }
}

// ---------------------------------------------------------------------------
// CacheManager — 단일 진입점
// ---------------------------------------------------------------------------
class CacheManager {
  private config: CacheConfig;
  private adapter: CacheAdapter | null = null;
  private connected = false;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sbt:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'),
    };
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const ioredisModule = await importRedis();
      if (ioredisModule) {
        webLogger.info('Redis 연결 시도 중...');
        const client = new ioredisModule.default({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => {
          webLogger.info({ host: this.config.host, port: this.config.port }, 'Redis 연결 성공');
          this.connected = true;
        });
        client.on('error', (error: Error) => {
          webLogger.error({ error: error.message }, 'Redis 연결 오류');
          this.connected = false;
        });
        client.on('close', () => {
          webLogger.warn('Redis 연결 종료');
          this.connected = false;
        });

        await client.ping();
        this.adapter = createRedisAdapter(client);
        webLogger.info({ host: this.config.host, port: this.config.port }, 'Redis 연결 정보');
      } else {
        webLogger.info('메모리 캐시 모드로 시작');
        this.adapter = new MemoryCacheAdapter();
      }
      this.connected = true;
    } catch (error) {
      webLogger.error({ error: (error as Error).message }, '캐시 연결 실패, 메모리 캐시로 전환');
      this.adapter = new MemoryCacheAdapter();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter && this.connected) {
      await this.adapter.quit();
      this.connected = false;
      webLogger.info('캐시 연결 종료');
    }
  }

  private fullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.adapter) return null;
    try {
      const raw = await this.adapter.get(this.fullKey(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      webLogger.error({ error: (error as Error).message, key }, '캐시 조회 실패');
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.adapter) return false;
    try {
      const serialized = JSON.stringify(value);
      return await this.adapter.set(this.fullKey(key), serialized, ttl ?? this.config.defaultTTL);
    } catch (error) {
      webLogger.error({ error: (error as Error).message, key }, '캐시 저장 실패');
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.adapter) return false;
    try {
      return await this.adapter.del(this.fullKey(key));
    } catch (error) {
      webLogger.error({ error: (error as Error).message, key }, '캐시 삭제 실패');
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.adapter) return false;
    try {
      const result = await this.adapter.exists(this.fullKey(key));
      return result === 1;
    } catch (error) {
      webLogger.error({ error: (error as Error).message, key }, '캐시 존재 확인 실패');
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.adapter) return false;
    try {
      const keys = await this.adapter.keys(this.fullKey(pattern));
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => this.adapter!.del(k)));
        webLogger.info({ pattern, count: keys.length }, '캐시 패턴 삭제 완료');
      }
      return true;
    } catch (error) {
      webLogger.error({ error: (error as Error).message, pattern }, '캐시 패턴 삭제 실패');
      return false;
    }
  }

  async getStats() {
    if (!this.adapter) return null;
    try {
      const info = await this.adapter.info();
      const keys = await this.adapter.keys(`${this.config.keyPrefix}*`);
      return {
        connected: this.connected,
        type: info.type,
        cachedKeys: keys.length,
      };
    } catch (error) {
      webLogger.error({ error: (error as Error).message }, '캐시 통계 조회 실패');
      return null;
    }
  }

  createRepositoryWrapper<T>(repository: T): CachedRepository<T> {
    return new CachedRepository<T>(repository, this);
  }
}

// ---------------------------------------------------------------------------
// Redis adapter (ioredis 래퍼)
// ---------------------------------------------------------------------------
interface IORedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  exists(...keys: string[]): Promise<number>;
  ping(): Promise<string>;
  info(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

function createRedisAdapter(client: IORedisClient): CacheAdapter {
  return {
    get: (key: string) => client.get(key),
    set: async (key: string, value: string, ttl: number) => {
      await client.setex(key, ttl, value);
      return true;
    },
    del: async (key: string) => {
      const count = await client.del(key);
      return count > 0;
    },
    keys: (pattern: string) => client.keys(pattern),
    exists: (key: string) => client.exists(key),
    ping: () => client.ping(),
    info: async (): Promise<CacheInfo> => {
      const raw = await client.info();
      return { type: 'redis', keys: Object.keys(raw).length };
    },
    quit: () => client.quit(),
  };
}

async function importRedis(): Promise<typeof import('ioredis') | null> {
  try {
    return await import('ioredis');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Repository 캐싱 래퍼
// ---------------------------------------------------------------------------
class CachedRepository<T> {
  private repository: T;
  private cache: CacheManager;
  private prefixes = {
    search: 'search:',
    stats: 'stats:',
    byId: 'byId:',
    distinctCodes: 'distinct-codes:',
  };

  constructor(repository: T, cacheManager: CacheManager) {
    this.repository = repository;
    this.cache = cacheManager;
  }

  async search(options: Record<string, unknown> = {}): Promise<unknown> {
    const cacheKey = `${this.prefixes.search}${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await (this.repository as any).search(options);
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getStats(): Promise<unknown> {
    const cached = await this.cache.get(this.prefixes.stats);
    if (cached) return cached;

    const result = await (this.repository as any).getStats();
    await this.cache.set(this.prefixes.stats, result, 60);
    return result;
  }

  async getById(id: string): Promise<unknown> {
    const cacheKey = `${this.prefixes.byId}${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await (this.repository as any).getById(id);
    if (result) await this.cache.set(cacheKey, result, 600);
    return result;
  }

  async invalidate(pattern: string): Promise<boolean> {
    return this.cache.invalidatePattern(pattern);
  }
}

// ---------------------------------------------------------------------------
// 전역 싱글턴
// ---------------------------------------------------------------------------
const globalCacheManager = new CacheManager();

async function initializeCache(): Promise<CacheManager> {
  await globalCacheManager.connect();
  return globalCacheManager;
}

export {
  CacheManager,
  CachedRepository,
  globalCacheManager,
  initializeCache,
};