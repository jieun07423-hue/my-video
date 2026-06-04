import { NextRequest, NextResponse } from 'next/server';
import {
  validateBusinessRegistration,
  batchValidateBusinesses,
  formatBizesId,
  getValidationHistory,
  clearCache,
  getCacheStats,
} from '@/lib/services/business-validation.service';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bizesId = searchParams.get('bizesId');
    const action = searchParams.get('action');

    if (action === 'cache-stats') {
      const stats = getCacheStats();
      return NextResponse.json(stats);
    }

    if (action === 'clear-cache') {
      clearCache();
      return NextResponse.json({ success: true, message: '캐시가 초기화되었습니다' });
    }

    if (!bizesId) {
      return NextResponse.json({ error: 'bizesId 파라미터가 필요합니다' }, { status: 400 });
    }

    const useCache = searchParams.get('useCache') !== 'false';
    const maxRetries = parseInt(searchParams.get('maxRetries') || '3', 10);
    const trackHistory = searchParams.get('trackHistory') !== 'false';

    const formatted = formatBizesId(bizesId);
    const result = await validateBusinessRegistration(bizesId, undefined, {
      useCache,
      maxRetries,
      trackHistory,
    });

    if (searchParams.get('includeHistory') === 'true') {
      const history = getValidationHistory(bizesId);
      apiLogger.info({ bizesId: formatted, isValid: result.isValid, historyCount: history.length }, '사업자등록번호 검증 완료');
      return NextResponse.json({ ...result, history });
    }

    apiLogger.info({ bizesId: formatted, isValid: result.isValid, fromCache: result.fromCache }, '사업자등록번호 검증 완료');
    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '사업자등록번호 검증 실패');
    return createApiErrorResponse(error, '검증 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bizesIds, serviceKey, options } = body;

    if (!Array.isArray(bizesIds) || bizesIds.length === 0) {
      return NextResponse.json({ error: 'bizesIds 배열이 필요합니다' }, { status: 400 });
    }

    if (bizesIds.length > 100) {
      return NextResponse.json({ error: '한번에 최대 100건까지 검증 가능합니다' }, { status: 400 });
    }

    const result = await batchValidateBusinesses(bizesIds, serviceKey, {
      delayMs: options?.delayMs || 200,
      useCache: options?.useCache !== false,
      maxRetries: options?.maxRetries || 3,
      concurrency: options?.concurrency || 5,
    });

    apiLogger.info({
      total: result.total,
      valid: result.valid,
      invalid: result.invalid,
      cacheHitRate: result.summary.cacheHitRate,
      retryRate: result.summary.retryRate,
    }, '배치 검증 완료');

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '배치 검증 실패');
    return createApiErrorResponse(error, '배치 검증 실패', 500);
  }
}
