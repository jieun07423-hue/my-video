import { syncLogger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export type EventName = 
  | 'sync.started'
  | 'sync.progress'
  | 'sync.completed'
  | 'sync.failed'
  | 'batch.started'
  | 'batch.progress'
  | 'batch.completed'
  | 'batch.failed'
  | 'validation.started'
  | 'validation.completed'
  | 'validation.failed'
  | 'duplicate.detected'
  | 'duplicate.resolved'
  | 'business.created'
  | 'business.updated'
  | 'business.verified'
  | 'business.deleted'
  | 'error.occurred'
  | 'system.health';

export interface BaseEvent<T = unknown> {
  id: string;
  name: EventName;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

export interface EventPayloadMap {
  'sync.started': SyncStartedPayload;
  'sync.progress': SyncProgressPayload;
  'sync.completed': SyncCompletedPayload;
  'sync.failed': SyncFailedPayload;
  'batch.started': BatchProgressPayload;
  'batch.progress': BatchProgressPayload;
  'batch.completed': BatchProgressPayload;
  'batch.failed': BatchProgressPayload & { error: string };
  'validation.started': { taskId: string; count: number };
  'validation.completed': { taskId: string; valid: number; invalid: number };
  'validation.failed': { taskId: string; error: string };
  'duplicate.detected': DuplicateDetectedPayload;
  'duplicate.resolved': { taskId: string; merged: number; deleted: number };
  'business.created': BusinessEventPayload;
  'business.updated': BusinessEventPayload;
  'business.verified': BusinessEventPayload;
  'business.deleted': { bizesId: string };
  'error.occurred': ErrorOccurredPayload;
  'system.health': SystemHealthPayload;
}

export interface SyncStartedPayload {
  taskId: string;
  source: string;
  options: Record<string, unknown>;
}

export interface SyncProgressPayload {
  taskId: string;
  percentage: number;
  currentStep: string;
  processed: number;
  total: number;
}

export interface SyncCompletedPayload {
  taskId: string;
  processed: number;
  success: number;
  failed: number;
  durationMs: number;
}

export interface SyncFailedPayload {
  taskId: string;
  error: string;
  processed: number;
  failed: number;
}

export interface BatchProgressPayload {
  batchIndex: number;
  totalBatches: number;
  processed: number;
  successful: number;
  failed: number;
}

export interface DuplicateDetectedPayload {
  taskId: string;
  duplicatesCount: number;
  exactMatches: number;
  highSimilarity: number;
}

export interface BusinessEventPayload {
  bizesId: string;
  name: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface ErrorOccurredPayload {
  context: string;
  error: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface SystemHealthPayload {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message?: string }>;
}

export type EventHandler<T = unknown> = (event: BaseEvent<T>) => Promise<void> | void;

interface Subscription {
  id: string;
  eventName: EventName | '*';
  handler: EventHandler;
  filter?: (event: BaseEvent) => boolean;
  priority: number;
}

class EventBusImpl {
  private subscriptions = new Map<EventName | '*', Subscription[]>();
  private eventHistory: BaseEvent[] = [];
  private readonly maxHistorySize = 1000;
  private isProcessing = false;
  private processingQueue: BaseEvent[] = [];

  subscribe(eventName: EventName | '*', handler: EventHandler, filter?: (event: BaseEvent) => boolean, priority: number = 10): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const subscription: Subscription = { id, eventName, handler, filter, priority };

    const subs = this.subscriptions.get(eventName) || [];
    subs.push(subscription);
    subs.sort((a, b) => b.priority - a.priority);
    this.subscriptions.set(eventName, subs);

    syncLogger.debug({ eventName, subscriptionId: id, priority }, '이벤트 구독 등록');
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    for (const [eventName, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventName);
        }
        syncLogger.debug({ eventName, subscriptionId }, '이벤트 구독 해제');
        return true;
      }
    }
    return false;
  }

  async publish<T extends EventName>(eventName: T, payload: EventPayloadMap[T], options?: {
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const event: BaseEvent<EventPayloadMap[T]> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: eventName,
      timestamp: new Date(),
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      payload,
      metadata: options?.metadata,
    };

    this.addToHistory(event);
    await this.publishToRedis(event);
    this.queueForProcessing(event);

    syncLogger.debug({ eventId: event.id, eventName }, '이벤트 발행');
    return event.id;
  }

  private async publishToRedis<T>(event: BaseEvent<T>): Promise<void> {
    const channel = `events:${event.name}`;
    const message = JSON.stringify(event);
    await redis.publish(channel, message);
  }

  private queueForProcessing<T>(event: BaseEvent<T>): void {
    this.processingQueue.push(event);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift()!;
      await this.dispatchEvent(event);
    }

    this.isProcessing = false;
  }

  private async dispatchEvent<T>(event: BaseEvent<T>): Promise<void> {
    const handlers: EventHandler[] = [];

    const specificSubs = this.subscriptions.get(event.name) || [];
    for (const sub of specificSubs) {
      if (!sub.filter || sub.filter(event)) {
        handlers.push(sub.handler);
      }
    }

    const wildcardSubs = this.subscriptions.get('*') || [];
    for (const sub of wildcardSubs) {
      if (!sub.filter || sub.filter(event)) {
        handlers.push(sub.handler);
      }
    }

    await Promise.allSettled(handlers.map(handler => 
      Promise.resolve(handler(event)).catch(error => {
        syncLogger.error({ eventId: event.id, eventName: event.name, error: error.message }, '이벤트 핸들러 실행 실패');
      })
    ));
  }

  private addToHistory<T>(event: BaseEvent<T>): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getHistory(eventName?: EventName, limit: number = 100): BaseEvent[] {
    let events = this.eventHistory;
    if (eventName) {
      events = events.filter(e => e.name === eventName);
    }
    return events.slice(-limit);
  }

  getSubscriptionCount(eventName?: EventName): number {
    if (eventName) {
      return (this.subscriptions.get(eventName) || []).length;
    }
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventBus = new EventBusImpl();