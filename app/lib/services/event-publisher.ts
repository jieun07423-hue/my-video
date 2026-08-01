import { syncLogger } from '@/lib/logger';
import { eventBus, EventName, BaseEvent, EventPayloadMap } from './event-bus';

export interface PublishOptions {
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface EventPublisher {
  publish<T extends EventName>(eventName: T, payload: EventPayloadMap[T], options?: PublishOptions): Promise<string>;
  publishSyncStarted(taskId: string, source: string, options: Record<string, unknown>): Promise<string>;
  publishSyncProgress(taskId: string, percentage: number, currentStep: string, processed: number, total: number): Promise<string>;
  publishSyncCompleted(taskId: string, processed: number, success: number, failed: number, durationMs: number): Promise<string>;
  publishSyncFailed(taskId: string, error: string, processed: number, failed: number): Promise<string>;
  publishBatchProgress(batchIndex: number, totalBatches: number, processed: number, successful: number, failed: number): Promise<string>;
  publishBatchFailed(batchIndex: number, totalBatches: number, processed: number, successful: number, failed: number, error: string): Promise<string>;
  publishValidationStarted(taskId: string, count: number): Promise<string>;
  publishValidationCompleted(taskId: string, valid: number, invalid: number): Promise<string>;
  publishValidationFailed(taskId: string, error: string): Promise<string>;
  publishDuplicateDetected(taskId: string, duplicatesCount: number, exactMatches: number, highSimilarity: number): Promise<string>;
  publishBusinessCreated(bizesId: string, name: string): Promise<string>;
  publishBusinessUpdated(bizesId: string, name: string, changes: Record<string, { from: unknown; to: unknown }>): Promise<string>;
  publishBusinessVerified(bizesId: string, name: string): Promise<string>;
  publishBusinessDeleted(bizesId: string): Promise<string>;
  publishError(context: string, error: string | Error, severity?: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, unknown>): Promise<string>;
  publishSystemHealth(status: 'healthy' | 'degraded' | 'unhealthy', checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message?: string }>): Promise<string>;
}

class EventPublisherImpl implements EventPublisher {
  private defaultOptions: PublishOptions = {
    retryOnFailure: true,
    maxRetries: 3,
  };

  async publish<T extends EventName>(eventName: T, payload: EventPayloadMap[T], options?: PublishOptions): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      return await eventBus.publish(eventName, payload, mergedOptions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      syncLogger.error({ eventName, error: errorMessage }, '이벤트 발행 실패');
      
      if (mergedOptions.retryOnFailure) {
        await this.retryPublish(eventName, payload, mergedOptions.maxRetries || 3);
      }
      
      throw error;
    }
  }

  private async retryPublish<T extends EventName>(
    eventName: T, 
    payload: EventPayloadMap[T], 
    maxRetries: number,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > maxRetries) {
      syncLogger.error({ eventName, attempts: attempt }, '최대 재시도 횟수 초과');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await eventBus.publish(eventName, payload);
      syncLogger.info({ eventName, attempt }, '재시도 발행 성공');
    } catch (error) {
      await this.retryPublish(eventName, payload, maxRetries, attempt + 1);
    }
  }

  async publishSyncStarted(taskId: string, source: string, options: Record<string, unknown>): Promise<string> {
    return this.publish('sync.started', { taskId, source, options });
  }

  async publishSyncProgress(
    taskId: string, 
    percentage: number, 
    currentStep: string, 
    processed: number, 
    total: number
  ): Promise<string> {
    return this.publish('sync.progress', { taskId, percentage, currentStep, processed, total });
  }

  async publishSyncCompleted(
    taskId: string, 
    processed: number, 
    success: number, 
    failed: number, 
    durationMs: number
  ): Promise<string> {
    return this.publish('sync.completed', { taskId, processed, success, failed, durationMs });
  }

  async publishSyncFailed(
    taskId: string, 
    error: string, 
    processed: number, 
    failed: number
  ): Promise<string> {
    return this.publish('sync.failed', { taskId, error, processed, failed });
  }

  async publishBatchProgress(
    batchIndex: number, 
    totalBatches: number, 
    processed: number, 
    successful: number, 
    failed: number
  ): Promise<string> {
    return this.publish('batch.progress', { batchIndex, totalBatches, processed, successful, failed });
  }

  async publishBatchFailed(
    batchIndex: number, 
    totalBatches: number, 
    processed: number, 
    successful: number, 
    failed: number, 
    error: string
  ): Promise<string> {
    return this.publish('batch.failed', { batchIndex, totalBatches, processed, successful, failed, error });
  }

  async publishValidationStarted(taskId: string, count: number): Promise<string> {
    return this.publish('validation.started', { taskId, count });
  }

  async publishValidationCompleted(taskId: string, valid: number, invalid: number): Promise<string> {
    return this.publish('validation.completed', { taskId, valid, invalid });
  }

  async publishValidationFailed(taskId: string, error: string): Promise<string> {
    return this.publish('validation.failed', { taskId, error });
  }

  async publishDuplicateDetected(
    taskId: string, 
    duplicatesCount: number, 
    exactMatches: number, 
    highSimilarity: number
  ): Promise<string> {
    return this.publish('duplicate.detected', { taskId, duplicatesCount, exactMatches, highSimilarity });
  }

  async publishBusinessCreated(bizesId: string, name: string): Promise<string> {
    return this.publish('business.created', { bizesId, name });
  }

  async publishBusinessUpdated(
    bizesId: string, 
    name: string, 
    changes: Record<string, { from: unknown; to: unknown }>
  ): Promise<string> {
    return this.publish('business.updated', { bizesId, name, changes });
  }

  async publishBusinessVerified(bizesId: string, name: string): Promise<string> {
    return this.publish('business.verified', { bizesId, name });
  }

  async publishBusinessDeleted(bizesId: string): Promise<string> {
    return this.publish('business.deleted', { bizesId });
  }

  async publishError(
    context: string, 
    error: string | Error, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    return this.publish('error.occurred', { 
      context, 
      error: errorMessage, 
      stack, 
      severity, 
      metadata 
    });
  }

  async publishSystemHealth(
    status: 'healthy' | 'degraded' | 'unhealthy', 
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message?: string }>
  ): Promise<string> {
    return this.publish('system.health', { status, checks });
  }
}

export const eventPublisher = new EventPublisherImpl();

export async function publishEvent<T extends EventName>(
  eventName: T, 
  payload: EventPayloadMap[T], 
  options?: PublishOptions
): Promise<string> {
  return eventPublisher.publish(eventName, payload, options);
}

export function createCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function extractCorrelationId(event: BaseEvent): string | undefined {
  return event.correlationId;
}