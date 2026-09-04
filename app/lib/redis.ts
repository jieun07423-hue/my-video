import Redis from 'ioredis';
import type { ConnectionOptions } from 'bullmq';
import { apiLogger } from '@/lib/logger';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (times > 3) {
      // Stop retrying after 3 attempts in offline/test mode to prevent log spam
      return null;
    }
    return Math.min(times * 200, 1000);
  },
};

// 브라우저에서는 Redis 클라이언트를 생성하지 않는다 (서버 전용 연결).
// 클라이언트 번들에 이 모듈이 포함되어도 ioredis가 연결을 시도하지 않아
// 'Reddis 연결 실패' 경고가 브라우저 console에 표시되지 않는다.
const isBrowser = typeof window !== 'undefined';

export const redis =
  isBrowser
    ? (null as unknown as Redis)
    : new Redis(redisConfig);

if (!isBrowser && redis) {
  redis.on('error', (err) => {
    apiLogger.warn({ error: err.message }, 'Redis 연결 실패 (오프라인 모드 또는 에뮬레이션 폴백 사용)');
  });
}

export const bullConnection: ConnectionOptions = {
  ...redisConfig,
  maxRetriesPerRequest: null,
};

export default redis;
