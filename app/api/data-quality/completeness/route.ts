import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateCompleteness,
  evaluateBatchCompleteness,
  getFieldDefinitions,
  getIndustryBenchmarks,
} from '@/lib/services/data-completeness.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bizesId = searchParams.get('bizesId');
    const action = searchParams.get('action');

    if (action === 'field-definitions') {
      const definitions = getFieldDefinitions();
      return NextResponse.json(definitions);
    }

    if (action === 'industry-benchmarks') {
      const benchmarks = getIndustryBenchmarks();
      return NextResponse.json(benchmarks);
    }

    if (action === 'report') {
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

      const { scores, report } = evaluateBatchCompleteness(businesses);
      apiLogger.info({
        total: report.totalBusinesses,
        avg: report.averageScore,
        crossValidationIssues: report.crossValidationSummary.totalIssues,
        staleBusinesses: report.freshnessSummary.staleBusinesses,
      }, '완성도 리포트 생성 완료');
      return NextResponse.json(report);
    }

    if (bizesId) {
      const business = await businessRepository.findByBizesId(bizesId);
      if (!business) {
        return NextResponse.json({ error: '해당 사업체를 찾을 수 없습니다' }, { status: 404 });
      }

      const score = evaluateCompleteness(business);
      apiLogger.info({
        bizesId,
        score: score.totalScore,
        grade: score.grade,
        crossValidationScore: score.crossValidation.score,
        freshnessScore: score.freshness.score,
      }, '개별 완성도 평가 완료');
      return NextResponse.json(score);
    }

    return NextResponse.json({ error: 'bizesId 또는 action 파라미터가 필요합니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '완성도 평가 실패');
    return createApiErrorResponse(error, '완성도 평가 실패', 500);
  }
}
