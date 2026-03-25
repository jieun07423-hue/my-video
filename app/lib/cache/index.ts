/**
 * 캐싱 레이어
 * Redis와 메모리 캐시를 통합한 추상화된 캐시 인터페이스
 */

// 메모리 캐시 구현 (ioredis 없는 Fallback)
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // TTL 체크
    if (item.expireAt && Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key, value, ttl = 3600) {
    const expireAt = ttl ? Date.now() + (ttl * 1000) : null;
    this.cache.set(key, { value, expireAt });
    return true;
  }

  async del(key) {
    return this.cache.delete(key);
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async del(...keys) {
    keys.forEach(key => this.cache.delete(key));
    return true;
  }

  async exists(key) {
    const item = this.cache.get(key);
    if (!item) return 0;
    
    // TTL 체크
    if (item.expireAt && Date.now() > item.expireAt) {
      this.cache.delete(key);
      return 0;
    }
    
    return 1;
  }

  async ping() {
    return 'PONG';
  }

  async info() {
    return {
      type: 'memory',
      keys: this.cache.size
    };
  }

  async quit() {
    this.cache.clear();
    return 'OK';
  }
}

// Redis 캐시 구현 (ioredis 사용 가능 시)
let RedisCache;
try {
  RedisCache = require('ioredis');
} catch (error) {
  // ioredis 없이면 MemoryCache 사용
  RedisCache = MemoryCache;
}

class CacheManager {
  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sbt:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'), // 1시간
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      lazyConnect: true
    };
    
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) return;
      
      // Redis가 있는지 확인
      if (RedisCache === MemoryCache) {
        console.log('🧠 메모리 캐시 모드로 시작');
        this.client = new MemoryCache();
        this.isConnected = true;
        return;
      }
      
      console.log('🔄 Redis 연결 시도 중...');
      
      this.client = new RedisCache(this.config);
      
      this.client.on('connect', () => {
        console.log('✅ Redis 연결 성공');
        this.isConnected = true;
      });
      
      this.client.on('error', (error) => {
        console.error('❌ Redis 연결 오류:', error.message);
        this.isConnected = false;
      });
      
      this.client.on('close', () => {
        console.log('🔌 Redis 연결 종료');
        this.isConnected = false;
      });

      // 연결 테스트
      await this.client.ping();
      console.log(`📍 Redis 연결 정보: ${this.config.host}:${this.config.port}`);
      
    } catch (error) {
      console.error('❌ 캐시 연결 실패:', error.message);
      
      // Fallback: 메모리 캐시로 전환
      console.log('⚠️ 메모리 캐시 모드로 전환');
      this.client = new MemoryCache();
      this.isConnected = true;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔌 캐시 연결 종료');
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const fullKey = `${this.config.keyPrefix}${key}`;
      const value = await this.client.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`캐시 조회 실패 (${key}):`, error.message);
      return null;
    }
  }

  async set(key, value, ttl) {
    if (!this.isConnected) return false;
    
    try {
      const fullKey = `${this.config.keyPrefix}${key}`;
      const serializedValue = JSON.stringify(value);
      const finalTTL = ttl || this.config.defaultTTL;
      
      if (RedisCache === MemoryCache) {
        await this.client.set(key, serializedValue, finalTTL);
      } else {
        await this.client.setex(fullKey, finalTTL, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error(`캐시 저장 실패 (${key}):`, error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      const fullKey = `${this.config.keyPrefix}${key}`;
      
      if (RedisCache === MemoryCache) {
        await this.client.del(key);
      } else {
        await this.client.del(fullKey);
      }
      
      return true;
    } catch (error) {
      console.error(`캐시 삭제 실패 (${key}):`, error.message);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const fullPattern = `${this.config.keyPrefix}${pattern}`;
      let keys;
      
      if (RedisCache === MemoryCache) {
        keys = await this.client.keys(pattern);
      } else {
        keys = await this.client.keys(fullPattern);
      }
      
      if (keys.length > 0) {
        if (RedisCache === MemoryCache) {
          await this.client.del(...keys);
        } else {
          await this.client.del(...keys.map(k => `${this.config.keyPrefix}${k}`));
        }
        
        console.log(`🗑 캐시 패턴 삭제: ${pattern} (${keys.length}개)`);
      }
      
      return true;
    } catch (error) {
      console.error(`캐시 패턴 삭제 실패 (${pattern}):`, error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const fullKey = `${this.config.keyPrefix}${key}`;
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`캐시 존재 확인 실패 (${key}):`, error.message);
      return false;
    }
  }

  async getStats() {
    if (!this.isConnected) return null;
    
    try {
      const info = RedisCache === MemoryCache ? 
        await this.client.info() : 
        await this.client.info();
      
      const keyspace = RedisCache === MemoryCache ? 
        await this.client.keys(`${this.config.keyPrefix}*`) :
        await this.client.keys(`${this.config.keyPrefix}*`);
      
      return {
        connected: this.isConnected,
        type: RedisCache === MemoryCache ? 'Memory' : 'Redis',
        cachedKeys: keyspace.length,
        redisInfo: info
      };
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error.message);
      return null;
    }
  }

  createRepositoryWrapper(repository) {
    return new CachedRepository(repository, this);
  }
}

// Repository 캐싱 래퍼
class CachedRepository {
  constructor(repository, cacheManager) {
    this.repository = repository;
    this.cache = cacheManager;
    this.cacheKeys = {
      search: 'search:',
      stats: 'stats:',
      byId: 'byId:',
      distinctCodes: 'distinct-codes:'
    };
  }

  async search(options = {}) {
    const cacheKey = `search:${JSON.stringify(options)}`;
    
    // 캐시 확인
    let cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log('🎯 캐시된 검색 결과 사용');
      return cached;
    }

    // Repository 호출
    const result = await this.repository.search(options);
    
    // 캐시 저장 (5분)
    await this.cache.set(cacheKey, result, 300);
    
    return result;
  }

  async getStats() {
    const cacheKey = this.cacheKeys.stats;
    
    // 캐시 확인
    let cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log('🎯 캐시된 통계 결과 사용');
      return cached;
    }

    // Repository 호출
    const result = await this.repository.getStats();
    
    // 캐시 저장 (1분)
    await this.cache.set(cacheKey, result, 60);
    
    return result;
  }

  async getById(id) {
    const cacheKey = `${this.cacheKeys.byId}${id}`;
    
    // 캐시 확인
    let cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 캐시된 상세 정보 사용 (${id})`);
      return cached;
    }

    // Repository 호출
    const result = await this.repository.getById(id);
    
    // 캐시 저장 (10분)
    if (result) {
      await this.cache.set(cacheKey, result, 600);
    }
    
    return result;
  }

  async invalidate(pattern) {
    console.log(`🗑 캐시 무효화: ${pattern}`);
    return await this.cache.invalidatePattern(pattern);
  }
}

// 전역 캐시 매니저 인스턴스
const globalCacheManager = new CacheManager();

// 초기화 함수
async function initializeCache() {
  await globalCacheManager.connect();
  return globalCacheManager;
}

export {
  CacheManager,
  CachedRepository,
  globalCacheManager,
  initializeCache,
};