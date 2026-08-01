import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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

import { rateLimitService, RetryService, CircuitBreaker } from '../rate-limit-retry.service';

describe('RateLimitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitService.reset('test-key');
  });

  it('요청 허용 시 remaining 감소해야 함', async () => {
    rateLimitService.setLimit('test-key', { maxRequests: 10, windowMs: 60000, keyPrefix: 'test' });
    
    const result = await rateLimitService.checkLimit('test-key', 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('속도 제한 초과 시 거부해야 함', async () => {
    rateLimitService.setLimit('test-key', { maxRequests: 2, windowMs: 60000, keyPrefix: 'test' });
    
    await rateLimitService.checkLimit('test-key', 1);
    await rateLimitService.checkLimit('test-key', 1);
    const result = await rateLimitService.checkLimit('test-key', 1);
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('리셋 후 다시 요청 가능해야 함', async () => {
    rateLimitService.setLimit('test-key', { maxRequests: 1, windowMs: 60000, keyPrefix: 'test' });
    
    await rateLimitService.checkLimit('test-key', 1);
    rateLimitService.reset('test-key');
    const result = await rateLimitService.checkLimit('test-key', 1);
    
    expect(result.allowed).toBe(true);
  });
});

describe('RetryService', () => {
  it('성공 시 첫 시도에서 반환해야 함', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const retryService = new RetryService({ maxRetries: 3 });
    const result = await retryService.execute(fn);
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('실패 후 재시도 성공 시 반환해야 함 (네트워크 에러 코드)', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }))
      .mockResolvedValue('success');
    
    const retryService = new RetryService({ maxRetries: 3 });
    const result = await retryService.execute(fn);
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('최대 재시도 횟수 초과 시 실패해야 함', async () => {
    const fn = jest.fn().mockRejectedValue(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }));
    const retryService = new RetryService({ maxRetries: 2 });
    
    const result = await retryService.execute(fn);
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('재시도 불가능한 에러(400 status)는 즉시 실패해야 함', async () => {
    const error = Object.assign(new Error('검증 오류'), { status: 400 });
    console.log('Test error:', error);
    console.log('status in error:', 'status' in error);
    console.log('error.status:', error.status);
    console.log('typeof error.status:', typeof error.status);
    console.log('includes 400:', [429, 500, 502, 503, 504].includes(error.status));
    
    const fn = jest.fn().mockRejectedValue(error);
    
    const retryService = new RetryService({ maxRetries: 3 });
    const result = await retryService.execute(fn);
    
    console.log('Result:', result);
    console.log('Attempts:', result.attempts);
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('retryableStatusCodes에 없는 500 에러는 재시도해야 함', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Internal Server Error'), { status: 500 }))
      .mockResolvedValue('success');
    
    const retryService = new RetryService({ maxRetries: 3 });
    const result = await retryService.execute(fn);
    
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('onRetry 콜백이 호출되어야 함', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }))
      .mockResolvedValue('success');
    
    const retryService = new RetryService({ maxRetries: 3 });
    await retryService.execute(fn, { onRetry });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });

  it('shouldRetry 커스텀 함수로 재시도 제어', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Custom error'))
      .mockResolvedValue('success');
    
    const retryService = new RetryService({ maxRetries: 3 });
    const result = await retryService.execute(fn, {
      shouldRetry: (error) => error.message === 'Custom error',
    });
    
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });
});

describe('CircuitBreaker', () => {
  it('성공 시 닫힌 상태 유지', async () => {
    const breaker = new CircuitBreaker(3, 60000);
    const fn = jest.fn().mockResolvedValue('success');
    
    await breaker.execute(fn);
    await breaker.execute(fn);
    
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailures()).toBe(0);
  });

  it('실패 임계값 초과 시 열림 상태로 전환', async () => {
    const breaker = new CircuitBreaker(2, 60000);
    const fn = jest.fn().mockRejectedValue(new Error('서버 오류'));
    
    try { await breaker.execute(fn); } catch {}
    try { await breaker.execute(fn); } catch {}
    
    expect(breaker.getState()).toBe('open');
  });

  it('열린 상태에서 요청 차단', async () => {
    const breaker = new CircuitBreaker(1, 60000);
    const fn = jest.fn().mockRejectedValue(new Error('서버 오류'));
    
    try { await breaker.execute(fn); } catch {}
    
    await expect(breaker.execute(fn)).rejects.toThrow('서킷 브레이커가 열려 있습니다');
  });

  it('리셋 시 닫힌 상태로 복구', async () => {
    const breaker = new CircuitBreaker(1, 60000);
    const fn = jest.fn().mockRejectedValue(new Error('서버 오류'));
    
    try { await breaker.execute(fn); } catch {}
    breaker.reset();
    
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailures()).toBe(0);
  });

  it('반개방 상태에서 성공 시 닫힌 상태 복구', async () => {
    const breaker = new CircuitBreaker(1, 10);
    const fn = jest.fn().mockRejectedValue(new Error('서버 오류'));
    
    try { await breaker.execute(fn); } catch {}
    expect(breaker.getState()).toBe('open');
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    fn.mockResolvedValue('success');
    await breaker.execute(fn);
    
    expect(breaker.getState()).toBe('closed');
  });
});