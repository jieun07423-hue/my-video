import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';

describe('/api/dashboard/stats API Route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('정상적으로 통계 데이터를 반환해야 한다', async () => {
    const mockStats = {
      total: 1000,
      active: 800,
      inactive: 100,
      dissolved: 100,
    };
    jest.spyOn(businessRepository, 'getStats').mockResolvedValue(mockStats);

    const req = new NextRequest('http://localhost/api/dashboard/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockStats);
    expect(businessRepository.getStats).toHaveBeenCalled();
  });

  it('데이터베이스 오류 발생 시 500 에러를 반환해야 한다', async () => {
    jest.spyOn(businessRepository, 'getStats').mockRejectedValue(new Error('DB Connection Error'));

    const req = new NextRequest('http://localhost/api/dashboard/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('통계를 불러오는데 실패했습니다.');
  });
});
