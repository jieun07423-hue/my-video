import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

interface SummaryStats {
  todayRevenue: number;
  revenueChange: number;
  recentOrders: number;
}

/**
 * 당일 매출 및 전일 대비 증감률, 오늘 주문 건수를 실제 DB 주문 데이터로 계산한다.
 * - 매출: 취소(cancelled)를 제외한 주문의 totalAmount 합계
 * - 증감률: (오늘 매출 - 어제 매출) / 어제 매출 * 100
 */
async function calculateOrderStats(storeId?: string): Promise<SummaryStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  const whereBase: Record<string, unknown> = {
    status: { not: 'cancelled' },
  };
  if (storeId) whereBase.storeId = storeId;

  const agg = await db.order.aggregate({
    where: { ...whereBase, createdAt: { gte: startOfToday } },
    _sum: { totalAmount: true },
    _count: true,
  });
  const yesterdayAgg = await db.order.aggregate({
    where: { ...whereBase, createdAt: { gte: startOfYesterday, lt: startOfToday } },
    _sum: { totalAmount: true },
  });

  const todayRevenue = Number(agg._sum.totalAmount ?? 0);
  const yesterdayRevenue = Number(yesterdayAgg._sum.totalAmount ?? 0);
  const recentOrders = agg._count;

  const revenueChange =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
      : todayRevenue > 0
        ? 100
        : 0;

  return { todayRevenue, revenueChange, recentOrders };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || undefined;

    const stats = await calculateOrderStats(storeId);
    apiLogger.info({ storeId, ...stats }, 'Summary stats computed');

    return NextResponse.json({ data: stats });
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to compute summary stats'
    );
    return createApiErrorResponse(error, '요약 통계 조회 실패', 500);
  }
}
