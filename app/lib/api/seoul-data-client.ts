import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

const SEOUL_OPEN_API_BASE_URL = 'http://openapi.seoul.go.kr:8088';
const SEOUL_API_KEY = process.env.SEOUL_DATA_API_KEY;

if (!SEOUL_API_KEY) {
  console.warn('SEOUL_DATA_API_KEY 환경변수가 설정되지 않았습니다');
}

const seoulApiClient: AxiosInstance = axios.create({
  baseURL: SEOUL_OPEN_API_BASE_URL,
  timeout: 30000,
});

axiosRetry(seoulApiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500 ||
      error.response?.status === 429
    );
  },
});

export interface SeoulOpenAPIResponse {
  [key: string]: {
    list_total_count: number;
    RESULT: {
      CODE: string;
      MSG: string;
    };
    row: PermitItem[];
  };
}

export interface PermitItem {
  MANAGE_NO: string;
  BPLCNM: string;
  BPNM: string;
  BIZCND: string;
  LOCPLCD: string;
  RDNWHOLNAD: string;
  BPHONE1?: string;
  APV_DT?: string;
  APV_END_DT?: string;
  CLOSED_DT?: string;
  SUSP_DT?: string;
  SITEL?: string;
  SIDO?: string;
  SGG?: string;
  IS_AT?: string;
  VC_AT?: string;
}

export async function fetchPermitList(
  serviceCode: string = 'LOCALDATA_031001',
  startIndex: number = 1,
  endIndex: number = 10
): Promise<SeoulOpenAPIResponse | null> {
  if (!SEOUL_API_KEY) {
    console.warn('SEOUL_DATA_API_KEY가 없습니다');
    return null;
  }

  try {
    const url = `${SEOUL_API_KEY}/json/${serviceCode}/${startIndex}/${endIndex}`;
    const response = await seoulApiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('서울시 인허가정보 조회 실패:', error);
    throw error;
  }
}

export async function fetchAllPermits(
  serviceCode: string = 'LOCALDATA_031001',
  perPage: number = 1000
): Promise<PermitItem[]> {
  const allItems: PermitItem[] = [];
  let startIndex = 1;
  let hasMore = true;

  while (hasMore) {
    const endIndex = startIndex + perPage - 1;
    const result = await fetchPermitList(serviceCode, startIndex, endIndex);
    
    if (!result) break;

    const serviceData = result[serviceCode];
    if (!serviceData) break;

    const items = serviceData.row || [];
    allItems.push(...items);

    const totalCount = serviceData.list_total_count || 0;
    if (allItems.length >= totalCount) {
      hasMore = false;
    } else {
      startIndex += perPage;
    }
  }

  return allItems;
}

export function getAvailableServices(): Array<{ code: string; name: string; category: string; total: number }> {
  return [
    { code: 'LOCALDATA_031001', name: '일반음식점 인허가', category: '음식', total: 1347 },
    { code: 'LOCALDATA_031002', name: '휴게음식점 인허가', category: '음식', total: 1625 },
    { code: 'LOCALDATA_031003', name: '제과점 인허가', category: '음식', total: 39 },
    { code: 'LOCALDATA_031004', name: '방문판매업 인허가', category: '판매', total: 1366 },
    { code: 'LOCALDATA_031005', name: '숙박업 인허가', category: '숙박', total: 12613 },
    { code: 'LOCALDATA_031006', name: '미용업 인허가', category: '미용', total: 0 },
    { code: 'LOCALDATA_031007', name: '목욕업 인허가', category: '미용', total: 0 },
    { code: 'LOCALDATA_031008', name: '세탁업 인허가', category: '서비스', total: 0 },
    { code: 'LOCALDATA_031009', name: '고용알선업 인허가', category: '서비스', total: 0 },
    { code: 'LOCALDATA_031010', name: '옥외광고업 인허가', category: '광고', total: 0 },
  ];
}

export function getAllPermitTypes(): Array<{ code: string; name: string; source: string }> {
  return [
    { code: 'LOCALDATA_031001', name: '일반음식점', source: '서울시전체' },
    { code: 'LOCALDATA_031002', name: '휴게음식점', source: '서울시전체' },
    { code: 'LOCALDATA_031003', name: '제과점', source: '서울시전체' },
    { code: 'LOCALDATA_031004', name: '방문판매업', source: '서울시전체' },
    { code: 'LOCALDATA_031005', name: '숙박업', source: '서울시전체' },
    { code: 'LOCALDATA_031006', name: '미용업', source: '서울시전체' },
    { code: 'LOCALDATA_031007', name: '목욕업', source: '서울시전체' },
    { code: 'LOCALDATA_031008', name: '세탁업', source: '서울시전체' },
    { code: 'LOCALDATA_031009', name: '고용알선업', source: '서울시전체' },
    { code: 'LOCALDATA_031010', name: '옥외광고업', source: '서울시전체' },
    { code: 'LOCALDATA_032001', name: '일반운전면허학원', source: '서울시전체' },
    { code: 'LOCALDATA_032002', name: '소규모운전학원', source: '서울시전체' },
    { code: 'LOCALDATA_032003', name: '이륜차부품학원', source: '서울시전체' },
    { code: 'LOCALDATA_033001', name: '학원', source: '서울시전체' },
    { code: 'LOCALDATA_033002', name: '교습소', source: '서울시전체' },
    { code: 'LOCALDATA_033003', name: '독서실', source: '서울시전체' },
  ];
}

export async function checkSeoulAPIHealth(): Promise<boolean> {
  if (!SEOUL_API_KEY) return false;

  try {
    const result = await fetchPermitList('LOCALDATA_031001', 1, 1);
    return result?.LOCALDATA_031001?.RESULT?.CODE === 'INFO-000';
  } catch {
    return false;
  }
}

export default {
  fetchPermitList,
  fetchAllPermits,
  getAvailableServices,
  getAllPermitTypes,
  checkSeoulAPIHealth,
};