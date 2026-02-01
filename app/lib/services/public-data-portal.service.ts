import { syncLogger } from '@/app/lib/logger';
import type { CreateBusinessInput } from '@/app/lib/repositories/business.repository';

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
  bsnmNo: string;         // 사업자등록번호 (상가업소번호)
  minduty: string;         // 주업종
  rprsntvNm: string;       // 대표자명
  adres: string;           // 주소 (도로명주소 + 지번주소 통합)
  validPdDe: string;        // 유효기간
  earlyValidPdDe: string;   // 초기창업자기간
  indsLclsCd: string;       // 대분류코드
  indsLclsNm: string;       // 대분류명
  indsMclsCd: string;       // 중분류코드
  indsMclsNm: string;       // 중분류명
  indsSclsCd: string;       // 소분류코드
  indsSclsNm: string;       // 소분류명
}

/**
 * 동기화 옵션
 */
export interface SyncOptions {
  serviceKey: string;       // 공공데이터포털 인증키
  pageSize?: number;         // 한 페이지 결과 수 (기본값: 10)
  maxPages?: number;         // 최대 페이지 수 (기본값: 10)
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  errors: string[];
  lastBusinessId?: string;
}

/**
 * 공공데이터포털 API 응답에서 Business 생성 입력으로 변환
 */
function mapToBusinessInput(item: PublicDataPortalItem, dataSource: string): CreateBusinessInput {
  return {
    bizesId: item.bsnmNo,                    // 사업자등록번호 → 상가업소번호
    name: item.entrpsNm,                     // 기업명 → 상호명
    roadNameAddress: extractRoadName(item.adres),    // 주소에서 도로명 추출
    lotNumberAddress: extractLotNumber(item.adres),     // 주소에서 지번 추출
    phone: null,                                 // API에서 제공하지 않음
    latitude: null,                               // API에서 제공하지 않음
    longitude: null,                              // API에서 제공하지 않음
    businessCode: item.minduty,                // 주업종코드 → 업종코드
    businessName: getBusinessNameFromCode(item.minduty, item.indsSclsNm), // 업종명 생성
    indsLclsCd: item.indsLclsCd,             // 대분류코드
    indsLclsNm: item.indsLclsNm,              // 대분류명
    indsMclsCd: item.indsMclsCd,             // 중분류코드
    indsMclsNm: item.indsMclsNm,              // 중분류명
    indsSclsCd: item.indsSclsCd,             // 소분류코드
    indsSclsNm: item.indsSclsNm,              // 소분류명
    status: 'pending',                            // 기본값: 대기
    recordStatus: 'new',                          // 기본값: 신규
    dataSource: dataSource,                        // 데이터 출처
  };
}

/**
 * 주소에서 도로명 추출 (지번 전까지)
 */
function extractRoadName(fullAddress: string): string | null {
  if (!fullAddress) return null;

  // 지번 패턴: "123-45", "서초동 123-10"
  const lotNumberPattern = /\d+(-\d+)?\s*[가-힐]?$/;
  const match = fullAddress.match(lotNumberPattern);

  if (match) {
    // 지번 앞까지 도로명으로 간주
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

  // 지번 패턴: "123-45", "서초동 123-10"
  const lotNumberPattern = /\d+(-\d+)?\s*[가-힐]?$/;
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
 * HTTP 요청 실행 (fetch 래퍼)
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
 * 공공데이터포털에서 데이터 가져오기
 */
async function fetchFromPublicDataPortal(options: SyncOptions): Promise<PublicDataPortalResponse | null> {
  const { serviceKey, pageSize = 10, maxPages = 10 } = options;

  syncLogger.info({ serviceKey, pageSize, maxPages }, '공공데이터포털 API 호출 시작');

  const allItems: PublicDataPortalItem[] = [];
  const errors: string[] = [];
  let lastBusinessId: string | undefined;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = new URL('http://apis.data.go.kr/B550598/smppKiCertInfo/getKiCertInfo');
      url.searchParams.set('serviceKey', serviceKey);
      url.searchParams.set('pageNo', page.toString());
      url.searchParams.set('numOfRows', pageSize.toString());

      syncLogger.info({ page, url: url.toString() }, `공공데이터포털 ${page}페이지 요청`);

      const response = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/xml, */*',
        },
      }, 15000); // 15초 타임아웃

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        syncLogger.error({ page, status: response.status }, `공공데이터포털 요청 실패: ${error}`);
        errors.push(`${page}페이지: ${error}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      let data: PublicDataPortalResponse;

      if (contentType?.includes('xml')) {
        // XML 응답 파싱
        const xmlText = await response.text();
        syncLogger.info({ page, contentLength: xmlText.length }, 'XML 응답 수신');

        // 간단 XML 파싱 (정규식 사용)
        const resultCodeMatch = xmlText.match(/<resultCode>([^<]+)<\/resultCode>/);
        const numOfRowsMatch = xmlText.match(/<numOfRows>([^<]+)<\/numOfRows>/);
        const totalCountMatch = xmlText.match(/<totalCount>([^<]+)<\/totalCount>/);

        const items: PublicDataPortalItem[] = [];

        // items 추출 (item 태그 반복)
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
          const itemXml = itemMatch[1];
          const entrpsNmMatch = itemXml.match(/<entrpsNm>([^<]+)<\/entrpsNm>/);
          const bsnmNoMatch = itemXml.match(/<bsnmNo>([^<]+)<\/bsnmNo>/);
          const mindutyMatch = itemXml.match(/<minduty>([^<]+)<\/minduty>/);
          const rprsntvNmMatch = itemXml.match(/<rprsntvNm>([^<]+)<\/rprsntvNm>/);
          const adresMatch = itemXml.match(/<adres>([^<]+)<\/adres>/);
          const validPdDeMatch = itemXml.match(/<validPdDe>([^<]+)<\/validPdDe>/);
          const earlyValidPdDeMatch = itemXml.match(/<earlyValidPdDe>([^<]+)<\/earlyValidPdDe>/);
          const indsLclsCdMatch = itemXml.match(/<indsLclsCd>([^<]+)<\/indsLclsCd>/);
          const indsLclsNmMatch = itemXml.match(/<indsLclsNm>([^<]+)<\/indsLclsNm>/);
          const indsMclsCdMatch = itemXml.match(/<indsMclsCd>([^<]+)<\/indsMclsCd>/);
          const indsMclsNmMatch = itemXml.match(/<indsMclsNm>([^<]+)<\/indsMclsNm>/);
          const indsSclsCdMatch = itemXml.match(/<indsSclsCd>([^<]+)<\/indsSclsCd>/);
          const indsSclsNmMatch = itemXml.match(/<indsSclsNm>([^<]+)<\/indsSclsNm>/);

          if (entrpsNmMatch && bsnmNoMatch) {
            items.push({
              entrpsNm: entrpsNmMatch[1].trim(),
              bsnmNo: bsnmNoMatch[1].trim(),
              minduty: mindutyMatch ? mindutyMatch[1].trim() : '',
              rprsntvNm: rprsntvNmMatch ? rprsntvNmMatch[1].trim() : '',
              adres: adresMatch ? adresMatch[1].trim() : '',
              validPdDe: validPdDeMatch ? validPdDeMatch[1].trim() : '',
              earlyValidPdDe: earlyValidPdDeMatch ? earlyValidPdDeMatch[1].trim() : '',
              indsLclsCd: indsLclsCdMatch ? indsLclsCdMatch[1].trim() : '',
              indsLclsNm: indsLclsNmMatch ? indsLclsNmMatch[1].trim() : '',
              indsMclsCd: indsMclsCdMatch ? indsMclsCdMatch[1].trim() : '',
              indsMclsNm: indsMclsNmMatch ? indsMclsNmMatch[1].trim() : '',
              indsSclsCd: indsSclsCdMatch ? indsSclsCdMatch[1].trim() : '',
              indsSclsNm: indsSclsNmMatch ? indsSclsNmMatch[1].trim() : '',
            });
          }
        }

        data = {
          resultCode: resultCodeMatch ? resultCodeMatch[1] : '',
          resultMsg: '',
          numOfRows: numOfRowsMatch ? parseInt(numOfRowsMatch[1]) : 0,
          pageNo: page,
          totalCount: totalCountMatch ? parseInt(totalCountMatch[1]) : 0,
          item: items,
        };
      } else {
        // JSON 응답 (예상하지 않음)
        const jsonText = await response.text();
        syncLogger.info({ page, contentLength: jsonText.length }, 'JSON 응답 수신');

        try {
          data = JSON.parse(jsonText);
        } catch (parseError) {
          syncLogger.error({ page, error: parseError }, 'JSON 파싱 실패');
          errors.push(`${page}페이지: JSON 파싱 실패`);
          continue;
        }
      }

      if (data.resultCode !== '00' && data.resultCode !== 'OK') {
        const error = `API 오류: ${data.resultCode} - ${data.resultMsg}`;
        syncLogger.error({ page, resultCode: data.resultCode }, `공공데이터포털 API 오류: ${error}`);
        errors.push(`${page}페이지: ${error}`);
        continue;
      }

      // 데이터 수집
      if (data.item && data.item.length > 0) {
        syncLogger.info({ page, count: data.item.length }, `${page}페이지 데이터 수집 완료`);
        allItems.push(...data.item);

        // 마지막 비즈니스 ID 추적
        const lastItem = data.item[data.item.length - 1];
        if (lastItem && lastItem.bsnmNo) {
          lastBusinessId = lastItem.bsnmNo;
        }
      } else {
        syncLogger.info({ page }, `${page}페이지에 데이터 없음 - 동기화 중지`);
        break; // 데이터가 없으면 중지
      }

    } catch (error) {
      syncLogger.error({ page, error: error instanceof Error ? error.message : String(error) }, `${page}페이지 요청 중 에러`);
      errors.push(`${page}페이지: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  syncLogger.info({ totalItems: allItems.length, totalErrors: errors.length }, '공공데이터포털 데이터 수집 완료');

  return {
    resultCode: '00',
    resultMsg: 'OK',
    numOfRows: allItems.length,
    pageNo: 1,
    totalCount: allItems.length,
    item: allItems,
  };
}

/**
 * 공공데이터포털 데이터 동기화
 */
export async function syncFromPublicDataPortal(
  options: SyncOptions
): Promise<SyncResult> {
  const { serviceKey } = options;

  if (!serviceKey) {
    syncLogger.error('serviceKey가 제공되지 않음');
    return {
      success: false,
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: ['serviceKey가 필요합니다'],
    };
  }

  syncLogger.info('공공데이터포털 데이터 동기화 시작');

  try {
    const response = await fetchFromPublicDataPortal(options);

    if (!response || !response.item || response.item.length === 0) {
      syncLogger.warn('수집된 데이터가 없음');
      return {
        success: true,
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        errors: [],
      };
    }

    // BusinessRepository를 뒤에서 가져오기 (순환 참조 방지)
    const { businessRepository } = await import('@/app/lib/repositories/business.repository');

    // 중복 제거 (bizesId 기준)
    const existingBusinesses = new Set<string>();
    const batchSize = 50; // 대량 upsert 최적 크기
    const batches: CreateBusinessInput[][] = [];

    let newCount = 0;
    let updatedCount = 0;

    for (const item of response.item) {
      const businessInput = mapToBusinessInput(item, 'public-data-portal');

      // 중복 체크 (배치 내에서만 중복 제거)
      if (existingBusinesses.has(item.bsnmNo)) {
        continue; // 이미 처리된 항목 건너뜀
      }

      existingBusinesses.add(item.bsnmNo);

      // 배치 생성
      if (batches.length === 0 || batches[batches.length - 1].length >= batchSize) {
        batches.push([]);
      }
      batches[batches.length - 1].push(businessInput);
    }

    // 대량 upsert
    for (const [index, batch] of batches.entries()) {
      syncLogger.info({ batchIndex: index + 1, batchSize: batch.length }, `${index + 1}/${batches.length} 배치 upsert 시작`);

      try {
        const result = await businessRepository.upsertMany(batch);
        syncLogger.info({ batchIndex: index + 1, processed: result.length }, `${index + 1}/${batches.length} 배치 upsert 완료`);

        // 신규/업데이트 구분 (recordStatus로 판단)
        newCount += batch.filter(b => b.recordStatus === 'new').length;
        updatedCount += batch.filter(b => b.recordStatus !== 'new').length;

      } catch (error) {
        syncLogger.error({ batchIndex: index + 1, error: error instanceof Error ? error.message : String(error) }, `${index + 1}/${batches.length} 배치 upsert 실패`);
      }
    }

    syncLogger.info(
      {
        totalProcessed: response.numOfRows,
        newRecords: newCount,
        updatedRecords: updatedCount,
        batches: batches.length,
      },
      '공공데이터포털 동기화 완료'
    );

    return {
      success: true,
      totalProcessed: response.numOfRows,
      newRecords: newCount,
      updatedRecords: updatedCount,
      errors: [],
      lastBusinessId: response.item[response.item.length - 1]?.bsnmNo,
    };
  } catch (error) {
    syncLogger.error({ error: error instanceof Error ? error.message : String(error) }, '공공데이터포털 동기화 실패');

    return {
      success: false,
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
