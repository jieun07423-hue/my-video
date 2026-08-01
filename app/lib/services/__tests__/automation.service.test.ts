import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock redis module before importing the service
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
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
}), { virtual: true });

// Mock dependent services
jest.mock('@/lib/services/statistic.service', () => ({
  statisticService: {
    getDuplicateMetrics: jest.fn().mockResolvedValue({
      topMatchFields: { name: 10, address: 5 },
      exactMatches: 0,
    }),
    getSyncMetrics: jest.fn().mockResolvedValue({
      successRate: 95,
      averageProcessingTimeMs: 1000,
      errorsByType: {},
    }),
    getSystemMetrics: jest.fn().mockResolvedValue({
      memoryUsage: 50,
      cpuUsage: 30,
    }),
    getBusinessMetrics: jest.fn().mockResolvedValue({}),
    incrementCounter: jest.fn().mockResolvedValue(1),
  },
}), { virtual: true });

jest.mock('@/lib/services/validation.service', () => ({
  validationService: {
    addCustomRule: jest.fn(),
  },
}), { virtual: true });

jest.mock('@/lib/services/event-publisher', () => ({
  eventPublisher: {
    publishError: jest.fn().mockResolvedValue('event-id'),
    publishSystemHealth: jest.fn().mockResolvedValue('event-id'),
  },
}), { virtual: true });

import { automationService } from '../automation.service';

describe('AutomationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('규칙 생성', async () => {
    const rule = await automationService.createRule({
      name: '테스트 규칙',
      description: '테스트용 규칙',
      type: 'validation',
      condition: "context.field === 'test'",
      action: { type: 'alert', params: { message: '테스트 알림' } },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('테스트 규칙');
    expect(rule.enabled).toBe(true);
  });

  it('규칙 조회', async () => {
    const created = await automationService.createRule({
      name: '조회 테스트',
      description: '조회용',
      type: 'sync',
      condition: 'true',
      action: { type: 'alert', params: { message: 'test' } },
      enabled: true,
      priority: 5,
      createdBy: 'user',
    });

    const retrieved = await automationService.getRule(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('조회 테스트');
  });

  it('규칙 업데이트', async () => {
    const created = await automationService.createRule({
      name: '업데이트 전',
      description: '업데이트 테스트',
      type: 'validation',
      condition: 'true',
      action: { type: 'alert', params: { message: 'before' } },
      enabled: true,
      priority: 1,
      createdBy: 'user',
    });

    const updated = await automationService.updateRule(created.id, {
      name: '업데이트 후',
      priority: 100,
    });

    expect(updated!.name).toBe('업데이트 후');
    expect(updated!.priority).toBe(100);
  });

  it('규칙 삭제', async () => {
    const created = await automationService.createRule({
      name: '삭제 대상',
      description: '삭제 테스트',
      type: 'validation',
      condition: 'true',
      action: { type: 'alert', params: { message: 'test' } },
      enabled: true,
      priority: 1,
      createdBy: 'user',
    });

    const deleted = await automationService.deleteRule(created.id);
    expect(deleted).toBe(true);

    const retrieved = await automationService.getRule(created.id);
    expect(retrieved).toBeUndefined();
  });

  it('규칙 평가 - 조건 일치', async () => {
    await automationService.createRule({
      name: '조건 일치 규칙',
      description: '테스트',
      type: 'validation',
      condition: "context.value > 10",
      action: { type: 'alert', params: { message: 'triggered' } },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    const results = await automationService.evaluateRules({ value: 20 });
    expect(results[0].triggered).toBe(true);
  });

  it('규칙 평가 - 조건 불일치', async () => {
    await automationService.createRule({
      name: '조건 불일치 규칙',
      description: '테스트',
      type: 'validation',
      condition: "context.value > 10",
      action: { type: 'alert', params: { message: 'triggered' } },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    const results = await automationService.evaluateRules({ value: 5 });
    expect(results[0].triggered).toBe(false);
    expect(results[0].reason).toBe('조건 불일치');
  });

  it('비활성화된 규칙은 평가 안 함', async () => {
    await automationService.createRule({
      name: '비활성화 규칙',
      description: '테스트',
      type: 'validation',
      condition: 'true',
      action: { type: 'alert', params: { message: 'triggered' } },
      enabled: false,
      priority: 10,
      createdBy: 'user',
    });

    const results = await automationService.evaluateRules({});
    const disabledRule = results.find(r => r.ruleName === '비활성화 규칙');
    expect(disabledRule).toBeUndefined();
  });

  it('알림 액션 실행', async () => {
    const rule = await automationService.createRule({
      name: '알림 규칙',
      description: '알림 테스트',
      type: 'validation',
      condition: 'true',
      action: { type: 'alert', params: { message: '테스트 알림', severity: 'high' } },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    const results = await automationService.evaluateRules({});
    const alertRule = results.find(r => r.ruleName === '알림 규칙');
    expect(alertRule?.triggered).toBe(true);
    expect(alertRule?.actionTaken).toBe('알림 발송됨');
  });

  it('자동 검증 규칙 추가 액션', async () => {
    const rule = await automationService.createRule({
      name: '자동 검증 규칙',
      description: '자동 검증 추가',
      type: 'validation',
      condition: 'true',
      action: { 
        type: 'add_validation', 
        params: { field: 'customField', code: 'too_small', suggestion: '최소값 검증' } 
      },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    const results = await automationService.evaluateRules({});
    const validationRule = results.find(r => r.ruleName === '자동 검증 규칙');
    expect(validationRule?.triggered).toBe(true);
    expect(validationRule?.actionTaken).toBe('자동 검증 규칙 추가됨');
  });

  it('전체 규칙 목록 조회', async () => {
    await automationService.createRule({
      name: '규칙1',
      description: '테스트',
      type: 'validation',
      condition: 'true',
      action: { type: 'alert', params: { message: 'test' } },
      enabled: true,
      priority: 10,
      createdBy: 'user',
    });

    await automationService.createRule({
      name: '규칙2',
      description: '테스트',
      type: 'sync',
      condition: 'true',
      action: { type: 'alert', params: { message: 'test' } },
      enabled: true,
      priority: 5,
      createdBy: 'user',
    });

    const rules = await automationService.getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules[0].priority).toBeGreaterThanOrEqual(rules[1].priority);
  });

  it('설정 업데이트', () => {
    automationService.updateConfig({
      analysisIntervalHours: 6,
      minPatternFrequency: 10,
    });

    const config = automationService.getConfig();
    expect(config.analysisIntervalHours).toBe(6);
    expect(config.minPatternFrequency).toBe(10);
  });
});