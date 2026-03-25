import * as cron from 'node-cron';
import { syncWorker } from '@/workers/sync-worker';
import { syncLogger } from '@/lib/logger';

let syncJob: any | null = null;
let isJobRunning = false;

export function startScheduler(schedule: string = '0 2 * * *') {
  if (syncJob) {
    syncLogger.warn('스케줄러 이미 실행 중');
    return;
  }

  syncLogger.info({ schedule }, '스케줄러 시작');

  syncJob = cron.schedule(
    schedule,
    async () => {
      if (isJobRunning) {
        syncLogger.warn('이전 동기화 작업이 아직 진행 중');
        return;
      }

      isJobRunning = true;
      try {
        await syncWorker();
      } catch (error) {
        syncLogger.error({ error }, '예약 동기화 작업 실패');
      } finally {
        isJobRunning = false;
      }
    }
  );

  syncJob.start();
}

export function stopScheduler() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    syncLogger.info('스케줄러 중지');
  }
}

export function getSchedulerStatus() {
  return {
    running: syncJob?.running || false,
    isJobRunning,
  };
}
