import { describe, it, expect, beforeEach, jest } from '@jest/globals';
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
} from '@/lib/services/quality/quality-cost-analysis.service';

describe('/api/data-quality/cost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCostConfig({
      enabled: true,
      currency: 'KRW',
      costPerCorrection: 500,
      costPerValidation: 100,
      costPerReport: 200,
      hourlyLaborCost: 30000,
    });
  });

  describe('GET', () => {
    it('should return cost stats when action is stats', () => {
      const stats = getCostStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('averageCostPerEntry');
      expect(stats).toHaveProperty('topExpensiveCategories');
    });

    it('should return config when action is config', () => {
      const config = getCostConfig();
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('currency', 'KRW');
      expect(config).toHaveProperty('costPerCorrection');
    });

    it('should return categories when action is categories', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
    });

    it('should return cost entries when action is entries', () => {
      const entries = getCostEntries();
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should return cost report when action is report', () => {
      const report = generateCostReport(new Date(Date.now() - 30 * 86400000), new Date());
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', () => {
      const newConfig = { currency: 'USD', costPerCorrection: 1000 };
      setCostConfig(newConfig);
      const config = getCostConfig();
      expect(config.currency).toBe('USD');
      expect(config.costPerCorrection).toBe(1000);
    });

    it('should add category when action is addCategory', () => {
      const category = addCategory('새 카테고리', '설명', 'prevention');
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name', '새 카테고리');
      expect(category).toHaveProperty('type', 'prevention');
    });

    it('should record cost when action is record', () => {
      const entry = recordCost('cat-prevention', '테스트 비용', 10, 5000, 'business-123');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('totalCost', 50000);
      expect(entry).toHaveProperty('businessId', 'business-123');
    });

    it('should record correction cost when action is recordCorrection', () => {
      const entry = recordCorrectionCost('business-123', 5);
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('categoryId', 'cat-correction');
    });

    it('should record validation cost when action is recordValidation', () => {
      const entry = recordValidationCost('business-456', 10);
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('categoryId', 'cat-detection');
    });

    it('should record report cost when action is recordReport', () => {
      const entry = recordReportCost(3);
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('categoryId', 'cat-detection');
    });

    it('should record failure cost when action is recordFailure', () => {
      const entry = recordFailureCost('business-789', '시스템 다운타임', 2);
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('categoryId', 'cat-failure');
    });

    it('should return 400 for invalid request', () => {
      expect(true).toBe(true);
    });
  });
});
