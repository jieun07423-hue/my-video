import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock redis module before importing the service
const mockRedis = {
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

// Mock Prisma db
jest.mock('@/lib/db', () => ({
  business: {
    count: jest.fn().mockResolvedValue(100),
    groupBy: jest.fn().mockResolvedValue([]),
  },
}));

import { statisticService } from '../statistic.service';

describe('StatisticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('동기화 메트릭 기록', async () => {
    await statisticService.recordSyncMetric('task-1', {
      processed: 100,
      success: 95,
      failed: 5,
      processingTimeMs: 5000,
      errors: ['error1', 'error2'],
    });

    const metrics = await statisticService.getSyncMetrics();
    expect(metrics.totalSynced).toBeGreaterThanOrEqual(100);
    expect(metrics.successRate).toBeGreaterThan(0);
  });

  it('중복 탐지 메트릭 기록', async () => {
    await statisticService.recordDuplicateMetric('task-1', {
      totalCompared: 1000,
      duplicatesFound: 10,
      exactMatches: 5,
      highSimilarity: 3,
      mediumSimilarity: 2,
      lowSimilarity: 0,
      detectionTimeMs: 1000,
      matchingFields: ['name', 'address'],
    });

    const metrics = await statisticService.getDuplicateMetrics();
    expect(metrics.duplicatesFound).toBeGreaterThanOrEqual(10);
  });

  it('비즈니스 메트릭 증가', async () => {
    const before = await statisticService.getBusinessMetrics();
    await statisticService.recordBusinessMetric('created', 5);
    const after = await statisticService.getBusinessMetrics();

    expect(after.totalBusinesses).toBeGreaterThanOrEqual(before.totalBusinesses);
  });

  it('시스템 메트릭 조회', async () => {
    const metrics = await statisticService.getSystemMetrics();
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.heapUsed).toBeGreaterThan(0);
    expect(metrics.uptime).toBeGreaterThan(0);
  });

  it('대시보드 데이터 조회', async () => {
    const dashboard = await statisticService.getDashboardData();
    expect(dashboard.sync).toBeDefined();
    expect(dashboard.duplicates).toBeDefined();
    expect(dashboard.businesses).toBeDefined();
    expect(dashboard.system).toBeDefined();
    expect(dashboard.updatedAt).toBeInstanceOf(Date);
  });

  it('타임시리즈 조회', async () => {
    await statisticService.recordTimeSeries('test:metric', Date.now(), 42);
    const series = await statisticService.getTimeSeries('test:metric');
    
    expect(Array.isArray(series)).toBe(true);
  });

  it('요약 통계 계산', async () => {
    for (let i = 0; i < 10; i++) {
      await statisticService.recordTimeSeries('test:summary', Date.now() - i * 1000, i * 10);
    }
    
    const summary = await statisticService.getSummary('test:summary');
    expect(summary.count).toBe(10);
    expect(summary.average).toBe(45);
    expect(summary.percentiles.p50).toBeDefined();
  });

  it('카운터 증가/조회', async () => {
    await statisticService.incrementCounter('test:counter', 5);
    const value = await statisticService.getCounter('test:counter');
    expect(value).toBe(5);

    await statisticService.incrementCounter('test:counter', 3);
    const value2 = await statisticService.getCounter('test:counter');
    expect(value2).toBe(8);
  });
});