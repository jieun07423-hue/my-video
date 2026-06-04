import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '../route';
import { businessRepository } from '@/lib/repositories/business.repository';
import { NextRequest } from 'next/server';

jest.mock('@/lib/repositories/business.repository');

describe('/api/data-quality/corrections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns correction analysis results', async () => {
    const mockResponse = {
      items: [
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
      ],
      total: 1,
      page: 1,
      limit: 1000,
    };

    jest.mocked(businessRepository.search).mockResolvedValue(mockResponse);

    const request = { url: 'http://localhost:3000/api/data-quality/corrections' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalBusinesses');
    expect(data).toHaveProperty('totalSuggestions');
    expect(data).toHaveProperty('applied');
    expect(data).toHaveProperty('skipped');
    expect(data).toHaveProperty('failed');
    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('report');
    expect(data).toHaveProperty('statistics');
  });

  it('returns correction history when action=history', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/corrections?action=history' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('history');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.history)).toBe(true);
  });

  it('returns correction history for specific business', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/corrections?action=history&businessId=1234567890' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('history');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.history)).toBe(true);
  });

  it('handles POST analyze action', async () => {
    const mockBusiness = {
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
    };

    jest.mocked(businessRepository.findByBizesId).mockResolvedValue(mockBusiness);

    const request = new Request('http://localhost:3000/api/data-quality/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        businessId: '1234567890',
        field: 'phone',
      }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('suggestions');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it('handles POST apply action', async () => {
    const mockSuggestions = [
      {
        businessId: '1234567890',
        field: 'phone',
        currentValue: '02-1234-5678',
        suggestedValue: '02-12345678',
        confidence: 0.8,
        reason: '전화번호 형식 오류',
        type: 'format',
        priority: 'medium',
      },
    ];

    const request = new Request('http://localhost:3000/api/data-quality/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'apply',
        suggestions: mockSuggestions,
      }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalBusinesses');
    expect(data).toHaveProperty('totalSuggestions');
    expect(data).toHaveProperty('applied');
    expect(data).toHaveProperty('skipped');
    expect(data).toHaveProperty('failed');
  });

  it('handles POST errors', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('handles GET errors', async () => {
    jest.mocked(businessRepository.search).mockRejectedValue(new Error('Database error'));

    const request = { url: 'http://localhost:3000/api/data-quality/corrections' } as NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
