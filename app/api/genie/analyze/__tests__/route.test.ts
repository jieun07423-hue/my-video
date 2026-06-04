import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('/api/genie/analyze API Routes', () => {
  let GET: any;
  let POST: any;
  let publicDataClient: any;

  beforeEach(async () => {
    jest.resetModules();
    
    jest.doMock('@/lib/api/public-data-client', () => ({
      __esModule: true,
      fetchBusinessesByDate: jest.fn(),
      fetchByIndustry: jest.fn(),
      fetchByDistrict: jest.fn(),
      fetchTrendByPeriod: jest.fn(),
      fetchIndustryCategories: jest.fn(),
      fetchRegions: jest.fn(),
    }));

    const route = await import('../route');
    GET = route.GET;
    POST = route.POST;
    publicDataClient = await import('@/lib/api/public-data-client');
  });

  describe('GET', () => {
    it('카테고리와 지역 목록을 정상적으로 반환해야 한다', async () => {
      const mockCategories = [{ code: '1', name: '음식업' }];
      const mockRegions = [{ code: '11', name: '서울' }];
      
      publicDataClient.fetchIndustryCategories.mockResolvedValue(mockCategories);
      publicDataClient.fetchRegions.mockResolvedValue(mockRegions);

      const req = new NextRequest('http://localhost/api/genie/analyze');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.categories).toEqual(mockCategories);
      expect(data.regions).toEqual(mockRegions);
    });

    it('데이터 fetch 실패 시 500 에러를 반환해야 한다', async () => {
      publicDataClient.fetchIndustryCategories.mockRejectedValue(new Error('API Error'));

      const req = new NextRequest('http://localhost/api/genie/analyze');
      const res = await GET(req);
      
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const mockData = [{ id: '1', name: '테스트 사업장' }];

    it('type=date 요청 시 날짜가 있으면 정상 결과를 반환해야 한다', async () => {
      publicDataClient.fetchBusinessesByDate.mockResolvedValue(mockData);

      const req = {
        json: async () => ({ type: 'date', date: '2024-01-01' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
    });

    it('type=date 요청 시 날짜가 없으면 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ type: 'date' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('날짜가 필요합니다');
    });

    it('type=region 요청 시 지역코드가 있으면 정상 결과를 반환해야 한다', async () => {
      publicDataClient.fetchByDistrict.mockResolvedValue(mockData);

      const req = {
        json: async () => ({ type: 'region', regionCode: '11' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
    });

    it('type=region 요청 시 지역코드가 없으면 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ type: 'region' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('지역코드가 필요합니다');
    });

    it('type=industry 요청 시 업종코드가 있으면 정상 결과를 반환해야 한다', async () => {
      publicDataClient.fetchByIndustry.mockResolvedValue(mockData);

      const req = {
        json: async () => ({ type: 'industry', industryCode: 'C01' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
    });

    it('type=industry 요청 시 업종코드가 없으면 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ type: 'industry' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('업종코드가 필요합니다');
    });

    it('type=trend 요청 시 시작일과 종료일이 있으면 정상 결과를 반환해야 한다', async () => {
      publicDataClient.fetchTrendByPeriod.mockResolvedValue(mockData);

      const req = {
        json: async () => ({ type: 'trend', startDate: '2024-01-01', endDate: '2024-01-31' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
    });

    it('type=trend 요청 시 날짜가 없으면 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ type: 'trend', startDate: '2024-01-01' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('시작일과 종료일이 필요합니다');
    });

    it('유효하지 않은 type 요청 시 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ type: 'invalid' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('유효하지 않은 분석 타입입니다');
    });

    it('분석 중 서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
      publicDataClient.fetchBusinessesByDate.mockRejectedValue(new Error('Unexpected Error'));

      const req = {
        json: async () => ({ type: 'date', date: '2024-01-01' }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Unexpected Error');
    });
  });
});
