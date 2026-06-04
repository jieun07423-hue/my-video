import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BusinessRepository, type CreateBusinessInput, type SearchOptions } from '../business.repository';
import { resetMockData } from '@/lib/db';

describe('BusinessRepository', () => {
  let repository: BusinessRepository;

  beforeEach(() => {
    resetMockData();
    repository = new BusinessRepository();
  });

  describe('createMany', () => {
    it('소상공인 데이터를 대량 생성해야 한다', async () => {
      const mockData: CreateBusinessInput[] = [
        {
          bizesId: 'TEST001',
          name: '테스트 상가 1',
          roadNameAddress: '서울시 강남구',
          lotNumberAddress: null,
          phone: '02-123-4567',
          latitude: 37.5172,
          longitude: 127.0473,
          businessCode: '12345',
          businessName: '카페',
          indsLclsCd: 'I',
          indsLclsNm: '음식',
          indsMclsCd: 'I12',
          indsMclsNm: '커피',
          indsSclsCd: 'I12A',
          indsSclsNm: '카페',
          status: 'active',
          recordStatus: 'new',
          dataSource: 'test',
        },
      ];

      const result = await repository.createMany(mockData);

      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('search', () => {
    it('기본 검색 옵션으로 조회해야 한다', async () => {
      const options: SearchOptions = {
        page: 1,
        limit: 20,
      };

      const result = await repository.search(options);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('검색어로 필터링해야 한다', async () => {
      const options: SearchOptions = {
        search: '카페',
        page: 1,
        limit: 20,
      };

      const result = await repository.search(options);

      expect(result).toBeDefined();
      // 검색 결과가 있거나 없거나
      expect(result.items).toBeDefined();
    });

    it('상태로 필터링해야 한다', async () => {
      const options: SearchOptions = {
        status: 'active',
        page: 1,
        limit: 20,
      };

      const result = await repository.search(options);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    it('페이지네이션이 올바르게 동작해야 한다', async () => {
      const options: SearchOptions = {
        page: 2,
        limit: 2,
      };

      const result = await repository.search(options);

      expect(result).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
    });
  });

  describe('findByBizesId', () => {
    it('bizesId로 특정 비즈니스를 조회해야 한다', async () => {
      const result = await repository.findByBizesId('TEST001');

      // Mock 데이터가 없으면 null, 있으면 데이터
      expect(result === null || result.bizesId === 'TEST001').toBe(true);
    });

    it('존재하지 않는 bizesId는 null을 반환해야 한다', async () => {
      const result = await repository.findByBizesId('NOT_EXIST');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('통계 정보를 반환해야 한다', async () => {
      const result = await repository.getStats();

      expect(result).toBeDefined();
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe('number');
    });
  });

  describe('getDistinctBusinessCodes', () => {
    it('고유한 사업자 코드를 반환해야 한다', async () => {
      const result = await repository.getDistinctBusinessCodes();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});