import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextResponse } from 'next/server';

// 1. NextResponse.json 모킹 (환경 문제 해결) - 가장 먼저 실행되어야 함
jest.mock('next/server', () => {
  const originalNextResponse = jest.requireActual('next/server');
  return {
    ...originalNextResponse,
    NextResponse: {
      ...originalNextResponse.NextResponse,
      json: jest.fn((data, init) => ({
        status: init?.status || 200,
        json: async () => data,
      })),
    },
  };
});

// 2. Mock modules before importing the route handler
jest.mock('@/lib/repositories/business.repository', () => ({
  businessRepository: {
    search: jest.fn(),
    createMany: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/handlers', () => ({
  createApiErrorResponse: jest.fn((error, message, status) => 
    NextResponse.json({ error: message }, { status })
  ),
  createBadRequestResponse: jest.fn((message) => 
    NextResponse.json({ error: message }, { status: 400 })
  ),
}));

import { businessRepository } from '@/lib/repositories/business.repository';
import { GET, POST } from '../route';

// 3. Next.js response helpers
  const createMockRequest = (url: string, options: any = {}) => {
    const req: any = {
      url,
      method: options.method || 'GET',
      headers: new Headers(options.headers || {}),
      json: jest.fn().mockImplementation(async () => {
        if (options.body && typeof options.body === 'string' && options.body === 'invalid-json') {
          throw new Error('Invalid JSON');
        }
        return options.body ? JSON.parse(options.body) : {};
      }),
      searchParams: new URL(url).searchParams,
    };
    return req;
  };


describe('/api/businesses API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('기본 페이지네이션으로 목록을 조회해야 한다', async () => {
      const mockResult = {
        items: [
          { id: '1', bizesId: 'TEST001', name: '테스트 상가 1' },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (businessRepository.search as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest('http://localhost:3000/api/businesses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
    });

    it('검색 파라미터로 필터링해야 한다', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      (businessRepository.search as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest('http://localhost:3000/api/businesses?search=카페&status=active');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(businessRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '카페',
          status: 'active',
        })
      );
    });

    it('페이지네이션 파라미터를 올바르게 파싱해야 한다', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 3,
        limit: 10,
      };

      (businessRepository.search as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest('http://localhost:3000/api/businesses?page=3&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(businessRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 10,
        })
      );
    });

    it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
      (businessRepository.search as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('http://localhost:3000/api/businesses');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('조회 실패');
    });
  });

  describe('POST', () => {
    it('단일 business 데이터를 생성해야 한다', async () => {
      const mockResult = { count: 1 };
      (businessRepository.createMany as jest.Mock).mockResolvedValue(mockResult);

      const businessData = {
        bizesId: 'TEST001',
        name: '테스트 상가',
        status: 'active',
        recordStatus: 'new',
      };

      const request = createMockRequest('http://localhost:3000/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(businessRepository.createMany).toHaveBeenCalledWith([businessData]);
    });

    it('배열 business 데이터를 대량 생성해야 한다', async () => {
      const mockResult = { count: 2 };
      (businessRepository.createMany as jest.Mock).mockResolvedValue(mockResult);

      const businessesData = [
        { bizesId: 'TEST001', name: '테스트 1' },
        { bizesId: 'TEST002', name: '테스트 2' },
      ];

      const request = createMockRequest('http://localhost:3000/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessesData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(businessRepository.createMany).toHaveBeenCalledWith(businessesData);
    });

    it('잘못된 JSON 요청인 경우 400 에러를 반환해야 한다', async () => {
      const request = createMockRequest('http://localhost:3000/api/businesses', {
        method: 'POST',
        body: 'invalid-json',
      });
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('데이터 생성 중 오류 발생 시 400 에러를 반환해야 한다', async () => {
      (businessRepository.createMany as jest.Mock).mockRejectedValue(new Error('Invalid data'));

      const businessData = { bizesId: 'TEST001', name: '테스트 상가' };
      const request = createMockRequest('http://localhost:3000/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
