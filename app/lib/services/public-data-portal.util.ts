import { XMLParser } from 'fast-xml-parser';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';

export interface PublicDataPortalResponse {
  resultCode: string;
  resultMsg: string;
  numOfRows: number;
  pageNo: number;
  totalCount: number;
  item?: PublicDataPortalItem[];
}

export interface PublicDataPortalItem {
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

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

/**
 * XML 응답 파싱
 */
export function parseXmlResponse(xmlText: string): PublicDataPortalResponse {
  try {
    if (!xmlText || xmlText.trim() === '') {
      throw new Error('빈 XML 응답입니다');
    }

    const parsed = xmlParser.parse(xmlText);
    
    if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
      throw new Error('XML 파싱 결과가 비어있습니다');
    }

    const resultCode = parsed?.response?.header?.resultCode 
      || parsed?.header?.resultCode 
      || parsed?.resultCode 
      || '';
    
    const resultMsg = parsed?.response?.header?.resultMsg 
      || parsed?.header?.resultMsg 
      || parsed?.resultMsg 
      || '';
    
    let items: PublicDataPortalItem[] = [];
    const body = parsed?.response?.body || parsed?.body || {};
    const itemsData = body?.items?.item || body?.item;
    
    if (itemsData) {
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
    throw new Error(`XML 파싱 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 주소에서 도로명 추출
 */
export function extractRoadName(fullAddress: string): string | null {
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
export function extractLotNumber(fullAddress: string): string | null {
  if (!fullAddress) return null;

  const lotNumberPattern = /\d+(-\d+)?\s*[가-힣]?$/;
  const match = fullAddress.match(lotNumberPattern);

  return match ? match[0] : null;
}

/**
 * 업종코드와 소분류명으로 업종명 생성
 */
export function getBusinessNameFromCode(code: string, sclsName: string): string {
  if (!code) return sclsName || '';
  return `${code} - ${sclsName}`;
}

/**
 * API 응답에서 Business 생성 입력으로 변환
 */
export function mapToBusinessInput(item: PublicDataPortalItem, dataSource: string): CreateBusinessInput {
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
