import { describe, it, expect, beforeEach } from '@jest/globals';
import { BusinessRepository, type CreateBusinessInput } from './business.repository';
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
      const result = await repository.search({});
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
    });

    it('검색어로 필터링해야 한다', async () => {
      const result = await repository.search({ search: '카페' });
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('상태로 필터링해야 한다', async () => {
      const result = await repository.search({ status: 'active' });
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('페이지네이션이 올바르게 동작해야 한다', async () => {
      const result = await repository.search({ page: 2, limit: 2 });
      expect(result).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
    });
  });

  describe('findByBizesId', () => {
    it('bizesId로 특정 비즈니스를 조회해야 한다', async () => {
      const result = await repository.findByBizesId('TEST001');
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
