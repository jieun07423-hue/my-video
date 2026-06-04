import { Queue } from 'bullmq';
import redisConnection from '@/lib/redis';

export interface SyncJobData {
  serviceKey: string;
  pageSize?: number;
  maxPages?: number;
  force?: boolean;
}

export const syncQueueName = 'sync-queue';

export const syncQueue = new Queue(syncQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function addSyncJob(data: SyncJobData) {
  return await syncQueue.add('sync-public-data', data, {
    jobId: 'public-data-portal-sync', 
  });
}
