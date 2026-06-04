import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '../route';

jest.mock('@/lib/services/data-completeness.service', () => ({
  evaluateCompleteness: jest.fn(),
  evaluateBatchCompleteness: jest.fn(),
}));

jest.mock('@/lib/repositories/business.repository', () => ({
  businessRepository: {
    search: jest.fn(),
    findByBizesId: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/data-quality/completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bizesId와 report 모두 없으면 400 에러를 반환해야 한다', async () => {
    const request = {
      url: 'http://localhost:3000/api/data-quality/completeness',
    } as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('bizesId 또는 report=true');
  });

  it('report=true면 배치 리포트를 반환해야 한다', async () => {
    const { evaluateBatchCompleteness } = await import('@/lib/services/data-completeness.service');
    const { businessRepository } = await import('@/lib/repositories/business.repository');

    jest.mocked(businessRepository.search).mockResolvedValue({
      items: [{ bizesId: '1', name: '테스트' }],
      total: 1,
      page: 1,
      limit: 1000,
      totalPages: 1,
    });

    jest.mocked(evaluateBatchCompleteness).mockReturnValue({
      scores: [],
      report: {
        totalBusinesses: 1,
        averageScore: 75,
        gradeDistribution: [],
        commonMissingFields: [],
        lowScoreBusinesses: 0,
        evaluatedAt: new Date(),
      },
    });

    const request = {
      url: 'http://localhost:3000/api/data-quality/completeness?report=true',
    } as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalBusinesses).toBe(1);
  });

  it('bizesId가 있으면 개별 점수를 반환해야 한다', async () => {
    const { evaluateCompleteness } = await import('@/lib/services/data-completeness.service');
    const { businessRepository } = await import('@/lib/repositories/business.repository');

    jest.mocked(businessRepository.findByBizesId).mockResolvedValue({
      id: '1',
      bizesId: '1234567890',
      name: '테스트 사업체',
    });

    jest.mocked(evaluateCompleteness).mockReturnValue({
      bizesId: '1234567890',
      totalScore: 85,
      grade: 'B',
      fieldScores: [],
      missingFields: [],
      completedFields: ['name'],
      evaluatedAt: new Date(),
    });

    const request = {
      url: 'http://localhost:3000/api/data-quality/completeness?bizesId=1234567890',
    } as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalScore).toBe(85);
  });

  it('존재하지 않는 bizesId면 404 에러를 반환해야 한다', async () => {
    const { businessRepository } = await import('@/lib/repositories/business.repository');
    jest.mocked(businessRepository.findByBizesId).mockResolvedValue(null);

    const request = {
      url: 'http://localhost:3000/api/data-quality/completeness?bizesId=9999999999',
    } as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('찾을 수 없습니다');
  });
});
