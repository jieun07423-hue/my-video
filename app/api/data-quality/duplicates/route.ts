import { NextRequest, NextResponse } from 'next/server';
import { detectDuplicates, mergeBusinessData, getDuplicateStatistics } from '@/lib/services/duplicate-detection.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nameThreshold = parseFloat(searchParams.get('nameThreshold') || '0.8');
    const addressThreshold = parseFloat(searchParams.get('addressThreshold') || '0.7');
    const overallThreshold = parseFloat(searchParams.get('overallThreshold') || '0.75');
    const usePhonetic = searchParams.get('usePhonetic') !== 'false';
    const useFuzzyPhone = searchParams.get('useFuzzyPhone') !== 'false';
    const maxResults = parseInt(searchParams.get('maxResults') || '100', 10);
    const includeStats = searchParams.get('includeStats') === 'true';

    const result = await businessRepository.search({ limit: 500 });
    const businesses = result.items.map((b: any) => ({
      bizesId: b.bizesId,
      name: b.name,
      roadNameAddress: b.roadNameAddress,
      lotNumberAddress: b.lotNumberAddress,
      phone: b.phone,
      businessCode: b.businessCode,
      businessName: b.businessName,
    }));

    const detectionResult = detectDuplicates(businesses, {
      nameThreshold,
      addressThreshold,
      overallThreshold,
      usePhonetic,
      useFuzzyPhone,
      maxResults,
    });

    if (includeStats) {
      const stats = getDuplicateStatistics(detectionResult);
      apiLogger.info(
        {
          compared: detectionResult.totalCompared,
          found: detectionResult.duplicatesFound,
          exact: detectionResult.exactMatches,
          performance: detectionResult.performance,
        },
        '중복 탐지 완료'
      );
      return NextResponse.json({ ...detectionResult, statistics: stats });
    }

    apiLogger.info(
      {
        compared: detectionResult.totalCompared,
        found: detectionResult.duplicatesFound,
        exact: detectionResult.exactMatches,
      },
      '중복 탐지 완료'
    );

    return NextResponse.json(detectionResult);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '중복 탐지 실패');
    return createApiErrorResponse(error, '중복 탐지 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primaryId, duplicateId, options } = body;

    if (!primaryId || !duplicateId) {
      return NextResponse.json({ error: 'primaryId와 duplicateId가 필요합니다' }, { status: 400 });
    }

    const primary = await businessRepository.findByBizesId(primaryId);
    const duplicate = await businessRepository.findByBizesId(duplicateId);

    if (!primary || !duplicate) {
      return NextResponse.json({ error: '병합할 사업체를 찾을 수 없습니다' }, { status: 404 });
    }

    const merged = mergeBusinessData(primary, duplicate);
    await businessRepository.update(primary.id, merged);

    apiLogger.info({
      primaryId,
      duplicateId,
      mergedFields: Object.keys(merged).length,
      mergeCount: merged.mergeCount,
    }, '사업체 병합 완료');

    return NextResponse.json({
      success: true,
      mergedBusiness: merged,
      summary: {
        primaryId,
        duplicateId,
        mergedFields: Object.keys(merged).length,
        mergeCount: merged.mergeCount,
      },
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '사업체 병합 실패');
    return createApiErrorResponse(error, '사업체 병합 실패', 500);
  }
}
