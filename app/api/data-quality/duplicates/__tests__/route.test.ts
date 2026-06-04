import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

jest.mock('@/lib/services/duplicate-detection.service', () => ({
  detectDuplicates: jest.fn(),
  mergeBusinessData: jest.fn(),
}));

jest.mock('@/lib/repositories/business.repository', () => ({
  businessRepository: {
    search: jest.fn(),
    findByBizesId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/data-quality/duplicates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('중복 탐지 결과를 반환해야 한다', async () => {
      const { detectDuplicates } = await import('@/lib/services/duplicate-detection.service');
      const { businessRepository } = await import('@/lib/repositories/business.repository');

      jest.mocked(businessRepository.search).mockResolvedValue({
        items: [
          { bizesId: '1', name: '테스트1' },
          { bizesId: '2', name: '테스트2' },
        ],
        total: 2,
        page: 1,
        limit: 500,
        totalPages: 1,
      });

      jest.mocked(detectDuplicates).mockReturnValue({
        totalCompared: 1,
        duplicatesFound: 0,
        exactMatches: 0,
        highSimilarity: 0,
        mediumSimilarity: 0,
        candidates: [],
        detectedAt: new Date(),
      });

      const request = {
        url: 'http://localhost:3000/api/data-quality/duplicates',
      } as NextRequest;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalCompared).toBe(1);
    });
  });

  describe('POST', () => {
    it('primaryId가 없으면 400 에러를 반환해야 한다', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ duplicateId: '2' }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('primaryId와 duplicateId가 필요합니다');
    });

    it('duplicateId가 없으면 400 에러를 반환해야 한다', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ primaryId: '1' }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('primaryId와 duplicateId가 필요합니다');
    });

    it('존재하지 않는 사업체면 404 에러를 반환해야 한다', async () => {
      const { businessRepository } = await import('@/lib/repositories/business.repository');
      jest.mocked(businessRepository.findByBizesId).mockResolvedValue(null);

      const request = {
        json: jest.fn().mockResolvedValue({ primaryId: '999', duplicateId: '888' }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('찾을 수 없습니다');
    });

    it('병합 성공 시 결과를 반환해야 한다', async () => {
      const { mergeBusinessData } = await import('@/lib/services/duplicate-detection.service');
      const { businessRepository } = await import('@/lib/repositories/business.repository');

      jest.mocked(businessRepository.findByBizesId)
        .mockResolvedValueOnce({ id: '1', bizesId: '1', name: '메인' })
        .mockResolvedValueOnce({ id: '2', bizesId: '2', name: '서브' });

      jest.mocked(mergeBusinessData).mockReturnValue({ id: '1', bizesId: '1', name: '메인' });
      jest.mocked(businessRepository.update).mockResolvedValue({} as any);

      const request = {
        json: jest.fn().mockResolvedValue({ primaryId: '1', duplicateId: '2' }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
