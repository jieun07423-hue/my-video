import { Queue } from 'bullmq';
import { bullConnection } from '@/lib/redis';
import { syncLogger } from '@/lib/logger';

export interface SyncJobData {
  serviceKey: string;
  pageSize?: number;
  maxPages?: number;
  force?: boolean;
}

export const syncQueueName = 'sync-queue';

export const syncQueue = new Queue(syncQueueName, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs for monitoring
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging & dead-letter analysis
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

export async function addSyncJob(data: SyncJobData) {
  syncLogger.info({ data }, '동기화 큐 작업 추가 요청');
  return await syncQueue.add('sync-public-data', data, {
    jobId: `public-data-portal-sync-${Date.now()}`,
    priority: 1,
  });
}
