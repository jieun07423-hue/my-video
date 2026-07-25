import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

interface TrendPoint {
  date: string;
  value: number;
  label: string;
}

interface IndustryStat {
  name: string;
  count: number;
  percentage: number;
}

interface DashboardTrends {
  weeklyVisitors: TrendPoint[];
  weeklySignups: TrendPoint[];
  campaignTrends: TrendPoint[];
  industryDistribution: IndustryStat[];
  monthlyRevenue: TrendPoint[];
}

function fillEmptyWeeks(weeks: TrendPoint[]): TrendPoint[] {
  const now = new Date();
  const result: TrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekStart = d.toISOString().slice(0, 10);
    const existing = weeks.find(w => w.date === weekStart);
    result.push(existing || {
      date: weekStart,
      value: 0,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return result;
}

export async function GET(_request: NextRequest) {
  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const signups = await db.business.findMany({
      where: { createdAt: { gte: threeMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const signupBuckets = new Map<string, number>();
    for (const s of signups) {
      const d = new Date(s.createdAt);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      signupBuckets.set(key, (signupBuckets.get(key) || 0) + 1);
    }

    const weeklySignups: TrendPoint[] = Array.from(signupBuckets.entries())
      .map(([date, value]) => {
        const d = new Date(date);
        return { date, value, label: `${d.getMonth() + 1}/${d.getDate()}` };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2) 주간 활동 트렌드 (AuditLog 기준)
    const auditLogs = await db.auditLog.findMany({
      where: { createdAt: { gte: threeMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const activityBuckets = new Map<string, number>();
    for (const a of auditLogs) {
      const d = new Date(a.createdAt);
      const key = d.toISOString().slice(0, 10);
      activityBuckets.set(key, (activityBuckets.get(key) || 0) + 1);
    }

    // 주간 집계
    const weeklyActivityMap = new Map<string, number>();
    for (const [date, count] of activityBuckets) {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      weeklyActivityMap.set(weekKey, (weeklyActivityMap.get(weekKey) || 0) + count);
    }

    const weeklyVisitors: TrendPoint[] = Array.from(weeklyActivityMap.entries())
      .map(([date, value]) => {
        const d = new Date(date);
        return { date, value, label: `${d.getMonth() + 1}/${d.getDate()}` };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3) 광고 캠페인 트렌드
    const campaigns = await db.adCampaign.findMany({
      where: { createdAt: { gte: threeMonthsAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const campaignBuckets = new Map<string, number>();
    for (const c of campaigns) {
      const key = c.createdAt.toISOString().slice(0, 10);
      campaignBuckets.set(key, (campaignBuckets.get(key) || 0) + 1);
    }

    // 주간 집계
    const weeklyCampaignMap = new Map<string, number>();
    for (const [date, count] of campaignBuckets) {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      weeklyCampaignMap.set(weekKey, (weeklyCampaignMap.get(weekKey) || 0) + count);
    }

    const campaignTrends: TrendPoint[] = Array.from(weeklyCampaignMap.entries())
      .map(([date, value]) => {
        const d = new Date(date);
        return { date, value, label: `${d.getMonth() + 1}/${d.getDate()}` };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4) 업종 분포
    const industries = await db.business.findMany({
      where: { businessName: { not: null } },
      select: { businessName: true },
    });

    const industryMap = new Map<string, number>();
    for (const b of industries) {
      const name = b.businessName || '기타';
      industryMap.set(name, (industryMap.get(name) || 0) + 1);
    }

    const totalIndustry = industries.length;
    const industryDistribution: IndustryStat[] = Array.from(industryMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalIndustry) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5) 월별 주문 매출 추이 (Order 기준)
    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: threeMonthsAgo },
        status: { not: 'cancelled' },
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const revenueBuckets = new Map<string, number>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
      revenueBuckets.set(key, (revenueBuckets.get(key) || 0) + Number(o.totalAmount));
    }

    const monthlyRevenue: TrendPoint[] = Array.from(revenueBuckets.entries())
      .map(([date, value]) => {
        const d = new Date(date + '-01');
        return {
          date,
          value: Math.round(value),
          label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const result: DashboardTrends = {
      weeklyVisitors: fillEmptyWeeks(weeklyVisitors),
      weeklySignups: fillEmptyWeeks(weeklySignups),
      campaignTrends: fillEmptyWeeks(campaignTrends),
      industryDistribution,
      monthlyRevenue,
    };

    apiLogger.info(
      { signupCount: signups.length, campaignCount: campaigns.length, industryCount: industryDistribution.length },
      'Dashboard trends fetched'
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch dashboard trends'
    );
    return NextResponse.json(
      { success: false, error: '트렌드 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}