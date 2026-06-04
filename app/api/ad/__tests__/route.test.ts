import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { adRepository } from '@/lib/repositories/ad.repository';
import { adGeneratorService } from '@/lib/services/ad-generator.service';

describe('/api/ad API Route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('정상적으로 광고 캠페인 목록을 반환해야 한다', async () => {
      const mockResult = {
        items: [{ id: '1', industry: '음식업', location: '서울' }],
        total: 1,
        page: 1,
        limit: 20,
      };
      jest.spyOn(adRepository, 'search').mockResolvedValue(mockResult);

      const req = new NextRequest('http://localhost/api/ad?page=1&limit=20');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(adRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        userId: undefined,
        status: undefined,
      });
    });

    it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
      jest.spyOn(adRepository, 'search').mockRejectedValue(new Error('DB Error'));

      const req = new NextRequest('http://localhost/api/ad');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('조회 실패');
    });
  });

  describe('POST', () => {
    const mockGenerateResult = {
      initialCopies: ['copy1', 'copy2'],
      top5Copies: ['copy1'],
      finalCopies: ['copy1'],
      totalDuration: 1200,
    };

    const mockCampaign = { id: 'camp_1', industry: '음식업', location: '서울' };

    it('필수 값이 모두 제공되면 광고를 생성하고 결과를 반환해야 한다', async () => {
      jest.spyOn(adRepository, 'createCampaign').mockResolvedValue(mockCampaign);
      jest.spyOn(adGeneratorService, 'generate').mockResolvedValue(mockGenerateResult);
      jest.spyOn(adRepository, 'findCampaignById').mockResolvedValue({ ...mockCampaign, status: 'completed' });
      jest.spyOn(adRepository, 'updateCampaignStatus').mockResolvedValue({} as any);
      jest.spyOn(adRepository, 'createCopies').mockResolvedValue({ count: 4 } as any);

      const req = {
        json: async () => ({
          industry: '음식업',
          location: '서울',
          target: '20대',
          goal: '매출 증대',
        }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.campaign).toEqual({ ...mockCampaign, status: 'completed' });
      expect(data.finalCopies).toEqual(mockGenerateResult.finalCopies);
      expect(adRepository.createCampaign).toHaveBeenCalled();
      expect(adGeneratorService.generate).toHaveBeenCalled();
      expect(adRepository.createCopies).toHaveBeenCalled();
      expect(adRepository.updateCampaignStatus).toHaveBeenCalledTimes(2);
    });

    it('필수 값(industry, location)이 없으면 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ industry: '음식업' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('업종과 지역은 필수입니다');
    });

    it('생성 과정 중 오류 발생 시 500 에러를 반환해야 한다', async () => {
      jest.spyOn(adRepository, 'createCampaign').mockRejectedValue(new Error('Creation Failed'));

      const req = {
        json: async () => ({
          industry: '음식업',
          location: '서울',
        }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('광고 생성 실패');
    });
  });
});
