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

export const redis = new Redis(redisConfig);

redis.on('error', (err) => {
  apiLogger.warn({ error: err.message }, 'Redis 연결 실패 (오프라인 모드 또는 에뮬레이션 폴백 사용)');
});

export const bullConnection: ConnectionOptions = {
  ...redisConfig,
  maxRetriesPerRequest: null,
};

export default redis;
