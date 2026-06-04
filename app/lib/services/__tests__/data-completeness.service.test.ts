import { describe, it, expect } from '@jest/globals';
import {
  evaluateCompleteness,
  scoreToGrade,
  evaluateBatchCompleteness,
  getRequiredFieldsForGrade,
  getFieldDefinitions,
  getIndustryBenchmarks,
} from '../data-completeness.service';

describe('data-completeness.service', () => {
  describe('scoreToGrade', () => {
    it('90점 이상이면 A등급을 반환해야 한다', () => {
      expect(scoreToGrade(90)).toBe('A');
      expect(scoreToGrade(100)).toBe('A');
    });

    it('75점 이상이면 B등급을 반환해야 한다', () => {
      expect(scoreToGrade(75)).toBe('B');
      expect(scoreToGrade(89)).toBe('B');
    });

    it('60점 이상이면 C등급을 반환해야 한다', () => {
      expect(scoreToGrade(60)).toBe('C');
      expect(scoreToGrade(74)).toBe('C');
    });

    it('40점 이상이면 D등급을 반환해야 한다', () => {
      expect(scoreToGrade(40)).toBe('D');
      expect(scoreToGrade(59)).toBe('D');
    });

    it('40점 미만이면 F등급을 반환해야 한다', () => {
      expect(scoreToGrade(0)).toBe('F');
      expect(scoreToGrade(39)).toBe('F');
    });
  });

  describe('evaluateCompleteness', () => {
    it('모든 필드가 있으면 높은 점수를 반환해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        roadNameAddress: '서울시 강남구 테헤란로 123',
        lotNumberAddress: '서울시 강남구 역삼동 123',
        phone: '02-1234-5678',
        latitude: 37.5,
        longitude: 127.0,
        businessCode: 'I56112',
        businessName: '일반음식점',
        indsLclsNm: '음식',
        indsMclsNm: '한식',
        indsSclsNm: '한식음식점',
        status: 'active',
      };

      const result = evaluateCompleteness(business);

      expect(result.totalScore).toBeGreaterThan(80);
      expect(result.grade).toBe('A');
      expect(result.missingFields).toHaveLength(0);
    });

    it('일부 필드가 없으면 점수가 낮아야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        roadNameAddress: '서울시 강남구 테헤란로 123',
      };

      const result = evaluateCompleteness(business);

      expect(result.totalScore).toBeLessThan(50);
      expect(result.grade).toBe('F');
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('빈 객체를 입력하면 0점을 반환해야 한다', () => {
      const result = evaluateCompleteness({});

      expect(result.totalScore).toBe(0);
      expect(result.grade).toBe('F');
    });
  });

  describe('evaluateBatchCompleteness', () => {
    it('배치 평가를 수행해야 한다', () => {
      const businesses = [
        { bizesId: '1', name: '사업체1', phone: '02-1234-5678' },
        { bizesId: '2', name: '사업체2' },
        { bizesId: '3' },
      ];

      const { scores, report } = evaluateBatchCompleteness(businesses);

      expect(scores).toHaveLength(3);
      expect(report.totalBusinesses).toBe(3);
      expect(report.averageScore).toBeGreaterThanOrEqual(0);
      expect(report.averageScore).toBeLessThanOrEqual(100);
    });

    it('빈 배열을 처리해야 한다', () => {
      const { scores, report } = evaluateBatchCompleteness([]);

      expect(scores).toHaveLength(0);
      expect(report.totalBusinesses).toBe(0);
      expect(report.averageScore).toBe(0);
    });
  });

  describe('getRequiredFieldsForGrade', () => {
    it('A등급에 필요한 필드를 반환해야 한다', () => {
      const fields = getRequiredFieldsForGrade('A');
      expect(fields.length).toBeGreaterThan(0);
    });

    it('F등급은 필드가 없어야 한다', () => {
      const fields = getRequiredFieldsForGrade('F');
      expect(fields).toHaveLength(0);
    });
  });

  describe('getFieldDefinitions', () => {
    it('필드 정의 목록을 반환해야 한다', () => {
      const definitions = getFieldDefinitions();
      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0]).toHaveProperty('field');
      expect(definitions[0]).toHaveProperty('label');
      expect(definitions[0]).toHaveProperty('weight');
    });
  });

  describe('getIndustryBenchmarks', () => {
    it('업종별 벤치마크를 반환해야 한다', () => {
      const benchmarks = getIndustryBenchmarks();
      expect(Object.keys(benchmarks).length).toBeGreaterThan(0);
    });
  });

  describe('cross-validation', () => {
    it('교차검증 결과를 포함해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        phone: '02-1234-5678',
        latitude: 37.5,
        longitude: 127.0,
      };

      const result = evaluateCompleteness(business);

      expect(result.crossValidation).toBeDefined();
      expect(result.crossValidation.score).toBeGreaterThanOrEqual(0);
      expect(result.crossValidation.score).toBeLessThanOrEqual(100);
    });

    it('위도가 대한민국 범위를 벗어나면 critical 이슈를 반환해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        latitude: 40.0,
        longitude: 127.0,
      };

      const result = evaluateCompleteness(business);
      const criticalIssues = result.crossValidation.issues.filter(i => i.severity === 'critical');

      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('freshness', () => {
    it('신선도 점수를 포함해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        updatedAt: new Date().toISOString(),
      };

      const result = evaluateCompleteness(business);

      expect(result.freshness).toBeDefined();
      expect(result.freshness.score).toBeGreaterThanOrEqual(0);
      expect(result.freshness.score).toBeLessThanOrEqual(100);
    });

    it('오래된 데이터는 stale로 표시해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        updatedAt: '2020-01-01T00:00:00Z',
      };

      const result = evaluateCompleteness(business);

      expect(result.freshness.isStale).toBe(true);
    });
  });

  describe('industry score', () => {
    it('업종 점수를 포함해야 한다', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        businessCode: 'I56112',
        phone: '02-1234-5678',
      };

      const result = evaluateCompleteness(business);

      expect(result.industryScore).toBeDefined();
      expect(result.industryScore?.industryCode).toBe('I56112');
    });
  });
});
