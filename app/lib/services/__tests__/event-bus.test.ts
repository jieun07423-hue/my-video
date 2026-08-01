import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock redis module before importing the service
const mockRedis = {
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  duplicate: jest.fn().mockReturnThis(),
  quit: jest.fn(),
};

jest.mock('@/lib/redis', () => ({
  redis: mockRedis,
}), { virtual: true });

// Mock logger
jest.mock('@/lib/logger', () => ({
  syncLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  dbLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  apiLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { eventBus } from '../event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventBus.clearHistory();
  });

  it('이벤트 구독 및 발행', async () => {
    const handler = jest.fn();
    const subId = eventBus.subscribe('sync.started', handler);

    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'sync.started',
        payload: expect.objectContaining({ taskId: 'task-1' }),
      })
    );

    eventBus.unsubscribe(subId);
  });

  it('구독 해제 후 이벤트 수신 안 함', async () => {
    const handler = jest.fn();
    const subId = eventBus.subscribe('sync.started', handler);
    eventBus.unsubscribe(subId);

    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('와일드카드 구독', async () => {
    const handler = jest.fn();
    eventBus.subscribe('*', handler);

    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    await eventBus.publish('sync.completed', {
      taskId: 'task-1',
      processed: 100,
      success: 95,
      failed: 5,
      durationMs: 5000,
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('필터 적용', async () => {
    const handler = jest.fn();
    eventBus.subscribe('sync.progress', handler, (event) => event.payload.percentage > 50);

    await eventBus.publish('sync.progress', {
      taskId: 'task-1',
      percentage: 30,
      currentStep: 'step1',
      processed: 30,
      total: 100,
    });

    await eventBus.publish('sync.progress', {
      taskId: 'task-1',
      percentage: 80,
      currentStep: 'step2',
      processed: 80,
      total: 100,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ percentage: 80 }),
      })
    );
  });

  it('히스토리 조회', async () => {
    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    await eventBus.publish('sync.completed', {
      taskId: 'task-1',
      processed: 100,
      success: 95,
      failed: 5,
      durationMs: 5000,
    });

    const history = eventBus.getHistory('sync.started', 10);
    expect(history.length).toBe(1);
    expect(history[0].name).toBe('sync.started');
  });

  it('구독 수 조회', () => {
    const handler = jest.fn();
    eventBus.subscribe('sync.started', handler);
    eventBus.subscribe('sync.started', handler);
    eventBus.subscribe('sync.completed', handler);

    expect(eventBus.getSubscriptionCount('sync.started')).toBe(2);
    expect(eventBus.getSubscriptionCount('sync.completed')).toBe(1);
    expect(eventBus.getSubscriptionCount()).toBe(3);
  });

  it('우선순위 기반 핸들러 실행 순서', async () => {
    const order: number[] = [];
    eventBus.subscribe('sync.started', async () => { order.push(1); }, undefined, 10);
    eventBus.subscribe('sync.started', async () => { order.push(2); }, undefined, 5);
    eventBus.subscribe('sync.started', async () => { order.push(3); }, undefined, 15);

    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    expect(order).toEqual([3, 1, 2]);
  });

  it('핸들러 에러 시 다른 핸들러 계속 실행', async () => {
    const order: number[] = [];
    eventBus.subscribe('sync.started', async () => { 
      order.push(1); 
      throw new Error('Handler 1 error');
    });
    eventBus.subscribe('sync.started', async () => { order.push(2); });
    eventBus.subscribe('sync.started', async () => { order.push(3); });

    await eventBus.publish('sync.started', {
      taskId: 'task-1',
      source: 'public-data-portal',
      options: {},
    });

    expect(order).toEqual([1, 2, 3]);
  });
});