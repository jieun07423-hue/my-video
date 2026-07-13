import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateField,
  validateBusiness,
  validateBusinessBatch,
  getValidationStats,
  generateValidationReport,
  createRule,
  createRuleSet,
  getRules,
  getRuleSets,
  initializeDefaultRuleSets,
  setRulesEngineConfig,
  getRulesEngineConfig,
} from '../quality/quality-rules-engine.service';

describe('QualityRulesEngineService', () => {
  beforeEach(() => {
    initializeDefaultRuleSets();
  });

  describe('validateField', () => {
    it('should validate a valid field value', () => {
      const result = validateField('businessId', '1234567890');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field value', () => {
      const result = validateField('businessId', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate with specific ruleSet', () => {
      const result = validateField('businessId', '1234567890', 'default');
      expect(result).toHaveProperty('isValid');
    });
  });

  describe('validateBusiness', () => {
    it('should validate a complete business object', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
      };

      const result = validateBusiness(business);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('validatedAt');
    });

    it('should detect multiple validation errors', () => {
      const business = {
        bizesId: 'invalid-id',
        name: '',
        phone: 'invalid-phone',
      };

      const result = validateBusiness(business);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateBusinessBatch', () => {
    it('should validate multiple businesses', () => {
      const businesses = [
        { bizesId: '1234567890', name: '사업장1' },
        { bizesId: '0987654321', name: '사업장2' },
        { bizesId: '1111111111', name: '사업장3' },
      ];

      const results = validateBusinessBatch(businesses);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
      });
    });

    it('should handle empty array', () => {
      const results = validateBusinessBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getValidationStats', () => {
    it('should return validation statistics', () => {
      const business = { bizesId: '1234567890', name: '테스트' };
      validateBusiness(business);

      const stats = getValidationStats();
      expect(stats).toHaveProperty('totalValidations');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('commonErrors');
      expect(stats).toHaveProperty('averageDuration');
      expect(typeof stats.totalValidations).toBe('number');
    });
  });

  describe('generateValidationReport', () => {
    it('should generate a report for a business', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
      };

      const report = generateValidationReport(business);
      expect(typeof report).toBe('string');
      expect(report).toContain('규칙 엔진 검증 리포트');
      expect(report).toContain(business.name);
    });

    it('should generate a summary report', () => {
      const report = generateValidationReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('규칙 엔진 검증 리포트');
    });
  });

  describe('rule and ruleSet management', () => {
    it('should create a new rule', () => {
      const initialCount = getRules().length;
      const rule = {
        name: '커스텀 규칙',
        description: '테스트 규칙',
        field: 'testField',
        type: 'required' as const,
        message: '테스트 필드는 필수입니다',
        severity: 'error' as const,
      };

      const newRule = createRule(rule);
      expect(newRule).toHaveProperty('id');
      expect(newRule.name).toBe('커스텀 규칙');
      expect(getRules().length).toBe(initialCount + 1);
    });

    it('should create a new ruleSet', () => {
      const initialCount = getRuleSets().length;
      const ruleSet = {
        name: '커스텀 규칙 세트',
        description: '테스트 규칙 세트',
        rules: [],
      };

      const newRuleSet = createRuleSet(ruleSet);
      expect(newRuleSet).toHaveProperty('id');
      expect(newRuleSet.name).toBe('커스텀 규칙 세트');
      expect(getRuleSets().length).toBe(initialCount + 1);
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setRulesEngineConfig({ maxValidationTime: 5000, enableCaching: true });
      const config = getRulesEngineConfig();
      expect(config.maxValidationTime).toBe(5000);
      expect(config.enableCaching).toBe(true);
    });
  });
});
