import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET } from '../route';
import { businessRepository } from '@/lib/repositories/business.repository';
import { NextRequest } from 'next/server';

jest.mock('@/lib/repositories/business.repository');

describe('/api/data-quality/anomalies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns anomaly detection results', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/anomalies' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalBusinesses');
    expect(data).toHaveProperty('anomaliesDetected');
    expect(data).toHaveProperty('anomalyRate');
    expect(data).toHaveProperty('anomalies');
    expect(data).toHaveProperty('detectedAt');
  });

  it('returns anomaly report when action=report', async () => {
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

    const request = { url: 'http://localhost:3000/api/data-quality/anomalies?action=report' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalBusinesses');
    expect(data).toHaveProperty('anomaliesDetected');
    expect(data).toHaveProperty('anomalyRate');
    expect(data).toHaveProperty('riskLevel');
    expect(data).toHaveProperty('anomalies');
    expect(data).toHaveProperty('patterns');
    expect(data).toHaveProperty('report');
    expect(data).toHaveProperty('detectedAt');
  });

  it('handles errors gracefully', async () => {
    jest.mocked(businessRepository.search).mockRejectedValue(new Error('Database error'));

    const request = { url: 'http://localhost:3000/api/data-quality/anomalies' } as NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
