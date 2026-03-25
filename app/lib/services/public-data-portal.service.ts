import { syncLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';
import { XMLParser } from 'fast-xml-parser';

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
 * 동기화 Lock 상태
 */
interface SyncLockState {
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
}

// In-memory lock (실제 배포에서는 Redis 등 사용 권장)
let syncLock: SyncLockState = { isLocked: false };

/**
 * 공공데이터포털 API 응답 데이터 구조
 */
interface PublicDataPortalResponse {
  resultCode: string;
  resultMsg: string;
  numOfRows: number;
  pageNo: number;
  totalCount: number;
  item?: PublicDataPortalItem[];
}

interface PublicDataPortalItem {
  entrpsNm: string;        // 기업명
  bsnmNo: string;          // 사업자등록번호 (상가업소번호)
  minduty: string;          // 주업종
  rprsntvNm: string;       // 대표자명
  adres: string;           // 주소 (도로명주소 + 지번주소 통합)
  validPdDe: string;       // 유효기간
  earlyValidPdDe: string;  // 초기창업자기간
  indsLclsCd: string;      // 대분류코드
  indsLclsNm: string;      // 대분류명
  indsMclsCd: string;      // 중분류코드
  indsMclsNm: string;      // 중분류명
  indsSclsCd: string;     // 소분류코드
  indsSclsNm: string;     // 소분류명
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
 * XML 파서 인스턴스 (재사용)
 */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

/**
 * XML 응답 파싱 (fast-xml-parser 사용)
 */
function parseXmlResponse(xmlText: string): PublicDataPortalResponse {
  try {
    const parsed = xmlParser.parse(xmlText);
    
    // 응답 구조: response -> header -> resultCode
    const resultCode = parsed?.response?.header?.resultCode 
      || parsed?.header?.resultCode 
      || parsed?.resultCode 
      || '';
    
    const resultMsg = parsed?.response?.header?.resultMsg 
      || parsed?.header?.resultMsg 
      || parsed?.resultMsg 
      || '';
    
    // item 추출 (response.body.items.item 또는 items.item)
    let items: PublicDataPortalItem[] = [];
    const body = parsed?.response?.body || parsed?.body || {};
    const itemsData = body?.items?.item || body?.item;
    
    if (itemsData) {
      // 단일 item인 경우 배열로 변환
      items = Array.isArray(itemsData) ? itemsData : [itemsData];
    }

    return {
      resultCode: String(resultCode),
      resultMsg: String(resultMsg),
      numOfRows: parseInt(String(body?.numOfRows || '0'), 10),
      pageNo: parseInt(String(body?.pageNo || '1'), 10),
      totalCount: parseInt(String(body?.totalCount || '0'), 10),
      item: items.length > 0 ? items : undefined,
    };
  } catch (error) {
    syncLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'XML 파싱 실패');
    throw new Error(`XML 파싱 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 공공데이터포털 API 응답에서 Business 생성 입력으로 변환
 */
function mapToBusinessInput(item: PublicDataPortalItem, dataSource: string): CreateBusinessInput {
  return {
    bizesId: item.bsnmNo,
    name: item.entrpsNm,
    roadNameAddress: extractRoadName(item.adres),
    lotNumberAddress: extractLotNumber(item.adres),
    phone: null,
    latitude: null,
    longitude: null,
    businessCode: item.minduty,
    businessName: getBusinessNameFromCode(item.minduty, item.indsSclsNm),
    indsLclsCd: item.indsLclsCd,
    indsLclsNm: item.indsLclsNm,
    indsMclsCd: item.indsMclsCd,
    indsMclsNm: item.indsMclsNm,
    indsSclsCd: item.indsSclsCd,
    indsSclsNm: item.indsSclsNm,
    status: 'pending',
    recordStatus: 'new',
    dataSource: dataSource,
  };
}

/**
 * 주소에서 도로명 추출
 */
function extractRoadName(fullAddress: string): string | null {
  if (!fullAddress) return null;

  const lotNumberPattern = /\d+(-\d+)?\s*[가-힣]?$/;
  const match = fullAddress.match(lotNumberPattern);

  if (match) {
    const endIndex = match.index!;
    return fullAddress.substring(0, endIndex).trim() || null;
  }

  return fullAddress.trim() || null;
}

/**
 * 주소에서 지번 추출
 */
function extractLotNumber(fullAddress: string): string | null {
  if (!fullAddress) return null;

  const lotNumberPattern = /\d+(-\d+)?\s*[가-힣]?$/;
  const match = fullAddress.match(lotNumberPattern);

  return match ? match[0] : null;
}

/**
 * 업종코드와 소분류명으로 업종명 생성
 */
function getBusinessNameFromCode(code: string, sclsName: string): string {
  if (!code) return sclsName || '';
  return `${code} - ${sclsName}`;
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
 * Sync Lock 획득 시도
 */
export function acquireSyncLock(force: boolean = false): { success: boolean; message: string } {
  if (syncLock.isLocked && !force) {
    return {
      success: false,
      message: `동기화가 이미 진행 중입니다. (시작: ${syncLock.lockedAt?.toISOString()})`,
    };
  }

  if (syncLock.isLocked && force) {
    syncLogger.warn('강제 동기화 실행 - 기존 lock 해제');
  }

  syncLock = {
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: 'sync-service',
  };

  syncLogger.info('Sync lock 획득');
  return { success: true, message: 'Sync lock 획득 성공' };
}

/**
 * Sync Lock 해제
 */
export function releaseSyncLock(): void {
  syncLock = { isLocked: false };
  syncLogger.info('Sync lock 해제');
}

/**
 * 현재 Lock 상태 확인
 */
export function getSyncLockStatus(): SyncLockState {
  return { ...syncLock };
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
        // JSON 응답
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
    // 배치 upsert 실행
    const result = await businessRepository.upsertMany(batch);
    const resultIds = new Set(result.map(r => r.bizesId));

    // 각 항목별 성공/실패判定
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

    // 모든 항목을 실패로 기록
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
 * 공공데이터포털 데이터 동기화 (개선된 버전)
 */
export async function syncFromPublicDataPortal(
  options: SyncOptions
): Promise<SyncResult> {
  const { serviceKey, force = false } = options;

  // 1. Lock 확인
  const lockResult = acquireSyncLock(force);
  if (!lockResult.success) {
    syncLogger.warn({ message: lockResult.message }, '동기화 Lock 획득 실패');
    return {
      success: false,
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      failedRecords: 0,
      errors: [lockResult.message],
      batchResults: [],
      isLocked: true,
    };
  }

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

    // 2. 데이터 수집
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

    // 3. BusinessRepository 지연 로드
    const { businessRepository } = await import('@/lib/repositories/business.repository');

    // 4. 배치 생성
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

    // 5. 배치 처리 실행 (에러 전파 개선)
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

      // 통계 업데이트
      newCount += result.successfulItems.filter(item => item.isNew).length;
      updatedCount += result.successfulItems.filter(item => !item.isNew).length;
      failedCount += result.failedItems.length;

      // 실패한 항목이 있으면 에러 메시지 추가
      if (result.failedItems.length > 0) {
        allErrors.push(
          `배치 ${i + 1}: ${result.failedItems.length}개 항목 실패 (${result.error || '알 수 없는 오류'})`
        );
      }
    }

    // 6. 결과 반환 (개선된 에러 전파)
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
      success: failedCount === 0, // 실패가 있으면 false
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

  } finally {
    // 7. Lock 해제 (finally 블록에서 반드시 실행)
    releaseSyncLock();
  }
}
