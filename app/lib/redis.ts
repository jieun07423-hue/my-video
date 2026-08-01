import Redis from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export const redis = new Redis(redisConfig);

// BullMQ v5 bundles its own ioredis types, causing protected property mismatch.
// Pass plain config instead of Redis instance for type compatibility.
export const bullConnection: ConnectionOptions = {
  ...redisConfig,
  maxRetriesPerRequest: null,
};

export default redis;
