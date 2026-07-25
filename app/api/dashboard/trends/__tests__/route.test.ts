import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { resetMockData } from '@/lib/db/mock';

import { GET } from '../route';

describe('/api/dashboard/trends API Route', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('데이터가 없을 때도 정상 응답과 올바른 구조를 반환해야 한다', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/trends');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('weeklyVisitors');
    expect(json.data).toHaveProperty('weeklySignups');
    expect(json.data).toHaveProperty('campaignTrends');
    expect(json.data).toHaveProperty('industryDistribution');
    expect(json.data).toHaveProperty('monthlyRevenue');
    expect(Array.isArray(json.data.weeklyVisitors)).toBe(true);
    expect(Array.isArray(json.data.industryDistribution)).toBe(true);
    expect(Array.isArray(json.data.monthlyRevenue)).toBe(true);
  });

  it('fillEmptyWeeks의 결과로 12개의 주간 데이터 포인트를 반환해야 한다', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/trends');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.weeklyVisitors.length).toBe(12);
    expect(json.data.weeklySignups.length).toBe(12);
    expect(json.data.campaignTrends.length).toBe(12);
  });

  it('industryDistribution은 빈 배열로 반환되어야 한다 (데이터 없음)', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/trends');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.industryDistribution).toEqual([]);
  });

  it('각 주간 데이터 포인트는 date, value, label 필드를 가져야 한다', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/trends');
    const res = await GET(req);
    const json = await res.json();
    const sample = json.data.weeklyVisitors[0];

    expect(sample).toHaveProperty('date');
    expect(sample).toHaveProperty('value');
    expect(sample).toHaveProperty('label');
    expect(typeof sample.value).toBe('number');
    expect(sample.value).toBe(0);
  });
});