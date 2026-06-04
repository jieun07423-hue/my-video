import { syncLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';
import { 
  parseXmlResponse, 
  mapToBusinessInput, 
  PublicDataPortalResponse, 
  PublicDataPortalItem 
} from '@/lib/services/public-data-portal.util';

/**
 * 배치 처리 결과 (개별 항목별)
 */
interface BatchItemResult {
  bizesId: string;
  success: boolean;
  error?: string;
  isNew: boolean;
}

/**
 * 배치 처리 결과
 */
interface BatchResult {
  batchIndex: number;
  totalItems: number;
  successfulItems: BatchItemResult[];
  failedItems: BatchItemResult[];
  error?: string;
}

/**
 * 동기화 옵션
 */
export interface SyncOptions {
  serviceKey: string;       // 공공데이터포털 인증키
  pageSize?: number;        // 한 페이지 결과 수 (기본값: 10)
  maxPages?: number;        // 최대 페이지 수 (기본값: 10)
  force?: boolean;          // 강제 실행 (lock 무시)
}

/**
 * 동기화 결과 (개선된 버전)
 */
export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  failedRecords: number;
  errors: string[];
  batchResults: BatchResult[];  // 개별 배치 결과 추가
  lastBusinessId?: string;
  isLocked?: boolean;           // lock 상태 정보
}

/**
 * HTTP 요청 실행
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 단일 배치 처리 (트랜잭션 지원)
 */
async function processBatch(
  batch: CreateBusinessInput[],
  batchIndex: number,
  businessRepository: { upsertMany: (data: CreateBusinessInput[]) => Promise<{ bizesId: string }[]> }
): Promise<BatchResult> {
  const successfulItems: BatchItemResult[] = [];
  const failedItems: BatchItemResult[] = [];

  try {
    const result = await businessRepository.upsertMany(batch);
    const resultIds = new Set(result.map(r => r.bizesId));

    for (const item of batch) {
      const isSuccess = resultIds.has(item.bizesId);
      if (isSuccess) {
        successfulItems.push({
          bizesId: item.bizesId,
          success: true,
          isNew: item.recordStatus === 'new',
        });
      } else {
        failedItems.push({
          bizesId: item.bizesId,
          success: false,
          error: 'upsert 실패',
          isNew: item.recordStatus === 'new',
        });
      }
    }

    syncLogger.info(
      { batchIndex, total: batch.length, success: successfulItems.length, failed: failedItems.length },
      `배치 ${batchIndex + 1} 처리 완료`
    );

    return {
      batchIndex,
      totalItems: batch.length,
      successfulItems,
      failedItems,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    syncLogger.error({ batchIndex, error: errorMsg }, `배치 ${batchIndex + 1} 처리 실패`);

    for (const item of batch) {
      failedItems.push({
        bizesId: item.bizesId,
        success: false,
        error: errorMsg,
        isNew: item.recordStatus === 'new',
      });
    }

    return {
      batchIndex,
      totalItems: batch.length,
      successfulItems: [],
      failedItems,
      error: errorMsg,
    };
  }
}

/**
 * 공공데이터포털에서 데이터 가져오기
 */
async function fetchFromPublicDataPortal(options: SyncOptions): Promise<PublicDataPortalResponse> {
  const { serviceKey, pageSize = 10, maxPages = 10 } = options;

  syncLogger.info({ serviceKey: '***', pageSize, maxPages }, '공공데이터포털 API 호출 시작');

  const allItems: PublicDataPortalItem[] = [];
  const errors: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = new URL('http://apis.data.go.kr/B550598/smppKiCertInfo/getKiCertInfo');
      url.searchParams.set('serviceKey', serviceKey);
      url.searchParams.set('pageNo', page.toString());
      url.searchParams.set('numOfRows', pageSize.toString());

      syncLogger.info({ page }, `공공데이터포털 ${page}페이지 요청`);

      const response = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/xml, */*',
        },
      }, 15000);

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        syncLogger.error({ page, status: response.status }, `공공데이터포털 요청 실패: ${error}`);
        errors.push(`${page}페이지: ${error}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      const xmlText = await response.text();
      syncLogger.info({ page, contentLength: xmlText.length }, 'XML 응답 수신');

      let data: PublicDataPortalResponse;

      if (contentType?.includes('xml') || xmlText.trim().startsWith('<')) {
        try {
          data = parseXmlResponse(xmlText);
        } catch (parseError) {
          syncLogger.error({ page, error: parseError }, 'XML 파싱 실패');
          errors.push(`${page}페이지: XML 파싱 실패 - ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          continue;
        }
      } else {
        try {
          data = JSON.parse(xmlText);
        } catch (parseError) {
          syncLogger.error({ page, error: parseError }, 'JSON 파싱 실패');
          errors.push(`${page}페이지: JSON 파싱 실패`);
          continue;
        }
      }

      if (data.resultCode !== '00' && data.resultCode !== 'OK') {
        const error = `API 오류: ${data.resultCode} - ${data.resultMsg}`;
        syncLogger.error({ page, resultCode: data.resultCode, resultMsg: data.resultMsg }, `공공데이터포털 API 오류: ${error}`);
        errors.push(`${page}페이지: ${error}`);
        continue;
      }

      if (data.item && data.item.length > 0) {
        syncLogger.info({ page, count: data.item.length }, `${page}페이지 데이터 수집 완료`);
        allItems.push(...data.item);
      } else {
        syncLogger.info({ page }, `${page}페이지에 데이터 없음 - 동기화 중지`);
        break;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      syncLogger.error({ page, error: errorMsg }, `${page}페이지 요청 중 에러`);
      errors.push(`${page}페이지: ${errorMsg}`);
    }
  }

  syncLogger.info({ totalItems: allItems.length, totalErrors: errors.length }, '공공데이터포털 데이터 수집 완료');

  return {
    resultCode: errors.length > 0 && allItems.length === 0 ? 'ERROR' : '00',
    resultMsg: errors.length > 0 ? errors.join('; ') : 'OK',
    numOfRows: allItems.length,
    pageNo: 1,
    totalCount: allItems.length,
    item: allItems,
  };
}

/**
 * 공공데이터포털 데이터 동기화 (개선된 버전)
 */
export async function syncFromPublicDataPortal(
  options: SyncOptions
): Promise<SyncResult> {
  const { serviceKey } = options;

  try {
    if (!serviceKey) {
      syncLogger.error('serviceKey가 제공되지 않음');
      return {
        success: false,
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        failedRecords: 0,
        errors: ['serviceKey가 필요합니다'],
        batchResults: [],
      };
    }

    syncLogger.info('공공데이터포털 데이터 동기화 시작');

    const response = await fetchFromPublicDataPortal(options);

    if (!response || !response.item || response.item.length === 0) {
      syncLogger.warn('수집된 데이터가 없음');
      return {
        success: true,
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        failedRecords: 0,
        errors: response.resultMsg ? [response.resultMsg] : [],
        batchResults: [],
      };
    }

    const { businessRepository } = await import('@/lib/repositories/business.repository');

    const batchSize = 50;
    const batches: CreateBusinessInput[][] = [];
    const uniqueIds = new Set<string>();

    for (const item of response.item) {
      if (uniqueIds.has(item.bsnmNo)) {
        continue;
      }
      uniqueIds.add(item.bsnmNo);

      const businessInput = mapToBusinessInput(item, 'public-data-portal');

      if (batches.length === 0 || batches[batches.length - 1].length >= batchSize) {
        batches.push([]);
      }
      batches[batches.length - 1].push(businessInput);
    }

    syncLogger.info({ totalBatches: batches.length }, '배치 생성 완료');

    const batchResults: BatchResult[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      syncLogger.info({ batchIndex: i + 1, totalBatches: batches.length }, `배치 처리 시작`);

      const result = await processBatch(batch, i, businessRepository);
      batchResults.push(result);

      newCount += result.successfulItems.filter(item => item.isNew).length;
      updatedCount += result.successfulItems.filter(item => !item.isNew).length;
      failedCount += result.failedItems.length;

      if (result.failedItems.length > 0) {
        allErrors.push(
          `배치 ${i + 1}: ${result.failedItems.length}개 항목 실패 (${result.error || '알 수 없는 오류'})`
        );
      }
    }

    const lastBusinessId = response.item[response.item.length - 1]?.bsnmNo;

    syncLogger.info(
      {
        totalProcessed: response.numOfRows,
        newRecords: newCount,
        updatedRecords: updatedCount,
        failedRecords: failedCount,
        batches: batches.length,
        hasErrors: allErrors.length > 0,
      },
      '공공데이터포털 동기화 완료'
    );

    return {
      success: failedCount === 0,
      totalProcessed: response.numOfRows,
      newRecords: newCount,
      updatedRecords: updatedCount,
      failedRecords: failedCount,
      errors: allErrors,
      batchResults,
      lastBusinessId,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    syncLogger.error({ error: errorMsg }, '공공데이터포털 동기화 실패');

    return {
      success: false,
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      failedRecords: 0,
      errors: [errorMsg],
      batchResults: [],
    };
  }
}
