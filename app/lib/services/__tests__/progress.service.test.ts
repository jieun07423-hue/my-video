import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the modules using jest.mock at the top level
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrem: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    duplicate: jest.fn().mockReturnThis(),
    quit: jest.fn(),
    incrby: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    hset: jest.fn().mockResolvedValue(1),
    hincrby: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
}), { virtual: true });

jest.mock('@/lib/logger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  dbLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  apiLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}), { virtual: true });

import { progressService } from '../progress.service';

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('진행 상태 생성 및 조회', async () => {
    const progress = await progressService.createProgress({
      taskId: 'test-task-1',
      taskType: 'sync',
      totalSteps: 10,
      initialMessage: '테스트 시작',
    });

    expect(progress.taskId).toBe('test-task-1');
    expect(progress.taskType).toBe('sync');
    expect(progress.percentage).toBe(0);
    expect(progress.state).toBe('waiting');

    const retrieved = await progressService.getProgress('test-task-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.taskId).toBe('test-task-1');
  });

  it('진행 상태 업데이트', async () => {
    await progressService.createProgress({
      taskId: 'test-task-2',
      taskType: 'sync',
      totalSteps: 10,
    });

    const updated = await progressService.updateProgress('test-task-2', {
      percentage: 50,
      state: 'running',
      message: '처리 중',
      currentStep: '단계 5',
      completedSteps: 5,
    });

    expect(updated).toBeDefined();
    expect(updated!.percentage).toBe(50);
    expect(updated!.state).toBe('running');
    expect(updated!.completedSteps).toBe(5);
  });

  it('완료 처리', async () => {
    await progressService.createProgress({
      taskId: 'test-task-3',
      taskType: 'sync',
    });

    const completed = await progressService.completeProgress('test-task-3', '완료됨');
    expect(completed!.state).toBe('completed');
    expect(completed!.percentage).toBe(100);
    expect(completed!.completedAt).toBeDefined();
  });

  it('실패 처리', async () => {
    await progressService.createProgress({
      taskId: 'test-task-4',
      taskType: 'sync',
    });

    const failed = await progressService.failProgress('test-task-4', '에러 발생', '실패함');
    expect(failed!.state).toBe('failed');
    expect(failed!.error).toBe('에러 발생');
  });

  it('일시정지/재개', async () => {
    await progressService.createProgress({
      taskId: 'test-task-5',
      taskType: 'sync',
    });

    const paused = await progressService.pauseProgress('test-task-5', '일시정지');
    expect(paused!.state).toBe('paused');

    const resumed = await progressService.resumeProgress('test-task-5', '재개');
    expect(resumed!.state).toBe('running');
  });

  it('단계 업데이트', async () => {
    await progressService.createProgress({
      taskId: 'test-task-6',
      taskType: 'sync',
      totalSteps: 5,
    });

    const updated = await progressService.updateStep('test-task-6', '데이터 검증', 2, '검증 중');
    expect(updated!.currentStep).toBe('데이터 검증');
    expect(updated!.completedSteps).toBe(2);
    expect(updated!.percentage).toBe(40);
  });

  it('존재하지 않는 태스크 조회 시 null 반환', async () => {
    const result = await progressService.getProgress('non-existent');
    expect(result).toBeNull();
  });

  it('진행 상태 삭제', async () => {
    await progressService.createProgress({
      taskId: 'test-task-7',
      taskType: 'sync',
    });

    const deleted = await progressService.deleteProgress('test-task-7');
    expect(deleted).toBe(true);

    const retrieved = await progressService.getProgress('test-task-7');
    expect(retrieved).toBeNull();
  });
});