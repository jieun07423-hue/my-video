import { Worker, Job } from 'bullmq';
import { bullConnection } from '@/lib/redis';
import { syncQueueName, SyncJobData } from '@/lib/queues/sync.queue';
import { syncFromPublicDataPortal } from '@/lib/services/public-data-portal.service';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { syncLogger } from '@/lib/logger';

export const syncWorker = new Worker(
  syncQueueName,
  async (job: Job<SyncJobData>) => {
    const startTime = Date.now();
    const { serviceKey, pageSize, maxPages, force } = job.data;

    try {
      syncLogger.info({ jobId: job.id, attempt: job.attemptsMade + 1 }, 'Sync worker processing job started');
      
      await syncStateRepository.setRunning('public-data-portal');

      const result = await syncFromPublicDataPortal({
        serviceKey,
        pageSize,
        maxPages,
        force,
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        const errorMsg = result.errors.join('; ');
        syncLogger.warn({ jobId: job.id, duration, errors: errorMsg }, 'Sync worker completed with sync errors');
        await syncStateRepository.setFailed('public-data-portal', errorMsg);
        throw new Error(`Sync failed: ${errorMsg}`);
      }

      await syncStateRepository.setSuccess('public-data-portal', {
        lastBusinessId: result.lastBusinessId,
        syncCount: result.totalProcessed,
        newRecordsCount: result.newRecords,
        totalSynced: result.totalProcessed,
      });

      syncLogger.info({ jobId: job.id, duration, totalProcessed: result.totalProcessed }, 'Sync worker completed successfully');
      return { success: true, totalProcessed: result.totalProcessed, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      syncLogger.error({ jobId: job.id, duration, error: errorMessage }, 'Sync worker job failed with exception');
      
      await syncStateRepository.setFailed(
        'public-data-portal',
        errorMessage
      );
      
      throw error;
    }
  },
  {
    connection: bullConnection,
    concurrency: 2, // Optimized concurrency for throughput
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

syncWorker.on('active', (job) => {
  syncLogger.info({ jobId: job.id }, 'Sync job active');
});

syncWorker.on('completed', (job, result) => {
  syncLogger.info({ jobId: job.id, result }, 'Sync job successfully completed event');
});

syncWorker.on('failed', (job, err) => {
  syncLogger.error({ jobId: job?.id, failedReason: job?.failedReason, error: err.message }, 'Sync job failed event');
});

syncWorker.on('stalled', (jobId) => {
  syncLogger.warn({ jobId }, 'Sync job stalled and will be retried');
});

syncWorker.on('error', (err) => {
  syncLogger.error({ error: err.message }, 'Sync worker critical error');
});
