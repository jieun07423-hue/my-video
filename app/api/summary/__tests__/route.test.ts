import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import db, { resetMockData } from '@/lib/db';

jest.mock('@/lib/logger', () => ({
  apiLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), fatal: jest.fn(), trace: jest.fn() },
}));

jest.mock('@/lib/api/handlers', () => ({
  createApiErrorResponse: jest.fn((_error: unknown, message: string, status: number) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

interface OrderRow {
  id: string;
  storeId: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
}

async function seedOrder(partial: Partial<OrderRow>): Promise<void> {
  await db.order.create({
    data: {
      id: partial.id ?? `order-${Math.random()}`,
      storeId: partial.storeId ?? 'store_1',
      totalAmount: partial.totalAmount ?? 0,
      status: partial.status ?? 'completed',
      createdAt: partial.createdAt ?? new Date(),
    },
  });
}

describe('/api/summary API Route', () => {
  beforeEach(async () => {
    resetMockData();
  });

  it('오늘 매출, 전일 대비 증감률, 오늘 주문 건수를 실제 mock DB에서 집계해 반환해야 한다', async () => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday.getTime() - 86400000);
    const yesterdayMorning = new Date(startYesterday.getTime() + 3600000);
    const todayMorning = new Date(startToday.getTime() + 3600000);

    // 어제 주문 2건(100,000원) + 오늘 주문 3건(150,000원)
    await seedOrder({ storeId: 'store_1', totalAmount: 60000, status: 'completed', createdAt: yesterdayMorning });
    await seedOrder({ storeId: 'store_1', totalAmount: 40000, status: 'completed', createdAt: yesterdayMorning });
    await seedOrder({ storeId: 'store_1', totalAmount: 100000, status: 'completed', createdAt: todayMorning });
    // 취소 주문은 매출·건수에서 제외되어야 한다
    await seedOrder({ storeId: 'store_1', totalAmount: 999999, status: 'cancelled', createdAt: todayMorning });
    // 다른 스토어 주문은 storeId 필터로 제외되어야 한다
    await seedOrder({ storeId: 'store_2', totalAmount: 999999, status: 'completed', createdAt: todayMorning });

    const req = new NextRequest('http://localhost/api/summary?storeId=store_1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.todayRevenue).toBe(100000); // 오늘, store_1, completed만
    expect(data.data.recentOrders).toBe(1); // 취소 제외, store_2 제외
    // 어제 100,000 → 오늘 100,000 이므로 증감률은 0
    expect(data.data.revenueChange).toBe(0);
  });

  it('어제 매출이 0이고 오늘 매출이 있으면 증감률은 100을 반환한다', async () => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const todayMorning = new Date(startToday.getTime() + 3600000);

    await seedOrder({ storeId: 'store_1', totalAmount: 50000, status: 'completed', createdAt: todayMorning });

    const req = new NextRequest('http://localhost/api/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.todayRevenue).toBe(50000);
    expect(data.data.revenueChange).toBe(100);
  });

  it('오늘·어제 모두 매출이 없으면 증감률은 0을 반환한다', async () => {
    const req = new NextRequest('http://localhost/api/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual({ todayRevenue: 0, revenueChange: 0, recentOrders: 0 });
  });
});
