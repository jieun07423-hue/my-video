import { NextRequest, NextResponse } from 'next/server';
import {
  generateExecutiveReport,
  generateDashboard,
  compareWithBenchmarks,
  exportReport,
} from '@/lib/services/advanced-analytics.service';
import { collectMetrics } from '@/lib/services/data-quality-monitor.service';
import { analyzeTrend } from '@/lib/services/quality-trend.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'executive') {
      const periodDays = parseInt(searchParams.get('periodDays') || '30', 10);
      const format = (searchParams.get('format') as 'json' | 'markdown') || 'json';

      const result = await businessRepository.search({ limit: 1000 });
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
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, periodDays);

      if (format === 'markdown') {
        const markdown = exportReport(report, 'markdown');
        return new NextResponse(markdown, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      apiLogger.info({
        periodDays,
        overallScore: report.score,
        grade: report.summary.grade,
      }, 'Executive 리포트 생성 완료');

      return NextResponse.json(report);
    }

    if (action === 'dashboard') {
      const result = await businessRepository.search({ limit: 1000 });
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
      const trends = [analyzeTrend([])];
      const dashboard = generateDashboard(metrics, trends);

      apiLogger.info({
        qualityScore: dashboard.overview.qualityScore,
        grade: dashboard.overview.grade,
      }, '대시보드 생성 완료');

      return NextResponse.json(dashboard);
    }

    if (action === 'benchmark') {
      const result = await businessRepository.search({ limit: 1000 });
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
      const benchmarks = {
        'I56112': { averageScore: 72 },
        'G47121': { averageScore: 82 },
        'S96111': { averageScore: 65 },
        'Q82110': { averageScore: 80 },
      };

      const comparison = compareWithBenchmarks(metrics, benchmarks);

      apiLogger.info({
        ourScore: comparison.ourScore,
        industryAverage: comparison.industryAverage,
        percentile: comparison.percentile,
      }, '벤치마크 비교 완료');

      return NextResponse.json(comparison);
    }

    return NextResponse.json({ error: 'action 파라미터가 필요합니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '고급 분석 실패');
    return createApiErrorResponse(error, '고급 분석 실패', 500);
  }
}
