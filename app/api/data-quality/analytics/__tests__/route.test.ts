import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET } from '../route';
import { businessRepository } from '@/lib/repositories/business.repository';
import { NextRequest } from 'next/server';

jest.mock('@/lib/repositories/business.repository');

describe('/api/data-quality/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns error when action is missing', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/analytics' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('returns executive report when action=executive', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/analytics?action=executive' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('period');
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('sections');
    expect(data).toHaveProperty('recommendations');
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('generatedAt');
  });

  it('returns executive report as markdown when format=markdown', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/analytics?action=executive&format=markdown' } as NextRequest;
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(text).toContain('데이터 품질 Executive 리포트');
    expect(text).toContain('품질 점수');
    expect(text).toContain('등급');
  });

  it('returns dashboard when action=dashboard', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/analytics?action=dashboard' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('overview');
    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('trends');
    expect(data).toHaveProperty('alerts');
    expect(data).toHaveProperty('topIssues');
  });

  it('returns benchmark comparison when action=benchmark', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/analytics?action=benchmark' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('ourScore');
    expect(data).toHaveProperty('industryAverage');
    expect(data).toHaveProperty('percentile');
    expect(data).toHaveProperty('topPerformers');
    expect(data).toHaveProperty('gap');
    expect(data).toHaveProperty('recommendations');
  });

  it('handles errors gracefully', async () => {
    jest.mocked(businessRepository.search).mockRejectedValue(new Error('Database error'));

    const request = { url: 'http://localhost:3000/api/data-quality/analytics?action=executive' } as NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
