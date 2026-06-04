import { describe, it, expect, beforeEach } from '@jest/globals';
import { SeoulPermitRepository } from '../seoul-permit.repository';
import { resetMockData } from '@/lib/db';

describe('SeoulPermitRepository', () => {
  let repository: SeoulPermitRepository;

  beforeEach(() => {
    resetMockData();
    repository = new SeoulPermitRepository();
  });

  describe('upsertMany', () => {
    it('인허가 데이터를 업서트해야 한다', async () => {
      const permitData = [
        { manageNo: 'P001', bplcNm: '상가1', serviceCode: 'S001' },
        { manageNo: 'P002', bplcNm: '상가2', serviceCode: 'S002' },
      ];
      const insertedCount = await repository.upsertMany(permitData);

      expect(insertedCount).toBeDefined();
      expect(typeof insertedCount).toBe('number');
    });
  });

  describe('findMany', () => {
    it('조건에 맞는 인허가 데이터를 조회해야 한다', async () => {
      const result = await repository.findMany({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('인허가 통계 정보를 반환해야 한다', async () => {
      const stats = await repository.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(Array.isArray(stats.byService)).toBe(true);
    });
  });
});
