import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  analyzeFieldForCorrections,
  applyCorrections,
  getCorrectionHistory,
  generateCorrectionReport,
} from '../quality/data-correction.service';

describe('DataCorrectionService', () => {
  const mockBusinesses = [
    {
      bizesId: '1234567890',
      name: '테스트 사업자',
      roadNameAddress: '서울시 강남구 테스트로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '02-1234-5678',
      latitude: 37.5665,
      longitude: 126.978,
      businessCode: 'I56112',
      businessName: '테스트 업종',
      indsLclsNm: '정보통신',
      indsMclsNm: '정보처리',
      indsSclsNm: '소프트웨어',
      status: 'active',
      updatedAt: new Date(),
    },
    {
      bizesId: '0987654321',
      name: '다른 사업자',
      roadNameAddress: '서울시 서초구 테스트로 456',
      lotNumberAddress: '서울시 서초구 서초동 456-78',
      phone: '031-123-4567',
      latitude: 37.4837,
      longitude: 127.0074,
      businessCode: 'G47121',
      businessName: '다른 업종',
      indsLclsNm: '도매소매',
      indsMclsNm: '종합소매',
      indsSclsNm: '백화점',
      status: 'active',
      updatedAt: new Date(),
    },
  ];

  describe('analyzeFieldForCorrections', () => {
    it('should analyze phone field for corrections', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'phone');

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('businessId');
        expect(suggestion).toHaveProperty('field');
        expect(suggestion).toHaveProperty('currentValue');
        expect(suggestion).toHaveProperty('suggestedValue');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
      });
    });

    it('should analyze name field for corrections', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'name');

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('businessId');
        expect(suggestion).toHaveProperty('field');
        expect(suggestion).toHaveProperty('currentValue');
        expect(suggestion).toHaveProperty('suggestedValue');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
      });
    });

    it('should analyze address field for corrections', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'roadNameAddress');

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('businessId');
        expect(suggestion).toHaveProperty('field');
        expect(suggestion).toHaveProperty('currentValue');
        expect(suggestion).toHaveProperty('suggestedValue');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
      });
    });
  });

  describe('applyCorrections', () => {
    it('should apply corrections in dry run mode', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'phone');
      const result = applyCorrections(mockBusinesses, suggestions, {
        autoApplyHighConfidence: false,
        dryRun: true,
      });

      expect(result).toHaveProperty('totalBusinesses');
      expect(result).toHaveProperty('totalSuggestions');
      expect(result).toHaveProperty('appliedCorrections');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('processedAt');

      expect(result.totalBusinesses).toBe(mockBusinesses.length);
      expect(result.totalSuggestions).toBe(suggestions.length);
      expect(typeof result.appliedCorrections).toBe('number');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should apply corrections with auto-apply for high confidence', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'phone');
      const result = applyCorrections(mockBusinesses, suggestions, {
        autoApplyHighConfidence: true,
        dryRun: false,
      });

      expect(result).toHaveProperty('totalBusinesses');
      expect(result).toHaveProperty('totalSuggestions');
      expect(result).toHaveProperty('appliedCorrections');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('processedAt');
    });
  });

  describe('getCorrectionHistory', () => {
    it('should get correction history', () => {
      const history = getCorrectionHistory();

      expect(Array.isArray(history)).toBe(true);
      history.forEach(entry => {
        expect(entry).toHaveProperty('businessId');
        expect(entry).toHaveProperty('field');
        expect(entry).toHaveProperty('currentValue');
        expect(entry).toHaveProperty('suggestedValue');
        expect(entry).toHaveProperty('confidence');
        expect(entry).toHaveProperty('reason');
        expect(entry).toHaveProperty('type');
        expect(entry).toHaveProperty('priority');
        expect(entry).toHaveProperty('applied');
      });
    });

    it('should get correction history for specific business', () => {
      const businessId = '1234567890';
      const history = getCorrectionHistory(businessId);

      expect(Array.isArray(history)).toBe(true);
      history.forEach(entry => {
        expect(entry.businessId).toBe(businessId);
      });
    });
  });

  describe('generateCorrectionReport', () => {
    it('should generate correction report as string', () => {
      const suggestions = analyzeFieldForCorrections(mockBusinesses, 'phone');
      const result = applyCorrections(mockBusinesses, suggestions, {
        autoApplyHighConfidence: false,
        dryRun: true,
      });

      const report = generateCorrectionReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('데이터 보정 리포트');
      expect(report).toContain('요약');
    });
  });
});
