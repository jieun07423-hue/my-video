import { describe, it, expect } from '@jest/globals';
import { detectDuplicates, mergeBusinessData, getDuplicateStatistics } from '../duplicate-detection.service';

describe('duplicate-detection.service', () => {
  describe('detectDuplicates', () => {
    it('동일한 이름과 주소를 가진 사업체를 탐지해야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '테스트 식당',
          roadNameAddress: '서울시 강남구 테헤란로 123',
          phone: '02-1234-5678',
          businessCode: 'I56112',
        },
        {
          bizesId: '2',
          name: '테스트 식당',
          roadNameAddress: '서울시 강남구 테헤란로 123',
          phone: '02-1234-5678',
          businessCode: 'I56112',
        },
      ];

      const result = detectDuplicates(businesses);

      expect(result.duplicatesFound).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchType).toBe('exact');
    });

    it('유사한 이름을 가진 사업체를 탐지해야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '강남 치과',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
        {
          bizesId: '2',
          name: '강남치과',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
      ];

      const result = detectDuplicates(businesses);

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });

    it('다른 사업체는 중복으로 탐지하지 않아야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '강남 치과',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
        {
          bizesId: '2',
          name: '서울 미용실',
          roadNameAddress: '서울시 종로구 세종대로 456',
        },
      ];

      const result = detectDuplicates(businesses);

      expect(result.duplicatesFound).toBe(0);
    });

    it('빈 배열을 처리해야 한다', () => {
      const result = detectDuplicates([]);

      expect(result.totalCompared).toBe(0);
      expect(result.duplicatesFound).toBe(0);
      expect(result.candidates).toEqual([]);
    });

    it('하나의 사업체만 있으면 중복을 탐지하지 않아야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '테스트 식당',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
      ];

      const result = detectDuplicates(businesses);

      expect(result.duplicatesFound).toBe(0);
    });
  });

  describe('mergeBusinessData', () => {
    it('두 사업체 데이터를 병합해야 한다', () => {
      const primary = {
        bizesId: '1',
        name: '메인 사업체',
        roadNameAddress: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
      };

      const secondary = {
        bizesId: '2',
        name: '메인 사업체',
        roadNameAddress: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        latitude: 37.5,
        longitude: 127.0,
      };

      const result = mergeBusinessData(primary, secondary);

      expect(result.bizesId).toBe('1');
      expect(result.name).toBe('메인 사업체');
      expect(result.latitude).toBe(37.5);
      expect(result.longitude).toBe(127.0);
    });

    it('메인 데이터의 값이 우선해야 한다', () => {
      const primary = {
        bizesId: '1',
        name: '메인 사업체',
        phone: '02-1234-5678',
      };

      const secondary = {
        bizesId: '2',
        name: '서브 사업체',
        phone: '02-9999-9999',
      };

      const result = mergeBusinessData(primary, secondary);

      expect(result.name).toBe('메인 사업체');
      expect(result.phone).toBe('02-1234-5678');
    });

    it('메인 데이터에 없는 필드는 서브 데이터로 채워야 한다', () => {
      const primary = {
        bizesId: '1',
        name: '메인 사업체',
      };

      const secondary = {
        bizesId: '2',
        name: '서브 사업체',
        latitude: 37.5,
        longitude: 127.0,
      };

      const result = mergeBusinessData(primary, secondary);

      expect(result.latitude).toBe(37.5);
      expect(result.longitude).toBe(127.0);
    });

    it('병합 횟수를 추적해야 한다', () => {
      const primary = {
        bizesId: '1',
        name: '메인 사업체',
        mergeCount: 1,
      };

      const secondary = {
        bizesId: '2',
        name: '서브 사업체',
      };

      const result = mergeBusinessData(primary, secondary);

      expect(result.mergeCount).toBe(2);
    });
  });

  describe('performance', () => {
    it('성능 메트릭을 포함해야 한다', () => {
      const businesses = [
        { bizesId: '1', name: '사업체1', roadNameAddress: '서울시 강남구 테헤란로 123' },
        { bizesId: '2', name: '사업체2', roadNameAddress: '서울시 종로구 세종대로 456' },
      ];

      const result = detectDuplicates(businesses);

      expect(result.performance).toBeDefined();
      expect(result.performance.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.performance.comparisonsPerSecond).toBeGreaterThanOrEqual(0);
      expect(result.performance.memoryUsageMb).toBeGreaterThanOrEqual(0);
    });
  });

  describe('phonetic matching', () => {
    it('음성학적으로 유사한 이름을 탐지해야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '강남 치과',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
        {
          bizesId: '2',
          name: '강남 치과',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
      ];

      const result = detectDuplicates(businesses, { usePhonetic: true });

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });
  });

  describe('fuzzy phone matching', () => {
    it('퍼지 전화번호 매칭을 수행해야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '사업체1',
          phone: '02-1234-5678',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
        {
          bizesId: '2',
          name: '사업체1',
          phone: '02-1234-5679',
          roadNameAddress: '서울시 강남구 테헤란로 123',
        },
      ];

      const result = detectDuplicates(businesses, { useFuzzyPhone: true });

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });
  });

  describe('getDuplicateStatistics', () => {
    it('중복 통계를 반환해야 한다', () => {
      const businesses = [
        {
          bizesId: '1',
          name: '테스트 식당',
          roadNameAddress: '서울시 강남구 테헤란로 123',
          phone: '02-1234-5678',
          businessCode: 'I56112',
        },
        {
          bizesId: '2',
          name: '테스트 식당',
          roadNameAddress: '서울시 강남구 테헤란로 123',
          phone: '02-1234-5678',
          businessCode: 'I56112',
        },
      ];

      const result = detectDuplicates(businesses);
      const stats = getDuplicateStatistics(result);

      expect(stats.summary).toBeDefined();
      expect(stats.topReasons).toBeDefined();
      expect(stats.recommendations).toBeDefined();
    });
  });
});
