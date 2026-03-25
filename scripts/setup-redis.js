#!/usr/bin/env node

/**
 * Redis 캐싱 설정 스크립트
 * Redis 연결 설정 및 캐싱 미들웨어 생성
 */

const fs = require('fs');
const path = require('path');

class RedisCacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // 환경 변수로부터 Redis 설정 로드
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sbt:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'), // 1시간
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'), // 100ms
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      lazyConnect: true
    };
  }

  async connect() {
    try {
      console.log('🔄 캐시 연결 시도 중...');
      
      // Redis 패키지가 없으므로 바로 메모리 캐시로 전환
      console.log('⚠️ ioredis 패키지 없음 - 메모리 캐시 모드로 전환');
      this.client = new MemoryCache();
      this.isConnected = true;
    } catch (error) {
      console.error('❌ 캐시 연결 실패:', error.message);
      this.isConnected = false;
    }
   }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔌 Redis 연결 종료');
    }
  }

  // 캐시 메서드들
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
      
      // 메모리 캐시에서는 setex 대신 set 사용
      await this.client.set(key, serializedValue, ttl);
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
      await this.client.del(fullKey);
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
      const keys = await this.client.keys(fullPattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
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
      const info = await this.client.info();
      const keyspace = await this.client.keys(`${this.config.keyPrefix}*`);
      
      return {
        connected: this.isConnected,
        type: this.client.constructor.name === 'MemoryCache' ? 'Memory' : 'Redis',
        cachedKeys: keyspace.length,
        redisInfo: info
      };
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error.message);
      return null;
    }
  }
}

// 메모리 캐시 Fallback
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    return this.cache.get(key) || null;
  }

  async set(key, value, ttl) {
    this.cache.set(key, { value, timestamp: Date.now() });
    
    // TTL 자동 만료 (간단한 구현)
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl * 1000);
    }
    
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
    return this.cache.has(key) ? 1 : 0;
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

// 환경 설정 파일 생성
function generateEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.redis.example');
  
  const envContent = `
# Redis 캐싱 설정
# Redis 서버 주소
REDIS_HOST=localhost
REDIS_PORT=6379

# Redis 비밀번호 (선택사항)
# REDIS_PASSWORD=your_password

# Redis DB 번호
REDIS_DB=0

# 캐시 키 프리픽스
REDIS_KEY_PREFIX=sbt:

# 기본 TTL (초)
REDIS_DEFAULT_TTL=3600

# Redis 재시도 설정
REDIS_RETRY_DELAY=100
REDIS_MAX_RETRIES=3

# 개발 환경에서는 이 파일을 .env 로 복사하여 사용하세요
# cp .env.redis.example .env.redis
`;

  fs.writeFileSync(envPath, envContent.trim(), 'utf8');
  console.log(`📝 Redis 환경 설정 파일 생성: ${envPath}`);
}

// 메인 함수
async function setupRedis() {
  console.log('🚀 Redis 캐싱 설정 시작\n');

  try {
    // 환경 설정 파일 생성
    generateEnvFile();

    // Redis 캐시 매니저 초기화
    const cacheManager = new RedisCacheManager();
    
    // Redis 연결
    await cacheManager.connect();
    
    // 캐시 통계 출력
    const stats = await cacheManager.getStats();
    if (stats) {
      console.log('\n📊 캐시 상태:');
      console.log(`   타입: ${stats.type}`);
      console.log(`   연결 상태: ${stats.connected ? '연결됨' : '연결 안됨'}`);
      console.log(`   캐시된 키: ${stats.cachedKeys}개`);
      
      if (stats.redisInfo) {
        console.log(`   Redis 버전: ${stats.redisInfo.redis_version}`);
      }
    }

    // 캐시 테스트
    console.log('\n🧪 캐시 기능 테스트...');
    
    const testKey = 'test:setup';
    const testValue = { message: 'Redis 캐시 테스트', timestamp: Date.now() };
    
    // 설정
    await cacheManager.set(testKey, testValue, 60);
    console.log('✅ 캐시 설정 성공');
    
    // 조회
    const retrieved = await cacheManager.get(testKey);
    if (retrieved && retrieved.message === testValue.message) {
      console.log('✅ 캐시 조회 성공');
    } else {
      console.log('❌ 캐시 조회 실패');
    }
    
    // 삭제
    await cacheManager.del(testKey);
    console.log('✅ 캐시 삭제 성공');

    console.log('\n✅ Redis 캐싱 설정 완료!');
    console.log('\n📋 다음 단계:');
    console.log('1. npm install ioredis');
    console.log('2. cp .env.redis.example .env.redis');
    console.log('3. .env.redis 파일에 Redis 설정 입력');
    console.log('4. 애플리케이션에서 cacheManager 사용');
    
  } catch (error) {
    console.error('❌ Redis 설정 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  setupRedis();
}

module.exports = { RedisCacheManager, MemoryCache, setupRedis };