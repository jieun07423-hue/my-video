import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  setCostConfig,
  getCostConfig,
  getCategories,
  addCategory,
  recordCost,
  recordCorrectionCost,
  recordValidationCost,
  recordReportCost,
  recordFailureCost,
  getCostEntries,
  generateCostReport,
  getCostStats,
  generateCostReportText,
} from '../quality-cost-analysis.service';

describe('QualityCostAnalysisService', () => {
  beforeEach(() => {
    setCostConfig({
      enabled: true,
      currency: 'KRW',
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setCostConfig({ currency: 'USD' });
      const config = getCostConfig();
      expect(config.currency).toBe('USD');
    });

    it('should return default config', () => {
      const config = getCostConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('currency');
    });
  });

  describe('category management', () => {
    it('should get categories', () => {
      const cats = getCategories();
      expect(Array.isArray(cats)).toBe(true);
      expect(cats.length).toBeGreaterThan(0);
    });

    it('should add category', () => {
      const cat = addCategory('테스트 카테고리', '설명', 'prevention');
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name', '테스트 카테고리');
      expect(cat).toHaveProperty('type', 'prevention');
    });
  });

  describe('cost recording', () => {
    it('should record cost', () => {
      const entry = recordCost('cat-prevention', '데이터 검증 자동화 개발', 1, 500000, '1234567890');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('categoryId', 'cat-prevention');
      expect(entry).toHaveProperty('totalCost', 500000);
      expect(entry).toHaveProperty('businessId', '1234567890');
      expect(entry).toHaveProperty('timestamp');
    });

    it('should record cost without businessId', () => {
      const entry = recordCost('cat-detection', '품질 점검', 1, 100000);
      expect(entry).toHaveProperty('id');
      expect(entry.businessId).toBeUndefined();
    });

    it('should record correction cost', () => {
      const entry = recordCorrectionCost('biz-123', 5);
      expect(entry).toHaveProperty('categoryId', 'cat-correction');
      expect(entry).toHaveProperty('quantity', 5);
    });

    it('should record validation cost', () => {
      const entry = recordValidationCost('biz-456', 10);
      expect(entry).toHaveProperty('categoryId', 'cat-detection');
      expect(entry).toHaveProperty('quantity', 10);
    });

    it('should record report cost', () => {
      const entry = recordReportCost(3);
      expect(entry).toHaveProperty('categoryId', 'cat-detection');
      expect(entry).toHaveProperty('quantity', 3);
    });

    it('should record failure cost', () => {
      const entry = recordFailureCost('biz-789', '데이터 손실', 2);
      expect(entry).toHaveProperty('categoryId', 'cat-failure');
      expect(entry).toHaveProperty('businessId', 'biz-789');
    });
  });

  describe('cost entries', () => {
    it('should get cost entries', () => {
      recordCost('cat-prevention', 'A', 1, 100000);
      recordCost('cat-failure', 'B', 1, 300000);

      const entries = getCostEntries();
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category', () => {
      recordCost('cat-prevention', 'P1', 1, 100000);
      recordCost('cat-failure', 'F1', 1, 200000);

      const filtered = getCostEntries({ categoryId: 'cat-prevention' });
      filtered.forEach(e => expect(e.categoryId).toBe('cat-prevention'));
    });

    it('should filter by businessId', () => {
      recordCost('cat-prevention', 'X', 1, 100000, 'aaa');
      recordCost('cat-prevention', 'Y', 1, 100000, 'bbb');

      const filtered = getCostEntries({ businessId: 'aaa' });
      filtered.forEach(e => expect(e.businessId).toBe('aaa'));
    });
  });

  describe('cost stats', () => {
    it('should return cost stats', () => {
      const stats = getCostStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('averageCostPerEntry');
      expect(stats).toHaveProperty('topExpensiveCategories');
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.totalCost).toBe('number');
      expect(typeof stats.averageCostPerEntry).toBe('number');
      expect(Array.isArray(stats.topExpensiveCategories)).toBe(true);
    });
  });

  describe('report generation', () => {
    it('should generate cost report', () => {
      recordCost('cat-prevention', 'R1', 1, 100000);

      const now = new Date();
      const periodStart = new Date(now.getTime() - 86400000 * 30);
      const report = generateCostReport(periodStart, now);
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');
    });

    it('should generate cost report text', () => {
      recordCost('cat-prevention', 'T1', 1, 100000);

      const now = new Date();
      const periodStart = new Date(now.getTime() - 86400000 * 30);
      const report = generateCostReport(periodStart, now);
      const text = generateCostReportText(report);
      expect(typeof text).toBe('string');
      expect(text).toContain('데이터 품질 비용 리포트');
    });
  });
});
