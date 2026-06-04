import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeFieldForCorrections,
  applyCorrections,
  getCorrectionHistory,
  generateCorrectionReport,
} from '@/lib/services/data-correction.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'history') {
      const businessId = searchParams.get('businessId') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getCorrectionHistory(businessId, limit);
      return NextResponse.json({ history, count: history.length });
    }

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

    const fields = ['phone', 'name', 'roadNameAddress', 'businessCode', 'latitude', 'longitude'];
    const allSuggestions = [];

    for (const field of fields) {
      const suggestions = analyzeFieldForCorrections(businesses, field);
      allSuggestions.push(...suggestions);
    }

    const correctionResult = applyCorrections(businesses, allSuggestions, {
      autoApplyHighConfidence: false,
      dryRun: true,
    });

    const report = generateCorrectionReport(correctionResult);

    apiLogger.info({
      totalBusinesses: correctionResult.totalBusinesses,
      totalSuggestions: correctionResult.totalSuggestions,
    }, '데이터 보정 분석 완료');

    return NextResponse.json({
      totalBusinesses: correctionResult.totalBusinesses,
      totalSuggestions: correctionResult.totalSuggestions,
      applied: correctionResult.appliedCorrections,
      skipped: correctionResult.totalSuggestions - correctionResult.appliedCorrections,
      failed: 0,
      results: correctionResult.suggestions,
      statistics: correctionResult.statistics,
      report,
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터 보정 분석 실패');
    return createApiErrorResponse(error, '데이터 보정 분석 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, field } = body;

    if (action === 'analyze' && businessId && field) {
      const business = await businessRepository.findByBizesId(businessId);
      if (!business) {
        return NextResponse.json({ error: '사업체를 찾을 수 없습니다' }, { status: 404 });
      }

      const suggestions = analyzeFieldForCorrections([business], field);
      return NextResponse.json({ suggestions, count: suggestions.length });
    }

    if (action === 'apply') {
      const { suggestions } = body;
      if (!suggestions || !Array.isArray(suggestions)) {
        return NextResponse.json({ error: 'suggestions 배열이 필요합니다' }, { status: 400 });
      }

      const result = applyCorrections([], suggestions, {
        autoApplyHighConfidence: true,
        dryRun: false,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터 보정 처리 실패');
    return createApiErrorResponse(error, '데이터 보정 처리 실패', 500);
  }
}
