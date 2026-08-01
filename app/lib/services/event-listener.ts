import { syncLogger, dbLogger } from '@/lib/logger';
import { eventBus, EventName, BaseEvent, EventPayloadMap } from './event-bus';
import { progressService } from './progress.service';
import { statisticService } from './statistic.service';
import { validationService } from './validation.service';
import { duplicateDetectionService } from './duplicate-detection.service';

export interface EventListenerConfig {
  eventName: EventName | '*';
  handler: (event: any) => Promise<void>;
  filter?: (event: any) => boolean;
  priority?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface WorkerStatus {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  currentEvent?: string;
  processedCount: number;
  failedCount: number;
  lastProcessedAt?: Date;
  startedAt: Date;
  error?: string;
}

class EventListenerService {
  private subscriptions: Map<string, string> = new Map();
  private workers: Map<string, WorkerStatus> = new Map();
  private isShuttingDown = false;

  registerListener(config: EventListenerConfig): string {
    const subscriptionId = eventBus.subscribe(config.eventName, config.handler, config.filter);
    this.subscriptions.set(subscriptionId, config.eventName);
    syncLogger.info({ subscriptionId, eventName: config.eventName }, '이벤트 리스너 등록');
    return subscriptionId;
  }

  unregisterListener(subscriptionId: string): boolean {
    const result = eventBus.unsubscribe(subscriptionId);
    if (result) {
      this.subscriptions.delete(subscriptionId);
      syncLogger.info({ subscriptionId }, '이벤트 리스너 해제');
    }
    return result;
  }

  createWorker(workerId: string, name: string, eventNames: EventName[], handler: (event: BaseEvent) => Promise<void>): WorkerStatus {
    const status: WorkerStatus = {
      id: workerId,
      name,
      status: 'starting',
      processedCount: 0,
      failedCount: 0,
      startedAt: new Date(),
    };
    this.workers.set(workerId, status);

    for (const eventName of eventNames) {
      this.registerListener({
        eventName,
        handler: async (event) => {
          status.status = 'running';
          status.currentEvent = event.name;
          
          try {
            await handler(event);
            status.processedCount++;
            status.lastProcessedAt = new Date();
          } catch (error) {
            status.failedCount++;
            status.error = error instanceof Error ? error.message : String(error);
            syncLogger.error({ workerId, eventName: event.name, error: status.error }, '워커 이벤트 처리 실패');
          }
        },
        priority: 10,
      });
    }

    status.status = 'running';
    syncLogger.info({ workerId, name, eventNames }, '이벤트 워커 시작');
    return status;
  }

  async stopWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'stopping';
    
    for (const [subId, eventName] of this.subscriptions.entries()) {
      if (eventName.startsWith(workerId) || eventName === '*') {
        this.unregisterListener(subId);
      }
    }

    worker.status = 'stopped';
    syncLogger.info({ workerId }, '이벤트 워커 정지');
  }

  getWorkerStatus(workerId: string): WorkerStatus | undefined {
    return this.workers.get(workerId);
  }

  getAllWorkers(): WorkerStatus[] {
    return Array.from(this.workers.values());
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    syncLogger.info('이벤트 리스너 서비스 종료 시작');

    for (const [workerId] of this.workers) {
      await this.stopWorker(workerId);
    }

    this.subscriptions.clear();
    this.workers.clear();
    syncLogger.info('이벤트 리스너 서비스 종료 완료');
  }
}

const eventListenerService = new EventListenerService();

export function createSyncEventHandlers(
  progress: typeof progressService,
  statistics: typeof statisticService
) {
  return {
    async handleSyncStarted(event: BaseEvent<EventPayloadMap['sync.started']>): Promise<void> {
      const { taskId, source, options } = event.payload;
      await progress.createProgress({
        taskId,
        taskType: 'sync',
        initialMessage: `${source} 동기화 시작`,
        metadata: { source, options },
      });
      syncLogger.info({ taskId, source }, '동기화 시작 이벤트 처리');
    },

    async handleSyncProgress(event: BaseEvent<EventPayloadMap['sync.progress']>): Promise<void> {
      const { taskId, percentage, currentStep, processed, total } = event.payload;
      await progress.updateProgress(taskId, {
        percentage,
        state: 'running',
        message: currentStep,
        currentStep,
        completedSteps: processed,
        totalSteps: total,
        metadata: { processed, total },
      });
      await statistics.recordSyncProgress(taskId, percentage, processed, total);
    },

    async handleSyncCompleted(event: BaseEvent<EventPayloadMap['sync.completed']>): Promise<void> {
      const { taskId, processed, success, failed, durationMs } = event.payload;
      await progress.completeProgress(taskId, `동기화 완료: ${success}개 성공, ${failed}개 실패`);
      await statistics.recordSyncCompleted(taskId, processed, success, failed, durationMs);
      syncLogger.info({ taskId, success, failed }, '동기화 완료 이벤트 처리');
    },

    async handleSyncFailed(event: BaseEvent<EventPayloadMap['sync.failed']>): Promise<void> {
      const { taskId, error, processed, failed } = event.payload;
      await progress.failProgress(taskId, error, `동기화 실패: ${processed}개 처리, ${failed}개 실패`);
      await statistics.recordSyncFailed(taskId, error, processed, failed);
      syncLogger.error({ taskId, error }, '동기화 실패 이벤트 처리');
    },

    async handleBatchProgress(event: BaseEvent<EventPayloadMap['batch.progress']>): Promise<void> {
      const { batchIndex, totalBatches, processed, successful, failed } = event.payload;
      const taskId = `batch_${batchIndex}`;
      
      await progress.updateProgress(taskId, {
        percentage: Math.round(((batchIndex + 1) / totalBatches) * 100),
        message: `배치 ${batchIndex + 1}/${totalBatches} 처리 중`,
        currentStep: `배치 ${batchIndex + 1}`,
        completedSteps: batchIndex + 1,
        totalSteps: totalBatches,
        metadata: { processed, successful, failed },
      });
      
      syncLogger.debug({ batchIndex, processed, successful, failed }, '배치 진행 이벤트 처리');
    },

    async handleBatchFailed(event: BaseEvent<EventPayloadMap['batch.failed']>): Promise<void> {
      const { batchIndex, error } = event.payload;
      const taskId = `batch_${batchIndex}`;
      
      await progress.failProgress(taskId, error, `배치 ${batchIndex + 1} 실패`);
      syncLogger.error({ batchIndex, error }, '배치 실패 이벤트 처리');
    },
  };
}

export function createBusinessEventHandlers(
  statistics: typeof statisticService
) {
  return {
    async handleBusinessCreated(event: BaseEvent<EventPayloadMap['business.created']>): Promise<void> {
      const { bizesId, name } = event.payload;
      await statistics.incrementBusinessCount('created');
      dbLogger.info({ bizesId, name }, '비즈니스 생성 이벤트 처리');
    },

    async handleBusinessUpdated(event: BaseEvent<EventPayloadMap['business.updated']>): Promise<void> {
      const { bizesId, name, changes } = event.payload;
      await statistics.incrementBusinessCount('updated');
      dbLogger.info({ bizesId, name, changes: Object.keys(changes ?? {}) }, '비즈니스 수정 이벤트 처리');
    },

    async handleBusinessVerified(event: BaseEvent<EventPayloadMap['business.verified']>): Promise<void> {
      const { bizesId, name } = event.payload;
      await statistics.incrementBusinessCount('verified');
      dbLogger.info({ bizesId, name }, '비즈니스 검증 이벤트 처리');
    },

    async handleBusinessDeleted(event: BaseEvent<EventPayloadMap['business.deleted']>): Promise<void> {
      const { bizesId } = event.payload;
      await statistics.incrementBusinessCount('deleted');
      dbLogger.info({ bizesId }, '비즈니스 삭제 이벤트 처리');
    },
  };
}

export function createValidationEventHandlers(
  validation: typeof validationService
) {
  return {
    async handleValidationStarted(event: BaseEvent<EventPayloadMap['validation.started']>): Promise<void> {
      const { taskId, count } = event.payload;
      syncLogger.info({ taskId, count }, '검증 시작 이벤트 처리');
    },

    async handleValidationCompleted(event: BaseEvent<EventPayloadMap['validation.completed']>): Promise<void> {
      const { taskId, valid, invalid } = event.payload;
      syncLogger.info({ taskId, valid, invalid }, '검증 완료 이벤트 처리');
    },

    async handleValidationFailed(event: BaseEvent<EventPayloadMap['validation.failed']>): Promise<void> {
      const { taskId, error } = event.payload;
      syncLogger.error({ taskId, error }, '검증 실패 이벤트 처리');
    },
  };
}

export function createDuplicateEventHandlers(
  duplicateService: typeof duplicateDetectionService,
  statistics: typeof statisticService
) {
  return {
    async handleDuplicateDetected(event: BaseEvent<EventPayloadMap['duplicate.detected']>): Promise<void> {
      const { taskId, duplicatesCount, exactMatches, highSimilarity } = event.payload;
      await statistics.recordDuplicateDetection(taskId, duplicatesCount, exactMatches, highSimilarity);
      syncLogger.warn({ taskId, duplicatesCount, exactMatches, highSimilarity }, '중복 탐지 이벤트 처리');
    },

    async handleDuplicateResolved(event: BaseEvent<EventPayloadMap['duplicate.resolved']>): Promise<void> {
      const { taskId, merged, deleted } = event.payload;
      await statistics.recordDuplicateResolution(taskId, merged, deleted);
      syncLogger.info({ taskId, merged, deleted }, '중복 해결 이벤트 처리');
    },
  };
}

export function createErrorEventHandlers() {
  return {
    async handleError(event: BaseEvent<EventPayloadMap['error.occurred']>): Promise<void> {
      const { context, error, severity, metadata } = event.payload;
      const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
      
      syncLogger[logLevel]({ context, error, severity, metadata }, `오류 발생: ${context}`);
      
      if (severity === 'critical') {
        await notifyCriticalError(context, error, metadata);
      }
    },
  };
}

async function notifyCriticalError(context: string, error: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const { emitEvent } = await import('./webhookDispatcher.service');
    await emitEvent('critical.error', {
      title: `치명적 오류: ${context}`,
      message: error,
      severity: 'critical',
      metadata,
    });
  } catch {
    syncLogger.error({ context, error }, '치명적 오류 알림 전송 실패');
  }
}

export function initializeEventListeners(
  progress: typeof progressService,
  statistics: typeof statisticService,
  validation: typeof validationService,
  duplicateService: typeof duplicateDetectionService
): void {
  const syncHandlers = createSyncEventHandlers(progress, statistics);
  const businessHandlers = createBusinessEventHandlers(statistics);
  const validationHandlers = createValidationEventHandlers(validation);
  const duplicateHandlers = createDuplicateEventHandlers(duplicateService, statistics);
  const errorHandlers = createErrorEventHandlers();

  eventListenerService.registerListener({
    eventName: 'sync.started',
    handler: syncHandlers.handleSyncStarted,
  });

  eventListenerService.registerListener({
    eventName: 'sync.progress',
    handler: syncHandlers.handleSyncProgress,
  });

  eventListenerService.registerListener({
    eventName: 'sync.completed',
    handler: syncHandlers.handleSyncCompleted,
  });

  eventListenerService.registerListener({
    eventName: 'sync.failed',
    handler: syncHandlers.handleSyncFailed,
  });

  eventListenerService.registerListener({
    eventName: 'batch.progress',
    handler: syncHandlers.handleBatchProgress,
  });

  eventListenerService.registerListener({
    eventName: 'batch.failed',
    handler: syncHandlers.handleBatchFailed,
  });

  eventListenerService.registerListener({
    eventName: 'validation.started',
    handler: validationHandlers.handleValidationStarted,
  });

  eventListenerService.registerListener({
    eventName: 'validation.completed',
    handler: validationHandlers.handleValidationCompleted,
  });

  eventListenerService.registerListener({
    eventName: 'validation.failed',
    handler: validationHandlers.handleValidationFailed,
  });

  eventListenerService.registerListener({
    eventName: 'business.created',
    handler: businessHandlers.handleBusinessCreated,
  });

  eventListenerService.registerListener({
    eventName: 'business.updated',
    handler: businessHandlers.handleBusinessUpdated,
  });

  eventListenerService.registerListener({
    eventName: 'business.verified',
    handler: businessHandlers.handleBusinessVerified,
  });

  eventListenerService.registerListener({
    eventName: 'business.deleted',
    handler: businessHandlers.handleBusinessDeleted,
  });

  eventListenerService.registerListener({
    eventName: 'duplicate.detected',
    handler: duplicateHandlers.handleDuplicateDetected,
  });

  eventListenerService.registerListener({
    eventName: 'duplicate.resolved',
    handler: duplicateHandlers.handleDuplicateResolved,
  });

  eventListenerService.registerListener({
    eventName: 'error.occurred',
    handler: errorHandlers.handleError,
  });

  syncLogger.info('기본 이벤트 리스너 초기화 완료');
}

export { eventListenerService };