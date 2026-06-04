import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  runQualityCheck,
  runQualityCheckBatch,
  getCheckHistory,
  getCheckStats,
  generateCheckReport,
  setQualityCheckConfig,
  getQualityCheckConfig,
  addQualityCheckRule,
  removeQualityCheckRule,
  getQualityCheckRules,
} from '../realtime-quality-check.service';

describe('RealtimeQualityCheckService', () => {
  beforeEach(() => {
    setQualityCheckConfig({
      enabled: true,
      blockingMode: false,
      timeout: 5000,
      retryCount: 3,
      notifyOnFailure: true,
    });
  });

  describe('runQualityCheck', () => {
    it('should run quality check on a valid business', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
        roadNameAddress: '서울시 강남구 테헤란로 123',
      };

      const result = runQualityCheck(business, 'sync');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('businessId', '1234567890');
      expect(result).toHaveProperty('checkType', 'sync');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('duration');
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should mark invalid fields as failed', () => {
      const business = {
        bizesId: 'invalid-id',
        name: '',
        phone: 'invalid-phone',
        latitude: 999,
        longitude: 999,
      };

      const result = runQualityCheck(business);

      expect(result.status).toBe('failed');
      const failedChecks = result.checks.filter(c => c.status === 'failed');
      expect(failedChecks.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields gracefully', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
      };

      const result = runQualityCheck(business);

      expect(result.status).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runQualityCheckBatch', () => {
    it('should run batch quality check on multiple businesses', () => {
      const businesses = [
        { bizesId: '1234567890', name: '사업장1' },
        { bizesId: '0987654321', name: '사업장2' },
        { bizesId: '1111111111', name: '사업장3' },
      ];

      const results = runQualityCheckBatch(businesses, 'batch');

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('checkType', 'batch');
        expect(result).toHaveProperty('overallScore');
      });
    });

    it('should handle empty array', () => {
      const results = runQualityCheckBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getCheckHistory', () => {
    it('should return check history', () => {
      const business = { bizesId: '1234567890', name: '테스트' };
      runQualityCheck(business);

      const history = getCheckHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by businessId', () => {
      const business1 = { bizesId: '1111111111', name: '사업장1' };
      const business2 = { bizesId: '2222222222', name: '사업장2' };
      runQualityCheck(business1);
      runQualityCheck(business2);

      const history = getCheckHistory('1111111111');
      history.forEach(h => {
        expect(h.businessId).toBe('1111111111');
      });
    });
  });

  describe('getCheckStats', () => {
    it('should return check statistics', () => {
      const stats = getCheckStats();

      expect(stats).toHaveProperty('totalChecks');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('passRate');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('statusDistribution');
      expect(typeof stats.totalChecks).toBe('number');
      expect(typeof stats.averageScore).toBe('number');
      expect(typeof stats.passRate).toBe('number');
    });
  });

  describe('generateCheckReport', () => {
    it('should generate a readable report', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
      };

      const result = runQualityCheck(business);
      const report = generateCheckReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('품질 검증 리포트');
      expect(report).toContain(result.businessId);
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setQualityCheckConfig({ timeout: 10000, blockingMode: true });
      const config = getQualityCheckConfig();

      expect(config.timeout).toBe(10000);
      expect(config.blockingMode).toBe(true);
    });
  });

  describe('rule management', () => {
    it('should add and remove custom rules', () => {
      const initialCount = getQualityCheckRules().length;

      const customRule = {
        id: 'custom-rule-1',
        name: '커스텀 검증 규칙',
        category: '커스텀',
        enabled: true,
        priority: 100,
        check: (business: Record<string, any>) => ({
          checkId: 'custom-check',
          name: '커스텀 검증',
          category: '커스텀',
          status: 'passed' as const,
          message: '커스텀 검증 통과',
          severity: 'low' as const,
          duration: 0,
        }),
      };

      addQualityCheckRule(customRule);
      expect(getQualityCheckRules().length).toBe(initialCount + 1);

      const removed = removeQualityCheckRule('custom-rule-1');
      expect(removed).toBe(true);
      expect(getQualityCheckRules().length).toBe(initialCount);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = removeQualityCheckRule('non-existent');
      expect(removed).toBe(false);
    });
  });
});
