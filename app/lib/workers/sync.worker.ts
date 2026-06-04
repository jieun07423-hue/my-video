import { Worker, Job } from 'bullmq';
import redisConnection from '@/lib/redis';
import { syncQueueName, SyncJobData } from '@/lib/queues/sync.queue';
import { syncFromPublicDataPortal } from '@/lib/services/public-data-portal.service';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { syncLogger } from '@/lib/logger';

export const syncWorker = new Worker(
  syncQueueName,
  async (job: Job<SyncJobData>) => {
    const { serviceKey, pageSize, maxPages, force } = job.data;

    try {
      syncLogger.info({ jobId: job.id }, 'Sync worker processing job');
      
      await syncStateRepository.setRunning('public-data-portal');

      const result = await syncFromPublicDataPortal({
        serviceKey,
        pageSize,
        maxPages,
        force,
      });

      if (!result.success) {
        await syncStateRepository.setFailed(
          'public-data-portal',
          result.errors.join('; ')
        );
        throw new Error(`Sync failed: ${result.errors.join('; ')}`);
      }

      await syncStateRepository.setSuccess('public-data-portal', {
        lastBusinessId: result.lastBusinessId,
        syncCount: result.totalProcessed,
        newRecordsCount: result.newRecords,
        totalSynced: result.totalProcessed,
      });

      syncLogger.info({ jobId: job.id }, 'Sync worker completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      syncLogger.error({ jobId: job.id, error: errorMessage }, 'Sync worker job failed');
      
      await syncStateRepository.setFailed(
        'public-data-portal',
        errorMessage
      );
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

syncWorker.on('completed', (job) => {
  syncLogger.info({ jobId: job?.id }, 'Sync job completed');
});

syncWorker.on('failed', (job, err) => {
  syncLogger.error({ jobId: job?.id, error: err }, 'Sync job failed');
});
