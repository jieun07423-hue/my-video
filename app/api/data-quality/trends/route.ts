import { NextRequest, NextResponse } from 'next/server';
import {
  generateTrendReport,
  comparePeriods,
  recordMetrics,
  getMetricsHistory,
} from '@/lib/services/quality-trend.service';
import { collectMetrics } from '@/lib/services/data-quality-monitor.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'report') {
      const periodDays = parseInt(searchParams.get('periodDays') || '30', 10);
      const report = generateTrendReport(periodDays);

      apiLogger.info({
        periodDays,
        metricsCount: report.metrics.length,
        insightsCount: report.insights.length,
        overallTrend: report.overallTrend,
      }, '트렌드 리포트 생성 완료');

      return NextResponse.json(report);
    }

    if (action === 'history') {
      const history = getMetricsHistory();
      return NextResponse.json({ history, count: history.length });
    }

    if (action === 'compare') {
      const period1Start = searchParams.get('period1Start');
      const period1End = searchParams.get('period1End');
      const period2Start = searchParams.get('period2Start');
      const period2End = searchParams.get('period2End');

      if (!period1Start || !period1End || !period2Start || !period2End) {
        return NextResponse.json(
          { error: '모든 기간 파라미터가 필요합니다' },
          { status: 400 }
        );
      }

      const comparison = comparePeriods(
        new Date(period1Start),
        new Date(period1End),
        new Date(period2Start),
        new Date(period2End)
      );

      return NextResponse.json(comparison);
    }

    const result = await businessRepository.search({ limit: 500 });
    const businesses = result.items.map((b: any) => ({
      bizesId: b.bizesId,
      name: b.name,
      roadNameAddress: b.roadNameAddress,
      lotNumberAddress: b.lotNumberAddress,
      phone: b.phone,
      latitude: b.latitude,
      longitude: b.longitude,
      businessCode: b.businessCode,
      businessName: b.businessName,
      indsLclsNm: b.indsLclsNm,
      indsMclsNm: b.indsMclsNm,
      indsSclsNm: b.indsSclsNm,
      status: b.status,
      updatedAt: b.updatedAt,
    }));

    const metrics = await collectMetrics(businesses);
    recordMetrics(metrics);

    apiLogger.info({
      totalBusinesses: metrics.totalBusinesses,
      averageScore: metrics.averageCompletenessScore,
    }, '메트릭 기록 완료');

    return NextResponse.json({ metrics, message: '메트릭이 기록되었습니다' });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '트렌드 분석 실패');
    return createApiErrorResponse(error, '트렌드 분석 실패', 500);
  }
}
