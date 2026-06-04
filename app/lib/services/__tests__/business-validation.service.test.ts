import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateBusinessRegistration,
  calculateCheckDigit,
  batchValidateBusinesses,
  formatBizesId,
  getValidationHistory,
  clearCache,
  getCacheStats,
} from '../business-validation.service';

jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: jest.fn(),
}));

describe('business-validation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATA_GO_KR_SERVICE_KEY = 'test-service-key';
    clearCache();
  });

  describe('calculateCheckDigit', () => {
    it('유효한 사업자등록번호는 true를 반환해야 한다', () => {
      expect(calculateCheckDigit('1234567890')).toBe(true);
    });

    it('잘못된 사업자등록번호는 false를 반환해야 한다', () => {
      expect(calculateCheckDigit('1234567891')).toBe(false);
    });

    it('10자리가 아닌 번호는 false를 반환해야 한다', () => {
      expect(calculateCheckDigit('123456789')).toBe(false);
      expect(calculateCheckDigit('12345678901')).toBe(false);
    });

    it('숫자가 아닌 문자가 포함된 번호는 false를 반환해야 한다', () => {
      expect(calculateCheckDigit('12345abcde')).toBe(false);
    });
  });

  describe('formatBizesId', () => {
    it('10자리 숫자를 하이픈 포함 형식으로 변환해야 한다', () => {
      expect(formatBizesId('1234567890')).toBe('123-45-67890');
    });

    it('하이픈이 포함된 번호를 정규화해야 한다', () => {
      expect(formatBizesId('123-45-67890')).toBe('123-45-67890');
    });

    it('10자리가 아닌 번호는 그대로 반환해야 한다', () => {
      expect(formatBizesId('123456789')).toBe('123456789');
    });
  });

  describe('validateBusinessRegistration', () => {
    it('API 키가 없으면 에러를 반환해야 한다', async () => {
      delete process.env.DATA_GO_KR_SERVICE_KEY;
      const result = await validateBusinessRegistration('1234567890');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('API 키가 설정되지 않았습니다');
    });

    it('10자리가 아닌 번호는 에러를 반환해야 한다', async () => {
      const result = await validateBusinessRegistration('123456789');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10자리 숫자여야 합니다');
    });

    it('캐시를 사용할 수 있어야 한다', async () => {
      const result1 = await validateBusinessRegistration('1234567890', undefined, { useCache: true });
      const result2 = await validateBusinessRegistration('1234567890', undefined, { useCache: true });

      expect(result1.fromCache).toBeFalsy();
      expect(result2.fromCache).toBe(true);
    });

    it('검증 이력을 추적해야 한다', async () => {
      await validateBusinessRegistration('1234567890', undefined, { trackHistory: true });
      const history = getValidationHistory('1234567890');

      expect(history.length).toBe(1);
      expect(history[0].bizesId).toBe('1234567890');
    });

    it('캐시 통계를 반환해야 한다', async () => {
      await validateBusinessRegistration('1234567890', undefined, { useCache: true });
      const stats = getCacheStats();

      expect(stats.size).toBe(1);
    });
  });

  describe('batchValidateBusinesses', () => {
    it('빈 배열을 처리해야 한다', async () => {
      const result = await batchValidateBusinesses([]);

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.summary.cacheHitRate).toBe(0);
    });

    it('배치 검증 요약을 반환해야 한다', async () => {
      const result = await batchValidateBusinesses(['1234567890']);

      expect(result.summary).toBeDefined();
      expect(result.summary.averageValidationTime).toBeGreaterThanOrEqual(0);
      expect(result.summary.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.retryRate).toBeGreaterThanOrEqual(0);
    });
  });
});
