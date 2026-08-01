import { syncLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';
import { 
  parseXmlResponse, 
  mapToBusinessInput, 
  PublicDataPortalResponse, 
  PublicDataPortalItem 
} from '@/lib/services/public-data-portal.util';
import { validationService } from './validation.service';
import { rateLimitService, withRateLimit, withRetry } from './rate-limit-retry.service';
import { progressService, ProgressState } from './progress.service';
import { statisticService } from './statistic.service';
import { eventPublisher, publishEvent, createCorrelationId } from './event-publisher';

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
  taskId?: string;          // 진행 상태 추적용 태스크 ID
  enableValidation?: boolean; // 검증 활성화 여부
  enableRateLimit?: boolean;  // 속도 제한 활성화 여부
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
  batchResults: BatchResult[];
  lastBusinessId?: string;
  isLocked?: boolean;
  taskId?: string;
}

/**
 * HTTP 요청 실행 (속도 제한 및 재시도 적용)
 */
async function fetchWithRateLimitAndRetry(
  url: string, 
  options: RequestInit, 
  timeout: number = 15000
): Promise<Response> {
  return withRateLimit('public-data-portal', async () => {
    return withRetry(async () => {
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
    }, {
      maxRetries: 3,
      baseDelayMs: 2000,
      onRetry: (attempt, error, delay) => {
        syncLogger.warn({ attempt, delay, error: error.message }, '공공데이터포털 API 재시도');
      },
    });
  }, 1);
}

/**
 * 단일 배치 처리 (검증 포함)
 */
async function processBatch(
  batch: CreateBusinessInput[],
  batchIndex: number,
  businessRepository: { upsertMany: (data: CreateBusinessInput[]) => Promise<{ created: CreateBusinessInput[] }> },
  taskId?: string
): Promise<BatchResult> {
  const successfulItems: BatchItemResult[] = [];
  const failedItems: BatchItemResult[] = [];

  try {
    const validationResult = validationService.validateBatch(batch);
    
    if (validationResult.invalidCount > 0) {
      syncLogger.warn({ 
        batchIndex, 
        valid: validationResult.validCount, 
        invalid: validationResult.invalidCount 
      }, '배치 내 유효하지 않은 항목 발견');
      
      for (const invalid of validationResult.invalidItems) {
        failedItems.push({
          bizesId: (invalid.item as CreateBusinessInput).bizesId,
          success: false,
          error: `검증 실패: ${invalid.errors.map(e => e.message).join(', ')}`,
          isNew: (invalid.item as CreateBusinessInput).recordStatus === 'new',
        });
        
        for (const error of invalid.errors) {
          await validationService.recordValidationError?.(error);
        }
      }
    }

    const validBatch = validationResult.validItems;
    
    if (validBatch.length === 0) {
      syncLogger.warn({ batchIndex }, '유효한 항목이 없어 배치 건너뜀');
      return {
        batchIndex,
        totalItems: batch.length,
        successfulItems: [],
        failedItems,
      };
    }

    const result = await businessRepository.upsertMany(validBatch);
    const resultIds = new Set(result.created.map(r => r.bizesId));

    for (const item of validBatch) {
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

    if (taskId) {
      const processed = batchIndex * 50 + validBatch.length;
      await progressService.updateProgress(taskId, {
        completedSteps: batchIndex + 1,
        currentStep: `배치 ${batchIndex + 1} 처리 완료`,
        message: `배치 ${batchIndex + 1}/${Math.ceil(batch.length / 50)} 완료: ${successfulItems.length}개 성공, ${failedItems.length}개 실패`,
      });
    }

    syncLogger.info(
      { batchIndex, total: validBatch.length, success: successfulItems.length, failed: failedItems.length },
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

    if (taskId) {
      await progressService.failProgress(taskId, errorMsg, `배치 ${batchIndex + 1} 처리 실패`);
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
 * 공공데이터포털에서 데이터 가져오기 (속도 제한, 재시도 적용)
 */
async function fetchFromPublicDataPortal(options: SyncOptions): Promise<PublicDataPortalResponse> {
  const { serviceKey, pageSize = 100, maxPages = 100 } = options;

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

      const response = await fetchWithRateLimitAndRetry(url.toString(), {
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
 * 공공데이터포털 데이터 동기화 (개선된 버전 - 검증, 속도 제한, 진행 상태, 이벤트, 통계 포함)
 */
export async function syncFromPublicDataPortal(
  options: SyncOptions
): Promise<SyncResult> {
  const { 
    serviceKey, 
    taskId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    enableValidation = true,
    enableRateLimit = true,
  } = options;

  const correlationId = createCorrelationId();
  const startTime = Date.now();

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
        taskId,
      };
    }

    if (!options.force) {
      const { getSyncLockStatus, setSyncLock } = await import('./public-data-portal.service');
      const lockStatus = getSyncLockStatus();
      if (lockStatus.isLocked) {
        syncLogger.warn('동기화가 이미 진행 중입니다');
        return {
          success: false,
          totalProcessed: 0,
          newRecords: 0,
          updatedRecords: 0,
          failedRecords: 0,
          errors: ['동기화가 이미 진행 중입니다'],
          batchResults: [],
          isLocked: true,
          taskId,
        };
      }
      setSyncLock(true);
    }

    await progressService.createProgress({
      taskId,
      taskType: 'sync',
      totalSteps: options.maxPages || 100,
      initialMessage: '공공데이터포털 동기화 시작',
      metadata: { serviceKey: '***', options },
    });

    await eventPublisher.publishSyncStarted(taskId, 'public-data-portal', {
      pageSize: options.pageSize,
      maxPages: options.maxPages,
      enableValidation,
      enableRateLimit,
    });

    syncLogger.info({ taskId, correlationId }, '공공데이터포털 데이터 동기화 시작');

    const response = await fetchFromPublicDataPortal(options);

    if (!response || !response.item || response.item.length === 0) {
      syncLogger.warn('수집된 데이터가 없음');
      await progressService.completeProgress(taskId, '수집된 데이터가 없음');
      await eventPublisher.publishSyncCompleted(taskId, 0, 0, 0, Date.now() - startTime);
      return {
        success: true,
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        failedRecords: 0,
        errors: response.resultMsg ? [response.resultMsg] : [],
        batchResults: [],
        taskId,
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

    syncLogger.info({ totalBatches: batches.length, totalItems: response.item.length }, '배치 생성 완료');

    await progressService.updateProgress(taskId, {
      totalSteps: batches.length,
      message: `${batches.length}개 배치 처리 예정`,
    });

    const batchResults: BatchResult[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      syncLogger.info({ batchIndex: i + 1, totalBatches: batches.length, batchSize: batch.length }, `배치 ${i + 1} 처리 시작`);

      await eventPublisher.publishBatchProgress(i, batches.length, batch.length, 0, 0);

      const result = await processBatch(batch, i, businessRepository, taskId);
      batchResults.push(result);

      newCount += result.successfulItems.filter(item => item.isNew).length;
      updatedCount += result.successfulItems.filter(item => !item.isNew).length;
      failedCount += result.failedItems.length;

      if (result.failedItems.length > 0) {
        allErrors.push(
          `배치 ${i + 1}: ${result.failedItems.length}개 항목 실패 (${result.error || '알 수 없는 오류'})`
        );
      }

      await eventPublisher.publishBatchProgress(i, batches.length, batch.length, result.successfulItems.length, result.failedItems.length);
    }

    const durationMs = Date.now() - startTime;
    const lastBusinessId = response.item[response.item.length - 1]?.bsnmNo;

    await progressService.completeProgress(taskId, `동기화 완료: ${newCount}개 신규, ${updatedCount}개 업데이트, ${failedCount}개 실패`);
    await eventPublisher.publishSyncCompleted(taskId, response.numOfRows, newCount, updatedCount, durationMs);

    await statisticService.recordSyncMetric(taskId, {
      processed: response.numOfRows,
      success: newCount + updatedCount,
      failed: failedCount,
      processingTimeMs: durationMs,
      errors: allErrors,
    });

    if (!options.force) {
      const { setSyncLock } = await import('./public-data-portal.service');
      setSyncLock(false);
    }

    syncLogger.info(
      {
        taskId,
        correlationId,
        totalProcessed: response.numOfRows,
        newRecords: newCount,
        updatedRecords: updatedCount,
        failedRecords: failedCount,
        batches: batches.length,
        durationMs,
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
      taskId,
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    syncLogger.error({ taskId, correlationId, error: errorMsg }, '공공데이터포털 동기화 실패');

    await progressService.failProgress(taskId, errorMsg, '동기화 실패');
    await eventPublisher.publishSyncFailed(taskId, errorMsg, 0, 0);
    await eventPublisher.publishError('syncFromPublicDataPortal', errorMsg, 'high', { taskId, options });

    if (!options.force) {
      const { setSyncLock } = await import('./public-data-portal.service');
      setSyncLock(false);
    }

    return {
      success: false,
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      failedRecords: 0,
      errors: [errorMsg],
      batchResults: [],
      taskId,
    };
  }
}

// In-memory sync lock for preventing concurrent syncs
let syncLockedAt: Date | null = null;
let syncInProgress = false;

export function getSyncLockStatus(): { isLocked: boolean; lockedAt: Date | null } {
  return { isLocked: syncInProgress, lockedAt: syncLockedAt };
}

/** @internal Called by sync functions to acquire/release the lock */
export function setSyncLock(locked: boolean): void {
  syncInProgress = locked;
  syncLockedAt = locked ? new Date() : null;
}