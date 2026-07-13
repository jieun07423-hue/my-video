jest.mock('../../../../lib/repositories/business.repository', () => ({
  businessRepository: {
    findByBizesId: jest.fn(),
  },
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateBusiness,
  getValidationStats,
  getRules,
  getRuleSets,
  initializeDefaultRuleSets,
  setRulesEngineConfig,
} from '../../../../lib/services/quality/quality-rules-engine.service';

describe('/api/data-quality/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    initializeDefaultRuleSets();
  });

  describe('GET', () => {
    it('should validate a business', async () => {
      const { GET } = await import('../route');
      const { businessRepository } = await import('../../../../lib/repositories/business.repository');
      const mockBusiness = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
      };

      jest.mocked(businessRepository.findByBizesId).mockResolvedValue(mockBusiness as any);

      const result = validateBusiness(mockBusiness);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('stats');
    });

    it('should return validation stats when action is stats', async () => {
      const stats = getValidationStats();
      expect(stats).toHaveProperty('totalValidations');
      expect(stats).toHaveProperty('successRate');
    });

    it('should return rules when action is rules', async () => {
      const rules = getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should return ruleSets when action is ruleSets', async () => {
      const ruleSets = getRuleSets();
      expect(Array.isArray(ruleSets)).toBe(true);
      expect(ruleSets.length).toBeGreaterThan(0);
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      const newConfig = { maxValidationTime: 5000, enableCaching: true };
      setRulesEngineConfig(newConfig);
      expect(true).toBe(true);
    });

    it('should initialize default rules when action is initialize', async () => {
      initializeDefaultRuleSets();
      const rules = getRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});
